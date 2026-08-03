# NEON GRID — Apex Legends ツールキット

## ファイル構成

| ファイル | 内容 |
|---|---|
| `index.html` | トップ。シーズン進捗＋現在のランクマップ、ツール一覧、更新履歴 |
| `rank.html` | ランク分布チャート |
| `deviation.html` | **要配置** — 既存の偏差値アプリをこの名前で置いてください |
| `assist.html` | エイムアシスト仕様・デバイス規制の履歴 |
| `streamers.html` | ライブ配信（配信者一覧・タグ絞り込み） |
| `roadmap.html` | 開発ロードマップ図解 |
| `shared.css` | 全ページ共通スタイル（ナビ・配色・タイポ） |
| `rotation.js` | マップローテーション取得モジュール |

ナビ順: HOME → エイムアシスト → ランク偏差値 → ランク分布 → ライブ配信 → ロードマップ

※マップローテーションはトップページのカードのみ（詳細ページは廃止）

## セットアップ

### 1. 偏差値アプリを配置
既存の `apex-neon-grid.html` を `deviation.html` にリネームして同じ階層へ。
ページ冒頭に他ページと同じ `<nav class="gnav">` ブロックを貼れば相互リンクが繋がります。

### 2. マップAPIキー
`rotation.js` の `API_KEY` に https://apexlegendsstatus.com/api で取得したキーを設定。
公開サイトではキーが露出するため、Cloudflare Workers 等の中継を立てて
`PROXY_URL` に指定する方式を推奨します。

## 毎シーズン/スプリットの更新箇所

| 対象 | ファイル | 場所 |
|---|---|---|
| シーズン番号・名称・会期・スプリット境界 | `index.html` | `var SEASON = {...}` |
| ランク分布データ | `rank.html` | `var DATA = {...}`（上位ティアから順に記述） |
| アシスト仕様・規制の追記 | `assist.html` | 変更履歴 `<ul class="log">` の先頭 |
| ロードマップ | `roadmap.html` | シーズンカード＋タイムライン |
| 更新履歴 | `index.html` | `<ul class="updates">` |

## 表記ルール
- 情報の確度を3段階のタグで区別: 公式 / 検証ベース / 未確定
- 非公式ファンサイトである旨と EA 商標表記を全ページのフッターに記載
- 図版はすべてオリジナル制作（ゲーム内アセットは不使用）

## GitHub Pages について

共通ファイルは `shared.css` `data.js` `rotation.js` としています。
GitHub Pages は既定で Jekyll を通し、`_` で始まるファイルを公開対象から
除外するため、アンダースコアを付けないファイル名にしてあります。

## 公開前チェックリスト

- [ ] **`deviation.html` を配置** — 既存の偏差値アプリをこの名前で置き、他ページと同じ `<nav class="gnav">` を貼る
- [x] **`rotation.js`** — Worker のURLを `PROXY_URL` に設定済み（`API_KEY` は空のままでOK）
- [x] **`streamers.html`** の `LIVE_API` — Worker のURLを設定済み
- [ ] **Worker** に `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` を設定
- [ ] **`data.js` の配信者データ**を確認 — タグ・フォロワー数・Twitchユーザー名の正確性
      （アイコンと配信中の状態はWorker経由でTwitchから自動取得。手動設定は不要）
- [ ] **連絡先** — 各ページフッターの「X @apexwidgets」が正しいか
- [ ] **ランク分布の数値** — グラフからの読み取り値のため、ツールチップで実数を確認して補正
- [ ] `shared.css` `data.js` `rotation.js` を忘れずにアップロード
- [ ] 旧ファイル `_shared.css` `_data.js` `_rotation.js` `maps.html` はリポジトリから削除

## S30開幕(8/5 2:00)後にやること

1. `data.js` の `season` を更新（no/name/start/splitStart/end/nextName）
2. パッチノートでエイムアシスト関連の記載を確認し、`assist.html` の変更履歴に追記
3. `roadmap.html` のS30カードを「確定」から実装済みの内容に更新、S31を「進行中」へ
4. ランク分布はスプリット序盤の数値に入れ替え
