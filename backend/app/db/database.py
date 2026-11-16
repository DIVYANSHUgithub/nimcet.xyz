import logging
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import Connection
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


class DatabaseUnavailable(Exception):
    """The configured database could not complete a read-only operation."""


class Database:
    """Minimal SQLAlchemy connection boundary without assuming a live schema."""

    def __init__(self, database_url: str | None, *, ssl_root_cert: str | None = None, pool_size: int = 3):
        self.engine: Engine | None = None
        if database_url:
            options = {
                "pool_pre_ping": True,
                "hide_parameters": True,
            }
            if database_url.startswith(("postgresql://", "postgresql+psycopg://")):
                # The legacy local URI omits a driver. Explicitly use the installed
                # psycopg 3 driver rather than depending on SQLAlchemy defaults.
                url = make_url(database_url).set(drivername="postgresql+psycopg")
                if ssl_root_cert:
                    certificate = Path(ssl_root_cert)
                    if not certificate.is_absolute():
                        certificate = Path(__file__).resolve().parents[2] / certificate
                    if not certificate.is_file():
                        raise ValueError("DATABASE_SSL_ROOT_CERT must point to an existing certificate.")
                    url = url.update_query_dict({"sslrootcert": str(certificate)})
                database_url = url
                options.update(pool_size=pool_size, max_overflow=0, pool_timeout=3, pool_recycle=300)
                options["connect_args"] = {"connect_timeout": 2}
            self.engine = create_engine(
                database_url,
                **options,
            )

    def _configure_transaction(self, connection: Connection) -> None:
        if self.engine is not None and self.engine.dialect.name == "postgresql":
            # Supavisor can discard startup parameters. Transaction-local settings
            # also work through a pooler and cannot leak into another request.
            connection.execute(text("SELECT set_config('statement_timeout', '8s', true), "
                                    "set_config('lock_timeout', '3s', true), "
                                    "set_config('idle_in_transaction_session_timeout', '15s', true)"))

    def ready(self) -> bool:
        if self.engine is None:
            return False
        try:
            with self.engine.connect() as connection:
                self._configure_transaction(connection)
                connection.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            # Do not log driver exception text; connection errors can contain host details.
            logger.warning("database readiness check failed")
            return False

    @contextmanager
    def read_only_transaction(self) -> Iterator[Connection]:
        if self.engine is None:
            raise DatabaseUnavailable
        try:
            with self.engine.connect() as connection:
                with connection.begin():
                    connection.execute(
                        text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
                    )
                    self._configure_transaction(connection)
                    yield connection
        except SQLAlchemyError as exc:
            # Do not log exception text; it can disclose hosts, SQL, or query values.
            logger.warning("database read-only operation failed")
            raise DatabaseUnavailable from exc

    @contextmanager
    def transaction(self) -> Iterator[Connection]:
        """Write-capable transaction for authenticated, role-guarded repositories."""
        if self.engine is None:
            raise DatabaseUnavailable
        try:
            with self.engine.begin() as connection:
                self._configure_transaction(connection)
                yield connection
        except SQLAlchemyError as exc:
            # Never log raw driver errors or bound values at this security boundary.
            logger.warning("database transaction failed")
            raise DatabaseUnavailable from exc

    def close(self) -> None:
        if self.engine is not None:
            self.engine.dispose()
