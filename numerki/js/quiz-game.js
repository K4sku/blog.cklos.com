// Minigra: Quiz "wybierz właściwy numer". Trzy rundy z dwoma kandydatami każda.
const QuizGame = (() => {
  const ROUNDS = 3;

  function start(root, target, opts = {}) {
    const { onBack, onWin, label = '', icon = '' } = opts;
    let round = 0;

    const wrap = buildShell({ onBack, label, icon });
    root.innerHTML = '';
    root.appendChild(wrap);

    const stars = wrap.querySelector('.quiz-stars');
    const optionsEl = wrap.querySelector('.quiz-options');
    const prompt = wrap.querySelector('.quiz-prompt');

    function renderRound() {
      // Gwiazdki postępu
      stars.innerHTML = '';
      for (let i = 0; i < ROUNDS; i++) {
        const s = document.createElement('span');
        s.textContent = i < round ? '⭐' : '☆';
        stars.appendChild(s);
      }

      // Komunikat
      prompt.textContent = label
        ? `Który to numer ${capitalizeVoc(label)}?`
        : 'Który to właściwy numer?';

      // Wygeneruj fałszywą wersję i ustaw losową kolejność
      const fake = makeFake(target);
      const leftFirst = Math.random() < 0.5;
      const pair = leftFirst ? [target, fake] : [fake, target];

      optionsEl.innerHTML = '';
      pair.forEach((num) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = formatNumber(num);
        btn.dataset.num = num;
        btn.addEventListener('click', () => handleClick(btn, num === target));
        optionsEl.appendChild(btn);
      });

      // Po krótkiej chwili przeczytaj pytanie głośno (dla niczytających).
      setTimeout(() => Speech.say(prompt.textContent, { rate: 1 }), 250);
    }

    function handleClick(btn, correct) {
      Sounds.unlock();
      if (btn.dataset.locked) return;

      if (correct) {
        btn.dataset.locked = '1';
        btn.classList.add('correct');
        Sounds.snap();
        Speech.say('Tak!', { rate: 1.1, pitch: 1.2 });
        setTimeout(() => {
          round++;
          if (round >= ROUNDS) {
            Celebrate.show({ onDone: () => onWin && onWin() });
          } else {
            renderRound();
          }
        }, 700);
      } else {
        Sounds.fail();
        Speech.say('Nie, spróbuj jeszcze raz', { rate: 1.05 });
        btn.classList.add('wrong');
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
        flashCross();
        setTimeout(() => btn.classList.remove('wrong'), 800);
      }
    }

    renderRound();
  }

  // Zmienia 1-2 cyfry w numerze, żeby stworzyć "podpuszczalny" wariant.
  function makeFake(target) {
    const digits = target.split('');
    const numChanges = digits.length <= 4 ? 1 : (1 + Math.floor(Math.random() * 2));
    const idxs = shuffle([...Array(digits.length).keys()]).slice(0, numChanges);
    idxs.forEach(i => {
      let d;
      do { d = String(Math.floor(Math.random() * 10)); } while (d === digits[i]);
      digits[i] = d;
    });
    return digits.join('');
  }

  // Polskie numery: 9 cyfr -> "123 456 789"
  function formatNumber(num) {
    if (num.length === 9) return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`;
    if (num.length === 7) return `${num.slice(0, 3)} ${num.slice(3)}`;
    // Grupowanie po 3 od lewej
    return num.replace(/(.{3})/g, '$1 ').trim();
  }

  // Próba zrobienia formy dopełniacza z imienia: "Mama" -> "Mamy", "Tata" -> "Taty".
  function capitalizeVoc(label) {
    const lower = label.toLowerCase();
    const map = { 'mama': 'Mamy', 'tata': 'Taty', 'babcia': 'Babci', 'dziadek': 'Dziadka' };
    return map[lower] || label;
  }

  function buildShell({ onBack, label, icon }) {
    const wrap = document.createElement('div');
    wrap.className = 'quiz-wrap';
    const who = label ? `${icon || '🤔'} ${label}` : '🤔 Zgadnij';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="who">${who}</div>
      </div>
      <div class="quiz-stars" aria-label="Postęp"></div>
      <p class="quiz-prompt"></p>
      <div class="quiz-options"></div>
      <div class="footer-hint">Stuknij właściwy numer</div>
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
