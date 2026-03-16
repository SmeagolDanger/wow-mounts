"""Mount data routes with caching layer and background icon enrichment."""

import asyncio
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session, get_db
from app.models import CachedMount
from app.services.blizzard import blizzard_api

router = APIRouter(prefix="/mounts", tags=["mounts"])
logger = logging.getLogger(__name__)
settings = get_settings()

# Track if enrichment is already running
_enrichment_running = False


async def _enrich_mount(mount_id: int, db: AsyncSession) -> str | None:
    """Fetch detail + icon for a single mount. Returns icon_url or None."""
    try:
        data = await blizzard_api.get_mount_detail(mount_id)
    except Exception:
        return None

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
                logger.debug("Creature media unavailable for mount %s", mount_id)

    data["icon_url"] = icon_url
    data["creature_display_id"] = creature_display_id

    result = await db.execute(select(CachedMount).where(CachedMount.id == mount_id))
    cached = result.scalar_one_or_none()
    if cached:
        cached.description = data.get("description", cached.description)
        source = data.get("source", {})
        raw_type = source.get("type") if source else None
        cached.source_type = raw_type.lower() if raw_type else cached.source_type
        cached.icon_url = icon_url
        cached.creature_display_id = creature_display_id
        cached.raw_data = data
        cached.cached_at = datetime.now(UTC)

    return icon_url


async def enrich_mounts_background():
    """Background task: fetch details for mounts missing icons."""
    global _enrichment_running  # noqa: PLW0603
    if _enrichment_running:
        return
    _enrichment_running = True

    try:
        async with async_session() as db:
            result = await db.execute(
                select(CachedMount.id).where(CachedMount.icon_url.is_(None)).order_by(CachedMount.id)
            )
            missing_ids = [row[0] for row in result.all()]

        if not missing_ids:
            logger.info("All mounts already have icons cached")
            return

        logger.info("Enriching %d mounts missing icons...", len(missing_ids))
        enriched = 0

        for i in range(0, len(missing_ids), 10):
            batch = missing_ids[i : i + 10]
            async with async_session() as db:
                for mount_id in batch:
                    icon = await _enrich_mount(mount_id, db)
                    if icon:
                        enriched += 1
                    await asyncio.sleep(0.15)
                await db.commit()

            if (i + 10) % 100 < 10:
                logger.info(
                    "Enrichment progress: %d/%d (%d icons)",
                    min(i + 10, len(missing_ids)),
                    len(missing_ids),
                    enriched,
                )
            await asyncio.sleep(0.5)

        logger.info("Mount enrichment complete: %d/%d icons found", enriched, len(missing_ids))
    except Exception:
        logger.exception("Mount enrichment failed")
    finally:
        _enrichment_running = False


@router.get("/")
async def get_mount_index(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Get all mounts. Triggers background icon enrichment if needed."""
    result = await db.execute(select(CachedMount).limit(1))
    sample = result.scalar_one_or_none()

    if sample and sample.cached_at:
        age = (datetime.now(UTC) - sample.cached_at.replace(tzinfo=UTC)).total_seconds()
        if age < settings.MOUNT_INDEX_TTL:
            result = await db.execute(select(CachedMount).order_by(CachedMount.name))
            mounts = result.scalars().all()

            missing = sum(1 for m in mounts if not m.icon_url)
            if missing > 10:
                background_tasks.add_task(enrich_mounts_background)

            return {
                "mounts": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "description": m.description,
                        "source_type": m.source_type,
                        "faction": m.faction,
                        "icon_url": m.icon_url,
                    }
                    for m in mounts
                ],
                "total": len(mounts),
                "cached": True,
            }

    try:
        data = await blizzard_api.get_mount_index()
    except Exception as e:
        logger.error("Failed to fetch mount index: %s", e)
        result = await db.execute(select(CachedMount).order_by(CachedMount.name))
        mounts = result.scalars().all()
        if mounts:
            return {
                "mounts": [
                    {"id": m.id, "name": m.name, "icon_url": m.icon_url, "source_type": m.source_type} for m in mounts
                ],
                "total": len(mounts),
                "cached": True,
                "stale": True,
            }
        raise HTTPException(502, f"Blizzard API error: {e}") from e

    now = datetime.now(UTC)
    response_mounts = []

    for mount_data in data.get("mounts", []):
        mount_id = mount_data.get("id")
        name = mount_data.get("name", "Unknown")

        result = await db.execute(select(CachedMount).where(CachedMount.id == mount_id))
        cached = result.scalar_one_or_none()
        if cached:
            cached.name = name
            cached.cached_at = now
        else:
            cached = CachedMount(id=mount_id, name=name, cached_at=now)
            db.add(cached)

        response_mounts.append({"id": mount_id, "name": name, "icon_url": cached.icon_url})

    await db.commit()
    background_tasks.add_task(enrich_mounts_background)
    return {"mounts": response_mounts, "total": len(response_mounts), "cached": False}


@router.get("/icons")
async def get_mount_icons(
    ids: str = Query(..., description="Comma-separated mount IDs, max 20"),
    db: AsyncSession = Depends(get_db),
):
    """Get icons for specific mounts. Fetches from Blizzard if not cached."""
    try:
        mount_ids = [int(x.strip()) for x in ids.split(",") if x.strip()][:20]
    except ValueError:
        raise HTTPException(400, "Invalid mount IDs") from None

    result = await db.execute(select(CachedMount).where(CachedMount.id.in_(mount_ids)))
    cached_mounts = {m.id: m for m in result.scalars().all()}

    icons: dict[int, str | None] = {}
    need_fetch = []

    for mid in mount_ids:
        cached = cached_mounts.get(mid)
        if cached and cached.icon_url:
            icons[mid] = cached.icon_url
        else:
            need_fetch.append(mid)

    for mid in need_fetch:
        icon = await _enrich_mount(mid, db)
        icons[mid] = icon

    if need_fetch:
        await db.commit()

    return {"icons": {str(k): v for k, v in icons.items()}}


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
    result = await db.execute(select(CachedMount).where(CachedMount.id == mount_id))
    cached = result.scalar_one_or_none()

    if cached and cached.raw_data:
        age = (datetime.now(UTC) - cached.cached_at.replace(tzinfo=UTC)).total_seconds()
        if age < settings.MOUNT_DETAIL_TTL:
            data = dict(cached.raw_data)
            # Inject icon_url from the DB column if the JSON blob is missing it
            if not data.get("icon_url") and cached.icon_url:
                data["icon_url"] = cached.icon_url
            return data

    try:
        data = await blizzard_api.get_mount_detail(mount_id)
    except Exception as e:
        if cached and cached.raw_data:
            return cached.raw_data
        raise HTTPException(502, f"Blizzard API error: {e}") from e

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
                logger.debug("Creature media fetch failed for display %s", creature_display_id)

    data["icon_url"] = icon_url
    data["creature_display_id"] = creature_display_id

    raw_source_type = data.get("source", {}).get("type") if data.get("source") else None
    source_type = raw_source_type.lower() if raw_source_type else None
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
        cached.cached_at = datetime.now(UTC)
    else:
        cached = CachedMount(
            id=mount_id,
            name=data.get("name", "Unknown"),
            description=data.get("description"),
            source_type=source_type,  # already lowercased above
            faction=faction,
            icon_url=icon_url,
            creature_display_id=creature_display_id,
            raw_data=data,
            cached_at=datetime.now(UTC),
        )
        db.add(cached)

    await db.commit()
    return data
