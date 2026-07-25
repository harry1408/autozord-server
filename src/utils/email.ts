import nodemailer from 'nodemailer';
import { logger } from './logger';

export const CLIENT_URL = process.env.CLIENT_URL || 'https://autozord.com';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error('Email is not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD missing)');
  }

  const port = Number(EMAIL_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: `Autozord <${process.env.EMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    logger.error('Failed to send email', err);
    throw err;
  }
}
