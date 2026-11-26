import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  BedDouble,
  Bookmark,
  Bot,
  Compass,
  GitCompare,
  Globe,
  HeartPulse,
  Home,
  LogIn,
  LogOut,
  Map,
  PhoneCall,
  Settings,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGE_LABELS } from '../i18n';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { demoMode, compareIds, savedIds } = useHospitals();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const isAdmin = user && ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DATA_VERIFIER'].includes(user.role);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav-inner">
          <Link to="/" className="brand-link">
            <div className="brand-logo">
              <HeartPulse size={22} />
            </div>
            <div>
              <div className="brand-title">{t.brand}</div>
              <div className="brand-tagline">{t.tagline}</div>
            </div>
          </Link>

          <nav className="nav-links" aria-label="Primary Navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Home size={16} /> {t.nav.home}
            </NavLink>
            <NavLink to="/nearby" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Compass size={16} /> {t.nav.nearby}
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Map size={16} /> {t.nav.map}
            </NavLink>
            <NavLink to="/specialties" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Stethoscope size={16} /> {t.nav.specialties}
            </NavLink>
            <NavLink to="/assistant" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Bot size={16} /> {t.nav.assistant}
            </NavLink>
            <NavLink to="/compare" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <GitCompare size={16} /> {t.nav.compare} ({compareIds.length})
            </NavLink>
          </nav>

          <div className="nav-actions">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Globe size={15} color="var(--color-primary)" />
              <select
                aria-label="Select Language"
                className="select"
                style={{ width: 'auto', padding: '0.35rem 0.55rem', fontSize: '0.82rem' }}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <a href="tel:112" className="btn btn-emergency btn-sm" aria-label={t.emergencyCall}>
              <PhoneCall size={14} /> 112
            </a>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Link to="/profile" className="btn btn-outline btn-sm">
                  <User size={14} /> {user.full_name.split(' ')[0]}
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title={t.nav.logout}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-secondary btn-sm">
                <LogIn size={14} /> {t.nav.login}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="side-rail" aria-label="Sidebar Navigation">
          <div className="side-rail-section">Discovery</div>
          <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Home size={16} /> {t.nav.home}
          </NavLink>
          <NavLink to="/nearby" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Compass size={16} /> {t.nav.nearby}
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Map size={16} /> {t.nav.map}
          </NavLink>
          <NavLink to="/specialties" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Stethoscope size={16} /> {t.nav.specialties}
          </NavLink>

          <div className="side-rail-section">Care &amp; Capacity</div>
          <NavLink to="/beds" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <BedDouble size={16} /> {t.nav.beds}
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Activity size={16} /> {t.nav.services}
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <GitCompare size={16} /> {t.nav.compare} ({compareIds.length}/3)
          </NavLink>
          <NavLink to="/saved" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Bookmark size={16} /> {t.nav.saved} ({savedIds.length})
          </NavLink>

          <div className="side-rail-section">Assistance</div>
          <NavLink to="/emergency" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} style={{ color: 'var(--color-emergency)' }}>
            <PhoneCall size={16} /> {t.nav.emergency}
          </NavLink>
          <NavLink to="/assistant" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Bot size={16} /> {t.nav.assistant}
          </NavLink>

          <div className="side-rail-section">Account &amp; System</div>
          {isAdmin ? (
            <NavLink to="/admin" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={16} /> {t.nav.admin}
            </NavLink>
          ) : (
            <NavLink to="/admin" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={16} /> {t.nav.admin}
            </NavLink>
          )}
          <NavLink to="/settings" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Settings size={16} /> {t.nav.settings}
          </NavLink>
        </aside>

        <main className="main-content">
          {demoMode && (
            <div className="banner banner-demo" role="status">
              <strong>DEMO DATA MODE:</strong>
              <span>{t.demo.banner}</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <NavLink to="/" end className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}>
          <Home size={18} />
          <span>{t.nav.home}</span>
        </NavLink>
        <NavLink to="/nearby" className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}>
          <Compass size={18} />
          <span>Nearby</span>
        </NavLink>
        <NavLink to="/emergency" className={({ isActive }) => `mobile-nav-btn emergency ${isActive ? 'active' : ''}`}>
          <PhoneCall size={18} />
          <span>112</span>
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}>
          <Map size={18} />
          <span>Map</span>
        </NavLink>
        <NavLink to="/assistant" className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}>
          <Bot size={18} />
          <span>Assistant</span>
        </NavLink>
      </nav>
    </div>
  );
}
