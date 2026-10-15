/*
 * Repoint the Local-Arena panel's built-in online updater at a local feed:
 *   - replace the two hard-coded release URLs (same byte length, Rust &str literals)
 *   - replace the embedded Ed25519 update public key (44-char base64 -> 44-char base64)
 * A backup of the unmodified executable is written next to the output.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.4.3.4';
const SRC = 'F:/LocalArena-v1.4.3.3-windows/LocalArena.exe';
const DEST = `F:/LocalArena-v${VERSION}-local/LocalArena.exe`;
const OUT = 'F:/DeepSeek_harness_ws/cs2/out/release';
const KEYS = path.join(OUT, 'keys');
const PORT = 8791;

const HOST = `127.0.0.1:${PORT}`;
// Path prefix chosen so the replacement keeps the EXACT original byte length:
//   original: https://github.com/numakkiyu/Local-Arena/releases/latest/download/latest.json   (77)
//             https://github.com/numakkiyu/Local-Arena/releases/latest/download/latest.json.sig (81)
// The panel only accepts https, so the local feed needs a TLS certificate for
// 127.0.0.1/localhost (see release/serve-updates.js and release/keys/).
const PREFIX = process.argv[2] || `https://localhost:${PORT}/local-arena-feeds`;
const NEW_URL = `${PREFIX}/releases/latest/download/latest.json`;
const NEW_SIG_URL = `${PREFIX}/releases/latest/download/latest.json.sig`;
const OLD_URL = 'https://github.com/numakkiyu/Local-Arena/releases/latest/download/latest.json';
const OLD_SIG_URL = 'https://github.com/numakkiyu/Local-Arena/releases/latest/download/latest.json.sig';
const OLD_KEY = 'RbIjlfASpYVu740SsmQMLuLO7ExxiDBYTdnYThfqU/4=';

if (OLD_URL.length !== NEW_URL.length) throw new Error(`url length ${NEW_URL.length} != ${OLD_URL.length}`);
if (OLD_SIG_URL.length !== NEW_SIG_URL.length) throw new Error(`sig url length ${NEW_SIG_URL.length} != ${OLD_SIG_URL.length}`);

// ---------------------------------------------------------------- key pair
fs.mkdirSync(KEYS, { recursive: true });
const keyFile = path.join(KEYS, 'local-update-signing-key.pem');
let privateKey;
if (fs.existsSync(keyFile)) {
  privateKey = crypto.createPrivateKey(fs.readFileSync(keyFile));
  console.log('reusing existing signing key');
} else {
  ({ privateKey } = crypto.generateKeyPairSync('ed25519'));
  fs.writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  console.log('generated new signing key ->', keyFile);
}
const pubRaw = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }).subarray(-32);
const NEW_KEY = pubRaw.toString('base64');
if (NEW_KEY.length !== OLD_KEY.length) throw new Error('key length mismatch');
fs.writeFileSync(path.join(KEYS, 'update-public-key.txt'), NEW_KEY + '\n', 'ascii');

// ---------------------------------------------------------------- patch
const buf = fs.readFileSync(SRC);
const ascii = buf.toString('latin1');
function replaceExact(haystack, needle, replacement, expect) {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx >= 0) {
    count++;
    idx = haystack.indexOf(needle, idx + 1);
  }
  if (count !== expect) throw new Error(`expected ${expect} occurrence(s) of ${needle.slice(0, 40)}..., found ${count}`);
  return haystack.split(needle).join(replacement);
}
let out = ascii;
out = replaceExact(out, OLD_SIG_URL, NEW_SIG_URL, 1); // longer literal first
out = replaceExact(out, OLD_URL, NEW_URL, 1);
out = replaceExact(out, OLD_KEY, NEW_KEY, 1);
if (out.length !== ascii.length) throw new Error('patched file changed length');
const patched = Buffer.from(out, 'latin1');
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(path.join(OUT, 'LocalArena-unpatched-official-1.4.3.3.exe'), buf);
fs.writeFileSync(DEST, patched);
console.log('patched panel ->', DEST);
console.log('feed URL       ->', NEW_URL);
console.log('feed sig URL   ->', NEW_SIG_URL);
console.log('public key     ->', NEW_KEY);
