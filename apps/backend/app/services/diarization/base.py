from abc import ABC, abstractmethod
from pathlib import Path
from pydantic import BaseModel

class DiarizationSegment(BaseModel):
    speaker_id: str
    start_time: float
    end_time: float
    confidence: float = 1.0

class BaseDiarizer(ABC):
    """Abstract base class for all Speaker Diarization Providers."""

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique string identifier for the provider (e.g. 'nemo', 'pyannote', 'spectral_vad')."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if required model weights, packages, or GPU hardware are available."""
        pass

    @abstractmethod
    def diarize(self, audio_path: Path, num_speakers: int = 2) -> list[DiarizationSegment]:
        """
        Executes speaker diarization on target audio file.
        Returns list of DiarizationSegment objects.
        """
        pass
