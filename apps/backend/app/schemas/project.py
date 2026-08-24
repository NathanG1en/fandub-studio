from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProjectCreate(BaseModel):
    youtube_url: str
    provider_id: str = "spectral_vad"
    num_speakers: int = 2

class ResegmentRequest(BaseModel):
    provider_id: str = "spectral_vad"
    num_speakers: int = 2
    enable_sam_audio: bool = True

class SegmentSplitRequest(BaseModel):
    split_time: float

class SegmentMergeRequest(BaseModel):
    segment_ids: list[str]

class SpeakerUpdate(BaseModel):
    name: str | None = None
    color: str | None = None

class SegmentUpdate(BaseModel):
    speaker_id: str | None = None
    start_time: float | None = None
    end_time: float | None = None

class RecordingResponse(BaseModel):
    id: str
    segment_id: str
    uploaded_by: str
    audio_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SpeakerResponse(BaseModel):
    id: str
    project_id: str
    name: str
    color: str

    model_config = ConfigDict(from_attributes=True)

class DialogueSegmentResponse(BaseModel):
    id: str
    project_id: str
    speaker_id: str | None = None
    start_time: float
    end_time: float
    speaker: SpeakerResponse | None = None
    recordings: list[RecordingResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ProjectResponse(BaseModel):
    id: str
    title: str
    youtube_url: str
    status: str
    video_url: str | None = None
    audio_url: str | None = None
    created_at: datetime
    speakers: list[SpeakerResponse] = []
    segments: list[DialogueSegmentResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ExportResponse(BaseModel):
    id: str
    project_id: str
    export_url: str | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
