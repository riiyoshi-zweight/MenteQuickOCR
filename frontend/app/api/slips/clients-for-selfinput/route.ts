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

    const { data, error } = await supabase
      .from('client_master_for_selfinput')
      .select('*')
      .order('client_name_initial', { ascending: true });

    if (error) {
      console.error('Get clients for selfinput error:', error);
      return NextResponse.json(
        { success: false, error: '手動入力用得意先情報の取得に失敗しました' },
        { status: 500 }
      );
    }

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
    console.error('Get clients for selfinput error:', error);
    return NextResponse.json(
      { success: false, error: '手動入力用得意先情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
