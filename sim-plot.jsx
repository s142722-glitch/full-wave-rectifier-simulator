/* global React */
const useMemo = React.useMemo;

// Waveform plot — three stacked axes (vs, vo, io), shared x in degrees of ωt.
// Renders as SVG. A moving cursor line indicates the current time.

function WaveformPlot({ result, tNow, periods = 2 }) {
  const { samples, params } = result;
  const { T, omega, Vm } = params;
  const totalT = T * periods;

  // Build extended sample array across N periods
  const extended = useMemo(() => {
    const N = samples.length - 1;
    const arr = [];
    for (let p = 0; p < periods; p++) {
      for (let k = 0; k < N; k++) {
        const s = samples[k];
        arr.push({ t: s.t + p * T, vs: s.vs, vo: s.vo, io: s.io });
      }
    }
    // last point
    const last = samples[N];
    arr.push({ t: last.t + (periods - 1) * T, vs: last.vs, vo: last.vo, io: last.io });
    return arr;
  }, [samples, periods, T]);

  // Bounds
  const vMax = Math.max(Vm, ...extended.map(p => Math.max(Math.abs(p.vs), Math.abs(p.vo)))) * 1.1;
  const iMax = Math.max(0.01, ...extended.map(p => Math.abs(p.io))) * 1.15;

  // SVG geometry
  const W = 640;
  const H = 360;
  const padL = 56, padR = 16, padT = 18, padB = 28;
  const plotW = W - padL - padR;
  const rowH = (H - padT - padB) / 3;
  const gap = 8;

  const xOf = (t) => padL + (t / totalT) * plotW;
  const yOfRow = (row) => padT + row * rowH;

  // y-scalers
  const yV = (v, row) => yOfRow(row) + (rowH - gap) / 2 - (v / vMax) * ((rowH - gap) / 2);
  const yI = (i, row) => yOfRow(row) + (rowH - gap) / 2 - (i / iMax) * ((rowH - gap) / 2);

  // Build paths
  const pathVs = useMemo(() => {
    let d = '';
    for (let k = 0; k < extended.length; k++) {
      const p = extended[k];
      d += (k === 0 ? 'M' : 'L') + xOf(p.t) + ',' + yV(p.vs, 0);
    }
    return d;
  }, [extended]);
  const pathVo = useMemo(() => {
    let d = '';
    for (let k = 0; k < extended.length; k++) {
      const p = extended[k];
      d += (k === 0 ? 'M' : 'L') + xOf(p.t) + ',' + yV(p.vo, 1);
    }
    return d;
  }, [extended]);
  const pathIo = useMemo(() => {
    let d = '';
    for (let k = 0; k < extended.length; k++) {
      const p = extended[k];
      d += (k === 0 ? 'M' : 'L') + xOf(p.t) + ',' + yI(p.io, 2);
    }
    return d;
  }, [extended]);

  // Fill area under vo (shows rectified energy) and under io
  const fillVo = useMemo(() => {
    let d = '';
    const baseY = yV(0, 1);
    for (let k = 0; k < extended.length; k++) {
      const p = extended[k];
      d += (k === 0 ? 'M' : 'L') + xOf(p.t) + ',' + yV(p.vo, 1);
    }
    d += ` L ${xOf(extended[extended.length - 1].t)},${baseY} L ${xOf(extended[0].t)},${baseY} Z`;
    return d;
  }, [extended]);
  const fillIo = useMemo(() => {
    let d = '';
    const baseY = yI(0, 2);
    for (let k = 0; k < extended.length; k++) {
      const p = extended[k];
      d += (k === 0 ? 'M' : 'L') + xOf(p.t) + ',' + yI(p.io, 2);
    }
    d += ` L ${xOf(extended[extended.length - 1].t)},${baseY} L ${xOf(extended[0].t)},${baseY} Z`;
    return d;
  }, [extended]);

  // X gridlines every 30° = T/12
  const xTicks = [];
  for (let p = 0; p <= periods; p++) {
    for (let deg = 0; deg < 360; deg += 60) {
      const t = p * T + (deg / 360) * T;
      if (t > totalT + 1e-9) break;
      xTicks.push({ t, deg: p * 360 + deg });
    }
  }
  xTicks.push({ t: totalT, deg: periods * 360 });

  // Firing instants
  const firing = [];
  for (let p = 0; p < periods; p++) {
    firing.push(p * T + (params.alpha / omega));
    firing.push(p * T + (Math.PI + params.alpha) / omega);
  }

  // Cursor at tNow
  const tCursor = ((tNow % totalT) + totalT) % totalT;

  const rows = [
    { label: 'vs (V)', color: 'var(--vs)', y0: yV(0, 0), max: vMax },
    { label: 'vo (V)', color: 'var(--vo)', y0: yV(0, 1), max: vMax },
    { label: 'io (A)', color: 'var(--io)', y0: yI(0, 2), max: iMax },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* Row backgrounds */}
      {rows.map((r, i) => (
        <rect key={i} x={padL} y={yOfRow(i)} width={plotW} height={rowH - gap} fill="var(--panel)" stroke="var(--rule)" strokeWidth="0.5" />
      ))}

      {/* X gridlines */}
      {xTicks.map((tk, i) => (
        <g key={i}>
          {rows.map((r, ri) => (
            <line key={ri} x1={xOf(tk.t)} y1={yOfRow(ri)} x2={xOf(tk.t)} y2={yOfRow(ri) + rowH - gap} stroke="var(--grid)" strokeWidth="0.5" />
          ))}
          <text x={xOf(tk.t)} y={H - padB + 14} fontSize="9" textAnchor="middle" className="mono" fill="var(--ink-3)">
            {tk.deg}°
          </text>
        </g>
      ))}

      {/* Zero axes */}
      {rows.map((r, i) => (
        <line key={i} x1={padL} y1={r.y0} x2={W - padR} y2={r.y0} stroke="var(--grid-axis)" strokeWidth="0.6" />
      ))}

      {/* Firing instant vertical lines */}
      {firing.map((tf, i) => (
        <g key={i}>
          {rows.map((r, ri) => (
            <line key={ri} x1={xOf(tf)} y1={yOfRow(ri)} x2={xOf(tf)} y2={yOfRow(ri) + rowH - gap} stroke="var(--accent)" strokeDasharray="2 3" strokeWidth="0.8" opacity="0.55" />
          ))}
        </g>
      ))}

      {/* Fills */}
      <path d={fillVo} fill="var(--vo)" opacity="0.12" />
      <path d={fillIo} fill="var(--io)" opacity="0.12" />

      {/* Traces */}
      <path d={pathVs} fill="none" stroke="var(--vs)" strokeWidth="1.8" />
      <path d={pathVo} fill="none" stroke="var(--vo)" strokeWidth="1.8" />
      <path d={pathIo} fill="none" stroke="var(--io)" strokeWidth="1.8" />

      {/* Cursor */}
      {rows.map((r, i) => (
        <line key={i} x1={xOf(tCursor)} y1={yOfRow(i)} x2={xOf(tCursor)} y2={yOfRow(i) + rowH - gap} stroke="var(--ink)" strokeWidth="0.8" opacity="0.55" />
      ))}

      {/* Y labels & scale */}
      {rows.map((r, i) => (
        <g key={i}>
          <text x={padL - 8} y={yOfRow(i) + 12} fontSize="11" textAnchor="end" className="mono" fill={r.color} fontWeight="600">{r.label}</text>
          <text x={padL - 8} y={yOfRow(i) + (rowH - gap) / 2 + 4} fontSize="9" textAnchor="end" className="mono" fill="var(--ink-3)">0</text>
          <text x={padL - 8} y={yOfRow(i) + 22 + 4} fontSize="9" textAnchor="end" className="mono" fill="var(--ink-3)">+{r.max.toFixed(r.max < 5 ? 2 : 0)}</text>
          <text x={padL - 8} y={yOfRow(i) + rowH - gap - 6} fontSize="9" textAnchor="end" className="mono" fill="var(--ink-3)">−{r.max.toFixed(r.max < 5 ? 2 : 0)}</text>
        </g>
      ))}

      {/* X axis label */}
      <text x={W / 2} y={H - 2} fontSize="10" textAnchor="middle" className="mono" fill="var(--ink-3)">ωt (degrees)</text>
    </svg>
  );
}

Object.assign(window, { WaveformPlot });
