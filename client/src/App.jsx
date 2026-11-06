import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Home from './pages/Home.jsx';
import Stations from './pages/Stations.jsx';
import StationDetails from './pages/StationDetails.jsx';
import Planner from './pages/Planner.jsx';

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/stations/:id" element={<StationDetails />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer>
        <span>⚡ EVCharge</span>
        <span>Map data © OpenStreetMap contributors. Station details shown are sample data until live feeds are connected.</span>
      </footer>
    </>
  );
}
