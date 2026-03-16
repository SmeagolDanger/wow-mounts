"""Authentication routes: Battle.net OAuth and device-based anonymous auth."""

import re
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.services.blizzard import blizzard_api

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# Device ID format: alphanumeric + hyphens/underscores, 8-128 chars
DEVICE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{8,128}$")


# ── Helpers ──────────────────────────────────────────────────────────


def create_jwt(user_id: int, battletag: str = None) -> str:
    payload = {
        "sub": str(user_id),
        "battletag": battletag,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _extract_token(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
) -> str:
    """Extract JWT from Authorization header (preferred) or query param (fallback)."""
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    if token:
        return token
    raise HTTPException(status_code=401, detail="Authentication required")


def _validate_device_id(device_id: str) -> str:
    if not DEVICE_ID_PATTERN.match(device_id):
        raise HTTPException(400, "Invalid device ID format")
    return device_id


# ── Device Auth (no Battle.net required) ─────────────────────────────


@router.post("/device")
async def device_auth(device_id: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Register or login with a device ID (anonymous, no Battle.net needed)."""
    device_id = _validate_device_id(device_id)

    result = await db.execute(select(User).where(User.device_id == device_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(device_id=device_id)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_jwt(user.id)
    return {"token": token, "user_id": user.id, "battletag": user.battletag}


# ── Battle.net OAuth ─────────────────────────────────────────────────


@router.get("/bnet/login")
async def bnet_login():
    """Return Battle.net OAuth authorize URL."""
    state = secrets.token_urlsafe(32)
    url = blizzard_api.get_authorize_url(state)
    return {"authorize_url": url, "state": state}


@router.post("/bnet/callback")
async def bnet_callback(
    code: str = Query(...),
    device_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Exchange Battle.net authorization code for tokens."""
    if device_id:
        device_id = _validate_device_id(device_id)

    try:
        token_data = await blizzard_api.exchange_code(code)
    except Exception:
        raise HTTPException(400, "Failed to exchange authorization code")

    access_token = token_data["access_token"]

    try:
        user_info = await blizzard_api.get_user_info(access_token)
    except Exception:
        raise HTTPException(502, "Failed to fetch Battle.net user info")

    bnet_id = str(user_info.get("id"))
    battletag = user_info.get("battletag")

    # Find or create user
    result = await db.execute(select(User).where(User.bnet_id == bnet_id))
    user = result.scalar_one_or_none()

    if user:
        user.bnet_access_token = access_token
        user.battletag = battletag
    elif device_id:
        result = await db.execute(select(User).where(User.device_id == device_id))
        user = result.scalar_one_or_none()
        if user:
            user.bnet_id = bnet_id
            user.battletag = battletag
            user.bnet_access_token = access_token
        else:
            user = User(
                bnet_id=bnet_id,
                battletag=battletag,
                bnet_access_token=access_token,
                device_id=device_id,
            )
            db.add(user)
    else:
        user = User(bnet_id=bnet_id, battletag=battletag, bnet_access_token=access_token)
        db.add(user)

    await db.commit()
    await db.refresh(user)

    token = create_jwt(user.id, battletag)
    return {"token": token, "user_id": user.id, "battletag": battletag, "has_bnet": True}


# ── User Info ────────────────────────────────────────────────────────


@router.get("/me")
async def get_me(
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get current user info from JWT."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    return {
        "user_id": user.id,
        "battletag": user.battletag,
        "has_bnet": user.bnet_id is not None,
        "created_at": user.created_at.isoformat(),
    }
