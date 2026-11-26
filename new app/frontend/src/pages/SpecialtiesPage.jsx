import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, Stethoscope } from 'lucide-react';
import HospitalCard from '../components/HospitalCard';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';

export default function SpecialtiesPage() {
  const { t } = useLanguage();
  const { specialties, hospitals, fetchNearby, loadingHospitals } = useHospitals();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSpecialty = searchParams.get('specialty') || '';
  const [radiusKm, setRadiusKm] = useState(50);

  useEffect(() => {
    fetchNearby({
      specialty: activeSpecialty || undefined,
      radius_km: radiusKm,
      sync_overpass: false,
    }).catch(() => {});
  }, [activeSpecialty, radiusKm]);

  const handleSelect = (name) => {
    if (name) {
      setSearchParams({ specialty: name });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>{t.nav.specialties}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Filter hospitals strictly by verified or administrator-reported medical specialty records.
      </p>

      <div className="banner banner-info">
        <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Life Protecter never guesses specialties from hospital names. Facilities without verified specialty entries display &ldquo;{t.details.noSpecialties}&rdquo;
        </span>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${!activeSpecialty ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleSelect('')}
          >
            All Specialties
          </button>
          {specialties.map((sp) => (
            <button
              key={sp.id}
              type="button"
              className={`btn btn-sm ${activeSpecialty === sp.name ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleSelect(sp.name)}
            >
              <Stethoscope size={13} /> {sp.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <label className="label" style={{ margin: 0 }}>Radius:</label>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
          >
            {[5, 10, 25, 50].map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </select>
        </div>
      </div>

      {loadingHospitals ? (
        <div className="grid-2">
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 180 }} />
        </div>
      ) : hospitals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            No facilities have verified <strong>{activeSpecialty}</strong> records within {radiusKm} km.
          </p>
        </div>
      ) : (
        <div className="grid-2">
          {hospitals.map((h) => (
            <HospitalCard key={h.id} hospital={h} />
          ))}
        </div>
      )}
    </div>
  );
}
