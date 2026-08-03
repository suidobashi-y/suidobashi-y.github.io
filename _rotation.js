/* NEON GRID — マップローテーション共通モジュール
   データ提供: Apex Legends Status (api.mozambiquehe.re)
   使い方: 下の API_KEY に自分のキーを入れる (https://apexlegendsstatus.com/api で無料取得)
   キーをクライアントに置きたくない場合は、PROXY_URL に自前の中継APIを指定してください。 */
var NeonRotation = (function(){
  var API_KEY   = "YOUR_API_KEY_HERE";
  var PROXY_URL = "https://apex-map-streamer.suidobashi-y.workers.dev/maprotation";
  var CACHE_MS  = 60000;
  var _cache = null, _at = 0;

  function endpoint(){
    return PROXY_URL || ("https://api.mozambiquehe.re/maprotation?version=2&auth=" + API_KEY);
  }

  function load(cb){
    if(_cache && Date.now()-_at < CACHE_MS){ cb(_cache,null); return; }
    if(!PROXY_URL && API_KEY === "YOUR_API_KEY_HERE"){
      cb(null,"APIキーが未設定です (_rotation.js を編集してください)"); return;
    }
    fetch(endpoint(), { mode:"cors", cache:"no-store" })
      .then(function(r){
        if(!r.ok) throw new Error("HTTP "+r.status+" "+r.statusText);
        return r.json();
      })
      .then(function(j){
        if(j.Error || j.error) throw new Error(j.Error || j.error);
        if(!j.ranked && !j.battle_royale) throw new Error("想定外のレスポンス形式");
        _cache=j; _at=Date.now(); cb(j,null);
      })
      .catch(function(e){
        // CORSで弾かれた場合、fetchは "Failed to fetch" しか返さない
        var msg = /Failed to fetch|NetworkError|Load failed/i.test(e.message)
          ? "取得できません（CORSまたはネットワーク）"
          : e.message;
        console.error("[NeonRotation]", e);
        cb(null, msg);
      });
  }

  function pad(n){ return String(n).padStart(2,"0"); }
  function fmt(sec){
    if(sec<0) sec=0;
    var h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=sec%60;
    return (h>0? h+":" : "") + pad(m) + ":" + pad(s);
  }
  function clock(iso){
    var d=new Date(iso.replace(" ","T")+"Z");
    return pad(d.getHours())+":"+pad(d.getMinutes());
  }

  /* 現在マップカードへの描画 (id接頭辞: "br" or "rk") */
  function bind(block, p){
    if(!block || !block.current) return;
    var cur=block.current, nxt=block.next;
    document.getElementById(p+"-name").textContent = cur.map;
    if(nxt) document.getElementById(p+"-next").textContent = nxt.map + "（" + cur.remainingTimer.slice(0,5) + "後）";
    var total = cur.DurationInSecs || 3600;
    var left  = cur.remainingSecs;
    (function tick(){
      document.getElementById(p+"-rest").textContent = fmt(left);
      var bar=document.getElementById(p+"-bar");
      if(bar) bar.style.width = Math.max(0,Math.min(100,(1-left/total)*100)) + "%";
      if(left>0){ left--; setTimeout(tick,1000); }
      else { location.reload(); }
    })();
  }

  return { load:load, bind:bind, fmt:fmt, clock:clock };
})();
