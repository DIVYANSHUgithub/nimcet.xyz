from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "")


def error_body(
    request: Request,
    code: str,
    message: str,
    details: Any = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {
        "code": code,
        "message": message,
        "request_id": _request_id(request),
    }
    if details is not None:
        error["details"] = details
    return {"error": error}


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    code = str(detail.get("code", "http_error"))
    message = str(detail.get("message", "Request could not be completed."))
    details = detail.get("details")
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(request, code, message, details),
        headers=exc.headers,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Do not return Pydantic's `input` field; it may contain passwords or tokens.
    details = [
        {
            "location": [str(part) for part in issue.get("loc", ())],
            "message": str(issue.get("msg", "Invalid value.")),
            "type": str(issue.get("type", "validation_error")),
        }
        for issue in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=error_body(request, "validation_error", "Request validation failed.", details),
    )


async def unexpected_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_body(request, "internal_error", "An unexpected server error occurred."),
    )
