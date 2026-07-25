import { logger } from './logger';

export const CLIENT_URL = process.env.CLIENT_URL || 'https://autozord.com';

// Render can't establish an outbound SMTP connection to Hostinger's mail
// server from this Node process (confirmed: connection timeout on both
// port 465 and 587). Actual delivery is delegated to a small FastAPI
// service (autozord-notify-cron) that does the SMTP call itself, reached
// here over plain HTTPS instead.
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const { EMAIL_SERVICE_URL, EMAIL_SERVICE_KEY } = process.env;
  if (!EMAIL_SERVICE_URL || !EMAIL_SERVICE_KEY) {
    throw new Error('Email service is not configured (EMAIL_SERVICE_URL/EMAIL_SERVICE_KEY missing)');
  }

  let res: Response;
  try {
    res = await fetch(`${EMAIL_SERVICE_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EMAIL_SERVICE_KEY,
      },
      body: JSON.stringify(opts),
    });
  } catch (err) {
    logger.error('Failed to reach email service', err);
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('Email service rejected the request', { status: res.status, text });
    throw new Error(`Email service responded with ${res.status}`);
  }
}
