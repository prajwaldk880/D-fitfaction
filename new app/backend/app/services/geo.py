import math
from typing import Dict, Optional, Tuple

EARTH_RADIUS_KM = 6371.0088

BENGALURU_DEFAULT = (12.9716, 77.5946)

# Built-in fallback Indian city/Bengaluru locality coordinates for offline geocoding
KNOWN_INDIA_LOCATIONS: Dict[str, Tuple[float, float, str]] = {
    "bengaluru": (12.9716, 77.5946, "Bengaluru, Karnataka"),
    "bangalore": (12.9716, 77.5946, "Bengaluru, Karnataka"),
    "indiranagar": (12.9784, 77.6408, "Indiranagar, Bengaluru"),
    "koramangala": (12.9352, 77.6245, "Koramangala, Bengaluru"),
    "whitefield": (12.9698, 77.7500, "Whitefield, Bengaluru"),
    "jayanagar": (12.9308, 77.5838, "Jayanagar, Bengaluru"),
    "malleshwaram": (13.0031, 77.5643, "Malleshwaram, Bengaluru"),
    "yelahanka": (13.1007, 77.5963, "Yelahanka, Bengaluru"),
    "electronic city": (12.8452, 77.6602, "Electronic City, Bengaluru"),
    "hebbal": (13.0358, 77.5970, "Hebbal, Bengaluru"),
    "rajajinagar": (12.9982, 77.5530, "Rajajinagar, Bengaluru"),
    "marathahalli": (12.9591, 77.6974, "Marathahalli, Bengaluru"),
    "hsr layout": (12.9121, 77.6446, "HSR Layout, Bengaluru"),
    "btm layout": (12.9166, 77.6101, "BTM Layout, Bengaluru"),
    "jp nagar": (12.9063, 77.5857, "JP Nagar, Bengaluru"),
    "bannerghatta": (12.8891, 77.5972, "Bannerghatta Road, Bengaluru"),
    "mysuru": (12.2958, 76.6394, "Mysuru, Karnataka"),
    "mysore": (12.2958, 76.6394, "Mysuru, Karnataka"),
    "mangaluru": (12.9141, 74.8560, "Mangaluru, Karnataka"),
    "hubballi": (15.3647, 75.1240, "Hubballi, Karnataka"),
    "mumbai": (19.0760, 72.8777, "Mumbai, Maharashtra"),
    "delhi": (28.6139, 77.2090, "New Delhi, Delhi"),
    "new delhi": (28.6139, 77.2090, "New Delhi, Delhi"),
    "chennai": (13.0827, 80.2707, "Chennai, Tamil Nadu"),
    "hyderabad": (17.3850, 78.4867, "Hyderabad, Telangana"),
    "pune": (18.5204, 73.8567, "Pune, Maharashtra"),
    "kolkata": (22.5726, 88.3639, "Kolkata, West Bengal"),
    "kochi": (9.9312, 76.2673, "Kochi, Kerala"),
}


def haversine_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculate great-circle distance between two coordinates in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 2)


def bounding_box(
    lat: float, lon: float, radius_km: float
) -> Tuple[float, float, float, float]:
    """Return (min_lat, max_lat, min_lon, max_lon) around a point."""
    lat_delta = radius_km / 111.045
    cos_lat = max(math.cos(math.radians(lat)), 0.01)
    lon_delta = radius_km / (111.320 * cos_lat)
    return (
        max(-90.0, lat - lat_delta),
        min(90.0, lat + lat_delta),
        max(-180.0, lon - lon_delta),
        min(180.0, lon + lon_delta),
    )


def resolve_known_indian_location(query: str) -> Optional[Tuple[float, float, str]]:
    if not query:
        return None
    normalized = query.strip().lower()
    if normalized in KNOWN_INDIA_LOCATIONS:
        return KNOWN_INDIA_LOCATIONS[normalized]
    for key, coords in KNOWN_INDIA_LOCATIONS.items():
        if key in normalized:
            return coords
    return None
