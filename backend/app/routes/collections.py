"""Unified character collection routes: pets, toys, achievements, titles, reputations, heirlooms."""

import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.routes.auth import _extract_token, decode_jwt
from app.services.blizzard import blizzard_api

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/collections", tags=["collections"])

# ── Simple in-memory cache for game-data indexes (TTL 1 hour) ────────
_INDEX_CACHE: dict[str, tuple[float, list]] = {}
_INDEX_TTL = 3600  # seconds


async def _get_cached_index(key: str, fetcher):
    """Return cached game-data index, refreshing if stale."""
    now = time.time()
    if key in _INDEX_CACHE and now - _INDEX_CACHE[key][0] < _INDEX_TTL:
        return _INDEX_CACHE[key][1]
    data = await fetcher()
    _INDEX_CACHE[key] = (now, data)
    return data


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
        pets.append(
            {
                "id": species.get("id"),
                "name": species.get("name"),
                "level": pet.get("level", 1),
                "quality": pet.get("quality", {}).get("type", "COMMON"),
                "breed_id": stats.get("breed_id"),
                "species_id": species.get("id"),
            }
        )

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
        toys.append(
            {
                "id": toy_info.get("id"),
                "name": toy_info.get("name"),
                "item_id": toy.get("item", {}).get("id"),
            }
        )

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
        achievements.append(
            {
                "id": achievement.get("id"),
                "name": achievement.get("name"),
                "completed_timestamp": ach.get("completed_timestamp"),
                "criteria": ach.get("criteria"),
            }
        )

    # Extract category progress
    categories = []
    for cat in data.get("category_progress", []):
        category = cat.get("category", {})
        categories.append(
            {
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
            }
        )

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
        titles.append(
            {
                "id": title.get("id"),
                "name": title.get("name"),
                "display_string": title.get("display_string"),
            }
        )

    active = data.get("active_title", {})
    active_title = (
        {
            "id": active.get("id"),
            "name": active.get("name"),
            "display_string": active.get("display_string"),
        }
        if active.get("id")
        else None
    )

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
        reputations.append(
            {
                "faction_id": faction.get("id"),
                "faction_name": faction.get("name"),
                "standing_raw": standing.get("raw", 0),
                "standing_value": standing.get("value", 0),
                "standing_max": standing.get("max", 0),
                "standing_tier": standing.get("tier"),
                "standing_name": standing.get("name"),
                "paragon": rep.get("paragon"),
            }
        )

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
        heirlooms.append(
            {
                "id": heirloom.get("id"),
                "name": heirloom.get("name"),
                "upgrade_level": h.get("upgrade", {}).get("level", 0),
            }
        )

    return {"heirlooms": heirlooms, "total": len(heirlooms)}


# ── Character Professions ────────────────────────────────────────────


@router.get("/professions")
async def get_character_professions(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's professions and learned recipes."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_professions(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Professions unavailable for %s-%s: %s", name, realm, e)
        return {"primaries": [], "secondaries": [], "total_recipes": 0}

    primaries = []
    secondaries = []

    for prof in data.get("primaries", []):
        profession = prof.get("profession", {})
        tiers = []
        total_known = 0
        for tier in prof.get("tiers", []):
            recipes = []
            for recipe in tier.get("known_recipes", []):
                recipes.append({"id": recipe.get("id"), "name": recipe.get("name")})
            total_known += len(recipes)
            tiers.append(
                {
                    "tier_name": tier.get("tier", {}).get("name", "Unknown"),
                    "skill_points": tier.get("skill_points", 0),
                    "max_skill_points": tier.get("max_skill_points", 0),
                    "known_recipes": recipes,
                }
            )
        primaries.append(
            {
                "id": profession.get("id"),
                "name": profession.get("name"),
                "tiers": tiers,
                "total_known": total_known,
            }
        )

    for prof in data.get("secondaries", []):
        profession = prof.get("profession", {})
        tiers = []
        total_known = 0
        for tier in prof.get("tiers", []):
            recipes = []
            for recipe in tier.get("known_recipes", []):
                recipes.append({"id": recipe.get("id"), "name": recipe.get("name")})
            total_known += len(recipes)
            tiers.append(
                {
                    "tier_name": tier.get("tier", {}).get("name", "Unknown"),
                    "skill_points": tier.get("skill_points", 0),
                    "max_skill_points": tier.get("max_skill_points", 0),
                    "known_recipes": recipes,
                }
            )
        secondaries.append(
            {
                "id": profession.get("id"),
                "name": profession.get("name"),
                "tiers": tiers,
                "total_known": total_known,
            }
        )

    total_recipes = sum(p["total_known"] for p in primaries) + sum(p["total_known"] for p in secondaries)
    return {"primaries": primaries, "secondaries": secondaries, "total_recipes": total_recipes}


# ── Character Transmog / Appearances ────────────────────────────────


@router.get("/transmog")
async def get_character_transmog(
    realm: str = Query(..., description="Realm slug"),
    name: str = Query(..., description="Character name"),
    region: str = Query("us"),
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
):
    """Get a character's collected transmog appearances."""
    realm, name = _validate_character_params(realm, name)
    payload = decode_jwt(token)
    user_id = int(payload["sub"])
    bnet_token = await _get_user_bnet_token(user_id, db)

    try:
        data = await blizzard_api.get_character_appearances(realm, name, bnet_token)
    except Exception as e:
        logger.debug("Transmog unavailable for %s-%s: %s", name, realm, e)
        return {"appearance_count": 0, "set_count": 0, "sets": []}

    # Collected individual appearances
    appearances = data.get("appearances", [])
    appearance_count = len(appearances)

    # Collected transmog sets
    slots = data.get("appearance_sets", [])
    set_count = len(slots)

    return {
        "appearance_count": appearance_count,
        "set_count": set_count,
        "sets": [{"id": s.get("id"), "name": s.get("name")} for s in slots],
    }


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
            if key == "transmog":
                return ("transmog", len(data.get("appearances", [])), 0)
            if key == "recipes":
                # Count total recipes across all professions
                total = 0
                for prof in data.get("primaries", []):
                    for tier in prof.get("tiers", []):
                        total += len(tier.get("known_recipes", []))
                for prof in data.get("secondaries", []):
                    for tier in prof.get("tiers", []):
                        total += len(tier.get("known_recipes", []))
                return ("recipes", total, 0)
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
        safe_fetch(blizzard_api.get_character_appearances(realm, name, bnet_token), "transmog"),
        safe_fetch(blizzard_api.get_character_professions(realm, name, bnet_token), "recipes"),
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


# ── Game Data Indexes (all items in the game) ────────────────────────


@router.get("/toys/all")
async def get_all_toys(token: str = Depends(_extract_token)):
    """Return every toy in the game (cached 1 hr)."""

    async def fetch():
        data = await blizzard_api.get_toy_index()
        return [{"id": t.get("id"), "name": t.get("name")} for t in data.get("toys", []) if t.get("id")]

    toys = await _get_cached_index("toys", fetch)
    return {"toys": toys, "total": len(toys)}


@router.get("/pets/all")
async def get_all_pets(token: str = Depends(_extract_token)):
    """Return every battle pet species in the game (cached 1 hr)."""

    async def fetch():
        data = await blizzard_api.get_pet_index()
        return [{"id": p.get("id"), "name": p.get("name")} for p in data.get("pets", []) if p.get("id")]

    pets = await _get_cached_index("pets", fetch)
    return {"pets": pets, "total": len(pets)}


@router.get("/titles/all")
async def get_all_titles(token: str = Depends(_extract_token)):
    """Return every title in the game (cached 1 hr)."""

    async def fetch():
        data = await blizzard_api.get_title_index()
        return [{"id": t.get("id"), "name": t.get("name")} for t in data.get("titles", []) if t.get("id")]

    titles = await _get_cached_index("titles", fetch)
    return {"titles": titles, "total": len(titles)}
