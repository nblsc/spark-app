// ─── DATA ────────────────────────────────────────────────────────────────────
const profiles = [
  {
    id: 1,
    name: "Léa",
    age: 25,
    desc: "Photographe le weekend, dev la semaine. Amateur de ramen et de films noirs.",
    tags: ["Photographie", "Tech", "Cinéma"],
    color: "#2a1a2e",
    emoji: "🎞️"
  },
  {
    id: 2,
    name: "Noah",
    age: 28,
    desc: "Cuisinier amateur obsédé par la fermentation. Je pars en randonnée tous les mois.",
    tags: ["Cuisine", "Nature", "Voyage"],
    color: "#1a2a1e",
    emoji: "🏔️"
  },
  {
    id: 3,
    name: "Camille",
    age: 23,
    desc: "Illustratrice freelance. Mon chat s'appelle Bézier. J'aime les vieux vinyles.",
    tags: ["Art", "Musique", "Design"],
    color: "#2a1e18",
    emoji: "🎨"
  },
  {
    id: 4,
    name: "Axel",
    age: 30,
    desc: "Architecte dans le civil, DJ le week-end. Paris / Berlin en alternance.",
    tags: ["Architecture", "Électro", "Nuit"],
    color: "#18202a",
    emoji: "🏙️"
  },
  {
    id: 5,
    name: "Inès",
    age: 26,
    desc: "Chercheuse en biologie marine. Je plonge, je lis, je cuisine des fruits de mer.",
    tags: ["Science", "Mer", "Lecture"],
    color: "#162228",
    emoji: "🐠"
  },
  {
    id: 6,
    name: "Tom",
    age: 27,
    desc: "Scénariste en herbe. En ce moment sur un road-trip pour m'inspirer.",
    tags: ["Écriture", "Cinéma", "Road-trip"],
    color: "#221820",
    emoji: "✍️"
  },
];

// ─── STATE ───────────────────────────────────────────────────────────────────
const STATE_KEY = 'spark_state';

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (!saved) return null;
    const s = JSON.parse(saved);
    const today = new Date().toDateString();
    if (s.date !== today) {
      s.notesLeft = 4;
      s.date = today;
      saveState(s);
    }
    return s;
  } catch (e) { return null; }
}

function saveState(s) {
  localStorage.setItem(STATE_KEY, JSON.stringify(s));
}

const today = new Date().toDateString();
let state = loadState() || {
  date: today,
  notesLeft: 4,
  deckIndex: 0,
  sentNotes: [],
};

let deck = [...profiles].slice(state.deckIndex);
let isDragging = false;
let startX = 0, currentX = 0;
let activeCard = null;
let topCardProfile = null;

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
  stack.innerHTML = '';

  if (deck.length === 0) {
    document.getElementById('emptyState').classList.add('show');
    document.getElementById('actions').style.opacity = '0.3';
    document.getElementById('actions').style.pointerEvents = 'none';
    return;
  }

  // Render up to 3 cards, back-to-front so top card is last in DOM
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
    // Snap back
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
    state.deckIndex = profiles.length - deck.length;
    saveState(state);
    renderDeck();
  }, 400);
}

// Public: called by button onclick
function swipeCard(direction) {
  if (deck.length === 0) return;
  activeCard = document.querySelector('#stack .card:last-child');
  if (!activeCard) return;
  flyOut(direction);
}

// ─── NOTE MODAL ──────────────────────────────────────────────────────────────
function openNoteModal() {
  if (state.notesLeft <= 0) {
    showToast("Plus de notes disponibles aujourd'hui", 'error');
    return;
  }
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
  saveState(state);

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
  if (state.sentNotes.length === 0) {
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

// ─── INIT ────────────────────────────────────────────────────────────────────
renderDeck();
