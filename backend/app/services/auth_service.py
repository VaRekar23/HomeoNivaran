from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.blocked_token import BlockedToken
from app.schemas.auth import RegisterRequest, LoginRequest
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt import create_access_token, decode_access_token


LOCKOUT_THRESHOLDS = [
    (5,  timedelta(minutes=15)),   # 5 failures → 15 min lockout
    (10, timedelta(hours=1)),      # 10 failures → 1 hour lockout
    (20, timedelta(hours=24)),     # 20 failures → 24 hour lockout
]


async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    """
    Registers a new patient user.
    Steps:
    1. Check email is not already taken
    2. Check phone is not already taken
    3. Hash the password
    4. Save user to database
    5. Return the created user
    """

    # Step 1 — Check email uniqueness
    existing_email = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Step 2 — Check phone uniqueness
    existing_phone = await db.execute(
        select(User).where(User.phone == data.phone)
    )
    if existing_phone.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    # Step 3 — Hash the password (NEVER store plain text)
    hashed = hash_password(data.password)

    # Step 4 — Create the user object
    new_user = User(
        name=data.name,
        email=data.email,
        phone=data.phone,
        password_hash=hashed,
        role="patient",         # always patient, never trust user input for role
    )

    # Step 5 — Save to database
    db.add(new_user)
    await db.flush()      # sends INSERT to DB but doesn't commit yet
                          # gives us back the generated ID
    await db.refresh(new_user)  # reloads object from DB (gets created_at etc.)

    return new_user


async def login_user(db: AsyncSession, data: LoginRequest) -> dict:
    """
    Authenticates a user and returns a JWT token.

    Steps:
    1. Find user by email
    2. Verify password matches stored hash
    3. Check account is active
    4. Create JWT token with user info
    5. Return token + user info
    """

    # Step 1 — Find user by email
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    # Step 2 - Check for lockout due to too many failed attempts
    if user and user.locked_until:
        now = datetime.now(timezone.utc)

        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)

        if now < locked_until:
            remaining = int((locked_until - now).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Account temporarily locked due to too many "
                    f"failed login attempts. "
                    f"Try again in {remaining} minute(s)."
                )
            )
        else:
            # Lockout has expired — reset counters
            user.locked_until = None
            user.failed_login_attempts = 0
            user.last_failed_login = None
            await db.flush()

    # Step 3 — Verify password
    # IMPORTANT: check user exists AND password matches in same condition
    # Never reveal whether the email exists or the password was wrong
    # Both cases return the same "Invalid credentials" error
    if not user or not verify_password(data.password, user.password_hash):
        if user:
            await _handle_failed_login(db, user)
            await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Step 4 — Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )
    
    # Step 5 — Success — reset failure counter
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
        user.locked_until          = None
        user.last_failed_login     = None
        await db.flush()

    # Step 6 — Create JWT token
    # payload = what gets encoded inside the token
    access_token = create_access_token(data={
        "sub": str(user.id),    # sub = subject = user's unique identifier
        "role": user.role,      # needed to enforce role-based access
        "email": user.email     # convenient to have without a DB lookup
    })

    # Step 6 — Return token + user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


async def get_me(current_user: User) -> User:
    """
    Returns the currently logged in user.
    current_user is already fetched by get_current_user dependency.
    No DB query needed here.
    """
    return current_user


async def refresh_token(current_user: User) -> dict:
    """
    Issues a fresh JWT token for an already authenticated user.
    Useful when the frontend detects the token is about to expire.
    """
    new_token = create_access_token(data={
        "sub": str(current_user.id),
        "role": current_user.role,
        "email": current_user.email
    })
    return {
        "access_token": new_token,
        "token_type": "bearer"
    }

async def logout_user(current_user: User, db: AsyncSession, token: str):
    payload = decode_access_token(token)
    jti = payload.get("jti")

    expires_at = datetime.utcfromtimestamp(payload.get("exp"))
    blocked = BlockedToken(
        jti=jti,
        user_id=current_user.id,
        blocked_at=datetime.now(timezone.utc),
        expires_at=expires_at
    )
    db.add(blocked)
    await db.flush()

    try:
        from app.cache.redis_client import cache_set
        remaining = 0
        if expires_at:
            remaining = int(
                (expires_at - datetime.now(timezone.utc)).total_seconds()
            )
        if remaining > 0:
            await cache_set(
                f"blocked_token:{jti}",
                {"blocked": True},
                ttl_seconds=remaining
            )
    except Exception:
        pass

    return {"message": f"Goodbye {current_user.name}, logged out successfully"}

async def _handle_failed_login(db: AsyncSession, user: User) -> None:
    """
    Increments failed login counter and locks account if threshold reached.
    Called only when user exists but password is wrong.
    """
    user.failed_login_attempts += 1
    user.last_failed_login = datetime.now(timezone.utc)

    # Check if we should lock the account
    lockout_duration = None
    for threshold, duration in reversed(LOCKOUT_THRESHOLDS):
        if user.failed_login_attempts >= threshold:
            lockout_duration = duration
            break

    if lockout_duration:
        user.locked_until = datetime.now(timezone.utc) + lockout_duration
        
    await db.flush()

async def unlock_user(db: AsyncSession, user_id: str) -> dict:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    was_locked = user.locked_until is not None
    user.locked_until          = None
    user.failed_login_attempts = 0
    user.last_failed_login     = None
    await db.flush()

    return {
        "message":    f"Account unlocked for {user.email}",
        "was_locked": was_locked,
    }