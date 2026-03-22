"""Unified character collection routes: pets, toys, achievements, titles, reputations, heirlooms."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.routes.auth import _extract_token, decode_jwt
from app.services.blizzard import blizzard_api

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/collections", tags=["collections"])


# ── Helpers ──────────────────────────────────────────────────────────


async def _get_user_bnet_token(user_id: int, db: AsyncSession) -> str | None:
    """Retrieve the stored Battle.net token for a user, if linked."""
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user.bnet_access_token if user else None


def _validate_character_params(realm: str, name: str) -> tuple[str, str]:
    """Sanitize and validate character lookup params."""
    realm = realm.strip().lower()
    name = name.strip().lower()
    if not realm or not name:
        raise HTTPException(400, "Realm and character name are required")
    if len(realm) > 64 or len(name) > 32:
        raise HTTPException(400, "Invalid realm or character name length")
    return realm, name


# ── Character Pets ───────────────────────────────────────────────────


@router.get("/pets")
async def get_character_pets(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's collected pets with species info."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_pets(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Pet collection unavailable for %s-%s: %s", name, realm, e)
        return {"pets": [], "total": 0}

    pets = []
    for pet in data.get("pets", []):
        species = pet.get("species", {})
        stats = pet.get("stats", {})
        pets.append({
            "id": species.get("id"),
            "name": species.get("name"),
            "level": pet.get("level", 1),
            "quality": pet.get("quality", {}).get("type", "COMMON"),
            "breed_id": stats.get("breed_id"),
            "species_id": species.get("id"),
        })

    return {"pets": pets, "total": len(pets)}


# ── Character Toys ───────────────────────────────────────────────────


@router.get("/toys")
async def get_character_toys(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's collected toys."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_toys(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Toy collection unavailable for %s-%s: %s", name, realm, e)
        return {"toys": [], "total": 0}

    toys = []
    for toy in data.get("toys", []):
        toy_info = toy.get("toy", {})
        toys.append({
            "id": toy_info.get("id"),
            "name": toy_info.get("name"),
            "item_id": toy.get("item", {}).get("id"),
        })

    return {"toys": toys, "total": len(toys)}


# ── Character Achievements ───────────────────────────────────────────


@router.get("/achievements")
async def get_character_achievements(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's achievement progress with completion timestamps."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_achievements(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Achievements unavailable for %s-%s: %s", name, realm, e)
        return {"achievements": [], "total_quantity": 0, "total_points": 0, "categories": []}

    # Extract completed achievements
    achievements = []
    for ach in data.get("achievements", []):
        achievement = ach.get("achievement", {})
        achievements.append({
            "id": achievement.get("id"),
            "name": achievement.get("name"),
            "completed_timestamp": ach.get("completed_timestamp"),
            "criteria": ach.get("criteria"),
        })

    # Extract category progress
    categories = []
    for cat in data.get("category_progress", []):
        category = cat.get("category", {})
        categories.append({
            "id": category.get("id"),
            "name": category.get("name"),
            "quantity": cat.get("quantity", 0),
            "points": cat.get("points", 0),
            "subcategories": [
                {
                    "id": sc.get("category", {}).get("id"),
                    "name": sc.get("category", {}).get("name"),
                    "quantity": sc.get("quantity", 0),
                    "points": sc.get("points", 0),
                }
                for sc in cat.get("subcategories", [])
            ],
        })

    return {
        "achievements": achievements,
        "total_quantity": data.get("total_quantity", 0),
        "total_points": data.get("total_points", 0),
        "categories": categories,
    }


# ── Character Titles ─────────────────────────────────────────────────


@router.get("/titles")
async def get_character_titles(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's earned titles."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_titles(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Titles unavailable for %s-%s: %s", name, realm, e)
        return {"titles": [], "total": 0, "active_title": None}

    titles = []
    for title in data.get("titles", []):
        titles.append({
            "id": title.get("id"),
            "name": title.get("name"),
            "display_string": title.get("display_string"),
        })

    active = data.get("active_title", {})
    active_title = {
        "id": active.get("id"),
        "name": active.get("name"),
        "display_string": active.get("display_string"),
    } if active.get("id") else None

    return {"titles": titles, "total": len(titles), "active_title": active_title}


# ── Character Reputations ────────────────────────────────────────────


@router.get("/reputations")
async def get_character_reputations(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's reputation standings."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_reputations(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Reputations unavailable for %s-%s: %s", name, realm, e)
        return {"reputations": []}

    reputations = []
    for rep in data.get("reputations", []):
        faction = rep.get("faction", {})
        standing = rep.get("standing", {})
        reputations.append({
            "faction_id": faction.get("id"),
            "faction_name": faction.get("name"),
            "standing_raw": standing.get("raw", 0),
            "standing_value": standing.get("value", 0),
            "standing_max": standing.get("max", 0),
            "standing_tier": standing.get("tier"),
            "standing_name": standing.get("name"),
            "paragon": rep.get("paragon"),
        })

    return {"reputations": reputations}


# ── Character Heirlooms ──────────────────────────────────────────────


@router.get("/heirlooms")
async def get_character_heirlooms(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's collected heirlooms."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_heirlooms(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Heirlooms unavailable for %s-%s: %s", name, realm, e)
        return {"heirlooms": [], "total": 0}

    heirlooms = []
    for h in data.get("heirlooms", []):
        heirloom = h.get("heirloom", {})
        heirlooms.append({
            "id": heirloom.get("id"),
            "name": heirloom.get("name"),
            "upgrade_level": h.get("upgrade", {}).get("level", 0),
        })

    return {"heirlooms": heirlooms, "total": len(heirlooms)}


# ── Unified Collection Summary ───────────────────────────────────────


@router.get("/summary")
async def get_collection_summary(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a summary of all collection counts for a character.
    Fetches all collection types in parallel for the overview dashboard.
    """
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    import asyncio

    async def safe_fetch(coro, key, default=0):
        try:
            data = await coro
            if key == "achievements":
                return ("achievements", data.get("total_quantity", 0), data.get("total_points", 0))
            items = data.get(key, [])
            return (key, len(items) if isinstance(items, list) else 0, 0)
        except Exception:
            return (key, default, 0)

    results = await asyncio.gather(
        safe_fetch(blizzard_api.get_character_mounts(realm, name, bnet_token), "mounts"),
        safe_fetch(blizzard_api.get_character_pets(realm, name, bnet_token), "pets"),
        safe_fetch(blizzard_api.get_character_toys(realm, name, bnet_token), "toys"),
        safe_fetch(blizzard_api.get_character_achievements(realm, name, bnet_token), "achievements"),
        safe_fetch(blizzard_api.get_character_titles(realm, name, bnet_token), "titles"),
        safe_fetch(blizzard_api.get_character_heirlooms(realm, name, bnet_token), "heirlooms"),
        return_exceptions=True,
    )

    summary = {}
    for r in results:
        if isinstance(r, Exception):
            continue
        key, count, points = r
        summary[key] = {"count": count}
        if key == "achievements":
            summary[key]["points"] = points

    return {"summary": summary, "realm": realm, "character": name}
