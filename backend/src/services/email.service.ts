import { Resend } from 'resend';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const resend = new Resend(env.RESEND_API_KEY);

interface AlertEmailPayload {
  userId: string;
  email: string;
  region: string;
  alertType: string;
  severity: string;
  confidenceScore: number;
  sourceData: any;
  alertId: string;
}

export const dispatchAlertEmail = async (payload: AlertEmailPayload): Promise<void> => {
  try {
    const { email, region, alertType, severity, confidenceScore, sourceData, alertId, userId } = payload;
    
    // Compute progress bar color logic
    const pct = Math.round(confidenceScore * 100);
    let barColor = '#ef4444'; // red
    if (pct >= 66) barColor = '#10b981'; // green
    else if (pct >= 33) barColor = '#f59e0b'; // amber

    const htmlTemplate = `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #085041; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">Climate Alert: ${region}</h1>
        </div>
        <div style="padding: 24px;">
          <h2 style="margin-top: 0;">⚠️ ${alertType} Warning</h2>
          <p><strong>Severity:</strong> <span style="padding: 4px 8px; border-radius: 4px; background-color: #fef2f2; color: #991b1b; font-weight: bold;">${severity}</span></p>
          
          <h3 style="margin-top: 24px; font-size: 14px; text-transform: uppercase; color: #64748b;">Source Array</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>OpenWeather</strong><br/>${sourceData.OpenWeatherMap || 'N/A'}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>Tomorrow.io</strong><br/>${sourceData.TomorrowIO || 'N/A'}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>NOAA/Meteo</strong><br/>${sourceData.NOAA || 'N/A'}</td>
            </tr>
          </table>

          <div style="margin-bottom: 32px;">
            <p style="margin-bottom: 8px; font-size: 14px; color: #64748b;">Confidence consensus: ${pct}%</p>
            <div style="width: 100%; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background-color: ${barColor};"></div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${env.FRONTEND_URL}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Full Dashboard</a>
          </div>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: 'Climate Justice <alerts@climatejusticeindex.org>', // In production, this must be a verified domain
      to: email,
      subject: `[${severity}] ${alertType} Alert for ${region}`,
      html: htmlTemplate,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Log the successful dispatch
    await supabase.from('alert_dispatches').insert({
      alert_id: alertId,
      user_id: userId,
      channel: 'email',
      status: 'sent',
      sent_at: new Date().toISOString()
    });

  } catch (error) {
    logger.error({ error, alertId: payload.alertId, userId: payload.userId }, 'Email dispatch failed');
    // Log the failed dispatch
    await supabase.from('alert_dispatches').insert({
      alert_id: payload.alertId,
      user_id: payload.userId,
      channel: 'email',
      status: 'failed',
      sent_at: new Date().toISOString()
    });
  }
};

/* ─── Verification + Welcome Email ─── */
interface VerificationEmailPayload {
  email: string;
  name: string;
  verificationLink: string;
}

export const sendVerificationEmail = async (payload: VerificationEmailPayload): Promise<void> => {
  try {
    const { email, name, verificationLink } = payload;
    const displayName = name || 'Climate Champion';

    // Build the CTA section — either verification link or plain dashboard link
    const ctaUrl = verificationLink || env.FRONTEND_URL;
    const ctaText = verificationLink ? 'Verify Email & Launch Dashboard →' : 'Launch Your Dashboard →';

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f1117; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #161923; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
          
          <!-- Hero Header -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f1117 50%, #1a2332 100%); padding: 48px 40px; text-align: center; position: relative;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: radial-gradient(circle at 38% 32%, #5DCAA5, #1D9E75, #04342C); margin: 0 auto 20px; border: 3px solid rgba(93, 202, 165, 0.4); box-shadow: 0 0 24px rgba(29, 158, 117, 0.3);">
              <div style="width: 100%; height: 100%; border-radius: 50%; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(225, 245, 238, 0.15);"></div>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(225, 245, 238, 0.1);"></div>
                <div style="position: absolute; top: 25%; left: 30%; width: 12px; height: 8px; background: #04342C; border-radius: 40%; opacity: 0.5;"></div>
                <div style="position: absolute; top: 45%; left: 42%; width: 10px; height: 14px; background: #04342C; border-radius: 40%; opacity: 0.5;"></div>
              </div>
            </div>
            <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
              Welcome to Climate Justice
            </h1>
            <p style="color: #94a3b8; margin: 0; font-size: 14px; letter-spacing: 0.5px;">
              The Index That Tells the Story the World Forgets
            </p>
          </div>

          <!-- Personal Greeting -->
          <div style="padding: 40px 40px 24px;">
            <p style="color: #e2e8f0; font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">
              Hello ${displayName} 👋
            </p>
            <p style="color: #94a3b8; font-size: 15px; line-height: 1.7; margin: 0;">
              You've just taken a powerful step. By joining Climate Justice, you're now part of a growing community that refuses to look away from the truth behind the data. We're honored to have you.
            </p>
          </div>

          ${verificationLink ? `
          <!-- Verification Notice -->
          <div style="padding: 0 40px 24px;">
            <div style="background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); border-radius: 12px; padding: 16px 20px;">
              <p style="color: #93c5fd; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">
                ✉️ One quick step
              </p>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
                Click the button below to verify your email and unlock your dashboard. It only takes a second.
              </p>
            </div>
          </div>
          ` : ''}

          <!-- Divider -->
          <div style="padding: 0 40px;">
            <div style="height: 1px; background: linear-gradient(to right, transparent, rgba(59,130,246,0.3), transparent);"></div>
          </div>

          <!-- What Awaits You -->
          <div style="padding: 32px 40px;">
            <h2 style="color: #e2e8f0; font-size: 16px; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
              What Awaits You
            </h2>

            <!-- Feature 1 -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; width: 100%;">
              <tr>
                <td style="width: 56px; vertical-align: top;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(59,130,246,0.12); text-align: center; line-height: 40px; font-size: 18px;">
                    🌍
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #e2e8f0; margin: 0 0 4px 0; font-size: 15px; font-weight: 600;">Global Vulnerability Mapping</h3>
                  <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.6;">
                    Compare per-capita emissions against climate vulnerability across every nation. See who pollutes — and who pays the price.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Feature 2 -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; width: 100%;">
              <tr>
                <td style="width: 56px; vertical-align: top;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(251,191,36,0.12); text-align: center; line-height: 40px; font-size: 18px;">
                    📊
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #e2e8f0; margin: 0 0 4px 0; font-size: 15px; font-weight: 600;">Interactive Data Visualizations</h3>
                  <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.6;">
                    Bubble charts, trend lines, and regional breakdowns — all designed to reveal the intersection of injustice and climate change.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Feature 3 -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px; width: 100%;">
              <tr>
                <td style="width: 56px; vertical-align: top;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239,68,68,0.12); text-align: center; line-height: 40px; font-size: 18px;">
                    🔔
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <h3 style="color: #e2e8f0; margin: 0 0 4px 0; font-size: 15px; font-weight: 600;">Real-Time Severe Weather Alerts</h3>
                  <p style="color: #64748b; margin: 0; font-size: 13px; line-height: 1.6;">
                    We monitor 3 independent weather APIs and use consensus-scoring to deliver high-confidence alerts straight to your inbox.
                  </p>
                </td>
              </tr>
            </table>
          </div>

          <!-- CTA Button -->
          <div style="padding: 8px 40px 40px; text-align: center;">
            <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 8px 24px -4px rgba(59,130,246,0.35);">
              ${ctaText}
            </a>
            ${verificationLink ? `
            <p style="color: #475569; font-size: 11px; margin: 16px 0 0 0; line-height: 1.6;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${verificationLink}" style="color: #60a5fa; word-break: break-all; font-size: 10px;">${verificationLink}</a>
            </p>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background: rgba(0,0,0,0.3); padding: 24px 40px; text-align: center;">
            <p style="color: #475569; font-size: 12px; margin: 0 0 4px 0;">
              Climate Justice Index — Data-driven climate accountability
            </p>
            <p style="color: #334155; font-size: 11px; margin: 0;">
              The storm is here. Thank you for choosing to act.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'Climate Justice <onboarding@resend.dev>',
      to: email,
      subject: verificationLink
        ? `${displayName}, verify your email to join Climate Justice 🌍`
        : `Welcome to Climate Justice, ${displayName} 🌍`,
      html: htmlTemplate,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    logger.info({ email, hasVerificationLink: !!verificationLink }, 'Verification email sent successfully');
  } catch (error) {
    logger.error({ error, email: payload.email }, 'Verification email dispatch failed');
    throw error; // Re-throw so the route can handle it
  }
};
