import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db
from app.services.diarization.factory import DiarizationProviderFactory
from app.services.visual_tracker import visual_tracker
from app.services.sam_audio import sam_separator

@pytest.fixture(autouse=True)
async def setup_database():
    await init_db()

def test_diarization_provider_factory():
    providers = DiarizationProviderFactory.list_providers()
    assert len(providers) >= 3
    provider_ids = [p["id"] for p in providers]
    assert "spectral_vad" in provider_ids
    assert "nemo" in provider_ids
    assert "pyannote" in provider_ids

    # Test retrieving providers
    spectral = DiarizationProviderFactory.get_provider("spectral_vad")
    assert spectral.provider_id == "spectral_vad"

    nemo = DiarizationProviderFactory.get_provider("nemo")
    assert nemo.provider_id == "nemo"

    pyannote = DiarizationProviderFactory.get_provider("pyannote")
    assert pyannote.provider_id == "pyannote"

def test_visual_tracker_and_sam_separator():
    # Test Visual Tracker
    dummy_segments = [{"speaker_id": "SPEAKER_00"}, {"speaker_id": "SPEAKER_01"}]
    char_map = visual_tracker.track_characters(Path("/tmp/dummy.mp4"), dummy_segments)
    assert "SPEAKER_00" in char_map
    assert "SPEAKER_01" in char_map

    # Test SAM-Audio Source Separator
    stem = sam_separator.isolate_speaker_audio(Path("/tmp/audio.wav"), Path("/tmp/stem.wav"), dummy_segments)
    assert stem == Path("/tmp/stem.wav")

@pytest.mark.asyncio
async def test_diarization_providers_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/diarization/providers")
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 3

        # Test project creation with specified provider
        c_res = await ac.post("/api/projects", json={
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "provider_id": "spectral_vad",
            "num_speakers": 2
        })
        assert c_res.status_code == 201
        project_id = c_res.json()["id"]

        # Test re-segmentation with NeMo provider fallback
        reseg_res = await ac.post(f"/api/projects/{project_id}/resegment", json={
            "provider_id": "nemo",
            "num_speakers": 2,
            "enable_sam_audio": True
        })
        assert reseg_res.status_code == 200
        proj_data = reseg_res.json()
        assert len(proj_data["segments"]) >= 1
