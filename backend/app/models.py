"""SQLAlchemy models."""

from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    battletag = Column(String(255), nullable=True, unique=True)
    bnet_id = Column(String(64), nullable=True, unique=True)
    bnet_access_token = Column(Text, nullable=True)
    # For non-OAuth users: device-based anonymous ID
    device_id = Column(String(255), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    characters = relationship("FavoriteCharacter", back_populates="user", cascade="all, delete-orphan")
    farm_tasks = relationship("FarmTask", back_populates="user", cascade="all, delete-orphan")


class FavoriteCharacter(Base):
    __tablename__ = "favorite_characters"
    __table_args__ = (UniqueConstraint("user_id", "realm_slug", "character_name", name="uq_user_character"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    realm_slug = Column(String(128), nullable=False)
    character_name = Column(String(64), nullable=False)
    region = Column(String(8), default="us")
    class_name = Column(String(64), nullable=True)
    race_name = Column(String(64), nullable=True)
    level = Column(Integer, nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="characters")


class FarmTask(Base):
    """Tracks daily/weekly farm goals for mount acquisition."""

    __tablename__ = "farm_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mount_id = Column(Integer, nullable=True)  # Blizzard mount ID if linked
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(64), nullable=True)  # raid, dungeon, world_boss, reputation, etc
    zone_name = Column(String(128), nullable=True)
    reset_type = Column(String(16), default="daily")  # daily, weekly, none
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_reset = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="farm_tasks")


class CachedMount(Base):
    """Locally cached mount data from Blizzard API to reduce API calls."""

    __tablename__ = "cached_mounts"

    id = Column(Integer, primary_key=True)  # Blizzard mount ID
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(64), nullable=True)
    faction = Column(String(32), nullable=True)  # alliance, horde, null=both
    icon_url = Column(Text, nullable=True)
    creature_display_id = Column(Integer, nullable=True)
    raw_data = Column(JSON, nullable=True)
    cached_at = Column(DateTime(timezone=True), default=utcnow)
