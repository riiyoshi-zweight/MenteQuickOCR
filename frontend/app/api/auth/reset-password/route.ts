import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { hashPassword } from '@/lib/server/auth';
import { validatePassword } from '@/lib/password-policy';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    const policy = validatePassword(newPassword);
    if (!policy.valid) {
      return NextResponse.json(
        { success: false, error: policy.errors.join('、') },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: resetRecord, error: fetchError } = await supabase
      .from('password_reset_tokens')
      .select('id, worker_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .single();

    if (fetchError || !resetRecord) {
      return NextResponse.json(
        { success: false, error: 'リセットトークンが無効です' },
        { status: 400 }
      );
    }

    if (resetRecord.used_at) {
      return NextResponse.json(
        { success: false, error: 'このリセットリンクは既に使用されています' },
        { status: 400 }
      );
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'リセットリンクの有効期限が切れています' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('workers')
      .update({ password_hash: newHash, password_changed_at: now })
      .eq('id', resetRecord.worker_id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    await supabase
      .from('password_reset_tokens')
      .update({ used_at: now })
      .eq('id', resetRecord.id);

    return NextResponse.json({ success: true, message: 'パスワードが更新されました' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'パスワードリセットの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
