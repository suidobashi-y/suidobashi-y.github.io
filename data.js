/* ============================================================
   APEX WORKBOOK 共通データ — シーズン/スプリットごとにここだけ更新
   ============================================================ */
var APEX_DATA = {

  /* 現在のシーズン。nextSeason の start を過ぎると自動でそちらに切り替わります
     （切り替えは APEX_DATA.currentSeason() が判定。手動更新は不要） */
  season: {
    no: 29, name: "OVERCLOCK",
    start:      "2026-05-06T02:00:00+09:00",  // S29開幕（日本時間）
    splitStart: "2026-06-24T02:00:00+09:00",  // スプリット2開始
    end:        "2026-08-05T02:00:00+09:00",  // S30「MARKED」開幕
    nextName:   "MARKED"
  },

  /* 次シーズン。start を過ぎた時点で自動的に現在のシーズンになります。
     ★ splitStart は判明済み（S30のスプリット1は42日。S29の49日から短縮）。
       end のみ S29 の期間から算出した予測値です。公式発表が出たら差し替えてください。 */
  nextSeason: {
    no: 30, name: "MARKED",
    start:      "2026-08-05T02:00:00+09:00",  // S30開幕（公式）
    splitStart: "2026-09-16T02:00:00+09:00",  // スプリット2開始（ゲーム内のランクリーグ残り日数から判明）
    end:        "2026-11-04T02:00:00+09:00",  // S31開幕（予測）
    nextName:   "TBA",
    estimated:  true                          // 期間が予測値であることの目印
  },

  /* ランク分布：上位ティアから順に記述
     div : ディビジョン別の内訳 [I, II, III, IV]（合計が pct になるように）
     出典: apexlegendsstatus.com（同サイトのDB登録プレイヤーが母集団。ゲーム全体の実数ではありません）
     ★グラフからの読み取り値です。プラチナIII(9.094) / ダイヤIII(4.75) / マスター(0.556) は
       ツールチップ実測値です。合計が100%になるよう正規化しています。
       ※ALS登録者が母集団のため、プレデターがマスターを上回る逆転が出ています */
  rank: {
    seasonNo: 30,   // この分布データのシーズン。現在のシーズンと違うと注意書きが出ます
    label:   "シーズン30 スプリット1 / ランクマッチ（開幕20日目）",
    updated: "2026-08-24",
    dayFromStart: 20,
    source:  "apexlegendsstatus.com",
    divEstimated: false,
    inProgress: true,   // シーズン進行中のスナップショット（上位帯がまだ埋まっていない）
    tiers: [
      {n:"プレデター",   s:"PRED", c:"pred",   pct: 0.39},
      {n:"マスター",     s:"MAS",  c:"master", pct: 0.56},
      {n:"ダイヤモンド", s:"DIA",  c:"dia",    pct:12.42, div:[0.63, 1.41, 4.75, 5.63]},
      {n:"プラチナ",     s:"PLA",  c:"plat",   pct:29.61, div:[5.80, 7.53, 9.09, 7.19]},
      {n:"ゴールド",     s:"GLD",  c:"gold",   pct:29.06, div:[7.18, 7.52, 8.07, 6.29]},
      {n:"シルバー",     s:"SIL",  c:"silver", pct:17.55, div:[4.64, 4.73, 4.56, 3.62]},
      {n:"ブロンズ",     s:"BRZ",  c:"bronze", pct: 9.06, div:[2.57, 2.29, 2.03, 2.17]},
      {n:"ルーキー",     s:"RKY",  c:"rookie", pct: 1.35, div:[0.40, 0.05, 0.08, 0.82]}
    ]
  },

  /* 前シーズン最終の分布（ゴースト重ね表示・比較用）。同じ出典で揃えてあります */
  rankPrev: {
    seasonNo: 29,
    label:   "シーズン29 スプリット2 最終",
    updated: "2026-08-10",
    source:  "apexlegendsstatus.com",
    divEstimated: false,
    tiers: [
      {n:"プレデター",   s:"PRED", c:"pred",   pct: 0.45},
      {n:"マスター",     s:"MAS",  c:"master", pct: 2.55},
      {n:"ダイヤモンド", s:"DIA",  c:"dia",    pct:35.15, div:[3.45, 6.80, 13.80, 11.10]},
      {n:"プラチナ",     s:"PLA",  c:"plat",   pct:25.60, div:[6.80, 6.40, 7.00, 5.40]},
      {n:"ゴールド",     s:"GLD",  c:"gold",   pct:16.95, div:[3.30, 3.75, 4.50, 5.40]},
      {n:"シルバー",     s:"SIL",  c:"silver", pct:11.40, div:[2.05, 2.25, 2.65, 4.45]},
      {n:"ブロンズ",     s:"BRZ",  c:"bronze", pct: 6.95, div:[1.30, 1.30, 1.30, 3.05]},
      {n:"ルーキー",     s:"RKY",  c:"rookie", pct: 0.95, div:[0.65, 0.00, 0.00, 0.30]}
    ]
  }
};

/* 現在のシーズンを返す（nextSeason の開幕時刻を過ぎたら自動で切り替わる） */
APEX_DATA.currentSeason = function(){
  var n = this.nextSeason;
  if(n && n.start && Date.now() >= new Date(n.start).getTime()) return n;
  return this.season;
};

/* 表示中のランク分布が現在のシーズンのものかどうか */
APEX_DATA.rankIsStale = function(){
  return this.rank.seasonNo !== this.currentSeason().no;
};

/* ディビジョン単位のフラット配列を返す（上位から順） */
APEX_DATA.divisions = function(src){
  var out=[];
  (src || this.rank).tiers.forEach(function(t){
    if(!t.div){ out.push({name:t.n, tier:t.n, c:t.c, pct:t.pct, head:true}); return; }
    t.div.forEach(function(p,i){
      out.push({name:t.n+" "+["I","II","III","IV"][i], tier:t.n, c:t.c, pct:p, head:i===0});
    });
  });
  return out;
};

/* 前シーズン最終との差分（ポイント）を返す。上位ティアから順 */
APEX_DATA.rankDelta = function(){
  var prev=this.rankPrev.tiers;
  return this.rank.tiers.map(function(t,i){
    return {n:t.n, now:t.pct, prev:prev[i]?prev[i].pct:0,
            diff:+(t.pct-(prev[i]?prev[i].pct:0)).toFixed(2)};
  });
};

/* 累積(上位から)を返す */
APEX_DATA.cumulative = function(src){
  var t=(src || this.rank).tiers, cum=[], run=0;
  for(var i=0;i<t.length;i++){ run+=t[i].pct; cum[i]=run; }
  return cum;
};

/* ============================================================
   配信者リスト
   - tw     : Twitchフォロワー数（概算・千人単位）
   - twitch : Twitchのユーザー名（配信中判定・アイコン取得・リンクに使用）
   ※アイコンと配信中の状態は Worker 経由で Twitch API から自動取得します
   - tags    : style=プレイスタイル / type=配信の性格
   ★ タグとフォロワー数は要確認・随時更新してください
   ============================================================ */
APEX_DATA.streamers = [
  {name:"NIRU", twitch:"nniru", tw:452, tags:["clip"]},
  {name:"渋谷ハル", twitch:"shibuyahal", tw:80, tags:["vtuber"]},
  {name:"ボドカ", twitch:"vodka_", tw:700, tags:[]},
  {name:"Selly", twitch:"selly55", tw:550, tags:["pro"]},
  {name:"ありさか", twitch:"arisaka_", tw:598, tags:[]},
  {name:"赤見かるび", twitch:"akamikarubi", tw:630, tags:[]},
  {name:"柊ツルギ",         twitch:"hiiragitsurugi",tw:457,  tags:["vtuber"]},
  {name:"SPYGEA", twitch:"spygea", tw:655, tags:["pro"]},
  {name:"DarkMasuoTV", twitch:"darkmasuotv", tw:141, tags:[]},
  {name:"Mondo", twitch:"mondo", tw:250, tags:["pro"]},
  {name:"Euriece", twitch:"euriece", tw:300, tags:[]},
  {name:"TIE Ru", twitch:"tie_ru", tw:50, tags:["clip"]},
  {name:"kawase", twitch:"kawase", tw:150, tags:["coach"]},
  {name:"tttcheekyttt", twitch:"tttcheekyttt", tw:222, tags:["rank"]},
  {name:"BobSappAim",      twitch:"bobsappaim0304",tw:200,  tags:["coach","rank"]},
  {name:"Kinako", twitch:"kinako_0707", tw:180, tags:["rank"]},
  {name:"天鬼ぷるる", twitch:"amakipururu", tw:228, tags:["vtuber"]},
  {name:"IQ200YukaF", twitch:"iq200yukaf", tw:257, tags:["rank"]},
  {name:"Bijusan", twitch:"bijusan", tw:145, tags:["rank"]},
  {name:"メルトステラ", twitch:"meltstella", tw:74, tags:["vtuber"]},
  {name:"へしこ", twitch:"heshiko1", tw:86, tags:["rank"]},
  {name:"satuking", twitch:"satuking_", tw:59, tags:["rank"]},
  {name:"fps_saku", twitch:"fps__saku", tw:59, tags:["pro"]},
  {name:"4rufq", twitch:"4rufq", tw:51, tags:["rank"]},
  {name:"lykq8don", twitch:"lykq8don", tw:50, tags:["rank"]},
  {name:"ピースだ", twitch:"peace_da", tw:43, tags:["rank"]},
  /* わぶさんは稼働中のチャンネルに変更（旧: wabu1 / tw:14） */
  {name:"わぶ", twitch:"deep_learning_f", tw:0, tags:["rank"]},
  /* 2026-08-04 追加（フォロワー数は未確認のため0。判明したら入れてください） */
  {name:"ほそしん", twitch:"hososhin_twitch", tw:0, tags:["rank"]},
  {name:"にごんご", twitch:"nigongo25", tw:0, tags:["rank"]},
  {name:"かのんんん", twitch:"kanontyandayo", tw:0, tags:["rank"]},
  {name:"エルスターしゅんしゅん", twitch:"lstarshunshun", tw:0, tags:["rank"]},
  {name:"あいりーん28", twitch:"irene28___", tw:0, tags:["rank"]},
  {name:"からからちゃん", twitch:"karakaramann", tw:0, tags:["rank"]},
  {name:"建設系配信者沢田", twitch:"sawada0117", tw:0, tags:["rank"]},
  {name:"甘楽ちょこ", twitch:"chocolate5d", tw:0, tags:["rank"]},
  /* 2026-08-04 追加（/discover より・フォロワー数未確認） */
  {name:"雨宮ツユリ", twitch:"amemiya328", tw:0, tags:["rank"]},
  {name:"ねくすと_", twitch:"next_dayo", tw:0, tags:["rank"]},
  {name:"もちゆず", twitch:"mochiyuzu_", tw:0, tags:["rank"]},
  {name:"IeNaGa25", twitch:"ienaga25", tw:0, tags:["rank"]},
  {name:"るりーです", twitch:"lullyru11", tw:0, tags:["rank"]},
  {name:"チットチャット", twitch:"chitchat_ai", tw:0, tags:["rank"]},
  {name:"ImperialKaz", twitch:"imperialkaz", tw:0, tags:["rank"]},
  {name:"ふじこ_", twitch:"iamfjk", tw:0, tags:["rank"]},
  {name:"星舞ちる", twitch:"hoshimai_chill", tw:0, tags:["rank"]},
  {name:"さぽてん", twitch:"sapo_ten", tw:0, tags:["rank"]},
  {name:"布団もぐり", twitch:"futon_moguri", tw:0, tags:["rank"]},
  {name:"愛姫みこな", twitch:"hashihimemikona", tw:0, tags:["rank"]},
  {name:"天音ひな", twitch:"amanehina", tw:0, tags:["rank"]},
  {name:"おっさんの挑戦", twitch:"89workers", tw:0, tags:["rank"]},
  /* 2026-08-11 追加（女性配信者・VTuber中心）
     しゃちくさくさんはプロフィール記載のVTuber。フォロワー数は西村ほのかさん以外未確認のため0 */
  {name:"しゃちくさく", twitch:"syachikusaku", tw:0, tags:["vtuber","rank"]},
  {name:"どんちゃんん", twitch:"d0n__chqn_", tw:0, tags:["rank"]},
  {name:"西村ほのか", twitch:"nishimura_honoka", tw:33, tags:["rank"]},
  {name:"TsukiyuriKira", twitch:"tsukiyurikira", tw:0, tags:["rank"]},
  {name:"事務員しぐま", twitch:"sigma_e57", tw:0, tags:["rank"]}
];

/* ============================================================
   レジェンドピック率（全ランク帯）
   出典: apexlegendsstatus.com/game-stats/legends-pick-rates
   ★スナップショットです。シーズン/スプリットごとに取り直してください
   legends の並びは自由（表示時にピック率で並べ替えます）
   [英名, 日本語名, ピック率%, 7日前比%, レジェンドのイメージカラー]
   ※7日前比は「(現在PR − 7日前PR) ÷ 7日前PR × 100」。
     開幕直後は比較対象がまだ前シーズンのため数値が極端に大きくなります。
     比較窓が丸ごと当シーズンに入ると（S30なら8/12頃）一斉に縮みます。
   ============================================================ */
APEX_DATA.pickrate = {
  seasonNo: 30,
  label:   "シーズン30 開幕23日目 / 全ランク帯・全モード",
  updated: "2026-08-27",
  source:  "apexlegendsstatus.com",
  sample:  "約3,430万プレイヤー",
  legends: [
    ["Pathfinder","パスファインダー",9.9,9.77,"#6ec8ff"],
    ["Axle","アクセル",9.5,-10.18,"#c44dff"],
    ["Loba","ローバ",9.1,-4.81,"#d95ac2"],
    ["Mad Maggie","マッドマギー",7.3,10.45,"#ff2d78"],
    ["Fuse","ヒューズ",5.9,5.59,"#ff6a1f"],
    ["Octane","オクタン",5.7,2.11,"#6fdd3a"],
    ["Wraith","レイス",5.3,-2.29,"#8a5cff"],
    ["Bangalore","バンガロール",4.5,-2.65,"#93a06a"],
    ["Alter","オルター",3.2,13.78,"#b06bff"],
    ["Lifeline","ライフライン",3.2,-13.92,"#3ad6b0"],
    ["Valkyrie","ヴァルキリー",3.2,-1.56,"#5f6bd8"],
    ["Seer","シア",3.2,-2.58,"#d0a02a"],
    ["Caustic","コースティック",3,2.93,"#b6d442"],
    ["Sparrow","スパロウ",2.9,7.23,"#e0603a"],
    ["Gibraltar","ジブラルタル",2.8,3.37,"#3b8fd6"],
    ["Bloodhound","ブラッドハウンド",2.7,-18.30,"#e0453f"],
    ["Ash","アッシュ",2.3,0.75,"#b03a8f"],
    ["Conduit","コンジット",2.3,1.09,"#ff7ad9"],
    ["Wattson","ワットソン",2.3,4.54,"#ffe14d"],
    ["Vantage","ヴァンテージ",2.1,6.31,"#a8d8f0"],
    ["Mirage","ミラージュ",1.9,-2.66,"#ffc93d"],
    ["Revenant","レヴナント",1.8,0.72,"#c02a45"],
    ["Rampart","ランパート",1.4,-10.76,"#3fd3c8"],
    ["Horizon","ホライゾン",1.3,3.72,"#9fe8ff"],
    ["Newcastle","ニューキャッスル",0.9,-4.64,"#2f6fff"],
    ["Catalyst","カタリスト",0.8,25.21,"#6a4dd6"],
    ["Crypto","クリプト",0.7,12.34,"#39c46a"],
    ["Ballistic","バリスティック",0.7,-1.98,"#c8a04a"]
  ]
};

/* ピック率データが現在のシーズンのものかどうか */
APEX_DATA.pickrateIsStale = function(){
  return this.pickrate.seasonNo !== this.currentSeason().no;
};

/* ピック率降順に並べ替えた配列を返す */
APEX_DATA.pickrateSorted = function(){
  return this.pickrate.legends.slice().sort(function(a,b){ return b[2]-a[2]; });
};

/* 「崖」= 3位〜12位の範囲で隣接順位の差が最大になる位置。
   1位→2位の差は除外（突出した1体がいるとそこが常に最大になるため） */
APEX_DATA.pickrateCliff = function(){
  var s = this.pickrateSorted(), cut = 3, gap = -1;
  var limit = Math.min(12, s.length - 1);
  for(var i = 3; i <= limit; i++){
    var g = s[i-1][2] - s[i][2];
    if(g > gap){ gap = g; cut = i; }
  }
  return { cut: cut, gap: gap };
};

/* タグ定義（タブの並び順もこの順） */
APEX_DATA.streamerTags = [
  {id:"all",        label:"すべて"},
  {id:"coach",      label:"解説・上達"},
  {id:"rank",       label:"ランク配信"},
  {id:"pro",        label:"プロ・競技"},
  {id:"vtuber",     label:"VTuber"},
  {id:"clip",       label:"クリップ・動画"}
];
