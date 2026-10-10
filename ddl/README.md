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

## อัปเดต: ฟีเจอร์ผู้ใช้ทั่วไปและแอดมิน

- ข้อมูลยามาจาก `backend/app/data/medicines.csv` (seed ครั้งแรกที่ตารางว่าง) — **ราคา/สต็อกเป็นค่าจำลอง** แอดมินแก้ได้ที่ `/admin` → Medicines
- **ผู้ใช้ทั่วไป**: หน้าแรกเลือกยาตามหมวดหมู่ (ปุ่มหมวด/dropdown บนมือถือ) + ค้นหาชื่อ, หน้า `/orders` ดูออเดอร์ ชำระเงินที่ค้างอยู่ หรือยกเลิกออเดอร์
- **แอดมิน** (`/admin`): Prescriptions · Orders · **Medicines** (แก้ราคา/สต็อก/Rx, เพิ่ม, ลบ) · **Users** (ระงับ/เปิดใช้งานบัญชี)
- ผู้สมัครคนแรกของระบบเป็นแอดมินอัตโนมัติ
- API ใหม่ (แอดมินเท่านั้น): `POST /medicines`, `PUT /medicines/{id}`, `DELETE /medicines/{id}`; `GET /users` ถูกจำกัดเฉพาะแอดมิน; `GET /categories` คืน `medicine_count`

## แชทบอท (โมเดลรันเองบนเครื่อง)

- ปุ่ม "Ask the assistant" มุมขวาล่าง (เฉพาะผู้ใช้ที่ล็อกอิน) ยิงไป `POST /chat`
- ตอบจาก `backend/app/data/chatbot_dataset.csv` (415 คู่ ยังรอเภสัชกรตรวจ) + ข้อมูลยาสดในฐานข้อมูล (ราคา สต็อก ต้องมีใบสั่งแพทย์หรือไม่) ค้นแถวที่เกี่ยวข้องด้วย TF-IDF ตัวอักษร แล้วส่งให้โมเดลที่รันผ่าน **Ollama** พร้อมกฎความปลอดภัย (`app/chatbot.py`) ไม่มีข้อมูลออกนอกเครื่อง ไม่ต้องใช้ API key
- **ติดตั้ง (แนะนำ — ใช้ GPU ได้เลย):** ลง Ollama บนเครื่องจาก ollama.com แล้วรัน `ollama pull qwen2.5:3b` จากนั้น `docker compose up --build` ตามปกติ backend ใน Docker จะเรียกไปที่ Ollama บนเครื่อง (`OLLAMA_URL=http://host.docker.internal:11434`) ถ้า Ollama ยังไม่เปิดหรือยังไม่ได้ pull แชทจะตอบแบบสำรอง (ค้นข้อมูลอย่างเดียว)
- **ทางเลือก: รัน Ollama ใน Docker:** `docker compose --profile ollama up --build` และตั้ง `OLLAMA_URL=http://ollama:11434` ใน `.env` (ถ้าจะใช้ GPU ต้องเอาคอมเมนต์ส่วน `deploy` ใน `docker-compose.yml` ออก และตั้ง NVIDIA Container Toolkit)
- **เลือกโมเดล (`OLLAMA_MODEL`):** การ์ด VRAM 4 GB อย่าง GTX 1650 → `qwen2.5:3b` (ค่าเริ่มต้น) ใส่การ์ดได้ทั้งตัว, `gemma3:4b` น่าลองเทียบภาษาไทย, `qwen2.5:7b` ใส่การ์ดไม่หมดเลยช้าลง ควรลองถามชุดคำถามเดียวกันกับหลายโมเดลแล้วเลือกตัวที่ตอบดีและเร็วพอ หลังเปลี่ยนโมเดลต้อง `ollama pull` ตัวใหม่ก่อน
- **ความเร็ว:** มี GPU และโมเดลใส่การ์ดได้หมดจะตอบได้ในไม่กี่วินาที ถ้าต้องแบ่งไป CPU จะช้าลง ถ้าเครื่องไม่ไหวให้ตั้ง `CHAT_BACKEND=retrieval` (ไม่ใช้โมเดลเลย)
- **เรื่องฉุกเฉิน** (อยากทำร้ายตัวเอง หายใจลำบาก เด็กกินยาผิด ฯลฯ) ตอบด้วยข้อความที่เขียนไว้ล่วงหน้า ไม่ผ่านโมเดล และไม่ถูกจำกัด rate limit
- จำกัด 20 ข้อความ / 10 นาที / ผู้ใช้ (`CHAT_RATE_LIMIT`, `CHAT_RATE_WINDOW_SECONDS`) เก็บในหน่วยความจำ ถ้ารันหลาย worker ควรย้ายไป Redis ระบบไม่บันทึกเนื้อหาแชทลงฐานข้อมูลหรือ log
- **ก่อนเปิดให้ลูกค้าใช้:** โมเดลขนาดเล็กที่รันเองอาจตอบผิดหรือไม่ทำตามกฎเสมอไป ต้องให้เภสัชกรตรวจชุดข้อมูลและลองถามจริงหลายแบบก่อน
