from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, assistant, hospitals, users
from app.core.config import get_settings
from app.database.seed import seed_database
from app.database.session import Base, SessionLocal, check_postgis_available, engine, is_postgres

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Hospital Finder — Healthcare Discovery and Emergency Assistance Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hospitals.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(assistant.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database_backend": "postgresql" if is_postgres() else "sqlite",
        "postgis_enabled": check_postgis_available(),
    }
