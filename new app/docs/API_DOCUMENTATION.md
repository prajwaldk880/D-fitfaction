# Life Protecter — API Documentation

Base URL: `http://127.0.0.1:8000/api`

Interactive Swagger UI: `http://127.0.0.1:8000/docs`

---

## Authentication

**JWT Bearer Token** — Include in Authorization header:
```
Authorization: Bearer <token>
```

Tokens are obtained via `/api/users/login` or `/api/users/register`. Tokens expire after 720 minutes (12 hours) by default.

---

## Health

### GET /api/health
Returns application and database health status.

**Response:**
```json
{
  "status": "ok",
  "app": "Life Protecter",
  "version": "1.0.0",
  "database_backend": "sqlite",
  "postgis_enabled": false
}
```

---

## Hospitals

### GET /api/hospitals/nearby
Find healthcare facilities near a GPS coordinate or manual location string.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lat` | float | — | Latitude (overrides location string) |
| `lon` | float | — | Longitude (overrides location string) |
| `location` | string | — | Indian city/locality name (e.g. "Indiranagar") |
| `radius_km` | float | 10.0 | Search radius (1–50 km) |
| `facility_type` | string | — | hospital \| clinic \| doctors |
| `specialty` | string | — | Medical specialty name (e.g. "Cardiology") |
| `service` | string | — | Medical service name (e.g. "ICU") |
| `emergency_only` | bool | false | Filter emergency-capable only |
| `demo_mode` | bool | false | Include Demo Data bed records |
| `sync_overpass` | bool | true | Trigger live Overpass API sync |

**Response:** `NearbySearchResponse`
```json
{
  "items": [ /* HospitalOut array */ ],
  "total": 10,
  "center_latitude": 12.9716,
  "center_longitude": 77.5946,
  "radius_km": 15.0,
  "data_origin": "overpass_live",
  "cache_warning": null,
  "overpass_error": null
}
```

---

### GET /api/hospitals/search
Full-text hospital search with optional location resolve.

**Query Parameters:** Same as `/nearby` plus `q` (keyword search string).

---

### GET /api/hospitals/{hospital_id}
Get full hospital details including specialties, services, and bed summary.

**Query Parameters:** `lat`, `lon` (optional, for distance calculation), `demo_mode`

---

### GET /api/hospitals/{hospital_id}/services
Get medical service availability records for a specific hospital.

---

### GET /api/hospitals/{hospital_id}/beds
Get bed capacity and availability summary.

**Important:** Returns `"Bed availability information is currently unavailable."` message in standard mode unless a live authorized feed has been connected. `demo_mode=true` returns clearly labelled synthetic demonstration data.

---

### GET /api/hospitals/compare
Compare up to 3 hospitals side-by-side.

**Query Parameters:** `ids` (comma-separated, max 3), `lat`, `lon`, `demo_mode`

---

### GET /api/hospitals/beds
List bed information for top 50 hospitals.

---

### GET /api/hospitals/specialties
List all 20 medical specialties.

---

### GET /api/hospitals/services-catalog
List all 22 medical services.

---

### POST /api/hospitals/{hospital_id}/report
Submit a citizen data correction report (unauthenticated allowed).

**Request Body:**
```json
{
  "report_type": "incorrect_info",
  "description": "The address listed is incorrect...",
  "reporter_name": "Asha Rao"
}
```

---

## Users & Authentication

### POST /api/users/register
Register a new citizen account.

**Request Body:**
```json
{
  "email": "user@example.in",
  "full_name": "Asha Rao",
  "password": "StrongPass123",
  "preferred_language": "kn"
}
```

**Response:** `TokenResponse` with `access_token` and `user` object.

---

### POST /api/users/login
Authenticate an existing user.

**Request Body:** `{ "email": "...", "password": "..." }`

---

### GET /api/users/me
Get current authenticated user profile. **Requires auth.**

---

### PUT /api/users/me
Update full name and preferred language. **Requires auth.**

---

### GET /api/users/saved
List saved hospitals for authenticated user. **Requires auth.**

---

### POST /api/users/saved/{hospital_id}
Save a hospital to the user's account. **Requires auth.**

---

### DELETE /api/users/saved/{hospital_id}
Remove a saved hospital. **Requires auth.**

---

## Administration (Protected)

Requires role: `SUPER_ADMIN`, `HOSPITAL_ADMIN`, or `DATA_VERIFIER`

### GET /api/admin/dashboard
System metrics, hospital list, and recent audit logs.

### POST /api/admin/hospitals
Create a new hospital record. **SUPER_ADMIN or DATA_VERIFIER only.**

### PUT /api/admin/hospitals/{hospital_id}
Update a hospital record. HOSPITAL_ADMIN scoped to assigned hospital only.

### POST /api/admin/hospitals/{hospital_id}/verify
Mark hospital as VERIFIED. **SUPER_ADMIN or DATA_VERIFIER only.**

### POST /api/admin/hospitals/{hospital_id}/specialties
Add or update a verified specialty for a hospital.

### DELETE /api/admin/hospitals/{hospital_id}/specialties/{specialty_id}
Remove a specialty link.

### POST /api/admin/hospitals/{hospital_id}/services
Update medical service availability status.

### POST /api/admin/hospitals/{hospital_id}/beds
Update bed capacity and/or live availability.

### GET /api/admin/reports
List citizen data correction reports.

### PUT /api/admin/reports/{report_id}
Review a citizen report (OPEN → RESOLVED / DISMISSED).

### GET /api/admin/users
List all users. **SUPER_ADMIN only.**

### PUT /api/admin/users/{user_id}/role
Update user role and assigned hospital. **SUPER_ADMIN only.**

### GET /api/admin/audit-logs
Full audit log of all admin actions.

### GET /api/admin/data-sources
List configured data sources.

---

## Healthcare Discovery Assistant

### POST /api/assistant/query
Rule-based intent detection and hospital discovery.

**Request Body:**
```json
{
  "query": "Find cardiology hospitals within 5 km",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "language": "en"
}
```

**Response:**
```json
{
  "intent": "find_specialty_cardiology",
  "is_emergency": false,
  "reply": "Showing healthcare facilities with verified Cardiology records within 5 km.",
  "disclaimer": "Healthcare Discovery Disclaimer: ...",
  "recommended_filters": { "specialty": "Cardiology", "radius_km": 5.0 },
  "hospitals": [ /* HospitalOut array */ ]
}
```

**Emergency queries:** Returns `is_emergency: true` and prominently displays 112 emergency notice.

---

## Data Integrity Notes

- Specialties are **never** inferred from hospital names
- Bed availability is **never** fabricated from capacity
- `demo_mode=true` explicitly labels all synthetic records with `is_demo: true` and `DEMO DATA` message
- All OSM-sourced records carry `verification_status: "HISTORICAL"` until admin-verified
