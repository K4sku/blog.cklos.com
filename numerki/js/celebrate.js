// Animacja nagrody: emoji spadające z góry + napis "Brawo!" + duża maskotka.
const Celebrate = (() => {
  const EMOJIS = ['🎉', '🌟', '⭐', '🎊', '✨', '🥳', '🎈', '💛', '💙', '❤️'];
  const BRAVOS = ['Brawo!', 'Super!', 'Tak!', 'Ekstra!', 'Hura!'];
  const MASCOTS = ['🐶', '🐱', '🐼', '🦊', '🐯', '🦁', '🐵'];

  function show({ onDone } = {}) {
    const bravo = BRAVOS[Math.floor(Math.random() * BRAVOS.length)];
    Sounds.success();
    Speech.say(bravo, { rate: 1.05, pitch: 1.2 });

    const layer = document.createElement('div');
    layer.className = 'celebrate';

    const count = 36;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'piece-emoji';
      el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      el.style.left = Math.random() * 100 + '%';
      const duration = 1.6 + Math.random() * 1.8;
      const delay = Math.random() * 0.6;
      el.style.animationDuration = duration + 's';
      el.style.animationDelay = delay + 's';
      el.style.fontSize = (28 + Math.random() * 36) + 'px';
      layer.appendChild(el);
    }

    const bravoEl = document.createElement('div');
    bravoEl.className = 'bravo';
    bravoEl.textContent = bravo;
    layer.appendChild(bravoEl);

    const mascot = document.createElement('div');
    mascot.className = 'celebrate-mascot';
    mascot.textContent = MASCOTS[Math.floor(Math.random() * MASCOTS.length)];
    layer.appendChild(mascot);

    document.body.appendChild(layer);

    setTimeout(() => {
      layer.remove();
      if (onDone) onDone();
    }, 2400);
  }

  return { show };
})();
