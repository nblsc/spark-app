// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────
const DB_USERS_KEY   = 'spark_users';
const DB_SESSION_KEY = 'spark_session';
const DB_STATE_KEY   = 'spark_state_';

const CARD_COLORS = [
  "#2a1a2e","#1a2a1e","#2a1e18","#18202a","#162228","#221820",
  "#2a2218","#1e1a2a","#182a22","#28181e","#1a2228","#201e18"
];
const CARD_EMOJIS = ["🎞️","🏔️","🎨","🏙️","🐠","✍️","🎸","🌿","🎭","🚀","🌊","🦋"];

function dbGetUsers() {
  try { return JSON.parse(localStorage.getItem(DB_USERS_KEY)) || []; }
  catch(e) { return []; }
}
function dbSaveUsers(users) {
  localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
}
function dbGetSession() {
  return localStorage.getItem(DB_SESSION_KEY) || null;
}
function dbSetSession(email) {
  if (email) localStorage.setItem(DB_SESSION_KEY, email);
  else localStorage.removeItem(DB_SESSION_KEY);
}
function dbGetState(email) {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_STATE_KEY + email));
    if (!saved) return null;
    const today = new Date().toDateString();
    if (saved.date !== today) {
      saved.notesLeft = 4;
      saved.date = today;
      saved.deckIndex = 0;
      dbSaveState(email, saved);
    }
    return saved;
  } catch(e) { return null; }
}
function dbSaveState(email, s) {
  localStorage.setItem(DB_STATE_KEY + email, JSON.stringify(s));
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
let currentUser = null;

function switchTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginError').textContent = '';
  document.getElementById('registerError').textContent = '';
}

function showError(id, msg) {
  document.getElementById(id).textContent = msg;
}

async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) return showError('loginError', 'Remplis tous les champs.');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError('loginError', data.error || 'Erreur de connexion.');

    dbSetSession(email);
    startApp(data.user);
  } catch(e) {
    showError('loginError', 'Impossible de contacter le serveur.');
  }
}

async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const age      = parseInt(document.getElementById('regAge').value);
  const desc     = document.getElementById('regDesc').value.trim();
  const tagsRaw  = document.getElementById('regTags').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;

  if (!name || !age || !desc || !email || !password)
    return showError('registerError', 'Remplis tous les champs.');
  if (age < 18 || age > 99)
    return showError('registerError', "L'âge doit être entre 18 et 99 ans.");
  if (password.length < 6)
    return showError('registerError', 'Le mot de passe doit faire au moins 6 caractères.');

  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5)
    : [];

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, email, password, age, bio: desc })
    });
    const data = await res.json();
    if (!res.ok) return showError('registerError', data.error || "Erreur lors de l'inscription.");

    const user = {
      ...data.user,
      name: data.user.username,
      desc: data.user.bio,
      tags,
      color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
      emoji: CARD_EMOJIS[Math.floor(Math.random() * CARD_EMOJIS.length)],
    };

    dbSetSession(email);
    startApp(user);
    showToast(`Bienvenue ${name} ! 🎉`, 'success');
  } catch(e) {
    showError('registerError', 'Impossible de contacter le serveur.');
  }
}

function doLogout() {
  dbSetSession(null);
  currentUser = null;
  deck = [];
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  switchTab('login');
}

function startApp(user) {
  currentUser = user;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  const today = new Date().toDateString();
  state = dbGetState(user.email) || {
    date: today,
    notesLeft: 4,
    deckIndex: 0,
    sentNotes: [],
  };

  buildDeck();
  renderDeck();
}

// ─── DECK ─────────────────────────────────────────────────────────────────────
let deck = [];
let state = {};

function buildDeck() {
  const users = dbGetUsers();
  const others = users.filter(u => u.email !== currentUser.email);
  deck = others.slice(state.deckIndex);
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function buildCard(profile) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = profile.id;

  card.innerHTML = `
    <div style="width:100%;height:100%;background:linear-gradient(160deg,${profile.color} 0%,#0c0c0f 100%);display:flex;align-items:center;justify-content:center;font-size:120px;filter:saturate(0.8);">
      ${profile.emoji}
    </div>
    <div class="card-gradient"></div>
    <div class="indicator like">SPARK ✦</div>
    <div class="indicator nope">NOPE</div>
    <div class="card-info">
      <div>
        <span class="card-name">${profile.name}</span><span class="card-age">${profile.age} ans</span>
      </div>
      <div class="card-desc">${profile.desc}</div>
      <div class="card-tags">
        ${profile.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
  `;
  return card;
}

function renderDeck() {
  const stack = document.getElementById('stack');
  const emptyEl = document.getElementById('emptyState');
  const noUsersEl = document.getElementById('noUsersState');
  const actionsEl = document.getElementById('actions');

  stack.innerHTML = '';
  emptyEl.classList.remove('show');
  noUsersEl.classList.remove('show');

  const users = dbGetUsers().filter(u => u.email !== currentUser.email);

  if (users.length === 0) {
    noUsersEl.classList.add('show');
    actionsEl.style.opacity = '0.3';
    actionsEl.style.pointerEvents = 'none';
    return;
  }

  if (deck.length === 0) {
    emptyEl.classList.add('show');
    actionsEl.style.opacity = '0.3';
    actionsEl.style.pointerEvents = 'none';
    return;
  }

  actionsEl.style.opacity = '';
  actionsEl.style.pointerEvents = '';

  const visible = deck.slice(0, 3).reverse();
  visible.forEach(profile => stack.appendChild(buildCard(profile)));

  topCardProfile = deck[0];
  attachDragHandlers();
  updateNotesUI();
}

function updateNotesUI() {
  document.getElementById('notesLeft').textContent = state.notesLeft;
  const badge = document.getElementById('notesBadge');
  badge.classList.toggle('pulse', state.notesLeft < 4);
  const noteBtn = document.getElementById('noteBtn');
  noteBtn.style.opacity = state.notesLeft > 0 ? '1' : '0.35';
  noteBtn.style.pointerEvents = state.notesLeft > 0 ? 'all' : 'none';
}

// ─── DRAG ────────────────────────────────────────────────────────────────────
let isDragging = false;
let startX = 0, currentX = 0;
let activeCard = null;
let topCardProfile = null;

function attachDragHandlers() {
  const card = document.querySelector('#stack .card:first-child');
  if (!card) return;
  card.addEventListener('mousedown', onDragStart);
  card.addEventListener('touchstart', onDragStart, { passive: true });
}

function onDragStart(e) {
  startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  isDragging = true;
  activeCard = document.querySelector('#stack .card:first-child');
  activeCard.style.transition = 'none';

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);
}

function onDragMove(e) {
  if (!isDragging || !activeCard) return;
  if (e.cancelable) e.preventDefault();

  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  currentX = clientX - startX;

  const rotate = currentX * 0.08;
  const lift = Math.abs(currentX) * 0.05;
  activeCard.style.transform = `translateX(${currentX}px) rotate(${rotate}deg) translateY(${-lift}px)`;

  const THRESHOLD = 60;
  const likeEl = activeCard.querySelector('.indicator.like');
  const nopeEl = activeCard.querySelector('.indicator.nope');

  if (currentX > THRESHOLD) {
    likeEl.style.opacity = Math.min((currentX - THRESHOLD) / 80, 1);
    nopeEl.style.opacity = 0;
  } else if (currentX < -THRESHOLD) {
    nopeEl.style.opacity = Math.min((-currentX - THRESHOLD) / 80, 1);
    likeEl.style.opacity = 0;
  } else {
    likeEl.style.opacity = 0;
    nopeEl.style.opacity = 0;
  }
}

function onDragEnd() {
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  document.removeEventListener('touchmove', onDragMove);
  document.removeEventListener('touchend', onDragEnd);

  if (!activeCard || !isDragging) return;
  isDragging = false;

  if (currentX > 100) {
    flyOut('right');
  } else if (currentX < -100) {
    flyOut('left');
  } else {
    activeCard.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    activeCard.style.transform = '';
    activeCard.querySelector('.indicator.like').style.opacity = 0;
    activeCard.querySelector('.indicator.nope').style.opacity = 0;
    activeCard = null;
  }
  currentX = 0;
}

function flyOut(direction) {
  if (!activeCard) return;
  const x = direction === 'right' ? 600 : -600;
  const rotate = direction === 'right' ? 30 : -30;
  activeCard.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  activeCard.style.transform = `translateX(${x}px) rotate(${rotate}deg)`;
  activeCard = null;

  if (direction === 'right') {
    showToast(`Tu as liké ${topCardProfile.name} ❤️`, 'success');
  } else {
    showToast('Profil suivant →', 'info');
  }

  setTimeout(() => {
    deck.shift();
    state.deckIndex++;
    dbSaveState(currentUser.email, state);
    renderDeck();
  }, 400);
}

function swipeCard(direction) {
  if (deck.length === 0) return;
  activeCard = document.querySelector('#stack .card:first-child');
  if (!activeCard) return;
  flyOut(direction);
}

// ─── NOTE MODAL ──────────────────────────────────────────────────────────────
function openNoteModal() {
  if (state.notesLeft <= 0) { showToast("Plus de notes disponibles aujourd'hui", 'error'); return; }
  if (deck.length === 0) return;

  document.getElementById('modalName').textContent = `Note pour ${topCardProfile.name}`;
  document.getElementById('notesRemaining').innerHTML =
    `Il te reste <strong>${state.notesLeft}</strong> note${state.notesLeft > 1 ? 's' : ''} aujourd'hui`;
  document.getElementById('noteText').value = '';
  document.getElementById('charCount').textContent = '0';
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function sendNote() {
  const text = document.getElementById('noteText').value.trim();
  if (!text || state.notesLeft <= 0) return;

  const note = {
    to: topCardProfile.name,
    toId: topCardProfile.id,
    text,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  };

  state.notesLeft--;
  state.sentNotes.unshift(note);
  dbSaveState(currentUser.email, state);

  closeModal();
  showToast(`Note envoyée à ${note.to} 💌`, 'success');
  setTimeout(() => swipeCard('right'), 300);
  updateNotesUI();
}

// ─── NOTES PANEL ─────────────────────────────────────────────────────────────
function toggleNotesPanel() {
  const panel = document.getElementById('notesPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) renderNotesList();
}

function renderNotesList() {
  const list = document.getElementById('notesList');
  if (!state.sentNotes || state.sentNotes.length === 0) {
    list.innerHTML = '<div class="no-notes">Aucune note envoyée aujourd\'hui.</div>';
    return;
  }
  list.innerHTML = state.sentNotes.map(n => `
    <div class="note-item">
      <div class="note-item-name">À ${n.to} ❤️</div>
      <div class="note-item-text">${n.text}</div>
      <div class="note-item-time">${n.time}</div>
    </div>
  `).join('');
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

// ─── EVENTS ──────────────────────────────────────────────────────────────────
document.getElementById('noteText').addEventListener('input', function () {
  const len = this.value.length;
  document.getElementById('charCount').textContent = len;
  document.getElementById('sendBtn').disabled = len < 2;
});

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  if (!document.getElementById('authScreen').classList.contains('hidden')) {
    if (!document.getElementById('loginForm').classList.contains('hidden')) doLogin();
    else doRegister();
  }
});

// ─── INIT ────────────────────────────────────────────────────────────────────
const savedSession = dbGetSession();
if (savedSession) {
  const users = dbGetUsers();
  const user = users.find(u => u.email === savedSession);
  if (user) startApp(user);
}