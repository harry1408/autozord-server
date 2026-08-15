import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { sendEmail, wrapEmailHtml, EMAIL_COLORS } from '../utils/email';
import { isValidRegion, getSubscriptionPrice } from '../utils/pricing';
import { OTP_TTL_MINUTES, generateOtp, sendOtpEmail } from '../utils/otp';

const SELF_SERVE_PLANS = ['MONTHLY', 'YEARLY'];
const TRIAL_DAYS = 7;

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function sendRegistrationReceivedEmail(email: string, firstName: string, planType: string | null): Promise<void> {
  const planLabel = planType === 'YEARLY' ? 'Yearly' : 'Monthly';
  await sendEmail({
    to: email,
    subject: 'Autozord registration received',
    html: wrapEmailHtml(`<p style='margin:0 0 16px;'>Hi ${firstName},</p><p style='margin:0 0 16px;'>Thanks for verifying your email. You can log in now - we're reviewing your shop's registration and will notify you as soon as it's fully verified.</p><p style='margin:0;color:${EMAIL_COLORS.TEXT_MUTED};font-size:13px;'>Your ${planLabel} plan trial has already started.</p>`),
    category: 'REGISTRATION',
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
  address?: string;
  state: string;
  city: string;
  zip: string;
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
  if (existingUser && existingUser.emailVerifiedAt) {
    throw new AppError('Email already in use', 400);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const { currency, amount } = getSubscriptionPrice(data.country, data.planType as 'MONTHLY' | 'YEARLY');

  // An existing-but-unverified user is a leftover from a signup that was
  // never finished (OTP never entered, or it expired) - the email is
  // "taken" in the DB but nobody ever proved they own it, so treat this as
  // resuming that abandoned attempt rather than a conflict: refresh the
  // same shop/user with whatever was just submitted and send a fresh OTP,
  // instead of dead-ending with "Email already in use" with no way back in.
  if (existingUser) {
    const shop = await prisma.$transaction(async (tx) => {
      const shop = await tx.shop.update({
        where: { id: existingUser.shopId! },
        data: {
          name: data.shopName,
          planType: data.planType,
          country: data.country,
          currency,
          subscriptionPrice: amount,
          address: data.address,
          state: data.state,
          city: data.city,
          zip: data.zip,
        },
      });
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          emailOtp: otp,
          emailOtpExpiresAt: otpExpiresAt,
          termsAcceptedAt: new Date(),
        },
      });
      return shop;
    });

    await sendOtpEmail(data.email, data.firstName, otp);
    return { shopId: shop.id, shopName: shop.name };
  }

  const baseSlug = slugify(data.shopName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.shop.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

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
        address: data.address,
        state: data.state,
        city: data.city,
        zip: data.zip,
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
  const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
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

  await sendRegistrationReceivedEmail(user.email, user.firstName, user.shop?.planType ?? null);
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
