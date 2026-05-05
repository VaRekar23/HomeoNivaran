from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    UserMeResponse
)
from app.services import auth_service
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient",
    description="Creates a new patient account. Only patients can self-register."
)
@limiter.limit("3/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Register endpoint:
    - Receives RegisterRequest body
    - Passes to auth_service for processing
    - Returns RegisterResponse (no password)
    """
    user = await auth_service.register_user(db, data)
    return user


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login and get access token"
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates user and returns JWT token.
    Store this token on the frontend and send it
    in the Authorization header for all protected requests.
    """
    result = await auth_service.login_user(db, data)
    return result


@router.get(
    "/me",
    response_model=UserMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current logged in user profile"
)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the profile of whoever is currently logged in.
    Requires Authorization: Bearer <token> header.
    """
    return await auth_service.get_me(current_user)


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    summary="Refresh access token"
)
async def refresh(
    current_user: User = Depends(get_current_user)
):
    """
    Issues a new token for an authenticated user.
    Call this when the token is about to expire.
    """
    return await auth_service.refresh_token(current_user)


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout current user"
)
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logs out the current user.
    Since JWT is stateless, logout is handled on the frontend
    by deleting the stored token.
    This endpoint confirms the token was valid at logout time.
    """
    # JWT tokens can't be invalidated server-side without a blocklist
    # For now we just confirm logout — frontend deletes the token
    # TODO: Add Redis token blocklist for production
    return {"message": f"Goodbye {current_user.name}, logged out successfully"}