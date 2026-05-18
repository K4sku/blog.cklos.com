// Proste dźwięki generowane przez Web Audio API – nie wymagają plików.
const Sounds = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.18, when = 0) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // odpowiada za "odblokowanie" dźwięku po pierwszym geście użytkownika (iOS)
  function unlock() { ensure(); }

  // Częstotliwości a la DTMF, ale uproszczone i przyjemniejsze dla ucha dziecka.
  const KEY_FREQS = [523, 587, 659, 698, 784, 880, 988, 1046, 1175, 1318];

  return {
    unlock,
    key(d) {
      const i = parseInt(d, 10);
      const f = Number.isFinite(i) ? KEY_FREQS[i] : 600;
      tone(f, 0.12, 'sine', 0.18);
    },
    click() { tone(700, 0.05, 'square', 0.08); },
    pop() { tone(900, 0.08, 'sine', 0.18); },
    snap() { tone(660, 0.1, 'triangle', 0.18); tone(880, 0.12, 'triangle', 0.14, 0.06); },
    success() {
      tone(523, 0.14, 'sine', 0.2, 0);    // C5
      tone(659, 0.14, 'sine', 0.2, 0.12); // E5
      tone(784, 0.18, 'sine', 0.22, 0.24);// G5
      tone(1047, 0.3, 'sine', 0.22, 0.42);// C6
    },
    fail() {
      tone(280, 0.18, 'sawtooth', 0.16, 0);
      tone(180, 0.3, 'sawtooth', 0.16, 0.16);
    },
  };
})();
