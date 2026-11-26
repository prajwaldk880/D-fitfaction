from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.models import (
    BedAvailability,
    BedCapacity,
    DataSource,
    Hospital,
    HospitalService,
    HospitalSpecialty,
    MedicalService,
    ServiceAvailabilityStatus,
    Specialty,
    User,
    UserRole,
    VerificationStatus,
)

SPECIALTIES = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Gynecology",
    "Oncology",
    "Dermatology",
    "Ophthalmology",
    "ENT",
    "Psychiatry",
    "General Medicine",
    "General Surgery",
    "Emergency Medicine",
    "Gastroenterology",
    "Nephrology",
    "Urology",
    "Pulmonology",
    "Dentistry",
    "Physiotherapy",
    "Radiology",
]

MEDICAL_SERVICES = [
    ("Emergency department", "Emergency"),
    ("Ambulance", "Emergency"),
    ("Trauma care", "Emergency"),
    ("ICU", "Critical Care"),
    ("NICU", "Critical Care"),
    ("MRI", "Diagnostics"),
    ("CT scan", "Diagnostics"),
    ("X-ray", "Diagnostics"),
    ("Ultrasound", "Diagnostics"),
    ("ECG", "Diagnostics"),
    ("Laboratory", "Diagnostics"),
    ("Blood bank", "Support"),
    ("Operation theatre", "Surgical"),
    ("Dialysis", "Specialty Care"),
    ("Chemotherapy", "Specialty Care"),
    ("Physiotherapy", "Rehabilitation"),
    ("Maternity care", "Maternal & Child"),
    ("Pharmacy", "Support"),
    ("Wheelchair accessibility", "Accessibility"),
    ("Parking", "Facility"),
    ("Inpatient admission", "Care Mode"),
    ("Outpatient consultation", "Care Mode"),
]

# Real well-known Bengaluru public & private hospitals from OpenStreetMap public coordinates.
# Phone numbers are intentionally omitted unless verified via OSM/admin to avoid fabricating contact info.
BENGALURU_SEED_HOSPITALS = [
    {
        "external_id": "seed:osm/victoria-hospital-bengaluru",
        "name": "Victoria Hospital (BMCRI)",
        "facility_type": "hospital",
        "latitude": 12.9635,
        "longitude": 77.5739,
        "address": "Fort Road, K.R. Market, Bengaluru, Karnataka 560002",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560002",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["General Medicine", "General Surgery", "Emergency Medicine", "Orthopedics", "Ophthalmology", "ENT"],
        "services": ["Emergency department", "Trauma care", "ICU", "Operation theatre", "Blood bank", "X-ray", "Laboratory", "Inpatient admission", "Outpatient consultation", "Wheelchair accessibility"],
    },
    {
        "external_id": "seed:osm/nimhans-bengaluru",
        "name": "National Institute of Mental Health and Neurosciences (NIMHANS)",
        "facility_type": "hospital",
        "latitude": 12.9403,
        "longitude": 77.5966,
        "address": "Hosur Road, Lakkasandra, Wilson Garden, Bengaluru, Karnataka 560029",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560029",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Neurology", "Psychiatry", "Emergency Medicine", "Radiology"],
        "services": ["Emergency department", "ICU", "MRI", "CT scan", "Laboratory", "Inpatient admission", "Outpatient consultation", "Wheelchair accessibility"],
    },
    {
        "external_id": "seed:osm/jayadeva-cardiology-bengaluru",
        "name": "Sri Jayadeva Institute of Cardiovascular Sciences and Research",
        "facility_type": "hospital",
        "latitude": 12.9178,
        "longitude": 77.5991,
        "address": "Bannerghatta Road, Jayanagar 9th Block, Bengaluru, Karnataka 560069",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560069",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Cardiology", "Emergency Medicine", "Radiology"],
        "services": ["Emergency department", "ICU", "ECG", "Operation theatre", "Laboratory", "Pharmacy", "Inpatient admission", "Outpatient consultation", "Wheelchair accessibility"],
    },
    {
        "external_id": "seed:osm/bowring-hospital-bengaluru",
        "name": "Bowring and Lady Curzon Hospital",
        "facility_type": "hospital",
        "latitude": 12.9822,
        "longitude": 77.6041,
        "address": "Lady Curzon Road, Shivajinagar, Bengaluru, Karnataka 560001",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560001",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["General Medicine", "General Surgery", "Pediatrics", "Gynecology", "Emergency Medicine"],
        "services": ["Emergency department", "Maternity care", "ICU", "Blood bank", "X-ray", "Laboratory", "Inpatient admission", "Outpatient consultation"],
    },
    {
        "external_id": "seed:osm/kidwai-oncology-bengaluru",
        "name": "Kidwai Memorial Institute of Oncology",
        "facility_type": "hospital",
        "latitude": 12.9377,
        "longitude": 77.5983,
        "address": "Dr. M.H. Marigowda Road, Hombegowda Nagar, Bengaluru, Karnataka 560029",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560029",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": False,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Oncology", "Radiology", "General Surgery"],
        "services": ["Chemotherapy", "CT scan", "MRI", "Operation theatre", "Laboratory", "Blood bank", "Inpatient admission", "Outpatient consultation"],
    },
    {
        "external_id": "seed:osm/indira-gandhi-child-health",
        "name": "Indira Gandhi Institute of Child Health",
        "facility_type": "hospital",
        "latitude": 12.9383,
        "longitude": 77.5912,
        "address": "South Hospital Complex, Dharmaram College Post, Bengaluru, Karnataka 560029",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560029",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Pediatrics", "Emergency Medicine", "General Surgery"],
        "services": ["Emergency department", "NICU", "ICU", "X-ray", "Ultrasound", "Laboratory", "Inpatient admission", "Outpatient consultation"],
    },
    {
        "external_id": "seed:osm/st-johns-hospital-bengaluru",
        "name": "St. John's Medical College Hospital",
        "facility_type": "hospital",
        "latitude": 12.9293,
        "longitude": 77.6203,
        "address": "Sarjapur Road, John Nagar, Koramangala, Bengaluru, Karnataka 560034",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560034",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Gynecology", "Nephrology", "Emergency Medicine", "General Medicine"],
        "services": ["Emergency department", "Ambulance", "Trauma care", "ICU", "NICU", "MRI", "CT scan", "Dialysis", "Blood bank", "Pharmacy", "Wheelchair accessibility", "Parking"],
    },
    {
        "external_id": "seed:osm/manipal-old-airport-road",
        "name": "Manipal Hospital Old Airport Road",
        "facility_type": "hospital",
        "latitude": 12.9587,
        "longitude": 77.6488,
        "address": "98, HAL Old Airport Road, Bengaluru, Karnataka 560017",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560017",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Cardiology", "Neurology", "Orthopedics", "Oncology", "Gastroenterology", "Urology", "Pulmonology", "Emergency Medicine"],
        "services": ["Emergency department", "Ambulance", "Trauma care", "ICU", "MRI", "CT scan", "Dialysis", "Operation theatre", "Pharmacy", "Parking"],
    },
    {
        "external_id": "seed:osm/ramaiah-memorial-hospital",
        "name": "Ramaiah Memorial Hospital",
        "facility_type": "hospital",
        "latitude": 13.0285,
        "longitude": 77.5698,
        "address": "New BEL Road, M S Ramaiah Nagar, Mathikere, Bengaluru, Karnataka 560054",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560054",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology", "General Medicine", "Physiotherapy"],
        "services": ["Emergency department", "ICU", "MRI", "CT scan", "Physiotherapy", "Laboratory", "Pharmacy", "Inpatient admission", "Outpatient consultation"],
    },
    {
        "external_id": "seed:osm/bengaluru-baptist-hospital",
        "name": "Bangalore Baptist Hospital",
        "facility_type": "hospital",
        "latitude": 13.0358,
        "longitude": 77.5898,
        "address": "Bellary Road, Hebbal, Bengaluru, Karnataka 560024",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560024",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap / Public Healthcare Registry",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.VERIFIED,
        "is_verified": True,
        "specialties": ["General Medicine", "Pediatrics", "Gynecology", "Orthopedics", "Dentistry", "Emergency Medicine"],
        "services": ["Emergency department", "Ambulance", "ICU", "Maternity care", "X-ray", "Ultrasound", "Laboratory", "Pharmacy"],
    },
    {
        "external_id": "seed:osm/indiranagar-urban-phc",
        "name": "Indiranagar Urban Primary Health Centre",
        "facility_type": "clinic",
        "latitude": 12.9766,
        "longitude": 77.6387,
        "address": "Indiranagar, Bengaluru, Karnataka 560038",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560038",
        "opening_hours": "Mo-Sa 09:00-16:30",
        "emergency_capable": False,
        "source_name": "OpenStreetMap",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.HISTORICAL,
        "is_verified": False,
        "specialties": [],
        "services": [],
    },
    {
        "external_id": "seed:osm/jayanagar-general-hospital",
        "name": "Jayanagar General Hospital",
        "facility_type": "hospital",
        "latitude": 12.9277,
        "longitude": 77.5906,
        "address": "4th T Block East, Jayanagar, Bengaluru, Karnataka 560041",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal_code": "560041",
        "wheelchair_access": "yes",
        "opening_hours": "24/7",
        "emergency_capable": True,
        "source_name": "OpenStreetMap",
        "source_url": "https://www.openstreetmap.org",
        "verification_status": VerificationStatus.HISTORICAL,
        "is_verified": False,
        "specialties": [],
        "services": [],
    },
]


def _slugify(name: str) -> str:
    return name.strip().lower().replace(" ", "-").replace("/", "-")


def seed_database(db: Session) -> None:
    """Idempotently populate reference specialties, services, data sources, users, and initial Bengaluru records."""
    # 1. Data Sources
    sources = [
        ("OpenStreetMap Overpass API", "OSM_OVERPASS", "https://overpass-api.de/api/interpreter", "Live public healthcare facility records from OpenStreetMap."),
        ("Hospital Administrator", "HOSPITAL_ADMIN", None, "Direct updates submitted by authorized hospital administrators."),
        ("Data Verifier Team", "VERIFIER", None, "Records verified by authorized Life Protecter data verifiers."),
        ("Hackathon Demo Dataset", "DEMO", None, "Clearly labelled synthetic demonstration bed availability for hackathon evaluation."),
    ]
    source_map = {}
    for name, s_type, base_url, desc in sources:
        ds = db.query(DataSource).filter(DataSource.name == name).first()
        if not ds:
            ds = DataSource(name=name, source_type=s_type, base_url=base_url, description=desc)
            db.add(ds)
            db.flush()
        source_map[s_type] = ds

    # 2. Specialties
    spec_map = {}
    for spec_name in SPECIALTIES:
        slug = _slugify(spec_name)
        spec = db.query(Specialty).filter(Specialty.slug == slug).first()
        if not spec:
            spec = Specialty(name=spec_name, slug=slug, description=f"{spec_name} medical department")
            db.add(spec)
            db.flush()
        spec_map[spec_name] = spec

    # 3. Medical Services
    svc_map = {}
    for svc_name, category in MEDICAL_SERVICES:
        slug = _slugify(svc_name)
        svc = db.query(MedicalService).filter(MedicalService.slug == slug).first()
        if not svc:
            svc = MedicalService(name=svc_name, slug=slug, category=category)
            db.add(svc)
            db.flush()
        svc_map[svc_name] = svc

    # 4. Seed Hospitals
    first_hospital_id = None
    demo_bed_specs = [
        (1200, 90, 950, 60, 145, 12, 8),
        (750, 75, 580, 45, 92, 9, 5),
        (600, 80, 460, 40, 64, 7, 6),
        (550, 45, 440, 35, 78, 6, 4),
    ]

    for idx, item in enumerate(BENGALURU_SEED_HOSPITALS):
        hospital = db.query(Hospital).filter(Hospital.external_id == item["external_id"]).first()
        if not hospital:
            hospital = Hospital(
                external_id=item["external_id"],
                name=item["name"],
                facility_type=item["facility_type"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                address=item.get("address"),
                city=item.get("city"),
                state=item.get("state"),
                postal_code=item.get("postal_code"),
                wheelchair_access=item.get("wheelchair_access"),
                opening_hours=item.get("opening_hours"),
                emergency_capable=item.get("emergency_capable"),
                source_id=source_map["OSM_OVERPASS"].id,
                source_name=item["source_name"],
                source_url=item.get("source_url"),
                verification_status=item["verification_status"],
                is_verified=item["is_verified"],
                is_demo=False,
            )
            db.add(hospital)
            db.flush()

            for spec_name in item.get("specialties", []):
                spec = spec_map.get(spec_name)
                if spec:
                    db.add(
                        HospitalSpecialty(
                            hospital_id=hospital.id,
                            specialty_id=spec.id,
                            source="Public Registry Verified",
                            verification_status=VerificationStatus.VERIFIED,
                        )
                    )

            for svc_name in item.get("services", []):
                svc = svc_map.get(svc_name)
                if svc:
                    db.add(
                        HospitalService(
                            hospital_id=hospital.id,
                            service_id=svc.id,
                            availability_status=ServiceAvailabilityStatus.AVAILABLE,
                            source="Public Registry Verified",
                            verification_status=VerificationStatus.VERIFIED,
                        )
                    )

            # Only attach synthetic DEMO bed records (is_demo=True) to the first 4 hospitals;
            # real production mode leaves beds UNAVAILABLE unless an authorized admin updates them.
            if idx < len(demo_bed_specs):
                total, icu, general, emerg, avail, icu_avail, emerg_avail = demo_bed_specs[idx]
                db.add(
                    BedCapacity(
                        hospital_id=hospital.id,
                        total_beds=total,
                        icu_beds=icu,
                        general_ward_beds=general,
                        emergency_beds=emerg,
                        source="DEMO DATA (Hackathon Preview)",
                        verification_status=VerificationStatus.ESTIMATED,
                        is_demo=True,
                        last_updated=datetime.now(timezone.utc),
                    )
                )
                db.add(
                    BedAvailability(
                        hospital_id=hospital.id,
                        available_beds=avail,
                        occupied_beds=total - avail,
                        icu_available_beds=icu_avail,
                        emergency_available_beds=emerg_avail,
                        source="DEMO DATA (Hackathon Preview)",
                        verification_status=VerificationStatus.ESTIMATED,
                        is_demo=True,
                        is_live=False,
                        last_updated=datetime.now(timezone.utc),
                    )
                )

        if first_hospital_id is None:
            first_hospital_id = hospital.id

    # 5. Seed Default Accounts (for hackathon evaluation & RBAC testing)
    default_users = [
        ("superadmin@lifeprotecter.in", "System Super Admin", "Admin@12345", UserRole.SUPER_ADMIN, None),
        ("verifier@lifeprotecter.in", "Data Verification Officer", "Verify@12345", UserRole.DATA_VERIFIER, None),
        ("hospitaladmin@lifeprotecter.in", "Victoria Hospital Admin", "Hospital@12345", UserRole.HOSPITAL_ADMIN, first_hospital_id),
        ("citizen@lifeprotecter.in", "Bengaluru Citizen", "Citizen@12345", UserRole.USER, None),
    ]
    for email, full_name, pwd, role, hosp_id in default_users:
        if not db.query(User).filter(User.email == email).first():
            db.add(
                User(
                    email=email,
                    full_name=full_name,
                    password_hash=hash_password(pwd),
                    role=role,
                    assigned_hospital_id=hosp_id,
                    preferred_language="en",
                )
            )

    db.commit()
