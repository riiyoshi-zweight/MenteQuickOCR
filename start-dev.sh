#!/bin/bash

echo "🚀 QuickOCR 開発サーバー起動"
echo "============================"
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# プロジェクトルートへ移動
cd /Users/zweightdevpc01/ZWEIGHT/projects/上越メンテナンス/QuickOCR

# IPアドレスを取得
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo -e "${GREEN}IPアドレス: $IP${NC}"

# 環境変数を更新
echo -e "${YELLOW}環境変数を設定中...${NC}"
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://$IP:3001/api
NEXT_PUBLIC_APP_NAME=QuickOCR
EOF

# バックエンドを起動
echo -e "${YELLOW}バックエンドを起動中...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

# フロントエンドを起動
echo -e "${YELLOW}フロントエンドを起動中...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev -- --hostname 0.0.0.0 &
FRONTEND_PID=$!
cd ..

sleep 5

echo ""
echo "============================"
echo -e "${GREEN}✅ 起動完了！${NC}"
echo "============================"
echo ""
echo "PC: http://localhost:3000"
echo -e "スマホ: ${GREEN}http://$IP:3000${NC}"
echo ""
echo "ログイン: test / test123"
echo ""
echo "終了: Ctrl+C"
echo ""

# 終了処理
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# ログを表示
tail -f frontend/.next/server/app-paths-manifest.json 2>/dev/null &

wait