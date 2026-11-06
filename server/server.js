import dns from 'dns';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import Station from './models/Station.js';
import Report from './models/Report.js';
import { stations as seedData } from './data/stations.js';

dotenv.config();

// Some home networks cannot resolve MongoDB Atlas "mongodb+srv" records. This keeps your
// local fix, but is skipped on the hosting platform (NODE_ENV=production).
if (process.env.NODE_ENV !== 'production') dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = process.env.PORT || 4000;
const app = express();
app.set('trust proxy', 1);
app.use(helmet());

const demoMode = !process.env.MONGODB_URI;
const demoStations = seedData.map((station, index) => ({
  ...station,
  _id: String(index + 1).padStart(24, '0'),
}));
const demoReports = [];

const allowed = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));
const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many reports. Please try again later.' } });

// ---------- helpers ----------
const num = (v) => (v === undefined || v === '' || v === null ? NaN : Number(v));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validCoords = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const haversineKm = (a, b) => {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
};

function buildFilter(q) {
  const f = {};
  if (q.connector) f.connectors = { $in: String(q.connector).split(',') };
  if (q.status) f.status = { $in: String(q.status).split(',') };
  if (q.type && ['Urban', 'Highway'].includes(q.type)) f.type = q.type;
  if (Number.isFinite(num(q.minPower))) f.power = { $gte: num(q.minPower) };
  if (Number.isFinite(num(q.maxPrice))) f.price = { $lte: num(q.maxPrice) };
  if (q.q && String(q.q).trim()) {
    const rx = new RegExp(escapeRegex(String(q.q).trim().slice(0, 60)), 'i');
    f.$or = [{ name: rx }, { city: rx }, { address: rx }];
  }
  return f;
}

app.use('/api/stations', (req, res, next) => {
  if (!demoMode && mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Database is not connected yet. Try again in a few seconds.' });
  next();
});

// ---------- routes ----------
app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    service: 'EVCharge API',
    mode: demoMode ? 'demo' : 'mongodb',
    db: demoMode ? 'not_required' : mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
);

// GET /api/stations?lat=&lng=&radiusKm=&connector=&status=&minPower=&maxPrice=&type=&q=&limit=
// With lat/lng the result is sorted nearest-first and each station gets distanceKm.
app.get('/api/stations', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
    const filter = buildFilter(req.query);
    const lat = num(req.query.lat);
    const lng = num(req.query.lng);

    if (demoMode) {
      const rx = filter.$or ? new RegExp(escapeRegex(String(req.query.q).trim().slice(0, 60)), 'i') : null;
      let rows = demoStations.filter((station) => {
        if (filter.connectors && !station.connectors.some((connector) => filter.connectors.$in.includes(connector))) return false;
        if (filter.status && !filter.status.$in.includes(station.status)) return false;
        if (filter.type && station.type !== filter.type) return false;
        if (filter.power && station.power < filter.power.$gte) return false;
        if (filter.price && station.price > filter.price.$lte) return false;
        if (rx && ![station.name, station.city, station.address].some((value) => rx.test(value || ''))) return false;
        return true;
      });

      if (validCoords(lat, lng)) {
        const radiusKm = num(req.query.radiusKm);
        rows = rows
          .map((station) => ({
            ...station,
            distanceKm: Math.round(haversineKm({ lat, lng }, { lat: station.latitude, lng: station.longitude }) * 10) / 10,
          }))
          .filter((station) => !Number.isFinite(radiusKm) || radiusKm <= 0 || station.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);
      } else {
        rows.sort((a, b) => b.reliability - a.reliability);
      }
      return res.json(rows.slice(0, limit));
    }

    if (validCoords(lat, lng)) {
      const radiusKm = num(req.query.radiusKm);
      const geo = {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance', // metres
        spherical: true,
        query: filter,
      };
      if (Number.isFinite(radiusKm) && radiusKm > 0) geo.maxDistance = radiusKm * 1000;
      const rows = await Station.aggregate([{ $geoNear: geo }, { $limit: limit }]);
      return res.json(rows.map((s) => ({ ...s, distanceKm: Math.round((s.distance / 1000) * 10) / 10 })));
    }

    res.json(await Station.find(filter).sort({ reliability: -1 }).limit(limit).lean());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// POST /api/stations/along  { points: [[lat,lng],...], radiusKm }  -> stations near a route
app.post('/api/stations/along', async (req, res) => {
  try {
    const pts = Array.isArray(req.body?.points) ? req.body.points.slice(0, 80) : [];
    const radiusKm = Math.min(Math.max(num(req.body?.radiusKm) || 15, 1), 50);
    const clauses = pts
      .filter((p) => Array.isArray(p) && validCoords(Number(p[0]), Number(p[1])))
      .map(([lat, lng]) => ({ location: { $geoWithin: { $centerSphere: [[Number(lng), Number(lat)], radiusKm / 6378.1] } } }));
    if (!clauses.length) return res.status(400).json({ error: 'points must be an array of [lat, lng]' });
    if (demoMode) {
      const points = pts
        .filter((p) => Array.isArray(p) && validCoords(Number(p[0]), Number(p[1])))
        .map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
      const rows = demoStations.filter((station) => points.some((point) =>
        haversineKm(point, { lat: station.latitude, lng: station.longitude }) <= radiusKm
      ));
      return res.json(rows.slice(0, 300));
    }
    res.json(await Station.find({ $or: clauses }).limit(300).lean());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch stations along route' });
  }
});

app.get('/api/stations/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Station not found' });
    if (demoMode) {
      const station = demoStations.find((item) => item._id === req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      return res.json(station);
    }
    const s = await Station.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ error: 'Station not found' });
    res.json(s);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

const REPORT_TYPES = ['Charger not working', 'Price is incorrect', 'Long queue', 'Working fine'];

app.post('/api/stations/:id/reports', reportLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Station not found' });
    const { type, message } = req.body || {};
    if (!REPORT_TYPES.includes(type)) return res.status(400).json({ error: 'Unknown report type' });
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'A report message is required' });
    if (message.length > 500) return res.status(400).json({ error: 'Report message must be 500 characters or fewer' });
    if (demoMode) {
      const station = demoStations.find((item) => item._id === req.params.id);
      if (!station) return res.status(404).json({ error: 'Station not found' });
      const report = {
        _id: new mongoose.Types.ObjectId().toString(),
        stationId: station._id,
        type,
        message: message.trim(),
        createdAt: new Date().toISOString(),
      };
      demoReports.unshift(report);
      return res.status(201).json({ message: 'Report submitted successfully', report });
    }
    const s = await Station.findById(req.params.id).select('_id');
    if (!s) return res.status(404).json({ error: 'Station not found' });
    const report = await Report.create({ stationId: s._id, type, message: message.trim() });
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

app.get('/api/stations/:id/reports', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Station not found' });
    if (demoMode) {
      const stationExists = demoStations.some((item) => item._id === req.params.id);
      if (!stationExists) return res.status(404).json({ error: 'Station not found' });
      return res.json(demoReports.filter((report) => report.stationId === req.params.id).slice(0, 30));
    }
    res.json(await Report.find({ stationId: req.params.id }).sort({ createdAt: -1 }).limit(30).lean());
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

// ---------- start ----------
export async function start() {
  app.listen(PORT, () => console.log(`EVCharge API running on port ${PORT}`));
  if (demoMode) return console.log(`Demo mode enabled with ${demoStations.length} sample stations; reports last until the server restarts.`);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    await Station.syncIndexes(); // makes sure the 2dsphere index exists
    if (process.env.AUTO_SEED !== 'false' && (await Station.estimatedDocumentCount()) === 0) {
      await Station.insertMany(seedData);
      console.log(`Database was empty – seeded ${seedData.length} demo stations`);
    }
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
  }
}

export default app;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
