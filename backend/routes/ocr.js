const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// 画像前処理 - より緩やかな処理で文字を保護
async function preprocessImage(base64Image) {
  try {
    const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // Get image metadata first
    const metadata = await sharp(buffer).metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
    
    let processedBuffer;
    
    // Only resize if image is very large (to save API tokens and preserve quality)
    if (metadata.width > 3000 || metadata.height > 3000) {
      processedBuffer = await sharp(buffer)
        .resize(3000, null, { 
          withoutEnlargement: true,
          fit: 'inside',
          kernel: sharp.kernel.lanczos3 // Better quality resize
        })
        .modulate({
          brightness: 1.05, // Slightly brighten
          saturation: 0.8   // Reduce saturation for better text contrast
        })
        .normalize() // Normalize contrast
        .jpeg({ 
          quality: 95,
          mozjpeg: true // Use mozjpeg encoder for better compression
        })
        .toBuffer();
    } else {
      // For smaller images, apply minimal processing
      processedBuffer = await sharp(buffer)
        .modulate({
          brightness: 1.05, // Slightly brighten
          saturation: 0.8   // Reduce saturation for better text contrast
        })
        .normalize() // Normalize contrast
        .jpeg({ 
          quality: 95,
          mozjpeg: true
        })
        .toBuffer();
    }
    
    const processedMetadata = await sharp(processedBuffer).metadata();
    console.log(`Processed image: ${processedMetadata.width}x${processedMetadata.height}`);
    
    return `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return base64Image; // 前処理失敗時は元の画像を返す
  }
}

// OCR処理エンドポイント
router.post('/process-base64', authenticateToken, async (req, res) => {
  try {
    const { image, slipType, usePreprocessing = true, useHighDetail = false } = req.body;
    
    if (!image || !slipType) {
      return res.status(400).json({
        success: false,
        error: '画像とタイプが必要です'
      });
    }
    
    console.log(`OCR処理開始: ${slipType} (部分的成功許可版)`);
    
    // 画像前処理
    const processedImage = usePreprocessing ? await preprocessImage(image) : image;
    
    // プロンプトの準備
    const prompt = getPromptForSlipType(slipType);
    
    // OpenAI Vision APIを呼び出し (常に最高精度で処理)
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // 常にgpt-4oを使用
      messages: [
        {
          role: "system",
          content: "あなたは日本語の産業廃棄物伝票を正確に読み取るOCRアシスタントです。特に正味重量の数値は最重要項目として確実に読み取ってください。手書き文字も含めて注意深く読み取り、読み取れなかった項目はnullまたは空文字として返してください。"
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: {
                url: processedImage,
                detail: "high" // 常にhighを使用
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1 // より確実な結果のため低めに設定
    });
    
    // レスポンスの解析
    const result = parseOCRResponse(response.choices[0].message.content, slipType);
    
    console.log('OCR処理完了:', {
      hasNetWeight: !!result.netWeight,
      hasClientName: !!result.clientName,
      hasDate: !!result.slipDate,
      hasProduct: !!result.productName,
      rawValues: {
        netWeight: result.netWeight,
        clientName: result.clientName,
        slipDate: result.slipDate,
        productName: result.productName
      }
    });
    
    // Validate net weight (most critical field)
    const netWeightValid = result.netWeight && !isNaN(parseFloat(result.netWeight));
    
    // Always return success, even with partial data
    // Frontend will handle missing fields appropriately
    res.json({
      success: true,
      data: result,
      readQuality: {
        netWeight: netWeightValid ? 'good' : 'missing',
        clientName: result.clientName ? 'good' : 'missing',
        slipDate: result.slipDate ? 'good' : 'default',
        productName: result.productName ? 'good' : 'missing'
      },
      confidence: {
        netWeight: netWeightValid ? 100 : 0,
        clientName: result.clientName ? 80 : 0,
        slipDate: result.slipDate && result.slipDate !== new Date().toISOString().split('T')[0] ? 80 : 50,
        productName: result.productName ? 80 : 0
      }
    });
    
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OCR処理中にエラーが発生しました'
    });
  }
});

// 伝票タイプ別のプロンプト取得
function getPromptForSlipType(slipType) {
  const prompts = {
    '受領証': `この画像は産業廃棄物の受領証です。以下の情報を正確に抽出してください：

1. 日付（slipDate）
   - 上部の赤枠内「2025/__/__」形式の日付
   - YYYY-MM-DD形式に変換してください

2. 得意先名（clientName）【重要】
   - 必ず以下の手順で探してください：
   - 上部の表で「現場」という文字を探す
   - 「現場」の右側にある会社名を読み取る
   - 得意先は必ず「（株）ブルボン」で始まる
   - 「（株）ブルボン　上越工場」または「（株）ブルボン　柏崎工場」のいずれか
   - 下部の「新潟環境開発株式会社」は受領側なので絶対に読み取らない

3. 品名（productName）
   - 「000600」などのコードの右側にある品目名（例：廃プラスチック類）
   - コード番号は除外し、品名のみを取得

4. 正味重量（netWeight）【最重要】
   - 必ず以下の手順で取得してください：
   - 表のヘッダー行を確認：「総重量」「空車」「正味」の3つの列がある
   - 「正味」と書かれた列を特定（一番右側の列）
   - 「合計」と書かれた行を探す
   - 「合計」行と「正味」列が交差するセルの値を読む
   - 絶対に「空車」列の値を読まないこと！
   - 例：合計行で「正味」列が1,260.0なら、それが答え
   - カンマは除去（1,260.0 → 1260.0）
   - kg単位は除去

警告：
- 「空車」列（中央の列）の値は絶対に読まない
- 必ず「正味」列（右端の列）から読む
- 得意先は必ず「ブルボン」を含む
- マニフェスト番号（manifestNumber）は記載されていないのでnull

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "得意先名",
  "productName": "品名",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": null
}`,
    
    '検量書': `この画像は検量書です。表形式のレイアウトで、左側に項目名、右側に値が記載されています。
以下の情報を正確に抽出してください：

1. 日付（slipDate）
   - 「0日付」または「日付」というラベルの右側（同じ行）にある値
   - 形式例：25.01.10（YY.MM.DD形式）
   - 20YY-MM-DD形式に変換してください
   - 赤枠で強調されている場合があります

2. 銘柄/品名（productName）【重要】
   - 「1.銘柄」または「1銘柄」というラベルの右側（同じ行）にある値
   - 「3銘柄」「3」のラベルの右側にある場合もあります
   - 赤枠で強調されている場合があります
   - よくあるパターン：
     * 「106 汚泥」→ 「汚泥」のみを抽出
     * 数字＋スペース＋品名の形式が多い
     * 品名は手書きの場合があるので注意深く読み取る
   - 一般的な品名：汚泥、廃プラ、木くず、がれき類、廃油など
   - 数字部分は必ず除外して、品名のみを抽出してください

3. 得意先名（clientName）
   - 「4」または「4.」というラベルの右側（同じ行）にある値
   - 手書きで記載されている重要な項目です
   - 「○○便」「○○帰り便」のような形式が多いです（例：アース帰り便）
   - 赤枠で強調されている場合があります

4. 正味重量（netWeight）
   - 「正味」というラベルの右側（同じ行）にある値
   - 「4正味量」と書かれている場合もあります
   - 数値とkg単位（例：9290kg）
   - 数値のみ抽出（kg単位は除去）
   - カンマは含まれない

注意事項：
- すべての項目は表の行として左側にラベル、右側に値があります
- 手書き文字は特に注意深く読み取ってください
- フッターの「上越マテリアル株式会社」は得意先ではありません
- 赤枠で強調されている値を優先的に読み取ってください
- マニフェスト番号（manifestNumber）は通常記載されていないのでnull

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "得意先名",
  "productName": "品名（数字を除く）",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": null
}`,
    
    '計量伝票': `この画像は青い背景の計量伝票です。すべてのテキストを注意深く読み取ってください。

特に重要な項目：

1. 日付（slipDate）
   - 上部にあります
   - 年月日の形式で記載されています
   - YYYY-MM-DD形式に変換してください

2. 得意先名（clientName）- コード1の行
   - 「コード1」という文字を探してください
   - その右に4桁の数字があります
   - さらにその右に会社名があります（妙高アクアクリーンセンターなど）
   - ハイフン（-）が含まれることがあります
   - 数字は除外し、会社名のみを抽出してください

3. 品目名（productName）- コード2の行【最重要】
   - 「コード2」という文字を探してください
   - その右に4桁の数字があります
   - さらにその右に品目名/銘柄があります（例：汚泥、廃プラ、有機性汚泥など）
   - この品目名は重要なので、しっかり読み取ってください
   - 数字は除外し、品目名のみを抽出してください

4. 正味重量（netWeight）
   - 「正味重量」という文字を探してください
   - その右横に数値（kg）があります
   - 補正Cの行にある場合もあります
   - 数値のみ抽出（kg単位は除去）

5. マニフェスト番号（manifestNumber）
   - マニフェスト番号の記載があれば読み取ってください
   - なければnull

注意：
- 画面は青い背景で、黒い文字で印字されています
- 数値は右寄せで表示されていることが多いです

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "得意先名（コード番号は除く）",
  "productName": "品目名（コード番号は除く）",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": "番号またはnull"
}`,
    
    '計量票': `この画像は計量票です。以下の情報を正確に抽出してください：

1. 日付（slipDate）
   - 通常は書類の上部に記載されています
   - 年月日形式で記載されています
   - YYYY-MM-DD形式に変換してください

2. 現場名/得意先（clientName）【最重要】
   - 「現場：」という文字を探してください
   - その後に記載されている内容を読み取ってください
   - よくある現場名：
     * 上越マテリアル、バイオマス → 「バイオマス」
     * 上越市、下水道、センター → 「上越市下水道センター」
   - 複数行にまたがる場合があるので注意してください
   - 改行や空白に注意して、完全な名称を読み取ってください

3. 品目名（productName）
   - 「品名：」という文字の後の内容
   - 廃棄物の種類（汚泥、廃プラ、木くずなど）を探してください
   - 一般的な品名：汚泥、廃プラスチック類、木くず、がれき類など

4. 正味重量（netWeight）
   - 「正味」「正味重量」「正味計」「NET」などの表記を探してください
   - kg単位の数値を読み取ってください
   - 数値のみ抽出（kg単位は除去）

5. マニフェスト番号（manifestNumber）
   - 番号欄やマニフェスト番号の記載があれば読み取ってください
   - なければnull

重要：
- 「現場：」の後の内容が得意先名です
- 改行や空白に注意して、完全な名称を読み取ってください
- 書類下部の会社名は発行元なので得意先ではありません

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "現場名/得意先名",
  "productName": "品目名",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": "番号またはnull"
}`
  };
  
  return prompts[slipType] || prompts['受領証'];
}

// OCRレスポンスの解析
function parseOCRResponse(content, slipType) {
  try {
    // JSONとして解析を試みる
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result;
    
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
      // フィールド名の正規化
      result = {
        slipDate: result.slipDate || result.date || result.日付,
        clientName: result.clientName || result.得意先名 || result.現場名,
        productName: result.productName || result.itemName || result.品名 || result.品目名 || result.銘柄,
        netWeight: result.netWeight || result.正味重量,
        manifestNumber: result.manifestNumber || result.マニフェスト番号 || null,
        slipType: slipType
      };
    } else {
      // テキストから情報を抽出（フォールバック）
      result = {
        slipDate: extractValue(content, '日付') || extractValue(content, 'slipDate'),
        clientName: extractValue(content, '得意先') || extractValue(content, '現場') || extractValue(content, 'clientName'),
        productName: extractValue(content, '品名') || extractValue(content, '品目') || extractValue(content, '銘柄') || extractValue(content, 'productName'),
        netWeight: extractValue(content, '正味') || extractValue(content, 'netWeight'),
        manifestNumber: extractValue(content, 'マニフェスト') || extractValue(content, 'manifestNumber'),
        slipType: slipType
      };
    }
    
    // 数値の正規化（カンマやkg単位を除去）
    if (result.netWeight) {
      result.netWeight = String(result.netWeight)
        .replace(/,/g, '')
        .replace(/kg/gi, '')
        .replace(/\s/g, '')
        .trim();
    }
    
    // 日付が取得できなかった場合、現在の日付を設定
    if (!result.slipDate || result.slipDate === '' || result.slipDate === 'null' || result.slipDate === 'undefined') {
      result.slipDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
    }
    
    // manifestNumberが空文字の場合はnullに
    if (!result.manifestNumber || result.manifestNumber === '') {
      result.manifestNumber = null;
    }
    
    return result;
  } catch (error) {
    console.error('Parse error:', error);
    return {
      error: '解析エラー',
      rawContent: content,
      slipDate: new Date().toISOString().split('T')[0], // エラー時も日付を設定
      slipType: slipType
    };
  }
}

// 値の抽出ヘルパー
function extractValue(text, key) {
  const regex = new RegExp(`${key}[：:：\\s]*([^\\n]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

module.exports = router;