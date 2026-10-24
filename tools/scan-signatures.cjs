/*
 * Compare CounterStrikeSharp gamedata signatures (installed vs newer release) and the
 * signature literals embedded in the managed plugins against the CURRENT CS2 binaries.
 *
 *   node scan-signatures.cjs
 *
 * Answers, without launching the game: is the installed CounterStrikeSharp still
 * compatible with the CS2 build on disk, does a newer CounterStrikeSharp fix it,
 * and which plugins still carry stale signatures.
 */
const fs = require('fs');
const path = require('path');

const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game';
const CSS_INSTALLED = GAME + '/csgo/addons/counterstrikesharp';
const CSS_NEW = 'F:/DeepSeek_harness_ws/cs2/downloads/extract-css-1.0.378';
const MODULES = {
  server: GAME + '/csgo/bin/win64/server.dll',
  client: GAME + '/csgo/bin/win64/client.dll',
  host: GAME + '/csgo/bin/win64/host.dll',
  matchmaking: GAME + '/csgo/bin/win64/matchmaking.dll',
  engine2: GAME + '/bin/win64/engine2.dll',
  networksystem: GAME + '/bin/win64/networksystem.dll',
  tier0: GAME + '/bin/win64/tier0.dll',
};

const cache = {};
function mod(n) {
  if (!(n in cache)) cache[n] = fs.existsSync(MODULES[n]) ? fs.readFileSync(MODULES[n]) : null;
  return cache[n];
}

function scan(moduleName, pattern) {
  const buf = mod(moduleName);
  if (!buf) return -1;
  const parts = String(pattern).trim().split(/\s+/);
  const pat = parts.map((p) => (/^\?+$/.test(p) ? -1 : parseInt(p, 16)));
  if (pat.length < 4 || pat.some((v) => Number.isNaN(v))) return -1;
  const anchor = pat.findIndex((v) => v >= 0);
  if (anchor < 0) return -1;
  let hits = 0;
  for (let i = 0; i + pat.length <= buf.length; i++) {
    if (buf[i + anchor] !== pat[anchor]) continue;
    let ok = true;
    for (let j = anchor; j < pat.length; j++) {
      if (pat[j] >= 0 && buf[i + j] !== pat[j]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      hits++;
      if (hits > 1) return hits;
    }
  }
  return hits;
}

function libToModule(lib) {
  const l = String(lib || 'server').toLowerCase();
  const names = ['engine2', 'client', 'host', 'matchmaking', 'networksystem', 'tier0'];
  for (let i = 0; i < names.length; i++) if (l.indexOf(names[i]) >= 0) return names[i];
  return 'server';
}

function auditGamedata(label, file) {
  if (!fs.existsSync(file)) return { label: label, total: 0, missing: [] };
  const gd = JSON.parse(fs.readFileSync(file, 'utf8'));
  const missing = [];
  let total = 0;
  for (const name of Object.keys(gd)) {
    const entry = gd[name];
    const sig = entry && entry.signatures;
    const pat = sig && sig.windows;
    if (!pat || !/^[0-9A-Fa-f?]{2}( [0-9A-Fa-f?]{1,2})+$/.test(String(pat).trim())) continue;
    total++;
    const m = libToModule(sig.library);
    const hits = scan(m, pat);
    if (hits !== 1) {
      missing.push(m + ':' + name + (hits < 0 ? ' [module missing]' : hits === 0 ? ' [NOT FOUND]' : ' [' + hits + ' matches]'));
    }
  }
  return { label: label, total: total, missing: missing };
}

const results = [
  auditGamedata('CounterStrikeSharp 1.0.376 (installed)', CSS_INSTALLED + '/gamedata/gamedata.json'),
  auditGamedata('CounterStrikeSharp 1.0.378 (new)', path.join(CSS_NEW, 'addons/counterstrikesharp/gamedata/gamedata.json')),
];
for (const r of results) {
  console.log(r.label + ': ' + r.total + ' windows signatures, ' + (r.total - r.missing.length) + ' resolve cleanly, ' + r.missing.length + ' problematic');
  for (const m of r.missing) console.log('    ' + m);
}

const patternRe = /(?:(?:[0-9A-F]{2}|\?{1,2}) ){3,}(?:[0-9A-F]{2}|\?{1,2})/g;
const pluginRoot = CSS_INSTALLED + '/plugins';
console.log('\n=== signatures embedded in managed plugin DLLs');
const dirs = fs.readdirSync(pluginRoot).sort();
for (const dir of dirs) {
  const dllPath = path.join(pluginRoot, dir, dir + '.dll');
  if (!fs.existsSync(dllPath)) continue;
  const utf16 = fs.readFileSync(dllPath).toString('utf16le');
  const pats = Array.from(new Set((utf16.match(patternRe) || []).map((s) => s.trim())));
  if (!pats.length) {
    console.log('  ' + dir.padEnd(22) + ' no embedded signature literal');
    continue;
  }
  const bad = [];
  for (const pat of pats) {
    if (scan('server', pat) <= 0 && scan('engine2', pat) <= 0) bad.push(pat);
  }
  console.log('  ' + dir.padEnd(22) + pats.length + ' pattern(s): ' + (bad.length ? bad.length + ' NOT FOUND -> ' + bad.map((p) => p.slice(0, 30)).join(' ; ') : 'all resolve'));
}
