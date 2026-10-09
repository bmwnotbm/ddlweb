import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    """บัญชีผู้ใช้ + ข้อมูลลูกค้า (รวมเป็นตัวเดียวกัน ไม่แยกตาราง customers)"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    orders = relationship("Order", back_populates="customer")
    prescriptions = relationship("Prescription", back_populates="customer")


class TokenBlacklist(Base):
    """เก็บ jti ของ access token ที่ถูก logout ไปแล้ว เพื่อกันเอามาใช้ซ้ำ"""

    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    medicines = relationship("Medicine", back_populates="category")


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(150), nullable=False)
    name_th = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)  # สรรพคุณ (indication)
    usage = Column(Text, nullable=True)  # วิธีใช้ยา
    precautions = Column(Text, nullable=True)  # ข้อควรระวัง
    side_effects = Column(Text, nullable=True)  # อาการข้างเคียง
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    expiry_date = Column(Date, nullable=True)
    requires_prescription = Column(Boolean, default=False, nullable=False)

    category = relationship("Category", back_populates="medicines")
    order_items = relationship("OrderItem", back_populates="medicine")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_date = Column(Date, default=datetime.date.today, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), nullable=False, default="Pending Payment")

    customer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)  # ราคา ณ ตอนสั่งซื้อ (เผื่อราคายาเปลี่ยนภายหลัง)

    order = relationship("Order", back_populates="items")
    medicine = relationship("Medicine", back_populates="order_items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    payment_date = Column(Date, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="Pending")

    order = relationship("Order", back_populates="payments")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    shipping_address = Column(String(255), nullable=False)
    tracking_number = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="Preparing")

    order = relationship("Order", back_populates="shipments")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prescription_date = Column(Date, default=datetime.date.today, nullable=False)
    doctor_name = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="Pending")
    file_path = Column(String(255), nullable=True)  # พาธไฟล์ใบสั่งยาที่อัปโหลด (relative ใต้โฟลเดอร์ uploads/)

    customer = relationship("User", back_populates="prescriptions")
