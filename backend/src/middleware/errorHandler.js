import { logger, logError } from '../utils/logger.js';

// カスタムエラークラス
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 非同期エラーハンドラー
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// グローバルエラーハンドラー
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // ログ記録
  logError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId
  });

  // Multerエラー
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('ファイルサイズが大きすぎます（最大10MB）', 400, 'FILE_TOO_LARGE');
  }

  // JWTエラー
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('無効なトークンです', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('トークンの有効期限が切れています', 401, 'TOKEN_EXPIRED');
  }

  // Joiバリデーションエラー
  if (err.name === 'ValidationError') {
    const message = err.details?.map(d => d.message).join(', ') || 'バリデーションエラー';
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Supabaseエラー
  if (err.code?.startsWith('PGRST')) {
    error = new AppError('データベースエラーが発生しました', 500, 'DATABASE_ERROR');
  }

  // OpenAIエラー
  if (err.response?.status === 429) {
    error = new AppError('API利用制限に達しました。しばらく待ってから再試行してください', 429, 'RATE_LIMIT');
  }

  // デフォルトエラーレスポンス
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'サーバーエラーが発生しました',
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

// 404エラーハンドラー
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`エンドポイントが見つかりません: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

// シャットダウンハンドラー
export const handleShutdown = (server) => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
};