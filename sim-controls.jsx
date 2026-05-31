/* global React */
const { useState: _useStateC } = React;

function Field({ label, unit, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</span>
        {unit && <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{unit}</span>}
      </div>
      {children}
      {hint && <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{hint}</span>}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
      />
      <span className="mono" style={{ minWidth: 72, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
        {Number.isInteger(step) ? value : value.toFixed(step >= 1 ? 0 : -Math.log10(step))}{suffix ? ' ' + suffix : ''}
      </span>
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', background: 'var(--bg)',
      border: '1px solid var(--rule)', borderRadius: 6, padding: 2,
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            border: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 4,
            background: value === opt.value ? 'var(--panel)' : 'transparent',
            color: value === opt.value ? 'var(--ink)' : 'var(--ink-2)',
            boxShadow: value === opt.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            fontWeight: value === opt.value ? 600 : 500,
            fontSize: 12,
            fontFamily: 'inherit',
            transition: 'all 120ms',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Controls({ state, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Field label="Load type">
        <Segmented
          value={state.load}
          onChange={(v) => set({ load: v })}
          options={[
            { value: 'R', label: 'R' },
            { value: 'RL', label: 'R + L' },
            { value: 'RLE', label: 'R + L + E' },
          ]}
        />
      </Field>

      <Field label="Firing angle α" unit="degrees">
        <Slider value={state.alphaDeg} min={0} max={180} step={1} onChange={(v) => set({ alphaDeg: v })} suffix="°" />
      </Field>

      <Field label="Peak source voltage Vm" unit="volts">
        <Slider value={state.Vm} min={10} max={400} step={1} onChange={(v) => set({ Vm: v })} suffix="V" />
      </Field>

      <Field label="Line frequency f" unit="hertz">
        <Slider value={state.f} min={20} max={400} step={1} onChange={(v) => set({ f: v })} suffix="Hz" />
      </Field>

      <Field label="Resistance R" unit="ohms">
        <Slider value={state.R} min={0.5} max={100} step={0.5} onChange={(v) => set({ R: v })} suffix="Ω" />
      </Field>

      {state.load !== 'R' && (
        <Field label="Inductance L" unit="millihenries">
          <Slider value={state.L * 1000} min={1} max={500} step={1} onChange={(v) => set({ L: v / 1000 })} suffix="mH" />
        </Field>
      )}

      {state.load === 'RLE' && (
        <Field label="Back-EMF E" unit="volts" hint="DC motor armature or battery emf">
          <Slider value={state.E} min={-200} max={200} step={1} onChange={(v) => set({ E: v })} suffix="V" />
        </Field>
      )}
    </div>
  );
}

Object.assign(window, { Controls, Field });
