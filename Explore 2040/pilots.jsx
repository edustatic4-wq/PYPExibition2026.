/* Pilots flip-card screen */
const PILOTS = [
  { id: "ahmad", name: "Ahmad", acc: "#2BE5FF", district: "Mobility District", heading: "Mobility",
    sections: [["Transportation", "AI on the Move"], ["Traffic", "City Pulse"]],
    video: "videos/card-ahmad.mp4",
    line: "Ahmad makes the whole city move — smarter, calmer, greener." },
  { id: "nadim", name: "Nadim", acc: "#B14CFF", district: "Discovery District", heading: "Discovery",
    sections: [["Education", "School 2040"], ["Entertainment", "Play Reactor"]],
    video: "videos/card-nadim.mp4",
    line: "Nadim reimagines how we learn and play." },
  { id: "ali", name: "Ali", acc: "#FF5E8A", district: "Vitality District", heading: "Vitality",
    sections: [["Health", "Dr Ali"], ["Sports", "Peak 2040"]],
    video: "videos/card-ali.mp4",
    line: "Ali keeps us healthy and at our peak." },
];

function FlipCard({ p, index, onFlip, onPlay }) {
  const [flipped, setFlipped] = React.useState(false);
  const tap = () => {
    if (!flipped) { setFlipped(true); onFlip(p.id); }
    onPlay(p);            // always (re)open the pilot's video full-screen
  };
  const back = (e) => { e.stopPropagation(); setFlipped(false); };
  return (
    <div className="flipcard-wrap" style={{ animationDelay: (index * 0.12) + "s" }}>
    <div className={"flipcard" + (flipped ? " flipped" : "")} style={{ "--acc": p.acc }}
         onClick={tap} role="button" tabIndex={0} aria-label={"Play " + p.name + "'s intro"}>
      {/* front */}
      <div className="face fc-front">
        <div className="glowpulse"></div>
        <div className="fc-portrait">
          <div className="spin"></div>
          <div className="mask"><img src={"pilots/" + p.id + ".png"} alt={p.name} /></div>
        </div>
        <div className="fc-name">{p.name}</div>
        <div className="fc-dist">{p.district}</div>
        <div className="fc-flip">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
          Tap to play
        </div>
      </div>
      {/* back */}
      <div className="face fc-back">
        <div className="bh">{p.heading}</div>
        <div className="fc-tags">
          {p.sections.map(([k, v], i) => (
            <span className="fc-tag" key={i}>{k} · <b>{v}</b></span>
          ))}
        </div>
        <div className="fc-line">{p.line}</div>
        <button className="fc-playagain" onClick={(e) => { e.stopPropagation(); onPlay(p); }}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>
          Play intro
        </button>
        <button className="fc-backbtn" onClick={back}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>
          Back
        </button>
      </div>
    </div>
    </div>
  );
}

function PilotsScreen({ onEnter }) {
  const [opened, setOpened] = React.useState(() => new Set());
  const [playing, setPlaying] = React.useState(null);
  const onFlip = (id) => setOpened(prev => { const n = new Set(prev); n.add(id); return n; });
  const allOpen = opened.size >= PILOTS.length;

  const stars = React.useMemo(() => Array.from({ length: 60 }).map(() => ({
    l: Math.random() * 100, t: Math.random() * 100, d: (2 + Math.random() * 4).toFixed(1)
  })), []);

  return (
    <div className="pilots-screen">
      <div className="ps-glow"></div>
      <div className="ps-stars">{stars.map((s, i) => <i key={i} style={{ left: s.l + "%", top: s.t + "%", "--d": s.d + "s" }} />)}</div>

      <div className="ps-head">
        <div className="ps-eyebrow">Wellspring · Humans and AI · 2040</div>
        <h2 className="ps-title">Meet the pilots of 2040</h2>
        <div className="ps-sub">Tap each pilot to play their intro.</div>
      </div>

      <div className="ps-row">
        {PILOTS.map((p, i) => <FlipCard key={p.id} p={p} index={i} onFlip={onFlip} onPlay={setPlaying} />)}
      </div>

      {/* preload card videos so they pop instantly when tapped */}
      <div aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" }}>
        {PILOTS.map(p => <video key={p.id} src={p.video} preload="auto" muted></video>)}
      </div>

      <div className="ps-enter-wrap">
        {allOpen ? (
          <button className="ps-enter" onClick={onEnter}>
            <span className="pe-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>
            Enter the city
          </button>
        ) : (
          <div className="ps-progress">
            <span>Flip all three to enter</span>
            <span className="pdots">
              {PILOTS.map(p => <i key={p.id} className={opened.has(p.id) ? "on" : ""}></i>)}
            </span>
            <b>{opened.size}/3</b>
          </div>
        )}
      </div>

      {playing && <PilotVideo p={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function PilotVideo({ p, onClose }) {
  const vref = React.useRef(null);
  const [audioOnly, setAudioOnly] = React.useState(false);  // show video by default; downgrade to audio poster only if no video track
  const [playing, setPlaying] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [t, setT] = React.useState(0);
  const [dur, setDur] = React.useState(0);

  React.useEffect(() => {
    const v = vref.current; if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => { v.muted = true; v.play().then(()=>setPlaying(true)).catch(() => {}); });
  }, []);
  const detect = () => { const v = vref.current; if (!v) return; setDur(v.duration || 0); setAudioOnly(v.readyState >= 1 && v.videoWidth === 0); };
  const toggle = () => { const v = vref.current; if (!v) return; if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } };
  const seek = (e) => { const v = vref.current; const r = e.currentTarget.getBoundingClientRect(); if (v.duration) v.currentTime = ((e.clientX - r.left) / r.width) * v.duration; };
  const mmss = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const BARS = 32;

  return (
    <div className="pv-overlay" style={{ "--acc": p.acc }} onClick={onClose}>
      <div className={"pv-frame" + (audioOnly ? " audio" : "")} onClick={(e) => e.stopPropagation()}>
        <button className="pv-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <div className="pv-kicker"><span className="pv-dot"></span> {p.name} · {p.heading}</div>

        <video ref={vref} src={p.video} controls={!audioOnly} playsInline preload="auto"
               poster={"pilots/" + p.id + ".png"}
               onLoadedMetadata={detect}
               onLoadedData={detect}
               onCanPlay={() => setReady(true)}
               onPlaying={() => setReady(true)}
               onTimeUpdate={(e) => setT(e.target.currentTime)}
               onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
               onEnded={() => setPlaying(false)}></video>

        {!audioOnly && !ready && (
          <div className="pv-loading"><div className="pv-spin"></div><div className="pv-ltx">Loading {p.name}’s intro…</div></div>
        )}

        {audioOnly && (
          <div className="pv-audio">
            <div className="pv-portrait"><div className="pv-pspin"></div><div className="pv-pmask"><img src={"pilots/" + p.id + ".png"} alt={p.name} /></div></div>
            <div className="pv-name">{p.name}</div>
            <div className="pv-tag">Pilot intro · {p.heading} District</div>
            <div className={"pv-eq" + (playing ? " on" : "")}>
              {Array.from({ length: BARS }).map((_, i) => <i key={i} style={{ "--i": i, "--d": (0.6 + (i % 5) * 0.12).toFixed(2) + "s" }} />)}
            </div>
            <div className="pv-controls">
              <button className="pv-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                {playing
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>}
              </button>
              <div className="pv-track">
                <div className="pv-bar" onClick={seek}><div className="pv-fill" style={{ width: (dur ? (t / dur) * 100 : 0) + "%" }}></div></div>
                <div className="pv-time"><span>{mmss(t)}</span><span>{mmss(dur)}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.PilotsScreen = PilotsScreen;
