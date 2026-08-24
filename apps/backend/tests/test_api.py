import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db

@pytest.fixture(autouse=True)
async def setup_database():
    await init_db()

@pytest.mark.asyncio
async def test_healthz():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/healthz")
        assert res.status_code == 200
        assert res.json() == {"status": "ok", "service": "FanDub Studio Backend"}

@pytest.mark.asyncio
async def test_create_and_get_project():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create project
        create_res = await ac.post("/api/projects", json={"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
        assert create_res.status_code == 201
        data = create_res.json()
        assert "id" in data
        assert data["youtube_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        project_id = data["id"]

        # Fetch project
        get_res = await ac.get(f"/api/projects/{project_id}")
        assert get_res.status_code == 200
        proj_data = get_res.json()
        assert proj_data["id"] == project_id
