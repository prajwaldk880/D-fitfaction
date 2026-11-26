from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., min_length=6, max_length=128)
    preferred_language: str = Field(default="en", pattern="^(en|kn|hi)$")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    preferred_language: Optional[str] = Field(default=None, pattern="^(en|kn|hi)$")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    assigned_hospital_id: Optional[int] = None
    preferred_language: str
    is_active: bool
    created_at: datetime


class SpecialtyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: Optional[str] = None


class HospitalSpecialtyOut(BaseModel):
    specialty_id: int
    name: str
    slug: str
    source: str
    verification_status: str
    last_updated: Optional[datetime] = None


class HospitalServiceOut(BaseModel):
    service_id: int
    name: str
    slug: str
    category: Optional[str] = None
    availability_status: str
    source: str
    verification_status: str
    notes: Optional[str] = None
    last_updated: Optional[datetime] = None


class BedSummaryOut(BaseModel):
    hospital_id: int
    hospital_name: Optional[str] = None
    total_beds: Optional[int] = None
    icu_beds: Optional[int] = None
    general_ward_beds: Optional[int] = None
    emergency_beds: Optional[int] = None
    available_beds: Optional[int] = None
    occupied_beds: Optional[int] = None
    icu_available_beds: Optional[int] = None
    emergency_available_beds: Optional[int] = None
    capacity_source: str = "Unavailable"
    capacity_verification_status: str = "UNAVAILABLE"
    availability_source: str = "Unavailable"
    availability_verification_status: str = "UNAVAILABLE"
    is_demo: bool = False
    is_live: bool = False
    last_updated: Optional[datetime] = None
    message: str


class HospitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    external_id: Optional[str] = None
    name: str
    facility_type: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None
    wheelchair_access: Optional[str] = None
    emergency_capable: Optional[bool] = None
    source_name: str
    source_url: Optional[str] = None
    verification_status: str
    is_verified: bool
    is_demo: bool
    last_updated: datetime
    distance_km: Optional[float] = None
    specialties: List[HospitalSpecialtyOut] = []
    services: List[HospitalServiceOut] = []
    bed_summary: Optional[BedSummaryOut] = None


class NearbySearchResponse(BaseModel):
    items: List[HospitalOut]
    total: int
    center_latitude: float
    center_longitude: float
    radius_km: float
    data_origin: str
    cache_warning: Optional[str] = None
    overpass_error: Optional[str] = None


class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    facility_type: str = Field(default="hospital", max_length=50)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    city: Optional[str] = "Bengaluru"
    state: Optional[str] = "Karnataka"
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None
    wheelchair_access: Optional[str] = None
    emergency_capable: Optional[bool] = None
    source_name: str = "Hospital Administrator"
    source_url: Optional[str] = None
    verification_status: str = "HOSPITAL_REPORTED"


class HospitalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    facility_type: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None
    wheelchair_access: Optional[str] = None
    emergency_capable: Optional[bool] = None
    verification_status: Optional[str] = None
    is_verified: Optional[bool] = None


class HospitalServiceUpdateIn(BaseModel):
    service_id: int
    availability_status: str = Field(
        ..., pattern="^(AVAILABLE|UNAVAILABLE|UNKNOWN|TEMPORARILY_UNAVAILABLE)$"
    )
    source: str = "Hospital Administrator"
    verification_status: str = Field(
        default="HOSPITAL_REPORTED",
        pattern="^(VERIFIED|HOSPITAL_REPORTED|HISTORICAL|ESTIMATED|UNAVAILABLE)$",
    )
    notes: Optional[str] = None


class HospitalSpecialtyUpdateIn(BaseModel):
    specialty_id: int
    source: str = "Hospital Administrator"
    verification_status: str = Field(
        default="VERIFIED",
        pattern="^(VERIFIED|HOSPITAL_REPORTED|HISTORICAL|ESTIMATED|UNAVAILABLE)$",
    )


class BedUpdateIn(BaseModel):
    total_beds: Optional[int] = Field(default=None, ge=0)
    icu_beds: Optional[int] = Field(default=None, ge=0)
    general_ward_beds: Optional[int] = Field(default=None, ge=0)
    emergency_beds: Optional[int] = Field(default=None, ge=0)
    available_beds: Optional[int] = Field(default=None, ge=0)
    occupied_beds: Optional[int] = Field(default=None, ge=0)
    icu_available_beds: Optional[int] = Field(default=None, ge=0)
    emergency_available_beds: Optional[int] = Field(default=None, ge=0)
    source: str = "Hospital Administrator"
    verification_status: str = Field(
        default="HOSPITAL_REPORTED",
        pattern="^(VERIFIED|HOSPITAL_REPORTED|HISTORICAL|ESTIMATED|UNAVAILABLE)$",
    )
    is_live: bool = False
    is_demo: bool = False


class ReportCreate(BaseModel):
    report_type: str = Field(default="incorrect_info", max_length=50)
    description: str = Field(..., min_length=5, max_length=2000)
    reporter_name: Optional[str] = Field(default=None, max_length=120)


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hospital_id: int
    user_id: Optional[int] = None
    reporter_name: Optional[str] = None
    report_type: str
    description: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None


class ReportReviewIn(BaseModel):
    status: str = Field(..., pattern="^(OPEN|REVIEWED|RESOLVED|DISMISSED)$")


class AssistantQueryIn(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    language: str = "en"


class AssistantResponse(BaseModel):
    intent: str
    is_emergency: bool
    reply: str
    disclaimer: str
    recommended_filters: dict
    hospitals: List[HospitalOut] = []


class AdminRoleUpdateIn(BaseModel):
    role: str = Field(..., pattern="^(SUPER_ADMIN|HOSPITAL_ADMIN|DATA_VERIFIER|USER)$")
    assigned_hospital_id: Optional[int] = None
