# EVCharge Website

Full-stack EV charging discovery and trip-planning website.

## Your only required setup
1. Install Node.js LTS.
2. In `server`, create `.env` from `.env.example` and put your MongoDB connection string in `MONGODB_URI`.
3. Run `npm install` in `server` and `npm install` in `client`.
4. Start backend: `npm start` from `server`.
5. In another terminal start frontend: `npm run dev` from `client`.
6. Open the Vite URL shown in the terminal.
7. Seed the database once: `POST http://localhost:4000/api/seed-stations` (PowerShell: `curl.exe -X POST http://localhost:4000/api/seed-stations`).

## Important
The website uses MongoDB only through the Express backend. Do not put MongoDB credentials in the React client.

## Structure
- `client`: React + Vite website
- `server`: Express + Mongoose API
- `server/models`: MongoDB schemas
