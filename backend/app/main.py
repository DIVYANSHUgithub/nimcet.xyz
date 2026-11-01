import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.routes.health import router as health_router
from app.api.v1.router import create_api_router
from app.core.config import Settings, get_settings
from app.core.errors import (
    http_exception_handler,
    unexpected_exception_handler,
    validation_exception_handler,
)
from app.core.logging import configure_logging
from app.core.security import RoleResolver, StudentOnlyRoleResolver, SupabaseTokenVerifier, TokenVerifier
from app.db.database import Database
from app.db.roles import DatabaseRoleResolver
from app.db.test_engine import TestEngineRepository

logger = logging.getLogger("nimcet.http")


def create_app(
    settings: Settings | None = None,
    database: Database | None = None,
    token_verifier: TokenVerifier | None = None,
    role_resolver: RoleResolver | None = None,
    test_engine_repository: TestEngineRepository | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            yield
        finally:
            app.state.database.close()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="NIMCET.XYZ backend API",
        lifespan=lifespan,
    )
    app.state.settings = settings
    db_url = settings.database_url.get_secret_value() if settings.database_url else None
    app.state.database = database or Database(db_url)
    app.state.test_engine_repository = test_engine_repository or TestEngineRepository(app.state.database)
    app.state.token_verifier = token_verifier or SupabaseTokenVerifier(settings)
    # Until the role schema is verified and migrated, authenticated users receive only
    # the ordinary student role. Token metadata never grants elevated privileges.
    app.state.role_resolver = role_resolver or (
        DatabaseRoleResolver(app.state.database)
        if settings.trusted_role_lookup_enabled
        else StudentOnlyRoleResolver()
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "If-Match", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = str(uuid4())
        request.state.request_id = request_id
        started_at = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception:
            # Do not log exception text, headers, query strings, or request bodies.
            logger.error("request failed", extra={"request_id": request_id})
            raise
        finally:
            logger.info(
                "http_request",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
                },
            )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        return await http_exception_handler(request, exc)

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(request: Request, exc: RequestValidationError):
        return await validation_exception_handler(request, exc)

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception):
        return await unexpected_exception_handler(request, exc)

    app.include_router(health_router)
    app.include_router(
        create_api_router(settings.test_engine_enabled),
        prefix="/api/v1",
    )
    return app


app = create_app()
