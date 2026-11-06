import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StationMap from '../components/StationMap.jsx';
import Empty from '../components/Empty.jsx';
import { statusClass } from '../components/StationCard.jsx';
import { api, errorText } from '../lib/api.js';
import { haversineKm, scoreStation } from '../lib/geo.js';
import { useLoc } from '../lib/LocationContext.jsx';

const REPORTS = ['Charger not working', 'Price is incorrect', 'Long queue', 'Working fine'];

export default function StationDetails() {
  const { id } = useParams();
  const { loc } = useLoc();
  const [s, setS] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setS(null); setError('');
    api.get(`/stations/${id}`).then((r) => setS(r.data)).catch((e) => setError(e?.response?.status === 404 ? 'Station not found' : errorText(e)));
    api.get(`/stations/${id}/reports`).then((r) => setReports(r.data)).catch(() => {});
  }, [id]);

  const report = async (type) => {
    try {
      const r = await api.post(`/stations/${id}/reports`, { type, message: `User reported: ${type}` });
      setReports((x) => [r.data.report, ...x]);
      setNote('Thanks! Your report was submitted.');
    } catch (e) {
      setNote(errorText(e, 'Could not submit report.'));
    }
    setTimeout(() => setNote(''), 4000);
  };

  if (error) return <><Link to="/stations" className="back">← Back to stations</Link><Empty text={error} /></>;
  if (!s) return <Empty text="Loading station…" />;

  const km = loc ? Math.round(haversineKm(loc, { lat: s.latitude, lng: s.longitude }) * 10) / 10 : null;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;

  return (
    <>
      <Link to="/stations" className="back">← Back to stations</Link>

      <section className="detail-hero">
        <div>
          <h1>{s.name}</h1>
          <p>{s.address || s.city}{s.city && s.address && s.city !== s.address ? `, ${s.city}` : ''}</p>
          <div className="tags">{(s.connectors || []).map((c) => <span key={c} className="tag">{c}</span>)}{(s.amenities || []).map((a) => <span key={a} className="tag soft">{a}</span>)}</div>
        </div>
        <div className="detail-side">
          <span className={`status big ${statusClass(s.status)}`}>● {s.status || 'Available'}</span>
          {km != null && <span className="dist">{km} km from {loc.label}</span>}
          <a className="btn" href={directions} target="_blank" rel="noreferrer">Get directions</a>
        </div>
      </section>

      <div className="detail-grid">
        <div className="card big-card">
          <div className="score"><b>{s.reliability ?? '—'}%</b><span>reliability · overall stop score {scoreStation(s)}/100</span></div>
          <div className="detail-stats">
            <div><b>{s.power} kW</b><span>Charging power</span></div>
            <div><b>₹{s.price}/kWh</b><span>Price</span></div>
            <div><b>{s.queue ?? 0}</b><span>Queue estimate</span></div>
          </div>
        </div>

        <div className="card">
          <h3>Report a problem</h3>
          <p className="sub">Help other drivers by sharing what you see at this station.</p>
          <div className="report-buttons">
            {REPORTS.map((x) => <button key={x} onClick={() => report(x)}>{x}</button>)}
          </div>
          {note && <p className="note" role="status">{note}</p>}
        </div>
      </div>

      <StationMap stations={[s]} user={loc} height={320} highlightId={s._id} />

      <section>
        <h2>Recent user reports</h2>
        {reports.length ? (
          <div className="reports">
            {reports.map((r) => (
              <div className="report" key={r._id}>
                <b>{r.type}</b>
                <small>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</small>
              </div>
            ))}
          </div>
        ) : <Empty text="No reports yet. Be the first to report." />}
      </section>
    </>
  );
}
