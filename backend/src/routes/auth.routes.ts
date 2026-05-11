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
      const errMsg = (createError.message || '').toLowerCase();
      // Handle "user already exists" gracefully — Supabase uses varying messages
      if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('registered') || errMsg.includes('duplicate') ||
          (createError as any).status === 422) {
        res.status(409).json({ 
          error: { code: 'USER_EXISTS', message: 'This email is already registered. Try logging in instead.' }
        });
        return;
      }
      logger.error({ error: createError, email }, 'Failed to create user via admin API');
      res.status(500).json({ 
        error: { code: 'AUTH_ERROR', message: `User creation failed: ${createError.message}` }
      });
      return;
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
    try {
      await sendVerificationEmail({
        email,
        name: name || '',
        verificationLink,
      });
    } catch (emailError) {
      // Email send failed, but user was still created — log and continue
      logger.error({ error: emailError, email }, 'Verification email failed but user was created');
    }

    res.status(201).json({ 
      message: 'Account created. Verification email sent.',
      userId: userData.user?.id,
    });
  } catch (error: any) {
    // Zod validation errors
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input. Email must be valid and password must be at least 6 characters.' }
      });
      return;
    }
    logger.error({ error }, 'Auth signup route error');
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: error.message || 'An unexpected error occurred.' }
    });
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
