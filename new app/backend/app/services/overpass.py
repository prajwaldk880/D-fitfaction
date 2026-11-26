import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import DataSource, Hospital, VerificationStatus
from app.services.geo import haversine_distance_km, resolve_known_indian_location

logger = logging.getLogger(__name__)
settings = get_settings()

# In-memory cache: key -> (expires_at_epoch, normalized_records)
_OVERPASS_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_LAST_OVERPASS_CALL_AT: float = 0.0


def _cache_key(lat: float, lon: float, radius_km: float) -> str:
    return f"{round(lat, 2)}:{round(lon, 2)}:{int(round(radius_km))}"


def _build_overpass_query(lat: float, lon: float, radius_m: int) -> str:
    return f"""
[out:json][timeout:{settings.OVERPASS_TIMEOUT_SECONDS}];
(
  node["amenity"~"^(hospital|clinic|doctors)$"](around:{radius_m},{lat},{lon});
  way["amenity"~"^(hospital|clinic|doctors)$"](around:{radius_m},{lat},{lon});
  relation["amenity"~"^(hospital|clinic|doctors)$"](around:{radius_m},{lat},{lon});
  node["healthcare"~"^(hospital|clinic|doctor)$"](around:{radius_m},{lat},{lon});
  way["healthcare"~"^(hospital|clinic|doctor)$"](around:{radius_m},{lat},{lon});
);
out center 80;
""".strip()


def _extract_address(tags: Dict[str, Any]) -> Optional[str]:
    full = tags.get("addr:full")
    if full:
        return str(full).strip()
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:suburb") or tags.get("addr:neighbourhood"),
        tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:district"),
        tags.get("addr:state"),
        tags.get("addr:postcode"),
    ]
    cleaned = [str(p).strip() for p in parts if p]
    return ", ".join(cleaned) if cleaned else None


def normalize_osm_element(element: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    tags = element.get("tags") or {}
    name = (tags.get("name") or tags.get("name:en") or "").strip()
    if not name:
        return None

    lat = element.get("lat")
    lon = element.get("lon")
    if lat is None or lon is None:
        center = element.get("center") or {}
        lat = center.get("lat")
        lon = center.get("lon")
    if lat is None or lon is None:
        return None

    osm_type = element.get("type", "node")
    osm_id = element.get("id")
    external_id = f"osm:{osm_type}/{osm_id}"
    source_url = f"https://www.openstreetmap.org/{osm_type}/{osm_id}"

    facility_type = (
        tags.get("amenity") or tags.get("healthcare") or "healthcare"
    ).lower()
    if facility_type == "doctor":
        facility_type = "doctors"

    phone = tags.get("phone") or tags.get("contact:phone") or tags.get("contact:mobile")
    website = tags.get("website") or tags.get("contact:website")
    opening_hours = tags.get("opening_hours")
    wheelchair_access = tags.get("wheelchair")

    emergency_tag = (tags.get("emergency") or "").strip().lower()
    emergency_capable: Optional[bool] = None
    if emergency_tag == "yes":
        emergency_capable = True
    elif emergency_tag == "no":
        emergency_capable = False

    return {
        "external_id": external_id,
        "name": name,
        "facility_type": facility_type,
        "latitude": float(lat),
        "longitude": float(lon),
        "address": _extract_address(tags),
        "city": tags.get("addr:city") or tags.get("addr:district") or "Bengaluru",
        "state": tags.get("addr:state") or "Karnataka",
        "postal_code": tags.get("addr:postcode"),
        "phone": str(phone).strip() if phone else None,
        "website": str(website).strip() if website else None,
        "opening_hours": str(opening_hours).strip() if opening_hours else None,
        "wheelchair_access": str(wheelchair_access).strip() if wheelchair_access else None,
        "emergency_capable": emergency_capable,
        "source": "OpenStreetMap Overpass API",
        "source_url": source_url,
    }


def deduplicate_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen_ids = set()
    seen_name_coords = set()
    unique: List[Dict[str, Any]] = []
    for rec in records:
        ext_id = rec.get("external_id")
        if ext_id and ext_id in seen_ids:
            continue
        name_key = (
            rec["name"].strip().lower(),
            round(rec["latitude"], 3),
            round(rec["longitude"], 3),
        )
        if name_key in seen_name_coords:
            continue
        if ext_id:
            seen_ids.add(ext_id)
        seen_name_coords.add(name_key)
        unique.append(rec)
    return unique


def sync_overpass_facilities(
    db: Session,
    lat: float,
    lon: float,
    radius_km: float,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """Fetch public healthcare facilities from Overpass with caching, rate limiting & DB persistence."""
    global _LAST_OVERPASS_CALL_AT

    capped_radius_km = min(max(radius_km, 1.0), 50.0)
    key = _cache_key(lat, lon, capped_radius_km)
    now_epoch = time.time()

    if not force_refresh and key in _OVERPASS_CACHE:
        expires_at, cached_items = _OVERPASS_CACHE[key]
        if now_epoch < expires_at:
            return {
                "origin": "overpass_cache",
                "count": len(cached_items),
                "warning": None,
                "error": None,
            }

    if (now_epoch - _LAST_OVERPASS_CALL_AT) < settings.OVERPASS_RATE_LIMIT_SECONDS:
        return {
            "origin": "database_cached",
            "count": 0,
            "warning": "Using cached public facility records to respect Overpass API rate limits.",
            "error": None,
        }

    query = _build_overpass_query(lat, lon, int(capped_radius_km * 1000))
    _LAST_OVERPASS_CALL_AT = now_epoch

    try:
        with httpx.Client(
            timeout=settings.OVERPASS_TIMEOUT_SECONDS,
            headers={"User-Agent": settings.OVERPASS_USER_AGENT},
        ) as client:
            resp = client.post(settings.OVERPASS_API_URL, data={"data": query})
            resp.raise_for_status()
            payload = resp.json()
    except Exception as exc:
        logger.warning("Overpass API fetch failed: %s", exc)
        return {
            "origin": "database_fallback",
            "count": 0,
            "warning": "Live OpenStreetMap Overpass service is currently unreachable; displaying cached public records.",
            "error": str(exc),
        }

    elements = payload.get("elements") or []
    normalized = [
        item for el in elements if (item := normalize_osm_element(el)) is not None
    ]
    deduped = deduplicate_records(normalized)

    osm_source = (
        db.query(DataSource).filter(DataSource.source_type == "OSM_OVERPASS").first()
    )
    if osm_source:
        osm_source.last_synced_at = datetime.now(timezone.utc)

    for rec in deduped:
        existing = (
            db.query(Hospital)
            .filter(Hospital.external_id == rec["external_id"])
            .first()
        )
        if existing:
            # Never overwrite verified admin edits
            if not existing.is_verified:
                existing.name = rec["name"]
                existing.facility_type = rec["facility_type"]
                existing.address = rec["address"] or existing.address
                existing.phone = rec["phone"] or existing.phone
                existing.website = rec["website"] or existing.website
                existing.opening_hours = rec["opening_hours"] or existing.opening_hours
                existing.wheelchair_access = (
                    rec["wheelchair_access"] or existing.wheelchair_access
                )
                if existing.emergency_capable is None:
                    existing.emergency_capable = rec["emergency_capable"]
                existing.last_updated = datetime.now(timezone.utc)
        else:
            # Check proximity + exact name duplicate
            nearby_same_name = (
                db.query(Hospital).filter(Hospital.name == rec["name"]).all()
            )
            duplicate_close = any(
                haversine_distance_km(
                    h.latitude, h.longitude, rec["latitude"], rec["longitude"]
                )
                < 0.25
                for h in nearby_same_name
            )
            if duplicate_close:
                continue

            hospital = Hospital(
                external_id=rec["external_id"],
                name=rec["name"],
                facility_type=rec["facility_type"],
                latitude=rec["latitude"],
                longitude=rec["longitude"],
                address=rec["address"],
                city=rec["city"],
                state=rec["state"],
                postal_code=rec["postal_code"],
                phone=rec["phone"],
                website=rec["website"],
                opening_hours=rec["opening_hours"],
                wheelchair_access=rec["wheelchair_access"],
                emergency_capable=rec["emergency_capable"],
                source_id=osm_source.id if osm_source else None,
                source_name="OpenStreetMap",
                source_url=rec["source_url"],
                verification_status=VerificationStatus.HISTORICAL,
                is_verified=False,
                is_demo=False,
            )
            db.add(hospital)

    db.commit()

    expires_at = time.time() + (settings.OVERPASS_CACHE_TTL_MINUTES * 60)
    _OVERPASS_CACHE[key] = (expires_at, deduped)

    return {
        "origin": "overpass_live",
        "count": len(deduped),
        "warning": None,
        "error": None,
    }


def geocode_india_location(query: str) -> Optional[Tuple[float, float, str]]:
    """Resolve a manual location string (India) via built-in lookup or Nominatim."""
    known = resolve_known_indian_location(query)
    if known:
        return known

    try:
        with httpx.Client(
            timeout=8,
            headers={"User-Agent": settings.OVERPASS_USER_AGENT},
        ) as client:
            resp = client.get(
                settings.NOMINATIM_API_URL,
                params={"q": f"{query}, India", "format": "json", "limit": 1},
            )
            resp.raise_for_status()
            results = resp.json()
            if results:
                first = results[0]
                return (
                    float(first["lat"]),
                    float(first["lon"]),
                    str(first.get("display_name", query)),
                )
    except Exception as exc:
        logger.warning("Nominatim geocoding failed for '%s': %s", query, exc)

    return None
