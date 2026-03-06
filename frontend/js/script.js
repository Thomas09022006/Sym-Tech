// ═══════════════════════════════════════════════════════════
// InnovateX Quiz Platform — API-Connected & Refined Design
// ═══════════════════════════════════════════════════════════

// ── API base URL ──
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api/v1'
  : 'https://sym-tech.onrender.com/api/v1';

// ── Static Config ──
const ADMIN_PASSWORD = 'admin123';

// ── State Variables ──
let questions = [];       // loaded from backend
let settings = { timer: 30, shuffle: true, shuffleOpts: false, questionsPerQuiz: 40 };
let registrations = [];
let results = [];
let currentParticipant = {};
let quizQuestions = [];
let currentQ = 0;
let timerInterval = null;
let timeLeft = 30;
let answered = false;
let selectedOption = -1;
let totalTimeTaken = 0;
let correctCount = 0;
let tabSwitchCount = 0;
let screenshotCount = 0;
let quizActive = false;

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
window.onload = () => {
  fetchSettings();
};

async function fetchSettings() {
  try {
    const res = await fetch(`${API}/settings`);
    const data = await res.json();
    if (data.success) settings = data.settings;
  } catch (e) {
    console.warn('Could not fetch settings:', e);
  }
}

// ═══════════════════════════════════════════════════════════
// ANTI-MALPRACTICE SYSTEM
// ═══════════════════════════════════════════════════════════
let originalViewportHeight = window.innerHeight;
let splitScreenDetected = false;

document.addEventListener('contextmenu', function (e) {
  if (quizActive) { e.preventDefault(); showWarningToast('🚫 Right-click is DISABLED during the quiz!'); }
});

document.addEventListener('selectstart', function (e) {
  if (quizActive) e.preventDefault();
});

let longPressTimer = null;
document.addEventListener('touchstart', function (e) {
  if (!quizActive) return;
  longPressTimer = setTimeout(() => {
    e.preventDefault();
    showWarningToast('🚫 Long-press is DISABLED during the quiz!');
  }, 400);
}, { passive: false });
document.addEventListener('touchend', () => clearTimeout(longPressTimer));
document.addEventListener('touchmove', () => clearTimeout(longPressTimer));

['copy', 'cut', 'paste'].forEach(evt => {
  document.addEventListener(evt, function (e) {
    if (quizActive) { e.preventDefault(); showWarningToast('🚫 Copy/Paste is DISABLED during the quiz!'); }
  });
});

document.addEventListener('keydown', function (e) {
  if (!quizActive) return;
  if (e.key === 'PrintScreen' || e.code === 'PrintScreen') { e.preventDefault(); handleScreenshotAttempt(); return; }
  if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); handleScreenshotAttempt(); return; }
  if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) { e.preventDefault(); handleScreenshotAttempt(); return; }
  if (e.key === 'F12') { e.preventDefault(); showWarningToast('🚫 Developer tools are DISABLED!'); return; }
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) { e.preventDefault(); return; }
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); return; }
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); return; }
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); showWarningToast('🚫 Copying is DISABLED!'); return; }
});

document.addEventListener('visibilitychange', function () {
  if (!quizActive) return;
  if (document.hidden) {
    showScreenshotOverlay();
    tabSwitchCount++;
    if (tabSwitchCount >= 3) {
      showWarningToast('🚫 VIOLATION: 3 tab switches detected! Your quiz is being auto-submitted.');
      setTimeout(() => { hideScreenshotOverlay(); forceFinishQuiz(); }, 1500);
    } else {
      showWarningToast(`⚠ WARNING ${tabSwitchCount}/3 — Tab switch detected! ${3 - tabSwitchCount} more and your quiz will be auto-submitted.`);
    }
  } else {
    setTimeout(() => hideScreenshotOverlay(), 800);
  }
});

window.addEventListener('blur', function () { if (quizActive) showScreenshotOverlay(); });
window.addEventListener('focus', function () { if (quizActive) setTimeout(() => hideScreenshotOverlay(), 800); });

window.addEventListener('resize', function () {
  if (!quizActive) return;
  const ratio = window.innerHeight / originalViewportHeight;
  if (ratio < 0.70 && !splitScreenDetected) {
    splitScreenDetected = true;
    tabSwitchCount++;
    showScreenshotOverlay();
    if (tabSwitchCount >= 3) {
      showWarningToast('🚫 VIOLATION: Split screen detected! Your quiz is being auto-submitted.');
      setTimeout(() => { hideScreenshotOverlay(); forceFinishQuiz(); }, 1500);
    } else {
      showWarningToast(`⚠ WARNING ${tabSwitchCount}/3 — Split screen detected! Do NOT use split view.`);
      setTimeout(() => hideScreenshotOverlay(), 2000);
    }
  }
  if (ratio >= 0.85) splitScreenDetected = false;
});

function showWarningToast(msg) {
  let toast = document.getElementById('antiCheatToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'antiCheatToast';
    toast.style.cssText = `
      position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:99998;
      background:linear-gradient(135deg, #1a0a0a, #2d0e0e); color:#ff3d5a;
      font-family:'Orbitron',monospace; font-size:0.75rem; letter-spacing:2px;
      padding:14px 28px; border-radius:8px; border:1px solid #ff3d5a;
      box-shadow:0 0 30px rgba(255,61,90,0.4); transition:opacity 0.4s, transform 0.4s;
      text-align:center; max-width:90vw;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 4000);
}

function enableAntiCheat() {
  quizActive = true;
  tabSwitchCount = 0;
  screenshotCount = 0;
  splitScreenDetected = false;
  originalViewportHeight = window.innerHeight;
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.webkitTouchCallout = 'none';
  document.body.style.touchAction = 'manipulation';
}

function disableAntiCheat() {
  quizActive = false;
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';
  document.body.style.webkitTouchCallout = '';
  document.body.style.touchAction = '';
  hideScreenshotOverlay();
}

function handleScreenshotAttempt() {
  if (!quizActive) return;
  screenshotCount++;
  try { navigator.clipboard.writeText('📛 SCREENSHOT BLOCKED').catch(() => { }); } catch (e) { }
  showScreenshotOverlay();
  if (screenshotCount >= 3) {
    showWarningToast('🚫 VIOLATION: 3 screenshot attempts! Your quiz is being auto-submitted.');
    setTimeout(() => { hideScreenshotOverlay(); forceFinishQuiz(); }, 2000);
  } else {
    showWarningToast(`⚠ WARNING ${screenshotCount}/3 — Screenshot detected! ${3 - screenshotCount} more and your quiz will be auto-submitted.`);
    setTimeout(() => hideScreenshotOverlay(), 1500);
  }
}

function showScreenshotOverlay() {
  let ov = document.getElementById('screenshotBlockOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'screenshotBlockOverlay';
    ov.className = 'screenshot-overlay';
    ov.innerHTML = '<div style="font-size:3rem;">🚫</div><div>SCREENSHOT BLOCKED</div><div style="font-size:0.7rem;color:var(--muted);">Anti-cheat system active</div>';
    document.body.appendChild(ov);
  }
  ov.classList.add('active');
}

function hideScreenshotOverlay() {
  const ov = document.getElementById('screenshotBlockOverlay');
  if (ov) ov.classList.remove('active');
}

// ═══════════════════════════════════════════════════════════
// SCREEN NAVIGATION
// ═══════════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════════════════
function promptAdmin() {
  document.getElementById('adminModal').style.display = 'flex';
  document.getElementById('adminPwd').value = '';
  document.getElementById('adminErr').style.display = 'none';
  setTimeout(() => document.getElementById('adminPwd').focus(), 100);
}
function closeAdminModal() { document.getElementById('adminModal').style.display = 'none'; }
function checkAdmin() {
  if (document.getElementById('adminPwd').value === ADMIN_PASSWORD) {
    closeAdminModal();
    showScreen('admin');
  } else {
    document.getElementById('adminErr').style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN — REGISTER PARTICIPANT
// ═══════════════════════════════════════════════════════════
async function registerParticipant() {
  const name = document.getElementById('regName').value.trim();
  const college = document.getElementById('regCollege').value.trim();
  const year = document.getElementById('regYear').value;
  const dept = document.getElementById('regDept').value;

  if (!name || !college || !year || !dept) {
    alert('Please fill all required fields (Name, College, Year, Department).');
    return;
  }

  try {
    const res = await fetch(`${API}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, college, year, dept })
    });
    const data = await res.json();
    if (data.success) {
      // Show success with Register ID
      document.getElementById('regSuccessName').textContent = data.registration.name.toUpperCase();
      document.getElementById('regIdDisplay').textContent = data.registration.regId;
      document.getElementById('regSuccessCard').style.display = 'block';
    } else {
      alert(data.errors ? data.errors.join('\n') : 'Registration failed.');
    }
  } catch (e) {
    alert('Network error. Check server.');
  }
}

function resetRegForm() {
  document.getElementById('regName').value = '';
  document.getElementById('regCollege').value = '';
  document.getElementById('regYear').value = '';
  document.getElementById('regDept').value = '';
  document.getElementById('regSuccessCard').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// TAKE QUIZ — Login via API
// ═══════════════════════════════════════════════════════════
async function startQuiz() {
  const name = document.getElementById('participantName').value.trim();
  const regId = document.getElementById('participantRegId').value.trim().toUpperCase();

  if (!name || !regId) {
    alert('Please enter your Name and Register ID.');
    return;
  }

  try {
    const res = await fetch(`${API}/quiz/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, regId })
    });
    const data = await res.json();
    if (data.success) {
      quizQuestions = data.questions;
      settings = data.settings;
      currentParticipant = data.participant; // includes name, regId, dept

      currentQ = 0;
      correctCount = 0;
      totalTimeTaken = 0;

      enableAntiCheat();
      showScreen('quiz');
      renderQuestion();
    } else {
      alert(data.error || 'Could not start quiz.');
    }
  } catch (e) {
    alert('Network error. Check server.');
  }
}

// ═══════════════════════════════════════════════════════════
// QUIZ ENGINE
// ═══════════════════════════════════════════════════════════
function renderQuestion() {
  const q = quizQuestions[currentQ];
  const total = quizQuestions.length;
  document.getElementById('qCounter').textContent = `Q ${currentQ + 1} / ${total}`;
  document.getElementById('qNum').textContent = `QUESTION ${currentQ + 1}`;
  document.getElementById('qText').textContent = q.q;
  document.getElementById('qTopic').textContent = `${q.topic} · ${q.diff.toUpperCase()}`;
  document.getElementById('progressBar').style.width = ((currentQ) / total * 100) + '%';
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('nextBtn').textContent = 'NEXT →';
  answered = false;
  selectedOption = -1;
  const labels = ['A', 'B', 'C', 'D'];
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  q.opts.forEach((opt, i) => {
    const el = document.createElement('div');
    el.className = 'option';
    el.innerHTML = `<div class="opt-label">${labels[i]}</div><span>${opt}</span>`;
    el.onclick = () => selectAnswer(i);
    container.appendChild(el);
  });
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = settings.timer;
  updateTimerUI();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) { clearInterval(timerInterval); if (!answered) autoSkip(); }
  }, 1000);
}

function updateTimerUI() {
  const pct = timeLeft / settings.timer;
  const offset = 188 - (pct * 188);
  const circle = document.getElementById('timerCircle');
  const num = document.getElementById('timerNum');
  circle.style.strokeDashoffset = offset;
  num.textContent = timeLeft;
  if (pct <= 0.33) { circle.style.stroke = 'var(--red)'; num.style.color = 'var(--red)'; num.classList.add('pulsing'); }
  else if (pct <= 0.6) { circle.style.stroke = 'var(--accent2)'; num.style.color = 'var(--accent2)'; num.classList.remove('pulsing'); }
  else { circle.style.stroke = 'var(--accent)'; num.style.color = 'var(--accent)'; num.classList.remove('pulsing'); }
}

function selectAnswer(sel) {
  if (answered) return;
  selectedOption = sel;
  document.querySelectorAll('.option').forEach((el, i) => {
    el.classList.remove('selected');
    if (i === sel) el.classList.add('selected');
  });
  document.getElementById('nextBtn').style.display = 'inline-flex';
}

function autoSkip() {
  if (answered) return;
  answered = true;
  document.getElementById('nextBtn').style.display = 'inline-flex';
  document.getElementById('nextBtn').textContent = 'TIME UP — NEXT →';
}

function nextQuestion() {
  const q = quizQuestions[currentQ];
  const qLogEntry = { questionId: q.id, selected: selectedOption };
  if (!window._ansLog) window._ansLog = [];
  window._ansLog.push(qLogEntry);

  totalTimeTaken += (selectedOption === -1) ? settings.timer : (settings.timer - timeLeft);
  answered = true;
  clearInterval(timerInterval);
  currentQ++;
  if (currentQ >= quizQuestions.length) submitQuiz();
  else renderQuestion();
}

function forceFinishQuiz() {
  if (!quizActive) return;
  if (!window._ansLog) window._ansLog = [];
  while (currentQ < quizQuestions.length) {
    window._ansLog.push({ questionId: quizQuestions[currentQ].id, selected: -1 });
    totalTimeTaken += settings.timer;
    currentQ++;
  }
  submitQuiz();
}

async function submitQuiz() {
  clearInterval(timerInterval);
  disableAntiCheat();

  const payload = {
    name: currentParticipant.name,
    regId: currentParticipant.regId,
    dept: currentParticipant.dept,
    answers: window._ansLog || [],
    timeTaken: totalTimeTaken,
    screenshotAttempts: screenshotCount,
    tabSwitches: tabSwitchCount,
    flaggedCheater: (screenshotCount >= 3 || tabSwitchCount >= 3)
  };

  try {
    const res = await fetch(`${API}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('tyName').textContent = currentParticipant.name;
      showScreen('thankyou');
      window._ansLog = [];
    } else {
      alert(data.error || 'Submission failed.');
    }
  } catch (e) {
    alert('Network error during submission.');
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN — TABS & DATA LOADING
// ═══════════════════════════════════════════════════════════
function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
}

async function renderAdminRegs() {
  const tbody = document.getElementById('adminRegBody');
  const empty = document.getElementById('adminRegEmpty');
  tbody.innerHTML = '';
  try {
    const res = await fetch(`${API}/registrations`);
    const data = await res.json();
    if (data.success) {
      document.getElementById('regCount').textContent = data.count;
      if (data.count === 0) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      data.registrations.forEach((r, i) => {
        const tr = document.createElement('tr');
        let status = '<span class="badge badge-blue">PENDING</span>';
        if (r.quizDone) {
          status = `<span class="badge badge-green">DONE</span>`;
          // You could add logic here for cheat status if sent from backend
        }
        tr.innerHTML = `<td>${i + 1}</td><td style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);">${r.regId}</td><td>${r.name}</td><td style="font-size:0.85rem;">${r.college}</td><td>${r.year}</td><td>${r.dept}</td><td>${status}</td>`;
        tbody.appendChild(tr);
      });
    }
  } catch (e) { console.error(e); }
}

async function renderAdminQuestions() {
  const list = document.getElementById('questionList');
  list.innerHTML = '';
  try {
    const res = await fetch(`${API}/questions`);
    const data = await res.json();
    if (data.success) {
      questions = data.questions;
      if (questions.length === 0) { list.innerHTML = '<div class="empty-state">No questions yet.</div>'; return; }
      const labels = ['A', 'B', 'C', 'D'];
      questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'q-item';
        div.innerHTML = `
          <div class="q-item-text">Q${i + 1}. ${q.q}<span class="q-topic-badge">${q.topic}</span><span class="badge ${q.diff === 'easy' ? 'badge-blue' : 'badge-green'}" style="margin-left:4px;">${q.diff.toUpperCase()}</span></div>
          <div class="q-item-opts">${q.opts.map((o, j) => `${labels[j]}) ${o}${j === q.ans ? '<span class="q-correct-badge">✓</span>' : ''}`).join(' &nbsp;')}</div>
          <div class="q-item-actions">
            <button class="btn btn-secondary btn-sm" onclick="editQuestion(${q.id})">✏</button>
            <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">✕</button>
          </div>`;
        list.appendChild(div);
      });
    }
  } catch (e) { console.error(e); }
}

async function renderAdminResults() {
  const tbody = document.getElementById('adminResultsBody');
  const empty = document.getElementById('adminResultsEmpty');
  tbody.innerHTML = '';
  try {
    const res = await fetch(`${API}/results`);
    const data = await res.json();
    if (data.success) {
      const sorted = data.results;
      if (sorted.length === 0) { empty.style.display = 'block'; return; }
      empty.style.display = 'none';
      sorted.forEach((e, i) => {
        const tr = document.createElement('tr');
        const statusBadge = e.flaggedCheater
          ? `<span class="badge" style="background:rgba(255,61,90,0.15);color:var(--red);border:1px solid var(--red);">🚫 CHEAT</span>`
          : '<span class="badge badge-green">CLEAN</span>';

        tr.innerHTML = `<td>${i + 1}</td><td>${e.name}</td><td style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);">${e.regId}</td><td style="font-size:0.85rem;">${e.college || 'CSI'}</td><td>${e.dept}</td><td class="lb-score">${e.score}%</td><td>${e.correct}/${e.total}</td><td class="lb-time">${e.time}s</td><td>${statusBadge}</td>`;
        tbody.appendChild(tr);
      });
    }
  } catch (e) { console.error(e); }
}

// ── CRUD Helpers ──
let editingIdx = -1;
function toggleAddForm() {
  editingIdx = -1; clearForm();
  document.getElementById('formTitle').textContent = 'ADD QUESTION';
  document.getElementById('qForm').classList.toggle('active');
}

function clearForm() {
  document.getElementById('fQuestion').value = '';
  [0, 1, 2, 3].forEach(i => { document.getElementById('fOpt' + i).value = ''; document.getElementById('r' + i).checked = false; });
}

function cancelForm() { clearForm(); document.getElementById('qForm').classList.remove('active'); editingIdx = -1; }

async function saveQuestion() {
  const qText = document.getElementById('fQuestion').value.trim();
  const opts = [0, 1, 2, 3].map(i => document.getElementById('fOpt' + i).value.trim());
  const checked = [...document.querySelectorAll('input[name=correct]')].find(r => r.checked);
  const ans = checked ? parseInt(checked.value) : -1;
  if (!qText || opts.some(o => !o) || ans < 0) { alert('Fill all fields and select correct answer.'); return; }

  const payload = {
    question: qText,
    options: opts,
    correct: ans,
    topic: document.getElementById('fTopic').value,
    difficulty: document.getElementById('fDifficulty').value
  };

  const url = editingIdx >= 0 ? `${API}/questions/${editingIdx}` : `${API}/questions`;
  const method = editingIdx >= 0 ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if ((await res.json()).success) {
      cancelForm();
      renderAdminQuestions();
    }
  } catch (e) { alert('Error saving question.'); }
}

function editQuestion(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;
  editingIdx = id;
  document.getElementById('fQuestion').value = q.q;
  document.getElementById('fTopic').value = q.topic;
  document.getElementById('fDifficulty').value = q.diff;
  q.opts.forEach((o, j) => document.getElementById('fOpt' + j).value = o);
  document.getElementById('r' + q.ans).checked = true;
  document.getElementById('formTitle').textContent = 'EDIT QUESTION';
  document.getElementById('qForm').classList.add('active');
  document.getElementById('qForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteQuestion(id) {
  if (!confirm('Delete?')) return;
  try {
    const res = await fetch(`${API}/questions/${id}`, { method: 'DELETE' });
    if ((await res.json()).success) renderAdminQuestions();
  } catch (e) { alert('Error deleting.'); }
}

// ── Settings & Misc ──
function loadSettingsUI() {
  document.getElementById('sTimer').value = settings.timer;
  document.getElementById('sQPerQuiz').value = settings.questionsPerQuiz;
  document.getElementById('sShuffle').value = settings.shuffle ? '1' : '0';
  document.getElementById('sShuffleOpts').value = settings.shuffleOpts ? '1' : '0';
}

async function saveSettings() {
  const payload = {
    timer: parseInt(document.getElementById('sTimer').value),
    questionsPerQuiz: parseInt(document.getElementById('sQPerQuiz').value),
    shuffle_questions: document.getElementById('sShuffle').value === '1',
    shuffle_options: document.getElementById('sShuffleOpts').value === '1'
  };
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if ((await res.json()).success) {
      const status = document.getElementById('settingsSaved');
      status.style.display = 'block';
      setTimeout(() => status.style.display = 'none', 2000);
      settings.timer = payload.timer;
      settings.questionsPerQuiz = payload.questionsPerQuiz;
      settings.shuffle = payload.shuffle_questions;
      settings.shuffleOpts = payload.shuffle_options;
    }
  } catch (e) { alert('Error saving settings.'); }
}

async function clearRegs() {
  if (!confirm('Clear ALL participants?')) return;
  await fetch(`${API}/registrations`, { method: 'DELETE' });
  renderAdminRegs();
}

async function clearLeaderboard() {
  if (!confirm('Clear all results?')) return;
  await fetch(`${API}/results`, { method: 'DELETE' });
  renderAdminResults();
}

async function clearAttempts() {
  if (!confirm('Reset all attempts?')) return;
  await fetch(`${API}/results/attempts`, { method: 'DELETE' });
  alert('Attempts reset.');
}

function exportCSV() { window.open(`${API}/results/export`); }
function exportRegsCSV() { window.open(`${API}/registrations/export`); }
