import nodemailer from 'nodemailer';
import dns from 'dns';
import { logger } from './logger';

export const CLIENT_URL = process.env.CLIENT_URL || 'https://autozord.com';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function buildTransporter(): Promise<nodemailer.Transporter> {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error('Email is not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD missing)');
  }

  const port = Number(EMAIL_PORT) || 465;

  // Some cloud hosts (Render included) resolve this hostname to an IPv6
  // address that isn't actually routable from the container, so the
  // connection just hangs until it times out instead of failing fast.
  // Resolve to an IPv4 literal ourselves and connect to that directly,
  // keeping the real hostname for TLS SNI/certificate validation.
  let host = EMAIL_HOST;
  try {
    const resolved = await dns.promises.lookup(EMAIL_HOST, { family: 4 });
    host = resolved.address;
  } catch (err) {
    logger.error('Failed to resolve email host to IPv4, falling back to hostname', err);
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
    tls: { servername: EMAIL_HOST },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

function getTransporter(): Promise<nodemailer.Transporter> {
  if (!transporterPromise) transporterPromise = buildTransporter();
  return transporterPromise;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: `Autozord <${process.env.EMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    logger.error('Failed to send email', err);
    transporterPromise = null; // don't keep a possibly-bad cached connection/resolution
    throw err;
  }
}
