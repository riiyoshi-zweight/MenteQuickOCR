import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { sendPasswordResetEmail } from '@/lib/server/email';

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    const { data: worker } = await supabase
      .from('workers')
      .select('id, email')
      .eq('user_id', userId)
      .single();

    if (!worker?.email) {
      return NextResponse.json({ success: true, message: '登録済みメールアドレスにリセットリンクを送信しました' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();

    await supabase
      .from('password_reset_tokens')
      .insert({ worker_id: worker.id, token_hash: tokenHash, expires_at: expiresAt });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(worker.email, resetUrl);

    return NextResponse.json({ success: true, message: '登録済みメールアドレスにリセットリンクを送信しました' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'パスワードリセットの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
