/* AI on the Move — logic + render */
const { useState, useRef, useEffect, useCallback, useMemo } = React;

/* ---------- grid geometry (1920x1080 design space) ---------- */
const COLS = 7, ROWS = 5;
const PADX = 230, PADT = 235, PADB = 225;
const GX = (1920 - 2 * PADX) / (COLS - 1);
const GY = (1080 - PADT - PADB) / (ROWS - 1);
const NX = (c) => PADX + c * GX;
const NY = (r) => PADT + r * GY;
const K = (c, r) => `${c},${r}`;
const EK = (a, b) => [a, b].sort().join("|");
const HOME = K(0, ROWS - 1);
const SCHOOL = K(COLS - 1, 0);

function allEdges() {
  const e = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c < COLS - 1) e.push([K(c, r), K(c + 1, r)]);
    if (r < ROWS - 1) e.push([K(c, r), K(c, r + 1)]);
  }
  return e;
}
const EDGES = allEdges();
const parse = (k) => k.split(",").map(Number);
const npos = (k) => { const [c, r] = parse(k); return { x: NX(c), y: NY(r) }; };

function neighbors(k) {
  const [c, r] = parse(k); const out = [];
  if (c > 0) out.push(K(c - 1, r)); if (c < COLS - 1) out.push(K(c + 1, r));
  if (r > 0) out.push(K(c, r - 1)); if (r < ROWS - 1) out.push(K(c, r + 1));
  return out;
}
/* Dijkstra avoiding jammed edges entirely (clear-only shortest path) */
function clearPath(jam) {
  const dist = { [HOME]: 0 }, prev = {}, pq = [[0, HOME]], seen = {};
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (seen[u]) continue; seen[u] = 1;
    if (u === SCHOOL) break;
    for (const v of neighbors(u)) {
      if (jam.has(EK(u, v))) continue;
      const nd = d + 1;
      if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; pq.push([nd, v]); }
    }
  }
  if (!(SCHOOL in dist)) return null;
  const path = [SCHOOL]; let u = SCHOOL;
  while (u !== HOME) { u = prev[u]; if (u == null) return null; path.unshift(u); }
  return path;
}
/* fixed route: right along bottom row, then up the right column */
function fixedRoute() {
  const path = []; const br = ROWS - 1;
  for (let c = 0; c <= COLS - 1; c++) path.push(K(c, br));
  for (let r = br - 1; r >= 0; r--) path.push(K(COLS - 1, r));
  return path;
}
const FIXED = fixedRoute();
window.__makeTraffic = makeTraffic;
window.__pathEdges = (p) => pathEdges(p);
window.__FIXED = () => FIXED;
function pathEdges(p) { const e = []; for (let i = 0; i < p.length - 1; i++) e.push(EK(p[i], p[i + 1])); return e; }

/* generate a traffic scenario: random jams, guarantee AI clear path exists,
   guarantee the fixed route hits at least one jam (so 'no-AI' gets stuck) */
function makeTraffic() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const jam = new Set();
    for (const [a, b] of EDGES) if (Math.random() < 0.34) jam.add(EK(a, b));
    const ai = clearPath(jam);
    if (!ai) continue;
    const fe = pathEdges(FIXED);
    let jammedOnFixed = fe.filter(e => jam.has(e));
    if (jammedOnFixed.length === 0) {
      // force one jam on the fixed route (pick an edge not on the AI path)
      const aiSet = new Set(pathEdges(ai));
      const cand = fe.filter(e => !aiSet.has(e));
      if (!cand.length) continue;
      jam.add(cand[Math.floor(Math.random() * cand.length)]);
    }
    const ai2 = clearPath(jam);
    if (!ai2) continue;
    const jOnFixed = pathEdges(FIXED).filter(e => jam.has(e));
    // index of first jammed edge along the fixed route (where the pod will get stuck)
    let stuckIdx = -1;
    const fe2 = pathEdges(FIXED);
    for (let i = 0; i < fe2.length; i++) if (jam.has(fe2[i])) { stuckIdx = i; break; }
    return { jam, ai: ai2, jamsOnFixed: jOnFixed.length, stuckIdx };
  }
  // fallback (extremely unlikely)
  const jam = new Set([pathEdges(FIXED)[3]]);
  return { jam, ai: clearPath(jam) || FIXED, jamsOnFixed: 1, stuckIdx: 3 };
}

/* polyline helpers for movement */
function polyline(pathKeys) {
  const pts = pathKeys.map(npos);
  const seg = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push({ a, b, len, start: total }); total += len;
  }
  return { pts, seg, total };
}
function posAt(poly, dist) {
  for (const s of poly.seg) {
    if (dist <= s.start + s.len || s === poly.seg[poly.seg.length - 1]) {
      const t = Math.max(0, Math.min(1, (dist - s.start) / s.len));
      const ang = Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t, ang };
    }
  }
  const last = poly.pts[poly.pts.length - 1];
  return { x: last.x, y: last.y, ang: 0 };
}

const SPEED = 470;            // px/s pod speed
const MIN_PER_EDGE = 2.6;     // displayed minutes per clear edge
const JAM_MIN = 15;           // displayed minutes penalty per jam crawl

/* outer decorative ring (in the margins) — ambient cars, never touch grid roads */
const RING = (() => {
  const x0 = 70, y0 = 70, x1 = 1850, y1 = 1010, rad = 60;
  const pts = [];
  const corner = (cx, cy, a0, a1) => { for (let i = 0; i <= 8; i++){ const a = a0 + (a1 - a0) * i / 8; pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad }); } };
  pts.push({ x: x0 + rad, y: y0 });
  pts.push({ x: x1 - rad, y: y0 }); corner(x1 - rad, y0 + rad, -Math.PI / 2, 0);
  pts.push({ x: x1, y: y1 - rad }); corner(x1 - rad, y1 - rad, 0, Math.PI / 2);
  pts.push({ x: x0 + rad, y: y1 }); corner(x0 + rad, y1 - rad, Math.PI / 2, Math.PI);
  pts.push({ x: x0, y: y0 + rad }); corner(x0 + rad, y0 + rad, Math.PI, Math.PI * 1.5);
  const seg = []; let total = 0;
  for (let i = 0; i < pts.length; i++){ const a = pts[i], b = pts[(i + 1) % pts.length]; const len = Math.hypot(b.x - a.x, b.y - a.y); seg.push({ a, b, len, start: total }); total += len; }
  return { seg, total };
})();
function ringPos(d) {
  d = ((d % RING.total) + RING.total) % RING.total;
  for (const s of RING.seg) if (d <= s.start + s.len) { const t = (d - s.start) / s.len; return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t }; }
  return RING.seg[0].a;
}

function App() {
  const [traffic, setTraffic] = useState(() => makeTraffic());
  const [aiOn, setAiOn] = useState(true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | driving | arrived | stuck
  const [routeDraw, setRouteDraw] = useState(false);
  const [pod, setPod] = useState(() => npos(HOME));
  const [trail, setTrail] = useState([]);
  const [jamCars, setJamCars] = useState([]);
  const [liveMin, setLiveMin] = useState(0);
  const [amb, setAmb] = useState([0, 1, 2, 3].map(i => i * RING.total / 4));
  const [scale, setScale] = useState(1);

  const raf = useRef(0);
  const ambRaf = useRef(0);

  const aiEdges = useMemo(() => pathEdges(traffic.ai).length, [traffic]);
  const aiMin = Math.round(aiEdges * MIN_PER_EDGE);
  const noAiMin = Math.round(pathEdges(FIXED).length * MIN_PER_EDGE + traffic.jamsOnFixed * JAM_MIN);
  const saveMin = Math.max(0, noAiMin - aiMin);

  const activePath = aiOn ? traffic.ai : FIXED;
  const poly = useMemo(() => polyline(activePath), [activePath]);

  /* scale to fill viewport */
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* ambient ring traffic — always gently moving, far from the grid */
  useEffect(() => {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      setAmb(prev => prev.map(d => d + 70 * dt));
      ambRaf.current = requestAnimationFrame(loop);
    };
    ambRaf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(ambRaf.current);
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setRunning(false); setPhase("idle"); setRouteDraw(false);
    setPod(npos(HOME)); setTrail([]); setJamCars([]); setLiveMin(0);
  }, []);

  const shuffle = useCallback(() => {
    reset();
    setTraffic(makeTraffic());
  }, [reset]);

  const onToggle = useCallback(() => { reset(); setAiOn(v => !v); }, [reset]);

  /* run the trip */
  const run = useCallback(() => {
    if (running) return;
    setPhase("driving"); setRunning(true); setTrail([]); setJamCars([]); setLiveMin(0);

    const path = aiOn ? traffic.ai : FIXED;
    const pl = polyline(path);

    // where to stop if not AI (first jammed edge)
    let stopDist = pl.total;
    let willStick = false;
    if (!aiOn && traffic.stuckIdx >= 0) {
      // hold exactly at the node where the jammed edge begins
      stopDist = pl.seg[traffic.stuckIdx].start;
      willStick = true;
    }

    if (aiOn) { setRouteDraw(false); requestAnimationFrame(() => setRouteDraw(true)); }

    const targetMin = aiOn ? aiMin : noAiMin;
    let dist = 0, last = performance.now();
    const trailBuf = [];
    const startDelay = aiOn ? 360 : 60; // AI sweeps the route in first
    let t0 = performance.now();

    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const elapsed = now - t0;
      if (elapsed < startDelay) { raf.current = requestAnimationFrame(step); return; }
      dist += SPEED * dt;
      const clamped = Math.min(dist, stopDist);
      const p = posAt(pl, clamped);
      setPod({ x: p.x, y: p.y, ang: p.ang });
      // trail
      trailBuf.push({ x: p.x, y: p.y, id: now });
      while (trailBuf.length > 12) trailBuf.shift();
      setTrail([...trailBuf]);
      // live minutes proportional to distance covered of its OWN route
      setLiveMin(Math.round(targetMin * Math.min(1, clamped / pl.total)));

      if (willStick && dist >= stopDist) {
        // STUCK: pile cars on the jammed edge, hold at the line
        const js = pl.seg[traffic.stuckIdx];
        const cars = [];
        for (let i = 0; i < 6; i++) {
          const t = 0.18 + i * 0.12;
          cars.push({ x: js.a.x + (js.b.x - js.a.x) * t + (Math.random() - .5) * 10,
                      y: js.a.y + (js.b.y - js.a.y) * t + (Math.random() - .5) * 10, id: i });
        }
        setJamCars(cars);
        setPhase("stuck"); setRunning(false);
        return;
      }
      if (dist >= pl.total) {
        setPod({ x: pl.pts[pl.pts.length - 1].x, y: pl.pts[pl.pts.length - 1].y, ang: 0 });
        setLiveMin(targetMin);
        setPhase("arrived"); setRunning(false);
        // fade trail out
        setTimeout(() => setTrail([]), 700);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [running, aiOn, traffic, aiMin, noAiMin]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* expose routing data for deterministic self-test */
  useEffect(() => {
    window.__T = {
      jamEdges: [...traffic.jam],
      aiPath: traffic.ai,
      aiEdges: pathEdges(traffic.ai),
      fixedPath: FIXED,
      fixedEdges: pathEdges(FIXED),
      stuckIdx: traffic.stuckIdx,
      aiAvoidsJams: pathEdges(traffic.ai).every(e => !traffic.jam.has(e)),
      aiConnects: traffic.ai[0] === HOME && traffic.ai[traffic.ai.length - 1] === SCHOOL,
      jamsOnFixed: traffic.jamsOnFixed,
      HOME, SCHOOL,
    };
  }, [traffic]);

  /* ---------- render ---------- */
  const jam = traffic.jam;
  const routeSet = useMemo(() => new Set(pathEdges(activePath)), [activePath]);
  const routeLen = poly.total;

  const home = npos(HOME), school = npos(SCHOOL);

  return (
    <div className="stagewrap">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        <div className="bg-grid"></div>
        <Stars />

        <svg className="city" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
          {/* base roads */}
          {EDGES.map(([a, b], i) => {
            const pa = npos(a), pb = npos(b);
            return <line key={"b" + i} className="seg base" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
          })}
          {/* clear lane dashes */}
          {EDGES.map(([a, b], i) => {
            if (jam.has(EK(a, b))) return null;
            const pa = npos(a), pb = npos(b);
            return <line key={"c" + i} className="seg clear" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
          })}
          {/* jams */}
          {EDGES.map(([a, b], i) => {
            if (!jam.has(EK(a, b))) return null;
            const pa = npos(a), pb = npos(b);
            return <line key={"j" + i} className="seg jam on" x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
          })}
          {/* chosen route highlight (AI sweeps it in) */}
          {aiOn && phase !== "idle" && (() => {
            const d = poly.pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
            return <path className={"seg route" + (routeDraw ? " draw" : "")} d={d}
                         style={{ "--len": routeLen, strokeDashoffset: routeDraw ? 0 : routeLen }} />;
          })()}
          {/* nodes */}
          {Array.from({ length: COLS * ROWS }).map((_, i) => {
            const c = i % COLS, r = Math.floor(i / COLS);
            return <circle key={"n" + i} className="node" cx={NX(c)} cy={NY(r)} r={5} />;
          })}
        </svg>

        {/* ambient ring cars */}
        {amb.map((d, i) => { const p = ringPos(d); return <div key={"a" + i} className="amb" style={{ left: p.x, top: p.y }} />; })}

        {/* trail */}
        {trail.map((t, i) => (
          <div key={t.id} className="trail" style={{ left: t.x, top: t.y, opacity: (i / trail.length) * 0.55 }} />
        ))}

        {/* jam cars */}
        {jamCars.map(c => <div key={c.id} className="jamcar" style={{ left: c.x, top: c.y }} />)}

        {/* HOME / SCHOOL */}
        <div className="place home" style={{ left: home.x, top: home.y }}>
          <div className="disc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/></svg>
          </div>
          <div className="lab">Home</div>
        </div>
        <div className={"place school" + (phase === "arrived" ? " arrived" : "")} style={{ left: school.x, top: school.y }}>
          <div className="disc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>
          </div>
          <div className="lab">School</div>
        </div>

        {/* the pod */}
        <div className={"pod" + (aiOn ? " ai" : "") + (phase === "stuck" ? " stuck" : "")}
             style={{ left: pod.x, top: pod.y }}>
          <div className="scan"></div>
          <div className="glow"></div>
          <div className="carimg" style={{ transform: `rotate(${(pod.ang || 0) + Math.PI / 2}rad)` }}>
            <img src="../characters/route-car-clean.png" alt="AI car" />
          </div>
        </div>

        {/* danger edge pulse */}
        <div className={"edgepulse" + (phase === "stuck" ? " on" : "")}></div>

        {/* ===== HUD ===== */}
        <div className="hud-top">
          <div className="brand">
            <div className="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
            <div className="tt"><div className="k">Mobility · Sky Transit Hub</div><h1>AI on the Move</h1></div>
          </div>
          <a className="back-city" href="../Explore 2040.html" onClick={(e)=>{
            if (window.parent && window.parent !== window) { e.preventDefault(); window.parent.postMessage({ type: "explore2040:back" }, "*"); }
          }}>
            <span className="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>
            Back to city
          </a>
        </div>

        <div className="compare">
          <div className="col ai">
            <div className="k"><span className="dot"></span> With AI</div>
            <div className="v">{aiOn && phase !== "idle" ? liveMin : aiMin}<span className="u">min</span></div>
          </div>
          <div className="col noai">
            <div className="k"><span className="dot"></span> Without AI</div>
            <div className="v">{(!aiOn && phase === "stuck") ? "STUCK" : <>{(!aiOn && phase === "driving") ? liveMin : noAiMin}<span className="u">min</span></>}</div>
          </div>
          <div className="save">
            <div className="k">AI saves</div>
            <div className="v">{saveMin} min</div>
          </div>
        </div>

        <div className={"statustag " + (phase === "arrived" ? "win show" : phase === "stuck" ? "stuck show" : phase === "driving" ? "go show" : "")}>
          {phase === "arrived" && <><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span> Arrived at school — smooth & on time</>}
          {phase === "stuck" && <><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg></span> Stuck in traffic — no AI route</>}
          {phase === "driving" && <>{aiOn ? "AI threading the fastest clear route…" : "Driving the fixed route…"}</>}
        </div>

        {/* pilot chip — fixed bottom-left, never rides the pod */}
        <div className="pilotchip">
          <div className="pring"><img src="../pilots/ahmad.png" alt="Pilot Ahmad" /></div>
          <div className="ptx"><div className="pk">Pilot</div><div className="pn">Ahmad</div></div>
          <video-launch src="../videos/transport-inside.mp4" label="Listen to the walkthrough" title="AI on the Move" accent="#2BE5FF"></video-launch>
        </div>

        {/* ===== bottom dock ===== */}
        <div className="dock">
          <div className="aitoggle">
            <div className={"switch" + (aiOn ? " on" : "")} onClick={onToggle} role="switch" aria-checked={aiOn} tabIndex={0}>
              <span className="st l">ON</span>
              <span className="st r">OFF</span>
              <div className="knob"></div>
            </div>
            <div className="lbl"><div className="a1">AI Routing</div><div className="a2">{aiOn ? "Avoids every jam" : "Fixed route only"}</div></div>
          </div>
          <button className="btn primary" onClick={run} disabled={running}>
            {running ? <><span className="sp"></span> Driving…</> : <><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg> Start trip</>}
          </button>
          <button className="btn" onClick={shuffle} disabled={running}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/><path d="M3 8V3h5"/><path d="M21 16v5h-5"/></svg>
            Shuffle traffic
          </button>
          <button className="btn" onClick={reset} disabled={running || phase === "idle"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v4h4"/></svg>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function Stars() {
  const stars = useMemo(() => Array.from({ length: 70 }).map(() => ({
    l: Math.random() * 100, t: Math.random() * 100, d: (2 + Math.random() * 4).toFixed(1)
  })), []);
  return <div className="stars">{stars.map((s, i) => <i key={i} style={{ left: s.l + "%", top: s.t + "%", "--d": s.d + "s" }} />)}</div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
