import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export default function AdminPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [dataSources, setDataSources] = useState([]);
  const [selectedHospId, setSelectedHospId] = useState('');
  const [error, setError] = useState('');

  // Quick update states
  const [specId, setSpecId] = useState('');
  const [svcId, setSvcId] = useState('');
  const [svcStatus, setSvcStatus] = useState('AVAILABLE');
  const [totalBeds, setTotalBeds] = useState('');
  const [availBeds, setAvailBeds] = useState('');
  const [newHospName, setNewHospName] = useState('');
  const [newHospLat, setNewHospLat] = useState('12.9716');
  const [newHospLon, setNewHospLon] = useState('77.5946');

  const isAuthorized = user && ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DATA_VERIFIER'].includes(user.role);

  const loadAdminData = async () => {
    try {
      const [dashRes, repRes, specRes, svcRes, dsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/reports'),
        api.get('/hospitals/specialties'),
        api.get('/hospitals/services-catalog'),
        api.get('/admin/data-sources'),
      ]);
      setDashboard(dashRes.data);
      setReports(repRes.data);
      setSpecialties(specRes.data);
      setServicesCatalog(svcRes.data);
      setDataSources(dsRes.data);

      if (!selectedHospId) {
        if (user.assigned_hospital_id) {
          setSelectedHospId(String(user.assigned_hospital_id));
        } else if (dashRes.data.hospitals.length > 0) {
          setSelectedHospId(String(dashRes.data.hospitals[0].id));
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin dashboard.');
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadAdminData();
    }
  }, [isAuthorized]);

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: '1rem auto', textAlign: 'center' }}>
        <ShieldCheck size={36} color="var(--color-primary)" />
        <h2>Administrator Sign In Required</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Sign in with a SUPER_ADMIN, DATA_VERIFIER, or HOSPITAL_ADMIN account to manage hospital records.
        </p>
        <Link to="/login" className="btn btn-primary">Go to Login</Link>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="card">
        <h2>Access Restricted</h2>
        <p>Your account role (<strong>{user.role}</strong>) does not have administrative permissions. Public users cannot modify verified hospital records directly.</p>
      </div>
    );
  }

  const handleVerifyHospital = async (hospId) => {
    try {
      await api.post(`/admin/hospitals/${hospId}/verify`);
      addToast('Hospital marked VERIFIED.', 'success');
      loadAdminData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Verification failed.', 'error');
    }
  };

  const handleAddSpecialty = async (e) => {
    e.preventDefault();
    if (!selectedHospId || !specId) return;
    try {
      await api.post(`/admin/hospitals/${selectedHospId}/specialties`, {
        specialty_id: Number(specId),
        source: user.role === 'HOSPITAL_ADMIN' ? 'Hospital Administrator' : 'Data Verifier',
        verification_status: user.role === 'HOSPITAL_ADMIN' ? 'HOSPITAL_REPORTED' : 'VERIFIED',
      });
      addToast('Specialty record updated.', 'success');
      loadAdminData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update specialty.', 'error');
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!selectedHospId || !svcId) return;
    try {
      await api.post(`/admin/hospitals/${selectedHospId}/services`, {
        service_id: Number(svcId),
        availability_status: svcStatus,
        source: user.role === 'HOSPITAL_ADMIN' ? 'Hospital Administrator' : 'Data Verifier',
        verification_status: user.role === 'HOSPITAL_ADMIN' ? 'HOSPITAL_REPORTED' : 'VERIFIED',
      });
      addToast('Medical service updated.', 'success');
      loadAdminData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update service.', 'error');
    }
  };

  const handleUpdateBeds = async (e) => {
    e.preventDefault();
    if (!selectedHospId) return;
    try {
      await api.post(`/admin/hospitals/${selectedHospId}/beds`, {
        total_beds: totalBeds ? Number(totalBeds) : null,
        available_beds: availBeds ? Number(availBeds) : null,
        source: user.role === 'HOSPITAL_ADMIN' ? 'Hospital Administrator' : 'Data Verifier',
        verification_status: 'HOSPITAL_REPORTED',
        is_live: Boolean(availBeds),
        is_demo: false,
      });
      addToast('Bed capacity/availability updated.', 'success');
      loadAdminData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update beds.', 'error');
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    if (!newHospName.trim()) return;
    try {
      await api.post('/admin/hospitals', {
        name: newHospName.trim(),
        facility_type: 'hospital',
        latitude: Number(newHospLat),
        longitude: Number(newHospLon),
        city: 'Bengaluru',
        state: 'Karnataka',
        verification_status: 'HOSPITAL_REPORTED',
      });
      addToast('Hospital created.', 'success');
      setNewHospName('');
      loadAdminData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create hospital.', 'error');
    }
  };

  const handleReviewReport = async (reportId, status) => {
    try {
      await api.put(`/admin/reports/${reportId}`, { status });
      addToast(`Report marked ${status}.`, 'success');
      loadAdminData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update report.', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Admin &amp; Verification Dashboard</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Signed in as <strong>{user.email}</strong> ({user.role})
            {user.assigned_hospital_id ? ` • Scoped to Hospital #${user.assigned_hospital_id}` : ''}
          </p>
        </div>
      </div>

      {error && <div className="banner banner-emergency">{error}</div>}

      {dashboard && (
        <div className="grid-4">
          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Facilities</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{dashboard.metrics.total_hospitals}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Verified Hospitals</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>{dashboard.metrics.verified_hospitals}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Open User Reports</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>{dashboard.metrics.open_reports}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Registered Users</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{dashboard.metrics.total_users}</div>
          </div>
        </div>
      )}

      {/* Target Hospital Selector & Management Forms */}
      <div className="card">
        <h2>Manage Hospital Specialties, Services &amp; Beds</h2>
        <div style={{ marginBottom: '0.85rem' }}>
          <label className="label">Target Hospital</label>
          <select
            className="select"
            value={selectedHospId}
            onChange={(e) => setSelectedHospId(e.target.value)}
            disabled={user.role === 'HOSPITAL_ADMIN'}
          >
            {dashboard?.hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                #{h.id} — {h.name} ({h.verification_status})
              </option>
            ))}
          </select>
        </div>

        <div className="grid-3">
          <form onSubmit={handleAddSpecialty} style={{ display: 'grid', gap: '0.5rem', alignContent: 'start' }}>
            <label className="label">Assign Verified Specialty</label>
            <select className="select" value={specId} onChange={(e) => setSpecId(e.target.value)}>
              <option value="">Select specialty...</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">Add Specialty</button>
          </form>

          <form onSubmit={handleUpdateService} style={{ display: 'grid', gap: '0.5rem', alignContent: 'start' }}>
            <label className="label">Update Medical Service</label>
            <select className="select" value={svcId} onChange={(e) => setSvcId(e.target.value)}>
              <option value="">Select service...</option>
              {servicesCatalog.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select className="select" value={svcStatus} onChange={(e) => setSvcStatus(e.target.value)}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="UNAVAILABLE">UNAVAILABLE</option>
              <option value="TEMPORARILY_UNAVAILABLE">TEMPORARILY_UNAVAILABLE</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">Update Service</button>
          </form>

          <form onSubmit={handleUpdateBeds} style={{ display: 'grid', gap: '0.5rem', alignContent: 'start' }}>
            <label className="label">Report Official Bed Capacity / Live Beds</label>
            <input
              type="number"
              min="0"
              className="input"
              placeholder="Total beds"
              value={totalBeds}
              onChange={(e) => setTotalBeds(e.target.value)}
            />
            <input
              type="number"
              min="0"
              className="input"
              placeholder="Live available beds"
              value={availBeds}
              onChange={(e) => setAvailBeds(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Save Bed Update</button>
          </form>
        </div>
      </div>

      {['SUPER_ADMIN', 'DATA_VERIFIER'].includes(user.role) && (
        <form className="card" onSubmit={handleCreateHospital}>
          <h3><Plus size={16} style={{ verticalAlign: 'middle' }} /> Add Verified / Reported Hospital</h3>
          <div className="grid-3">
            <input
              type="text"
              className="input"
              placeholder="Hospital Name"
              value={newHospName}
              onChange={(e) => setNewHospName(e.target.value)}
              required
            />
            <input
              type="number"
              step="any"
              className="input"
              placeholder="Latitude"
              value={newHospLat}
              onChange={(e) => setNewHospLat(e.target.value)}
              required
            />
            <input
              type="number"
              step="any"
              className="input"
              placeholder="Longitude"
              value={newHospLon}
              onChange={(e) => setNewHospLon(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
            Add Hospital
          </button>
        </form>
      )}

      {/* Hospitals Verification List */}
      <div className="card">
        <h3>Hospital Verification Queue</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Source</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.hospitals.slice(0, 12).map((h) => (
                <tr key={h.id}>
                  <td><Link to={`/hospitals/${h.id}`}>{h.name}</Link></td>
                  <td>{h.facility_type}</td>
                  <td>{h.source_name}</td>
                  <td>{h.verification_status}</td>
                  <td>
                    {['SUPER_ADMIN', 'DATA_VERIFIER'].includes(user.role) && !h.is_verified ? (
                      <button type="button" className="btn btn-success btn-sm" onClick={() => handleVerifyHospital(h.id)}>
                        <CheckCircle2 size={14} /> Verify
                      </button>
                    ) : (
                      <span>{h.is_verified ? 'Verified' : 'Assigned Scope'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Reports */}
      <div className="card">
        <h3>Citizen Data Correction Reports</h3>
        {reports.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No citizen reports submitted yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hospital ID</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.hospital_id}</td>
                    <td>{r.report_type}</td>
                    <td>{r.description}</td>
                    <td>{r.status}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-success btn-sm" onClick={() => handleReviewReport(r.id, 'RESOLVED')}>Resolve</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleReviewReport(r.id, 'DISMISSED')}>Dismiss</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Sources & Audit Logs */}
      <div className="grid-2">
        <div className="card">
          <h3>Data Sources</h3>
          <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.86rem' }}>
            {dataSources.map((ds) => (
              <li key={ds.id} style={{ marginBottom: 6 }}>
                <strong>{ds.name}</strong> ({ds.source_type}) — {ds.description}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Recent Audit Logs</h3>
          <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.84rem' }}>
            {dashboard?.recent_audit_logs.slice(0, 8).map((log) => (
              <li key={log.id} style={{ marginBottom: 4 }}>
                <strong>{log.action}</strong> by {log.actor_email || 'system'} — {log.details}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
