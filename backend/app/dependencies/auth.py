from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies.db import get_db
from app.models.user import User
from app.models.blocked_token import BlockedToken
from app.utils.jwt import decode_access_token

# This tells FastAPI where clients send their token
# tokenUrl is shown in Swagger UI for the "Authorize" button
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    request: Request,
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
    
    # Step 2 — Validate if token is blocklisted
    jti = payload.get("jti")
    if jti:
        is_blocked = await _check_token_blocked(db, jti, payload)
        if is_blocked:
            raise credentials_exception

    # Step 3 — Extract user ID from payload
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Step 4 — Fetch user from database
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # Step 5 — Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    request.state.user_id   = str(user.id)
    request.state.user_role = user.role

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

async def get_access_token(
    token: str = Depends(oauth2_scheme)
) -> str:
    return token

async def _check_token_blocked(
    db: AsyncSession,
    jti: str,
    payload: dict
) -> bool:
    """
    Check if a token JTI is in the blocklist.
    Checks Redis first (fast), falls back to DB if Redis unavailable.
    """
    from app.cache.redis_client import cache_get, cache_set

    cache_key = f"blocked_token:{jti}"

    # ── Try Redis first ──
    try:
        cached = await cache_get(cache_key)
        if cached is not None:
            # Cache hit — return the cached result
            return cached.get("blocked", False)
    except Exception:
        pass  # Redis unavailable — fall through to DB

    # ── Cache miss or Redis unavailable — check DB ──
    result = await db.execute(
        select(BlockedToken).where(BlockedToken.jti == jti)
    )
    is_blocked_in_db = result.scalar_one_or_none() is not None

    # ── Write result back to Redis ──
    try:
        exp = payload.get("exp", 0)
        remaining_ttl = int(
            exp - datetime.now(timezone.utc).timestamp()
        )

        if is_blocked_in_db and remaining_ttl > 0:
            # Blocked token — cache for remaining lifetime
            await cache_set(
                cache_key,
                {"blocked": True},
                ttl_seconds=remaining_ttl
            )
        elif not is_blocked_in_db:
            # Not blocked — cache for 60s to reduce DB hits
            await cache_set(
                cache_key,
                {"blocked": False},
                ttl_seconds=60
            )
    except Exception:
        pass  # Cache write failed — not critical

    return is_blocked_in_db