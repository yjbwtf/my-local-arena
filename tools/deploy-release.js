/*
 * Deploy the merged payload to the CS2 install and build the personal release folder + zips.
 */
const fs = require('fs');
const path = require('path');

const OUT = 'F:/DeepSeek_harness_ws/cs2/out';
const VERSION = '1.4.3.4';
const releaseRoot = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const LA = 'F:/LocalArena-v1.4.3.3-windows';
const PERSONAL = `F:/LocalArena-v${VERSION}-local`;
const RELEASEDIR = path.join(OUT, 'release');

function walk(root, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(root, r));
    else out.push(r);
  }
  return out;
}
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
function copyInto(srcRoot, dstRoot, rels) {
  let n = 0;
  for (const rel of rels) {
    const dst = path.join(dstRoot, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(path.join(srcRoot, rel), dst);
    n++;
  }
  return n;
}

const manifest = JSON.parse(fs.readFileSync(path.join(releaseRoot, 'plus-payload-manifest.json'), 'utf8'));
const payloadRels = manifest.entries.map((e) => e.path);

// ------------------------------------------------------------------ backup of the files we overwrite in the game dir
const backup = path.join(OUT, 'game-backup-before-' + VERSION);
ensureDir(backup);
for (const rel of [
  'plus-payload-manifest.json',
  'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/PlayerKnifeCustomizer.dll',
  'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/PlayerKnifeCustomizer.pdb',
]) {
  const src = path.join(GAME, rel);
  if (fs.existsSync(src)) {
    const dst = path.join(backup, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
}
console.log('game-dir backup ->', backup);

// ------------------------------------------------------------------ deploy to the CS2 install
const deployed = copyInto(releaseRoot, GAME, payloadRels);
fs.copyFileSync(path.join(releaseRoot, 'plus-payload-manifest.json'), path.join(GAME, 'plus-payload-manifest.json'));
console.log(`deployed ${deployed} payload files + manifest to ${GAME}`);

// ------------------------------------------------------------------ personal portable panel folder
fs.rmSync(PERSONAL, { recursive: true, force: true });
ensureDir(PERSONAL);
copyInto(releaseRoot, PERSONAL, walk(releaseRoot).filter((f) => !f.startsWith('release/')));
// carry over panel state (presets, install records, logs) so nothing is lost
const oldState = path.join(LA, '.csbip');
if (fs.existsSync(oldState)) {
  const rels = walk(oldState);
  copyInto(oldState, path.join(PERSONAL, '.csbip'), rels);
  console.log(`copied .csbip state (${rels.length} files)`);
}
console.log('personal portable folder ->', PERSONAL);

// ------------------------------------------------------------------ zips
ensureDir(RELEASEDIR);
console.log('releaseRoot=' + releaseRoot);
console.log('releaseDir=' + RELEASEDIR);
