"""Character search, profiles, and favorites."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import FavoriteCharacter, User
from app.routes.auth import _extract_token, decode_jwt
from app.services.blizzard import blizzard_api

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/characters", tags=["characters"], dependencies=[Depends(_extract_token)])


# ── Public Character Lookup ──────────────────────────────────────────


@router.get("/lookup")
async def lookup_character(
    realm: str = Query(..., description="Realm slug, e.g. 'area-52'"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
):
    """Look up a character's profile and mount collection (public API)."""
    try:
        profile = await blizzard_api.get_character_profile(realm, name)
    except Exception as e:
        raise HTTPException(404, f"Character not found: {e}") from e

    # Try to get mount collection
    mounts = None
    try:
        mount_data = await blizzard_api.get_character_mounts(realm, name)
        mounts = mount_data.get("mounts", [])
    except Exception:
        logger.debug("Mount collection unavailable (private profile or API error)")

    # Get character media
    avatar_url = None
    try:
        media = await blizzard_api.get_character_media(realm, name)
        assets = media.get("assets", [])
        for asset in assets:
            if asset.get("key") == "avatar":
                avatar_url = asset.get("value")
                break
            if asset.get("key") == "inset":
                avatar_url = asset.get("value")
    except Exception:
        logger.debug("Character media unavailable")

    return {
        "name": profile.get("name"),
        "realm": profile.get("realm", {}).get("name"),
        "realm_slug": profile.get("realm", {}).get("slug"),
        "level": profile.get("level"),
        "race": profile.get("race", {}).get("name"),
        "class": profile.get("character_class", {}).get("name"),
        "faction": profile.get("faction", {}).get("name"),
        "avatar_url": avatar_url,
        "mounts": mounts,
        "mount_count": len(mounts) if mounts else None,
    }


@router.get("/realms")
async def get_realms():
    """Get all available realms for the configured region."""
    try:
        data = await blizzard_api.get_realm_index()
        realms = data.get("realms", [])
        return {"realms": [{"id": r.get("id"), "name": r.get("name"), "slug": r.get("slug")} for r in realms]}
    except Exception as e:
        raise HTTPException(502, f"Failed to fetch realms: {e}") from e


# ── My WoW Characters (requires Battle.net auth) ────────────────────


@router.get("/mine")
async def get_my_characters(
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated user's WoW characters using their stored Battle.net token."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.bnet_access_token:
        return {"characters": [], "has_bnet": False}

    try:
        data = await blizzard_api.get_user_wow_characters(user.bnet_access_token)
    except Exception as e:
        logger.warning("Failed to fetch WoW characters for user %d: %s", user_id, e)
        return {"characters": [], "has_bnet": True}

    characters = []
    for account in data.get("wow_accounts", []):
        for char in account.get("characters", []):
            if char.get("level", 0) < 10:
                continue
            characters.append(
                {
                    "name": char.get("name"),
                    "realm_slug": char.get("realm", {}).get("slug"),
                    "realm": char.get("realm", {}).get("name"),
                    "level": char.get("level"),
                    "class_name": char.get("playable_class", {}).get("name"),
                    "race_name": char.get("playable_race", {}).get("name"),
                    "faction": char.get("faction", {}).get("name"),
                }
            )

    characters.sort(key=lambda c: c.get("level", 0), reverse=True)
    return {"characters": characters, "has_bnet": True}


# ── Favorites (requires auth) ───────────────────────────────────────


@router.get("/favorites")
async def get_favorites(
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get user's favorite characters."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(
        select(FavoriteCharacter)
        .where(FavoriteCharacter.user_id == user_id)
        .order_by(FavoriteCharacter.is_primary.desc(), FavoriteCharacter.created_at)
    )
    chars = result.scalars().all()

    return {
        "characters": [
            {
                "id": c.id,
                "realm_slug": c.realm_slug,
                "character_name": c.character_name,
                "region": c.region,
                "class_name": c.class_name,
                "race_name": c.race_name,
                "level": c.level,
                "avatar_url": c.avatar_url,
                "is_primary": c.is_primary,
            }
            for c in chars
        ]
    }


@router.post("/favorites")
async def add_favorite(
    token: str = Depends(_extract_token),
    realm_slug: str = Query(...),
    character_name: str = Query(...),
    region: str = Query("us"),
    db: AsyncSession = Depends(get_db),
):
    """Add a character to favorites."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    # Check for duplicate
    result = await db.execute(
        select(FavoriteCharacter).where(
            FavoriteCharacter.user_id == user_id,
            FavoriteCharacter.realm_slug == realm_slug,
            FavoriteCharacter.character_name == character_name.lower(),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Character already in favorites")

    # Fetch character info from Blizzard
    try:
        profile = await blizzard_api.get_character_profile(realm_slug, character_name)
    except Exception:
        raise HTTPException(404, "Character not found on Blizzard API") from None

    avatar_url = None
    try:
        media = await blizzard_api.get_character_media(realm_slug, character_name)
        for asset in media.get("assets", []):
            if asset.get("key") == "avatar":
                avatar_url = asset.get("value")
                break
    except Exception:
        logger.debug("Character media unavailable")

    # Check if this is the first character (make it primary)
    result = await db.execute(select(FavoriteCharacter).where(FavoriteCharacter.user_id == user_id))
    is_first = result.scalar_one_or_none() is None

    fav = FavoriteCharacter(
        user_id=user_id,
        realm_slug=realm_slug,
        character_name=character_name.lower(),
        region=region,
        class_name=profile.get("character_class", {}).get("name"),
        race_name=profile.get("race", {}).get("name"),
        level=profile.get("level"),
        avatar_url=avatar_url,
        is_primary=is_first,
    )
    db.add(fav)
    await db.commit()
    await db.refresh(fav)

    return {"id": fav.id, "character_name": fav.character_name, "realm_slug": fav.realm_slug}


@router.delete("/favorites/{char_id}")
async def remove_favorite(
    char_id: int,
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Remove a character from favorites."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(
        select(FavoriteCharacter).where(
            FavoriteCharacter.id == char_id,
            FavoriteCharacter.user_id == user_id,
        )
    )
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(404, "Character not found in favorites")

    await db.delete(char)
    await db.commit()
    return {"deleted": True}
