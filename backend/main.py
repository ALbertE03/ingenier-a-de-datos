import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from src.rate_limit import limiter
from src.routes import api_router
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
from sqlalchemy import select
from src.db.session import SessionLocal
from src.db import models
from src.utils import auth
load_dotenv()
admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
admin_password = os.getenv("ADMIN_PASSWORD", "admin123")


@asynccontextmanager
async def lifespan(app: FastAPI):
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
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print("Default admin user created successfully.")
        else:
            print("Admin user already exists.")
    yield

app = FastAPI(
    title="EcoTrans API",
    description="Sistema de Monitoreo y Análisis de la Red de Transporte Urbano",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

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

app.add_middleware(SlowAPIMiddleware)

app.include_router(api_router)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
