// Minigra: wanna z bąbelkami + zaparowane lustro.
// Lustro u góry = postęp: każda cyfra ukryta we mgle, po trafieniu mgła "się ściera".
// W wannie (widok z lotu ptaka) 4 duże bąbelki z cyframi + piana w tle.
// Trafienie poprawnej cyfry → wszystkie 4 bąbelki pękają, pojawiają się nowe 4.
const WhackGame = (() => {
  const FOAM_COUNT = 34;

  function start(root, target, opts = {}) {
    const { onBack, onWin, fullHints = false } = opts;
    const digits = target.split('');
    let expectedIndex = 0;
    let inTransition = false;

    const wrap = buildShell({ onBack });
    root.innerHTML = '';
    root.appendChild(wrap);

    const mirrorInner = wrap.querySelector('.mirror-inner');
    const tub = wrap.querySelector('.bathtub');
    const foamEl = tub.querySelector('.foam');

    function renderMirror() {
      mirrorInner.innerHTML = '';
      digits.forEach((d, i) => {
        const cell = document.createElement('div');
        cell.className = 'mirror-cell';
        if (i < expectedIndex) cell.classList.add('revealed');
        else if (fullHints) cell.classList.add('hint'); // czytelny cień zamiast pełnego rozmycia
        if (i === expectedIndex) cell.classList.add('next');
        cell.innerHTML = `<div class="mirror-digit">${d}</div>`;
        mirrorInner.appendChild(cell);
      });
    }

    function revealCell(idx) {
      const cell = mirrorInner.children[idx];
      if (!cell) return;
      cell.classList.remove('next', 'hint');
      cell.classList.add('revealing');
      setTimeout(() => {
        cell.classList.remove('revealing');
        cell.classList.add('revealed');
        const nxt = mirrorInner.children[idx + 1];
        if (nxt) nxt.classList.add('next');
      }, 700);
    }

    function spawnFoam() {
      foamEl.innerHTML = '';
      for (let i = 0; i < FOAM_COUNT; i++) {
        const f = document.createElement('div');
        f.className = 'foam-bubble';
        const size = 12 + Math.random() * 32;
        f.style.width = size + 'px';
        f.style.height = size + 'px';
        // Pozycje wyrażone w % – odporne na zmianę rozmiaru wanny.
        f.style.left = (3 + Math.random() * 94) + '%';
        f.style.top = (3 + Math.random() * 94) + '%';
        f.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
        f.style.opacity = (0.5 + Math.random() * 0.4).toFixed(2);
        foamEl.appendChild(f);
      }
    }

    function makeDigitSet(correct) {
      // 1 poprawna + 3 różne błędne (bez duplikatów żeby dziecko nie zgadywało po dwóch jednakowych).
      const out = [correct];
      const used = new Set([correct]);
      while (out.length < 4) {
        const d = String(Math.floor(Math.random() * 10));
        if (!used.has(d)) {
          out.push(d);
          used.add(d);
        }
      }
      shuffle(out);
      return out;
    }

    function pickPositions(fieldW, fieldH, size) {
      // 2x2 siatka z jitterem – zawsze brak nakładania, ale "naturalny" rozrzut.
      const MARGIN = 18;
      const cellW = (fieldW - 2 * MARGIN) / 2;
      const cellH = (fieldH - 2 * MARGIN) / 2;
      const positions = [];
      for (let i = 0; i < 4; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const slackX = Math.max(0, cellW - size - 16);
        const slackY = Math.max(0, cellH - size - 16);
        const jx = (Math.random() - 0.5) * slackX;
        const jy = (Math.random() - 0.5) * slackY;
        positions.push({
          x: MARGIN + col * cellW + (cellW - size) / 2 + jx,
          y: MARGIN + row * cellH + (cellH - size) / 2 + jy,
        });
      }
      shuffle(positions);
      return positions;
    }

    function spawnBubbles() {
      // Usuń stare (jeśli zostały po animacji popu)
      tub.querySelectorAll('.big-bubble').forEach(b => b.remove());

      const fieldW = Math.max(280, tub.clientWidth);
      const fieldH = Math.max(220, tub.clientHeight);
      // Rozmiar bąbelka ograniczony i przez szerokość, i przez wysokość (2×2 musi się zmieścić).
      const maxByW = fieldW >= 640 ? 150 : fieldW >= 460 ? 120 : 96;
      const maxByH = Math.floor((fieldH - 50) / 2);
      const SIZE = Math.max(72, Math.min(maxByW, maxByH));

      const correct = digits[expectedIndex];
      const set = makeDigitSet(correct);
      const positions = pickPositions(fieldW, fieldH, SIZE);

      set.forEach((d, i) => {
        const b = document.createElement('button');
        b.className = 'big-bubble entering';
        b.dataset.d = d;
        b.textContent = d;
        b.style.width = SIZE + 'px';
        b.style.height = SIZE + 'px';
        b.style.fontSize = Math.round(SIZE * 0.5) + 'px';
        b.style.left = positions[i].x + 'px';
        b.style.top = positions[i].y + 'px';
        b.style.animationDelay = (i * 0.08).toFixed(2) + 's';
        b.addEventListener('click', () => onTap(b));
        tub.appendChild(b);
      });

      // Po animacji wejścia – usuń klasę żeby zadziałał bubbleFloat
      setTimeout(() => {
        tub.querySelectorAll('.big-bubble').forEach(b => b.classList.remove('entering'));
      }, 600);
    }

    function onTap(b) {
      if (inTransition) return;
      if (b.classList.contains('popping') || b.classList.contains('shake')) return;
      Sounds.unlock();

      const d = b.dataset.d;
      const correct = digits[expectedIndex];

      if (d === correct) {
        inTransition = true;
        Sounds.snap();
        Speech.sayDigit(d);

        revealCell(expectedIndex);
        expectedIndex++;

        // Pękają WSZYSTKIE 4 bąbelki, z drobnym przesunięciem żeby było ładniej
        const allBubbles = Array.from(tub.querySelectorAll('.big-bubble'));
        allBubbles.forEach((bub, i) => {
          setTimeout(() => bub.classList.add('popping'), i * 70);
        });

        if (expectedIndex >= digits.length) {
          // Wygrana – po animacji popu odpalamy konfetti
          setTimeout(() => {
            Celebrate.show({ onDone: () => onWin && onWin() });
          }, 1100);
          return;
        }

        // Po animacji popu (ostatni bąbelek: 3*70 + 550) – nowy zestaw
        setTimeout(() => {
          spawnBubbles();
          inTransition = false;
        }, 800);
      } else {
        // Zła cyfra – tylko ten bąbelek się trzęsie
        b.classList.remove('shake');
        void b.offsetWidth;
        b.classList.add('shake');
        Sounds.fail();
        flashCross();
        setTimeout(() => b.classList.remove('shake'), 520);
      }
    }

    // Inicjalizacja po pierwszym reflow (potrzebujemy clientWidth/clientHeight)
    requestAnimationFrame(() => {
      renderMirror();
      spawnFoam();
      spawnBubbles();
    });
  }

  function buildShell({ onBack }) {
    const wrap = document.createElement('div');
    wrap.className = 'whack-wrap';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">🛁 Bąbelki</div>
      </div>
      <div class="mirror" aria-label="Postęp">
        <div class="mirror-inner"></div>
      </div>
      <div class="bathtub">
        <div class="foam" aria-hidden="true"></div>
      </div>
      <div class="footer-hint">Stuknij prawidłową cyfrę – bąbelki pękną!</div>
    `;
    wrap.querySelector('.back').addEventListener('click', () => onBack && onBack());
    return wrap;
  }

  function flashCross() {
    const x = document.createElement('div');
    x.className = 'flash-cross show';
    x.textContent = '✖';
    document.body.appendChild(x);
    setTimeout(() => x.remove(), 600);
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { start };
})();
