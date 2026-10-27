// The spike's probe. Each test fills one row of a table and one entry of the report. The report
// goes to the app after each change (the app writes it to a file) and to the clipboard on Copy.
// The page also opens in a browser, for a look at it: the tests that need the app then fail.

const REPORT = { spike: null, url: location.href, origin: location.origin, userAgent: navigator.userAgent,
  time: new Date().toISOString(), tests: {} };

// ----- The app -----

const hasApp = () => !!(window.webkit && webkit.messageHandlers && webkit.messageHandlers.spike);
// Page to app: resolves with the app's reply.
function native(op, extra) {
  if (!hasApp()) return Promise.reject(new Error('No message handler. Open this page in the spike app.'));
  return webkit.messageHandlers.spike.postMessage(Object.assign({ op }, extra));
}
// App to page: the app calls window.spikeEvent(m).
const listeners = new Set();
window.spikeEvent = m => listeners.forEach(f => f(m));
// Wait for the first event that pass(m) accepts, for up to ms.
function nextEvent(pass, ms, what) {
  return new Promise((ok, bad) => {
    const f = m => { if (pass(m)) { listeners.delete(f); clearTimeout(t); ok(m); } };
    const t = setTimeout(() => { listeners.delete(f); bad(new Error(`No ${what} in ${ms / 1000} s.`)); }, ms);
    listeners.add(f);
  });
}
function withTimeout(p, ms, what) {
  return Promise.race([p, new Promise((_, bad) => setTimeout(() => bad(new Error(`${what} took more than ${ms / 1000} s.`)), ms))]);
}
const errText = e => (e && (e.name && e.name !== 'Error' ? e.name + ': ' : '') + (e.message || e)) || String(e);
const ms = t => `${Math.round(t)} ms`;

// ----- The table and the report -----

const rows = {};
let sendTimer = null;
function row(table, t) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td class="name"></td><td class="status"></td><td class="act"></td><td class="detail"></td>`;
  tr.cells[0].textContent = t.name;
  const q = document.createElement('small'); q.textContent = t.ask; tr.cells[0].appendChild(q);
  if (t.button) {
    const b = document.createElement('button');
    b.textContent = t.button; b.title = t.button;
    b.onclick = () => runTest(t);
    tr.cells[2].appendChild(b);
  }
  document.getElementById(table).appendChild(tr);
  rows[t.id] = tr;
  set(t.id, t.button ? 'wait' : 'run', t.button ? 'Not run yet.' : 'Running.');
}
const LABEL = { pass: 'Pass', fail: 'Fail', wait: 'Waiting', info: 'Info', run: 'Running' };
function set(id, status, detail) {
  REPORT.tests[id] = { status, detail: String(detail) };
  const tr = rows[id];
  if (tr) {
    tr.cells[1].textContent = LABEL[status] || status;
    tr.cells[1].className = 'status ' + status;
    tr.cells[3].textContent = String(detail);
  }
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => { if (hasApp()) native('report', { report: REPORT }).catch(() => {}); }, 300);
}
async function runTest(t) {
  set(t.id, 'run', 'Running.');
  try { const [status, detail] = await t.run(); set(t.id, status, detail); }
  catch (e) { set(t.id, 'fail', errText(e)); }
}

// ----- Storage that must outlive a quit -----

// The first launch that wrote here, kept by the store. It passes once a later launch reads it.
function persisted(first, launch, store) {
  if (!launch) return ['fail', 'The app did not give a launch number.'];
  if (first < launch) return ['pass', `${store} written in launch ${first}, read in launch ${launch}.`];
  return ['wait', `${store} written in launch ${launch}. Quit the app with Cmd+Q, open it again, and open this page at the same origin.`];
}
function idbFirst(launch) {
  return new Promise((ok, bad) => {
    const rq = indexedDB.open('spike', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
    rq.onerror = () => bad(rq.error || new Error('indexedDB.open failed.'));
    rq.onsuccess = () => {
      const db = rq.result, tx = db.transaction('kv', 'readwrite'), kv = tx.objectStore('kv');
      const g = kv.get('first');
      g.onsuccess = () => { if (g.result == null) kv.put(launch, 'first'); tx.oncomplete = () => { db.close(); ok(g.result == null ? launch : g.result); }; };
      g.onerror = () => bad(g.error);
    };
  });
}

// ----- The tests -----

let INFO = {};
const AUTO = [
  { id: 'secure', name: 'Secure context', ask: 'Is this origin a secure context?',
    run: async () => [isSecureContext ? 'pass' : 'fail', `isSecureContext is ${isSecureContext} at ${location.origin}.`] },
  { id: 'apis', name: 'Web APIs', ask: 'Which APIs does the page see?',
    run: async () => {
      const yes = b => b ? 'yes' : 'no';
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      return ['info', [`mediaDevices: ${yes(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)}`,
        `crypto.subtle: ${yes(window.crypto && crypto.subtle)}`, `SpeechRecognition: ${yes(R)}`,
        `clipboard: ${yes(navigator.clipboard)}`, `Web Bluetooth: ${yes(navigator.bluetooth)}`,
        `serviceWorker: ${yes(navigator.serviceWorker)}`, `storage.persist: ${yes(navigator.storage && navigator.storage.persist)}`].join('; ')];
    } },
  { id: 'agent', name: 'User agent', ask: 'Can the page tell it is in the app?',
    run: async () => [/TwistwrightSpike\//.test(navigator.userAgent) ? 'pass' : 'fail', navigator.userAgent] },
  { id: 'local', name: 'localStorage', ask: 'Does it outlive a quit?',
    run: async () => {
      let first = +localStorage.getItem('spike:first') || 0;
      if (!first && INFO.launch) { localStorage.setItem('spike:first', INFO.launch); first = INFO.launch; }
      return persisted(first, INFO.launch, 'localStorage');
    } },
  { id: 'idb', name: 'IndexedDB', ask: 'Does it outlive a quit?',
    run: async () => INFO.launch ? persisted(await idbFirst(INFO.launch), INFO.launch, 'IndexedDB') : ['fail', 'The app did not give a launch number.'] },
  { id: 'fetch', name: 'fetch', ask: 'Does fetch() read a file at this origin?',
    run: async () => {
      const r = await fetch('data.json', { cache: 'no-store' });
      const j = await r.json();
      return [r.ok && j.ok === true ? 'pass' : 'fail', `Status ${r.status}, ${r.headers.get('content-type') || 'no content type'}.`];
    } },
  { id: 'import', name: 'Dynamic import', ask: 'Does import() load a module?',
    run: async () => { const m = await import('./dep.js'); return [m.answer === 42 ? 'pass' : 'fail', `answer is ${m.answer}.`]; } },
  { id: 'worker', name: 'Module worker', ask: 'Does a module worker load, with an import of its own?',
    run: () => new Promise(ok => {
      let w;
      try { w = new Worker('worker.js', { type: 'module' }); } catch (e) { ok(['fail', errText(e)]); return; }
      const t = setTimeout(() => { w.terminate(); ok(['fail', 'No answer in 5 s.']); }, 5000);
      w.onmessage = e => { clearTimeout(t); w.terminate(); ok([e.data.result === 40 ? 'pass' : 'fail', `20 doubled is ${e.data.result}; the worker's origin is ${e.data.origin}.`]); };
      w.onerror = e => { clearTimeout(t); w.terminate(); ok(['fail', e.message || 'The worker failed to load.']); };
      w.postMessage(20);
    }) },
  { id: 'blobworker', name: 'Blob worker', ask: 'Does a worker from a blob URL run?',
    run: () => new Promise(ok => {
      const u = URL.createObjectURL(new Blob(['self.onmessage = e => self.postMessage(e.data + 1);'], { type: 'text/javascript' }));
      let w;
      try { w = new Worker(u); } catch (e) { ok(['fail', errText(e)]); return; }
      const t = setTimeout(() => { w.terminate(); ok(['fail', 'No answer in 5 s.']); }, 5000);
      w.onmessage = e => { clearTimeout(t); w.terminate(); ok([e.data === 2 ? 'pass' : 'fail', `1 plus 1 is ${e.data}.`]); };
      w.onerror = e => { clearTimeout(t); w.terminate(); ok(['fail', e.message || 'The worker failed.']); };
      w.postMessage(1);
    }) },
  { id: 'cubing', name: 'cubing.js', ask: 'Do random-state scrambles work (the import and its search worker)?',
    run: async () => {
      const at = p => new URL('../vendor/cubing/' + p, location.href).href;
      const t0 = performance.now();
      let lib, search;
      try { [lib, search] = await Promise.all([import(at('scramble/index.js')), import(at('search/index.js'))]); }
      catch (e) { return ['fail', `The import failed: ${errText(e)}. Is vendor/ in the app? Run scripts/vendor.js, then build again.`]; }
      search.setSearchDebug({ logPerf: false, scramblePrefetchLevel: 'none' });
      const t1 = performance.now();
      const alg = await withTimeout(lib.randomScrambleForEvent('333'), 60000, 'The 3x3 scramble');
      return ['pass', `Import ${ms(t1 - t0)}; 3x3 scramble ${ms(performance.now() - t1)}: ${alg}`];
    } },
  { id: 'echo', name: 'Bridge: page to app', ask: 'How fast is a round trip through the message handler?',
    run: async () => {
      const n = 200, times = [];
      for (let i = 0; i < n; i++) {
        const t = performance.now();
        const r = await native('echo', { i, data: 'f1e2d3c4b5a69788' });
        if (r.i !== i) return ['fail', `Round trip ${i} came back as ${r.i}.`];
        times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      return ['pass', `${n} round trips. Median ${times[n >> 1].toFixed(2)} ms, 95th percentile ${times[Math.floor(n * 0.95)].toFixed(2)} ms.`];
    } },
  { id: 'burst', name: 'Bridge: app to page', ask: 'Do events from callAsyncJavaScript arrive, in order, and how fast?',
    run: async () => {
      const n = 500;
      let got = 0, wrong = -1;
      const t = performance.now();
      const done = nextEvent(m => { if (m.ev !== 'tick') return false; if (m.i !== got && wrong < 0) wrong = got; got++; return got === n; }, 10000, `${n} events`);
      await native('burst', { n });
      try { await done; } catch (e) { return ['fail', `${got} of ${n} events in 10 s.`]; }
      return [wrong < 0 ? 'pass' : 'fail', wrong < 0 ? `${n} events in order in ${ms(performance.now() - t)}.` : `Event ${wrong} came out of order.`];
    } },
];

let camStream = null;
const MANUAL = [
  { id: 'camera', name: 'Camera', ask: 'Does getUserMedia reach the camera? (Scan my cube)', button: 'Start the camera',
    run: async () => {
      if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      camStream = s;
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = s;
      rows.camera.cells[2].appendChild(v);
      setTimeout(() => { s.getTracks().forEach(t => t.stop()); v.remove(); }, 8000);
      const tr = s.getVideoTracks()[0], st = tr.getSettings();
      return ['pass', `${tr.label}, ${st.width}x${st.height}. The preview stops after 8 s.`];
    } },
  { id: 'mic', name: 'Microphone', ask: 'Does getUserMedia reach the microphone? (Listen)', button: 'Start the microphone',
    run: async () => {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tr = s.getAudioTracks()[0], label = tr.label;
      s.getTracks().forEach(t => t.stop());
      return ['pass', `${label}.`];
    } },
  { id: 'speech', name: 'Speech recognition', ask: 'Does webkitSpeechRecognition work? Say "T perm".', button: 'Listen',
    run: () => new Promise(ok => {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) { ok(['fail', 'There is no SpeechRecognition in this page. The fallback is a native SFSpeechRecognizer bridge.']); return; }
      const r = new R();
      r.lang = 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 3;
      let heard = '', failed = '';
      set('speech', 'run', 'Listening. Say "T perm".');
      r.onresult = e => {
        heard = Array.from(e.results).map(x => x[0].transcript).join(' ');
        set('speech', 'run', `Heard so far: "${heard}"`);
      };
      r.onerror = e => { failed = e.error || 'unknown'; };
      r.onend = () => ok(failed ? ['fail', `Error: ${failed}${heard ? `, after "${heard}"` : ''}.`]
        : heard ? ['pass', `Heard "${heard}".`] : ['fail', 'The recognizer ended with no result and no error.']);
      try { r.start(); } catch (e) { ok(['fail', errText(e)]); }
      setTimeout(() => { try { r.stop(); } catch (e) {} }, 10000);
    }) },
  { id: 'clipboard', name: 'Clipboard', ask: 'Does navigator.clipboard write and read? (Copy state)', button: 'Copy, then read',
    run: async () => {
      const text = 'spike ' + Date.now();
      try { await navigator.clipboard.writeText(text); } catch (e) { return ['fail', `writeText: ${errText(e)}`]; }
      let read;
      try { read = await navigator.clipboard.readText(); } catch (e) { return ['pass', `writeText works. readText: ${errText(e)}. The site only writes.`]; }
      return [read === text ? 'pass' : 'fail', read === text ? 'writeText and readText both work.' : `Read back "${read}".`];
    } },
  { id: 'paste', name: 'Paste', ask: 'Does Cmd+V reach the page? (The Edit menu)', button: null },
  { id: 'download', name: 'Download', ask: 'Does an a[download] of a blob save a file? (Save image)', button: 'Save a PNG',
    run: async () => {
      const c = document.createElement('canvas'); c.width = c.height = 96;
      const g = c.getContext('2d');
      ['#ffffff', '#b71234', '#009b48', '#ffd500', '#ff5800', '#0046ad', '#ffffff', '#009b48', '#b71234'].forEach((col, i) => {
        g.fillStyle = col; g.fillRect((i % 3) * 32 + 1, Math.floor(i / 3) * 32 + 1, 30, 30);
      });
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
      const ev = nextEvent(m => m.ev === 'download', 120000, 'download event');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'spike.png';
      document.body.appendChild(a); a.click(); a.remove();
      set('download', 'run', 'Pick a place in the save panel.');
      const m = await ev;
      return [m.state === 'finished' ? 'pass' : 'fail', `${m.state}: ${m.file}${m.error ? ', ' + m.error : ''}.`];
    } },
  { id: 'external', name: 'Link out', ask: 'Does a target="_blank" link open the default browser?', button: 'Open twistwright.com',
    run: async () => {
      const ev = nextEvent(m => m.ev === 'external', 5000, 'event from the app');
      const a = document.createElement('a');
      a.href = 'https://www.twistwright.com/'; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      const m = await ev;
      return ['pass', `The app sent ${m.url} to the default browser. Check that it opened and that this window stayed here.`];
    } },
  { id: 'dialog', name: 'Dialogs', ask: 'Do confirm() and alert() show a dialog?', button: 'Show a confirm',
    run: async () => {
      const t = performance.now();
      const v = confirm('Twistwright spike: press OK.');
      const dt = performance.now() - t;
      if (dt < 150) return ['fail', `confirm() returned ${v} after ${ms(dt)}: no dialog showed.`];
      return [v ? 'pass' : 'fail', `confirm() returned ${v} after ${ms(dt)}.`];
    } },
  { id: 'file', name: 'File input', ask: 'Does <input type="file"> open a panel?', button: 'Choose a file',
    run: () => new Promise(ok => {
      const i = document.createElement('input'); i.type = 'file';
      i.onchange = () => { const f = i.files[0]; ok(f ? ['pass', `${f.name}, ${f.size} bytes.`] : ['fail', 'No file.']); };
      i.click();
      set('file', 'run', 'Pick a file in the panel. Cancel leaves this row as it is.');
    }) },
];

// ----- Start -----

async function runAuto() {
  for (const t of AUTO) await runTest(t);
}
async function start() {
  try {
    INFO = await native('info');
    REPORT.spike = INFO;
    document.getElementById('meta').textContent = `Spike ${INFO.version} · launch ${INFO.launch} · ${INFO.origin === 'scheme' ? 'custom scheme' : 'loopback'} origin ${location.origin} · macOS ${INFO.macos}. The app writes the report to ${INFO.reports}.`;
  } catch (e) {
    document.getElementById('meta').textContent = `${errText(e)} Origin ${location.origin}.`;
  }
  AUTO.forEach(t => row('auto', t));
  MANUAL.forEach(t => row('manual', t));
  set('paste', 'wait', 'Not tried yet.');
  document.getElementById('pasteBox').addEventListener('paste', e => {
    const t = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    set('paste', t ? 'pass' : 'fail', t ? `Paste reached the page: ${t.length} characters.` : 'A paste event came with no text.');
  });
  document.getElementById('again').onclick = runAuto;
  document.getElementById('copy').onclick = async () => {
    const text = JSON.stringify(REPORT, null, 2);
    try { await navigator.clipboard.writeText(text); document.getElementById('copy').textContent = 'Copied'; }
    catch (e) { document.getElementById('copy').textContent = 'Copy failed: use Spike > Copy the reports'; }
    setTimeout(() => { document.getElementById('copy').textContent = 'Copy the report'; }, 2000);
  };
  document.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => { location.href = b.dataset.go; }; });
  await runAuto();
}
start();
