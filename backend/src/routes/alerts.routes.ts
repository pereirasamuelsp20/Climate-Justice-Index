import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { verifyToken, AuthRequest } from '../middlewares/auth.middleware.js';

export const alertsRouter = Router();

alertsRouter.use(verifyToken);

// GET /alerts
alertsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    // Get user region preference
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('region_preference')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw { status: 500, code: 'DB_ERROR', message: userError.message };
    
    if (!user || !user.region_preference) {
      res.json([]);
      return;
    }

    // Weather alerts are served from the DB (aggregated by cron)
    const { data: alerts, error: alertsError } = await supabase
      .from('weather_alerts')
      .select('*')
      .eq('region', user.region_preference)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (alertsError) throw { status: 500, code: 'DB_ERROR', message: alertsError.message };

    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

const prefsSchema = z.object({
  alert_email_enabled: z.boolean(),
  alert_types: z.array(z.string()),
});

// POST /alerts/preferences
alertsRouter.post('/preferences', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { alert_email_enabled, alert_types } = prefsSchema.parse(req.body);

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, alert_email_enabled, alert_types })
      .select()
      .single();

    if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };

    res.json(data);
  } catch (error) {
    next(error);
  }
});
