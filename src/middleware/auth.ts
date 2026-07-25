import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

// Shop-staff roles — every route gated by these rejects GLOBAL_ADMIN's
// counterpart (a shop-less, non-staff account such as CUSTOMER) at the
// perimeter, before any service/shopScope logic runs. GLOBAL_ADMIN itself
// always passes via the bypass in authorize() below.
export const SHOP_ROLES = ['SHOP_ADMIN', 'MANAGER', 'TECHNICIAN', 'RECEPTIONIST'];

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  shopId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'autoshop360-super-secret-jwt-key-change-in-production';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    if (req.user.role === 'GLOBAL_ADMIN') {
      next();
      return;
    }
    // Any non-GLOBAL_ADMIN account with no shopId is unassigned/orphaned -
    // fail closed rather than let shopScope(null) treat it as unscoped
    // (which would otherwise expose every shop's data to this account).
    if (!req.user.shopId) {
      throw new AppError('Account is not assigned to a shop', 403);
    }
    if (roles.length && !roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(payload: JwtPayload): string {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'autoshop360-refresh-secret-change-in-production';
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): JwtPayload {
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'autoshop360-refresh-secret-change-in-production';
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
