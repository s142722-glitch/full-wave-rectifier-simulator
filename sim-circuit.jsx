/* global React */
const { useMemo } = React;

// SVG circuit diagram of a single-phase fully-controlled bridge rectifier.
// Animates: which thyristor pair is conducting at time t (highlighted),
// current arrow direction, and shows the load type.

function Thyristor({ x, y, rot = 0, on = false, label }) {
  // Thyristor symbol: triangle + bar + gate stub
  // Drawn pointing up by default (anode at top).
  const color = on ? 'var(--accent)' : 'var(--ink)';
  const glow = on ? 'drop-shadow(0 0 4px rgba(193,74,26,0.55))' : 'none';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} style={{ filter: glow }}>
      {/* anode lead */}
      <line x1="0" y1="-22" x2="0" y2="-10" stroke={color} strokeWidth="1.6" />
      {/* triangle (anode->cathode pointing down) */}
      <polygon points="-9,-10 9,-10 0,5" fill={on ? 'var(--accent)' : 'none'} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {/* cathode bar */}
      <line x1="-9" y1="5" x2="9" y2="5" stroke={color} strokeWidth="2" />
      {/* cathode lead */}
      <line x1="0" y1="5" x2="0" y2="20" stroke={color} strokeWidth="1.6" />
      {/* gate */}
      <line x1="9" y1="-2" x2="18" y2="-8" stroke={color} strokeWidth="1.2" />
      <text x="22" y="-6" fontSize="10" fill="var(--ink-2)" className="mono">{label}</text>
    </g>
  );
}

function CircuitDiagram({ result, tNow }) {
  const { params, samples } = result;
  const { alpha, omega, T } = params;
  const tMod = ((tNow % T) + T) % T;
  // Determine which pair is conducting at tNow
  const idx = Math.min(samples.length - 1, Math.round((tMod / T) * (samples.length - 1)));
  const s = samples[idx];
  const conducting = Math.abs(s.io) > 1e-4 || s.vo !== 0;
  // pair sign: positive if vs>0 and conducting, negative if vs<0 and conducting
  let pairPos = false, pairNeg = false;
  if (conducting) {
    if (s.vs >= 0) pairPos = true; else pairNeg = true;
    // edge case when vs near zero but inductor keeps current going
    // Use vs sign at firing reference: if tMod between α/ω and (π+α)/ω -> T1T2, else T3T4
    const omegaT = omega * tMod;
    const aShifted = (omegaT - alpha + 2 * Math.PI) % (2 * Math.PI);
    if (aShifted < Math.PI) { pairPos = true; pairNeg = false; }
    else { pairPos = false; pairNeg = true; }
  }

  // Layout coordinates
  // Source on the left, bridge in the middle, load on the right
  return (
    <svg viewBox="0 0 520 280" width="100%" style={{ maxHeight: 280 }}>
      {/* Background grid */}
      <defs>
        <pattern id="cgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--rule-2)" strokeWidth="0.5" />
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--io)" />
        </marker>
      </defs>
      <rect width="520" height="280" fill="url(#cgrid)" />

      {/* AC source */}
      <g transform="translate(60 140)">
        <circle cx="0" cy="0" r="22" fill="var(--panel)" stroke="var(--ink)" strokeWidth="1.6" />
        <path d="M -12 0 Q -6 -10 0 0 T 12 0" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
        <text x="0" y="40" fontSize="11" textAnchor="middle" className="mono" fill="var(--ink-2)">vs</text>
        <text x="0" y="-32" fontSize="10" textAnchor="middle" fill="var(--ink-3)">AC</text>
      </g>

      {/* Wires from source to bridge nodes A (top) and B (bottom) */}
      {/* Node A at (220, 80), Node B at (220, 200) */}
      <line x1="82" y1="140" x2="120" y2="140" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="120" y1="140" x2="120" y2="80" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="120" y1="140" x2="120" y2="200" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="120" y1="80" x2="220" y2="80" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="120" y1="200" x2="220" y2="200" stroke="var(--ink)" strokeWidth="1.6" />
      <circle cx="220" cy="80" r="2.5" fill="var(--ink)" />
      <circle cx="220" cy="200" r="2.5" fill="var(--ink)" />
      <text x="210" y="74" fontSize="10" className="mono" fill="var(--ink-3)" textAnchor="end">A</text>
      <text x="210" y="216" fontSize="10" className="mono" fill="var(--ink-3)" textAnchor="end">B</text>

      {/* Bridge: 4 thyristors arranged in diamond */}
      {/* T1: A -> P (top-left -> top-right top rail) */}
      {/* Top rail P at (340, 60), bottom rail N at (340, 220) */}
      {/* T1 connects A(220,80) -> P(340,60) — but typical bridge layout: */}
      {/* We'll lay out as: P-top, A-left, N-bottom, B-right but use convention: */}
      {/* T1 anode=A, cathode=P;  T2 anode=N, cathode=B;  T3 anode=B, cathode=P;  T4 anode=N, cathode=A */}

      {/* Bridge nodes */}
      {/* Top rail P (340, 60), Bottom rail N (340, 220) */}
      {/* We'll draw rails and thyristors between them */}
      <line x1="280" y1="60" x2="400" y2="60" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="280" y1="220" x2="400" y2="220" stroke="var(--ink)" strokeWidth="1.6" />

      {/* T1: anode at A side (left top going to top rail) */}
      <line x1="220" y1="80" x2="280" y2="80" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="280" y1="80" x2="280" y2="60" stroke="var(--ink)" strokeWidth="1.6" />
      {/* Wait — clearer to lay thyristors in slanted lines. Let's redo with cleaner layout */}
    </svg>
  );
}

// Cleaner second attempt — replace the export
function CircuitDiagramClean({ result, tNow }) {
  const { params, samples } = result;
  const { alpha, omega, T, load } = params;
  const tMod = ((tNow % T) + T) % T;
  const idx = Math.min(samples.length - 1, Math.round((tMod / T) * (samples.length - 1)));
  const s = samples[idx];

  // Which pair is conducting?
  let pair = 'none'; // 'pos' = T1T2, 'neg' = T3T4
  if (Math.abs(s.io) > 1e-4) {
    const omegaT = omega * tMod;
    const aShifted = (omegaT - alpha + 4 * Math.PI) % (2 * Math.PI);
    pair = aShifted < Math.PI ? 'pos' : 'neg';
  }

  // Geometry
  // Source: x≈70, y center 160
  // Bridge: top node P(320,70), bottom N(320,250), left A(220,160), right B(420,160)
  // Load: right of bridge, between top rail and bottom rail
  // Actually conventional bridge: source between A and B (left and right vertical mid-points),
  // load between P (top) and N (bottom).
  const P = { x: 320, y: 70 };
  const N = { x: 320, y: 250 };
  const A = { x: 220, y: 160 };
  const B = { x: 420, y: 160 };

  // Thyristors:
  // T1: A -> P  (conducts on positive half with T2)
  // T2: N -> B  (conducts on positive half with T1)
  // T3: B -> P  (conducts on negative half with T4)
  // T4: N -> A  (conducts on negative half with T3)
  const T1on = pair === 'pos';
  const T2on = pair === 'pos';
  const T3on = pair === 'neg';
  const T4on = pair === 'neg';

  // Helper to draw a thyristor along a line from p1 to p2
  function Th({ p1, p2, on, label }) {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    // Thyristor pointing from p1 (anode) to p2 (cathode), so rotate so that "down" axis aligns with p1->p2.
    // Our Thyristor component is drawn with anode at top (y=-22) and cathode at bottom (y=20).
    // So we need to rotate it so its local +Y points along (dx,dy). Default +Y points down (angle 90°).
    // Rotation = angle - 90.
    return (
      <Thyristor x={mx} y={my} rot={angle - 90} on={on} label={label} />
    );
  }

  // Determine output current path color
  const ioMag = Math.abs(s.io);
  const ioActive = ioMag > 1e-4;

  return (
    <svg viewBox="0 0 560 340" width="100%" style={{ maxHeight: 340 }}>
      <defs>
        <pattern id="cgrid2" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--rule-2)" strokeWidth="0.5" />
        </pattern>
        <marker id="arrI" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--io)" />
        </marker>
      </defs>
      <rect width="560" height="340" fill="url(#cgrid2)" />

      {/* Bridge wires (drawn first, beneath thyristors) */}
      {/* From A to P (T1 sits on this line), A to N (T4), B to P (T3), B to N (T2) */}
      <line x1={A.x} y1={A.y} x2={P.x} y2={P.y} stroke="var(--ink)" strokeWidth="1.6" />
      <line x1={A.x} y1={A.y} x2={N.x} y2={N.y} stroke="var(--ink)" strokeWidth="1.6" />
      <line x1={B.x} y1={B.y} x2={P.x} y2={P.y} stroke="var(--ink)" strokeWidth="1.6" />
      <line x1={B.x} y1={B.y} x2={N.x} y2={N.y} stroke="var(--ink)" strokeWidth="1.6" />

      {/* Source on the left */}
      <line x1="90" y1={A.y} x2={A.x} y2={A.y} stroke="var(--ink)" strokeWidth="1.6" />
      <g transform={`translate(70 ${A.y})`}>
        <circle cx="0" cy="0" r="20" fill="var(--panel)" stroke="var(--ink)" strokeWidth="1.6" />
        <path d="M -10 0 Q -5 -8 0 0 T 10 0" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
        <text x="-30" y="5" fontSize="12" className="mono" fill="var(--vs)" fontWeight="600">vs</text>
        <text x="0" y="38" fontSize="10" textAnchor="middle" fill="var(--ink-3)" className="mono">~ Vm sin(ωt)</text>
      </g>
      {/* Source 'other terminal' — implicit, the bottom node returns via B side */}
      {/* Actually for clarity: AC source goes between A and B. Draw a wire from source bottom to B. */}
      <line x1="70" y1="180" x2="70" y2="270" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="70" y1="270" x2={B.x} y2="270" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1={B.x} y1="270" x2={B.x} y2={B.y} stroke="var(--ink)" strokeWidth="1.6" />

      {/* Connection dots at A and B */}
      <circle cx={A.x} cy={A.y} r="3" fill="var(--ink)" />
      <circle cx={B.x} cy={B.y} r="3" fill="var(--ink)" />
      <circle cx={P.x} cy={P.y} r="3" fill="var(--ink)" />
      <circle cx={N.x} cy={N.y} r="3" fill="var(--ink)" />

      {/* Thyristors */}
      <Th p1={A} p2={P} on={T1on} label="T1" />
      <Th p1={N} p2={B} on={T2on} label="T2" />
      <Th p1={B} p2={P} on={T3on} label="T3" />
      <Th p1={N} p2={A} on={T4on} label="T4" />

      {/* Load on the right */}
      <line x1={P.x} y1={P.y} x2="490" y2={P.y} stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="490" y1={P.y} x2="490" y2="120" stroke="var(--ink)" strokeWidth="1.6" />
      {/* Load box */}
      <g transform="translate(465 120)">
        {/* Resistor (zigzag) */}
        <path d="M 25 0 L 30 -5 L 40 5 L 50 -5 L 60 5 L 65 0" fill="none" stroke="var(--ink)" strokeWidth="1.6" transform="translate(-20 0) rotate(90) translate(-30 0)" />
        {/* Easier: vertical resistor zigzag */}
      </g>
      {/* Draw load components vertically between (490, 120) and (490, 250) -> wire to N(320,250) */}
      <ResistorVert x={490} y1={120} y2={170} label={`R = ${result.params.R} Ω`} />
      {load !== 'R' && <InductorVert x={490} y1={170} y2={210} label={`L = ${result.params.L*1000} mH`} />}
      {load === 'RLE' && <BatteryVert x={490} y1={210} y2={245} label={`E = ${result.params.E} V`} />}
      {/* If load is just R, fill the gap with wire */}
      {load === 'R' && <line x1="490" y1="170" x2="490" y2="245" stroke="var(--ink)" strokeWidth="1.6" />}
      {load === 'RL' && <line x1="490" y1="210" x2="490" y2="245" stroke="var(--ink)" strokeWidth="1.6" />}
      {/* Return wire from load bottom to N */}
      <line x1="490" y1="245" x2="490" y2="290" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1="490" y1="290" x2={N.x} y2="290" stroke="var(--ink)" strokeWidth="1.6" />
      <line x1={N.x} y1="290" x2={N.x} y2={N.y} stroke="var(--ink)" strokeWidth="1.6" />

      {/* Vo label across load (between top rail and bottom rail) */}
      <g>
        <line x1="450" y1={P.y} x2="450" y2={N.y} stroke="var(--vo)" strokeDasharray="3 3" strokeWidth="1" opacity="0.8" />
        <text x="446" y={(P.y + N.y) / 2} fontSize="13" textAnchor="end" className="mono" fill="var(--vo)" fontWeight="600">+ vo −</text>
      </g>

      {/* Io arrow on the top rail to the load */}
      <g opacity={ioActive ? 1 : 0.25}>
        <line x1="370" y1={P.y - 14} x2="430" y2={P.y - 14} stroke="var(--io)" strokeWidth="1.8" markerEnd="url(#arrI)" />
        <text x="400" y={P.y - 20} fontSize="12" textAnchor="middle" className="mono" fill="var(--io)" fontWeight="600">io</text>
      </g>

      {/* Live readout */}
      <g transform="translate(20 320)">
        <text x="0" y="0" fontSize="10" className="mono" fill="var(--ink-3)">
          ωt = {((omega * tMod) * 180 / Math.PI).toFixed(0)}°  ·  vs = {s.vs.toFixed(1)} V  ·  vo = {s.vo.toFixed(1)} V  ·  io = {s.io.toFixed(2)} A  ·  conducting: <tspan fill="var(--accent)" fontWeight="600">{pair === 'pos' ? 'T1 + T2' : pair === 'neg' ? 'T3 + T4' : '—'}</tspan>
        </text>
      </g>
    </svg>
  );
}

function ResistorVert({ x, y1, y2, label }) {
  // Vertical zigzag resistor from (x, y1) to (x, y2)
  const segs = 6;
  const dy = (y2 - y1) / segs;
  let path = `M ${x} ${y1}`;
  for (let i = 0; i < segs; i++) {
    const dx = i % 2 === 0 ? 7 : -7;
    path += ` L ${x + dx} ${y1 + dy * (i + 0.5)}`;
  }
  path += ` L ${x} ${y2}`;
  return (
    <g>
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <text x={x + 14} y={(y1 + y2) / 2 + 4} fontSize="10" className="mono" fill="var(--ink-2)">{label}</text>
    </g>
  );
}
function InductorVert({ x, y1, y2, label }) {
  // Vertical inductor: series of small arcs
  const coils = 4;
  const dy = (y2 - y1) / coils;
  const r = dy / 2;
  let path = `M ${x} ${y1}`;
  for (let i = 0; i < coils; i++) {
    const cy1 = y1 + i * dy;
    const cy2 = y1 + (i + 1) * dy;
    path += ` A ${r} ${r} 0 0 1 ${x} ${cy2}`;
  }
  return (
    <g>
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <text x={x + 14} y={(y1 + y2) / 2 + 4} fontSize="10" className="mono" fill="var(--ink-2)">{label}</text>
    </g>
  );
}
function BatteryVert({ x, y1, y2, label }) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={mid - 6} stroke="var(--ink)" strokeWidth="1.6" />
      {/* long plate (+) on top */}
      <line x1={x - 10} y1={mid - 6} x2={x + 10} y2={mid - 6} stroke="var(--ink)" strokeWidth="2" />
      {/* short plate (-) below */}
      <line x1={x - 5} y1={mid + 2} x2={x + 5} y2={mid + 2} stroke="var(--ink)" strokeWidth="2" />
      <line x1={x} y1={mid + 2} x2={x} y2={y2} stroke="var(--ink)" strokeWidth="1.6" />
      <text x={x + 14} y={mid + 4} fontSize="10" className="mono" fill="var(--ink-2)">{label}</text>
    </g>
  );
}

Object.assign(window, { CircuitDiagram: CircuitDiagramClean, Thyristor });
