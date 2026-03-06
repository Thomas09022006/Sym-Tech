// ═══════════════════════════════════════════════════════════
// InnovateX Quiz Platform — Pure HTML/CSS/JS Edition
// Admin registers participants → Participants take quiz with Register ID
// All data stored in localStorage
// ═══════════════════════════════════════════════════════════

// ── localStorage Keys ──
const LS_KEYS = {
  questions: 'innovatex_questions',
  registrations: 'innovatex_registrations',
  results: 'innovatex_results',
  attempts: 'innovatex_attempts',
  settings: 'innovatex_settings'
};

// ── Admin Password ──
const ADMIN_PASSWORD = 'admin123';

// ── State Variables ──
let questions = [];
let registrations = [];
let results = [];
let attempts = [];
let settings = { timer: 30, shuffle: true, shuffleOpts: false, questionsPerQuiz: 40 };
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
let editingIdx = -1;
let tabSwitchCount = 0;
let quizActive = false;
let answerLog = [];
let screenshotCount = 0;
let nextQuestionId = 1;

// ═══════════════════════════════════════════════════════════
// DATA LAYER — localStorage
// ═══════════════════════════════════════════════════════════
function loadData() {
  try {
    questions = JSON.parse(localStorage.getItem(LS_KEYS.questions)) || [];
    registrations = JSON.parse(localStorage.getItem(LS_KEYS.registrations)) || [];
    results = JSON.parse(localStorage.getItem(LS_KEYS.results)) || [];
    attempts = JSON.parse(localStorage.getItem(LS_KEYS.attempts)) || [];
    const saved = JSON.parse(localStorage.getItem(LS_KEYS.settings));
    if (saved) settings = saved;
  } catch (e) { console.warn('localStorage load error:', e); }
  if (questions.length > 0) nextQuestionId = Math.max(...questions.map(q => q.id)) + 1;
}

function saveQuestions() { localStorage.setItem(LS_KEYS.questions, JSON.stringify(questions)); }
function saveRegistrations() { localStorage.setItem(LS_KEYS.registrations, JSON.stringify(registrations)); }
function saveResults() { localStorage.setItem(LS_KEYS.results, JSON.stringify(results)); }
function saveAttempts() { localStorage.setItem(LS_KEYS.attempts, JSON.stringify(attempts)); }
function saveSettingsData() { localStorage.setItem(LS_KEYS.settings, JSON.stringify(settings)); }

// ═══════════════════════════════════════════════════════════
// SEED QUESTIONS — 50 Questions across 10 domains
// ═══════════════════════════════════════════════════════════
function seedQuestions() {
  if (questions.length > 0) return;
  const seedData = [
    // Data Science & Analytics (2 easy, 3 hard)
    { q: "What does CSV stand for?", opts: ["Comma Separated Values", "Computer System Validation", "Central Server Version", "Code Syntax Variable"], ans: 0, topic: "Data Science & Analytics", diff: "easy" },
    { q: "Which Python library is primarily used for data manipulation?", opts: ["NumPy", "Pandas", "Flask", "Django"], ans: 1, topic: "Data Science & Analytics", diff: "easy" },
    { q: "What is the purpose of the 'groupby' function in Pandas?", opts: ["Merging datasets", "Splitting data into groups based on criteria", "Sorting data alphabetically", "Removing duplicates"], ans: 1, topic: "Data Science & Analytics", diff: "hard" },
    { q: "Which algorithm is best suited for dimensionality reduction?", opts: ["K-Means", "Random Forest", "PCA", "Naive Bayes"], ans: 2, topic: "Data Science & Analytics", diff: "hard" },
    { q: "In a confusion matrix, what does 'recall' measure?", opts: ["Accuracy of all predictions", "Proportion of true positives out of actual positives", "Proportion of true negatives", "F1 score"], ans: 1, topic: "Data Science & Analytics", diff: "hard" },

    // AI & Machine Learning (1 easy, 4 hard)
    { q: "What does AI stand for?", opts: ["Automated Integration", "Artificial Intelligence", "Advanced Interface", "Algorithmic Iteration"], ans: 1, topic: "AI & Machine Learning", diff: "easy" },
    { q: "Which is an example of supervised learning?", opts: ["K-Means clustering", "Linear Regression", "Apriori algorithm", "DBSCAN"], ans: 1, topic: "AI & Machine Learning", diff: "hard" },
    { q: "What is the vanishing gradient problem?", opts: ["Gradients become too large", "Gradients approach zero in deep networks", "Model overfits", "Data is insufficient"], ans: 1, topic: "AI & Machine Learning", diff: "hard" },
    { q: "What activation function outputs values between 0 and 1?", opts: ["ReLU", "Tanh", "Sigmoid", "Softmax"], ans: 2, topic: "AI & Machine Learning", diff: "hard" },
    { q: "What is 'dropout' in neural networks?", opts: ["Removing training data", "Randomly deactivating neurons during training", "Reducing learning rate", "Deleting hidden layers"], ans: 1, topic: "AI & Machine Learning", diff: "hard" },

    // Cybersecurity (2 easy, 3 hard)
    { q: "What does HTTPS stand for?", opts: ["HyperText Transfer Protocol Secure", "High Tech Protocol System", "Hybrid Transfer Protection Service", "HyperText Tracking Protocol Secure"], ans: 0, topic: "Cybersecurity", diff: "easy" },
    { q: "What is a firewall used for?", opts: ["Speeding up internet", "Monitoring and filtering network traffic", "Storing passwords", "Encrypting files"], ans: 1, topic: "Cybersecurity", diff: "easy" },
    { q: "What type of attack overwhelms a server with traffic?", opts: ["Phishing", "SQL Injection", "DDoS", "Man-in-the-Middle"], ans: 2, topic: "Cybersecurity", diff: "hard" },
    { q: "What is a zero-day vulnerability?", opts: ["Bug found on day one", "Unknown exploit with no patch", "Monthly security update", "Virus that activates at midnight"], ans: 1, topic: "Cybersecurity", diff: "hard" },
    { q: "Which encryption standard is most secure for symmetric encryption?", opts: ["DES", "RC4", "AES-256", "Blowfish"], ans: 2, topic: "Cybersecurity", diff: "hard" },

    // Software Development (2 easy, 3 hard)
    { q: "What does IDE stand for?", opts: ["Integrated Development Environment", "Internal Data Exchange", "Internet Development Engine", "Integrated Design Editor"], ans: 0, topic: "Software Development", diff: "easy" },
    { q: "Which of these is a version control system?", opts: ["Docker", "Git", "Node.js", "Apache"], ans: 1, topic: "Software Development", diff: "easy" },
    { q: "What is the SOLID principle 'S' for?", opts: ["Scalability", "Single Responsibility", "Security", "Simplicity"], ans: 1, topic: "Software Development", diff: "hard" },
    { q: "What design pattern ensures only one instance of a class?", opts: ["Factory", "Observer", "Singleton", "Strategy"], ans: 2, topic: "Software Development", diff: "hard" },
    { q: "In Agile, what is a 'sprint retrospective'?", opts: ["Planning the next sprint", "Reviewing what worked and what didn't", "Daily standup", "Final product demo"], ans: 1, topic: "Software Development", diff: "hard" },

    // Web Development (1 easy, 4 hard)
    { q: "What does HTML stand for?", opts: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Mode Link", "Home Tool Markup Language"], ans: 0, topic: "Web Development", diff: "easy" },
    { q: "Which CSS property is used for flexbox layouts?", opts: ["float", "display: flex", "position: relative", "grid-template"], ans: 1, topic: "Web Development", diff: "hard" },
    { q: "What is the virtual DOM in React?", opts: ["Backup of the actual DOM", "Lightweight in-memory representation of the real DOM", "Browser extension", "CSS framework"], ans: 1, topic: "Web Development", diff: "hard" },
    { q: "What does CORS stand for?", opts: ["Cross-Origin Resource Sharing", "Central Object Request System", "Client-Only Response Service", "Cross-Object Reference Standard"], ans: 0, topic: "Web Development", diff: "hard" },
    { q: "Which HTTP status code indicates 'Not Found'?", opts: ["200", "301", "404", "500"], ans: 2, topic: "Web Development", diff: "hard" },

    // Cloud Computing (1 easy, 4 hard)
    { q: "What does SaaS stand for?", opts: ["Software as a Service", "System as a Solution", "Server as a Standard", "Storage and Accessibility Service"], ans: 0, topic: "Cloud Computing", diff: "easy" },
    { q: "Which AWS service is used for serverless computing?", opts: ["EC2", "S3", "Lambda", "RDS"], ans: 2, topic: "Cloud Computing", diff: "hard" },
    { q: "What is container orchestration?", opts: ["Running containers manually", "Automated management of containerized apps", "Building Docker images", "Installing Linux on servers"], ans: 1, topic: "Cloud Computing", diff: "hard" },
    { q: "What does 'auto-scaling' mean?", opts: ["Manual server addition", "Automatically adjusting resources based on demand", "Scaling down only", "Using bigger machines"], ans: 1, topic: "Cloud Computing", diff: "hard" },
    { q: "Which cloud model offers the highest control?", opts: ["Public Cloud", "Private Cloud", "Hybrid Cloud", "Community Cloud"], ans: 1, topic: "Cloud Computing", diff: "hard" },

    // Internet of Things (2 easy, 3 hard)
    { q: "What does IoT stand for?", opts: ["Internet of Things", "Integration of Technology", "Internal Operating Tool", "Internet of Transfers"], ans: 0, topic: "Internet of Things", diff: "easy" },
    { q: "Which protocol is commonly used in IoT?", opts: ["FTP", "MQTT", "SMTP", "POP3"], ans: 1, topic: "Internet of Things", diff: "easy" },
    { q: "What is an 'edge device' in IoT?", opts: ["Central server", "Device at network boundary that processes data locally", "Cloud storage unit", "Mobile phone"], ans: 1, topic: "Internet of Things", diff: "hard" },
    { q: "What is a digital twin in IoT?", opts: ["Creating backups", "Virtual replica of a physical system for simulation", "Doubling network speed", "Duplicating sensor data"], ans: 1, topic: "Internet of Things", diff: "hard" },
    { q: "Which wireless tech is designed for long-range, low-power IoT?", opts: ["Wi-Fi 6", "Bluetooth 5.0", "LoRaWAN", "5G"], ans: 2, topic: "Internet of Things", diff: "hard" },

    // DevOps (1 easy, 4 hard)
    { q: "What does CI/CD stand for?", opts: ["Computer Integration / Computer Deployment", "Continuous Integration / Continuous Delivery", "Code Inspection / Code Development", "Central Infrastructure / Central Database"], ans: 1, topic: "DevOps", diff: "easy" },
    { q: "Which tool is used for container management?", opts: ["Jenkins", "Docker", "Selenium", "Postman"], ans: 1, topic: "DevOps", diff: "hard" },
    { q: "What is Infrastructure as Code (IaC)?", opts: ["Writing code on servers", "Managing infrastructure through config files", "Coding in cloud only", "Using IDE for server setup"], ans: 1, topic: "DevOps", diff: "hard" },
    { q: "What is the purpose of Kubernetes?", opts: ["Version control", "Automating deployment, scaling of containers", "Database management", "Frontend testing"], ans: 1, topic: "DevOps", diff: "hard" },
    { q: "What does 'blue-green deployment' achieve?", opts: ["Doubles server capacity", "Zero-downtime releases by switching environments", "Uses two databases", "Deploys to two regions"], ans: 1, topic: "DevOps", diff: "hard" },

    // Blockchain Technology (1 easy, 4 hard)
    { q: "What is a blockchain?", opts: ["Programming language", "Distributed, immutable ledger", "Database server", "Web framework"], ans: 1, topic: "Blockchain Technology", diff: "easy" },
    { q: "What consensus mechanism does Bitcoin use?", opts: ["Proof of Stake", "Proof of Work", "Delegated Proof of Stake", "Proof of Authority"], ans: 1, topic: "Blockchain Technology", diff: "hard" },
    { q: "What is a 'smart contract'?", opts: ["Legal document", "Self-executing code on the blockchain", "Digital signature", "Encrypted message"], ans: 1, topic: "Blockchain Technology", diff: "hard" },
    { q: "What is a 'nonce' in blockchain mining?", opts: ["Encrypt transactions", "Number miners vary to find valid hash", "Verify user identity", "Store transaction data"], ans: 1, topic: "Blockchain Technology", diff: "hard" },
    { q: "What does 'gas' refer to in Ethereum?", opts: ["Electricity usage", "Computational cost of executing transactions", "Network bandwidth", "Storage space"], ans: 1, topic: "Blockchain Technology", diff: "hard" },

    // Mobile App Development (2 easy, 3 hard)
    { q: "Which language is primarily used for Android development?", opts: ["Swift", "Kotlin", "Ruby", "PHP"], ans: 1, topic: "Mobile App Development", diff: "easy" },
    { q: "What does APK stand for?", opts: ["Android Package Kit", "Application Programming Kit", "Android Process Key", "App Package Kernel"], ans: 0, topic: "Mobile App Development", diff: "easy" },
    { q: "What is Flutter's primary programming language?", opts: ["JavaScript", "Kotlin", "Dart", "Swift"], ans: 2, topic: "Mobile App Development", diff: "hard" },
    { q: "What is 'hot reload' in mobile development?", opts: ["Restarting the phone", "Instantly reflecting code changes without restarting", "Clearing cache", "Updating the OS"], ans: 1, topic: "Mobile App Development", diff: "hard" },
    { q: "What architecture pattern is recommended for modern Android apps?", opts: ["MVC", "MVVM", "Waterfall", "Monolithic"], ans: 1, topic: "Mobile App Development", diff: "hard" }
  ];
  questions = seedData.map((q, i) => ({ id: i + 1, ...q }));
  nextQuestionId = questions.length + 1;
  saveQuestions();
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

// ═══════════════════════════════════════════════════════════
// SCREENSHOT DETECTION
// ═══════════════════════════════════════════════════════════
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
    renderAdminQuestions();
    loadSettingsUI();
  } else {
    document.getElementById('adminErr').style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN — REGISTER PARTICIPANT
// ═══════════════════════════════════════════════════════════
function generateRegId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'INX-';
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
  // Ensure uniqueness
  while (registrations.some(r => r.regId === id)) {
    id = 'INX-';
    for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function registerParticipant() {
  const name = document.getElementById('regName').value.trim();
  const college = document.getElementById('regCollege').value.trim();
  const year = document.getElementById('regYear').value;
  const dept = document.getElementById('regDept').value;

  if (!name || !college || !year || !dept) {
    alert('Please fill all required fields (Name, College, Year, Department).');
    return;
  }

  const regId = generateRegId();
  const reg = {
    regId, name, college, year, dept,
    quizDone: false,
    score: null,
    correct: null,
    total: null,
    time: null,
    flaggedCheater: false,
    violations: '',
    date: new Date().toLocaleString()
  };

  registrations.push(reg);
  saveRegistrations();

  // Show success with Register ID
  document.getElementById('regSuccessName').textContent = name.toUpperCase();
  document.getElementById('regIdDisplay').textContent = regId;
  document.getElementById('regSuccessCard').style.display = 'block';
}

function resetRegForm() {
  document.getElementById('regName').value = '';
  document.getElementById('regCollege').value = '';
  document.getElementById('regYear').value = '';
  document.getElementById('regDept').value = '';
  document.getElementById('regSuccessCard').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// TAKE QUIZ — Validate Name + Register ID
// ═══════════════════════════════════════════════════════════
function startQuiz() {
  const name = document.getElementById('participantName').value.trim();
  const regId = document.getElementById('participantRegId').value.trim().toUpperCase();

  if (!name || !regId) {
    alert('Please enter your Name and Register ID.');
    return;
  }

  // Find registration
  const reg = registrations.find(r => r.regId === regId);
  if (!reg) {
    alert('Invalid Register ID. Please check your ID and try again.');
    return;
  }

  // Verify name matches (case-insensitive)
  if (reg.name.toLowerCase() !== name.toLowerCase()) {
    alert('Name does not match the registered name for this ID.');
    return;
  }

  // Check if already attempted
  if (attempts.some(a => a.regId === regId)) {
    alert('This Register ID has already been used to attempt the quiz.');
    return;
  }

  if (questions.length === 0) {
    alert('No questions available. Please contact the admin.');
    return;
  }

  currentParticipant = { name: reg.name, regId: reg.regId, college: reg.college, dept: reg.dept, year: reg.year };

  // Build quiz questions (domain-based distribution)
  const easyByDomain = {};
  const hardByDomain = {};
  questions.forEach(q => {
    const pool = q.diff === 'easy' ? easyByDomain : hardByDomain;
    if (!pool[q.topic]) pool[q.topic] = [];
    pool[q.topic].push({ ...q });
  });

  const allDomains = [...new Set([...Object.keys(easyByDomain), ...Object.keys(hardByDomain)])].sort();
  const QUESTIONS_PER_DOMAIN = 4;
  const TARGET_EASY = 15;

  if (settings.shuffle) {
    allDomains.forEach(domain => {
      if (easyByDomain[domain]) shuffleArray(easyByDomain[domain]);
      if (hardByDomain[domain]) shuffleArray(hardByDomain[domain]);
    });
  }

  let easyCount = 0, hardCount = 0;
  const domainPicks = [];

  allDomains.forEach(domain => {
    const poolE = easyByDomain[domain] || [];
    const poolH = hardByDomain[domain] || [];
    let nE = Math.min(1, poolE.length);
    let nH = Math.min(QUESTIONS_PER_DOMAIN - nE, poolH.length);
    nE = Math.min(QUESTIONS_PER_DOMAIN - nH, poolE.length);
    domainPicks.push({ domain, easy: poolE.slice(0, nE), hard: poolH.slice(0, nH) });
    easyCount += Math.min(nE, poolE.length);
    hardCount += Math.min(nH, poolH.length);
  });

  while (easyCount < TARGET_EASY) {
    let swapped = false;
    for (const dp of domainPicks) {
      if (easyCount >= TARGET_EASY) break;
      const usedIds = new Set(dp.easy.map(q => q.id));
      const spare = (easyByDomain[dp.domain] || []).filter(q => !usedIds.has(q.id));
      if (spare.length > 0 && dp.hard.length > 1) {
        dp.easy.push(spare[0]);
        dp.hard.pop();
        easyCount++; hardCount--;
        swapped = true;
      }
    }
    if (!swapped) break;
  }

  let qList = [];
  domainPicks.forEach(dp => { qList.push(...dp.easy, ...dp.hard); });
  if (qList.length > settings.questionsPerQuiz) qList = qList.slice(0, settings.questionsPerQuiz);
  if (settings.shuffle) shuffleArray(qList);
  if (settings.shuffleOpts) {
    qList.forEach(q => {
      const correct = q.opts[q.ans];
      shuffleArray(q.opts);
      q.ans = q.opts.indexOf(correct);
    });
  }

  quizQuestions = qList;
  document.getElementById('quizParticipantName').textContent = currentParticipant.name.toUpperCase();
  currentQ = 0; correctCount = 0; wrongCount = 0; totalTimeTaken = 0; answerLog = [];
  enableAntiCheat();
  showScreen('quiz');
  renderQuestion();
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
  answerLog.push({ questionId: q.id, selected: selectedOption });
  if (selectedOption === q.ans && selectedOption !== -1) correctCount++;
  totalTimeTaken += (selectedOption === -1) ? settings.timer : (settings.timer - timeLeft);
  answered = true;
  clearInterval(timerInterval);
  currentQ++;
  selectedOption = -1;
  if (currentQ >= quizQuestions.length) finishQuiz();
  else renderQuestion();
}

function forceFinishQuiz() {
  if (!quizActive) return;
  while (currentQ < quizQuestions.length) {
    answerLog.push({ questionId: quizQuestions[currentQ].id, selected: -1 });
    totalTimeTaken += settings.timer;
    currentQ++;
  }
  finishQuiz();
}

function finishQuiz() {
  clearInterval(timerInterval);
  disableAntiCheat();

  const total = quizQuestions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const wasCheater = screenshotCount >= 3 || tabSwitchCount >= 3;
  const violations = [];
  if (tabSwitchCount > 0) violations.push(`Tab switches: ${tabSwitchCount}`);
  if (screenshotCount > 0) violations.push(`Screenshots: ${screenshotCount}`);

  // Save to results
  const result = {
    name: currentParticipant.name,
    regId: currentParticipant.regId,
    college: currentParticipant.college,
    dept: currentParticipant.dept,
    score, correct: correctCount, total, time: totalTimeTaken,
    screenshotAttempts: screenshotCount,
    tabSwitches: tabSwitchCount,
    flaggedCheater: wasCheater,
    violations: violations.join(', '),
    date: new Date().toLocaleString()
  };
  results.push(result);
  results.sort((a, b) => b.score - a.score || a.time - b.time);
  saveResults();

  // Mark attempt
  attempts.push({ regId: currentParticipant.regId, date: new Date().toLocaleString() });
  saveAttempts();

  // Update registration record with results
  const regIdx = registrations.findIndex(r => r.regId === currentParticipant.regId);
  if (regIdx >= 0) {
    registrations[regIdx].quizDone = true;
    registrations[regIdx].score = score;
    registrations[regIdx].correct = correctCount;
    registrations[regIdx].total = total;
    registrations[regIdx].time = totalTimeTaken;
    registrations[regIdx].flaggedCheater = wasCheater;
    registrations[regIdx].violations = violations.join(', ');
    saveRegistrations();
  }

  document.getElementById('tyName').textContent = currentParticipant.name;
  showScreen('thankyou');
}

// ═══════════════════════════════════════════════════════════
// ADMIN — TABS
// ═══════════════════════════════════════════════════════════
function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// ADMIN — PARTICIPANTS LIST
// ═══════════════════════════════════════════════════════════
function renderAdminRegs() {
  const tbody = document.getElementById('adminRegBody');
  const empty = document.getElementById('adminRegEmpty');
  document.getElementById('regCount').textContent = registrations.length;
  tbody.innerHTML = '';
  if (registrations.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  registrations.forEach((r, i) => {
    const tr = document.createElement('tr');
    let status = '<span class="badge badge-blue">PENDING</span>';
    if (r.quizDone) {
      if (r.flaggedCheater) {
        status = `<span class="badge" style="background:rgba(255,61,90,0.15);color:var(--red);border:1px solid var(--red);">🚫 CHEAT</span>`;
      } else {
        status = `<span class="badge badge-green">DONE — ${r.score}%</span>`;
      }
    }
    tr.innerHTML = `<td>${i + 1}</td><td style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);">${r.regId}</td><td>${r.name}</td><td style="font-size:0.85rem;">${r.college}</td><td>${r.year}</td><td>${r.dept}</td><td>${status}</td>`;
    tbody.appendChild(tr);
  });
}

function clearRegs() {
  if (!confirm('Clear ALL participants? This will also clear results and attempts.')) return;
  registrations = []; results = []; attempts = [];
  saveRegistrations(); saveResults(); saveAttempts();
  renderAdminRegs();
}

// ═══════════════════════════════════════════════════════════
// ADMIN — QUESTIONS CRUD
// ═══════════════════════════════════════════════════════════
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
  editingIdx = -1; clearForm();
  document.getElementById('formTitle').textContent = 'ADD QUESTION';
  document.getElementById('qForm').classList.toggle('active');
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

function saveQuestion() {
  const qText = document.getElementById('fQuestion').value.trim();
  const opts = [0, 1, 2, 3].map(i => document.getElementById('fOpt' + i).value.trim());
  const checked = [...document.querySelectorAll('input[name=correct]')].find(r => r.checked);
  const ans = checked ? parseInt(checked.value) : -1;
  if (!qText || opts.some(o => !o) || ans < 0) { alert('Fill all fields and select the correct answer.'); return; }
  const topic = document.getElementById('fTopic').value;
  const diff = document.getElementById('fDifficulty').value;
  if (editingIdx >= 0) {
    const idx = questions.findIndex(x => x.id === editingIdx);
    if (idx >= 0) questions[idx] = { id: editingIdx, q: qText, opts, ans, topic, diff };
  } else {
    questions.push({ id: nextQuestionId++, q: qText, opts, ans, topic, diff });
  }
  saveQuestions(); cancelForm(); renderAdminQuestions();
}

function cancelForm() { clearForm(); document.getElementById('qForm').classList.remove('active'); editingIdx = -1; }
function clearForm() {
  document.getElementById('fQuestion').value = '';
  [0, 1, 2, 3].forEach(i => { document.getElementById('fOpt' + i).value = ''; document.getElementById('r' + i).checked = false; });
}

function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return;
  questions = questions.filter(q => q.id !== id);
  saveQuestions(); renderAdminQuestions();
}

// ═══════════════════════════════════════════════════════════
// ADMIN — RESULTS
// ═══════════════════════════════════════════════════════════
function renderAdminResults() {
  const sorted = [...results].sort((a, b) => b.score - a.score || a.time - b.time);
  const tbody = document.getElementById('adminResultsBody');
  const empty = document.getElementById('adminResultsEmpty');
  tbody.innerHTML = '';
  if (sorted.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  sorted.forEach((e, i) => {
    const tr = document.createElement('tr');
    const isCheater = e.flaggedCheater;
    let statusBadge;
    if (isCheater) {
      const details = [];
      if (e.tabSwitches > 0) details.push(`👁${e.tabSwitches}`);
      if (e.screenshotAttempts > 0) details.push(`📸${e.screenshotAttempts}`);
      statusBadge = `<span class="badge" style="background:rgba(255,61,90,0.15);color:var(--red);border:1px solid var(--red);">🚫 CHEAT ${details.join(' ')}</span>`;
    } else {
      statusBadge = '<span class="badge badge-green">CLEAN</span>';
    }
    tr.innerHTML = `<td>${i + 1}</td><td>${e.name}</td><td style="font-family:'Orbitron',monospace;font-size:0.75rem;color:var(--accent);">${e.regId}</td><td style="font-size:0.85rem;">${e.college}</td><td>${e.dept}</td><td class="lb-score">${e.score}%</td><td>${e.correct}/${e.total}</td><td class="lb-time">${e.time}s</td><td>${statusBadge}</td>`;
    tbody.appendChild(tr);
  });
}

function clearLeaderboard() {
  if (!confirm('Clear all results?')) return;
  results = []; saveResults();
  // Reset quizDone in registrations
  registrations.forEach(r => { r.quizDone = false; r.score = null; r.correct = null; r.total = null; r.time = null; r.flaggedCheater = false; r.violations = ''; });
  saveRegistrations();
  renderAdminResults();
  alert('All results cleared!');
}

function clearAttempts() {
  if (!confirm('Reset all attempts? Participants can retake the quiz.')) return;
  attempts = []; saveAttempts();
  alert('All attempts reset!');
}

// ═══════════════════════════════════════════════════════════
// ADMIN — SETTINGS
// ═══════════════════════════════════════════════════════════
function loadSettingsUI() {
  document.getElementById('sTimer').value = settings.timer;
  document.getElementById('sQPerQuiz').value = settings.questionsPerQuiz;
  document.getElementById('sShuffle').value = settings.shuffle ? '1' : '0';
  document.getElementById('sShuffleOpts').value = settings.shuffleOpts ? '1' : '0';
}

function saveSettings() {
  settings.timer = Math.max(5, Math.min(120, parseInt(document.getElementById('sTimer').value) || 30));
  settings.questionsPerQuiz = Math.max(1, Math.min(200, parseInt(document.getElementById('sQPerQuiz').value) || 40));
  settings.shuffle = document.getElementById('sShuffle').value === '1';
  settings.shuffleOpts = document.getElementById('sShuffleOpts').value === '1';
  saveSettingsData();
  const s = document.getElementById('settingsSaved');
  s.style.display = 'block'; setTimeout(() => s.style.display = 'none', 2000);
}

// ═══════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════
function exportCSV() {
  const sorted = [...results].sort((a, b) => b.score - a.score || a.time - b.time);
  if (sorted.length === 0) { alert('No data!'); return; }
  const h = ['Rank', 'Name', 'Reg ID', 'College', 'Dept', 'Score (%)', 'Correct', 'Total', 'Time (s)', 'Cheater', 'Violations', 'Date'];
  const r = sorted.map((e, i) => [i + 1, e.name, e.regId, e.college, e.dept, e.score, e.correct, e.total, e.time, e.flaggedCheater ? 'YES' : 'NO', e.violations || '', e.date]);
  downloadCSV([h, ...r], 'innovatex_results.csv');
}

function exportRegsCSV() {
  if (registrations.length === 0) { alert('No data!'); return; }
  const h = ['#', 'Reg ID', 'Name', 'College', 'Year', 'Dept', 'Quiz Done', 'Score', 'Cheater', 'Date'];
  const r = registrations.map((e, i) => [i + 1, e.regId, e.name, e.college, e.year, e.dept, e.quizDone ? 'Yes' : 'No', e.score !== null ? e.score + '%' : '—', e.flaggedCheater ? 'YES' : 'NO', e.date]);
  downloadCSV([h, ...r], 'innovatex_participants.csv');
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename; a.click();
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
loadData();
seedQuestions();
document.getElementById('qForm').classList.remove('active');
console.log('✅ InnovateX Quiz Platform loaded');
console.log(`   📋 ${questions.length} questions | 👥 ${registrations.length} participants | 📊 ${results.length} results`);
