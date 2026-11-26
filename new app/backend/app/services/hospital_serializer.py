from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import (
    BedAvailability,
    BedCapacity,
    Hospital,
    VerificationStatus,
)
from app.schemas.schemas import (
    BedSummaryOut,
    HospitalOut,
    HospitalServiceOut,
    HospitalSpecialtyOut,
)
from app.services.geo import haversine_distance_km


def build_bed_summary(
    db: Session, hospital: Hospital, demo_mode: bool = False
) -> BedSummaryOut:
    cap_query = db.query(BedCapacity).filter(BedCapacity.hospital_id == hospital.id)
    avail_query = db.query(BedAvailability).filter(BedAvailability.hospital_id == hospital.id)

    if not demo_mode:
        cap_query = cap_query.filter(BedCapacity.is_demo == False)  # noqa: E712
        avail_query = avail_query.filter(BedAvailability.is_demo == False)  # noqa: E712

    cap = cap_query.order_by(BedCapacity.is_demo.asc(), BedCapacity.last_updated.desc()).first()
    avail = avail_query.order_by(
        BedAvailability.is_demo.asc(), BedAvailability.last_updated.desc()
    ).first()

    if not cap and not avail:
        return BedSummaryOut(
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            capacity_source="Unavailable",
            capacity_verification_status=VerificationStatus.UNAVAILABLE,
            availability_source="Unavailable",
            availability_verification_status=VerificationStatus.UNAVAILABLE,
            is_demo=False,
            is_live=False,
            message="Bed availability information is currently unavailable.",
        )

    is_demo_record = bool((cap and cap.is_demo) or (avail and avail.is_demo))
    is_live = bool(avail and avail.is_live and not is_demo_record)

    if is_demo_record:
        msg = "DEMO DATA MODE: Synthetic demonstration figures — not real hospital bed availability."
    elif avail and avail.available_beds is not None and is_live:
        msg = "Live hospital bed availability reported by authorized source."
    elif cap and cap.total_beds is not None:
        msg = "Total capacity recorded; live bed availability is currently unavailable."
    else:
        msg = "Bed availability information is currently unavailable."

    return BedSummaryOut(
        hospital_id=hospital.id,
        hospital_name=hospital.name,
        total_beds=cap.total_beds if cap else None,
        icu_beds=cap.icu_beds if cap else None,
        general_ward_beds=cap.general_ward_beds if cap else None,
        emergency_beds=cap.emergency_beds if cap else None,
        available_beds=avail.available_beds if avail else None,
        occupied_beds=avail.occupied_beds if avail else None,
        icu_available_beds=avail.icu_available_beds if avail else None,
        emergency_available_beds=avail.emergency_available_beds if avail else None,
        capacity_source=cap.source if cap else "Unavailable",
        capacity_verification_status=(
            cap.verification_status if cap else VerificationStatus.UNAVAILABLE
        ),
        availability_source=avail.source if avail else "Unavailable",
        availability_verification_status=(
            avail.verification_status if avail else VerificationStatus.UNAVAILABLE
        ),
        is_demo=is_demo_record,
        is_live=is_live,
        last_updated=(avail.last_updated if avail else (cap.last_updated if cap else None)),
        message=msg,
    )


def serialize_hospital(
    db: Session,
    hospital: Hospital,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    demo_mode: bool = False,
) -> HospitalOut:
    distance_km = None
    if user_lat is not None and user_lon is not None:
        distance_km = haversine_distance_km(
            user_lat, user_lon, hospital.latitude, hospital.longitude
        )

    specialties = [
        HospitalSpecialtyOut(
            specialty_id=hs.specialty_id,
            name=hs.specialty.name,
            slug=hs.specialty.slug,
            source=hs.source,
            verification_status=hs.verification_status,
            last_updated=hs.last_updated,
        )
        for hs in hospital.specialties
        if hs.specialty is not None
    ]

    services = [
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
        for hsv in hospital.services
        if hsv.service is not None
    ]

    return HospitalOut(
        id=hospital.id,
        external_id=hospital.external_id,
        name=hospital.name,
        facility_type=hospital.facility_type,
        latitude=hospital.latitude,
        longitude=hospital.longitude,
        address=hospital.address,
        city=hospital.city,
        state=hospital.state,
        postal_code=hospital.postal_code,
        phone=hospital.phone,
        website=hospital.website,
        opening_hours=hospital.opening_hours,
        wheelchair_access=hospital.wheelchair_access,
        emergency_capable=hospital.emergency_capable,
        source_name=hospital.source_name,
        source_url=hospital.source_url,
        verification_status=hospital.verification_status,
        is_verified=hospital.is_verified,
        is_demo=hospital.is_demo,
        last_updated=hospital.last_updated,
        distance_km=distance_km,
        specialties=specialties,
        services=services,
        bed_summary=build_bed_summary(db, hospital, demo_mode=demo_mode),
    )
