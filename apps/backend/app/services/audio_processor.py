from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.pipeline_orchestrator import run_multimodal_diarization_pipeline

async def create_project_segments_and_speakers(
    db: AsyncSession,
    project_id: str,
    audio_relative_path: str,
    num_speakers: int = 2,
    provider_id: str = "spectral_vad"
):
    await run_multimodal_diarization_pipeline(
        db,
        project_id,
        audio_relative_path,
        provider_id=provider_id,
        num_speakers=num_speakers,
        enable_sam_audio=True
    )
