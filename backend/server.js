const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ルートのインポート
const authRoutes = require('./routes/auth');
const ocrRoutes = require('./routes/ocr');
const slipRoutes = require('./routes/slips');

// ルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/slips', slipRoutes);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'サーバーエラーが発生しました'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});