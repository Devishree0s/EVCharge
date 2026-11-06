import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);
const KEY = 'evcharge:location';

export function LocationProvider({ children }) {
  const [loc, setLoc] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try { loc ? localStorage.setItem(KEY, JSON.stringify(loc)) : localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, [loc]);

  const locate = useCallback(() => {
    setError('');
    if (!navigator.geolocation) return setError('Your browser does not support location.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'My location', gps: true });
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setError(err.code === 1 ? 'Location permission was denied. Search for your area instead.' : 'Could not get your location. Search for your area instead.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  const value = { loc, setLoc, clear: () => setLoc(null), locate, busy, error, setError };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLoc = () => useContext(Ctx);
