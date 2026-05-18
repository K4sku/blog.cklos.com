// Główna logika aplikacji: ekran startowy, wybór gry i routing.
(function () {
  const PRESET_ICONS = ['👩', '👨', '👵', '👴', '👧', '👦', '🧑‍⚕️', '🚒'];
  const PRESET_LABELS = ['Mama', 'Tata', 'Babcia', 'Dziadek'];

  const root = document.getElementById('app');

  function clear() { root.innerHTML = ''; }

  function renderHome() {
    clear();
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

    const list = document.createElement('div');
    list.className = 'numbers-list';
    const items = Storage.list();

    if (!items.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = 'Dodaj poniżej pierwszy numer telefonu do nauki.';
      wrap.appendChild(hint);
    } else {
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'number-card';
        card.innerHTML = `
          <div class="icon">${item.icon || '👤'}</div>
          <div class="label">${escapeHtml(item.label)}</div>
          <button class="remove" aria-label="Usuń">×</button>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.classList.contains('remove')) return;
          Sounds.unlock();
          Sounds.click();
          renderGamePicker(item);
        });
        card.querySelector('.remove').addEventListener('click', () => {
          if (confirm(`Usunąć numer "${item.label}"?`)) {
            Storage.remove(item.id);
            renderHome();
          }
        });
        list.appendChild(card);
      });
      wrap.appendChild(list);
    }

    wrap.appendChild(renderAddForm());
    root.appendChild(wrap);
  }

  function renderAddForm() {
    const form = document.createElement('div');
    form.className = 'add-form';
    form.innerHTML = `
      <label>Dodaj nowy numer</label>
      <div class="row">
        ${PRESET_LABELS.map((l, i) => `<button class="preset-chip" data-label="${l}" data-icon="${PRESET_ICONS[i]}">${PRESET_ICONS[i]} ${l}</button>`).join('')}
      </div>
      <input type="text" class="label-input" placeholder="Kto to? np. Mama" maxlength="20" />
      <input type="tel" class="number-input" placeholder="Numer telefonu" inputmode="numeric" maxlength="15" />
      <div class="actions">
        <button class="btn btn-success save-btn">Zapisz</button>
      </div>
    `;
    const labelInput = form.querySelector('.label-input');
    const numberInput = form.querySelector('.number-input');
    let pickedIcon = '👤';

    form.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        labelInput.value = chip.dataset.label;
        pickedIcon = chip.dataset.icon;
        numberInput.focus();
      });
    });

    form.querySelector('.save-btn').addEventListener('click', () => {
      const label = labelInput.value.trim();
      const number = numberInput.value.replace(/\D/g, '');
      if (!label) { labelInput.focus(); return; }
      if (number.length < 3) { numberInput.focus(); return; }
      // Jeżeli label pasuje do presetu, weź jego ikonę
      const preset = PRESET_LABELS.indexOf(label);
      const icon = preset >= 0 ? PRESET_ICONS[preset] : pickedIcon;
      Storage.add(label, number, icon);
      renderHome();
    });

    return form;
  }

  function renderGamePicker(item) {
    clear();
    const wrap = document.createElement('div');
    wrap.className = 'picker-wrap';

    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">${item.icon || '👤'} ${escapeHtml(item.label)}</div>
      </div>
      <p class="subtitle">W co chcesz zagrać?</p>
      <div class="picker-grid">
        <div class="game-card" data-game="phone">
          <div class="emoji">📞</div>
          <div class="meta">
            <div class="name">Telefon</div>
            <div class="desc">Wpisz numer na klawiaturze</div>
          </div>
        </div>
        <div class="game-card" data-game="drag">
          <div class="emoji">🧩</div>
          <div class="meta">
            <div class="name">Układanka</div>
            <div class="desc">Przeciągnij cyfry na miejsca</div>
          </div>
        </div>
      </div>
    `;

    wrap.querySelector('.back').addEventListener('click', () => { Sounds.click(); renderHome(); });
    wrap.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        Sounds.unlock();
        Sounds.click();
        const g = card.dataset.game;
        if (g === 'phone') renderPhoneGame(item);
        else renderDragGame(item);
      });
    });

    root.appendChild(wrap);
  }

  function renderPhoneGame(item) {
    clear();
    PhoneGame.start(root, item.number, {
      onBack: () => renderGamePicker(item),
      onWin: () => renderGamePicker(item),
    });
  }

  function renderDragGame(item) {
    clear();
    DragGame.start(root, item.number, {
      onBack: () => renderGamePicker(item),
      onWin: () => renderGamePicker(item),
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  renderHome();
})();
