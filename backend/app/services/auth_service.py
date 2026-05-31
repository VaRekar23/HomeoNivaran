from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from datetime import datetime, timezone
from app.models.user import User
from app.models.blocked_token import BlockedToken
from app.schemas.auth import RegisterRequest, LoginRequest
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt import create_access_token, decode_access_token


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

    # Step 2 — Verify password
    # IMPORTANT: check user exists AND password matches in same condition
    # Never reveal whether the email exists or the password was wrong
    # Both cases return the same "Invalid credentials" error
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Step 3 — Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )

    # Step 4 — Create JWT token
    # payload = what gets encoded inside the token
    access_token = create_access_token(data={
        "sub": str(user.id),    # sub = subject = user's unique identifier
        "role": user.role,      # needed to enforce role-based access
        "email": user.email     # convenient to have without a DB lookup
    })

    # Step 5 — Return token + user info
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user            # Pydantic will serialize using LoggedInUser schema
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

    return {"message": f"Goodbye {current_user.name}, logged out successfully"}