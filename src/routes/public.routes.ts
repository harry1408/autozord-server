import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicShops, createInquiry, signup } from '../controllers/public.controller';

const router = Router();

// Unauthenticated write endpoints - a fresh spam/abuse surface, so they're
// rate-limited per IP on top of the usual validation.
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many inquiries submitted. Please try again later.' },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many signup attempts. Please try again later.' },
});

router.get('/shops', getPublicShops);
router.post('/inquiries', inquiryLimiter, createInquiry);
router.post('/signup', signupLimiter, signup);

export default router;
