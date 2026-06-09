/* <video-launch> — opens an AUDIO player overlay (equalizer vibes, no video frame).
   Plays the media's audio track only, behind a neon equalizer visualizer.
   Attributes: src (media URL), label (button text), accent (hex), title (panel heading). */
class VideoLaunch extends HTMLElement {
  connectedCallback() {
    if (this._init) return; this._init = true;
    const label = this.getAttribute("label") || "Listen";
    const accent = this.getAttribute("accent") || "#2BE5FF";
    const src = this.getAttribute("src") || "";
    const heading = this.getAttribute("title") || label.replace(/^listen( to)?\s*/i, "") || "Audio";
    const BARS = 28;
    let barsHtml = "";
    for (let i = 0; i < BARS; i++) barsHtml += `<i style="--i:${i};--d:${(0.6 + (i % 5) * 0.12).toFixed(2)}s"></i>`;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host{--acc:${accent};display:inline-flex;font-family:'Sora',system-ui,sans-serif}
        .b{display:inline-flex;align-items:center;gap:10px;cursor:pointer;border:1px solid color-mix(in oklab,var(--acc),transparent 50%);
          background:color-mix(in oklab,var(--acc),transparent 86%);color:#eaf2ff;border-radius:40px;padding:9px 18px 9px 9px;
          font-size:14px;font-weight:500;letter-spacing:.01em;transition:background .2s,transform .12s;-webkit-tap-highlight-color:transparent}
        .b:hover{background:color-mix(in oklab,var(--acc),transparent 78%)} .b:active{transform:scale(.97)}
        .pp{width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;color:#06121f;
          background:linear-gradient(180deg,color-mix(in oklab,var(--acc),white 14%),var(--acc));box-shadow:0 0 14px color-mix(in oklab,var(--acc),transparent 55%)}
        .pp svg{width:14px;height:14px}
        .ov{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(4,6,18,.86);backdrop-filter:blur(10px)}
        .ov.show{display:flex;animation:fin .3s ease both}
        @keyframes fin{from{opacity:0}to{opacity:1}}
        .panel{position:relative;width:min(680px,92vw);border-radius:26px;padding:40px 44px 34px;
          background:linear-gradient(180deg, rgba(22,28,64,.9), rgba(12,15,40,.94));
          border:1px solid color-mix(in oklab,var(--acc),transparent 55%);
          box-shadow:0 40px 120px rgba(0,0,0,.7), 0 0 70px color-mix(in oklab,var(--acc),transparent 78%)}
        .x{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;
          background:rgba(120,160,255,.1);color:#cfe0ff} .x:hover{background:rgba(120,160,255,.22)} .x svg{width:18px;height:18px}
        .kic{display:flex;align-items:center;gap:11px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--acc)}
        .kic .d{width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 10px var(--acc)}
        h3{margin:10px 0 0;font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:26px;color:#fff;letter-spacing:.01em}
        /* equalizer */
        .eq{display:flex;align-items:flex-end;justify-content:center;gap:5px;height:150px;margin:26px 0 8px}
        .eq i{width:8px;height:14px;border-radius:5px;background:linear-gradient(180deg,color-mix(in oklab,var(--acc),white 25%),var(--acc));
          box-shadow:0 0 12px color-mix(in oklab,var(--acc),transparent 55%);transform-origin:bottom;opacity:.55}
        .ov.playing .eq i{animation:bounce var(--d) ease-in-out infinite alternate;animation-delay:calc(var(--i)*-0.07s);opacity:1}
        @keyframes bounce{from{height:12px}to{height:130px}}
        /* progress */
        .row{display:flex;align-items:center;gap:16px;margin-top:14px}
        .play{width:54px;height:54px;flex:none;border:none;border-radius:50%;cursor:pointer;display:grid;place-items:center;color:#06121f;
          background:linear-gradient(180deg,color-mix(in oklab,var(--acc),white 14%),var(--acc));box-shadow:0 0 26px color-mix(in oklab,var(--acc),transparent 50%);transition:transform .12s}
        .play:active{transform:scale(.94)} .play svg{width:22px;height:22px}
        .track{flex:1}
        .bar{height:8px;border-radius:6px;background:rgba(120,150,255,.18);overflow:hidden;cursor:pointer}
        .fill{height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,color-mix(in oklab,var(--acc),white 20%),var(--acc));box-shadow:0 0 12px color-mix(in oklab,var(--acc),transparent 50%)}
        .tm{display:flex;justify-content:space-between;font-family:'Space Mono',monospace;font-size:12px;color:#9fb0da;margin-top:7px}
        @media (prefers-reduced-motion: reduce){ .ov.playing .eq i{animation:none;height:70px} }
      </style>
      <div class="b" role="button" tabindex="0">
        <span class="pp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg></span>
        <span>${label}</span>
      </div>
      <div class="ov">
        <div class="panel">
          <button class="x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
          <div class="kic"><span class="d"></span> Audio · Recorded message</div>
          <h3>${heading}</h3>
          <div class="eq">${barsHtml}</div>
          <div class="row">
            <button class="play" aria-label="Play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></button>
            <div class="track">
              <div class="bar"><div class="fill"></div></div>
              <div class="tm"><span class="cur">0:00</span><span class="dur">0:00</span></div>
            </div>
          </div>
          <video style="display:none" playsinline preload="none" src="${src}"></video>
        </div>
      </div>`;
    const ov = this.shadowRoot.querySelector(".ov");
    const media = this.shadowRoot.querySelector("video");
    const playBtn = this.shadowRoot.querySelector(".play");
    const fill = this.shadowRoot.querySelector(".fill");
    const bar = this.shadowRoot.querySelector(".bar");
    const cur = this.shadowRoot.querySelector(".cur");
    const dur = this.shadowRoot.querySelector(".dur");
    const mmss = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
    const setPlayIcon = (playing) => {
      playBtn.innerHTML = playing
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
    };
    const open = () => { ov.classList.add("show"); media.currentTime = 0; play(); };
    const close = () => { ov.classList.remove("show"); media.pause(); ov.classList.remove("playing"); setPlayIcon(false); };
    const play = () => { media.play().then(()=>{ ov.classList.add("playing"); setPlayIcon(true); }).catch(()=>{ setPlayIcon(false); }); };
    const toggle = () => { if (media.paused) play(); else { media.pause(); ov.classList.remove("playing"); setPlayIcon(false); } };
    this.shadowRoot.querySelector(".b").addEventListener("click", open);
    this.shadowRoot.querySelector(".b").addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();open();} });
    this.shadowRoot.querySelector(".x").addEventListener("click", close);
    playBtn.addEventListener("click", toggle);
    media.addEventListener("loadedmetadata", () => dur.textContent = mmss(media.duration));
    media.addEventListener("timeupdate", () => { const p = media.duration ? media.currentTime / media.duration : 0; fill.style.width = (p*100)+"%"; cur.textContent = mmss(media.currentTime); });
    media.addEventListener("ended", () => { ov.classList.remove("playing"); setPlayIcon(false); fill.style.width = "0%"; });
    bar.addEventListener("click", (e) => { const r = bar.getBoundingClientRect(); if (media.duration) media.currentTime = ((e.clientX - r.left)/r.width)*media.duration; });
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ov.classList.contains("show")) close(); });
  }
}
customElements.define("video-launch", VideoLaunch);
