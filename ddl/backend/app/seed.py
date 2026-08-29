import datetime

from sqlalchemy.orm import Session

from app import models

CATEGORIES = [
    "Pain Relief",
    "Allergy Relief",
    "Cough & Cold",
    "Vitamins",
    "Topical Medicine",
    "Antibiotics",
    "Gastrointestinal",
]

# (category_name, name, description, price, stock, expiry_date, requires_prescription)
MEDICINES = [
    ("Pain Relief", "Paracetamol 500mg", "Pain and fever relief", 35.00, 100, "2028-12-31", False),
    ("Pain Relief", "Muscle Pain Relief", "Relief for muscle pain", 85.00, 50, "2028-06-30", False),
    ("Allergy Relief", "Antihistamine", "Relief from allergy symptoms", 60.00, 80, "2028-09-30", False),
    ("Cough & Cold", "Cough Syrup", "Relief from cough symptoms", 75.00, 60, "2027-12-31", False),
    ("Vitamins", "Vitamin C 1000mg", "Vitamin C supplement", 250.00, 40, "2029-01-31", False),
    ("Vitamins", "Vitamin B Complex", "B-complex vitamin supplement", 180.00, 35, "2028-11-30", False),
    ("Topical Medicine", "Skin Cream", "Topical skin cream", 120.00, 45, "2028-08-31", False),
    # ยาควบคุม — ต้องมีใบสั่งแพทย์ที่ verified แล้วถึงจะสั่งซื้อได้ (ทดสอบ prescription-gate ผ่านจุดนี้)
    ("Antibiotics", "Amoxicillin 500mg", "Broad-spectrum antibiotic", 90.00, 40, "2028-05-31", True),
    ("Antibiotics", "Ciprofloxacin 500mg", "Antibiotic for bacterial infections", 110.00, 30, "2028-04-30", True),
    ("Gastrointestinal", "Omeprazole 20mg", "Proton pump inhibitor for acid reflux", 95.00, 50, "2028-07-31", True),
]


def seed_initial_data(db: Session) -> None:
    """ใส่ข้อมูล categories/medicines ตั้งต้น — ทำแค่ครั้งเดียวถ้าตารางยังว่างอยู่"""
    if db.query(models.Category).first() is not None:
        return  # เคย seed ไปแล้ว ไม่ต้องทำซ้ำ

    name_to_category = {}
    for name in CATEGORIES:
        category = models.Category(name=name)
        db.add(category)
        name_to_category[name] = category
    db.flush()  # ให้ category ได้ id ก่อนใช้ผูกกับ medicine

    for category_name, name, description, price, stock, expiry_date, requires_rx in MEDICINES:
        db.add(
            models.Medicine(
                category_id=name_to_category[category_name].id,
                name=name,
                description=description,
                price=price,
                stock=stock,
                expiry_date=datetime.date.fromisoformat(expiry_date),
                requires_prescription=requires_rx,
            )
        )

    db.commit()
