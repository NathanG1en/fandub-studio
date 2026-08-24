from fastapi import APIRouter

router = APIRouter(prefix="", tags=["Notifications"])

@router.get("/api/v1/notifications")
@router.get("/api/notifications")
async def get_notifications(user_id: str = "user_1"):
    return [
        {
            "id": "notif_1",
            "user_id": user_id,
            "title": "Welcome to FanDub Studio",
            "message": "Your studio workspace is ready for collaborative video dubbing.",
            "read": False,
            "created_at": "2026-08-23T21:38:00Z"
        }
    ]

@router.get("/api/v1/notifications/unread-count")
@router.get("/api/notifications/unread-count")
async def get_unread_count(user_id: str = "user_1"):
    return {"unread_count": 0}

@router.post("/api/v1/notifications/generate-reminders")
@router.post("/api/notifications/generate-reminders")
async def generate_reminders(user_id: str = "user_1"):
    return {"status": "ok", "message": "Notifications and studio reminders generated successfully"}
