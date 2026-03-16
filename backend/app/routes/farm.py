"""Farm task tracking with daily/weekly reset logic."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import FarmTask
from app.routes.auth import decode_jwt

router = APIRouter(prefix="/farm", tags=["farm"])


class FarmTaskCreate(BaseModel):
    title: str
    description: str | None = None
    mount_id: int | None = None
    source_type: str | None = None  # raid, dungeon, world_boss, reputation, etc
    zone_name: str | None = None
    reset_type: str = "daily"  # daily, weekly, none
    notes: str | None = None
    sort_order: int = 0


class FarmTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    source_type: str | None = None
    zone_name: str | None = None
    reset_type: str | None = None
    notes: str | None = None
    sort_order: int | None = None


# ── Reset Logic ──────────────────────────────────────────────────────


def _get_daily_reset() -> datetime:
    """WoW daily reset: 15:00 UTC (10 AM EST / 7 AM PST)."""
    now = datetime.now(UTC)
    reset_today = now.replace(hour=15, minute=0, second=0, microsecond=0)
    if now < reset_today:
        return reset_today - timedelta(days=1)
    return reset_today


def _get_weekly_reset() -> datetime:
    """WoW weekly reset: Tuesday 15:00 UTC (US), Wednesday 07:00 UTC (EU)."""
    now = datetime.now(UTC)
    # US reset: Tuesday 15:00 UTC
    days_since_tuesday = (now.weekday() - 1) % 7
    last_tuesday = now - timedelta(days=days_since_tuesday)
    reset = last_tuesday.replace(hour=15, minute=0, second=0, microsecond=0)
    if reset > now:
        reset -= timedelta(weeks=1)
    return reset


def _should_reset(task: FarmTask) -> bool:
    """Check if a task should be auto-reset based on its reset type."""
    if not task.completed or task.reset_type == "none":
        return False

    if task.reset_type == "daily":
        return task.completed_at < _get_daily_reset()
    elif task.reset_type == "weekly":
        return task.completed_at < _get_weekly_reset()
    return False


# ── Routes ───────────────────────────────────────────────────────────


@router.get("/")
async def get_farm_tasks(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get all farm tasks for the user, auto-resetting completed ones past their reset window."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(
        select(FarmTask).where(FarmTask.user_id == user_id).order_by(FarmTask.sort_order, FarmTask.created_at)
    )
    tasks = result.scalars().all()

    # Auto-reset completed tasks
    reset_count = 0
    for task in tasks:
        if _should_reset(task):
            task.completed = False
            task.last_reset = datetime.now(UTC)
            reset_count += 1

    if reset_count:
        await db.commit()

    daily_reset = _get_daily_reset()
    weekly_reset = _get_weekly_reset()

    return {
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "mount_id": t.mount_id,
                "source_type": t.source_type,
                "zone_name": t.zone_name,
                "reset_type": t.reset_type,
                "completed": t.completed,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "notes": t.notes,
                "sort_order": t.sort_order,
            }
            for t in tasks
        ],
        "reset_info": {
            "daily_reset": daily_reset.isoformat(),
            "weekly_reset": weekly_reset.isoformat(),
            "tasks_reset": reset_count,
        },
    }


@router.post("/")
async def create_farm_task(
    token: str = Query(...),
    task: FarmTaskCreate = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new farm task."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    new_task = FarmTask(
        user_id=user_id,
        title=task.title,
        description=task.description,
        mount_id=task.mount_id,
        source_type=task.source_type,
        zone_name=task.zone_name,
        reset_type=task.reset_type,
        notes=task.notes,
        sort_order=task.sort_order,
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    return {"id": new_task.id, "title": new_task.title}


@router.patch("/{task_id}/complete")
async def toggle_complete(
    task_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a farm task's completion status."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(select(FarmTask).where(FarmTask.id == task_id, FarmTask.user_id == user_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    task.completed = not task.completed
    task.completed_at = datetime.now(UTC) if task.completed else None
    await db.commit()

    return {"id": task.id, "completed": task.completed}


@router.put("/{task_id}")
async def update_farm_task(
    task_id: int,
    token: str = Query(...),
    data: FarmTaskUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """Update a farm task."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(select(FarmTask).where(FarmTask.id == task_id, FarmTask.user_id == user_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    await db.commit()
    return {"id": task.id, "updated": True}


@router.delete("/{task_id}")
async def delete_farm_task(
    task_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Delete a farm task."""
    payload = decode_jwt(token)
    user_id = int(payload["sub"])

    result = await db.execute(select(FarmTask).where(FarmTask.id == task_id, FarmTask.user_id == user_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(404, "Task not found")

    await db.delete(task)
    await db.commit()
    return {"deleted": True}
