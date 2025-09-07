import OpenAI from 'openai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { imagePreprocessingService } from './imagePreprocessingService.js';

// カスタム例外クラス
export class ContentNotReadableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContentNotReadableError';
  }
}

class OCRService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    
    // 伝票タイプ別の最適化されたプロンプト（Flutterプロジェクトから完全移植）
    this.slipTypePrompts = {
      '受領証': `
この画像は産業廃棄物の受領証です。以下の情報を正確に抽出してください：

1. 日付: 上部の赤枠内「2025/__/__」形式の日付

2. 得意先名: 必ず以下の手順で探してください
   - 上部の表で「現場」という文字を探す
   - 「現場」の右側にある会社名を読み取る
   - 得意先は必ず「（株）ブルボン」で始まる
   - 「（株）ブルボン　上越工場」または「（株）ブルボン　柏崎工場」のいずれか
   - 下部の「新潟環境開発株式会社」は受領側なので絶対に読み取らない

3. 品名: 「000600」などのコードの右側にある品目名（例：廃プラスチック類）

4. 正味重量: 【重要】必ず以下の手順で取得してください
   - 表のヘッダー行を確認：「総重量」「空車」「正味」の3つの列がある
   - 「正味」と書かれた列を特定（一番右側の列）
   - 「合計」と書かれた行を探す
   - 「合計」行と「正味」列が交差するセルの値を読む
   - 絶対に「空車」列の値を読まないこと！
   - 例：合計行で「正味」列が1,260.0なら、それが答え

警告：
- 「空車」列（中央の列）の値は絶対に読まない
- 必ず「正味」列（右端の列）から読む
- 得意先は必ず「ブルボン」を含む
- カンマは除去（1,260.0 → 1260.0）
- kg単位は除去
- マニフェスト番号は記載されていないのでnull`,
      
      '検量書': `
この画像は検量書です。表形式のレイアウトで、左側に項目名、右側に値が記載されています。
以下の情報を正確に抽出してください：

1. 日付
   - 「0日付」または「日付」というラベルの右側（同じ行）にある値
   - 形式例：25.01.10（YY.MM.DD形式）
   - 赤枠で強調されている場合があります

2. 銘柄【重要】
   - 「1.銘柄」または「1銘柄」というラベルの右側（同じ行）にある値
   - 「3銘柄」「3」のラベルの右側にある場合もあります
   - 赤枠で強調されている場合があります
   - よくあるパターン：
     * 「106 汚泥」→ 「汚泥」のみを抽出
     * 数字＋スペース＋品名の形式が多い
     * 品名は手書きの場合があるので注意深く読み取る
   - 一般的な品名：汚泥、廃プラ、木くず、がれき類、廃油など
   - 数字部分は必ず除外して、品名のみを抽出してください

3. 得意先名
   - 「4」または「4.」というラベルの右側（同じ行）にある値
   - 手書きで記載されている重要な項目です
   - 「○○便」「○○帰り便」のような形式が多いです（例：アース帰り便）
   - 赤枠で強調されている場合があります

4. 正味重量
   - 「正味」というラベルの右側（同じ行）にある値
   - 「4正味量」と書かれている場合もあります
   - 数値とkg単位（例：9290kg）
   - 数値のみ抽出（kg単位は除去）
   - カンマは含まれない

注意事項：
- すべての項目は表の行として左側にラベル、右側に値があります
- 手書き文字は特に注意深く読み取ってください
- フッターの「上越マテリアル株式会社」は得意先ではありません
- 赤枠で強調されている値を優先的に読み取ってください`,
      
      '計量伝票': `
画像から以下のテキストを読み取ってください：

1. 上部にある日付
2. コード1の行にある文字（数字と会社名すべて）
3. コード2の行にある文字（数字と品目名すべて）
4. 補正Cの行の正味重量の数値

できるだけシンプルに、見えるテキストをそのまま教えてください。`,
      
      '計量票': `
この画像は計量票です。以下の情報を正確に抽出してください：

1. 日付
   - 通常は書類の上部に記載されています
   - 年月日形式で記載されています

2. 現場名（得意先）【重要】
   - 「現場：」という文字を探してください
   - その後に記載されている内容を読み取ってください
   - よくある現場名：
     * 上越マテリアル、バイオマス → 「バイオマス」
     * 上越市、下水道、センター → 「上越市下水道センター」
   - 複数行にまたがる場合があるので注意してください

3. 品目名または廃棄物の種類
   - 「品名：」という文字の後の内容
   - 廃棄物の種類（汚泥、廃プラ、木くずなど）を探してください

4. 正味重量
   - 「正味」「正味重量」「正味計」「NET」などの表記を探してください
   - kg単位の数値を読み取ってください

5. マニフェスト番号（もしあれば）
   - 番号欄やマニフェスト番号の記載があれば読み取ってください

重要：
- 「現場：」の後の内容が得意先名です
- 改行や空白に注意して、完全な名称を読み取ってください`
    };
  }

  async processSlipImage(imagePath, { slipType, usePreprocessing = true, useHighDetail = false, onProgress }) {
    try {
      onProgress?.('画像処理を開始しています...');
      
      // 1. 画像前処理（伝票タイプに応じた最適化）
      let processedPath = imagePath;
      if (usePreprocessing) {
        onProgress?.('画像を最適化しています...');
        processedPath = await imagePreprocessingService.preprocessImage(imagePath, {
          slipType,
          deskew: true,
          denoise: true,
          enhanceText: true,
          removeShadows: slipType === '計量票',
          binarize: false
        });
      } else if (slipType === '計量伝票') {
        // 計量伝票は軽い前処理のみ
        onProgress?.('画像を最適化しています...');
        processedPath = await imagePreprocessingService.preprocessImage(imagePath, {
          slipType,
          deskew: false,
          denoise: false,
          enhanceText: false,
          removeShadows: false,
          binarize: false
        });
      }
      
      // 2. OpenAI Vision APIで解析
      onProgress?.('AIが伝票を解析しています...');
      const result = await this.analyzeWithOpenAI(processedPath, { slipType, useHighDetail });
      
      onProgress?.('処理が完了しました');
      return result;
      
    } catch (error) {
      logger.error('OpenAI Vision OCRエラー:', error);
      if (error instanceof ContentNotReadableError) {
        throw error;
      }
      return {
        rawText: `エラー: ${error.message}`,
        metadata: { error: error.message }
      };
    }
  }

  async analyzeWithOpenAI(imagePath, { slipType, useHighDetail, retryCount = 0 }) {
    try {
      const base64Image = await imagePreprocessingService.imageToBase64(imagePath);
      
      logger.info('=== 画像情報 ===');
      logger.info(`Base64サイズ: ${base64Image.length} chars`);
      logger.info(`伝票タイプ: ${slipType}`);
      
      // 計量伝票の場合は特別な処理
      if (slipType === '計量伝票') {
        return await this.processWeighingSlip(base64Image);
      }
      
      // 検量書の場合も特別な処理
      if (slipType === '検量書') {
        return await this.processInspectionSlip(base64Image);
      }
      
      // 計量票の場合も特別な処理
      if (slipType === '計量票') {
        return await this.processWeighingTicket(base64Image);
      }
      
      // 受領証とその他の伝票の処理
      return await this.processStandardSlip(base64Image, slipType, useHighDetail);
      
    } catch (error) {
      logger.error(`OpenAI Vision API解析エラー: ${error.message}`);
      
      // 429エラーの場合、リトライ
      if (error.message.includes('429') && retryCount < 3) {
        logger.info(`リトライ ${retryCount + 1}/3 - ${3 * (retryCount + 1)}秒待機中...`);
        await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)));
        return this.analyzeWithOpenAI(imagePath, { slipType, useHighDetail, retryCount: retryCount + 1 });
      }
      
      throw error;
    }
  }

  async processWeighingSlip(base64Image) {
    const testPrompt = `
この画像は青い背景の計量伝票です。すべてのテキストを注意深く読み取ってください。

特に重要な項目：

1. 日付（上部にあります）
   - 年月日の形式で記載されています

2. コード1の行
   - 「コード1」という文字を探してください
   - その右に4桁の数字があります
   - さらにその右に会社名があります（妙高アクアクリーンセンターなど）
   - ハイフン（-）が含まれることがあります

3. コード2の行  
   - 「コード2」という文字を探してください
   - その右に4桁の数字があります
   - さらにその右に品目名/銘柄があります（例：汚泥、廃プラ、有機性汚泥など）
   - この品目名は重要なので、しっかり読み取ってください

4. 正味重量
   - 「正味重量」という文字を探してください
   - その右横に数値（kg）があります
   - 補正Cの行にある場合もあります

青い背景でも文字がはっきり見えるように注意して読み取ってください。
すべての文字を、改行も含めて正確に教えてください。`;

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.highPerformance,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: testPrompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' }}
        ]
      }],
      max_tokens: 4000,
      temperature: 0.0
    });

    const content = response.choices[0].message.content || '';
    
    // コンテンツ読み取り不可のチェック
    if (this.isContentNotReadable(content)) {
      throw new ContentNotReadableError('画像の読み取りに失敗しました');
    }
    
    // テキストから情報を抽出
    return {
      date: this.extractDate(content),
      clientName: this.extractCode1(content),
      itemName: this.extractCode2(content),
      netWeight: this.extractNetWeight(content),
      manifestNumber: null,
      rawText: content,
      metadata: {
        slipType: '計量伝票',
        method: 'simple_text_extraction'
      }
    };
  }

  async processInspectionSlip(base64Image) {
    const response = await this.openai.chat.completions.create({
      model: config.openai.models.highPerformance,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: this.slipTypePrompts['検量書'] },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' }}
        ]
      }],
      max_tokens: 2000,
      temperature: 0.0
    });

    const content = response.choices[0].message.content || '';
    
    if (this.isContentNotReadable(content)) {
      throw new ContentNotReadableError('画像の読み取りに失敗しました');
    }
    
    return {
      date: this.extractInspectionSlipDate(content),
      clientName: this.extractInspectionSlipClient(content),
      itemName: this.extractInspectionSlipItem(content),
      netWeight: this.extractInspectionSlipWeight(content),
      manifestNumber: null,
      rawText: content,
      metadata: {
        slipType: '検量書',
        method: 'inspection_slip_extraction'
      }
    };
  }

  async processWeighingTicket(base64Image) {
    const response = await this.openai.chat.completions.create({
      model: config.openai.models.highPerformance,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: this.slipTypePrompts['計量票'] },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' }}
        ]
      }],
      max_tokens: 2000,
      temperature: 0.0
    });

    const content = response.choices[0].message.content || '';
    
    if (this.isContentNotReadable(content)) {
      throw new ContentNotReadableError('画像の読み取りに失敗しました');
    }
    
    return {
      date: this.extractWeighingTicketDate(content),
      clientName: this.extractWeighingTicketClient(content),
      itemName: this.extractWeighingTicketItem(content),
      netWeight: this.extractWeighingTicketWeight(content),
      manifestNumber: null,
      rawText: content,
      metadata: {
        slipType: '計量票',
        method: 'weighing_ticket_extraction'
      }
    };
  }

  async processStandardSlip(base64Image, slipType, useHighDetail) {
    const prompt = this.slipTypePrompts[slipType] || this.getDefaultPrompt();
    
    const systemPrompt = `
あなたは日本語の産業廃棄物伝票を正確に読み取る専門家です。
画像から情報を抽出し、必ずJSON形式のみで応答してください。
余計な説明は一切含めないでください。`;

    const userPrompt = `${prompt}

必ず以下のJSON形式のみで応答してください：
{
  "date": "YYYY-MM-DD形式の日付（例：2025-06-27）",
  "clientName": "得意先名または現場名",
  "itemName": "銘柄名または品名",
  "netWeight": "数値のみ（カンマなし、小数点可）",
  "manifestNumber": "下4桁の数字",
  "rawText": "画像から読み取った主要なテキスト"
}

見つからない項目はnullとしてください。`;

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.standard,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: useHighDetail ? 'high' : 'low' }}
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.0
    });

    const content = response.choices[0].message.content;
    
    if (this.isContentNotReadable(content)) {
      throw new ContentNotReadableError('画像の読み取りに失敗しました');
    }
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch?.[0] || content;
      const jsonData = JSON.parse(jsonString);
      
      // 日付のフォーマット修正
      let formattedDate = jsonData.date?.toString();
      if (formattedDate) {
        formattedDate = this.formatDate(formattedDate);
      }
      
      // 正味重量のクリーニング
      let cleanedWeight = this.cleanWeight(jsonData.netWeight);
      
      // 受領証の場合の追加検証
      if (slipType === '受領証') {
        cleanedWeight = this.validateReceiptWeight(cleanedWeight, jsonData.rawText);
        jsonData.clientName = this.validateReceiptClient(jsonData.clientName, jsonData.rawText);
      }
      
      return {
        date: formattedDate,
        clientName: jsonData.clientName?.trim(),
        itemName: jsonData.itemName?.trim(),
        netWeight: cleanedWeight,
        manifestNumber: jsonData.manifestNumber,
        rawText: jsonData.rawText || content,
        metadata: {
          slipType,
          useHighDetail
        }
      };
    } catch (parseError) {
      logger.error(`JSONパースエラー: ${parseError.message}`);
      return this.fallbackParse(content, slipType);
    }
  }

  // ヘルパーメソッド群（Flutterプロジェクトから移植）
  isContentNotReadable(content) {
    return (content.includes('申し訳ありませんが') && content.includes('画像のテキストを読み取ることはできません')) ||
           (content.includes('申し訳ありません') && content.includes('読み取ることはできません')) ||
           content.includes('画像を読み取ることができません');
  }

  extractDate(text) {
    const patterns = [
      /(\d{4})[年/](\d{1,2})[月/](\d{1,2})[日]?/,
      /令和(\d+)年(\d{1,2})月(\d{1,2})日/,
      /(\d{2})[年/](\d{1,2})[月/](\d{1,2})[日]?/
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        let year = match[1];
        if (year.length === 2) {
          year = '20' + year;
        } else if (text.includes('令和')) {
          year = (parseInt(year) + 2018).toString();
        }
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  }

  extractCode1(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('コード1') || lines[i].includes('コード１')) {
        const codeLine = lines[i];
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        
        const codeMatch = /(\d{4})\s*(.+)/.exec(codeLine);
        let clientName = codeMatch?.[2]?.trim();
        
        if (!clientName && nextLine) {
          const nextMatch = /(\d{4})\s*(.+)/.exec(nextLine);
          clientName = nextMatch?.[2]?.trim();
        }
        
        if (clientName) {
          clientName = clientName.replace(/^[-－ー―_\s]+/, '');
          
          if (clientName.includes('妙高') || clientName.includes('アクア') || 
              clientName.includes('クリーン') || clientName.includes('センター')) {
            return '妙高アクアクリーンセンター';
          }
          
          return clientName.trim();
        }
      }
    }
    return null;
  }

  extractCode2(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('コード2') || line.includes('コード２') || line.includes('コード 2')) {
        let searchText = line;
        
        if (i + 1 < lines.length) searchText += '\n' + lines[i + 1];
        if (i + 2 < lines.length) searchText += '\n' + lines[i + 2];
        
        const itemPatterns = [
          '汚泥', '廃プラ', '有機性汚泥', '無機性汚泥',
          '廃プラスチック', '廃油', '木くず', '金属くず',
          'ガラスくず', 'がれき類', '混合廃棄物'
        ];
        
        for (const pattern of itemPatterns) {
          if (searchText.includes(pattern)) {
            return this.cleanItemName(pattern);
          }
        }
      }
    }
    return null;
  }

  extractNetWeight(text) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('正味重量')) {
        const match = /正味重量[:\s]*[\D]*([\d,]+\.?\d*)/.exec(line);
        if (match) {
          return match[1].replace(/,/g, '');
        }
      }
    }
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('補正C') || lines[i].includes('補正Ｃ')) {
        const numbers = lines[i].match(/[\d,]+\.?\d*/g);
        if (numbers && numbers.length > 0) {
          return numbers[numbers.length - 1].replace(/,/g, '');
        }
      }
    }
    
    return null;
  }

  extractInspectionSlipDate(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('日付') || line.includes('日 付')) {
        const patterns = [
          /(\d{2})\.(\d{1,2})\.(\d{1,2})/,
          /(\d{4})[年/](\d{1,2})[月/](\d{1,2})[日]?/,
          /(\d{2})[年/](\d{1,2})[月/](\d{1,2})[日]?/
        ];
        
        for (const pattern of patterns) {
          const match = pattern.exec(line);
          if (match) {
            let year = match[1];
            if (year.length === 2) {
              year = '20' + year;
            }
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      }
    }
    
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  }

  extractInspectionSlipClient(text) {
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (/^4[.．]?\s/.test(line.trim()) || line.trim() === '4') {
        let clientName = line.replace(/^4[.．]?\s*/, '').trim();
        
        if (clientName.includes('便')) {
          return clientName;
        }
        
        if (!clientName && i + 1 < lines.length) {
          clientName = lines[i + 1].trim();
          if (clientName.includes('便')) {
            return clientName;
          }
        }
        
        if (clientName) {
          return clientName;
        }
      }
      
      if (line.includes('便') && (line.includes('帰り') || line.includes('戻り'))) {
        const match = /([^\s]+(?:帰り|戻り)便)/.exec(line);
        if (match) {
          return match[1];
        }
      }
    }
    
    return null;
  }

  extractInspectionSlipItem(text) {
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('銘柄') || line.includes('銘 柄')) {
        const sameLineMatch = /(\d{3,4})\s+([^\s]+)/.exec(line);
        if (sameLineMatch) {
          const itemName = sameLineMatch[2].trim();
          if (itemName.includes('汚泥') || itemName.includes('泥')) {
            return '汚泥';
          }
          return itemName;
        }
        
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine === '汚泥' || nextLine.includes('汚泥')) {
            return '汚泥';
          }
        }
      }
    }
    
    if (text.includes('汚泥')) {
      return '汚泥';
    }
    
    return null;
  }

  extractInspectionSlipWeight(text) {
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('正味')) {
        const patterns = [
          /正\s*味[^0-9]*(\d+)\s*kg/i,
          /正\s*味[^0-9]*(\d+)/i,
          /(\d{4,5})\s*kg/,
          /(\d{4,5})/
        ];
        
        for (const pattern of patterns) {
          const match = pattern.exec(line);
          if (match) {
            return match[1];
          }
        }
        
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const weightMatch = /(\d{4,5})\s*kg?/.exec(nextLine);
          if (weightMatch) {
            return weightMatch[1];
          }
        }
      }
    }
    
    return null;
  }

  extractWeighingTicketDate(text) {
    return this.extractDate(text);
  }

  extractWeighingTicketClient(text) {
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('現場：') || line.includes('現場:')) {
        let clientText = line.replace(/現場[：:]/, '').trim();
        
        if (i + 1 < lines.length && clientText) {
          const nextLine = lines[i + 1].trim();
          if (!nextLine.includes('：') && !nextLine.includes(':') && 
              !nextLine.includes('品名') && !nextLine.includes('正味') &&
              nextLine) {
            clientText += ' ' + nextLine;
          }
        }
        
        if (clientText.includes('上越マテリアル') || clientText.includes('バイオマス')) {
          return 'バイオマス';
        } else if (clientText.includes('上越市') && clientText.includes('下水道') && clientText.includes('センター')) {
          return '上越市下水道センター';
        }
        
        return clientText.trim();
      }
    }
    
    if (text.includes('上越マテリアル') || text.includes('バイオマス')) {
      return 'バイオマス';
    } else if (text.includes('上越市') && text.includes('下水道') && text.includes('センター')) {
      return '上越市下水道センター';
    }
    
    return null;
  }

  extractWeighingTicketItem(text) {
    const patterns = [
      /品目[：:]\s*(.+)/,
      /品名[：:]\s*(.+)/,
      /廃棄物[：:]\s*(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1].trim();
      }
    }
    
    const wasteTypes = ['汚泥', '廃プラ', '木くず', '廃油', 'がれき類', '金属くず'];
    for (const waste of wasteTypes) {
      if (text.includes(waste)) {
        return waste;
      }
    }
    
    return null;
  }

  extractWeighingTicketWeight(text) {
    const patterns = [
      /正味[：:重量]*\s*([\d,]+\.?\d*)\s*kg/,
      /NET[：:]*\s*([\d,]+\.?\d*)\s*kg/,
      /([\d,]+\.?\d*)\s*kg/
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return match[1].replace(/,/g, '');
      }
    }
    return null;
  }

  cleanItemName(itemName) {
    itemName = itemName.replace(/^[-－ー―_\s]+/, '');
    itemName = itemName.replace(/[-－ー―_\s]+$/, '');
    itemName = itemName.replace(/[-－ー―]{2,}/, '-');
    itemName = itemName.replace(/^[^\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FFa-zA-Z0-9]+/, '');
    return itemName.trim();
  }

  formatDate(dateStr) {
    if (!dateStr) return null;
    
    if (dateStr.includes('年')) {
      dateStr = dateStr.replace('年', '-').replace('月', '-').replace('日', '').replace(' ', '');
    } else if (dateStr.includes('/')) {
      dateStr = dateStr.replace(/\//g, '-');
    }
    
    return dateStr;
  }

  cleanWeight(weight) {
    if (!weight) return null;
    
    return weight.toString()
      .replace(/,/g, '')
      .replace(/，/g, '')
      .replace(/kg/gi, '')
      .replace(/ /g, '')
      .trim();
  }

  validateReceiptWeight(weight, rawText) {
    if (!weight) return null;
    
    const weightValue = parseFloat(weight);
    if (weightValue > 5000) {
      logger.warn(`警告: 正味重量が異常に大きい: ${weightValue} kg`);
      
      const match = /正味.*?(\d+[,，]?\d*\.?\d*)/.exec(rawText);
      if (match) {
        const correctedWeight = match[1].replace(/[,，]/g, '');
        const correctedValue = parseFloat(correctedWeight);
        if (correctedValue < weightValue) {
          logger.info(`正味重量を修正: ${correctedWeight} kg`);
          return correctedWeight;
        }
      }
    }
    
    return weight;
  }

  validateReceiptClient(clientName, rawText) {
    if (!clientName) return null;
    
    if (!clientName.includes('ブルボン')) {
      logger.warn(`警告: 得意先名にブルボンが含まれていません: ${clientName}`);
      
      const lines = rawText.split('\n');
      for (const line of lines) {
        if (line.includes('ブルボン') && (line.includes('上越工場') || line.includes('柏崎工場'))) {
          const correctedName = line.trim();
          logger.info(`修正: ブルボンを含む行を発見: ${correctedName}`);
          return correctedName;
        }
      }
    }
    
    return clientName;
  }

  fallbackParse(content, slipType) {
    const extractValue = (key) => {
      const pattern = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`);
      const match = pattern.exec(content);
      return match?.[1];
    };
    
    return {
      date: extractValue('date'),
      clientName: extractValue('clientName'),
      itemName: extractValue('itemName'),
      netWeight: extractValue('netWeight'),
      manifestNumber: extractValue('manifestNumber'),
      rawText: content,
      metadata: {
        slipType,
        parseError: true
      }
    };
  }

  getDefaultPrompt() {
    return `
この産業廃棄物伝票から以下の情報を抽出してください：
1. 日付（計量日、受領日など）
2. 得意先名（業者名、現場名、会社名など）
3. 銘柄または品名
4. 正味重量（正味、正味量、NET重量など。単位はkg）
5. マニフェスト番号（下4桁）

注意：
- 数値にはカンマが含まれる場合があります
- 日本語の伝票なので、漢字やカタカナに注意してください`;
  }
}

export const ocrService = new OCRService();