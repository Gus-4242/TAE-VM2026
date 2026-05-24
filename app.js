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
}

function openAdminLogin() {
  showView('adminLogin');
}

function adminLogin() {

  const code = document.getElementById('adminCode').value;

  if (code === ADMIN_CODE) {
    showView('admin');
    renderAdminParticipants();
  } else {
    alert('Incorrect admin password');
  }
}

function loginParticipant() {

  const initials =
    document.getElementById('initials')
      .value
      .trim()
      .toUpperCase();

  const fullName =
    document.getElementById('fullName')
      .value
      .trim();

  const topScorerGuess =
    document.getElementById('topScorerGuess')
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
    createdAt: new Date().toISOString()
  };

  data.guesses[initials] ||= {};

  activeParticipant = initials;

  saveData(data);

  document.getElementById('participantPanel')
    .classList.remove('hidden');

  document.getElementById('notLoggedInBox')
    .classList.add('hidden');

  document.getElementById('activeParticipantName')
    .textContent = `${initials} - ${fullName}`;

  renderParticipantMatches();

  showView('myPredictions');
}

function renderParticipantMatches() {

  const tbody =
    document.getElementById('participantMatches');

  tbody.innerHTML = '';

  const data = loadData();

  if (!activeParticipant) {
    return;
  }

  const guesses =
    data.guesses[activeParticipant] || {};

  data.matches.forEach(match => {

    const guess =
      guesses[match.id] || {
        pick: '',
        homeScore: '',
        awayScore: ''
      };

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>
        <strong>${match.home} - ${match.away}</strong><br>
        <span class="small">${match.round || ''} ${match.date || ''}</span>
      </td>

      <td>
        <div class="guess-inputs">

          <select onchange="saveGuess('${match.id}', 'pick', this.value)">
            <option value="">Select</option>
            <option value="1" ${guess.pick === '1' ? 'selected' : ''}>1</option>
            <option value="X" ${guess.pick === 'X' ? 'selected' : ''}>X</option>
            <option value="2" ${guess.pick === '2' ? 'selected' : ''}>2</option>
          </select>

          <input
            type="number"
            placeholder="Home"
            value="${guess.homeScore}"
            onchange="saveGuess('${match.id}', 'homeScore', this.value)"
          >

          <input
            type="number"
            placeholder="Away"
            value="${guess.awayScore}"
            onchange="saveGuess('${match.id}', 'awayScore', this.value)"
          >

        </div>
      </td>

      <td>
        ${match.homeScore !== ''
          ? match.homeScore + '-' + match.awayScore
          : 'Not played yet'}
      </td>

      <td>
        -
      </td>
    `;

    tbody.appendChild(row);
  });
}

function saveGuess(matchId, field, value) {

  if (!activeParticipant) {
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

  saveData(data);
}

function renderAdminParticipants() {

  const tbody =
    document.getElementById('adminParticipants');

  tbody.innerHTML = '';

  const data = loadData();

  Object.keys(data.participants).forEach(initials => {

    const participant =
      data.participants[initials];

    const guessCount =
      Object.keys(data.guesses[initials] || {})
        .length;

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${participant.initials}</td>
      <td>${participant.fullName}</td>
      <td>${participant.topScorerGuess || '-'}</td>
      <td>${guessCount}</td>
      <td>0</td>

      <td>
        <button
          class="danger"
          onclick="deleteParticipant('${initials}')"
        >
          Delete
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function deleteParticipant(initials) {

  if (!confirm('Delete participant?')) {
    return;
  }

  const data = loadData();

  delete data.participants[initials];
  delete data.guesses[initials];

  saveData(data);

  renderAdminParticipants();
}

function addMatch() {

  const date =
    document.getElementById('matchDate')
      .value
      .trim();

  const round =
    document.getElementById('matchRound')
      .value
      .trim();

  const home =
    document.getElementById('homeTeam')
      .value
      .trim();

  const away =
    document.getElementById('awayTeam')
      .value
      .trim();

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

  renderParticipantMatches();

  document.getElementById('matchDate').value = '';
  document.getElementById('matchRound').value = '';
  document.getElementById('homeTeam').value = '';
  document.getElementById('awayTeam').value = '';
}

function seedExampleMatches() {

  const data = loadData();

  if (data.matches.length > 0) {

    if (!confirm('Matches already exist. Add anyway?')) {
      return;
    }
  }

  const matches = [

    {
      date: '2026-06-11 21:00',
      round: 'Group A',
      home: 'Denmark',
      away: 'Germany'
    },

    {
      date: '2026-06-12 18:00',
      round: 'Group A',
      home: 'Brazil',
      away: 'Argentina'
    },

    {
      date: '2026-06-13 20:00',
      round: 'Group B',
      home: 'France',
      away: 'Spain'
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

  renderParticipantMatches();
}

function exportCSV() {

  const data = loadData();

  let csv =
    'Initials;Name;TopScorer\\n';

  Object.keys(data.participants).forEach(initials => {

    const p = data.participants[initials];

    csv +=
      `${p.initials};${p.fullName};${p.topScorerGuess || ''}\\n`;
  });

  const blob =
    new Blob([csv], { type: 'text/csv' });

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download = 'participants.csv';

  a.click();

  URL.revokeObjectURL(url);
}

function exportJSON() {

  const data = loadData();

  const blob =
    new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download = 'backup.json';

  a.click();

  URL.revokeObjectURL(url);
}

function importJSON(event) {

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload = e => {

    try {

      const data =
        JSON.parse(e.target.result);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );

      renderAll();

      alert('Backup imported');

    } catch {

      alert('Could not import backup');
    }
  };

  reader.readAsText(file);
}

function resetAllData() {

  if (!confirm('Delete ALL data?')) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);

  activeParticipant = null;

  renderAll();
}

function renderAll() {

  renderParticipantMatches();
  renderAdminParticipants();
}

renderAll();
