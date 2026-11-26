import React from 'react';
import { PhoneCall, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function EmergencyBanner({ compact = false }) {
  const { t } = useLanguage();

  return (
    <div className="banner banner-emergency" role="region" aria-label="Emergency Assistance">
      <AlertTriangle size={compact ? 20 : 24} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div>
          <strong style={{ display: 'block', fontSize: compact ? '0.9rem' : '0.98rem' }}>
            {t.emergencyNotice}
          </strong>
          {!compact && (
            <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
              Calling 112 connects directly to India&apos;s National Emergency Response System via your device dialer.
            </span>
          )}
        </div>
        <a
          href="tel:112"
          className="btn btn-emergency"
          aria-label={t.emergencyCall}
        >
          <PhoneCall size={17} />
          {t.emergencyCall}
        </a>
      </div>
    </div>
  );
}
