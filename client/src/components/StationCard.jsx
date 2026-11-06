import React from 'react';
import { Link } from 'react-router-dom';

export const statusClass = (s) => (s || 'Available').toLowerCase();

export default function StationCard({ s, rank }) {
  return (
    <article className="card station">
      <div className="card-top">
        <span className={`status ${statusClass(s.status)}`}>● {s.status || 'Available'}</span>
        {s.distanceKm != null && <span className="dist">{s.distanceKm} km away</span>}
      </div>

      <h3>{rank ? <span className="rank">{rank}</span> : null}{s.name}</h3>
      <p className="sub">{s.address || s.city}</p>

      <div className="metric">
        <b>{s.reliability ?? '—'}%</b>
        <span>reliability</span>
      </div>

      <div className="stats">
        <span>⚡ {s.power} kW</span>
        <span>₹{s.price}/kWh</span>
        <span>Queue {s.queue ?? 0}</span>
      </div>
      <div className="tags">
        {(s.connectors || []).map((c) => <span key={c} className="tag">{c}</span>)}
      </div>

      <Link className="details" to={`/stations/${s._id}`}>View details</Link>
    </article>
  );
}
