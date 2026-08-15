import { sendEmail, wrapEmailHtml, EMAIL_COLORS } from './email';

export const OTP_TTL_MINUTES = 10;

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// NOTE: HTML attributes here must use single quotes, not double quotes.
// The email-sending Lambda's API Gateway uses a template that corrupts the
// JSON payload whenever a `"` appears inside a field value.
export async function sendOtpEmail(email: string, firstName: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Verify your Autozord account',
    html: wrapEmailHtml(`<p style='margin:0 0 16px;'>Hi ${firstName},</p><p style='margin:0 0 20px;'>Your Autozord verification code is:</p><table role='presentation' cellpadding='0' cellspacing='0' style='margin:0 0 20px;'><tr><td bgcolor='${EMAIL_COLORS.BRAND_RED_TINT}' style='background-color:${EMAIL_COLORS.BRAND_RED_TINT};border:1px solid ${EMAIL_COLORS.BRAND_RED_BORDER};border-radius:8px;padding:16px 28px;text-align:center;'><span style='font-size:32px;font-weight:bold;letter-spacing:8px;color:${EMAIL_COLORS.BRAND_RED};'>${otp}</span></td></tr></table><p style='margin:0;color:${EMAIL_COLORS.TEXT_MUTED};font-size:13px;'>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`),
    category: 'OTP',
  });
}
