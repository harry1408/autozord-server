import { Request, Response, NextFunction } from 'express';
import * as inquiryService from '../services/inquiry.service';
import * as signupService from '../services/signup.service';
import { detectRegion as detectRegionFromIp } from '../utils/geoRegion';

export async function getPublicShops(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await inquiryService.getPublicShops() });
  } catch (err) { next(err); }
}

// Display-only lookup the signup page calls on load, to show the right
// currency/price before the visitor submits anything. The actual signup
// endpoint re-derives the region itself from the request IP rather than
// trusting whatever this returned, so it can't be spoofed.
export async function detectRegion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: { country: detectRegionFromIp(req.ip) } });
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
    const { shopName, firstName, lastName, email, password, planType, acceptedTerms, address, state, city, zip } = req.body;
    if (!shopName || !firstName || !lastName || !email || !password || !planType) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }
    if (!state || !city || !zip) {
      res.status(400).json({ success: false, message: 'State/Province, city, and postal code are required' });
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
    // Region is always re-derived from the request IP here, never trusted
    // from the client, so it can't be spoofed by editing request state.
    // This also doubles as the shop's address country - state/city/zip are
    // ordinary profile fields with no pricing implication, so those are
    // taken from the client as submitted.
    const country = detectRegionFromIp(req.ip);
    const data = await signupService.createSignup({ shopName, firstName, lastName, email, password, planType, country, acceptedTerms, address, state, city, zip });
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
      message: 'Email verified. You can log in now while we finish reviewing your shop\'s registration.',
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
