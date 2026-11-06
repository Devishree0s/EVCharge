// Optional: import REAL charging stations for India from Open Charge Map (free API key needed).
//   1. Get a key: https://openchargemap.org/site/develop/api
//   2. Add OCM_API_KEY=... to server/.env
//   3. npm run import:ocm
// Open Charge Map has no live reliability / queue / price data, so those fields get neutral
// placeholder values until real users report. Re-running replaces earlier imports only.
import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Station from './models/Station.js';

dotenv.config();
if (process.env.NODE_ENV !== 'production') dns.setServers(['8.8.8.8', '1.1.1.1']);

const key = process.env.OCM_API_KEY;
if (!key || !process.env.MONGODB_URI) {
  console.error('Set OCM_API_KEY and MONGODB_URI in server/.env first.');
  process.exit(1);
}

const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&maxresults=5000&compact=true&verbose=false&key=${key}`;
const res = await fetch(url);
if (!res.ok) { console.error('Open Charge Map request failed:', res.status); process.exit(1); }
const pois = await res.json();

const mapConnector = (t = '') => {
  const s = t.toLowerCase();
  if (s.includes('ccs')) return 'CCS2';
  if (s.includes('chademo')) return 'CHAdeMO';
  if (s.includes('type 2') || s.includes('mennekes')) return 'Type 2';
  return null;
};

const docs = pois
  .filter((p) => p.AddressInfo?.Latitude && p.AddressInfo?.Longitude)
  .map((p) => {
    const conns = p.Connections || [];
    const power = Math.max(7, ...conns.map((c) => c.PowerKW || 0));
    const connectors = [...new Set(conns.map((c) => mapConnector(c.ConnectionType?.Title)).filter(Boolean))];
    const a = p.AddressInfo;
    const cost = parseFloat(String(p.UsageCost || '').replace(/[^0-9.]/g, ''));
    return {
      name: a.Title || 'EV Charging Station',
      city: a.Town || a.StateOrProvince || '',
      address: [a.AddressLine1, a.Town].filter(Boolean).join(', '),
      operator: p.OperatorInfo?.Title || '',
      power, price: Number.isFinite(cost) && cost > 0 && cost < 100 ? cost : 15,
      reliability: 85, queue: 0,
      status: p.StatusType?.IsOperational === false ? 'Offline' : 'Available',
      connectors: connectors.length ? connectors : ['CCS2'],
      type: power >= 50 ? 'Highway' : 'Urban',
      source: 'openchargemap', externalId: String(p.ID),
      latitude: a.Latitude, longitude: a.Longitude,
      location: { type: 'Point', coordinates: [a.Longitude, a.Latitude] },
    };
  });

await mongoose.connect(process.env.MONGODB_URI);
await Station.deleteMany({ source: 'openchargemap' });
await Station.insertMany(docs, { ordered: false });
console.log(`Imported ${docs.length} real stations from Open Charge Map.`);
await mongoose.disconnect();
