"""Authentication routes: Battle.net OAuth and device-based anonymous auth.

OAuth flow:
  1. App calls GET /auth/bnet/login?device_id=xxx
  2. Backend returns an authorize_url with a signed state param (contains device_id)
  3. App opens the URL in the system browser
  4. User logs in on Battle.net, grants permissions
  5. Battle.net GET-redirects to /auth/bnet/callback?code=xxx&state=yyy
  6. Backend verifies state, exchanges code, creates/links user
  7. Backend redirects to wowmounts://auth/callback?token=zzz&battletag=aaa
  8. Expo app receives deep link, stores token, refreshes profile
"""

import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode, quote

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.services.blizzard import blizzard_api

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# Device ID format: alphanumeric + hyphens/underscores, 8-128 chars
DEVICE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{8,128}$")

# Deep link scheme
APP_SCHEME = "wowmounts"


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


def _create_oauth_state(device_id: Optional[str] = None) -> str:
    """Create a signed, short-lived JWT to use as the OAuth state parameter.
    Encodes the device_id so we can link accounts on callback.
    Expires in 10 minutes — plenty for a login flow.
    """
    payload = {
        "purpose": "oauth_state",
        "device_id": device_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _verify_oauth_state(state: str) -> Optional[str]:
    """Verify the OAuth state JWT and return the device_id (or None).
    Raises HTTPException if the state is invalid or expired.
    """
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("purpose") != "oauth_state":
            raise HTTPException(400, "Invalid OAuth state")
        return payload.get("device_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(400, "OAuth session expired — please try logging in again")
    except jwt.PyJWTError:
        raise HTTPException(400, "Invalid OAuth state")


def _build_deep_link(path: str, params: dict) -> str:
    """Build a deep link URL like wowmounts://auth/callback?token=xxx."""
    return f"{APP_SCHEME}://{path}?{urlencode(params)}"


def _build_error_deep_link(error: str) -> str:
    return _build_deep_link("auth/callback", {"error": error})


def _build_fallback_html(deep_link: str, battletag: str = "") -> str:
    """HTML fallback page that attempts the deep link and shows a manual option.
    Covers the case where the deep link doesn't auto-open (desktop browser, etc).
    """
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>WoW Mount Tracker — Login Complete</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0A0C10; color: #E8E6E3;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; margin: 0; padding: 20px;
            text-align: center;
        }}
        .card {{
            background: #12151C; border: 1px solid #2A2F3C;
            border-radius: 14px; padding: 40px; max-width: 400px;
        }}
        h1 {{ color: #F8B700; font-size: 22px; margin: 0 0 8px; }}
        p {{ color: #9CA3AF; font-size: 15px; line-height: 1.5; margin: 8px 0; }}
        .tag {{ color: #C084FC; font-weight: 600; }}
        .btn {{
            display: inline-block; margin-top: 20px;
            background: #F8B700; color: #0A0C10;
            padding: 12px 28px; border-radius: 10px;
            text-decoration: none; font-weight: 700; font-size: 15px;
        }}
        .hint {{ color: #6B7280; font-size: 12px; margin-top: 16px; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>Login Successful!</h1>
        <p>Welcome, <span class="tag">{battletag}</span></p>
        <p>Redirecting to the app...</p>
        <a class="btn" href="{deep_link}">Open WoW Mount Tracker</a>
        <p class="hint">If the app didn't open automatically, tap the button above.</p>
    </div>
    <script>window.location.href = "{deep_link}";</script>
</body>
</html>"""


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
async def bnet_login(device_id: Optional[str] = Query(None)):
    """Return Battle.net OAuth authorize URL.
    Pass device_id to link the Battle.net account to an existing anonymous user.
    """
    if device_id:
        device_id = _validate_device_id(device_id)

    state = _create_oauth_state(device_id)
    url = blizzard_api.get_authorize_url(state)
    return {"authorize_url": url, "state": state}


@router.get("/bnet/callback")
async def bnet_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Battle.net OAuth callback — GET redirect from Blizzard.
    Exchanges the authorization code, creates/links the user,
    then redirects to the Expo app via deep link.
    """
    # Handle denial / error from Battle.net
    if error:
        logger.warning("Battle.net OAuth error: %s — %s", error, error_description)
        deep_link = _build_error_deep_link(error_description or error)
        return HTMLResponse(_build_fallback_html(deep_link, ""))

    if not code or not state:
        deep_link = _build_error_deep_link("Missing code or state parameter")
        return HTMLResponse(_build_fallback_html(deep_link, ""))

    # Verify state (CSRF protection + device_id recovery)
    device_id = _verify_oauth_state(state)

    # Exchange code for access token
    try:
        token_data = await blizzard_api.exchange_code(code)
    except Exception as e:
        logger.error("Battle.net token exchange failed: %s", e)
        deep_link = _build_error_deep_link("Failed to exchange authorization code")
        return HTMLResponse(_build_fallback_html(deep_link, ""))

    access_token = token_data["access_token"]

    # Fetch Battle.net user info
    try:
        user_info = await blizzard_api.get_user_info(access_token)
    except Exception as e:
        logger.error("Battle.net user info fetch failed: %s", e)
        deep_link = _build_error_deep_link("Failed to fetch Battle.net profile")
        return HTMLResponse(_build_fallback_html(deep_link, ""))

    bnet_id = str(user_info.get("id"))
    battletag = user_info.get("battletag", "")

    # Find or create user
    result = await db.execute(select(User).where(User.bnet_id == bnet_id))
    user = result.scalar_one_or_none()

    if user:
        # Returning user — update token
        user.bnet_access_token = access_token
        user.battletag = battletag
    elif device_id:
        # Link to existing device user
        result = await db.execute(select(User).where(User.device_id == device_id))
        user = result.scalar_one_or_none()
        if user:
            user.bnet_id = bnet_id
            user.battletag = battletag
            user.bnet_access_token = access_token
        else:
            user = User(
                bnet_id=bnet_id, battletag=battletag,
                bnet_access_token=access_token, device_id=device_id,
            )
            db.add(user)
    else:
        # Brand new user, no device link
        user = User(bnet_id=bnet_id, battletag=battletag, bnet_access_token=access_token)
        db.add(user)

    await db.commit()
    await db.refresh(user)

    app_token = create_jwt(user.id, battletag)

    # Redirect to the Expo app via deep link
    deep_link = _build_deep_link("auth/callback", {
        "token": app_token,
        "battletag": battletag,
        "user_id": str(user.id),
    })

    logger.info("OAuth complete for %s (user %d), redirecting to app", battletag, user.id)

    # Return an HTML page that auto-redirects via JS + has a manual fallback button.
    # Using HTML instead of a raw 302 because mobile browsers sometimes block
    # custom-scheme redirects from a server redirect.
    return HTMLResponse(_build_fallback_html(deep_link, battletag))


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
