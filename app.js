import { testFirebaseConnection } from "./firebase.js";
window.testFirebaseConnection = testFirebaseConnection;

const STORAGE_KEY = 'world_cup_2026_tae_guess_tournament';
const ADMIN_CODE = '1234';

let activeParticipant = null;
let selectedAdminParticipant = null;
let currentView = 'home';

const defaultData = {
  matches: [],
  participants: {},
  guesses: {},
  officialTopScorer: ''
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return structuredClone(defaultData);
  }

  try {
    return {
      ...structuredClone(defaultData),
      ...JSON.parse(raw)
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function showView(view) {
  currentView = view;

  const views = [
    'homeView',
    'myPredictionsView',
    'leaderboardView',
    'groupsView',
    'overviewView',
    'adminLoginView',
    'adminView'
  ];

  views.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.add('hidden');
    }
  });

  const targetView = document.getElementById(view + 'View');

  if (targetView) {
    targetView.classList.remove('hidden');
  }

  updateActiveTab(view);
  renderAll();
}

function updateActiveTab(view) {
  const tabs = document.querySelectorAll('.tab[data-view]');

  tabs.forEach(tab => {
    tab.classList.remove('active');

    const tabView = tab.getAttribute('data-view');

    if (tabView === view) {
      tab.classList.add('active');
    }

    if ((view === 'adminLogin' || view === 'admin') && tabView === 'admin') {
      tab.classList.add('active');
    }
  });
}

function showLoginPanel() {
  const loginPanel = document.getElementById('loginPanel');
  const newUserPanel = document.getElementById('newUserPanel');

  if (loginPanel) {
    loginPanel.classList.remove('hidden');
  }

  if (newUserPanel) {
    newUserPanel.classList.add('hidden');
  }
}

function showNewUserPanel() {
  const loginPanel = document.getElementById('loginPanel');
  const newUserPanel = document.getElementById('newUserPanel');

  if (loginPanel) {
    loginPanel.classList.add('hidden');
  }

  if (newUserPanel) {
    newUserPanel.classList.remove('hidden');
  }
}

function openAdminLogin() {
  showView('adminLogin');
}

function adminLogin() {
  const codeInput = document.getElementById('adminCode');
  const code = codeInput ? codeInput.value : '';

  if (code === ADMIN_CODE) {
    showView('admin');
  } else {
    alert('Incorrect admin password');
  }
}

function createNewParticipant() {
  const initialsInput = document.getElementById('newInitials');
  const fullNameInput = document.getElementById('newFullName');
  const passwordInput = document.getElementById('newPassword');
  const topScorerInput = document.getElementById('newTopScorerGuess');

  const initials = initialsInput.value.trim().toUpperCase();
  const fullName = fullNameInput.value.trim();
  const password = passwordInput.value.trim();
  const topScorerGuess = topScorerInput.value.trim();

  if (!initials || !fullName || !password) {
    alert('Please enter initials, full name and password.');
    return;
  }

  const data = loadData();

  if (data.participants[initials]) {
    alert('A user with these initials already exists. Please log in or contact Admin.');
    return;
  }

  data.participants[initials] = {
    initials,
    fullName,
    password,
    topScorerGuess,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.guesses[initials] ||= {};
  activeParticipant = initials;

  saveData(data);

  initialsInput.value = '';
  fullNameInput.value = '';
  passwordInput.value = '';
  topScorerInput.value = '';

  showView('myPredictions');
}

function loginExistingParticipant() {
  const initialsInput = document.getElementById('loginInitials');
  const passwordInput = document.getElementById('loginPassword');

  const initials = initialsInput.value.trim().toUpperCase();
  const password = passwordInput.value.trim();

  if (!initials || !password) {
    alert('Please enter initials and password.');
    return;
  }

  const data = loadData();
  const participant = data.participants[initials];

  if (!participant) {
    alert('User not found. Please create a new user or contact Admin.');
    return;
  }

  if (participant.password !== password) {
    alert('Incorrect password. Please try again or contact Admin.');
    return;
  }

  activeParticipant = initials;

  initialsInput.value = '';
  passwordInput.value = '';

  showView('myPredictions');
}

function updateParticipantStatus() {
  const data = loadData();
  const participantPanel = document.getElementById('participantPanel');
  const notLoggedInBox = document.getElementById('notLoggedInBox');
  const activeParticipantName = document.getElementById('activeParticipantName');

  if (!participantPanel || !notLoggedInBox || !activeParticipantName) {
    return;
  }

  if (!activeParticipant || !data.participants[activeParticipant]) {
    participantPanel.classList.add('hidden');
    notLoggedInBox.classList.remove('hidden');
    return;
  }

  const participant = data.participants[activeParticipant];

  participantPanel.classList.remove('hidden');
  notLoggedInBox.classList.add('hidden');
  activeParticipantName.textContent = `${participant.initials} - ${participant.fullName}`;
}

function savePredictionsConfirmation() {
  const saveMessage = document.getElementById('saveMessage');

  if (!activeParticipant) {
    alert('Please log in before saving predictions.');
    showView('home');
    return;
  }

  if (saveMessage) {
    saveMessage.classList.remove('hidden');
  }
}

function outcome(home, away) {
  const h = Number(home);
  const a = Number(away);

  if (Number.isNaN(h) || Number.isNaN(a)) {
    return '';
  }

  if (h > a) return '1';
  if (h === a) return 'X';
  return '2';
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function normalizeScore(value) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue) || numberValue < 0) {
    return '0';
  }

  return String(Math.floor(numberValue));
}

function getDefaultGuess() {
  return {
    pick: 'X',
    homeScore: '0',
    awayScore: '0'
  };
}

function getSortedMatches(matches) {
  return [...matches].sort((a, b) => {
    const dateA = new Date((a.date || '').replace(' ', 'T'));
    const dateB = new Date((b.date || '').replace(' ', 'T'));

    const timeA = Number.isNaN(dateA.getTime()) ? Number.MAX_SAFE_INTEGER : dateA.getTime();
    const timeB = Number.isNaN(dateB.getTime()) ? Number.MAX_SAFE_INTEGER : dateB.getTime();

    return timeA - timeB;
  });
}

function isGroupMatch(match) {
  return /^group\s+/i.test(String(match.round || '').trim());
}

function isMatchLocked(match) {
  return match.locked === true;
}

function getLockLabel(match) {
  if (isMatchLocked(match)) {
    return '<span class="small red">🔒 Locked by Admin</span>';
  }

  return '<span class="small green">🟢 Open for predictions</span>';
}

function getLockButtonText(match) {
  return isMatchLocked(match) ? 'Open match' : 'Lock match';
}

function getLockButtonClass(match) {
  return isMatchLocked(match) ? 'success' : 'warning';
}

function isMatchFinished(match) {
  if (
    match.homeScore !== '' &&
    match.awayScore !== '' &&
    match.homeScore !== undefined &&
    match.awayScore !== undefined
  ) {
    return '<span class="small green">🏁 Match completed</span>';
  }

  return '<span class="small">⏳ Waiting for result</span>';
}

function getPredictionStatus(result) {
  if (result.status === 'exact') {
    return '<span class="small green">✅ Exact score (+3)</span>';
  }

  if (result.status === 'outcome') {
    return '<span class="small blue">🔵 Correct outcome (+1)</span>';
  }

  if (result.status === 'wrong') {
    return '<span class="small red">❌ Wrong prediction</span>';
  }

  return '<span class="small">⏳ Awaiting result</span>';
}

function getMatchPoints(match, guess) {
  if (
    !guess ||
    guess.homeScore === '' ||
    guess.awayScore === '' ||
    match.homeScore === '' ||
    match.awayScore === '' ||
    match.homeScore === undefined ||
    match.awayScore === undefined
  ) {
    return { points: 0, exact: false, outcomeCorrect: false, status: '' };
  }

  const predictedHome = Number(guess.homeScore);
  const predictedAway = Number(guess.awayScore);
  const actualHome = Number(match.homeScore);
  const actualAway = Number(match.awayScore);

  if ([predictedHome, predictedAway, actualHome, actualAway].some(Number.isNaN)) {
    return { points: 0, exact: false, outcomeCorrect: false, status: '' };
  }

  const exact = predictedHome === actualHome && predictedAway === actualAway;
  const outcomeCorrect = outcome(predictedHome, predictedAway) === outcome(actualHome, actualAway);

  if (exact) {
    return { points: 3, exact: true, outcomeCorrect: true, status: 'exact' };
  }

  if (outcomeCorrect) {
    return { points: 1, exact: false, outcomeCorrect: true, status: 'outcome' };
  }

  return { points: 0, exact: false, outcomeCorrect: false, status: 'wrong' };
}

function getParticipantStats(initials) {
  const data = loadData();
  const participant = data.participants[initials];
  const guesses = data.guesses[initials] || {};

  let points = 0;
  let exacts = 0;
  let outcomes = 0;
  let guessed = 0;

  getSortedMatches(data.matches).forEach(match => {
    const guess = guesses[match.id];

    if (guess && guess.homeScore !== '' && guess.awayScore !== '') {
      guessed++;
    }

    const result = getMatchPoints(match, guess);
    points += result.points;

    if (result.exact) {
      exacts++;
    } else if (result.outcomeCorrect) {
      outcomes++;
    }
  });

  const topScorerCorrect =
    normalize(participant?.topScorerGuess) &&
    normalize(participant?.topScorerGuess) === normalize(data.officialTopScorer);

  if (topScorerCorrect) {
    points += 20;
  }

  return { points, exacts, outcomes, guessed, topScorerCorrect };
}

function renderParticipantMatches() {
  const tbody = document.getElementById('participantMatches');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';
  const data = loadData();

  if (!activeParticipant) {
    updateParticipantStatus();
    return;
  }

  const guesses = data.guesses[activeParticipant] || {};

  if (data.matches.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="4">
        <span class="small">No matches have been added yet. Admin must add matches first.</span>
      </td>
    `;
    tbody.appendChild(row);
    updateParticipantStatus();
    return;
  }

  getSortedMatches(data.matches).forEach(match => {
    const guess = guesses[match.id] || getDefaultGuess();
    const result = getMatchPoints(match, guess);
    const locked = isMatchLocked(match);
    const disabled = locked ? 'disabled' : '';
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
        <strong>${escapeHtml(match.home)} - ${escapeHtml(match.away)}</strong><br>
        <span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span><br>
        ${getLockLabel(match)}<br>
        ${isMatchFinished(match)}
      </td>
      <td>
        <div class="guess-inputs">
          <select ${disabled} onchange="saveGuess('${match.id}', 'pick', this.value)">
            <option value="" ${guess.pick === '' ? 'selected' : ''}>Select</option>
            <option value="1" ${guess.pick === '1' ? 'selected' : ''}>1</option>
            <option value="X" ${guess.pick === 'X' ? 'selected' : ''}>X</option>
            <option value="2" ${guess.pick === '2' ? 'selected' : ''}>2</option>
          </select>
          <input type="number" min="0" step="1" placeholder="Home" value="${escapeAttr(guess.homeScore)}" ${disabled} oninput="this.value = normalizeScore(this.value)" onchange="saveGuess('${match.id}', 'homeScore', this.value)">
          <input type="number" min="0" step="1" placeholder="Away" value="${escapeAttr(guess.awayScore)}" ${disabled} oninput="this.value = normalizeScore(this.value)" onchange="saveGuess('${match.id}', 'awayScore', this.value)">
        </div>
      </td>
      <td>${formatMatchResult(match)}</td>
      <td>
        <strong>${result.points}</strong><br>
        ${getPredictionStatus(result)}
      </td>
    `;

    tbody.appendChild(row);
  });

  updateParticipantStatus();
}

function saveGuess(matchId, field, value) {
  if (!activeParticipant) {
    alert('Please log in first.');
    showView('home');
    return;
  }

  const data = loadData();
  const match = data.matches.find(item => item.id === matchId);

  if (match && isMatchLocked(match)) {
    alert('This match is locked. Please contact Admin if changes are needed.');
    renderAll();
    return;
  }

  data.guesses[activeParticipant] ||= {};
  data.guesses[activeParticipant][matchId] ||= getDefaultGuess();

  if (field === 'homeScore' || field === 'awayScore') {
    data.guesses[activeParticipant][matchId][field] = normalizeScore(value);
  } else {
    data.guesses[activeParticipant][matchId][field] = value;
  }

  const guess = data.guesses[activeParticipant][matchId];

  if (guess.homeScore !== '' && guess.awayScore !== '') {
    guess.pick = outcome(guess.homeScore, guess.awayScore);
  }

  const saveMessage = document.getElementById('saveMessage');
  if (saveMessage) {
    saveMessage.classList.add('hidden');
  }

  saveData(data);
}

function importMatches() {
  const input = document.getElementById('bulkMatchInput');

  if (!input) {
    return;
  }

  const lines = input.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '');

  if (lines.length === 0) {
    alert('No matches found');
    return;
  }

  const data = loadData();
  let imported = 0;

  lines.forEach(line => {
    const parts = line.split(';');

    if (parts.length < 4) {
      return;
    }

    const [date, round, home, away] = parts.map(part => part.trim());

    data.matches.push({
      id: crypto.randomUUID(),
      date,
      round,
      home,
      away,
      homeScore: '',
      awayScore: '',
      locked: false
    });

    imported++;
  });

  saveData(data);
  input.value = '';
  alert(`${imported} matches imported`);
}

function addMatch() {
  const date = document.getElementById('matchDate').value.trim();
  const round = document.getElementById('matchRound').value.trim();
  const home = document.getElementById('homeTeam').value.trim();
  const away = document.getElementById('awayTeam').value.trim();

  if (!home || !away) {
    alert('Please enter both teams');
    return;
  }

  const data = loadData();

  data.matches.push({
    id: crypto.randomUUID(),
    date,
    round,
    home,
    away,
    homeScore: '',
    awayScore: '',
    locked: false
  });

  saveData(data);

  document.getElementById('matchDate').value = '';
  document.getElementById('matchRound').value = '';
  document.getElementById('homeTeam').value = '';
  document.getElementById('awayTeam').value = '';
}

function updateMatch(matchId, field, value) {
  const data = loadData();
  const match = data.matches.find(m => m.id === matchId);

  if (!match) {
    return;
  }

  if (field === 'homeScore' || field === 'awayScore') {
    match[field] = value === '' ? '' : normalizeScore(value);
  } else {
    match[field] = value;
  }

  saveData(data);
}

function toggleMatchLock(matchId) {
  const data = loadData();
  const match = data.matches.find(item => item.id === matchId);

  if (!match) {
    return;
  }

  match.locked = !isMatchLocked(match);
  saveData(data);
}

function deleteMatch(matchId) {
  if (!confirm('Delete this match?')) {
    return;
  }

  const data = loadData();
  data.matches = data.matches.filter(match => match.id !== matchId);

  Object.keys(data.guesses).forEach(initials => {
    delete data.guesses[initials][matchId];
  });

  saveData(data);
}

function seedExampleMatches() {
  const data = loadData();

  if (data.matches.length > 0) {
    if (!confirm('Matches already exist. Add sample matches anyway?')) {
      return;
    }
  }

  const matches = [
    { date: '2026-06-11 21:00', round: 'Group A', home: 'Mexico', away: 'South Africa' },
    { date: '2026-06-11 23:00', round: 'Group A', home: 'USA', away: 'Canada' },
    { date: '2026-06-12 18:00', round: 'Group B', home: 'Denmark', away: 'Germany' },
    { date: '2026-06-12 21:00', round: 'Group B', home: 'Argentina', away: 'France' }
  ];

  matches.forEach(match => {
    data.matches.push({
      id: crypto.randomUUID(),
      ...match,
      homeScore: '',
      awayScore: '',
      locked: false
    });
  });

  saveData(data);
}

function renderAdminMatches() {
  const tbody = document.getElementById('adminMatches');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';
  const data = loadData();

  getSortedMatches(data.matches).forEach(match => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td><input value="${escapeAttr(match.date || '')}" onchange="updateMatch('${match.id}', 'date', this.value)"></td>
      <td><input value="${escapeAttr(match.round || '')}" onchange="updateMatch('${match.id}', 'round', this.value)"></td>
      <td>
        <input value="${escapeAttr(match.home)}" onchange="updateMatch('${match.id}', 'home', this.value)" style="margin-bottom:6px;">
        <input value="${escapeAttr(match.away)}" onchange="updateMatch('${match.id}', 'away', this.value)">
        <div>${getLockLabel(match)}</div>
        <div>${isMatchFinished(match)}</div>
      </td>
      <td>
        <div class="guess-inputs" style="grid-template-columns:80px 80px; min-width:170px;">
          <input type="number" min="0" step="1" placeholder="Home" value="${escapeAttr(match.homeScore)}" oninput="this.value = normalizeScore(this.value)" onchange="updateMatch('${match.id}', 'homeScore', this.value)">
          <input type="number" min="0" step="1" placeholder="Away" value="${escapeAttr(match.awayScore)}" oninput="this.value = normalizeScore(this.value)" onchange="updateMatch('${match.id}', 'awayScore', this.value)">
        </div>
      </td>
      <td>
        <button class="${getLockButtonClass(match)}" onclick="toggleMatchLock('${match.id}')">${getLockButtonText(match)}</button>
        <br><br>
        <button class="danger" onclick="deleteMatch('${match.id}')">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function saveOfficialTopScorer() {
  const data = loadData();
  const input = document.getElementById('officialTopScorer');

  data.officialTopScorer = input ? input.value.trim() : '';
  saveData(data);
}

function renderAdminParticipants() {
  const tbody = document.getElementById('adminParticipants');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';
  const data = loadData();

  Object.keys(data.participants).sort().forEach(initials => {
    const participant = data.participants[initials];
    const stats = getParticipantStats(initials);
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${escapeHtml(participant.initials)}</td>
      <td>${escapeHtml(participant.fullName)}</td>
      <td>${escapeHtml(participant.password || '-')}</td>
      <td>${escapeHtml(participant.topScorerGuess || '-')}</td>
      <td>${stats.guessed}</td>
      <td>${stats.points}</td>
      <td>
        <button onclick="selectAdminParticipant('${initials}')">View Predictions</button>
        <br><br>
        <button class="danger" onclick="deleteParticipant('${initials}')">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  const officialTopScorerInput = document.getElementById('officialTopScorer');
  if (officialTopScorerInput) {
    officialTopScorerInput.value = data.officialTopScorer || '';
  }
}

function selectAdminParticipant(initials) {
  const data = loadData();

  if (!data.participants[initials]) {
    selectedAdminParticipant = null;
    renderAdminSelectedPredictions();
    return;
  }

  selectedAdminParticipant = initials;
  renderAdminSelectedPredictions();
}

function renderAdminSelectedPredictions() {
  const tbody = document.getElementById('adminSelectedPredictions');
  const selectedBox = document.getElementById('selectedParticipantBox');

  if (!tbody || !selectedBox) {
    return;
  }

  tbody.innerHTML = '';

  const data = loadData();

  if (!selectedAdminParticipant || !data.participants[selectedAdminParticipant]) {
    selectedBox.innerHTML = `
      <strong>No participant selected.</strong><br />
      <span class="small">Click “View Predictions” next to a participant above.</span>
    `;
    return;
  }

  const participant = data.participants[selectedAdminParticipant];
  const guesses = data.guesses[selectedAdminParticipant] || {};
  const stats = getParticipantStats(selectedAdminParticipant);

  selectedBox.innerHTML = `
    <strong>${escapeHtml(participant.initials)} - ${escapeHtml(participant.fullName)}</strong><br />
    <span class="small">Password: ${escapeHtml(participant.password || '-')} · Top scorer: ${escapeHtml(participant.topScorerGuess || '-')} · Points: ${stats.points}</span>
  `;

  if (data.matches.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="5"><span class="small">No matches have been added yet.</span></td>
    `;
    tbody.appendChild(row);
    return;
  }

  getSortedMatches(data.matches).forEach(match => {
    const guess = guesses[match.id] || getDefaultGuess();
    const result = getMatchPoints(match, guess);
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
        ${escapeHtml(match.home)} - ${escapeHtml(match.away)}<br>
        <span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span><br>
        ${getLockLabel(match)}<br>
        ${isMatchFinished(match)}
      </td>
      <td>
        <div class="guess-inputs" style="grid-template-columns:80px 80px; min-width:170px;">
          <input type="number" min="0" step="1" placeholder="Home" value="${escapeAttr(guess.homeScore)}" oninput="this.value = normalizeScore(this.value)" onchange="updateAdminPrediction('${selectedAdminParticipant}', '${match.id}', 'homeScore', this.value)">
          <input type="number" min="0" step="1" placeholder="Away" value="${escapeAttr(guess.awayScore)}" oninput="this.value = normalizeScore(this.value)" onchange="updateAdminPrediction('${selectedAdminParticipant}', '${match.id}', 'awayScore', this.value)">
        </div>
      </td>
      <td>
        <select onchange="updateAdminPrediction('${selectedAdminParticipant}', '${match.id}', 'pick', this.value)">
          <option value="" ${guess.pick === '' ? 'selected' : ''}>Select</option>
          <option value="1" ${guess.pick === '1' ? 'selected' : ''}>1</option>
          <option value="X" ${guess.pick === 'X' ? 'selected' : ''}>X</option>
          <option value="2" ${guess.pick === '2' ? 'selected' : ''}>2</option>
        </select>
      </td>
      <td>${formatMatchResult(match)}</td>
      <td><strong>${result.points}</strong><br>${getPredictionStatus(result)}</td>
    `;

    tbody.appendChild(row);
  });
}

function updateAdminPrediction(initials, matchId, field, value) {
  const data = loadData();

  data.guesses[initials] ||= {};
  data.guesses[initials][matchId] ||= getDefaultGuess();

  if (field === 'homeScore' || field === 'awayScore') {
    data.guesses[initials][matchId][field] = normalizeScore(value);
  } else {
    data.guesses[initials][matchId][field] = value;
  }

  const guess = data.guesses[initials][matchId];

  if (guess.homeScore !== '' && guess.awayScore !== '') {
    guess.pick = outcome(guess.homeScore, guess.awayScore);
  }

  saveData(data);
}

function deleteParticipant(initials) {
  if (!confirm('Delete participant?')) {
    return;
  }

  const data = loadData();

  delete data.participants[initials];
  delete data.guesses[initials];

  if (activeParticipant === initials) {
    activeParticipant = null;
  }

  if (selectedAdminParticipant === initials) {
    selectedAdminParticipant = null;
  }

  saveData(data);
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';
  const data = loadData();

  const rows = Object.keys(data.participants)
    .map(initials => {
      const participant = data.participants[initials];
      const stats = getParticipantStats(initials);
      const hitRate = stats.guessed > 0
        ? Math.round(((stats.exacts + stats.outcomes) / stats.guessed) * 100)
        : 0;

      return {
        ...participant,
        ...stats,
        hitRate
      };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.exacts - a.exacts ||
      b.outcomes - a.outcomes ||
      b.hitRate - a.hitRate ||
      a.fullName.localeCompare(b.fullName)
    );

  if (rows.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="8">
        <span class="small">No participants yet.</span>
      </td>
    `;
    tbody.appendChild(emptyRow);
  }

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    const medal = getLeaderboardMedal(index);

    const topScorerPick = row.topScorerGuess && row.topScorerGuess.trim() !== ''
      ? escapeHtml(row.topScorerGuess)
      : '-';

    const topScorerText = row.topScorerCorrect
      ? `${topScorerPick} ✅ +20`
      : topScorerPick;

    tr.innerHTML = `
      <td><strong>${medal} ${index + 1}</strong></td>
      <td><strong>${escapeHtml(row.initials)}</strong></td>
      <td>${escapeHtml(row.fullName)}</td>
      <td><strong>${row.points}</strong></td>
      <td class="green">${row.exacts}</td>
      <td class="blue">${row.outcomes}</td>
      <td>${row.guessed}</td>
      <td>${topScorerText}<br><span class="small">Hit rate: ${row.hitRate}%</span></td>
    `;

    tbody.appendChild(tr);
  });

  const totalGuesses = Object.keys(data.participants).reduce(
    (sum, initials) => sum + getParticipantStats(initials).guessed,
    0
  );

  const completedMatches = data.matches.filter(
    match => match.homeScore !== '' && match.awayScore !== ''
  ).length;

  setText('participantCount', rows.length);
  setText('poolSize', `${rows.length * 50} DKK`);
  setText('totalGuesses', totalGuesses);
  setText('completedMatches', completedMatches);
}

function getLeaderboardMedal(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return '';
}

function calculateGroupStandings() {
  const data = loadData();
  const groups = {};

  getSortedMatches(data.matches)
    .filter(isGroupMatch)
    .forEach(match => {
      const groupName = String(match.round || '').trim();

      if (!groups[groupName]) {
        groups[groupName] = {
          teams: {},
          completedMatches: 0,
          pendingMatches: 0
        };
      }

      ensureTeam(groups[groupName].teams, match.home);
      ensureTeam(groups[groupName].teams, match.away);

      const isCompleted =
        match.homeScore !== '' &&
        match.awayScore !== '' &&
        match.homeScore !== undefined &&
        match.awayScore !== undefined;

      if (!isCompleted) {
        groups[groupName].pendingMatches++;
        return;
      }

      const homeScore = Number(match.homeScore);
      const awayScore = Number(match.awayScore);

      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        groups[groupName].pendingMatches++;
        return;
      }

      groups[groupName].completedMatches++;

      const homeTeam = groups[groupName].teams[match.home];
      const awayTeam = groups[groupName].teams[match.away];

      homeTeam.p += 1;
      awayTeam.p += 1;

      homeTeam.gf += homeScore;
      homeTeam.ga += awayScore;
      awayTeam.gf += awayScore;
      awayTeam.ga += homeScore;

      if (homeScore > awayScore) {
        homeTeam.w += 1;
        homeTeam.pts += 3;
        awayTeam.l += 1;
      } else if (homeScore < awayScore) {
        awayTeam.w += 1;
        awayTeam.pts += 3;
        homeTeam.l += 1;
      } else {
        homeTeam.d += 1;
        awayTeam.d += 1;
        homeTeam.pts += 1;
        awayTeam.pts += 1;
      }
    });

  return groups;
}

function ensureTeam(teams, teamName) {
  if (!teams[teamName]) {
    teams[teamName] = {
      team: teamName,
      p: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0
    };
  }
}

function sortGroupTeams(teams) {
  return Object.values(teams).sort((a, b) =>
    b.pts - a.pts ||
    (b.gf - b.ga) - (a.gf - a.ga) ||
    b.gf - a.gf ||
    a.team.localeCompare(b.team)
  );
}

function renderGroupStandings() {
  const container = document.getElementById('groupsContainer');

  if (!container) {
    return;
  }

  const groups = calculateGroupStandings();
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  container.innerHTML = '';

  let totalTeams = 0;
  let totalCompleted = 0;
  let totalPending = 0;

  if (groupNames.length === 0) {
    container.innerHTML = `
      <div class="subtle-box">
        <strong>No group matches found.</strong><br />
        <span class="small">Use Group/Round values like Group A, Group B, etc.</span>
      </div>
    `;

    setText('groupCount', 0);
    setText('groupTeamCount', 0);
    setText('groupCompletedMatches', 0);
    setText('groupPendingMatches', 0);
    return;
  }

  groupNames.forEach(groupName => {
    const group = groups[groupName];
    const sortedTeams = sortGroupTeams(group.teams);

    totalTeams += sortedTeams.length;
    totalCompleted += group.completedMatches;
    totalPending += group.pendingMatches;

    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';

    let html = `
      <div class="group-title">${escapeHtml(groupName)}</div>
      <div class="group-meta small">Completed matches: ${group.completedMatches} · Pending matches: ${group.pendingMatches}</div>
      <div class="scroll">
        <table class="group-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Nation</th>
              <th>Pts</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>F</th>
              <th>A</th>
              <th>GD</th>
            </tr>
          </thead>
          <tbody>
    `;

    sortedTeams.forEach((team, index) => {
      const gd = team.gf - team.ga;
      const gdText = gd > 0 ? `+${gd}` : String(gd);

      html += `
        <tr>
          <td class="group-pos">${index + 1}</td>
          <td class="group-nation"><strong>${escapeHtml(team.team)}</strong></td>
          <td class="group-points"><strong>${team.pts}</strong></td>
          <td>${team.p}</td>
          <td>${team.w}</td>
          <td>${team.d}</td>
          <td>${team.l}</td>
          <td>${team.gf}</td>
          <td>${team.ga}</td>
          <td>${gdText}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    groupCard.innerHTML = html;
    container.appendChild(groupCard);
  });

  setText('groupCount', groupNames.length);
  setText('groupTeamCount', totalTeams);
  setText('groupCompletedMatches', totalCompleted);
  setText('groupPendingMatches', totalPending);
}

function renderOverview() {
  const table = document.getElementById('overviewTable');

  if (!table) {
    return;
  }

  const data = loadData();
  const participants = Object.keys(data.participants).sort();

  let html = '<thead><tr><th>Match</th><th>Result</th>';

  participants.forEach(initials => {
    html += `<th>${escapeHtml(initials)}</th>`;
  });

  html += '</tr></thead><tbody>';

  getSortedMatches(data.matches).forEach(match => {
    html += `
      <tr>
        <td>
          <strong>${escapeHtml(match.home)} - ${escapeHtml(match.away)}</strong><br>
          <span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span><br>
          ${getLockLabel(match)}<br>
          ${isMatchFinished(match)}
        </td>
        <td>${formatMatchResult(match)}</td>
    `;

    participants.forEach(initials => {
      const guess = data.guesses[initials]?.[match.id];
      const result = getMatchPoints(match, guess);

      let className = '';
      let icon = '';

      if (result.status === 'exact') {
        className = 'status-exact';
        icon = '✅';
      }

      if (result.status === 'outcome') {
        className = 'status-outcome';
        icon = '🔵';
      }

      if (result.status === 'wrong') {
        className = 'status-wrong';
        icon = '❌';
      }

      const guessText = guess && guess.homeScore !== '' && guess.awayScore !== ''
        ? `${guess.homeScore}-${guess.awayScore} (${guess.pick || outcome(guess.homeScore, guess.awayScore)})`
        : '-';

      html += `<td class="${className}">${icon} ${escapeHtml(guessText)}</td>`;
    });

    html += '</tr>';
  });

  html += '</tbody>';
  table.innerHTML = html;
}

function exportCSV() {
  const data = loadData();
  const rows = [];

  rows.push([
    'Type',
    'Initials',
    'Name',
    'Password',
    'Top scorer prediction',
    'Match',
    'Date',
    'Round',
    'Prediction',
    '1/X/2',
    'Match result',
    'Points'
  ]);

  Object.keys(data.participants).forEach(initials => {
    const participant = data.participants[initials];
    const guesses = data.guesses[initials] || {};

    getSortedMatches(data.matches).forEach(match => {
      const guess = guesses[match.id];
      const result = getMatchPoints(match, guess);

      rows.push([
        'Prediction',
        initials,
        participant.fullName,
        participant.password || '',
        participant.topScorerGuess || '',
        `${match.home} - ${match.away}`,
        match.date || '',
        match.round || '',
        guess && guess.homeScore !== '' && guess.awayScore !== '' ? `${guess.homeScore}-${guess.awayScore}` : '',
        guess?.pick || '',
        match.homeScore !== '' && match.awayScore !== '' ? `${match.homeScore}-${match.awayScore}` : '',
        result.points
      ]);
    });
  });

  downloadFile(
    'world-cup-2026-tae-guess-tournament.csv',
    rows.map(row => row.map(csvEscape).join(';')).join('\n'),
    'text/csv;charset=utf-8'
  );
}

function exportJSON() {
  downloadFile(
    'world-cup-2026-tae-guess-tournament-backup.json',
    JSON.stringify(loadData(), null, 2),
    'application/json'
  );
}

function importJSON(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      renderAll();
      alert('Backup imported');
    } catch {
      alert('Could not import backup');
    }
  };

  reader.readAsText(file);
}

function resetAllData() {
  if (!confirm('Delete ALL data in this browser?')) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  activeParticipant = null;
  selectedAdminParticipant = null;
  renderAll();
}

function formatMatchResult(match) {
  if (
    match.homeScore === '' ||
    match.awayScore === '' ||
    match.homeScore === undefined ||
    match.awayScore === undefined
  ) {
    return '<span class="small">Not played yet</span>';
  }

  return `<strong>${escapeHtml(match.homeScore)}-${escapeHtml(match.awayScore)}</strong>`;
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function csvEscape(value) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"';
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function renderAll() {
  updateParticipantStatus();
  renderParticipantMatches();
  renderAdminMatches();
  renderAdminParticipants();
  renderAdminSelectedPredictions();
  renderLeaderboard();
  renderGroupStandings();
  renderOverview();
  updateActiveTab(currentView);
}

showView('home');
