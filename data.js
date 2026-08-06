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
     ★ end と splitStart は S29 の期間（91日 / 49日）から算出した予測値です。
       公式発表が出たら正しい日付に差し替えてください。 */
  nextSeason: {
    no: 30, name: "MARKED",
    start:      "2026-08-05T02:00:00+09:00",  // S30開幕（公式）
    splitStart: "2026-09-23T02:00:00+09:00",  // スプリット2開始（予測）
    end:        "2026-11-04T02:00:00+09:00",  // S31開幕（予測）
    nextName:   "TBA",
    estimated:  true                          // 期間が予測値であることの目印
  },

  /* ランク分布：上位ティアから順に記述
     div : ディビジョン別の内訳 [I, II, III, IV]（合計が pct になるように）
     出典: apex.tracker.gg（同サイトの追跡母集団=約15万人ベース。ゲーム全体の実数ではありません）
     ★グラフからの読み取り値のため誤差があります。正確な値は各バーのツールチップで確認を */
  rank: {
    seasonNo: 29,   // この分布データのシーズン。現在のシーズンと違うと注意書きが出ます
    label:   "シーズン29 スプリット2 / ランクマッチ",
    updated: "2026-08-03",
    source:  "apex.tracker.gg",
    divEstimated: false,
    tiers: [
      {n:"プレデター",   s:"PRED", c:"pred",   pct: 1.5},
      {n:"マスター",     s:"MAS",  c:"master", pct: 5.7},
      {n:"ダイヤモンド", s:"DIA",  c:"dia",    pct:27.2, div:[3.3, 5.3, 10.4, 8.2]},
      {n:"プラチナ",     s:"PLA",  c:"plat",   pct:27.9, div:[3.5, 5.9, 11.7, 6.8]},
      {n:"ゴールド",     s:"GLD",  c:"gold",   pct:20.8, div:[4.0, 4.8, 6.0, 6.0]},
      {n:"シルバー",     s:"SIL",  c:"silver", pct:11.9, div:[3.1, 3.0, 2.9, 2.9]},
      {n:"ブロンズ",     s:"BRZ",  c:"bronze", pct: 3.5, div:[1.0, 0.9, 0.8, 0.8]},
      {n:"ルーキー",     s:"RKY",  c:"rookie", pct: 1.5, div:[0.4, 0.4, 0.4, 0.3]}
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
APEX_DATA.divisions = function(){
  var out=[];
  this.rank.tiers.forEach(function(t){
    if(!t.div){ out.push({name:t.n, tier:t.n, c:t.c, pct:t.pct, head:true}); return; }
    t.div.forEach(function(p,i){
      out.push({name:t.n+" "+["I","II","III","IV"][i], tier:t.n, c:t.c, pct:p, head:i===0});
    });
  });
  return out;
};

/* 累積(上位から)を返す */
APEX_DATA.cumulative = function(){
  var t=this.rank.tiers, cum=[], run=0;
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
  {name:"おっさんの挑戦", twitch:"89workers", tw:0, tags:["rank"]}
];

/* ============================================================
   レジェンドピック率（全ランク帯）
   出典: apexlegendsstatus.com/game-stats/legends-pick-rates
   ★スナップショットです。シーズン/スプリットごとに取り直してください
   legends の並びは自由（表示時にピック率で並べ替えます）
   [英名, 日本語名, ピック率%, 7日前比%, レジェンドのイメージカラー]
   ============================================================ */
APEX_DATA.pickrate = {
  seasonNo: 29,
  label:   "シーズン29 / 全ランク帯・全モード",
  updated: "2026-08-05",
  source:  "apexlegendsstatus.com",
  sample:  "約3,400万プレイヤー",
  legends: [
    ["Axle","アクセル",11.8,-5.47,"#c44dff"],
    ["Pathfinder","パスファインダー",8.4,-2.09,"#6ec8ff"],
    ["Mad Maggie","マッドマギー",7.4,2.06,"#ff2d78"],
    ["Octane","オクタン",6.5,3.38,"#6fdd3a"],
    ["Valkyrie","ヴァルキリー",6.1,-9.03,"#5f6bd8"],
    ["Bangalore","バンガロール",5.4,-0.89,"#93a06a"],
    ["Wraith","レイス",5.3,1.98,"#8a5cff"],
    ["Fuse","ヒューズ",5.1,12.02,"#ff6a1f"],
    ["Lifeline","ライフライン",4.0,2.06,"#3ad6b0"],
    ["Seer","シア",3.4,-7.6,"#d0a02a"],
    ["Conduit","コンジット",3.4,-6.18,"#ff7ad9"],
    ["Alter","オルター",3.2,-7.87,"#b06bff"],
    ["Sparrow","スパロウ",3.0,3.57,"#e0603a"],
    ["Caustic","コースティック",2.8,2.61,"#b6d442"],
    ["Gibraltar","ジブラルタル",2.8,3.87,"#3b8fd6"],
    ["Ash","アッシュ",2.7,1.29,"#b03a8f"],
    ["Mirage","ミラージュ",2.6,6.27,"#ffc93d"],
    ["Wattson","ワットソン",2.3,0.07,"#ffe14d"],
    ["Revenant","レヴナント",2.3,1.49,"#c02a45"],
    ["Vantage","ヴァンテージ",2.1,0.41,"#a8d8f0"],
    ["Bloodhound","ブラッドハウンド",1.8,26.14,"#e0453f"],
    ["Loba","ローバ",1.6,24.44,"#d95ac2"],
    ["Horizon","ホライゾン",1.5,6.88,"#9fe8ff"],
    ["Newcastle","ニューキャッスル",1.2,1.47,"#2f6fff"],
    ["Rampart","ランパート",1.1,8.3,"#3fd3c8"],
    ["Ballistic","バリスティック",0.9,-15.78,"#c8a04a"],
    ["Crypto","クリプト",0.8,-6.84,"#39c46a"],
    ["Catalyst","カタリスト",0.7,6.44,"#6a4dd6"]
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
