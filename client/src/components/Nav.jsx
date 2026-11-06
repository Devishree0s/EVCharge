import React from 'react';
import { NavLink, Link } from 'react-router-dom';

export default function Nav() {
  return (
    <nav>
      <Link to="/" className="brand">⚡ EVCharge</Link>
      <div>
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/stations">Stations</NavLink>
        <NavLink to="/planner">Trip planner</NavLink>
      </div>
    </nav>
  );
}
