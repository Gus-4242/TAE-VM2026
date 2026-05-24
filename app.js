const STORAGE_KEY = 'world_cup_2026_tae_guess_tournament';
const ADMIN_CODE = 'vm2026-G';

let activeParticipant = null;

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
  const views = [
    'homeView',
    'myPredictionsView',
    'leaderboardView',
    'overviewView',
    'adminLoginView',
    'adminView'
  ];

  views.forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });

  document.getElementById(view + 'View').classList.remove('hidden');
  renderAll();
}

function openAdminLogin() {
  showView('adminLogin');
}

function adminLogin() {
  const code = document.getElementById('adminCode').value;

  if (code === ADMIN_CODE) {
    showView('admin');
  } else {
    alert('Incorrect admin password');
  }
}

function loginParticipant() {
  const initials = document
    .getElementById('initials')
    .value
    .trim()
    .toUpperCase();

  const fullName = document
    .getElementById('fullName')
    .value
    .trim();

  const topScorerGuess = document
    .getElementById('topScorerGuess')
    .value
    .trim();

  if (!initials || !fullName) {
    alert('Please enter initials and full name');
    return;
  }

  const data = loadData();

  data.participants[initials] = {
    initials,
    fullName,
    topScorerGuess,
    createdAt: data.participants[initials]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.guesses[initials] ||= {};

  activeParticipant = initials;

  saveData(data);
  updateParticipantStatus();
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
    alert('Please create your participant profile before saving predictions.');
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
    return {
      points: 0,
      exact: false,
      outcomeCorrect: false,
      status: ''
    };
  }

  const predictedHome = Number(guess.homeScore);
  const predictedAway = Number(guess.awayScore);
  const actualHome = Number(match.homeScore);
  const actualAway = Number(match.awayScore);

  if ([predictedHome, predictedAway, actualHome, actualAway].some(Number.isNaN)) {
    return {
      points: 0,
      exact: false,
      outcomeCorrect: false,
      status: ''
    };
  }

  const exact = predictedHome === actualHome && predictedAway === actualAway;
  const outcomeCorrect = outcome(predictedHome, predictedAway) === outcome(actualHome, actualAway);

  if (exact) {
    return {
      points: 3,
      exact: true,
      outcomeCorrect: true,
      status: 'exact'
    };
  }

  if (outcomeCorrect) {
    return {
      points: 1,
      exact: false,
      outcomeCorrect: true,
      status: 'outcome'
    };
  }

  return {
    points: 0,
    exact: false,
    outcomeCorrect: false,
    status: 'wrong'
  };
}

function getParticipantStats(initials) {
  const data = loadData();
  const participant = data.participants[initials];
  const guesses = data.guesses[initials] || {};

  let points = 0;
  let exacts = 0;
  let outcomes = 0;
  let guessed = 0;

  data.matches.forEach(match => {
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

  return {
    points,
    exacts,
    outcomes,
    guessed,
    topScorerCorrect
  };
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
    return;
  }

  data.matches.forEach(match => {
    const guess = guesses[match.id] || {
      pick: '',
      homeScore: '',
      awayScore: ''
    };

    const result = getMatchPoints(match, guess);

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
        <strong>${escapeHtml(match.home)} - ${escapeHtml(match.away)}</strong><br>
        <span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span>
      </td>

      <td>
        <div class="guess-inputs">
          <select onchange="saveGuess('${match.id}', 'pick', this.value)">
            <option value="" ${guess.pick === '' ? 'selected' : ''}>Select</option>
            <option value="1" ${guess.pick === '1' ? 'selected' : ''}>1</option>
            <option value="X" ${guess.pick === 'X' ? 'selected' : ''}>X</option>
            <option value="2" ${guess.pick === '2' ? 'selected' : ''}>2</option>
          </select>

          <input
            type="number"
            min="0"
            placeholder="Home"
            value="${escapeAttr(guess.homeScore)}"
            onchange="saveGuess('${match.id}', 'homeScore', this.value)"
          >

          <input
            type="number"
            min="0"
            placeholder="Away"
            value="${escapeAttr(guess.awayScore)}"
            onchange="saveGuess('${match.id}', 'awayScore', this.value)"
          >
        </div>
      </td>

      <td>${formatMatchResult(match)}</td>
      <td>${result.points}</td>
    `;

    tbody.appendChild(row);
  });

  updateParticipantStatus();
}

function saveGuess(matchId, field, value) {
  if (!activeParticipant) {
    alert('Please create your participant profile first.');
    showView('home');
    return;
  }

  const data = loadData();

  data.guesses[activeParticipant] ||= {};

  data.guesses[activeParticipant][matchId] ||= {
    pick: '',
    homeScore: '',
    awayScore: ''
  };

  data.guesses[activeParticipant][matchId][field] = value;

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
    awayScore: ''
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

  match[field] = value;

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
    {
      date: '2026-06-11 21:00',
      round: 'Group A',
      home: 'Mexico',
      away: 'South Africa'
    },
    {
      date: '2026-06-12 18:00',
      round: 'Group A',
      home: 'USA',
      away: 'Canada'
    },
    {
      date: '2026-06-13 20:00',
      round: 'Group B',
      home: 'Denmark',
      away: 'Germany'
    },
    {
      date: '2026-06-14 21:00',
      round: 'Group B',
      home: 'Argentina',
      away: 'France'
    }
  ];

  matches.forEach(match => {
    data.matches.push({
      id: crypto.randomUUID(),
      ...match,
      homeScore: '',
      awayScore: ''
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

  data.matches.forEach(match => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
        <input value="${escapeAttr(match.date || '')}" onchange="updateMatch('${match.id}', 'date', this.value)">
      </td>
      <td>
        <input value="${escapeAttr(match.round || '')}" onchange="updateMatch('${match.id}', 'round', this.value)">
      </td>
      <td>
        <input value="${escapeAttr(match.home)}" onchange="updateMatch('${match.id}', 'home', this.value)" style="margin-bottom:6px;">
        <input value="${escapeAttr(match.away)}" onchange="updateMatch('${match.id}', 'away', this.value)">
      </td>
      <td>
        <div class="guess-inputs" style="grid-template-columns:80px 80px; min-width:170px;">
          <input type="number" min="0" placeholder="Home" value="${escapeAttr(match.homeScore)}" onchange="updateMatch('${match.id}', 'homeScore', this.value)">
          <input type="number" min="0" placeholder="Away" value="${escapeAttr(match.awayScore)}" onchange="updateMatch('${match.id}', 'awayScore', this.value)">
        </div>
      </td>
      <td>
        <button class="danger" onclick="deleteMatch('${match.id}')">Delete</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function saveOfficialTopScorer() {
  const data = loadData();

  data.officialTopScorer = document
    .getElementById('officialTopScorer')
    .value
    .trim();

  saveData(data);
}

function renderAdminParticipants() {
  const tbody = document.getElementById('adminParticipants');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  const data = loadData();

  Object.keys(data.participants)
    .sort()
    .forEach(initials => {
      const participant = data.participants[initials];
      const stats = getParticipantStats(initials);

      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${escapeHtml(participant.initials)}</td>
        <td>${escapeHtml(participant.fullName)}</td>
        <td>${escapeHtml(participant.topScorerGuess || '-')}</td>
        <td>${stats.guessed}</td>
        <td>${stats.points}</td>
        <td>
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

function renderAdminPredictions() {
  function renderAdminPredictions() {
  const tbody = document.getElementById('adminPredictions');

  if (!tbody) return;

  tbody.innerHTML = '';

  const data = loadData();

  Object.keys(data.participants).sort().forEach(initials => {
    const participant = data.participants[initials];
    const guesses = data.guesses[initials] || {};

    data.matches.forEach(match => {
      const guess = guesses[match.id] || {
        pick: '',
        homeScore: '',
        awayScore: ''
      };

      const points = getMatchPoints(match, guess).points;

      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${escapeHtml(participant.initials)} - ${escapeHtml(participant.fullName)}</td>

        <td>
          ${escapeHtml(match.home)} - ${escapeHtml(match.away)}<br>
          <span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span>
        </td>

        <td>
          <div class="guess-inputs">
            <input
              type="number"
              min="0"
              placeholder="Home"
              value="${escapeAttr(guess.homeScore)}"
              onchange="updateAdminPrediction('${initials}', '${match.id}', 'homeScore', this.value)"
            >

            <input
              type="number"
              min="0"
              placeholder="Away"
              value="${escapeAttr(guess.awayScore)}"
              onchange="updateAdminPrediction('${initials}', '${match.id}', 'awayScore', this.value)"
            >
          </div>
        </td>

        <td>
          <select onchange="updateAdminPrediction('${initials}', '${match.id}', 'pick', this.value)">
            <option value="" ${guess.pick === '' ? 'selected' : ''}>Select</option>
            <option value="1" ${guess.pick === '1' ? 'selected' : ''}>1</option>
            <option value="X" ${guess.pick === 'X' ? 'selected' : ''}>X</option>
            <option value="2" ${guess.pick === '2' ? 'selected' : ''}>2</option>
          </select>
        </td>

        <td>${formatMatchResult(match)}</td>

        <td>${points}</td>
      `;

      tbody.appendChild(row);
    });
  });
}
function updateAdminPrediction(initials, matchId, field, value) {
  const data = loadData();

  data.guesses[initials] ||= {};

  data.guesses[initials][matchId] ||= {
    pick: '',
    homeScore: '',
    awayScore: ''
  };

  data.guesses[initials][matchId][field] = value;

  const guess = data.guesses[initials][matchId];

  if (guess.homeScore !== '' && guess.awayScore !== '') {
    guess.pick = outcome(guess.homeScore, guess.awayScore);
  }

  saveData(data);
}  }

  tbody.innerHTML = '';

  const data = loadData();

  Object.keys(data.participants)
    .sort()
    .forEach(initials => {
      const participant = data.participants[initials];
      const guesses = data.guesses[initials] || {};

      data.matches.forEach(match => {
        const guess = guesses[match.id];
        const points = getMatchPoints(match, guess).points;

        const predictionText =
          guess && guess.homeScore !== '' && guess.awayScore !== ''
            ? `${guess.homeScore}-${guess.awayScore}`
            : '-';

        const pickText =
          guess?.pick ||
          (guess && guess.homeScore !== '' && guess.awayScore !== ''
            ? outcome(guess.homeScore, guess.awayScore)
            : '-');

        const row = document.createElement('tr');

        row.innerHTML = `
          <td>${escapeHtml(participant.initials)} - ${escapeHtml(participant.fullName)}</td>
          <td>${escapeHtml(match.home)} - ${escapeHtml(match.away)}<br><span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span></td>
          <td>${escapeHtml(predictionText)}</td>
          <td>${escapeHtml(pickText)}</td>
          <td>${formatMatchResult(match)}</td>
          <td>${points}</td>
        `;

        tbody.appendChild(row);
      });
    });
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
    .map(initials => ({
      ...data.participants[initials],
      ...getParticipantStats(initials)
    }))
    .sort((a, b) => b.points - a.points || b.exacts - a.exacts || b.outcomes - a.outcomes);

  rows.forEach((row, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(row.initials)}</strong></td>
      <td>${escapeHtml(row.fullName)}</td>
      <td><strong>${row.points}</strong></td>
      <td class="green">${row.exacts}</td>
      <td class="blue">${row.outcomes}</td>
      <td>${row.guessed}</td>
      <td>${row.topScorerCorrect ? '✅ +20' : escapeHtml(row.topScorerGuess || '-')}</td>
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

  data.matches.forEach(match => {
    html += `
      <tr>
        <td>
          <strong>${escapeHtml(match.home)} - ${escapeHtml(match.away)}</strong><br>
          <span class="small">${escapeHtml(match.round || '')} ${escapeHtml(match.date || '')}</span>
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

      const guessText =
        guess && guess.homeScore !== '' && guess.awayScore !== ''
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

    data.matches.forEach(match => {
      const guess = guesses[match.id];
      const result = getMatchPoints(match, guess);

      rows.push([
        'Prediction',
        initials,
        participant.fullName,
        participant.topScorerGuess || '',
        `${match.home} - ${match.away}`,
        match.date || '',
        match.round || '',
        guess && guess.homeScore !== '' && guess.awayScore !== ''
          ? `${guess.homeScore}-${guess.awayScore}`
          : '',
        guess?.pick || '',
        match.homeScore !== '' && match.awayScore !== ''
          ? `${match.homeScore}-${match.awayScore}`
          : '',
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
  renderAdminPredictions();
  renderLeaderboard();
  renderOverview();
}

renderAll();
