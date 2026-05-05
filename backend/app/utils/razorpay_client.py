import hmac
import hashlib
import razorpay
from app.config import settings

# Single Razorpay client instance reused across all requests
# Same pattern as our Anthropic AI client
razorpay_client = razorpay.Client(
    auth=(settings.razorpay_key_id, settings.razorpay_secret)
)


def create_razorpay_order(
    amount_in_paise: int,
    currency: str = "INR",
    receipt: str = ""
) -> dict:
    """
    Creates a Razorpay order.

    amount_in_paise: amount × 100
    (Razorpay works in smallest currency unit)
    e.g. ₹450 → 45000 paise

    Returns the Razorpay order object containing:
    - id: the razorpay_order_id to send to frontend
    - amount: confirmed amount
    - currency: confirmed currency
    """
    return razorpay_client.order.create({
        "amount": amount_in_paise,
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1
        # payment_capture=1 means auto-capture payment
        # Money is captured immediately on successful payment
        # No manual capture step needed
    })


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str
) -> bool:
    """
    Verifies that a payment is genuine by checking Razorpay's signature.

    How it works:
    Razorpay creates a signature by HMAC-SHA256 hashing:
        razorpay_order_id + "|" + razorpay_payment_id
    using your razorpay_secret as the key.

    We recreate this hash ourselves and compare.
    If they match → payment is genuine.
    If they don't → someone is trying to fake a payment.
    """
    try:
        # Build the message Razorpay signed
        message = f"{razorpay_order_id}|{razorpay_payment_id}"

        # Recreate the expected signature
        expected_signature = hmac.new(
            settings.razorpay_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        # Constant-time comparison (prevents timing attacks)
        return hmac.compare_digest(expected_signature, razorpay_signature)

    except Exception:
        return False