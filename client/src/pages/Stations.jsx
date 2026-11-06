import React, { useMemo, useState } from 'react';
import LocationBar from '../components/LocationBar.jsx';
import StationCard from '../components/StationCard.jsx';
import StationMap from '../components/StationMap.jsx';
import Empty from '../components/Empty.jsx';
import { useLoc } from '../lib/LocationContext.jsx';
import { useStations } from '../lib/useStations.js';

const SORTS = ['Nearest', 'Reliable', 'Fastest', 'Cheapest'];

export default function Stations() {
  const { loc } = useLoc();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('Nearest');
  const [radius, setRadius] = useState('50');
  const [connector, setConnector] = useState('');
  const [minPower, setMinPower] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [hover, setHover] = useState(null);

  const params = {
    ...(loc ? { lat: loc.lat, lng: loc.lng, ...(radius ? { radiusKm: radius } : {}) } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(connector ? { connector } : {}),
    ...(minPower ? { minPower } : {}),
    ...(onlyAvailable ? { status: 'Available' } : {}),
    limit: 150,
  };
  const { stations, loading, error } = useStations(params);

  const effectiveSort = !loc && sort === 'Nearest' ? 'Reliable' : sort;
  const shown = useMemo(() => {
    const a = [...stations];
    if (effectiveSort === 'Nearest') a.sort((x, y) => (x.distanceKm ?? 1e9) - (y.distanceKm ?? 1e9));
    if (effectiveSort === 'Reliable') a.sort((x, y) => (y.reliability || 0) - (x.reliability || 0));
    if (effectiveSort === 'Fastest') a.sort((x, y) => (y.power || 0) - (x.power || 0));
    if (effectiveSort === 'Cheapest') a.sort((x, y) => (x.price || 0) - (y.price || 0));
    return a;
  }, [stations, effectiveSort]);

  return (
    <>
      <div className="page-title">
        <h1>Find a charger</h1>
        <p>{loc ? 'Stations around your location, with live distance.' : 'Set your location to see the nearest stations first.'}</p>
      </div>

      <LocationBar />

      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search station, area or city…" aria-label="Search stations" />
        <div className="chips" role="group" aria-label="Sort by">
          {SORTS.map((x) => (
            <button key={x} className={effectiveSort === x ? 'active' : ''} onClick={() => setSort(x)} disabled={x === 'Nearest' && !loc} title={x === 'Nearest' && !loc ? 'Set your location first' : ''}>{x}</button>
          ))}
        </div>
      </div>

      <div className="filters">
        {loc && (
          <label>Within
            <select value={radius} onChange={(e) => setRadius(e.target.value)}>
              <option value="10">10 km</option><option value="25">25 km</option><option value="50">50 km</option>
              <option value="100">100 km</option><option value="300">300 km</option><option value="">Any distance</option>
            </select>
          </label>
        )}
        <label>Connector
          <select value={connector} onChange={(e) => setConnector(e.target.value)}>
            <option value="">Any</option><option>CCS2</option><option>Type 2</option><option>CHAdeMO</option>
          </select>
        </label>
        <label>Min power
          <select value={minPower} onChange={(e) => setMinPower(e.target.value)}>
            <option value="">Any</option><option value="30">30 kW+</option><option value="60">60 kW+</option><option value="120">120 kW+</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Available now</label>
        <span className="count">{loading ? 'Loading…' : `${shown.length} station${shown.length === 1 ? '' : 's'}`}</span>
      </div>

      {error && <Empty text={error} />}

      <div className="split">
        <div className="list">
          {shown.map((s, i) => (
            <div key={s._id} onMouseEnter={() => setHover(s._id)} onMouseLeave={() => setHover(null)}>
              <StationCard s={s} rank={effectiveSort === 'Nearest' ? i + 1 : null} />
            </div>
          ))}
          {!loading && !error && !shown.length && (
            <Empty text={loc ? 'No stations match these filters near you. Try a larger distance.' : 'No matching stations.'} />
          )}
        </div>
        <div className="map-col">
          <StationMap stations={shown} user={loc} highlightId={hover} height="calc(100vh - 140px)" />
        </div>
      </div>
    </>
  );
}
