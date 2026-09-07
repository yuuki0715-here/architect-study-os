const STORAGE_KEY = 'architect-study-os-v0.3';
const DB_NAME = 'architect-study-os';
const DB_VERSION = 1;
const STORE_NAME = 'questionBanks';
const LEGACY_BANK_KEY = 'western-architecture';
const BANK_PREFIX = 'unit::';
const STUDY_TOTAL = 1250;
const SUBJECTS = [
  { key: '計画', exam: '学科Ⅰ', total: 200 },
  { key: '環境・設備', exam: '学科Ⅱ', total: 200 },
  { key: '法規', exam: '学科Ⅲ', total: 300 },
  { key: '構造', exam: '学科Ⅳ', total: 300 },
  { key: '施工', exam: '学科Ⅴ', total: 250 },
];
const SUBJECT_ORDER = SUBJECTS.map(s => s.key);

const els = {
  home: document.querySelector('#home-screen'),
  quiz: document.querySelector('#quiz-screen'),
  settings: document.querySelector('#settings-screen'),
  screenTitle: document.querySelector('#screen-title'),
  currentUnit: document.querySelector('#current-unit'),
  unitSelect: document.querySelector('#unit-select'),
  countBadge: document.querySelector('#question-count-badge'),
  progressText: document.querySelector('#progress-text'),
  progressBar: document.querySelector('#progress-bar'),
  overallProgressText: document.querySelector('#overall-progress-text'),
  overallProgressBar: document.querySelector('#overall-progress-bar'),
  subjectSwitcher: document.querySelector('#subject-switcher'),
  subjectExamLabel: document.querySelector('#subject-exam-label'),
  subjectName: document.querySelector('#subject-name'),
  subjectLoadedBadge: document.querySelector('#subject-loaded-badge'),
  subjectProgressLabel: document.querySelector('#subject-progress-label'),
  subjectProgressText: document.querySelector('#subject-progress-text'),
  subjectProgressBar: document.querySelector('#subject-progress-bar'),
  subjectDataNote: document.querySelector('#subject-data-note'),
  subjectFieldsTitle: document.querySelector('#subject-fields-title'),
  subjectFieldsSummary: document.querySelector('#subject-fields-summary'),
  subjectFieldsList: document.querySelector('#subject-fields-list'),
  dataStatus: document.querySelector('#data-status'),
  startBtn: document.querySelector('#start-btn'),
  settingsBtn: document.querySelector('#settings-btn'),
  settingsBackBtn: document.querySelector('#settings-back-btn'),
  resetBtn: document.querySelector('#reset-btn'),
  backBtn: document.querySelector('#back-btn'),
  quizPosition: document.querySelector('#quiz-position'),
  yearBadge: document.querySelector('#year-badge'),
  sourceBadge: document.querySelector('#source-badge'),
  classificationBadge: document.querySelector('#classification-badge'),
  heading: document.querySelector('#question-heading'),
  questionText: document.querySelector('#question-text'),
  questionFigure: document.querySelector('#question-figure'),
  questionImage: document.querySelector('#question-image'),
  choices: document.querySelector('#choices'),
  resultCard: document.querySelector('#result-card'),
  resultTitle: document.querySelector('#result-title'),
  resultExplanation: document.querySelector('#result-explanation'),
  nextBtn: document.querySelector('#next-btn'),
  importBtn: document.querySelector('#import-btn'),
  deleteBankBtn: document.querySelector('#delete-bank-btn'),
  fileInput: document.querySelector('#file-input'),
};

let banks = new Map();
let questions = [];
let cursor = 0;
let currentUnitKey = null;
let state = loadState();
let activeSubject = state.activeSubject || '計画';

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      answers: parsed?.answers || {},
      cursorByUnit: parsed?.cursorByUnit || {},
      currentUnitKey: parsed?.currentUnitKey || null,
      currentUnitBySubject: parsed?.currentUnitBySubject || {},
      activeSubject: SUBJECT_ORDER.includes(parsed?.activeSubject) ? parsed.activeSubject : '計画',
    };
  } catch {
    return { answers: {}, cursorByUnit: {}, currentUnitKey: null, currentUnitBySubject: {}, activeSubject: '計画' };
  }
}

function saveState() {
  state.currentUnitKey = currentUnitKey;
  state.activeSubject = activeSubject;
  state.currentUnitBySubject = state.currentUnitBySubject || {};
  if (currentUnitKey) {
    const unit = parseUnitKey(currentUnitKey);
    if (unit.subject) state.currentUnitBySubject[unit.subject] = currentUnitKey;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function unitKeyFromQuestion(q) {
  return `${BANK_PREFIX}${q.subject}::${q.field}`;
}

function parseUnitKey(key) {
  const raw = key.startsWith(BANK_PREFIX) ? key.slice(BANK_PREFIX.length) : key;
  const [subject = '', field = ''] = raw.split('::');
  return { subject, field };
}

function currentUnit() {
  return currentUnitKey ? parseUnitKey(currentUnitKey) : { subject: activeSubject, field: '未選択' };
}


function subjectConfig(subject = activeSubject) {
  return SUBJECTS.find(s => s.key === subject) || SUBJECTS[0];
}

function unitAverageQuestionNumber(key) {
  const bank = banks.get(key) || [];
  const nums = bank
    .map(q => q.questionNumber)
    .filter(n => Number.isInteger(n));
  if (!nums.length) return Number.POSITIVE_INFINITY;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function sortedUnitKeys() {
  return [...banks.keys()].sort((a, b) => {
    const ua = parseUnitKey(a);
    const ub = parseUnitKey(b);

    const sa = SUBJECT_ORDER.indexOf(ua.subject);
    const sb = SUBJECT_ORDER.indexOf(ub.subject);
    const subjectA = sa === -1 ? SUBJECT_ORDER.length : sa;
    const subjectB = sb === -1 ? SUBJECT_ORDER.length : sb;

    if (subjectA !== subjectB) return subjectA - subjectB;

    const avgA = unitAverageQuestionNumber(a);
    const avgB = unitAverageQuestionNumber(b);
    if (avgA !== avgB) return avgA - avgB;

    return ua.field.localeCompare(ub.field, 'ja');
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbKeys() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function acceptedAnswers(q) {
  if (Array.isArray(q?.acceptedAnswers) && q.acceptedAnswers.length) {
    return [...new Set(q.acceptedAnswers)].filter(
      n => Number.isInteger(n) && n >= 1 && n <= 4
    );
  }
  return Number.isInteger(q?.answer) ? [q.answer] : [];
}

function validateQuestion(q) {
  const accepted = acceptedAnswers(q);
  const acceptedAnswersValid = q?.acceptedAnswers === undefined || (
    Array.isArray(q.acceptedAnswers) &&
    q.acceptedAnswers.length >= 1 &&
    q.acceptedAnswers.every(n => Number.isInteger(n) && n >= 1 && n <= 4) &&
    accepted.includes(q.answer)
  );

  return q &&
    q.origin === 'real_past_exam' &&
    q.verified === true &&
    typeof q.id === 'string' && q.id.trim() &&
    Number.isInteger(q.year) &&
    typeof q.subject === 'string' && q.subject.trim() &&
    typeof q.field === 'string' && q.field.trim() &&
    Number.isInteger(q.questionNumber) &&
    typeof q.prompt === 'string' && q.prompt.trim() &&
    Array.isArray(q.choices) && q.choices.length === 4 && q.choices.every(Boolean) &&
    Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 4 &&
    accepted.length >= 1 && acceptedAnswersValid &&
    typeof q.explanation === 'string' && q.explanation.trim() &&
    q.source && typeof q.source.label === 'string' &&
    (q.imageDataUrl === undefined || (typeof q.imageDataUrl === 'string' && q.imageDataUrl.startsWith('data:image/')));
}

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) throw new Error('JSONの最上位が配列ではありません');
  const accepted = raw.filter(validateQuestion);
  if (!accepted.length) throw new Error('確認済みの実在過去問が見つかりません');
  const unique = new Map(accepted.map(q => [q.id, q]));
  return [...unique.values()];
}

async function migrateLegacyBank() {
  const legacy = await dbGet(LEGACY_BANK_KEY);
  if (!Array.isArray(legacy) || !legacy.length) return;
  const valid = legacy.filter(validateQuestion);
  if (!valid.length) return;
  const key = unitKeyFromQuestion(valid[0]);
  const existing = await dbGet(key);
  if (!Array.isArray(existing) || !existing.length) await dbPut(key, valid);
}

async function loadBanks() {
  await migrateLegacyBank();
  const keys = (await dbKeys()).filter(k => typeof k === 'string' && k.startsWith(BANK_PREFIX));
  banks = new Map();
  for (const key of keys) {
    const raw = await dbGet(key);
    const valid = Array.isArray(raw) ? raw.filter(validateQuestion) : [];
    if (valid.length) {
      valid.sort((a, b) => b.year - a.year || a.questionNumber - b.questionNumber);
      banks.set(key, valid);
    }
  }
  const savedSubject = SUBJECT_ORDER.includes(state.activeSubject) ? state.activeSubject : '計画';
  activeSubject = savedSubject;

  const savedForSubject = state.currentUnitBySubject?.[activeSubject];
  if (savedForSubject && banks.has(savedForSubject)) {
    currentUnitKey = savedForSubject;
  } else if (state.currentUnitKey && banks.has(state.currentUnitKey) &&
             parseUnitKey(state.currentUnitKey).subject === activeSubject) {
    currentUnitKey = state.currentUnitKey;
  } else {
    currentUnitKey = subjectUnitKeys(activeSubject)[0] || null;
  }

  loadCurrentQuestions();
}

function loadCurrentQuestions() {
  questions = currentUnitKey && banks.has(currentUnitKey) ? [...banks.get(currentUnitKey)] : [];
  cursor = Math.min(state.cursorByUnit[currentUnitKey] || 0, Math.max(questions.length - 1, 0));
}

function answeredCount() {
  return questions.filter(q => state.answers[q.id]?.firstAnsweredAt).length;
}

function overallAnsweredCount() {
  return Object.values(state.answers || {}).filter(a => a?.firstAnsweredAt).length;
}


function subjectUnitKeys(subject) {
  return sortedUnitKeys().filter(key => parseUnitKey(key).subject === subject);
}

function subjectQuestions(subject) {
  return subjectUnitKeys(subject).flatMap(key => banks.get(key) || []);
}

function answeredCountForQuestions(list) {
  return list.filter(q => state.answers[q.id]?.firstAnsweredAt).length;
}

function activeSubjectQuestions() {
  return subjectQuestions(activeSubject);
}

function nextIncompleteUnitKey(subject, afterKey = currentUnitKey) {
  const keys = subjectUnitKeys(subject);
  if (!keys.length) return null;

  const start = Math.max(keys.indexOf(afterKey), -1);
  for (let offset = 1; offset <= keys.length; offset++) {
    const key = keys[(start + offset) % keys.length];
    const bank = banks.get(key) || [];
    const done = answeredCountForQuestions(bank);
    if (done < bank.length) return key;
  }
  return null;
}

function selectSubject(subject) {
  if (!SUBJECT_ORDER.includes(subject)) return;
  activeSubject = subject;

  const savedKey = state.currentUnitBySubject?.[subject];
  if (savedKey && banks.has(savedKey)) {
    currentUnitKey = savedKey;
  } else {
    currentUnitKey = subjectUnitKeys(subject)[0] || null;
  }

  loadCurrentQuestions();
  saveState();
  showHome();
}

function renderSubjectSwitcher() {
  els.subjectSwitcher.innerHTML = '';

  for (const cfg of SUBJECTS) {
    const qs = subjectQuestions(cfg.key);
    const done = answeredCountForQuestions(qs);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `subject-chip${cfg.key === activeSubject ? ' active' : ''}`;
    button.innerHTML = `
      <span class="subject-chip-exam">${cfg.exam.replace('学科', '')}</span>
      <span class="subject-chip-name">${escapeHtml(cfg.key)}</span>
      <span class="subject-chip-count">${done}/${cfg.total}</span>
    `;
    button.addEventListener('click', () => selectSubject(cfg.key));
    els.subjectSwitcher.appendChild(button);
  }
}

function renderSubjectDashboard() {
  const cfg = subjectConfig();
  const qs = activeSubjectQuestions();
  const loaded = qs.length;
  const done = answeredCountForQuestions(qs);
  const pct = cfg.total ? Math.round(done / cfg.total * 10000) / 100 : 0;

  els.subjectExamLabel.textContent = cfg.exam;
  els.subjectName.textContent = cfg.key;
  els.subjectLoadedBadge.textContent = `${loaded} / ${cfg.total}問`;
  els.subjectProgressLabel.textContent = `${cfg.key} 全体進捗`;
  els.subjectProgressText.textContent = `${done} / ${cfg.total}（${pct}%）`;
  els.subjectProgressBar.style.width = `${Math.min(pct, 100)}%`;
  els.subjectFieldsTitle.textContent = `${cfg.key} 分野一覧`;

  if (loaded >= cfg.total) {
    els.subjectDataNote.textContent = `${cfg.key}10年分${cfg.total}問を端末内に保存済みです。`;
  } else if (loaded > 0) {
    els.subjectDataNote.textContent = `${cfg.key}は現在${loaded} / ${cfg.total}問を読み込み済みです。追加JSONで不足分を補えます。`;
  } else {
    els.subjectDataNote.textContent = `${cfg.key}の問題データはまだ入っていません。`;
  }

  const keys = subjectUnitKeys(activeSubject);
  els.subjectFieldsSummary.textContent = `${keys.length}分野`;
  els.subjectFieldsList.innerHTML = '';

  if (!keys.length) {
    els.subjectFieldsList.innerHTML = `<p class="muted helper-text">${escapeHtml(cfg.key)}の問題データを読み込むと、ここに分野一覧が表示されます。</p>`;
    return;
  }

  keys.forEach((key, index) => {
    const unit = parseUnitKey(key);
    const bank = banks.get(key) || [];
    const fieldDone = answeredCountForQuestions(bank);
    const fieldTotal = bank.length;
    const fieldPct = fieldTotal ? Math.round(fieldDone / fieldTotal * 1000) / 10 : 0;
    const completed = fieldTotal > 0 && fieldDone >= fieldTotal;
    const active = key === currentUnitKey;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `field-row${completed ? ' complete' : ''}${active ? ' active' : ''}`;
    button.dataset.unitKey = key;
    button.innerHTML = `
      <span class="field-order">${index + 1}</span>
      <span class="field-main">
        <span class="field-name">${escapeHtml(unit.field)}</span>
        <span class="mini-progress-track" aria-hidden="true">
          <span class="mini-progress-bar" style="width:${Math.min(fieldPct, 100)}%"></span>
        </span>
      </span>
      <span class="field-count">${fieldDone}/${fieldTotal}</span>
    `;
    button.addEventListener('click', () => {
      currentUnitKey = key;
      activeSubject = unit.subject;
      loadCurrentQuestions();
      saveState();
      showHome();
    });
    els.subjectFieldsList.appendChild(button);
  });
}

function renderUnitSelect() {
  els.unitSelect.innerHTML = '';
  const keys = subjectUnitKeys(activeSubject);
  if (!keys.length) {
    const option = document.createElement('option');
    option.textContent = '問題データなし';
    option.value = '';
    els.unitSelect.appendChild(option);
    els.unitSelect.disabled = true;
    return;
  }
  els.unitSelect.disabled = false;
  for (const key of keys) {
    const { subject, field } = parseUnitKey(key);
    const option = document.createElement('option');
    option.value = key;
    option.textContent = field;
    option.selected = key === currentUnitKey;
    els.unitSelect.appendChild(option);
  }
}

function updateHome(message = '') {
  renderSubjectSwitcher();
  renderUnitSelect();
  renderSubjectDashboard();
  const unit = currentUnit();
  const done = answeredCount();
  const total = questions.length;
  const pct = total ? Math.round(done / total * 1000) / 10 : 0;
  els.currentUnit.textContent = currentUnitKey ? `${unit.subject} ＞ ${unit.field}` : '問題データを読み込んでください';
  els.countBadge.textContent = `${total}問`;
  els.progressText.textContent = `${done} / ${total}（${pct}%）`;
  els.progressBar.style.width = `${pct}%`;

  const overallDone = overallAnsweredCount();
  const overallPct = STUDY_TOTAL ? Math.round(overallDone / STUDY_TOTAL * 10000) / 100 : 0;
  els.overallProgressText.textContent = `${overallDone} / ${STUDY_TOTAL.toLocaleString('ja-JP')}（${overallPct}%）`;
  els.overallProgressBar.style.width = `${Math.min(overallPct, 100)}%`;

  els.startBtn.disabled = total === 0;
  els.startBtn.textContent = done > 0 ? '学習を再開' : '学習を開始';

  const totalQuestions = [...banks.values()].reduce((sum, bank) => sum + bank.length, 0);
  if (message) {
    els.dataStatus.innerHTML = `<strong>${escapeHtml(message)}</strong>`;
  } else if (!banks.size) {
    els.dataStatus.innerHTML = '<strong>問題データはまだ端末に入っていません。</strong><br>「問題データを読み込む」から、個人学習用JSONを選択してください。';
  } else {
    els.dataStatus.innerHTML = `<strong>${banks.size}分野・合計${totalQuestions}問を端末内に保存済みです。</strong><br>分野を切り替えても、演習中のWeb検索は不要です。`;
  }
}

function showHome() {
  els.quiz.classList.add('hidden');
  els.settings.classList.add('hidden');
  els.home.classList.remove('hidden');
  const cfg = subjectConfig();
  els.screenTitle.textContent = `${cfg.exam} ${cfg.key}`;
  updateHome();
}

function showSettings() {
  els.home.classList.add('hidden');
  els.quiz.classList.add('hidden');
  els.settings.classList.remove('hidden');
  els.screenTitle.textContent = '設定';
}

function showQuestion() {
  if (!questions.length) return showHome();
  const q = questions[cursor];
  els.home.classList.add('hidden');
  els.settings.classList.add('hidden');
  els.quiz.classList.remove('hidden');
  els.screenTitle.textContent = `${q.subject}・${q.field}`;
  els.quizPosition.textContent = `${cursor + 1} / ${questions.length}`;
  els.yearBadge.textContent = `${q.year}年`;
  els.sourceBadge.textContent = q.source?.label || '公式問題';
  els.classificationBadge.textContent = q.classificationLabel || q.field;
  els.heading.textContent = `${subjectConfig(q.subject).exam} 問${q.questionNumber}`;
  els.questionText.textContent = q.prompt;
  if (q.imageDataUrl) {
    els.questionImage.src = q.imageDataUrl;
    els.questionImage.alt = q.imageAlt || '問題に必要な図';
    els.questionFigure.classList.remove('hidden');
  } else {
    els.questionImage.removeAttribute('src');
    els.questionImage.alt = '問題図';
    els.questionFigure.classList.add('hidden');
  }
  els.choices.innerHTML = '';
  els.resultCard.className = 'card result-card hidden';

  q.choices.forEach((text, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.innerHTML = `<span class="choice-number">${i + 1}</span><span>${escapeHtml(text)}</span>`;
    btn.addEventListener('click', () => answerQuestion(i + 1));
    els.choices.appendChild(btn);
  });

  state.cursorByUnit[currentUnitKey] = cursor;
  saveState();
}

function answerQuestion(choice) {
  const q = questions[cursor];
  const accepted = acceptedAnswers(q);
  const correct = accepted.includes(choice);
  const old = state.answers[q.id];
  const now = new Date().toISOString();

  if (!old?.firstAnsweredAt) {
    state.answers[q.id] = {
      firstChoice: choice,
      firstCorrect: correct,
      firstAnsweredAt: now,
      lastChoice: choice,
      lastCorrect: correct,
      lastAnsweredAt: now,
    };
  } else {
    state.answers[q.id] = { ...old, lastChoice: choice, lastCorrect: correct, lastAnsweredAt: now };
  }
  saveState();

  [...els.choices.children].forEach((btn, index) => {
    const n = index + 1;
    btn.disabled = true;
    if (accepted.includes(n)) btn.classList.add('correct');
    if (n === choice && !correct) btn.classList.add('wrong');
  });

  const answerLabel = accepted.join(' または ');
  els.resultCard.classList.remove('hidden');
  els.resultCard.classList.add(correct ? 'success' : 'error');
  els.resultTitle.textContent = correct ? '○ 正解です' : `× 不正解　正答は ${answerLabel}`;
  els.resultExplanation.textContent = q.explanation;
  if (cursor >= questions.length - 1) {
    const unit = currentUnit();
    const fieldDone = answeredCountForQuestions(questions);
    const nextKey = fieldDone >= questions.length
      ? nextIncompleteUnitKey(unit.subject, currentUnitKey)
      : null;
    els.nextBtn.textContent = nextKey ? '次の分野へ' : 'ホームへ戻る';
  } else {
    els.nextBtn.textContent = '次の問題';
  }
}

function nextQuestion() {
  if (cursor >= questions.length - 1) {
    const unit = currentUnit();
    const currentKey = currentUnitKey;
    state.cursorByUnit[currentKey] = 0;

    const nextKey = answeredCountForQuestions(questions) >= questions.length
      ? nextIncompleteUnitKey(unit.subject, currentKey)
      : null;

    if (nextKey) {
      currentUnitKey = nextKey;
      loadCurrentQuestions();
    }
    saveState();
    return showHome();
  }
  cursor += 1;
  showQuestion();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.startBtn.addEventListener('click', showQuestion);
els.settingsBtn.addEventListener('click', (event) => {
  event.preventDefault();
  showSettings();
});
els.settingsBackBtn.addEventListener('click', showHome);
els.backBtn.addEventListener('click', showHome);
els.nextBtn.addEventListener('click', nextQuestion);

els.unitSelect.addEventListener('change', () => {
  const key = els.unitSelect.value;
  if (!key || !banks.has(key)) return;
  currentUnitKey = key;
  activeSubject = parseUnitKey(key).subject;
  loadCurrentQuestions();
  saveState();
  showHome();
});

els.importBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', async () => {
  const file = els.fileInput.files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const incoming = normalizeQuestions(raw);
    const grouped = new Map();
    for (const q of incoming) {
      const key = unitKeyFromQuestion(q);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(q);
    }

    for (const [key, items] of grouped) {
      const existing = banks.get(key) || (await dbGet(key)) || [];
      const merged = new Map([...existing, ...items].filter(validateQuestion).map(q => [q.id, q]));
      const bank = [...merged.values()].sort((a, b) => b.year - a.year || a.questionNumber - b.questionNumber);
      await dbPut(key, bank);
      banks.set(key, bank);
    }

    const incomingSubject = incoming[0]?.subject;
    if (SUBJECT_ORDER.includes(incomingSubject)) activeSubject = incomingSubject;
    currentUnitKey = subjectUnitKeys(activeSubject)[0] || [...grouped.keys()][0] || null;
    loadCurrentQuestions();
    saveState();
    updateHome(`${grouped.size}分野・${incoming.length}問を追加しました。`);
  } catch (err) {
    updateHome(`読み込みエラー：${err.message}`);
  } finally {
    els.fileInput.value = '';
  }
});

els.deleteBankBtn.addEventListener('click', async () => {
  if (!currentUnitKey) return;
  const unit = currentUnit();
  if (!confirm(`「${unit.subject} ＞ ${unit.field}」の問題データを端末から削除しますか？進捗は残ります。`)) return;
  await dbDelete(currentUnitKey);
  banks.delete(currentUnitKey);
  currentUnitKey = subjectUnitKeys(activeSubject)[0] || null;
  loadCurrentQuestions();
  saveState();
  showHome();
});

els.resetBtn.addEventListener('click', () => {
  if (!confirm('この端末に保存されたPWAの進捗をすべて0に戻しますか？問題データは残ります。')) return;
  state = { answers: {}, cursorByUnit: {}, currentUnitKey, currentUnitBySubject: state.currentUnitBySubject || {}, activeSubject };
  cursor = 0;
  saveState();
  showHome();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js?v=0.7.0'));
}

try {
  await loadBanks();
} catch (err) {
  console.error(err);
}
showHome();
