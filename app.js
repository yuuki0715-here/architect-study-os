const UNIT = { subject: '計画', field: '西洋建築' };
const STORAGE_KEY = 'architect-study-os-v0.3';
const DB_NAME = 'architect-study-os';
const DB_VERSION = 1;
const STORE_NAME = 'questionBanks';
const BANK_KEY = 'western-architecture';

const els = {
  home: document.querySelector('#home-screen'),
  quiz: document.querySelector('#quiz-screen'),
  screenTitle: document.querySelector('#screen-title'),
  currentUnit: document.querySelector('#current-unit'),
  countBadge: document.querySelector('#question-count-badge'),
  progressText: document.querySelector('#progress-text'),
  progressBar: document.querySelector('#progress-bar'),
  dataStatus: document.querySelector('#data-status'),
  startBtn: document.querySelector('#start-btn'),
  resetBtn: document.querySelector('#reset-btn'),
  backBtn: document.querySelector('#back-btn'),
  quizPosition: document.querySelector('#quiz-position'),
  yearBadge: document.querySelector('#year-badge'),
  sourceBadge: document.querySelector('#source-badge'),
  classificationBadge: document.querySelector('#classification-badge'),
  heading: document.querySelector('#question-heading'),
  questionText: document.querySelector('#question-text'),
  choices: document.querySelector('#choices'),
  resultCard: document.querySelector('#result-card'),
  resultTitle: document.querySelector('#result-title'),
  resultExplanation: document.querySelector('#result-explanation'),
  nextBtn: document.querySelector('#next-btn'),
  importBtn: document.querySelector('#import-btn'),
  deleteBankBtn: document.querySelector('#delete-bank-btn'),
  fileInput: document.querySelector('#file-input'),
};

let questions = [];
let cursor = 0;
let state = loadState();

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { answers: {}, cursorByUnit: {} };
  } catch {
    return { answers: {}, cursorByUnit: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function unitKey() {
  return `${UNIT.subject}::${UNIT.field}`;
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

async function getBank() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(BANK_KEY);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function saveBank(bank) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(bank, BANK_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteBank() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(BANK_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function validateQuestion(q) {
  return q &&
    q.origin === 'real_past_exam' &&
    q.verified === true &&
    typeof q.id === 'string' &&
    Number.isInteger(q.year) &&
    q.subject === UNIT.subject &&
    q.field === UNIT.field &&
    Number.isInteger(q.questionNumber) &&
    typeof q.prompt === 'string' && q.prompt.trim() &&
    Array.isArray(q.choices) && q.choices.length === 4 && q.choices.every(Boolean) &&
    Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 4 &&
    typeof q.explanation === 'string' && q.explanation.trim() &&
    q.source && typeof q.source.label === 'string';
}

function normalizeBank(raw) {
  if (!Array.isArray(raw)) throw new Error('JSONの最上位が配列ではありません');
  const accepted = raw.filter(validateQuestion);
  const unique = new Map(accepted.map(q => [q.id, q]));
  const bank = [...unique.values()].sort((a, b) => b.year - a.year || a.questionNumber - b.questionNumber);
  if (!bank.length) throw new Error('確認済みの「計画・西洋建築」問題が見つかりません');
  return bank;
}

async function loadQuestionsFromDevice() {
  const raw = await getBank();
  questions = Array.isArray(raw) ? raw.filter(validateQuestion) : [];
  questions.sort((a, b) => b.year - a.year || a.questionNumber - b.questionNumber);
  cursor = Math.min(state.cursorByUnit[unitKey()] || 0, Math.max(questions.length - 1, 0));
}

function answeredCount() {
  return questions.filter(q => state.answers[q.id]?.firstAnsweredAt).length;
}

function updateHome(message = '') {
  const done = answeredCount();
  const total = questions.length;
  const pct = total ? Math.round(done / total * 1000) / 10 : 0;
  els.currentUnit.textContent = `${UNIT.subject} ＞ ${UNIT.field}`;
  els.countBadge.textContent = `${total}問`;
  els.progressText.textContent = `${done} / ${total}（${pct}%）`;
  els.progressBar.style.width = `${pct}%`;
  els.startBtn.disabled = total === 0;
  els.startBtn.textContent = done > 0 ? '学習を再開' : '学習を開始';

  if (message) {
    els.dataStatus.innerHTML = `<strong>${escapeHtml(message)}</strong>`;
  } else if (total === 0) {
    els.dataStatus.innerHTML = '<strong>問題データはまだ端末に入っていません。</strong><br>「問題データを読み込む」から、個人学習用JSONを1回だけ選択してください。';
  } else {
    const core = questions.filter(q => q.classification === 'core').length;
    const adjacent = total - core;
    els.dataStatus.innerHTML = `<strong>${total}問の問題データを端末内に保存済みです。</strong><br>西洋建築コア ${core}問＋関連 ${adjacent}問。演習中のWeb検索は不要です。`;
  }
}

function showHome() {
  els.quiz.classList.add('hidden');
  els.home.classList.remove('hidden');
  els.screenTitle.textContent = `${UNIT.subject}・${UNIT.field}`;
  updateHome();
}

function showQuestion() {
  if (!questions.length) return showHome();
  const q = questions[cursor];
  els.home.classList.add('hidden');
  els.quiz.classList.remove('hidden');
  els.screenTitle.textContent = `${UNIT.subject}・${UNIT.field}`;
  els.quizPosition.textContent = `${cursor + 1} / ${questions.length}`;
  els.yearBadge.textContent = `${q.year}年`;
  els.sourceBadge.textContent = 'JAEIC公式問題';
  els.classificationBadge.textContent = q.classificationLabel || '西洋建築';
  els.heading.textContent = `学科I 問${q.questionNumber}`;
  els.questionText.textContent = q.prompt;
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

  state.cursorByUnit[unitKey()] = cursor;
  saveState();
}

function answerQuestion(choice) {
  const q = questions[cursor];
  const correct = choice === q.answer;
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
    state.answers[q.id] = {
      ...old,
      lastChoice: choice,
      lastCorrect: correct,
      lastAnsweredAt: now,
    };
  }
  saveState();

  [...els.choices.children].forEach((btn, index) => {
    const n = index + 1;
    btn.disabled = true;
    if (n === q.answer) btn.classList.add('correct');
    if (n === choice && !correct) btn.classList.add('wrong');
  });

  els.resultCard.classList.remove('hidden');
  els.resultCard.classList.add(correct ? 'success' : 'error');
  els.resultTitle.textContent = correct ? '○ 正解です' : `× 不正解　正答は ${q.answer}`;
  els.resultExplanation.textContent = q.explanation;
  els.nextBtn.textContent = cursor >= questions.length - 1 ? 'ホームへ戻る' : '次の問題';
}

function nextQuestion() {
  if (cursor >= questions.length - 1) {
    state.cursorByUnit[unitKey()] = 0;
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
els.backBtn.addEventListener('click', showHome);
els.nextBtn.addEventListener('click', nextQuestion);
els.importBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', async () => {
  const file = els.fileInput.files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const bank = normalizeBank(raw);
    await saveBank(bank);
    questions = bank;
    cursor = 0;
    state.cursorByUnit[unitKey()] = 0;
    saveState();
    updateHome(`${bank.length}問を端末に読み込みました。`);
  } catch (err) {
    updateHome(`読み込みエラー：${err.message}`);
  } finally {
    els.fileInput.value = '';
  }
});

els.deleteBankBtn.addEventListener('click', async () => {
  if (!confirm('この端末に保存した問題データを削除しますか？進捗は残ります。')) return;
  await deleteBank();
  questions = [];
  cursor = 0;
  updateHome('端末の問題データを削除しました。');
});

els.resetBtn.addEventListener('click', () => {
  if (!confirm('この端末に保存された進捗をリセットしますか？問題データは残ります。')) return;
  state = { answers: {}, cursorByUnit: {} };
  cursor = 0;
  saveState();
  showHome();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

try {
  await loadQuestionsFromDevice();
} catch (err) {
  console.error(err);
}
updateHome();
