import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function hashPassword(password: string, userId: string): string {
  const salt = userId.toLowerCase();
  const hash = crypto.createHash('sha256');
  hash.update(salt + password);
  return hash.digest('hex');
}

export function generateToken(user: { id: string; user_id: string; name: string }): string {
  return jwt.sign(
    { id: user.id, userId: user.user_id, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { id: string; userId: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; userId: string; name: string };
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  return authHeader?.split(' ')[1] || null;
}

export function authenticateRequest(request: NextRequest): { id: string; userId: string; name: string } | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}
