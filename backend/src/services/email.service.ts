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
