import axios from 'axios';
import { supabase } from '../lib/supabase';

// In development, Vite proxies /api → localhost:5001
// In production (Vercel), VITE_BACKEND_URL points to the Render backend
const backendUrl = import.meta.env.VITE_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${backendUrl}/api/v1`,
});

// Dynamically fetch the current Supabase session token for every request
// This ensures we always use the latest (auto-refreshed) token instead of a
// stale localStorage copy.
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Auto-retry on 429 (rate-limited) with exponential backoff
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (error.response?.status === 429 && (!config._retryCount || config._retryCount < 3)) {
    config._retryCount = (config._retryCount || 0) + 1;
    // Use server's Retry-After header or exponential backoff (1s, 2s, 4s)
    const retryAfter = error.response.headers['retry-after'];
    const delay = retryAfter ? Number(retryAfter) * 1000 : 1000 * Math.pow(2, config._retryCount - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    return api(config);
  }
  return Promise.reject(error);
});

export interface ClimateData {
  id: string;
  name: string;
  iso2: string;
  region: string;
  emissions_per_capita: number;     // X-axis
  vulnerability_score: number;      // Y-axis (0-1)
  population: number;               // Radius
  gdp_per_capita: number;           // Raw value
  gdp_quartile: 1 | 2 | 3 | 4;      // Color mapping
  emissions_share_pct: number;      // for Bar chart
  injustice_score: number;          // for Bar chart
  composite_score: number;          // weighted composite of all 5 factors (lower = better)
}

export interface WeatherAlert {
  id: string;
  alert_type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  region: string;
  source_data: any;
  confidence_score: number;
  created_at: string;
}

export interface Initiative {
  id: string;
  country: string;
  iso2: string;
  title: string;
  description: string;
  category: string;
  estimated_completion: string;
  status: 'planned' | 'in-progress' | 'completed';
  source_url?: string;
  
  // Historical data for completed initiatives
  timeline?: { date: string; event: string; impact: number; isNegative?: boolean }[];
  metrics?: {
    before: { label: string; value: string }[];
    after: { label: string; value: string }[];
  };
  evaluation?: {
    summary: string;
    wasHelpful: boolean;
    justiceServed: boolean;
  };
}

export interface AqiData {
  country: string;
  iso2: string;
  city: string;
  aqi: number;
  dominant_pollutant: string;
  lat: number;
  lon: number;
  updated_at: string;
}

export const fetchClimateData = async (): Promise<ClimateData[]> => {
  const { data } = await api.get('/climate/countries');
  return data;
};

export const fetchWeatherAlerts = async (region?: string | null): Promise<WeatherAlert[]> => {
  try {
    const params = region ? { region } : {};
    const { data } = await api.get('/alerts', { params });
    return data;
  } catch (error) {
    // If user is unauthenticated or endpoint not fully configured, return safe empty
    return [];
  }
};

export const fetchInitiatives = async (): Promise<Initiative[]> => {
  try {
    const { data } = await api.get('/climate/initiatives');
    return data;
  } catch {
    return [];
  }
};

export const fetchAqiData = async (): Promise<AqiData[]> => {
  try {
    const { data } = await api.get('/climate/aqi');
    return data;
  } catch {
    return [];
  }
};

export const fetchCountryRegions = async (iso2: string): Promise<any> => {
  try {
    const { data } = await api.get(`/climate/countries/${iso2}/regions`);
    return data;
  } catch {
    return null;
  }
};

export const fetchWeather = async (location: string): Promise<any> => {
  try {
    const { data } = await api.get(`/climate/weather?location=${encodeURIComponent(location)}`);
    return data;
  } catch {
    return null;
  }
};
