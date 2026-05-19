// Web Speech API – polski głos, wymowa cyfr i pojedynczych słów.
const Speech = (() => {
  const supported = 'speechSynthesis' in window;
  let voice = null;

  const DIGIT_WORDS = {
    '0': 'zero', '1': 'jeden', '2': 'dwa', '3': 'trzy', '4': 'cztery',
    '5': 'pięć', '6': 'sześć', '7': 'siedem', '8': 'osiem', '9': 'dziewięć',
  };

  function pickVoice() {
    if (!supported) return;
    const voices = speechSynthesis.getVoices();
    voice = voices.find(v => v.lang === 'pl-PL')
        || voices.find(v => v.lang && v.lang.startsWith('pl'))
        || null;
  }

  if (supported) {
    pickVoice();
    // Niektóre przeglądarki ładują głosy asynchronicznie.
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function buildUtter(text, { rate = 1, pitch = 1 } = {}) {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = 'pl-PL';
    u.rate = rate;
    u.pitch = pitch;
    return u;
  }

  function say(text, opts = {}) {
    if (!supported || !text) return;
    if (opts.cancel !== false) speechSynthesis.cancel();
    const u = buildUtter(text, opts);
    if (opts.onEnd) u.onend = opts.onEnd;
    speechSynthesis.speak(u);
  }

  // Pojedyncza cyfra – kasuje poprzednie (żeby przy szybkim klikaniu nie kumulowało się).
  function sayDigit(d) {
    if (!supported) return;
    const w = DIGIT_WORDS[d];
    if (!w) return;
    say(w, { cancel: true, rate: 1.1 });
  }

  // Cały numer – cyfra po cyfrze z naturalną pauzą (przecinki).
  function sayNumber(numStr, opts = {}) {
    if (!supported) return;
    const words = String(numStr).split('').map(d => DIGIT_WORDS[d]).filter(Boolean).join(', ');
    if (!words) return;
    say(words, { cancel: true, rate: opts.rate || 0.85, onEnd: opts.onEnd });
  }

  function cancel() {
    if (supported) speechSynthesis.cancel();
  }

  return { say, sayDigit, sayNumber, cancel, isSupported: () => supported };
})();
