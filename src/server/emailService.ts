import { db } from './db.ts';

export interface LoginAlertPayload {
  email: string;
  displayName?: string;
  providerId?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    language?: string;
    screenResolution?: string;
  };
  clientIp?: string;
  loginTime: string;
}

export interface LoginAlertResult {
  success: boolean;
  alertId: string;
  deliveryStatus: 'delivered' | 'failed' | 'simulated_no_api_key' | 'rate_limited';
  provider: 'resend' | 'sendgrid' | 'local_audit_log';
  message: string;
  sentAt: string;
}

// In-memory rate limiting map: email -> timestamp of last alert sent
const alertThrottleMap = new Map<string, number>();
const THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes duplicate protection window

/**
 * Parses user agent string into friendly browser and OS description
 */
export function parseUserAgent(userAgent?: string): { browser: string; os: string; device: string } {
  if (!userAgent) {
    return { browser: 'Unknown Browser', os: 'Unknown OS', device: 'Desktop/Web' };
  }

  let os = 'Unknown OS';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg/i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/chrome|crios/i.test(userAgent) && !/opr|opera/i.test(userAgent)) browser = 'Google Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Apple Safari';
  else if (/opr|opera/i.test(userAgent)) browser = 'Opera';

  const isMobile = /mobile|iphone|android/i.test(userAgent);
  const device = isMobile ? (os === 'iOS' ? 'iPhone / iPad' : 'Mobile Device') : 'Desktop Browser';

  return { browser, os, device };
}

/**
 * Sends a transactional Login Alert Email using Resend, SendGrid, or records a security audit log
 */
export async function sendLoginAlertEmail(payload: LoginAlertPayload): Promise<LoginAlertResult> {
  const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const email = payload.email.trim().toLowerCase();

  // 1. Duplicate & Rapid-fire prevention (5-minute window)
  const lastSent = alertThrottleMap.get(email);
  if (lastSent && now - lastSent < THROTTLE_WINDOW_MS) {
    const remainingSec = Math.ceil((THROTTLE_WINDOW_MS - (now - lastSent)) / 1000);
    return {
      success: true,
      alertId,
      deliveryStatus: 'rate_limited',
      provider: 'local_audit_log',
      message: `Login alert suppressed: an alert was already sent within the past 5 minutes (${remainingSec}s remaining).`,
      sentAt: new Date().toISOString(),
    };
  }

  const { browser, os, device } = parseUserAgent(payload.deviceInfo?.userAgent);
  const formattedTime = new Date(payload.loginTime || now).toUTCString();
  const providerLabel = payload.providerId === 'google.com' ? 'Google OAuth (SSO)' : 'Email & Password';
  const clientLocation = payload.clientIp ? `IP: ${payload.clientIp}` : 'Secure HTTPS Connection';

  // Email content templates
  const subject = `🔐 OpsDesk Security Alert: New Sign-In to ${payload.email}`;
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px 32px; color: #ffffff; }
    .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
    .logo-accent { color: #38bdf8; }
    .content { padding: 32px; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 16px; }
    h2 { font-size: 18px; margin: 0 0 12px 0; color: #0f172a; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .info-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; width: 35%; }
    .info-value { color: #0f172a; font-weight: 600; }
    .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px; }
    .warning-title { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 4px; }
    .warning-text { font-size: 12px; color: #b45309; line-height: 1.5; margin: 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span>Ops<span class="logo-accent">Desk</span></span>
        <span style="font-size: 11px; background: #1e293b; padding: 2px 8px; border-radius: 4px; color: #94a3b8; font-weight: normal; margin-left: 8px;">TBO Operations</span>
      </div>
    </div>
    <div class="content">
      <div class="badge">✓ Sign-in Successful</div>
      <h2>Security Alert: New Sign-In to Your Account</h2>
      <p>Hello ${payload.displayName || 'Operations Colleague'},</p>
      <p>We detected a new sign-in to your OpsDesk travel operations account. Please verify the login details below:</p>

      <table class="info-table">
        <tr>
          <td class="info-label">Account</td>
          <td class="info-value">${payload.email}</td>
        </tr>
        <tr>
          <td class="info-label">Date & Time</td>
          <td class="info-value">${formattedTime}</td>
        </tr>
        <tr>
          <td class="info-label">Authentication</td>
          <td class="info-value">${providerLabel}</td>
        </tr>
        <tr>
          <td class="info-label">Device & OS</td>
          <td class="info-value">${device} (${os})</td>
        </tr>
        <tr>
          <td class="info-label">Browser</td>
          <td class="info-value">${browser}</td>
        </tr>
        <tr>
          <td class="info-label">Connection</td>
          <td class="info-value">${clientLocation}</td>
        </tr>
      </table>

      <div class="warning-box">
        <div class="warning-title">Did you not recognize this login?</div>
        <p class="warning-text">
          If you did not perform this login, someone else may have gained unauthorized access to your account. 
          Please secure your account immediately, reset your credentials, and notify your TBO Operations Administrator.
        </p>
      </div>
    </div>
    <div class="footer">
      This is an automated operational security notification sent to ${payload.email}.<br/>
      OpsDesk B2B Travel Operations Management Platform &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
`;

  const textContent = `
OpsDesk Security Alert: New Sign-In Detected
Account: ${payload.email}
Time: ${formattedTime}
Method: ${providerLabel}
Device: ${device} (${os}), ${browser}
${clientLocation}

If you did not perform this login, secure your account immediately by notifying your TBO administrator.
  `.trim();

  // 2. Dispatch using transactional email providers if configured
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'OpsDesk Security <onboarding@resend.dev>';

  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [payload.email],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        alertThrottleMap.set(email, now);
        db.addAuditLog({
          userId: payload.email,
          userName: payload.displayName || payload.email,
          userRole: 'agent',
          action: 'LOGIN_ALERT_DELIVERED',
          resource: 'EmailNotification',
          resourceId: resData.id || alertId,
          details: `Login security alert delivered to ${payload.email} via Resend. Device: ${device} (${browser}).`,
        });

        return {
          success: true,
          alertId: resData.id || alertId,
          deliveryStatus: 'delivered',
          provider: 'resend',
          message: `Login security alert email successfully sent to ${payload.email}`,
          sentAt: new Date().toISOString(),
        };
      } else {
        console.warn('Resend API returned error:', resData);
        db.addAuditLog({
          userId: payload.email,
          userName: payload.displayName || payload.email,
          userRole: 'agent',
          action: 'LOGIN_ALERT_FAILED',
          resource: 'EmailNotification',
          resourceId: alertId,
          details: `Failed to deliver login alert to ${payload.email} via Resend: ${JSON.stringify(resData)}`,
        });

        return {
          success: false,
          alertId,
          deliveryStatus: 'failed',
          provider: 'resend',
          message: resData.message || 'Resend provider error',
          sentAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      console.error('Error invoking Resend API:', err);
      return {
        success: false,
        alertId,
        deliveryStatus: 'failed',
        provider: 'resend',
        message: err.message || 'Network error calling Resend',
        sentAt: new Date().toISOString(),
      };
    }
  }

  if (sendgridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.email }] }],
          from: { email: fromEmail.includes('<') ? fromEmail.split('<')[1].replace('>', '').trim() : fromEmail },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent },
          ],
        }),
      });

      if (response.ok || response.status === 202) {
        alertThrottleMap.set(email, now);
        db.addAuditLog({
          userId: payload.email,
          userName: payload.displayName || payload.email,
          userRole: 'agent',
          action: 'LOGIN_ALERT_DELIVERED',
          resource: 'EmailNotification',
          resourceId: alertId,
          details: `Login security alert delivered to ${payload.email} via SendGrid.`,
        });

        return {
          success: true,
          alertId,
          deliveryStatus: 'delivered',
          provider: 'sendgrid',
          message: `Login security alert email successfully sent to ${payload.email}`,
          sentAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      console.error('Error invoking SendGrid API:', err);
    }
  }

  // 3. If no live email provider API key configured: log strictly in audit trail with simulated status
  alertThrottleMap.set(email, now);
  db.addAuditLog({
    userId: payload.email,
    userName: payload.displayName || payload.email,
    userRole: 'agent',
    action: 'LOGIN_ALERT_SIMULATED',
    resource: 'EmailNotification',
    resourceId: alertId,
    details: `Login security alert generated for ${payload.email} (${providerLabel}, ${device}, ${browser}). Live dispatch paused: configure RESEND_API_KEY in .env to deliver to inboxes.`,
  });

  return {
    success: true,
    alertId,
    deliveryStatus: 'simulated_no_api_key',
    provider: 'local_audit_log',
    message: `Login alert logged in security audit trail. (To receive live emails in your inbox, set RESEND_API_KEY in .env).`,
    sentAt: new Date().toISOString(),
  };
}
