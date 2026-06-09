/* School 2040 — main scene */
const { useState, useRef, useEffect, useMemo, useCallback } = React;

/* icons per helper */
const IC = {
  math: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h6M8 4v6M5 17h6M5 14l6 6M5 20l6-6M15 6h5M15 17h5M15 13h5"/></svg>,
  lang: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h8M8 3v2M6 5c0 4-2 6-3 7M7 8c0 2 2 4 4 5"/><path d="M13 20l4-10 4 10M14.5 16h5"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V8l8-5 8 5v11a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/><path d="M9.5 11.5l1.5 1.5 3-3"/></svg>,
  read: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  plan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
};

const STATIONS = [
  { id: "math", role: "The Math Whisperer", who: "with Maya", acc: "#B14CFF", x: 14,  y: 70, story: "“Numbers used to scare me,” says Maya. Now an AI senses exactly when she’s ready for more — and slows right down when she isn’t.", widget: "MathWhisperer" },
  { id: "lang", role: "The Language Bridge", who: "with Yara", acc: "#2BE5FF", x: 33, y: 18, story: "Yara’s grandmother speaks only Arabic; her pen-pal only French. The Bridge lets every word travel between them in a heartbeat.", widget: "LanguageBridge" },
  { id: "home", role: "The Kind Homework Helper", who: "with Layla", acc: "#6EE7A8", x: 52, y: 64, story: "Layla was stuck and tired. This helper never just hands over answers — it nudges, gently, until the idea clicks on its own.", widget: "HomeworkHelper" },
  { id: "read", role: "The Eyes That Read Aloud", who: "with Omar", acc: "#FFB155", x: 70, y: 20, story: "Letters jump around for Omar. So the page reads itself to him, lighting each word as it speaks — and suddenly stories are his too.", widget: "ReadAloud" },
  { id: "plan", role: "The Adventure Planner", who: "with Mira", acc: "#FF5E8A", x: 87, y: 66, story: "Mira loves everything at once. Tell the Planner what you’re curious about and it dreams up the perfect day of discovery.", widget: "AdventurePlanner" },
];

function Figure({ acc, ico, big }) {
  return (
    <div className={big ? "bigfig" : "fig"}>
      <div className="head"></div>
      {big && <div className="face"><i></i><i></i></div>}
      {big && <div className="smile"></div>}
      <div className="body"></div>
      <div className="ico">{ico}</div>
    </div>
  );
}

function Station({ s, onOpen }) {
  return (
    <div className="station" style={{ left: s.x + "%", bottom: s.y + "px", "--acc": s.acc }}
         data-screen-label={s.role} onClick={() => onOpen(s)}>
      <div className="holo">
        <Figure acc={s.acc} ico={IC[s.id]} />
      </div>
      <div className="base"><div className="beam"></div><div className="disc"></div></div>
      <div className="meta">
        <div className="role">{s.role}</div>
        <div className="who">{s.who}</div>
        <div className="cta">Tap to meet</div>
      </div>
    </div>
  );
}

function App() {
  const [scale, setScale] = useState(1);
  const [active, setActive] = useState(null);
  const [mat, setMat] = useState(false);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  const open = useCallback((s) => { setActive(s); setMat(false); requestAnimationFrame(() => setMat(true)); }, []);
  const close = useCallback(() => setActive(null), []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const particles = useMemo(() => Array.from({ length: 30 }).map(() => ({
    l: Math.random() * 100, t: Math.random() * 100, d: (6 + Math.random() * 8).toFixed(1)
  })), []);
  const ribs = useMemo(() => Array.from({ length: 13 }).map((_, i) => ({ a: -60 + i * 10 })), []);

  const Widget = active ? window[active.widget] : null;

  return (
    <div className="stagewrap">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        <div className="dome">
          {ribs.map((r, i) => <i key={i} style={{ transform: `rotate(${r.a}deg)`, transformOrigin: "top center" }} />)}
          <b style={{ top: "30%", left: "20%", right: "20%", height: "60%" }}></b>
          <b style={{ top: "55%", left: "10%", right: "10%", height: "60%" }}></b>
        </div>
        <div className="floor"></div>
        <div className="amb">{particles.map((p, i) => <i key={i} style={{ left: p.l + "%", top: p.t + "%", "--d": p.d + "s" }} />)}</div>

        {/* stations */}
        <div className="stations">
          {STATIONS.map(s => <Station key={s.id} s={s} onOpen={open} />)}
        </div>

        {/* HUD */}
        <div className="hud-top">
          <div className="brand">
            <div className="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.7 3 3 6 3s6-1.3 6-3v-5.5"/></svg></div>
            <div className="tt"><div className="k">Discovery · Learning Dome</div><h1>School 2040</h1></div>
          </div>
          <a className="back-city" href="../Explore 2040.html" onClick={(e)=>{ if (window.parent && window.parent !== window) { e.preventDefault(); window.parent.postMessage({ type: "explore2040:back" }, "*"); } }}>
            <span className="a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>
            Back to city
          </a>
        </div>

        <div className="roomtitle">
          <div className="k">Discovery District</div>
          <h2>Meet your AI classroom</h2>
          <div className="h">Five helpers, five real kids. Tap a hologram to step inside their story.</div>
        </div>

        {/* pilot chip — Nadim */}
        <div className="pilotchip">
          <div className="pring"><img src="../pilots/nadim.png" alt="Pilot Nadim" /></div>
          <div className="ptx"><div className="pk">Pilot</div><div className="pn">Nadim</div></div>
          <video-launch src="../videos/education-inside.mp4" label="Listen to the walkthrough" title="School 2040" accent="#B14CFF"></video-launch>
        </div>

        {/* focus overlay */}
        <div className={"scrim" + (active ? " show" : "")} onClick={close}></div>
        <div className={"focus" + (active ? " show" : "")}>
          {active && (
            <div className="fcard" style={{ "--acc": active.acc }} data-screen-label={active.role} onClick={(e) => e.stopPropagation()}>
              <div className="fclose" onClick={close}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
              <div className={"holostage" + (mat ? " materialize" : "")}>
                <Figure acc={active.acc} ico={IC[active.id]} big />
                <div className="pad"></div>
                <div className="who"><b>{active.who.replace("with ", "")}</b>{active.role}</div>
              </div>
              <div className="fbody">
                <div className="role">{active.role}</div>
                <div className="story">{active.story}</div>
                {Widget && <Widget key={active.id} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
