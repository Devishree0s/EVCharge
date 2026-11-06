import React from 'react';
import { Link } from 'react-router-dom';
import LocationBar from '../components/LocationBar.jsx';
import StationCard from '../components/StationCard.jsx';
import StationMap from '../components/StationMap.jsx';
import Empty from '../components/Empty.jsx';
import { useLoc } from '../lib/LocationContext.jsx';
import { useStations } from '../lib/useStations.js';

export default function Home() {
  const { loc } = useLoc();
  const params = loc ? { lat: loc.lat, lng: loc.lng, limit: 12 } : { limit: 12 };
  const { stations, loading, error } = useStations(params);
  const nearest = loc ? stations.slice(0, 3) : [...stations].sort((a, b) => b.reliability - a.reliability).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">INDIA-FIRST CHARGING INTELLIGENCE</p>
          <h1>Find the right plug before you pull off the highway.</h1>
          <p>
            Compare connector, charging speed, price and driver-reported reliability
            across city stops and the routes you actually drive.
          </p>
          <LocationBar />
          <div className="actions">
            <Link className="btn" to="/stations">Browse all stations</Link>
            <Link className="btn ghost" to="/planner">Plan a trip</Link>
          </div>
          <div className="corridor-strip" aria-label="Example Indian road trip corridors">
            <span>Built for routes like</span>
            <b>Mumbai–Pune</b>
            <b>Delhi–Jaipur</b>
            <b>Bengaluru–Mysuru</b>
          </div>
        </div>
        <StationMap stations={stations} user={loc} height={380} />
      </section>

      <section>
        <div className="section-head">
          <h2>{loc ? `Nearest to ${loc.label}` : 'Most reliable chargers'}</h2>
          <Link to="/stations">View all</Link>
        </div>

        {error && <Empty text={error} />}
        {loading && !stations.length && !error && <Empty text="Loading stations…" />}
        <div className="grid">
          {nearest.map((s, i) => <StationCard key={s._id} s={s} rank={loc ? i + 1 : null} />)}
        </div>
        {!loc && !loading && !error && <p className="hint">Set your location above to see the stations closest to you.</p>}
      </section>

      <section className="planner-card">
        <div>
          <h2>Know where to charge before you leave.</h2>
          <p>Enter a destination and your battery level. We check the real driving route and find the best stops you can actually reach.</p>
        </div>
        <Link className="btn" to="/planner">Plan my trip</Link>
      </section>
    </>
  );
}
