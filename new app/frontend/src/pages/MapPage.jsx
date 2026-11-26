import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Navigation } from 'lucide-react';
import HospitalMapView from '../components/HospitalMapView';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { getGoogleMapsDirectionsUrl } from '../services/api';

export default function MapPage() {
  const { t } = useLanguage();
  const { hospitals, location, fetchNearby, requestUserGps } = useHospitals();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (hospitals.length === 0) {
      fetchNearby({ radius_km: 25, sync_overpass: false }).catch(() => {});
    }
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t.nav.map}</h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            Interactive OpenStreetMap view of {hospitals.length} discovered facilities around {location.label}.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={requestUserGps}>
          <Crosshair size={15} /> {t.home.useMyLocation}
        </button>
      </div>

      <HospitalMapView
        center={location}
        hospitals={hospitals}
        selectedHospitalId={selected?.id}
        onSelectHospital={setSelected}
        height="560px"
      />

      {selected && (
        <div className="card" style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>{selected.name}</h3>
            <div style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
              {selected.facility_type} {selected.distance_km != null ? `• ${selected.distance_km} km away` : ''}
              {selected.address ? ` • ${selected.address}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to={`/hospitals/${selected.id}`} className="btn btn-primary btn-sm">
              Open Details
            </Link>
            <a
              href={getGoogleMapsDirectionsUrl(selected.latitude, selected.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <Navigation size={14} /> {t.details.getDirections}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
