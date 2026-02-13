import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        userId: user.userId,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { success: false, error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
