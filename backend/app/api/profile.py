
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_supabase_identity
from app.db.database import get_db
from app.models.user import User

router = APIRouter(
    prefix="/api/v1/profile",
    tags=["User Profile"],
)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    timezone: str | None = Field(default=None, max_length=50)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Name cannot be empty")
        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value):
        if value is not None:
            value = value.upper()
            if not value.isalpha() or len(value) != 3:
                raise ValueError("Currency must be a three-letter code")
        return value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value):
        if value is not None:
            try:
                ZoneInfo(value)
            except ZoneInfoNotFoundError:
                raise ValueError("Invalid timezone")
        return value


def profile_response(user: User):
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "currency": user.currency,
        "timezone": user.timezone,
    }


@router.post("/me")
def create_or_link_profile(
    identity: dict = Depends(get_supabase_identity),
    db: Session = Depends(get_db),
):
    auth_user_id = identity["id"]
    email = identity.get("email")

    if not email:
        raise HTTPException(400, "Supabase account has no email address")

    if not identity.get("email_confirmed_at"):
        raise HTTPException(403, "Verify your email before creating your Monetra profile")

    user = db.query(User).filter(
        User.auth_user_id == auth_user_id
    ).first()

    if user:
        return profile_response(user)

    user = db.query(User).filter(
        func.lower(User.email) == email.lower()
    ).first()

    if user:
        if user.auth_user_id and user.auth_user_id != auth_user_id:
            raise HTTPException(
                409,
                "This Monetra profile is already linked to another account",
            )

        user.auth_user_id = auth_user_id
    else:
        metadata = identity.get("user_metadata") or {}

        user = User(
            auth_user_id=auth_user_id,
            email=email,
            full_name=metadata.get("full_name") or metadata.get("name"),
        )
        db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(500, "Could not create or link Monetra profile")

    return profile_response(user)


@router.patch("/me")
def update_profile(
    updates: ProfileUpdate,
    identity: dict = Depends(get_supabase_identity),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.auth_user_id == identity["id"]
    ).first()

    if not user:
        raise HTTPException(404, "Monetra profile not found")

    changes = updates.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(user, field, value)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(500, "Could not update your profile")

    return profile_response(user)
