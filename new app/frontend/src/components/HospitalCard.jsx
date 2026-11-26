import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  GitCompare,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { getGoogleMapsDirectionsUrl } from '../services/api';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import VerificationBadge from './VerificationBadge';

export default function HospitalCard({ hospital, isSelected = false, onSelect }) {
  const { t } = useLanguage();
  const { savedIds, toggleSaveHospital, compareIds, toggleCompare } = useHospitals();
  const isSaved = savedIds.includes(hospital.id);
  const isCompared = compareIds.includes(hospital.id);

  return (
    <article
      className="card card-hover"
      onClick={() => onSelect && onSelect(hospital)}
      style={{
        borderColor: isSelected ? 'var(--color-primary)' : undefined,
        boxShadow: isSelected ? '0 0 0 2px rgba(8,119,201,0.22)' : undefined,
        cursor: onSelect ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div>
          <span
            className="badge"
            style={{
              background: hospital.facility_type === 'hospital' ? '#E1F0FC' : '#E0F7FA',
              color: '#0877C9',
              textTransform: 'capitalize',
              marginBottom: '0.35rem',
            }}
          >
            {hospital.facility_type}
          </span>
          <h3 style={{ margin: '0.15rem 0 0.25rem', fontSize: '1.05rem' }}>
            <Link to={`/hospitals/${hospital.id}`} onClick={(e) => e.stopPropagation()}>
              {hospital.name}
            </Link>
          </h3>
        </div>
        <VerificationBadge status={hospital.verification_status} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.84rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
        {hospital.distance_km !== null && hospital.distance_km !== undefined && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontWeight: 700 }}>
            <MapPin size={14} /> {hospital.distance_km} {t.search.distanceAway}
          </span>
        )}
        {hospital.emergency_capable === true && (
          <span className="badge badge-emergency">
            <ShieldAlert size={12} /> Emergency Capable
          </span>
        )}
      </div>

      {hospital.address && (
        <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', margin: '0 0 0.65rem' }}>
          {hospital.address}
        </p>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        {hospital.specialties && hospital.specialties.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {hospital.specialties.slice(0, 4).map((sp) => (
              <span
                key={sp.specialty_id}
                className="badge"
                style={{ background: '#F1F7FD', color: '#172B4D' }}
              >
                <Stethoscope size={11} /> {sp.name}
              </span>
            ))}
            {hospital.specialties.length > 4 && (
              <span className="badge badge-unavailable">+{hospital.specialties.length - 4}</span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            {t.details.noSpecialties}
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', marginBottom: '0.85rem' }}>
        {t.search.sourceLabel}: <strong>{hospital.source_name}</strong>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }} onClick={(e) => e.stopPropagation()}>
        <Link to={`/hospitals/${hospital.id}`} className="btn btn-primary btn-sm">
          View Details
        </Link>
        <a
          href={getGoogleMapsDirectionsUrl(hospital.latitude, hospital.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          <Navigation size={14} /> {t.details.getDirections}
        </a>
        {hospital.phone && (
          <a href={`tel:${hospital.phone}`} className="btn btn-outline btn-sm">
            <Phone size={14} /> Call
          </a>
        )}
        <button
          type="button"
          className={`btn btn-sm ${isSaved ? 'btn-success' : 'btn-outline'}`}
          onClick={() => toggleSaveHospital(hospital.id)}
        >
          <Bookmark size={14} /> {isSaved ? t.details.savedHospital : t.details.saveHospital}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${isCompared ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => toggleCompare(hospital.id)}
        >
          <GitCompare size={14} /> {isCompared ? 'Selected' : t.details.addToCompare}
        </button>
      </div>
    </article>
  );
}
