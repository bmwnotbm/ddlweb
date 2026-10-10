import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import chatbot, models, schemas
from app.config import settings
from app.database import get_db
from app.deps import get_current_user

router = APIRouter(tags=["Chatbot"])
logger = logging.getLogger(__name__)


def _response(reply: str, mode: str, medicines: list[models.Medicine]) -> schemas.ChatResponse:
    return schemas.ChatResponse(
        reply=reply,
        mode=mode,
        medicines=[schemas.ChatMedicine(id=m.id, name=m.name, name_th=m.name_th) for m in medicines],
    )


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """ถามตอบเรื่องยา/การใช้ร้าน — ต้องล็อกอิน"""
    if payload.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="The last message must be from the user")

    history = [m.model_dump() for m in payload.messages][-chatbot.MAX_HISTORY :]
    # ต้องเริ่มด้วยข้อความของ user
    while history and history[0]["role"] != "user":
        history.pop(0)

    # ฉุกเฉิน: ตอบทันทีด้วยข้อความที่เขียนไว้ล่วงหน้า — ทำก่อนเช็ก rate limit เพื่อไม่ให้คนที่กำลังลำบากถูกบล็อก
    emergency = chatbot.emergency_reply(history[-1]["content"])
    if emergency:
        return _response(emergency, "emergency", [])

    if not chatbot.check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=429, detail="You're sending messages too fast, please wait a few minutes"
        )

    # ข้อความสั้นหรือกว้างเกินไป: ถามกลับเลย ไม่ต้องเรียกโมเดล
    last_text = history[-1]["content"].strip()
    if len(last_text) < 4 or last_text in {"ยา", "ขอถามหน่อย"}:
        return _response(
            "อยากสอบถามเรื่องยาตัวไหนคะ เช่น วิธีกิน ราคา หรือต้องมีใบสั่งแพทย์ไหม",
            "retrieval",
            [],
        )

    if settings.chat_backend == "ollama":
        system, mentioned = chatbot.build_context(history, db)
        try:
            reply = chatbot.call_llm(system, history)
            if reply:
                return _response(reply, "llm", mentioned)
        except Exception as exc:  # Ollama ปิดอยู่ / ยังไม่ได้ pull โมเดล / timeout -> ถอยไปตอบจากข้อมูลตรง ๆ
            # log เฉพาะชนิดของ error ไม่ log เนื้อหาแชท (เป็นข้อมูลสุขภาพ)
            logger.warning("Ollama unavailable (%s), falling back to retrieval", type(exc).__name__)

    reply, mentioned = chatbot.fallback_reply(history, db)
    return _response(reply, "retrieval", mentioned)