# Life Protecter — Database Schema

**Default Backend:** SQLite (`life_protecter.db`) for local development  
**Production Option:** PostgreSQL 14+ with PostGIS for spatial queries

---

## Entity Relationship Overview

```
DataSource ──< Hospital >── HospitalSpecialty >── Specialty
                    │
                    ├──< HospitalService >── MedicalService
                    ├──< BedCapacity
                    ├──< BedAvailability
                    ├──< UserReport
                    └──< SavedHospital

User ──< SavedHospital
     ──< HospitalSpecialty (verified_by_id)
     ──< HospitalService (updated_by_id)
     ──< AuditLog
     ──< Verification
```

---

## Tables

### `data_sources`
Tracks the origin of hospital records.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| name | VARCHAR(120) UNIQUE | "OpenStreetMap Overpass API", "Hospital Administrator", etc. |
| source_type | VARCHAR(50) | OSM_OVERPASS, HOSPITAL_ADMIN, VERIFIER, DEMO |
| base_url | VARCHAR(500) | API endpoint |
| description | TEXT | Human-readable description |
| is_active | BOOLEAN | Whether source is active |
| last_synced_at | DATETIME | Last successful sync timestamp |
| created_at | DATETIME | — |

---

### `hospitals`
Core facility records. The external_id links to OpenStreetMap node/way/relation IDs.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Internal ID |
| external_id | VARCHAR(120) UNIQUE | e.g. `osm:node/123456` |
| name | VARCHAR(255) | Facility name (from OSM `name` tag) |
| facility_type | VARCHAR(50) | hospital, clinic, doctors, healthcare |
| latitude | FLOAT | WGS84 latitude |
| longitude | FLOAT | WGS84 longitude |
| address | TEXT | Full address |
| city | VARCHAR(120) | City/district |
| state | VARCHAR(120) | State (e.g. Karnataka) |
| postal_code | VARCHAR(20) | PIN code |
| phone | VARCHAR(80) | Contact phone (from OSM or admin) |
| website | VARCHAR(500) | Official website |
| opening_hours | VARCHAR(255) | OSM `opening_hours` format |
| wheelchair_access | VARCHAR(50) | yes/no/limited |
| emergency_capable | BOOLEAN NULL | True only if OSM `emergency=yes` or admin verified |
| source_id | FK → data_sources | — |
| source_name | VARCHAR(120) | Denormalized source name |
| source_url | VARCHAR(500) | Direct OSM or admin URL |
| verification_status | VARCHAR(40) | VERIFIED, HOSPITAL_REPORTED, HISTORICAL, ESTIMATED, UNAVAILABLE |
| is_verified | BOOLEAN | True when DATA_VERIFIER or SUPER_ADMIN confirmed |
| is_demo | BOOLEAN | True for synthetic hackathon records only |
| last_updated | DATETIME | Auto-updated on change |
| created_at | DATETIME | — |

---

### `users`
Registered accounts with RBAC.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| email | VARCHAR(255) UNIQUE | — |
| full_name | VARCHAR(150) | — |
| password_hash | VARCHAR(255) | PBKDF2-SHA256 format: `pbkdf2_sha256$ITER$SALT$HASH` |
| role | VARCHAR(30) | SUPER_ADMIN, HOSPITAL_ADMIN, DATA_VERIFIER, USER |
| assigned_hospital_id | FK → hospitals NULL | HOSPITAL_ADMIN scope restriction |
| preferred_language | VARCHAR(10) | en, kn, hi |
| is_active | BOOLEAN | Account enabled flag |
| created_at | DATETIME | — |
| updated_at | DATETIME | — |

---

### `specialties`
Reference table of 20 medical specialties.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| name | VARCHAR(100) UNIQUE | "Cardiology", "Neurology", etc. |
| slug | VARCHAR(100) UNIQUE | "cardiology", "neurology", etc. |
| description | TEXT | — |

---

### `hospital_specialties`
Junction table linking hospitals to verified specialties.

**Constraint:** UNIQUE(hospital_id, specialty_id)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| hospital_id | FK → hospitals | — |
| specialty_id | FK → specialties | — |
| source | VARCHAR(120) | "Public Registry Verified", "Hospital Administrator", etc. |
| verification_status | VARCHAR(40) | VERIFIED, HOSPITAL_REPORTED, etc. |
| verified_by_id | FK → users NULL | Admin who verified |
| last_updated | DATETIME | — |

---

### `medical_services`
Reference table of 22 medical services.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| name | VARCHAR(120) UNIQUE | "ICU", "Emergency department", etc. |
| slug | VARCHAR(120) UNIQUE | "icu", "emergency-department", etc. |
| category | VARCHAR(80) | Emergency, Critical Care, Diagnostics, etc. |

---

### `hospital_services`
Junction table with service availability per hospital.

**Constraint:** UNIQUE(hospital_id, service_id)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| hospital_id | FK → hospitals | — |
| service_id | FK → medical_services | — |
| availability_status | VARCHAR(40) | AVAILABLE, UNAVAILABLE, UNKNOWN, TEMPORARILY_UNAVAILABLE |
| source | VARCHAR(120) | — |
| verification_status | VARCHAR(40) | — |
| notes | TEXT | Optional admin notes |
| updated_by_id | FK → users NULL | — |
| last_updated | DATETIME | — |

---

### `bed_capacities`
Verified total bed capacity (not live occupancy).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| hospital_id | FK → hospitals | — |
| total_beds | INTEGER NULL | Total licensed bed capacity |
| icu_beds | INTEGER NULL | ICU beds |
| general_ward_beds | INTEGER NULL | General ward beds |
| emergency_beds | INTEGER NULL | Emergency/casualty beds |
| source | VARCHAR(120) | — |
| verification_status | VARCHAR(40) | — |
| is_demo | BOOLEAN | Synthetic demo record flag |
| last_updated | DATETIME | — |

---

### `bed_availabilities`
Live or demo bed availability (never fabricated from capacity).

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| hospital_id | FK → hospitals | — |
| available_beds | INTEGER NULL | Currently unoccupied beds |
| occupied_beds | INTEGER NULL | Currently occupied beds |
| icu_available_beds | INTEGER NULL | — |
| emergency_available_beds | INTEGER NULL | — |
| source | VARCHAR(120) | — |
| verification_status | VARCHAR(40) | — |
| is_demo | BOOLEAN | True for hackathon demo records |
| is_live | BOOLEAN | True only for authorized real-time feeds |
| last_updated | DATETIME | — |

---

### `verifications`
Audit trail for verification decisions.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| entity_type | VARCHAR(50) | "hospital", "hospital_specialty", etc. |
| entity_id | INTEGER | — |
| hospital_id | FK → hospitals NULL | — |
| status | VARCHAR(40) | Verification status applied |
| notes | TEXT | Verifier notes |
| verified_by_id | FK → users NULL | — |
| verified_at | DATETIME | — |

---

### `saved_hospitals`
User-favourite hospitals (synced to account when logged in).

**Constraint:** UNIQUE(user_id, hospital_id)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| user_id | FK → users | — |
| hospital_id | FK → hospitals | — |
| notes | TEXT NULL | Optional personal note |
| created_at | DATETIME | — |

---

### `user_reports`
Citizen data correction reports submitted via hospital details page.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| hospital_id | FK → hospitals | — |
| user_id | FK → users NULL | Optional (anonymous allowed) |
| reporter_name | VARCHAR(120) NULL | — |
| report_type | VARCHAR(50) | incorrect_info, wrong_phone, wrong_location, etc. |
| description | TEXT | Detailed report |
| status | VARCHAR(30) | OPEN, REVIEWED, RESOLVED, DISMISSED |
| reviewed_by_id | FK → users NULL | Admin reviewer |
| created_at | DATETIME | — |
| reviewed_at | DATETIME NULL | — |

---

### `audit_logs`
Immutable log of all admin actions for accountability.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | — |
| actor_id | FK → users NULL | — |
| actor_email | VARCHAR(255) | Denormalized for log readability |
| action | VARCHAR(100) | HOSPITAL_CREATE, HOSPITAL_VERIFY, BED_UPDATE, etc. |
| entity_type | VARCHAR(50) | hospital, user, hospital_service, etc. |
| entity_id | INTEGER NULL | — |
| details | TEXT | Action-specific detail string |
| created_at | DATETIME | — |

---

## Verification Status Values

| Status | Meaning |
|--------|---------|
| VERIFIED | Confirmed by DATA_VERIFIER or SUPER_ADMIN |
| HOSPITAL_REPORTED | Submitted by HOSPITAL_ADMIN, not externally verified |
| HISTORICAL | Sourced from public OSM data, not independently verified |
| ESTIMATED | Administrative estimate (capacity from public records) |
| UNAVAILABLE | No data available from any source |

## Service Availability Status Values

| Status | Meaning |
|--------|---------|
| AVAILABLE | Confirmed available from authorized source |
| UNAVAILABLE | Confirmed not available |
| TEMPORARILY_UNAVAILABLE | Temporarily suspended |
| UNKNOWN | No authoritative data (default for unrecorded services) |

---

## Spatial Queries

When PostgreSQL + PostGIS is configured (`DATABASE_URL` starts with `postgresql`):
- `check_postgis_available()` detects the `postgis` extension
- Haversine bounding-box pre-filter + exact distance calculation is used
- PostGIS `ST_DWithin` queries can be enabled for large-scale deployments by upgrading the `_filter_and_sort_hospitals` service function

For SQLite (default), the app uses Python-side Haversine distance calculation with a bounding-box SQL pre-filter — functionally equivalent and accurate for the radii used (1–50 km).
