import React, { useState } from 'react';
import { Bot, Mic, Send, ShieldAlert } from 'lucide-react';
import EmergencyBanner from '../components/EmergencyBanner';
import HospitalCard from '../components/HospitalCard';
import { useHospitals } from '../context/HospitalContext';
import { useLanguage } from '../context/LanguageContext';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { api } from '../services/api';

const QUICK_PROMPTS = [
  'Find nearby hospitals',
  'Find a cardiology hospital',
  'Find hospitals with ICU',
  'Find hospitals with dialysis',
  'Find hospitals within 5 km',
  'Emergency heart pain near me',
];

export default function AssistantPage() {
  const { language } = useLanguage();
  const { location } = useHospitals();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const voice = useVoiceSearch(language, (transcript) => setQuery(transcript));

  const submitQuery = async (textToSend) => {
    const q = (textToSend ?? query).trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await api.post('/assistant/query', {
        query: q,
        latitude: location.latitude,
        longitude: location.longitude,
        language,
      });
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>Healthcare Discovery Assistant</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Rule-based facility discovery assistant in English, Kannada, and Hindi.
      </p>

      <div className="banner banner-info">
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          This assistant helps you locate hospitals, specialties, and services. It does not diagnose conditions, prescribe medication, or offer medical treatment plans.
        </span>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.85rem' }}>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setQuery(p);
                submitQuery(p);
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery();
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            type="text"
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask e.g. 'Find cardiology hospitals within 5 km' or 'ICU hospitals near me'..."
          />
          {voice.supported && (
            <button type="button" className="btn btn-outline" onClick={voice.startListening}>
              <Mic size={16} />
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Send size={16} /> Ask
          </button>
        </form>
      </div>

      {loading && <div className="skeleton" style={{ height: 180 }} />}

      {result && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {result.is_emergency && <EmergencyBanner />}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Bot size={20} color="var(--color-primary)" />
              <strong>Assistant Response</strong>
              <span className="badge badge-reported">{result.intent}</span>
            </div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{result.reply}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {result.disclaimer}
            </p>
          </div>

          <div className="grid-2">
            {result.hospitals.map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
