"""
Seed ข้อมูลยาจากไฟล์ app/data/medicines.csv (ฐานข้อมูลยา NSC)

หมายเหตุสำคัญ — ข้อมูลที่ CSV ไม่มี จึงกำหนดเองเพื่อใช้สาธิตระบบ:
  1) ราคา / จำนวนสต็อก  -> สร้างค่าจำลองแบบคงที่จากชื่อยา (ไม่ใช่ราคาจริง แก้ใน placeholder_price_and_stock)
  2) requires_prescription -> ยาที่อยู่ใน OTC_KEYS ถือเป็นยาทั่วไป (ไม่ต้องมีใบสั่งแพทย์)
     ยาอื่นทั้งหมดตั้งเป็น "ต้องมีใบสั่งแพทย์" (เลือกด้านปลอดภัยไว้ก่อน)
     แก้ไขรายการได้ที่ OTC_KEYS ด้านล่าง
"""
import csv
import re
import zlib
from pathlib import Path

from sqlalchemy.orm import Session

from app import models

CSV_PATH = Path(__file__).parent / "data" / "medicines.csv"

# ลำดับหมวดหมู่ที่แสดงบนหน้าเว็บ
GROUP_ORDER = [
    "Cardiovascular",
    "Diabetes",
    "Cholesterol",
    "Pain & Fever",
    "Muscle & Joint",
    "Digestive",
    "Allergy",
    "Respiratory",
    "Antibiotics",
    "Other Anti-infectives",
    "Neurology & Mental Health",
    "Hormones & Steroids",
    "Herbal",
]

# (คำที่พบในหมวดหมู่ภาษาไทยของ CSV, หมวดหมู่ที่แสดงบนเว็บ) — เช็คเรียงตามลำดับ
GROUP_RULES = [
    ("สมุนไพร", "Herbal"),
    ("เบาหวาน", "Diabetes"),
    ("ไขมัน", "Cholesterol"),
    ("ความดัน", "Cardiovascular"),
    ("หัวใจ", "Cardiovascular"),
    ("เกล็ดเลือด", "Cardiovascular"),
    ("แข็งตัวของเลือด", "Cardiovascular"),
    ("ขับปัสสาวะ", "Cardiovascular"),
    ("ต้านการอักเสบ", "Pain & Fever"),
    ("ปวดและลดไข้", "Pain & Fever"),
    ("โอปิออยด์", "Pain & Fever"),
    ("คลายกล้ามเนื้อ", "Muscle & Joint"),
    ("ข้อและกระดูก", "Muscle & Joint"),
    ("แก้แพ้", "Allergy"),
    ("ระบบทางเดินหายใจ", "Respiratory"),
    ("ต้านแบคทีเรีย", "Antibiotics"),
    ("ต้านจุลชีพ", "Antibiotics"),
    ("เชื้อรา", "Other Anti-infectives"),
    ("ไวรัส", "Other Anti-infectives"),
    ("พยาธิ", "Other Anti-infectives"),
    ("ทางเดินอาหาร", "Digestive"),
    ("คลื่นไส้อาเจียน", "Digestive"),
    ("ยาระบาย", "Digestive"),
    ("ระบบประสาท", "Neurology & Mental Health"),
    ("กันชัก", "Neurology & Mental Health"),
    ("สเตียรอยด์", "Hormones & Steroids"),
    ("ฮอร์โมน", "Hormones & Steroids"),
    ("5-alpha", "Hormones & Steroids"),
]

# ยาทั่วไปที่ไม่ต้องมีใบสั่งแพทย์ (key = ชื่อยาตัวพิมพ์เล็ก ไม่รวมวงเล็บ)
OTC_KEYS = {
    "paracetamol",
    "senna",
    "ors",
    "simethicone",
    "antacids",
    "emblica cough syrup",
    "dextromethorphan",
    "activated charcoal",
    "gripe water",
    "andrographis paniculata",
    "digestive enzymes",
    "loratadine",
    "chlorpheniramine",
    "cetirizine",
    "colpermin / peppermint oil",
    "glucosamine sulfate",
    "loperamide",
    "acetylcysteine",
    "mebendazole",
    "dimenhydrinate",
}

_THAI = re.compile(r"[\u0E00-\u0E7F]")
_PAREN = re.compile(r"\s*\(([^)]*)\)")


def medicine_key(name: str) -> str:
    """ชื่อยาแบบย่อ (ตัวพิมพ์เล็ก ไม่มีวงเล็บ) ใช้จับคู่ OTC และตาราง drug interaction"""
    return _PAREN.sub("", name).strip().lower()


def display_name(raw: str) -> str:
    """ตัดวงเล็บที่เป็นภาษาไทยออก (เว็บเป็นภาษาอังกฤษ) เช่น 'Senna (มะขามแขก)' -> 'Senna'"""
    cleaned = _PAREN.sub(lambda m: "" if _THAI.search(m.group(1)) else m.group(0), raw)
    return cleaned.strip()


def group_for(raw_category: str) -> str:
    for needle, group in GROUP_RULES:
        if needle in raw_category:
            return group
    return "Other"


def placeholder_price_and_stock(key: str, is_otc: bool) -> tuple[float, int]:
    """ราคา/สต็อกจำลอง (ไม่ใช่ราคาจริง): ยาทั่วไป 20-115 บาท, ยาที่ต้องมีใบสั่งแพทย์ 60-555 บาท"""
    h = zlib.crc32(key.encode("utf-8"))
    price = 20 + (h % 20) * 5 if is_otc else 60 + (h % 100) * 5
    stock = 30 + (h >> 8) % 120  # 30 - 149
    return float(price), stock


def load_rows() -> list[dict]:
    """อ่าน CSV แล้วตัดแถวซ้ำ (ชื่อยาเดียวกัน) เก็บแถวแรกไว้"""
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)  # header
        seen: set[str] = set()
        rows = []
        for r in reader:
            if len(r) < 7 or not r[0].strip():
                continue
            name = display_name(r[0].strip())
            key = medicine_key(name)
            if key in seen:
                continue
            seen.add(key)
            rows.append(
                {
                    "name": name,
                    "key": key,
                    "name_th": r[1].strip(),
                    "description": r[2].strip(),
                    "group": group_for(r[3]),
                    "usage": r[4].strip(),
                    "precautions": r[5].strip(),
                    "side_effects": r[6].strip(),
                }
            )
        return rows


def seed_initial_data(db: Session) -> None:
    """ใส่ข้อมูลยาจาก CSV — ทำแค่ครั้งเดียวถ้าตารางยังว่าง"""
    if db.query(models.Category).first() is not None:
        return

    rows = load_rows()
    used = {r["group"] for r in rows}
    categories: dict[str, models.Category] = {}
    for name in [g for g in GROUP_ORDER if g in used] + sorted(used - set(GROUP_ORDER)):
        category = models.Category(name=name)
        db.add(category)
        categories[name] = category
    db.flush()

    for r in rows:
        is_otc = r["key"] in OTC_KEYS
        price, stock = placeholder_price_and_stock(r["key"], is_otc)
        db.add(
            models.Medicine(
                category_id=categories[r["group"]].id,
                name=r["name"],
                name_th=r["name_th"],
                description=r["description"],
                usage=r["usage"],
                precautions=r["precautions"],
                side_effects=r["side_effects"],
                price=price,
                stock=stock,
                requires_prescription=not is_otc,
            )
        )
    db.commit()
