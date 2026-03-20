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
      body: JSON.stringify({ username: name, email, password, age, bio: desc, tags })
    });
    const data = await res.json();
    if (!res.ok) return showError('registerError', data.error || "Erreur lors de l'inscription.");

    const user = {
      ...data.user,
      name: data.user.username,
      desc: data.user.bio,
      tags: data.user.tags || tags,
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

async function startApp(user) {
  currentUser = user;
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  try {
    const res = await fetch('/api/profile/me');
    const data = await res.json();
    if (res.ok && data.user) {
      currentUser = {
        ...currentUser,
        ...data.user,
        name: data.user.username,
        desc: data.user.bio || '',
        tags: data.user.tags || [],
      };
    }
  } catch(e) {}

  const todayStr = new Date().toDateString();
  state = dbGetState(user.email) || {
    date: todayStr,
    notesLeft: 4,
    deckIndex: 0,
    sentNotes: [],
  };

  if (state.date !== todayStr) {
    state.notesLeft = 4;
    state.date = todayStr;
    state.deckIndex = 0;
    dbSaveState(user.email, state);
  }

  await buildDeck();
  renderDeck();
  updateNotesUI();
  fetchUnreadCount();
}

// ─── DECK ─────────────────────────────────────────────────────────────────────
let deck = [];
let state = {};

async function buildDeck() {
  try {
    const res = await fetch('/api/discover/');
    const data = await res.json();
    if (!res.ok) { deck = []; return; }

    deck = data.users.map(u => ({
      ...u,
      name: u.username,
      desc: u.bio || '',
      tags: u.tags || [],
      color: CARD_COLORS[u.id % CARD_COLORS.length],
      emoji: CARD_EMOJIS[u.id % CARD_EMOJIS.length],
    }));
  } catch(e) {
    console.error('Erreur chargement profils:', e);
    deck = [];
  }
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function buildCard(profile) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = profile.id;

  const cardBg = profile.profile_photo
    ? `<img src="${profile.profile_photo}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<div style="width:100%;height:100%;background:linear-gradient(160deg,${profile.color} 0%,#0c0c0f 100%);display:flex;align-items:center;justify-content:center;font-size:120px;filter:saturate(0.8);">${profile.emoji}</div>`;

  card.innerHTML = `
    ${cardBg}
    <div class="card-gradient"></div>
    <div class="indicator like">SPARK ✦</div>
    <div class="indicator nope">NOPE</div>
    <div class="card-info">
      <div>
        <span class="card-name">${profile.name}</span><span class="card-age">${profile.age} ans</span>
      </div>
      <div class="card-desc">${profile.desc}</div>
      <div class="card-tags">
        ${(profile.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
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

  if (deck.length === 0) {
    noUsersEl.classList.add('show');
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
  if (badge) badge.classList.toggle('pulse', state.notesLeft < 4);
  const noteBtn = document.getElementById('noteBtn');
  if (noteBtn) {
    noteBtn.style.opacity = state.notesLeft > 0 ? '1' : '0.35';
    noteBtn.style.pointerEvents = state.notesLeft > 0 ? 'all' : 'none';
  }
}

// ─── DRAG ────────────────────────────────────────────────────────────────────
let isDragging = false;
let startX = 0, currentX = 0;
let activeCard = null;
let topCardProfile = null;

function attachDragHandlers() {
  const card = document.querySelector('#stack .card:last-child');
  if (!card) return;
  card.addEventListener('mousedown', onDragStart);
  card.addEventListener('touchstart', onDragStart, { passive: true });
}

function onDragStart(e) {
  startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  isDragging = true;
  activeCard = document.querySelector('#stack .card:last-child');
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
    fetch('/api/matches/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liked_user_id: topCardProfile.id })
    }).then(res => res.json()).then(data => {
      if (data.matched) showToast(`🎉 Match avec ${topCardProfile.name} !`, 'success');
    }).catch(() => {});
  } else {
    showToast('Profil suivant →', 'info');
  }

  setTimeout(() => {
    deck.shift();
    dbSaveState(currentUser.email, state);
    renderDeck();
  }, 400);
}

function swipeCard(direction) {
  if (deck.length === 0) return;
  activeCard = document.querySelector('#stack .card:last-child');
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

async function sendNote() {
  const text = document.getElementById('noteText').value.trim();
  if (!text || state.notesLeft <= 0) return;

  try {
    await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: topCardProfile.id, content: text })
    });
  } catch(e) {
    console.error('Erreur envoi message:', e);
  }

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

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showSwipeScreen() {
  document.getElementById('notesPanel').classList.remove('open');
  document.getElementById('matchesPanel').classList.remove('open');
  document.getElementById('profilePanel').classList.remove('open');
  document.getElementById('navSwipeBtn').classList.add('active');
  document.getElementById('navMatchesBtn').classList.remove('active');
  document.getElementById('navProfileBtn').classList.remove('active');
}

function toggleMatchesPanel() {
  const panel = document.getElementById('matchesPanel');
  const isOpen = panel.classList.contains('open');
  document.getElementById('notesPanel').classList.remove('open');
  document.getElementById('profilePanel').classList.remove('open');
  panel.classList.toggle('open', !isOpen);
  if (!isOpen) renderMatchesList();
  document.getElementById('navMatchesBtn').classList.toggle('active', !isOpen);
  document.getElementById('navProfileBtn').classList.remove('active');
  document.getElementById('navSwipeBtn').classList.remove('active');
}

function toggleProfilePanel() {
  const panel = document.getElementById('profilePanel');
  const isOpen = panel.classList.contains('open');
  document.getElementById('notesPanel').classList.remove('open');
  document.getElementById('matchesPanel').classList.remove('open');
  panel.classList.toggle('open', !isOpen);
  if (!isOpen) renderProfilePanel();
  document.getElementById('navProfileBtn').classList.toggle('active', !isOpen);
  document.getElementById('navMatchesBtn').classList.remove('active');
  document.getElementById('navSwipeBtn').classList.remove('active');
}

async function renderMatchesList() {
  const list = document.getElementById('matchesList');
  list.innerHTML = '<div class="no-notes">Chargement...</div>';
  try {
    const res = await fetch('/api/matches/');
    const data = await res.json();
    if (!res.ok || data.matches.length === 0) {
      list.innerHTML = '<div class="no-notes">Aucun match pour l\'instant 💫</div>';
      return;
    }
    list.innerHTML = data.matches.map(u => `
      <div class="match-item">
        <div class="match-avatar">${u.profile_photo
          ? `<img src="${u.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
          : CARD_EMOJIS[u.id % CARD_EMOJIS.length]
        }</div>
        <div class="match-info">
          <div class="match-name">${u.username}</div>
          <div class="match-sub">${u.age} ans</div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    list.innerHTML = '<div class="no-notes">Erreur de chargement.</div>';
  }
}

function renderProfilePanel() {
  const content = document.getElementById('profileContent');
  if (!currentUser) return;

  const photo = currentUser.profile_photo
    ? `<img src="${currentUser.profile_photo}" alt="photo" />`
    : (currentUser.emoji || '👤');

  content.innerHTML = `
    <div class="profile-avatar-wrapper">
      <div class="profile-avatar" onclick="document.getElementById('photoInput').click()">
        ${photo}
      </div>
      <div class="profile-photo-label">✏️</div>
      <input type="file" id="photoInput" class="profile-photo-upload" accept="image/*" onchange="handlePhotoUpload(event)" />
    </div>
    <div class="profile-name">${currentUser.name || currentUser.username}</div>
    <div class="profile-age">${currentUser.age} ans</div>
    <div class="profile-section">
      <div class="profile-section-label">Âge</div>
      <input class="profile-edit-input" type="number" id="editAge" value="${currentUser.age || ''}" min="18" max="99" placeholder="Ton âge" />
    </div>
    <div class="profile-section">
      <div class="profile-section-label">À propos</div>
      <textarea class="profile-edit-input" id="editBio" rows="3" placeholder="Ta description...">${currentUser.desc || currentUser.bio || ''}</textarea>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Centres d'intérêt <span style="color:var(--muted);font-size:11px">(séparés par des virgules)</span></div>
      <input class="profile-edit-input" type="text" id="editTags" value="${(currentUser.tags || []).join(', ')}" placeholder="Musique, Voyage, Tech" />
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Email</div>
      <input class="profile-edit-input" type="email" id="editEmail" value="${currentUser.email || ''}" placeholder="toi@email.com" />
    </div>
    <button class="profile-save-btn" onclick="saveProfile()">Sauvegarder ✦</button>
    <div id="profileSaveError" style="font-size:13px;color:var(--accent);text-align:center;margin-top:10px;min-height:18px;"></div>
  `;
}

async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result;
    currentUser.profile_photo = base64;
    const avatar = document.querySelector('.profile-avatar');
    if (avatar) avatar.innerHTML = `<img src="${base64}" alt="photo" />`;
    try {
      await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_photo: base64 })
      });
      showToast('Photo mise à jour ✓', 'success');
    } catch(e) {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const age   = parseInt(document.getElementById('editAge').value);
  const bio   = document.getElementById('editBio').value.trim();
  const tags  = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const email = document.getElementById('editEmail').value.trim().toLowerCase();

  if (!age || age < 18 || age > 99) {
    document.getElementById('profileSaveError').textContent = "L'âge doit être entre 18 et 99 ans.";
    return;
  }
  if (!email) {
    document.getElementById('profileSaveError').textContent = "L'email est requis.";
    return;
  }

  try {
    const res = await fetch('/api/profile/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age, bio, email, tags })
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('profileSaveError').textContent = data.error || 'Erreur lors de la sauvegarde.';
      return;
    }

    currentUser.age   = age;
    currentUser.desc  = bio;
    currentUser.bio   = bio;
    currentUser.tags  = tags;
    currentUser.email = email;

    const users = dbGetUsers();
    const idx = users.findIndex(u => u.email === currentUser.email || u.id === currentUser.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...currentUser };
      dbSaveUsers(users);
    }

    showToast('Profil sauvegardé ✓', 'success');
    document.getElementById('profileSaveError').textContent = '';
    await buildDeck();
    renderProfilePanel();
  } catch(e) {
    document.getElementById('profileSaveError').textContent = 'Impossible de contacter le serveur.';
  }
}

// ─── UNREAD COUNT ─────────────────────────────────────────────────────────────
async function fetchUnreadCount() {
  try {
    const res = await fetch('/api/messages/unread');
    const data = await res.json();
    const count = data.count || 0;
    const matchesBtn = document.getElementById('navMatchesBtn');
    let dot = matchesBtn.querySelector('.notif-dot');
    if (count > 0) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'notif-dot';
        matchesBtn.appendChild(dot);
      }
    } else {
      if (dot) dot.remove();
    }
  } catch(e) {}
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