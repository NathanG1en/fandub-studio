import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String, nullable=False, default="Untitled FanDub")
    youtube_url: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    speakers: Mapped[list["Speaker"]] = relationship("Speaker", back_populates="project", cascade="all, delete-orphan", lazy="selectin")
    segments: Mapped[list["DialogueSegment"]] = relationship("DialogueSegment", back_populates="project", cascade="all, delete-orphan", lazy="selectin")
    exports: Mapped[list["Export"]] = relationship("Export", back_populates="project", cascade="all, delete-orphan", lazy="selectin")


class Speaker(Base):
    __tablename__ = "speakers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False, default="#3b82f6")

    project: Mapped["Project"] = relationship("Project", back_populates="speakers")
    segments: Mapped[list["DialogueSegment"]] = relationship("DialogueSegment", back_populates="speaker")


class DialogueSegment(Base):
    __tablename__ = "dialogue_segments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    speaker_id: Mapped[str] = mapped_column(String, ForeignKey("speakers.id", ondelete="SET NULL"), nullable=True)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="segments")
    speaker: Mapped["Speaker"] = relationship("Speaker", back_populates="segments", lazy="selectin")
    recordings: Mapped[list["Recording"]] = relationship("Recording", back_populates="segment", cascade="all, delete-orphan", lazy="selectin")


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    segment_id: Mapped[str] = mapped_column(String, ForeignKey("dialogue_segments.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String, nullable=False, default="Anonymous Creator")
    audio_url: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    segment: Mapped["DialogueSegment"] = relationship("DialogueSegment", back_populates="recordings")


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    export_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="processing")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="exports")
