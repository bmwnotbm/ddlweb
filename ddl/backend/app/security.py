import datetime
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> tuple[str, str, datetime.datetime]:
    """สร้าง JWT คืนค่า (token, jti, expiry) — jti ใช้สำหรับ logout/blacklist"""
    jti = str(uuid.uuid4())
    expire = datetime.datetime.utcnow() + datetime.timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode = {"sub": subject, "jti": jti, "exp": expire}
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return token, jti, expire


def decode_access_token(token: str) -> dict:
    """ถอดรหัส JWT — โยน JWTError ถ้า token ไม่ถูกต้องหรือหมดอายุ"""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
