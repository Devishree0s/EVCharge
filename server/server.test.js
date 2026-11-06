import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.MONGODB_URI = '';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
const { default: app, validateProductionConfig } = await import('./server.js');

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('health reports the no-database demo mode', async () => {
  const response = await fetch(`${base}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, 'demo');
  assert.equal(body.db, 'not_required');
  assert.equal(body.ok, true);
});

test('production startup requires Atlas and the Vercel origin', () => {
  assert.throws(
    () => validateProductionConfig({ NODE_ENV: 'production', PORT: '10000', CLIENT_ORIGIN: 'https://evcharge.vercel.app' }),
    /MONGODB_URI is required in production/
  );
  assert.throws(
    () => validateProductionConfig({ NODE_ENV: 'production', PORT: '10000', MONGODB_URI: 'mongodb://localhost/db' }),
    /CLIENT_ORIGIN is required in production/
  );
  assert.throws(
    () => validateProductionConfig({ NODE_ENV: 'production', PORT: '10000', MONGODB_URI: 'mongodb://localhost/db', CLIENT_ORIGIN: 'https://evcharge.vercel.app/path' }),
    /without paths/
  );
  assert.deepEqual(
    validateProductionConfig({
      NODE_ENV: 'production',
      PORT: '10000',
      MONGODB_URI: 'mongodb://localhost/db',
      CLIENT_ORIGIN: 'https://evcharge.vercel.app,https://evcharge.example.com',
    }),
    { port: 10000 }
  );
  assert.throws(() => validateProductionConfig({ PORT: 'not-a-port' }), /PORT must be an integer/);
});

test('CORS allows the configured frontend origin', async () => {
  const response = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:5173' } });

  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

test('MongoDB mode reports unhealthy until the database connection is ready', async () => {
  const previous = {
    MONGODB_URI: process.env.MONGODB_URI,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
    NODE_ENV: process.env.NODE_ENV,
  };
  let productionServer;

  try {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/evcharge_health_test';
    process.env.CLIENT_ORIGIN = 'https://evcharge.vercel.app';
    process.env.NODE_ENV = 'production';
    const { default: productionApp } = await import('./server.js?production-health-test');
    productionServer = productionApp.listen(0);
    await new Promise((resolve) => productionServer.once('listening', resolve));

    const response = await fetch(`http://127.0.0.1:${productionServer.address().port}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.mode, 'mongodb');
    assert.equal(body.db, 'disconnected');
  } finally {
    if (productionServer) {
      await new Promise((resolve, reject) => {
        productionServer.close((error) => error ? reject(error) : resolve());
      });
    }
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('station search supports text, connector, power, and result limits', async () => {
  const response = await fetch(`${base}/stations?q=Mumbai&connector=CCS2&minPower=30&limit=5`);
  const stations = await response.json();

  assert.equal(response.status, 200);
  assert.ok(stations.length > 0 && stations.length <= 5);
  assert.ok(stations.every((station) => /Mumbai/i.test(`${station.name} ${station.city} ${station.address}`)));
  assert.ok(stations.every((station) => station.connectors.includes('CCS2') && station.power >= 30));
});

test('nearby search returns the closest station and its distance', async () => {
  const response = await fetch(`${base}/stations?lat=12.9716&lng=77.5946&radiusKm=10&limit=5`);
  const stations = await response.json();

  assert.equal(response.status, 200);
  assert.equal(stations[0].name, 'GreenVolt Central');
  assert.equal(stations[0].distanceKm, 0);
});

test('route search returns stations near valid route points', async () => {
  const response = await fetch(`${base}/stations/along`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points: [[12.9716, 77.5946]], radiusKm: 10 }),
  });
  const stations = await response.json();

  assert.equal(response.status, 200);
  assert.ok(stations.length > 0);
  assert.ok(stations.some((station) => station.name === 'GreenVolt Central'));
});

test('station details resolve seeded identifiers and unknown identifiers return 404', async () => {
  const list = await fetch(`${base}/stations?limit=1`).then((response) => response.json());
  const found = await fetch(`${base}/stations/${list[0]._id}`);
  const missing = await fetch(`${base}/stations/not-a-station`);

  assert.equal(found.status, 200);
  assert.equal((await found.json())._id, list[0]._id);
  assert.equal(missing.status, 404);
});

test('driver reports can be submitted and retrieved, while invalid reports are rejected', async () => {
  const stations = await fetch(`${base}/stations?lat=12.9716&lng=77.5946&limit=1`).then((response) => response.json());
  const stationId = stations[0]._id;
  const submitted = await fetch(`${base}/stations/${stationId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'Charger not working', message: 'Test report' }),
  });
  const reportResponse = await fetch(`${base}/stations/${stationId}/reports`);
  const reports = await reportResponse.json();
  const invalid = await fetch(`${base}/stations/${stationId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'Not a valid report', message: 'Test report' }),
  });

  assert.equal(submitted.status, 201);
  assert.equal(reportResponse.status, 200);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].message, 'Test report');
  assert.equal(invalid.status, 400);
});
