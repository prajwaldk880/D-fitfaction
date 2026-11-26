import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGoogleMapsDirectionsUrl } from '../services/api';

function createPinIcon(color, size = 28, ring = false) {
  return L.divIcon({
    className: 'custom-lp-pin',
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50% 50% 50% 0;
      background:${color};
      transform:rotate(-45deg);
      border:${ring ? '3px solid #172B4D' : '2px solid #FFFFFF'};
      box-shadow:0 3px 10px rgba(0,0,0,0.28);
      display:flex;
      align-items:center;
      justify-content:center;
    "><div style="width:${Math.round(size * 0.36)}px;height:${Math.round(size * 0.36)}px;border-radius:50%;background:#FFFFFF;transform:rotate(45deg);"></div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

const USER_ICON = L.divIcon({
  className: 'user-location-pin',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#0877C9;border:3px solid #FFFFFF;box-shadow:0 0 0 6px rgba(8,119,201,0.28);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getFacilityIcon(hospital, isSelected) {
  if (isSelected) return createPinIcon('#16A34A', 34, true);
  if (hospital.facility_type === 'clinic') return createPinIcon('#159ED5', 26, false);
  if (hospital.facility_type === 'doctors' || hospital.facility_type === 'healthcare') {
    return createPinIcon('#6366F1', 26, false);
  }
  if (hospital.emergency_capable) return createPinIcon('#DC2626', 28, false);
  return createPinIcon('#0877C9', 28, false);
}

function MapRecenter({ center, selectedHospital }) {
  const map = useMap();
  useEffect(() => {
    if (selectedHospital) {
      map.flyTo([selectedHospital.latitude, selectedHospital.longitude], 14, { duration: 0.6 });
    } else if (center) {
      map.setView([center.latitude, center.longitude], 12);
    }
  }, [center, selectedHospital, map]);
  return null;
}

export default function HospitalMapView({
  center,
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  height = '480px',
}) {
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId) || null;

  return (
    <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-border)', background: '#EAF4FC' }}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={12}
        style={{ height, width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={center} selectedHospital={selectedHospital} />

        <Marker position={[center.latitude, center.longitude]} icon={USER_ICON}>
          <Popup>
            <strong>Your Search Center</strong>
            <div>{center.label || `${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`}</div>
          </Popup>
        </Marker>

        {hospitals.map((h) => (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={getFacilityIcon(h, h.id === selectedHospitalId)}
            eventHandlers={{
              click: () => onSelectHospital && onSelectHospital(h),
            }}
          >
            <Popup>
              <div style={{ minWidth: 190 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{h.name}</strong>
                <div style={{ fontSize: '0.8rem', color: '#5E6C84', textTransform: 'capitalize', marginBottom: 4 }}>
                  {h.facility_type} {h.distance_km != null ? `• ${h.distance_km} km` : ''}
                </div>
                {h.address && <div style={{ fontSize: '0.78rem', marginBottom: 6 }}>{h.address}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Link to={`/hospitals/${h.id}`} style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    Details
                  </Link>
                  <span>•</span>
                  <a
                    href={getGoogleMapsDirectionsUrl(h.latitude, h.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    Directions
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div style={{ padding: '0.6rem 1rem', background: '#FFFFFF', borderTop: '1px solid var(--color-border)', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
        <span><strong style={{ color: '#0877C9' }}>●</strong> Hospital</span>
        <span><strong style={{ color: '#DC2626' }}>●</strong> Emergency Capable</span>
        <span><strong style={{ color: '#159ED5' }}>●</strong> Clinic</span>
        <span><strong style={{ color: '#6366F1' }}>●</strong> Doctor / Healthcare</span>
        <span><strong style={{ color: '#16A34A' }}>●</strong> Selected</span>
      </div>
    </div>
  );
}
