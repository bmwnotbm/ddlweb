"""
Drug Dealer - Online Pharmacy Backend API (FastAPI)
รันแบบ local: uvicorn main:app --reload --port 8000
รันแบบ container: docker compose up --build (ดู README.md)
"""
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.config import settings
from app.database import Base, SessionLocal, engine, get_db
from app.deps import require_admin
from app.drug_interactions import find_interactions
from app.routers import auth, orders, prescriptions, users
from app.seed import seed_initial_data

# สร้างตารางอัตโนมัติตอน startup (โปรเจกต์เล็ก/เดโม; งานจริงควรใช้ Alembic migration)
Base.metadata.create_all(bind=engine)

# ใส่ข้อมูลตั้งต้น (categories + medicines) ถ้าตารางยังว่างอยู่
with SessionLocal() as _seed_db:
    seed_initial_data(_seed_db)

# โฟลเดอร์เก็บไฟล์อัปโหลด (เช่น ใบสั่งยา) ต้องมีอยู่ก่อน mount ให้ StaticFiles เสิร์ฟได้
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Drug Dealer API")

# อนุญาตให้ Frontend (Next.js) เรียก API นี้ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(prescriptions.router)

# เสิร์ฟไฟล์ที่อัปโหลด (เช่น รูปใบสั่งยา) ผ่าน URL /uploads/...
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/", tags=["Health"])
def root():
    return {"message": "Drug Dealer API is running"}


def _medicine_to_response(medicine: models.Medicine) -> dict:
    return {
        "id": medicine.id,
        "name": medicine.name,
        "name_th": medicine.name_th,
        "category_id": medicine.category_id,
        "category": medicine.category.name,
        "description": medicine.description,
        "usage": medicine.usage,
        "precautions": medicine.precautions,
        "side_effects": medicine.side_effects,
        "price": float(medicine.price),
        "stock": medicine.stock,
        "requires_prescription": medicine.requires_prescription,
        "expiry_date": medicine.expiry_date,
    }


@app.get("/medicines", response_model=list[schemas.MedicineResponse], tags=["Medicines"])
def get_medicines(
    category: str | None = Query(None, description="กรองตามชื่อหมวดหมู่ เช่น 'Cardiovascular'"),
    db: Session = Depends(get_db),
):
    """คืนรายการยา/วิตามินทั้งหมดจากฐานข้อมูล กรองตาม category ได้ (ไม่บังคับ)"""
    query = db.query(models.Medicine).options(joinedload(models.Medicine.category))
    if category:
        query = query.join(models.Category).filter(models.Category.name == category)
    medicines = query.order_by(models.Medicine.category_id, models.Medicine.name).all()
    return [_medicine_to_response(m) for m in medicines]


@app.get("/medicines/{medicine_id}", response_model=schemas.MedicineResponse, tags=["Medicines"])
def get_medicine(medicine_id: int, db: Session = Depends(get_db)):
    medicine = (
        db.query(models.Medicine)
        .options(joinedload(models.Medicine.category))
        .filter(models.Medicine.id == medicine_id)
        .first()
    )
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return _medicine_to_response(medicine)


@app.get("/categories", response_model=list[schemas.CategoryResponse], tags=["Medicines"])
def get_categories(db: Session = Depends(get_db)):
    """หมวดหมู่ทั้งหมด พร้อมจำนวนยาในแต่ละหมวด (เรียงตามลำดับ id = ลำดับที่ตั้งใน seed)"""
    rows = (
        db.query(models.Category, func.count(models.Medicine.id))
        .outerjoin(models.Medicine, models.Medicine.category_id == models.Category.id)
        .group_by(models.Category.id)
        .order_by(models.Category.id)
        .all()
    )
    return [
        schemas.CategoryResponse(id=c.id, name=c.name, medicine_count=count) for c, count in rows
    ]


# ----- Admin: จัดการข้อมูลยา (ราคา/สต็อก/ต้องมีใบสั่งแพทย์ ฯลฯ) -----
def _load_medicine_or_404(medicine_id: int, db: Session) -> models.Medicine:
    medicine = (
        db.query(models.Medicine)
        .options(joinedload(models.Medicine.category))
        .filter(models.Medicine.id == medicine_id)
        .first()
    )
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine


def _ensure_category(category_id: int, db: Session) -> None:
    if db.query(models.Category).filter(models.Category.id == category_id).first() is None:
        raise HTTPException(status_code=400, detail="Category not found")


@app.post(
    "/medicines",
    response_model=schemas.MedicineResponse,
    status_code=201,
    tags=["Admin - Medicines"],
)
def create_medicine(
    payload: schemas.MedicineCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    _ensure_category(payload.category_id, db)
    medicine = models.Medicine(**payload.model_dump())
    db.add(medicine)
    db.commit()
    return _medicine_to_response(_load_medicine_or_404(medicine.id, db))


@app.put(
    "/medicines/{medicine_id}",
    response_model=schemas.MedicineResponse,
    tags=["Admin - Medicines"],
)
def update_medicine(
    medicine_id: int,
    payload: schemas.MedicineUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    medicine = _load_medicine_or_404(medicine_id, db)
    changes = payload.model_dump(exclude_unset=True)

    # ฟิลด์ที่ DB ห้ามเป็น NULL — ถ้าส่ง null มาให้ปฏิเสธ แทนที่จะปล่อยให้ DB error
    for required in ("category_id", "name", "price", "stock", "requires_prescription"):
        if required in changes and changes[required] is None:
            raise HTTPException(status_code=422, detail=f"'{required}' cannot be null")
    if "category_id" in changes:
        _ensure_category(changes["category_id"], db)

    for field, value in changes.items():
        setattr(medicine, field, value)
    db.commit()
    return _medicine_to_response(_load_medicine_or_404(medicine_id, db))


@app.delete("/medicines/{medicine_id}", status_code=204, tags=["Admin - Medicines"])
def delete_medicine(
    medicine_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    medicine = _load_medicine_or_404(medicine_id, db)
    # ยาที่เคยถูกสั่งซื้อแล้วลบไม่ได้ (ประวัติออเดอร์อ้างอิงอยู่) — ให้ตั้งสต็อกเป็น 0 แทน
    if db.query(models.OrderItem).filter(models.OrderItem.medicine_id == medicine_id).first():
        raise HTTPException(
            status_code=409,
            detail="This medicine appears in past orders and can't be deleted. Set its stock to 0 instead.",
        )
    db.delete(medicine)
    db.commit()
    return Response(status_code=204)


@app.post(
    "/medicines/check-interactions",
    response_model=list[schemas.InteractionWarning],
    tags=["Medicines"],
)
def check_interactions(payload: schemas.InteractionCheckRequest, db: Session = Depends(get_db)):
    """
    เช็คว่ายาในตะกร้า (ตาม medicine_id ที่ส่งมา) มีคู่ไหนอยู่ในตารางเตือนบ้าง
    เป็นแค่การ 'เตือน' เท่านั้น ไม่บล็อกการสั่งซื้อ — การตัดสินใจสุดท้ายต้องเป็นของเภสัชกร/แพทย์
    """
    medicines = (
        db.query(models.Medicine).filter(models.Medicine.id.in_(payload.medicine_ids)).all()
    )
    names = [m.name for m in medicines]
    interactions = find_interactions(names)
    return [
        schemas.InteractionWarning(
            medicine_a=i.medicine_a,
            medicine_b=i.medicine_b,
            message=i.message,
            severity=i.severity,
        )
        for i in interactions
    ]
