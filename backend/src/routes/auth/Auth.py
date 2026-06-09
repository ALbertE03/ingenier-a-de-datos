from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.rate_limit import limiter
from src.routes.schemas import schemas_auth
from src.db.session import get_db
from src.db import models
from src.utils import auth

router = APIRouter(prefix="/auth", tags=["Authentication"])

@limiter.limit("5/minute")
@router.post("/register", response_model=schemas_auth.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_in: schemas_auth.UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).filter(models.User.username == user_in.username))
    user_db = result.scalars().first()
    if user_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )
    
    result = await db.execute(select(models.User).filter(models.User.email == user_in.email))
    user_db = result.scalars().first()
    if user_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado"
        )
    
    hashed_password = auth.get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        role="user"  
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@limiter.limit("10/minute")
@router.post("/login", response_model=schemas_auth.Token)
async def login(request: Request, credentials: schemas_auth.UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).filter(models.User.username == credentials.username))
    user = result.scalars().first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@limiter.limit("30/minute")
@router.get("/me", response_model=schemas_auth.UserResponse)
def get_me(request: Request, current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

