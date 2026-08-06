# APEX WORKBOOK — エペの数値早見帳

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

開幕時の表示切り替えは**自動**です（シーズンカード / ロードマップのカウントダウン・
ステータス・現在地マーカー / マップローテーション）。深夜に作業する必要はありません。

開幕後、落ち着いてから手を入れる箇所:

1. `data.js` の `nextSeason` — `splitStart` と `end` は S29 の期間からの**予測値**。
   公式発表が出たら正しい日付に差し替える
2. ランク分布 — 数日〜1週間ほどデータが溜まってから `data.js` の `rank` を更新し、
   `seasonNo` を 30 に、`label` を「シーズン30 …」に変更する
   （それまでは「シーズン29終了時点の分布」と自動で注記が出ます）
3. パッチノートでエイムアシスト関連の記載を確認し、`assist.html` の変更履歴に追記
4. `roadmap.html` のS30カードを実装済みの内容に更新
5. S31の日付が判明したら、`data.js` の `nextSeason` を S31 に書き換え、
   `season` に S30 を移す。`roadmap.html` の `MILESTONES` にも追記する

## 自動で切り替わる仕組み

| 対象 | ファイル | 判定 |
|---|---|---|
| シーズンカード（番号・名称・期間・進捗バー） | `index.html` | `APEX_DATA.currentSeason()` |
| 分布が前シーズンのものである旨の注記 | `rank.html` / `index.html` | `APEX_DATA.rankIsStale()` |
| カウントダウンの対象 | `roadmap.html` | `MILESTONES` の直近の未来日 |
| S30カードの「確定」→「開催中」 | `roadmap.html` | 開幕時刻 |
| タイムライン軸の現在地マーカー | `roadmap.html` | 現在日から座標を計算 |
| 過ぎた予定を薄く表示 | `roadmap.html` | 各 `li` の `data-date` |
| マップローテーション | `rotation.js` | APIから毎回取得（対応不要） |
