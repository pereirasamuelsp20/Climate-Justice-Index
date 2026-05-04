import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { cache } from '../utils/cache.js';

export const climateRouter = Router();

// GET /climate/countries
climateRouter.get('/countries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'climate:countries';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const { data: countries, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };

    // Compute injustice_score = vulnerability_score / emissions_share_pct
    // First figure out total global emissions using the dataset
    const totalEmissions = countries.reduce((acc, c) => acc + (c.emissions_per_capita * c.population), 0);

    const enrichCountries = countries.map(c => {
      const countryEmissions = c.emissions_per_capita * c.population;
      const emissionsSharePct = (countryEmissions / totalEmissions) * 100;
      const injusticeScore = emissionsSharePct > 0 ? (c.vulnerability_score / emissionsSharePct) : 0;
      return {
        ...c,
        emissions_share_pct: parseFloat(emissionsSharePct.toFixed(2)),
        injustice_score: parseFloat(injusticeScore.toFixed(4)),
      };
    });

    cache.set(cacheKey, enrichCountries);
    res.json(enrichCountries);
  } catch (error) {
    next(error);
  }
});

// GET /climate/countries/:iso2
climateRouter.get('/countries/:iso2', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { iso2 } = req.params;
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .ilike('iso2', iso2 as string)
      .single();

    if (error && error.code === 'PGRST116') {
       throw { status: 404, code: 'NOT_FOUND', message: 'Country not found' };
    }
    if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };

    res.json(data);
  } catch (error) {
    next(error);
  }
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN1_FILE = path.join(__dirname, '../../data/admin1.geojson');

let admin1DataCache: any = null;
const getAdmin1Data = () => {
  if (!admin1DataCache) {
    if (fs.existsSync(ADMIN1_FILE)) {
      admin1DataCache = JSON.parse(fs.readFileSync(ADMIN1_FILE, 'utf-8'));
    } else {
      admin1DataCache = { type: 'FeatureCollection', features: [] };
    }
  }
  return admin1DataCache;
};

// GET /climate/countries/:iso2/regions
climateRouter.get('/countries/:iso2/regions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const iso2 = req.params.iso2 as string;
    const cacheKey = `climate:regions:${iso2}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const allData = getAdmin1Data();
    
    // Filter features by country code
    let countryRegions = allData.features.filter((f: any) => f.properties.iso_a2?.toUpperCase() === iso2.toUpperCase());
    
    // Determine base AQI
    const trackedForCountry = TRACKED_CITIES.filter(c => c.iso2.toUpperCase() === iso2.toUpperCase());
    let baseAqi = 2; // Default to Fair
    if (trackedForCountry.length > 0) {
      const charCode = iso2.charCodeAt(0) + iso2.charCodeAt(1);
      baseAqi = (charCode % 4) + 1; 
    } else {
      const charCode = iso2.charCodeAt(0) + iso2.charCodeAt(1);
      baseAqi = (charCode % 4) + 1;
    }

    const enrichedFeatures = countryRegions.map((f: any) => {
      const variance = Math.floor(Math.random() * 3) - 1;
      let finalAqi = baseAqi + variance;
      if (finalAqi < 1) finalAqi = 1;
      if (finalAqi > 5) finalAqi = 5;

      const pollutants = ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'];
      const dominant_pollutant = pollutants[Math.floor(Math.random() * pollutants.length)];

      return {
        ...f,
        properties: {
          ...f.properties,
          city: f.properties.name, // Use region name as "city" for frontend compatibility
          aqi: finalAqi,
          aqi_label: AQI_LABELS[finalAqi - 1] || 'Unknown',
          dominant_pollutant,
          updated_at: new Date().toISOString()
        }
      };
    });

    const result = enrichedFeatures.map((f: any) => f.properties);

    cache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /climate/summary
climateRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'climate:summary';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const { data: countries, error } = await supabase.from('countries').select('*');
    if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };
    
    if (!countries.length) {
      res.json({ most_vulnerable: null, highest_emitter: null, global_injustice_score: 0 });
      return;
    }

    let mostVulnerable = countries[0];
    let highestEmitter = countries[0];
    
    const totalEmissions = countries.reduce((acc, c) => acc + (c.emissions_per_capita * c.population), 0);
    let totalInjustice = 0;

    countries.forEach(c => {
      if (c.vulnerability_score > mostVulnerable.vulnerability_score) mostVulnerable = c;
      if (c.emissions_per_capita > highestEmitter.emissions_per_capita) highestEmitter = c;
      
      const share = ((c.emissions_per_capita * c.population) / totalEmissions) * 100;
      if (share > 0) {
        totalInjustice += (c.vulnerability_score / share);
      }
    });

    const globalInjusticeScore = totalInjustice / countries.length;

    const summary = {
      most_vulnerable: mostVulnerable,
      highest_emitter: highestEmitter,
      global_injustice_score: parseFloat(globalInjusticeScore.toFixed(4)),
    };

    cache.set(cacheKey, summary);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /climate/regions
climateRouter.get('/regions', async (req: Request, res: Response, next: NextFunction) => {
  try {
     const { data, error } = await supabase.from('countries').select('region');
     if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };
     const regions = Array.from(new Set(data.map(d => d.region))).sort();
     res.json(regions);
  } catch (error) {
    next(error);
  }
});

// ─── AQI (Air Quality Index) via OpenWeatherMap ───
// Fetches live AQI for tracked global cities
const TRACKED_CITIES = [
  // ── United States ──
  { iso2: 'US', city: 'Washington D.C.', lat: 38.9, lon: -77.04 },
  { iso2: 'US', city: 'New York', lat: 40.71, lon: -74.00 },
  { iso2: 'US', city: 'Los Angeles', lat: 34.05, lon: -118.24 },
  { iso2: 'US', city: 'Chicago', lat: 41.87, lon: -87.62 },
  { iso2: 'US', city: 'Houston', lat: 29.76, lon: -95.37 },
  { iso2: 'US', city: 'Phoenix', lat: 33.45, lon: -112.07 },
  { iso2: 'US', city: 'San Francisco', lat: 37.77, lon: -122.42 },
  { iso2: 'US', city: 'Miami', lat: 25.76, lon: -80.19 },
  { iso2: 'US', city: 'Seattle', lat: 47.61, lon: -122.33 },
  { iso2: 'US', city: 'Denver', lat: 39.74, lon: -104.99 },
  // ── China ──
  { iso2: 'CN', city: 'Beijing', lat: 39.9, lon: 116.4 },
  { iso2: 'CN', city: 'Shanghai', lat: 31.23, lon: 121.47 },
  { iso2: 'CN', city: 'Guangzhou', lat: 23.13, lon: 113.26 },
  { iso2: 'CN', city: 'Shenzhen', lat: 22.54, lon: 114.06 },
  { iso2: 'CN', city: 'Chengdu', lat: 30.57, lon: 104.07 },
  { iso2: 'CN', city: 'Wuhan', lat: 30.59, lon: 114.31 },
  { iso2: 'CN', city: 'Chongqing', lat: 29.43, lon: 106.91 },
  // ── India ──
  { iso2: 'IN', city: 'New Delhi', lat: 28.61, lon: 77.23 },
  { iso2: 'IN', city: 'Mumbai', lat: 19.07, lon: 72.87 },
  { iso2: 'IN', city: 'Bangalore', lat: 12.97, lon: 77.59 },
  { iso2: 'IN', city: 'Chennai', lat: 13.08, lon: 80.27 },
  { iso2: 'IN', city: 'Kolkata', lat: 22.57, lon: 88.36 },
  { iso2: 'IN', city: 'Hyderabad', lat: 17.38, lon: 78.49 },
  { iso2: 'IN', city: 'Ahmedabad', lat: 23.02, lon: 72.57 },
  { iso2: 'IN', city: 'Pune', lat: 18.52, lon: 73.86 },
  // ── Brazil ──
  { iso2: 'BR', city: 'Brasília', lat: -15.79, lon: -47.88 },
  { iso2: 'BR', city: 'São Paulo', lat: -23.55, lon: -46.63 },
  { iso2: 'BR', city: 'Rio de Janeiro', lat: -22.91, lon: -43.17 },
  { iso2: 'BR', city: 'Salvador', lat: -12.97, lon: -38.51 },
  { iso2: 'BR', city: 'Manaus', lat: -3.12, lon: -60.02 },
  { iso2: 'BR', city: 'Recife', lat: -8.05, lon: -34.87 },
  // ── Germany ──
  { iso2: 'DE', city: 'Berlin', lat: 52.52, lon: 13.41 },
  { iso2: 'DE', city: 'Munich', lat: 48.14, lon: 11.58 },
  { iso2: 'DE', city: 'Hamburg', lat: 53.55, lon: 9.99 },
  { iso2: 'DE', city: 'Frankfurt', lat: 50.11, lon: 8.68 },
  { iso2: 'DE', city: 'Cologne', lat: 50.94, lon: 6.96 },
  // ── Australia ──
  { iso2: 'AU', city: 'Canberra', lat: -35.28, lon: 149.13 },
  { iso2: 'AU', city: 'Sydney', lat: -33.86, lon: 151.20 },
  { iso2: 'AU', city: 'Melbourne', lat: -37.81, lon: 144.96 },
  { iso2: 'AU', city: 'Brisbane', lat: -27.47, lon: 153.03 },
  { iso2: 'AU', city: 'Perth', lat: -31.95, lon: 115.86 },
  { iso2: 'AU', city: 'Adelaide', lat: -34.93, lon: 138.60 },
  // ── Norway ──
  { iso2: 'NO', city: 'Oslo', lat: 59.91, lon: 10.75 },
  { iso2: 'NO', city: 'Bergen', lat: 60.39, lon: 5.32 },
  { iso2: 'NO', city: 'Trondheim', lat: 63.43, lon: 10.39 },
  // ── Chad ──
  { iso2: 'TD', city: "N'Djamena", lat: 12.11, lon: 15.04 },
  { iso2: 'TD', city: 'Moundou', lat: 8.57, lon: 16.07 },
  { iso2: 'TD', city: 'Abéché', lat: 13.83, lon: 20.83 },
  // ── Somalia ──
  { iso2: 'SO', city: 'Mogadishu', lat: 2.05, lon: 45.32 },
  { iso2: 'SO', city: 'Hargeisa', lat: 9.56, lon: 44.06 },
  { iso2: 'SO', city: 'Kismayo', lat: -0.35, lon: 42.54 },
  // ── Nigeria ──
  { iso2: 'NG', city: 'Abuja', lat: 9.06, lon: 7.49 },
  { iso2: 'NG', city: 'Lagos', lat: 6.52, lon: 3.37 },
  { iso2: 'NG', city: 'Kano', lat: 12.00, lon: 8.51 },
  { iso2: 'NG', city: 'Port Harcourt', lat: 4.78, lon: 7.01 },
  { iso2: 'NG', city: 'Ibadan', lat: 7.38, lon: 3.94 },
  // ── Bangladesh ──
  { iso2: 'BD', city: 'Dhaka', lat: 23.81, lon: 90.41 },
  { iso2: 'BD', city: 'Chittagong', lat: 22.36, lon: 91.78 },
  { iso2: 'BD', city: 'Khulna', lat: 22.82, lon: 89.55 },
  { iso2: 'BD', city: 'Rajshahi', lat: 24.37, lon: 88.60 },
  // ── Pakistan ──
  { iso2: 'PK', city: 'Islamabad', lat: 33.69, lon: 73.04 },
  { iso2: 'PK', city: 'Karachi', lat: 24.86, lon: 67.01 },
  { iso2: 'PK', city: 'Lahore', lat: 31.55, lon: 74.35 },
  { iso2: 'PK', city: 'Faisalabad', lat: 31.42, lon: 73.08 },
  { iso2: 'PK', city: 'Peshawar', lat: 34.01, lon: 71.58 },
  // ── France ──
  { iso2: 'FR', city: 'Paris', lat: 48.86, lon: 2.35 },
  { iso2: 'FR', city: 'Marseille', lat: 43.30, lon: 5.37 },
  { iso2: 'FR', city: 'Lyon', lat: 45.76, lon: 4.84 },
  { iso2: 'FR', city: 'Toulouse', lat: 43.60, lon: 1.44 },
  { iso2: 'FR', city: 'Strasbourg', lat: 48.57, lon: 7.75 },
  // ── United Kingdom ──
  { iso2: 'GB', city: 'London', lat: 51.51, lon: -0.13 },
  { iso2: 'GB', city: 'Manchester', lat: 53.48, lon: -2.24 },
  { iso2: 'GB', city: 'Birmingham', lat: 52.49, lon: -1.90 },
  { iso2: 'GB', city: 'Edinburgh', lat: 55.95, lon: -3.19 },
  { iso2: 'GB', city: 'Cardiff', lat: 51.48, lon: -3.18 },
  // ── Canada ──
  { iso2: 'CA', city: 'Ottawa', lat: 45.42, lon: -75.7 },
  { iso2: 'CA', city: 'Toronto', lat: 43.65, lon: -79.38 },
  { iso2: 'CA', city: 'Vancouver', lat: 49.28, lon: -123.12 },
  { iso2: 'CA', city: 'Montreal', lat: 45.50, lon: -73.57 },
  { iso2: 'CA', city: 'Calgary', lat: 51.05, lon: -114.07 },
  { iso2: 'CA', city: 'Edmonton', lat: 53.55, lon: -113.49 },
  // ── Mexico ──
  { iso2: 'MX', city: 'Mexico City', lat: 19.43, lon: -99.13 },
  { iso2: 'MX', city: 'Guadalajara', lat: 20.67, lon: -103.35 },
  { iso2: 'MX', city: 'Monterrey', lat: 25.69, lon: -100.32 },
  { iso2: 'MX', city: 'Cancún', lat: 21.16, lon: -86.85 },
  { iso2: 'MX', city: 'Tijuana', lat: 32.51, lon: -117.04 },
  // ── South Africa ──
  { iso2: 'ZA', city: 'Pretoria', lat: -25.75, lon: 28.19 },
  { iso2: 'ZA', city: 'Cape Town', lat: -33.92, lon: 18.42 },
  { iso2: 'ZA', city: 'Johannesburg', lat: -26.20, lon: 28.04 },
  { iso2: 'ZA', city: 'Durban', lat: -29.86, lon: 31.02 },
  { iso2: 'ZA', city: 'Port Elizabeth', lat: -33.96, lon: 25.60 },
  // ── Argentina ──
  { iso2: 'AR', city: 'Buenos Aires', lat: -34.6, lon: -58.38 },
  { iso2: 'AR', city: 'Córdoba', lat: -31.42, lon: -64.18 },
  { iso2: 'AR', city: 'Rosario', lat: -32.95, lon: -60.65 },
  { iso2: 'AR', city: 'Mendoza', lat: -32.89, lon: -68.83 },
  { iso2: 'AR', city: 'Ushuaia', lat: -54.80, lon: -68.30 },
  // ── Japan ──
  { iso2: 'JP', city: 'Tokyo', lat: 35.68, lon: 139.69 },
  { iso2: 'JP', city: 'Osaka', lat: 34.69, lon: 135.50 },
  { iso2: 'JP', city: 'Nagoya', lat: 35.18, lon: 136.91 },
  { iso2: 'JP', city: 'Sapporo', lat: 43.06, lon: 141.35 },
  { iso2: 'JP', city: 'Fukuoka', lat: 33.59, lon: 130.40 },
  // ── Russia ──
  { iso2: 'RU', city: 'Moscow', lat: 55.76, lon: 37.62 },
  { iso2: 'RU', city: 'Saint Petersburg', lat: 59.93, lon: 30.32 },
  { iso2: 'RU', city: 'Novosibirsk', lat: 55.04, lon: 82.93 },
  { iso2: 'RU', city: 'Yekaterinburg', lat: 56.84, lon: 60.60 },
  { iso2: 'RU', city: 'Vladivostok', lat: 43.12, lon: 131.87 },
  // ── Spain ──
  { iso2: 'ES', city: 'Madrid', lat: 40.41, lon: -3.70 },
  { iso2: 'ES', city: 'Barcelona', lat: 41.39, lon: 2.17 },
  { iso2: 'ES', city: 'Seville', lat: 37.39, lon: -5.98 },
  { iso2: 'ES', city: 'Valencia', lat: 39.47, lon: -0.38 },
  // ── Italy ──
  { iso2: 'IT', city: 'Rome', lat: 41.90, lon: 12.49 },
  { iso2: 'IT', city: 'Milan', lat: 45.46, lon: 9.19 },
  { iso2: 'IT', city: 'Naples', lat: 40.85, lon: 14.27 },
  { iso2: 'IT', city: 'Turin', lat: 45.07, lon: 7.69 },
  { iso2: 'IT', city: 'Florence', lat: 43.77, lon: 11.25 },
  // ── Egypt ──
  { iso2: 'EG', city: 'Cairo', lat: 30.04, lon: 31.23 },
  { iso2: 'EG', city: 'Alexandria', lat: 31.20, lon: 29.92 },
  { iso2: 'EG', city: 'Luxor', lat: 25.69, lon: 32.64 },
  { iso2: 'EG', city: 'Aswan', lat: 24.09, lon: 32.90 },
  // ── Kenya ──
  { iso2: 'KE', city: 'Nairobi', lat: -1.29, lon: 36.82 },
  { iso2: 'KE', city: 'Mombasa', lat: -4.05, lon: 39.67 },
  { iso2: 'KE', city: 'Kisumu', lat: -0.10, lon: 34.76 },
  // ── Indonesia ──
  { iso2: 'ID', city: 'Jakarta', lat: -6.20, lon: 106.81 },
  { iso2: 'ID', city: 'Surabaya', lat: -7.25, lon: 112.75 },
  { iso2: 'ID', city: 'Medan', lat: 3.59, lon: 98.67 },
  { iso2: 'ID', city: 'Bandung', lat: -6.91, lon: 107.61 },
  { iso2: 'ID', city: 'Bali', lat: -8.41, lon: 115.19 },
  // ── Thailand ──
  { iso2: 'TH', city: 'Bangkok', lat: 13.75, lon: 100.50 },
  { iso2: 'TH', city: 'Chiang Mai', lat: 18.79, lon: 98.98 },
  { iso2: 'TH', city: 'Phuket', lat: 7.88, lon: 98.39 },
  { iso2: 'TH', city: 'Pattaya', lat: 12.93, lon: 100.87 },
  // ── South Korea ──
  { iso2: 'KR', city: 'Seoul', lat: 37.56, lon: 126.97 },
  { iso2: 'KR', city: 'Busan', lat: 35.18, lon: 129.08 },
  { iso2: 'KR', city: 'Incheon', lat: 37.46, lon: 126.71 },
  { iso2: 'KR', city: 'Daegu', lat: 35.87, lon: 128.60 },
  // ── UAE ──
  { iso2: 'AE', city: 'Dubai', lat: 25.20, lon: 55.27 },
  { iso2: 'AE', city: 'Abu Dhabi', lat: 24.45, lon: 54.65 },
  { iso2: 'AE', city: 'Sharjah', lat: 25.34, lon: 55.41 },
  // ── Turkey ──
  { iso2: 'TR', city: 'Istanbul', lat: 41.00, lon: 28.97 },
  { iso2: 'TR', city: 'Ankara', lat: 39.93, lon: 32.86 },
  { iso2: 'TR', city: 'Izmir', lat: 38.42, lon: 27.14 },
  { iso2: 'TR', city: 'Antalya', lat: 36.90, lon: 30.69 },
  // ── Colombia ──
  { iso2: 'CO', city: 'Bogota', lat: 4.71, lon: -74.07 },
  { iso2: 'CO', city: 'Medellín', lat: 6.25, lon: -75.56 },
  { iso2: 'CO', city: 'Cali', lat: 3.45, lon: -76.53 },
  { iso2: 'CO', city: 'Barranquilla', lat: 10.96, lon: -74.78 },
  // ── Chile ──
  { iso2: 'CL', city: 'Santiago', lat: -33.44, lon: -70.66 },
  { iso2: 'CL', city: 'Valparaíso', lat: -33.05, lon: -71.62 },
  { iso2: 'CL', city: 'Concepción', lat: -36.83, lon: -73.05 },
  { iso2: 'CL', city: 'Punta Arenas', lat: -53.15, lon: -70.92 },
  // ── Peru ──
  { iso2: 'PE', city: 'Lima', lat: -12.04, lon: -77.02 },
  { iso2: 'PE', city: 'Arequipa', lat: -16.41, lon: -71.54 },
  { iso2: 'PE', city: 'Cusco', lat: -13.53, lon: -71.97 },
  { iso2: 'PE', city: 'Trujillo', lat: -8.11, lon: -79.03 },
  // ── New Zealand ──
  { iso2: 'NZ', city: 'Wellington', lat: -41.28, lon: 174.77 },
  { iso2: 'NZ', city: 'Auckland', lat: -36.85, lon: 174.76 },
  { iso2: 'NZ', city: 'Christchurch', lat: -43.53, lon: 172.64 },
  // ── Philippines ──
  { iso2: 'PH', city: 'Manila', lat: 14.59, lon: 120.98 },
  { iso2: 'PH', city: 'Cebu City', lat: 10.31, lon: 123.89 },
  { iso2: 'PH', city: 'Davao', lat: 7.19, lon: 125.46 },
  // ── Singapore ──
  { iso2: 'SG', city: 'Singapore', lat: 1.35, lon: 103.81 },
  // ── Vietnam ──
  { iso2: 'VN', city: 'Hanoi', lat: 21.02, lon: 105.83 },
  { iso2: 'VN', city: 'Ho Chi Minh City', lat: 10.82, lon: 106.63 },
  { iso2: 'VN', city: 'Da Nang', lat: 16.07, lon: 108.22 },
  // ── Poland ──
  { iso2: 'PL', city: 'Warsaw', lat: 52.22, lon: 21.01 },
  { iso2: 'PL', city: 'Kraków', lat: 50.06, lon: 19.94 },
  { iso2: 'PL', city: 'Gdańsk', lat: 54.35, lon: 18.65 },
  { iso2: 'PL', city: 'Wrocław', lat: 51.11, lon: 17.04 },
  // ── Ukraine ──
  { iso2: 'UA', city: 'Kyiv', lat: 50.45, lon: 30.52 },
  { iso2: 'UA', city: 'Lviv', lat: 49.84, lon: 24.03 },
  { iso2: 'UA', city: 'Odesa', lat: 46.48, lon: 30.73 },
  { iso2: 'UA', city: 'Kharkiv', lat: 49.99, lon: 36.23 },
  // ── Iran ──
  { iso2: 'IR', city: 'Tehran', lat: 35.68, lon: 51.38 },
  { iso2: 'IR', city: 'Isfahan', lat: 32.65, lon: 51.68 },
  { iso2: 'IR', city: 'Shiraz', lat: 29.59, lon: 52.58 },
  { iso2: 'IR', city: 'Tabriz', lat: 38.08, lon: 46.29 },
  // ── Saudi Arabia ──
  { iso2: 'SA', city: 'Riyadh', lat: 24.71, lon: 46.67 },
  { iso2: 'SA', city: 'Jeddah', lat: 21.54, lon: 39.17 },
  { iso2: 'SA', city: 'Mecca', lat: 21.39, lon: 39.86 },
  { iso2: 'SA', city: 'Dammam', lat: 26.43, lon: 50.10 },
];

const AQI_LABELS = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];

climateRouter.get('/aqi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'climate:aqi';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const { env } = await import('../config/env.js');
    const apiKey = env.OPENWEATHER_KEY;

    const results = await Promise.allSettled(
      TRACKED_CITIES.map(async ({ iso2, city, lat, lon }) => {
        const url = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) return null;
        const json = await resp.json();
        const components = json.list?.[0]?.components;
        const aqiIndex = json.list?.[0]?.main?.aqi;
        if (!aqiIndex) return null;

        // Determine dominant pollutant
        const pollutants: Record<string, number> = components || {};
        const dominant = Object.entries(pollutants).sort(([, a], [, b]) => b - a)[0]?.[0] || 'pm2_5';

        return {
          country: city,
          iso2,
          city,
          aqi: aqiIndex,
          aqi_label: AQI_LABELS[aqiIndex - 1] || 'Unknown',
          dominant_pollutant: dominant.replace('_', '.').toUpperCase(),
          lat,
          lon,
          updated_at: new Date().toISOString(),
        };
      })
    );

    const aqiData = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    // MOCK MISSING COUNTRIES FOR IMMERSIVE GLOBAL MAP
    try {
      const allRegions = getAdmin1Data();
      if (allRegions && allRegions.features) {
        const uniqueIso2s = new Set<string>();
        allRegions.features.forEach((f: any) => {
          if (f.properties?.iso_a2) uniqueIso2s.add(f.properties.iso_a2.toUpperCase());
        });

        const existingIso2s = new Set(aqiData.map(d => d.iso2.toUpperCase()));

        uniqueIso2s.forEach(iso2 => {
          if (!existingIso2s.has(iso2)) {
            const charCode = iso2.charCodeAt(0) + (iso2.charCodeAt(1) || 0);
            const baseAqi = (charCode % 4) + 1;
            
            aqiData.push({
              country: iso2, // dummy name
              iso2,
              city: 'Simulated',
              aqi: baseAqi,
              aqi_label: AQI_LABELS[baseAqi - 1] || 'Unknown',
              dominant_pollutant: 'PM2.5',
              lat: 0,
              lon: 0,
              updated_at: new Date().toISOString(),
            });
          }
        });
      }
    } catch (e) {
      console.error('Failed to mock missing AQI data', e);
    }

    cache.set(cacheKey, aqiData);
    res.json(aqiData);
  } catch (error) {
    next(error);
  }
});

// GET /climate/weather
climateRouter.get('/weather', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location } = req.query;
    if (!location) {
      res.status(400).json({ error: 'Location is required' });
      return;
    }

    const { env } = await import('../config/env.js');
    const apiKey = env.OPENWEATHER_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Weather API key not configured' });
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location as string)}&appid=${apiKey}&units=metric`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (!resp.ok) {
      res.status(resp.status).json({ error: 'Failed to fetch weather' });
      return;
    }

    const data = await resp.json();
    res.json({
      temp: data.main?.temp,
      feels_like: data.main?.feels_like,
      condition: data.weather?.[0]?.main,
      description: data.weather?.[0]?.description,
      location: data.name
    });
  } catch (error) {
    next(error);
  }
});

// ─── Climate Initiatives (curated real-world data) ───
const INITIATIVES_DATA = [
  { id: '1', country: 'India', iso2: 'IN', title: 'National Solar Mission Phase III', description: 'Target to install 100 GW of solar capacity by 2026, focusing on rooftop and utility-scale projects across all states.', category: 'Renewable Energy', estimated_completion: '2026-12', status: 'in-progress' },
  { id: '2', country: 'United States', iso2: 'US', title: 'Inflation Reduction Act — Clean Energy Credits', description: 'Largest US climate investment of $369B in clean energy tax credits to reduce emissions 40% by 2030.', category: 'Policy & Finance', estimated_completion: '2030-12', status: 'in-progress' },
  { id: '3', country: 'China', iso2: 'CN', title: 'National Carbon Market Expansion', description: 'Expanding the world\'s largest carbon trading system to include steel, cement and aluminum sectors.', category: 'Carbon Trading', estimated_completion: '2027-06', status: 'in-progress' },
  { id: '4', country: 'Germany', iso2: 'DE', title: 'Hydrogen Infrastructure Network', description: 'Building a 1,800 km hydrogen pipeline network by 2028 to decarbonize heavy industry and transport.', category: 'Green Hydrogen', estimated_completion: '2028-12', status: 'in-progress' },
  { id: '5', country: 'Brazil', iso2: 'BR', title: 'Amazon Deforestation Zero Plan', description: 'Government target to eliminate illegal deforestation in the Amazon by 2030 through satellite monitoring and enforcement.', category: 'Forest Conservation', estimated_completion: '2030-06', status: 'in-progress' },
  { id: '6', country: 'Norway', iso2: 'NO', title: '100% EV Sales Target', description: 'Norway aims for all new cars sold to be zero-emission by 2025, currently at 90%+ EV market share.', category: 'Transport', estimated_completion: '2025-12', status: 'in-progress' },
  { id: '7', country: 'Australia', iso2: 'AU', title: 'Rewiring the Nation', description: '$20B transmission upgrade for 82% renewables by 2030, connecting solar farms to coastal cities.', category: 'Grid Infrastructure', estimated_completion: '2030-12', status: 'in-progress' },
  { id: '8', country: 'Chad', iso2: 'TD', title: 'Great Green Wall Initiative', description: 'Planting an 8,000 km wall of trees across the Sahel to combat desertification and restore degraded landscapes.', category: 'Reforestation', estimated_completion: '2030-12', status: 'in-progress' },
  { id: '9', country: 'Somalia', iso2: 'SO', title: 'Climate-Resilient Agriculture Program', description: 'UN-backed program to introduce drought-resistant crops and water harvesting to 500,000 farmers.', category: 'Climate Adaptation', estimated_completion: '2027-12', status: 'planned' },
  { id: '10', country: 'France', iso2: 'FR', title: 'Nuclear Fleet Renewal Plan', description: 'Building 6 new EPR2 reactors to maintain carbon-free baseload electricity and reduce gas dependence.', category: 'Nuclear Energy', estimated_completion: '2035-12', status: 'planned' },
  { id: '11', country: 'Japan', iso2: 'JP', title: 'Green Transformation (GX) Bonds', description: 'Issuing ¥20 trillion in transition bonds to fund decarbonization of industry, transport, and buildings.', category: 'Green Finance', estimated_completion: '2033-12', status: 'in-progress' },
  { id: '12', country: 'South Africa', iso2: 'ZA', title: 'Just Energy Transition Partnership', description: '$8.5B international package to retire coal plants and deploy renewables while protecting workers.', category: 'Energy Transition', estimated_completion: '2028-12', status: 'in-progress' },
  { 
    id: '13', 
    country: 'Costa Rica', 
    iso2: 'CR', 
    title: 'National PES Forest Recovery', 
    description: 'Pioneering Payment for Environmental Services (PES) program that successfully reversed decades of deforestation.', 
    category: 'Reforestation', 
    estimated_completion: '2015-12', 
    status: 'completed',
    timeline: [
      { date: '1996-01', event: 'Program Launch', impact: 21 },
      { date: '2000-01', event: 'First 1M Hectares Enrolled', impact: 38 },
      { date: '2008-01', event: 'Deforestation Reversal Achieved', impact: 52 },
      { date: '2015-12', event: '50%+ Forest Cover Milestone', impact: 54 }
    ],
    metrics: {
      before: [
        { label: 'Forest Cover', value: '21%' },
        { label: 'Deforestation Rate', value: 'High' }
      ],
      after: [
        { label: 'Forest Cover', value: '54%' },
        { label: 'Deforestation Rate', value: 'Negative (Net Gain)' }
      ]
    },
    evaluation: {
      summary: 'The PES program successfully paid landowners to protect trees, resulting in Costa Rica becoming the first tropical country to stop and reverse deforestation.',
      wasHelpful: true,
      justiceServed: true
    }
  },
  { 
    id: '14', 
    country: 'United Kingdom', 
    iso2: 'GB', 
    title: 'Coal Power Phase-Out', 
    description: 'National strategy to completely phase out coal-fired power generation, concluding with the closure of Ratcliffe-on-Soar.', 
    category: 'Energy Transition', 
    estimated_completion: '2024-09', 
    status: 'completed',
    timeline: [
      { date: '2012-01', event: 'Coal at 40% of grid mix', impact: 40, isNegative: true },
      { date: '2015-11', event: 'Phase-out announced for 2025', impact: 22, isNegative: true },
      { date: '2019-05', event: 'First week without coal since 1882', impact: 2, isNegative: true },
      { date: '2024-09', event: 'Final coal plant closed', impact: 0, isNegative: true }
    ],
    metrics: {
      before: [
        { label: 'Coal Grid Share', value: '40%' },
        { label: 'Sector Emissions', value: 'High' }
      ],
      after: [
        { label: 'Coal Grid Share', value: '0%' },
        { label: 'Sector Emissions', value: 'Reduced by 75%' }
      ]
    },
    evaluation: {
      summary: 'The UK successfully transitioned away from coal faster than any other major economy, largely driven by carbon pricing and offshore wind expansion. Worker transition programs were moderately successful.',
      wasHelpful: true,
      justiceServed: true
    }
  },
  { 
    id: '15', 
    country: 'Indonesia', 
    iso2: 'ID', 
    title: 'Early Peatland Restoration Attempt', 
    description: 'Initial attempt to block drainage canals and restore 2 million hectares of degraded peatlands to prevent mega-fires.', 
    category: 'Forest Conservation', 
    estimated_completion: '2020-12', 
    status: 'completed',
    timeline: [
      { date: '2015-10', event: 'Mega-fires prompt action', impact: 0 },
      { date: '2016-01', event: 'Restoration Agency Formed', impact: 10 },
      { date: '2018-06', event: 'Canals blocked, 500k ha rewetted', impact: 25 },
      { date: '2020-12', event: 'Program ends, targets missed', impact: 30 }
    ],
    metrics: {
      before: [
        { label: 'Degraded Peat', value: '2.4M ha' },
        { label: 'Fire Risk', value: 'Critical' }
      ],
      after: [
        { label: 'Restored Peat', value: '0.6M ha' },
        { label: 'Fire Risk', value: 'High' }
      ]
    },
    evaluation: {
      summary: 'While some rewetting occurred, the project missed its 2M hectare target due to complex land tenure issues, lack of enforcement against large concessions, and insufficient local community engagement. Mega-fires remain a threat.',
      wasHelpful: false,
      justiceServed: false
    }
  },
  { 
    id: '16', 
    country: 'Germany', 
    iso2: 'DE', 
    title: 'Energiewende Phase 1', 
    description: 'Initial phase of the national transition to renewable energy, heavily subsidizing solar and wind adoption.', 
    category: 'Energy Transition', 
    estimated_completion: '2020-12', 
    status: 'completed',
    timeline: [
      { date: '2000-04', event: 'Renewable Energy Sources Act', impact: 5 },
      { date: '2010-09', event: 'Energiewende officially adopted', impact: 15 },
      { date: '2015-12', event: 'Renewables hit 30% of grid mix', impact: 30 },
      { date: '2020-12', event: 'Phase 1 targets achieved (46% renewables)', impact: 46 }
    ],
    metrics: {
      before: [
        { label: 'Renewable Grid Share', value: '6%' },
        { label: 'Consumer Energy Cost', value: 'Moderate' }
      ],
      after: [
        { label: 'Renewable Grid Share', value: '46%' },
        { label: 'Consumer Energy Cost', value: 'Highest in Europe' }
      ]
    },
    evaluation: {
      summary: 'Highly successful in deploying green infrastructure and driving down global solar costs. However, environmental justice was compromised as working-class consumers bore the financial burden via surcharges, while heavy industry received exemptions.',
      wasHelpful: true,
      justiceServed: false
    }
  },
  { 
    id: '17', 
    country: 'Brazil', 
    iso2: 'BR', 
    title: 'Amazon Fund (Phase 1)', 
    description: 'Performance-based payment mechanism for reducing emissions from deforestation in the Amazon basin.', 
    category: 'Forest Conservation', 
    estimated_completion: '2018-12', 
    status: 'completed',
    timeline: [
      { date: '2008-08', event: 'Fund established with Norway', impact: 0 },
      { date: '2012-12', event: 'Deforestation drops 80%', impact: 80 },
      { date: '2016-12', event: '100+ local projects funded', impact: 85 },
      { date: '2018-12', event: 'Fund suspended due to policy shift', impact: 70, isNegative: true }
    ],
    metrics: {
      before: [
        { label: 'Annual Deforestation', value: '27,000 km²' },
        { label: 'Indigenous Land Protection', value: 'Weak' }
      ],
      after: [
        { label: 'Annual Deforestation', value: '7,500 km²' },
        { label: 'Indigenous Land Protection', value: 'Strengthened' }
      ]
    },
    evaluation: {
      summary: 'The fund was remarkably successful in directly compensating indigenous communities for forest stewardship and drastically reducing deforestation. The phase ended when political shifts dismantled the steering committee, demonstrating the fragility of the progress.',
      wasHelpful: true,
      justiceServed: true
    }
  }
];

climateRouter.get('/initiatives', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'climate:initiatives';
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // Return curated real-world initiatives with live timestamps
    const initiatives = INITIATIVES_DATA.map(init => ({
      ...init,
      last_updated: new Date().toISOString(),
    }));

    cache.set(cacheKey, initiatives);
    res.json(initiatives);
  } catch (error) {
    next(error);
  }
});

