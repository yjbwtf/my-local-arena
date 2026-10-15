/*
 * Re-point the Local-Arena panel's built-in online updater at your own HTTPS feed.
 *
 *   node repatch-panel.js https://github.com/<user>/<repo>
 *
 * The panel builds its HTTP client with reqwest `https_only(true)`, so the feed
 * URL MUST be https. The URL is stored as a fixed-length Rust string literal, so
 * the replacement has to keep the exact original length:
 *
 *   https://github.com/<user>/<repo>/releases/latest/download/latest.json      77 chars
 *   https://github.com/<user>/<repo>/releases/latest/download/latest.json.sig  81 chars
 *   -> len(<user>) + len(<repo>) must equal 20   (numakkiyu + Local-Arena = 9 + 11)
 *
 * The embedded Ed25519 update public key (44-char base64) is replaced with the
 * key in keys/update-public-key.txt, so latest.json must be signed with
 * keys/local-update-signing-key.pem (see make-feed.js).
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PANEL_DIR = path.dirname(HERE);
const OFFICIAL = path.join(HERE, 'LocalArena-unpatched-official-1.4.3.3.exe');
const KEYFILE = path.join(HERE, 'keys', 'update-public-key.txt');
const OLD_KEY = 'RbIjlfASpYVu740SsmQMLuLO7ExxiDBYTdnYThfqU/4=';
const SUFFIX = '/releases/latest/download/latest.json';

const prefix = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\//.test(prefix)) {
  console.error('usage: node repatch-panel.js https://<host>/<owner>/<repo>');
  process.exit(1);
}
const url = prefix + SUFFIX;
if (url.length !== 77) {
  console.error(`URL length is ${url.length}, must be exactly 77.`);
  const ownerRepo = prefix.replace(/^https:\/\/github\.com\//, '');
  if (ownerRepo !== prefix) {
    console.error(`For github.com: len(owner) + len(repo) must be 20, currently ${ownerRepo.length} -> "${ownerRepo}".`);
    console.error(`Pick a repository name of ${20 - (ownerRepo.split('/')[0] || '').length} characters.`);
  } else {
    console.error(`Shorten/lengthen the path after the host by ${77 - url.length} characters.`);
  }
  process.exit(1);
}

const NEW_KEY = fs.readFileSync(KEYFILE, 'ascii').trim();
if (NEW_KEY.length !== OLD_KEY.length) throw new Error('public key must stay 44 base64 characters');

function replaceExact(haystack, needle, replacement, expect) {
  let count = 0;
  for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + 1)) count++;
  if (count !== expect) throw new Error(`expected ${expect} occurrence(s) of ${needle.slice(0, 48)}..., found ${count}`);
  return haystack.split(needle).join(replacement);
}

const src = fs.readFileSync(OFFICIAL);
let out = src.toString('latin1');
out = replaceExact(out, 'https://github.com/numakkiyu/Local-Arena/releases/latest/download/latest.json.sig', url + '.sig', 1);
out = replaceExact(out, 'https://github.com/numakkiyu/Local-Arena/releases/latest/download/latest.json', url, 1);
out = replaceExact(out, OLD_KEY, NEW_KEY, 1);
if (out.length !== src.length) throw new Error('patched length changed');

const target = path.join(PANEL_DIR, 'LocalArena.exe');
fs.copyFileSync(target, path.join(HERE, 'LocalArena.exe.before-patch.bak'));
fs.writeFileSync(target, Buffer.from(out, 'latin1'));
console.log('patched ->', target);
console.log('  latest.json     :', url);
console.log('  latest.json.sig :', url + '.sig');
console.log('  update key      :', NEW_KEY);
