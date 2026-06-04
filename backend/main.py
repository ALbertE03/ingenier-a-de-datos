import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes.auth.Auth import router as auth_router
from src.routes.test_routes.test import router as models_router
from dotenv import load_dotenv
import os 
from contextlib import asynccontextmanager
import sys
import subprocess
from sqlalchemy import select
from src.db.session import SessionLocal
from src.db import models
from src.utils import auth

load_dotenv()
admin_email=os.getenv("ADMIN_EMAIL","admin@example.com")
admin_password=os.getenv("ADMIN_PASSWORD","admin123")
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run Alembic migrations automatically on startup
    print("Running database migrations...")
    try:
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
        print("Database migrations applied successfully.")
        
        # Seed default admin user if it doesn't exist
        async with SessionLocal() as db:
            result = await db.execute(select(models.User).filter(models.User.username == "admin"))
            admin_user = result.scalars().first()
            if not admin_user:
                print("Creating default admin user...")
                hashed_pw = auth.get_password_hash(admin_password)  
                admin = models.User(
                    username="admin",
                    email=admin_email,
                    hashed_password=hashed_pw,
                    role="admin",
                    is_active=True
                )
                db.add(admin)
                await db.commit()
                print("Default admin user created successfully.")
            else:
                print("Admin user already exists.")
    except Exception as e:
        print(f"Error during startup migration/seeding: {e}")
    yield

app = FastAPI(
    title="Test Auth and Roles API",
    description="API de pruebas (Test) para autenticación y control de acceso basado en roles",
    version="1.0.0",
    lifespan=lifespan
)

o = os.getenv("ORIGINS",[]).split(',')
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
] if not o else o

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(models_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "description": "API de pruebas (Test) de autenticación con FastAPI",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
