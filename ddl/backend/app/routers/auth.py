import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_token_jti, get_current_user
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username is already taken")
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been suspended")

    token, _jti, _expire = create_access_token(subject=user.username)
    return schemas.TokenResponse(access_token=token)


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(
    token_and_jti: tuple[str, str] = Depends(get_current_token_jti),
    db: Session = Depends(get_db),
):
    _token, jti = token_and_jti
    try:
        payload = decode_access_token(_token)
        expires_at = datetime.datetime.utcfromtimestamp(payload["exp"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not db.query(models.TokenBlacklist).filter(models.TokenBlacklist.jti == jti).first():
        db.add(models.TokenBlacklist(jti=jti, expires_at=expires_at))
        db.commit()
    return schemas.MessageResponse(message="Signed out")


@router.post("/change-password", response_model=schemas.MessageResponse)
def change_password(
    payload: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return schemas.MessageResponse(message="Password updated")
