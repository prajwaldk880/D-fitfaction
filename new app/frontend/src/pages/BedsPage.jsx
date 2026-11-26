import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, ShieldAlert } from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function BedsPage() {
  const { t } = useLanguage();
  const { demoMode, setDemoMode } = useHospitals();
  const [bedsList, setBedsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/hospitals/beds', { params: { demo_mode: demoMode } })
      .then((res) => setBedsList(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [demoMode]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t.nav.beds}</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Live bed availability is displayed strictly when reported by an authorized live hospital source.
          </p>
        </div>

        <label className="card" style={{ padding: '0.6rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
          />
          <strong style={{ fontSize: '0.86rem' }}>{t.demo.toggleLabel}</strong>
        </label>
      </div>

      <div className="banner banner-info">
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          OpenStreetMap and Google Maps do not provide live hospital bed occupancy. In standard mode, hospitals without an authorized live feed report &ldquo;{t.details.noBeds}&rdquo; Toggle Demo Mode above only for hackathon demonstration.
        </span>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 280 }} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Total / ICU / Ward / ER</th>
                <th>Available / Occupied</th>
                <th>Source</th>
                <th>Verification Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {bedsList.map((b) => (
                <tr key={b.hospital_id}>
                  <td>
                    <Link to={`/hospitals/${b.hospital_id}`} style={{ fontWeight: 700 }}>
                      <BedDouble size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {b.hospital_name || `Hospital #${b.hospital_id}`}
                    </Link>
                    <div style={{ fontSize: '0.77rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {b.message}
                    </div>
                  </td>
                  <td>
                    {b.total_beds != null
                      ? `${b.total_beds} / ${b.icu_beds ?? '—'} / ${b.general_ward_beds ?? '—'} / ${b.emergency_beds ?? '—'}`
                      : 'Unavailable'}
                  </td>
                  <td>
                    {b.available_beds != null
                      ? `${b.available_beds} avail / ${b.occupied_beds ?? '—'} occ`
                      : 'Unavailable'}
                  </td>
                  <td>{b.availability_source}</td>
                  <td>
                    <VerificationBadge status={b.availability_verification_status} isDemo={b.is_demo} />
                  </td>
                  <td>{b.last_updated ? new Date(b.last_updated).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
