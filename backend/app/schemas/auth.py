import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
    """
    Data the user sends when registering.
    Pydantic validates this automatically.
    """
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=100)


class RegisterResponse(BaseModel):
    """
    Data we send BACK to the user after registration.
    Never includes password_hash.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str
    role: str
    created_at: datetime


class LoginRequest(BaseModel):
    """Data the user sends when logging in."""
    email: EmailStr
    password: str = Field(min_length=1)


class LoggedInUser(BaseModel):
    """
    Basic user info embedded inside the login response.
    Frontend uses this to know who is logged in and their role.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    role: str


class LoginResponse(BaseModel):
    """
    Data we send back after successful login.
    Contains the JWT token and basic user info.
    """
    access_token: str       # the JWT token frontend stores and sends with requests
    token_type: str = "bearer"  # standard OAuth2 token type
    user: LoggedInUser      # who is logged in


class UserMeResponse(BaseModel):
    """Full profile of the currently logged in user."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str
    role: str
    profile_pic_url: str | None
    created_at: datetime