const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Search any place in India (free OpenStreetMap Nominatim service)
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search failed');
  const rows = await res.json();
  return rows.map((r) => ({ lat: +r.lat, lng: +r.lon, label: r.display_name.split(',').slice(0, 3).join(',').trim() }));
}

// Driving route between two points (free OSRM demo server). Falls back to a straight line.
export async function getRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('route');
    const data = await res.json();
    const r = data.routes?.[0];
    if (!r) throw new Error('route');
    return { path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), km: r.distance / 1000, minutes: r.duration / 60, straight: false };
  } catch {
    const km = haversineKm(from, to) * 1.25; // rough road factor
    return { path: [[from.lat, from.lng], [to.lat, to.lng]], km, minutes: (km / 55) * 60, straight: true };
  }
}

// Cumulative distance along a path, in km
export function cumulative(path) {
  const out = [0];
  for (let i = 1; i < path.length; i++) {
    out.push(out[i - 1] + haversineKm({ lat: path[i - 1][0], lng: path[i - 1][1] }, { lat: path[i][0], lng: path[i][1] }));
  }
  return out;
}

// Evenly spaced sample points (about every `stepKm`) for querying stations near a route
export function samplePath(path, cum, stepKm = 20, max = 70) {
  const total = cum[cum.length - 1] || 0;
  const step = Math.max(stepKm, total / max);
  const pts = [path[0]];
  let next = step;
  for (let i = 1; i < path.length; i++) {
    if (cum[i] >= next) { pts.push(path[i]); next += step; }
  }
  pts.push(path[path.length - 1]);
  return pts;
}

// For a station: how far along the route it is, and how far off the route
export function locateOnRoute(station, path, cum) {
  const p = { lat: station.latitude, lng: station.longitude };
  let best = Infinity, idx = 0;
  const stride = path.length > 4000 ? 2 : 1;
  for (let i = 0; i < path.length; i += stride) {
    const d = haversineKm(p, { lat: path[i][0], lng: path[i][1] });
    if (d < best) { best = d; idx = i; }
  }
  return { routeKm: cum[idx], offKm: best };
}

// Simple, explainable "how good is this stop" score (0-100)
export function scoreStation(s) {
  const power = Math.min(s.power || 0, 150) / 150;
  const queue = 1 - Math.min(s.queue || 0, 15) / 15;
  const price = 1 - Math.min(Math.max((s.price || 15) - 10, 0), 15) / 15;
  const rel = (s.reliability || 0) / 100;
  const open = s.status === 'Offline' ? 0 : s.status === 'Busy' ? 0.6 : 1;
  return Math.round((rel * 0.35 + power * 0.25 + queue * 0.15 + price * 0.1 + open * 0.15) * 100);
}
