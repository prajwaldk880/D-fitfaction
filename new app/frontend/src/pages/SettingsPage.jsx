import React from 'react';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { LANGUAGE_LABELS } from '../i18n';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { demoMode, setDemoMode } = useHospitals();
  const { addToast } = useToast();

  const clearOfflineCache = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    addToast('Offline static cache cleared.', 'info');
  };

  return (
    <div style={{ maxWidth: 680, display: 'grid', gap: '1rem' }}>
      <h1>{t.nav.settings}</h1>

      <div className="card">
        <h3>Language Preference</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
          Choose your preferred interface and voice search language.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
            <button
              key={code}
              type="button"
              className={`btn ${language === code ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setLanguage(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>{t.demo.toggleLabel}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
          Enable synthetic demonstration bed capacity and availability records for hackathon walkthroughs. Real public mode keeps unverified live bed counts hidden as Unavailable.
        </p>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
          />
          Enable Demo Data Mode
        </label>
      </div>

      <div className="card">
        <h3>Offline &amp; PWA Cache</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
          Cached hospital discovery pages remain available offline for emergency reference, marked as potentially outdated. Live bed availability is never cached as live.
        </p>
        <button type="button" className="btn btn-outline" onClick={clearOfflineCache}>
          Clear Offline Cache
        </button>
      </div>
    </div>
  );
}
