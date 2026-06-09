/* Booth card overlay + audio placeholder */
const { useState, useRef, useEffect } = React;

function AudioButton({ accentHex, src }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const TOTAL = 24; // placeholder duration (s)
  const ref = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!playing) return;
    if (src) return; // real audio drives its own time
    const start = performance.now() - t * 1000;
    const tick = () => {
      const e = (performance.now() - start) / 1000;
      if (e >= TOTAL) { setPlaying(false); setT(0); return; }
      setT(e);
      ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [playing, src]);

  const toggle = () => {
    if (src && audioRef.current) {
      if (playing) audioRef.current.pause(); else audioRef.current.play();
    }
    setPlaying(p => !p);
  };

  const mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
  const pct = Math.min(1, t / TOTAL);

  return (
    <div className={"audio" + (playing ? " playing" : "")} onClick={toggle} role="button" tabIndex={0}
         aria-label={playing ? "Pause pilot intro" : "Play pilot intro"}>
      {src && <audio ref={audioRef} src={src} onTimeUpdate={(e)=>setT(e.target.currentTime)}
                     onEnded={()=>{setPlaying(false);setT(0);}} />}
      <div className="pp">
        {playing
          ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>}
      </div>
      <div className="wave" aria-hidden="true">
        {[0,1,2,3,4,5].map(i => <i key={i} />)}
      </div>
      <div className="txt">
        <span className="a1">{playing ? "Playing the pilot's intro" : "Hear the pilot's intro"}</span>
        <span className="a2">{playing ? `${mm(t)} / ${mm(TOTAL)}` : "Recorded message · 24s"}</span>
      </div>
    </div>
  );
}

function BoothCard({ data, district }) {
  if (!data) return null;
  const acc = district.accentHex;
  return (
    <div className="card is-shown" style={{ "--acc": acc }} data-screen-label={data.title}
         onClick={(e) => e.stopPropagation()}>
      <div className="close" onClick={() => window.__nav("close")} role="button" tabIndex={0} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </div>

      <div className="cover">
        <image-slot id={"preview-" + data.id} shape="rect" fit="cover"
                    src={"previews/" + data.id + ".png"}
                    placeholder={data.preview}></image-slot>
        <div className="fade"></div>
        <div className="ckab">
          <span className="ic"></span>
          <span>{data.building}</span>
          <span className="dist">· {district.name.replace(" District", "")}</span>
        </div>
      </div>

      <div className="body">
        <div className="head">
          <div className="avatar">
            <div className="spin"></div>
            <div className="mask">
              <image-slot id={"face-" + data.id} shape="circle"
                          src={"pilots/" + district.pilot + ".png"}
                          placeholder="Photo"></image-slot>
            </div>
          </div>
          <div className="htext">
            <h3>{data.title}</h3>
          </div>
        </div>
        <p className="line">{data.line}</p>
        <div className="meta">
          {data.meta.map(([k, v], i) => (
            <span className="m" key={i}>{k} <b>{v}</b></span>
          ))}
        </div>
        <div className="actions">
          {data.intro && <video-launch src={data.intro} label="Listen to the pilot's intro" title={data.title} accent={acc}></video-launch>}
          <a className="enter" href={data.link} target="_blank" rel="noopener"
             onClick={(e) => { if (window.__openProto) { e.preventDefault(); window.__openProto(data.link); } }}>
            Enter the Prototype
            <span className="ar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BoothCard, AudioButton });
