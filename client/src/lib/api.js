import axios from 'axios';
import { demoApi } from './demoApi.js';

const configuredBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000/api' : '');
const base = configuredBase.replace(/\/$/, '');
export const api = base ? axios.create({ baseURL: base, timeout: 20000 }) : demoApi;

// Friendly message for the typical "backend asleep / not running" situation
export function errorText(err, fallback = 'Something went wrong.') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED')
    return 'Cannot reach the server. If it was idle it may take up to a minute to wake up – please try again.';
  return fallback;
}
