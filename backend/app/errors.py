from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException


def error_body(code, message, details=None):
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        }
    }


async def http_error(request, exc: HTTPException):
    detail = exc.detail

    if isinstance(detail, dict) and "code" in detail:
        code = detail["code"]
        message = detail.get("message", "Request failed")
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(detail)

    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(code, message),
    )


async def validation_error(request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=error_body(
            "VALIDATION_ERROR",
            "Invalid input",
            jsonable_encoder(exc.errors()),
        ),
    )
