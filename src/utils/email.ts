import { logger } from './logger';
import { prisma } from './prisma';

export const CLIENT_URL = process.env.CLIENT_URL || 'https://autozord.com';

export type EmailCategory = 'OTP' | 'PASSWORD_RESET' | 'GENERIC';

async function logEmail(data: { to: string; subject: string; category: EmailCategory; status: 'SENT' | 'FAILED'; errorMessage?: string }): Promise<void> {
  try {
    await prisma.emailLog.create({ data });
  } catch (err) {
    // Logging is best-effort - never let it mask the real send outcome.
    logger.error('Failed to write email log', err);
  }
}

// Render can't establish an outbound SMTP connection to Hostinger's mail
// server from this Node process (confirmed: connection timeout on both
// port 465 and 587). Actual delivery is delegated to a small FastAPI
// service (autozord-notify-cron) that does the SMTP call itself, reached
// here over plain HTTPS instead.
export async function sendEmail(opts: { to: string; subject: string; html: string; category?: EmailCategory }): Promise<void> {
  const category = opts.category ?? 'GENERIC';
  const { EMAIL_SERVICE_URL, EMAIL_SERVICE_KEY } = process.env;
  if (!EMAIL_SERVICE_URL || !EMAIL_SERVICE_KEY) {
    const message = 'Email service is not configured (EMAIL_SERVICE_URL/EMAIL_SERVICE_KEY missing)';
    await logEmail({ to: opts.to, subject: opts.subject, category, status: 'FAILED', errorMessage: message });
    throw new Error(message);
  }

  let res: Response;
  try {
    res = await fetch(`${EMAIL_SERVICE_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EMAIL_SERVICE_KEY,
      },
      body: JSON.stringify({ to: opts.to, subject: opts.subject, html: opts.html }),
    });
  } catch (err) {
    logger.error('Failed to reach email service', err);
    await logEmail({ to: opts.to, subject: opts.subject, category, status: 'FAILED', errorMessage: (err as Error).message });
    throw err;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('Email service rejected the request', { status: res.status, text });
    await logEmail({ to: opts.to, subject: opts.subject, category, status: 'FAILED', errorMessage: `HTTP ${res.status}: ${text}`.slice(0, 500) });
    throw new Error(`Email service responded with ${res.status}`);
  }

  await logEmail({ to: opts.to, subject: opts.subject, category, status: 'SENT' });
}
