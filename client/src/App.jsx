import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, useParams } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:4000/api';

function Nav() {
  return (
    <nav>
      <Link to="/" className="brand">⚡ EVCharge</Link>

      <div>
        <Link to="/">Dashboard</Link>
        <Link to="/stations">Stations</Link>
        <Link to="/planner">Trip Planner</Link>
      </div>
    </nav>
  );
}

function Layout({ children }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}

function Home() {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    axios
      .get(`${API}/stations`)
      .then((r) => setStations(r.data))
      .catch((err) => console.error('Failed to load stations:', err));
  }, []);

  const reliable = [...stations]
    .sort((a, b) => (b.reliability || 0) - (a.reliability || 0))
    .slice(0, 3);

  return (
    <Layout>
      <section className="hero">
        <div>
          <span className="eyebrow">SMART EV CHARGING</span>

          <h1>
            Charge smarter.
            <br />
            <span>Drive farther.</span>
          </h1>

          <p>
            Find charging stations using reliability, price, power and queue
            information instead of choosing blindly.
          </p>

          <div className="actions">
            <Link className="btn" to="/stations">
              Find chargers
            </Link>

            <Link className="btn ghost" to="/planner">
              Plan a trip
            </Link>
          </div>
        </div>

        <div className="battery">
          <div className="battery-top">
            <span>Current battery</span>
            <b>72%</b>
          </div>

          <div className="bar">
            <i style={{ width: '72%' }} />
          </div>

          <small>Estimated range · 210 km</small>
        </div>
      </section>

      <section>
        <div className="section-head">
          <div>
            <span className="eyebrow">RECOMMENDED</span>
            <h2>Reliable nearby chargers</h2>
          </div>

          <Link to="/stations">View all →</Link>
        </div>

        <div className="grid">
          {reliable.map((s) => (
            <StationCard key={s._id} s={s} />
          ))}
        </div>

        {!stations.length && (
          <Empty text="No stations found. Make sure the backend is running and stations are seeded." />
        )}
      </section>

      <section className="planner-card">
        <div>
          <span className="eyebrow">SMART TRIP PLANNER</span>

          <h2>Know where to charge before you leave.</h2>

          <p>
            Use battery level, distance, price, power and reliability to plan
            a practical charging stop.
          </p>
        </div>

        <Link className="btn" to="/planner">
          Plan my trip →
        </Link>
      </section>
    </Layout>
  );
}

function StationCard({ s }) {
  return (
    <article className="card">
      <div className="status">
        ● {s.status || 'Available'}
      </div>

      <h3>{s.name}</h3>

      <div className="metric">
        <b>{s.reliability ?? '—'}%</b>
        <span>Reliability</span>
      </div>

      <div className="stats">
        <span>⚡ {s.power} kW</span>
        <span>₹{s.price}/kWh</span>
        <span>Queue {s.queue ?? 0}</span>
      </div>

      <Link className="details" to={`/stations/${s._id}`}>
        View details →
      </Link>
    </article>
  );
}

function Stations() {
  const [stations, setStations] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Reliable');

  useEffect(() => {
    axios
      .get(`${API}/stations`)
      .then((r) => setStations(r.data))
      .catch((err) => console.error('Failed to load stations:', err));
  }, []);

  const shown = useMemo(() => {
    let a = stations.filter((s) =>
      (s.name || '').toLowerCase().includes(q.toLowerCase())
    );

    if (filter === 'Reliable') {
      a.sort((x, y) => (y.reliability || 0) - (x.reliability || 0));
    }

    if (filter === 'Fastest') {
      a.sort((x, y) => (y.power || 0) - (x.power || 0));
    }

    if (filter === 'Cheapest') {
      a.sort((x, y) => (x.price || 0) - (y.price || 0));
    }

    return a;
  }, [stations, q, filter]);

  return (
    <Layout>
      <div className="page-title">
        <span className="eyebrow">CHARGING NETWORK</span>

        <h1>Find a charger</h1>

        <p>Compare the stations available in your network.</p>
      </div>

      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search station..."
        />

        <div className="chips">
          {['Reliable', 'Fastest', 'Cheapest'].map((x) => (
            <button
              className={filter === x ? 'active' : ''}
              onClick={() => setFilter(x)}
              key={x}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {shown.map((s) => (
          <StationCard key={s._id} s={s} />
        ))}
      </div>

      {!shown.length && <Empty text="No matching stations." />}
    </Layout>
  );
}

function StationDetails() {
  const { id } = useParams();

  const [s, setS] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${API}/stations/${id}`)
      .then((r) => setS(r.data))
      .catch(() => setError('Station not found'));

    axios
      .get(`${API}/stations/${id}/reports`)
      .then((r) => setReports(r.data))
      .catch(() => {});
  }, [id]);

  const report = async (type) => {
    try {
      const r = await axios.post(`${API}/stations/${id}/reports`, {
        type,
        message: `User reported: ${type}`,
      });

      setReports((x) => [r.data.report, ...x]);

      alert('Report submitted successfully.');
    } catch (err) {
      alert('Could not submit report.');
    }
  };

  if (error) {
    return (
      <Layout>
        <Empty text={error} />
      </Layout>
    );
  }

  if (!s) {
    return (
      <Layout>
        <Empty text="Loading station..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <Link to="/stations" className="back">
        ← Back to stations
      </Link>

      <section className="detail-hero">
        <div>
          <span className="eyebrow">CHARGING STATION</span>

          <h1>{s.name}</h1>

          <p>
            {s.connector} · {s.power} kW charging
          </p>
        </div>

        <div className="status">
          ● {s.status || 'Available'}
        </div>
      </section>

      <div className="detail-grid">
        <div className="card big-card">
          <div className="score">
            <b>{s.reliability ?? '—'}%</b>
            <span>Reliability score</span>
          </div>

          <div className="detail-stats">
            <div>
              <b>{s.power} kW</b>
              <span>Charging power</span>
            </div>

            <div>
              <b>₹{s.price}/kWh</b>
              <span>Current price</span>
            </div>

            <div>
              <b>{s.queue ?? 0}</b>
              <span>Queue estimate</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Report a problem</h3>

          <p>
            Help other drivers by reporting what you see at this station.
          </p>

          <div className="report-buttons">
            {[
              'Charger not working',
              'Price is incorrect',
              'Long queue',
            ].map((x) => (
              <button key={x} onClick={() => report(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h2>Recent user reports</h2>

        {reports.length ? (
          <div className="reports">
            {reports.map((r) => (
              <div className="report" key={r._id}>
                <b>⚠️ {r.type}</b>

                <p>{r.message}</p>

                <small>
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleString()
                    : ''}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No reports yet. Be the first to report a problem." />
        )}
      </section>
    </Layout>
  );
}

function Planner() {
  const [battery, setBattery] = useState(35);
  const [distance, setDistance] = useState(120);
  const [range, setRange] = useState(250);

  const [stations, setStations] = useState([]);

  useEffect(() => {
    axios
      .get(`${API}/stations`)
      .then((r) => setStations(r.data))
      .catch((err) => console.error('Failed to load stations:', err));
  }, []);

  const currentRange = (range * battery) / 100;
  const need = currentRange < distance;

  const picks = [...stations]
    .sort((a, b) => (b.reliability || 0) - (a.reliability || 0))
    .slice(0, 3);

  return (
    <Layout>
      <div className="page-title">
        <span className="eyebrow">SMART PLANNING</span>

        <h1>Trip Planner</h1>

        <p>
          Estimate whether your current battery is enough and identify
          charging options.
        </p>
      </div>

      <div className="planner-layout">
        <div className="card form">
          <label>
            Battery level <b>{battery}%</b>

            <input
              type="range"
              min="5"
              max="100"
              value={battery}
              onChange={(e) => setBattery(+e.target.value)}
            />
          </label>

          <label>
            Trip distance <b>{distance} km</b>

            <input
              type="range"
              min="10"
              max="600"
              value={distance}
              onChange={(e) => setDistance(+e.target.value)}
            />
          </label>

          <label>
            Vehicle range <b>{range} km</b>

            <input
              type="range"
              min="100"
              max="600"
              value={range}
              onChange={(e) => setRange(+e.target.value)}
            />
          </label>
        </div>

        <div className={`result card ${need ? 'warning' : 'safe'}`}>
          <span className="eyebrow">RANGE CHECK</span>

          <h2>
            {need
              ? 'Charging stop recommended'
              : 'Current range covers this trip'}
          </h2>

          <p>
            Estimated range now: <b>{Math.round(currentRange)} km</b> · Trip:{' '}
            <b>{distance} km</b>
          </p>

          <Link className="btn" to="/stations">
            Compare chargers
          </Link>
        </div>
      </div>

      <section>
        <h2>Suggested stations</h2>

        <div className="grid">
          {picks.map((s) => (
            <StationCard key={s._id} s={s} />
          ))}
        </div>
      </section>
    </Layout>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/stations" element={<Stations />} />
      <Route path="/stations/:id" element={<StationDetails />} />
      <Route path="/planner" element={<Planner />} />
    </Routes>
  );
}