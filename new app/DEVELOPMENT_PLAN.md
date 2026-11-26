# LIFE PROTECTER — Development Plan

**Tagline:** *FIND THE RIGHT HOSPITAL. SAVE VALUABLE TIME. PROTECT LIVES.*

## 1. Vision & Scope
Life Protecter is a responsive, multilingual (English, Kannada, Hindi), installable PWA healthcare discovery and emergency assistance platform focused on **Bengaluru, Karnataka, India**, with support for searching locations across India. It combines live/cached OpenStreetMap (Overpass API) public facility discovery with strict data provenance, verification statuses, role-based hospital administration, interactive Leaflet mapping, Google Maps navigation, Web Speech API voice search, and immediate `112` emergency access.

## 2. System Architecture

### Frontend (`frontend/`)
- **Framework:** React 18 + Vite (JavaScript, HTML5, CSS3)
- **Routing:** React Router v6 covering all 16 functional pages + 404 fallback
- **State Management:** React Context API (`AuthContext`, `LanguageContext`, `HospitalContext`, `ToastContext`)
- **Mapping & GIS:** Leaflet + React Leaflet with OpenStreetMap tiles, color-coded markers (`hospital`, `clinic`, `doctors`/`healthcare`), selected marker highlighting, map/list toggle, and Google Maps directions URLs
- **Multilingual & Voice:** Complete English (`en`), Kannada (`kn`), and Hindi (`hi`) translation dictionaries + Web Speech API (`en-IN`, `kn-IN`, `hi-IN`) with editable transcript fallback
- **PWA:** `manifest.json`, custom SVG app icons, Service Worker (`sw.js`) for static asset caching and non-sensitive public data offline fallback (explicitly badged as cached/potentially outdated)
- **Testing:** Vitest + React Testing Library + jsdom

### Backend (`backend/`)
- **Framework:** Python FastAPI + Uvicorn + Pydantic v2
- **ORM & Migrations:** SQLAlchemy 2.x + Alembic
- **Database:** PostgreSQL (+ PostGIS spatial query support when configured via `DATABASE_URL`), with automatic SQLite (`sqlite:///./life_protecter.db`) fallback for zero-config local development
- **Auth & Security:** PBKDF2-SHA256 password hashing (via Python `hashlib` + constant-time `hmac.compare_digest`), JWT bearer tokens (`PyJWT`), RBAC (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DATA_VERIFIER`, `USER`), CORS, rate limiting, and input validation
- **External Integration:** OpenStreetMap Overpass API client (`httpx`) with timeout, rate-limit protection, TTL caching, deduplication, record normalization, and graceful fallback to cached DB records
- **Testing:** Pytest + FastAPI `TestClient`

## 3. Data Integrity & Verification Principles
1. **No Fabricated Facilities:** Public facilities originate from OpenStreetMap Overpass API or administrator-verified entries with explicit `source` and `source_url`.
2. **Specialties Never Assumed:** Specialties are never guessed from facility names. Facilities without verified specialty mappings display *"Specialty information unavailable."*
3. **Services Tracked with Provenance:** Statuses are `AVAILABLE`, `UNAVAILABLE`, `UNKNOWN`, `TEMPORARILY_UNAVAILABLE` alongside `source`, `verification_status`, and `last_updated`.
4. **Bed Availability Honesty:** Live bed availability is never fabricated from historical capacity. Missing live data displays *"Bed availability information is currently unavailable."* An explicit, clearly badged **DEMO DATA** mode is available solely for hackathon demonstrations.
5. **Emergency Safety:** Prominent `EMERGENCY – CALL 112` (`tel:112`) action with India emergency notice and rule-based discovery assistant that never diagnoses or prescribes.

## 4. Implementation Stages
1. **Stage 1 — Environment & Scaffolding:** Node.js LTS setup, directory structure, `.env.example`, `.gitignore`, `DEVELOPMENT_PLAN.md`.
2. **Stage 2 — Backend & Database:** SQLAlchemy models (12 core tables), Alembic setup, Haversine & spatial utilities, Overpass integration + cache, Auth/RBAC, Hospital/Specialty/Service/Bed/Report/Admin APIs, seed data & demo-mode support.
3. **Stage 3 — Frontend UI/UX & PWA:** Design tokens (`#0877C9`, `#159ED5`, `#F5FAFF`, `#DC2626`, `#16A34A`, `#172B4D`), responsive desktop/mobile navigation, all 16 pages + 404, i18n (`en`/`kn`/`hi`), voice search, Leaflet map, hospital comparison (up to 3), admin dashboard, PWA manifest & service worker.
4. **Stage 4 — Testing & Verification:** Pytest backend suite, Vitest frontend suite, live server startup, API + browser verification, and documentation (`README.md`, `docs/API_DOCUMENTATION.md`, `docs/DATABASE_SCHEMA.md`, `docs/TESTING_REPORT.md`).
