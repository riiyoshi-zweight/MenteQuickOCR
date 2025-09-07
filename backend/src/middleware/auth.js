import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export const generateToken = (user) => {
  const payload = {
    id: user.id,
    userId: user.userId,
    name: user.name,
    employeeId: user.employeeId
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
};

export const authMiddleware = (req, res, next) => {
  try {
    // Bearerトークンを取得
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '認証トークンが提供されていません'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: '無効な認証トークンです'
      });
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: '認証に失敗しました'
    });
  }
};

// オプショナル認証（認証なしでもアクセス可能だが、認証があれば情報を付与）
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 認証なしで続行
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    // エラーが発生しても続行
    logger.warn('Optional auth error:', error);
    next();
  }
};

// 管理者権限チェック
export const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '認証が必要です'
    });
  }

  // TODO: 実際の管理者権限チェックロジックを実装
  // ここでは仮実装として特定のuserIdを管理者とする
  const adminUserIds = ['admin', 'manager'];
  
  if (!adminUserIds.includes(req.user.userId)) {
    return res.status(403).json({
      success: false,
      error: '管理者権限が必要です'
    });
  }

  next();
};

// APIキー認証（外部システム連携用）
export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'APIキーが提供されていません'
    });
  }

  // TODO: 実際のAPIキー検証ロジックを実装
  // ここでは仮実装
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: '無効なAPIキーです'
    });
  }

  next();
};

// セッション管理用のヘルパー関数
export const createSession = (user) => {
  const token = generateToken(user);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24時間後

  return {
    token,
    user: {
      id: user.id,
      userId: user.userId,
      name: user.name,
      employeeId: user.employeeId
    },
    expiresAt: expiresAt.toISOString()
  };
};

// リフレッシュトークン処理
export const refreshToken = (oldToken) => {
  const decoded = verifyToken(oldToken);
  
  if (!decoded) {
    return null;
  }

  // トークンの有効期限が1時間以内の場合のみリフレッシュ
  const exp = decoded.exp * 1000; // ミリ秒に変換
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (exp - now > oneHour) {
    // まだ十分な有効期限がある
    return oldToken;
  }

  // 新しいトークンを生成
  return generateToken({
    id: decoded.id,
    userId: decoded.userId,
    name: decoded.name,
    employeeId: decoded.employeeId
  });
};