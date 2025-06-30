import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { jwtConfig } from '../config/jwt';

export interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtConfig.accessSecret) as { sub: string };

    req.user = { sub: payload.sub };

    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});
