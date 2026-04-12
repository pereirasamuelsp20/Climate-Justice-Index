import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: './frontend/.env'});
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
sb.from('countries').select('*').limit(1).then(r => console.log(JSON.stringify(r.data, null, 2))).catch(e => console.error(e));
