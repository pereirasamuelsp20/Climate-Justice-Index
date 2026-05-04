import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { sendVerificationEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';
export const authRouter = Router();
const welcomeSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
});
// POST /api/v1/auth/welcome — Generate a real verification link via Supabase Admin API
// and send it immediately via Resend (bypasses Supabase's slow built-in mailer)
authRouter.post('/welcome', async (req, res, next) => {
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
    }
    catch (error) {
        logger.error({ error }, 'Auth welcome route error');
        next(error);
    }
});
