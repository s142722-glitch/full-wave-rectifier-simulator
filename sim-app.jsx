/* global React, ReactDOM, RectifierSim, CircuitDiagram, WaveformPlot, Controls */
const { useState, useEffect, useRef, useMemo } = React;

function Metric({ label, value, unit, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '10px 12px', background: 'var(--panel)',
      border: '1px solid var(--rule)', borderRadius: 6, minWidth: 110,
    }}>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--ink)' }}>
        {value}<span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 3, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState({
    load: 'RL',
    alphaDeg: 30,
    Vm: 170,        // ~120 Vrms peak
    f: 50,
    R: 10,
    L: 0.05,
    E: 0,
  });
  const set = (patch) => setState((s) => ({ ...s, ...patch }));

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);   // playback speed (1 = real time / slowed)
  const [tNow, setTNow] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  const result = useMemo(() => RectifierSim.simulate(state), [state]);

  useEffect(() => {
    function frame(now) {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      if (playing) {
        // Slow time by factor: real seconds → simulated seconds.
        // At 50 Hz, real-time = 20 ms per period — too fast to see. Use 1/30 slowdown by default.
        const slowdown = 30 / speed;
        setTNow((t) => t + dt / slowdown);
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed]);

  const m = result.metrics;

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 28px 60px' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        paddingBottom: 16, borderBottom: '1px solid var(--rule)', marginBottom: 22, gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1.6, fontWeight: 600 }}>Power Electronics · Lab Bench</div>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>
            Single-Phase Full-Wave Controlled Rectifier
          </h1>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--ink-2)' }}>
            Adjust the firing angle and load to see how <span style={{ color: 'var(--vs)', fontWeight: 600 }}>vs</span>, <span style={{ color: 'var(--vo)', fontWeight: 600 }}>vo</span>, and <span style={{ color: 'var(--io)', fontWeight: 600 }}>io</span> respond.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{
              border: '1px solid var(--rule)', background: 'var(--panel)',
              padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              color: playing ? 'var(--accent)' : 'var(--ink)',
            }}
          >{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }} className="mono">SPEED</span>
            <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ width: 90, accentColor: 'var(--accent)' }} />
            <span className="mono" style={{ fontSize: 12, minWidth: 36 }}>{speed.toFixed(2)}×</span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 22 }}>
        {/* LEFT — controls */}
        <aside style={{
          background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 10,
          padding: '20px 20px 24px',
          height: 'fit-content', position: 'sticky', top: 18,
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 14 }}>Controls</div>
          <Controls state={state} set={set} />
        </aside>

        {/* RIGHT — circuit + plot + metrics */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* Circuit */}
          <section style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 10, padding: 16 }}>
            <SectionTitle eyebrow="Circuit" title="Bridge with thyristors T1–T4" />
            <CircuitDiagram result={result} tNow={tNow} />
          </section>

          {/* Waveforms */}
          <section style={{ background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 16px 8px' }}>
            <SectionTitle eyebrow="Waveforms" title="Source · output · load current" right={
              <div style={{ display: 'flex', gap: 14, fontSize: 11 }} className="mono">
                <LegendDot color="var(--vs)" label="vs" />
                <LegendDot color="var(--vo)" label="vo" />
                <LegendDot color="var(--io)" label="io" />
                <span style={{ color: 'var(--ink-3)' }}>α-lines dashed</span>
              </div>
            } />
            <WaveformPlot result={result} tNow={tNow} periods={2} />
          </section>

          {/* Metrics */}
          <section>
            <SectionTitle eyebrow="Steady-state" title="Measured at the load" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              <Metric label="Vo avg"    value={m.Vavg.toFixed(2)} unit="V" color="var(--vo)" />
              <Metric label="Vo rms"    value={m.Vrms.toFixed(2)} unit="V" color="var(--vo)" />
              <Metric label="Io avg"    value={m.Iavg.toFixed(3)} unit="A" color="var(--io)" />
              <Metric label="Io rms"    value={m.Irms.toFixed(3)} unit="A" color="var(--io)" />
              <Metric label="Ripple"    value={(m.ripplePct).toFixed(1)} unit="%" />
              <Metric label="γ cond."   value={m.conductionAngleDeg.toFixed(0)} unit="°" />
              <Metric label="Vo theory (CCM)" value={m.VavgTheory.toFixed(2)} unit="V" />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              For continuous conduction: V<sub>o,avg</sub> = (2·V<sub>m</sub>/π)·cos(α). The simulator integrates the actual differential equation so values may differ from theory when conduction is discontinuous (small L, large α, or large E).
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>{eyebrow}</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 3, background: color, borderRadius: 1 }} />
      <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{label}</span>
    </span>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
