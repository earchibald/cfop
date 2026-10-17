#!/usr/bin/env node
// Build page.html for the Smart Cube Horizons artifact from template.html,
// findings.json and CHANGELOG.md. No dependencies.
//
//   node docs/smart-cube-vision/build.js
//
// Then publish page.html to the artifact URL named in README.md.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// Inline marks in a changelog line: `code`, F-NN links.
const inline = s => esc(s)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\b(F-\d\d)\b/g, '<a href="#$1">$1</a>')
  .replace(/→/g, '<span class="arrow">→</span>');

function renderChangelog(md) {
  const lines = md.split('\n');
  let html = '';
  let open = false;
  for (const line of lines) {
    const h = line.match(/^## (.+)$/);
    if (h) {
      if (open) html += '</ul></section>';
      const [date, ver] = h[1].split('·').map(s => s.trim());
      html += `<section class="cl-entry"><h4><time>${esc(date)}</time>${ver ? ` <span class="ver">${esc(ver)}</span>` : ''}</h4><ul>`;
      open = true;
      continue;
    }
    const li = line.match(/^- (.+)$/);
    if (li && open) {
      const m = li[1].match(/^(F-\d\d|doc): (.+)$/);
      if (m) {
        const kind = m[1] === 'doc' ? 'doc' : (m[2].match(/^(started|done|edited)\b/) || [, 'decision'])[1];
        html += `<li class="cl-${kind}">${inline(li[1])}</li>`;
      } else html += `<li>${inline(li[1])}</li>`;
    }
  }
  if (open) html += '</ul></section>';
  return html;
}

const findings = JSON.parse(read('findings.json'));
const changelog = read('CHANGELOG.md');
const version = (changelog.match(/^## .*· (v[\d.]+)/m) || [, 'v0.0.0'])[1];
const built = new Date().toISOString().slice(0, 10);

let page = read('template.html');
page = page.replace('/*__FINDINGS__*/null', JSON.stringify(findings));
page = page.replace('<!--__CHANGELOG__-->', renderChangelog(changelog));
page = page.split('__VERSION__').join(version);
page = page.split('__BUILT__').join(built);
fs.writeFileSync(path.join(dir, 'page.html'), page);
console.log(`page.html: ${findings.findings.length} findings, ${version}, built ${built}, ${(page.length / 1024).toFixed(0)} KB`);
