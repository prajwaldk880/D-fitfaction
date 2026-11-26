from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database.session import get_db
from app.models.models import (
    AuditLog,
    Hospital,
    HospitalService,
    HospitalSpecialty,
    SavedHospital,
    User,
    UserRole,
)
from app.schemas.schemas import (
    HospitalOut,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
    UserUpdate,
)
from app.services.hospital_serializer import serialize_hospital

router = APIRouter(prefix="/api/users", tags=["Users & Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=UserRole.USER,
        preferred_language=payload.preferred_language,
    )
    db.add(user)
    db.flush()

    db.add(
        AuditLog(
            actor_id=user.id,
            actor_email=user.email,
            action="USER_REGISTER",
            entity_type="user",
            entity_id=user.id,
            details="New citizen account registered.",
        )
    )
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.email, role=user.role, user_id=user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled.",
        )

    token = create_access_token(subject=user.email, role=user.role, user_id=user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/saved", response_model=List[HospitalOut])
def get_saved_hospitals(
    demo_mode: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved = (
        db.query(SavedHospital)
        .options(
            joinedload(SavedHospital.hospital)
            .joinedload(Hospital.specialties)
            .joinedload(HospitalSpecialty.specialty),
            joinedload(SavedHospital.hospital)
            .joinedload(Hospital.services)
            .joinedload(HospitalService.service),
        )
        .filter(SavedHospital.user_id == current_user.id)
        .order_by(SavedHospital.created_at.desc())
        .all()
    )
    return [
        serialize_hospital(db, s.hospital, demo_mode=demo_mode)
        for s in saved
        if s.hospital is not None
    ]


@router.post("/saved/{hospital_id}", status_code=status.HTTP_201_CREATED)
def save_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    existing = (
        db.query(SavedHospital)
        .filter(
            SavedHospital.user_id == current_user.id,
            SavedHospital.hospital_id == hospital_id,
        )
        .first()
    )
    if existing:
        return {"status": "already_saved", "hospital_id": hospital_id}

    db.add(SavedHospital(user_id=current_user.id, hospital_id=hospital_id))
    db.commit()
    return {"status": "saved", "hospital_id": hospital_id}


@router.delete("/saved/{hospital_id}")
def remove_saved_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(SavedHospital)
        .filter(
            SavedHospital.user_id == current_user.id,
            SavedHospital.hospital_id == hospital_id,
        )
        .first()
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Saved hospital not found.")
    db.delete(existing)
    db.commit()
    return {"status": "removed", "hospital_id": hospital_id}
