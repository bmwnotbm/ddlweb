from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import decode_access_token

# HTTPBearer ทำให้ปุ่ม Authorize ใน /docs กลายเป็นช่อง "Value"
# ให้วาง access_token ที่ได้จาก /login ได้ตรงๆ ไม่ต้องกรอก username/password ซ้ำ
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials, please sign in again",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_exception
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        username: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        if username is None or jti is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # token ถูก logout ไปแล้วหรือยัง
    blacklisted = (
        db.query(models.TokenBlacklist)
        .filter(models.TokenBlacklist.jti == jti)
        .first()
    )
    if blacklisted:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been suspended")
    return user


def get_current_token_jti(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> tuple[str, str]:
    """คืน (token, jti) — ใช้ตอน logout เพื่อเอา jti ไปขึ้นบัญชีดำ"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="No token provided")
    token = credentials.credentials
    payload = decode_access_token(token)
    return token, payload.get("jti")


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return current_user
