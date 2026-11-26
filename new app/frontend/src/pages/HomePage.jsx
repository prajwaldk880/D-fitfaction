import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Baby,
  Bone,
  Brain,
  Crosshair,
  HeartPulse,
  Mic,
  MicOff,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import EmergencyBanner from '../components/EmergencyBanner';
import HospitalCard from '../components/HospitalCard';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';

const POPULAR_SPECIALTIES = [
  { name: 'Cardiology', icon: HeartPulse, color: '#DC2626' },
  { name: 'Neurology', icon: Brain, color: '#0877C9' },
  { name: 'Orthopedics', icon: Bone, color: '#0F766E' },
  { name: 'Pediatrics', icon: Baby, color: '#159ED5' },
  { name: 'Gynecology', icon: UserCheck, color: '#9333EA' },
  { name: 'Oncology', icon: Activity, color: '#C2410C' },
  { name: 'Emergency Medicine', icon: ShieldAlert, color: '#DC2626' },
  { name: 'General Medicine', icon: Stethoscope, color: '#16A34A' },
];

export default function HomePage() {
  const { t, language } = useLanguage();
  const { hospitals, fetchNearby, requestUserGps, loadingHospitals, location } = useHospitals();
  const navigate = useNavigate();

  const [queryText, setQueryText] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const voice = useVoiceSearch(language, (transcript) => {
    setQueryText(transcript);
  });

  useEffect(() => {
    if (hospitals.length === 0) {
      fetchNearby({ sync_overpass: false }).catch(() => {});
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (queryText.trim()) params.set('q', queryText.trim());
    if (locationInput.trim()) params.set('location', locationInput.trim());
    navigate(`/nearby?${params.toString()}`);
  };

  return (
    <div>
      <EmergencyBanner />

      <section className="hero-card">
        <div style={{ maxWidth: 820 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', marginBottom: '0.6rem' }}>
            Bengaluru &amp; India Public Healthcare Discovery
          </span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.15rem)', marginBottom: '0.5rem' }}>
            {t.home.welcomeTitle}
          </h1>
          <p style={{ opacity: 0.94, marginBottom: '1.25rem', fontSize: '0.98rem' }}>
            {t.home.welcomeSubtitle}
          </p>

          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="grid-2" style={{ gap: '0.65rem' }}>
              <div style={{ position: 'relative', display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="input"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder={t.home.searchPlaceholder}
                  aria-label={t.home.searchPlaceholder}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={voice.startListening}
                  title={voice.supported ? t.home.voiceBtn : t.home.voiceUnsupported}
                  aria-label={t.home.voiceBtn}
                >
                  {voice.listening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="input"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder={t.home.locationPlaceholder}
                  aria-label={t.home.locationPlaceholder}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={async () => {
                    const coords = await requestUserGps();
                    if (coords) navigate('/nearby');
                  }}
                  title={t.home.useMyLocation}
                >
                  <Crosshair size={17} />
                </button>
              </div>
            </div>

            {voice.error && (
              <div style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.18)', padding: '0.45rem 0.7rem', borderRadius: 8 }}>
                {voice.supported ? voice.error : t.home.voiceUnsupported}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
              <button type="submit" className="btn" style={{ background: '#FFFFFF', color: '#0877C9', fontWeight: 700 }}>
                <Search size={17} /> {t.home.searchBtn}
              </button>
              <Link to="/map" className="btn" style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}>
                Open Interactive Map
              </Link>
              <Link to="/assistant" className="btn" style={{ background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }}>
                Ask Care Assistant
              </Link>
            </div>
          </form>
        </div>
      </section>

      {/* Popular Medical Specialties */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{t.home.popularSpecialties}</h2>
          <Link to="/specialties" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            {t.home.viewAll} →
          </Link>
        </div>
        <div className="grid-4">
          {POPULAR_SPECIALTIES.map((sp) => {
            const Icon = sp.icon;
            return (
              <Link
                key={sp.name}
                to={`/specialties?specialty=${encodeURIComponent(sp.name)}`}
                className="card card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  textDecoration: 'none',
                  padding: '0.95rem 1rem',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: `${sp.color}16`,
                    color: sp.color,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '0.93rem' }}>
                    {sp.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                    Verified records
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Healthcare Services */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.85rem', fontSize: '1.2rem' }}>{t.home.quickServices}</h2>
        <div className="grid-4">
          <Link to="/emergency" className="card card-hover" style={{ textDecoration: 'none' }}>
            <strong style={{ color: 'var(--color-emergency)', display: 'block', marginBottom: 4 }}>
              Emergency &amp; 112
            </strong>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              Immediate 112 dialer &amp; nearby emergency facilities
            </span>
          </Link>
          <Link to="/services?service=ICU" className="card card-hover" style={{ textDecoration: 'none' }}>
            <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
              ICU &amp; Trauma Care
            </strong>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              Filter hospitals with verified critical care services
            </span>
          </Link>
          <Link to="/beds" className="card card-hover" style={{ textDecoration: 'none' }}>
            <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
              Bed Information
            </strong>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              Verified bed capacity &amp; Hackathon Demo Mode
            </span>
          </Link>
          <Link to="/compare" className="card card-hover" style={{ textDecoration: 'none' }}>
            <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>
              Compare Hospitals
            </strong>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              Compare up to 3 hospitals side-by-side
            </span>
          </Link>
        </div>
      </section>

      {/* Nearby Hospital Suggestions */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{t.home.nearbySuggestions}</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Center: {location.label}
            </span>
          </div>
          <Link to="/nearby" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
            {t.home.viewAll} →
          </Link>
        </div>

        {loadingHospitals ? (
          <div className="grid-2">
            <div className="skeleton" style={{ height: 180 }} />
            <div className="skeleton" style={{ height: 180 }} />
          </div>
        ) : (
          <div className="grid-2">
            {hospitals.slice(0, 4).map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
