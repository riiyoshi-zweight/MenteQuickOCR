import express from 'express';
import { supabaseService } from '../services/supabaseService.js';
import { createSession, authMiddleware, refreshToken } from '../middleware/auth.js';
import { logger, logAuth } from '../utils/logger.js';
import Joi from 'joi';

const router = express.Router();

// バリデーションスキーマ
const loginSchema = Joi.object({
  userId: Joi.string().required().min(1).max(50),
  password: Joi.string().required().min(1).max(100)
});

// ログイン
router.post('/login', async (req, res) => {
  try {
    // バリデーション
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      logAuth('login', req.body.userId, false, { error: error.details[0].message });
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { userId, password } = value;

    // 認証処理
    const worker = await supabaseService.signIn(userId, password);

    if (!worker) {
      logAuth('login', userId, false, { reason: 'Invalid credentials' });
      return res.status(401).json({
        success: false,
        error: 'ユーザーIDまたはパスワードが正しくありません'
      });
    }

    // セッション作成
    const session = createSession(worker);
    
    logAuth('login', userId, true, { workerId: worker.id });

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'ログイン処理中にエラーが発生しました'
    });
  }
});

// ログアウト
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Supabaseのサインアウト処理
    await supabaseService.signOut();
    
    logAuth('logout', req.user.userId, true);

    res.json({
      success: true,
      message: 'ログアウトしました'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'ログアウト処理中にエラーが発生しました'
    });
  }
});

// トークンリフレッシュ
router.post('/refresh', authMiddleware, (req, res) => {
  try {
    const oldToken = req.headers.authorization?.substring(7);
    const newToken = refreshToken(oldToken);

    if (!newToken) {
      return res.status(401).json({
        success: false,
        error: 'トークンのリフレッシュに失敗しました'
      });
    }

    logAuth('refresh', req.user.userId, true);

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'トークンリフレッシュ処理中にエラーが発生しました'
    });
  }
});

// 現在のユーザー情報取得
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      userId: req.user.userId,
      name: req.user.name,
      employeeId: req.user.employeeId
    }
  });
});

// パスワード変更
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().required().min(6).max(100)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // 現在のパスワードを確認
    const worker = await supabaseService.signIn(
      req.user.userId,
      value.currentPassword
    );

    if (!worker) {
      logAuth('change-password', req.user.userId, false, { reason: 'Invalid current password' });
      return res.status(401).json({
        success: false,
        error: '現在のパスワードが正しくありません'
      });
    }

    // TODO: パスワード更新処理を実装
    // await supabaseService.updatePassword(req.user.userId, value.newPassword);

    logAuth('change-password', req.user.userId, true);

    res.json({
      success: true,
      message: 'パスワードを変更しました'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'パスワード変更処理中にエラーが発生しました'
    });
  }
});

export default router;