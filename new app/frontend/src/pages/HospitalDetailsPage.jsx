import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Flag,
  GitCompare,
  Navigation,
  Phone,
  Share2,
} from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api, getGoogleMapsDirectionsUrl } from '../services/api';

export default function HospitalDetailsPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { location, demoMode, savedIds, toggleSaveHospital, compareIds, toggleCompare } = useHospitals();

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState('incorrect_info');
  const [reportDesc, setReportDesc] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/hospitals/${id}`, {
        params: { lat: location.latitude, lon: location.longitude, demo_mode: demoMode },
      })
      .then((res) => setHospital(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Hospital record not found.'))
      .finally(() => setLoading(false));
  }, [id, location.latitude, location.longitude, demoMode]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: hospital.name, url: shareUrl });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      addToast('Hospital link copied to clipboard.', 'success');
    } catch {
      addToast(shareUrl, 'info');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;
    setSubmittingReport(true);
    try {
      await api.post(`/hospitals/${hospital.id}/report`, {
        report_type: reportType,
        description: reportDesc.trim(),
      });
      addToast('Thank you. Your report has been submitted for verifier review.', 'success');
      setShowReport(false);
      setReportDesc('');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 360 }} />;
  }

  if (error || !hospital) {
    return (
      <div className="card">
        <h2>Hospital Unavailable</h2>
        <p>{error}</p>
        <Link to="/nearby" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Nearby Hospitals
        </Link>
      </div>
    );
  }

  const isSaved = savedIds.includes(hospital.id);
  const isCompared = compareIds.includes(hospital.id);
  const beds = hospital.bed_summary;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div>
        <Link to="/nearby" className="btn btn-outline btn-sm">
          <ArrowLeft size={15} /> {t.common.back}
        </Link>
      </div>

      <section className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <span className="badge badge-reported" style={{ textTransform: 'capitalize' }}>
                {hospital.facility_type}
              </span>
              <VerificationBadge status={hospital.verification_status} />
              {hospital.emergency_capable === true && (
                <span className="badge badge-emergency">Emergency Capable</span>
              )}
            </div>
            <h1 style={{ marginBottom: '0.35rem' }}>{hospital.name}</h1>
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
              {hospital.address || 'Address unavailable in public record'}
            </p>
          </div>

          {hospital.distance_km != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {hospital.distance_km} km
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                from search center
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons — hide phone call button when phone is unavailable */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginBottom: '1rem' }}>
          {hospital.phone && (
            <a href={`tel:${hospital.phone}`} className="btn btn-success">
              <Phone size={16} /> {t.details.callHospital} ({hospital.phone})
            </a>
          )}
          <a
            href={getGoogleMapsDirectionsUrl(hospital.latitude, hospital.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <Navigation size={16} /> {t.details.getDirections}
          </a>
          <button type="button" className="btn btn-outline" onClick={handleShare}>
            <Share2 size={16} /> {t.details.shareHospital}
          </button>
          <button
            type="button"
            className={`btn ${isSaved ? 'btn-success' : 'btn-outline'}`}
            onClick={() => toggleSaveHospital(hospital.id)}
          >
            <Bookmark size={16} /> {isSaved ? t.details.savedHospital : t.details.saveHospital}
          </button>
          <button
            type="button"
            className={`btn ${isCompared ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => toggleCompare(hospital.id)}
          >
            <GitCompare size={16} /> {isCompared ? 'In Comparison' : t.details.addToCompare}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setShowReport((v) => !v)}>
            <Flag size={16} /> {t.details.reportIssue}
          </button>
        </div>

        <div className="grid-3" style={{ fontSize: '0.88rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem' }}>
          <div>
            <strong>{t.details.coordinates}:</strong>
            <div>{hospital.latitude.toFixed(5)}, {hospital.longitude.toFixed(5)}</div>
          </div>
          <div>
            <strong>{t.details.openingHours}:</strong>
            <div>{hospital.opening_hours || t.common.unknown}</div>
          </div>
          <div>
            <strong>{t.details.accessibility}:</strong>
            <div>{hospital.wheelchair_access || t.common.unknown}</div>
          </div>
          <div>
            <strong>Data Source:</strong>
            <div>
              {hospital.source_name}{' '}
              {hospital.source_url && (
                <a href={hospital.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <div>
            <strong>{t.details.lastUpdated}:</strong>
            <div>{new Date(hospital.last_updated).toLocaleString()}</div>
          </div>
          {hospital.website && (
            <div>
              <strong>Website:</strong>
              <div>
                <a href={hospital.website} target="_blank" rel="noopener noreferrer">
                  {hospital.website}
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {showReport && (
        <form className="card" onSubmit={handleReportSubmit}>
          <h3>{t.details.reportIssue}</h3>
          <div className="grid-2" style={{ marginBottom: '0.75rem' }}>
            <div>
              <label className="label">Issue Type</label>
              <select className="select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="incorrect_info">Incorrect Name / Address</option>
                <option value="wrong_phone">Wrong or Missing Phone Number</option>
                <option value="wrong_location">Incorrect Map Coordinates</option>
                <option value="service_update">Service Availability Correction</option>
                <option value="closed">Facility Permanently Closed</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label className="label">Details</label>
            <textarea
              className="textarea"
              rows={3}
              required
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="Describe what needs correction..."
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={submittingReport}>
              {t.common.submit}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowReport(false)}>
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Specialties */}
      <section className="card">
        <h2>{t.details.specialties}</h2>
        {hospital.specialties.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t.details.noSpecialties}</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {hospital.specialties.map((sp) => (
              <div
                key={sp.specialty_id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '0.55rem 0.85rem',
                  background: '#F8FBFF',
                }}
              >
                <div style={{ fontWeight: 700 }}>{sp.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Source: {sp.source} • <VerificationBadge status={sp.verification_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Services */}
      <section className="card">
        <h2>{t.details.services}</h2>
        {hospital.services.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{t.details.noServices}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Verification</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {hospital.services.map((sv) => (
                  <tr key={sv.service_id}>
                    <td><strong>{sv.name}</strong></td>
                    <td>
                      <span
                        className={`badge ${
                          sv.availability_status === 'AVAILABLE'
                            ? 'badge-verified'
                            : sv.availability_status === 'UNAVAILABLE'
                            ? 'badge-emergency'
                            : 'badge-unavailable'
                        }`}
                      >
                        {sv.availability_status}
                      </span>
                    </td>
                    <td>{sv.source}</td>
                    <td><VerificationBadge status={sv.verification_status} /></td>
                    <td>{sv.last_updated ? new Date(sv.last_updated).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bed Capacity & Availability */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <h2 style={{ margin: 0 }}>{t.details.beds}</h2>
          <VerificationBadge status={beds?.availability_verification_status} isDemo={beds?.is_demo} />
        </div>
        <p style={{ color: beds?.is_demo ? '#854D0E' : 'var(--color-text-muted)', fontWeight: beds?.is_demo ? 600 : 400 }}>
          {beds?.message || t.details.noBeds}
        </p>
        {(beds?.total_beds != null || beds?.available_beds != null) && (
          <div className="grid-4">
            <div className="card" style={{ background: '#F8FBFF' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Total Capacity</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{beds.total_beds ?? 'Unknown'}</div>
            </div>
            <div className="card" style={{ background: '#F8FBFF' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>ICU Capacity</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{beds.icu_beds ?? 'Unknown'}</div>
            </div>
            <div className="card" style={{ background: '#F8FBFF' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Available Beds</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {beds.available_beds ?? 'Unavailable'}
              </div>
            </div>
            <div className="card" style={{ background: '#F8FBFF' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Occupied Beds</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{beds.occupied_beds ?? 'Unavailable'}</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
