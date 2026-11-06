import React, { useState } from 'react';
import { useLoc } from '../lib/LocationContext.jsx';
import { geocode } from '../lib/geo.js';

// Lets the visitor set where they are: GPS button, or search any area / city.
export default function LocationBar({ compact = false }) {
  const { loc, setLoc, clear, locate, busy, error, setError } = useLoc();
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSearching(true); setError(''); setResults([]);
    try {
      const r = await geocode(text.trim());
      if (!r.length) setError('No place found. Try a city or area name.');
      else if (r.length === 1) { setLoc(r[0]); setText(''); }
      else setResults(r);
    } catch {
      setError('Place search is unavailable right now. Try “Use my location”.');
    }
    setSearching(false);
  };

  return (
    <div className={`locbar ${compact ? 'compact' : ''}`}>
      {loc && (
        <div className="loc-now">
          <span className="dot" aria-hidden /> Showing stations near <b>{loc.label}</b>
          <button type="button" className="link" onClick={clear}>Change</button>
        </div>
      )}
      {!loc && (
        <div className="loc-row">
          <button type="button" className="btn" onClick={locate} disabled={busy}>
            {busy ? 'Finding you…' : 'Use my location'}
          </button>
          <span className="or">or</span>
          <form onSubmit={search} className="loc-search">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search area or city, e.g. Andheri, Mumbai" aria-label="Search your area" />
            <button type="submit" className="btn ghost" disabled={searching}>{searching ? '…' : 'Search'}</button>
          </form>
        </div>
      )}
      {results.length > 1 && (
        <ul className="loc-results">
          {results.map((r, i) => (
            <li key={i}><button type="button" onClick={() => { setLoc(r); setResults([]); setText(''); }}>{r.label}</button></li>
          ))}
        </ul>
      )}
      {error && <p className="loc-error" role="alert">{error}</p>}
    </div>
  );
}
