/*
 * Read-only verification of the personal build:
 *   1. the local payload (panel folder) matches plus-payload-manifest.json
 *   2. the CS2 install matches the same manifest  (this is what the panel's
 *      "验证安装" / 缺失文件 dialog checks)
 *   3. the fixed PlayerKnifeCustomizer contains the current signature and the
 *      old (2026-09-23-broken) one is gone
 *   4. that signature still resolves to exactly one address in the installed
 *      server.dll
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.4.3.4';
const PERSONAL = `F:/LocalArena-v${VERSION}-local`;
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const SERVER = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo/bin/win64/server.dll';

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(PERSONAL, 'plus-payload-manifest.json'), 'utf8'));
console.log(`manifest: package_version=${manifest.package_version} entries=${manifest.entries.length}`);

function verify(root, label) {
  let missing = 0;
  let mismatch = 0;
  for (const e of manifest.entries) {
    const p = path.join(root, e.path);
    if (!fs.existsSync(p)) {
      missing++;
      if (missing <= 5) console.log(`   missing: ${e.path}`);
      continue;
    }
    if (fs.statSync(p).size !== e.size || sha256(p) !== e.sha256) {
      mismatch++;
      if (mismatch <= 5) console.log(`   hash mismatch: ${e.path}`);
    }
  }
  console.log(`${label}: missing=${missing} mismatch=${mismatch} -> ${missing + mismatch === 0 ? 'OK' : 'FAIL'}`);
  return missing + mismatch;
}

let bad = 0;
bad += verify(PERSONAL, 'panel payload (package)');
bad += verify(GAME, 'CS2 install     (target) ');

const dll = fs.readFileSync(path.join(PERSONAL, 'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/PlayerKnifeCustomizer.dll'));
const utf16 = dll.toString('utf16le');
const NEW = '48 89 4C 24 ? 53 41 55 41 56';
const OLD = '40 53 55 41 56 48 81 EC 90 00 00 00';
console.log(`dll signature: new=${utf16.includes(NEW)} old=${utf16.includes(OLD)} -> ${utf16.includes(NEW) && !utf16.includes(OLD) ? 'OK' : 'FAIL'}`);

const buf = fs.readFileSync(SERVER);
const parts = NEW.split(' ').map((x) => (x === '?' ? -1 : parseInt(x, 16)));
let hits = 0;
for (let i = 0; i <= buf.length - parts.length; i++) {
  if (parts[0] >= 0 && buf[i] !== parts[0]) continue;
  let ok = true;
  for (let j = 1; j < parts.length; j++) if (parts[j] >= 0 && buf[i + j] !== parts[j]) { ok = false; break; }
  if (ok) hits++;
}
console.log(`server.dll (${buf.length} bytes): signature matches=${hits} -> ${hits === 1 ? 'OK' : 'CHECK'}`);
process.exit(bad === 0 ? 0 : 1);
