from app.services.geo import haversine_distance_km
from app.services.overpass import deduplicate_records, normalize_osm_element


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["app"] == "Life Protecter"
    assert body["database_backend"] in ("sqlite", "postgresql")


def test_haversine_distance_calculation():
    # Bengaluru MG Road to Victoria Hospital (~3 km)
    dist = haversine_distance_km(12.9756, 77.6066, 12.9635, 77.5739)
    assert 3.0 <= dist <= 4.5
    assert haversine_distance_km(12.9716, 77.5946, 12.9716, 77.5946) == 0.0


def test_nearby_hospitals_and_sorting(client):
    res = client.get("/api/hospitals/nearby?lat=12.9716&lon=77.5946&radius_km=25&sync_overpass=false")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10
    distances = [item["distance_km"] for item in data["items"]]
    assert distances == sorted(distances)


def test_manual_location_search(client):
    res = client.get("/api/hospitals/search?location=Indiranagar&radius_km=10&sync_overpass=false")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert abs(data["center_latitude"] - 12.9784) < 0.01


def test_specialty_filtering_and_missing_specialty_honesty(client):
    res = client.get("/api/hospitals/search?specialty=Cardiology&radius_km=50&sync_overpass=false")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    for hosp in items:
        assert any(s["name"] == "Cardiology" for s in hosp["specialties"])

    # Indiranagar Urban PHC has no verified specialties
    phc_res = client.get("/api/hospitals/search?q=Indiranagar%20Urban&sync_overpass=false")
    assert phc_res.status_code == 200
    phc = phc_res.json()["items"][0]
    assert phc["specialties"] == []


def test_bed_availability_real_vs_demo_mode(client):
    # Real mode must NOT expose synthetic demo beds
    real_res = client.get("/api/hospitals/1/beds?demo_mode=false")
    assert real_res.status_code == 200
    real_body = real_res.json()
    assert real_body["available_beds"] is None
    assert real_body["availability_verification_status"] == "UNAVAILABLE"
    assert "unavailable" in real_body["message"].lower()

    # Demo mode explicitly marks data as DEMO DATA
    demo_res = client.get("/api/hospitals/1/beds?demo_mode=true")
    assert demo_res.status_code == 200
    demo_body = demo_res.json()
    assert demo_body["is_demo"] is True
    assert demo_body["available_beds"] is not None
    assert "DEMO DATA" in demo_body["message"]


def test_service_availability_and_missing_hospital(client):
    res = client.get("/api/hospitals/1/services")
    assert res.status_code == 200
    services = res.json()
    assert len(services) >= 1
    assert all(
        s["availability_status"] in ("AVAILABLE", "UNAVAILABLE", "UNKNOWN", "TEMPORARILY_UNAVAILABLE")
        for s in services
    )
    missing = client.get("/api/hospitals/999999")
    assert missing.status_code == 404


def test_compare_hospitals(client):
    res = client.get("/api/hospitals/compare?ids=1,2,3")
    assert res.status_code == 200
    assert len(res.json()) == 3

    too_many = client.get("/api/hospitals/compare?ids=1,2,3,4")
    assert too_many.status_code == 400


def test_auth_registration_login_and_saved_hospitals(client):
    reg = client.post(
        "/api/users/register",
        json={
            "email": "newuser@example.in",
            "full_name": "Asha Rao",
            "password": "StrongPassword123",
            "preferred_language": "kn",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    save_res = client.post("/api/users/saved/1", headers=headers)
    assert save_res.status_code == 201

    list_saved = client.get("/api/users/saved", headers=headers)
    assert list_saved.status_code == 200
    assert len(list_saved.json()) == 1

    del_saved = client.delete("/api/users/saved/1", headers=headers)
    assert del_saved.status_code == 200


def test_admin_authorization_and_hospital_admin_scope(client):
    # Citizen cannot access admin dashboard
    citizen_login = client.post(
        "/api/users/login",
        json={"email": "citizen@lifeprotecter.in", "password": "Citizen@12345"},
    )
    citizen_token = citizen_login.json()["access_token"]
    forbidden = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {citizen_token}"},
    )
    assert forbidden.status_code == 403

    # Hospital admin can update assigned hospital (id=1), blocked from hospital id=2
    hosp_login = client.post(
        "/api/users/login",
        json={"email": "hospitaladmin@lifeprotecter.in", "password": "Hospital@12345"},
    )
    hosp_token = hosp_login.json()["access_token"]
    hosp_headers = {"Authorization": f"Bearer {hosp_token}"}

    ok_update = client.put(
        "/api/admin/hospitals/1",
        json={"opening_hours": "24/7 Emergency"},
        headers=hosp_headers,
    )
    assert ok_update.status_code == 200

    blocked_update = client.put(
        "/api/admin/hospitals/2",
        json={"opening_hours": "24/7"},
        headers=hosp_headers,
    )
    assert blocked_update.status_code == 403


def test_assistant_emergency_and_report_flow(client):
    assist = client.post(
        "/api/assistant/query",
        json={"query": "heart attack emergency near me", "language": "en"},
    )
    assert assist.status_code == 200
    assert assist.json()["is_emergency"] is True
    assert "112" in assist.json()["reply"]

    report = client.post(
        "/api/hospitals/1/report",
        json={"report_type": "wrong_phone", "description": "Updated front desk extension needed"},
    )
    assert report.status_code == 201


def test_osm_normalization_and_deduplication():
    raw_elements = [
        {
            "type": "node",
            "id": 1001,
            "lat": 12.97,
            "lon": 77.59,
            "tags": {"name": "City Clinic", "amenity": "clinic", "phone": "+91 80 12345678"},
        },
        {
            "type": "node",
            "id": 1001,
            "lat": 12.97,
            "lon": 77.59,
            "tags": {"name": "City Clinic", "amenity": "clinic"},
        },
        {
            "type": "way",
            "id": 2002,
            "center": {"lat": 12.98, "lon": 77.60},
            "tags": {"name": "Metro Hospital", "healthcare": "hospital", "emergency": "yes"},
        },
    ]
    normalized = [normalize_osm_element(e) for e in raw_elements]
    deduped = deduplicate_records([n for n in normalized if n is not None])
    assert len(deduped) == 2
    assert deduped[1]["emergency_capable"] is True
