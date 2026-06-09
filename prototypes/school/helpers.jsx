/* School 2040 — the five AI-helper interactive widgets */
const { useState, useRef, useEffect, useMemo } = React;

/* ---------- confetti burst ---------- */
function Confetti({ fire }) {
  const colors = ["#B14CFF", "#2BE5FF", "#6EE7A8", "#FFB155", "#FF5E8A"];
  const bits = useMemo(() => Array.from({ length: 26 }).map((_, i) => ({
    l: 10 + Math.random() * 80, d: (1.1 + Math.random() * 0.9).toFixed(2),
    delay: (Math.random() * 0.3).toFixed(2), c: colors[i % colors.length], x: (Math.random() * 40 - 20).toFixed(0),
  })), [fire]);
  if (!fire) return null;
  return (
    <div className="confetti" key={fire}>
      {bits.map((b, i) => (
        <i key={i} style={{ left: b.l + "%", top: "12%", background: b.c, "--d": b.d + "s",
          animationDelay: b.delay + "s", transform: `translateX(${b.x}px)` }} />
      ))}
    </div>
  );
}

/* ====================================================================
   1 · Math Whisperer (Maya) — adaptive arithmetic + mastery bar
   ==================================================================== */
function makeQuestion(level) {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let a, b, op, ans, text;
  if (level <= 1) { a = ri(2, 9); b = ri(2, 9); op = "+"; ans = a + b; }
  else if (level === 2) { a = ri(11, 39); b = ri(6, 29); op = "+"; ans = a + b; }
  else if (level === 3) { a = ri(20, 60); b = ri(5, 19); op = "−"; ans = a - b; }
  else if (level === 4) { a = ri(3, 9); b = ri(3, 9); op = "×"; ans = a * b; }
  else if (level === 5) { a = ri(6, 12); b = ri(6, 12); op = "×"; ans = a * b; }
  else { a = ri(4, 9); b = ri(3, 8); op = "×"; const c = ri(2, 9); ans = a * b + c; text = `${a} × ${b} + ${c}`; }
  text = text || `${a} ${op} ${b}`;
  // distractors near the answer
  const set = new Set([ans]);
  while (set.size < 4) {
    const off = ri(-6, 6) || (set.size + 1);
    const cand = ans + off;
    if (cand >= 0) set.add(cand);
  }
  const opts = [...set].sort(() => Math.random() - 0.5);
  return { text, ans, opts, level, a, b, op };
}
function explain(q) {
  if (q.op === "+") return `Add in steps: start at ${q.a}, then count on ${q.b} more.`;
  if (q.op === "−") return `Start at ${q.a} and take away ${q.b} — count back to find it.`;
  if (q.op === "×") return `${q.a} × ${q.b} means ${q.b} groups of ${q.a}. Add ${q.a} up ${q.b} times.`;
  return `Do the × first, then add the last number.`;
}

function MathWhisperer() {
  const [level, setLevel] = useState(2);
  const [mastery, setMastery] = useState(20);
  const [q, setQ] = useState(() => makeQuestion(2));
  const [picked, setPicked] = useState(null);
  const [fb, setFb] = useState({ msg: "Pick the answer — I’ll adapt to you.", kind: "" });
  const [fire, setFire] = useState(0);
  const [streak, setStreak] = useState(0);

  const choose = (o) => {
    if (picked !== null) return;
    setPicked(o);
    if (o === q.ans) {
      const m = Math.min(100, mastery + 16);
      setMastery(m);
      const nl = Math.min(6, level + 1);
      setStreak(streak + 1);
      setFb({ msg: m >= 100 ? "Mastered it — you’re flying! 🎉" : `Correct! Let’s try something a little harder.`, kind: "good" });
      setFire(f => f + 1);
      setTimeout(() => { setLevel(nl); setQ(makeQuestion(nl)); setPicked(null); if (m < 100) setFb({ msg: "Here’s the next one.", kind: "" }); }, 1150);
    } else {
      const m = Math.max(0, mastery - 8);
      setMastery(m);
      const nl = Math.max(1, level - 1);
      setStreak(0);
      setFb({ msg: explain(q) + ` (The answer was ${q.ans}.) Let’s take an easier one together.`, kind: "soft" });
      setTimeout(() => { setLevel(nl); setQ(makeQuestion(nl)); setPicked(null); }, 2100);
    }
  };

  return (
    <div className="widget">
      <Confetti fire={fire} />
      <div className="qcard">
        <div className="qhead">
          <span className="lvl">Level {q.level} · {["Warm-up","Warm-up","Adding","Subtracting","Times tables","Big tables","Two-step"][q.level]}</span>
          {streak > 1 && <span className="lvl" style={{ color: "var(--ok)", background: "color-mix(in oklab,var(--ok),transparent 84%)" }}>🔥 {streak} in a row</span>}
        </div>
        <div className="qq">{q.text} = ?</div>
        <div className="opts">
          {q.opts.map((o, i) => (
            <div key={i} className={"opt" + (picked !== null ? " disabled" : "") + (picked !== null && o === q.ans ? " right" : "") + (picked === o && o !== q.ans ? " wrong" : "")}
                 onClick={() => choose(o)}>{o}</div>
          ))}
        </div>
      </div>
      <div className={"feedback " + fb.kind}>{fb.kind === "good" && <span className="em">✓</span>}{fb.kind === "soft" && <span className="em">💡</span>}{fb.msg}</div>
      <div className="mastery">
        <div className="ml"><span>Mastery</span><b>{mastery}%</b></div>
        <div className="mbar"><div className="mfill" style={{ width: mastery + "%" }}></div></div>
      </div>
    </div>
  );
}

/* ====================================================================
   2 · Language Bridge (Yara) — match the translation
   ==================================================================== */
const WORDS = [
  { en: "Hello", ar: "مرحبا", fr: "Bonjour" },
  { en: "Friend", ar: "صديق", fr: "Ami" },
  { en: "Book", ar: "كتاب", fr: "Livre" },
  { en: "Water", ar: "ماء", fr: "Eau" },
  { en: "Star", ar: "نجمة", fr: "Étoile" },
  { en: "Peace", ar: "سلام", fr: "Paix" },
  { en: "School", ar: "مدرسة", fr: "École" },
];
function LanguageBridge() {
  const [i, setI] = useState(0);
  const [opts, setOpts] = useState(() => buildOpts(0));
  const [picked, setPicked] = useState(null);
  const [fb, setFb] = useState({ msg: "Which card says it in Arabic?", kind: "" });
  const [solved, setSolved] = useState(0);

  function buildOpts(idx) {
    const correct = WORDS[idx].ar;
    const pool = WORDS.filter((_, k) => k !== idx).map(w => w.ar).sort(() => Math.random() - 0.5).slice(0, 2);
    return [correct, ...pool].sort(() => Math.random() - 0.5);
  }
  const next = () => { const n = (i + 1) % WORDS.length; setI(n); setOpts(buildOpts(n)); setPicked(null); setFb({ msg: "Which card says it in Arabic?", kind: "" }); };
  const choose = (o) => {
    if (picked) return;
    setPicked(o);
    if (o === WORDS[i].ar) { setSolved(s => s + 1); setFb({ msg: `Yes! “${WORDS[i].en}” is “${WORDS[i].ar}” — and “${WORDS[i].fr}” in French.`, kind: "good" }); setTimeout(next, 1700); }
    else setFb({ msg: `Not quite — look again. “${WORDS[i].en}” has a different shape.`, kind: "soft" });
  };
  return (
    <div className="widget">
      <div className="qcard">
        <div className="qhead"><span className="lvl">English → العربية</span><span className="lvl" style={{ color: "var(--ok)", background: "color-mix(in oklab,var(--ok),transparent 84%)" }}>{solved} matched</span></div>
        <div className="qq" style={{ fontSize: 38 }}>{WORDS[i].en}</div>
        <div className="langrow">
          {opts.map((o, k) => (
            <div key={k} className={"langcard" + (picked ? (o === WORDS[i].ar ? " right" : (picked === o ? " wrong" : "")) : "")} onClick={() => choose(o)}>
              <div className="fl">Arabic</div><div className="wd">{o}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={"feedback " + fb.kind}>{fb.kind === "good" && <span className="em">✓</span>}{fb.kind === "soft" && <span className="em">💡</span>}{fb.msg}</div>
      <div className="btnrow"><button className="btn" onClick={next}>Skip word →</button></div>
    </div>
  );
}

/* ====================================================================
   3 · Kind Homework Helper (Layla) — gentle hint stepper
   ==================================================================== */
const PROBLEMS = [
  { q: "A baker has 24 cookies. She shares them equally onto 4 plates. How many on each plate?",
    hints: ["You’re splitting into equal groups — that means division.", "Think: 24 shared between 4 plates.", "Count up in 4s: 4, 8, 12… how many 4s make 24?"], answer: "6 cookies on each plate (24 ÷ 4 = 6)." },
  { q: "A bus has 32 seats. 19 are taken. How many seats are empty?",
    hints: ["“How many empty” means we take away the full ones.", "Start from 32 and remove 19.", "32 − 19… take 20 then add 1 back."], answer: "13 empty seats (32 − 19 = 13)." },
  { q: "A garden has 6 rows of flowers with 5 flowers in each row. How many flowers?",
    hints: ["Equal rows — that’s a times question.", "6 rows, 5 in each.", "6 × 5 is the same as five 6s added up."], answer: "30 flowers (6 × 5 = 30)." },
];
function HomeworkHelper() {
  const [pi, setPi] = useState(0);
  const [shown, setShown] = useState(0); // hints revealed
  const [done, setDone] = useState(false);
  const P = PROBLEMS[pi];
  const more = shown < P.hints.length;
  const giveHint = () => { if (more) setShown(shown + 1); };
  const reveal = () => setDone(true);
  const another = () => { const n = (pi + 1) % PROBLEMS.length; setPi(n); setShown(0); setDone(false); };
  return (
    <div className="widget">
      <div className="problem">{P.q}</div>
      <div className="hints">
        {P.hints.slice(0, shown).map((h, k) => (
          <div className="hintline" key={k}><span className="n">{k + 1}</span><span>{h}</span></div>
        ))}
        {done && <div className="hintline answer"><span className="n">✓</span><span><b>{P.answer}</b> — you did the thinking, I just nudged.</span></div>}
        {shown === 0 && !done && <div style={{ color: "var(--slate)", fontSize: 15 }}>I’ll never just give the answer — tap for a gentle nudge.</div>}
      </div>
      <div className="btnrow">
        <button className="btn primary" onClick={giveHint} disabled={!more}>{more ? (shown === 0 ? "Give me a hint" : "Another hint") : "No more hints"}</button>
        {!done && <button className="btn" onClick={reveal} disabled={shown < P.hints.length}>Show me how</button>}
        {done && <button className="btn" onClick={another}>Another question →</button>}
      </div>
    </div>
  );
}

/* ====================================================================
   4 · Eyes That Read Aloud (Omar) — karaoke read-aloud (SpeechSynthesis)
   ==================================================================== */
const PASSAGES = [
  "The little robot looked up at the stars and wondered what was out there.",
  "Every morning the city wakes up, and the gardens turn to face the sun.",
  "Reading opens a door, and behind it waits a brand new world.",
];
function ReadAloud() {
  const [pi, setPi] = useState(0);
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const words = PASSAGES[pi].split(" ");
  const timer = useRef(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = () => { setPlaying(false); setActive(-1); if (timer.current) clearTimeout(timer.current); if (supported) window.speechSynthesis.cancel(); };
  const play = () => {
    stop();
    setPlaying(true); setActive(0);
    if (supported) {
      const u = new SpeechSynthesisUtterance(PASSAGES[pi]);
      u.rate = 0.85; u.pitch = 1.1;
      let wi = 0;
      u.onboundary = (e) => { if (e.name === "word" || e.charIndex != null) { /* approximate by char index */ const upto = PASSAGES[pi].slice(0, e.charIndex).split(" ").length - 1; setActive(Math.max(0, upto)); } };
      u.onend = () => { setActive(words.length); setPlaying(false); };
      window.speechSynthesis.speak(u);
    }
    // visual fallback / driver (also covers browsers w/o reliable onboundary)
    let wi = 0;
    const tick = () => {
      setActive(wi);
      wi++;
      if (wi <= words.length) timer.current = setTimeout(tick, 360);
      else { setPlaying(false); }
    };
    if (!supported) tick();
  };
  useEffect(() => () => stop(), []);
  const next = () => { stop(); setPi((pi + 1) % PASSAGES.length); };

  return (
    <div className="widget">
      <div className="qcard">
        <div className="reader">
          {words.map((w, k) => (
            <w key={k} className={k === active ? "on" : (active > k ? "done" : "")}>{w} </w>
          ))}
        </div>
      </div>
      <div className={"feedback"} style={{ color: "var(--slate)" }}>
        {supported ? "Tap play — I’ll read it out and light up each word." : "Tap play — each word lights up as we read together."}
      </div>
      <div className="btnrow">
        <button className="btn primary" onClick={playing ? stop : play}>
          {playing ? <><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg> Stop</>
                   : <><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg> Read aloud</>}
        </button>
        <button className="btn" onClick={next}>New sentence →</button>
      </div>
    </div>
  );
}

/* ====================================================================
   5 · Adventure Planner (Mira) — pick interests → a little plan
   ==================================================================== */
const INTERESTS = [
  { id: "space", em: "🚀", label: "Space" }, { id: "sea", em: "🌊", label: "Sea life" },
  { id: "history", em: "🏛️", label: "History" }, { id: "nature", em: "🌿", label: "Nature" },
  { id: "robots", em: "🤖", label: "Robots" }, { id: "art", em: "🎨", label: "Art" },
];
const STOPS = {
  space: { t: "Planetarium dome", d: "Lie back under a sky of 9,000 stars and steer a comet." },
  sea: { t: "Coral lab tank", d: "Meet a holographic octopus and name three deep-sea fish." },
  history: { t: "Time corridor", d: "Walk through old Beirut and trade in a 1900s market." },
  nature: { t: "Rooftop forest", d: "Plant a seed that the AI tracks as it grows all year." },
  robots: { t: "Maker bay", d: "Build a tiny rover and race it through a neon maze." },
  art: { t: "Light studio", d: "Paint in mid-air and watch your strokes come alive." },
};
function AdventurePlanner() {
  const [sel, setSel] = useState([]);
  const [plan, setPlan] = useState(null);
  const toggle = (id) => { setPlan(null); setSel(s => s.includes(id) ? s.filter(x => x !== id) : (s.length < 3 ? [...s, id] : s)); };
  const make = () => {
    const picks = sel.length ? sel : ["space", "nature", "art"];
    setPlan(picks.map(p => STOPS[p]));
  };
  return (
    <div className="widget">
      <div style={{ fontSize: 15, color: "var(--slate)", marginBottom: 4 }}>Pick up to 3 things you love:</div>
      <div className="chips">
        {INTERESTS.map(it => (
          <div key={it.id} className={"chip" + (sel.includes(it.id) ? " sel" : "")} onClick={() => toggle(it.id)}>
            <span className="em">{it.em}</span> {it.label}
          </div>
        ))}
      </div>
      {plan && (
        <div className="plan">
          {plan.map((s, k) => (
            <div className="planstop" key={k} style={{ animationDelay: (k * 0.08) + "s" }}>
              <div className="t"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg></div>
              <div><div className="pt">Stop {k + 1} · {s.t}</div><div className="pd">{s.d}</div></div>
            </div>
          ))}
        </div>
      )}
      <div className="btnrow">
        <button className="btn primary" onClick={make}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18"/></svg> {plan ? "Plan again" : "Plan my adventure"}</button>
      </div>
    </div>
  );
}

Object.assign(window, { MathWhisperer, LanguageBridge, HomeworkHelper, ReadAloud, AdventurePlanner });
