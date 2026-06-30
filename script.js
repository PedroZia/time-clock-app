const STORAGE_KEY = 'timeclock-entries';
const THEME_KEY = 'timeclock-theme';
const PRESETS = ['Bug fixes', 'Meetings', 'Code review', 'Documentation', 'Deployment', 'Other'];

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let editingId = null;

// Theme
const root = document.documentElement;
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) root.setAttribute('data-theme', savedTheme);

function updateThemeIcon() {
  const isDark = root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  document.getElementById('themeToggle').textContent = isDark ? '☀' : '☾';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
  updateThemeIcon();
});

updateThemeIcon();

// Preset → description
document.getElementById('preset').addEventListener('change', e => {
  if (e.target.value) document.getElementById('description').value = e.target.value;
});

// Submit
document.getElementById('submitBtn').addEventListener('click', () => {
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const desc = document.getElementById('description').value.trim();

  if (!start || !end || !desc) return alert('All fields required.');
  if (new Date(end) <= new Date(start)) return alert('End must be after start.');

  if (editingId) {
    const e = entries.find(x => x.id === editingId);
    if (e) { e.start = start; e.end = end; e.description = desc; }
    editingId = null;
    document.getElementById('submitBtn').textContent = 'Add';
    document.getElementById('cancelBtn').style.display = 'none';
  } else {
    entries.unshift({ id: Date.now(), start, end, description: desc });
  }

  save();
  clearForm();
  render();
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  editingId = null;
  document.getElementById('submitBtn').textContent = 'Add';
  document.getElementById('cancelBtn').style.display = 'none';
  clearForm();
});

function clearForm() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  document.getElementById('start').value = `${date}T16:30`;
  document.getElementById('end').value = '';
  document.getElementById('description').value = '';
  document.getElementById('preset').value = '';
}

// Render
function render() {
  const list = document.getElementById('entryList');
  if (!entries.length) {
    list.innerHTML = '<div class="empty">No entries yet</div>';
    document.getElementById('listSummary').textContent = 'Entries (0 total)';
    return;
  }

  let totalMs = 0;
  let html = '';
  for (const e of entries) {
    const s = new Date(e.start);
    const en = new Date(e.end);
    const ms = en - s;
    totalMs += ms;

    const day = s.toLocaleDateString('en-US', { weekday: 'short' });
    const date = s.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const startT = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endT = en.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dur = fmtDuration(ms);

    html += `<div class="entry">
      <div class="entry-main">
        <div class="entry-date">${day} ${date}</div>
        <div class="entry-times">${startT} → ${endT}</div>
        <div class="entry-desc">${esc(e.description)}</div>
      </div>
      <div class="entry-duration">${dur}</div>
      <div class="entry-actions">
        <button class="btn-icon" onclick="editEntry(${e.id})">Edit</button>
        <button class="btn-icon" onclick="deleteEntry(${e.id})">Del</button>
        <button class="btn-primary" onclick="sendEmail(${e.id})">Email</button>
      </div>
    </div>`;
  }

  list.innerHTML = html;
  document.getElementById('listSummary').textContent =
    `Entries (${entries.length} total, ${fmtDuration(totalMs)})`;
}



function fmtDuration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

window.sendEmail = (id) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const start = new Date(entry.start);
    const end = new Date(entry.end);

    const to = "edimara@indaiatuba.sp.gov.br";
    const cc = [
        "fernando.valim@indaiatuba.sp.gov.br",
        "higor.sombini@indaiatuba.sp.gov.br"
    ].join(",");

    const subject = `Timesheet - ${start.toLocaleDateString()}`;

    const body = `Bom dia, espero que este e-mail o(a) encontre bem,

      Gostaria de registrar que realizei hora extra.

      De: ${start.toLocaleString()},
      Até: ${end.toLocaleString()},
      Duração de: ${fmtDuration(end - start)}.

      Realizado:
      ${entry.description}

      Atenciosamente,
      Pedro`;

    window.location.href =
        `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

window.editEntry = (id) => {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById('start').value = e.start;
  document.getElementById('end').value = e.end;
  document.getElementById('description').value = e.description;
  document.getElementById('preset').value = PRESETS.includes(e.description) ? e.description : '';
  document.getElementById('submitBtn').textContent = 'Update';
  document.getElementById('cancelBtn').style.display = '';
  document.getElementById('start').focus();
};

window.deleteEntry = (id) => {
  if (!confirm('Delete this entry?')) return;
  entries = entries.filter(x => x.id !== id);
  save();
  render();
};

// Persistence
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Export
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `timeclock-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// Import
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!Array.isArray(incoming)) throw 0;
      const existing = new Set(entries.map(x => x.id));
      let added = 0;
      for (const item of incoming) {
        if (item.id && item.start && item.end && item.description && !existing.has(item.id)) {
          entries.push(item);
          added++;
        }
      }
      entries.sort((a, b) => new Date(b.start) - new Date(a.start));
      save();
      render();
      alert(`Imported ${added} new entries.`);
    } catch { alert('Invalid JSON file.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

clearForm()
render();
