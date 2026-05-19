// Minigra Labirynt: dziecko rysuje linię od startu (strzałka u góry) do kotka (u dołu).
// Plansza 11×13 generowana algorytmem DFS — perfect maze, dokładnie jedna ścieżka start→meta.
// W trybie trudnym (fullHints=false) na komórkach poza tą ścieżką są błędne cyfry; dotknięcie
// cofa linię do ostatniej prawidłowej cyfry. W trybie łatwym błędnych cyfr w komórkach nie ma.
const MazeGame = (() => {
  const COLS = 11;
  const ROWS = 13;
  const CELL = 80;
  const LINE_WIDTH = 14;
  const POINT_MIN_DIST = 3;
  const POINTER_DOWN_TOL = CELL * 0.75;
  const WRONG_DIGITS_COUNT = 10;
  const MIN_PATH_LEN = 20;       // minimalna długość unikalnej ścieżki start→meta
  const MAX_PATH_LEN = 80;
  const GEN_RETRIES = 30;

  // ===== Generator perfect-maze (growing tree, Prim-like) =====
  // Wybór następnej komórki z aktywnej listy jest LOSOWY (nie LIFO). Daje labirynt
  // z licznymi krótkimi odnogami rozproszonymi po całej planszy zamiast pojedynczego
  // długiego "river" korytarza typowego dla DFS.
  function generateMaze(cols, rows) {
    const hWalls = Array.from({ length: rows + 1 }, () => new Array(cols).fill(true));
    const vWalls = Array.from({ length: rows },     () => new Array(cols + 1).fill(true));
    const visited = Array.from({ length: rows },   () => new Array(cols).fill(false));

    function removeWall(c1, r1, c2, r2) {
      if (c1 === c2) hWalls[Math.max(r1, r2)][c1] = false;
      else vWalls[r1][Math.max(c1, c2)] = false;
    }

    const startC = Math.floor(cols / 2);
    const startR = 0;
    visited[startR][startC] = true;
    const active = [[startC, startR]];
    while (active.length) {
      const idx = Math.floor(Math.random() * active.length);
      const [c, r] = active[idx];
      const cand = [];
      if (c > 0        && !visited[r][c-1]) cand.push([c-1, r]);
      if (c < cols - 1 && !visited[r][c+1]) cand.push([c+1, r]);
      if (r > 0        && !visited[r-1][c]) cand.push([c, r-1]);
      if (r < rows - 1 && !visited[r+1][c]) cand.push([c, r+1]);
      if (!cand.length) {
        // wyrzuć z listy (swap+pop dla O(1))
        active[idx] = active[active.length - 1];
        active.pop();
        continue;
      }
      const [nc, nr] = cand[Math.floor(Math.random() * cand.length)];
      removeWall(c, r, nc, nr);
      visited[nr][nc] = true;
      active.push([nc, nr]);
    }
    return { hWalls, vWalls };
  }

  function isPassable(maze, fromC, fromR, toC, toR) {
    if (toC < 0 || toC >= COLS || toR < 0 || toR >= ROWS) return false;
    if (fromC === toC) return !maze.hWalls[Math.max(fromR, toR)][fromC];
    if (fromR === toR) return !maze.vWalls[fromR][Math.max(fromC, toC)];
    return false;
  }

  function neighborsPassable(maze, c, r) {
    const list = [];
    if (isPassable(maze, c, r, c-1, r)) list.push({ c: c-1, r });
    if (isPassable(maze, c, r, c+1, r)) list.push({ c: c+1, r });
    if (isPassable(maze, c, r, c,   r-1)) list.push({ c,     r: r-1 });
    if (isPassable(maze, c, r, c,   r+1)) list.push({ c,     r: r+1 });
    return list;
  }

  // BFS — w perfect-maze ścieżka jest jedyna, więc BFS i DFS dają to samo.
  function findPath(maze, start, end) {
    const parent = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    visited[start.r][start.c] = true;
    const queue = [start];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur.c === end.c && cur.r === end.r) break;
      for (const n of neighborsPassable(maze, cur.c, cur.r)) {
        if (visited[n.r][n.c]) continue;
        visited[n.r][n.c] = true;
        parent[n.r][n.c] = cur;
        queue.push(n);
      }
    }
    const path = [];
    let cur = end;
    while (cur) { path.unshift(cur); cur = parent[cur.r][cur.c]; }
    return path;
  }

  function findDeadEnds(maze, excludeSet) {
    const list = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (excludeSet.has(`${c},${r}`)) continue;
        if (neighborsPassable(maze, c, r).length === 1) list.push({ c, r });
      }
    }
    return list;
  }

  function pickDigitCells(path, n) {
    const inner = path.slice(1, -1);
    if (inner.length <= n) return inner.slice();
    const out = [];
    for (let i = 1; i <= n; i++) {
      const idx = Math.floor(i * (inner.length) / (n + 1));
      out.push(inner[idx]);
    }
    // unique
    const seen = new Set();
    return out.filter(p => {
      const k = `${p.c},${p.r}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function buildBoard(targetDigitsLen) {
    const start = { c: Math.floor(COLS / 2), r: 0 };
    const end =   { c: Math.floor(COLS / 2), r: ROWS - 1 };
    for (let i = 0; i < GEN_RETRIES; i++) {
      const maze = generateMaze(COLS, ROWS);
      const path = findPath(maze, start, end);
      if (path.length < MIN_PATH_LEN || path.length > MAX_PATH_LEN) continue;
      const digitCells = pickDigitCells(path, targetDigitsLen);
      if (digitCells.length < targetDigitsLen) continue;
      const onPath = new Set(path.map(p => `${p.c},${p.r}`));
      const deadEnds = findDeadEnds(maze, onPath);
      // wymieszaj i weź pierwsze WRONG_DIGITS_COUNT
      for (let j = deadEnds.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [deadEnds[j], deadEnds[k]] = [deadEnds[k], deadEnds[j]];
      }
      const wrongCells = deadEnds.slice(0, WRONG_DIGITS_COUNT);
      return { maze, start, end, path, digitCells, wrongCells };
    }
    // fallback — bierzemy ostatni wygenerowany niezależnie od długości
    const maze = generateMaze(COLS, ROWS);
    const path = findPath(maze, start, end);
    const digitCells = pickDigitCells(path, targetDigitsLen);
    const onPath = new Set(path.map(p => `${p.c},${p.r}`));
    const wrongCells = findDeadEnds(maze, onPath).slice(0, WRONG_DIGITS_COUNT);
    return { maze, start, end, path, digitCells, wrongCells };
  }

  function start(root, target, opts = {}) {
    const { onBack, onWin, fullHints = false } = opts;
    const targetDigits = String(target).split('').map(Number);
    const board = buildBoard(targetDigits.length);
    const { maze, digitCells, wrongCells } = board;
    const startCell = board.start, endCell = board.end;
    // Cyfry "fałszywe" — losowane z cyfr 0-9 nieobecnych w numerze (fallback: dowolna 0-9).
    const targetSet = new Set(targetDigits);
    const pool = [0,1,2,3,4,5,6,7,8,9].filter(d => !targetSet.has(d));
    const wrongPool = pool.length ? pool : [0,1,2,3,4,5,6,7,8,9];
    const wrongDigits = wrongCells.map(() => wrongPool[Math.floor(Math.random() * wrongPool.length)]);

    // Stan
    let revealedCount = 0;
    let linePoints = [];
    let currentCell = { ...startCell };
    let lastCheckpoint = null;
    let drawing = false;
    let pointerId = null;
    let won = false;
    let errorBlock = false;

    const VB_X = 0;
    const VB_Y = -CELL;
    const VB_W = COLS * CELL;
    const VB_H = (ROWS + 2) * CELL;

    const wrap = document.createElement('div');
    wrap.className = 'maze-wrap';
    wrap.innerHTML = `
      <div class="topbar">
        <button class="back" aria-label="Powrót">←</button>
        <div class="maze-digits"></div>
      </div>
      <div class="maze-board-wrap">
        <svg class="maze-svg" viewBox="${VB_X} ${VB_Y} ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet">
          <rect class="maze-board-bg" x="0" y="0" width="${VB_W}" height="${COLS && ROWS*CELL}" />
          <g class="walls-layer"></g>
          <g class="digits-layer"></g>
          <text class="start-arrow" text-anchor="middle" dominant-baseline="middle"></text>
          <text class="end-cat" text-anchor="middle" dominant-baseline="middle"></text>
          <polyline class="maze-line" points="" fill="none" />
          <circle class="cursor-dot" r="11" />
          <g class="cross-layer"></g>
        </svg>
      </div>
    `;

    wrap.querySelector('.back').addEventListener('click', () => {
      Sounds.click();
      Speech.cancel();
      if (onBack) onBack();
    });

    root.appendChild(wrap);

    const svg          = wrap.querySelector('.maze-svg');
    const wallsLayer   = svg.querySelector('.walls-layer');
    const digitsLayer  = svg.querySelector('.digits-layer');
    const startArrow   = svg.querySelector('.start-arrow');
    const endCat       = svg.querySelector('.end-cat');
    const linePoly     = svg.querySelector('.maze-line');
    const cursorDot    = svg.querySelector('.cursor-dot');
    const crossLayer   = svg.querySelector('.cross-layer');
    const digitsBar    = wrap.querySelector('.maze-digits');

    function makeSvg(tag, attrs) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }
    function cellCenter(cell) {
      return { x: cell.c * CELL + CELL / 2, y: cell.r * CELL + CELL / 2 };
    }
    function cellOf(p) {
      let c = Math.floor(p.x / CELL), r = Math.floor(p.y / CELL);
      if (c < 0) c = 0; if (c >= COLS) c = COLS - 1;
      if (r < 0) r = 0; if (r >= ROWS) r = ROWS - 1;
      return { c, r };
    }
    function sameCell(a, b) { return a && b && a.c === b.c && a.r === b.r; }

    // ===== Rysowanie ścian =====
    function drawWalls() {
      // poziome
      for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!maze.hWalls[r][c]) continue;
          // pomijamy wlot u góry nad startem i wylot u dołu nad metą
          if (r === 0      && c === startCell.c) continue;
          if (r === ROWS   && c === endCell.c)   continue;
          wallsLayer.appendChild(makeSvg('line', {
            x1: c*CELL, y1: r*CELL, x2: (c+1)*CELL, y2: r*CELL, class: 'maze-wall',
          }));
        }
      }
      // pionowe
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
          if (!maze.vWalls[r][c]) continue;
          wallsLayer.appendChild(makeSvg('line', {
            x1: c*CELL, y1: r*CELL, x2: c*CELL, y2: (r+1)*CELL, class: 'maze-wall',
          }));
        }
      }
    }

    function drawDigits() {
      digitCells.forEach((cell, i) => {
        const cen = cellCenter(cell);
        const t = makeSvg('text', {
          x: cen.x, y: cen.y, class: 'maze-cell-digit',
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
        });
        t.textContent = targetDigits[i];
        digitsLayer.appendChild(t);
      });
      if (!fullHints) {
        wrongCells.forEach((cell, i) => {
          const cen = cellCenter(cell);
          const t = makeSvg('text', {
            x: cen.x, y: cen.y, class: 'maze-cell-digit maze-wrong-digit',
            'text-anchor': 'middle', 'dominant-baseline': 'middle',
          });
          t.textContent = wrongDigits[i];
          digitsLayer.appendChild(t);
        });
      }
    }

    function drawStartEnd() {
      const s = cellCenter(startCell);
      startArrow.setAttribute('x', s.x);
      startArrow.setAttribute('y', -CELL / 2);
      startArrow.textContent = '⬇';

      const e = cellCenter(endCell);
      endCat.setAttribute('x', e.x);
      endCat.setAttribute('y', ROWS * CELL + CELL / 2);
      endCat.textContent = '🐱';
    }

    function updateDigitsBar() {
      digitsBar.innerHTML = '';
      targetDigits.forEach((d, i) => {
        const span = document.createElement('span');
        span.className = 'maze-bar-digit';
        const shown = fullHints || i < revealedCount;
        span.textContent = shown ? d : '•';
        if (shown) span.classList.add('shown');
        if (!fullHints && i === revealedCount && !won) span.classList.add('next');
        digitsBar.appendChild(span);
      });
    }

    function updateLine() {
      const pts = linePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      linePoly.setAttribute('points', pts);
      const last = linePoints[linePoints.length - 1];
      if (last) {
        cursorDot.setAttribute('cx', last.x);
        cursorDot.setAttribute('cy', last.y);
      }
    }

    function initLine() {
      const s = cellCenter(startCell);
      linePoints = [{ ...s }];
      currentCell = { ...startCell };
      lastCheckpoint = { pointsLength: 1, cell: { ...currentCell }, revealedCount: 0 };
      updateLine();
    }

    // ===== Slizganie się wzdłuż ścian =====
    function constrainMove(x0, y0, x1, y1) {
      let x = x0, y = y0;
      let dx = x1 - x0, dy = y1 - y0;
      const visited = [];
      const maxIter = 10;
      for (let i = 0; i < maxIter; i++) {
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) break;
        const cur = cellOf({ x, y });
        const left = cur.c * CELL, right = (cur.c + 1) * CELL;
        const top  = cur.r * CELL, bottom = (cur.r + 1) * CELL;
        let tx = Infinity, ty = Infinity;
        let xEdge = 0, yEdge = 0;
        if (dx > 0)      { tx = (right - x) / dx; xEdge = 1; }
        else if (dx < 0) { tx = (left  - x) / dx; xEdge = -1; }
        if (dy > 0)      { ty = (bottom - y) / dy; yEdge = 1; }
        else if (dy < 0) { ty = (top    - y) / dy; yEdge = -1; }

        if (tx >= 1 && ty >= 1) { x += dx; y += dy; dx = 0; dy = 0; break; }

        if (tx <= ty) {
          const t = Math.max(tx, 0);
          const neighborC = cur.c + xEdge, neighborR = cur.r;
          if (isPassable(maze, cur.c, cur.r, neighborC, neighborR)) {
            x += dx * t; y += dy * t;
            x += xEdge * 0.5;
            dx *= (1 - t); dy *= (1 - t);
            visited.push({ c: neighborC, r: neighborR });
          } else {
            x += dx * t; y += dy * t;
            x -= xEdge * 0.5;
            dy *= (1 - t);
            dx = 0;
          }
        } else {
          const t = Math.max(ty, 0);
          const neighborC = cur.c, neighborR = cur.r + yEdge;
          if (isPassable(maze, cur.c, cur.r, neighborC, neighborR)) {
            x += dx * t; y += dy * t;
            y += yEdge * 0.5;
            dx *= (1 - t); dy *= (1 - t);
            visited.push({ c: neighborC, r: neighborR });
          } else {
            x += dx * t; y += dy * t;
            y -= yEdge * 0.5;
            dx *= (1 - t);
            dy = 0;
          }
        }
      }
      return { x, y, visited };
    }

    // ===== Pointer events =====
    function clientToSvg(e) {
      const rect = svg.getBoundingClientRect();
      return {
        x: VB_X + (e.clientX - rect.left) * (VB_W / rect.width),
        y: VB_Y + (e.clientY - rect.top)  * (VB_H / rect.height),
      };
    }

    function onPointerDown(e) {
      if (won || errorBlock) return;
      const last = linePoints[linePoints.length - 1];
      if (!last) return;
      const p = clientToSvg(e);
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d > POINTER_DOWN_TOL) return;
      Sounds.unlock();
      drawing = true;
      pointerId = e.pointerId;
      try { svg.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!drawing || e.pointerId !== pointerId) return;
      const last = linePoints[linePoints.length - 1];
      const p = clientToSvg(e);
      const res = constrainMove(last.x, last.y, p.x, p.y);
      const newPt = { x: res.x, y: res.y };

      const dist = Math.hypot(newPt.x - last.x, newPt.y - last.y);
      if (dist >= POINT_MIN_DIST) linePoints.push(newPt);
      else linePoints[linePoints.length - 1] = newPt;

      const visited = res.visited.slice();
      const finalCell = cellOf(newPt);
      if (!visited.length || !sameCell(visited[visited.length-1], finalCell)) {
        if (!sameCell(finalCell, currentCell)) visited.push(finalCell);
      }

      let trigger = null;
      let prev = currentCell;
      for (const cell of visited) {
        if (sameCell(cell, prev)) continue;
        prev = cell;
        currentCell = cell;

        if (!fullHints) {
          const wIdx = wrongCells.findIndex(w => sameCell(w, cell));
          if (wIdx >= 0) { trigger = { type: 'error', cell }; break; }
        }

        const dIdx = digitCells.findIndex(d => sameCell(d, cell));
        if (dIdx >= 0 && dIdx === revealedCount) {
          revealedCount++;
          Sounds.click();
          Speech.sayDigit(targetDigits[dIdx]);
          updateDigitsBar();
          lastCheckpoint = {
            pointsLength: linePoints.length,
            cell: { ...currentCell },
            revealedCount,
          };
          const textEl = digitsLayer.querySelectorAll('.maze-cell-digit')[dIdx];
          if (textEl) textEl.classList.add('revealed');
        }

        if (sameCell(cell, endCell) && revealedCount === digitCells.length) {
          trigger = { type: 'win' };
          break;
        }
      }

      updateLine();
      if (trigger?.type === 'error') handleError(trigger.cell);
      else if (trigger?.type === 'win') handleWin();
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      drawing = false;
      try { svg.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
    }

    function handleError(cell) {
      errorBlock = true;
      drawing = false;
      try { if (pointerId != null) svg.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      Sounds.fail();
      Speech.say('Spróbuj jeszcze raz', { rate: 1, cancel: true });

      const cen = cellCenter(cell);
      const cross = makeSvg('text', {
        x: cen.x, y: cen.y, class: 'maze-wrong-cross',
        'text-anchor': 'middle', 'dominant-baseline': 'middle',
      });
      cross.textContent = '✕';
      crossLayer.appendChild(cross);
      svg.classList.add('shake');

      setTimeout(() => {
        linePoints = linePoints.slice(0, lastCheckpoint.pointsLength);
        currentCell = { ...lastCheckpoint.cell };
        revealedCount = lastCheckpoint.revealedCount;
        updateLine();
        updateDigitsBar();
        svg.classList.remove('shake');
        crossLayer.innerHTML = '';
        errorBlock = false;
      }, 750);
    }

    function handleWin() {
      won = true;
      drawing = false;
      try { if (pointerId != null) svg.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      updateDigitsBar();
      setTimeout(() => {
        Celebrate.show({ onDone: () => { if (onWin) onWin(); } });
      }, 400);
    }

    drawWalls();
    drawDigits();
    drawStartEnd();
    initLine();
    updateDigitsBar();

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
  }

  return { start };
})();
