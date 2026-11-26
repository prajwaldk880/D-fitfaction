from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user_optional
from app.database.session import get_db
from app.models.models import (
    Hospital,
    HospitalService,
    HospitalSpecialty,
    MedicalService,
    Specialty,
    User,
    UserReport,
)
from app.schemas.schemas import (
    BedSummaryOut,
    HospitalOut,
    HospitalServiceOut,
    NearbySearchResponse,
    ReportCreate,
    ReportOut,
    SpecialtyOut,
)
from app.services.geo import BENGALURU_DEFAULT, bounding_box, haversine_distance_km
from app.services.hospital_serializer import build_bed_summary, serialize_hospital
from app.services.overpass import geocode_india_location, sync_overpass_facilities

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])


def _filter_and_sort_hospitals(
    db: Session,
    center_lat: float,
    center_lon: float,
    radius_km: float,
    q: Optional[str] = None,
    facility_type: Optional[str] = None,
    specialty: Optional[str] = None,
    service: Optional[str] = None,
    emergency_only: bool = False,
    demo_mode: bool = False,
) -> List[HospitalOut]:
    min_lat, max_lat, min_lon, max_lon = bounding_box(center_lat, center_lon, radius_km)
    query = (
        db.query(Hospital)
        .options(
            joinedload(Hospital.specialties).joinedload(HospitalSpecialty.specialty),
            joinedload(Hospital.services).joinedload(HospitalService.service),
        )
        .filter(
            Hospital.latitude.between(min_lat, max_lat),
            Hospital.longitude.between(min_lon, max_lon),
        )
    )

    if facility_type and facility_type.lower() != "all":
        query = query.filter(Hospital.facility_type == facility_type.lower())

    if emergency_only:
        query = query.filter(Hospital.emergency_capable == True)  # noqa: E712

    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (Hospital.name.ilike(pattern))
            | (Hospital.address.ilike(pattern))
            | (Hospital.city.ilike(pattern))
        )

    candidates = query.all()
    results: List[HospitalOut] = []
    spec_filter = specialty.strip().lower() if specialty else None
    svc_filter = service.strip().lower() if service else None

    for hosp in candidates:
        dist = haversine_distance_km(center_lat, center_lon, hosp.latitude, hosp.longitude)
        if dist > radius_km:
            continue

        if spec_filter:
            has_spec = any(
                hs.specialty
                and (
                    hs.specialty.name.lower() == spec_filter
                    or hs.specialty.slug.lower() == spec_filter
                )
                for hs in hosp.specialties
            )
            if not has_spec:
                continue

        if svc_filter:
            has_svc = any(
                hsv.service
                and (
                    hsv.service.name.lower() == svc_filter
                    or hsv.service.slug.lower() == svc_filter
                )
                and hsv.availability_status == "AVAILABLE"
                for hsv in hosp.services
            )
            if not has_svc:
                continue

        serialized = serialize_hospital(
            db, hosp, user_lat=center_lat, user_lon=center_lon, demo_mode=demo_mode
        )
        results.append(serialized)

    results.sort(key=lambda item: (item.distance_km if item.distance_km is not None else 99999.0))
    return results


@router.get("/specialties", response_model=List[SpecialtyOut])
def list_specialties(db: Session = Depends(get_db)):
    return db.query(Specialty).order_by(Specialty.name.asc()).all()


@router.get("/services-catalog")
def list_services_catalog(db: Session = Depends(get_db)):
    services = db.query(MedicalService).order_by(MedicalService.name.asc()).all()
    return [
        {"id": s.id, "name": s.name, "slug": s.slug, "category": s.category}
        for s in services
    ]


@router.get("/nearby", response_model=NearbySearchResponse)
def get_nearby_hospitals(
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    location: Optional[str] = Query(default=None),
    radius_km: float = Query(default=10.0, ge=1.0, le=50.0),
    facility_type: Optional[str] = Query(default=None),
    specialty: Optional[str] = Query(default=None),
    service: Optional[str] = Query(default=None),
    emergency_only: bool = Query(default=False),
    demo_mode: bool = Query(default=False),
    sync_overpass: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    center_lat, center_lon = BENGALURU_DEFAULT
    if lat is not None and lon is not None:
        center_lat, center_lon = lat, lon
    elif location:
        resolved = geocode_india_location(location)
        if not resolved:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not resolve location '{location}'. Try a major locality or city in India (e.g., Indiranagar, Koramangala, Bengaluru, Mysuru).",
            )
        center_lat, center_lon, _ = resolved

    sync_info = {"origin": "database_cached", "warning": None, "error": None}
    if sync_overpass:
        sync_info = sync_overpass_facilities(db, center_lat, center_lon, min(radius_km, 25.0))

    items = _filter_and_sort_hospitals(
        db=db,
        center_lat=center_lat,
        center_lon=center_lon,
        radius_km=radius_km,
        facility_type=facility_type,
        specialty=specialty,
        service=service,
        emergency_only=emergency_only,
        demo_mode=demo_mode,
    )

    return NearbySearchResponse(
        items=items,
        total=len(items),
        center_latitude=center_lat,
        center_longitude=center_lon,
        radius_km=radius_km,
        data_origin=sync_info["origin"],
        cache_warning=sync_info.get("warning"),
        overpass_error=sync_info.get("error"),
    )


@router.get("/search", response_model=NearbySearchResponse)
def search_hospitals(
    q: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None, ge=-90, le=90),
    lon: Optional[float] = Query(default=None, ge=-180, le=180),
    radius_km: float = Query(default=25.0, ge=1.0, le=50.0),
    specialty: Optional[str] = Query(default=None),
    facility_type: Optional[str] = Query(default=None),
    service: Optional[str] = Query(default=None),
    emergency_only: bool = Query(default=False),
    demo_mode: bool = Query(default=False),
    sync_overpass: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    center_lat, center_lon = BENGALURU_DEFAULT
    if lat is not None and lon is not None:
        center_lat, center_lon = lat, lon
    elif location:
        resolved = geocode_india_location(location)
        if not resolved:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not find location '{location}' in India.",
            )
        center_lat, center_lon, _ = resolved

    sync_info = {"origin": "database_cached", "warning": None, "error": None}
    if sync_overpass or location:
        sync_info = sync_overpass_facilities(db, center_lat, center_lon, min(radius_km, 25.0))

    items = _filter_and_sort_hospitals(
        db=db,
        center_lat=center_lat,
        center_lon=center_lon,
        radius_km=radius_km,
        q=q,
        facility_type=facility_type,
        specialty=specialty,
        service=service,
        emergency_only=emergency_only,
        demo_mode=demo_mode,
    )

    return NearbySearchResponse(
        items=items,
        total=len(items),
        center_latitude=center_lat,
        center_longitude=center_lon,
        radius_km=radius_km,
        data_origin=sync_info["origin"],
        cache_warning=sync_info.get("warning"),
        overpass_error=sync_info.get("error"),
    )


@router.get("/compare", response_model=List[HospitalOut])
def compare_hospitals(
    ids: str = Query(..., description="Comma-separated up to 3 hospital IDs"),
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    demo_mode: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    try:
        id_list = [int(part.strip()) for part in ids.split(",") if part.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid hospital IDs format.")

    if not id_list or len(id_list) > 3:
        raise HTTPException(
            status_code=400, detail="Please select between 1 and 3 hospitals to compare."
        )

    hospitals = (
        db.query(Hospital)
        .options(
            joinedload(Hospital.specialties).joinedload(HospitalSpecialty.specialty),
            joinedload(Hospital.services).joinedload(HospitalService.service),
        )
        .filter(Hospital.id.in_(id_list))
        .all()
    )
    by_id = {h.id: h for h in hospitals}
    ordered = [by_id[hid] for hid in id_list if hid in by_id]
    return [
        serialize_hospital(db, h, user_lat=lat, user_lon=lon, demo_mode=demo_mode)
        for h in ordered
    ]


@router.get("/beds", response_model=List[BedSummaryOut])
def list_bed_information(
    demo_mode: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    hospitals = db.query(Hospital).order_by(Hospital.is_verified.desc(), Hospital.name.asc()).limit(50).all()
    return [build_bed_summary(db, h, demo_mode=demo_mode) for h in hospitals]


@router.get("/services-overview", response_model=List[HospitalOut])
def list_services_overview(
    service: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    demo_mode: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return _filter_and_sort_hospitals(
        db=db,
        center_lat=lat if lat is not None else BENGALURU_DEFAULT[0],
        center_lon=lon if lon is not None else BENGALURU_DEFAULT[1],
        radius_km=50.0,
        service=service,
        demo_mode=demo_mode,
    )


@router.get("/{hospital_id}", response_model=HospitalOut)
def get_hospital_detail(
    hospital_id: int,
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    demo_mode: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    hospital = (
        db.query(Hospital)
        .options(
            joinedload(Hospital.specialties).joinedload(HospitalSpecialty.specialty),
            joinedload(Hospital.services).joinedload(HospitalService.service),
        )
        .filter(Hospital.id == hospital_id)
        .first()
    )
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return serialize_hospital(db, hospital, user_lat=lat, user_lon=lon, demo_mode=demo_mode)


@router.get("/{hospital_id}/services", response_model=List[HospitalServiceOut])
def get_hospital_services(hospital_id: int, db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    links = (
        db.query(HospitalService)
        .options(joinedload(HospitalService.service))
        .filter(HospitalService.hospital_id == hospital_id)
        .all()
    )
    return [
        HospitalServiceOut(
            service_id=hsv.service_id,
            name=hsv.service.name,
            slug=hsv.service.slug,
            category=hsv.service.category,
            availability_status=hsv.availability_status,
            source=hsv.source,
            verification_status=hsv.verification_status,
            notes=hsv.notes,
            last_updated=hsv.last_updated,
        )
        for hsv in links
        if hsv.service is not None
    ]


@router.get("/{hospital_id}/beds", response_model=BedSummaryOut)
def get_hospital_beds(
    hospital_id: int,
    demo_mode: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")
    return build_bed_summary(db, hospital, demo_mode=demo_mode)


@router.post("/{hospital_id}/report", response_model=ReportOut, status_code=201)
def report_hospital_issue(
    hospital_id: int,
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    report = UserReport(
        hospital_id=hospital_id,
        user_id=current_user.id if current_user else None,
        reporter_name=payload.reporter_name or (current_user.full_name if current_user else "Anonymous Citizen"),
        report_type=payload.report_type,
        description=payload.description.strip(),
        status="OPEN",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
