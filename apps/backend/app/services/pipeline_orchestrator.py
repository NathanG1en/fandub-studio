from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.project import Speaker, DialogueSegment
from app.services.diarization.factory import DiarizationProviderFactory
from app.services.visual_tracker import visual_tracker
from app.services.sam_audio import sam_separator

async def run_multimodal_diarization_pipeline(
    db: AsyncSession,
    project_id: str,
    audio_relative_path: str,
    provider_id: str = "spectral_vad",
    num_speakers: int = 2,
    enable_sam_audio: bool = True
):
    """
    Multimodal Pipeline:
    1. Run selected Diarization Provider (NVIDIA NeMo / PyAnnote / Spectral VAD) -> "WHO spoke WHEN?"
    2. Run Visual Character Tracking -> Map anonymous speaker IDs to characters
    3. Run Meta SAM-Audio Source Separation -> Isolate character speech from background noise/music
    4. Save DB Speakers and DialogueSegments
    """
    full_audio_path = Path(settings.STORAGE_PATH) / project_id / "original_audio.wav"
    full_video_path = Path(settings.STORAGE_PATH) / project_id / "original_video.mp4"

    # Step 1: Diarization Engine
    diarizer = DiarizationProviderFactory.get_provider(provider_id)
    diarized_segments = diarizer.diarize(full_audio_path, num_speakers=num_speakers)

    # Step 2: Visual Character Tracking
    seg_dicts = [{"speaker_id": s.speaker_id, "start": s.start_time, "end": s.end_time} for s in diarized_segments]
    character_map = visual_tracker.track_characters(full_video_path, seg_dicts)

    # Step 3: SAM-Audio Target Isolation
    if enable_sam_audio:
        stem_path = Path(settings.STORAGE_PATH) / project_id / "isolated_stems.wav"
        sam_separator.isolate_speaker_audio(full_audio_path, stem_path, seg_dicts)

    # Step 4: Persist DB Records
    colors = ["#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4"]
    unique_speakers = sorted(list(set(s.speaker_id for s in diarized_segments)))
    speaker_map = {}

    for i, spk_id in enumerate(unique_speakers):
        char_name = character_map.get(spk_id, f"Speaker {i + 1}")
        spk = Speaker(
            project_id=project_id,
            name=char_name,
            color=colors[i % len(colors)]
        )
        db.add(spk)
        await db.flush()
        speaker_map[spk_id] = spk.id

    for seg in diarized_segments:
        spk_db_id = speaker_map.get(seg.speaker_id)
        dialogue = DialogueSegment(
            project_id=project_id,
            speaker_id=spk_db_id,
            start_time=seg.start_time,
            end_time=seg.end_time
        )
        db.add(dialogue)

    await db.commit()
