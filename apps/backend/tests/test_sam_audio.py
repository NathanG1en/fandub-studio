import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db
from app.services.sam_audio import sam_segmenter
from app.api.projects import run_resegment_background

@pytest.fixture(autouse=True)
async def setup_database():
    await init_db()

def test_sam_audio_segmentation():
    # Test SAM-Audio segmenter with dummy path
    dummy_path = Path("/tmp/test_dummy_audio.wav")
    segments = sam_segmenter.segment_audio(dummy_path, min_speech_duration=0.2, num_speakers=2)
    assert isinstance(segments, list)
    assert len(segments) >= 1
    for seg in segments:
        assert "speaker_idx" in seg
        assert "start" in seg
        assert "end" in seg
        assert seg["start"] < seg["end"]

@pytest.mark.asyncio
async def test_resegment_split_merge_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create project
        c_res = await ac.post("/api/projects", json={"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
        assert c_res.status_code == 201
        project_id = c_res.json()["id"]

        # Trigger re-segmentation API
        reseg_res = await ac.post(f"/api/projects/{project_id}/resegment", json={"num_speakers": 2, "min_speech_duration": 0.4})
        assert reseg_res.status_code == 200

        # Run background resegmentation task directly for test verification
        await run_resegment_background(project_id, provider_id="spectral_vad", num_speakers=2, enable_sam_audio=True)

        # Fetch updated project with fresh segments
        proj_res = await ac.get(f"/api/projects/{project_id}")
        assert proj_res.status_code == 200
        proj_data = proj_res.json()
        assert len(proj_data["segments"]) >= 1

        seg1 = proj_data["segments"][0]
        seg_id = seg1["id"]
        mid_time = round((seg1["start_time"] + seg1["end_time"]) / 2, 2)

        # Split segment
        if mid_time > seg1["start_time"] and mid_time < seg1["end_time"]:
            split_res = await ac.post(f"/api/segments/{seg_id}/split", json={"split_time": mid_time})
            assert split_res.status_code == 200
            split_segs = split_res.json()
            assert len(split_segs) == 2

            # Merge segments back
            merge_res = await ac.post("/api/segments/merge", json={"segment_ids": [split_segs[0]["id"], split_segs[1]["id"]]})
            assert merge_res.status_code == 200
            merged = merge_res.json()
            assert merged["start_time"] == split_segs[0]["start_time"]
