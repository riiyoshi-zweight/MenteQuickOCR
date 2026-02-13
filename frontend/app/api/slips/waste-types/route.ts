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
      .from('wastetype_master')
      .select('*')
      .order('waste_id', { ascending: true });

    if (error) {
      console.error('Get waste types error:', error);
      return NextResponse.json(
        { success: false, error: '品目情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    const mappedData = (data || []).map((wasteType: any) => ({
      id: wasteType.waste_id,
      name: wasteType.waste_type,
      ...wasteType,
    }));

    return NextResponse.json({
      success: true,
      data: mappedData,
    });
  } catch (error) {
    console.error('Get waste types error:', error);
    return NextResponse.json(
      { success: false, error: '品目情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
