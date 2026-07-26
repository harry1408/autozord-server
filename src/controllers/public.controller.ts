import { Request, Response, NextFunction } from 'express';
import * as inquiryService from '../services/inquiry.service';
import * as signupService from '../services/signup.service';

export async function getPublicShops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inquiryService.getPublicShops() });
  } catch (err) { next(err); }
}

export async function createInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, vehicleInfo, message, shopIds, acceptedTerms } = req.body;
    if (!name || !email || !message) {
      res.status(400).json({ success: false, message: 'Name, email, and message are required' });
      return;
    }
    if (!Array.isArray(shopIds) || shopIds.length === 0) {
      res.status(400).json({ success: false, message: 'Select at least one shop' });
      return;
    }
    if (!acceptedTerms) {
      res.status(400).json({ success: false, message: 'You must accept the Terms & Conditions' });
      return;
    }
    const data = await inquiryService.createInquiry({ name, email, phone, vehicleInfo, message, shopIds, acceptedTerms });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { shopName, firstName, lastName, email, password, planType, acceptedTerms } = req.body;
    if (!shopName || !firstName || !lastName || !email || !password || !planType) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    if (!acceptedTerms) {
      res.status(400).json({ success: false, message: 'You must accept the Terms & Conditions' });
      return;
    }
    const data = await signupService.createSignup({ shopName, firstName, lastName, email, password, planType, acceptedTerms });
    res.status(201).json({
      success: true,
      data,
      message: 'Check your email for a verification code.',
    });
  } catch (err) { next(err); }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and code are required' });
      return;
    }
    await signupService.verifyOtp(email, otp);
    res.json({
      success: true,
      message: 'Email verified. We\'ll verify your account and email you once you can log in.',
    });
  } catch (err) { next(err); }
}

export async function resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }
    await signupService.resendOtp(email);
    res.json({ success: true, message: 'A new code has been sent.' });
  } catch (err) { next(err); }
}
