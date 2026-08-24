import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_notifications_v1_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # GET /api/v1/notifications
        res1 = await ac.get("/api/v1/notifications?user_id=user_1")
        assert res1.status_code == 200
        assert isinstance(res1.json(), list)

        # GET /api/v1/notifications/unread-count
        res2 = await ac.get("/api/v1/notifications/unread-count?user_id=user_1")
        assert res2.status_code == 200
        assert "unread_count" in res2.json()

        # POST /api/v1/notifications/generate-reminders
        res3 = await ac.post("/api/v1/notifications/generate-reminders?user_id=user_1")
        assert res3.status_code == 200
        assert res3.json()["status"] == "ok"
