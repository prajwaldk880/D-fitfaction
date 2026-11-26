# Life Protecter — Smart Hospital Finder

> **FIND THE RIGHT HOSPITAL. SAVE VALUABLE TIME. PROTECT LIVES.**

A full-stack, multilingual (English | Kannada | Hindi), installable PWA healthcare discovery and emergency assistance platform focused on **Bengaluru, Karnataka, India** — supporting public hospital search across all of India via OpenStreetMap Overpass API.

---

## 🏥 Key Features

- **Real Hospital Discovery** — Live OpenStreetMap Overpass API (amenity=hospital/clinic/doctors, healthcare=hospital/clinic/doctor) with caching, rate-limiting, and offline DB fallback
- **Interactive Leaflet Map** — Color-coded markers, map/list toggle, selected marker highlighting, Google Maps directions
- **GPS + Manual Location** — Browser Geolocation API + 24+ built-in Indian city/locality lookups + Nominatim geocoding
- **Medical Specialty Filtering** — 20 specialties, strictly verified — never guessed from name
- **Service Availability** — 22 medical services with provenance, verification status, and timestamp
- **Bed Information** — Honest availability model; Hackathon Demo Mode clearly labelled
- **Hospital Comparison** — Side-by-side comparison of up to 3 hospitals
- **112 Emergency Button** — Prominent `tel:112` dialer link with India emergency notice
- **Multilingual** — English, Kannada (ಕನ್ನಡ), Hindi (हिन्दी) with full translation dictionaries
- **Voice Search** — Web Speech API in `en-IN`, `kn-IN`, `hi-IN` with text fallback
- **Rule-Based Care Assistant** — Healthcare discovery intent parser (no medical diagnosis)
- **PWA** — installable with offline static caching via Service Worker
- **Admin Dashboard** — Hospital admin, data verifier, and super admin roles with RBAC
- **Authentication** — JWT + PBKDF2-SHA256, role-based protected routes

---

## 🚀 Quick Start

### Prerequisites

| Tool | Required Version |
|------|-----------------|
| Python | 3.11+ |
| Node.js | 18+ LTS |
| npm | 9+ |

---

### 1. Clone / Open Project

```
cd "c:\new app"
```

---

### 2. Backend Setup

```powershell
# Create virtual environment
python -m venv backend\.venv

# Activate
backend\.venv\Scripts\Activate.ps1
# (If Execution Policy error:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned)

# Install dependencies
pip install -r backend\requirements.txt

# Start the FastAPI server (from the backend directory)
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**OR** run with system Python directly (no venv required):

```powershell
cd "c:\new app\backend"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at **http://127.0.0.1:8000**
Swagger UI: **http://127.0.0.1:8000/docs**

---

### 3. Frontend Setup

```powershell
# From project root
cd "c:\new app\frontend"
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

The Vite dev server proxies `/api/*` → `http://127.0.0.1:8000/api/*` automatically.

---

### 4. Environment Variables

Copy `.env.example` to `backend/.env` and customize if needed:

```powershell
copy .env.example backend\.env
```

Default config uses **SQLite** (zero configuration) — no PostgreSQL install needed.

---

## 🔑 Hackathon Evaluation Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@lifeprotecter.in` | `Admin@12345` |
| Data Verifier | `verifier@lifeprotecter.in` | `Verify@12345` |
| Hospital Admin | `hospitaladmin@lifeprotecter.in` | `Hospital@12345` |
| Citizen User | `citizen@lifeprotecter.in` | `Citizen@12345` |

---

## 📋 Required Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./life_protecter.db` | Database connection (SQLite default) |
| `SECRET_KEY` | (dev default) | JWT signing key — **change in production** |
| `OVERPASS_API_URL` | `https://overpass-api.de/api/interpreter` | OSM Overpass endpoint |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins |
| `NOMINATIM_API_URL` | `https://nominatim.openstreetmap.org/search` | Geocoding fallback |

---

## 🗺️ External Integrations

| Service | Requires Credentials? | Fallback |
|---------|----------------------|----------|
| OpenStreetMap Overpass API | No (rate-limited public API) | Cached DB records |
| Nominatim Geocoding | No (public, User-Agent header required) | 24 built-in Indian city lookups |
| Google Maps Directions | No (URL scheme, opens in browser) | — |
| Browser Geolocation API | User permission only | Manual location input |
| Web Speech API | Browser support only | Text search input |

---

## 🧪 Running Tests

**Backend (Pytest):**
```powershell
cd "c:\new app\backend"
python -m pytest tests -v
```

**Frontend (Vitest):**
```powershell
cd "c:\new app\frontend"
npm test
```

---

## 📁 Project Structure

```
c:\new app\
├── backend\
│   ├── app\
│   │   ├── api\          hospitals.py, users.py, admin.py, assistant.py
│   │   ├── core\         config.py, security.py
│   │   ├── database\     session.py, seed.py
│   │   ├── models\       models.py (12 SQLAlchemy tables)
│   │   ├── schemas\      schemas.py (Pydantic v2)
│   │   ├── services\     overpass.py, geo.py, assistant.py, hospital_serializer.py
│   │   └── main.py
│   ├── tests\            conftest.py, test_api.py
│   ├── alembic\          Database migrations
│   └── requirements.txt
├── frontend\
│   ├── public\           manifest.json, sw.js, icons/
│   └── src\
│       ├── components\   HospitalCard, HospitalMapView, EmergencyBanner, VerificationBadge
│       ├── context\      AuthContext, HospitalContext, LanguageContext, ToastContext
│       ├── hooks\        useVoiceSearch.js
│       ├── i18n\         en.js, kn.js, hi.js
│       ├── layouts\      MainLayout.jsx
│       ├── pages\        16 pages + 404
│       ├── services\     api.js
│       ├── styles\       global.css
│       ├── test\         utils.test.js
│       └── utils\        geo.js
├── docs\
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   └── TESTING_REPORT.md
├── .env.example
├── .gitignore
├── DEVELOPMENT_PLAN.md
└── README.md
```

---

## 🌐 Application URLs (Development)

| Service | URL |
|---------|-----|
| Frontend (React) | http://localhost:5173 |
| Backend API | http://127.0.0.1:8000 |
| Swagger Docs | http://127.0.0.1:8000/docs |
| Health Check | http://127.0.0.1:8000/api/health |

---

## ⚠️ Data Integrity Commitments

1. **No fabricated facilities** — All hospitals sourced from OpenStreetMap or verified admin records with explicit `source` and `source_url`
2. **Specialties never guessed** — Facilities without admin-verified specialty entries display *"Specialty information unavailable"*
3. **Bed availability is honest** — Live availability only shown from authorized live feeds; Demo Mode is clearly badged with `DEMO DATA`
4. **Emergency safety** — Prominent 112 button; assistant never diagnoses conditions or prescribes medication

---

*Life Protecter — Healthcare Hackathon Project — Bengaluru, Karnataka, India 2026*
