import pytest
from pathlib import Path
from app.services.diarization.factory import DiarizationProviderFactory
from app.services.diarization.gcp_provider import GCPCloudRunDiarizer

def test_gcp_diarizer_provider_registration():
    providers = DiarizationProviderFactory.list_providers()
    provider_ids = [p["id"] for p in providers]
    assert "gcp_gpu" in provider_ids

    gcp_provider = DiarizationProviderFactory.get_provider("gcp_gpu")
    assert isinstance(gcp_provider, GCPCloudRunDiarizer)
    assert gcp_provider.provider_id == "gcp_gpu"

def test_gcp_diarizer_fallback():
    gcp_provider = GCPCloudRunDiarizer()
    dummy_path = Path("/tmp/dummy_audio.wav")
    segments = gcp_provider.diarize(dummy_path, num_speakers=2)
    assert isinstance(segments, list)
    assert len(segments) >= 1
    assert "GCP GPU" in segments[0].speaker_id
