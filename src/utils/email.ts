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

interface LambdaResponse {
  statusCode: number;
  body: string; // JSON-encoded string: { success: boolean; message: string }
}

// Render can't establish an outbound SMTP connection to Hostinger's mail
// server from this Node process, or from a separate Python service also
// hosted on Render (confirmed: connection timeout / network unreachable
// on both port 465 and 587, over both IPv4 and IPv6). Delegating actual
// delivery to an AWS Lambda (via API Gateway) that does the SMTP call
// from AWS's network instead, reached here over plain HTTPS.
export async function sendEmail(opts: { to: string; subject: string; html: string; category?: EmailCategory }): Promise<void> {
  const category = opts.category ?? 'GENERIC';
  const { EMAIL_LAMBDA_URL, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_LAMBDA_URL || !EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    const message = 'Email is not configured (EMAIL_LAMBDA_URL/EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD missing)';
    await logEmail({ to: opts.to, subject: opts.subject, category, status: 'FAILED', errorMessage: message });
    throw new Error(message);
  }

  let res: Response;
  try {
    res = await fetch(EMAIL_LAMBDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtp_server: EMAIL_HOST,
        smtp_port: Number(EMAIL_PORT) || 465,
        sender_email: EMAIL_USER,
        sender_password: EMAIL_PASSWORD,
        recipient_email: opts.to,
        subject: opts.subject,
        body: opts.html,
      }),
    });
  } catch (err) {
    logger.error('Failed to reach email Lambda', err);
    await logEmail({ to: opts.to, subject: opts.subject, category, status: 'FAILED', errorMessage: (err as Error).message });
    throw err;
  }

  // This Lambda is fronted by a non-proxy API Gateway integration: the
  // HTTP status is always 200, and the real outcome is nested inside a
  // JSON-encoded string in the "body" field.
  const outer = (await res.json().catch(() => null)) as LambdaResponse | null;
  const inner = outer?.body ? (JSON.parse(outer.body) as { success: boolean; message: string }) : null;

  if (!inner?.success) {
    const errorMessage = inner?.message || `Unexpected Lambda response (HTTP ${res.status})`;
    logger.error('Email Lambda reported failure', { errorMessage });
    await logEmail({ to: opts.to, subject: opts.subject, category, status: 'FAILED', errorMessage: errorMessage.slice(0, 500) });
    throw new Error(errorMessage);
  }

  await logEmail({ to: opts.to, subject: opts.subject, category, status: 'SENT' });
}
