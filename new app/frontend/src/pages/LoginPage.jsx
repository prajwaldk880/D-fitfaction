import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      addToast(`Welcome back, ${user.full_name}`, 'success');
      if (['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DATA_VERIFIER'].includes(user.role)) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: '1rem auto' }}>
      <div className="card">
        <h1>Sign In to Life Protecter</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
          Access saved hospitals, submit verification reports, or open the Admin Dashboard.
        </p>

        {error && <div className="banner banner-emergency">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.in"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            <LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="banner banner-info" style={{ marginTop: '1rem', marginBottom: '0.75rem', flexDirection: 'column', gap: 4 }}>
          <strong>Hackathon Evaluation Accounts:</strong>
          <span>Super Admin: <code>superadmin@lifeprotecter.in</code> / <code>Admin@12345</code></span>
          <span>Data Verifier: <code>verifier@lifeprotecter.in</code> / <code>Verify@12345</code></span>
          <span>Hospital Admin: <code>hospitaladmin@lifeprotecter.in</code> / <code>Hospital@12345</code></span>
          <span>Citizen User: <code>citizen@lifeprotecter.in</code> / <code>Citizen@12345</code></span>
        </div>

        <p style={{ margin: 0, fontSize: '0.88rem' }}>
          New user? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
