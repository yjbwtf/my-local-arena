/*
 * Try to make the panel report the personal build version.
 * The Panel shows its own build version ("Falcons v1.4.3.3" title, bottom-left brand item).
 * Two places can carry it: the Rust-side version literal and the exe version resource.
 * The bundled frontend copy (compressed) cannot be patched; if the UI reads the Rust or
 * resource value this works, otherwise the Panel has to be rebuilt from source.
 */
const fs = require('fs');
const path = require('path');

const PANEL = 'F:/LocalArena-v1.4.6.1-local';
const SRC = path.join(PANEL, 'release', 'LocalArena-unpatched-official-1.4.3.3.exe');
const OUT = process.argv[2] || path.join(PANEL, 'release', 'versioninfo-test.exe');
const FROM = '1.4.3+3';
const TO = '1.4.6+1';

const b = fs.readFileSync(SRC);
const out = Buffer.from(b);
let ascii = 0;
let utf16 = 0;

let idx = out.indexOf(Buffer.from(FROM, 'ascii'));
while (idx >= 0) {
  Buffer.from(TO, 'ascii').copy(out, idx);
  ascii++;
  idx = out.indexOf(Buffer.from(FROM, 'ascii'), idx + 1);
}
idx = out.indexOf(Buffer.from(FROM, 'utf16le'));
while (idx >= 0) {
  Buffer.from(TO, 'utf16le').copy(out, idx);
  utf16++;
  idx = out.indexOf(Buffer.from(FROM, 'utf16le'), idx + 1);
}
if (out.length !== b.length) throw new Error('length changed');
fs.writeFileSync(OUT, out);
console.log(`patched ascii=${ascii} utf16=${utf16} -> ${OUT}`);
