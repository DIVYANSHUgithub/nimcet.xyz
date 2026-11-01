import logging
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


class DatabaseUnavailable(Exception):
    """The configured database could not complete a read-only operation."""


class Database:
    """Minimal SQLAlchemy connection boundary without assuming a live schema."""

    def __init__(self, database_url: str | None):
        self.engine: Engine | None = None
        if database_url:
            options = {
                "pool_pre_ping": True,
                "hide_parameters": True,
            }
            if database_url.startswith(("postgresql://", "postgresql+psycopg://")):
                options["connect_args"] = {"connect_timeout": 2}
            self.engine = create_engine(
                database_url,
                **options,
            )

    def ready(self) -> bool:
        if self.engine is None:
            return False
        try:
            with self.engine.connect() as connection:
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
                yield connection
        except SQLAlchemyError as exc:
            # Never log raw driver errors or bound values at this security boundary.
            logger.warning("database transaction failed")
            raise DatabaseUnavailable from exc

    def close(self) -> None:
        if self.engine is not None:
            self.engine.dispose()
