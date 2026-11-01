from fastapi import APIRouter

from app.api.v1.routes.me import router as me_router
from app.api.v1.routes.admin import router as admin_router
from app.api.v1.routes.questions import router as questions_router
from app.api.v1.routes.test_engine import attempts_router, student_analytics_router, tests_router
from app.api.v1.routes.test_authoring import router as test_authoring_router

api_router = APIRouter()
api_router.include_router(me_router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(questions_router, prefix="/questions", tags=["questions"])
api_router.include_router(tests_router, prefix="/tests", tags=["tests"])
api_router.include_router(attempts_router, prefix="/attempts", tags=["attempts"])
api_router.include_router(student_analytics_router, prefix="/students", tags=["student analytics"])
api_router.include_router(test_authoring_router, prefix="/admin", tags=["admin tests"])
