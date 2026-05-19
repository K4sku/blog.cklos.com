// Minigra: imitacja telefonu. Dziecko wpisuje numer z pamięci i wciska zieloną słuchawkę.
// Tryby:
//   listen=true     – ekran "Posłuchaj i wpisz": auto-mowa numeru + przycisk 🔊 do powtórki.
//   fullHints=true  – wszystkie cyfry pokazane jako cienie od początku (tryb pełnej podpowiedzi).
const PhoneGame = (() => {
  function start(root, target, opts = {}) {
    const { onBack, onWin, fullHints = false, listen = false, label = '' } = opts;
    const digits = target.split('');
    let entered = [];
    let failCount = 0;

    const wrap = buildShell({ onBack, listen, label, target });
    root.innerHTML = '';
    root.appendChild(wrap);

    const display = wrap.querySelector('.phone-display');
    const digitsRow = wrap.querySelector('.digits-row');
    const callBtn = wrap.querySelector('.key-call');

    function ghostsVisible() {
      if (fullHints) return digits.length;
      return Math.max(0, failCount - 1);
    }

    function render() {
      digitsRow.innerHTML = '';
      const visibleGhosts = ghostsVisible();
      for (let i = 0; i < digits.length; i++) {
        const span = document.createElement('span');
        if (i < entered.length) {
          span.className = 'typed';
          span.textContent = entered[i];
        } else if (i < visibleGhosts) {
          span.className = 'ghost';
          span.textContent = digits[i];
        } else {
          span.className = 'placeholder';
          span.textContent = '•';
        }
        digitsRow.appendChild(span);
      }
      callBtn.disabled = entered.length !== digits.length;
    }

    function press(d) {
      if (entered.length >= digits.length) return;
      entered.push(d);
      Sounds.key(d);
      Speech.sayDigit(d);
      render();
    }

    function backspace() {
      if (!entered.length) return;
      entered.pop();
      Sounds.click();
      render();
    }

    function check() {
      if (entered.length !== digits.length) return;
      const correct = entered.join('') === target;
      if (correct) {
        Celebrate.show({ onDone: () => { if (onWin) onWin(); } });
      } else {
        failCount += 1;
        Sounds.fail();
        Speech.say('Spróbuj jeszcze raz', { rate: 1.05 });
        display.classList.remove('shake');
        // restart animacji
        void display.offsetWidth;
        display.classList.add('shake');
        flashCross();
        entered = [];
        setTimeout(render, 350);
      }
    }

    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !wrap.contains(btn)) return;
      Sounds.unlock();
      if (btn.classList.contains('key-digit')) press(btn.dataset.d);
      else if (btn.classList.contains('key-back')) backspace();
      else if (btn.classList.contains('key-call')) check();
      else if (btn.classList.contains('speaker')) Speech.sayNumber(target);
    });

    render();

    // W trybie "Posłuchaj" przeczytaj numer od razu po wejściu.
    if (listen) {
      setTimeout(() => Speech.sayNumber(target), 450);
    }
  }

  function flashCross() {
    const x = document.createElement('div');
    x.className = 'cross-overlay show';
    x.textContent = '✖';
    document.body.appendChild(x);
    setTimeout(() => x.remove(), 700);
  }

  function buildShell({ onBack, listen, label }) {
    const wrap = document.createElement('div');
    wrap.className = 'phone-wrap';
    const title = listen ? '👂 Posłuchaj' : '📞 Telefon';
    const whoLabel = label ? `${title} – ${label}` : title;
    const speakerBtn = listen ? '<button class="speaker" aria-label="Powtórz numer">🔊</button>' : '';
    const hint = listen ? 'Posłuchaj numeru i wpisz go' : 'Wpisz numer i wciśnij zieloną słuchawkę';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">${whoLabel}</div>
        ${speakerBtn}
      </div>
      <div class="phone-display"><div class="digits-row"></div></div>
      <div class="keypad">
        ${[1,2,3,4,5,6,7,8,9].map(d => `<button class="key key-digit" data-d="${d}">${d}</button>`).join('')}
        <button class="key key-back" aria-label="Cofnij">⌫</button>
        <button class="key key-digit" data-d="0">0</button>
        <button class="key key-call" aria-label="Dzwoń" disabled>📞</button>
      </div>
      <div class="footer-hint">${hint}</div>
    `;
    wrap.querySelector('.back').addEventListener('click', () => onBack && onBack());
    return wrap;
  }

  return { start };
})();
