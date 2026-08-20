/**
 * admin.js — Admin console behavior
 */

// ---------- Simple demo auth ----------
const ADMIN_CREDENTIALS = { id: 'admin', pass: 'admin123' };

const loginScreen = document.getElementById('loginScreen');
const dashScreen = document.getElementById('dashScreen');
const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');

function showStatus(el, text, type) {
  el.textContent = text;
  el.className = 'status-msg show ' + type;
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('loginId').value.trim();
  const pass = document.getElementById('loginPass').value.trim();

  if (id === ADMIN_CREDENTIALS.id && pass === ADMIN_CREDENTIALS.pass) {
    sessionStorage.setItem('certify_admin_session', 'true');
    showStatus(loginMsg, 'Signed in successfully.', 'ok');
    setTimeout(enterDashboard, 300);
  } else {
    showStatus(loginMsg, 'Invalid login ID or password.', 'err');
  }
});

function enterDashboard() {
  loginScreen.classList.add('hidden');
  dashScreen.classList.remove('hidden');
  initDashboard();
}

// ---------- Dashboard state ----------
let roster = [];        // [{uid, name, ...}]
let rosterColumns = []; // detected column names
let templateImg = null; // HTMLImageElement
let fields = [];        // [{key,label,x,y,w,h,fontSize,color,font,align}]
let selectedFieldKey = null;
let dashInitialized = false;

const canvas = document.getElementById('tplCanvas');
const ctx = canvas.getContext('2d');
const editorCanvasWrap = document.getElementById('editorCanvasWrap');

if (sessionStorage.getItem('certify_admin_session') === 'true') {
  enterDashboard();
}

function initDashboard() {
  if (dashInitialized) return;
  dashInitialized = true;
  setupExcelUpload();
  setupTemplateUpload();
  setupFieldControls();
  setupPublish();
  loadExistingIfAny();
}

function loadExistingIfAny() {
  const existingRoster = CertifyStore.getRoster();
  if (existingRoster.length) {
    roster = existingRoster;
    rosterColumns = Object.keys(roster[0]).filter(k => k !== 'uid' && k !== 'name');
    renderRosterTable();
    populateFieldSelect();
    document.getElementById('excelChip').classList.add('show');
    document.getElementById('excelFileName').textContent = `${roster.length} records loaded (saved)`;
  }

  const savedImg = CertifyStore.getTemplateImage();
  if (savedImg) {
    const img = new Image();
    img.onload = () => {
      templateImg = img;
      drawCanvasBase();
      const savedScale = canvas.width / templateImg.width;
      fields = CertifyStore.getFields().map(field => ({
        ...field,
        x: field.x * savedScale,
        y: field.y * savedScale,
        w: field.w * savedScale,
        h: field.h * savedScale,
        fontSize: field.fontSize * savedScale
      }));
      renderFieldBoxes();
      document.getElementById('tplChip').classList.add('show');
      document.getElementById('tplFileName').textContent = 'Template loaded (saved)';
      document.getElementById('editorHint').textContent = 'Drag boxes to reposition. Click a box to edit its style.';
    };
    img.src = savedImg;
  }
}

// ---------- Excel upload ----------
function setupExcelUpload() {
  const drop = document.getElementById('excelDrop');
  const input = document.getElementById('excelInput');
  const chip = document.getElementById('excelChip');
  const fname = document.getElementById('excelFileName');
  const clearBtn = document.getElementById('excelClear');

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleExcelFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('change', () => {
    if (input.files[0]) handleExcelFile(input.files[0]);
  });
  clearBtn.addEventListener('click', () => {
    roster = [];
    rosterColumns = [];
    chip.classList.remove('show');
    input.value = '';
    renderRosterTable();
    populateFieldSelect();
  });

  function handleExcelFile(file) {
    if (typeof XLSX === 'undefined') {
      alert('The Excel parser could not be loaded. Connect to the internet and reload the admin page, then try again.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!json.length) {
          alert('The file appears to be empty.');
          return;
        }

        // Normalize keys to lowercase, find uid/name columns flexibly
        const normalized = json.map(row => {
          const out = {};
          Object.keys(row).forEach(k => {
            out[k.trim().toLowerCase()] = row[k];
          });
          return out;
        });

        const sampleKeys = Object.keys(normalized[0]);
        const uidKey = sampleKeys.find(k => ['uid', 'id', 'studentid', 'student id', 'ui path id', 'participant id'].includes(k)) || sampleKeys[0];
        const nameKey = sampleKeys.find(k => ['name', 'fullname', 'full name', 'student name'].includes(k)) || sampleKeys[1];

        roster = normalized.map(row => {
          const rest = { ...row };
          delete rest[uidKey];
          delete rest[nameKey];
          return { uid: String(row[uidKey]).trim(), name: String(row[nameKey]).trim(), ...rest };
        }).filter(r => r.uid && r.name);

        rosterColumns = roster.length ? Object.keys(roster[0]).filter(k => k !== 'uid' && k !== 'name') : [];

        fname.textContent = `${file.name} — ${roster.length} records`;
        chip.classList.add('show');
        renderRosterTable();
        populateFieldSelect();
      } catch (err) {
        alert('Could not parse this file. Please upload a valid .xlsx or .csv file.');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

function renderRosterTable() {
  const body = document.getElementById('rosterBody');
  const countNote = document.getElementById('rosterCount');
  body.innerHTML = '';
  roster.slice(0, 50).forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(r.uid)}</td><td>${escapeHtml(r.name)}</td><td><span class="badge">Ready</span></td>`;
    body.appendChild(tr);
  });
  countNote.textContent = roster.length
    ? `${roster.length} record${roster.length !== 1 ? 's' : ''} loaded${roster.length > 50 ? ' (showing first 50)' : ''}.`
    : '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Template upload ----------
function setupTemplateUpload() {
  const drop = document.getElementById('tplDrop');
  const input = document.getElementById('tplInput');
  const chip = document.getElementById('tplChip');
  const fname = document.getElementById('tplFileName');
  const clearBtn = document.getElementById('tplClear');

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('drag');
    if (e.dataTransfer.files[0]) handleTemplateFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) handleTemplateFile(input.files[0]);
  });
  clearBtn.addEventListener('click', () => {
    templateImg = null;
    fields = [];
    chip.classList.remove('show');
    input.value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0; canvas.height = 0;
    document.querySelectorAll('.field-box').forEach(el => el.remove());
  });

  function handleTemplateFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG or JPG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        templateImg = img;
        drawCanvasBase();
        fname.textContent = file.name;
        chip.classList.add('show');
        document.getElementById('editorHint').textContent = 'Drag boxes to reposition. Click a box to edit its style.';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function drawCanvasBase() {
  // Cap display width for usability, keep aspect ratio
  const maxW = 700;
  const scale = Math.min(1, maxW / templateImg.width);
  canvas.width = templateImg.width * scale;
  canvas.height = templateImg.height * scale;
  ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
}

// ---------- Field placement ----------
function populateFieldSelect() {
  const select = document.getElementById('addFieldSelect');
  select.innerHTML = '<option value="">+ Add field…</option>';

  const options = [{ key: 'name', label: 'Name' }, { key: 'uid', label: 'UID' }];
  rosterColumns.forEach(col => options.push({ key: col, label: col }));

  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.key;
    o.textContent = opt.label;
    select.appendChild(o);
  });
}

function setupFieldControls() {
  const select = document.getElementById('addFieldSelect');
  select.addEventListener('change', () => {
    const key = select.value;
    if (!key) return;
    if (fields.find(f => f.key === key)) {
      alert('That field is already on the certificate.');
      select.value = '';
      return;
    }
    if (!templateImg) {
      alert('Upload a template image first.');
      select.value = '';
      return;
    }
    const newField = {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      x: canvas.width * 0.5 - 80,
      y: canvas.height * 0.5 - 20,
      w: 160,
      h: 40,
      fontSize: 36,
      color: '#1b2a24',
      font: "'Fraunces', serif",
      align: 'center'
    };
    fields.push(newField);
    renderFieldBoxes();
    selectField(key);
    select.value = '';
  });

  document.getElementById('fontSizeRange').addEventListener('input', (e) => {
    updateSelectedField({ fontSize: parseInt(e.target.value, 10) });
  });
  document.getElementById('fontColorInput').addEventListener('input', (e) => {
    updateSelectedField({ color: e.target.value });
  });
  document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
    updateSelectedField({ font: e.target.value });
  });
  document.getElementById('fontAlignSelect').addEventListener('change', (e) => {
    updateSelectedField({ align: e.target.value });
  });
}

function updateSelectedField(patch) {
  const f = fields.find(f => f.key === selectedFieldKey);
  if (!f) return;
  Object.assign(f, patch);
  renderFieldBoxes();
}

function renderFieldBoxes() {
  document.querySelectorAll('.field-box').forEach(el => el.remove());
  const displayScale = editorCanvasWrap.getBoundingClientRect().width / canvas.width;

  fields.forEach(field => {
    const box = document.createElement('div');
    box.className = 'field-box';
    box.style.left = field.x * displayScale + 'px';
    box.style.top = field.y * displayScale + 'px';
    box.style.width = field.w * displayScale + 'px';
    box.style.height = field.h * displayScale + 'px';
    box.textContent = `{{${field.label}}}`;
    box.dataset.key = field.key;
    if (field.key === selectedFieldKey) {
      box.style.borderColor = '#3c6e47';
      box.style.background = 'rgba(60,110,71,0.1)';
    }

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    box.appendChild(handle);

    box.addEventListener('pointerdown', (e) => {
      if (e.target === handle) return;
      e.preventDefault();
      selectField(field.key, false);
      document.querySelectorAll('.field-box').forEach(item => item.classList.remove('selected'));
      box.classList.add('selected');
      box.setPointerCapture(e.pointerId);
      dragField(field, box, e);
    });
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectField(field.key, false);
      document.querySelectorAll('.field-box').forEach(item => item.classList.remove('selected'));
      box.classList.add('selected');
      handle.setPointerCapture(e.pointerId);
      resizeField(field, box, handle, e);
    });

    editorCanvasWrap.appendChild(box);
  });
}

function dragField(field, box, startEvent) {
  const displayScale = editorCanvasWrap.getBoundingClientRect().width / canvas.width;
  const startX = startEvent.clientX;
  const startY = startEvent.clientY;
  const origX = field.x;
  const origY = field.y;
  let frameId = 0;

  function onMove(e) {
    let newX = origX + (e.clientX - startX) / displayScale;
    let newY = origY + (e.clientY - startY) / displayScale;
    newX = Math.max(0, Math.min(newX, canvas.width - field.w));
    newY = Math.max(0, Math.min(newY, canvas.height - field.h));
    field.x = newX;
    field.y = newY;
    if (!frameId) {
      frameId = requestAnimationFrame(() => {
        box.style.left = field.x * displayScale + 'px';
        box.style.top = field.y * displayScale + 'px';
        frameId = 0;
      });
    }
  }
  function onUp() {
    box.removeEventListener('pointermove', onMove);
    box.removeEventListener('pointerup', onUp);
    box.removeEventListener('pointercancel', onUp);
    if (frameId) cancelAnimationFrame(frameId);
    box.style.left = field.x * displayScale + 'px';
    box.style.top = field.y * displayScale + 'px';
  }
  box.addEventListener('pointermove', onMove);
  box.addEventListener('pointerup', onUp);
  box.addEventListener('pointercancel', onUp);
}

function resizeField(field, box, handle, startEvent) {
  const displayScale = editorCanvasWrap.getBoundingClientRect().width / canvas.width;
  const startX = startEvent.clientX;
  const startY = startEvent.clientY;
  const origW = field.w;
  const origH = field.h;
  let frameId = 0;

  function onMove(e) {
    let newW = Math.max(40, origW + (e.clientX - startX) / displayScale);
    let newH = Math.max(20, origH + (e.clientY - startY) / displayScale);
    newW = Math.min(newW, canvas.width - field.x);
    newH = Math.min(newH, canvas.height - field.y);
    field.w = newW;
    field.h = newH;
    if (!frameId) {
      frameId = requestAnimationFrame(() => {
        box.style.width = field.w * displayScale + 'px';
        box.style.height = field.h * displayScale + 'px';
        frameId = 0;
      });
    }
  }
  function onUp() {
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
    if (frameId) cancelAnimationFrame(frameId);
    box.style.width = field.w * displayScale + 'px';
    box.style.height = field.h * displayScale + 'px';
  }
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
}

function selectField(key, redraw = true) {
  selectedFieldKey = key;
  const f = fields.find(f => f.key === key);
  document.getElementById('selectedFieldLabel').textContent = f ? f.label : 'none';
  const controls = document.getElementById('styleControls');
  if (f) {
    controls.style.display = 'flex';
    document.getElementById('fontSizeRange').value = f.fontSize;
    document.getElementById('fontColorInput').value = f.color;
    document.getElementById('fontFamilySelect').value = f.font;
    document.getElementById('fontAlignSelect').value = f.align;
  } else {
    controls.style.display = 'none';
  }
  if (redraw) renderFieldBoxes();
}

// ---------- Publish ----------
function setupPublish() {
  document.getElementById('saveLayoutBtn').addEventListener('click', async () => {
    const saveMsg = document.getElementById('saveMsg');

    if (!templateImg) {
      showStatus(saveMsg, 'Please upload a certificate template first.', 'err');
      return;
    }
    if (!roster.length) {
      showStatus(saveMsg, 'Please upload a roster (Excel/CSV) first.', 'err');
      return;
    }
    if (!fields.length) {
      showStatus(saveMsg, 'Add at least one field (e.g. Name) to the template.', 'err');
      return;
    }

    // Store field coordinates relative to the ORIGINAL image resolution,
    // so it renders correctly regardless of editor canvas scale.
    const scaleFactor = templateImg.width / canvas.width;
    const scaledFields = fields.map(f => ({
      ...f,
      x: f.x * scaleFactor,
      y: f.y * scaleFactor,
      w: f.w * scaleFactor,
      h: f.h * scaleFactor,
      fontSize: f.fontSize * scaleFactor
    }));

    try {
      await CertifyStore.publish({
        image: templateImg.src,
        dims: { w: templateImg.width, h: templateImg.height },
        fields: scaledFields,
        roster
      });
      showStatus(saveMsg, `Published. ${roster.length} records and ${fields.length} field(s) are live on the student page.`, 'ok');
    } catch (error) {
      showStatus(saveMsg, 'Could not publish to Netlify. Check the deployment and try again.', 'err');
      console.error(error);
    }
  });
}
