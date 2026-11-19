import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import type { Request, Response, NextFunction } from 'express';
import firebaseConfig from '../../firebase-applet-config.json';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth(getApp());

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  rawBody?: Buffer;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Thiếu token xác thực (Bearer token required).' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Token xác thực không hợp lệ.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
  }
}
