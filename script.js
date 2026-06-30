const COLS = 9;
const MAX_ADDS_PER_STAGE = 5;
const PAIR_RULE_TEXT = 'Match equals or sums of 10.';

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
const CURRENT_GAME_STORAGE_KEY = 'numberMatchCurrentGame:v1';
const THEME_STORAGE_KEY = 'numberMatchTheme:v1';
const TUTORIAL_SEEN_STORAGE_KEY = 'numberMatchTutorialSeen:v2';
const THEME_LIGHT_START_STORAGE_KEY = 'numberMatchThemeLightStart:v18';

// This version starts in light mode once, even if an older build saved dark mode.
// After that, the Settings toggle saves the user's choice normally.
try {
  if (localStorage.getItem(THEME_LIGHT_START_STORAGE_KEY) !== '1') {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    localStorage.setItem(THEME_LIGHT_START_STORAGE_KEY, '1');
  }
} catch (error) {}

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
  settingsScreen: document.getElementById('settingsScreen'),
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
  continueGameBtn: document.getElementById('continueGameBtn'),
  continueDescription: document.getElementById('continueDescription'),
  continueStatus: document.getElementById('continueStatus'),
  homeSettingsBtn: document.getElementById('homeSettingsBtn'),
  settingsBackBtn: document.getElementById('settingsBackBtn'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeToggleStatus: document.getElementById('themeToggleStatus'),
  tutorialModal: document.getElementById('tutorialModal'),
  tutorialOpenBtn: document.getElementById('tutorialOpenBtn'),
  tutorialStepLabel: document.getElementById('tutorialStepLabel'),
  tutorialProgress: document.getElementById('tutorialProgress'),
  tutorialStepTitle: document.getElementById('tutorialStepTitle'),
  tutorialStepText: document.getElementById('tutorialStepText'),
  tutorialDemo: document.getElementById('tutorialDemo'),
  tutorialStepTip: document.getElementById('tutorialStepTip'),
  tutorialBackStepBtn: document.getElementById('tutorialBackStepBtn'),
  tutorialNextStepBtn: document.getElementById('tutorialNextStepBtn'),
  tutorialSkipBtn: document.getElementById('tutorialSkipBtn'),
  stage: document.getElementById('stage'),
  difficulty: document.getElementById('difficulty'),
  digitsRow: document.getElementById('digitsRow'),
  message: document.getElementById('message'),
  addBtn: document.getElementById('addBtn'),
  hintBtn: document.getElementById('hintBtn'),
  backBtn: document.getElementById('backBtn'),
  addCount: document.getElementById('addCount'),
  rulesText: document.getElementById('rulesText'),
  rulesMultiplier: document.getElementById('rulesMultiplier'),
  rulesSubtext: document.getElementById('rulesSubtext'),
  copyBoardBtn: document.getElementById('copyBoardBtn'),
  confirmNewGameModal: document.getElementById('confirmNewGameModal'),
  confirmStartNewGame: document.getElementById('confirmStartNewGame'),
  cancelStartNewGame: document.getElementById('cancelStartNewGame'),
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
  blockedCells: [],
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
  gameSeed: 0,
  activeGame: false,
  theme: localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light',
  tutorialStep: 0,
  tutorialDemoSelected: [],
  tutorialDemoComplete: false,
  tutorialBoard: [],
  tutorialHintPair: [],
  tutorialBlockedCells: [],
  tutorialAddedNumbers: false,
  tutorialMessage: '',
};

const TUTORIAL_BASE_BOARD = [
  { value: 4 }, { value: 6 }, { value: 1 }, { value: 1 }, { value: 5 },
  { value: 5 }, { value: 7 }, { value: 8 }, { value: 3 }, null,
  { value: 9 }, null, null, { value: 2 }, null,
];

const TUTORIAL_COLUMNS = 5;
const TUTORIAL_ADD_SOURCE_CELL = 10;
const TUTORIAL_ADD_TARGET_CELL = 11;

const TUTORIAL_STEPS = [
  {
    title: 'Make Your First Match',
    text: 'Tap the 4 and 6. Numbers match when they are the same or add up to 10.',
    tip: 'Selected numbers turn blue. Clear this pair to continue.',
    action: 'match',
    pair: [0, 1],
    success: 'Nice — 4 + 6 makes 10.',
  },
  {
    title: 'Same Numbers Match Too',
    text: 'Now tap the two 1s. Equal numbers can be cleared just like pairs that add to 10.',
    tip: 'Try clearing the two 1s.',
    action: 'match',
    pair: [2, 3],
    success: 'Good — equal numbers work too.',
  },
  {
    title: 'Check Row Ends',
    text: 'The end of one row can connect to the beginning of the next row. Tap the two 5s.',
    tip: 'This clears the first row and gives a line bonus.',
    action: 'match',
    pair: [4, 5],
    lineBonus: true,
    success: 'Row cleared — that is where the line bonus comes from.',
  },
  {
    title: 'Blocked Matches Jiggle',
    text: 'The 7 and 3 add to 10, but the 8 is in the way. Tap the 7 and 3 to see what happens.',
    tip: 'Active numbers block paths. The blocking number will jiggle.',
    action: 'blocked',
    pair: [6, 8],
    blockers: [7],
    success: 'The 8 is blocking the path. Clear it first.',
  },
  {
    title: 'Use a Hint',
    text: 'Tap Hint, then clear the gray highlighted pair. The 8 and 2 are diagonal and add to 10.',
    tip: 'Hint boxes are gray. When you select one, it turns blue.',
    action: 'hint-match',
    pair: [7, 13],
    success: 'Nice — diagonal matches count.',
  },
  {
    title: 'Use Cleared Spaces',
    text: 'Now the 8 is cleared, so the 7 and 3 can connect through that gray space.',
    tip: 'Cleared gray numbers stay visible, but they do not block matches.',
    action: 'match',
    pair: [6, 8],
    success: 'Good — cleared spaces open new paths.',
  },
  {
    title: 'Add Numbers',
    text: 'Only one 9 is left. Tap + to copy the remaining active number, then clear the two 9s.',
    tip: 'Adds are limited in the real game, so save them for when you need them.',
    action: 'add-match',
    pair: [10, 11],
    success: 'Field cleared — clearing the whole board gives the big bonus.',
  },
  {
    title: 'You Are Ready',
    text: 'That is the full loop: find pairs, clear paths, use hints or adds when needed, and keep climbing stages.',
    tip: 'The game autosaves. Use Continue on the home screen to resume later, and Settings to replay this tutorial or toggle dark mode.',
    action: 'done',
  },
];

function applyTheme() {
  const dark = state.theme === 'dark';
  document.documentElement.classList.toggle('theme-dark', dark);
  document.body.classList.toggle('theme-dark', dark);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', dark ? '#0f172a' : '#f7f8fb');
  if (els.themeToggleBtn) {
    els.themeToggleBtn.setAttribute('aria-pressed', String(dark));
    els.themeToggleBtn.classList.toggle('active', dark);
  }
  if (els.themeToggleStatus) els.themeToggleStatus.textContent = dark ? 'On' : 'Off';
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  applyTheme();
}

function showSettings() {
  state.gameToken += 1;
  if (els.gameOverScreen) els.gameOverScreen.classList.add('hidden');
  if (els.gameScreen) els.gameScreen.classList.add('hidden');
  if (els.homeScreen) els.homeScreen.classList.add('hidden');
  if (els.settingsScreen) els.settingsScreen.classList.remove('hidden');
  applyTheme();
}

function hideSettings() {
  if (els.settingsScreen) els.settingsScreen.classList.add('hidden');
  showHome();
}

function tutorialStep() {
  return TUTORIAL_STEPS[state.tutorialStep] || TUTORIAL_STEPS[0];
}

function cloneTutorialBaseBoard() {
  return TUTORIAL_BASE_BOARD.map((cell, index) => {
    if (!cell) return { id: index, value: null, cleared: false, isNew: false };
    return { id: index, value: cell.value, cleared: false, isNew: false };
  });
}

function applyTutorialStepResult(board, step) {
  if (!step) return;
  if (step.action === 'match' || step.action === 'hint-match') {
    (step.pair || []).forEach(index => {
      if (board[index]) board[index].cleared = true;
    });
  }
  if (step.action === 'add-match') {
    if (board[TUTORIAL_ADD_SOURCE_CELL]?.value) {
      board[TUTORIAL_ADD_TARGET_CELL] = {
        id: TUTORIAL_ADD_TARGET_CELL,
        value: board[TUTORIAL_ADD_SOURCE_CELL].value,
        cleared: false,
        isNew: true,
      };
    }
    (step.pair || []).forEach(index => {
      if (board[index]) board[index].cleared = true;
    });
  }
}

function rebuildTutorialBoardForStep(stepIndex) {
  const board = cloneTutorialBaseBoard();
  for (let index = 0; index < stepIndex; index += 1) {
    applyTutorialStepResult(board, TUTORIAL_STEPS[index]);
  }
  state.tutorialBoard = board;
  state.tutorialDemoSelected = [];
  state.tutorialDemoComplete = false;
  state.tutorialHintPair = [];
  state.tutorialBlockedCells = [];
  state.tutorialAddedNumbers = false;
  state.tutorialMessage = '';
}

function resetTutorialInteraction() {
  rebuildTutorialBoardForStep(state.tutorialStep);
}

function tutorialCellLabel(cell, index) {
  if (!cell || !cell.value) return 'Empty space';
  if (cell.cleared) return `Cleared ${cell.value}`;
  return `Number ${cell.value}`;
}

function renderTutorialCell(cell, index) {
  const step = tutorialStep();
  const selected = state.tutorialDemoSelected.includes(index);
  const hinted = state.tutorialHintPair.includes(index);
  const blocked = state.tutorialBlockedCells.includes(index);
  const classes = ['tutorial-demo-cell'];

  if (!cell || !cell.value) classes.push('empty');
  if (cell?.cleared) classes.push('cleared');
  if (cell?.isNew && !cell.cleared) classes.push('new-copy');
  if (hinted && !cell?.cleared) classes.push('hint');
  if (selected && !cell?.cleared) classes.push('selected');
  if (blocked && !cell?.cleared) classes.push('blocker');
  if (state.tutorialDemoComplete && (step.pair || []).includes(index) && step.action !== 'blocked') classes.push('matched');

  const text = cell?.value || '';
  if (!cell || !cell.value || cell.cleared) {
    return `<div class="${classes.join(' ')}" aria-label="${tutorialCellLabel(cell, index)}">${text}</div>`;
  }
  return `<button class="${classes.join(' ')}" type="button" data-tutorial-cell="${index}" aria-label="${tutorialCellLabel(cell, index)}">${text}</button>`;
}

function tutorialActionButtons(step) {
  const showAdd = step.action === 'add-match';
  const showHint = step.action === 'hint-match';
  if (!showAdd && !showHint) return '';
  const hintActive = state.tutorialHintPair.length ? 'active' : '';
  const addActive = state.tutorialAddedNumbers ? 'active' : '';
  return `
    <div class="tutorial-play-actions">
      ${showAdd ? `<button class="tutorial-action-button add ${addActive}" type="button" data-tutorial-action="add"><span>+</span><small>Add</small></button>` : ''}
      ${showHint ? `<button class="tutorial-action-button hint ${hintActive}" type="button" data-tutorial-action="hint"><span>?</span><small>Hint</small></button>` : ''}
    </div>`;
}

function tutorialBonusPill(step) {
  if (step.lineBonus && state.tutorialDemoComplete) return '<div class="tutorial-score-pill">Line Clear +10</div>';
  if (step.action === 'add-match' && state.tutorialDemoComplete) return '<div class="tutorial-score-pill">Field Clear +150</div>';
  return '';
}

function renderTutorialDemo(step) {
  const cells = (state.tutorialBoard.length ? state.tutorialBoard : cloneTutorialBaseBoard())
    .map((cell, index) => renderTutorialCell(cell, index))
    .join('');

  return `
    <div class="tutorial-play-area">
      <div class="tutorial-play-board" style="--tutorial-cols: ${TUTORIAL_COLUMNS};">${cells}</div>
      ${tutorialActionButtons(step)}
      ${tutorialBonusPill(step)}
    </div>`;
}

function tutorialSuccessText(step) {
  if (state.tutorialMessage) return state.tutorialMessage;
  if (state.tutorialDemoComplete) return step.success || 'Nice — tap Next to keep going.';
  if (step.action === 'hint-match' && state.tutorialHintPair.length) return 'Now tap both gray hint boxes to clear the pair.';
  if (step.action === 'add-match' && state.tutorialAddedNumbers) return 'Now tap the two 9s to clear the mini board.';
  return step.tip;
}

function renderTutorialStep() {
  if (!els.tutorialModal) return;
  const step = tutorialStep();
  const total = TUTORIAL_STEPS.length;
  const current = state.tutorialStep + 1;
  const canContinue = step.action === 'done' || state.tutorialDemoComplete;

  if (els.tutorialStepLabel) els.tutorialStepLabel.textContent = `Step ${current} of ${total}`;
  if (els.tutorialStepTitle) els.tutorialStepTitle.textContent = step.title;
  if (els.tutorialStepText) els.tutorialStepText.textContent = step.text;
  if (els.tutorialDemo) els.tutorialDemo.innerHTML = renderTutorialDemo(step);
  if (els.tutorialStepTip) els.tutorialStepTip.textContent = tutorialSuccessText(step);
  if (els.tutorialProgress) {
    els.tutorialProgress.innerHTML = TUTORIAL_STEPS
      .map((_, index) => `<span class="tutorial-dot ${index === state.tutorialStep ? 'active' : ''} ${index < state.tutorialStep ? 'done' : ''}"></span>`)
      .join('');
  }
  if (els.tutorialBackStepBtn) els.tutorialBackStepBtn.disabled = state.tutorialStep === 0;
  if (els.tutorialNextStepBtn) {
    els.tutorialNextStepBtn.disabled = !canContinue;
    els.tutorialNextStepBtn.textContent = state.tutorialStep === total - 1 ? 'Done' : (canContinue ? 'Next' : 'Clear Pair');
  }
}

function openTutorial(options = {}) {
  state.tutorialStep = 0;
  rebuildTutorialBoardForStep(0);
  renderTutorialStep();
  if (els.tutorialModal) els.tutorialModal.classList.remove('hidden');
}

function closeTutorial() {
  try { localStorage.setItem(TUTORIAL_SEEN_STORAGE_KEY, '1'); } catch (error) {}
  if (els.tutorialModal) els.tutorialModal.classList.add('hidden');
}

function nextTutorialStep() {
  const step = tutorialStep();
  if (step.action !== 'done' && !state.tutorialDemoComplete) return;
  if (state.tutorialStep >= TUTORIAL_STEPS.length - 1) {
    closeTutorial();
    return;
  }
  state.tutorialStep += 1;
  rebuildTutorialBoardForStep(state.tutorialStep);
  renderTutorialStep();
}

function previousTutorialStep() {
  if (state.tutorialStep <= 0) return;
  state.tutorialStep -= 1;
  rebuildTutorialBoardForStep(state.tutorialStep);
  renderTutorialStep();
}

function samePair(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
}

function completeTutorialMatch(step) {
  (step.pair || []).forEach(index => {
    if (state.tutorialBoard[index]) state.tutorialBoard[index].cleared = true;
  });
  state.tutorialHintPair = [];
  state.tutorialBlockedCells = [];
  state.tutorialDemoComplete = true;
  state.tutorialMessage = step.success || 'Nice — tap Next to keep going.';
}

function handleTutorialAction(action) {
  const step = tutorialStep();
  if (state.tutorialDemoComplete) return;

  if (action === 'hint' && step.action === 'hint-match') {
    state.tutorialHintPair = [...step.pair];
    state.tutorialMessage = 'Now tap both gray hint boxes to clear the pair.';
    renderTutorialStep();
    return;
  }

  if (action === 'add' && step.action === 'add-match') {
    const source = state.tutorialBoard[TUTORIAL_ADD_SOURCE_CELL];
    if (source?.value) {
      state.tutorialBoard[TUTORIAL_ADD_TARGET_CELL] = {
        id: TUTORIAL_ADD_TARGET_CELL,
        value: source.value,
        cleared: false,
        isNew: true,
      };
      state.tutorialAddedNumbers = true;
      state.tutorialMessage = 'Now tap the two 9s to clear the mini board.';
      renderTutorialStep();
    }
  }
}

function handleTutorialDemoTap(event) {
  const actionTarget = event.target.closest('[data-tutorial-action]');
  if (actionTarget && els.tutorialDemo?.contains(actionTarget)) {
    event.preventDefault();
    handleTutorialAction(actionTarget.dataset.tutorialAction);
    return;
  }

  const target = event.target.closest('[data-tutorial-cell]');
  if (!target || !els.tutorialDemo || !els.tutorialDemo.contains(target)) return;
  const step = tutorialStep();
  if (state.tutorialDemoComplete || step.action === 'done') return;
  event.preventDefault();

  const cellIndex = Number(target.dataset.tutorialCell);
  if (!Number.isFinite(cellIndex)) return;

  if (step.action === 'hint-match' && !state.tutorialHintPair.length) {
    state.tutorialMessage = 'Tap Hint first so the pair appears in gray.';
    renderTutorialStep();
    return;
  }
  if (step.action === 'add-match' && !state.tutorialAddedNumbers) {
    state.tutorialMessage = 'Tap + first to add another 9.';
    renderTutorialStep();
    return;
  }

  if (state.tutorialDemoSelected.includes(cellIndex)) {
    state.tutorialDemoSelected = state.tutorialDemoSelected.filter(index => index !== cellIndex);
    renderTutorialStep();
    return;
  }

  if (state.tutorialDemoSelected.length === 1) {
    const first = state.tutorialDemoSelected[0];
    const pair = [first, cellIndex];

    if (samePair(pair, step.pair)) {
      if (step.action === 'blocked') {
        state.tutorialDemoSelected = [];
        state.tutorialBlockedCells = [...(step.blockers || [])];
        state.tutorialDemoComplete = true;
        state.tutorialMessage = step.success || 'That path is blocked.';
        renderTutorialStep();
        return;
      }
      state.tutorialDemoSelected = pair;
      completeTutorialMatch(step);
      renderTutorialStep();
      return;
    }

    state.tutorialDemoSelected = [cellIndex];
    state.tutorialMessage = 'That is not the pair for this step, so the selection moved to the new number.';
    renderTutorialStep();
    return;
  }

  state.tutorialDemoSelected = [cellIndex];
  state.tutorialMessage = '';
  renderTutorialStep();
}

function maybeShowFirstRunTutorial() {
  let seen = false;
  try { seen = localStorage.getItem(TUTORIAL_SEEN_STORAGE_KEY) === '1'; } catch (error) { seen = true; }
  if (!seen) setTimeout(() => openTutorial(), 250);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createGameSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function seedSalt() {
  return Number.isFinite(state.gameSeed) ? state.gameSeed : 0;
}


function savedGameSnapshot() {
  try {
    const raw = localStorage.getItem(CURRENT_GAME_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.board) || !DIFFICULTIES[data.difficultyKey]) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function clearSavedGame() {
  localStorage.removeItem(CURRENT_GAME_STORAGE_KEY);
  updateContinueButton();
}

function serializeBoard() {
  return state.board
    .filter(Boolean)
    .map((cell, index) => ({
      value: cell.value,
      cleared: !!cell.cleared,
      addedBlue: !!cell.addedBlue,
      id: cell.id || `saved-${index}`,
    }));
}

function saveCurrentGame() {
  if (!state.activeGame || state.lost || state.gameOver || !state.board.length) return;
  const save = {
    version: 1,
    savedAt: Date.now(),
    difficultyKey: state.difficultyKey,
    gameSeed: seedSalt(),
    stage: state.stage,
    score: state.score,
    totalCleared: state.totalCleared,
    addsRemaining: state.addsRemaining,
    board: serializeBoard(),
    stageDigits: Array.from(state.stageDigits || []),
    digitsAnnounced: Array.from(state.digitsAnnounced || []),
    selected: typeof state.selected === 'number' ? state.selected : null,
    hintPair: Array.isArray(state.hintPair) ? state.hintPair : null,
    message: els.message?.textContent || `${currentDifficulty().label} Stage ${state.stage}: ${PAIR_RULE_TEXT}`,
  };
  try {
    localStorage.setItem(CURRENT_GAME_STORAGE_KEY, JSON.stringify(save));
    updateContinueButton(save);
  } catch (error) {
    // Ignore full-storage/private-mode errors; the game should still play.
  }
}

function updateContinueButton(snapshot = savedGameSnapshot()) {
  if (!els.continueGameBtn) return;
  if (!snapshot) {
    els.continueGameBtn.classList.add('hidden');
    return;
  }

  const diff = DIFFICULTIES[snapshot.difficultyKey] || DIFFICULTIES.basic;
  els.continueGameBtn.classList.remove('hidden');
  if (els.continueDescription) {
    els.continueDescription.textContent = `${diff.label} • Stage ${snapshot.stage || 1} • Score ${(snapshot.score || 0).toLocaleString()}`;
  }
  if (els.continueStatus) {
    const saved = snapshot.savedAt ? new Date(snapshot.savedAt) : null;
    els.continueStatus.textContent = saved ? `Saved ${saved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Saved game found';
  }
}

function restoreSavedGame() {
  const snapshot = savedGameSnapshot();
  if (!snapshot) {
    updateContinueButton(null);
    return false;
  }

  state.gameToken += 1;
  state.activeGame = true;
  state.difficultyKey = snapshot.difficultyKey;
  state.gameSeed = Number.isFinite(snapshot.gameSeed) ? snapshot.gameSeed : 0;
  state.stage = Math.max(1, Number(snapshot.stage) || 1);
  state.score = Math.max(0, Number(snapshot.score) || 0);
  state.totalCleared = Math.max(0, Number(snapshot.totalCleared) || 0);
  state.addsRemaining = Math.max(0, Number(snapshot.addsRemaining) || 0);
  state.board = snapshot.board.map((cell, index) => ({
    value: Number(cell.value),
    cleared: !!cell.cleared,
    addedBlue: !!cell.addedBlue,
    id: cell.id || `restored-${index}`,
  })).filter(cell => Number.isFinite(cell.value) && cell.value >= 1 && cell.value <= 9);
  state.stageDigits = new Set(snapshot.stageDigits && snapshot.stageDigits.length ? snapshot.stageDigits : state.board.map(cell => cell.value));
  state.digitsAnnounced = new Set(snapshot.digitsAnnounced || []);
  state.justClearedDigits = new Set();
  state.selected = typeof snapshot.selected === 'number' && snapshot.selected < state.board.length && !state.board[snapshot.selected]?.cleared ? snapshot.selected : null;
  state.hintPair = Array.isArray(snapshot.hintPair) ? snapshot.hintPair.filter(index => state.board[index] && !state.board[index].cleared) : null;
  if (state.hintPair && state.hintPair.length !== 2) state.hintPair = null;
  state.badPair = [];
  state.blockedCells = [];
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
  state.justAddedStart = -1;
  els.effectLayer.innerHTML = '';
  if (els.gameOverScreen) els.gameOverScreen.classList.add('hidden');
  if (els.settingsScreen) els.settingsScreen.classList.add('hidden');
  els.homeScreen.classList.add('hidden');
  els.gameScreen.classList.remove('hidden');
  updateMessage(snapshot.message || `${currentDifficulty().label} Stage ${state.stage}: ${PAIR_RULE_TEXT}`);
  render();
  saveCurrentGame();
  setTimeout(() => checkNoMovesAutoFail(), 0);
  return true;
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
  const scores = [
    ['Touch', 1 * factor],
    ['Wrap', 2 * factor],
    ['Open', 4 * factor],
    ['Line', 10 * factor],
    ['Field', 150 * factor],
  ];
  els.rulesText.innerHTML = scores
    .map(([label, points]) => `<span><strong>+${points.toLocaleString()}</strong><em>${label}</em></span>`)
    .join('');
  if (els.rulesMultiplier) els.rulesMultiplier.textContent = `${factor.toLocaleString()}×`;
  if (els.rulesSubtext) {
    const difficultyMultiplier = diff.scoreMultiplier || 1;
    els.rulesSubtext.textContent = `${diff.label} • Stage ${state.stage} • ${difficultyMultiplier}× difficulty`;
  }
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

function generateTestSequence(profile, stageNumber, salt = 0) {
  const rand = mulberry32(4111 + profile.seedOffset + stageNumber * 379 + salt);
  const values = [];
  while (values.length < profile.startNumbers) {
    const value = seededInt(rand, 1, 9);
    const mate = rand() < 0.58 ? value : 10 - value;
    values.push(value);
    if (values.length < profile.startNumbers) values.push(mate);
  }
  return values.slice(0, profile.startNumbers);
}

function generateControlledRandomSequence(profile, stageNumber, attempt, salt = 0) {
  const rand = mulberry32(7207 + profile.seedOffset + stageNumber * 9973 + attempt * 131 + salt);
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

function fallbackNestedSequence(profile, stageNumber, salt = 0) {
  const rand = mulberry32(9901 + profile.seedOffset + stageNumber * 557 + salt);
  const sequence = [];
  while (sequence.length < profile.startNumbers) {
    const value = seededInt(rand, 1, 9);
    const mate = rand() < 0.5 ? value : 10 - value;
    sequence.push(value, mate);
  }
  return sequence.slice(0, profile.startNumbers);
}

function generateStage(stageNumber, difficultyKey = state.difficultyKey, salt = seedSalt()) {
  const profile = DIFFICULTIES[difficultyKey] || DIFFICULTIES.basic;

  if (profile.generator === 'test') {
    const values = generateTestSequence(profile, stageNumber, salt);
    return values.map((value, index) => ({
      value,
      cleared: false,
      id: `${difficultyKey}-${stageNumber}-${seedSalt()}-${index}-test`,
    }));
  }
  const [targetMin, targetMax] = profile.targetStartPairs;
  let relaxedCandidate = null;

  for (let attempt = 0; attempt < profile.maxAttempts; attempt += 1) {
    const values = generateControlledRandomSequence(profile, stageNumber, attempt, salt);
    const openingPairs = countImmediateStartPairs(values);

    if (openingPairs >= targetMin && openingPairs <= targetMax && pureSolveGreedy(values, profile.adds)) {
      return values.map((value, index) => ({
        value,
        cleared: false,
        id: `${difficultyKey}-${stageNumber}-${seedSalt()}-${index}-${attempt}`,
      }));
    }

    if (!relaxedCandidate && openingPairs >= Math.max(1, targetMin - 1) && openingPairs <= targetMax + 2 && pureSolveGreedy(values, profile.adds)) {
      relaxedCandidate = values;
    }
  }

  const fallback = relaxedCandidate || fallbackNestedSequence(profile, stageNumber, salt);
  return fallback.map((value, index) => ({
    value,
    cleared: false,
    id: `${difficultyKey}-${stageNumber}-${seedSalt()}-${index}-fallback`,
  }));
}

function startStage(stageNumber, options = {}) {
  const { intro = false } = options;
  state.activeGame = true;
  state.transitioning = false;
  state.stageIntro = intro;
  state.rowAnimating = false;
  state.addAnimating = false;
  state.addBluePulse = new Set();
  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.blockedCells = [];
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
  saveCurrentGame();
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

function activeBlockersBetweenLinear(a, b) {
  const blockers = [];
  const step = a < b ? 1 : -1;
  for (let i = a + step; i !== b; i += step) {
    const cell = state.board[i];
    if (cell && !cell.cleared) blockers.push(i);
  }
  return blockers;
}

function activeBlockersBetweenDirectional(a, b, dr, dc) {
  const blockers = [];
  let r = rowOf(a) + dr;
  let c = colOf(a) + dc;
  const targetR = rowOf(b);
  const targetC = colOf(b);

  while (r !== targetR || c !== targetC) {
    const i = r * COLS + c;
    const cell = state.board[i];
    if (cell && !cell.cleared) blockers.push(i);
    r += dr;
    c += dc;
  }

  return blockers;
}

function getBlockingCellsForPair(a, b) {
  const r1 = rowOf(a), c1 = colOf(a);
  const r2 = rowOf(b), c2 = colOf(b);
  const drRaw = r2 - r1;
  const dcRaw = c2 - c1;

  // If the two numbers are on a straight playable line, show the blockers on
  // that line instead of every cell in reading order.
  if (r1 === r2) {
    return activeBlockersBetweenDirectional(a, b, 0, dcRaw > 0 ? 1 : -1);
  }

  if (c1 === c2) {
    return activeBlockersBetweenDirectional(a, b, drRaw > 0 ? 1 : -1, 0);
  }

  if (Math.abs(drRaw) === Math.abs(dcRaw)) {
    return activeBlockersBetweenDirectional(a, b, drRaw > 0 ? 1 : -1, dcRaw > 0 ? 1 : -1);
  }

  // Otherwise, the only possible connection would be the reading-order wrap
  // path, so jiggle the active numbers sitting between them in reading order.
  return activeBlockersBetweenLinear(a, b);
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
  saveCurrentGame();
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
  state.blockedCells = [];
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
  saveCurrentGame();

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
      saveCurrentGame();
      await wait(40);
    }

    if (activeCells().length === 0 && !state.rowAnimating && !state.transitioning) {
      await completeStage({ awardBonus: false });
    } else {
      render();
      saveCurrentGame();
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
  saveCurrentGame();
}

function handleCellClick(index) {
  if (interactionLocked()) return;
  const cell = state.board[index];
  if (!cell || cell.cleared) return;

  state.badPair = [];
  state.blockedCells = [];

  if (state.selected === null) {
    state.selected = index;
    render();
    saveCurrentGame();
    return;
  }

  if (state.selected === index) {
    state.selected = null;
    render();
    saveCurrentGame();
    return;
  }

  const a = state.selected;
  const b = index;
  const cellA = state.board[a];
  const cellB = state.board[b];

  // If the values cannot pair at all, move the selection to the newest number.
  if (!cellA || !cellB || !valuesCanPair(cellA.value, cellB.value)) {
    state.selected = b;
    updateMessage(`Selected ${cellB.value}. Find the same number or one that adds to 10.`);
    render();
    saveCurrentGame();
    return;
  }

  const result = classifyPair(a, b);
  if (result.valid) {
    clearPair(a, b, result);
    return;
  }

  // Same/add-to-10 values that cannot connect are blocked. Jiggle the active
  // numbers in the way, then clear the selection.
  const blockers = getBlockingCellsForPair(a, b);
  state.selected = null;
  state.blockedCells = blockers.length ? blockers : [a, b];
  updateMessage(blockers.length
    ? 'Those numbers match, but the numbers in the way must be cleared first.'
    : 'Those numbers match, but they do not connect from here.');
  render();
  saveCurrentGame();
  setTimeout(() => {
    state.blockedCells = [];
    render();
  }, 360);
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
  state.badPair = [];
  state.blockedCells = [];
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
  saveCurrentGame();

  await animateAddNumbers(addPlan, runToken);
  if (runToken !== state.gameToken) return;

  state.addBluePulse = new Set();
  state.board.forEach(cell => {
    if (cell) cell.addingHidden = false;
  });
  state.addAnimating = false;
  render();
  saveCurrentGame();
  checkNoMovesAutoFail();

  requestAnimationFrame(() => {
    if (runToken !== state.gameToken) return;
    els.boardWrap.scrollTop = els.boardWrap.scrollHeight;
  });
}

function loseStage() {
  state.activeGame = false;
  state.lost = true;
  state.selected = null;
  state.hintPair = null;
  state.badPair = [];
  state.blockedCells = [];
  state.matchingPair = [];
  state.clearingPair = [];
  state.justAddedStart = -1;
  state.lineClearingCellIds = new Set();
  state.rowAnimating = false;
  state.addAnimating = false;
  state.addBluePulse = new Set();
  state.stageIntro = false;
  updateMessage('Game completed.');
  clearSavedGame();
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
    saveCurrentGame();
    return;
  }
  state.hintPair = [pair.a, pair.b];
  updateMessage(`Hint: ${state.board[pair.a].value} and ${state.board[pair.b].value} can clear.`);
  render();
  saveCurrentGame();
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
    const div = document.createElement('div');
    div.className = 'cell';
    div.dataset.index = String(index);

    if (!cell) {
      div.classList.add('empty');
      div.setAttribute('aria-hidden', 'true');
    } else {
      div.dataset.value = String(cell.value);
      div.setAttribute('aria-label', cell.cleared ? `Cell ${index + 1}, cleared number ${cell.value}` : `Cell ${index + 1}, number ${cell.value}`);
      if (!cell.cleared) {
        div.setAttribute('role', 'button');
        div.tabIndex = -1;
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
      if (state.blockedCells.includes(index)) div.classList.add('blocked');
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
  updateContinueButton();
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
      status.textContent = `🔒 ${previousLabel} ${current.toLocaleString()} / ${requirement.score.toLocaleString()}`;
    } else if (key === 'test') {
      status.textContent = 'Open · practice board';
    } else {
      status.textContent = `${diff.scoreMultiplier}× · Best ${difficultyBest(key).toLocaleString()}`;
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
  state.blockedCells = [];
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
  if (els.settingsScreen) els.settingsScreen.classList.add('hidden');
  els.gameScreen.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
  if (els.homeBestScore) els.homeBestScore.textContent = state.allTime.toLocaleString();
  updateContinueButton();
  renderDifficultyCards();
}

let pendingNewGameDifficulty = null;

function currentGameWouldBeLost() {
  if (state.lost || state.gameOver) return false;
  return !!savedGameSnapshot() || (state.activeGame && state.board.length > 0);
}

function openNewGameConfirm(difficultyKey) {
  pendingNewGameDifficulty = difficultyKey;
  if (!els.confirmNewGameModal) {
    startGame(difficultyKey, { discardCurrent: true });
    return;
  }
  els.confirmNewGameModal.classList.remove('hidden');
}

function closeNewGameConfirm() {
  pendingNewGameDifficulty = null;
  if (els.confirmNewGameModal) els.confirmNewGameModal.classList.add('hidden');
}

function requestStartGame(difficultyKey) {
  const requestedDifficulty = DIFFICULTIES[difficultyKey] ? difficultyKey : 'basic';
  if (!isDifficultyUnlocked(requestedDifficulty)) {
    renderDifficultyCards();
    return;
  }

  if (currentGameWouldBeLost()) {
    openNewGameConfirm(requestedDifficulty);
    return;
  }

  startGame(requestedDifficulty, { discardCurrent: false });
}

function startGame(difficultyKey, options = {}) {
  const { discardCurrent = true } = options;
  const requestedDifficulty = DIFFICULTIES[difficultyKey] ? difficultyKey : 'basic';
  if (!isDifficultyUnlocked(requestedDifficulty)) {
    renderDifficultyCards();
    return;
  }

  if (discardCurrent) clearSavedGame();
  state.gameToken += 1;
  state.activeGame = true;
  state.difficultyKey = requestedDifficulty;
  state.gameSeed = createGameSeed();
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
  if (els.settingsScreen) els.settingsScreen.classList.add('hidden');
  els.homeScreen.classList.add('hidden');
  els.gameScreen.classList.remove('hidden');
  startStage(1);
}

function confirmPendingNewGame() {
  const difficultyKey = pendingNewGameDifficulty;
  closeNewGameConfirm();
  if (difficultyKey) startGame(difficultyKey, { discardCurrent: true });
}

function endGameToHome() {
  saveCurrentGame();
  showHome();
}


let activeBoardTouch = null;

function cellIndexFromTouchTarget(target) {
  if (!(target instanceof Element)) return null;
  const cell = target.closest('.cell');
  if (!cell || !els.board.contains(cell)) return null;
  const index = Number(cell.dataset.index);
  return Number.isFinite(index) ? index : null;
}

function setupBoardTouchHandling() {
  if (!els.board || !els.boardWrap) return;

  els.board.addEventListener('touchstart', event => {
    const index = cellIndexFromTouchTarget(event.target);
    if (index === null || event.touches.length !== 1) return;

    // iOS Safari can still double-tap zoom inside dense text grids unless the
    // board owns the touch sequence from the capture phase.
    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    activeBoardTouch = {
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      startScrollTop: els.boardWrap.scrollTop,
      moved: false,
    };
  }, { passive: false, capture: true });

  els.board.addEventListener('touchmove', event => {
    if (!activeBoardTouch || event.touches.length !== 1) return;
    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    const dx = touch.clientX - activeBoardTouch.startX;
    const dy = touch.clientY - activeBoardTouch.startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) activeBoardTouch.moved = true;

    // Since we prevent Safari's default behavior to block double-tap zoom,
    // manually preserve vertical board scrolling for tall boards.
    els.boardWrap.scrollTop = activeBoardTouch.startScrollTop - dy;
    activeBoardTouch.lastX = touch.clientX;
    activeBoardTouch.lastY = touch.clientY;
  }, { passive: false, capture: true });

  els.board.addEventListener('touchend', event => {
    if (!activeBoardTouch) return;
    event.preventDefault();
    event.stopPropagation();

    const { index, moved } = activeBoardTouch;
    activeBoardTouch = null;
    if (!moved) handleCellClick(index);
  }, { passive: false, capture: true });

  els.board.addEventListener('touchcancel', event => {
    if (!activeBoardTouch) return;
    event.preventDefault();
    event.stopPropagation();
    activeBoardTouch = null;
  }, { passive: false, capture: true });
}

function preventGameDoubleTapZoom() {
  let lastTouchEnd = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;

  const isInApp = target => target instanceof Element && !!target.closest('.phone-app');
  const isInBoard = target => target instanceof Element && !!target.closest('.board-wrap, .board, .cell');

  // iOS Safari is most stubborn when double-tapping text-like grid content. Own
  // every board touch from the document capture phase before Safari can promote
  // it into a smart/double-tap zoom gesture.
  document.addEventListener('touchstart', event => {
    if (!isInApp(event.target)) return;

    // Do not stop propagation for board touches. The board's own touch handler
    // still needs to receive the event so it can select cells. We only prevent
    // Safari's default zoom behavior.
    if (isInBoard(event.target)) {
      event.preventDefault();
      return;
    }

    if (event.touches.length > 1) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false, capture: true });

  document.addEventListener('touchmove', event => {
    if (!isInApp(event.target)) return;
    if (event.scale && event.scale !== 1) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.touches.length > 1) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false, capture: true });

  document.addEventListener('touchend', event => {
    if (!isInApp(event.target)) return;
    const touch = event.changedTouches && event.changedTouches[0];
    const now = Date.now();
    const x = touch ? touch.clientX : 0;
    const y = touch ? touch.clientY : 0;
    const closeInTime = now - lastTouchEnd <= 420;
    const closeInSpace = Math.abs(x - lastTouchX) <= 42 && Math.abs(y - lastTouchY) <= 42;
    const boardTouch = isInBoard(event.target);

    if (boardTouch) {
      // Prevent iOS double-tap/smart zoom, but let the board touchend handler
      // run afterward so fast taps still select numbers.
      event.preventDefault();
    } else if (closeInTime && closeInSpace) {
      event.preventDefault();
      event.stopPropagation();
    }

    lastTouchEnd = now;
    lastTouchX = x;
    lastTouchY = y;
  }, { passive: false, capture: true });

  document.addEventListener('dblclick', event => {
    if (isInApp(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false, capture: true });

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(name => {
    document.addEventListener(name, event => {
      if (isInApp(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { passive: false, capture: true });
  });
}
setupBoardTouchHandling();
preventGameDoubleTapZoom();

els.addBtn.addEventListener('click', addMoreNumbers);
els.hintBtn.addEventListener('click', useHint);
els.backBtn.addEventListener('click', endGameToHome);
if (els.continueGameBtn) els.continueGameBtn.addEventListener('click', restoreSavedGame);
if (els.homeSettingsBtn) els.homeSettingsBtn.addEventListener('click', showSettings);
if (els.settingsBackBtn) els.settingsBackBtn.addEventListener('click', hideSettings);
if (els.themeToggleBtn) els.themeToggleBtn.addEventListener('click', toggleTheme);
if (els.tutorialOpenBtn) els.tutorialOpenBtn.addEventListener('click', () => openTutorial());
if (els.tutorialBackStepBtn) els.tutorialBackStepBtn.addEventListener('click', previousTutorialStep);
if (els.tutorialNextStepBtn) els.tutorialNextStepBtn.addEventListener('click', nextTutorialStep);
if (els.tutorialSkipBtn) els.tutorialSkipBtn.addEventListener('click', closeTutorial);
if (els.tutorialDemo) els.tutorialDemo.addEventListener('pointerdown', handleTutorialDemoTap);
if (els.tutorialModal) els.tutorialModal.addEventListener('click', event => {
  if (event.target === els.tutorialModal) closeTutorial();
});
if (els.copyBoardBtn) els.copyBoardBtn.addEventListener('click', copyBoardState);
if (els.gameOverNewGame) els.gameOverNewGame.addEventListener('click', () => startGame(state.difficultyKey, { discardCurrent: true }));
if (els.gameOverMain) els.gameOverMain.addEventListener('click', () => {
  state.activeGame = false;
  clearSavedGame();
  showHome();
});
if (els.confirmStartNewGame) els.confirmStartNewGame.addEventListener('click', confirmPendingNewGame);
if (els.cancelStartNewGame) els.cancelStartNewGame.addEventListener('click', closeNewGameConfirm);
if (els.confirmNewGameModal) els.confirmNewGameModal.addEventListener('click', event => {
  if (event.target === els.confirmNewGameModal) closeNewGameConfirm();
});
els.difficultyButtons.forEach(button => {
  button.addEventListener('click', () => requestStartGame(button.dataset.difficulty));
});

window.addEventListener('pagehide', saveCurrentGame);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveCurrentGame();
});

applyTheme();
render();
showHome();
maybeShowFirstRunTutorial();
