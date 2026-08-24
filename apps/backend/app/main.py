from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import init_db
from app.api.projects import router as projects_router
from app.api.ws import router as ws_router
from app.api.notifications import router as notifications_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local storage directory for media streaming (video/audio files)
storage_dir = Path(settings.STORAGE_PATH)
storage_dir.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_dir)), name="storage")

# Include Routers
app.include_router(projects_router)
app.include_router(ws_router)
app.include_router(notifications_router)

# Mount /api/v1 prefix router alias for api/v1 route compatibility
app.include_router(projects_router, prefix="/api/v1")

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "service": "FanDub Studio Backend"}
