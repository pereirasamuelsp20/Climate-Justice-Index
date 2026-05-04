-- Schema and Table Setup for Climate Justice Index

-- Extend users table (assumes auth.users exists)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  region_preference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ Default NOW(),
  login_count INT DEFAULT 0
);

CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  iso2 CHAR(2) UNIQUE NOT NULL,
  region TEXT NOT NULL,
  emissions_per_capita FLOAT NOT NULL,
  vulnerability_score FLOAT NOT NULL,
  gdp_per_capita INT NOT NULL,
  population BIGINT NOT NULL,
  gdp_quartile INT CHECK (gdp_quartile IN (1, 2, 3, 4)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_filters JSONB,
  recent_countries TEXT[] DEFAULT '{}',
  alert_email_enabled BOOLEAN DEFAULT false,
  alert_types TEXT[] DEFAULT '{}'
);

CREATE TABLE public.weather_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source_data JSONB NOT NULL,
  confidence_score FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.alert_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.weather_alerts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL
);

CREATE TABLE public.greeting_log (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_greeted_at TIMESTAMPTZ NOT NULL,
  login_count INT NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.greeting_log ENABLE ROW LEVEL SECURITY;

-- Countries and Weather Alerts are readable by all authenticated users
CREATE POLICY "Public Read Countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Public Read Weather Alerts" ON public.weather_alerts FOR SELECT USING (auth.role() = 'authenticated');

-- User restricted tables
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users read own greeting log" ON public.greeting_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert/update own greeting log" ON public.greeting_log USING (auth.uid() = user_id);

CREATE POLICY "Users read own dispatches" ON public.alert_dispatches FOR SELECT USING (auth.uid() = user_id);

-- Note: In a production Supabase setup, server roles (like our background cron) use the SERVICE_ROLE key which bypasses RLS entirely.

-- Seed Data (Countries)
INSERT INTO public.countries (name, iso2, region, emissions_per_capita, vulnerability_score, gdp_per_capita, population, gdp_quartile) VALUES 
('United States', 'US', 'North America', 14.7, 0.28, 63000, 331000000, 4),
('Canada', 'CA', 'North America', 14.2, 0.25, 46000, 38000000, 4),
('Brazil', 'BR', 'Latin America', 2.3, 0.45, 8700, 212000000, 3),
('Argentina', 'AR', 'Latin America', 4.1, 0.38, 9900, 45000000, 3),
('Germany', 'DE', 'Europe', 8.5, 0.15, 48000, 83000000, 4),
('Norway', 'NO', 'Europe', 7.2, 0.12, 75000, 5300000, 4),
('Chad', 'TD', 'Africa', 0.1, 0.85, 700, 16000000, 1),
('Somalia', 'SO', 'Africa', 0.05, 0.88, 300, 15000000, 1),
('Nigeria', 'NG', 'Africa', 0.6, 0.65, 2000, 206000000, 2),
('South Africa', 'ZA', 'Africa', 7.6, 0.42, 6000, 59000000, 3),
('India', 'IN', 'Asia', 1.8, 0.65, 2100, 1380000000, 2),
('China', 'CN', 'Asia', 7.4, 0.40, 10500, 1400000000, 3),
('Bangladesh', 'BD', 'Asia', 0.5, 0.72, 1900, 164000000, 1),
('Japan', 'JP', 'Asia', 8.5, 0.20, 40000, 125000000, 4),
('Australia', 'AU', 'Oceania', 15.1, 0.25, 55000, 25000000, 4),
('Fiji', 'FJ', 'Oceania', 1.5, 0.68, 4800, 900000, 2),
('United Kingdom', 'GB', 'Europe', 5.2, 0.18, 42000, 67000000, 4),
('France', 'FR', 'Europe', 4.3, 0.17, 40000, 67000000, 4),
('Mexico', 'MX', 'Latin America', 3.7, 0.41, 8300, 128000000, 3),
('Egypt', 'EG', 'Africa', 2.3, 0.55, 3000, 102000000, 2);
