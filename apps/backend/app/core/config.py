import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "FanDub Studio API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///" + str(BASE_DIR / "fandub.db"))
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    STORAGE_PATH: str = str(STORAGE_DIR)
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
