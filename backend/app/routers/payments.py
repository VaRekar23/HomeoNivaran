import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.dependencies.auth import require_patient
from app.models.user import User
from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentVerifyRequest,
    PaymentResponse
)
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "/initiate",
    response_model=PaymentInitiateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate payment for an order"
)
async def initiate_payment(
    data: PaymentInitiateRequest,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a Razorpay payment order.
    Returns the details frontend needs to open the Razorpay popup.

    Flow:
    1. Call this endpoint → get razorpay_order_id
    2. Open Razorpay popup with razorpay_order_id + razorpay_key_id
    3. Patient pays → Razorpay calls your frontend callback
    4. Call /payments/verify with the 3 values from Razorpay
    """
    return await payment_service.initiate_payment(
        db, data.order_id, current_user.id
    )


@router.post(
    "/verify",
    response_model=PaymentResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify payment after Razorpay callback"
)
async def verify_payment(
    data: PaymentVerifyRequest,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies a Razorpay payment after patient completes it.
    Send the 3 values Razorpay returns in its callback:
    - razorpay_order_id
    - razorpay_payment_id
    - razorpay_signature

    On success:
    - Order marked as paid
    - Consultation closed
    - Doctor notified
    - Patient notified
    """
    return await payment_service.verify_payment(
        db, data, current_user.id
    )


@router.get(
    "/{order_id}",
    response_model=PaymentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get payment details for an order"
)
async def get_payment(
    order_id: uuid.UUID,
    current_user: User = Depends(require_patient),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the payment record for a specific order.
    Patient can check their payment status here.
    """
    return await payment_service.get_payment_by_order(
        db, order_id, current_user.id
    )