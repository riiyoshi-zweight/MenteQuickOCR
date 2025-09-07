# 📱 Netlifyデプロイ手順

## 🚀 クイックデプロイ

### 1. GitHubにプッシュ
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Netlifyでデプロイ

1. [Netlify](https://app.netlify.com/)にログイン
2. 「Add new site」→「Import an existing project」
3. GitHubを選択してリポジトリを選択
4. デプロイ設定は自動で検出される（netlify.tomlを使用）

### 3. 環境変数の設定

Netlifyダッシュボード → Site settings → Environment variables で以下を設定：

```
OPENAI_API_KEY=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
SUPABASE_URL=https://pggkdytrudaxltqhidpu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZ2tkeXRydWRheGx0cWhpZHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDMwMTMsImV4cCI6MjA2ODMxOTAxM30.rdGYAx1IDpMycb_sDq-K-WLk4B8xVNvJmMBQxdPhOPs
JWT_SECRET=quickocr_jwt_secret_2025_joetsu_maintenance
```

### 4. デプロイ

「Deploy site」をクリックすると自動的にビルド・デプロイが開始されます。

## 📱 スマホでアクセス

デプロイが完了すると、以下のようなURLが発行されます：
```
https://YOUR-SITE-NAME.netlify.app
```

このURLをスマホのブラウザで開くだけでアクセスできます！

## 🔑 ログイン情報

- ユーザー名: `test`
- パスワード: `test123`

## ✅ 動作確認

1. ログイン画面が表示される
2. test/test123でログイン
3. ダッシュボードが表示される
4. 「産廃」を選択
5. カメラ撮影または手動入力が可能

## 🎯 メリット

- **HTTPS対応**: カメラ機能が使える
- **どこからでもアクセス可能**: Wi-Fi不要
- **自動デプロイ**: GitHubにプッシュすると自動更新
- **無料**: 月100GBまで無料

## 🔧 トラブルシューティング

### ビルドエラーの場合
Netlifyのビルドログを確認して、エラーメッセージを確認してください。

### 404エラーの場合
netlify.tomlのリダイレクト設定を確認してください。

### APIエラーの場合
環境変数が正しく設定されているか確認してください。

## 📝 カスタムドメイン（オプション）

1. Site settings → Domain management
2. Add custom domain
3. お持ちのドメインを設定

## 🔄 更新方法

```bash
git add .
git commit -m "Update"
git push
```

プッシュすると自動的にNetlifyが再デプロイします。