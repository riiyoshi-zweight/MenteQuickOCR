import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { hashPassword, generateToken } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    console.log('Login attempt for:', userId);

    // workersテーブルからユーザー情報を取得
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !worker) {
      console.log('Worker not found:', error);
      return NextResponse.json(
        { success: false, error: 'ユーザーIDまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワード検証
    const hashedPassword = hashPassword(password, userId);

    if (worker.password_hash !== hashedPassword) {
      console.log('Password mismatch');
      return NextResponse.json(
        { success: false, error: 'ユーザーIDまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // トークン生成
    const token = generateToken(worker);

    console.log('Login successful for:', worker.name);

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: worker.id,
          employeeId: worker.user_id,
          userId: worker.user_id,
          name: worker.name,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
