-- =============================================
-- 認証セキュリティ強化マイグレーション
-- =============================================
-- 適用方法: Supabase Dashboard > SQL Editor で実行

-- 1. workers テーブルにセキュリティ列を追加
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS email          TEXT,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT now();

-- 2. パスワードリセットトークンテーブル
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_worker_id  ON password_reset_tokens (worker_id);

-- 3. 期限切れトークンの自動削除 (任意: pg_cron が有効な場合)
-- SELECT cron.schedule('cleanup_reset_tokens', '0 * * * *',
--   $$DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day'$$
-- );
