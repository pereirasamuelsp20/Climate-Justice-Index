import { createClient } from '@supabase/supabase-js';
import { env } from './src/config/env.js';

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
console.log("Fetching countries...");
const t = Date.now();
sb.from('countries').select('iso2').limit(1).then(res => {
  console.log("Result:", res.data, "Time:", Date.now() - t);
  process.exit(0);
}).catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
