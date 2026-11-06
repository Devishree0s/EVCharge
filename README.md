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

## Deploy with Vercel, Render, and MongoDB Atlas

The frontend is deployed by **Vercel**, the Express API by **Render**, and
persistent station and report data by **MongoDB Atlas**. GitHub Actions runs
tests and a production frontend build; it does not deploy to GitHub Pages.

### 1. Create the MongoDB Atlas database

Create a database user and database, then copy its connection string. Replace
the username, password, and database name in the URI as required. Keep this URI
private; add it only as the Render `MONGODB_URI` environment variable.

In Atlas Network Access, allow connections from Render. Render's free web
services do not have a fixed outbound IP; a broad `0.0.0.0/0` entry is easier
to configure but allows network access attempts from any IP. Use a provider
plan with static outbound IPs and restrict the Atlas allowlist when tighter
network restrictions are required.

### 2. Deploy the API on Render

Create a Render Blueprint from this repository and use the root `render.yaml`.
It creates the API with `server` as its root directory, `npm ci` as the build
command, `npm start` as the start command, and `/api/health` as its health
check. The process listens on Render's injected `PORT`; do not set a fixed
production port.

Set these Blueprint environment variables when prompted:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (set by the Blueprint) |
| `MONGODB_URI` | Atlas connection string (secret; required) |
| `CLIENT_ORIGIN` | Exact Vercel origin, e.g. `https://your-project.vercel.app` (required; no path or trailing route) |
| `AUTO_SEED` | `true` (set by the Blueprint; inserts sample data if the Atlas database is empty) |

After deployment, check `https://<your-render-service>.onrender.com/api/health`.
The health endpoint returns HTTP 200 only after MongoDB is connected. A missing
Atlas URI, invalid Vercel origin, or failed database connection stops the
production service from starting. If a custom Vercel domain is used, set
`CLIENT_ORIGIN` to that exact origin. Multiple allowed origins can be
comma-separated. Add exact preview origins only when needed.

### 3. Deploy the frontend on Vercel

Import the same GitHub repository into Vercel and keep the **project root at the
repository root**. The root `vercel.json` already configures:

- Install command: `npm ci --prefix client`
- Build command: `npm run build --prefix client`
- Output directory: `client/dist`
- SPA fallback rewrite to `index.html`

In Vercel Project Settings → Environment Variables, set `VITE_API_URL` for
Production to `https://<your-render-service>.onrender.com/api`. Add it to Preview
and Development only if those deployments should call the same API. Redeploy
after adding or changing the variable because Vite embeds it at build time.
The frontend uses `VITE_API_URL` for API requests; local development defaults
to `http://localhost:4000/api`, while an unconfigured production build uses the
bundled demo data.

Once Vercel assigns the project domain, update Render's `CLIENT_ORIGIN` to the
exact origin shown in Vercel. Redeploy/restart the Render service after changing
the variable.

### 4. GitHub Actions and GitHub Pages

`.github/workflows/ci.yml` runs backend tests and the frontend production build
on pushes and pull requests to `main`. It does not publish a site. GitHub Pages
is not part of this deployment. If Pages was previously enabled, it continues
to serve its last published version until it is disabled in repository
Settings → Pages. After verifying the Vercel site, disable Pages there so an
old copy is not mistaken for the current site. Do not add a Pages deployment
workflow while using Vercel as the frontend host.

### 5. Secrets

Never commit `.env` files, Atlas credentials, or deployment secrets. Local
`.env` files and Vercel project metadata are excluded from Git. The committed
`.env.example` files contain placeholders only.

## Optional real station locations

The sample values are not real-time data. To import location and connector data
from Open Charge Map, get an API key at
<https://openchargemap.org/site/develop/api>, set `OCM_API_KEY` and
`MONGODB_URI` in `server/.env`, then run `npm run import:ocm` from `server`.
This replaces earlier Open Charge Map imports only; it does not create live
pricing, queue, or reliability information.
