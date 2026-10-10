import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ----- Auth -----
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


# ----- User -----
class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class PaginatedUsers(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[UserResponse]


class UsernameAvailability(BaseModel):
    username: str
    available: bool


# ----- Catalog -----
class CategoryResponse(BaseModel):
    id: int
    name: str
    medicine_count: int = 0


class MedicineResponse(BaseModel):
    id: int
    name: str
    name_th: Optional[str] = None
    category_id: int
    category: str
    description: Optional[str] = None
    usage: Optional[str] = None
    precautions: Optional[str] = None
    side_effects: Optional[str] = None
    price: float
    stock: int
    requires_prescription: bool
    expiry_date: Optional[datetime.date] = None


class MedicineCreate(BaseModel):
    """แอดมินเพิ่มยาใหม่"""

    category_id: int
    name: str = Field(min_length=1, max_length=150)
    name_th: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = None
    usage: Optional[str] = None
    precautions: Optional[str] = None
    side_effects: Optional[str] = None
    price: float = Field(ge=0, le=1_000_000)
    stock: int = Field(ge=0, le=1_000_000)
    expiry_date: Optional[datetime.date] = None
    requires_prescription: bool = False


class MedicineUpdate(BaseModel):
    """แอดมินแก้ไขยา — ส่งมาเฉพาะฟิลด์ที่ต้องการเปลี่ยน"""

    category_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    name_th: Optional[str] = Field(default=None, max_length=150)
    description: Optional[str] = None
    usage: Optional[str] = None
    precautions: Optional[str] = None
    side_effects: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    stock: Optional[int] = Field(default=None, ge=0, le=1_000_000)
    expiry_date: Optional[datetime.date] = None
    requires_prescription: Optional[bool] = None


class InteractionCheckRequest(BaseModel):
    medicine_ids: list[int] = Field(min_length=1)


class InteractionWarning(BaseModel):
    medicine_a: str
    medicine_b: str
    message: str
    severity: str


# ----- Orders -----
class OrderItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0, le=999)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)
    shipping_address: str = Field(min_length=1, max_length=255)


class OrderItemResponse(BaseModel):
    id: int
    medicine_id: int
    medicine_name: str
    quantity: int
    price: float
    subtotal: float


class PaymentResponse(BaseModel):
    id: int
    payment_date: Optional[datetime.date] = None
    amount: float
    payment_method: Optional[str] = None
    status: str


class ShipmentResponse(BaseModel):
    id: int
    shipping_address: str
    tracking_number: Optional[str] = None
    status: str


class OrderResponse(BaseModel):
    id: int
    customer_id: int
    order_date: datetime.date
    total_amount: float
    status: str
    items: list[OrderItemResponse]
    payment: Optional[PaymentResponse] = None
    shipment: Optional[ShipmentResponse] = None


class PaginatedOrders(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[OrderResponse]


class PayOrderRequest(BaseModel):
    payment_method: str = Field(min_length=1, max_length=50)


class ShipmentUpdateRequest(BaseModel):
    tracking_number: Optional[str] = Field(default=None, max_length=100)
    status: str = Field(min_length=1, max_length=50)


# ----- Prescriptions -----
class PrescriptionResponse(BaseModel):
    id: int
    customer_id: int
    prescription_date: datetime.date
    doctor_name: Optional[str] = None
    status: str
    file_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PrescriptionReviewRequest(BaseModel):
    status: str = Field(pattern="^(Verified|Rejected)$")


# ----- Chatbot -----
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


class ChatMedicine(BaseModel):
    id: int
    name: str
    name_th: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    mode: Literal["llm", "retrieval", "emergency"] = "llm"  # llm = โมเดลตอบ | retrieval = ตอบจากข้อมูลตรง ๆ
    medicines: list[ChatMedicine] = []  # ยาในร้านที่ถูกเอ่ยถึง ให้ frontend ทำลิงก์ไปดูในแคตตาล็อก
