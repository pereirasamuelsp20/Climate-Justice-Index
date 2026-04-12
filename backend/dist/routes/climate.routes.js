import { Router } from 'express';
import { supabase } from '../config/supabase.js';
import { cache } from '../utils/cache.js';
export const climateRouter = Router();
// GET /climate/countries
climateRouter.get('/countries', async (req, res, next) => {
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
        if (error)
            throw { status: 500, code: 'DB_ERROR', message: error.message };
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
    }
    catch (error) {
        next(error);
    }
});
// GET /climate/countries/:iso2
climateRouter.get('/countries/:iso2', async (req, res, next) => {
    try {
        const { iso2 } = req.params;
        const { data, error } = await supabase
            .from('countries')
            .select('*')
            .ilike('iso2', iso2)
            .single();
        if (error && error.code === 'PGRST116') {
            throw { status: 404, code: 'NOT_FOUND', message: 'Country not found' };
        }
        if (error)
            throw { status: 500, code: 'DB_ERROR', message: error.message };
        res.json(data);
    }
    catch (error) {
        next(error);
    }
});
// GET /climate/summary
climateRouter.get('/summary', async (req, res, next) => {
    try {
        const cacheKey = 'climate:summary';
        const cached = cache.get(cacheKey);
        if (cached) {
            res.json(cached);
            return;
        }
        const { data: countries, error } = await supabase.from('countries').select('*');
        if (error)
            throw { status: 500, code: 'DB_ERROR', message: error.message };
        if (!countries.length) {
            res.json({ most_vulnerable: null, highest_emitter: null, global_injustice_score: 0 });
            return;
        }
        let mostVulnerable = countries[0];
        let highestEmitter = countries[0];
        const totalEmissions = countries.reduce((acc, c) => acc + (c.emissions_per_capita * c.population), 0);
        let totalInjustice = 0;
        countries.forEach(c => {
            if (c.vulnerability_score > mostVulnerable.vulnerability_score)
                mostVulnerable = c;
            if (c.emissions_per_capita > highestEmitter.emissions_per_capita)
                highestEmitter = c;
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
    }
    catch (error) {
        next(error);
    }
});
// GET /climate/regions
climateRouter.get('/regions', async (req, res, next) => {
    try {
        const { data, error } = await supabase.from('countries').select('region');
        if (error)
            throw { status: 500, code: 'DB_ERROR', message: error.message };
        const regions = Array.from(new Set(data.map(d => d.region))).sort();
        res.json(regions);
    }
    catch (error) {
        next(error);
    }
});
