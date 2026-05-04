import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// We use the service_role key to bypass RLS for internal server operations 
// like the background cron worker or specific auth-less fetching tasks.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
