-- RANK WORKBOOK サーバー保存のテーブル定義（参考）
-- Worker が初回アクセス時に CREATE TABLE IF NOT EXISTS を自分で流すので、
-- 通常このファイルを実行する必要はありません。中身を確認したいとき用です。

CREATE TABLE IF NOT EXISTS rp_log (
  anon_id TEXT    NOT NULL,   -- 復元キー（12文字）
  day     TEXT    NOT NULL,   -- 'YYYY-MM-DD'（Apexの日付境界 02:00 JST 基準）
  rp      INTEGER NOT NULL,
  src     TEXT,               -- 'manual' / 'api'
  tier    TEXT,
  div     INTEGER,
  log     TEXT,               -- 当日の入力ログ（JSON、直近7日ぶんのみ）
  at      INTEGER NOT NULL,   -- 更新時刻(ms)。新しい方を残す判定に使う
  PRIMARY KEY (anon_id, day)
);

CREATE TABLE IF NOT EXISTS rp_profile (
  anon_id  TEXT PRIMARY KEY,
  platform TEXT,              -- PC / PS4 / X1
  goal_t   TEXT,              -- 目標ティア
  goal_d   INTEGER,           -- 目標ディビジョン
  at       INTEGER NOT NULL,
  seen_at  INTEGER NOT NULL   -- 最終アクセス（将来の掃除用）
);

-- EA名 / UID は保存しません。
-- 使われなくなった行を掃除するなら（例：1年触られていないキー）:
--   DELETE FROM rp_log WHERE anon_id IN
--     (SELECT anon_id FROM rp_profile WHERE seen_at < strftime('%s','now','-1 year')*1000);
--   DELETE FROM rp_profile WHERE seen_at < strftime('%s','now','-1 year')*1000;
