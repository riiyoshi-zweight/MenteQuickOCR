import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
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

    const { searchParams } = new URL(request.url);
    const slipType = searchParams.get('slipType');

    console.log('=== 得意先取得 ===');
    console.log('リクエストされた slipType:', slipType);

    let query = supabase
      .from('client_master')
      .select('*')
      .order('client_name_initial', { ascending: true });

    if (slipType && slipType !== '自社入力') {
      query = query.eq('slip_type', slipType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase エラー:', error);
      return NextResponse.json(
        { success: false, error: '得意先情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    console.log(`取得件数: ${data ? data.length : 0}件`);

    const mappedData = (data || []).map((client: any) => ({
      id: client.id,
      name: client.client_name,
      ...client,
    }));

    return NextResponse.json({
      success: true,
      data: mappedData,
    });
  } catch (error) {
    console.error('予期しないエラー:', error);
    return NextResponse.json(
      { success: false, error: '得意先情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
