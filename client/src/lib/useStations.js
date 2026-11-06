import { useEffect, useState } from 'react';
import { api, errorText } from './api.js';

// Fetches stations from the API whenever params change (debounced a little for typing).
export function useStations(params, delay = 250) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/stations', { params })
        .then((r) => { if (!cancelled) { setData(r.data); setError(''); } })
        .catch((e) => { if (!cancelled) { setError(errorText(e, 'Could not load stations.')); setData([]); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, delay);
    return () => { cancelled = true; clearTimeout(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stations: data, loading, error };
}
