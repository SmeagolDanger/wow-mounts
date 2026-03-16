"""Mount data routes with caching layer."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CachedMount
from app.config import get_settings
from app.services.blizzard import blizzard_api

router = APIRouter(prefix="/mounts", tags=["mounts"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.get("/")
async def get_mount_index(db: AsyncSession = Depends(get_db)):
    """Get all mounts. Returns cached data if fresh, otherwise fetches from Blizzard."""
    # Check cache
    result = await db.execute(select(CachedMount).limit(1))
    sample = result.scalar_one_or_none()

    if sample and sample.cached_at:
        age = (datetime.now(timezone.utc) - sample.cached_at.replace(tzinfo=timezone.utc)).total_seconds()
        if age < settings.MOUNT_INDEX_TTL:
            # Return from cache
            result = await db.execute(select(CachedMount).order_by(CachedMount.name))
            mounts = result.scalars().all()
            return {
                "mounts": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "description": m.description,
                        "source_type": m.source_type,
                        "faction": m.faction,
                        "icon_url": m.icon_url,
                        "creature_display_id": m.creature_display_id,
                    }
                    for m in mounts
                ],
                "total": len(mounts),
                "cached": True,
            }

    # Fetch from Blizzard and populate cache
    try:
        data = await blizzard_api.get_mount_index()
    except Exception as e:
        logger.error(f"Failed to fetch mount index: {e}")
        # Return stale cache if available
        result = await db.execute(select(CachedMount).order_by(CachedMount.name))
        mounts = result.scalars().all()
        if mounts:
            return {
                "mounts": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "description": m.description,
                        "source_type": m.source_type,
                        "faction": m.faction,
                        "icon_url": m.icon_url,
                        "creature_display_id": m.creature_display_id,
                    }
                    for m in mounts
                ],
                "total": len(mounts),
                "cached": True,
                "stale": True,
            }
        raise HTTPException(502, f"Blizzard API error: {e}")

    now = datetime.now(timezone.utc)
    mounts_list = data.get("mounts", [])
    response_mounts = []

    for mount_data in mounts_list:
        mount_id = mount_data.get("id")
        name = mount_data.get("name", "Unknown")

        # Upsert into cache
        result = await db.execute(select(CachedMount).where(CachedMount.id == mount_id))
        cached = result.scalar_one_or_none()
        if cached:
            cached.name = name
            cached.cached_at = now
        else:
            cached = CachedMount(id=mount_id, name=name, cached_at=now)
            db.add(cached)

        response_mounts.append({"id": mount_id, "name": name})

    await db.commit()
    return {"mounts": response_mounts, "total": len(response_mounts), "cached": False}


@router.get("/search")
async def search_mounts(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Search mounts by name."""
    result = await db.execute(
        select(CachedMount).where(CachedMount.name.ilike(f"%{q}%")).order_by(CachedMount.name).limit(50)
    )
    mounts = result.scalars().all()
    return {
        "mounts": [
            {
                "id": m.id,
                "name": m.name,
                "description": m.description,
                "source_type": m.source_type,
                "icon_url": m.icon_url,
            }
            for m in mounts
        ],
        "total": len(mounts),
    }


@router.get("/{mount_id}")
async def get_mount_detail(mount_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed info for a single mount."""
    # Check cache first
    result = await db.execute(select(CachedMount).where(CachedMount.id == mount_id))
    cached = result.scalar_one_or_none()

    if cached and cached.raw_data:
        age = (datetime.now(timezone.utc) - cached.cached_at.replace(tzinfo=timezone.utc)).total_seconds()
        if age < settings.MOUNT_DETAIL_TTL:
            return cached.raw_data

    # Fetch from Blizzard
    try:
        data = await blizzard_api.get_mount_detail(mount_id)
    except Exception as e:
        if cached and cached.raw_data:
            return cached.raw_data
        raise HTTPException(502, f"Blizzard API error: {e}")

    # Try to get creature media for icon
    icon_url = None
    creature_display_id = None
    creature_displays = data.get("creature_displays", [])
    if creature_displays:
        creature_display_id = creature_displays[0].get("id")
        if creature_display_id:
            try:
                media = await blizzard_api.get_creature_media(creature_display_id)
                assets = media.get("assets", [])
                for asset in assets:
                    if asset.get("key") == "zoom":
                        icon_url = asset.get("value")
                        break
                if not icon_url and assets:
                    icon_url = assets[0].get("value")
            except Exception:
                pass

    # Enrich response
    data["icon_url"] = icon_url
    data["creature_display_id"] = creature_display_id

    # Cache it
    source_type = data.get("source", {}).get("type") if data.get("source") else None
    faction_data = data.get("faction", {})
    faction = faction_data.get("type", "").lower() if faction_data else None

    if cached:
        cached.name = data.get("name", cached.name)
        cached.description = data.get("description", cached.description)
        cached.source_type = source_type
        cached.faction = faction
        cached.icon_url = icon_url
        cached.creature_display_id = creature_display_id
        cached.raw_data = data
        cached.cached_at = datetime.now(timezone.utc)
    else:
        cached = CachedMount(
            id=mount_id,
            name=data.get("name", "Unknown"),
            description=data.get("description"),
            source_type=source_type,
            faction=faction,
            icon_url=icon_url,
            creature_display_id=creature_display_id,
            raw_data=data,
            cached_at=datetime.now(timezone.utc),
        )
        db.add(cached)

    await db.commit()
    return data
