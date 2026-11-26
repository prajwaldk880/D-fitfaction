import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { setLanguage } = useLanguage();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [prefLang, setPrefLang] = useState(user?.preferred_language || 'en');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '1rem auto', textAlign: 'center' }}>
        <h2>Sign In Required</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Please sign in to view or update your profile.</p>
        <Link to="/login" className="btn btn-primary">Go to Login</Link>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/me', {
        full_name: fullName,
        preferred_language: prefLang,
      });
      await refreshProfile();
      setLanguage(prefLang);
      addToast('Profile updated.', 'success');
    } catch {
      addToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>User Profile</h1>
      <div className="card">
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span className="badge badge-reported">Role: {user.role}</span>
          {user.assigned_hospital_id && (
            <span className="badge badge-verified">Assigned Hospital ID: {user.assigned_hospital_id}</span>
          )}
        </div>

        <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.85rem' }}>
          <div>
            <label className="label">Email</label>
            <input type="text" className="input" value={user.email} disabled />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Preferred Language</label>
            <select
              className="select"
              value={prefLang}
              onChange={(e) => setPrefLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="kn">Kannada</option>
              <option value="hi">Hindi</option>
            </select>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
