#!/bin/bash

echo "📱 QuickOCR ローカルネットワーク起動スクリプト"
echo "============================================="
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# IPアドレスを取得
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
    echo -e "${RED}❌ IPアドレスを取得できませんでした${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ローカルIPアドレス: ${BLUE}$IP${NC}"
echo ""

# 環境変数ファイルを更新
echo -e "${YELLOW}📝 環境変数を設定中...${NC}"

# フロントエンドの環境変数を更新
cat > frontend/.env.local <<EOF
# API設定
# ローカルネットワークからアクセス可能なIP
NEXT_PUBLIC_API_URL=http://$IP:3001/api

# アプリ設定
NEXT_PUBLIC_APP_NAME=QuickOCR
EOF

echo -e "${GREEN}✅ フロントエンド環境変数を更新しました${NC}"

# バックエンドのCORS設定を確認
echo -e "${YELLOW}📝 バックエンドのCORS設定を確認中...${NC}"
if grep -q "CORS_ORIGIN=\*" backend/.env 2>/dev/null || grep -q "CORS_ORIGIN=http" backend/.env 2>/dev/null; then
    echo -e "${GREEN}✅ CORS設定OK${NC}"
else
    echo -e "${YELLOW}⚠️  CORS設定を更新します${NC}"
    if [ -f backend/.env ]; then
        sed -i.bak 's/CORS_ORIGIN=.*/CORS_ORIGIN=*/' backend/.env
    fi
fi

echo ""
echo -e "${BLUE}🚀 サーバーを起動中...${NC}"
echo ""

# バックエンドサーバーを起動
echo -e "${YELLOW}1. バックエンドサーバーを起動 (ポート3001)${NC}"
cd backend
npm install --silent 2>/dev/null
npm run dev &
BACKEND_PID=$!
cd ..

# 少し待機
sleep 3

# フロントエンドサーバーを起動
echo -e "${YELLOW}2. フロントエンドサーバーを起動 (ポート3000)${NC}"
cd frontend
npm install --silent 2>/dev/null
npm run dev -- --hostname 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# 起動完了まで待機
sleep 5

echo ""
echo "============================================="
echo -e "${GREEN}📱 起動完了！${NC}"
echo "============================================="
echo ""
echo -e "${BLUE}🌐 アクセスURL:${NC}"
echo ""
echo -e "  ${GREEN}PC用:${NC}"
echo -e "    http://localhost:3000"
echo ""
echo -e "  ${GREEN}スマホ用:${NC}"
echo -e "    ${BLUE}http://$IP:3000${NC}"
echo ""
echo "============================================="
echo -e "${YELLOW}📝 ログイン情報:${NC}"
echo -e "  ユーザー名: ${GREEN}test${NC}"
echo -e "  パスワード: ${GREEN}test123${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}⚠️  注意事項:${NC}"
echo "  - スマホとPCが同じWi-Fiに接続されている必要があります"
echo "  - ファイアウォールがポート3000と3001を許可している必要があります"
echo "  - カメラ機能はHTTPS環境でのみ動作します"
echo ""
echo -e "${RED}🛑 終了するには: Ctrl+C を押してください${NC}"
echo ""

# 終了処理
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 サーバーを停止中...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Next.jsの.nextプロセスも終了
    pkill -f "next dev" 2>/dev/null
    echo -e "${GREEN}✅ 停止しました${NC}"
    exit 0
}

trap cleanup INT TERM

# プロセスを維持
wait $BACKEND_PID $FRONTEND_PID