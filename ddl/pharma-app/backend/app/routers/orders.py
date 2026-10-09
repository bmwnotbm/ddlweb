import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_admin

router = APIRouter(prefix="/orders", tags=["Orders"])


def _order_to_response(order: models.Order) -> schemas.OrderResponse:
    return schemas.OrderResponse(
        id=order.id,
        customer_id=order.customer_id,
        order_date=order.order_date,
        total_amount=float(order.total_amount),
        status=order.status,
        items=[
            schemas.OrderItemResponse(
                id=item.id,
                medicine_id=item.medicine_id,
                medicine_name=item.medicine.name,
                quantity=item.quantity,
                price=float(item.price),
                subtotal=float(item.price) * item.quantity,
            )
            for item in order.items
        ],
        payment=(
            schemas.PaymentResponse(
                id=order.payments[0].id,
                payment_date=order.payments[0].payment_date,
                amount=float(order.payments[0].amount),
                payment_method=order.payments[0].payment_method,
                status=order.payments[0].status,
            )
            if order.payments
            else None
        ),
        shipment=(
            schemas.ShipmentResponse(
                id=order.shipments[0].id,
                shipping_address=order.shipments[0].shipping_address,
                tracking_number=order.shipments[0].tracking_number,
                status=order.shipments[0].status,
            )
            if order.shipments
            else None
        ),
    )


def _get_order_or_404(order_id: int, db: Session) -> models.Order:
    order = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.medicine),
            joinedload(models.Order.payments),
            joinedload(models.Order.shipments),
        )
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("", response_model=schemas.OrderResponse, status_code=201)
def create_order(
    payload: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # รวมจำนวนต่อยา เผื่อผู้ใช้ส่งยาตัวเดียวกันมาหลายบรรทัด
    quantities: dict[int, int] = {}
    for item in payload.items:
        quantities[item.medicine_id] = quantities.get(item.medicine_id, 0) + item.quantity

    medicines = (
        db.query(models.Medicine)
        .filter(models.Medicine.id.in_(quantities.keys()))
        .all()
    )
    medicines_by_id = {m.id: m for m in medicines}

    missing = set(quantities.keys()) - medicines_by_id.keys()
    if missing:
        raise HTTPException(status_code=404, detail=f"Medicine not found: {sorted(missing)}")

    # ตรวจสต็อกและใบสั่งแพทย์ก่อนตัดจริง
    requires_rx = False
    for medicine_id, qty in quantities.items():
        medicine = medicines_by_id[medicine_id]
        if medicine.stock < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock for '{medicine.name}' (available: {medicine.stock})",
            )
        if medicine.requires_prescription:
            requires_rx = True

    if requires_rx:
        has_verified_prescription = (
            db.query(models.Prescription)
            .filter(
                models.Prescription.customer_id == current_user.id,
                models.Prescription.status == "Verified",
            )
            .first()
            is not None
        )
        if not has_verified_prescription:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Your cart contains a prescription-only item. "
                    "Submit a prescription via POST /prescriptions and wait for verification first."
                ),
            )

    order = models.Order(
        customer_id=current_user.id,
        order_date=datetime.date.today(),
        total_amount=0,
        status="Pending Payment",
    )
    db.add(order)
    db.flush()  # ให้ order ได้ id ก่อนสร้าง order_items

    total = 0.0
    for medicine_id, qty in quantities.items():
        medicine = medicines_by_id[medicine_id]
        medicine.stock -= qty
        db.add(
            models.OrderItem(
                order_id=order.id,
                medicine_id=medicine.id,
                quantity=qty,
                price=medicine.price,
            )
        )
        total += float(medicine.price) * qty

    order.total_amount = total
    db.add(
        models.Shipment(
            order_id=order.id,
            shipping_address=payload.shipping_address,
            status="Preparing",
        )
    )

    db.commit()
    order = _get_order_or_404(order.id, db)
    return _order_to_response(order)


@router.get("", response_model=schemas.PaginatedOrders)
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    all: bool = Query(False, description="แอดมินเท่านั้น: ดูออเดอร์ของทุกคน"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.medicine),
        joinedload(models.Order.payments),
        joinedload(models.Order.shipments),
    )

    if all:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Administrator access required")
    else:
        query = query.filter(models.Order.customer_id == current_user.id)

    total = query.count()
    orders = (
        query.order_by(models.Order.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.PaginatedOrders(
        total=total,
        page=page,
        page_size=page_size,
        items=[_order_to_response(o) for o in orders],
    )


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = _get_order_or_404(order_id, db)
    if order.customer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You can only view your own orders")
    return _order_to_response(order)


@router.post("/{order_id}/pay", response_model=schemas.OrderResponse)
def pay_order(
    order_id: int,
    payload: schemas.PayOrderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = _get_order_or_404(order_id, db)
    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only pay for your own orders")
    if order.status != "Pending Payment":
        raise HTTPException(status_code=400, detail=f"Order is already '{order.status}'")

    db.add(
        models.Payment(
            order_id=order.id,
            payment_date=datetime.date.today(),
            amount=order.total_amount,
            payment_method=payload.payment_method,
            status="Completed",
        )
    )
    order.status = "Paid"
    db.commit()

    order = _get_order_or_404(order_id, db)
    return _order_to_response(order)


@router.put("/{order_id}/shipment", response_model=schemas.OrderResponse)
def update_shipment(
    order_id: int,
    payload: schemas.ShipmentUpdateRequest,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    order = _get_order_or_404(order_id, db)
    if not order.shipments:
        raise HTTPException(status_code=404, detail="This order has no shipment record")

    shipment = order.shipments[0]
    shipment.status = payload.status
    if payload.tracking_number is not None:
        shipment.tracking_number = payload.tracking_number

    if payload.status in ("Shipped", "Delivered"):
        order.status = payload.status

    db.commit()
    order = _get_order_or_404(order_id, db)
    return _order_to_response(order)


@router.delete("/{order_id}", response_model=schemas.MessageResponse)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = _get_order_or_404(order_id, db)
    if order.customer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="You can only cancel your own orders")
    if order.status != "Pending Payment":
        raise HTTPException(
            status_code=400,
            detail="Only orders that are still 'Pending Payment' can be cancelled",
        )

    # คืนสต็อกก่อนลบออเดอร์
    for item in order.items:
        item.medicine.stock += item.quantity

    db.delete(order)  # cascade ลบ order_items / payments / shipments ให้อัตโนมัติ
    db.commit()
    return schemas.MessageResponse(message="Order cancelled and stock restored")
