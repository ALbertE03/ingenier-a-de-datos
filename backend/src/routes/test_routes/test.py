from fastapi import APIRouter, Depends
from src.utils import auth
from src.db import models

router = APIRouter(prefix="/test", tags=["Protected Resources"])

@router.get("/public")
def get_public_data():
    return {
        "status": "success",
        "message": "Este endpoint es público y accesible por cualquiera sin autenticación.",
        "data": [
            {"id": 1, "name": "Modelo GPT-4o", "creator": "OpenAI", "type": "Text/LLM"},
            {"id": 2, "name": "Modelo Claude 3.5 Sonnet", "creator": "Anthropic", "type": "Text/LLM"},
            {"id": 3, "name": "Modelo Stable Diffusion 3", "creator": "Stability AI", "type": "Image Generation"}
        ]
    }

@router.get("/user-only")
def get_user_data(current_user: models.User = Depends(auth.get_current_active_user)):
    return {
        "status": "success",
        "message": f"Hola {current_user.username}. Has accedido a un endpoint protegido para usuarios autenticados.",
        "user_role": current_user.role,
        "protected_data": {
            "internal_news": "Próxima actualización del sistema programada para el fin de semana.",
            "documentation_link": "https://docs.internal-systems.local"
        }
    }

@router.get("/admin-only")
def get_admin_data(current_user: models.User = Depends(auth.get_current_active_admin)):
    return {
        "status": "success",
        "message": f"Acceso concedido al Administrador: {current_user.username}.",
        "user_role": current_user.role,
        "admin_stats": {
            "total_users": 1540,
            "active_sessions": 24,
            "system_cpu_usage": "14%",
            "db_status": "Healthy",
            "server_logs": [
                "[INFO] 2026-06-04 05:12:30 - Backup completado exitosamente",
                "[WARN] 2026-06-04 05:14:15 - Intento de login fallido en ip 192.168.1.50",
                "[INFO] 2026-06-04 05:17:00 - Nuevo usuario registrado: alberto"
            ]
        }
    }
