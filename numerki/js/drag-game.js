// Minigra: rozsiane cyfry + miejsca docelowe. Dziecko przeciąga cyfry na właściwe pola.
const DragGame = (() => {
  function start(root, target, opts = {}) {
    const { onBack, onWin, fullHints = false } = opts;
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
      // Tryb pełnej podpowiedzi: cień widoczny od początku
      if (fullHints) {
        const ghost = document.createElement('div');
        ghost.className = 'ghost-hint';
        ghost.textContent = d;
        el.appendChild(ghost);
      }
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
      // Podświetl slot pod kursorem; zielono jeśli pasuje, czerwono jeśli nie.
      const myDigit = el.dataset.d;
      slots.forEach(s => {
        const over = !s.filled && isOver(s.el, e.clientX, e.clientY);
        const matches = s.digit === myDigit;
        s.el.classList.toggle('hover', over);
        s.el.classList.toggle('hover-match', over && matches);
        s.el.classList.toggle('hover-nomatch', over && !matches);
      });
    });

    function clearHover() {
      slots.forEach(s => {
        s.el.classList.remove('hover', 'hover-match', 'hover-nomatch');
      });
    }

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('dragging');
      clearHover();

      const dropSlot = slots.find(s => !s.filled && isOver(s.el, e.clientX, e.clientY));
      if (!dropSlot) {
        // upuszczenie poza polem – cicho wraca
        el.style.transition = 'transform 0.2s ease';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 220);
        return;
      }
      if (dropSlot.digit !== el.dataset.d) {
        // niewłaściwa cyfra – wraca, krzyżyk, dźwięk, podpowiedzi
        el.style.transition = 'transform 0.2s ease';
        el.style.transform = '';
        setTimeout(() => { el.style.transition = ''; }, 220);
        handleFail(el, slots);
        return;
      }
      placeInSlot(el, dropSlot);
      if (slots.every(s => s.filled)) {
        setTimeout(() => Celebrate.show({ onDone: () => onWin && onWin() }), 600);
      }
    }

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  // Animacja: kafelek "leci" do środka slotu, zmniejsza się, a w slocie pojawia się cyfra.
  function placeInSlot(el, slot) {
    Sounds.snap();
    Speech.sayDigit(slot.digit);
    slot.filled = true;
    slot.el.classList.add('filled');
    el.dataset.placed = '1';
    el.style.zIndex = '40';

    const slotRect = slot.el.getBoundingClientRect();
    const pieceRect = el.getBoundingClientRect();
    const dx = (slotRect.left + slotRect.width / 2) - (pieceRect.left + pieceRect.width / 2);
    const dy = (slotRect.top + slotRect.height / 2) - (pieceRect.top + pieceRect.height / 2);

    // Wyciągamy aktualne translate() z transformu (z drag) i dodajemy delta.
    let curTX = 0, curTY = 0;
    const m = (el.style.transform || '').match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    if (m) { curTX = parseFloat(m[1]); curTY = parseFloat(m[2]); }
    const targetScale = Math.min(1, (slotRect.width * 0.7) / Math.max(pieceRect.width, 1));

    el.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.36, 0.5, 1), opacity 0.18s ease 0.26s';
    el.style.transform = `translate(${curTX + dx}px, ${curTY + dy}px) scale(${targetScale})`;
    el.style.opacity = '0';

    // Po animacji: w slocie pokazujemy cyfrę z animacją "pop".
    setTimeout(() => {
      const ghost = slot.el.querySelector('.ghost-hint');
      if (ghost) ghost.remove();
      const val = document.createElement('div');
      val.className = 'slot-value';
      val.textContent = slot.digit;
      slot.el.appendChild(val);
      el.classList.add('removed');
    }, 320);
  }

  function handleFail(el, slots) {
    Sounds.fail();
    Speech.say('Spróbuj jeszcze raz', { rate: 1.05 });
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
    // Skaluj kafelki w zależności od dostępnej szerokości – na tablecie 92px, mniej na wąskim ekranie
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
