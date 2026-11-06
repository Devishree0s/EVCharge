import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StationMap from '../components/StationMap.jsx';
import Empty from '../components/Empty.jsx';
import { api, errorText } from '../lib/api.js';
import { cumulative, geocode, getRoute, locateOnRoute, samplePath, scoreStation } from '../lib/geo.js';
import { useLoc } from '../lib/LocationContext.jsx';

const RESERVE_PCT = 10; // arrive with at least this much battery left

export default function Planner() {
  const { loc, locate, busy } = useLoc();
  const [battery, setBattery] = useState(60);
  const [range, setRange] = useState(300);
  const [destText, setDestText] = useState('');
  const [options, setOptions] = useState([]);
  const [plan, setPlan] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const usable = Math.max(0, (range * (battery - RESERVE_PCT)) / 100);

  const run = async (dest) => {
    setWorking(true); setError(''); setPlan(null); setOptions([]);
    try {
      const route = await getRoute(loc, dest);
      const cum = cumulative(route.path);
      const total = cum[cum.length - 1] || route.km;
      const pts = samplePath(route.path, cum);
      const { data } = await api.post('/stations/along', { points: pts, radiusKm: 12 });

      const along = data
        .map((s) => ({ ...s, ...locateOnRoute(s, route.path, cum) }))
        .filter((s) => s.offKm <= 12)
        .map((s) => ({ ...s, score: scoreStation(s), reachable: s.routeKm <= usable }))
        .sort((a, b) => a.routeKm - b.routeKm);

      const needCharge = total > usable;
      const reachable = along.filter((s) => s.reachable && s.status !== 'Offline');
      // best stop = highest score among reachable ones, preferring those further along the route
      const best = [...reachable].sort((a, b) => b.score + b.routeKm / 40 - (a.score + a.routeKm / 40))[0];
      const afterCharge = range * 0.7; // assume a stop charges up to roughly 80%, keeping a reserve
      const extraStops = needCharge ? Math.max(0, Math.ceil((total - usable) / afterCharge) - 1) : 0;

      setPlan({ route, total, along, needCharge, best, extraStops, dest });
    } catch (e) {
      setError(errorText(e, 'Could not plan this trip.'));
    }
    setWorking(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!loc) return setError('Set your starting location first.');
    if (!destText.trim()) return;
    setWorking(true); setError(''); setOptions([]);
    try {
      const r = await geocode(destText.trim());
      if (!r.length) { setWorking(false); return setError('Destination not found. Try a city name.'); }
      if (r.length === 1) return run(r[0]);
      setOptions(r); setWorking(false);
    } catch {
      setWorking(false); setError('Destination search is unavailable right now.');
    }
  };

  return (
    <>
      <div className="page-title">
        <h1>Trip planner</h1>
        <p>We check the driving route, then find charging stops you can actually reach with your current battery.</p>
      </div>

      <div className="planner-layout">
        <form className="card form" onSubmit={submit}>
          <div className="field">
            <span className="lbl">From</span>
            {loc ? <div className="from-now"><b>{loc.label}</b></div> : (
              <button type="button" className="btn ghost" onClick={locate} disabled={busy}>{busy ? 'Finding you…' : 'Use my location'}</button>
            )}
            {!loc && <small className="hint">Or set an area on the <Link to="/stations">Stations</Link> page.</small>}
          </div>

          <label className="field"><span className="lbl">To</span>
            <input value={destText} onChange={(e) => setDestText(e.target.value)} placeholder="Destination city, e.g. Pune" />
          </label>

          <label>Battery level <b>{battery}%</b>
            <input type="range" min="15" max="100" value={battery} onChange={(e) => setBattery(+e.target.value)} />
          </label>
          <label>Full-charge range <b>{range} km</b>
            <input type="range" min="100" max="600" step="10" value={range} onChange={(e) => setRange(+e.target.value)} />
          </label>
          <p className="hint">Usable range now: <b>{Math.round(usable)} km</b> (keeping a {RESERVE_PCT}% safety reserve)</p>

          <button className="btn" type="submit" disabled={working}>{working ? 'Planning…' : 'Plan trip'}</button>
        </form>

        <div className="card result-box">
          {!plan && !error && !options.length && <p className="hint">Your plan will appear here.</p>}
          {error && <p className="loc-error" role="alert">{error}</p>}
          {options.length > 0 && (
            <>
              <p>Which destination?</p>
              <ul className="loc-results flat">
                {options.map((o, i) => <li key={i}><button type="button" onClick={() => run(o)}>{o.label}</button></li>)}
              </ul>
            </>
          )}
          {plan && <Summary plan={plan} usable={usable} range={range} />}
        </div>
      </div>

      {plan && (
        <>
          <StationMap
            stations={plan.along}
            route={plan.route.path}
            user={loc}
            extra={[{ ...plan.dest, color: '#10211b', label: `Destination: ${plan.dest.label}` }]}
            highlightId={plan.best?._id}
            height={440}
          />
          <section>
            <h2>Stations along your route</h2>
            {plan.route.straight && <p className="hint">Route service unavailable – showing a straight-line estimate.</p>}
            <div className="route-list">
              {plan.along.map((s) => (
                <Link to={`/stations/${s._id}`} key={s._id} className={`route-row ${s.reachable ? '' : 'far'} ${plan.best?._id === s._id ? 'best' : ''}`}>
                  <div className="km"><b>{Math.round(s.routeKm)}</b><span>km</span></div>
                  <div className="info">
                    <b>{s.name}</b>
                    <span>{s.power} kW · ₹{s.price}/kWh · {s.status} · {s.offKm.toFixed(1)} km off route</span>
                  </div>
                  <div className="badge">{plan.best?._id === s._id ? 'Best stop' : s.reachable ? 'Reachable' : 'Beyond range'}</div>
                </Link>
              ))}
            </div>
            {!plan.along.length && <Empty text="No stations in our database along this route yet." />}
          </section>
        </>
      )}
    </>
  );
}

function Summary({ plan, usable, range }) {
  const { total, needCharge, best, extraStops, route, dest } = plan;
  const hrs = Math.floor(route.minutes / 60), mins = Math.round(route.minutes % 60);
  return (
    <div className={`result ${needCharge ? 'warning' : 'safe'}`}>
      <h2>{needCharge ? 'You need to charge on this trip' : 'You can make it without charging'}</h2>
      <p>
        {Math.round(total)} km to {dest.label} · about {hrs}h {mins}m driving{route.straight ? ' (estimate)' : ''}.
        Usable range now: <b>{Math.round(usable)} km</b>.
      </p>
      {needCharge && best && (
        <p>
          Best stop: <Link to={`/stations/${best._id}`}><b>{best.name}</b></Link> at about {Math.round(best.routeKm)} km
          ({best.power} kW, ₹{best.price}/kWh).
          {extraStops > 0 && <> Expect roughly {extraStops} more stop{extraStops > 1 ? 's' : ''} after that for a {range} km car.</>}
        </p>
      )}
      {needCharge && !best && (
        <p>No known working station is within your current range along this route. Charge near your start first, or raise your battery level.</p>
      )}
    </div>
  );
}
