import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { authenticateRequest } from '@/lib/server/auth';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// 画像前処理
async function preprocessImage(base64Image: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const metadata = await sharp(buffer).metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    let processedBuffer: Buffer;

    if ((metadata.width || 0) > 3000 || (metadata.height || 0) > 3000) {
      processedBuffer = await sharp(buffer)
        .resize(3000, null, {
          withoutEnlargement: true,
          fit: 'inside',
          kernel: sharp.kernel.lanczos3,
        })
        .modulate({ brightness: 1.05, saturation: 0.8 })
        .normalize()
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();
    } else {
      processedBuffer = await sharp(buffer)
        .modulate({ brightness: 1.05, saturation: 0.8 })
        .normalize()
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();
    }

    const processedMetadata = await sharp(processedBuffer).metadata();
    console.log(`Processed image: ${processedMetadata.width}x${processedMetadata.height}`);

    return `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return base64Image;
  }
}

// 伝票タイプ別のプロンプト取得
function getPromptForSlipType(slipType: string): string {
  const prompts: Record<string, string> = {
    '受領証': `この画像は環境開発の産業廃棄物受領証です。以下の情報を正確に抽出してください：

レイアウト詳細：
- 日付は左上にあります
- 得意先は「現場」の右側にあります
- 品名は「品名」ラベルの下にあります

1. 日付（slipDate）
   - 左上にある日付を探してください
   - 赤枠内「2025/__/__」形式の日付
   - YYYY-MM-DD形式に変換してください

2. 得意先名（clientName）【重要】
   - 「現場」という文字を探してください
   - その右側（同じ行）にある会社名を読み取ってください
   - よくある得意先：
     * （株）ブルボン 上越工場
     * （株）ブルボン 柏崎工場
     * その他の工場名
   - 下部の「新潟環境開発株式会社」は受領側なので絶対に読み取らない

3. 品名（productName）
   - 「品名」というラベルを探してください
   - その下にあるコード番号（000600など）の右側の品目名を読み取ってください
   - 例：廃プラスチック類、汚泥、廃油など
   - コード番号は除外し、品名のみを取得

4. 正味重量（netWeight）【最重要】
   - 表のヘッダー行を確認：「総重量」「空車」「正味」の3つの列がある
   - 「正味」と書かれた列を特定（一番右側の列）
   - 「合計」と書かれた行を探す
   - 「合計」行と「正味」列が交差するセルの値を読む
   - 絶対に「空車」列の値を読まないこと！
   - カンマは除去（1,260.0 → 1260.0）
   - kg単位は除去

警告：
- 「空車」列（中央の列）の値は絶対に読まない
- 必ず「正味」列（右端の列）から読む
- 電子マニフェスト番号（manifestNumber）は常に空白（null）

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "得意先名",
  "productName": "品名",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": null
}`,

    '検量書': `この画像はJマテバイオの検量書です。以下の情報を正確に抽出してください：

レイアウト詳細：
- 右上に日付が記載（25.01.10形式、ハイフンなし）
- 「現場」というラベルはありません（重要）
- 項目は番号付きで記載されています

1. 日付（slipDate）
   - 右上にある日付を探してください
   - 形式例：25.01.10（YY.MM.DD形式、ハイフンなし）
   - 20YY-MM-DD形式に変換してください

2. 銘柄/品名（productName）【重要】
   - 「1.銘柄」または「1」というラベルの右側にある値
   - よくあるパターン：
     * 「106 汚泥」→ 「汚泥」のみを抽出
     * 数字＋スペース＋品名の形式が多い
   - 一般的な品名：汚泥、廃プラ、木くず、がれき類、廃油など
   - 数字部分は必ず除外して、品名のみを抽出してください

3. 得意先名（clientName）
   - 「4」または「4.」というラベルの右側にある値
   - 手書きで記載されている重要な項目です
   - 「○○便」「○○帰り便」のような形式が多いです（例：アース帰り便、JMATE直便）

4. 正味重量（netWeight）
   - 「4」の項目の中にある重量を探してください
   - kg単位の数値（例：9290kg）
   - 数値のみ抽出（kg単位は除去）
   - カンマは含まれない

注意事項：
- 「現場」というラベルはこの伝票にはありません
- フッターの「上越マテリアル株式会社」は得意先ではありません
- 電子マニフェスト番号（manifestNumber）は常に空白（null）

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "得意先名",
  "productName": "品名（数字を除く）",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": null
}`,

    '計量伝票': `この画像はアース長野の計量伝票です。青い背景の伝票で、以下の情報を正確に抽出してください：

レイアウト詳細：
- 日付は「年月日」というラベルの下にあります
- 得意先は「コード1」の行にあります
- 品目は「コード2」の行にあります

1. 日付（slipDate）
   - 「年月日」というラベルを探してください
   - そのすぐ下にある日付を読み取ってください
   - 形式：YYYY年MM月DD日
   - YYYY-MM-DD形式に変換してください

2. 得意先名（clientName）【重要】
   - 「コード1」という文字を探してください
   - その右に4桁の数字があります
   - さらにその右に会社名があります
   - よくある得意先：
     * 妙高アクアクリーンセンター
     * 上越市下水道センター
     * その他の処理施設名
   - ハイフン（-）が含まれることがあります
   - 数字コードは除外し、会社名のみを抽出してください

3. 品目名（productName）【最重要】
   - 「コード2」という文字を探してください
   - その右に4桁の数字があります
   - さらにその右に品目名があります
   - 一般的な品目：汚泥、有機性汚泥、廃プラ、廃油など
   - 数字コードは除外し、品目名のみを抽出してください

4. 正味重量（netWeight）
   - 「正味重量」という文字を探してください
   - その右横に数値（kg）があります
   - 「補正C」の行にある場合もあります
   - 数値のみ抽出（kg単位は除去）

5. 電子マニフェスト番号（manifestNumber）
   - 常に空白（null）

注意：
- 青い背景に黒い文字で印字されています
- 数値は右寄せで表示されていることが多いです
- コード番号は絶対に含めないでください

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "得意先名（コード番号は除く）",
  "productName": "品目名（コード番号は除く）",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": null
}`,

    '計量票': `この画像は計量票です。白い背景の伝票で、以下の情報を正確に抽出してください：

1. 日付（slipDate）
   - 「日付」という項目の右側に記載されています
   - 年月日形式で記載されています（例：2025年08月27日(金)）
   - YYYY-MM-DD形式に変換してください（曜日は除く）

2. 得意先名（clientName）【最重要】
   - 「現場」という項目を探してください
   - その右側のコロン（：）の後に記載されている内容を読み取ってください
   - よくある現場名（高頻度）：
     * 「上越マテリアル株式会社 バイオマス変換工場」
     * 「上越市水道局」
   - 複数行にまたがる場合があるので注意してください
   - 改行や空白に注意して、完全な名称を読み取ってください

3. 品目名（productName）
   - 「品名」という項目を探してください
   - その右側のコロン（：）の後に記載されている内容を読み取ってください
   - 高確率で「汚泥」「有機汚泥」です（ただし他の品名の場合もあります）
   - 廃棄物の種類（有機汚泥、汚泥、廃プラ、木くずなど）を探してください
   - 数値（重量）は除外して、品名のみを抽出してください

4. 正味重量（netWeight）
   - 「品名」の行に記載されている数値を探してください
   - kg単位の数値を読み取ってください（例：8,270 kg）
   - 数値のみ抽出（kg単位は除去）
   - カンマは除去（例：8,270 → 8270）

5. 電子マニフェスト番号（manifestNumber）
   - 常に空白（null）

重要：
- 白い背景の伝票です
- 「現場：」の後の内容が得意先名です
- 品名の行に重量が記載されています
- 改行や空白に注意して、完全な名称を読み取ってください
- 書類下部の「アース・コーポレーション」は発行元なので得意先ではありません

必ず以下のJSONフォーマットで返してください：
{
  "slipDate": "日付（YYYY-MM-DD形式）",
  "clientName": "現場名/得意先名",
  "productName": "品目名",
  "netWeight": "正味重量（数値のみ）",
  "manifestNumber": null
}`,
  };

  return prompts[slipType] || prompts['受領証'];
}

// OCRレスポンスの解析
function parseOCRResponse(content: string, slipType: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let result: any;

    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
      result = {
        slipDate: result.slipDate || result.date || result['日付'],
        clientName: result.clientName || result['得意先名'] || result['現場名'],
        productName: result.productName || result.itemName || result['品名'] || result['品目名'] || result['銘柄'],
        netWeight: result.netWeight || result['正味重量'],
        manifestNumber: null,
        slipType: slipType,
      };
    } else {
      result = {
        slipDate: extractValue(content, '日付') || extractValue(content, 'slipDate'),
        clientName: extractValue(content, '得意先') || extractValue(content, '現場') || extractValue(content, 'clientName'),
        productName: extractValue(content, '品名') || extractValue(content, '品目') || extractValue(content, '銘柄') || extractValue(content, 'productName'),
        netWeight: extractValue(content, '正味') || extractValue(content, 'netWeight'),
        manifestNumber: null,
        slipType: slipType,
      };
    }

    // 日付の年をシステム年で補正（OCRの西暦読み取り精度が低いため）
    if (result.slipDate) {
      const currentYear = new Date().getFullYear();
      // YYYY-MM-DD形式の年部分をシステム年に置換
      const dateMatch = result.slipDate.match(/^\d{4}-(\d{2}-\d{2})$/);
      if (dateMatch) {
        result.slipDate = `${currentYear}-${dateMatch[1]}`;
      }
    }

    // 数値の正規化
    if (result.netWeight) {
      result.netWeight = String(result.netWeight)
        .replace(/,/g, '')
        .replace(/kg/gi, '')
        .replace(/\s/g, '')
        .trim();
    }

    // 日付が取得できなかった場合
    if (!result.slipDate || result.slipDate === '' || result.slipDate === 'null' || result.slipDate === 'undefined') {
      result.slipDate = new Date().toISOString().split('T')[0];
    }

    result.manifestNumber = null;

    return result;
  } catch (error) {
    console.error('Parse error:', error);
    return {
      error: '解析エラー',
      rawContent: content,
      slipDate: new Date().toISOString().split('T')[0],
      slipType: slipType,
    };
  }
}

function extractValue(text: string, key: string): string {
  const regex = new RegExp(`${key}[：:：\\s]*([^\\n]+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

// Vercel / Next.js App Router: body size limit for this route
export const maxDuration = 60; // OCR処理のタイムアウト（秒）

export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { image, slipType, usePreprocessing = true } = await request.json();

    if (!image || !slipType) {
      return NextResponse.json(
        { success: false, error: '画像とタイプが必要です' },
        { status: 400 }
      );
    }

    console.log(`OCR処理開始: ${slipType} (部分的成功許可版)`);

    // 画像前処理
    const processedImage = usePreprocessing ? await preprocessImage(image) : image;

    // プロンプトの準備
    const prompt = getPromptForSlipType(slipType);

    // OpenAI Vision APIを呼び出し
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'あなたは日本語の産業廃棄物伝票を正確に読み取るOCRアシスタントです。特に正味重量の数値は最重要項目として確実に読み取ってください。手書き文字も含めて注意深く読み取り、読み取れなかった項目はnullまたは空文字として返してください。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: processedImage,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_completion_tokens: 16384,
      reasoning_effort: 'low',
    });

    // レスポンスの解析
    const rawContent = response.choices[0].message.content || '';
    console.log('GPT-5 raw response:', rawContent);
    const result = parseOCRResponse(rawContent, slipType);

    console.log('OCR処理完了:', {
      hasNetWeight: !!result.netWeight,
      hasClientName: !!result.clientName,
      hasDate: !!result.slipDate,
      hasProduct: !!result.productName,
    });

    const netWeightValid = result.netWeight && !isNaN(parseFloat(result.netWeight));

    return NextResponse.json({
      success: true,
      data: result,
      readQuality: {
        netWeight: netWeightValid ? 'good' : 'missing',
        clientName: result.clientName ? 'good' : 'missing',
        slipDate: result.slipDate ? 'good' : 'default',
        productName: result.productName ? 'good' : 'missing',
      },
      confidence: {
        netWeight: netWeightValid ? 100 : 0,
        clientName: result.clientName ? 80 : 0,
        slipDate: result.slipDate && result.slipDate !== new Date().toISOString().split('T')[0] ? 80 : 50,
        productName: result.productName ? 80 : 0,
      },
    });
  } catch (error: any) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'OCR処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
