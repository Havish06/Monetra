import uuid

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
from app.db.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_supabase_identity(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    try:
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_PUBLISHABLE_KEY,
                "Authorization": f"Bearer {credentials.credentials}",
            },
            timeout=10.0,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
        )

    try:
        identity = response.json()
        identity["id"] = uuid.UUID(identity["id"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication identity",
        )

    return identity


def get_current_user(
    identity: dict = Depends(get_supabase_identity),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.auth_user_id == identity["id"]
    ).first()

    if not user:
        raise HTTPException(
            status_code=403,
            detail="Monetra profile not linked. Complete profile setup first.",
        )

    return user


def require_path_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this user's data",
        )

    return current_user