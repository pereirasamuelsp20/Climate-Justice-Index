import NodeCache from 'node-cache';
// Using a 10 minutes cache as requested for static data
export const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
