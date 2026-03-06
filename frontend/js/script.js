// ═══════════════════════════════════════════════
// InnovateX Quiz Platform — Frontend (API-connected)
// ═══════════════════════════════════════════════

// ── API base URL ──
// Local dev:  '/api/v1'
// Production: 'https://sym-tech.onrender.com/api/v1'
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? '/api/v1'
  : 'https://sym-tech.onrender.com/api/v1';

let questions = [];       // loaded from backend
let settings = { timer: 30, shuffle: true, shuffleOpts: false, questionsPerQuiz: 30 };
let leaderboard = [];
let registrations = [];
let currentParticipant = {};
let quizQuestions = [];
let currentQ = 0;
let timerInterval = null;
let timeLeft = 30;
let answered = false;
let selectedOption = -1;
let totalTimeTaken = 0;
let correctCount = 0;
let wrongCount = 0;
let editingId = -1;       // now uses DB id instead of array index
let lastRegData = null;
let tabSwitchCount = 0;
let quizActive = false;
let answerLog = [];        // { questionId, selected } — sent to server on submit
let screenshotCount = 0;   // screenshot attempt tracker

// ═══════════════════════════════════════════════
// HELPER: fetch wrapper
// ═══════════════════════════════════════════════
async function api(path, options = {}) {
  const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
  try {
    const res = await fetch(API + path, opts);
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return { success: false, error: 'Network error. Is the server running?' };
  }
}

// ═══════════════════════════════════════════════
// ANTI-MALPRACTICE SYSTEM (Desktop + Mobile)
// ═══════════════════════════════════════════════

let originalViewportHeight = window.innerHeight;
let splitScreenDetected = false;

// ── Disable right-click & long-press (mobile context menu) ──
document.addEventListener('contextmenu', function (e) {
  if (quizActive) { e.preventDefault(); showWarningToast('⚠ Right-click / long-press is disabled!'); }
});

// ── Disable text selection ──
document.addEventListener('selectstart', function (e) {
  if (quizActive) e.preventDefault();
});

// ── Block long-press on mobile (prevents copy/image-save menus) ──
let longPressTimer = null;
document.addEventListener('touchstart', function (e) {
  if (!quizActive) return;
  longPressTimer = setTimeout(() => {
    e.preventDefault();
    showWarningToast('⚠ Long-press is disabled during the quiz!');
  }, 400);
}, { passive: false });
document.addEventListener('touchend', function () {
  clearTimeout(longPressTimer);
});
document.addEventListener('touchmove', function () {
  clearTimeout(longPressTimer);
});

// ── Block copy, cut, paste ──
['copy', 'cut', 'paste'].forEach(evt => {
  document.addEventListener(evt, function (e) {
    if (quizActive) { e.preventDefault(); showWarningToast('⚠ Copy/Paste is disabled during the quiz!'); }
  });
});

// ── Keyboard: screenshots, devtools, copy ──
document.addEventListener('keydown', function (e) {
  if (!quizActive) return;

  // ── Screenshot detection ──
  if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
    e.preventDefault();
    handleScreenshotAttempt();
    return;
  }
  // Windows Snipping Tool: Win+Shift+S
  if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    handleScreenshotAttempt();
    return;
  }
  // Mac screenshot: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
  if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
    e.preventDefault();
    handleScreenshotAttempt();
    return;
  }

  // ── Existing anti-cheat keys ──
  if (e.key === 'F12') { e.preventDefault(); showWarningToast('⚠ Developer tools are disabled!'); return; }
  if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) { e.preventDefault(); return; }
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); return; }
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); return; }
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); showWarningToast('⚠ Copying is disabled!'); return; }
});

// ── Tab/App switching detection (covers mobile app switch + desktop tab switch) ──
document.addEventListener('visibilitychange', function () {
  if (!quizActive) return;
  if (document.hidden) {
    // Show overlay IMMEDIATELY so any screenshot captures a black screen
    showScreenshotOverlay();
    tabSwitchCount++;
    if (tabSwitchCount >= 3) {
      showWarningToast('🚫 Too many tab/app switches! Auto-submitting quiz...');
      setTimeout(() => { hideScreenshotOverlay(); forceFinishQuiz(); }, 1500);
    } else {
      showWarningToast(`⚠ WARNING ${tabSwitchCount}/3: Do NOT switch tabs/apps! Your quiz will be auto-submitted.`);
    }
  } else {
    // User came back — hide overlay after a short delay
    setTimeout(() => hideScreenshotOverlay(), 800);
  }
});

// ── Blur detection (catches app switches that visibilitychange misses on some mobile browsers) ──
window.addEventListener('blur', function () {
  if (!quizActive) return;
  // On mobile, blur fires when switching apps even if visibilitychange doesn't
  showScreenshotOverlay();
});
window.addEventListener('focus', function () {
  if (!quizActive) return;
  setTimeout(() => hideScreenshotOverlay(), 800);
});

// ── Split screen / picture-in-picture detection via resize ──
window.addEventListener('resize', function () {
  if (!quizActive) return;
  const currentHeight = window.innerHeight;
  const ratio = currentHeight / originalViewportHeight;

  // If viewport shrinks to less than 70% of original → split screen detected
  if (ratio < 0.70 && !splitScreenDetected) {
    splitScreenDetected = true;
    tabSwitchCount++;
    showScreenshotOverlay();
    if (tabSwitchCount >= 3) {
      showWarningToast('🚫 Split screen detected! Auto-submitting quiz...');
      setTimeout(() => { hideScreenshotOverlay(); forceFinishQuiz(); }, 1500);
    } else {
      showWarningToast(`⚠ WARNING ${tabSwitchCount}/3: Split screen detected! Do NOT use split view.`);
      setTimeout(() => hideScreenshotOverlay(), 2000);
    }
  }
  // Reset split screen flag when viewport returns to normal
  if (ratio >= 0.85) {
    splitScreenDetected = false;
  }
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
  }, 3000);
}

function enableAntiCheat() {
  quizActive = true;
  tabSwitchCount = 0;
  screenshotCount = 0;
  splitScreenDetected = false;
  originalViewportHeight = window.innerHeight;
  // CSS protections
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.webkitTouchCallout = 'none';  // Prevent iOS long-press menus
  document.body.style.touchAction = 'manipulation';  // Disable double-tap zoom
}
function disableAntiCheat() {
  quizActive = false;
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';
  document.body.style.webkitTouchCallout = '';
  document.body.style.touchAction = '';
  hideScreenshotOverlay();
}

// ═══════════════════════════════════════════════
// SCREENSHOT DETECTION & BLOCKING
// ═══════════════════════════════════════════════
function handleScreenshotAttempt() {
  if (!quizActive) return;
  screenshotCount++;

  // Clear clipboard to prevent screenshot data
  try {
    navigator.clipboard.writeText('📛 SCREENSHOT BLOCKED — InnovateX Anti-Cheat').catch(() => { });
  } catch (e) { /* clipboard API may not be available */ }

  // Show blocking overlay briefly
  showScreenshotOverlay();

  if (screenshotCount >= 3) {
    showWarningToast('🚫 CHEATING DETECTED! 3 screenshot attempts — Auto-submitting quiz...');
    setTimeout(() => {
      hideScreenshotOverlay();
      forceFinishQuiz();
    }, 2000);
  } else {
    showWarningToast(`📸 WARNING ${screenshotCount}/3: Screenshot attempt detected! Your quiz will be auto-submitted after 3 attempts.`);
    setTimeout(() => hideScreenshotOverlay(), 1500);
  }
}

function showScreenshotOverlay() {
  let overlay = document.getElementById('screenshotBlockOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'screenshotBlockOverlay';
    overlay.className = 'screenshot-overlay';
    overlay.innerHTML = `
      <div style="font-size:3rem;">🚫</div>
      <div>SCREENSHOT BLOCKED</div>
      <div style="font-size:0.7rem;color:var(--muted);letter-spacing:1px;">Anti-cheat system active</div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('active');
}

function hideScreenshotOverlay() {
  const overlay = document.getElementById('screenshotBlockOverlay');
  if (overlay) overlay.classList.remove('active');
}

// ═══════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════
// ADMIN AUTH (now server-side)
// ═══════════════════════════════════════════════
function promptAdmin() {
  document.getElementById('adminModal').style.display = 'flex';
  document.getElementById('adminPwd').value = '';
  document.getElementById('adminErr').style.display = 'none';
  setTimeout(() => document.getElementById('adminPwd').focus(), 100);
}
function closeAdminModal() { document.getElementById('adminModal').style.display = 'none'; }

async function checkAdmin() {
  const pwd = document.getElementById('adminPwd').value;
  const res = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password: pwd }) });
  if (res.success) {
    closeAdminModal();
    showScreen('admin');
    await loadQuestions();
    renderAdminQuestions();
    await loadSettings();
  } else {
    document.getElementById('adminErr').style.display = 'block';
  }
}

// ═══════════════════════════════════════════════
// REGISTRATION (via API)
// ═══════════════════════════════════════════════
async function submitRegistration() {
  const name = document.getElementById('regName').value.trim();
  const roll = document.getElementById('regRoll').value.trim();
  const year = document.getElementById('regYear').value;
  const dept = document.getElementById('regDept').value;
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const college = document.getElementById('regCollege').value.trim() || 'CSI College of Engineering';

  if (!name || !roll || !year || !dept) { alert('Please fill all required fields.'); return; }

  const res = await api('/registrations', {
    method: 'POST',
    body: JSON.stringify({ name, roll, year, dept, phone, email, college })
  });

  if (!res.success) {
    alert(res.errors ? res.errors.join('\n') : res.error || 'Registration failed.');
    return;
  }

  lastRegData = res.registration;
  document.getElementById('regSuccessName').textContent = name.toUpperCase();
  document.getElementById('regIdDisplay').textContent = res.registration.regId;
  document.getElementById('regFormCard').style.display = 'none';
  document.getElementById('regSuccessCard').style.display = 'block';
}

function resetReg() {
  document.getElementById('regFormCard').style.display = 'block';
  document.getElementById('regSuccessCard').style.display = 'none';
  ['regName', 'regRoll', 'regPhone', 'regEmail', 'regCollege'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('regYear').value = '';
  document.getElementById('regDept').value = '';
  lastRegData = null;
}

function goToQuizFromReg() {
  if (lastRegData) {
    document.getElementById('participantName').value = lastRegData.name;
    document.getElementById('rollNum').value = lastRegData.roll;
    document.getElementById('dept').value = lastRegData.dept;
    startQuizDirect(lastRegData.name, lastRegData.roll, lastRegData.dept);
  } else { showScreen('nameEntry'); }
}

// ═══════════════════════════════════════════════
// QUIZ (start via API, score server-side)
// ═══════════════════════════════════════════════
async function startQuiz() {
  const name = document.getElementById('participantName').value.trim();
  const roll = document.getElementById('rollNum').value.trim();
  const dept = document.getElementById('dept').value.trim();
  if (!name || !roll) { alert('Please enter your name and roll number.'); return; }
  await startQuizDirect(name, roll, dept);
}

async function startQuizDirect(name, roll, dept) {
  const res = await api('/quiz/start', {
    method: 'POST',
    body: JSON.stringify({ name, roll, dept })
  });

  if (!res.success) {
    alert(res.error || 'Could not start quiz.');
    return;
  }

  currentParticipant = res.participant;
  quizQuestions = res.questions;
  settings = res.settings;

  document.getElementById('quizParticipantName').textContent = name.toUpperCase();
  currentQ = 0; correctCount = 0; wrongCount = 0; totalTimeTaken = 0;
  answerLog = [];
  enableAntiCheat();
  showScreen('quiz');
  renderQuestion();
}

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
  timeLeft = settings.timer; updateTimerUI();
  timerInterval = setInterval(() => {
    timeLeft--; updateTimerUI();
    if (timeLeft <= 0) { clearInterval(timerInterval); if (!answered) autoSkip(); }
  }, 1000);
}

function updateTimerUI() {
  const pct = timeLeft / settings.timer;
  const offset = 188 - (pct * 188);
  const circle = document.getElementById('timerCircle');
  const numEl = document.getElementById('timerNum');
  circle.style.strokeDashoffset = offset;
  numEl.textContent = timeLeft;
  if (pct <= 0.33) { circle.style.stroke = 'var(--red)'; numEl.style.color = 'var(--red)'; numEl.classList.add('pulsing'); }
  else if (pct <= 0.6) { circle.style.stroke = 'var(--accent2)'; numEl.style.color = 'var(--accent2)'; numEl.classList.remove('pulsing'); }
  else { circle.style.stroke = 'var(--accent)'; numEl.style.color = 'var(--accent)'; numEl.classList.remove('pulsing'); }
}

function selectAnswer(selected) {
  selectedOption = selected;
  document.querySelectorAll('.option').forEach((el, i) => {
    el.classList.remove('selected');
    if (i === selected) el.classList.add('selected');
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
  // Log answer for server submission
  answerLog.push({
    questionId: q.id,
    selected: selectedOption
  });

  totalTimeTaken += (selectedOption === -1) ? settings.timer : (settings.timer - timeLeft);
  answered = true;
  clearInterval(timerInterval);
  currentQ++;
  selectedOption = -1;
  if (currentQ >= quizQuestions.length) finishQuiz();
  else renderQuestion();
}

async function forceFinishQuiz() {
  if (!quizActive) return;
  // Log remaining unanswered
  while (currentQ < quizQuestions.length) {
    answerLog.push({ questionId: quizQuestions[currentQ].id, selected: -1 });
    totalTimeTaken += settings.timer;
    currentQ++;
  }
  await finishQuiz();
}

async function finishQuiz() {
  clearInterval(timerInterval);
  disableAntiCheat();

  const res = await api('/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({
      name: currentParticipant.name,
      roll: currentParticipant.roll,
      dept: currentParticipant.dept,
      answers: answerLog,
      timeTaken: totalTimeTaken,
      screenshotAttempts: screenshotCount,
      flaggedCheater: screenshotCount >= 3
    })
  });

  if (!res.success) {
    alert(res.error || 'Failed to submit quiz.');
    showScreen('home');
    return;
  }

  document.getElementById('tyName').textContent = currentParticipant.name;
  showScreen('thankyou');
}

// ═══════════════════════════════════════════════
// LEADERBOARD (from API)
// ═══════════════════════════════════════════════
async function renderLeaderboard() {
  const res = await api('/results');
  leaderboard = res.success ? res.results : [];

  // Render in admin tab (lbBody2)
  const tbody = document.getElementById('lbBody2');
  const empty = document.getElementById('lbEmpty2');
  tbody.innerHTML = '';
  if (leaderboard.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const medals = ['🥇', '🥈', '🥉'], cls = ['gold', 'silver', 'bronze'];
  leaderboard.forEach((e, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="rank ${cls[i] || ''}">${medals[i] || i + 1}</span></td><td class="lb-name">${e.name}</td><td class="lb-time">${e.roll}</td><td class="lb-time">${e.dept}</td><td class="lb-score">${e.score}%</td><td>${e.correct}/${e.total}</td><td class="lb-time">${e.time}s</td>`;
    tbody.appendChild(tr);
  });

  // Also render in public leaderboard screen (lbBody)
  const tbody2 = document.getElementById('lbBody');
  const empty2 = document.getElementById('lbEmpty');
  if (tbody2) {
    tbody2.innerHTML = '';
    if (leaderboard.length === 0) { if (empty2) empty2.style.display = 'block'; return; }
    if (empty2) empty2.style.display = 'none';
    leaderboard.forEach((e, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><span class="rank ${cls[i] || ''}">${medals[i] || i + 1}</span></td><td class="lb-name">${e.name}</td><td class="lb-time">${e.roll}</td><td class="lb-time">${e.dept}</td><td class="lb-score">${e.score}%</td><td>${e.correct}/${e.total}</td><td class="lb-time">${e.time}s</td>`;
      tbody2.appendChild(tr);
    });
  }
}

// ═══════════════════════════════════════════════
// ADMIN — QUESTIONS (CRUD via API)
// ═══════════════════════════════════════════════
async function loadQuestions() {
  const res = await api('/questions');
  questions = res.success ? res.questions : [];
}

function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
}

function renderAdminQuestions() {
  const list = document.getElementById('questionList');
  list.innerHTML = '';
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

function toggleAddForm() {
  editingId = -1; clearForm();
  document.getElementById('formTitle').textContent = 'ADD QUESTION';
  document.getElementById('qForm').classList.toggle('active');
}

function editQuestion(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;
  editingId = id;
  document.getElementById('fQuestion').value = q.q;
  document.getElementById('fTopic').value = q.topic;
  document.getElementById('fDifficulty').value = q.diff;
  q.opts.forEach((o, j) => document.getElementById('fOpt' + j).value = o);
  document.getElementById('r' + q.ans).checked = true;
  document.getElementById('formTitle').textContent = 'EDIT QUESTION';
  document.getElementById('qForm').classList.add('active');
  document.getElementById('qForm').scrollIntoView({ behavior: 'smooth' });
}

async function saveQuestion() {
  const q = document.getElementById('fQuestion').value.trim();
  const opts = [0, 1, 2, 3].map(i => document.getElementById('fOpt' + i).value.trim());
  const ans = parseInt([...document.querySelectorAll('input[name=correct]')].find(r => r.checked)?.value ?? -1);
  if (!q || opts.some(o => !o) || ans < 0) { alert('Fill all fields and select correct answer.'); return; }

  const payload = {
    q, opts, ans,
    topic: document.getElementById('fTopic').value,
    diff: document.getElementById('fDifficulty').value
  };

  let res;
  if (editingId >= 0) {
    res = await api(`/questions/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    res = await api('/questions', { method: 'POST', body: JSON.stringify(payload) });
  }

  if (!res.success) { alert(res.errors ? res.errors.join('\n') : res.error || 'Save failed.'); return; }

  cancelForm();
  await loadQuestions();
  renderAdminQuestions();
}

function cancelForm() { clearForm(); document.getElementById('qForm').classList.remove('active'); editingId = -1; }

function clearForm() {
  document.getElementById('fQuestion').value = '';
  [0, 1, 2, 3].forEach(i => { document.getElementById('fOpt' + i).value = ''; document.getElementById('r' + i).checked = false; });
}

async function deleteQuestion(id) {
  if (!confirm('Delete?')) return;
  await api(`/questions/${id}`, { method: 'DELETE' });
  await loadQuestions();
  renderAdminQuestions();
}

// ═══════════════════════════════════════════════
// ADMIN — REGISTRATIONS (from API)
// ═══════════════════════════════════════════════
async function renderAdminRegs() {
  const res = await api('/registrations');
  registrations = res.success ? res.registrations : [];

  const tbody = document.getElementById('adminRegBody');
  const empty = document.getElementById('adminRegEmpty');
  document.getElementById('regCount').textContent = registrations.length;
  tbody.innerHTML = '';
  if (registrations.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  registrations.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}</td><td style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);">${r.regId}</td><td>${r.name}</td><td>${r.roll}</td><td>${r.dept}</td><td>${r.year}</td><td>${r.phone || '—'}</td><td style="font-size:0.85rem;">${r.college}</td><td><span class="badge ${r.quizDone ? 'badge-green' : 'badge-blue'}">${r.quizDone ? 'DONE' : 'PENDING'}</span></td>`;
    tbody.appendChild(tr);
  });
}

async function clearRegs() {
  if (!confirm('Clear all registrations?')) return;
  await api('/registrations', { method: 'DELETE' });
  await renderAdminRegs();
}

// ═══════════════════════════════════════════════
// ADMIN — SETTINGS (from API)
// ═══════════════════════════════════════════════
async function loadSettings() {
  const res = await api('/settings');
  if (res.success) {
    settings = res.settings;
    document.getElementById('sTimer').value = settings.timer;
    document.getElementById('sQPerQuiz').value = settings.questionsPerQuiz;
    document.getElementById('sShuffle').value = settings.shuffle ? '1' : '0';
    document.getElementById('sShuffleOpts').value = settings.shuffleOpts ? '1' : '0';
  }
}

async function saveSettings() {
  const payload = {
    timer: parseInt(document.getElementById('sTimer').value) || 30,
    questionsPerQuiz: parseInt(document.getElementById('sQPerQuiz').value) || 30,
    shuffle: document.getElementById('sShuffle').value === '1',
    shuffleOpts: document.getElementById('sShuffleOpts').value === '1'
  };
  const res = await api('/settings', { method: 'PUT', body: JSON.stringify(payload) });
  if (res.success) {
    settings = res.settings;
    const s = document.getElementById('settingsSaved');
    s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 2000);
  }
}

// ═══════════════════════════════════════════════
// ADMIN — RESULTS & LEADERBOARD
// ═══════════════════════════════════════════════
async function renderAdminResults() {
  const res = await api('/results');
  leaderboard = res.success ? res.results : [];

  const tbody = document.getElementById('adminResultsBody');
  const empty = document.getElementById('adminResultsEmpty');
  tbody.innerHTML = '';
  if (leaderboard.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  leaderboard.forEach((e, i) => {
    const tr = document.createElement('tr');
    const cheatBadge = e.flaggedCheater ? ' <span class="badge" style="background:rgba(255,61,90,0.15);color:var(--red);border:1px solid var(--red);margin-left:4px;">CHEAT</span>' : '';
    const ssInfo = e.screenshotAttempts > 0 ? ` (📸${e.screenshotAttempts})` : '';
    tr.innerHTML = `<td>${i + 1}</td><td>${e.name}${cheatBadge}</td><td>${e.roll}</td><td>${e.dept}</td><td>${e.score}%</td><td>${e.correct}/${e.total}</td><td>${e.time}s${ssInfo}</td>`;
    tbody.appendChild(tr);
  });
}

async function clearLeaderboard() {
  if (!confirm('Clear all results?')) return;
  await api('/results', { method: 'DELETE' });
  leaderboard = [];
  alert('Cleared!');
}

async function clearAttempts() {
  if (!confirm('Clear all quiz attempts? This allows all members to retake the quiz.')) return;
  await api('/results/attempts', { method: 'DELETE' });
  alert('All attempts cleared! Members can retake the quiz.');
}

// ═══════════════════════════════════════════════
// CSV EXPORT (unchanged — client-side from current data)
// ═══════════════════════════════════════════════
function exportCSV() {
  if (leaderboard.length === 0) { alert('No data!'); return; }
  const h = ['Rank', 'Name', 'Roll No', 'Department', 'Score (%)', 'Correct', 'Total', 'Time (s)', 'Date'];
  const r = leaderboard.map((e, i) => [i + 1, e.name, e.roll, e.dept, e.score, e.correct, e.total, e.time, e.date]);
  dl([h, ...r], 'innovatex_results.csv');
}

function exportRegsCSV() {
  if (registrations.length === 0) { alert('No registrations!'); return; }
  const h = ['#', 'Reg ID', 'Name', 'Roll No', 'Year', 'Department', 'Phone', 'Email', 'College', 'Status', 'Date'];
  const r = registrations.map((e, i) => [i + 1, e.regId, e.name, e.roll, e.year, e.dept, e.phone || '', e.email || '', e.college, e.quizDone ? 'Done' : 'Pending', e.date]);
  dl([h, ...r], 'innovatex_registrations.csv');
}

function dl(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename; a.click();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.getElementById('qForm').classList.remove('active');
