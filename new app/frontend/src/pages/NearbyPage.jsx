import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crosshair, List, Map as MapIcon, Mic, RefreshCw, Search } from 'lucide-react';
import HospitalCard from '../components/HospitalCard';
import HospitalMapView from '../components/HospitalMapView';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { RADIUS_OPTIONS } from '../utils/geo';

export default function NearbyPage() {
  const { t, language } = useLanguage();
  const {
    hospitals,
    specialties,
    loadingHospitals,
    fetchNearby,
    location,
    gpsStatus,
    requestUserGps,
    dataOrigin,
    cacheWarning,
  } = useHospitals();

  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [manualLocation, setManualLocation] = useState(searchParams.get('location') || '');
  const [radiusKm, setRadiusKm] = useState(15);
  const [facilityType, setFacilityType] = useState('all');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // split | list | map
  const [selectedId, setSelectedId] = useState(null);

  const voice = useVoiceSearch(language, (transcript) => setQ(transcript));

  const runSearch = (syncOverpass = false) => {
    fetchNearby({
      q: q.trim() || undefined,
      location: manualLocation.trim() || undefined,
      radius_km: radiusKm,
      facility_type: facilityType !== 'all' ? facilityType : undefined,
      specialty: specialty || undefined,
      emergency_only: emergencyOnly,
      sync_overpass: syncOverpass,
    }).catch(() => {});
  };

  useEffect(() => {
    runSearch(false);
  }, [radiusKm, facilityType, specialty, emergencyOnly]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t.nav.nearby}</h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
            Showing results near <strong>{location.label}</strong> • Source mode: <strong>{dataOrigin}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={requestUserGps}
          >
            <Crosshair size={15} /> {t.home.useMyLocation}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => runSearch(true)}
            title="Sync latest public records from OpenStreetMap Overpass API"
          >
            <RefreshCw size={15} /> Sync Live OSM
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('list')}
          >
            <List size={15} /> {t.search.listView}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('map')}
          >
            <MapIcon size={15} /> {t.search.mapView}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'split' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
        </div>
      </div>

      {gpsStatus === 'denied' && (
        <div className="banner banner-warning">
          <span>{t.search.gpsDenied}</span>
        </div>
      )}

      {cacheWarning && (
        <div className="banner banner-info">
          <span>{cacheWarning}</span>
        </div>
      )}

      <form
        className="card"
        style={{ marginBottom: '1rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(Boolean(manualLocation.trim()));
        }}
      >
        <div className="grid-4" style={{ marginBottom: '0.75rem' }}>
          <div>
            <label className="label">Hospital / Keyword</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                className="input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.home.searchPlaceholder}
              />
              {voice.supported && (
                <button type="button" className="btn btn-outline btn-sm" onClick={voice.startListening} aria-label={t.home.voiceBtn}>
                  <Mic size={15} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label">Manual Location (India)</label>
            <input
              type="text"
              className="input"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="e.g. Indiranagar, Mysuru, Delhi"
            />
          </div>

          <div>
            <label className="label">{t.search.radius}</label>
            <select
              className="select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">{t.search.facilityType}</label>
            <select
              className="select"
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
            >
              <option value="all">{t.search.allTypes}</option>
              <option value="hospital">{t.search.hospital}</option>
              <option value="clinic">{t.search.clinic}</option>
              <option value="doctors">{t.search.doctors}</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
            <select
              className="select"
              style={{ width: 'auto', minWidth: 210 }}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              aria-label={t.search.specialty}
            >
              <option value="">{t.search.allSpecialties}</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
              />
              {t.search.emergencyOnly}
            </label>
          </div>

          <button type="submit" className="btn btn-primary">
            <Search size={16} /> Apply Search
          </button>
        </div>
      </form>

      {loadingHospitals ? (
        <div className="grid-2">
          <div className="skeleton" style={{ height: 220 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      ) : hospitals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{t.search.noResults}</p>
        </div>
      ) : (
        <div className={viewMode === 'split' ? 'grid-2' : ''}>
          {(viewMode === 'list' || viewMode === 'split') && (
            <div style={{ display: 'grid', gap: '0.9rem', alignContent: 'start' }}>
              {hospitals.map((h) => (
                <HospitalCard
                  key={h.id}
                  hospital={h}
                  isSelected={h.id === selectedId}
                  onSelect={(item) => setSelectedId(item.id)}
                />
              ))}
            </div>
          )}

          {(viewMode === 'map' || viewMode === 'split') && (
            <div style={{ position: viewMode === 'split' ? 'sticky' : 'static', top: 82, height: 'fit-content' }}>
              <HospitalMapView
                center={location}
                hospitals={hospitals}
                selectedHospitalId={selectedId}
                onSelectHospital={(item) => setSelectedId(item.id)}
                height={viewMode === 'map' ? '620px' : '540px'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
