const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Supabaseクライアントの初期化
console.log('Supabase URL:', process.env.SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.SUPABASE_ANON_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pggkdytrudaxltqhidpu.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZ2tkeXRydWRheGx0cWhpZHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDMwMTMsImV4cCI6MjA2ODMxOTAxM30.rdGYAx1IDpMycb_sDq-K-WLk4B8xVNvJmMBQxdPhOPs'
);

// SHA256でパスワードをハッシュ化（Flutter実装と同じ）
function hashPassword(password, userId) {
  const salt = userId.toLowerCase();
  const hash = crypto.createHash('sha256');
  hash.update(salt + password);
  return hash.digest('hex');
}

// JWTトークン生成
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      userId: user.user_id,
      name: user.name 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
}

// ログインエンドポイント
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    
    console.log('Login attempt for:', userId);
    
    // workersテーブルからユーザー情報を取得
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !worker) {
      console.log('Worker not found:', error);
      return res.status(401).json({
        success: false,
        error: 'ユーザーIDまたはパスワードが正しくありません'
      });
    }
    
    // パスワード検証
    const hashedPassword = hashPassword(password, userId);
    
    if (worker.password_hash !== hashedPassword) {
      console.log('Password mismatch');
      return res.status(401).json({
        success: false,
        error: 'ユーザーIDまたはパスワードが正しくありません'
      });
    }
    
    // トークン生成
    const token = generateToken(worker);
    
    console.log('Login successful for:', worker.name);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: worker.id,
          employeeId: worker.user_id,
          userId: worker.user_id,
          name: worker.name
        }
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

// ユーザー情報取得エンドポイント
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: '認証が必要です' 
      });
    }
    
    // トークンを検証
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          error: '無効なトークンです' 
        });
      }
      
      // デコードされたユーザー情報を返す
      res.json({
        success: true,
        data: {
          id: decoded.id,
          userId: decoded.userId,
          name: decoded.name
        }
      });
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー情報の取得に失敗しました'
    });
  }
});

module.exports = router;