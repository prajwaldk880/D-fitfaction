from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.database.session import get_db
from app.models.models import (
    AuditLog,
    BedAvailability,
    BedCapacity,
    DataSource,
    Hospital,
    HospitalService,
    HospitalSpecialty,
    MedicalService,
    Specialty,
    User,
    UserReport,
    UserRole,
    Verification,
    VerificationStatus,
)
from app.schemas.schemas import (
    AdminRoleUpdateIn,
    BedSummaryOut,
    BedUpdateIn,
    HospitalCreate,
    HospitalOut,
    HospitalServiceOut,
    HospitalServiceUpdateIn,
    HospitalSpecialtyOut,
    HospitalSpecialtyUpdateIn,
    HospitalUpdate,
    ReportOut,
    ReportReviewIn,
    UserOut,
)
from app.services.hospital_serializer import build_bed_summary, serialize_hospital

router = APIRouter(prefix="/api/admin", tags=["Administration"])

ADMIN_ROLES = (UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DATA_VERIFIER)


def _assert_hospital_scope(user: User, hospital_id: int) -> None:
    if user.role == UserRole.HOSPITAL_ADMIN and user.assigned_hospital_id != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hospital administrators may only modify records for their assigned hospital.",
        )


def _log_audit(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: int | None,
    details: str,
) -> None:
    db.add(
        AuditLog(
            actor_id=user.id,
            actor_email=user.email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )


@router.get("/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    total_hospitals = db.query(Hospital).count()
    verified_hospitals = db.query(Hospital).filter(Hospital.is_verified == True).count()  # noqa: E712
    open_reports = db.query(UserReport).filter(UserReport.status == "OPEN").count()
    total_users = db.query(User).count()
    recent_logs = (
        db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(20).all()
    )
    hospitals = db.query(Hospital).order_by(Hospital.last_updated.desc()).limit(30).all()

    return {
        "metrics": {
            "total_hospitals": total_hospitals,
            "verified_hospitals": verified_hospitals,
            "open_reports": open_reports,
            "total_users": total_users,
        },
        "current_admin": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
            "assigned_hospital_id": current_user.assigned_hospital_id,
        },
        "hospitals": [
            {
                "id": h.id,
                "name": h.name,
                "facility_type": h.facility_type,
                "city": h.city,
                "verification_status": h.verification_status,
                "is_verified": h.is_verified,
                "source_name": h.source_name,
                "last_updated": h.last_updated,
            }
            for h in hospitals
        ],
        "recent_audit_logs": [
            {
                "id": log.id,
                "actor_email": log.actor_email,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in recent_logs
        ],
    }


@router.post("/hospitals", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DATA_VERIFIER)),
):
    hospital = Hospital(
        name=payload.name.strip(),
        facility_type=payload.facility_type.lower(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        postal_code=payload.postal_code,
        phone=payload.phone,
        website=payload.website,
        opening_hours=payload.opening_hours,
        wheelchair_access=payload.wheelchair_access,
        emergency_capable=payload.emergency_capable,
        source_name=payload.source_name,
        source_url=payload.source_url,
        verification_status=payload.verification_status,
        is_verified=payload.verification_status == VerificationStatus.VERIFIED,
    )
    db.add(hospital)
    db.flush()
    _log_audit(db, current_user, "HOSPITAL_CREATE", "hospital", hospital.id, f"Created {hospital.name}")
    db.commit()
    db.refresh(hospital)
    return serialize_hospital(db, hospital)


@router.put("/hospitals/{hospital_id}", response_model=HospitalOut)
def update_hospital(
    hospital_id: int,
    payload: HospitalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    _assert_hospital_scope(current_user, hospital_id)
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    update_data = payload.model_dump(exclude_unset=True)
    # Only SUPER_ADMIN or DATA_VERIFIER can mark VERIFIED
    if current_user.role == UserRole.HOSPITAL_ADMIN:
        if update_data.get("verification_status") == VerificationStatus.VERIFIED:
            update_data["verification_status"] = VerificationStatus.HOSPITAL_REPORTED
        update_data.pop("is_verified", None)

    for key, val in update_data.items():
        setattr(hospital, key, val)
    hospital.last_updated = datetime.now(timezone.utc)

    _log_audit(db, current_user, "HOSPITAL_UPDATE", "hospital", hospital.id, f"Updated fields: {list(update_data.keys())}")
    db.commit()
    db.refresh(hospital)
    return serialize_hospital(db, hospital)


@router.post("/hospitals/{hospital_id}/verify")
def verify_hospital(
    hospital_id: int,
    notes: str = "Verified by authorized data verifier",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DATA_VERIFIER)),
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    hospital.is_verified = True
    hospital.verification_status = VerificationStatus.VERIFIED
    hospital.last_updated = datetime.now(timezone.utc)
    db.add(
        Verification(
            entity_type="hospital",
            entity_id=hospital.id,
            hospital_id=hospital.id,
            status=VerificationStatus.VERIFIED,
            notes=notes,
            verified_by_id=current_user.id,
        )
    )
    _log_audit(db, current_user, "HOSPITAL_VERIFY", "hospital", hospital.id, notes)
    db.commit()
    return {"status": "verified", "hospital_id": hospital.id}


@router.post("/hospitals/{hospital_id}/specialties", response_model=HospitalSpecialtyOut)
def upsert_hospital_specialty(
    hospital_id: int,
    payload: HospitalSpecialtyUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    _assert_hospital_scope(current_user, hospital_id)
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    specialty = db.query(Specialty).filter(Specialty.id == payload.specialty_id).first()
    if not hospital or not specialty:
        raise HTTPException(status_code=404, detail="Hospital or specialty not found.")

    link = (
        db.query(HospitalSpecialty)
        .filter(
            HospitalSpecialty.hospital_id == hospital_id,
            HospitalSpecialty.specialty_id == payload.specialty_id,
        )
        .first()
    )
    if link:
        link.source = payload.source
        link.verification_status = payload.verification_status
        link.verified_by_id = current_user.id
        link.last_updated = datetime.now(timezone.utc)
    else:
        link = HospitalSpecialty(
            hospital_id=hospital_id,
            specialty_id=payload.specialty_id,
            source=payload.source,
            verification_status=payload.verification_status,
            verified_by_id=current_user.id,
        )
        db.add(link)

    _log_audit(db, current_user, "SPECIALTY_UPSERT", "hospital_specialty", hospital_id, f"Specialty {specialty.name}")
    db.commit()
    db.refresh(link)
    return HospitalSpecialtyOut(
        specialty_id=specialty.id,
        name=specialty.name,
        slug=specialty.slug,
        source=link.source,
        verification_status=link.verification_status,
        last_updated=link.last_updated,
    )


@router.delete("/hospitals/{hospital_id}/specialties/{specialty_id}")
def remove_hospital_specialty(
    hospital_id: int,
    specialty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    _assert_hospital_scope(current_user, hospital_id)
    link = (
        db.query(HospitalSpecialty)
        .filter(
            HospitalSpecialty.hospital_id == hospital_id,
            HospitalSpecialty.specialty_id == specialty_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Specialty link not found.")
    db.delete(link)
    _log_audit(db, current_user, "SPECIALTY_REMOVE", "hospital_specialty", hospital_id, f"Removed specialty_id={specialty_id}")
    db.commit()
    return {"status": "removed"}


@router.post("/hospitals/{hospital_id}/services", response_model=HospitalServiceOut)
def upsert_hospital_service(
    hospital_id: int,
    payload: HospitalServiceUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    _assert_hospital_scope(current_user, hospital_id)
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    service = db.query(MedicalService).filter(MedicalService.id == payload.service_id).first()
    if not hospital or not service:
        raise HTTPException(status_code=404, detail="Hospital or medical service not found.")

    link = (
        db.query(HospitalService)
        .filter(
            HospitalService.hospital_id == hospital_id,
            HospitalService.service_id == payload.service_id,
        )
        .first()
    )
    if link:
        link.availability_status = payload.availability_status
        link.source = payload.source
        link.verification_status = payload.verification_status
        link.notes = payload.notes
        link.updated_by_id = current_user.id
        link.last_updated = datetime.now(timezone.utc)
    else:
        link = HospitalService(
            hospital_id=hospital_id,
            service_id=payload.service_id,
            availability_status=payload.availability_status,
            source=payload.source,
            verification_status=payload.verification_status,
            notes=payload.notes,
            updated_by_id=current_user.id,
        )
        db.add(link)

    _log_audit(
        db,
        current_user,
        "SERVICE_UPDATE",
        "hospital_service",
        hospital_id,
        f"{service.name}: {payload.availability_status}",
    )
    db.commit()
    db.refresh(link)
    return HospitalServiceOut(
        service_id=service.id,
        name=service.name,
        slug=service.slug,
        category=service.category,
        availability_status=link.availability_status,
        source=link.source,
        verification_status=link.verification_status,
        notes=link.notes,
        last_updated=link.last_updated,
    )


@router.post("/hospitals/{hospital_id}/beds", response_model=BedSummaryOut)
def update_hospital_beds(
    hospital_id: int,
    payload: BedUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    _assert_hospital_scope(current_user, hospital_id)
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    if any(
        v is not None
        for v in (payload.total_beds, payload.icu_beds, payload.general_ward_beds, payload.emergency_beds)
    ):
        cap = (
            db.query(BedCapacity)
            .filter(BedCapacity.hospital_id == hospital_id, BedCapacity.is_demo == payload.is_demo)
            .first()
        )
        if not cap:
            cap = BedCapacity(hospital_id=hospital_id, is_demo=payload.is_demo)
            db.add(cap)
        cap.total_beds = payload.total_beds
        cap.icu_beds = payload.icu_beds
        cap.general_ward_beds = payload.general_ward_beds
        cap.emergency_beds = payload.emergency_beds
        cap.source = payload.source
        cap.verification_status = payload.verification_status
        cap.last_updated = datetime.now(timezone.utc)

    if any(
        v is not None
        for v in (
            payload.available_beds,
            payload.occupied_beds,
            payload.icu_available_beds,
            payload.emergency_available_beds,
        )
    ):
        avail = (
            db.query(BedAvailability)
            .filter(
                BedAvailability.hospital_id == hospital_id,
                BedAvailability.is_demo == payload.is_demo,
            )
            .first()
        )
        if not avail:
            avail = BedAvailability(hospital_id=hospital_id, is_demo=payload.is_demo)
            db.add(avail)
        avail.available_beds = payload.available_beds
        avail.occupied_beds = payload.occupied_beds
        avail.icu_available_beds = payload.icu_available_beds
        avail.emergency_available_beds = payload.emergency_available_beds
        avail.source = payload.source
        avail.verification_status = payload.verification_status
        avail.is_live = payload.is_live and not payload.is_demo
        avail.last_updated = datetime.now(timezone.utc)

    _log_audit(db, current_user, "BED_UPDATE", "hospital_beds", hospital_id, f"source={payload.source}, demo={payload.is_demo}")
    db.commit()
    return build_bed_summary(db, hospital, demo_mode=payload.is_demo)


@router.get("/reports", response_model=List[ReportOut])
def list_user_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    query = db.query(UserReport)
    if current_user.role == UserRole.HOSPITAL_ADMIN and current_user.assigned_hospital_id:
        query = query.filter(UserReport.hospital_id == current_user.assigned_hospital_id)
    return query.order_by(UserReport.created_at.desc()).all()


@router.put("/reports/{report_id}", response_model=ReportOut)
def review_user_report(
    report_id: int,
    payload: ReportReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    report = db.query(UserReport).filter(UserReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    _assert_hospital_scope(current_user, report.hospital_id)

    report.status = payload.status
    report.reviewed_by_id = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)
    _log_audit(db, current_user, "REPORT_REVIEW", "user_report", report.id, f"status={payload.status}")
    db.commit()
    db.refresh(report)
    return report


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: AdminRoleUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    target.role = payload.role
    target.assigned_hospital_id = payload.assigned_hospital_id
    _log_audit(db, current_user, "USER_ROLE_UPDATE", "user", target.id, f"role={payload.role}, hospital={payload.assigned_hospital_id}")
    db.commit()
    db.refresh(target)
    return target


@router.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.DATA_VERIFIER)),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "actor_email": l.actor_email,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "details": l.details,
            "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/data-sources")
def list_data_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*ADMIN_ROLES)),
):
    sources = db.query(DataSource).order_by(DataSource.id.asc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "base_url": s.base_url,
            "description": s.description,
            "is_active": s.is_active,
            "last_synced_at": s.last_synced_at,
        }
        for s in sources
    ]
