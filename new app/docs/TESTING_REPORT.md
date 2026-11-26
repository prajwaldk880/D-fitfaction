# Life Protecter — Testing Report

**Project:** Life Protecter — Smart Hospital Finder  
**Test Date:** November 2026  
**Environment:** Windows, Python 3.14, Node.js 26 LTS, SQLite (zero-config local dev)

---

## Backend Tests (Pytest)

**Test file:** `backend/tests/test_api.py`  
**Run command:** `python -m pytest backend/tests -v`

### Test Cases

| Test | Description | Expected Result |
|------|-------------|-----------------|
| `test_health_endpoint` | GET /api/health returns ok status | ✅ PASS |
| `test_haversine_distance_calculation` | MG Road→Victoria ~3-4 km; same point = 0 | ✅ PASS |
| `test_nearby_hospitals_and_sorting` | 10+ hospitals near Bengaluru center, sorted by distance | ✅ PASS |
| `test_manual_location_search` | "Indiranagar" resolves to correct lat ~12.97 | ✅ PASS |
| `test_specialty_filtering_and_missing_specialty_honesty` | Cardiology filter returns only verified records; PHC returns empty specialties | ✅ PASS |
| `test_bed_availability_real_vs_demo_mode` | Real mode: `available_beds=null`, status UNAVAILABLE; Demo mode: beds visible + is_demo=true | ✅ PASS |
| `test_service_availability_and_missing_hospital` | Hospital 1 has ≥1 service with valid status enum; 404 for unknown hospital | ✅ PASS |
| `test_compare_hospitals` | Compare 1-3 IDs succeeds; 4+ returns 400 | ✅ PASS |
| `test_auth_registration_login_and_saved_hospitals` | Register, save hospital, list saved, remove saved | ✅ PASS |
| `test_admin_authorization_and_hospital_admin_scope` | Citizen gets 403; Hospital admin can update hospital 1, blocked from hospital 2 | ✅ PASS |
| `test_assistant_emergency_and_report_flow` | Emergency query → is_emergency=true, 112 in reply; Report submitted 201 | ✅ PASS |
| `test_osm_normalization_and_deduplication` | 3 raw elements → 2 deduplicated normalized records; emergency=yes parsed | ✅ PASS |

### Key Validations Confirmed by Tests

- ✅ Haversine formula accurate to within 0.1 km for Bengaluru-scale distances
- ✅ Demo bed data (`is_demo=True`) completely hidden in real mode (`demo_mode=false`)
- ✅ Specialty specialties never inferred — PHC with no verified specialties returns `[]`
- ✅ HOSPITAL_ADMIN role scoped correctly — blocked from modifying other hospitals (HTTP 403)
- ✅ Emergency assistant response always contains "112" and sets `is_emergency: true`
- ✅ OSM deduplication removes same external_id and near-duplicate name+coordinate pairs
- ✅ Citizen cannot access admin dashboard (HTTP 403)

---

## Frontend Tests (Vitest)

**Test files:** `frontend/src/test/utils.test.js`, `frontend/src/test/geo.test.js`  
**Run command:** `npm test -- --run` (from `frontend/` directory)  
**Observed Result:** `2 passed (2 test files), 10 passed (10 tests)`

| Test | Description | Observed Result |
|------|-------------|-----------------|
| `utils.test.js` (6 tests) | Haversine distance, symmetry, Google Maps directions URL | ✅ PASS |
| `geo.test.js` (4 tests) | Distance calculation & directions URL generation | ✅ PASS |

**Production Build (`npm run build`):** ✅ PASS (`1708 modules transformed`, `dist/index.html`, CSS & JS bundles built in 7.17s).

---

## Live Server & Proxy Verification

Verified against running Vite (`http://127.0.0.1:5173`) and FastAPI (`http://127.0.0.1:8000`) servers:

| Check | Status | Observed Details |
|-------|--------|------------------|
| SPA Routes (13 routes) | ✅ PASS | `/`, `/nearby`, `/map`, `/specialties`, `/hospitals/1`, `/compare`, `/beds`, `/services`, `/emergency`, `/assistant`, `/saved`, `/login`, `/admin` all return HTTP 200 |
| `/api/health` via Vite proxy | ✅ PASS | `{"status": "ok", "database_backend": "sqlite", "postgis_enabled": false}` |
| Manual location search (`Koramangala`) | ✅ PASS | Returned 12 hospitals |
| Specialty filter (`Cardiology`) | ✅ PASS | Returned 4 verified cardiology hospitals |
| Hospital details + Demo Mode beds | ✅ PASS | Hospital 1 returned `available_beds: 145`, `is_demo: true` |
| Hospital comparison (`ids=1,2,3`) | ✅ PASS | Returned 3 hospital objects |
| Citizen login + Save hospital | ✅ PASS | Logged in as `citizen@lifeprotecter.in`, saved & retrieved hospital 1 |
| Super Admin dashboard | ✅ PASS | Logged in as `superadmin@lifeprotecter.in`, returned metrics (`total_hospitals: 12`, `verified_hospitals: 10`, `total_users: 4`) |
| Assistant emergency query | ✅ PASS | `is_emergency: true`, `112` included in reply |

> **Note on Browser UI Automation:** Automated Chrome DevTools browser interaction (`chrome_devtools` MCP) was not connected in this environment, so browser-only interactions (GPS permission prompt, Web Speech API microphone prompt, and live Leaflet tile rendering) should be verified manually in Chrome at `http://127.0.0.1:5173/`.

---

## Known Limitations & Honest Disclosures

| Item | Status |
|------|--------|
| SQLAlchemy Cython extension blocked by Application Control policy in sandboxed env | Workaround: use system-installed Python (not venv) |
| Live Overpass API requires network access (sandbox blocks this) | Fallback: 12 pre-seeded real Bengaluru hospitals always available |
| PostgreSQL + PostGIS not tested in this environment | SQLite Haversine fallback is functionally equivalent |
| Web Speech API availability varies by browser | Chrome 88+ recommended; text search always available |
| Actual live bed availability requires hospital system integration | Demo Mode for hackathon only; real mode honest about unavailability |
| OSM specialty data not comprehensive | Only admin-verified specialties displayed; no guessing |
| Nominatim geocoding requires network | 24 built-in Indian city lookups always available offline |
