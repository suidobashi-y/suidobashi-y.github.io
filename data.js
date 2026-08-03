/* ============================================================
   NEON GRID 共通データ — シーズン/スプリットごとにここだけ更新
   ============================================================ */
var APEX_DATA = {

  season: {
    no: 29, name: "OVERCLOCK",
    start:      "2026-05-06T02:00:00+09:00",  // S29開幕（日本時間）
    splitStart: "2026-06-24T02:00:00+09:00",  // スプリット2開始
    end:        "2026-08-05T02:00:00+09:00",  // S30「MARKED」開幕
    nextName:   "MARKED"
  },

  /* ランク分布：上位ティアから順に記述
     div : ディビジョン別の内訳 [I, II, III, IV]（合計が pct になるように）
     出典: apex.tracker.gg（同サイトの追跡母集団=約15万人ベース。ゲーム全体の実数ではありません）
     ★グラフからの読み取り値のため誤差があります。正確な値は各バーのツールチップで確認を */
  rank: {
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
  {name:"わぶ", twitch:"wabu1", tw:14, tags:["rank"]}
];

/* タグ定義（タブの並び順もこの順） */
APEX_DATA.streamerTags = [
  {id:"all",        label:"すべて"},
  {id:"coach",      label:"解説・上達"},
  {id:"rank",       label:"ランク配信"},
  {id:"pro",        label:"プロ・競技"},
  {id:"vtuber",     label:"VTuber"},
  {id:"clip",       label:"クリップ・動画"}
];
