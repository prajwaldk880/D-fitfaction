import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { language } = useLanguage();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        preferred_language: preferredLanguage,
      });
      addToast('Account created successfully!', 'success');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: '1rem auto' }}>
      <div className="card">
        <h1>Create Citizen Account</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
          Save preferred hospitals and contribute data verification reports.
        </p>

        {error && <div className="banner banner-emergency">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div>
            <label className="label">Full Name</label>
            <input
              type="text"
              className="input"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password (min 6 chars)</label>
            <input
              type="password"
              className="input"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Preferred Language</label>
            <select
              className="select"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <UserPlus size={16} /> {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '0.9rem', marginBottom: 0, fontSize: '0.88rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
