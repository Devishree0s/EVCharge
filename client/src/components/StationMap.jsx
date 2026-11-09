import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';

const COLORS = { Available: '#1f9d63', Busy: '#e0a100', Offline: '#c0392b' };

// Coloured dot markers (no image files needed, so they work in any build)
const icons = {};
function iconFor(status, highlight) {
  const key = `${status}-${highlight}`;
  if (!icons[key]) {
    icons[key] = L.divIcon({
      className: 'ev-pin-wrap',
      html: `<span class="ev-pin ${highlight ? 'hl' : ''}" style="background:${COLORS[status] || COLORS.Available}">⚡</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14],
    });
  }
  return icons[key];
}

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [JSON.stringify(points)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// stations: array, user: {lat,lng}, route: [[lat,lng],...], highlightId: station _id
export default function StationMap({ stations = [], user, route, highlightId, height = 420, extra = [] }) {
  const mappableStations = stations.filter((station) =>
    Number.isFinite(station.latitude) &&
    Number.isFinite(station.longitude) &&
    Math.abs(station.latitude) <= 90 &&
    Math.abs(station.longitude) <= 180
  );
  const pts = [
    ...mappableStations.map((s) => [s.latitude, s.longitude]),
    ...(user ? [[user.lat, user.lng]] : []),
    ...extra.map((p) => [p.lat, p.lng]),
    ...(route || []).filter((_, i, a) => i % Math.ceil(a.length / 60 || 1) === 0),
  ];
  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={[22.5, 79]} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={pts} />
        {route && route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#10211b', weight: 5, opacity: 0.75 }} />}
        {mappableStations.map((s) => (
          <Marker key={s._id} position={[s.latitude, s.longitude]} icon={iconFor(s.status, s._id === highlightId)}>
            <Popup>
              <b>{s.name}</b><br />
              {s.power} kW · ₹{s.price}/kWh · {s.status}<br />
              {s.distanceKm != null && <>{s.distanceKm} km away<br /></>}
              <Link to={`/stations/${s._id}`}>View details</Link>
            </Popup>
          </Marker>
        ))}
        {user && <CircleMarker center={[user.lat, user.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>You are here</Popup></CircleMarker>}
        {extra.map((p, i) => (
          <CircleMarker key={i} center={[p.lat, p.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: p.color || '#10211b', fillOpacity: 1 }}><Popup>{p.label}</Popup></CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
