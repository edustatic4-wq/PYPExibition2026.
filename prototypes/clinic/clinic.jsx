/* Dr Ali — AI clinic body scan */
const { useState, useRef, useEffect, useCallback, useMemo } = React;

const HEART = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z"/></svg>;
const LUNGS = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v8"/><path d="M8 7c0 3-3 4-3 8a3 3 0 0 0 6 0V9c-1.5 0-3-1-3-2z"/><path d="M16 7c0 3 3 4 3 8a3 3 0 0 1-6 0V9c1.5 0 3-1 3-2z"/></svg>;
const POSTURE = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M12 9l4-1.5M12 9l-4-1.5M12 14l3 6M12 14l-3 6"/></svg>;
const ENERGY = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>;

/* findings: y is fraction down the body (0 head .. 1 feet); side = which side label sits */
const FINDINGS = [
  { id: "lungs",   y: 0.30, icon: LUNGS,   title: "Lungs", line: "Big, healthy breaths — your lungs love fresh air.", lnw: 90 },
  { id: "heart",   y: 0.34, icon: HEART,   title: "Heart", line: "Strong and steady, like a happy little drum.", ecg: true, lnw: 70 },
  { id: "posture", y: 0.50, icon: POSTURE, title: "Posture", line: "Standing tall — your spine is doing great.", lnw: 90 },
  { id: "energy",  y: 0.62, icon: ENERGY,  title: "Energy", line: "Loads of energy today. Keep sipping water!", lnw: 80 },
];
const BODY_TOP = 20, BODY_H = 640; // matches .body-h

function App() {
  const [scale, setScale] = useState(1);
  const [phase, setPhase] = useState("idle"); // idle | scanning | done
  const [scanY, setScanY] = useState(0);       // 0..1
  const [found, setFound] = useState([]);      // finding ids in order
  const [index, setIndex] = useState(0);       // health index number
  const [doc, setDoc] = useState({ mood: "idle", line: "Hi! I’m Dr Ali. Press Run Scan and I’ll check you over — gently." });

  const raf = useRef(0);
  const st = useRef({ phase: "idle", clock: 0, found: new Set() });
  const SCAN_DUR = 5.0, TARGET = 94;

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  const run = useCallback(() => {
    if (st.current.phase === "scanning") return;
    st.current = { phase: "scanning", clock: 0, found: new Set() };
    setPhase("scanning"); setScanY(0); setFound([]); setIndex(0);
    setDoc({ mood: "scan", line: "Scanning now… stay relaxed, this won’t hurt a bit." });
  }, []);
  const reset = useCallback(() => {
    st.current = { phase: "idle", clock: 0, found: new Set() };
    setPhase("idle"); setScanY(0); setFound([]); setIndex(0);
    setDoc({ mood: "idle", line: "Ready when you are — press Run Scan." });
  }, []);

  useEffect(() => {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const S = st.current;
      if (S.phase === "scanning") {
        S.clock += dt;
        const p = Math.min(1, S.clock / SCAN_DUR);
        setScanY(p);
        // activate findings as the line passes them
        for (const f of FINDINGS) {
          if (p >= f.y && !S.found.has(f.id)) {
            S.found.add(f.id);
            setFound([...S.found]);
            setDoc({ mood: "happy", line: docLine(f.id) });
          }
        }
        if (p >= 1) {
          S.phase = "done"; setPhase("done");
          setDoc({ mood: "happy", line: "All done — and it’s great news! You’re looking healthy and strong. 💚" });
          // tick the dial up
          const t0 = performance.now();
          const tick = (n) => {
            const e = Math.min(1, (n - t0) / 1400);
            setIndex(Math.round(TARGET * (1 - Math.pow(1 - e, 3))));
            if (e < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const lineTop = BODY_TOP + scanY * BODY_H;
  const dialC = 2 * Math.PI * 56;
  const dialOffset = dialC * (1 - index / 100);

  return (
    <div className="stagewrap">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        <div className="bg-grid"></div>
        <div className="floor"></div>

        {/* HUD */}
        <div className="hud-top">
          <div className="brand">
            <div className="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z"/></svg></div>
            <div className="tt"><div className="k">Vitality · Care Spire</div><h1>Dr Ali</h1></div>
          </div>
          <a className="back-city" href="../Explore 2040.html" onClick={(e)=>{ if (window.parent && window.parent !== window) { e.preventDefault(); window.parent.postMessage({ type: "explore2040:back" }, "*"); } }}>
            <span className="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>
            Back to city
          </a>
        </div>

        {/* Dr Ali — human doctor (robot removed) */}
        <div className="doctor">
          <div className="human-doc">
            <div className="hd-glow"></div>
            <img src="../characters/dr-ali-doctor.png" alt="Dr Ali" />
          </div>
          <div className="docline" dangerouslySetInnerHTML={{ __html: doc.line }}></div>
        </div>

        {/* patient hologram */}
        <div className="scanzone">
          <div className="body-h">
            <div className="bp head"></div><div className="bp neck"></div><div className="bp torso"></div>
            <div className="bp arm l"></div><div className="bp arm r"></div>
            <div className="bp leg l"></div><div className="bp leg r"></div>
          </div>
          {/* markers */}
          {FINDINGS.map(f => (
            <div key={f.id} className={"marker" + (found.includes(f.id) ? " on" : "")}
                 style={{ left: f.id === "heart" ? "42%" : "50%", top: (BODY_TOP + f.y * BODY_H) + "px", "--lnw": f.lnw + "px" }}>
              <div className="dot"></div>
            </div>
          ))}
          {/* scan line */}
          <div className={"scanline" + (phase === "scanning" ? " on" : "")} style={{ top: lineTop + "px" }}>
            <div className="glowband"></div>
          </div>
          <div className="scanpad"></div>
        </div>

        {/* right panel */}
        <div className="panel">
          <div className="ph"><b></b> Scan findings</div>
          <div className="findings">
            {phase === "idle" && <div style={{ color: "var(--slate)", fontSize: 15 }}>Findings will appear here as Dr Ali scans.</div>}
            {FINDINGS.filter(f => found.includes(f.id)).map(f => (
              <div className={"finding show"} key={f.id}>
                <div className="fi">{f.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="ft">{f.title} <span className="ok">Healthy</span></div>
                  <div className="fd">{f.line}</div>
                  {f.ecg && (
                    <div className="ecg"><svg viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0,20 L40,20 L52,20 L60,6 L70,34 L80,20 L120,20 L160,20 L172,20 L180,6 L190,34 L200,20 L240,20 L280,20 L292,20 L300,6 L310,34 L320,20 L360,20 L400,20" /></svg></div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className={"health" + (phase === "done" ? " show" : "")}>
            <div className={"dial" + (phase === "done" ? " pulse" : "")}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(150,190,255,.14)" strokeWidth="11"/>
                <circle cx="65" cy="65" r="56" fill="none" stroke="var(--ok)" strokeWidth="11" strokeLinecap="round"
                        strokeDasharray={dialC} strokeDashoffset={dialOffset} style={{ transition: "stroke-dashoffset .2s linear", filter: "drop-shadow(0 0 8px var(--ok))" }}/>
              </svg>
              <div className="num"><div className="v">{index}</div><div className="l">Health Index</div></div>
            </div>
            <div className="htx">
              <div className="hk">You’re thriving!</div>
              <div className="hd">Everything looks calm and healthy. Keep moving, sleeping well, and drinking water.</div>
            </div>
          </div>
        </div>

        {/* dock */}
        <div className="dock">
          <button className="scanbtn" onClick={run} disabled={phase === "scanning"}>
            {phase === "scanning"
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-9-9"/></svg> Scanning…</>
              : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18"/></svg> {phase === "done" ? "Scan again" : "Run scan"}</>}
          </button>
          <div className="progress">{phase === "scanning" ? `Scanning ${Math.round(scanY * 100)}%` : phase === "done" ? `${found.length} areas · all healthy` : "Ready"}</div>
          {phase === "done" && <button className="btn" onClick={reset}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3M3 4v4h4"/></svg> Reset</button>}
        </div>

        {/* pilot chip — Ali */}
        <div className="pilotchip">
          <div className="pring"><img src="../pilots/ali.png" alt="Pilot Ali" /></div>
          <div className="ptx"><div className="pk">Pilot</div><div className="pn">Ali</div></div>
          <video-launch src="../videos/health-inside.mp4" label="Listen to the walkthrough" title="Dr Ali" accent="#FF5E8A"></video-launch>
        </div>
      </div>
    </div>
  );
}

function docLine(id) {
  return ({
    lungs: "Lovely deep breaths — your <b>lungs</b> are clear and happy.",
    heart: "There’s that heartbeat! Strong and steady. 💗",
    posture: "Nice and tall — your <b>posture</b> looks great.",
    energy: "So much <b>energy</b> today — wonderful!",
  })[id] || "Looking good!";
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
