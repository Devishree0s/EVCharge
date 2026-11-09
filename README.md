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

## Deploy to GitHub Pages

The primary live site is `https://devishree0s.github.io/EVCharge/`. On pushes to
`main`, `.github/workflows/deploy-pages.yml` builds and publishes the frontend.
The `VITE_API_URL` build value is intentionally empty so station browsing uses
the sample data bundled with the app instead of calling Render. This avoids
Render CORS or database availability making the GitHub Pages station list
empty. Sample station details are illustrative, not live charging-network data;
driver reports are stored in that browser.

The workflow uses GitHub Pages with the GitHub Actions deployment source. If
Pages has not been configured yet, select **GitHub Actions** in repository
Settings → Pages. After the workflow succeeds, open
`https://devishree0s.github.io/EVCharge/`.

### Optional Render API and MongoDB Atlas

The API can be deployed separately using the Render Blueprint. Create an Atlas
database and user, add the connection string as the Render `MONGODB_URI` secret,
and allow the Render service to connect in Atlas Network Access. Set
`CLIENT_ORIGIN` to the exact frontend origin if a frontend is configured to
call the API, and keep `NODE_ENV=production`. Render supplies `PORT`.
`AUTO_SEED=true` inserts sample stations only when the stations collection is
empty.

After deployment, check
`https://<your-render-service>.onrender.com/api/health`. It reports healthy
only when MongoDB is connected. To connect a frontend to this API, configure
`VITE_API_URL` to `https://<your-render-service>.onrender.com/api` at build time
and add that frontend's exact origin to Render's `CLIENT_ORIGIN`. GitHub Pages
is intentionally built in demo mode and does not need Render to show stations.

### Secrets

Never commit `.env` files, Atlas credentials, or deployment secrets.

## Optional real station locations

The sample values are not real-time data. To import location and connector data
from Open Charge Map, get an API key at
<https://openchargemap.org/site/develop/api>, set `OCM_API_KEY` and
`MONGODB_URI` in `server/.env`, then run `npm run import:ocm` from `server`.
This replaces earlier Open Charge Map imports only; it does not create live
pricing, queue, or reliability information.
