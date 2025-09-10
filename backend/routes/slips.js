const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Supabaseクライアントの初期化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 認証ミドルウェア
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: '無効なトークンです' });
    }
    req.user = user;
    next();
  });
}

// テーブル名の判定（すべてslipsテーブルを使用）
function getTableName(slipType, companyName) {
  return 'slips';
}

// 重複チェック
async function checkDuplicate(slipDate, clientName, netWeight) {
  const { data, error } = await supabase
    .from('slips')
    .select('id')
    .eq('slip_date', slipDate)
    .eq('client_name', clientName)
    .eq('net_weight', netWeight)
    .limit(1);
  
  if (!error && data && data.length > 0) {
    console.log('Duplicate found in slips table');
    return true;
  }
  
  return false;
}

// 伝票登録エンドポイント
router.post('/', authenticateToken, async (req, res) => {
  console.log('=== 伝票登録リクエスト受信 ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('User:', req.user);
  
  try {
    const slipData = {
      ...req.body,
      workerName: req.user.name
    };
    
    console.log('伝票登録開始:', slipData.slipType);
    console.log('登録データ:', slipData);
    
    // 重複チェック
    const isDuplicate = await checkDuplicate(
      slipData.slipDate,
      slipData.clientName,
      slipData.netWeight
    );
    
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: '同じ内容の伝票が既に登録されています'
      });
    }
    
    // データベースに登録
    const tableName = getTableName(slipData.slipType, slipData.companyName);
    
    // 手動入力かどうかを判定
    const isManualInput = slipData.slipType === '自社入力' || slipData.slipType === 'selfinput' || slipData.isManualInput === true;
    
    // 伝票日付の処理（未設定または無効な場合は現在の日付を使用）
    let slipDate = slipData.slipDate;
    if (!slipDate || slipDate === '' || slipDate === 'null' || slipDate === 'undefined') {
      slipDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
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
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from(tableName)
      .insert([insertData])
      .select();
    
    if (error) {
      console.error('Insert error:', error);
      throw error;
    }
    
    console.log('伝票登録完了:', data);
    
    res.json({
      success: true,
      message: '伝票を登録しました'
    });
    
  } catch (error) {
    console.error('Submit slip error:', error);
    
    if (error.message && error.message.includes('重複')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '伝票登録中にエラーが発生しました'
    });
  }
});

// 得意先一覧取得エンドポイント（slip_typeでフィルタリング）
router.get('/clients', authenticateToken, async (req, res) => {
  try {
    const { slipType } = req.query;
    console.log('Getting clients for slipType:', slipType);
    
    // slip_typeが指定されている場合はフィルタリング
    let query = supabase
      .from('client_master')
      .select('*');
    
    if (slipType && slipType !== '自社入力') {
      // slip_typeカラムでフィルタリング
      query = query.eq('slip_type', slipType);
    }
    
    const { data, error } = await query.order('client_name');
    
    if (error) {
      console.error('Get clients error:', error);
      return res.status(500).json({
        success: false,
        error: '得意先情報の取得に失敗しました'
      });
    }
    
    // client_nameフィールドをnameにマッピング
    const mappedData = (data || []).map(client => ({
      id: client.id,
      name: client.client_name,
      slipType: client.slip_type,
      ...client
    }));
    
    console.log(`Found ${mappedData.length} clients for slipType: ${slipType}`);
    
    res.json({
      success: true,
      data: mappedData
    });
    
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: '得意先情報の取得に失敗しました'
    });
  }
});

// 品目一覧取得エンドポイント
router.get('/waste-types', authenticateToken, async (req, res) => {
  try {
    // wastetype_masterテーブルから取得
    const { data, error } = await supabase
      .from('wastetype_master')
      .select('*')
      .order('waste_id', { ascending: true });
    
    if (error) {
      console.error('Get waste types error:', error);
      return res.status(500).json({
        success: false,
        error: '品目情報の取得に失敗しました'
      });
    }
    
    // waste_typeフィールドをnameにマッピング
    const mappedData = (data || []).map(wasteType => ({
      id: wasteType.waste_id,
      name: wasteType.waste_type,
      ...wasteType
    }));
    
    res.json({
      success: true,
      data: mappedData
    });
    
  } catch (error) {
    console.error('Get waste types error:', error);
    res.status(500).json({
      success: false,
      error: '品目情報の取得に失敗しました'
    });
  }
});

// 手動入力用得意先一覧取得エンドポイント
router.get('/clients-for-selfinput', authenticateToken, async (req, res) => {
  try {
    // client_master_for_selfinputテーブルから取得
    const { data, error } = await supabase
      .from('client_master_for_selfinput')
      .select('*')
      .order('client_name');
    
    if (error) {
      console.error('Get clients for selfinput error:', error);
      return res.status(500).json({
        success: false,
        error: '手動入力用得意先情報の取得に失敗しました'
      });
    }
    
    // client_nameフィールドをnameにマッピング
    const mappedData = (data || []).map(client => ({
      id: client.id,
      name: client.client_name,
      ...client
    }));
    
    res.json({
      success: true,
      data: mappedData
    });
    
  } catch (error) {
    console.error('Get clients for selfinput error:', error);
    res.status(500).json({
      success: false,
      error: '手動入力用得意先情報の取得に失敗しました'
    });
  }
});

module.exports = router;