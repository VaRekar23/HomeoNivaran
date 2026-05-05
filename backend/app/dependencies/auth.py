from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies.db import get_db
from app.models.user import User
from app.utils.jwt import decode_access_token

# This tells FastAPI where clients send their token
# tokenUrl is shown in Swagger UI for the "Authorize" button
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency that:
    1. Extracts JWT token from Authorization header
    2. Decodes and validates the token
    3. Fetches the user from DB
    4. Returns the user object

    Used in any route that requires authentication.
    Raises 401 if anything is invalid.
    """

    # Reusable 401 exception
    # We define it once and reuse to avoid leaking info about WHY it failed
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
        # WWW-Authenticate header tells the client what auth scheme to use
        # Required by HTTP spec for 401 responses
    )

    # Step 1 — Decode the token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # Step 2 — Extract user ID from payload
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Step 3 — Fetch user from database
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # Step 4 — Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    return user


async def require_patient(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the logged in user is a patient.
    Used in all patient-only routes.
    Raises 403 if user is a doctor.
    """
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to patients only"
        )
    return current_user


async def require_doctor(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the logged in user is the doctor.
    Used in all doctor-only routes.
    Raises 403 if user is a patient.
    """
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to doctor only"
        )
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that ensures the logged in user is an admin.
    Used in all admin-only routes.
    Raises 403 if user is patient or doctor.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to administrators only"
        )
    return current_user