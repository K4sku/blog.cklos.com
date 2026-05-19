// Główna logika aplikacji: ekran startowy, wybór gry i routing.
(function () {
  const PRESET_ICONS = ['👩', '👨', '👵', '👴', '👧', '👦', '🧑‍⚕️', '🚒'];
  const PRESET_LABELS = ['Mama', 'Tata', 'Babcia', 'Dziadek'];
  const LONG_PRESS_MS = 5000;

  const root = document.getElementById('app');
  let selectedId = null; // id karty w trybie zarządzania (po 5s przytrzymaniu)

  function clear() { root.innerHTML = ''; }

  function gameOptions() {
    return { fullHints: Storage.getSetting('fullHints', false) };
  }

  // Polski numer 9-cyfrowy: "123 456 789". Inne długości – grupowanie po 3.
  function formatNumber(num) {
    const s = String(num);
    if (s.length === 9) return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`;
    if (s.length === 7) return `${s.slice(0, 3)} ${s.slice(3)}`;
    return s.replace(/(.{3})/g, '$1 ').trim();
  }

  // ===== Ekran startowy =====

  function renderHome() {
    clear();
    Speech.cancel();
    const wrap = document.createElement('div');
    wrap.className = 'home-wrap';

    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'Numerki 📞';
    wrap.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Czyj numer chcesz dziś ćwiczyć?';
    wrap.appendChild(subtitle);

    const items = Storage.list();

    if (!items.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.innerHTML = 'Brak numerów. Przytrzymaj <span class="hint-plus">+</span> w rogu, aby dodać pierwszy.';
      wrap.appendChild(hint);
      // Jeśli nikogo nie ma na liście, wyzeruj selectedId
      selectedId = null;
    } else {
      const list = document.createElement('div');
      list.className = 'numbers-list';
      items.forEach((item, idx) => {
        list.appendChild(buildNumberCard(item, idx, items.length));
      });
      wrap.appendChild(list);
    }

    root.appendChild(wrap);
    root.appendChild(makeMascotCorner());
    root.appendChild(makeFab());
  }

  function buildNumberCard(item, idx, total) {
    const card = document.createElement('div');
    const isSelected = item.id === selectedId;
    const isDimmed = selectedId !== null && !isSelected;
    card.className = 'number-card'
      + (isSelected ? ' selected' : '')
      + (isDimmed ? ' dimmed' : '');
    card.innerHTML = `
      <div class="press-fill"></div>
      <div class="card-row">
        <div class="icon">${item.icon || '👤'}</div>
        <div class="content">
          <div class="label">${escapeHtml(item.label)}</div>
          <div class="digits">${escapeHtml(formatNumber(item.number))}</div>
        </div>
      </div>
      <div class="card-actions">
        <button class="action up" ${idx === 0 ? 'disabled' : ''} aria-label="W górę">↑</button>
        <button class="action down" ${idx === total - 1 ? 'disabled' : ''} aria-label="W dół">↓</button>
        <button class="action delete" aria-label="Usuń">✕</button>
        <button class="action done" aria-label="Gotowe">✓</button>
      </div>
    `;

    if (isSelected) {
      // W trybie zarządzania – akcje + kliknięcie na tło karty deselectuje.
      card.querySelector('.up').addEventListener('click', (e) => {
        e.stopPropagation();
        Sounds.click();
        Storage.move(item.id, -1);
        renderHome();
      });
      card.querySelector('.down').addEventListener('click', (e) => {
        e.stopPropagation();
        Sounds.click();
        Storage.move(item.id, 1);
        renderHome();
      });
      card.querySelector('.delete').addEventListener('click', (e) => {
        e.stopPropagation();
        Sounds.fail();
        Storage.remove(item.id);
        selectedId = null;
        renderHome();
      });
      card.querySelector('.done').addEventListener('click', (e) => {
        e.stopPropagation();
        Sounds.click();
        selectedId = null;
        renderHome();
      });
      card.addEventListener('click', (e) => {
        if (e.target.closest('.action')) return;
        selectedId = null;
        renderHome();
      });
    } else if (isDimmed) {
      // Tap na przygaszoną kartę wychodzi z trybu zarządzania.
      card.addEventListener('click', () => {
        selectedId = null;
        renderHome();
      });
    } else {
      // Normalny stan: krótki tap = gra, przytrzymanie 5s = wybór do zarządzania.
      setupLongPress(card, {
        durationMs: LONG_PRESS_MS,
        onTap: () => {
          Sounds.unlock();
          Sounds.click();
          Speech.say(item.label, { rate: 1 });
          renderGamePicker(item);
        },
        onLongPress: () => {
          if (navigator.vibrate) navigator.vibrate(60);
          Sounds.pop();
          selectedId = item.id;
          renderHome();
        },
      });
    }

    return card;
  }

  // Wspólny handler: krótki tap = onTap, przytrzymanie durationMs = onLongPress.
  // Podczas przytrzymania element dostaje klasę .pressing (CSS animuje progres).
  function setupLongPress(el, { durationMs, onTap, onLongPress }) {
    let timer = null;
    let startX = 0, startY = 0;
    let moved = false;
    const THRESHOLD = 18; // px – niewielki ruch palca nie kasuje pressu

    function start(e) {
      // Zignoruj jeśli kliknięto w guzik akcji (na wypadek, gdyby był wystawiony)
      if (e.target && e.target.closest && e.target.closest('button.action')) return;
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      el.classList.add('pressing');
      try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch {}
      timer = setTimeout(() => {
        timer = null;
        el.classList.remove('pressing');
        if (onLongPress) onLongPress();
      }, durationMs);
    }
    function move(e) {
      if (timer === null) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > THRESHOLD || dy > THRESHOLD) {
        moved = true;
        cancel();
      }
    }
    function up() {
      const wasPending = timer !== null;
      cancel();
      if (wasPending && !moved && onTap) onTap();
    }
    function cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      el.classList.remove('pressing');
    }

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('pointercancel', cancel);
  }

  // ===== Pływający + (FAB) =====

  function makeFab() {
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Dodaj numer (przytrzymaj 5 sekund)');
    fab.innerHTML = `
      <svg class="press-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ring-bg" cx="50" cy="50" r="46" fill="none" stroke-width="6" />
        <circle class="ring-fill" cx="50" cy="50" r="46" fill="none" stroke-width="6" />
      </svg>
      <span class="plus">+</span>
    `;

    setupLongPress(fab, {
      durationMs: LONG_PRESS_MS,
      onTap: () => showFabHint(),
      onLongPress: () => {
        if (navigator.vibrate) navigator.vibrate(60);
        Sounds.unlock();
        Sounds.pop();
        openAddModal();
      },
    });

    return fab;
  }

  function showFabHint() {
    // Krótkotrwała podpowiedź dla rodzica
    const existing = document.querySelector('.fab-hint');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'fab-hint';
    t.textContent = 'Przytrzymaj 5 sekund';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ===== Modal dodawania numeru =====

  function openAddModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-label="Dodaj numer">
        <h3 class="modal-title">Dodaj nowy numer</h3>
        <div class="row">
          ${PRESET_LABELS.map((l, i) => `<button class="preset-chip" data-label="${l}" data-icon="${PRESET_ICONS[i]}">${PRESET_ICONS[i]} ${l}</button>`).join('')}
        </div>
        <input type="text" class="label-input" placeholder="Kto to? np. Mama" maxlength="20" />
        <input type="tel" class="number-input" placeholder="Numer telefonu" inputmode="numeric" maxlength="15" />
        <div class="modal-actions">
          <button class="btn btn-ghost cancel-btn">Anuluj</button>
          <button class="btn btn-success save-btn">Zapisz</button>
        </div>
      </div>
    `;

    const labelInput = backdrop.querySelector('.label-input');
    const numberInput = backdrop.querySelector('.number-input');
    let pickedIcon = '👤';

    backdrop.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        labelInput.value = chip.dataset.label;
        pickedIcon = chip.dataset.icon;
        numberInput.focus();
      });
    });

    function close() {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('.cancel-btn').addEventListener('click', () => {
      Sounds.click();
      close();
    });
    backdrop.querySelector('.save-btn').addEventListener('click', () => {
      const label = labelInput.value.trim();
      const number = numberInput.value.replace(/\D/g, '');
      if (!label) { labelInput.focus(); return; }
      if (number.length < 3) { numberInput.focus(); return; }
      const preset = PRESET_LABELS.indexOf(label);
      const icon = preset >= 0 ? PRESET_ICONS[preset] : pickedIcon;
      Storage.add(label, number, icon);
      Sounds.snap();
      close();
      renderHome();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    setTimeout(() => labelInput.focus(), 100);
  }

  // ===== Wybór gry =====

  function renderGamePicker(item) {
    clear();
    Speech.cancel();
    const fullHints = Storage.getSetting('fullHints', false);

    const wrap = document.createElement('div');
    wrap.className = 'picker-wrap';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">${item.icon || '👤'} ${escapeHtml(item.label)}</div>
      </div>
      <p class="subtitle">W co chcesz zagrać?</p>
      <div class="hint-toggle">
        <label class="switch">
          <input type="checkbox" ${fullHints ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
        <span class="toggle-label">Pełne podpowiedzi</span>
      </div>
      <div class="picker-grid">
        ${gameCard('phone', '📞', 'Telefon', 'Wpisz numer na klawiaturze')}
        ${gameCard('drag', '🧩', 'Układanka', 'Przeciągnij cyfry')}
        ${gameCard('quiz', '🤔', 'Zgadnij', 'Wybierz właściwy numer')}
        ${gameCard('listen', '👂', 'Posłuchaj', 'Wpisz numer ze słuchu')}
        ${gameCard('whack', '🛁', 'Bąbelki', 'Wybierz bąbelek z cyfrą')}
      </div>
    `;

    wrap.querySelector('.back').addEventListener('click', () => { Sounds.click(); renderHome(); });
    wrap.querySelector('.hint-toggle input').addEventListener('change', (e) => {
      Storage.setSetting('fullHints', e.target.checked);
      Sounds.click();
    });

    wrap.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        Sounds.unlock();
        Sounds.click();
        const g = card.dataset.game;
        const r = GAME_RENDERERS[g];
        if (r) r(item);
      });
    });

    root.appendChild(wrap);
  }

  function gameCard(id, emoji, name, desc) {
    return `
      <div class="game-card" data-game="${id}">
        <div class="emoji">${emoji}</div>
        <div class="meta">
          <div class="name">${name}</div>
          <div class="desc">${desc}</div>
        </div>
      </div>
    `;
  }

  function renderPhoneGame(item) {
    clear();
    PhoneGame.start(root, item.number, {
      ...gameOptions(),
      label: item.label,
      onBack: () => renderGamePicker(item),
      onWin: () => renderAfterWin(item, 'phone'),
    });
  }

  function renderListenGame(item) {
    clear();
    PhoneGame.start(root, item.number, {
      ...gameOptions(),
      listen: true,
      label: item.label,
      onBack: () => renderGamePicker(item),
      onWin: () => renderAfterWin(item, 'listen'),
    });
  }

  function renderDragGame(item) {
    clear();
    DragGame.start(root, item.number, {
      ...gameOptions(),
      onBack: () => renderGamePicker(item),
      onWin: () => renderAfterWin(item, 'drag'),
    });
  }

  function renderQuizGame(item) {
    clear();
    QuizGame.start(root, item.number, {
      label: item.label,
      icon: item.icon,
      onBack: () => renderGamePicker(item),
      onWin: () => renderAfterWin(item, 'quiz'),
    });
  }

  function renderWhackGame(item) {
    clear();
    WhackGame.start(root, item.number, {
      ...gameOptions(),
      onBack: () => renderGamePicker(item),
      onWin: () => renderAfterWin(item, 'whack'),
    });
  }

  const GAME_RENDERERS = {
    phone: renderPhoneGame,
    drag: renderDragGame,
    quiz: renderQuizGame,
    listen: renderListenGame,
    whack: renderWhackGame,
  };

  function renderAfterWin(item, gameType) {
    clear();
    const wrap = document.createElement('div');
    wrap.className = 'afterwin-wrap';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">${item.icon || '👤'} ${escapeHtml(item.label)}</div>
      </div>
      <div class="mascot-big">🐶</div>
      <h2 class="afterwin-title">Brawo!</h2>
      <p class="subtitle">Co teraz?</p>
      <div class="afterwin-buttons">
        <button class="btn btn-success again">🔁 Jeszcze raz</button>
        <button class="btn other">🎮 Inna gra</button>
        <button class="btn btn-ghost end">🏠 Koniec</button>
      </div>
    `;
    wrap.querySelector('.back').addEventListener('click', () => renderGamePicker(item));
    wrap.querySelector('.again').addEventListener('click', () => {
      Sounds.click();
      const r = GAME_RENDERERS[gameType];
      if (r) r(item); else renderGamePicker(item);
    });
    wrap.querySelector('.other').addEventListener('click', () => { Sounds.click(); renderGamePicker(item); });
    wrap.querySelector('.end').addEventListener('click', () => { Sounds.click(); renderHome(); });
    root.appendChild(wrap);
  }

  function makeMascotCorner() {
    const m = document.createElement('div');
    m.className = 'mascot-corner';
    m.textContent = '🐶';
    m.setAttribute('aria-hidden', 'true');
    return m;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  renderHome();
})();
