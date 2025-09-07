import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/config.js';
import { logger, stream } from './utils/logger.js';
import { errorHandler, notFoundHandler, handleShutdown } from './middleware/errorHandler.js';

// ルートインポート
import authRoutes from './routes/auth.js';
import ocrRoutes from './routes/ocr.js';
import slipsRoutes from './routes/slips.js';
import clientsRoutes from './routes/clients.js';

// 環境変数の検証
validateConfig();

// Expressアプリケーション初期化
const app = express();

// ミドルウェア設定
app.use(cors(config.cors));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// リクエストロギング
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.http(`${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`);
  });
  next();
});

// レート制限
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'リクエスト数が制限を超えました。しばらく待ってから再試行してください。',
  standardHeaders: true,
  legacyHeaders: false,
});

// OCR専用のレート制限（より厳しい制限）
const ocrLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 10, // 1分間に10リクエストまで
  message: 'OCR処理のリクエスト数が制限を超えました。',
});

app.use('/api/', limiter);
app.use('/api/ocr/', ocrLimiter);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env
  });
});

// APIルート
app.use('/api/auth', authRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/slips', slipsRoutes);
app.use('/api/clients', clientsRoutes);

// API情報
app.get('/api', (req, res) => {
  res.json({
    name: 'QuickOCR API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
        me: 'GET /api/auth/me'
      },
      ocr: {
        process: 'POST /api/ocr/process',
        processBase64: 'POST /api/ocr/process-base64',
        checkQuality: 'POST /api/ocr/check-quality',
        preprocess: 'POST /api/ocr/preprocess'
      },
      slips: {
        create: 'POST /api/slips',
        list: 'GET /api/slips',
        checkDuplicate: 'POST /api/slips/check-duplicate',
        statistics: 'GET /api/slips/statistics',
        exportCsv: 'GET /api/slips/export/csv',
        delete: 'DELETE /api/slips/:id',
        update: 'PUT /api/slips/:id'
      },
      clients: {
        list: 'GET /api/clients',
        create: 'POST /api/clients',
        workers: 'GET /api/clients/workers',
        addWorker: 'POST /api/clients/workers'
      }
    }
  });
});

// 404ハンドラー
app.use(notFoundHandler);

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.server.env}`);
  logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

// グレースフルシャットダウン
handleShutdown(server);

export default app;