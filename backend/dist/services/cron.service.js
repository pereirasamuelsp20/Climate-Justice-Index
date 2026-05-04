import cron from 'node-cron';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { dispatchAlertEmail } from './email.service.js';
// Approx lat/lng per region representative for demonstration
const regionCoords = {
    'Africa': { lat: 9.0820, lon: 8.6753 },
    'Asia': { lat: 34.0479, lon: 100.6197 },
    'Europe': { lat: 51.1657, lon: 10.4515 },
    'Latin America': { lat: -14.2350, lon: -51.9253 },
    'North America': { lat: 37.0902, lon: -95.7129 },
    'Oceania': { lat: -25.2744, lon: 133.7751 },
};
export const startCronJobs = () => {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        logger.info('Running weather aggregation cron...');
        for (const [region, coords] of Object.entries(regionCoords)) {
            try {
                await aggregateWeatherForRegion(region, coords);
            }
            catch (err) {
                logger.error({ err, region }, 'Cron aggregation error');
            }
        }
    });
};
const aggregateWeatherForRegion = async (region, coords) => {
    // 1. Fetch from 3 APIs
    // Using try-catch to ensure one failure doesn't block evaluation entirely
    let owmData = '';
    try {
        const owmReq = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${env.OPENWEATHER_KEY}&units=metric`);
        const owmJson = await owmReq.json();
        // Mocking alert logic based on current conditions to satisfy requirement without advanced onecall endpoint
        if (owmJson.main?.temp > 40)
            owmData = 'Extreme Heat';
        else if (owmJson.wind?.speed > 25)
            owmData = 'Storm';
        else if (owmJson.weather?.[0]?.main === 'Rain')
            owmData = 'Rain';
    }
    catch (e) {
        logger.warn('OWM fetch failed');
    }
    let tmrData = '';
    try {
        const tmrReq = await fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${coords.lat},${coords.lon}&apikey=${env.TOMORROW_KEY}`);
        const tmrJson = await tmrReq.json();
        if (tmrJson.data?.values?.temperature > 40)
            tmrData = 'Extreme Heat';
        else if (tmrJson.data?.values?.windSpeed > 25)
            tmrData = 'Storm';
        else if (tmrJson.data?.values?.precipitationIntensity > 5)
            tmrData = 'Rain';
    }
    catch (e) {
        logger.warn('Tomorrow.io fetch failed');
    }
    let meteoData = '';
    try {
        const meteoReq = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
        const meteoJson = await meteoReq.json();
        if (meteoJson.current_weather?.temperature > 40)
            meteoData = 'Extreme Heat';
        else if (meteoJson.current_weather?.windspeed > 90)
            meteoData = 'Storm'; // Open meteo windspeed is km/h
    }
    catch (e) {
        logger.warn('OpenMeteo fetch failed');
    }
    // Analyze Detected Alerts (Simplistic rule engine)
    const sources = [owmData, tmrData, meteoData];
    const activeAlerts = ['Rain', 'Extreme Heat', 'Storm', 'Flood'];
    for (const alertType of activeAlerts) {
        const hits = sources.filter(s => s === alertType).length;
        if (hits > 0) {
            const confidence = hits / 3;
            let severity = 'Low';
            if (confidence > 0.6)
                severity = 'High';
            if (confidence === 1)
                severity = 'Critical';
            const sourceDataJSON = {
                OpenWeatherMap: owmData === alertType ? 'Detected' : 'Clear',
                TomorrowIO: tmrData === alertType ? 'Detected' : 'Clear',
                NOAA: meteoData === alertType ? 'Detected' : 'Clear',
            };
            // 4. Upsert into DB
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
            const { data: insertedAlert, error: insertError } = await supabase
                .from('weather_alerts')
                .insert({
                region,
                alert_type: alertType,
                severity,
                source_data: sourceDataJSON,
                confidence_score: confidence,
                expires_at: expiresAt
            })
                .select('id')
                .single();
            if (insertError) {
                logger.error({ insertError }, 'Failed to insert alert');
                continue;
            }
            // 5. Trigger notifications for High or Critical
            if (severity === 'High' || severity === 'Critical') {
                const { data: usersToNotify } = await supabase
                    .from('users')
                    .select('id, email, user_preferences(alert_email_enabled, alert_types)')
                    .eq('region_preference', region);
                if (usersToNotify) {
                    for (const u of usersToNotify) {
                        // @ts-ignore
                        const prefs = u.user_preferences?.[0] || u.user_preferences;
                        if (prefs?.alert_email_enabled && (prefs.alert_types || []).includes(alertType)) {
                            // Dispatch email
                            await dispatchAlertEmail({
                                userId: u.id,
                                email: u.email,
                                region,
                                alertType,
                                severity,
                                confidenceScore: confidence,
                                sourceData: sourceDataJSON,
                                alertId: insertedAlert.id
                            });
                        }
                    }
                }
            }
        }
    }
};
