/* Explore 2040 — six landmark building designs.
   Each has a unique silhouette + glowing icon so its theme reads at a glance. */

function Hotspot({ b }) {
  return (
    <div className="hot">
      <div className="ring"><i></i></div>
    </div>
  );
}

/* ---- 1 · Sky Transit Hub (transport) ---- */
function TransitHub() {
  return (
    <div className="tx">
      <div className="loop"></div>
      <div className="loop b"></div>
      <div className="railpod"></div>
      <div className="railpod b"></div>
      <div className="station gbody wgrid"></div>
      <div className="dpod l"></div>
      <div className="dpod r"></div>
      <div className="platform"></div>
      <div className="badge ic">
        <svg width="36" height="26" viewBox="0 0 36 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="4" y="3" width="28" height="17" rx="6"/>
          <line x1="4" y1="12.5" x2="32" y2="12.5"/>
          <circle cx="11" cy="20" r="1.7" fill="currentColor" stroke="none"/>
          <circle cx="25" cy="20" r="1.7" fill="currentColor" stroke="none"/>
        </svg>
      </div>
    </div>
  );
}

/* ---- 2 · Traffic Command Tower (traffic) ---- */
function TrafficTower() {
  return (
    <div className="tf">
      <div className="shaft gbody"></div>
      <div className="cab gbody">
        <div className="map">
          <i className="h1"></i><i className="h2"></i><i className="v1"></i><i className="v2"></i>
          <div className="car a"></div>
          <div className="car b"></div>
        </div>
      </div>
      <div className="signals"><b className="r"></b><b className="y"></b><b className="g"></b></div>
      <div className="mast"></div>
      <div className="dish"></div>
      <div className="sweep"></div>
    </div>
  );
}

/* ---- 3 · Learning Dome / Future School (education) ---- */
function LearningDome() {
  return (
    <div className="sc">
      <div className="body gbody wgrid"></div>
      <div className="arches"><i></i><i></i><i></i><i></i></div>
      <div className="dome gbody"></div>
      <div className="cap ic-white">
        <svg width="62" height="42" viewBox="0 0 62 42" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M31 5 L58 16 L31 27 L4 16 Z" fill="currentColor" fillOpacity="0.18"/>
          <path d="M15 21 V31 C15 34.5 22 37.5 31 37.5 C40 37.5 47 34.5 47 31 V21"/>
          <line x1="58" y1="16" x2="58" y2="29"/>
          <circle cx="58" cy="31.5" r="2.6" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <div className="flag"></div>
    </div>
  );
}

/* ---- 4 · Holo-Arcade (entertainment) ---- */
function HoloArcade() {
  const glyphs = [
    { c: "g1", l: 26, t: 34, s: "tri" },
    { c: "g2", l: 132, t: 40, s: "sq" },
    { c: "g3", l: 40, t: 88, s: "ci" },
    { c: "g4", l: 124, t: 92, s: "di" },
  ];
  const shape = (s) => {
    if (s === "tri") return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2 L12 7 L3 12 Z"/></svg>;
    if (s === "sq") return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="9" height="9" rx="2"/></svg>;
    if (s === "ci") return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6.5" cy="6.5" r="4.5"/></svg>;
    return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 1 L13 7 L7 13 L1 7 Z"/></svg>;
  };
  return (
    <div className="ar">
      <div className="dome gbody">
        {glyphs.map(g => (
          <span key={g.c} className={"glyph " + g.c} style={{ left: g.l + "px", top: g.t + "px" }}>{shape(g.s)}</span>
        ))}
      </div>
      <div className="marquee"><b></b><b></b><b></b><b></b></div>
      <div className="pad ic">
        <svg width="72" height="46" viewBox="0 0 72 46" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M23 13 H49 C60 13 68 21 68 31 C68 39 61 41 57 37 L50 31 H22 L15 37 C11 41 4 39 4 31 C4 21 12 13 23 13 Z" fill="currentColor" fillOpacity="0.14"/>
          <line x1="14" y1="25" x2="24" y2="25"/><line x1="19" y1="20" x2="19" y2="30"/>
          <circle cx="50" cy="23" r="2.3" fill="currentColor" stroke="none"/>
          <circle cx="57" cy="29" r="2.3" fill="currentColor" stroke="none"/>
        </svg>
      </div>
    </div>
  );
}

/* ---- 5 · Care Spire (health) ---- */
function CareSpire() {
  return (
    <div className="ca">
      <div className="spire"></div>
      <div className="ecg ic">
        <svg width="100" height="34" viewBox="0 0 100 34" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="0,18 24,18 31,18 37,7 44,29 51,18 100,18"/>
        </svg>
      </div>
      <div className="cross ic-white">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M16 4 H24 V16 H36 V24 H24 V36 H16 V24 H4 V16 H16 Z" fill="currentColor" fillOpacity="0.22"/>
        </svg>
      </div>
      <div className="tip beacon2"></div>
    </div>
  );
}

/* ---- 6 · The Arena (sports) ---- */
function Arena() {
  const seg = (pattern) => (
    <div className="seg">
      {pattern.map((on, i) => <i key={i} className={on ? "" : "off"}></i>)}
    </div>
  );
  return (
    <div className="an">
      <div className="track"></div>
      <div className="track b"></div>
      <div className="pole p1"></div>
      <div className="pole p2"></div>
      <div className="bowl gbody"></div>
      <div className="flood f1"></div>
      <div className="flood f2"></div>
      <div className="board">
        {seg([1,1,1, 0,0,1, 1,1,1])}
        {seg([1,0,1, 1,0,1, 1,1,1])}
      </div>
    </div>
  );
}

const DESIGNS = {
  "ai-on-the-move": TransitHub,
  "city-pulse": TrafficTower,
  "school-2040": LearningDome,
  "play-reactor": HoloArcade,
  "dr-ali": CareSpire,
  "peak-2040": Arena,
};

function Building({ b, active, onOpen }) {
  const Design = DESIGNS[b.id];
  return (
    <div className={"hero" + (active ? " active" : "")} data-screen-label={b.title}
         onClick={(e) => { if (active) { e.stopPropagation(); onOpen(b); } }}>
      {Design ? <Design /> : null}
      <div className="nameplate">
        <span className="np-t">{b.title}</span>
        <span className="np-b">{b.building}</span>
      </div>
      {active ? <Hotspot b={b} /> : null}
    </div>
  );
}

Object.assign(window, { Building, Hotspot });
