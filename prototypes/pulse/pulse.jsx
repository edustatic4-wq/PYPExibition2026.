/* City Pulse — AI traffic-junction simulation
   Collision-free guarantee:
   (1) car-following keeps a min gap within each lane;
   (2) only one axis is ever green; the box must be fully empty (all-red
       clearance) before the other axis turns green — so cross streams
       are never in the intersection at the same time. */
const { useState, useRef, useEffect, useCallback } = React;

const W = 1920, H = 1080, CX = 960, CY = 540, BOXH = 100, LANE = 26;
const VMAX = 330, GAP = 42, CARLEN = 30;

/* per-direction geometry */
const DIRS = {
  W: { axis: "EW", r: 0,   stop: CX - BOXH,        boxOut: CX + BOXH,        exit: W, pos: (s) => ({ x: s,      y: CY + LANE }) },
  E: { axis: "EW", r: 180, stop: W - (CX + BOXH),  boxOut: W - (CX - BOXH),  exit: W, pos: (s) => ({ x: W - s,  y: CY - LANE }) },
  N: { axis: "NS", r: 90,  stop: CY - BOXH,        boxOut: CY + BOXH,        exit: H, pos: (s) => ({ x: CX - LANE, y: s }) },
  S: { axis: "NS", r: 270, stop: H - (CY + BOXH),  boxOut: H - (CY - BOXH),  exit: H, pos: (s) => ({ x: CX + LANE, y: H - s }) },
};
const DIRKEYS = ["W", "E", "N", "S"];

/* ===== pure simulation (module scope, headless-testable) ===== */
function freshSim() {
  return { cars: [], nextId: 1, phase: { axis: "EW", mode: "green", t: 0 },
    spawnAcc: { W: 0, E: 0, N: 0, S: 0 }, recentWaits: [], cleared: 0, violations: 0 };
}
const boxEmpty = (S) => !S.cars.some(c => c.s > DIRS[c.dir].stop && c.s < DIRS[c.dir].boxOut);
const queueOf = (S, axis) => S.cars.filter(c => DIRS[c.dir].axis === axis && c.s < DIRS[c.dir].stop).length;

/* rush-hour demand multipliers (tunable) */
const RUSH = { ew: 4.5, ns: 0.5 };
if (typeof window !== "undefined") window.__RUSH = RUSH;

function stepSim(S, dt, ai, rushOn) {
  /* ---- phase controller ---- */
  const ph = S.phase; ph.t += dt;
  const ALLRED_MIN = 0.65;
  if (ph.mode === "green") {
    if (ai) {
      const mine = queueOf(S, ph.axis);
      const other = queueOf(S, ph.axis === "EW" ? "NS" : "EW");
      const AI_MIN = 1.4, AI_MAX = 8;
      if (ph.t >= AI_MAX || (ph.t >= AI_MIN && (mine === 0 || other > mine + 1))) { ph.mode = "allred"; ph.t = 0; }
    } else {
      if (ph.t >= 4.6) { ph.mode = "allred"; ph.t = 0; }
    }
  } else {
    // AI clears the box before switching (clean). No-AI switches on the timer
    // even if cars are still in the box -> cross streams overlap and crash.
    const canSwitch = ai ? boxEmpty(S) : true;
    if (ph.t >= ALLRED_MIN && canSwitch) {
      let next;
      if (ai) {
        const qE = queueOf(S, "EW"), qN = queueOf(S, "NS");
        next = qE === qN ? (ph.axis === "EW" ? "NS" : "EW") : (qE > qN ? "EW" : "NS");
      } else { next = ph.axis === "EW" ? "NS" : "EW"; }
      ph.axis = next; ph.mode = "green"; ph.t = 0;
    }
  }
  const greenAxis = ph.mode === "green" ? ph.axis : null;

  /* ---- spawn ---- */
  const baseRate = { W: 0.52, E: 0.52, N: 0.42, S: 0.42 };
  for (const dir of DIRKEYS) {
    let rate = baseRate[dir];
    if (rushOn) rate *= (DIRS[dir].axis === "EW" ? RUSH.ew : RUSH.ns); // rush floods E-W, leaves N-S light
    if (!ai) rate *= 1.85;   // no AI: keep the junction busy so collisions start at once
    S.spawnAcc[dir] = Math.min(S.spawnAcc[dir] + rate * dt, 3);
    if (S.spawnAcc[dir] >= 1) {
      const entryClear = !S.cars.some(c => c.dir === dir && c.s < GAP + 2);
      if (entryClear) { S.cars.push({ id: S.nextId++, dir, s: 0, v: VMAX, wait: 0 }); S.spawnAcc[dir] -= 1; }
    }
  }

  /* ---- move cars (car-following, per direction front->back) ---- */
  const gap = ai ? GAP : 22;            // no-AI: cars tailgate and bunch up
  const cleared = [];
  for (const dir of DIRKEYS) {
    const d = DIRS[dir];
    const greenForCar = greenAxis === d.axis;
    const lane = S.cars.filter(c => c.dir === dir).sort((a, b) => b.s - a.s);
    let prevAllowed = Infinity;
    for (const c of lane) {
      if (c.crashT > 0) { c.crashT -= dt; if (c.crashT <= 0) c.crashed = false; }
      let ceiling = prevAllowed - gap;
      // Only AI control enforces the red light. With no AI, cars pour through
      // from every direction and collide in the middle — the messy failure case.
      if (ai && !greenForCar && c.s <= d.stop) ceiling = Math.min(ceiling, d.stop);
      const speed = c.crashed ? 48 : VMAX;   // a crashed car only crawls out of the pile-up
      const desired = c.s + speed * dt;
      let ns = Math.min(desired, ceiling);
      if (ns < c.s) ns = c.s;
      const moved = ns - c.s;
      c.v = moved / dt;
      c.s = ns;
      if (c.v < 25 && c.s < d.stop) c.wait += dt;
      prevAllowed = c.s;
      if (c.s >= d.exit) cleared.push(c);
    }
  }

  /* ---- crash detection (no-AI only): cross-axis cars overlapping in the box ---- */
  if (!ai) {
    const near = S.cars.filter(c => c.s > DIRS[c.dir].stop - 26 && c.s < DIRS[c.dir].boxOut + 26);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const a = near[i], b = near[j];
        if (a.dir === b.dir) continue;       // same lane = handled by car-following
        const pa = DIRS[a.dir].pos(a.s), pb = DIRS[b.dir].pos(b.s);
        if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < 30) {
          a.crashed = b.crashed = true; a.crashT = b.crashT = 0.55;
        }
      }
    }
  }
  if (cleared.length) {
    const ids = new Set(cleared.map(c => c.id));
    for (const c of cleared) { S.recentWaits.push(c.wait); if (S.recentWaits.length > 14) S.recentWaits.shift(); }
    S.cleared += cleared.length;
    S.cars = S.cars.filter(c => !ids.has(c.id));
  }

  /* ---- invariants (AI mode must stay perfectly clean) ---- */
  const inBox = S.cars.filter(c => c.s > DIRS[c.dir].stop && c.s < DIRS[c.dir].boxOut);
  const axesInBox = new Set(inBox.map(c => DIRS[c.dir].axis));
  if (ai && axesInBox.size > 1) S.violations++;
  if (ai) for (const dir of DIRKEYS) {
    const lane = S.cars.filter(c => c.dir === dir).sort((a, b) => b.s - a.s);
    for (let i = 1; i < lane.length; i++) if (lane[i - 1].s - lane[i].s < CARLEN - 1) { S.violations++; break; }
  }
  S.crashes = S.cars.filter(c => c.crashed).length;
  return S;
}
if (typeof window !== "undefined") { window.__freshSim = freshSim; window.__stepSim = stepSim; }

/* signal placements */
const SIGPOS = {
  W: { x: CX - BOXH - 4, y: CY + LANE + 40 },
  E: { x: CX + BOXH + 4, y: CY - LANE - 40 },
  N: { x: CX - LANE - 40, y: CY - BOXH - 4 },
  S: { x: CX + LANE + 40, y: CY + BOXH + 4 },
};

function App() {
  const [scale, setScale] = useState(1);
  const [aiOn, setAiOn] = useState(true);
  const [rush, setRush] = useState(false);
  const [running, setRunning] = useState(true);
  const [hud, setHud] = useState({ cleared: 0, wait: 0, cong: 0 });
  const [phase, setPhase] = useState({ axis: "EW", mode: "green" });
  const [cars, setCars] = useState([]);

  const sim = useRef(null);
  const raf = useRef(0);
  const aiRef = useRef(aiOn), rushRef = useRef(rush), runRef = useRef(running);
  aiRef.current = aiOn; rushRef.current = rush; runRef.current = running;

  /* scale to fill */
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const reset = useCallback(() => { sim.current = freshSim(); setHud({ cleared: 0, wait: 0, cong: 0 }); }, []);

  /* main loop */
  useEffect(() => {
    if (!sim.current) sim.current = freshSim();
    let last = performance.now();
    let hudT = 0;

    const frame = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const S = sim.current;
      if (runRef.current) stepSim(S, dt, aiRef.current, rushRef.current);
      // render
      setCars(S.cars.map(c => {
        const d = DIRS[c.dir]; const p = d.pos(c.s);
        return { id: c.id, x: p.x, y: p.y, r: d.r, axis: d.axis, stopped: c.v < 30, crashed: !!c.crashed };
      }));
      // hud throttled
      hudT += dt;
      if (hudT > 0.15) {
        hudT = 0;
        const approaching = S.cars.filter(c => c.s < DIRS[c.dir].stop).length;
        const cong = Math.min(1, approaching / 26);
        const avg = S.recentWaits.length ? S.recentWaits.reduce((a, b) => a + b, 0) / S.recentWaits.length : 0;
        setHud({ cleared: S.cleared, wait: avg, cong, crashes: S.crashes || 0 });
        setPhase({ axis: S.phase.axis, mode: S.phase.mode });
        window.__SIM = { cars: S.cars.length, cleared: S.cleared, violations: S.violations };
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const onToggleAI = () => setAiOn(v => !v);
  const onRush = () => setRush(v => !v);
  const onReset = () => reset();

  /* signal state per direction */
  const sigState = (dir) => {
    const ax = DIRS[dir].axis;
    if (phase.mode === "allred") return "amber";
    return phase.axis === ax ? "green" : "red";
  };

  const congColor = hud.cong < 0.5 ? "var(--ok)" : hud.cong < 0.8 ? "var(--warn)" : "var(--danger)";
  const congLabel = hud.cong < 0.5 ? "Flowing" : hud.cong < 0.8 ? "Building" : "Gridlock";
  const messy = !aiOn && ((hud.crashes || 0) > 0 || hud.cong >= 0.8);

  return (
    <div className="stagewrap">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        <div className="bg-grid"></div>
        <Stars />

        {/* roads */}
        <div className="roads">
          <div className="road h"></div>
          <div className="road v"></div>
          <div className="lane h"></div>
          <div className="lane v"></div>
          <div className="box"><div className="cross"></div></div>
        </div>

        <div className={"aiscan" + (aiOn ? " on" : "")}></div>

        {/* cars */}
        {cars.map(c => (
          <div key={c.id} className={"car " + c.axis + (c.crashed ? " crashed" : c.stopped ? " stopped" : "")}
               style={{ left: c.x, top: c.y, "--r": c.r + "deg" }}>
            <div className="tr"></div>
          </div>
        ))}

        {/* signals */}
        {DIRKEYS.map(dir => (
          <div key={dir} className={"sig " + sigState(dir)} style={{ left: SIGPOS[dir].x, top: SIGPOS[dir].y }}>
            <i></i>
          </div>
        ))}

        <div className="phasebadge">
          GREEN&nbsp;<b>{phase.mode === "allred" ? "— clearing —" : (phase.axis === "EW" ? "East ⇄ West" : "North ⇅ South")}</b>
          &nbsp;·&nbsp;{aiOn ? "AI adaptive" : "Fixed timer"}
        </div>

        {/* ===== HUD ===== */}
        <div className="hud-top">
          <div className="brand">
            <div className="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg></div>
            <div className="tt"><div className="k">Mobility · Traffic Command Tower</div><h1>City Pulse</h1></div>
          </div>
          <a className="back-city" href="../Explore 2040.html" onClick={(e)=>{ if (window.parent && window.parent !== window) { e.preventDefault(); window.parent.postMessage({ type: "explore2040:back" }, "*"); } }}>
            <span className="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>
            Back to city
          </a>
        </div>

        <div className="stats">
          <div className="col"><div className="k">Cars cleared</div><div className="v">{hud.cleared}</div></div>
          <div className="col"><div className="k">Avg wait</div><div className="v">{hud.wait.toFixed(1)}<span className="u">s</span></div></div>
          <div className="cong">
            <div className="k"><span>Congestion</span><b>{congLabel}</b></div>
            <div className="bar"><div className="fill" style={{ width: (hud.cong * 100).toFixed(0) + "%", background: congColor }}></div></div>
          </div>
        </div>

        <div className={"statustag " + (messy ? "jam show" : aiOn ? "flow show" : "")}>
          {messy
            ? <><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></span> No AI control — cars colliding in the junction</>
            : <><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span> AI keeps the junction flowing — no collisions</>}
        </div>

        {/* ===== dock ===== */}
        <div className="dock">
          <div className="aitoggle">
            <div className={"switch" + (aiOn ? " on" : "")} onClick={onToggleAI} role="switch" aria-checked={aiOn} tabIndex={0}>
              <span className="st l">ON</span><span className="st r">OFF</span><div className="knob"></div>
            </div>
            <div className="lbl"><div className="a1">AI Control</div><div className="a2">{aiOn ? "Greens the busiest lane" : "Fixed timers"}</div></div>
          </div>
          <button className={"btn primary" + (rush ? " active" : "")} onClick={onRush}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>
            {rush ? "Rush hour ON" : "Rush hour"}
          </button>
          <button className="btn" onClick={onReset}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3M3 4v4h4"/></svg>
            Reset
          </button>
        </div>

        {/* pilot chip — Ahmad (Mobility) */}
        <div className="pilotchip">
          <div className="pring"><img src="../pilots/ahmad.png" alt="Pilot Ahmad" /></div>
          <div className="ptx"><div className="pk">Pilot</div><div className="pn">Ahmad</div></div>
        </div>
      </div>
    </div>
  );
}

function Stars() {
  const stars = React.useMemo(() => Array.from({ length: 60 }).map(() => ({
    l: Math.random() * 100, t: Math.random() * 100, d: (2 + Math.random() * 4).toFixed(1)
  })), []);
  return <div className="stars">{stars.map((s, i) => <i key={i} style={{ left: s.l + "%", top: s.t + "%", "--d": s.d + "s" }} />)}</div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
