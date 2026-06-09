/* Play Reactor — procedural level generator + scripted auto-player */
const { useState, useRef, useEffect, useCallback, useMemo } = React;

const LW = 1800, LH = 600, HERO_H = 46;

const WORLDS = [
  { id: "jungle", label: "Neon Jungle", em: "🌴", acc: "#6EE7A8", acc2: "#2BE5FF" },
  { id: "caves",  label: "Crystal Caves", em: "💎", acc: "#2BE5FF", acc2: "#B14CFF" },
  { id: "sky",    label: "Sky Citadel", em: "🛰️", acc: "#FFB155", acc2: "#FF5E8A" },
  { id: "reef",   label: "Cyber Reef", em: "🐠", acc: "#FF5E8A", acc2: "#2BE5FF" },
];
const HEROES = [
  { id: "spark", label: "Spark", em: "⚡", color: "#2BE5FF" },
  { id: "nova",  label: "Nova", em: "🌟", color: "#FFB155" },
  { id: "bolt",  label: "Bolt", em: "🟢", color: "#6EE7A8" },
  { id: "pixel", label: "Pixel", em: "🟣", color: "#B14CFF" },
];
const GOALS = [
  { id: "portal", label: "Reach the portal", em: "🌀" },
  { id: "sparks", label: "Collect all sparks", em: "✨" },
  { id: "speed",  label: "Beat the clock", em: "⏱️" },
];

/* ---- path: top surface height at x (lower number = higher up) ---- */
function groundY(x, plats) {
  for (const p of plats) if (x >= p.x && x <= p.x + p.w) return p.top;
  for (let i = 0; i < plats.length - 1; i++) {
    const a = plats[i], b = plats[i + 1];
    if (x > a.x + a.w && x < b.x) {
      const t = (x - (a.x + a.w)) / (b.x - (a.x + a.w));
      const lin = a.top + (b.top - a.top) * t;
      const arch = Math.min(78, 44 + Math.abs(b.top - a.top) * 0.35);
      return lin - Math.sin(Math.PI * t) * arch;
    }
  }
  if (x < plats[0].x) return plats[0].top;
  return plats[plats.length - 1].top;
}
const onPlat = (x, plats) => plats.some(p => x >= p.x && x <= p.x + p.w);

/* ---- procedural level generator (different every call) ---- */
function generateLevel(worldId, heroId, goalId) {
  const world = WORLDS.find(w => w.id === worldId) || WORLDS[0];
  const hero = HEROES.find(h => h.id === heroId) || HEROES[0];
  const goal = GOALS.find(g => g.id === goalId) || GOALS[0];
  const r = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(r(a, b + 1));

  const plats = [];
  let x = 30, top = ri(360, 460);
  const n = ri(5, 7);
  for (let i = 0; i < n; i++) {
    const w = ri(150, 250);
    if (x + w > LW - 70) break;
    plats.push({ x, w, top });
    x += w + ri(72, 128);
    top = Math.max(330, Math.min(500, top + ri(-90, 90)));
  }
  const last = plats[plats.length - 1];
  const portalX = Math.min(LW - 46, last.x + last.w + ri(56, 104));
  const portalTop = last.top;

  // sparks ride the hero's path so they're always collectible
  const sparks = []; let id = 0;
  for (const p of plats) {
    const cnt = ri(1, 2);
    for (let k = 0; k < cnt; k++) { const sx = p.x + p.w * ((k + 1) / (cnt + 1)); sparks.push({ id: id++, x: sx, y: groundY(sx, plats) - 26 }); }
  }
  for (let i = 0; i < plats.length - 1; i++) { const a = plats[i], b = plats[i + 1]; const mx = (a.x + a.w + b.x) / 2; sparks.push({ id: id++, x: mx, y: groundY(mx, plats) - 30 }); }

  const variance = plats.slice(1).reduce((s, p, i) => s + Math.abs(p.top - plats[i].top), 0);
  const difficulty = Math.max(1, Math.min(5, Math.round(1 + (n - 4) + variance / 320)));
  const lengthLabel = n <= 5 ? "Short" : n === 6 ? "Medium" : "Long";
  const duration = 4.6 + 0.5 * n;

  const startX = plats[0].x + 26;
  const quests = [
    `Guide <b>${hero.label}</b> across the <b>${world.label}</b> — grab all ${sparks.length} sparks and dive through the portal.`,
    `The <b>${world.label}</b> just rezzed into being. Help <b>${hero.label}</b> leap ${n - 1} gaps to ${goal.label.toLowerCase()}.`,
    `New world online. <b>${hero.label}</b> must gather ${sparks.length} sparks before the portal seals.`,
    `A fresh <b>${world.label}</b> awaits — send <b>${hero.label}</b> bounding to the portal, sparks and all.`,
  ];
  const quest = quests[ri(0, quests.length - 1)];

  return { plats, sparks, portalX, portalTop, world, hero, goal, difficulty, lengthLabel, duration, startX, n };
}
if (typeof window !== "undefined") { window.__genLevel = generateLevel; window.__groundY = groundY; }

/* ====================================================================
   App
   ==================================================================== */
function App() {
  const [scale, setScale] = useState(1);
  const [world, setWorld] = useState("caves");
  const [hero, setHero] = useState("spark");
  const [goal, setGoal] = useState("sparks");

  const [level, setLevel] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | charge | assemble | play | complete
  const [heroPos, setHeroPos] = useState({ x: 0, y: 0, jumping: false });
  const [collected, setCollected] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [charge, setCharge] = useState(0);
  const [confetti, setConfetti] = useState(0);

  const raf = useRef(0);
  const st = useRef({ phase: "idle", clock: 0, level: null, collected: new Set() });

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  const generate = useCallback(() => {
    const lv = generateLevel(world, hero, goal);
    st.current = { phase: "charge", clock: 0, level: lv, collected: new Set() };
    setLevel(lv); setPhase("charge"); setCollected([]); setBursts([]); setCharge(0);
    setHeroPos({ x: lv.startX, y: groundY(lv.startX, lv.plats) - 23, jumping: false });
  }, [world, hero, goal]);

  useEffect(() => {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const S = st.current;
      if (S.phase !== "idle" && S.phase !== "complete") {
        S.clock += dt;
        const lv = S.level;
        if (S.phase === "charge") {
          setCharge(Math.min(1, S.clock / 1.3));
          if (S.clock >= 1.3) { S.phase = "assemble"; S.clock = 0; setPhase("assemble"); }
        } else if (S.phase === "assemble") {
          if (S.clock >= 0.85) { S.phase = "play"; S.clock = 0; setPhase("play"); }
        } else if (S.phase === "play") {
          const p = Math.min(1, S.clock / lv.duration);
          const x = lv.startX + p * (lv.portalX - lv.startX);
          const y = groundY(x, lv.plats) - 23;
          const jumping = !onPlat(x, lv.plats);
          setHeroPos({ x, y, jumping });
          // collect
          let changed = false;
          for (const s of lv.sparks) {
            if (!S.collected.has(s.id) && Math.abs(x - s.x) < 24) {
              S.collected.add(s.id); changed = true;
              setBursts(b => [...b, { x: s.x, y: s.y, key: s.id + "-" + now }]);
            }
          }
          if (changed) setCollected([...S.collected]);
          if (p >= 1) { S.phase = "complete"; setPhase("complete"); setConfetti(c => c + 1); }
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // prune bursts
  useEffect(() => { if (!bursts.length) return; const t = setTimeout(() => setBursts(b => b.slice(-6)), 500); return () => clearTimeout(t); }, [bursts]);

  const W = WORLDS.find(w => w.id === world);
  const accVars = { "--acc": W.acc, "--acc2": W.acc2 };
  const heroColor = HEROES.find(h => h.id === hero).color;
  const busy = phase === "charge" || phase === "assemble" || phase === "play";
  const showLevel = level && phase !== "idle";

  const chargeParts = useMemo(() => Array.from({ length: 16 }).map((_, i) => ({ a: (i / 16) * Math.PI * 2, r: 150 + (i % 4) * 40 })), [confetti, charge < 0.02]);
  const cx = LW / 2, cy = LH * 0.48;

  const confBits = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({ l: 6 + Math.random() * 88, d: (1.2 + Math.random() * 1).toFixed(2), delay: (Math.random() * .35).toFixed(2), c: [W.acc, W.acc2, "#FFB155", "#FF5E8A", "#6EE7A8"][i % 5] })), [confetti]);

  return (
    <div className="stagewrap">
      <div className="stage" style={{ transform: `scale(${scale})`, ...accVars }}>
        <div className="bg-grid"></div>
        <Stars />

        {/* HUD */}
        <div className="hud-top">
          <div className="brand">
            <div className="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg></div>
            <div className="tt"><div className="k">Discovery · Holo-Arcade</div><h1>Play Reactor</h1></div>
          </div>
          <a className="back-city" href="../Explore 2040.html" onClick={(e)=>{ if (window.parent && window.parent !== window) { e.preventDefault(); window.parent.postMessage({ type: "explore2040:back" }, "*"); } }}>
            <span className="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>
            Back to city
          </a>
        </div>

        <div className="quest" style={{ opacity: level ? 1 : 0 }} dangerouslySetInnerHTML={{ __html: level ? level.quest : "" }}></div>

        {/* level stage */}
        <div className="level">
          {/* reactor core */}
          <div className={"reactor" + (phase === "charge" ? " charging" : "") + (showLevel && phase !== "charge" ? " hidden" : "")}>
            <div className="ring r1"></div><div className="ring r2"></div>
            <div className="core"></div>
          </div>
          {phase === "charge" && chargeParts.map((p, i) => {
            const cp = charge;
            const px = cx + Math.cos(p.a) * p.r * (1 - cp);
            const py = cy + Math.sin(p.a) * p.r * (1 - cp);
            return <div className="chargep" key={i} style={{ left: px, top: py, opacity: 0.3 + cp * 0.7 }} />;
          })}
          {phase === "idle" && <div className="hint">Pick a world, a hero and a goal — then fire the reactor.</div>}

          {/* platforms */}
          {showLevel && phase !== "charge" && level.plats.map((p, i) => (
            <div className="plat in" key={i} style={{ left: p.x, top: p.top, width: p.w, height: LH - p.top, animationDelay: (i * 0.07) + "s" }}>
              <div className="top"></div>
            </div>
          ))}

          {/* sparks */}
          {showLevel && phase !== "charge" && level.sparks.filter(s => !collected.includes(s.id)).map(s => (
            <div className="spark" key={s.id} style={{ left: s.x, top: s.y }}></div>
          ))}
          {bursts.map(b => <div className="burst" key={b.key} style={{ left: b.x, top: b.y }}></div>)}

          {/* portal */}
          {showLevel && phase !== "charge" && (
            <div className="portal" style={{ left: level.portalX, top: level.portalTop - 36 }}>
              <div className="pr"></div><div className="swirl"></div>
            </div>
          )}

          {/* hero */}
          {(phase === "play" || phase === "complete") && (
            <div className={"hero" + (heroPos.jumping ? " jump" : " run")} style={{ left: heroPos.x, top: heroPos.y, "--hero": heroColor }}>
              <div className="trail"></div><div className="hbody"></div><div className="eye"></div>
            </div>
          )}

          {/* complete */}
          <div className={"complete" + (phase === "complete" ? " show" : "")}>
            <div className="big">Level Complete!</div>
            <div className="sub">{collected.length} / {level ? level.sparks.length : 0} sparks · {level ? level.world.label : ""}</div>
          </div>
          {phase === "complete" && <div className="confetti" key={confetti}>{confBits.map((b, i) => <i key={i} style={{ left: b.l + "%", top: "8%", background: b.c, "--d": b.d + "s", animationDelay: b.delay + "s" }} />)}</div>}
        </div>

        {/* control deck */}
        <div className="deck">
          <div className="pickgroup">
            <div className="pl"><b></b> World</div>
            <div className="chips">{WORLDS.map(w => <div key={w.id} className={"chip" + (world === w.id ? " sel" : "")} onClick={() => !busy && setWorld(w.id)}><span className="em">{w.em}</span>{w.label}</div>)}</div>
          </div>
          <div className="sep"></div>
          <div className="pickgroup">
            <div className="pl"><b></b> Hero</div>
            <div className="chips">{HEROES.map(h => <div key={h.id} className={"chip" + (hero === h.id ? " sel" : "")} onClick={() => !busy && setHero(h.id)}><span className="em">{h.em}</span>{h.label}</div>)}</div>
          </div>
          <div className="sep"></div>
          <div className="pickgroup">
            <div className="pl"><b></b> Goal</div>
            <div className="chips">{GOALS.map(g => <div key={g.id} className={"chip" + (goal === g.id ? " sel" : "")} onClick={() => !busy && setGoal(g.id)}><span className="em">{g.em}</span>{g.label}</div>)}</div>
          </div>
          <div className="sep"></div>
          <div className="genwrap">
            <div className="ratings">
              <div className="rate"><div className="rk">Difficulty</div><div className="rv stars">{level ? "★".repeat(level.difficulty) + "☆".repeat(5 - level.difficulty) : "—"}</div></div>
              <div className="rate"><div className="rk">Sparks</div><div className="rv">{level ? level.sparks.length : "—"}</div></div>
              <div className="rate"><div className="rk">Length</div><div className="rv">{level ? level.lengthLabel : "—"}</div></div>
            </div>
            <button className="genbtn" onClick={generate} disabled={busy}>
              {busy ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-9-9"/></svg> Generating…</>
                    : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg> {level ? "Generate again" : "Generate level"}</>}
            </button>
          </div>
        </div>
        {/* show host — Nadim */}
        <div className="host">
          <div className="host-glow"></div>
          <img src="../characters/nadim-host.png" alt="Host Nadim" />
        </div>
        {/* pilot chip — Nadim */}
        <div className="pilotchip">
          <div className="pring"><img src="../pilots/nadim.png" alt="Pilot Nadim" /></div>
          <div className="ptx"><div className="pk">Pilot</div><div className="pn">Nadim</div></div>
        </div>
      </div>
    </div>
  );
}

function Stars() {
  const stars = useMemo(() => Array.from({ length: 50 }).map(() => ({ l: Math.random() * 100, t: Math.random() * 100, d: (2 + Math.random() * 4).toFixed(1) })), []);
  return <div className="stars">{stars.map((s, i) => <i key={i} style={{ left: s.l + "%", top: s.t + "%", "--d": s.d + "s" }} />)}</div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
