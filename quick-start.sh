#!/bin/bash

# プロジェクトディレクトリに移動
cd /Users/zweightdevpc01/ZWEIGHT/projects/上越メンテナンス/QuickOCR

echo "🚀 QuickOCR クイックスタート"
echo "============================"
echo ""

# Next.jsの.nextフォルダをクリーンアップ
echo "キャッシュをクリーンアップ中..."
cd frontend
rm -rf .next
rm -rf node_modules/.cache

# 環境変数ファイルを修正（改行を確実に追加）
echo "環境変数を設定中..."
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://100.64.1.54:3001/api
NEXT_PUBLIC_APP_NAME=QuickOCR
EOF

# 依存関係を確認
if [ ! -d "node_modules" ]; then
    echo "依存関係をインストール中..."
    npm install
fi

# 開発サーバーを起動（0.0.0.0でバインド）
echo ""
echo "フロントエンドサーバーを起動中..."
echo ""
npx next dev --hostname 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

cd ../backend

# バックエンドの依存関係を確認
if [ ! -d "node_modules" ]; then
    echo "バックエンドの依存関係をインストール中..."
    npm install
fi

# バックエンドサーバーを起動
echo ""
echo "バックエンドサーバーを起動中..."
echo ""
npm run dev &
BACKEND_PID=$!

# 少し待機
sleep 5

echo ""
echo "============================"
echo "✅ 起動完了！"
echo "============================"
echo ""
echo "📱 アクセスURL:"
echo ""
echo "  PC: http://localhost:3000"
echo "  スマホ: http://100.64.1.54:3000"
echo ""
echo "🔑 ログイン情報:"
echo "  ユーザー名: test"
echo "  パスワード: test123"
echo ""
echo "⚠️  注意:"
echo "  - 同じWi-Fiに接続してください"
echo "  - 初回起動時は少し時間がかかります"
echo ""
echo "🛑 終了: Ctrl+C"
echo ""

# 終了処理
trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" INT TERM

# プロセスを維持
wait