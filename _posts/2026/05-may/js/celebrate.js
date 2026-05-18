// Animacja nagrody: emoji spadające z góry + napis "Brawo!".
const Celebrate = (() => {
  const EMOJIS = ['🎉', '🌟', '⭐', '🎊', '✨', '🥳', '🎈', '💛', '💙', '❤️'];
  const BRAVOS = ['Brawo!', 'Super!', 'Tak!', 'Ekstra!', 'Hura!'];

  function show({ onDone } = {}) {
    Sounds.success();

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
      el.style.fontSize = (28 + Math.random() * 32) + 'px';
      layer.appendChild(el);
    }

    const bravo = document.createElement('div');
    bravo.className = 'bravo';
    bravo.textContent = BRAVOS[Math.floor(Math.random() * BRAVOS.length)];
    layer.appendChild(bravo);

    document.body.appendChild(layer);

    setTimeout(() => {
      layer.remove();
      if (onDone) onDone();
    }, 2400);
  }

  return { show };
})();
