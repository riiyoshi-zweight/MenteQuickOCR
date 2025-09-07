# QuickOCR Backend API

産業廃棄物伝票のOCR処理とデータ管理を行うバックエンドAPIサーバー

## 🚀 セットアップ

### 1. 依存関係のインストール
```bash
cd backend
npm install
```

### 2. 環境変数の設定
`.env.example`をコピーして`.env`を作成し、必要な値を設定してください：

```bash
cp .env.example .env
```

必要な環境変数：
- `OPENAI_API_KEY`: OpenAI APIキー
- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_ANON_KEY`: Supabase匿名キー
- `JWT_SECRET`: JWT署名用シークレットキー

### 3. サーバー起動

開発環境：
```bash
npm run dev
```

本番環境：
```bash
npm start
```

## 📡 APIエンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報

### OCR処理
- `POST /api/ocr/process` - 画像ファイルのOCR処理
- `POST /api/ocr/process-base64` - Base64画像のOCR処理
- `POST /api/ocr/check-quality` - 画像品質チェック

### 伝票管理
- `POST /api/slips` - 伝票登録
- `GET /api/slips` - 伝票一覧取得
- `POST /api/slips/check-duplicate` - 重複チェック
- `GET /api/slips/statistics` - 統計情報
- `GET /api/slips/export/csv` - CSVエクスポート

### マスタデータ
- `GET /api/clients` - 得意先一覧
- `GET /api/clients/workers` - 作業者一覧

## 🔑 認証

APIはJWTトークンベースの認証を使用します。ログイン後に取得したトークンを以下のように使用してください：

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

## 📝 OCR処理の詳細

### 対応伝票タイプ
1. **受領証** - 産業廃棄物の受領証
2. **検量書** - 表形式の検量書（手書き対応）
3. **計量伝票** - 青背景の計量伝票
4. **計量票** - 計量票

### 画像処理機能
- スマートリサイズ（最適サイズに自動調整）
- ノイズ除去
- テキスト強調
- 影除去（計量票向け）
- 伝票タイプ別最適化

### プロンプトエンジニアリング
各伝票タイプに最適化されたプロンプトを使用：
- 表構造の認識
- 手書き文字の読み取り
- 特定フィールドの正確な抽出
- 誤読防止のための詳細な指示

## 🛡️ セキュリティ

- JWT認証
- レート制限（通常: 100req/15min、OCR: 10req/min）
- 入力バリデーション（Joi）
- エラーハンドリング
- ログ記録

## 📊 データベース

Supabaseを使用したPostgreSQLデータベース：

### テーブル構造
- `workers` - 作業者情報
- `clients` - 得意先マスタ
- `slips` - 伝票データ

## 🔧 開発

### ログ
- `logs/error.log` - エラーログ
- `logs/all.log` - 全ログ

### デバッグ
環境変数 `NODE_ENV=development` で詳細なエラー情報を出力

## 📦 デプロイ

### Netlify Functions
```javascript
// netlify/functions/api.js
import app from '../../backend/src/index.js';
import serverless from 'serverless-http';

export const handler = serverless(app);
```

### Vercel
```javascript
// api/index.js
import app from '../backend/src/index.js';
export default app;
```

### 環境変数
本番環境では必ず環境変数を設定してください：
- Netlify: ダッシュボードから設定
- Vercel: vercel.jsonまたはダッシュボードから設定

## ⚠️ 注意事項

1. **環境変数**: OpenAI APIキーは必ず環境変数で管理
2. **画像サイズ**: 最大10MBまで対応
3. **レート制限**: OCR処理は1分間に10回まで
4. **同時処理**: 複数のOCR処理は順次実行を推奨