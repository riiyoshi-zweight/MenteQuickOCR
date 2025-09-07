#!/bin/bash

echo "📱 QuickOCR モバイルアクセスセットアップ"
echo "========================================="

# ngrokがインストールされているか確認
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrokがインストールされていません"
    echo "📦 Homebrewでインストールします..."
    brew install ngrok
fi

echo "✅ ngrokがインストールされています"

# バックエンドとフロントエンドのngrokトンネルを起動
echo ""
echo "🚀 トンネルを起動します..."
echo ""

# バックエンド用のngrokを起動
echo "1. バックエンドAPI (ポート3001) のトンネルを起動"
ngrok http 3001 --log=stdout > backend-ngrok.log 2>&1 &
BACKEND_PID=$!
sleep 3

# バックエンドのURLを取得
BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BACKEND_URL" ]; then
    echo "❌ バックエンドのトンネル起動に失敗しました"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ バックエンドURL: $BACKEND_URL"

# フロントエンド用のngrokを新しいポートで起動
echo ""
echo "2. フロントエンド (ポート3000) のトンネルを起動"
ngrok http 3000 --log=stdout > frontend-ngrok.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# フロントエンドのURLを取得（ポート4041で確認）
FRONTEND_URL=$(curl -s http://localhost:4041/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$FRONTEND_URL" ]; then
    # 代替方法: ngrok設定ファイルを使用
    echo "📝 ngrok設定ファイルを作成します..."
    cat > ngrok.yml <<EOF
version: "2"
authtoken: YOUR_NGROK_AUTH_TOKEN
tunnels:
  backend:
    addr: 3001
    proto: http
  frontend:
    addr: 3000
    proto: http
EOF
    echo "⚠️  ngrokの認証トークンが必要です"
    echo "1. https://dashboard.ngrok.com/signup でアカウントを作成"
    echo "2. 認証トークンを取得"
    echo "3. ngrok config add-authtoken YOUR_TOKEN を実行"
    echo ""
    FRONTEND_URL="http://localhost:3000"
fi

echo "✅ フロントエンドURL: $FRONTEND_URL"

# 環境変数ファイルを更新
echo ""
echo "3. 環境変数を更新中..."
cat > frontend/.env.local <<EOF
# API設定（ngrok経由）
NEXT_PUBLIC_API_URL=${BACKEND_URL}/api

# アプリ設定
NEXT_PUBLIC_APP_NAME=QuickOCR
EOF

echo "✅ 環境変数を更新しました"

# 結果表示
echo ""
echo "========================================="
echo "📱 モバイルアクセス準備完了！"
echo "========================================="
echo ""
echo "🔗 スマホでアクセスするURL:"
echo "   $FRONTEND_URL"
echo ""
echo "📝 QRコード生成:"
echo "   https://qr-code-generator.com/ で上記URLのQRコードを作成"
echo ""
echo "⚠️  注意事項:"
echo "   - バックエンドサーバー (npm run dev) を起動してください"
echo "   - フロントエンドサーバー (npm run dev) を起動してください"
echo "   - ngrokセッションは8時間で期限切れになります"
echo ""
echo "🛑 終了するには: Ctrl+C"

# 終了処理
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# プロセスを維持
wait