// Minigra 1: imitacja telefonu. Dziecko wpisuje numer z pamięci i wciska zieloną słuchawkę.
const PhoneGame = (() => {
  function start(root, target, { onBack, onWin } = {}) {
    const digits = target.split('');
    let entered = [];
    let failCount = 0;

    const wrap = buildShell({ onBack });
    root.innerHTML = '';
    root.appendChild(wrap);

    const display = wrap.querySelector('.phone-display');
    const digitsRow = wrap.querySelector('.digits-row');
    const callBtn = wrap.querySelector('.key-call');

    function ghostsVisible() {
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
    });

    render();
  }

  function flashCross() {
    const x = document.createElement('div');
    x.className = 'cross-overlay show';
    x.textContent = '✖';
    document.body.appendChild(x);
    setTimeout(() => x.remove(), 700);
  }

  function buildShell({ onBack }) {
    const wrap = document.createElement('div');
    wrap.className = 'phone-wrap';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">📞 Telefon</div>
      </div>
      <div class="phone-display"><div class="digits-row"></div></div>
      <div class="keypad">
        ${[1,2,3,4,5,6,7,8,9].map(d => `<button class="key key-digit" data-d="${d}">${d}</button>`).join('')}
        <button class="key key-back" aria-label="Cofnij">⌫</button>
        <button class="key key-digit" data-d="0">0</button>
        <button class="key key-call" aria-label="Dzwoń" disabled>📞</button>
      </div>
      <div class="footer-hint">Wpisz numer i wciśnij zieloną słuchawkę</div>
    `;
    wrap.querySelector('.back').addEventListener('click', () => onBack && onBack());
    return wrap;
  }

  return { start };
})();
