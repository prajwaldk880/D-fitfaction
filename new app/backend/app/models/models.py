from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserRole:
    SUPER_ADMIN = "SUPER_ADMIN"
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
    DATA_VERIFIER = "DATA_VERIFIER"
    USER = "USER"
    ALL = {SUPER_ADMIN, HOSPITAL_ADMIN, DATA_VERIFIER, USER}


class VerificationStatus:
    VERIFIED = "VERIFIED"
    HOSPITAL_REPORTED = "HOSPITAL_REPORTED"
    HISTORICAL = "HISTORICAL"
    ESTIMATED = "ESTIMATED"
    UNAVAILABLE = "UNAVAILABLE"
    ALL = {VERIFIED, HOSPITAL_REPORTED, HISTORICAL, ESTIMATED, UNAVAILABLE}


class ServiceAvailabilityStatus:
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    UNKNOWN = "UNKNOWN"
    TEMPORARILY_UNAVAILABLE = "TEMPORARILY_UNAVAILABLE"
    ALL = {AVAILABLE, UNAVAILABLE, UNKNOWN, TEMPORARILY_UNAVAILABLE}


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    source_type = Column(String(50), nullable=False, default="OSM_OVERPASS")
    base_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    hospitals = relationship("Hospital", back_populates="data_source")


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(120), unique=True, nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    facility_type = Column(String(50), nullable=False, default="hospital", index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address = Column(Text, nullable=True)
    city = Column(String(120), nullable=True, index=True)
    state = Column(String(120), nullable=True)
    postal_code = Column(String(20), nullable=True)
    phone = Column(String(80), nullable=True)
    website = Column(String(500), nullable=True)
    opening_hours = Column(String(255), nullable=True)
    wheelchair_access = Column(String(50), nullable=True)
    emergency_capable = Column(Boolean, nullable=True)

    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    source_name = Column(String(120), nullable=False, default="OpenStreetMap")
    source_url = Column(String(500), nullable=True)
    verification_status = Column(
        String(40), nullable=False, default=VerificationStatus.UNAVAILABLE
    )
    is_verified = Column(Boolean, default=False, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)

    last_updated = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    data_source = relationship("DataSource", back_populates="hospitals")
    specialties = relationship(
        "HospitalSpecialty", back_populates="hospital", cascade="all, delete-orphan"
    )
    services = relationship(
        "HospitalService", back_populates="hospital", cascade="all, delete-orphan"
    )
    bed_capacities = relationship(
        "BedCapacity", back_populates="hospital", cascade="all, delete-orphan"
    )
    bed_availabilities = relationship(
        "BedAvailability", back_populates="hospital", cascade="all, delete-orphan"
    )
    reports = relationship(
        "UserReport", back_populates="hospital", cascade="all, delete-orphan"
    )
    saved_by = relationship(
        "SavedHospital", back_populates="hospital", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default=UserRole.USER)
    assigned_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    preferred_language = Column(String(10), nullable=False, default="en")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    assigned_hospital = relationship("Hospital", foreign_keys=[assigned_hospital_id])
    saved_hospitals = relationship(
        "SavedHospital", back_populates="user", cascade="all, delete-orphan"
    )


class Specialty(Base):
    __tablename__ = "specialties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    hospital_links = relationship("HospitalSpecialty", back_populates="specialty")


class HospitalSpecialty(Base):
    __tablename__ = "hospital_specialties"
    __table_args__ = (
        UniqueConstraint("hospital_id", "specialty_id", name="uq_hospital_specialty"),
    )

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    specialty_id = Column(Integer, ForeignKey("specialties.id", ondelete="CASCADE"), nullable=False)
    source = Column(String(120), nullable=False, default="Admin Verified")
    verification_status = Column(
        String(40), nullable=False, default=VerificationStatus.VERIFIED
    )
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_updated = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    hospital = relationship("Hospital", back_populates="specialties")
    specialty = relationship("Specialty", back_populates="hospital_links")


class MedicalService(Base):
    __tablename__ = "medical_services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    category = Column(String(80), nullable=True)

    hospital_links = relationship("HospitalService", back_populates="service")


class HospitalService(Base):
    __tablename__ = "hospital_services"
    __table_args__ = (
        UniqueConstraint("hospital_id", "service_id", name="uq_hospital_service"),
    )

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Integer, ForeignKey("medical_services.id", ondelete="CASCADE"), nullable=False)
    availability_status = Column(
        String(40), nullable=False, default=ServiceAvailabilityStatus.UNKNOWN
    )
    source = Column(String(120), nullable=False, default="Unverified")
    verification_status = Column(
        String(40), nullable=False, default=VerificationStatus.UNAVAILABLE
    )
    notes = Column(Text, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_updated = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    hospital = relationship("Hospital", back_populates="services")
    service = relationship("MedicalService", back_populates="hospital_links")


class BedCapacity(Base):
    __tablename__ = "bed_capacities"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    total_beds = Column(Integer, nullable=True)
    icu_beds = Column(Integer, nullable=True)
    general_ward_beds = Column(Integer, nullable=True)
    emergency_beds = Column(Integer, nullable=True)
    source = Column(String(120), nullable=False, default="Unavailable")
    verification_status = Column(
        String(40), nullable=False, default=VerificationStatus.UNAVAILABLE
    )
    is_demo = Column(Boolean, default=False, nullable=False)
    last_updated = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    hospital = relationship("Hospital", back_populates="bed_capacities")


class BedAvailability(Base):
    __tablename__ = "bed_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    available_beds = Column(Integer, nullable=True)
    occupied_beds = Column(Integer, nullable=True)
    icu_available_beds = Column(Integer, nullable=True)
    emergency_available_beds = Column(Integer, nullable=True)
    source = Column(String(120), nullable=False, default="Unavailable")
    verification_status = Column(
        String(40), nullable=False, default=VerificationStatus.UNAVAILABLE
    )
    is_demo = Column(Boolean, default=False, nullable=False)
    is_live = Column(Boolean, default=False, nullable=False)
    last_updated = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    hospital = relationship("Hospital", back_populates="bed_availabilities")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=True)
    status = Column(String(40), nullable=False)
    notes = Column(Text, nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class SavedHospital(Base):
    __tablename__ = "saved_hospitals"
    __table_args__ = (
        UniqueConstraint("user_id", "hospital_id", name="uq_user_saved_hospital"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="saved_hospitals")
    hospital = relationship("Hospital", back_populates="saved_by")


class UserReport(Base):
    __tablename__ = "user_reports"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reporter_name = Column(String(120), nullable=True)
    report_type = Column(String(50), nullable=False, default="incorrect_info")
    description = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="OPEN")
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    hospital = relationship("Hospital", back_populates="reports")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
