/* Peak 2040 — AI sprint coach with IK pose-skeleton runner */
const { useState, useRef, useEffect, useCallback, useMemo } = React;

/* deterministic outcomes per mode */
const CON  = { time: 11.0, form: 95, speed: 9.1, cadence: 3.0 };
const COFF = { time: 13.4, form: 60, speed: 7.6, cadence: 2.4 };
const TIPS = ["Drive your arms!", "Lengthen your stride", "Stay tall — chest up", "Explode off your toes", "Relax your shoulders", "Quick feet — lift the knees"];

/* 2-bone IK; pick the joint solution whose x is max (forward) or min (back) */
function ik(rx, ry, tx, ty, l1, l2, prefer) {
  let dx = tx - rx, dy = ty - ry;
  let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 0.01) || 0.01;
  const ux = dx / Math.hypot(dx, dy || 1), uy = dy / Math.hypot(dx, dy || 1);
  const a = Math.atan2(uy, ux);
  const cosA = Math.max(-1, Math.min(1, (d * d + l1 * l1 - l2 * l2) / (2 * d * l1)));
  const A = Math.acos(cosA);
  const j1 = { x: rx + Math.cos(a + A) * l1, y: ry + Math.sin(a + A) * l1 };
  const j2 = { x: rx + Math.cos(a - A) * l1, y: ry + Math.sin(a - A) * l1 };
  if (prefer === "max") return j1.x >= j2.x ? j1 : j2;
  return j1.x <= j2.x ? j1 : j2;
}

/* full pose at running phase θ with amplitude amp (0 idle .. 1 sprint) */
function pose(theta, amp) {
  const HX = 170, HY0 = 220;
  const bob = -10 * amp * Math.abs(Math.sin(theta));
  const HY = HY0 + bob;
  const lean = 16 * amp + 4;
  const neck = { x: HX + lean, y: HY - 128 };
  const head = { x: neck.x + 10, y: neck.y - 40 };
  const shoulder = { x: neck.x - 2, y: neck.y + 8 };
  const hip = { x: HX, y: HY };

  const strideX = 30 + 78 * amp, lift = 78 * amp, baseY = HY + 178;
  const foot = (ph) => ({ x: HX + strideX * Math.cos(ph), y: baseY - Math.max(0, Math.sin(ph)) * lift });
  const fA = foot(theta), fB = foot(theta + Math.PI);
  const kneeA = ik(hip.x, hip.y, fA.x, fA.y, 96, 94, "max");
  const kneeB = ik(hip.x, hip.y, fB.x, fB.y, 96, 94, "max");

  const armStride = 22 + 50 * amp, handBaseY = shoulder.y + 96;
  const hand = (ph) => ({ x: shoulder.x + armStride * Math.cos(ph), y: handBaseY - Math.max(0, Math.sin(ph)) * 26 });
  const hA = hand(theta + Math.PI), hB = hand(theta);   // arms opposite the legs
  const elbowA = ik(shoulder.x, shoulder.y, hA.x, hA.y, 64, 60, "min");
  const elbowB = ik(shoulder.x, shoulder.y, hB.x, hB.y, 64, 60, "min");

  return { head, neck, shoulder, hip, fA, fB, kneeA, kneeB, hA, hB, elbowA, elbowB };
}

function Skeleton({ p, ghost }) {
  const cls = ghost ? "ghost" : "";
  return (
    <g className={cls}>
      {/* back limbs */}
      <line className="bone" x1={p.hip.x} y1={p.hip.y} x2={p.kneeB.x} y2={p.kneeB.y} opacity={ghost?1:.8}/>
      <line className="bone" x1={p.kneeB.x} y1={p.kneeB.y} x2={p.fB.x} y2={p.fB.y} opacity={ghost?1:.8}/>
      <line className="bone" x1={p.shoulder.x} y1={p.shoulder.y} x2={p.elbowB.x} y2={p.elbowB.y} opacity={ghost?1:.8}/>
      <line className="bone" x1={p.elbowB.x} y1={p.elbowB.y} x2={p.hB.x} y2={p.hB.y} opacity={ghost?1:.8}/>
      {/* torso */}
      <line className="bone core" x1={p.hip.x} y1={p.hip.y} x2={p.neck.x} y2={p.neck.y}/>
      <line className="bone" x1={p.neck.x} y1={p.neck.y} x2={p.head.x} y2={p.head.y}/>
      {/* front limbs */}
      <line className="bone" x1={p.hip.x} y1={p.hip.y} x2={p.kneeA.x} y2={p.kneeA.y}/>
      <line className="bone" x1={p.kneeA.x} y1={p.kneeA.y} x2={p.fA.x} y2={p.fA.y}/>
      <line className="bone" x1={p.shoulder.x} y1={p.shoulder.y} x2={p.elbowA.x} y2={p.elbowA.y}/>
      <line className="bone" x1={p.elbowA.x} y1={p.elbowA.y} x2={p.hA.x} y2={p.hA.y}/>
      {!ghost && <>
        <circle className="joint" cx={p.kneeA.x} cy={p.kneeA.y} r="6"/>
        <circle className="joint" cx={p.kneeB.x} cy={p.kneeB.y} r="6"/>
        <circle className="joint" cx={p.fA.x} cy={p.fA.y} r="6"/>
        <circle className="joint" cx={p.fB.x} cy={p.fB.y} r="6"/>
        <circle className="joint" cx={p.elbowA.x} cy={p.elbowA.y} r="5"/>
        <circle className="joint" cx={p.elbowB.x} cy={p.elbowB.y} r="5"/>
        <circle className="joint" cx={p.hA.x} cy={p.hA.y} r="5"/>
        <circle className="joint" cx={p.hB.x} cy={p.hB.y} r="5"/>
        <circle className="joint big" cx={p.hip.x} cy={p.hip.y} r="8"/>
        <circle className="joint" cx={p.neck.x} cy={p.neck.y} r="6"/>
        <circle className="joint big" cx={p.head.x} cy={p.head.y} r="20"/>
      </>}
    </g>
  );
}

function App() {
  const [scale, setScale] = useState(1);
  const [coach, setCoach] = useState(true);
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [theta, setTheta] = useState(0);
  const [hud, setHud] = useState({ dist: 0, speed: 0, form: 0, time: 0 });
  const [tip, setTip] = useState({ text: "", show: false });
  const [scroll, setScroll] = useState(0);
  const [burst, setBurst] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [ranMode, setRanMode] = useState(null);

  const raf = useRef(0);
  const st = useRef({ phase: "idle", clock: 0, theta: 0, coach: true, lastTip: -1 });

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  const run = useCallback(() => {
    if (st.current.phase === "running") return;
    st.current = { phase: "running", clock: 0, theta: st.current.theta, coach, lastTip: -1 };
    setPhase("running"); setHud({ dist: 0, speed: 0, form: 0, time: 0 }); setBurst(false); setRanMode(coach);
    setTip({ text: "", show: false });
  }, [coach]);
  const reset = useCallback(() => {
    st.current = { phase: "idle", clock: 0, theta: st.current.theta, coach, lastTip: -1 };
    setPhase("idle"); setHud({ dist: 0, speed: 0, form: 0, time: 0 }); setTip({ text: "", show: false }); setBurst(false);
  }, [coach]);

  useEffect(() => {
    let last = performance.now();
    const easeOut = (x) => 1 - Math.pow(1 - x, 2);
    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const S = st.current;
      const running = S.phase === "running";
      const amp = running ? 1 : 0.28;
      const cad = running ? (S.coach ? CON.cadence : COFF.cadence) : 0.5;
      S.theta += Math.PI * 2 * cad * dt;
      setTheta(S.theta);
      if (running) {
        const M = S.coach ? CON : COFF;
        const dur = M.time * 0.6;           // compress to a watchable ~6.6–8s
        S.clock += dt;
        const p = Math.min(1, S.clock / dur);
        const dist = 100 * p;
        const speed = M.speed * easeOut(Math.min(1, p * 1.5));
        const form = S.coach ? Math.round(72 + 23 * easeOut(p)) : Math.round(58 + 2 * Math.sin(S.clock * 3));
        setHud({ dist, speed, form, time: M.time * p });
        setScroll(dist);
        // coaching tips
        if (S.coach) {
          const ti = Math.floor(S.clock / 1.5);
          if (ti !== S.lastTip && p < 0.96) { S.lastTip = ti; setTip({ text: TIPS[ti % TIPS.length], show: true }); }
        }
        if (p >= 1) {
          S.phase = "done"; setPhase("done");
          setHud({ dist: 100, speed: M.speed, form: S.coach ? M.form : 60, time: M.time });
          setTip({ text: "", show: false }); setBurst(true); setConfetti(c => c + 1);
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const amp = phase === "running" ? 1 : 0.28;
  const p0 = useMemo(() => pose(theta, amp), [theta, amp]);
  const g1 = useMemo(() => pose(theta - 0.4, amp), [theta, amp]);
  const g2 = useMemo(() => pose(theta - 0.8, amp), [theta, amp]);

  const dashShift = -(scroll * 14) % 160;
  const speedLines = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({ top: 8 + i * 9 + "%", w: 80 + Math.random() * 200, d: (.35 + Math.random() * .4).toFixed(2), delay: (Math.random()).toFixed(2) })), []);
  const confBits = useMemo(() => Array.from({ length: 32 }).map((_, i) => ({ l: 5 + Math.random() * 90, d: (1.2 + Math.random()).toFixed(2), delay: (Math.random() * .4).toFixed(2), c: ["#FF5E8A", "#2BE5FF", "#6EE7A8", "#FFB155"][i % 4] })), [confetti]);

  return (
    <div className="stagewrap">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        {/* stadium */}
        <div className="stands">
          <div className="glowrow" style={{ top: "30%" }}></div>
          <div className="glowrow" style={{ top: "42%" }}></div>
          <div className="crowd"></div>
          {[20, 38, 56, 74].map((l, i) => <div key={i} className="skybeam" style={{ left: l + "%", transform: `rotate(${i % 2 ? 8 : -8}deg)` }}></div>)}
        </div>
        {/* track */}
        <div className="track">
          {[18, 34, 50, 66, 82].map((t, i) => <div key={i} className="lane" style={{ top: t + "%" }}></div>)}
          <div className="dashes" style={{ backgroundPositionX: dashShift + "px" }}></div>
          {phase !== "idle" && <div className="finish" style={{ left: `${50 + (100 - scroll) * 0.9}%` }}></div>}
        </div>

        {/* speed lines */}
        <div className={"speed" + (phase === "running" ? " on" : "")}>
          {speedLines.map((s, i) => <i key={i} style={{ top: s.top, width: s.w, right: "20%", "--d": s.d + "s", animationDelay: s.delay + "s" }} />)}
        </div>

        {/* runner */}
        <div className="runner">
          <svg viewBox="0 0 360 440">
            <Skeleton p={g2} ghost />
            <Skeleton p={g1} ghost />
            <Skeleton p={p0} />
          </svg>
        </div>
        <div className={"fburst" + (burst ? " on" : "")}>
          <svg width="120" height="120" viewBox="0 0 120 120">{Array.from({length:12}).map((_,i)=>{const a=i/12*Math.PI*2;return <line key={i} x1="60" y1="60" x2={60+Math.cos(a)*54} y2={60+Math.sin(a)*54} stroke="#FFB155" strokeWidth="4" strokeLinecap="round"/>;})}</svg>
        </div>
        {phase === "done" && <div className="confetti" key={confetti}>{confBits.map((b, i) => <i key={i} style={{ left: b.l + "%", top: "6%", background: b.c, "--d": b.d + "s", animationDelay: b.delay + "s" }} />)}</div>}

        {/* HUD */}
        <div className="hud-top">
          <div className="brand">
            <div className="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l5-5 3 3 8-9"/><path d="M16 9h4v4"/></svg></div>
            <div className="tt"><div className="k">Vitality · The Arena</div><h1>Peak 2040</h1></div>
          </div>
          <a className="back-city" href="../Explore 2040.html" onClick={(e)=>{ if (window.parent && window.parent !== window) { e.preventDefault(); window.parent.postMessage({ type: "explore2040:back" }, "*"); } }}>
            <span className="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>
            Back to city
          </a>
        </div>

        <div className="stats">
          <div className="col"><div className="k">Distance</div><div className="v">{hud.dist.toFixed(0)}<span className="u">m</span></div></div>
          <div className="col"><div className="k">Speed</div><div className="v">{hud.speed.toFixed(1)}<span className="u">m/s</span></div></div>
          <div className="col form"><div className="k">Form</div><div className="v">{hud.form}<span className="u">%</span></div></div>
          <div className="col time"><div className="k">Time</div><div className="v">{hud.time.toFixed(2)}<span className="u">s</span></div></div>
        </div>

        <div className={"tip" + (tip.show ? " show" : "")}>
          <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c.5.5 1 1.3 1 2h6c0-.7.5-1.5 1-2a7 7 0 0 0-4-12z"/></svg></span>
          {tip.text}
        </div>

        <div className="formmeter">
          <div className="fk"><span>Form score</span><b>{hud.form}</b></div>
          <div className="fbar"><div className="ffill" style={{ width: hud.form + "%" }}></div></div>
          <div className="fnote">{coach ? "AI Coach is reading every joint and correcting your form live." : "No coach — running on instinct alone."}</div>
        </div>

        {/* verdict */}
        <div className={"verdict" + (phase === "done" ? " show" : "")}>
          <h2>{ranMode ? "With the AI Coach 🏆" : "Solo run"}</h2>
          <div className="vsub">100m sprint complete — here’s how the coach changes the game.</div>
          <div className="vrow">
            <div className={"vc on"}><div className="vl">AI Coach ON</div><div className="vt">{CON.time.toFixed(1)}s</div><div className="vf">Form {CON.form}% · {CON.speed} m/s</div></div>
            <div className={"vc off"}><div className="vl">Coach OFF</div><div className="vt">{COFF.time.toFixed(1)}s</div><div className="vf">Form {COFF.form}% · {COFF.speed} m/s</div></div>
          </div>
          <div className="vverd">The coach shaved <b>{(COFF.time - CON.time).toFixed(1)}s</b> and lifted form by <b>{CON.form - COFF.form} points</b>.</div>
        </div>

        {/* dock */}
        <div className="dock">
          <div className="aitoggle">
            <div className={"switch" + (coach ? " on" : "")} onClick={() => phase !== "running" && setCoach(v => !v)} role="switch" aria-checked={coach} tabIndex={0}>
              <span className="st l">ON</span><span className="st r">OFF</span><div className="knob"></div>
            </div>
            <div className="lbl"><div className="a1">AI Coach</div><div className="a2">{coach ? "Live form correction" : "Off — instinct only"}</div></div>
          </div>
          <button className="runbtn" onClick={run} disabled={phase === "running"}>
            {phase === "running"
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-9-9"/></svg> Running…</>
              : <><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg> {phase === "done" ? "Run again" : "Start sprint"}</>}
          </button>
          {phase === "done" && <button className="btn" onClick={reset}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3M3 4v4h4"/></svg> Reset</button>}
        </div>

        {/* pilot chip — Ali */}
        <div className="pilotchip">
          <div className="pring"><img src="../pilots/ali.png" alt="Pilot Ali" /></div>
          <div className="ptx"><div className="pk">Pilot</div><div className="pn">Ali</div></div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
