import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { sendEmail, wrapEmailHtml, EMAIL_COLORS } from '../utils/email';
import { isValidRegion, getSubscriptionPrice } from '../utils/pricing';

const SELF_SERVE_PLANS = ['MONTHLY', 'YEARLY'];
const TRIAL_DAYS = 7;
const OTP_TTL_MINUTES = 10;

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// NOTE: HTML attributes here must use single quotes, not double quotes.
// The email-sending Lambda's API Gateway uses a template that corrupts the
// JSON payload whenever a `"` appears inside a field value.
async function sendOtpEmail(email: string, firstName: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Verify your Autozord account',
    html: wrapEmailHtml(`<p style='margin:0 0 16px;'>Hi ${firstName},</p><p style='margin:0 0 20px;'>Your Autozord verification code is:</p><table role='presentation' cellpadding='0' cellspacing='0' style='margin:0 0 20px;'><tr><td bgcolor='${EMAIL_COLORS.BRAND_RED_TINT}' style='background-color:${EMAIL_COLORS.BRAND_RED_TINT};border:1px solid ${EMAIL_COLORS.BRAND_RED_BORDER};border-radius:8px;padding:16px 28px;text-align:center;'><span style='font-size:32px;font-weight:bold;letter-spacing:8px;color:${EMAIL_COLORS.BRAND_RED};'>${otp}</span></td></tr></table><p style='margin:0;color:${EMAIL_COLORS.TEXT_MUTED};font-size:13px;'>This code expires in ${OTP_TTL_MINUTES} minutes.</p>`),
    category: 'OTP',
  });
}

export async function createSignup(data: {
  shopName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  planType: string;
  country: string;
  acceptedTerms: boolean;
}) {
  if (!SELF_SERVE_PLANS.includes(data.planType)) {
    throw new AppError('Invalid plan selected', 400);
  }
  if (!isValidRegion(data.country)) {
    throw new AppError('Invalid region selected', 400);
  }
  if (!data.acceptedTerms) {
    throw new AppError('You must accept the Terms & Conditions', 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw new AppError('Email already in use', 400);

  const baseSlug = slugify(data.shopName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.shop.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const passwordHash = await bcrypt.hash(data.password, 10);
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const { currency, amount } = getSubscriptionPrice(data.country, data.planType as 'MONTHLY' | 'YEARLY');

  const { shop } = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: {
        name: data.shopName,
        slug,
        planType: data.planType,
        isVerified: false,
        trialEndsAt,
        country: data.country,
        currency,
        subscriptionPrice: amount,
      },
    });

    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'SHOP_ADMIN',
        shopId: shop.id,
        emailVerifiedAt: null,
        emailOtp: otp,
        emailOtpExpiresAt: otpExpiresAt,
        termsAcceptedAt: new Date(),
      },
    });

    return { shop, user };
  });

  await sendOtpEmail(data.email, data.firstName, otp);

  return { shopId: shop.id, shopName: shop.name };
}

export async function verifyOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.emailOtp || !user.emailOtpExpiresAt) {
    throw new AppError('Invalid or expired code', 400);
  }
  if (user.emailOtpExpiresAt.getTime() < Date.now()) {
    throw new AppError('This code has expired. Request a new one.', 400);
  }
  if (user.emailOtp !== otp) {
    throw new AppError('Incorrect code', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailOtp: null, emailOtpExpiresAt: null },
  });
}

export async function resendOtp(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('No pending signup found for this email', 404);
  if (user.emailVerifiedAt) throw new AppError('This email is already verified', 400);

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { emailOtp: otp, emailOtpExpiresAt: otpExpiresAt },
  });

  await sendOtpEmail(email, user.firstName, otp);
}
