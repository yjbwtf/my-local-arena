/*
 * Verify a personal Local-Arena build against its own manifest and the CS2 install.
 *
 *   node verify-payload.cjs [version]
 *
 * Understands two things the panel does on purpose:
 *   - "preserve-config" files (player presets, bot options, difficulty botprofile.vpk)
 *     are rewritten by the panel and are not corruption
 *   - "X.csbip-disabled" means the file is parked by a panel mode (e.g. 饰品预览 mode
 *     disables the bot plugins), not missing
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = process.argv[2] || '1.4.6.2';
const P = `F:/LocalArena-v${VERSION}-local`;
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const SERVER = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo/bin/win64/server.dll';

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(P, 'plus-payload-manifest.json'), 'utf8'));
console.log(`manifest: version=${manifest.package_version} entries=${manifest.entries.length}`);

function verify(root, label) {
  let missing = 0;
  let bad = 0;
  let policy = 0;
  let disabled = 0;
  const notes = [];
  for (const e of manifest.entries) {
    const p = path.join(root, e.path);
    if (!fs.existsSync(p)) {
      if (fs.existsSync(p + '.csbip-disabled')) {
        disabled++;
        continue;
      }
      missing++;
      notes.push(`MISSING  ${e.path}`);
      continue;
    }
    if (fs.statSync(p).size !== e.size || sha(p) !== e.sha256) {
      if (e.restore_policy === 'preserve-config') policy++;
      else {
        bad++;
        notes.push(`MISMATCH ${e.path}`);
      }
    }
  }
  console.log(
    `${label}: missing=${missing} mismatch=${bad} disabled-by-mode=${disabled} preserve-config-drift=${policy} -> ${missing + bad === 0 ? 'OK' : 'FAIL'}`
  );
  for (const n of notes.slice(0, 10)) console.log('    ' + n);
  return missing + bad;
}

let fail = verify(P, 'panel payload (package)  ');
fail += verify(GAME, 'CS2 install     (target) ');

// install record
const instRoot = path.join(P, '.csbip/installations');
for (const id of fs.readdirSync(instRoot)) {
  const rp = path.join(instRoot, id, 'record.json');
  if (!fs.existsSync(rp)) continue;
  const rec = JSON.parse(fs.readFileSync(rp, 'utf8'));
  const mm = new Map(manifest.entries.map((e) => [e.path, e.sha256]));
  let stale = 0;
  for (const e of rec.entries) if (mm.get(e.path) !== e.installed_sha256) stale++;
  console.log(`install record ${id}: version=${rec.package_version} entries=${rec.entries.length} stale=${stale} -> ${stale === 0 ? 'OK' : 'FAIL'}`);
  fail += stale;
}

// skin plugin signature + live server.dll check
const dll = fs.readFileSync(path.join(P, 'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/PlayerKnifeCustomizer.dll')).toString('utf16le');
const NEW = '48 89 4C 24 ? 53 41 55 41 56';
const OLD = '40 53 55 41 56 48 81 EC 90 00 00 00';
console.log(`skin plugin signature: new=${dll.includes(NEW)} old=${dll.includes(OLD)} -> ${dll.includes(NEW) && !dll.includes(OLD) ? 'OK' : 'FAIL'}`);
const buf = fs.readFileSync(SERVER);
const parts = NEW.split(' ').map((x) => (x === '?' ? -1 : parseInt(x, 16)));
let hits = 0;
for (let i = 0; i <= buf.length - parts.length; i++) {
  if (parts[0] >= 0 && buf[i] !== parts[0]) continue;
  let ok = true;
  for (let j = 1; j < parts.length; j++) if (parts[j] >= 0 && buf[i + j] !== parts[j]) { ok = false; break; }
  if (ok) hits++;
}
console.log(`server.dll (${buf.length} bytes): skin signature matches=${hits} -> ${hits === 1 ? 'OK' : 'CHECK'}`);

// CounterStrikeSharp version in the payload
const cssApi = path.join(P, 'addons/counterstrikesharp/api/CounterStrikeSharp.API.dll');
const v = require('child_process')
  .execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Item '${cssApi}').VersionInfo.FileVersion`], { encoding: 'utf8' })
  .trim();
console.log(`bundled CounterStrikeSharp: ${v}`);
process.exit(fail === 0 ? 0 : 1);

