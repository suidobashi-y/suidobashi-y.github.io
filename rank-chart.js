/* =========================================================
   rank-chart.js
   RANK WORKBOOK 共有ロジック（tracker.html / index.html から利用）
   - ティア表・色・偏差値
   - Apex の日付境界（02:00 JST）とスプリット定義
   - RP推移チャートの描画
   前提: data.js を先に読み込むこと
   ========================================================= */
const KEY = "apexwb_rp_v1";
const SUM_KEY = "apexwb_rp_summary_v1";
const STORE = (()=>{
  try{ localStorage.setItem("__t","1"); localStorage.removeItem("__t"); return localStorage; }
  catch(e){
    const m = {};
    return { getItem:k=>(k in m ? m[k] : null), setItem:(k,v)=>{m[k]=String(v);}, removeItem:k=>{delete m[k];} };
  }
})();
let DB = { v:1, profile:{ name:"", platform:"X1", goal:null }, records:{} };
function loadDB(){
  try{
    const raw = STORE.getItem(KEY);
    if (raw) DB = Object.assign(DB, JSON.parse(raw));
  }catch(e){}
  return DB;
}
function recordCount(){ return Object.keys(DB.records || {}).length; }

/* ---- スプリット定義（data.js の season / nextSeason から生成） ---- */
const SEASON = (typeof APEX_DATA !== "undefined" && APEX_DATA.currentSeason)
  ? APEX_DATA.currentSeason()
  : { no:30, name:"MARKED", start:"2026-08-05T02:00:00+09:00",
      splitStart:"2026-09-16T02:00:00+09:00", end:"2026-11-04T02:00:00+09:00",
      nextName:"TBA", estimated:true };

const SPLITS = [
  { id:`s${SEASON.no}-1`, season:SEASON.no, label:`S${SEASON.no} スプリット1`,
    start:SEASON.start,      end:SEASON.splitStart, confirmed:true },
  { id:`s${SEASON.no}-2`, season:SEASON.no, label:`S${SEASON.no} スプリット2`,
    start:SEASON.splitStart, end:SEASON.end,        confirmed:!SEASON.estimated }
];

/* シーズン進捗の見出し（index.html のシーズンカードと同じ表示） */
function seasonHead(ids){
  const q = { no:"sNo", name:"sName", sp:"sSp", left:"sLeft", pct:"sPct" };
  Object.assign(q, ids || {});
  const $ = k => document.getElementById(q[k]);
  const st = new Date(SEASON.start).getTime(),
        en = new Date(SEASON.end).getTime(),
        sp = new Date(SEASON.splitStart).getTime(),
        now = Date.now();
  $("no").textContent   = "S" + SEASON.no;
  $("name").textContent = " " + (SEASON.name || "");

  const inSp1 = now < sp;
  $("sp").textContent = inSp1 ? "SPLIT 1" : "SPLIT 2";

  const elL = $("left"), elP = $("pct");
  const seasonLeft = en - now;
  if (seasonLeft <= 0){
    $("sp").textContent = "END";
    elL.textContent = "シーズン終了";
    elP.textContent = "";
    return;
  }

  // メイン＝現在のスプリットの残り、括弧＝シーズン全体の残り
  const spEnd = inSp1 ? sp : en;
  const left  = spEnd - now;
  const d = Math.floor(left/86400000), h = Math.floor(left%86400000/3600000);
  elL.innerHTML = "残り <b>" + d + "</b>日 " + h + "時間";

  const sd = Math.floor(seasonLeft/86400000);
  const est = SEASON.estimated ? "予測" : "";
  elP.textContent = inSp1
    ? "（シーズン全体 残り" + sd + "日" + (est ? " / " + est : "") + "）"
    : "（シーズン終了まで" + (est ? "・" + est : "") + "）";
}

/* ---- ALSのティア名 → 日本語 ---- */
const TIER_JA = { Rookie:"ルーキー", Bronze:"ブロンズ", Silver:"シルバー", Gold:"ゴールド",
  Platinum:"プラチナ", Diamond:"ダイヤ", Master:"マスター", Apex_Predator:"プレデター", Predator:"プレデター" };
const ROMAN = { 1:"I", 2:"II", 3:"III", 4:"IV" };
/* ティア色（deviation.html のシェア画像と同じ Apex 公式準拠パレット） */
const TIER_COLOR = { "ルーキー":"#BCC5D2","ブロンズ":"#C08A4E","シルバー":"#CFD6E2","ゴールド":"#F5C542",
  "プラチナ":"#4CF0D5","ダイヤ":"#63B4FF","マスター":"#C97DFF","プレデター":"#FF4655" };
const tierBaseOf = rp => { let i=0; for(let k=0;k<TIERS.length;k++) if(rp>=TIERS[k].rp) i=k; return TIERS[i]; };
function tierLabel(rec){
  if (!rec || !rec.tier) return null;
  const base = TIER_JA[rec.tier] || rec.tier;
  return base + (rec.div ? ROMAN[rec.div] || "" : "");
}

/* ---- ティア境界 ----
 * 出典: EA公式ヘルプ「エーペックスレジェンズのランクの仕組み」
 *   https://help.ea.com/ja/articles/apex-legends/ranked/
 * 公式は「ディビジョン間の必要RP」と「スプリット2のリセット値」を掲載しているため、
 * そこから絶対値を復元している。
 *   ダイヤII・I → プラチナII 10000 にリセット（降格保護なし）→ プラチナII = 10000
 *   マスター以上 → プラチナI 11000 にリセット（降格保護なし）→ プラチナI  = 11000
 * この2点を起点に、公式の刻み（ゴールド750 / プラチナIII→II 750 / II→I 1000 など）で前後に展開。
 * ※ ダイヤI→マスターの必要RPは公式未掲載のため、16000 は暫定値。
 */
const TIERS = [
  {n:"ルーキーIV",  t:"ルーキー", d:4, rp:0},    {n:"ルーキーIII", t:"ルーキー", d:3, rp:250},
  {n:"ルーキーII",  t:"ルーキー", d:2, rp:500},  {n:"ルーキーI",   t:"ルーキー", d:1, rp:750},
  {n:"ブロンズIV",  t:"ブロンズ", d:4, rp:1000}, {n:"ブロンズIII", t:"ブロンズ", d:3, rp:1500},
  {n:"ブロンズII",  t:"ブロンズ", d:2, rp:2000}, {n:"ブロンズI",   t:"ブロンズ", d:1, rp:2500},
  {n:"シルバーIV",  t:"シルバー", d:4, rp:3250}, {n:"シルバーIII", t:"シルバー", d:3, rp:3750},
  {n:"シルバーII",  t:"シルバー", d:2, rp:4250}, {n:"シルバーI",   t:"シルバー", d:1, rp:4750},
  {n:"ゴールドIV",  t:"ゴールド", d:4, rp:5500}, {n:"ゴールドIII", t:"ゴールド", d:3, rp:6250},
  {n:"ゴールドII",  t:"ゴールド", d:2, rp:7000}, {n:"ゴールドI",   t:"ゴールド", d:1, rp:7750},
  {n:"プラチナIV",  t:"プラチナ", d:4, rp:8500}, {n:"プラチナIII", t:"プラチナ", d:3, rp:9250},
  {n:"プラチナII",  t:"プラチナ", d:2, rp:10000},{n:"プラチナI",   t:"プラチナ", d:1, rp:11000},
  {n:"ダイヤIV",    t:"ダイヤ",   d:4, rp:12000},{n:"ダイヤIII",   t:"ダイヤ",   d:3, rp:13000},
  {n:"ダイヤII",    t:"ダイヤ",   d:2, rp:14000},{n:"ダイヤI",     t:"ダイヤ",   d:1, rp:15000},
  {n:"マスター",    t:"マスター", d:0, rp:16000}
];

/* ---- 偏差値（deviation.html と同じ考え方 / 分布は data.js の rank） ---- */
function normInv(p){
  if(p<=0)p=1e-9; if(p>=1)p=1-1e-9;
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425, ph=1-pl; let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p<=ph){q=p-0.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}
const DIST = (typeof APEX_DATA !== "undefined" && APEX_DATA.rank) ? APEX_DATA.rank.tiers : null;
const DIST_NAME = n => n === "ダイヤモンド" ? "ダイヤ" : n;

function deviation(rp){
  if (!DIST) return null;
  let i = 0;
  for (let k=0;k<TIERS.length;k++) if (rp >= TIERS[k].rp) i = k;
  const cur = TIERS[i], next = TIERS[i+1];
  const frac = next ? Math.min(1, Math.max(0, (rp-cur.rp)/(next.rp-cur.rp))) : 1;
  let above = 0, found = false;
  for (const dt of DIST){
    if (DIST_NAME(dt.n) === cur.t){
      if (!dt.div) above += dt.pct * 0.5;          // マスター等（区分なし）は中央値で近似
      else {
        for (let k=0;k<cur.d-1;k++) above += dt.div[k];
        above += (1-frac) * dt.div[cur.d-1];
      }
      found = true; break;
    }
    above += dt.pct;
  }
  if (!found) return null;
  const topP = Math.min(99.99, Math.max(0.01, above));
  return { dev: 50 + 10*normInv(1 - topP/100), topP };
}



/* ---- 日付ユーティリティ（Apexの日境界は 02:00 JST） ---- */
const DAY = 86400000;
function apexDate(d = new Date()){
  return new Date(d.getTime() - 2*3600*1000)
    .toLocaleDateString("sv-SE", { timeZone:"Asia/Tokyo" });
}
const parseD = s => new Date(s + "T12:00:00+09:00");
const addD   = (s,n) => apexDate(new Date(parseD(s).getTime() + n*DAY + 2*3600*1000));
const diffD  = (a,b) => Math.round((parseD(a)-parseD(b))/DAY);
function splitOf(dateStr){
  const t = parseD(dateStr).getTime();
  return SPLITS.find(s => t >= new Date(s.start).getTime() && t < new Date(s.end).getTime()) || null;
}
function currentSplit(){ return splitOf(apexDate()) || SPLITS[SPLITS.length-1]; }
const fmt  = n => n.toLocaleString("en-US");
const sign = n => (n>0?"+":"") + fmt(n);

/* ---- 抽出 ---- */
function entries(splitId){
  const sp = SPLITS.find(s=>s.id===splitId);
  return Object.keys(DB.records).sort()
    .filter(d => !sp || (parseD(d) >= new Date(sp.start) && parseD(d) < new Date(sp.end)))
    .map(d => ({ date:d, ...DB.records[d] }));
}
/* デルタ: スプリット内で前の記録がある日のみ算出 */
function withDelta(list){
  return list.map((e,i)=> ({ ...e, delta: i===0 ? null : e.rp - list[i-1].rp }));
}
function streak(){
  const all = Object.keys(DB.records).sort();
  if (!all.length) return { n:0, today:false };
  const t = apexDate();
  const today = !!DB.records[t];
  let cur = today ? t : addD(t,-1), n = 0;
  while (DB.records[cur]) { n++; cur = addD(cur,-1); }
  return { n, today };
}
function tierAt(rp){
  let i = 0;
  for (let k=0;k<TIERS.length;k++) if (rp >= TIERS[k].rp) i = k;
  return { cur:TIERS[i], next:TIERS[i+1] || null };
}

function ctx2(id){
  const c = document.getElementById(id);
  // 初回に縦横比を控えておく（width/height 属性は代入で書き換わるため）
  if (!c.dataset.ar) c.dataset.ar = (+c.getAttribute("height")) / (+c.getAttribute("width"));
  const pw = c.parentElement.clientWidth;
  if (!pw) return null;                  // 非表示のときは測れないので描かない
  const w = Math.max(120, pw - 28);
  const h = Math.round(w * (+c.dataset.ar));
  const r = window.devicePixelRatio || 1;
  const W = Math.round(w*r), H = Math.round(h*r);
  if (c.width !== W || c.height !== H){ c.width = W; c.height = H; }
  c.style.width = w + "px"; c.style.height = h + "px";
  const x = c.getContext("2d");
  x.setTransform(r, 0, 0, r, 0, 0);        // scale() だと呼ぶたび累積するので毎回リセット
  x.clearRect(0, 0, w, h);
  x.globalAlpha = 1; x.setLineDash([]); x.shadowBlur = 0; x.lineWidth = 1;
  return { x, w, h };
}
const CSSV = n => getComputedStyle(document.body).getPropertyValue(n).trim();

function drawLine(d, pr){
  const p1 = (pr === undefined ? 1 : pr);
  const cc = ctx2("line");
  if (!cc) return;
  const { x, w, h } = cc;
  if (!d.length) return;
  const L = 42, R = 10, T = 16, B = 26;
  const vs = d.map(e=>e.rp);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const { cur, next } = tierAt(vs[vs.length-1]);
  const ci = TIERS.indexOf(cur);
  const prev = ci > 0 ? TIERS[ci-1] : null;          // 1つ下のディビジョン
  if (next) hi = Math.max(hi, next.rp);
  lo = Math.min(lo, cur.rp);
  if (prev && prev.rp > 0) lo = Math.min(lo, prev.rp);
  const pad = Math.max(200,(hi-lo)*.15); lo -= pad; hi += pad;
  const px = i => L + (d.length===1 ? (w-L-R)/2 : i*(w-L-R)/(d.length-1));
  const py = v => h-B - (v-lo)/(hi-lo)*(h-T-B);

  const step = (hi-lo) > 6000 ? 2000 : 1000;
  x.font = "600 9px 'Chakra Petch'"; x.textAlign = "right";
  for (let g = Math.ceil(lo/step)*step; g < hi; g += step){
    x.strokeStyle = "#141e30"; x.beginPath(); x.moveTo(L,py(g)); x.lineTo(w-R,py(g)); x.stroke();
    x.fillStyle = "#5c6884"; x.fillText((g/1000)+"k", L-6, py(g)+3);
  }
  /* 面 + 線（初期表示は左から伸ばす） */
  x.save();
  x.beginPath(); x.rect(0, 0, L + (w-L-R)*p1 + 1, h); x.clip();

  x.beginPath(); d.forEach((e,i)=> i?x.lineTo(px(i),py(e.rp)):x.moveTo(px(i),py(e.rp)));
  x.save(); x.lineTo(px(d.length-1), h-B); x.lineTo(px(0), h-B); x.closePath();
  const gr = x.createLinearGradient(0,T,0,h-B);
  gr.addColorStop(0,"rgba(0,229,255,.22)"); gr.addColorStop(1,"rgba(0,229,255,.02)");
  x.fillStyle = gr; x.fill(); x.restore();
  x.beginPath(); d.forEach((e,i)=> i?x.lineTo(px(i),py(e.rp)):x.moveTo(px(i),py(e.rp)));
  x.shadowColor = "rgba(0,229,255,.85)"; x.shadowBlur = 10;
  x.strokeStyle = CSSV("--cyan"); x.lineWidth = 2; x.lineJoin = "round"; x.stroke();
  x.shadowBlur = 0;

  /* ティア線：表示範囲に入る境界をすべて、そのティアの色で引く */
  x.setLineDash([5,5]); x.lineWidth = 1; x.textAlign = "left";
  // 現在のディビジョンを基準に、上下1ディビジョンぶんだけ引く
  const shown = [next, cur, prev].filter(t => t && t.rp > 0 && py(t.rp) >= T && py(t.rp) <= h-B);
  shown.forEach(t=>{
    const yy = py(t.rp);
    const col = TIER_COLOR[t.t] || "#8a6bd6";
    const key = next && t.n === next.n;              // 次のディビジョン＝強調
    x.globalAlpha = key ? 1 : .55;
    x.lineWidth = key ? 1.5 : 1;
    x.setLineDash(key ? [7,4] : [4,6]);
    x.strokeStyle = col;
    x.beginPath(); x.moveTo(L, yy); x.lineTo(w-R, yy); x.stroke();
    x.fillStyle = col; x.font = (key ? "700 9.5px" : "500 9px") + " 'Noto Sans JP'";
    x.fillText(t.n + " " + fmt(t.rp), L+3, yy-5);
  });
  x.globalAlpha = 1; x.lineWidth = 1; x.setLineDash([]);

  /* 点（クリップ内） */
  d.forEach((e,i)=>{
    if (e.src === "manual"){
      x.beginPath(); x.arc(px(i),py(e.rp),3.5,0,7);
      x.fillStyle = "#0a0e1a"; x.fill();
      x.strokeStyle = CSSV("--amber"); x.lineWidth = 1.5; x.stroke();
    }
  });
  x.restore();                     // クリップ解除

  /* 最新値のマーカーとツールチップは最後にふわっと出す */
  const fade = Math.max(0, Math.min(1, (p1 - 0.8) / 0.2));
  if (fade <= 0){
    x.fillStyle = "#5c6884"; x.font = "600 9px 'Chakra Petch'";
    x.textAlign = "left";  x.fillText(d[0].date.slice(5).replace("-","/"), L, h-8);
    x.globalAlpha = 1;
    return;
  }
  x.globalAlpha = fade;
  {
    const i = d.length-1;
    x.beginPath(); x.arc(px(i),py(d[i].rp),4,0,7); x.fillStyle = CSSV("--cyan"); x.fill();
  }

  x.globalAlpha = 1;
  x.fillStyle = "#5c6884"; x.font = "600 9px 'Chakra Petch'";
  x.textAlign = "left";  x.fillText(d[0].date.slice(5).replace("-","/"), L, h-8);
  if (d.length>1){ x.textAlign = "right"; x.fillText(d[d.length-1].date.slice(5).replace("-","/"), w-R, h-8); }
}

/* 初回表示だけ、左から線が伸びる */
let lineAnim = 0, introDone = false;
function animateLine(d){
  cancelAnimationFrame(lineAnim);
  const st = performance.now(), dur = 950;
  const step = now=>{
    const p = Math.min(1, (now-st)/dur);
    drawLine(d, 1 - Math.pow(1-p, 3));
    if (p < 1) lineAnim = requestAnimationFrame(step);
    else introDone = true;
  };
  lineAnim = requestAnimationFrame(step);
}

