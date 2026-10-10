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

    # แชทบอท — โมเดลภาษารันเองบนเครื่องผ่าน Ollama (ไม่ส่งข้อมูลออกนอกเซิร์ฟเวอร์)
    chat_backend: str = "ollama"  # "ollama" = ใช้โมเดล | "retrieval" = ค้นข้อมูลอย่างเดียว ไม่ใช้โมเดล
    ollama_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "qwen2.5:3b"
    ollama_timeout_seconds: int = 180  # โมเดลบน CPU ตอบช้า
    chat_rate_limit: int = 20  # จำนวนข้อความสูงสุดต่อผู้ใช้ (กันเครื่องถูกใช้จนอืด)
    chat_rate_window_seconds: int = 600  # ภายในกี่วินาที

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
