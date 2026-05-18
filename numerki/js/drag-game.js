// Minigra 2: rozsiane cyfry + miejsca docelowe. Dziecko przeciąga cyfry na właściwe pola.
const DragGame = (() => {
  function start(root, target, { onBack, onWin } = {}) {
    const digits = target.split('');

    root.innerHTML = '';
    root.appendChild(buildShell({ onBack }));

    const pool = root.querySelector('.pool');
    const slotsEl = root.querySelector('.slots');

    // Sloty docelowe (po jednym na każdą pozycję numeru)
    const slots = digits.map((d, i) => {
      const el = document.createElement('div');
      el.className = 'slot';
      el.dataset.idx = i;
      el.dataset.digit = d;
      slotsEl.appendChild(el);
      return { el, digit: d, filled: false };
    });

    // Cyfry pasujące + nadmiarowe
    const piecesData = digits.map((d) => ({ digit: d, isExtra: false }));
    const targetSet = new Set(digits);
    const extraPool = '0123456789'.split('').filter(d => !targetSet.has(d));
    const candidates = extraPool.length ? extraPool : '0123456789'.split('');
    const extraCount = Math.min(4, candidates.length);
    shuffle(candidates);
    for (let i = 0; i < extraCount; i++) {
      piecesData.push({ digit: candidates[i], isExtra: true });
    }
    shuffle(piecesData);

    // Czekamy aż pool będzie miał szerokość (pierwszy reflow)
    requestAnimationFrame(() => {
      layoutPieces(pool, piecesData);
      pool.querySelectorAll('.piece').forEach(el => setupDrag(el, slots, onWin));
    });
  }

  function setupDrag(el, slots, onWin) {
    let dragging = false;
    let startX = 0, startY = 0;

    el.addEventListener('pointerdown', (e) => {
      if (el.dataset.placed || el.dataset.removed) return;
      Sounds.unlock();
      dragging = true;
      el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch {}
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      slots.forEach(s => {
        s.el.classList.toggle('hover', !s.filled && isOver(s.el, e.clientX, e.clientY));
      });
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      slots.forEach(s => s.el.classList.remove('hover'));

      const dropSlot = slots.find(s => !s.filled && isOver(s.el, e.clientX, e.clientY));
      if (!dropSlot) {
        // upuszczenie poza polem – cicho wraca
        el.style.transform = '';
        return;
      }
      if (dropSlot.digit !== el.dataset.d) {
        // niewłaściwa cyfra – wraca, krzyżyk, dźwięk, podpowiedzi
        el.style.transform = '';
        handleFail(el, slots);
        return;
      }
      placeInSlot(el, dropSlot);
      if (slots.every(s => s.filled)) {
        setTimeout(() => Celebrate.show({ onDone: () => onWin && onWin() }), 150);
      }
    }

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  function placeInSlot(el, slot) {
    Sounds.snap();
    slot.filled = true;
    slot.el.classList.add('filled');
    const ghost = slot.el.querySelector('.ghost-hint');
    if (ghost) ghost.remove();
    const val = document.createElement('div');
    val.className = 'slot-value';
    val.textContent = slot.digit;
    slot.el.appendChild(val);
    // Kafelek znika z planszy – cyfrę widać już w slocie.
    el.dataset.placed = '1';
    el.classList.add('removed');
  }

  function handleFail(el, slots) {
    Sounds.fail();
    flashCross();

    // Usuń jedną nadmiarową cyfrę
    const pool = el.parentElement;
    const aliveExtras = pool.querySelectorAll('.piece[data-extra="1"]:not([data-removed="1"])');
    if (aliveExtras.length) {
      const target = aliveExtras[0];
      target.dataset.removed = '1';
      target.classList.add('removed');
    }

    // Odsłoń kolejny "cień" w pierwszym pustym slocie bez podpowiedzi
    const firstEmpty = slots.find(s => !s.filled && !s.el.querySelector('.ghost-hint'));
    if (firstEmpty) {
      const ghost = document.createElement('div');
      ghost.className = 'ghost-hint';
      ghost.textContent = firstEmpty.digit;
      firstEmpty.el.appendChild(ghost);
    }
  }

  function layoutPieces(pool, pieces) {
    const w = Math.max(280, pool.clientWidth);
    // Skaluj kafelki w zależności od dostępnej szerokości – na tablecie 90px, mniej na wąskim ekranie
    const PIECE = w >= 640 ? 92 : w >= 460 ? 78 : 64;
    const GAP = 18;
    const PAD = 18;
    const cols = Math.max(3, Math.floor((w - 2 * PAD + GAP) / (PIECE + GAP)));
    const rows = Math.ceil(pieces.length / cols);
    pool.style.minHeight = (rows * (PIECE + GAP) + 2 * PAD) + 'px';

    pieces.forEach((p, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 8;
      const x = PAD + col * (PIECE + GAP) + jitterX;
      const y = PAD + row * (PIECE + GAP) + jitterY;
      const el = document.createElement('div');
      el.className = 'piece';
      el.dataset.d = p.digit;
      if (p.isExtra) el.dataset.extra = '1';
      el.textContent = p.digit;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = PIECE + 'px';
      el.style.height = PIECE + 'px';
      el.style.fontSize = Math.round(PIECE * 0.6) + 'px';
      pool.appendChild(el);
    });
  }

  function buildShell({ onBack }) {
    const wrap = document.createElement('div');
    wrap.className = 'drag-wrap';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">🧩 Układanka</div>
      </div>
      <div class="pool"></div>
      <div class="slots"></div>
      <div class="footer-hint">Przeciągnij cyfry na właściwe miejsca</div>
    `;
    wrap.querySelector('.back').addEventListener('click', () => onBack && onBack());
    return wrap;
  }

  function isOver(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
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
