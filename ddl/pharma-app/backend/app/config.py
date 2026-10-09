"""
ตั้งค่าแอปทั้งหมดอ่านจาก Environment Variables
(ตั้งค่าจริงมาจาก docker-compose.yml / ไฟล์ .env — ห้าม hardcode ความลับในโค้ด)
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ฐานข้อมูล
    database_url: str = "postgresql+psycopg2://pharma:pharma@db:5432/pharma_db"

    # JWT
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS
    frontend_origin: str = "http://localhost:3000"

    # Uploads (ใบสั่งยา)
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
