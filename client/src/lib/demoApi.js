import { stations as seedStations } from '../../../server/data/stations.js';
import { haversineKm } from './geo.js';

const stations = seedStations.map((station, index) => ({
  ...station,
  _id: String(index + 1).padStart(24, '0'),
}));

const REPORTS_KEY = 'evcharge:demo-reports';

function readReports() {
  const value = JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
  if (!Array.isArray(value)) throw new Error('Stored demo reports have an invalid format.');
  return value;
}

function fail(status, message) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  throw error;
}

function getStations(params = {}) {
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
  const radiusKm = Number(params.radiusKm);
  const query = String(params.q || '').trim().slice(0, 60).toLowerCase();
  const connectors = params.connector ? String(params.connector).split(',') : [];
  const statuses = params.status ? String(params.status).split(',') : [];

  const results = stations
    .filter((station) => !query || [station.name, station.city, station.address].some((value) => value.toLowerCase().includes(query)))
    .filter((station) => !connectors.length || connectors.some((connector) => station.connectors.includes(connector)))
    .filter((station) => !statuses.length || statuses.includes(station.status))
    .filter((station) => !params.type || station.type === params.type)
    .filter((station) => !params.minPower || station.power >= Number(params.minPower))
    .filter((station) => !params.maxPrice || station.price <= Number(params.maxPrice))
    .map((station) => hasLocation
      ? {
          ...station,
          distanceKm: Math.round(haversineKm({ lat, lng }, { lat: station.latitude, lng: station.longitude }) * 10) / 10,
        }
      : station)
    .filter((station) => !hasLocation || !Number.isFinite(radiusKm) || radiusKm <= 0 || station.distanceKm <= radiusKm)
    .sort(hasLocation
      ? (a, b) => a.distanceKm - b.distanceKm
      : (a, b) => b.reliability - a.reliability);

  return results.slice(0, Math.min(Math.max(Number(params.limit) || 100, 1), 300));
}

function getStation(id) {
  const station = stations.find((item) => item._id === id);
  if (!station) fail(404, 'Station not found');
  return station;
}

export const demoApi = {
  async get(path, config = {}) {
    const id = path.match(/^\/stations\/([^/]+)$/)?.[1];
    if (path === '/stations') return { data: getStations(config.params) };
    if (id) return { data: getStation(id) };

    const reportId = path.match(/^\/stations\/([^/]+)\/reports$/)?.[1];
    if (reportId) {
      getStation(reportId);
      return { data: readReports().filter((report) => report.stationId === reportId).slice(0, 30) };
    }

    fail(404, 'Not found');
  },

  async post(path, body = {}) {
    if (path === '/stations/along') {
      const points = Array.isArray(body.points) ? body.points.slice(0, 80) : [];
      const validPoints = points
        .filter((point) => Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1])))
        .map(([pointLat, pointLng]) => ({ lat: Number(pointLat), lng: Number(pointLng) }))
        .filter((point) => Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180);
      if (!validPoints.length) fail(400, 'points must be an array of [lat, lng]');

      const radiusKm = Math.min(Math.max(Number(body.radiusKm) || 15, 1), 50);
      const result = stations.filter((station) => validPoints.some((point) =>
        haversineKm(point, { lat: station.latitude, lng: station.longitude }) <= radiusKm
      ));
      return { data: result.slice(0, 300) };
    }

    const id = path.match(/^\/stations\/([^/]+)\/reports$/)?.[1];
    if (id) {
      getStation(id);
      const allowedTypes = ['Charger not working', 'Price is incorrect', 'Long queue', 'Working fine'];
      if (!allowedTypes.includes(body.type)) fail(400, 'Unknown report type');
      if (typeof body.message !== 'string' || !body.message.trim()) fail(400, 'A report message is required');
      if (body.message.length > 500) fail(400, 'Report message must be 500 characters or fewer');

      const reports = readReports();
      const report = {
        _id: globalThis.crypto.randomUUID(),
        stationId: id,
        type: body.type,
        message: body.message.trim(),
        createdAt: new Date().toISOString(),
      };
      reports.unshift(report);
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
      return { data: { message: 'Report submitted successfully', report } };
    }

    fail(404, 'Not found');
  },
};
