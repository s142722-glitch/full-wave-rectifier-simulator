// Numerical simulation of a single-phase fully-controlled full-wave bridge rectifier.
// Loads: 'R' (resistive), 'RL' (inductive), 'RLE' (with back-EMF, e.g. motor / battery).
//
// Circuit:
//   vs(t) = Vm * sin(ωt)
//   When a thyristor pair conducts, vo = |vs|; the load equation is
//       L * di/dt + R * i + E = vo
//   Conduction starts at firing angle α each half cycle (T1T2 at α, T3T4 at π+α).
//   In a fully-controlled bridge, a pair conducts until either:
//     (a) the next pair is fired and forces commutation, OR
//     (b) the current naturally reaches zero (discontinuous conduction).
//
// The simulator integrates with RK4 over one period, iterating the initial current
// until steady-state (i(0) = i(T)) is reached.

(function () {
  function simulate(params) {
    const {
      Vm = 100,        // peak source voltage [V]
      f = 50,          // line frequency [Hz]
      alphaDeg = 30,   // firing angle [°]
      load = 'RL',     // 'R' | 'RL' | 'RLE'
      R = 10,          // resistance [Ω]
      L = 0.05,        // inductance [H]   (ignored if load === 'R')
      E = 0,           // back-EMF [V]     (ignored unless load === 'RLE')
      N = 2000,        // samples per period
    } = params;

    const omega = 2 * Math.PI * f;
    const T = 1 / f;
    const dt = T / N;
    const alpha = (alphaDeg * Math.PI) / 180;

    const Leff = load === 'R' ? 0 : Math.max(L, 0);
    const Eeff = load === 'RLE' ? E : 0;

    const vs = (t) => Vm * Math.sin(omega * t);

    // Firing instants within one period (T): α/ω and (π+α)/ω
    const tf1 = alpha / omega;
    const tf2 = (Math.PI + alpha) / omega;

    // For a given t, compute |vs| with sign of the pair that *was last fired*.
    // We track conduction state as: gateOn (boolean) + sign (+1 or -1)
    // Pair sign: T1T2 conducts on positive half (sign +1), T3T4 on negative half (sign -1).
    // vo = sign * vs when conducting (which equals |vs| during natural conduction window).
    // When inductive load forces conduction past π, vs goes negative; vo = +vs (negative!),
    // i.e. output voltage can go negative briefly. That's correct for a bridge.

    // We'll run the simulation with state (i, gateOn, sign) sampled at dt intervals.
    // To find steady-state initial current i0, iterate the period a few times.

    function di_dt(i, vo) {
      if (load === 'R') {
        // Pure resistive: there's no L term; this function isn't used (we set i directly).
        return 0;
      }
      return (vo - R * i - Eeff) / Leff;
    }

    function runOnePeriod(i0) {
      const samples = new Array(N + 1);
      let i = i0;
      let sign = +1;            // most recently fired pair direction
      let conducting = false;   // is any pair currently on?
      // We start at t=0. The most recently fired pair before t=0 is T3T4 (sign -1)
      // at t = tf2 - T (i.e. firing in the previous period). For steady state this is fine.
      // To bootstrap correctly: assume at t=0 we're in the tail of T3T4 conduction.
      sign = -1;
      conducting = i0 !== 0 || alpha === 0; // assume on if any current

      for (let k = 0; k <= N; k++) {
        const t = k * dt;

        // --- Fire events: if t crosses a firing instant, switch pair ---
        // We check at the start of each step.
        const tmod = t; // already within [0, T]
        // Fire T1T2 at tf1:
        if (
          (k > 0 && (k - 1) * dt < tf1 && t >= tf1) ||
          (k === 0 && tf1 === 0)
        ) {
          sign = +1;
          conducting = true;
        }
        // Fire T3T4 at tf2:
        if (k > 0 && (k - 1) * dt < tf2 && t >= tf2) {
          sign = -1;
          conducting = true;
        }

        // Compute vo for this instant (before integrating)
        const vsNow = vs(t);
        let voNow = conducting ? sign * vsNow : Eeff; // when off, vo "floats"; we plot E for RLE, 0 otherwise
        if (!conducting && load !== 'RLE') voNow = 0;

        // If R-only load: current follows vo/R instantly while conducting.
        if (load === 'R') {
          if (conducting) {
            // Natural turn-off when sign*vs goes <= 0 (current would reverse, but thyristor blocks)
            if (sign * vsNow <= 0) {
              conducting = false;
              i = 0;
              voNow = 0;
            } else {
              i = vsNow * sign / R;
            }
          } else {
            i = 0;
          }
          samples[k] = { t, vs: vsNow, vo: voNow, io: i };
          continue;
        }

        // RL / RLE: integrate with RK4 across [t, t+dt] assuming conducting state holds.
        samples[k] = { t, vs: vsNow, vo: voNow, io: i };

        if (k === N) break;

        if (conducting) {
          const vAt = (tt) => {
            const v = Vm * Math.sin(omega * tt);
            return sign * v;
          };
          const f1 = di_dt(i, vAt(t));
          const f2 = di_dt(i + 0.5 * dt * f1, vAt(t + 0.5 * dt));
          const f3 = di_dt(i + 0.5 * dt * f2, vAt(t + 0.5 * dt));
          const f4 = di_dt(i + dt * f3, vAt(t + dt));
          let iNext = i + (dt / 6) * (f1 + 2 * f2 + 2 * f3 + f4);

          // If current would go negative -> natural turn-off at zero-crossing
          if (iNext < 0) {
            iNext = 0;
            conducting = false;
          }
          i = iNext;
        } else {
          // Off: i stays 0 (for RLE we assume thyristors block any reverse current too)
          i = 0;
        }
      }

      return samples;
    }

    // --- Steady-state: iterate periods until i(0) ≈ i(T) ---
    let i0 = 0;
    let samples = null;
    for (let iter = 0; iter < 40; iter++) {
      samples = runOnePeriod(i0);
      const iEnd = samples[N].io;
      if (Math.abs(iEnd - i0) < 1e-5) break;
      i0 = iEnd;
    }

    // --- Aggregate metrics ---
    let voSum = 0, voSqSum = 0;
    let ioSum = 0, ioSqSum = 0;
    let conducting = 0;
    for (let k = 0; k < N; k++) {
      const s = samples[k];
      voSum += s.vo;
      voSqSum += s.vo * s.vo;
      ioSum += s.io;
      ioSqSum += s.io * s.io;
      if (Math.abs(s.io) > 1e-6) conducting++;
    }
    const Vavg = voSum / N;
    const Vrms = Math.sqrt(voSqSum / N);
    const Iavg = ioSum / N;
    const Irms = Math.sqrt(ioSqSum / N);
    const conductionFrac = conducting / N; // fraction of period current flows
    // For a bridge there are two conduction intervals per period -> conduction angle per half:
    const conductionAngleDeg = conductionFrac * 360 / 2;
    const ripple = Vavg !== 0 ? Math.sqrt(Math.max(Vrms * Vrms - Vavg * Vavg, 0)) / Vavg : 0;

    // Theoretical (continuous-conduction) average for fully controlled bridge:
    //   Vavg_cc = (2 * Vm / π) * cos(α)
    const VavgTheory = (2 * Vm / Math.PI) * Math.cos(alpha);

    return {
      samples,
      params: { Vm, f, alphaDeg, load, R, L, E, N, T, omega, alpha },
      metrics: {
        Vavg, Vrms, Iavg, Irms,
        conductionAngleDeg,
        ripplePct: ripple * 100,
        VavgTheory,
      },
    };
  }

  window.RectifierSim = { simulate };
})();
