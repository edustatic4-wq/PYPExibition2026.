/* Explore 2040 — main app */
const { useState, useRef, useEffect, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "shipStyle": "pod",
  "glow": 1,
  "warmth": "balanced",
  "motion": true,
  "daytime": true
}/*EDITMODE-END*/;

const WARM = { cool: 0, balanced: 0.5, warm: 1 };

/* ---- support tower silhouettes per district (heights) ---- */
const SUPPORT = {
  mobility:  [[40,150],[34,210],[46,120]],
  vitality:  [[44,180],[34,130],[40,230]],
  discovery: [[40,140],[46,200],[34,110]],
};

function MoonSitter() {
  return (
    <div className="moonsit" aria-hidden="true">
      <div className="msmoon"><span className="mscrater a"></span><span className="mscrater b"></span><span className="mscrater c"></span></div>
      <img className="msfig" src="characters/moon-sitter.png" alt="" />
    </div>
  );
}

/* ---------- full-screen video overlays (intro + finale) ---------- */
function VideoOverlay({ src, kind, onClose }) {
  const vref = React.useRef(null);
  const [needTap, setNeedTap] = React.useState(false);
  const [ended, setEnded] = React.useState(false);

  React.useEffect(() => {
    const v = vref.current;
    if (!v) return;
    v.play().then(() => setNeedTap(false)).catch(() => setNeedTap(true));
  }, []);

  const begin = () => {
    const v = vref.current;
    if (!v) return;
    v.muted = false;
    v.play().then(() => setNeedTap(false)).catch(() => { v.muted = true; v.play(); setNeedTap(false); });
  };

  return (
    <div className={"vidscreen " + kind}>
      <video ref={vref} className="vidscreen-media" src={src} playsInline
             onEnded={() => { setEnded(true); if (kind === "intro") onClose(); }} controls={false}></video>

      {needTap && (
        <button className="vid-begin" onClick={begin}>
          <span className="vb-ic"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>
          {kind === "intro" ? "Begin the experience" : "Play finale"}
        </button>
      )}

      <button className="vid-skip" onClick={onClose}>
        {kind === "intro" ? (ended ? "Meet the pilots" : "Skip intro") : "Close"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>

      {ended && kind !== "intro" && (
        <button className="vid-enter" onClick={onClose}>
          Back to city
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
        </button>
      )}
    </div>
  );
}

function CursorRing() {
  const ringRef = React.useRef(null);
  React.useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch booth: no cursor
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, raf = 0, shown = false;
    const HOT = 'a,button,[role="button"],.ship,.hero,.bld,.enter,.back,.audio,.switch,.hot,.close,.fclose,video-launch,.tweak-row,input';
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; ring.classList.add("on"); document.documentElement.classList.add("has-ring"); }
      const t = e.target;
      const hot = t.closest && t.closest(HOT);
      ring.classList.toggle("hot", !!hot);
      const dEl = t.closest && t.closest("[data-d]");
      let acc = "#2BE5FF";
      if (dEl) { const id = dEl.getAttribute("data-d"); acc = id === "vitality" ? "#FF5E8A" : id === "discovery" ? "#B14CFF" : "#2BE5FF"; }
      ring.style.setProperty("--cacc", acc);
      if (reduce) ring.style.transform = `translate(${mx}px, ${my}px)`;
    };
    const loop = () => { rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2; ring.style.transform = `translate(${rx}px, ${ry}px)`; raf = requestAnimationFrame(loop); };
    window.addEventListener("mousemove", onMove);
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); document.documentElement.classList.remove("has-ring"); };
  }, []);
  return <div ref={ringRef} className="cursorring" aria-hidden="true"><span className="cring"></span><span className="cdot"></span></div>;
}

function Stars() {
  const stars = useMemo(() => {
    const a = [];
    for (let i = 0; i < 80; i++) {
      a.push({
        l: Math.random() * 100,
        t: Math.random() * 56,
        d: (2.5 + Math.random() * 4).toFixed(2),
        s: (0.6 + Math.random() * 1.6).toFixed(2),
      });
    }
    return a;
  }, []);
  return (
    <div className="stars">
      {stars.map((s, i) => (
        <span className="star" key={i}
          style={{ left: s.l + "%", top: s.t + "%", "--d": s.d + "s",
                   width: s.s + "px", height: s.s + "px" }} />
      ))}
    </div>
  );
}

function District({ d, active, view, onFly, onOpen }) {
  return (
    <div className={"district" + (active ? " active" : "")} data-d={d.id}
         data-screen-label={d.name}
         style={{ "--acc": d.accentHex }}
         onClick={() => { if (view === "hub") onFly(d); }}>
      <div className="tower" style={{ width: SUPPORT[d.id][0][0], height: SUPPORT[d.id][0][1] }}></div>
      <Building b={d.buildings[0]} active={active} onOpen={onOpen} />
      <Building b={d.buildings[1]} active={active} onOpen={onOpen} />
      <div className="tower" style={{ width: SUPPORT[d.id][2][0], height: SUPPORT[d.id][2][1] }}></div>
    </div>
  );
}

function Ship({ d, state, onFly }) {
  // state: 'idle' | 'flying' | 'dismissed'
  const style = {
    left: d.ship.homeX + "px", top: d.ship.homeY + "px",
    "--acc": d.accentHex,
  };
  if (state === "flying") {
    style.transform = `translate(-50%,-50%) translate(${d.ship.dx}px,${d.ship.dy}px) scale(.78)`;
  }
  return (
    <div className={"ship" + (state === "flying" ? " flying" : state === "dismissed" ? " dismissed" : "")}
         style={style}
         onClick={(e) => {
           e.stopPropagation();
           // in the editor, clicking the face slot should upload — not fly
           if (window.omelette && window.omelette.writeFile && e.target && e.target.tagName === "IMAGE-SLOT") return;
           if (state === "idle") onFly(d);
         }} role="button" tabIndex={0}
         aria-label={"Fly to " + d.name}>
      <div className="float">
        <div className="thrust"></div>
        <div className="hull"></div>
        <div className="rim"></div>
        <div className="fin l"></div>
        <div className="fin r"></div>
        <div className="canopy">
          <image-slot id={"pilot-" + d.pilot + "-ship"} shape="circle" placeholder="Ship face"
                      src={"pilots/" + d.pilot + ".png"}></image-slot>
        </div>
      </div>
      <div className="tag">
        <div className="dn">{d.name.replace(" District", "")}</div>
        <div className="hint">Tap to fly</div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState("hub");          // hub | district | card
  const [activeId, setActiveId] = useState(null);
  const [building, setBuilding] = useState(null);
  const [proto, setProto] = useState(null);         // prototype URL shown in full-screen overlay
  const [protoClosing, setProtoClosing] = useState(false);
  const [protoLoaded, setProtoLoaded] = useState(false);
  const [intro, setIntro] = useState(true);          // opening video plays first
  const [introGo, setIntroGo] = useState(false);     // user pressed Begin (start playback)
  const [pilots, setPilots] = useState(false);       // flip-card screen (between intro & city)
  const [finale, setFinale] = useState(false);       // ending video overlay

  const stageRef = useRef(null);
  const worldRef = useRef(null);

  const active = DISTRICTS.find(d => d.id === activeId) || null;

  /* ----- scale stage to viewport ----- */
  useEffect(() => {
    const fit = () => {
      const s = Math.max(window.innerWidth / 1920, window.innerHeight / 1080);
      if (stageRef.current) stageRef.current.style.transform = `scale(${s})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* ----- parallax (hub only) ----- */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0, tx = 0, ty = 0;
    const onMove = (e) => {
      if (view !== "hub") return;
      const r = stage.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5);
      ty = ((e.clientY - r.top) / r.height - 0.5);
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const apply = () => {
      raf = 0;
      stage.querySelectorAll(".plx").forEach(el => {
        const dp = parseFloat(el.dataset.depth || "0");
        el.style.transform = `translate(${(-tx * dp).toFixed(2)}px, ${(-ty * dp * 0.6).toFixed(2)}px)`;
      });
    };
    const reset = () => stage.querySelectorAll(".plx").forEach(el => { el.style.transform = ""; });
    stage.addEventListener("mousemove", onMove);
    if (view !== "hub") reset();
    return () => stage.removeEventListener("mousemove", onMove);
  }, [view]);

  /* ----- camera transform ----- */
  useEffect(() => {
    if (worldRef.current) {
      worldRef.current.style.transform = active ? active.focus : "";
    }
  }, [activeId]);

  /* ----- nav ----- */
  const flyTo = useCallback((d) => {
    setActiveId(d.id);
    setView("district");
  }, []);
  const openCard = useCallback((b) => { setBuilding(b); setView("card"); }, []);
  const nav = useCallback((action) => {
    if (action === "close") { setView(active ? "district" : "hub"); }
    else if (action === "back") { setView("hub"); setActiveId(null); setBuilding(null); }
  }, [active]);
  useEffect(() => { window.__nav = nav; }, [nav]);

  /* ----- prototype overlay (loads a prototype full-screen, smooth) ----- */
  const closeProto = useCallback(() => {
    setProtoClosing(true);
    // "Back to city" returns all the way to the city hub
    setTimeout(() => { setProto(null); setProtoClosing(false); setView("hub"); setActiveId(null); setBuilding(null); }, 360);
  }, []);
  useEffect(() => {
    window.__openProto = (url) => { setProtoClosing(false); setProtoLoaded(false); setProto(url); };
    const onMsg = (e) => { if (e.data && e.data.type === "explore2040:back") closeProto(); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [closeProto]);

  /* ESC handling */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (view === "card") nav("close");
        else if (view === "district") nav("back");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, nav]);

  const stageClass =
    "stage " +
    (view === "district" ? "is-district " : "") +
    (view === "card" ? "is-card " : "");

  const shipState = (d) => {
    if (view === "hub") return "idle";
    return d.id === activeId ? "flying" : "dismissed";
  };

  return (
    <div className="viewport">
      <div ref={stageRef} className={stageClass}
           data-ship={t.shipStyle} data-motion={t.motion ? "on" : "off"}
           data-time={t.daytime ? "day" : "night"}
           style={{ "--glow": t.glow, "--warm": WARM[t.warmth] }}>

        {/* ----- WORLD (camera) ----- */}
        <div ref={worldRef} className={"world" + (active ? " dimmed" : "")}
             onClick={() => { if (view === "district") nav("back"); }}>
          <div className="sky"></div>
          <div className="plx" data-depth="6"><div className="horizon"></div></div>
          <div className="plx" data-depth="16"><div className="moon"></div><MoonSitter /></div>
          <div className="plx" data-depth="10"><Stars /></div>
          <div className="plx" data-depth="22">
            <span className="flyby" style={{ left: "84%", top: "26%", animationDelay: "0s" }}></span>
            <span className="flyby" style={{ left: "70%", top: "40%", animationDelay: "7s" }}></span>
            <span className="flyby" style={{ left: "92%", top: "33%", animationDelay: "12s" }}></span>
          </div>
          <div className="haze" style={{ top: "52%" }}></div>

          <div className="plx farline" data-depth="4">
            {Array.from({ length: 26 }).map((_, i) => (
              <span className="t" key={i} style={{ height: (60 + Math.round(Math.abs(Math.sin(i * 1.7)) * 150)) + "px" }} />
            ))}
          </div>

          {DISTRICTS.map(d => (
            <District key={d.id} d={d} active={d.id === activeId} view={view}
                      onFly={flyTo} onOpen={openCard} />
          ))}

          <div className="platform"></div>
          <div className="deck"></div>

          {DISTRICTS.map(d => (
            <Ship key={d.id} d={d} state={shipState(d)} onFly={flyTo} />
          ))}
        </div>

        {/* ----- HUD -----
             NOTE: HUD chrome is conditionally MOUNTED per view rather than
             cross-faded via class changes. A freshly-mounted node paints its
             final style instantly, so the correct chrome always shows even if
             the animation clock is throttled (backgrounded tab / refresh). */}
        <div className="hud">
          {view === "hub" && (
            <div className="brand"><span className="dot"></span> Explore 2040</div>
          )}
          {view === "hub" && (
            <button className="finale-btn" onClick={() => setFinale(true)} title="Play the closing video">
              <span className="fb-ic"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>
              Finale
            </button>
          )}
          {view !== "hub" && (
            <div className="back is-shown" onClick={() => nav("back")}>
              <span className="arr">←</span> Back to city
            </div>
          )}

          {view === "hub" && (
            <div className="headline">
              <div className="eyebrow">{COPY.eyebrow}</div>
              <h1 className="herologo"><span className="ex">Explore</span><span className="yr">2040</span><span className="hangcar" aria-hidden="true"><span className="rope"></span><img src="characters/ship-boy-clean.png" alt="" /></span></h1>
              <div className="sub">Tap a pilot's ship to <b>fly to their district</b>.</div>
            </div>
          )}

          {active && view === "district" && (
            <div className="dtitle is-shown" style={{ "--acc": active.accentHex }}>
              <div className="k">{active.name}</div>
              <h2>{active.tagline}</h2>
              <div className="h">Tap a glowing building to open its prototype.</div>
            </div>
          )}

          {view === "hub" && (
            <div className="footer">
              <span className="pill"><span className="kbd"></span> {COPY.footerL}</span>
              <span className="pill"><span className="kbd"></span> {COPY.footerR}</span>
            </div>
          )}
        </div>

        {/* ----- CARD ----- mounted only in card view so closing unmounts it ----- */}
        {view === "card" && <div className="scrim" onClick={() => nav("close")}></div>}
        {view === "card" && building && active && <BoothCard data={building} district={active} />}

        {/* ----- TWEAKS ----- */}
        <TweaksPanel>
          <TweakSection label="Craft" />
          <TweakRadio label="Ship style" value={t.shipStyle}
                      options={["pod", "arrow", "saucer"]}
                      onChange={(v) => setTweak("shipStyle", v)} />
          <TweakSection label="Atmosphere" />
          <TweakSlider label="Neon glow" value={t.glow} min={0.6} max={1.5} step={0.05}
                       onChange={(v) => setTweak("glow", v)} />
          <TweakRadio label="Dusk warmth" value={t.warmth}
                      options={["cool", "balanced", "warm"]}
                      onChange={(v) => setTweak("warmth", v)} />
          <TweakToggle label="Ambient motion" value={t.motion}
                       onChange={(v) => setTweak("motion", v)} />
          <TweakToggle label="Daytime" value={t.daytime}
                       onChange={(v) => setTweak("daytime", v)} />
        </TweaksPanel>
      </div>

      {/* ----- full-screen prototype overlay ----- */}
      {proto && (
        <div className={"proto-overlay" + (protoClosing ? " closing" : "")}>
          <div className={"proto-loader" + (protoLoaded ? " gone" : "")}>
            <div className="pl-ring"></div>
            <div className="pl-txt">Entering the prototype…</div>
          </div>
          <iframe src={proto} title="Prototype" allow="fullscreen" loading="eager"
                  className={protoLoaded ? "ready" : ""}
                  onLoad={() => setProtoLoaded(true)}></iframe>
        </div>
      )}

      <CursorRing />

      {/* ----- opening intro video (plays first, then the pilots screen) ----- */}
      {intro && (
        <VideoOverlay src="videos/intro-main.mp4" kind="intro" onClose={() => { setIntro(false); setPilots(true); }} />
      )}

      {/* ----- pilots flip-card screen (between intro & city) ----- */}
      {pilots && <PilotsScreen onEnter={() => setPilots(false)} />}

      {/* ----- finale / ending video ----- */}
      {finale && (
        <VideoOverlay src="videos/finale.mp4" kind="finale" onClose={() => setFinale(false)} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
