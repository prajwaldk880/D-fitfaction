import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function ComparePage() {
  const { t } = useLanguage();
  const { compareIds, setCompareIds, location, demoMode, hospitals } = useHospitals();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (compareIds.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    api
      .get('/hospitals/compare', {
        params: {
          ids: compareIds.join(','),
          lat: location.latitude,
          lon: location.longitude,
          demo_mode: demoMode,
        },
      })
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [compareIds, location.latitude, location.longitude, demoMode]);

  const addQuickHospital = (id) => {
    if (!id) return;
    const numericId = Number(id);
    if (!compareIds.includes(numericId) && compareIds.length < 3) {
      setCompareIds([...compareIds, numericId]);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t.nav.compare} Hospitals</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Compare up to 3 healthcare facilities objectively. Unavailable attributes are marked as Unknown, never as zero.
          </p>
        </div>
        {compareIds.length > 0 && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setCompareIds([])}>
            <Trash2 size={14} /> Clear Comparison
          </button>
        )}
      </div>

      {hospitals.length > 0 && compareIds.length < 3 && (
        <div className="card" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label className="label" style={{ margin: 0 }}>Add hospital to compare:</label>
          <select
            className="select"
            style={{ width: 'auto', minWidth: 260 }}
            value=""
            onChange={(e) => addQuickHospital(e.target.value)}
          >
            <option value="">Select a hospital...</option>
            {hospitals
              .filter((h) => !compareIds.includes(h.id))
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>
            No hospitals selected for comparison yet. Select up to 3 hospitals from Nearby Hospitals or above.
          </p>
          <Link to="/nearby" className="btn btn-primary">
            Browse Nearby Hospitals
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Attribute</th>
                {items.map((h) => (
                  <th key={h.id}>
                    <Link to={`/hospitals/${h.id}`}>{h.name}</Link>
                    <div>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 6 }}
                        onClick={() => setCompareIds(compareIds.filter((id) => id !== h.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Distance</strong></td>
                {items.map((h) => (
                  <td key={h.id}>{h.distance_km != null ? `${h.distance_km} km` : 'Unknown'}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Facility Type</strong></td>
                {items.map((h) => (
                  <td key={h.id} style={{ textTransform: 'capitalize' }}>{h.facility_type}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Specialties</strong></td>
                {items.map((h) => (
                  <td key={h.id}>
                    {h.specialties.length > 0 ? h.specialties.map((s) => s.name).join(', ') : 'Unknown'}
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>Verified Services</strong></td>
                {items.map((h) => (
                  <td key={h.id}>
                    {h.services.length > 0
                      ? h.services.filter((s) => s.availability_status === 'AVAILABLE').map((s) => s.name).join(', ') || 'Unknown'
                      : 'Unknown'}
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>ICU Facilities</strong></td>
                {items.map((h) => {
                  const icu = h.services.find((s) => s.name === 'ICU');
                  return <td key={h.id}>{icu ? icu.availability_status : 'Unknown'}</td>;
                })}
              </tr>
              <tr>
                <td><strong>Bed Capacity</strong></td>
                {items.map((h) => (
                  <td key={h.id}>
                    {h.bed_summary?.total_beds != null ? (
                      <span>
                        {h.bed_summary.total_beds} total{' '}
                        <VerificationBadge status={h.bed_summary.capacity_verification_status} isDemo={h.bed_summary.is_demo} />
                      </span>
                    ) : (
                      'Unknown'
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>Available Beds</strong></td>
                {items.map((h) => (
                  <td key={h.id}>
                    {h.bed_summary?.available_beds != null ? (
                      <span>
                        {h.bed_summary.available_beds}{' '}
                        <VerificationBadge status={h.bed_summary.availability_verification_status} isDemo={h.bed_summary.is_demo} />
                      </span>
                    ) : (
                      'Unknown'
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>Emergency Services</strong></td>
                {items.map((h) => (
                  <td key={h.id}>
                    {h.emergency_capable === true ? 'Yes' : h.emergency_capable === false ? 'No' : 'Unknown'}
                  </td>
                ))}
              </tr>
              <tr>
                <td><strong>Wheelchair Access</strong></td>
                {items.map((h) => (
                  <td key={h.id}>{h.wheelchair_access || 'Unknown'}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Phone Number</strong></td>
                {items.map((h) => (
                  <td key={h.id}>{h.phone || 'Unknown'}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Data Freshness</strong></td>
                {items.map((h) => (
                  <td key={h.id}>{new Date(h.last_updated).toLocaleDateString()}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
