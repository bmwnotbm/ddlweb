"""
ตารางคู่ยาที่ควรระวังเมื่อใช้ร่วมกัน — ใช้สาธิตแนวคิด "Drug interaction checking"
เป็นการสรุปแบบย่อจากความรู้เภสัชวิทยาทั่วไป ไม่ใช่ฐานข้อมูลทางคลินิกที่ครบถ้วนหรือผ่านการรับรอง
ร้านขายยาจริงต้องใช้ฐานข้อมูลที่เภสัชกรดูแลและอัปเดตตามหลักฐานทางการแพทย์

จับคู่ด้วยชื่อยาแบบย่อ (ตัวพิมพ์เล็ก ไม่มีวงเล็บ) เช่น "Aspirin (81mg)" -> "aspirin"
"""
from dataclasses import dataclass

from app.seed import medicine_key


@dataclass(frozen=True)
class Interaction:
    medicine_a: str
    medicine_b: str
    message: str
    severity: str  # "caution" | "warning"


_BLEED = "Taking these together increases the risk of bleeding."

# (key_a, key_b, message, severity)
_RULES: list[tuple[str, str, str, str]] = [
    ("warfarin", "aspirin", _BLEED, "warning"),
    ("warfarin", "ibuprofen", _BLEED, "warning"),
    ("warfarin", "diclofenac", _BLEED, "warning"),
    ("warfarin", "meloxicam", _BLEED, "warning"),
    ("rivaroxaban", "aspirin", _BLEED, "warning"),
    ("aspirin", "ibuprofen", "Ibuprofen may reduce the protective effect of low-dose aspirin.", "caution"),
    ("clopidogrel", "omeprazole", "Omeprazole may reduce the antiplatelet effect of clopidogrel.", "caution"),
    ("clopidogrel", "esomeprazole", "Esomeprazole may reduce the antiplatelet effect of clopidogrel.", "caution"),
    ("simvastatin", "clarithromycin", "Raises statin levels and the risk of muscle injury.", "warning"),
    ("atorvastatin", "clarithromycin", "Raises statin levels and the risk of muscle injury.", "caution"),
    ("digoxin", "clarithromycin", "Clarithromycin can raise digoxin levels to a toxic range.", "warning"),
    ("colchicine", "clarithromycin", "Clarithromycin can raise colchicine levels and cause toxicity.", "warning"),
    ("enalapril", "spironolactone", "Both can raise blood potassium; risk of hyperkalemia.", "warning"),
    ("losartan", "spironolactone", "Both can raise blood potassium; risk of hyperkalemia.", "warning"),
    ("telmisartan", "spironolactone", "Both can raise blood potassium; risk of hyperkalemia.", "warning"),
    ("tramadol", "fluoxetine", "Risk of serotonin syndrome and seizures.", "warning"),
    ("tramadol", "lorazepam", "Opioid plus benzodiazepine: risk of heavy sedation and slowed breathing.", "warning"),
    ("tramadol", "clonazepam", "Opioid plus benzodiazepine: risk of heavy sedation and slowed breathing.", "warning"),
    ("lorazepam", "clonazepam", "Two benzodiazepines together increase sedation.", "caution"),
]


def find_interactions(medicine_names: list[str]) -> list[Interaction]:
    """รับชื่อยาในตะกร้า คืนคู่ที่ตรงกับตารางเตือน (ใช้ชื่อที่แสดงจริงของยาแต่ละตัว)"""
    by_key = {medicine_key(n): n for n in medicine_names}
    found = []
    for key_a, key_b, message, severity in _RULES:
        if key_a in by_key and key_b in by_key:
            found.append(
                Interaction(
                    medicine_a=by_key[key_a],
                    medicine_b=by_key[key_b],
                    message=message,
                    severity=severity,
                )
            )
    return found
