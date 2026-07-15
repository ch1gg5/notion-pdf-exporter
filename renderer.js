const DOM = {
  sourceInput: document.getElementById('sourceInput'),
  outputInput: document.getElementById('outputInput'),
  sourceBrowse: document.getElementById('sourceBrowse'),
  outputBrowse: document.getElementById('outputBrowse'),
  sourceStatus: document.getElementById('sourceStatus'),
  outputStatus: document.getElementById('outputStatus'),
  convertBtn: document.getElementById('convertBtn'),
  abortBtn: document.getElementById('abortBtn'),
  progressSection: document.getElementById('progressSection'),
  progressText: document.getElementById('progressText'),
  progressCount: document.getElementById('progressCount'),
  progressFill: document.getElementById('progressFill'),
  log: document.getElementById('log'),
  summary: document.getElementById('summary'),
  statusIndicator: document.getElementById('statusIndicator'),
};

const State = {
  isConverting: false,
  totalFiles: 0,
  processedFiles: 0,
  errors: 0,
  startTime: null,
};

function logLine(text, cls = '') {
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text + '\n';
  DOM.log.appendChild(span);
  DOM.log.scrollTop = DOM.log.scrollHeight;
}

function updateProgress() {
  const pct = State.totalFiles > 0 ? (State.processedFiles / State.totalFiles) * 100 : 0;
  DOM.progressFill.style.width = `${Math.min(pct, 100)}%`;
  DOM.progressCount.textContent = `${State.processedFiles} / ${State.totalFiles}`;
  
  if (State.startTime) {
    const elapsed = (Date.now() - State.startTime) / 1000;
    DOM.progressText.textContent = `Processing… ${Math.round(elapsed)}s elapsed`;
  }
}

function setStatus(color, text) {
  DOM.statusIndicator.style.backgroundColor = color;
  DOM.statusIndicator.title = text;
}

async function validateAndBrowse(inputId, statusId, title) {
  const path = await window.electronAPI.pickFolder();
  if (!path) return;

  const input = document.getElementById(inputId);
  input.value = path;

  const result = await window.electronAPI.validatePath(path);
  const statusEl = document.getElementById(statusId);
  if (result.valid) {
    statusEl.textContent = '✓ Valid folder';
    statusEl.style.color = '#276749';
  } else {
    statusEl.textContent = '✗ Invalid folder';
    statusEl.style.color = '#9B2335';
  }

  if (inputId === 'sourceInput' && result.valid) {
    try {
      const count = await window.electronAPI.countHtmlFiles(path);
      statusEl.textContent = `✓ ${count} HTML file${count !== 1 ? 's' : ''} found`;
      State.totalFiles = count;
    } catch (err) {
      statusEl.textContent = `⚠ ${err.message}`;
    }
  }
  updateConvertButton();
}

function updateConvertButton() {
  const source = DOM.sourceInput.value.trim();
  const output = DOM.outputInput.value.trim();
  const isValid = source && output && State.totalFiles > 0 && !State.isConverting;
  DOM.convertBtn.disabled = !isValid;
  DOM.abortBtn.style.display = State.isConverting ? 'inline-block' : 'none';
  
  if (State.isConverting) {
    DOM.convertBtn.textContent = '⏳ Converting…';
  } else if (State.totalFiles > 0 && source && output) {
    DOM.convertBtn.textContent = `Convert ${State.totalFiles} files to PDF`;
  } else {
    DOM.convertBtn.textContent = 'Select source and output folders';
  }
}

async function startConversion() {
  const source = DOM.sourceInput.value.trim();
  const output = DOM.outputInput.value.trim();

  if (!source || !output) {
    alert('Please fill in both folders.');
    return;
  }

  const sourceValid = await window.electronAPI.validatePath(source);
  if (!sourceValid.valid) {
    alert('Source folder is invalid.');
    return;
  }

  try {
    State.totalFiles = await window.electronAPI.countHtmlFiles(source);
  } catch (err) {
    alert(`Failed to scan: ${err.message}`);
    return;
  }

  if (State.totalFiles === 0) {
    alert('No HTML files found.');
    return;
  }

  State.isConverting = true;
  State.processedFiles = 0;
  State.errors = 0;
  State.startTime = Date.now();

  DOM.progressSection.style.display = 'block';
  DOM.summary.style.display = 'none';
  DOM.log.innerHTML = '';
  DOM.convertBtn.disabled = true;
  DOM.abortBtn.style.display = 'inline-block';
  setStatus('#F6AD55', 'Converting…');

  logLine(`▶ Starting conversion of ${State.totalFiles} files…`, 'log-info');

  window.electronAPI.removeAllListeners();

  window.electronAPI.onProgress((data) => {
    if (data.type === 'progress') {
      State.processedFiles = data.current;
      updateProgress();
    } else if (data.type === 'done') {
      State.isConverting = false;
      const msg = `✅ Done — ${data.converted} converted, ${data.errors} errors`;
      logLine(msg, 'log-ok');
      DOM.summary.style.display = 'block';
      DOM.summary.className = 'success';
      DOM.summary.textContent = msg;
      setStatus('#48BB78', 'Done');
      DOM.convertBtn.disabled = false;
      DOM.abortBtn.style.display = 'none';
      DOM.convertBtn.textContent = 'Convert to PDF';
    } else if (data.type === 'error') {
      State.errors++;
      logLine(`❌ ${data.file}: ${data.message}`, 'log-err');
    }
  });

  window.electronAPI.onLog((message) => logLine(message, ''));
  window.electronAPI.onError((message) => logLine(`❌ ${message}`, 'log-err'));

  window.electronAPI.onDone((code) => {
    if (code !== 0) {
      logLine(`⚠ Process exited with code ${code}`, 'log-err');
      State.isConverting = false;
      DOM.convertBtn.disabled = false;
      DOM.abortBtn.style.display = 'none';
      DOM.convertBtn.textContent = 'Convert to PDF';
      setStatus('#FC8181', 'Error');
    }
  });

  try {
    await window.electronAPI.startConversion(source, output);
  } catch (err) {
    logLine(`❌ Failed: ${err.message}`, 'log-err');
    State.isConverting = false;
    DOM.convertBtn.disabled = false;
    DOM.abortBtn.style.display = 'none';
    DOM.convertBtn.textContent = 'Convert to PDF';
  }
}

async function abortConversion() {
  if (!State.isConverting) return;
  const aborted = await window.electronAPI.abortConversion();
  if (aborted) {
    logLine('⏹ Aborted by user.', 'log-warn');
    State.isConverting = false;
    DOM.convertBtn.disabled = false;
    DOM.abortBtn.style.display = 'none';
    DOM.convertBtn.textContent = 'Convert to PDF';
    setStatus('#ED8936', 'Aborted');
  }
}

DOM.sourceBrowse.addEventListener('click', () => validateAndBrowse('sourceInput', 'sourceStatus', 'Select Notion export folder'));
DOM.outputBrowse.addEventListener('click', () => validateAndBrowse('outputInput', 'outputStatus', 'Select output folder'));
DOM.convertBtn.addEventListener('click', startConversion);
DOM.abortBtn.addEventListener('click', abortConversion);

// Drag and drop support
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

DOM.sourceInput.addEventListener('dragover', (e) => e.preventDefault());
DOM.sourceInput.addEventListener('drop', (e) => {
  e.preventDefault();
  const entry = e.dataTransfer.items[0]?.webkitGetAsEntry();
  if (entry && entry.isDirectory) {
    DOM.sourceInput.value = entry.fullPath || entry.name;
    DOM.sourceInput.dispatchEvent(new Event('blur'));
  }
});

DOM.outputInput.addEventListener('dragover', (e) => e.preventDefault());
DOM.outputInput.addEventListener('drop', (e) => {
  e.preventDefault();
  const entry = e.dataTransfer.items[0]?.webkitGetAsEntry();
  if (entry && entry.isDirectory) {
    DOM.outputInput.value = entry.fullPath || entry.name;
    DOM.outputInput.dispatchEvent(new Event('blur'));
  }
});

updateConvertButton();