import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HospitalCard from '../components/HospitalCard';
import { useAuth } from '../context/AuthContext';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';

export default function SavedPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { savedIds, location, demoMode } = useHospitals();
  const [savedHospitals, setSavedHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (user) {
      api
        .get('/users/saved', { params: { demo_mode: demoMode } })
        .then((res) => setSavedHospitals(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (savedIds.length > 0) {
      api
        .get('/hospitals/compare', {
          params: {
            ids: savedIds.slice(0, 3).join(','),
            lat: location.latitude,
            lon: location.longitude,
          },
        })
        .then((res) => setSavedHospitals(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setSavedHospitals([]);
      setLoading(false);
    }
  }, [user, savedIds, demoMode, location.latitude, location.longitude]);

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>{t.nav.saved} Hospitals</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        {user
          ? 'Synced to your Life Protecter account.'
          : 'Saved locally on this device. Sign in to sync across devices.'}
      </p>

      {loading ? (
        <div className="skeleton" style={{ height: 220 }} />
      ) : savedHospitals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>You have not saved any hospitals yet.</p>
          <Link to="/nearby" className="btn btn-primary">
            Explore Nearby Hospitals
          </Link>
        </div>
      ) : (
        <div className="grid-2">
          {savedHospitals.map((h) => (
            <HospitalCard key={h.id} hospital={h} />
          ))}
        </div>
      )}
    </div>
  );
}
