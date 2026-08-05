/**
 * NEON GRID — API中継Worker (Cloudflare Workers)
 *
 * APIキーをブラウザに晒さずに済ませるための中継サーバーです。
 * 2つのエンドポイントを提供します。
 *
 *   GET /maprotation → マップローテーション（Apex Legends Status）
 *   GET /live        → 配信中のTwitchチャンネル一覧 {"live":["name",...]}
 *   GET /feed        → 海外の話題ピックアップ（Reddit速度順 + Google News日本語）
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
  "futon_moguri", "hashihimemikona", "amanehina", "89workers"
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
      if (url.pathname === "/feed")        return cors(await feed(request, ctx), origin);
      // ルート: 動作確認用
      if (url.pathname === "/" ) return cors(json({
        ok: true,
        endpoints: ["/maprotation", "/live", "/discover", "/feed"],
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

/* ---------- 海外の話題ピックアップ ----------
   GET /feed
     reddit : r/apexlegends を「速度順」で並べ替えたもの
              生スコアだとミームが上位を占めるため、
              スコア速度 + コメント速度×3 で並べ、Humor/Gameplay は除外
              badges  debate=賛否が割れている / accelerating=話題が加速中
                      dev=開発者が反応 / text=テキスト投稿
     news   : Google News（日本語）の直近48時間
              「日本語圏にもう着弾しているか」の突き合わせ用

   ※ 本文(selftext)は意図的に返していません。転載にならないよう、
      解釈を書くときは permalink 側で読んでください。               */

const FEED_TTL            = 900;      // 15分キャッシュ
const FEED_UA             = "neongrid-feed/1.0 (+https://suidobashi-y.github.io)";
const FEED_EXCLUDE_FLAIR  = ["Humor", "Gameplay", "Fan Art", "Creative"];
const FEED_MIN_AGE_H      = 0.5;
const FEED_MAX_AGE_H      = 24;
const FEED_COMMENT_WEIGHT = 3;        // コメント速度の重み
const FEED_DEBATE_RATIO   = 0.9;      // これ未満で「賛否が割れている」

async function feed(request, ctx) {
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), { method: "GET" });

  const hit = await cache.match(key);
  if (hit) return hit;

  // ソースごとに独立して失敗を握り潰す（片方が落ちても全体は返る）
  const [reddit, news] = await Promise.all([
    feedReddit().catch(e => ({ ok: false, error: String(e.message || e), items: [] })),
    feedNewsJa().catch(e => ({ ok: false, error: String(e.message || e), items: [] }))
  ]);

  const res = json({
    generatedAt: new Date().toISOString(),
    reddit,
    news
  }, 200, FEED_TTL);

  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/* Reddit — 速度順 */
async function feedReddit() {
  // Workerからのアクセスが弾かれる場合に備えて2系統試す
  const endpoints = [
    "https://www.reddit.com/r/apexlegends/hot.json?limit=50",
    "https://old.reddit.com/r/apexlegends/hot.json?limit=50"
  ];

  let data = null, lastStatus = 0, used = "";
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        headers: { "User-Agent": FEED_UA, "Accept": "application/json" },
        cf: { cacheTtl: FEED_TTL, cacheEverything: true }
      });
      lastStatus = r.status;
      if (!r.ok) continue;
      data = await r.json();
      used = ep;
      break;
    } catch (_) { /* 次を試す */ }
  }
  if (!data) return { ok: false, error: "reddit fetch failed (" + lastStatus + ")", items: [] };

  const now = Date.now() / 1000;
  const items = [];

  for (const c of (data.data && data.data.children) || []) {
    const d = c.data;
    if (!d || d.stickied) continue;                       // 運営の固定投稿は除外

    const flair = d.link_flair_text || "";
    if (FEED_EXCLUDE_FLAIR.includes(flair)) continue;

    const ageH = (now - d.created_utc) / 3600;
    if (ageH < FEED_MIN_AGE_H || ageH > FEED_MAX_AGE_H) continue;

    const scoreV = d.score / ageH;
    const cmtV   = d.num_comments / ageH;
    const ratio  = typeof d.upvote_ratio === "number" ? d.upvote_ratio : 1;

    const badges = [];
    if (ratio < FEED_DEBATE_RATIO)  badges.push("debate");
    if (cmtV >= 5)                  badges.push("accelerating");
    if (/dev reply/i.test(flair))   badges.push("dev");
    if (d.is_self)                  badges.push("text");

    items.push({
      id:       d.id,
      title:    d.title,
      // 必ず permalink を使う（url だと画像への直リンクになりコメント欄に届かない）
      url:      "https://www.reddit.com" + d.permalink,
      flair:    flair || null,
      ratio:    Math.round(ratio * 100) / 100,
      score:    d.score,
      comments: d.num_comments,
      ageH:     Math.round(ageH * 10) / 10,
      velocity: Math.round((scoreV + cmtV * FEED_COMMENT_WEIGHT) * 10) / 10,
      badges
    });
  }

  items.sort((a, b) => b.velocity - a.velocity);
  return { ok: true, source: used, count: items.length, items: items.slice(0, 15) };
}

/* Google News（日本語）— 日本語圏への着弾を見るため */
async function feedNewsJa() {
  const ep = "https://news.google.com/rss/search?q=Apex+Legends&hl=ja&gl=JP&ceid=JP:ja";

  const r = await fetch(ep, {
    headers: { "User-Agent": FEED_UA },
    cf: { cacheTtl: FEED_TTL, cacheEverything: true }
  });
  if (!r.ok) return { ok: false, error: "news fetch failed (" + r.status + ")", items: [] };

  const xml = await r.text();
  const now = Date.now();
  const items = [];

  // Workers に DOMParser は無いので <item> ブロックを切り出して処理する
  const blocks = xml.split("<item>").slice(1);
  for (const b of blocks) {
    const chunk = b.split("</item>")[0];
    const title = feedTag(chunk, "title");
    if (!title) continue;

    const date = feedTag(chunk, "pubDate");
    const t = date ? Date.parse(date) : NaN;
    const ageH = isNaN(t) ? null : Math.round(((now - t) / 3600000) * 10) / 10;
    if (ageH !== null && ageH > 48) continue;

    items.push({
      title,
      url:    feedTag(chunk, "link") || null,
      source: feedTag(chunk, "source") || null,
      ageH
    });
  }

  return { ok: true, count: items.length, items: items.slice(0, 20) };
}

function feedTag(chunk, tag) {
  const m = chunk.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">"));
  if (!m) return null;
  let v = m[1].trim();
  const cd = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cd) v = cd[1];
  return feedDecode(v.replace(/<[^>]+>/g, "").trim());
}

function feedDecode(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, "&");   // &amp; は最後に処理する
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
