import asyncio
import wave
import numpy as np
from pathlib import Path
import httpx
from playwright.async_api import async_playwright

async def verify_gcp_diarization_ui():
    backend_url = "http://127.0.0.1:8000"
    frontend_url = "http://localhost:3000"
    artifact_dir = Path("/Users/nathanglen/.gemini/antigravity/brain/5d10457a-ef7f-4dcb-be81-93746c66ca49")
    screenshot_path = artifact_dir / "gcp_ui_verified.png"

    print("\n=== STEP 1: Creating Local Test Audio File ===")
    test_dir = Path("/tmp/fandub_ui_test")
    test_dir.mkdir(parents=True, exist_ok=True)
    audio_path = test_dir / "test_audio.wav"

    sample_rate = 16000
    duration = 4.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio_signal = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    with wave.open(str(audio_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_signal.tobytes())

    print("\n=== STEP 2: Creating Studio Project Directly in DB ===")
    from app.core.database import AsyncSessionLocal
    from app.models.project import Project
    import uuid

    project_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        proj = Project(
            id=project_id,
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            title="GCP Cloud Diarization Test Project",
            status="ready",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            audio_url=str(audio_path)
        )
        session.add(proj)
        await session.commit()
    print(f"Created Studio Project ID: {project_id}")

    print("\n=== STEP 3: Executing GCP Cloud Resegmentation ===")
    timeout_config = httpx.Timeout(120.0, connect=30.0)
    async with httpx.AsyncClient(timeout=timeout_config) as client:
        reseg_res = await client.post(f"{backend_url}/api/projects/{project_id}/resegment", json={
            "provider_id": "gcp_gpu",
            "num_speakers": 2,
            "enable_sam_audio": True
        })
        print(f"GCP Resegmentation Status: {reseg_res.status_code}")
        updated_proj = reseg_res.json()
        print(f"Project Speakers: {[s['name'] for s in updated_proj.get('speakers', [])]}")

    print("\n=== STEP 4: Launching Playwright UI Verification Browser ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        studio_url = f"{frontend_url}/project/{project_id}"
        print(f"Navigating to Studio UI: {studio_url}")
        await page.goto(studio_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # Inspect speaker roster elements
        speakers_text = await page.inner_text("body")
        print("\n[UI Text Verification]:")
        print(speakers_text[:400])

        # Take Visual Verification Screenshot
        await page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"\nSaved Visual UI Screenshot to: {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_gcp_diarization_ui())
