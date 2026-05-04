import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { verifyToken, AuthRequest } from '../middlewares/auth.middleware.js';

export const userRouter = Router();

userRouter.use(verifyToken);

const updateProfileSchema = z.object({
  name: z.string().optional(),
  region_preference: z.string().optional(),
});

// GET /user/profile
userRouter.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    // Attempt to fetch user + preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, region_preference, created_at')
      .eq('id', userId)
      .single();

    if (userError) throw { status: 500, code: 'DB_ERROR', message: userError.message };

    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('last_filters, recent_countries, alert_email_enabled, alert_types')
      .eq('user_id', userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      throw { status: 500, code: 'DB_ERROR', message: prefsError.message };
    }

    res.json({ ...user, preferences: prefs || {} });
  } catch (error) {
    next(error);
  }
});

// PUT /user/profile
userRouter.put('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, region_preference } = updateProfileSchema.parse(req.body);

    const { data, error } = await supabase
      .from('users')
      .update({ name, region_preference })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };
    res.json(data);
  } catch (error) {
    next(error);
  }
});

const recentSchema = z.object({
  recent_countries: z.array(z.string()),
});

// PUT /user/recent
userRouter.put('/recent', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { recent_countries } = recentSchema.parse(req.body);

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, recent_countries })
      .select()
      .single();

    if (error) throw { status: 500, code: 'DB_ERROR', message: error.message };
    res.json(data);
  } catch (error) {
    next(error);
  }
});

const returningGreetingMessages = [
  "Good to have you back, {name}. The numbers haven't gotten better — but you have.",
  "Welcome home, {name}. Shall we see what's shifted?",
  "Hey {name} — the data missed you.",
  "Back again, {name}? The climate certainly hasn't taken a break.",
  "{name}, glad you're here. Some regions need an advocate.",
  "Hello {name}. Let's dive back into the truth behind the data.",
  "Welcome {name}, your perspective is needed now more than ever.",
  "We're ready when you are, {name}.",
  "Good to see you, {name}. The Earth is still keeping score.",
  "Welcome back, {name}. Let's find out what's really happening today."
];

const firstTimeGreetingMessages = [
  "Welcome to Climate Justice, {name} — where the data tells the story the world forgets.",
  "Hello {name}. You're about to see the climate crisis in a new light.",
  "Welcome, {name}. We've prepared a comprehensive global review for you.",
  "Greetings {name}. It's time to explore the intersection of vulnerability and emissions.",
  "Welcome {name}. Let the data shape your perspective today."
];

// GET /user/greeting
userRouter.get('/greeting', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // First fetch user to get name and login count
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, login_count')
      .eq('id', userId)
      .single();

    if (userError) throw { status: 500, code: 'DB_ERROR', message: userError.message };

    const name = user.name || 'Friend';
    const newLoginCount = (user.login_count || 0) + 1;

    // Update login count and log greeting
    const updateUsers = supabase.from('users').update({ login_count: newLoginCount, last_login_at: new Date().toISOString() }).eq('id', userId);
    const logGreeting = supabase.from('greeting_log').upsert({ user_id: userId, last_greeted_at: new Date().toISOString(), login_count: newLoginCount });
    await Promise.all([updateUsers, logGreeting]);

    let message = '';
    let type = '';

    if (newLoginCount === 1) {
      type = 'first_time';
      const randIdx = Math.floor(Math.random() * firstTimeGreetingMessages.length);
      message = firstTimeGreetingMessages[randIdx].replace('{name}', name);
    } else {
      type = 'returning';
      const daySeed = Math.floor(Date.now() / 86400000);
      const charCode = userId.charCodeAt(0) || 0;
      const seededIdx = (daySeed ^ charCode) % returningGreetingMessages.length;
      message = returningGreetingMessages[seededIdx].replace('{name}', name);
    }

    res.json({ type, message, login_count: newLoginCount });
  } catch (error) {
    next(error);
  }
});
