# เว็บสั่งยาออนไลน์ (Online Pharmacy) — Starter

โครงสร้าง Full-stack เริ่มต้น: **Next.js (React)** + **FastAPI** โดยยังไม่ต่อ Database จริง (ใช้ Mock Data)

```
pharma-app/
├── backend/
│   ├── main.py            # FastAPI app + GET /medicines
│   └── requirements.txt
└── frontend/
    ├── pages/
    │   ├── _app.js         # ครอบด้วย CartProvider + Header
    │   ├── index.js         # หน้า Home: Grid รายการยา ดึงจาก API
    │   └── cart.js           # หน้า Cart: รายการ + ปุ่มอัปโหลดใบสั่งแพทย์ (mock)
    ├── components/
    │   ├── Header.js
    │   ├── MedicineCard.js
    │   └── CartItem.js
    ├── context/
    │   └── CartContext.js    # เก็บ state ตะกร้าแบบ React Context
    ├── styles/globals.css
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── .env.local.example
```

## วิธีรัน

### 1) Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

ทดสอบ: เปิด `http://localhost:8000/medicines` ควรเห็น JSON รายการยา 5 รายการ
เอกสาร API อัตโนมัติ: `http://localhost:8000/docs`

### 2) Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # ตั้งค่า URL ของ backend
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

> ⚠️ ต้องรัน **backend ก่อน** (พอร์ต 8000) แล้วค่อยรัน frontend (พอร์ต 3000) เพื่อให้หน้า Home ดึงข้อมูลได้สำเร็จ

## สิ่งที่ทำไว้ให้แล้ว

- **Home (`/`)**: ดึงข้อมูลจาก `GET /medicines` แล้วแสดงเป็น Grid การ์ดยา พร้อมป้าย "ต้องมีใบสั่งแพทย์" และปุ่มเพิ่มลงตะกร้า
- **Cart (`/cart`)**: แสดงรายการสินค้าที่เพิ่มไว้ ปรับจำนวนได้ ลบได้ คำนวณยอดรวม และมีปุ่ม **"อัปโหลดใบสั่งแพทย์"** (จำลอง — เลือกไฟล์จากเครื่องแล้วเก็บชื่อไฟล์ไว้ใน state เฉยๆ ยังไม่ได้ส่งขึ้น server จริง) ปุ่มชำระเงินจะถูก disable ถ้ามียาที่ต้องมีใบสั่งแพทย์แต่ยังไม่อัปโหลด
- **Backend**: Endpoint เดียว `GET /medicines` คืนยา 5 รายการ (id, name, category, price, requires_prescription, image_url, stock) พร้อมเปิด CORS ให้ frontend เรียกได้

## สิ่งที่ควรทำต่อ (ยังไม่รวมในสโคปนี้)

- ต่อฐานข้อมูลจริง (เช่น PostgreSQL + SQLModel/SQLAlchemy) แทน Mock Data
- Endpoint สำหรับอัปโหลดไฟล์ใบสั่งแพทย์จริง (เช่น `POST /prescriptions/upload`) และเก็บไฟล์อย่างปลอดภัย (encryption, access control) เพราะเป็นข้อมูลสุขภาพที่อ่อนไหว
- ระบบยืนยันตัวตน/ผู้ใช้ (login), ระบบตรวจสอบใบสั่งแพทย์โดยเภสัชกรก่อนอนุมัติคำสั่งซื้อ
- หน้า Checkout และระบบชำระเงินจริง
- การปฏิบัติตามกฎหมาย/ระเบียบด้านยาและข้อมูลสุขภาพของไทย (เช่น การควบคุมการขายยาที่ต้องใช้ใบสั่งแพทย์)
