// Run with:  npm run seed
// Replaces ALL stations (and their reports) with the demo dataset in data/stations.js
import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Station from './models/Station.js';
import Report from './models/Report.js';
import { stations } from './data/stations.js';

dotenv.config();
if (process.env.NODE_ENV !== 'production') dns.setServers(['8.8.8.8', '1.1.1.1']);

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Add it to server/.env');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
await Station.deleteMany({});
await Report.deleteMany({});
await Station.syncIndexes();
await Station.insertMany(stations);
console.log(`Done. ${stations.length} stations saved to MongoDB.`);
await mongoose.disconnect();
