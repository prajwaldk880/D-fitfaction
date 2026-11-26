from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Life Protecter"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    SECRET_KEY: str = "life-protecter-dev-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    DATABASE_URL: str = "sqlite:///./life_protecter.db"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    OVERPASS_API_URL: str = "https://overpass-api.de/api/interpreter"
    OVERPASS_TIMEOUT_SECONDS: int = 15
    OVERPASS_CACHE_TTL_MINUTES: int = 30
    OVERPASS_RATE_LIMIT_SECONDS: int = 5
    OVERPASS_USER_AGENT: str = "LifeProtecterHealthcareApp/1.0"
    NOMINATIM_API_URL: str = "https://nominatim.openstreetmap.org/search"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
