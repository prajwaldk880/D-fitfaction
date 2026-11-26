import React, { useEffect } from 'react';
import { PhoneCall, ShieldAlert } from 'lucide-react';
import EmergencyBanner from '../components/EmergencyBanner';
import HospitalCard from '../components/HospitalCard';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';

export default function EmergencyPage() {
  const { t } = useLanguage();
  const { hospitals, fetchNearby, loadingHospitals } = useHospitals();

  useEffect(() => {
    fetchNearby({ emergency_only: true, radius_km: 25, sync_overpass: false }).catch(() => {});
  }, []);

  return (
    <div>
      <EmergencyBanner />

      <div className="card" style={{ borderColor: '#FECACA', background: '#FFF5F5', marginBottom: '1rem', textAlign: 'center', padding: '1.75rem' }}>
        <ShieldAlert size={42} color="#DC2626" style={{ marginBottom: '0.5rem' }} />
        <h1 style={{ color: '#991B1B', marginBottom: '0.5rem' }}>{t.nav.emergency} Assistance</h1>
        <p style={{ maxWidth: 620, margin: '0 auto 1rem', color: '#7F1D1D' }}>
          {t.emergencyNotice} Clicking the button below opens your telephone dialer for 112 so you can initiate the call immediately. Life Protecter does not promise ambulance dispatch or emergency bed availability unless verified live.
        </p>
        <a href="tel:112" className="btn btn-emergency" style={{ fontSize: '1.05rem', padding: '0.85rem 1.75rem' }}>
          <PhoneCall size={20} /> {t.emergencyCall}
        </a>
      </div>

      <h2 style={{ marginBottom: '0.85rem' }}>Nearby Emergency-Capable Facilities</h2>
      {loadingHospitals ? (
        <div className="skeleton" style={{ height: 220 }} />
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
