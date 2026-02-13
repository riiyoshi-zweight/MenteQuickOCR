import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/server/supabase';
import { authenticateRequest } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const slipData = {
      ...body,
      workerName: user.name,
    };

    console.log('伝票登録開始:', slipData.slipType);

    // 重複チェック
    const { data: duplicates } = await supabase
      .from('slips')
      .select('id')
      .eq('slip_date', slipData.slipDate)
      .eq('client_name', slipData.clientName)
      .eq('net_weight', slipData.netWeight)
      .limit(1);

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json(
        { success: false, error: '同じ内容の伝票が既に登録されています' },
        { status: 409 }
      );
    }

    // 手動入力かどうかを判定
    const isManualInput = slipData.slipType === '自社入力' || slipData.slipType === 'selfinput' || slipData.isManualInput === true;

    // 伝票日付の処理
    let slipDate = slipData.slipDate;
    if (!slipDate || slipDate === '' || slipDate === 'null' || slipDate === 'undefined') {
      slipDate = new Date().toISOString().split('T')[0];
    }

    const insertData = {
      slip_date: slipDate,
      worker_name: slipData.workerName,
      client_name: slipData.clientName,
      net_weight: slipData.netWeight,
      manifest_number: slipData.manifestNumber,
      slip_type: slipData.slipType,
      is_manual_input: isManualInput,
      item_name: slipData.itemName || slipData.productName,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('slips')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }

    console.log('伝票登録完了:', data);

    return NextResponse.json({
      success: true,
      message: '伝票を登録しました',
    });
  } catch (error: any) {
    console.error('Submit slip error:', error);

    if (error.message && error.message.includes('重複')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: '伝票登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
