import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicShops, createInquiry } from '../controllers/public.controller';

const router = Router();

// Unauthenticated write endpoint - a fresh spam/abuse surface, so it's
// rate-limited per IP on top of the usual validation.
const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many inquiries submitted. Please try again later.' },
});

router.get('/shops', getPublicShops);
router.post('/inquiries', inquiryLimiter, createInquiry);

export default router;
