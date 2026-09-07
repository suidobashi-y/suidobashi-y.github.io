# APEX WORKBOOK — エペの数値早見帳

Apex Legends の数値をまとめた日本語の早見サイト。
公開URL: https://apex-workbook.com （GitHub Pages + 独自ドメイン / `CNAME`）
X: [@apexwidgets](https://x.com/apexwidgets)

---

## ファイル構成

### ページ

| ファイル | 内容 |
|---|---|
| `index.html` | トップ。シーズン進捗、マイランク、ツール一覧、更新履歴（最新10件） |
| `rank.html` | ランク分布チャート |
| `deviation.html` | ランク偏差値（ランクを偏差値に換算して比較） |
| `tracker.html` | RANK WORKBOOK（RP記録トラッカー）。端末内＋サーバー保存 |
| `pickrate.html` | レジェンド別ピック率 |
| `streamers.html` | ライブ配信（配信者一覧・タグ絞り込み） |
| `assist.html` | エイムアシスト仕様・デバイス規制の履歴 |
| `players.html` | プレイ人口（Steam同時接続） |
| `roadmap.html` | 開発ロードマップ図解 |
| `updates.html` | 更新履歴アーカイブ（全件） |
| `zukai/index.html` | 図解シリーズの入口 |
| `zukai/s30/meta.html` | 図解 / メタ（ピック率の推移） |
| `zukai/s30/rank.html` | 図解 / ランク（分布の推移・リセット） |
| `zukai/s30/weapons.html` | 図解 / 武器 |
| `zukai/s30/attachments.html` | 図解 / アタッチメント |

ドロワーのナビ順:
HOME → ランク偏差値 → ランク分布 → ランクワークブック → ピック率 → ライブ配信 →
エイムアシスト → プレイ人口 → ロードマップ →〈図解 / ZUKAI（S30）〉メタ・ランク・武器

### 共通・データ

| ファイル | 内容 |
|---|---|
| `shared.css` | 全ページ共通スタイル（ナビ・配色・タイポ） |
| `data.js` | サイト全体の数値。`APEX_DATA` にシーズン / ランク分布 / ピック率 / 配信者を集約 |
| `rank-chart.js` | ランク分布の描画モジュール（`index.html` / `tracker.html` が使用） |
| `rotation.js` | マップローテーション取得モジュール（Worker経由） |

### インフラ

| ファイル | 内容 |
|---|---|
| `worker.js` | Cloudflare Worker。APIキーを隠す中継＋RANK WORKBOOK のサーバー保存 |
| `wrangler.toml` | Worker設定。D1バインディング `RPDB` → データベース `apexwb` |
| `schema.sql` | D1のテーブル定義（参考用。Workerが初回に自動で作るので実行不要） |
| `.github/workflows/deploy-zip.yml` | ZIPを置くと展開してリポジトリ直下に配置 |
| `.github/workflows/deploy-worker.yml` | `worker.js` / `wrangler.toml` の更新でCloudflareへ自動デプロイ |
| `sitemap.xml` / `robots.txt` / `CNAME` | SEO・ドメイン |
| `ogp.png` / `ogp-s30-weapons.png` / `favicon.png` / `apple-touch-icon.png` | 画像 |

---

## 更新のしかた（ZIPデプロイ）

スマホからでも更新できるように、ZIPを置くだけで反映される仕組みにしてある。

1. 変更したファイルを**フラットなZIP**にまとめる（フォルダで包まない）
2. GitHubのWeb UIから、リポジトリ直下または `_upload/` にZIPをアップロード
3. `deploy-zip.yml` が展開して直下にコピーし、ZIPを消してコミットする

制約:
- `.github/` を含むZIPは弾かれる（ワークフローは手動で更新する）
- 絶対パスや `..` を含むZIPも弾かれる
- `__MACOSX` / `.DS_Store` は自動で除去される

`worker.js` と `wrangler.toml` は push されると `deploy-worker.yml` が
Cloudflareへ自動デプロイする。GitHub Secrets に `CLOUDFLARE_API_TOKEN` と
`CLOUDFLARE_ACCOUNT_ID` が必要。

---

## 毎週の更新

| 曜日 | 内容 | 触るファイル |
|---|---|---|
| 月 | ランク分布 | `data.js` の `rank`、`zukai/s30/rank.html` の推移、`index.html`、`updates.html` |
| 水 | ピック率 | `data.js` の `pickrate`、`zukai/s30/meta.html` の推移、`index.html`、`updates.html` |

**どのページを直したときも、更新履歴を2箇所に必ず足す。**
- `index.html` の `<ul class="updates">` — 先頭に追加し、**10件を超えたら最古を削る**
- `updates.html` の `<ul class="updates">` — 先頭に追加（件数制限なし・全件保存）

ランク分布はALSのグラフからの読み取り値。ツールチップの実数で必ず補正する
（ALSの分布ページはJS描画のためスクレイプ不可。スクリーンショットから読む）。

---

## シーズン / スプリットが切り替わるときにやること

| 対象 | ファイル | 場所 |
|---|---|---|
| シーズン番号・名称・会期・スプリット境界 | `data.js` | `season` / `nextSeason` |
| ランク分布データ | `data.js` | `rank`（`tiers` は上位ティアから順） |
| 前シーズンとの比較用の分布 | `data.js` | `rankPrev` |
| ピック率 | `data.js` | `pickrate` |
| アシスト仕様・規制の追記 | `assist.html` | 変更履歴 `<ul class="log">` の先頭 |
| ロードマップ | `roadmap.html` | シーズンカード＋`MILESTONES` |
| 図解 | `zukai/sXX/` | 新シーズンのディレクトリを作り、ナビとsitemapを差し替え |

新シーズン開幕時の手順:

1. `data.js` の `nextSeason` の `splitStart` / `end` は前シーズンからの**予測値**。
   公式発表が出たら正しい日付に差し替える
2. 分布は数日〜1週間データが溜まってから `rank` を更新し、`seasonNo` と `label` を新シーズンに変更
   （それまでは「前シーズン終了時点の分布」と自動で注記が出る）
3. パッチノートでエイムアシスト関連を確認し、`assist.html` に追記
4. `roadmap.html` のカードを実装済みの内容に更新
5. 次シーズンの日付が判明したら `nextSeason` を書き換え、`season` に現行を移す

## 自動で切り替わる仕組み（手を入れなくていい箇所）

| 対象 | ファイル | 判定 |
|---|---|---|
| シーズンカード（番号・名称・期間・進捗バー） | `index.html` | `APEX_DATA.currentSeason()` |
| 分布が前シーズンのものである旨の注記 | `rank.html` / `index.html` | `APEX_DATA.rankIsStale()` |
| ピック率が前シーズンのものである旨の注記 | `pickrate.html` | `APEX_DATA.pickrateIsStale()` |
| カウントダウンの対象 | `roadmap.html` | `MILESTONES` の直近の未来日 |
| タイムライン軸の現在地マーカー / 過ぎた予定 | `roadmap.html` | 現在日と各 `li` の `data-date` |
| マップローテーション | `rotation.js` | Worker経由で毎回取得 |
| 配信中バッジ・アイコン | `streamers.html` | Worker経由でTwitchから取得 |

---

## Cloudflare Worker

Worker名: `apex-map-streamer`
URL: `https://apex-map-streamer.suidobashi-y.workers.dev`

| エンドポイント | 内容 |
|---|---|
| `GET /maprotation` | マップローテーション |
| `GET /live` | 配信中のTwitchチャンネル一覧 |
| `GET /discover` | 配信者の発見用 |
| `GET /feed` | 配信トレンド（タイトルからモード・話題語を集計） |
| `GET /rp` | 指定プレイヤーの現在RP（`?player=` または `?uid=` ＋ `&platform=`） |
| `GET /players` | Steam同時接続数 |
| `GET /rp-sync?id=復元キー` | RANK WORKBOOK の記録を取り出す |
| `POST /rp-sync` | RANK WORKBOOK の記録を保存する |
| `GET /` | 動作確認（各シークレットとD1の設定状況を返す） |

Cloudflare側に設定するシークレット:

- `APEX_API_KEY` — 必須。https://api.mozambiquehe.re/getkey で取得
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — `/live` `/feed` `/discover` に必要

配信者リストは `worker.js` の `TWITCH_USERS` と `data.js` の `APEX_DATA.streamers` の
**両方**にあり、順序を揃えておく必要がある。片方だけ直さないこと。

---

## RANK WORKBOOK のサーバー保存（D1）

iOSのSafariは7日以上開かないと localStorage を消すことがあるため、記録はサーバーにも預けている。

- 端末ごとに**12文字の復元キー**を自動発行し、それを鍵にして D1 に保存する
- ログイン不要。EA名とUIDは保存しない（RP・日付・ランク・目標のみ）
- 端末の記録が消えたら、設定の「記録の引き継ぎ」に復元キーを入れれば戻る。別端末でも続けられる
- ページ下部の注意書きをタップすると復元キーがコピーされる
  （サーバー保存が効いていないときはバックアップコードがコピーされる）
- テーブルは `rp_log`（`anon_id` と `day` が複合PK）と `rp_profile`。
  Workerが初回アクセス時に `CREATE TABLE IF NOT EXISTS` を流すのでSQLの手動実行は不要
- D1が未設定でも `/rp-sync` が503を返すだけで、トラッカーは端末内保存のまま動く

---

## 表記ルール

- 情報の確度を3段階のタグで区別: 公式 / 検証ベース / 未確定
- 非公式ファンサイトである旨と EA 商標表記を全ページのフッターに記載
- 図版はすべてオリジナル制作（ゲーム内アセットは不使用）
- 数値には必ず出典と取得日を添える

## GitHub Pages について

GitHub Pages は既定で Jekyll を通し、`_` で始まるファイルを公開対象から除外する。
共通ファイルは `shared.css` `data.js` `rotation.js` `rank-chart.js` と、
アンダースコアを付けない名前にしてある。

---

## 宿題 / 未整理

- `sitemap.xml` に `players.html` が入っていない
- `apex-neon-grid.html` と `apex-neon-grid-univ.html` は `deviation.html` の元ファイル。
  どこからも参照されていないので削除してよい
- 図解のシーズンディレクトリ（`zukai/s30/`）はシーズンが変わるたび新設するため、
  ナビとsitemapの差し替えが手作業になっている
