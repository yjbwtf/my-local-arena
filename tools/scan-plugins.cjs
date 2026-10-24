/*
 * Deeper compatibility audit of the installed payload against the CS2 build on disk:
 *   1. every managed plugin DLL (including panel-disabled *.dll.csbip-disabled) is
 *      scanned for embedded AOB signature literals
 *   2. the native Metamod plugins (BotHider / BotController / BotVision) carry their
 *      own gamedata.json with signatures - those are scanned too
 *
 *   node scan-plugins.cjs
 */
const fs = require('fs');
const path = require('path');

const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game';
const CSC = GAME + '/csgo/addons/counterstrikesharp/plugins';
const ADDONS = GAME + '/csgo/addons';
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
  const pat = String(pattern)
    .trim()
    .split(/\s+/)
    .map((p) => (/^\?+$/.test(p) ? -1 : parseInt(p, 16)));
  if (pat.length < 4 || pat.some((v) => Number.isNaN(v))) return -1;
  const anchor = pat.findIndex((v) => v >= 0);
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
function best(pattern) {
  for (const m of ['server', 'engine2', 'client', 'host']) {
    const h = scan(m, pattern);
    if (h === 1) return { module: m, hits: 1 };
  }
  for (const m of ['server', 'engine2', 'client', 'host']) {
    const h = scan(m, pattern);
    if (h > 1) return { module: m, hits: h };
  }
  return { module: '-', hits: 0 };
}

const patternRe = /(?:(?:[0-9A-F]{2}|\?{1,2}) ){3,}(?:[0-9A-F]{2}|\?{1,2})/g;

console.log('=== managed plugins: AOB literals embedded in the DLL');
for (const dir of fs.readdirSync(CSC).sort()) {
  const dirPath = path.join(CSC, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  const dlls = fs.readdirSync(dirPath).filter((f) => /\.dll(\.csbip-disabled)?$/.test(f));
  if (!dlls.length) {
    console.log('  ' + dir.padEnd(22) + ' (no dll)');
    continue;
  }
  for (const dll of dlls) {
    const utf16 = fs.readFileSync(path.join(dirPath, dll)).toString('utf16le');
    const pats = Array.from(new Set((utf16.match(patternRe) || []).map((s) => s.trim())));
    const state = dll.endsWith('.csbip-disabled') ? '[disabled]' : '[active]  ';
    if (!pats.length) {
      console.log('  ' + dir.padEnd(22) + ' ' + state + ' no embedded signature');
      continue;
    }
    const bad = pats.filter((p) => best(p).hits !== 1);
    console.log('  ' + dir.padEnd(22) + ' ' + state + pats.length + ' pattern(s): ' + (bad.length ? bad.length + ' STALE' : 'all resolve'));
    for (const p of bad) console.log('        STALE ' + p.slice(0, 46));
  }
}

console.log('\n=== native plugins: signatures from their own gamedata.json');
for (const native of ['BotHider', 'BotController', 'BotVision', 'RayTrace']) {
  const gdPath = path.join(ADDONS, native, 'gamedata.json');
  if (!fs.existsSync(gdPath)) {
    console.log('  ' + native.padEnd(16) + ' no gamedata.json');
    continue;
  }
  let gd;
  try {
    gd = JSON.parse(fs.readFileSync(gdPath, 'utf8'));
  } catch (e) {
    console.log('  ' + native.padEnd(16) + ' gamedata.json unreadable: ' + e.message);
    continue;
  }
  const flat = [];
  (function walk(node, prefix) {
    if (!node || typeof node !== 'object') return;
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string' && /^[0-9A-Fa-f?]{2}( [0-9A-Fa-f?]{1,2})+$/.test(v.trim())) flat.push([prefix + k, v]);
      else if (typeof v === 'object') walk(v, prefix + k + '.');
    }
  })(gd, '');
  const bad = flat.filter(([, p]) => best(p).hits !== 1);
  console.log('  ' + native.padEnd(16) + flat.length + ' signature(s): ' + (bad.length ? bad.length + ' STALE' : 'all resolve'));
  for (const [name, p] of bad.slice(0, 20)) console.log('        STALE ' + name);
}
