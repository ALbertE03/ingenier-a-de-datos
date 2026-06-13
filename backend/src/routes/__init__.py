from fastapi import APIRouter
from src.config import API_V1_PREFIX
from src.routes.auth.Auth import router as auth_router
from src.routes.analytics.analytics import router as analytics_router

api_router = APIRouter(prefix=API_V1_PREFIX)
api_router.include_router(auth_router)
api_router.include_router(analytics_router)
