const COLS = 9;
const MAX_ADDS_PER_STAGE = 5;
const PAIR_RULE_TEXT = 'Find equal pairs or pairs that add to 10.';

const DIFFICULTIES = {
  test: {
    label: 'Test',
    seedOffset: 17,
    startNumbers: 18,
    targetStartPairs: [8, 12],
    forcedPairChance: 0.65,
    maxAttempts: 80,
    adds: 5,
    scoreMultiplier: 1,
    generator: 'test',
  },
  basic: {
    label: 'Basic',
    seedOffset: 101,
    startNumbers: 42,
    targetStartPairs: [4, 6],
    forcedPairChance: 0.22,
    maxAttempts: 900,
    adds: 5,
    scoreMultiplier: 1,
  },
  medium: {
    label: 'Medium',
    seedOffset: 991,
    startNumbers: 44,
    targetStartPairs: [3, 4],
    forcedPairChance: 0.18,
    maxAttempts: 1200,
    adds: 5,
    scoreMultiplier: 2,
  },
  hard: {
    label: 'Hard',
    seedOffset: 1601,
    startNumbers: 44,
    targetStartPairs: [2, 3],
    forcedPairChance: 0.14,
    maxAttempts: 1400,
    adds: 5,
    scoreMultiplier: 3,
  },
  expert: {
    label: 'Expert',
    seedOffset: 2309,
    startNumbers: 44,
    targetStartPairs: [1, 3],
    forcedPairChance: 0.11,
    maxAttempts: 1600,
    adds: 4,
    scoreMultiplier: 4,
  },
  master: {
    label: 'Master',
    seedOffset: 3571,
    startNumbers: 53,
    targetStartPairs: [2, 4],
    forcedPairChance: 0.10,
    maxAttempts: 1900,
    adds: 4,
    scoreMultiplier: 5,
  },
};

const UNLOCK_REQUIREMENTS = {
  test: null,
  basic: null,
  medium: { previous: 'basic', score: 1500 },
  hard: { previous: 'medium', score: 5000 },
  expert: { previous: 'hard', score: 10000 },
  master: { previous: 'expert', score: 17500 },
};

const DIFFICULTY_BEST_STORAGE_PREFIX = 'numberMatchBestDifficulty:';

const DIFFICULTY_ORDER = ['test', 'basic', 'medium', 'hard', 'expert', 'master'];

function loadDifficultyBests() {
  return DIFFICULTY_ORDER.reduce((bests, key) => {
    bests[key] = Number(localStorage.getItem(`${DIFFICULTY_BEST_STORAGE_PREFIX}${key}`) || 0);
    return bests;
  }, {});
}

function difficultyBest(key) {
  return state.difficultyBests?.[key] || 0;
}

function isDifficultyUnlocked(key) {
  const requirement = UNLOCK_REQUIREMENTS[key];
  if (!requirement) return true;
  return difficultyBest(requirement.previous) >= requirement.score;
}

function unlockDescription(key) {
  const requirement = UNLOCK_REQUIREMENTS[key];
  if (!requirement) return '';
  const previous = DIFFICULTIES[requirement.previous].label;
  return `Unlock at ${previous} best ${requirement.score.toLocaleString()}`;
}

function saveDifficultyBest(key, score) {
  if (!DIFFICULTIES[key]) return;
  if (score <= difficultyBest(key)) return;
  state.difficultyBests[key] = score;
  localStorage.setItem(`${DIFFICULTY_BEST_STORAGE_PREFIX}${key}`, String(score));
}


const els = {
  app: document.querySelector('.phone-app'),
  homeScreen: document.getElementById('homeScreen'),
  gameScreen: document.getElementById('gameScreen'),
  gameOverScreen: document.getElementById('gameOverScreen'),
  gameOverBoard: document.getElementById('gameOverBoard'),
  gameOverScore: document.getElementById('gameOverScore'),
  gameOverNewGame: document.getElementById('gameOverNewGame'),
  gameOverMain: document.getElementById('gameOverMain'),
  difficultyButtons: Array.from(document.querySelectorAll('[data-difficulty]')),
  board: document.getElementById('board'),
  boardWrap: document.getElementById('boardWrap'),
  effectLayer: document.getElementById('effectLayer'),
  score: document.getElementById('score'),
  bestScore: document.getElementById('bestScore'),
  homeBestScore: document.getElementById('homeBestScore'),
  stage: document.getElementById('stage'),
  difficulty: document.getElementById('difficulty'),
  digitsRow: document.getElementById('digitsRow'),
  message: document.getElementById('message'),
  addBtn: document.getElementById('addBtn'),
  hintBtn: document.getElementById('hintBtn'),
  backBtn: document.getElementById('backBtn'),
  addCount: document.getElementById('addCount'),
  rulesText: document.getElementById('rulesText'),
  copyBoardBtn: document.getElementById('copyBoardBtn'),
};

const state = {
  stage: 1,
  difficultyKey: 'basic',
  score: 0,
  allTime: Number(localStorage.getItem('numberMatchBest') || 0),
  difficultyBests: loadDifficultyBests(),
  board: [],
  selected: null,
  hintPair: null,
  badPair: [],
  matchingPair: [],
  clearingPair: [],
  lineClearingCellIds: new Set(),
  fieldClearing: false,
  stageDigits: new Set(),
  digitsAnnounced: new Set(),
  justClearedDigits: new Set(),
  totalCleared: 0,
  transitioning: false,
  justAddedStart: -1,
  addsRemaining: MAX_ADDS_PER_STAGE,
  lost: false,
  rowAnimating: false,
  addAnimating: false,
  addBluePulse: new Set(),
  stageIntro: false,
  gameOver: false,
  gameToken: 0,
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function interactionLocked() {
  return state.lost || state.fieldClearing || state.addAnimating || state.stageIntro || state.gameOver;
}

function controlsLocked() {
  return state.lost || state.fieldClearing || state.rowAnimating || state.addAnimating || state.stageIntro || state.gameOver;
}

function refreshRowAnimationState() {
  state.rowAnimating = state.lineClearingCellIds.size > 0;
}

function getRowCellIds(rowIndices) {
  const ids = new Set();
  rowIndices.forEach(rowIndex => {
    const start = rowIndex * COLS;
    state.board.slice(start, start + COLS).forEach(cell => {
      if (cell) ids.add(cell.id);
    });
  });
  return ids;
}

function removeRowsByCellIds(cellIds) {
  const next = [];
  const rowCount = Math.ceil(state.board.length / COLS);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const start = rowIndex * COLS;
    const row = state.board.slice(start, start + COLS);
    const shouldRemove = row.length > 0 && row.every(cell => cell && cellIds.has(cell.id));
    if (!shouldRemove) next.push(...row);
  }

  state.board = next;
}

function mulberry32(seed) {
  return function rand() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededInt(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

function currentDifficulty() {
  return DIFFICULTIES[state.difficultyKey] || DIFFICULTIES.basic;
}

function scoreFactor() {
  return state.stage * (currentDifficulty().scoreMultiplier || 1);
}

function scaledPoints(basePoints) {
  return basePoints * scoreFactor();
}

function pairResult(basePoints, label, kind, animation = 'straight') {
  const points = scaledPoints(basePoints);
  return {
    valid: true,
    basePoints,
    points,
    reason: `${label} +${points}`,
    kind,
    animation,
  };
}

function updateRulesText() {
  if (!els.rulesText) return;
  const factor = scoreFactor();
  const diff = currentDifficulty();
  els.rulesText.textContent = `${diff.label} Stage ${state.stage}: Adjacent +${1 * factor} • wrap +${2 * factor} • separated +${4 * factor} • line +${10 * factor} • field +${150 * factor}`;
}

function shuffledDigits(rand) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

function immediateNeighborIndices(index, currentLength) {
  const r = rowOf(index);
  const c = colOf(index);
  const neighbors = [];
  if (c > 0) neighbors.push(index - 1);
  if (r > 0) neighbors.push(index - COLS);
  if (r > 0 && c > 0) neighbors.push(index - COLS - 1);
  if (r > 0 && c < COLS - 1 && index - COLS + 1 < currentLength) neighbors.push(index - COLS + 1);
  return neighbors;
}

function countImmediateStartPairs(values) {
  let count = 0;
  const directions = [
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (let i = 0; i < values.length; i += 1) {
    const r = rowOf(i);
    const c = colOf(i);
    for (const [dr, dc] of directions) {
      const nextC = c + dc;
      const j = (r + dr) * COLS + nextC;
      if (nextC >= 0 && nextC < COLS && j >= 0 && j < values.length && valuesCanPair(values[i], values[j])) {
        count += 1;
      }
    }
  }

  return count;
}

function generateTestSequence(profile, stageNumber) {
  const rand = mulberry32(4111 + profile.seedOffset + stageNumber * 379);
  const values = [];
  while (values.length < profile.startNumbers) {
    const value = seededInt(rand, 1, 9);
    const mate = rand() < 0.58 ? value : 10 - value;
    values.push(value);
    if (values.length < profile.startNumbers) values.push(mate);
  }
  return values.slice(0, profile.startNumbers);
}

function generateControlledRandomSequence(profile, stageNumber, attempt) {
  const rand = mulberry32(7207 + profile.seedOffset + stageNumber * 9973 + attempt * 131);
  const values = [];
  const [targetMin] = profile.targetStartPairs;

  for (let index = 0; index < profile.startNumbers; index += 1) {
    const candidates = shuffledDigits(rand);
    let bestScore = Infinity;
    let best = [];

    for (const value of candidates) {
      let newPairs = 0;
      for (const neighborIndex of immediateNeighborIndices(index, values.length)) {
        if (valuesCanPair(value, values[neighborIndex])) newPairs += 1;
      }

      if (newPairs < bestScore) {
        bestScore = newPairs;
        best = [value];
      } else if (newPairs === bestScore) {
        best.push(value);
      }
    }

    const currentPairs = countImmediateStartPairs(values);
    if (currentPairs < targetMin && rand() < profile.forcedPairChance) {
      const onePairOptions = candidates.filter(value => {
        let newPairs = 0;
        for (const neighborIndex of immediateNeighborIndices(index, values.length)) {
          if (valuesCanPair(value, values[neighborIndex])) newPairs += 1;
        }
        return newPairs === 1;
      });
      values.push(onePairOptions.length ? onePairOptions[Math.floor(rand() * onePairOptions.length)] : best[Math.floor(rand() * best.length)]);
    } else {
      values.push(best[Math.floor(rand() * best.length)]);
    }
  }

  return values;
}

function pureBetweenLinearClear(board, a, b) {
  const step = a < b ? 1 : -1;
  for (let i = a + step; i !== b; i += step) {
    if (i >= board.length || board[i] !== null) return false;
  }
  return true;
}

function pureBetweenDirectionalClear(board, a, b, dr, dc) {
  let r = rowOf(a) + dr;
  let c = colOf(a) + dc;
  const targetR = rowOf(b);
  const targetC = colOf(b);

  while (r !== targetR || c !== targetC) {
    const i = r * COLS + c;
    if (i >= board.length || board[i] !== null) return false;
    r += dr;
    c += dc;
  }

  return true;
}

function pureHasDirectionalPath(board, a, b) {
  const r1 = rowOf(a), c1 = colOf(a);
  const r2 = rowOf(b), c2 = colOf(b);
  const drRaw = r2 - r1;
  const dcRaw = c2 - c1;

  if (r1 === r2) {
    return pureBetweenDirectionalClear(board, a, b, 0, dcRaw > 0 ? 1 : -1);
  }

  if (c1 === c2) {
    return pureBetweenDirectionalClear(board, a, b, drRaw > 0 ? 1 : -1, 0);
  }

  if (Math.abs(drRaw) === Math.abs(dcRaw)) {
    return pureBetweenDirectionalClear(board, a, b, drRaw > 0 ? 1 : -1, dcRaw > 0 ? 1 : -1);
  }

  return false;
}

function purePairClass(board, a, b) {
  if (a === b || a >= board.length || b >= board.length) return null;
  if (board[a] === null || board[b] === null) return null;
  if (!valuesCanPair(board[a], board[b])) return null;

  if (isDirectLineWrap(a, b)) return { a, b, priority: 2 };
  if (isDirectNeighbor(a, b)) return { a, b, priority: 1 };
  if (pureHasDirectionalPath(board, a, b)) return { a, b, priority: 4 };
  if (pureBetweenLinearClear(board, a, b)) return { a, b, priority: 4 };
  return null;
}

function pureFindPairs(board) {
  const active = [];
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] !== null) active.push(i);
  }

  const pairs = [];
  for (let x = 0; x < active.length; x += 1) {
    for (let y = x + 1; y < active.length; y += 1) {
      const pair = purePairClass(board, active[x], active[y]);
      if (pair) pairs.push(pair);
    }
  }

  return pairs;
}

function pureRemoveRows(board) {
  const next = [];
  const rowCount = Math.ceil(board.length / COLS);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = board.slice(rowIndex * COLS, rowIndex * COLS + COLS);
    if (row.length > 0 && row.every(value => value === null)) continue;
    next.push(...row);
  }

  return next;
}

function pureSolveGreedy(values, maxAdds = MAX_ADDS_PER_STAGE) {
  let board = values.slice();
  let addsRemaining = maxAdds;
  let guard = 0;

  while (guard < 1000) {
    if (board.every(value => value === null)) return true;

    const pairs = pureFindPairs(board);
    if (pairs.length > 0) {
      // Use a deterministic solver pass. It prefers simple visible moves first,
      // but the candidate only passes if this full clearing path succeeds.
      pairs.sort((p1, p2) => (p1.priority - p2.priority) || (p1.a - p2.a) || (p1.b - p2.b));
      const { a, b } = pairs[0];
      board[a] = null;
      board[b] = null;
      board = pureRemoveRows(board);
    } else {
      if (addsRemaining <= 0) return false;
      const remaining = board.filter(value => value !== null);
      if (remaining.length === 0) return true;
      board.push(...remaining);
      addsRemaining -= 1;
    }

    guard += 1;
  }

  return false;
}

function fallbackNestedSequence(profile, stageNumber) {
  const rand = mulberry32(9901 + profile.seedOffset + stageNumber * 557);
  const sequence = [];
  while (sequence.length < profile.startNumbers) {
    const value = seededInt(rand, 1, 9);
    const mate = rand() < 0.5 ? value : 10 - value;
    sequence.push(value, mate);
  }
  return sequence.slice(0, profile.startNumbers);
}

function generateStage(stageNumber, difficultyKey = state.difficultyKey) {
  const profile = DIFFICULTIES[difficultyKey] || DIFFICULTIES.basic;

  if (profile.generator === 'test') {
    const values = generateTestSequence(profile, stageNumber);
    return values.map((value, index) => ({
      value,
      cleared: false,
      id: `${difficultyKey}-${stageNumber}-${index}-test`,
    }));
  }
  const [targetMin, targetMax] = profile.targetStartPairs;
  let relaxedCandidate = null;

  for (let attempt = 0; attempt < profile.maxAttempts; attempt += 1) {
    const values = generateControlledRandomSequence(profile, stageNumber, attempt);
    const openingPairs = countImmediateStartPairs(values);

    if (openingPairs >= targetMin && openingPairs <= targetMax && pureSolveGreedy(values, profile.adds)) {
      return values.map((value, index) => ({
        value,
        cleared: false,
        id: `${difficultyKey}-${stageNumber}-${index}-${attempt}`,
      }));
    }

    if (!relaxedCandidate && openingPairs >= Math.max(1, targetMin - 1) && openingPairs <= targetMax + 2 && pureSolveGreedy(values, profile.adds)) {
      relaxedCandidate = values;
    }
  }

  const fallback = relaxedCandidate || fallbackNestedSequence(profile, stageNumber);
  return fallback.map((value, index) => ({
    value,
    cleared: false,
    id: `${difficultyKey}-${stageNumber}-${index}-fallback`,
  }));
}

function startStage(stageNumber, options = {}) {
  const { intro = false } = options;
  state.transitioning = false;
  state.stageIntro = intro;
  state.rowAnimating = false;
  state.addAnimating = false;
  state.addBluePulse = new Set();
  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.matchingPair = [];
  state.clearingPair = [];
  state.lineClearingCellIds = new Set();
  state.fieldClearing = false;
  state.justAddedStart = -1;
  state.addsRemaining = currentDifficulty().adds || MAX_ADDS_PER_STAGE;
  state.lost = false;
  state.gameOver = false;
  state.board = generateStage(stageNumber, state.difficultyKey);
  state.stageDigits = new Set(state.board.map(cell => cell.value));
  state.digitsAnnounced = new Set();
  state.justClearedDigits = new Set();
  updateMessage(`${currentDifficulty().label} Stage ${stageNumber}: ${PAIR_RULE_TEXT}`);
  render();
}

function updateMessage(text) {
  els.message.textContent = text;
}

function activeCells() {
  return state.board
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => !cell.cleared);
}

function rowOf(index) { return Math.floor(index / COLS); }
function colOf(index) { return index % COLS; }

function betweenLinearClear(a, b) {
  const step = a < b ? 1 : -1;
  for (let i = a + step; i !== b; i += step) {
    if (!state.board[i] || !state.board[i].cleared) return false;
  }
  return true;
}

function betweenDirectionalClear(a, b, dr, dc) {
  let r = rowOf(a) + dr;
  let c = colOf(a) + dc;
  const targetR = rowOf(b);
  const targetC = colOf(b);

  while (r !== targetR || c !== targetC) {
    const i = r * COLS + c;
    if (!state.board[i] || !state.board[i].cleared) return false;
    r += dr;
    c += dc;
  }
  return true;
}

function isDirectNeighbor(a, b) {
  const dr = Math.abs(rowOf(a) - rowOf(b));
  const dc = Math.abs(colOf(a) - colOf(b));
  return dr <= 1 && dc <= 1 && (dr + dc > 0);
}

function isDirectLineWrap(a, b) {
  const diff = Math.abs(a - b);
  if (diff !== 1) return false;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return colOf(min) === COLS - 1 && colOf(max) === 0 && rowOf(max) === rowOf(min) + 1;
}

function hasDirectionalPath(a, b) {
  const r1 = rowOf(a), c1 = colOf(a);
  const r2 = rowOf(b), c2 = colOf(b);
  const drRaw = r2 - r1;
  const dcRaw = c2 - c1;

  if (r1 === r2) {
    const dc = dcRaw > 0 ? 1 : -1;
    return betweenDirectionalClear(a, b, 0, dc);
  }

  if (c1 === c2) {
    const dr = drRaw > 0 ? 1 : -1;
    return betweenDirectionalClear(a, b, dr, 0);
  }

  if (Math.abs(drRaw) === Math.abs(dcRaw)) {
    const dr = drRaw > 0 ? 1 : -1;
    const dc = dcRaw > 0 ? 1 : -1;
    return betweenDirectionalClear(a, b, dr, dc);
  }

  return false;
}

function valuesCanPair(a, b) {
  return a === b || a + b === 10;
}

function classifyPair(a, b) {
  if (a === b) return { valid: false };
  const cellA = state.board[a];
  const cellB = state.board[b];
  if (!cellA || !cellB || cellA.cleared || cellB.cleared) return { valid: false };
  if (!valuesCanPair(cellA.value, cellB.value)) return { valid: false };

  if (isDirectLineWrap(a, b)) {
    return pairResult(2, 'Line-wrap pair', 'wrap', 'wrap');
  }

  if (isDirectNeighbor(a, b)) {
    return pairResult(1, 'Adjacent pair', 'adjacent', 'straight');
  }

  if (hasDirectionalPath(a, b)) {
    return pairResult(4, 'Separated pair', 'separated', 'straight');
  }

  if (betweenLinearClear(a, b)) {
    // A separated line-wrap pair follows the reading order across row edges.
    // It should animate around the board edge instead of drawing a diagonal line.
    const wrapsAcrossRows = rowOf(a) !== rowOf(b);
    return pairResult(
      4,
      'Separated pair',
      wrapsAcrossRows ? 'wrap-separated' : 'separated',
      wrapsAcrossRows ? 'wrap' : 'straight'
    );
  }

  return { valid: false };
}

function findValidPair() {
  const active = activeCells();
  for (let x = 0; x < active.length; x += 1) {
    for (let y = x + 1; y < active.length; y += 1) {
      const a = active[x].index;
      const b = active[y].index;
      const result = classifyPair(a, b);
      if (result.valid) return { a, b, ...result };
    }
  }
  return null;
}

function checkNoMovesAutoFail() {
  if (
    state.lost ||
    state.gameOver ||
    state.transitioning ||
    state.fieldClearing ||
    state.stageIntro ||
    state.addAnimating ||
    state.rowAnimating
  ) {
    return false;
  }

  if (activeCells().length === 0) {
    completeStage();
    return true;
  }

  const pair = findValidPair();
  if (!pair && state.addsRemaining <= 0) {
    updateMessage('No pairs are left. Game completed.');
    loseStage();
    return true;
  }

  if (!pair) {
    updateMessage(`No pairs are left. Tap + to add more numbers. ${state.addsRemaining} ${state.addsRemaining === 1 ? 'add' : 'adds'} left.`);
    render();
    return false;
  }

  return false;
}

function boardStateText() {
  const lines = [];
  for (let i = 0; i < state.board.length; i += COLS) {
    const row = state.board.slice(i, i + COLS);
    lines.push(row.map(cell => cell.cleared ? `[${cell.value}]` : String(cell.value)).join(' '));
  }
  return lines.join('\n');
}

async function copyBoardState() {
  const text = boardStateText();
  if (!text) return;

  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (error) {
    copied = false;
  }

  if (!copied) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    textarea.remove();
  }

  if (els.copyBoardBtn) {
    const original = els.copyBoardBtn.textContent;
    els.copyBoardBtn.textContent = copied ? 'Copied!' : 'Copy Failed';
    els.copyBoardBtn.classList.toggle('copied', copied);
    setTimeout(() => {
      if (!els.copyBoardBtn) return;
      els.copyBoardBtn.textContent = original;
      els.copyBoardBtn.classList.remove('copied');
    }, 1200);
  }

  updateMessage(copied ? 'Current board state copied.' : 'Copy failed. Try selecting the board text manually.');
}

function addScore(points) {
  state.score += points;
  saveDifficultyBest(state.difficultyKey, state.score);
  if (state.score > state.allTime) {
    state.allTime = state.score;
    localStorage.setItem('numberMatchBest', String(state.allTime));
  }
}

function getFullyClearedRows() {
  const rows = [];
  const rowCount = Math.ceil(state.board.length / COLS);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const start = rowIndex * COLS;
    const row = state.board.slice(start, start + COLS);
    if (row.length > 0 && row.every(cell => cell.cleared)) {
      rows.push(rowIndex);
    }
  }

  return rows;
}

function removeRows(rowIndices) {
  const removeSet = new Set(rowIndices);
  const next = [];
  const rowCount = Math.ceil(state.board.length / COLS);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const start = rowIndex * COLS;
    const row = state.board.slice(start, start + COLS);
    if (!removeSet.has(rowIndex)) next.push(...row);
  }

  state.board = next;
}

function digitDone(digit) {
  if (!state.stageDigits.has(digit)) return false;
  return state.board.every(cell => cell.value !== digit || cell.cleared);
}

function newlyClearedDigits(beforeDone) {
  const digits = [];
  for (let d = 1; d <= 9; d += 1) {
    if (
      state.stageDigits.has(d) &&
      !beforeDone.has(d) &&
      !state.digitsAnnounced.has(d) &&
      digitDone(d)
    ) {
      digits.push(d);
    }
  }
  return digits;
}

function currentDoneDigits() {
  const done = new Set();
  for (let d = 1; d <= 9; d += 1) {
    if (digitDone(d)) done.add(d);
  }
  return done;
}

function markDigitsAnnounced(digits) {
  digits.forEach(digit => state.digitsAnnounced.add(digit));
  state.justClearedDigits = new Set(digits);
  if (digits.length > 0) {
    setTimeout(() => {
      digits.forEach(digit => state.justClearedDigits.delete(digit));
      renderDigits();
    }, 750);
  }
}

function getCellElement(index) {
  return els.board.querySelector(`[data-index="${index}"]`);
}

function getAppRelativeRect(element) {
  const appRect = els.app.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left - appRect.left,
    top: rect.top - appRect.top,
    width: rect.width,
    height: rect.height,
    centerX: rect.left - appRect.left + rect.width / 2,
    centerY: rect.top - appRect.top + rect.height / 2,
    viewportTop: rect.top,
    viewportLeft: rect.left,
  };
}

function topLeftMostIndex(indices) {
  return indices
    .map(index => ({ index, el: getCellElement(index) }))
    .filter(item => item.el)
    .map(item => ({ ...item, rect: item.el.getBoundingClientRect() }))
    .sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left))[0]?.index ?? indices[0];
}

function getScoreAnchorPoint(indices) {
  if (!els.app) return null;
  const appRect = els.app.getBoundingClientRect();
  const rect = indices
    .map(index => getCellElement(index))
    .filter(Boolean)
    .map(el => el.getBoundingClientRect())
    .sort((a, b) => (a.top - b.top) || (a.left - b.left))[0];

  if (!rect) return null;
  return {
    x: rect.left - appRect.left + rect.width * 0.5,
    y: rect.top - appRect.top + rect.height * 0.32,
  };
}

function previewRowsClearedByPair(a, b) {
  const rowsBefore = new Set(getFullyClearedRows());
  const rowsToCheck = [...new Set([rowOf(a), rowOf(b)])];
  const rows = [];

  for (const rowIndex of rowsToCheck) {
    if (rowsBefore.has(rowIndex)) continue;
    const start = rowIndex * COLS;
    const row = state.board.slice(start, start + COLS);
    if (row.length > 0 && row.every((cell, offset) => cell && (cell.cleared || start + offset === a || start + offset === b))) {
      rows.push(rowIndex);
    }
  }

  return rows;
}

function createFloatingScore(points, indices = [], options = {}) {
  if (!points || !els.effectLayer || !els.app) return;

  const appRect = els.app.getBoundingClientRect();
  let x = appRect.width / 2;
  let y = 230;

  if (options.anchorPoint) {
    x = options.anchorPoint.x;
    y = options.anchorPoint.y;
  }

  const rects = options.anchorPoint ? [] : indices
    .map(index => getCellElement(index))
    .filter(Boolean)
    .map(el => el.getBoundingClientRect());

  if (rects.length > 0) {
    if (options.anchor === 'topLeftCell') {
      const rect = rects.sort((a, b) => (a.top - b.top) || (a.left - b.left))[0];
      x = rect.left - appRect.left + rect.width * 0.5;
      y = rect.top - appRect.top + rect.height * 0.32;
    } else {
      const cx = rects.reduce((sum, rect) => sum + rect.left + rect.width / 2, 0) / rects.length;
      const cy = rects.reduce((sum, rect) => sum + rect.top + rect.height / 2, 0) / rects.length;
      x = cx - appRect.left;
      y = cy - appRect.top;
    }
  }

  const bubble = document.createElement('div');
  bubble.className = 'score-pop';
  bubble.textContent = `+${points}`;
  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
  els.effectLayer.appendChild(bubble);
  bubble.addEventListener('animationend', () => bubble.remove(), { once: true });
}


function createFlyingAddNumber(value, fromRect, toRect, isBlue = true) {
  if (!els.effectLayer) return Promise.resolve();

  const flying = document.createElement('div');
  flying.className = 'add-fly-number' + (isBlue ? '' : ' black-layer');
  flying.textContent = value;
  flying.style.left = `${fromRect.left}px`;
  flying.style.top = `${fromRect.top}px`;
  flying.style.width = `${fromRect.width}px`;
  flying.style.height = `${fromRect.height}px`;
  els.effectLayer.appendChild(flying);

  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;
  const animation = flying.animate(
    [
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1)`, opacity: 1 },
    ],
    {
      duration: 560,
      easing: 'cubic-bezier(.05,.82,.14,1)',
      fill: 'forwards',
    }
  );

  return animation.finished
    .catch(() => {})
    .then(() => {
      flying.remove();
    });
}

async function animateAddNumbers(addPlan, runToken) {
  if (!addPlan.length) return;

  await wait(130);
  if (runToken !== state.gameToken) return;

  const animations = [];
  const stagger = 54;

  for (let i = 0; i < addPlan.length; i += 1) {
    if (runToken !== state.gameToken) return;
    const item = addPlan[i];
    const sourceEl = getCellElement(item.sourceIndex);
    const targetEl = getCellElement(item.targetIndex);
    if (!sourceEl || !targetEl) continue;

    const fromRect = getAppRelativeRect(sourceEl);
    const toRect = getAppRelativeRect(targetEl);

    sourceEl.classList.remove('add-source-blue');
    state.addBluePulse.delete(item.sourceIndex);

    const animation = createFlyingAddNumber(item.value, fromRect, toRect, item.addedBlue).then(() => {
      if (runToken !== state.gameToken) return;
      const cell = state.board[item.targetIndex];
      if (cell) cell.addingHidden = false;
      const latestTarget = getCellElement(item.targetIndex);
      if (latestTarget) latestTarget.classList.remove('adding-hidden');
    });
    animations.push(animation);

    await wait(stagger);
  }

  await Promise.allSettled(animations);
}

function createMatchBox(rect) {
  const box = document.createElement('div');
  box.className = 'match-box';
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.top}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
  return box;
}

function createMatchLine(rectA, rectB, extraClass = '') {
  const dx = rectB.centerX - rectA.centerX;
  const dy = rectB.centerY - rectA.centerY;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const line = document.createElement('div');
  line.className = `match-line ${extraClass}`.trim();
  line.style.left = `${rectA.centerX}px`;
  line.style.top = `${rectA.centerY - 2}px`;
  line.style.width = `${distance}px`;
  line.style.setProperty('--match-angle', `${angle}rad`);
  return line;
}

function createWrapLineSegments(upperRect, lowerRect, upperIndex, lowerIndex) {
  const boardRect = getAppRelativeRect(els.boardWrap);
  const leftEdge = boardRect.left - 1;
  const rightEdge = boardRect.left + boardRect.width + 1;
  const segments = [];

  // The reference game wraps by going from the lower row number to the left edge,
  // then resuming from the right edge of the row above toward the upper number.
  const lowerToLeft = { centerX: leftEdge, centerY: lowerRect.centerY };
  segments.push(createMatchLine(lowerRect, lowerToLeft, 'wrap-line wrap-line-lower'));

  const lowerRow = rowOf(lowerIndex);
  const upperRow = rowOf(upperIndex);
  for (let row = lowerRow - 1; row > upperRow; row -= 1) {
    const firstCell = getCellElement(row * COLS);
    if (!firstCell) continue;
    const rowRect = getAppRelativeRect(firstCell);
    const y = rowRect.centerY;
    segments.push(createMatchLine({ centerX: rightEdge, centerY: y }, { centerX: leftEdge, centerY: y }, 'wrap-line wrap-line-middle'));
  }

  const upperFromRight = { centerX: rightEdge, centerY: upperRect.centerY };
  segments.push(createMatchLine(upperFromRight, upperRect, 'wrap-line wrap-line-upper'));
  return segments;
}

async function animateMatch(a, b, result = {}) {
  if (!els.effectLayer || !els.app) return;
  const elA = getCellElement(a);
  const elB = getCellElement(b);
  if (!elA || !elB) return;

  const rectA = getAppRelativeRect(elA);
  const rectB = getAppRelativeRect(elB);
  const overlay = document.createElement('div');
  overlay.className = 'match-overlay';

  const isLineWrap = result.animation === 'wrap' || result.kind === 'wrap' || isDirectLineWrap(a, b);
  const upperIndex = rowOf(a) <= rowOf(b) ? a : b;
  const lowerIndex = rowOf(a) <= rowOf(b) ? b : a;
  const lines = isLineWrap
    ? createWrapLineSegments(
        upperIndex === a ? rectA : rectB,
        lowerIndex === a ? rectA : rectB,
        upperIndex,
        lowerIndex
      )
    : [createMatchLine(rectA, rectB)];
  const boxA = createMatchBox(rectA);
  const boxB = createMatchBox(rectB);

  overlay.append(...lines, boxA, boxB);
  els.effectLayer.appendChild(overlay);

  // Trigger the CSS keyframes after the elements are in the DOM.
  requestAnimationFrame(() => overlay.classList.add('play'));
  await wait(880);
  overlay.remove();
}

function showNumberClearedToast(digit) {
  if (!els.effectLayer || !els.app || !els.boardWrap) return;

  const appRect = els.app.getBoundingClientRect();
  const boardRect = els.boardWrap.getBoundingClientRect();
  const toast = document.createElement('div');
  toast.className = 'number-toast';
  toast.style.top = `${boardRect.top - appRect.top + boardRect.height * 0.47}px`;
  toast.innerHTML = `
    <div class="number-toast-value">${digit}</div>
    <div class="number-toast-text">Number Cleared!</div>
  `;
  els.effectLayer.appendChild(toast);
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}


function createBoardCenteredText(text, className = '') {
  if (!els.effectLayer || !els.app || !els.boardWrap) return null;
  const appRect = els.app.getBoundingClientRect();
  const boardRect = els.boardWrap.getBoundingClientRect();
  const node = document.createElement('div');
  node.className = `stage-clear-text ${className}`.trim();
  node.textContent = text;
  node.style.left = `${boardRect.left - appRect.left + boardRect.width / 2}px`;
  node.style.top = `${boardRect.top - appRect.top + boardRect.height * 0.42}px`;
  els.effectLayer.appendChild(node);
  return node;
}

async function showStageClearSequence(nextStageNumber, runToken) {
  const completed = createBoardCenteredText('Stage Completed!', 'stage-complete-text');
  await wait(1120);
  if (completed) completed.remove();
  if (runToken !== state.gameToken) return;

  const nextStage = createBoardCenteredText(`Stage ${nextStageNumber}`, 'stage-next-text');
  await wait(960);
  if (nextStage) nextStage.remove();
}

function renderGameOverBoard(snapshot) {
  if (!els.gameOverBoard) return;
  els.gameOverBoard.innerHTML = '';
  const totalCells = COLS * COLS;
  for (let i = 0; i < totalCells; i += 1) {
    const cell = snapshot[i];
    const node = document.createElement('div');
    node.className = 'game-over-mini-cell';
    if (cell) {
      node.textContent = cell.value;
      if (cell.cleared) node.classList.add('cleared');
      if (cell.addedBlue && !cell.cleared) node.classList.add('blue');
    } else {
      node.classList.add('empty');
    }
    els.gameOverBoard.appendChild(node);
  }
}

function showGameOverScreen() {
  state.gameOver = true;
  const snapshot = state.board.map(cell => cell ? { value: cell.value, cleared: cell.cleared, addedBlue: !!cell.addedBlue } : null);
  renderGameOverBoard(snapshot);
  if (els.gameOverScore) els.gameOverScore.textContent = state.score.toLocaleString();
  if (els.gameOverScreen) {
    els.gameOverScreen.classList.remove('hidden');
    els.gameOverScreen.classList.remove('play');
    void els.gameOverScreen.offsetWidth;
    els.gameOverScreen.classList.add('play');
  }
}

async function clearPair(a, b, result) {
  if (interactionLocked()) return;
  const runToken = state.gameToken;
  const scoreAnchorPoint = getScoreAnchorPoint([a, b]);

  const beforeDone = currentDoneDigits();
  const clearedRowsBefore = getFullyClearedRows();

  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.matchingPair = [];
  state.clearingPair = [a, b];
  state.justAddedStart = -1;

  // Mark the numbers as cleared immediately so the board can keep being played
  // while the overlay animation finishes.
  state.board[a].cleared = true;
  state.board[b].cleared = true;
  state.totalCleared += 2;

  const clearedRows = getFullyClearedRows().filter(row => !clearedRowsBefore.includes(row));
  const clearedRowCellIds = getRowCellIds(clearedRows);
  const rowBonus = scaledPoints(clearedRows.length * 10);
  const willClearField = activeCells().length === 0;
  const fieldBonus = willClearField ? scaledPoints(150) : 0;
  const totalPairPoints = result.points + rowBonus + fieldBonus;
  addScore(totalPairPoints);

  const justDone = newlyClearedDigits(beforeDone);
  if (justDone.length > 0) {
    markDigitsAnnounced(justDone);
  }

  let message = `${result.reason}`;
  if (clearedRows.length > 0) {
    message += ` • ${clearedRows.length === 1 ? 'line' : 'lines'} cleared +${rowBonus}`;
  }
  if (willClearField) {
    message += ` • field cleared +${fieldBonus}`;
  }
  updateMessage(message);
  render();

  // Run the visual match animation without blocking further moves when safe.
  animateMatch(a, b, result).then(async () => {
    if (runToken !== state.gameToken) return;
    state.clearingPair = [];
    render();
    createFloatingScore(totalPairPoints, [a, b], { anchorPoint: scoreAnchorPoint, anchor: 'topLeftCell' });
    justDone.forEach((digit, i) => setTimeout(() => showNumberClearedToast(digit), i * 260));

    if (clearedRows.length > 0) {
      clearedRowCellIds.forEach(id => state.lineClearingCellIds.add(id));
      refreshRowAnimationState();
      render();
      await wait(1720);
      if (runToken !== state.gameToken) return;
      state.selected = null;
      clearedRowCellIds.forEach(id => state.lineClearingCellIds.delete(id));
      removeRowsByCellIds(clearedRowCellIds);
      refreshRowAnimationState();
      render();
      await wait(40);
    }

    if (activeCells().length === 0 && !state.rowAnimating && !state.transitioning) {
      await completeStage({ awardBonus: false });
    } else {
      render();
      checkNoMovesAutoFail();
    }
  });
}

async function completeStage(options = {}) {
  if (state.transitioning || state.fieldClearing || state.stageIntro || state.gameOver) return;
  const { awardBonus = true } = options;
  const runToken = state.gameToken;
  state.transitioning = true;
  state.rowAnimating = false;
  state.lineClearingCellIds = new Set();
  state.fieldClearing = true;
  const fieldBonus = awardBonus ? scaledPoints(150) : 0;
  if (awardBonus) addScore(fieldBonus);
  updateMessage(awardBonus ? `Field cleared! +${fieldBonus}. Moving to next stage…` : 'Field cleared! Moving to next stage…');
  render();
  if (awardBonus) createFloatingScore(fieldBonus);

  await showStageClearSequence(state.stage + 1, runToken);
  if (runToken !== state.gameToken) return;

  state.fieldClearing = false;
  state.stage += 1;
  startStage(state.stage, { intro: true });
  await wait(1320);
  if (runToken !== state.gameToken) return;
  state.stageIntro = false;
  state.transitioning = false;
  render();
}

function handleCellClick(index) {
  if (interactionLocked()) return;
  const cell = state.board[index];
  if (!cell || cell.cleared) return;


  state.hintPair = null;
  state.badPair = [];

  if (state.selected === null) {
    state.selected = index;
    render();
    return;
  }

  if (state.selected === index) {
    state.selected = null;
    render();
    return;
  }

  const a = state.selected;
  const b = index;
  const result = classifyPair(a, b);
  if (result.valid) {
    clearPair(a, b, result);
  } else {
    state.badPair = [a, b];
    updateMessage('Those two do not connect. The spaces between them must be clear.');
    render();
    setTimeout(() => {
      state.badPair = [];
      render();
    }, 280);
  }
}

async function addMoreNumbers() {
  if (controlsLocked()) return;

  if (state.addsRemaining <= 0) {
    loseStage();
    return;
  }

  const active = activeCells();
  const values = active.map(({ cell }) => cell.value);
  if (values.length === 0) {
    completeStage();
    return;
  }

  const runToken = state.gameToken;
  const startIndex = state.board.length;
  const lastCell = state.board[state.board.length - 1];
  const newLayerBlue = !(lastCell && lastCell.addedBlue && !lastCell.cleared);
  const addPlan = active.map(({ cell, index }, n) => ({
    value: cell.value,
    sourceIndex: index,
    targetIndex: startIndex + n,
    addedBlue: newLayerBlue,
  }));

  state.addsRemaining -= 1;
  state.addAnimating = true;
  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.matchingPair = [];
  state.clearingPair = [];
  state.justAddedStart = -1;
  state.addBluePulse = new Set(active.map(({ index }) => index));

  values.forEach((value, n) => {
    state.board.push({
      value,
      cleared: false,
      addedBlue: newLayerBlue,
      addingHidden: true,
      id: `${state.stage}-added-${Date.now()}-${n}`,
    });
  });

  const word = state.addsRemaining === 1 ? 'add' : 'adds';
  updateMessage(`Added ${values.length} numbers in the same order. ${state.addsRemaining} ${word} left.`);
  render();

  await animateAddNumbers(addPlan, runToken);
  if (runToken !== state.gameToken) return;

  state.addBluePulse = new Set();
  state.board.forEach(cell => {
    if (cell) cell.addingHidden = false;
  });
  state.addAnimating = false;
  render();
  checkNoMovesAutoFail();

  requestAnimationFrame(() => {
    if (runToken !== state.gameToken) return;
    els.boardWrap.scrollTop = els.boardWrap.scrollHeight;
  });
}

function loseStage() {
  state.lost = true;
  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.matchingPair = [];
  state.clearingPair = [];
  state.justAddedStart = -1;
  state.lineClearingCellIds = new Set();
  state.rowAnimating = false;
  state.addAnimating = false;
  state.addBluePulse = new Set();
  state.stageIntro = false;
  updateMessage('Game completed.');
  render();
  showGameOverScreen();
}

function useHint() {
  if (controlsLocked()) return;
  const pair = findValidPair();
  state.selected = null;
  state.badPair = [];
  if (!pair) {
    state.hintPair = null;
    updateMessage(state.addsRemaining > 0 ? 'No pairs are left. Tap + to add more numbers.' : 'No pairs are left. Game completed.');
    els.addBtn.classList.remove('pulse');
    void els.addBtn.offsetWidth;
    els.addBtn.classList.add('pulse');
    render();
    return;
  }
  state.hintPair = [pair.a, pair.b];
  updateMessage(`Hint: ${state.board[pair.a].value} and ${state.board[pair.b].value} can clear.`);
  render();
}

function renderDigits() {
  els.digitsRow.innerHTML = '';
  for (let d = 1; d <= 9; d += 1) {
    const chip = document.createElement('span');
    const done = digitDone(d);
    chip.className = 'digit-chip' + (done ? ' done' : '') + (state.justClearedDigits.has(d) ? ' just-cleared' : '');
    chip.textContent = done ? '✓' : d;
    els.digitsRow.appendChild(chip);
  }
}

function renderBoard() {
  els.board.innerHTML = '';
  const totalCells = Math.max(COLS * 7, Math.ceil(state.board.length / COLS) * COLS);
  for (let index = 0; index < totalCells; index += 1) {
    const cell = state.board[index];
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'cell';
    div.dataset.index = String(index);

    if (!cell) {
      div.classList.add('empty');
      div.setAttribute('aria-hidden', 'true');
    } else {
      div.textContent = cell.value;
      div.setAttribute('aria-label', cell.cleared ? `Cell ${index + 1}, cleared number ${cell.value}` : `Cell ${index + 1}, number ${cell.value}`);
      if (!cell.cleared) {
        div.addEventListener('touchstart', event => {
          event.preventDefault();
          event.stopPropagation();
          handleCellClick(index);
        }, { passive: false });
        div.addEventListener('pointerdown', event => {
          if (event.pointerType === 'touch') return;
          event.preventDefault();
          handleCellClick(index);
        });
      }
      if (cell.cleared) div.classList.add('cleared');
      if (state.selected === index) div.classList.add('selected');
      if (state.hintPair && state.hintPair.includes(index)) div.classList.add('hint');
      if (state.badPair.includes(index)) div.classList.add('bad');
      if (state.matchingPair.includes(index)) div.classList.add('matching');
      if (state.clearingPair.includes(index)) div.classList.add('clearing');
      if (state.lineClearingCellIds.has(cell.id)) {
        div.classList.add('line-clearing');
        div.style.setProperty('--line-delay', `${colOf(index) * 78}ms`);
      }
      if (state.fieldClearing) div.classList.add('field-clearing');
      if (cell.addedBlue && !cell.cleared) div.classList.add('added-blue');
      if (!cell.cleared && state.addBluePulse.has(index)) div.classList.add('add-source-blue');
      if (cell.addingHidden) div.classList.add('adding-hidden');
      if (state.stageIntro && !cell.cleared) {
        div.classList.add('stage-intro-cell');
        div.style.setProperty('--stage-delay', `${colOf(index) * 54 + rowOf(index) * 18}ms`);
      }
      if (state.justAddedStart >= 0 && index >= state.justAddedStart && !cell.cleared) div.classList.add('added');
    }

    els.board.appendChild(div);
  }
}

function difficultyName() {
  return currentDifficulty().label;
}

function renderDifficultyCards() {
  if (!els.difficultyButtons) return;

  els.difficultyButtons.forEach(button => {
    const key = button.dataset.difficulty;
    const diff = DIFFICULTIES[key];
    if (!diff) return;

    const unlocked = isDifficultyUnlocked(key);
    button.disabled = !unlocked;
    button.classList.toggle('locked', !unlocked);
    button.setAttribute('aria-disabled', String(!unlocked));

    let status = button.querySelector('.difficulty-status');
    if (!status) {
      status = document.createElement('span');
      status.className = 'difficulty-status';
      button.appendChild(status);
    }

    if (!unlocked) {
      const requirement = UNLOCK_REQUIREMENTS[key];
      const current = difficultyBest(requirement.previous);
      const previousLabel = DIFFICULTIES[requirement.previous].label;
      status.textContent = `🔒 ${previousLabel} best ${current.toLocaleString()} / ${requirement.score.toLocaleString()}`;
    } else if (key === 'test') {
      status.textContent = 'Always unlocked';
    } else {
      status.textContent = `Best: ${difficultyBest(key).toLocaleString()}`;
    }

    const description = button.querySelector('.difficulty-description');
    if (description && !unlocked) {
      description.dataset.originalText = description.dataset.originalText || description.textContent;
      description.textContent = unlockDescription(key);
    } else if (description && description.dataset.originalText) {
      description.textContent = description.dataset.originalText;
    }
  });
}

function render() {
  els.score.textContent = state.score.toLocaleString();
  els.bestScore.textContent = state.allTime.toLocaleString();
  if (els.homeBestScore) els.homeBestScore.textContent = state.allTime.toLocaleString();
  renderDifficultyCards();
  els.stage.textContent = `Stage ${state.stage}`;
  els.difficulty.textContent = difficultyName();
  els.addCount.textContent = state.addsRemaining.toString();
  els.addBtn.disabled = controlsLocked();
  els.hintBtn.disabled = controlsLocked();
  updateRulesText();
  renderDigits();
  renderBoard();
}

function showHome() {
  state.gameToken += 1;
  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.matchingPair = [];
  state.clearingPair = [];
  state.lineClearingCellIds = new Set();
  state.fieldClearing = false;
  state.rowAnimating = false;
  state.addAnimating = false;
  state.addBluePulse = new Set();
  state.transitioning = false;
  state.stageIntro = false;
  state.gameOver = false;
  state.lost = false;
  els.effectLayer.innerHTML = '';
  if (els.gameOverScreen) els.gameOverScreen.classList.add('hidden');
  els.gameScreen.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
  if (els.homeBestScore) els.homeBestScore.textContent = state.allTime.toLocaleString();
  renderDifficultyCards();
}

function startGame(difficultyKey) {
  const requestedDifficulty = DIFFICULTIES[difficultyKey] ? difficultyKey : 'basic';
  if (!isDifficultyUnlocked(requestedDifficulty)) {
    renderDifficultyCards();
    return;
  }

  state.gameToken += 1;
  state.difficultyKey = requestedDifficulty;
  state.stage = 1;
  state.score = 0;
  state.totalCleared = 0;
  state.lost = false;
  state.lineClearingCellIds = new Set();
  state.rowAnimating = false;
  state.addAnimating = false;
  state.addBluePulse = new Set();
  state.transitioning = false;
  state.stageIntro = false;
  state.gameOver = false;
  els.effectLayer.innerHTML = '';
  if (els.gameOverScreen) els.gameOverScreen.classList.add('hidden');
  els.homeScreen.classList.add('hidden');
  els.gameScreen.classList.remove('hidden');
  startStage(1);
}

function endGameToHome() {
  showHome();
}

function preventGameDoubleTapZoom() {
  let lastTouchEnd = 0;
  const preventZoomGesture = event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('.phone-app')) return;

    const now = Date.now();
    if (now - lastTouchEnd <= 450) {
      event.preventDefault();
      event.stopPropagation();
    }
    lastTouchEnd = now;
  };

  document.addEventListener('touchend', preventZoomGesture, { passive: false, capture: true });
  document.addEventListener('dblclick', event => {
    const target = event.target;
    if (target instanceof Element && target.closest('.phone-app')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true });

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(name => {
    document.addEventListener(name, event => {
      event.preventDefault();
    }, { passive: false });
  });
}

preventGameDoubleTapZoom();

els.addBtn.addEventListener('click', addMoreNumbers);
els.hintBtn.addEventListener('click', useHint);
els.backBtn.addEventListener('click', endGameToHome);
if (els.copyBoardBtn) els.copyBoardBtn.addEventListener('click', copyBoardState);
if (els.gameOverNewGame) els.gameOverNewGame.addEventListener('click', () => startGame(state.difficultyKey));
if (els.gameOverMain) els.gameOverMain.addEventListener('click', showHome);
els.difficultyButtons.forEach(button => {
  button.addEventListener('click', () => startGame(button.dataset.difficulty));
});

render();
showHome();
