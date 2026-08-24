from app.services.diarization.base import BaseDiarizer
from app.services.diarization.spectral_vad_provider import SpectralVADDiarizer
from app.services.diarization.nemo_provider import NeMoDiarizer
from app.services.diarization.pyannote_provider import PyAnnoteDiarizer
from app.services.diarization.gcp_provider import GCPCloudRunDiarizer

class DiarizationProviderFactory:
    """Factory and registry for Speaker Diarization Providers."""

    _providers: dict[str, BaseDiarizer] = {}

    @classmethod
    def initialize(cls):
        cls._providers = {
            "spectral_vad": SpectralVADDiarizer(),
            "nemo": NeMoDiarizer(),
            "pyannote": PyAnnoteDiarizer(),
            "gcp_gpu": GCPCloudRunDiarizer(),
        }

    @classmethod
    def get_provider(cls, provider_id: str = "spectral_vad") -> BaseDiarizer:
        if not cls._providers:
            cls.initialize()
        return cls._providers.get(provider_id.lower(), cls._providers["spectral_vad"])

    @classmethod
    def list_providers(cls) -> list[dict]:
        if not cls._providers:
            cls.initialize()

        status_msgs = {
            "gcp_gpu": "GCP Project 'small-pipeline' Cloud Run GPU Microservice (NVIDIA L4 GPU)",
            "spectral_vad": "High-precision Short-Time Energy VAD + Agglomerative Clustering (Ready - CPU)",
            "nemo": "NVIDIA NeMo MSDD 1.5s Multi-Scale Windowing Engine (Requires CUDA GPU)",
            "pyannote": "PyAnnote 3.1 Binarization & Neural Diarization Pipeline (Requires HUGGINGFACE_TOKEN)",
        }

        return [
            {
                "id": p.provider_id,
                "name": p.display_name,
                "available": p.is_available,
                "status_message": status_msgs.get(p.provider_id, ""),
            }
            for p in cls._providers.values()
        ]

diarization_factory = DiarizationProviderFactory()
