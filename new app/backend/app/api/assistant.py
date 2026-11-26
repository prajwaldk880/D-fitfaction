from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.hospitals import _filter_and_sort_hospitals
from app.database.session import get_db
from app.schemas.schemas import AssistantQueryIn, AssistantResponse
from app.services.assistant import detect_intent
from app.services.geo import BENGALURU_DEFAULT

router = APIRouter(prefix="/api/assistant", tags=["Healthcare Discovery Assistant"])


@router.post("/query", response_model=AssistantResponse)
def query_assistant(payload: AssistantQueryIn, db: Session = Depends(get_db)):
    parsed = detect_intent(payload.query, payload.language)
    filters = parsed["recommended_filters"]

    lat = payload.latitude if payload.latitude is not None else BENGALURU_DEFAULT[0]
    lon = payload.longitude if payload.longitude is not None else BENGALURU_DEFAULT[1]

    hospitals = _filter_and_sort_hospitals(
        db=db,
        center_lat=lat,
        center_lon=lon,
        radius_km=filters["radius_km"],
        specialty=filters["specialty"],
        service=filters["service"],
        emergency_only=filters["emergency_only"],
        demo_mode=False,
    )[:8]

    return AssistantResponse(
        intent=parsed["intent"],
        is_emergency=parsed["is_emergency"],
        reply=parsed["reply"],
        disclaimer=parsed["disclaimer"],
        recommended_filters=filters,
        hospitals=hospitals,
    )
