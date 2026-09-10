import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import {
  hashPassword,
  verifyPassword,
  isBcryptHash,
  generateToken,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE,
} from '@/lib/server/auth';
import { checkRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/server/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const { userId, password } = await request.json();

    const rateLimitResult = checkRateLimit(ip, userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: `試行回数が上限を超えました。${rateLimitResult.retryAfterSeconds}秒後に再試行してください` },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) } }
      );
    }

    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !worker) {
      recordFailedAttempt(ip, userId);
      return NextResponse.json(
        { success: false, error: 'ユーザーIDまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, worker.password_hash, userId);
    if (!valid) {
      recordFailedAttempt(ip, userId);
      return NextResponse.json(
        { success: false, error: 'ユーザーIDまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    resetAttempts(ip, userId);

    if (!isBcryptHash(worker.password_hash)) {
      const bcryptHash = await hashPassword(password);
      await supabase
        .from('workers')
        .update({ password_hash: bcryptHash })
        .eq('id', worker.id);
    }

    const token = generateToken(worker);

    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: worker.id,
          employeeId: worker.user_id,
          userId: worker.user_id,
          name: worker.name,
        },
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
