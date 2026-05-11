import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { sendVerificationEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// POST /api/v1/auth/signup — Create user via Admin API (no Supabase native email)
// Then send our beautiful branded email via Resend
authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);

    // 1. Create user via Admin API — this does NOT send Supabase's ugly default email
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User must verify via our custom email
      user_metadata: { name: name || '' },
    });

    if (createError) {
      // Handle "user already exists" gracefully
      if (createError.message?.includes('already been registered') || 
          createError.message?.includes('already exists')) {
        res.status(409).json({ 
          error: { code: 'USER_EXISTS', message: 'This email is already registered. Try logging in instead.' }
        });
        return;
      }
      logger.error({ error: createError, email }, 'Failed to create user');
      throw { status: 500, code: 'AUTH_ERROR', message: createError.message };
    }

    // 2. Generate a magic link for email verification
    let verificationLink = '';
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173',
      },
    });

    if (linkError) {
      logger.error({ error: linkError, email }, 'Failed to generate verification link');
      // Still send welcome email without link
    } else {
      verificationLink = linkData.properties?.action_link || '';
    }

    logger.info({ email, userId: userData.user?.id, hasLink: !!verificationLink }, 'User created via admin API');

    // 3. Send beautiful branded email via Resend (the ONLY email the user receives)
    await sendVerificationEmail({
      email,
      name: name || '',
      verificationLink,
    });

    res.status(201).json({ 
      message: 'Account created. Verification email sent.',
      userId: userData.user?.id,
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    logger.error({ error }, 'Auth signup route error');
    next(error);
  }
});

const welcomeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// POST /api/v1/auth/welcome — Generate a real verification link via Supabase Admin API
// and send it immediately via Resend (bypasses Supabase's slow built-in mailer)
authRouter.post('/welcome', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name } = welcomeSchema.parse(req.body);

    // Generate a magic link via Supabase Admin API (uses service role key)
    // When user clicks this, Supabase will confirm their email AND sign them in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: process.env.FRONTEND_URL || 'http://localhost:5173',
      },
    });

    if (linkError) {
      logger.error({ error: linkError, email }, 'Failed to generate verification link');
      // Still send a welcome email without the link
      await sendVerificationEmail({ email, name: name || '', verificationLink: '' });
      res.status(202).json({ message: 'Welcome email sent (no link)' });
      return;
    }

    const verificationLink = linkData.properties?.action_link || '';
    logger.info({ email, hasLink: !!verificationLink }, 'Verification link generated');

    // Send the beautiful email via Resend with the real verification link
    await sendVerificationEmail({
      email,
      name: name || '',
      verificationLink,
    });

    res.status(202).json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error({ error }, 'Auth welcome route error');
    next(error);
  }
});
