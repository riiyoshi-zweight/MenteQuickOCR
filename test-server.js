const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'frontend/.next')));
app.use(express.static(path.join(__dirname, 'frontend/public')));

// APIプロキシ（バックエンドへ）
app.use('/api', (req, res) => {
  res.redirect(`http://localhost:3001/api${req.url}`);
});

// すべてのルートをNext.jsにリダイレクト
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/.next/server/app/page.html'), (err) => {
    if (err) {
      res.status(500).send(`
        <html>
          <body>
            <h1>エラー</h1>
            <p>Next.jsアプリがビルドされていません。</p>
            <pre>cd frontend && npm run build</pre>
            <p>を実行してください。</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log(`スマホ用: http://100.64.1.54:${PORT}`);
});