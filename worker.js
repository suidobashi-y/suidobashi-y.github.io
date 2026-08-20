/**
 * APEX WORKBOOK — API中継Worker (Cloudflare Workers)
 *
 * APIキーをブラウザに晒さずに済ませるための中継サーバーです。
 * 2つのエンドポイントを提供します。
 *
 *   GET /maprotation → マップローテーション（Apex Legends Status）
 *   GET /live        → 配信中のTwitchチャンネル一覧 {"live":["name",...]}
 *   GET /feed        → 配信トレンド（Apex配信中のタイトルからモード・話題語を集計）
 *   GET /rp          → 指定プレイヤーの現在RP（RPトラッカーの自動取得用）
 *
 * ===== 設定するシークレット（Workersの管理画面で設定） =====
 *   APEX_API_KEY        必須  https://api.mozambiquehe.re/getkey で取得
 *   TWITCH_CLIENT_ID    任意  /live を使う場合。Twitch開発者コンソールで取得
 *   TWITCH_CLIENT_SECRET 任意 同上
 *
 * ===== CORS =====
 *   公開データを読むだけのエンドポイントなので、既定では全オリジンを許可します。
 *   自サイトのみに絞りたい場合は STRICT_ORIGINS に配列でドメインを列挙してください。
 *   例: const STRICT_ORIGINS = ["https://suidobashi-y.github.io"];
 */

const STRICT_ORIGINS = [];   // 空配列 = 全オリジン許可

/* 配信中を調べたいTwitchユーザー名（_data.js の twitch と揃える） */
const TWITCH_USERS = [
  "nniru", "shibuyahal", "vodka_", "selly55", "arisaka_", "akamikarubi",
  "hiiragitsurugi", "spygea", "darkmasuotv", "mondo", "euriece", "tie_ru",
  "kawase", "tttcheekyttt", "bobsappaim0304", "kinako_0707", "amakipururu",
  "iq200yukaf", "bijusan", "meltstella", "heshiko1", "satuking_",
  "fps__saku", "4rufq", "lykq8don", "peace_da", "deep_learning_f",
  "hososhin_twitch", "nigongo25", "kanontyandayo", "lstarshunshun",
  "irene28___", "karakaramann", "sawada0117", "chocolate5d",
  "amemiya328", "next_dayo", "mochiyuzu_", "ienaga25", "lullyru11",
  "chitchat_ai", "imperialkaz", "iamfjk", "hoshimai_chill", "sapo_ten",
  "futon_moguri", "hashihimemikona", "amanehina", "89workers",
  "syachikusaku", "d0n__chqn_", "nishimura_honoka", "tsukiyurikira",
  "sigma_e57"
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const origin = request.headers.get("Origin");

    // CORSプリフライト
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), origin);

    try {
      if (url.pathname === "/maprotation") return cors(await mapRotation(env, ctx), origin);
      if (url.pathname === "/live")        return cors(await live(env, ctx), origin);
      if (url.pathname === "/discover")    return cors(await discover(env, url), origin);
      if (url.pathname === "/feed")        return cors(await feed(request, env, ctx), origin);
      if (url.pathname === "/rp")          return cors(await playerRp(env, url), origin);
      // ルート: 動作確認用
      if (url.pathname === "/" ) return cors(json({
        ok: true,
        endpoints: ["/maprotation", "/live", "/discover", "/feed", "/rp"],
        apexKey: env.APEX_API_KEY ? "設定済み" : "未設定",
        twitch: (env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET) ? "設定済み" : "未設定"
      }), origin);
      return cors(json({ error: "Not found" }, 404), origin);
    } catch (e) {
      return cors(json({ error: String(e.message || e) }, 502), origin);
    }
  }
};

/* ---------- マップローテーション ---------- */
async function mapRotation(env, ctx) {
  if (!env.APEX_API_KEY) return json({ error: "APEX_API_KEY が未設定です" }, 500);

  const upstream = "https://api.mozambiquehe.re/maprotation?version=2&auth=" + env.APEX_API_KEY;
  // 60秒キャッシュ（上流のレート制限対策）
  const res = await fetch(upstream, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!res.ok) return json({ error: "upstream " + res.status }, 502);

  const data = await res.json();
  return json(data, 200, 60);
}

/* ---------- プレイヤーの現在RP（RPトラッカー用） ---------- */
/* 例: /rp?player=Zume&platform=X1  →  {"rp":14820,"tier":"Platinum","div":1,"at":...} */
const RP_PLATFORMS = ["PC", "PS4", "X1"];

async function playerRp(env, url) {
  if (!env.APEX_API_KEY) return json({ error: "APEX_API_KEY が未設定です" }, 500);

  const player   = (url.searchParams.get("player") || "").trim();
  const platform = url.searchParams.get("platform") || "X1";

  if (!player || player.length > 40 || !RP_PLATFORMS.includes(platform)) {
    return json({ error: "player と platform を確認してください" }, 400);
  }

  // 90秒キャッシュ（連打を上流まで飛ばさない）
  const upstream = "https://api.mozambiquehe.re/bridge?auth=" + env.APEX_API_KEY +
                   "&player=" + encodeURIComponent(player) +
                   "&platform=" + platform;
  const res = await fetch(upstream, { cf: { cacheTtl: 90, cacheEverything: true } });
  if (!res.ok) return json({ error: "upstream " + res.status }, 502);

  const data = await res.json();
  if (data && data.Error) return json({ error: "not-found" }, 404);

  const rank = data && data.global && data.global.rank;
  return json({
    rp:   rank && typeof rank.rankScore === "number" ? rank.rankScore : null,
    tier: rank ? (rank.rankName || null) : null,
    div:  rank ? (rank.rankDiv  ?? null) : null,
    at:   Date.now()
  }, 200, 90);
}

/* ---------- 配信中のTwitchチャンネル ----------
   返すもの:
     live    配信中のユーザー名（ゲーム問わず）
     apex    そのうち Apex Legends を配信中のユーザー名
     games   {ユーザー名: {id, name}}  配信中のゲーム
     titles  {ユーザー名: 配信タイトル}
     viewers {ユーザー名: 視聴者数}
     icons   {ユーザー名: プロフィール画像URL}（リスト全員分）      */
const APEX_GAME_ID = "511224";   // Apex Legends

async function live(env, ctx) {
  const id = env.TWITCH_CLIENT_ID, secret = env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return json({ live: [], apex: [], note: "Twitchの認証情報が未設定です" }, 200, 60);

  // アプリトークンを取得（60秒キャッシュ）
  const tokRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id, client_secret: secret, grant_type: "client_credentials"
    }),
    cf: { cacheTtl: 3000, cacheEverything: true }
  });
  if (!tokRes.ok) return json({ error: "twitch auth " + tokRes.status }, 502);
  const token = (await tokRes.json()).access_token;

  const head = { "Client-ID": id, "Authorization": "Bearer " + token };

  // --- 配信中の情報（user_login は1リクエスト100件まで） ---
  const liveNames = [], apexNames = [];
  const games = {}, titles = {}, viewers = {};

  for (let i = 0; i < TWITCH_USERS.length; i += 100) {
    const q = new URLSearchParams();
    TWITCH_USERS.slice(i, i + 100).forEach(u => q.append("user_login", u));
    q.append("first", "100");
    const r = await fetch("https://api.twitch.tv/helix/streams?" + q, {
      headers: head,
      cf: { cacheTtl: 60, cacheEverything: true }
    });
    if (!r.ok) continue;
    const j = await r.json();
    (j.data || []).forEach(s => {
      const login = (s.user_login || "").toLowerCase();
      if (!login) return;
      liveNames.push(login);
      games[login]   = { id: s.game_id || "", name: s.game_name || "" };
      titles[login]  = s.title || "";
      viewers[login] = s.viewer_count || 0;
      if (String(s.game_id) === APEX_GAME_ID) apexNames.push(login);
    });
  }

  // 視聴者数の多い順
  apexNames.sort((a, b) => (viewers[b] || 0) - (viewers[a] || 0));

  // --- プロフィール画像（オフラインの人も含めリスト全員分） ---
  const icons = {};
  for (let i = 0; i < TWITCH_USERS.length; i += 100) {
    const q = new URLSearchParams();
    TWITCH_USERS.slice(i, i + 100).forEach(u => q.append("login", u));
    const r = await fetch("https://api.twitch.tv/helix/users?" + q, {
      headers: head,
      cf: { cacheTtl: 3600, cacheEverything: true }
    });
    if (!r.ok) continue;
    const j = await r.json();
    (j.data || []).forEach(u => {
      if (u.login && u.profile_image_url) icons[u.login.toLowerCase()] = u.profile_image_url;
    });
  }

  return json({
    live: liveNames, apex: apexNames,
    games, titles, viewers, icons,
    updated: new Date().toISOString()
  }, 200, 60);
}

/* ---------- 配信者の発掘（リスト追加候補を探す） ----------
   GET /discover                 視聴者20人以上の日本語Apex配信を視聴者数順に
   GET /discover?min=5&max=300   視聴者数の範囲を指定
   GET /discover?all=1           既にリストにいる人も含める
   ブラウザで開いて、追加したい人の login をコピーして data.js と TWITCH_USERS に貼ってください。 */
async function discover(env, url) {
  const id = env.TWITCH_CLIENT_ID, secret = env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return json({ error: "Twitchの認証情報が未設定です" }, 500);

  const min = Number(url.searchParams.get("min") || 20);
  const max = Number(url.searchParams.get("max") || 1000000);
  const includeAll = url.searchParams.get("all") === "1";

  const token = await twitchToken(id, secret);
  const head = { "Client-ID": id, "Authorization": "Bearer " + token };
  const known = new Set(TWITCH_USERS.map(u => u.toLowerCase()));

  // 日本語のApex配信を最大300件（3ページ）
  const found = [];
  let cursor = "";
  for (let page = 0; page < 3; page++) {
    const q = new URLSearchParams({
      game_id: APEX_GAME_ID, language: "ja", first: "100"
    });
    if (cursor) q.append("after", cursor);
    const r = await fetch("https://api.twitch.tv/helix/streams?" + q, {
      headers: head, cf: { cacheTtl: 60, cacheEverything: true }
    });
    if (!r.ok) break;
    const j = await r.json();
    (j.data || []).forEach(s => {
      const login = (s.user_login || "").toLowerCase();
      if (!login) return;
      if (!includeAll && known.has(login)) return;
      if (s.viewer_count < min || s.viewer_count > max) return;
      found.push({
        name:    s.user_name,          // data.js の name にそのまま使えます
        twitch:  login,                // data.js の twitch / TWITCH_USERS 用
        viewers: s.viewer_count,
        title:   s.title,
        url:     "https://www.twitch.tv/" + login
      });
    });
    cursor = j.pagination && j.pagination.cursor;
    if (!cursor) break;
  }

  found.sort((a, b) => b.viewers - a.viewers);

  // そのまま data.js に貼れる形も添える
  const snippet = found.map(s =>
    `  {name:"${s.name}", twitch:"${s.twitch}", tw:0, tags:["rank"]},`
  ).join("\n");

  return json({
    count: found.length,
    filter: { min, max, excludeKnown: !includeAll },
    candidates: found,
    dataJsSnippet: snippet,
    twitchUsersSnippet: found.map(s => `"${s.twitch}"`).join(", "),
    updated: new Date().toISOString()
  }, 200, 60);
}

/* ---------- 配信トレンド ----------
   GET /feed
     登録配信者のうち Apex を配信中の人のタイトルを解析し、
     「いま日本の上位層が何をやっているか」を返す。

     modes   モードの内訳（ランク / カジュアル / 大会・スクリム など）
             人数と視聴者数の両方で集計する。少人数でも視聴者が多ければ
             そちらのほうが「話題」に近いため。
     terms   レジェンド・武器・ランク帯の言及。普段はまばらだが、
             特定の語が跳ねたときがシグナルになる。
     streams 視聴者数の多い順の実配信（10件）

   Reddit / Google News は Worker からのアクセスが遮断されるため取りやめ。
   こちらは既存の Twitch 認証をそのまま使うので追加のキーは不要。      */

const FEED_TTL = 300;   // 5分キャッシュ（配信は入れ替わりが速い）

/* モード判定。上から順に評価し、最初に当たったものを採用する */
const FEED_MODES = [
  { key: "大会・スクリム", words: ["大会", "スクリム", "カスタム", "scrim", "algs", "予選", "本戦"] },
  { key: "ランク",        words: ["ランク", "らんく", "ランクマ", "rank", "ソロランク", "デュオランク"] },
  { key: "参加型",        words: ["参加型", "視聴者参加", "参加者募集", "コーチング"] },
  { key: "練習・検証",    words: ["射撃訓練", "練習", "検証", "エイム", "aim", "感度"] },
  { key: "カジュアル",    words: ["カジュアル", "カジュ", "ミックステープ", "アリーナ", "デュオ", "トリオ"] }
];

/* 話題語。ここを増やせば拾える語が増える */
const FEED_TERMS = [
  // ランク帯
  { key: "プレデター", cat: "tier",   words: ["プレデター", "プレデタ", "pred"] },
  { key: "マスター",   cat: "tier",   words: ["マスター", "master"] },
  { key: "ダイヤ",     cat: "tier",   words: ["ダイヤ", "diamond"] },
  { key: "プラチナ",   cat: "tier",   words: ["プラチナ", "プラチナ帯", "plat"] },
  // 武器（S30 の調整対象を中心に）
  { key: "RE-45",      cat: "weapon", words: ["re-45", "re45", "アールイー"] },
  { key: "ボルト",     cat: "weapon", words: ["ボルト", "volt"] },
  { key: "ネメシス",   cat: "weapon", words: ["ネメシス", "nemesis"] },
  { key: "フラットライン", cat: "weapon", words: ["フラットライン", "フラトラ", "flatline"] },
  { key: "R-301",      cat: "weapon", words: ["r-301", "r301", "サンマルイチ"] },
  { key: "ウィングマン", cat: "weapon", words: ["ウィングマン", "wingman"] },
  { key: "R-99",       cat: "weapon", words: ["r-99", "r99"] },
  { key: "ハボック",   cat: "weapon", words: ["ハボック", "havoc"] },
  { key: "ヘムロック", cat: "weapon", words: ["ヘムロック", "hemlok"] },
  { key: "クレーバー", cat: "weapon", words: ["クレーバー", "kraber"] },
  // レジェンド（使用率の高い順に絞って掲載）
  { key: "アッシュ",   cat: "legend", words: ["アッシュ", "ash"] },
  { key: "ブラッドハウンド", cat: "legend", words: ["ブラッドハウンド", "ブラハ", "bloodhound"] },
  { key: "パスファインダー", cat: "legend", words: ["パスファインダー", "パスファ", "pathfinder"] },
  { key: "オクタン",   cat: "legend", words: ["オクタン", "octane"] },
  { key: "レイス",     cat: "legend", words: ["レイス", "wraith"] },
  { key: "ホライゾン", cat: "legend", words: ["ホライゾン", "horizon"] },
  { key: "カタリスト", cat: "legend", words: ["カタリスト", "catalyst"] },
  { key: "ニューキャッスル", cat: "legend", words: ["ニューキャッスル", "ニューキャ", "newcastle"] },
  { key: "コースティック", cat: "legend", words: ["コースティック", "カスティ", "caustic"] },
  { key: "ジブラルタル", cat: "legend", words: ["ジブラルタル", "ジブ", "gibraltar"] },
  // 仕様・話題
  { key: "エネルギー弾", cat: "topic", words: ["エネルギー弾", "エネルギー"] },
  { key: "ルート",     cat: "topic",  words: ["ルート", "loot", "漁り"] },
  { key: "新シーズン", cat: "topic",  words: ["シーズン30", "s30", "新シーズン", "アプデ", "パッチ"] }
];

async function feed(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;

  const id = env.TWITCH_CLIENT_ID, secret = env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return json({ ok: false, error: "Twitchの認証情報が未設定です" }, 200, 60);

  let streams = [];
  try {
    const token = await twitchToken(id, secret);
    const head = { "Client-ID": id, "Authorization": "Bearer " + token };

    for (let i = 0; i < TWITCH_USERS.length; i += 100) {
      const q = new URLSearchParams();
      TWITCH_USERS.slice(i, i + 100).forEach(u => q.append("user_login", u));
      q.append("first", "100");
      const r = await fetch("https://api.twitch.tv/helix/streams?" + q, {
        headers: head,
        cf: { cacheTtl: 60, cacheEverything: true }
      });
      if (!r.ok) continue;
      const j = await r.json();
      (j.data || []).forEach(st => {
        if (String(st.game_id) !== APEX_GAME_ID) return;   // Apex 以外は除外
        streams.push({
          login:   (st.user_login || "").toLowerCase(),
          name:    st.user_name || "",
          title:   st.title || "",
          viewers: st.viewer_count || 0,
          startedAt: st.started_at || null
        });
      });
    }
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 200, 60);
  }

  streams.sort((a, b) => b.viewers - a.viewers);
  const totalViewers = streams.reduce((n, s) => n + s.viewers, 0);

  // --- モードの内訳 ---
  const modes = {};
  for (const st of streams) {
    const t = feedNorm(st.title);
    let hitKey = "その他";
    for (const m of FEED_MODES) {
      if (m.words.some(w => t.includes(feedNorm(w)))) { hitKey = m.key; break; }
    }
    if (!modes[hitKey]) modes[hitKey] = { key: hitKey, streams: 0, viewers: 0 };
    modes[hitKey].streams++;
    modes[hitKey].viewers += st.viewers;
  }
  const modeList = Object.values(modes).sort((a, b) => b.viewers - a.viewers);

  // --- 話題語の言及 ---
  const terms = [];
  for (const term of FEED_TERMS) {
    let n = 0, v = 0; const who = [];
    for (const st of streams) {
      const t = feedNorm(st.title);
      if (term.words.some(w => t.includes(feedNorm(w)))) {
        n++; v += st.viewers;
        if (who.length < 3) who.push(st.name || st.login);
      }
    }
    if (n > 0) terms.push({ key: term.key, cat: term.cat, streams: n, viewers: v, who });
  }
  terms.sort((a, b) => b.viewers - a.viewers);

  const res = json({
    ok: true,
    generatedAt: new Date().toISOString(),
    summary: {
      tracked: TWITCH_USERS.length,
      apexLive: streams.length,
      totalViewers
    },
    modes: modeList,
    terms,
    streams: streams.slice(0, 10)
  }, 200, FEED_TTL);

  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/* 全角・大小・記号のゆれを吸収してから照合する。
   長音符「ー」はハイフンに変換しないこと。変換すると
   「エネルギー」→「エネルギ-」となり辞書側と一致しなくなる。 */
function feedNorm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[\s　]+/g, "");
}

/* ---------- ヘルパー ---------- */
async function twitchToken(id, secret) {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id, client_secret: secret, grant_type: "client_credentials"
    }),
    cf: { cacheTtl: 3000, cacheEverything: true }
  });
  if (!res.ok) throw new Error("twitch auth " + res.status);
  return (await res.json()).access_token;
}

function json(obj, status = 200, maxAge = 0) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store"
    }
  });
}

function cors(res, origin) {
  const h = new Headers(res.headers);
  if (STRICT_ORIGINS.length === 0) {
    h.set("Access-Control-Allow-Origin", "*");
  } else if (origin && STRICT_ORIGINS.includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
  } else {
    h.set("Access-Control-Allow-Origin", STRICT_ORIGINS[0]);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  h.set("Access-Control-Max-Age", "86400");
  return new Response(res.body, { status: res.status, headers: h });
}
