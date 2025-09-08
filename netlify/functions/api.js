import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';

// バックエンドのサービスをインポート
import { ocrService } from '../../backend/src/services/ocrService.js';
import { supabaseService } from '../../backend/src/services/supabaseService.js';
import { imagePreprocessingService } from '../../backend/src/services/imagePreprocessingService.js';
import { generateToken, verifyToken } from '../../backend/src/middleware/auth.js';

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'netlify'
  });
});

// 認証エンドポイント
app.post('/api/auth/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    // 実際のSupabase認証のみ使用
    const worker = await supabaseService.signIn(userId, password);
    
    if (!worker) {
      return res.status(401).json({
        success: false,
        error: 'ユーザーIDまたはパスワードが正しくありません'
      });
    }
    
    const token = generateToken(worker);
    
    res.json({
      success: true,
      data: {
        token,
        user: worker
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'ログイン処理中にエラーが発生しました'
    });
  }
});

// OCR処理エンドポイント
app.post('/api/ocr/process-base64', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    // 簡易的な認証チェック
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です'
      });
    }
    
    const { image, slipType, usePreprocessing = true, useHighDetail = false } = req.body;
    
    if (!image || !slipType) {
      return res.status(400).json({
        success: false,
        error: '画像とタイプが必要です'
      });
    }
    
    // Base64画像を一時ファイルに保存
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const tempPath = `/tmp/ocr-${Date.now()}.jpg`;
    
    // Netlify Functionsでは/tmpディレクトリのみ書き込み可能
    const fs = await import('fs/promises');
    await fs.writeFile(tempPath, buffer);
    
    // OCR処理
    const result = await ocrService.processSlipImage(tempPath, {
      slipType,
      usePreprocessing,
      useHighDetail,
      onProgress: (status) => console.log(`OCR進捗: ${status}`)
    });
    
    // 一時ファイルを削除
    await fs.unlink(tempPath).catch(() => {});
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OCR処理中にエラーが発生しました'
    });
  }
});

// 伝票登録エンドポイント
app.post('/api/slips', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '認証が必要です'
      });
    }
    
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '無効なトークンです'
      });
    }
    
    const slipData = {
      ...req.body,
      workerName: user.name
    };
    
    const success = await supabaseService.submitSlip(slipData);
    
    res.json({
      success,
      message: success ? '伝票を登録しました' : '伝票の登録に失敗しました'
    });
    
  } catch (error) {
    console.error('Submit slip error:', error);
    
    if (error.message.includes('重複')) {
      return res.status(409).json({
        success: false,
        error: '同じ内容の伝票が既に登録されています'
      });
    }
    
    res.status(500).json({
      success: false,
      error: '伝票登録中にエラーが発生しました'
    });
  }
});

// 得意先一覧エンドポイント
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await supabaseService.getClients();
    
    res.json({
      success: true,
      data: clients
    });
    
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: '得意先情報の取得に失敗しました'
    });
  }
});

// デフォルトハンドラー
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません'
  });
});

// Netlify Functions用のハンドラーをエクスポート
export const handler = serverless(app);