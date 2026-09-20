import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.core.database import get_db
from app.core.config import settings
from app.models.project import Project, Speaker, DialogueSegment, Recording, Export
from app.schemas.project import (
    ProjectCreate, ProjectResponse, SpeakerUpdate, SpeakerResponse,
    SegmentUpdate, DialogueSegmentResponse, RecordingResponse, ExportResponse,
    ResegmentRequest, SegmentSplitRequest, SegmentMergeRequest
)
from app.services.downloader import download_youtube_media
from app.services.audio_processor import create_project_segments_and_speakers
from app.services.exporter import export_fandub_video
from app.services.diarization.factory import DiarizationProviderFactory
from app.api.ws import manager as ws_manager

router = APIRouter(prefix="/api", tags=["Projects"])

@router.get("/diarization/providers")
async def list_diarization_providers():
    return DiarizationProviderFactory.list_providers()


async def process_project_background(project_id: str, youtube_url: str, provider_id: str = "spectral_vad", num_speakers: int = 2):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        stmt = select(Project).where(Project.id == project_id)
        res = await db.execute(stmt)
        project = res.scalar_one_or_none()
        if not project:
            return

        try:
            title, video_url, audio_url = await download_youtube_media(project_id, youtube_url)
            project.title = title
            project.video_url = video_url
            project.audio_url = audio_url

            await create_project_segments_and_speakers(
                db,
                project_id,
                audio_url,
                num_speakers=num_speakers,
                provider_id=provider_id
            )

            project.status = "ready"
            await db.commit()

            await ws_manager.broadcast(project_id, {"type": "project_ready", "project_id": project_id})
        except Exception as e:
            project.status = "error"
            await db.commit()
            await ws_manager.broadcast(project_id, {"type": "project_error", "project_id": project_id, "error": str(e)})


async def run_resegment_background(project_id: str, provider_id: str, num_speakers: int, enable_sam_audio: bool):
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        stmt = select(Project).where(Project.id == project_id)
        res = await db.execute(stmt)
        project = res.scalar_one_or_none()
        if not project:
            return

        try:
            # Clear existing recordings, segments, and speakers in foreign-key safe cascade order
            subq = select(DialogueSegment.id).where(DialogueSegment.project_id == project_id)
            await db.execute(delete(Recording).where(Recording.segment_id.in_(subq)))
            await db.execute(delete(DialogueSegment).where(DialogueSegment.project_id == project_id))
            await db.execute(delete(Speaker).where(Speaker.project_id == project_id))
            await db.commit()

            audio_url = project.audio_url or f"/storage/{project_id}/original_audio.wav"
            try:
                await create_project_segments_and_speakers(
                    db,
                    project_id,
                    audio_url,
                    num_speakers=num_speakers,
                    provider_id=provider_id
                )
            except Exception:
                await create_project_segments_and_speakers(
                    db,
                    project_id,
                    audio_url,
                    num_speakers=num_speakers,
                    provider_id="spectral_vad"
                )

            project.status = "ready"
            await db.commit()
            await ws_manager.broadcast(project_id, {"type": "segment_updated", "project_id": project_id})
        except Exception as e:
            project.status = "error"
            await db.commit()
            await ws_manager.broadcast(project_id, {"type": "project_error", "project_id": project_id, "error": str(e)})


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(payload: ProjectCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    project = Project(
        youtube_url=payload.youtube_url,
        title="Processing YouTube Video...",
        status="processing"
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    background_tasks.add_task(
        process_project_background,
        project.id,
        payload.youtube_url,
        payload.provider_id,
        payload.num_speakers
    )
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/projects/{project_id}/resegment", response_model=ProjectResponse)
async def resegment_project(
    project_id: str,
    payload: ResegmentRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = "processing"
    await db.commit()
    await db.refresh(project)

    background_tasks.add_task(
        run_resegment_background,
        project_id,
        payload.provider_id,
        payload.num_speakers,
        payload.enable_sam_audio
    )
    return project


@router.post("/segments/{segment_id}/split", response_model=list[DialogueSegmentResponse])
async def split_segment(segment_id: str, payload: SegmentSplitRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(DialogueSegment).where(DialogueSegment.id == segment_id)
    res = await db.execute(stmt)
    segment = res.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    split_time = payload.split_time
    if split_time <= segment.start_time or split_time >= segment.end_time:
        raise HTTPException(status_code=400, detail="Split time must be strictly between start and end time")

    original_end = segment.end_time
    segment.end_time = round(split_time, 2)

    new_segment = DialogueSegment(
        project_id=segment.project_id,
        speaker_id=segment.speaker_id,
        start_time=round(split_time, 2),
        end_time=original_end
    )
    db.add(new_segment)
    await db.commit()
    await db.refresh(segment)
    await db.refresh(new_segment)

    await ws_manager.broadcast(segment.project_id, {"type": "segment_updated", "project_id": segment.project_id})
    return [segment, new_segment]


@router.post("/segments/merge", response_model=DialogueSegmentResponse)
async def merge_segments(payload: SegmentMergeRequest, db: AsyncSession = Depends(get_db)):
    if len(payload.segment_ids) < 2:
        raise HTTPException(status_code=400, detail="Must provide at least 2 segment IDs to merge")

    stmt = select(DialogueSegment).where(DialogueSegment.id.in_(payload.segment_ids))
    res = await db.execute(stmt)
    segments = list(res.scalars().all())

    if len(segments) < 2:
        raise HTTPException(status_code=404, detail="One or more segments not found")

    segments.sort(key=lambda x: x.start_time)
    base_segment = segments[0]
    base_segment.end_time = segments[-1].end_time

    for seg in segments[1:]:
        await db.delete(seg)

    await db.commit()
    await db.refresh(base_segment)

    await ws_manager.broadcast(base_segment.project_id, {"type": "segment_updated", "project_id": base_segment.project_id})
    return base_segment


@router.patch("/speakers/{speaker_id}", response_model=SpeakerResponse)
async def update_speaker(speaker_id: str, payload: SpeakerUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Speaker).where(Speaker.id == speaker_id)
    res = await db.execute(stmt)
    speaker = res.scalar_one_or_none()
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")

    if payload.name is not None:
        speaker.name = payload.name
    if payload.color is not None:
        speaker.color = payload.color

    await db.commit()
    await db.refresh(speaker)

    await ws_manager.broadcast(speaker.project_id, {
        "type": "speaker_renamed",
        "project_id": speaker.project_id,
        "payload": {"id": speaker.id, "name": speaker.name, "color": speaker.color}
    })
    return speaker


@router.patch("/segments/{segment_id}", response_model=DialogueSegmentResponse)
async def update_segment(segment_id: str, payload: SegmentUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(DialogueSegment).where(DialogueSegment.id == segment_id)
    res = await db.execute(stmt)
    segment = res.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    if payload.speaker_id is not None:
        segment.speaker_id = payload.speaker_id
    if payload.start_time is not None:
        segment.start_time = payload.start_time
    if payload.end_time is not None:
        segment.end_time = payload.end_time

    await db.commit()
    await db.refresh(segment)

    await ws_manager.broadcast(segment.project_id, {
        "type": "segment_updated",
        "project_id": segment.project_id,
        "payload": {
            "id": segment.id,
            "speaker_id": segment.speaker_id,
            "start_time": segment.start_time,
            "end_time": segment.end_time
        }
    })
    return segment


@router.post("/segments/{segment_id}/recordings", response_model=RecordingResponse, status_code=201)
async def upload_recording(
    segment_id: str,
    file: UploadFile = File(...),
    uploaded_by: str = Form("Anonymous Creator"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DialogueSegment).where(DialogueSegment.id == segment_id)
    res = await db.execute(stmt)
    segment = res.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    rec_id = str(uuid.uuid4())
    project_id = segment.project_id
    rec_dir = Path(settings.STORAGE_PATH) / project_id / "recordings"
    rec_dir.mkdir(parents=True, exist_ok=True)

    extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "webm"
    file_path = rec_dir / f"{rec_id}.{extension}"

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    audio_url = f"/storage/{project_id}/recordings/{rec_id}.{extension}"
    recording = Recording(
        id=rec_id,
        segment_id=segment_id,
        uploaded_by=uploaded_by,
        audio_url=audio_url
    )
    db.add(recording)
    await db.commit()
    await db.refresh(recording)

    await ws_manager.broadcast(project_id, {
        "type": "recording_uploaded",
        "project_id": project_id,
        "payload": {
            "id": recording.id,
            "segment_id": segment_id,
            "uploaded_by": uploaded_by,
            "audio_url": audio_url
        }
    })
    return recording


@router.post("/projects/{project_id}/export", response_model=ExportResponse)
async def trigger_export(project_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_obj = Export(
        project_id=project_id,
        status="processing"
    )
    db.add(export_obj)
    await db.commit()
    await db.refresh(export_obj)

    async def _render():
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            url = await export_fandub_video(session, export_obj.id)
            await ws_manager.broadcast(project_id, {
                "type": "export_completed",
                "project_id": project_id,
                "payload": {"export_id": export_obj.id, "export_url": url}
            })

    background_tasks.add_task(_render)
    return export_obj
