import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/server/supabase';

const WEAK_SECRETS = new Set(['your-secret-key', 'secret', 'changeme', '']);
const JWT_SECRET = (() => {
  const s = process.env.JWT_SECRET;
  if (!s || WEAK_SECRETS.has(s)) {
    throw new Error('JWT_SECRET が未設定またはデフォルト値のままです。強力な乱数を .env.local に設定してください。');
  }
  return s;
})();

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function legacyHash(password: string, userId: string): string {
  const salt = userId.toLowerCase();
  const h = crypto.createHash('sha256');
  h.update(salt + password);
  return h.digest('hex');
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  userId: string,
): Promise<boolean> {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }
  return crypto.timingSafeEqual(
    Buffer.from(legacyHash(password, userId)),
    Buffer.from(storedHash),
  );
}

export const AUTH_COOKIE_NAME = 'session_token';
export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface TokenPayload { id: string; userId: string; name: string; pwAt?: number }

export function generateToken(user: { id: string; user_id: string; name: string; password_changed_at?: string | null }): string {
  const pwAt = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
  return jwt.sign(
    { id: user.id, userId: user.user_id, name: user.name, pwAt },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.get('authorization');
  return authHeader?.split(' ')[1] || null;
}

export async function authenticateRequest(request: NextRequest): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const { data: worker } = await supabase
    .from('workers')
    .select('password_changed_at')
    .eq('id', payload.id)
    .single();

  if (worker?.password_changed_at) {
    const dbPwAt = new Date(worker.password_changed_at).getTime();
    if ((payload.pwAt ?? 0) < dbPwAt) return null;
  }

  return payload;
}
