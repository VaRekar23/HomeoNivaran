import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PaymentInitiateRequest(BaseModel):
    """Patient sends order_id to start payment."""
    order_id: uuid.UUID


class PaymentInitiateResponse(BaseModel):
    """
    Returned after creating a Razorpay order.
    Frontend uses these values to open the Razorpay payment popup.
    """
    razorpay_order_id: str
    amount: int              # amount in PAISE (INR × 100)
    currency: str            # always "INR"
    razorpay_key_id: str     # public key — safe to send to frontend


class PaymentVerifyRequest(BaseModel):
    """
    Sent by frontend after Razorpay payment popup completes.
    These three fields come directly from Razorpay's callback.
    """
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentResponse(BaseModel):
    """Payment record returned to client."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: Optional[str]
    amount: float
    currency: str
    status: str
    initiated_at: datetime
    completed_at: Optional[datetime]