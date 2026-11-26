import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: '2rem auto', textAlign: 'center', padding: '2.5rem' }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-primary)' }}>404</div>
      <h1>Page Not Found</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        The Life Protecter page you requested does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={16} /> Return to Home Dashboard
      </Link>
    </div>
  );
}
