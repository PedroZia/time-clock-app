const STORAGE_KEY = 'timeclock-entries';
const THEME_KEY = 'timeclock-theme';
const CONFIG_KEY = 'timeclock-config';
const PRESETS = ['Correção de Bugs', 'Reunião', 'Revisão de Código', 'Documentação'];

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
entries.sort((a, b) => new Date(b.start) - new Date(a.start));
let editingId = null;
let currentMonth = '';
let config = getConfig();

// Config
function getConfig() {
  let cfg = JSON.parse(localStorage.getItem(CONFIG_KEY));
  if (!cfg) {
    cfg = {
      nome: "Pedro Paulo Zia",
      codigo: "14890",
      to: "edmara.garcia@indaiatuba.sp.gov.br",
      cc: [
        "fernando.valim@indaiatuba.sp.gov.br",
        "higor.sombini@indaiatuba.sp.gov.br"
      ]
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  }
  return cfg;
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Theme
const root = document.documentElement;
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) root.setAttribute('data-theme', savedTheme);

function updateThemeIcon() {
  const isDark = root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  document.getElementById('themeToggle').textContent = isDark ? '\u2600' : '\u263E';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
  updateThemeIcon();
});

updateThemeIcon();

// Settings modal
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSettings();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettings();
});

function openSettings() {
  document.getElementById('cfgName').value = config.nome;
  document.getElementById('cfgCode').value = config.codigo;
  document.getElementById('cfgTo').value = config.to;
  renderCcFields();
  document.getElementById('settingsOverlay').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('open');
}

function renderCcFields() {
  const list = document.getElementById('ccList');
  list.innerHTML = config.cc.map((email, i) =>
    `<div class="cc-row">
      <input type="email" value="${esc(email)}" data-index="${i}">
      <button class="btn-icon" onclick="removeCc(${i})">&#10005;</button>
    </div>`
  ).join('');
}

window.removeCc = (i) => {
  config.cc.splice(i, 1);
  renderCcFields();
};

document.getElementById('addCcBtn').addEventListener('click', () => {
  config.cc.push('');
  renderCcFields();
  const inputs = document.querySelectorAll('#ccList input');
  inputs[inputs.length - 1].focus();
});

document.getElementById('saveConfigBtn').addEventListener('click', () => {
  config.nome = document.getElementById('cfgName').value.trim();
  config.codigo = document.getElementById('cfgCode').value.trim();
  config.to = document.getElementById('cfgTo').value.trim();
  config.cc = [...document.querySelectorAll('#ccList input')].map(i => i.value.trim()).filter(Boolean);
  saveConfig();
  closeSettings();
});

// Filter
document.getElementById('monthFilter').addEventListener('change', (e) => {
  currentMonth = e.target.value;
  render();
});

function populateMonthFilter() {
  const months = new Map();
  for (const e of entries) {
    const d = new Date(e.start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!months.has(key)) months.set(key, label);
  }
  const sorted = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const select = document.getElementById('monthFilter');
  select.innerHTML = '<option value="">All months</option>' +
    sorted.map(([k, v]) => `<option value="${k}"${k === currentMonth ? ' selected' : ''}>${v}</option>`).join('');
}

function getFilteredEntries() {
  if (!currentMonth) return entries;
  return entries.filter(e => {
    const d = new Date(e.start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === currentMonth;
  });
}

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

  const conflict = entries.find(e => {
    if (editingId && e.id === editingId) return false;
    return start < e.end && end > e.start;
  });
  if (conflict) {
    const cs = new Date(conflict.start);
    const ce = new Date(conflict.end);
    const day = cs.toLocaleDateString('en-US', { weekday: 'short' });
    const date = cs.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const st = cs.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const et = ce.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return alert(`This entry overlaps with:\n\n${day} ${date}, ${st} → ${et}\n${conflict.description}`);
  }

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
  populateMonthFilter();
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
  document.getElementById('end').value = `${date}T16:45`;
  document.getElementById('description').value = '';
  document.getElementById('preset').value = '';
}

// Render
function render() {
  const list = document.getElementById('entryList');
  const filtered = getFilteredEntries();
  if (!filtered.length) {
    list.innerHTML = '<div class="empty">No entries yet</div>';
    document.getElementById('listSummary').textContent = 'Entries (0 total)';
    updateMenuState();
    return;
  }

  // Group by day
  const groups = [];
  let curDay = '';
  for (const e of filtered) {
    const s = new Date(e.start);
    const en = new Date(e.end);
    const ms = en - s;
    const day = s.toLocaleDateString('en-US', { weekday: 'short' });
    const date = s.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const dayKey = `${day} ${date}`;

    if (dayKey !== curDay) {
      groups.push({ dayKey, day, date, entries: [], totalMs: 0 });
      curDay = dayKey;
    }
    groups[groups.length - 1].entries.push(e);
    groups[groups.length - 1].totalMs += ms;
  }

  let totalMs = 0;
  let html = '';
  for (const g of groups) {
    totalMs += g.totalMs;
    html += `<div class="day-group"><div class="day-header">${g.dayKey} \u2014 ${fmtDuration(g.totalMs)}</div>`;
    for (const e of g.entries) {
      const s = new Date(e.start);
      const en = new Date(e.end);
      const ms = en - s;
      const startT = s.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const endT = en.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dur = fmtDuration(ms);

      html += `<div class="entry">
        <input type="checkbox" class="entry-check" data-id="${e.id}">
        <div class="entry-main">
          <div class="entry-date">${g.day} ${g.date}</div>
          <div class="entry-times">
              ${startT} → ${endT}
              <span class="entry-duration">${dur}</span>
          </div>
          <div class="entry-desc">${esc(e.description)}</div>
        </div>
        <div class="entry-actions">
          <button class="btn-icon" onclick="editEntry(${e.id})">Edit</button>
          <button class="btn-icon" onclick="deleteEntry(${e.id})">Del</button>
        </div>
      </div>`;
    }
    html += '</div>';
  }

  list.innerHTML = html;
  document.getElementById('listSummary').textContent =
    `Entries (${filtered.length} total, ${fmtDuration(totalMs)})`;
  updateMenuState();
}

// Toggle menu state on checkbox click
document.getElementById('entryList').addEventListener('click', (e) => {
  if (e.target.classList.contains('entry-check')) updateMenuState();
});

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

function getSelectedEntries() {
  const checks = document.querySelectorAll('.entry-check:checked');
  if (!checks.length) return [];
  const ids = [...checks].map(c => Number(c.dataset.id));
  return entries.filter(e => ids.includes(e.id));
}

function updateMenuState() {
  const checks = document.querySelectorAll('.entry-check:checked');
  const hasSelection = checks.length > 0;
  ['exportJson', 'exportCsv', 'email'].forEach(action => {
    const item = document.querySelector(`.hamburger-item[data-action="${action}"]`);
    if (item) item.disabled = !hasSelection;
  });
}

// Select All
document.getElementById('selectAllBtn').addEventListener('click', () => {
  const checks = document.querySelectorAll('.day-group .entry-check');
  const allChecked = [...checks].every(c => c.checked);
  checks.forEach(c => c.checked = !allChecked);
  document.getElementById('selectAllBtn').textContent = allChecked ? 'Select All' : 'Deselect All';
  updateMenuState();
});

// Hamburger menu
document.getElementById('hamburgerBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  updateMenuState();
  document.getElementById('hamburgerMenu').classList.toggle('open');
});

document.addEventListener('click', () => {
  document.getElementById('hamburgerMenu').classList.remove('open');
});

document.querySelectorAll('.hamburger-item').forEach(item => {
  item.addEventListener('click', () => {
    document.getElementById('hamburgerMenu').classList.remove('open');
    const action = item.dataset.action;
    if (action === 'exportJson') doExportJson();
    else if (action === 'exportCsv') doExportCsv();
    else if (action === 'email') doEmail();
    else if (action === 'import') document.getElementById('importFile').click();
  });
});

// Actions
function doExportJson() {
  const selected = getSelectedEntries();
  if (!selected.length) return alert('Select at least one entry.');
  const dados = {
    nomeServidor: config.nome,
    codigoServidor: config.codigo,
    registros: selected
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `horas-extras-${config.nome}-${config.codigo}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function doExportCsv() {
  const selected = getSelectedEntries();
  if (!selected.length) return alert('Select at least one entry.');
  const header = 'id,start,end,description,duration_min';
  const rows = selected.map(e => {
    const ms = new Date(e.end) - new Date(e.start);
    const min = Math.round(ms / 60000);
    return `${e.id},${e.start},${e.end},"${e.description.replace(/"/g, '""')}",${min}`;
  });
  const csv = '\ufeff' + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `horas-extras-${config.nome}-${config.codigo}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function doEmail() {
  const selected = getSelectedEntries();
  if (!selected.length) return alert('Select at least one entry.');
  selected.sort((a, b) => new Date(a.start) - new Date(b.start));

  const to = config.to;
  const cc = config.cc.join(',');

  const totalMs = selected.reduce((sum, e) => sum + (new Date(e.end) - new Date(e.start)), 0);

  let lines = selected.map(e => {
    const s = new Date(e.start);
    const en = new Date(e.end);
    const date = s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const startT = s.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endT = en.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dur = fmtDuration(en - s);
    return `  ${date}, ${startT} → ${endT} (${dur}): ${e.description}`;
  }).join("\n");

  const subject = `Horas extras - ${selected.length} registro(s)`;
  const body = `Bom dia, espero que este e-mail o(a) encontre bem,

Gostaria de registrar as seguintes horas extras:

${lines}

Total: ${fmtDuration(totalMs)}

Atenciosamente,
${config.nome}`;

  window.location.href =
    `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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
  populateMonthFilter();
  render();
};

// Persistence
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Import
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(reader.result);
      const incoming = Array.isArray(raw) ? raw : raw.registros;
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
      populateMonthFilter();
      render();
      alert(`Imported ${added} new entries.`);
    } catch { alert('Invalid JSON file.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

clearForm();
populateMonthFilter();
render();
