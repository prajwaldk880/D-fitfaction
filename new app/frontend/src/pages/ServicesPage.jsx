import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function ServicesPage() {
  const { t } = useLanguage();
  const { location } = useHospitals();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeService = searchParams.get('service') || '';

  const [catalog, setCatalog] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hospitals/services-catalog').then((res) => setCatalog(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/hospitals/services-overview', {
        params: {
          service: activeService || undefined,
          lat: location.latitude,
          lon: location.longitude,
        },
      })
      .then((res) => setHospitals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeService, location.latitude, location.longitude]);

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>{t.nav.services}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Discover verified hospital medical services including ICU, NICU, MRI, CT scan, Dialysis, Blood bank, and Maternity care.
      </p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${!activeService ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSearchParams({})}
          >
            All Services
          </button>
          {catalog.map((svc) => (
            <button
              key={svc.id}
              type="button"
              className={`btn btn-sm ${activeService === svc.name ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSearchParams({ service: svc.name })}
            >
              <Activity size={13} /> {svc.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : (
        <div className="grid-2">
          {hospitals.map((h) => (
            <div key={h.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Link to={`/hospitals/${h.id}`} style={{ fontWeight: 700, fontSize: '1.02rem' }}>
                  {h.name}
                </Link>
                {h.distance_km != null && <span className="badge badge-reported">{h.distance_km} km</span>}
              </div>
              {h.services.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  {t.details.noServices}
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {h.services.map((s) => (
                    <span key={s.service_id} className="badge badge-verified">
                      {s.name}: {s.availability_status}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '0.65rem' }}>
                <VerificationBadge status={h.verification_status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
