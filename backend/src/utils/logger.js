import winston from 'winston';

// ログレベルの定義
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ログレベルの色定義
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// フォーマット定義
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// トランスポート定義
const transports = [
  // コンソール出力のみ（Netlify Functionsではファイル書き込みができない）
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

// ロガーインスタンスの作成
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// HTTPリクエストロギング用のストリーム
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// エラーハンドリング用のヘルパー関数
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  };

  if (error.response) {
    errorInfo.response = {
      status: error.response.status,
      data: error.response.data,
    };
  }

  logger.error(JSON.stringify(errorInfo));
};

// リクエストロギング用のヘルパー関数
export const logRequest = (req, res, responseTime) => {
  const requestInfo = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  if (res.statusCode >= 400) {
    logger.warn(JSON.stringify(requestInfo));
  } else {
    logger.http(JSON.stringify(requestInfo));
  }
};

// OCR処理用のロギング
export const logOCRProcess = (slipType, status, details = {}) => {
  const ocrInfo = {
    slipType,
    status,
    ...details,
    timestamp: new Date().toISOString(),
  };

  if (status === 'error') {
    logger.error(`OCR処理エラー: ${JSON.stringify(ocrInfo)}`);
  } else if (status === 'warning') {
    logger.warn(`OCR処理警告: ${JSON.stringify(ocrInfo)}`);
  } else {
    logger.info(`OCR処理: ${JSON.stringify(ocrInfo)}`);
  }
};

// データベース操作用のロギング
export const logDatabase = (operation, table, details = {}) => {
  const dbInfo = {
    operation,
    table,
    ...details,
    timestamp: new Date().toISOString(),
  };

  logger.info(`DB操作: ${JSON.stringify(dbInfo)}`);
};

// 認証関連のロギング
export const logAuth = (action, userId, success, details = {}) => {
  const authInfo = {
    action,
    userId,
    success,
    ...details,
    timestamp: new Date().toISOString(),
  };

  if (!success) {
    logger.warn(`認証: ${JSON.stringify(authInfo)}`);
  } else {
    logger.info(`認証: ${JSON.stringify(authInfo)}`);
  }
};

// パフォーマンス計測用のヘルパー
export class PerformanceLogger {
  constructor(operation) {
    this.operation = operation;
    this.startTime = Date.now();
    logger.debug(`${operation} 開始`);
  }

  end(details = {}) {
    const duration = Date.now() - this.startTime;
    logger.info(`${this.operation} 完了: ${duration}ms`, details);
    return duration;
  }
}

// デバッグ用の詳細ロギング
export const debug = (message, data = {}) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`${message}: ${JSON.stringify(data, null, 2)}`);
  }
};

export default logger;