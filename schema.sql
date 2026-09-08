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

-- ===== ランクルーム（room.html） =====
-- room_id は復元キーそのものではない。端末側で SHA-256 して作った別ID。
-- 復元キーは「知っていれば全記録が読める」認証情報なので、公開エンドポイントには流さない。
--   room_id = base32(SHA-256("awb-room:v1:" + 復元キー))[0:12]   所有者確認用
--   pub     = base32(SHA-256("awb-pub:v1:"  + 復元キー))[0:4]    画面に出す4文字
-- ソルトが違うので pub から room_id は逆算できない。
CREATE TABLE IF NOT EXISTS room_seat (
  room_id   TEXT PRIMARY KEY,   -- 1人1席（同じ人が2席を持てない）
  seat_no   INTEGER NOT NULL,   -- 1..12。入れ替え中だけ負の値になる
  pub       TEXT,               -- 公開ID（PLAYER 8C21 の部分）
  handle    TEXT,               -- Xハンドル（任意 / 自己申告 / 形式検証済み）
  tier      TEXT,
  rp        INTEGER,
  last_seen INTEGER NOT NULL,   -- 最後にRPを記録した時刻。30分以内=在室 / 4時間で削除
  left_at   INTEGER              -- 自分から離席した時刻。入っていればRPが新しくてもゴースト
);
-- last_seen を巻き戻して離席を表すと「離席した瞬間に30分前まで在室」と出てしまうため、
-- 状態(left_at)と時刻(last_seen)は分けて持つ。座り直すと left_at は NULL に戻る。
-- 後から足した列なので、既存のテーブルには Worker が ALTER TABLE で追加する。
-- 1席1人を DB 側で保証する。着席の競合はこの制約が弾く（Worker は 409 に変換）。
CREATE UNIQUE INDEX IF NOT EXISTS room_seat_no ON room_seat(seat_no);

-- EA名 / UID は保存しません。
-- 使われなくなった行を掃除するなら（例：1年触られていないキー）:
--   DELETE FROM rp_log WHERE anon_id IN
--     (SELECT anon_id FROM rp_profile WHERE seen_at < strftime('%s','now','-1 year')*1000);
--   DELETE FROM rp_profile WHERE seen_at < strftime('%s','now','-1 year')*1000;
