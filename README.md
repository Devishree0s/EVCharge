# EVCharge

An India-focused EV charging companion for finding dependable stops in city
neighbourhoods and on intercity corridors. It combines station search, a
status-aware map, driver reports, and a battery-aware trip planner.

The bundled dataset contains sample stations around major Indian cities and
highways. Station availability, pricing, reliability, and queues are illustrative,
not live charger data.

## What works

- Search by city or area, use browser location, and filter by connector, power,
  availability, and distance.
- Compare stations by proximity, reliability, charging speed, and price.
- Open station details, get directions, and submit driver reports.
- Plan a route with an estimated battery reserve and see reachable charging stops.
- Run the complete API and website locally without a database account.

## Run locally

Requires Node.js 20.19+ or 22.12+.

Start the API in one terminal:

```powershell
cd server
npm install
npm start
```

Start the website in a second terminal:

```powershell
cd client
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The API is at
`http://localhost:4000`; check `http://localhost:4000/api/health` to see whether
it is running in demo or MongoDB mode.

With no `MONGODB_URI`, the API serves the bundled stations directly in memory.
Driver reports work for the demo and are cleared when the API restarts. To use
persistent stations and reports, copy `server/.env.example` to `server/.env`,
set `MONGODB_URI`, and restart the API. MongoDB mode automatically seeds an empty
database unless `AUTO_SEED=false`. To reset its station data manually, run
`npm run seed` from `server`.

The route planner uses public OpenStreetMap Nominatim and OSRM services. If the
routing service is unavailable, it labels the straight-line estimate in the UI.
Location search and map tiles require internet access.

## Deploy

The included GitHub Actions workflow publishes the Vite website to GitHub Pages
whenever you push to `main`. With no `VITE_API_URL` configured, the deployed
website uses the bundled sample stations; driver reports are saved in that
browser. This standalone mode needs no API host or database.

To use the Express API instead, deploy it separately with the Render Blueprint
in `render.yaml`, then set the GitHub Actions repository variable `VITE_API_URL`
to `https://<your-api-host>/api`. MongoDB is optional; without `MONGODB_URI`
the hosted API serves demo data and keeps reports in memory until restart.

Enable GitHub Pages with **GitHub Actions** as its source. After the first
successful workflow run, the site is available at
`https://devishree0s.github.io/EVCharge/`.

The API defaults to allowing cross-origin requests for a straightforward demo.
For a restricted deployment, set `CLIENT_ORIGIN` to the exact website origin(s),
comma-separated.

## Optional real station locations

The sample values are not real-time data. To import location and connector data
from Open Charge Map, get an API key at
<https://openchargemap.org/site/develop/api>, set `OCM_API_KEY` and
`MONGODB_URI` in `server/.env`, then run `npm run import:ocm` from `server`.
This replaces earlier Open Charge Map imports only; it does not create live
pricing, queue, or reliability information.
