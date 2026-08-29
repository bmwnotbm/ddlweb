import datetime
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_admin

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
UPLOAD_SUBDIR = "prescriptions"


def _prescription_to_response(p: models.Prescription) -> schemas.PrescriptionResponse:
    file_url = f"/uploads/{p.file_path}" if p.file_path else None
    return schemas.PrescriptionResponse(
        id=p.id,
        customer_id=p.customer_id,
        prescription_date=p.prescription_date,
        doctor_name=p.doctor_name,
        status=p.status,
        file_url=file_url,
    )


@router.post("", response_model=schemas.PrescriptionResponse, status_code=201)
async def submit_prescription(
    doctor_name: str | None = Form(None, max_length=100),
    file: UploadFile = File(..., description="รูปหรือ PDF ของใบสั่งยา"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, WEBP images or PDF files are allowed",
        )

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large (max {settings.max_upload_size_mb}MB)",
        )

    # ตั้งชื่อไฟล์ใหม่แบบสุ่ม กันชื่อไฟล์ชนกัน / กันคนเดารูปของคนอื่น
    extension = Path(file.filename or "").suffix.lower()
    stored_name = f"{uuid.uuid4().hex}{extension}"

    upload_dir = Path(settings.upload_dir) / UPLOAD_SUBDIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / stored_name).write_bytes(contents)

    prescription = models.Prescription(
        customer_id=current_user.id,
        prescription_date=datetime.date.today(),
        doctor_name=doctor_name,
        status="Pending",
        file_path=f"{UPLOAD_SUBDIR}/{stored_name}",
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return _prescription_to_response(prescription)


@router.get("", response_model=list[schemas.PrescriptionResponse])
def list_prescriptions(
    all: bool = Query(False, description="แอดมินเท่านั้น: ดูใบสั่งแพทย์ของทุกคน"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Prescription)
    if all:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Administrator access required")
    else:
        query = query.filter(models.Prescription.customer_id == current_user.id)
    prescriptions = query.order_by(models.Prescription.id.desc()).all()
    return [_prescription_to_response(p) for p in prescriptions]


@router.put("/{prescription_id}/review", response_model=schemas.PrescriptionResponse)
def review_prescription(
    prescription_id: int,
    payload: schemas.PrescriptionReviewRequest,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    prescription = (
        db.query(models.Prescription)
        .filter(models.Prescription.id == prescription_id)
        .first()
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    prescription.status = payload.status
    db.commit()
    db.refresh(prescription)
    return _prescription_to_response(prescription)
