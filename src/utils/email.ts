import { logger } from './logger';
import { prisma } from './prisma';

export const CLIENT_URL = process.env.CLIENT_URL || 'https://autozord.com';

const LOGO_URL = `${CLIENT_URL}/logo.png`;

export type EmailCategory = 'OTP' | 'PASSWORD_RESET' | 'INVOICE' | 'GENERIC';

// Wraps transactional email bodies with the Autozord logo header. Kept to
// single-quoted attributes and no line breaks, same as the rest of these
// templates, since the Lambda's API Gateway mapping template corrupts the
// JSON payload on a literal `"` or embedded newline.
export function wrapEmailHtml(innerHtml: string): string {
  return `<div style='text-align:center;margin-bottom:24px;'><img src='${LOGO_URL}' alt='Autozord' style='height:48px;'/></div>${innerHtml}`;
}

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

// The Lambda's API Gateway integration corrupts the JSON payload whenever a
// field value contains a `"` or an embedded newline (even though the JSON
// itself is perfectly valid - this is a mapping-template bug on the AWS
// side, confirmed by testing, not something fixable here). Neutralize both
// so a future multi-line template or a literal quote in content can't
// silently break delivery again.
function sanitizeForLambda(text: string): string {
  return text.replace(/"/g, "'").replace(/\s*\n\s*/g, ' ');
}

// Strips accidental surrounding quotes from an env var - a common paste
// mistake (e.g. entering "smtp.hostinger.com" instead of smtp.hostinger.com
// into Render's dashboard), and one that would otherwise reproduce the same
// Lambda request-mapping bug sanitizeForLambda works around above.
function cleanEnvValue(value: string): string {
  return value.trim().replace(/^"(.*)"$/, '$1');
}

// Render can't establish an outbound SMTP connection to Hostinger's mail
// server from this Node process, or from a separate Python service also
// hosted on Render (confirmed: connection timeout / network unreachable
// on both port 465 and 587, over both IPv4 and IPv6). Delegating actual
// delivery to an AWS Lambda (via API Gateway) that does the SMTP call
// from AWS's network instead, reached here over plain HTTPS.
export interface EmailAttachment {
  filename: string; // must not contain `"` or a newline - see sanitizeForLambda note above
  contentBase64: string;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; category?: EmailCategory; attachment?: EmailAttachment }): Promise<void> {
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
        smtp_server: cleanEnvValue(EMAIL_HOST),
        smtp_port: Number(EMAIL_PORT) || 465,
        sender_email: cleanEnvValue(EMAIL_USER),
        sender_password: cleanEnvValue(EMAIL_PASSWORD),
        recipient_email: opts.to,
        subject: sanitizeForLambda(opts.subject),
        body: sanitizeForLambda(opts.html),
        ...(opts.attachment ? {
          attachment_filename: sanitizeForLambda(opts.attachment.filename),
          attachment_base64: opts.attachment.contentBase64,
        } : {}),
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
