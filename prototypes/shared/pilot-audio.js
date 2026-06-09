/* <pilot-audio> — a recorded-intro play button for the booth prototypes.
   Framework-agnostic web component. Attributes:
     name    — pilot's name (e.g. "Ahmad")
     accent  — hex accent color
     src     — optional audio file URL (falls back to a simulated 18s timeline)
*/
class PilotAudio extends HTMLElement {
  connectedCallback() {
    const name = this.getAttribute("name") || "the pilot";
    const accent = this.getAttribute("accent") || "#2BE5FF";
    const src = this.getAttribute("src") || "";
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host{--acc:${accent};display:inline-flex;font-family:'Sora',system-ui,sans-serif}
        .pa{display:inline-flex;align-items:center;gap:11px;cursor:pointer;border:1px solid color-mix(in oklab,var(--acc),transparent 55%);
          background:color-mix(in oklab,var(--acc),transparent 88%);border-radius:40px;padding:7px 16px 7px 7px;transition:background .2s,border-color .2s;
          -webkit-tap-highlight-color:transparent}
        .pa:hover{background:color-mix(in oklab,var(--acc),transparent 80%)}
        .pp{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;color:#06121f;
          background:linear-gradient(180deg,color-mix(in oklab,var(--acc),white 12%),var(--acc));box-shadow:0 0 16px color-mix(in oklab,var(--acc),transparent 55%)}
        .pp svg{width:15px;height:15px;display:block}
        .bars{display:flex;align-items:center;gap:3px;height:18px}
        .bars i{width:3px;height:5px;border-radius:3px;background:color-mix(in oklab,var(--acc),transparent 20%)}
        :host(.playing) .bars i{animation:wv .9s ease-in-out infinite}
        :host(.playing) .bars i:nth-child(2){animation-delay:.12s}
        :host(.playing) .bars i:nth-child(3){animation-delay:.24s}
        :host(.playing) .bars i:nth-child(4){animation-delay:.36s}
        :host(.playing) .bars i:nth-child(5){animation-delay:.48s}
        @keyframes wv{0%,100%{height:5px}50%{height:17px}}
        .lbl{display:flex;flex-direction:column;line-height:1.15;text-align:left}
        .l1{font-size:13px;font-weight:500;color:#eaf2ff;white-space:nowrap}
        .l2{font-size:11px;color:color-mix(in oklab,var(--acc),white 28%);font-family:'Space Mono',monospace}
        @media (prefers-reduced-motion: reduce){ :host(.playing) .bars i{animation:none} }
      </style>
      <div class="pa" role="button" tabindex="0" aria-label="Play ${name}'s intro">
        <span class="pp"></span>
        <span class="bars"><i></i><i></i><i></i><i></i><i></i></span>
        <span class="lbl"><span class="l1"></span><span class="l2"></span></span>
      </div>`;
    this._name = name; this._src = src;
    this._playing = false; this._t = 0; this._total = src ? 0 : 18;
    this._pp = this.shadowRoot.querySelector(".pp");
    this._l1 = this.shadowRoot.querySelector(".l1");
    this._l2 = this.shadowRoot.querySelector(".l2");
    if (src) { this._audio = new Audio(src); this._audio.addEventListener("timeupdate", () => { this._t = this._audio.currentTime; this._total = this._audio.duration || 18; this._render(); }); this._audio.addEventListener("ended", () => this._stop()); }
    this.shadowRoot.querySelector(".pa").addEventListener("click", () => this.toggle());
    this.shadowRoot.querySelector(".pa").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.toggle(); } });
    this._render();
  }
  _mmss(s){ s=Math.max(0,Math.floor(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
  _render(){
    this._pp.innerHTML = this._playing
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
    this._l1.textContent = this._playing ? `Playing ${this._name}'s intro` : `Hear ${this._name}'s intro`;
    this._l2.textContent = this._playing ? `${this._mmss(this._t)} / ${this._mmss(this._total)}` : "Recorded message";
  }
  toggle(){ this._playing ? this._stop() : this._play(); }
  _play(){
    this._playing = true; this.classList.add("playing");
    if (this._src && this._audio) { this._audio.play().catch(()=>{}); }
    else { const start = performance.now() - this._t*1000; const tick=(n)=>{ if(!this._playing) return; this._t=(n-start)/1000; if(this._t>=this._total){ this._stop(); return;} this._render(); this._raf=requestAnimationFrame(tick); }; this._raf=requestAnimationFrame(tick); }
    this._render();
  }
  _stop(){ this._playing=false; this.classList.remove("playing"); this._t=0; if(this._audio){ this._audio.pause(); this._audio.currentTime=0;} if(this._raf) cancelAnimationFrame(this._raf); this._render(); }
}
customElements.define("pilot-audio", PilotAudio);
