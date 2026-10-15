/*
 * Local-Arena personal build, upstream 1.4.6 refresh.
 *
 * Base   : the verified 1.4.3.4 payload (Local-Arena plus components + upstream 1.4.5 bots + fixed skin plugin)
 * Update : the 9 payload files upstream changed in 1.4.6 + the botprofile VPKs rebuilt
 *          from 1.4.6 (BotProfile.db only, exactly like Local-Arena's own packaging)
 * Result : version 1.4.6.1 payload, staged, deployed to the CS2 install and to a new
 *          portable panel folder, with a matching plus-payload-manifest.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.4.6.1';
const CUR = 'F:/LocalArena-v1.4.3.4-local';
const UP = 'F:/DeepSeek_harness_ws/cs2/downloads/extract-1.4.6';
const VPK = 'F:/DeepSeek_harness_ws/cs2/out/vpk146';
const OUT = 'F:/DeepSeek_harness_ws/cs2/out';
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const PERSONAL = `F:/LocalArena-v${VERSION}-local`;

const UPDATE_FROM_146 = [
  'addons/counterstrikesharp/plugins/BotAimImprover/BotAimImprover.dll',
  'addons/counterstrikesharp/plugins/BotAimImprover/BotAimImprover.pdb',
  'addons/counterstrikesharp/plugins/BotState/BotState.dll',
  'addons/counterstrikesharp/plugins/BotState/BotState.pdb',
  'cfg/gamemode_casual.cfg',
  'cfg/gamemode_competitive.cfg',
  'cfg/gamemode_competitive2v2.cfg',
  'cfg/gamemode_custom.cfg',
  'cfg/my_bot_rush_config.cfg',
];
const UPDATE_VPK = {
  'overrides/botprofile.vpk': 'root.vpk',
  'overrides/Low/botprofile.vpk': 'Low.vpk',
  'overrides/Medium/botprofile.vpk': 'Medium.vpk',
  'overrides/High/botprofile.vpk': 'High.vpk',
};

const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
function walk(root, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(root, r));
    else out.push(r);
  }
  return out;
}
function componentOf(rel) {
  if (rel.startsWith('addons/counterstrikesharp/plugins/')) return rel.split('/')[3];
  if (rel.startsWith('addons/BotHider/')) return 'BotHider';
  if (rel.startsWith('addons/BotVision/')) return 'BotVision';
  if (rel.startsWith('addons/RayTrace/')) return 'RayTrace';
  if (rel.startsWith('cfg/')) return 'configuration';
  if (rel.startsWith('overrides/')) return 'overrides';
  return 'runtime';
}
const isPlusOwned = (rel) =>
  rel.startsWith('addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/') ||
  rel.startsWith('addons/counterstrikesharp/plugins/BotHiderImpl/') ||
  rel.startsWith('addons/counterstrikesharp/plugins/PlusMatchCoordinator/') ||
  rel.startsWith('addons/counterstrikesharp/plugins/TeamLineupInjector/') ||
  rel.startsWith('addons/counterstrikesharp/plugins/OfflineMatchTelemetry/') ||
  rel.startsWith('addons/counterstrikesharp/shared/BotHiderApi/') ||
  rel === 'cfg/my_bot_ffa_config.cfg' ||
  rel === 'cfg/my_bot_normal_config.cfg';
const preserveConfig = (rel) =>
  /\/PlayerKnifeCustomizer\/player_.*_presets\.json$/.test(rel) ||
  rel === 'addons/counterstrikesharp/plugins/BotRandomizer/bot_randomizer_options.json' ||
  rel === 'cfg/my_bot_ffa_config.cfg' ||
  rel === 'cfg/my_bot_normal_config.cfg' ||
  rel === 'overrides/botprofile.vpk';

// ------------------------------------------------------------------ build payload list
const curManifest = JSON.parse(fs.readFileSync(path.join(CUR, 'plus-payload-manifest.json'), 'utf8'));
const list = curManifest.entries.map((e) => e.path).sort();
const srcOf = (rel) => {
  if (UPDATE_VPK[rel]) return path.join(VPK, UPDATE_VPK[rel]);
  if (UPDATE_FROM_146.includes(rel)) return path.join(UP, rel);
  return path.join(CUR, rel);
};
for (const rel of list) {
  if (!fs.existsSync(srcOf(rel))) throw new Error(`source missing for ${rel}: ${srcOf(rel)}`);
}

// ------------------------------------------------------------------ stage
const stageRoot = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);
fs.rmSync(path.join(OUT, 'stage'), { recursive: true, force: true });
ensureDir(stageRoot);
let updated = 0;
for (const rel of list) {
  const src = srcOf(rel);
  const dst = path.join(stageRoot, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  if (src !== path.join(CUR, rel)) updated++;
}
for (const f of ['LocalArena.exe', 'WebView2Loader.dll', 'README.md', 'README.zh-CN.md', 'LICENSE']) {
  const src = path.join(CUR, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(stageRoot, f));
}
console.log(`payload files: ${list.length} (${updated} refreshed from 1.4.6 / rebuilt VPKs)`);

// ------------------------------------------------------------------ manifest
const entries = list
  .map((rel) => {
    const p = path.join(stageRoot, rel);
    return {
      path: rel,
      size: fs.statSync(p).size,
      sha256: sha256(p),
      component: componentOf(rel),
      ownership: isPlusOwned(rel) ? 'plus' : 'shared',
      restore_policy: preserveConfig(rel) ? 'preserve-config' : 'restore',
    };
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
fs.writeFileSync(
  path.join(stageRoot, 'plus-payload-manifest.json'),
  JSON.stringify({ schema_version: 1, package_version: VERSION, entries }, null, 2) + '\n',
  'utf8'
);

// ------------------------------------------------------------------ deploy to CS2 install
const backup = path.join(OUT, `game-backup-before-${VERSION}`);
ensureDir(backup);
for (const rel of [...UPDATE_FROM_146, ...Object.keys(UPDATE_VPK), 'plus-payload-manifest.json']) {
  const src = path.join(GAME, rel);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(backup, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}
let deployed = 0;
for (const rel of list) {
  const dst = path.join(GAME, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(stageRoot, rel), dst);
  deployed++;
}
fs.copyFileSync(path.join(stageRoot, 'plus-payload-manifest.json'), path.join(GAME, 'plus-payload-manifest.json'));
console.log(`deployed ${deployed} payload files to the CS2 install (backup -> ${backup})`);

// ------------------------------------------------------------------ personal portable folder
fs.rmSync(PERSONAL, { recursive: true, force: true });
ensureDir(PERSONAL);
for (const rel of walk(stageRoot)) {
  const dst = path.join(PERSONAL, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(stageRoot, rel), dst);
}
const oldState = path.join(CUR, '.csbip');
for (const rel of walk(oldState)) {
  const dst = path.join(PERSONAL, '.csbip', rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(oldState, rel), dst);
}
console.log(`portable panel folder -> ${PERSONAL}`);

// ------------------------------------------------------------------ refresh the panel install record
const instRoot = path.join(PERSONAL, '.csbip/installations');
for (const id of fs.readdirSync(instRoot)) {
  const rp = path.join(instRoot, id, 'record.json');
  if (!fs.existsSync(rp)) continue;
  const rec = JSON.parse(fs.readFileSync(rp, 'utf8'));
  const prev = new Map((rec.entries || []).map((e) => [e.path, e]));
  rec.package_version = VERSION;
  rec.entries = entries
    .map((m) => {
      const p = prev.get(m.path) || { original_existed: false, original_sha256: null, original_backup: null };
      return {
        path: m.path,
        original_existed: p.original_existed,
        original_sha256: p.original_sha256,
        original_backup: p.original_backup,
        installed_sha256: m.sha256,
        ownership: m.ownership,
        restore_policy: m.restore_policy,
      };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  fs.writeFileSync(rp, JSON.stringify(rec, null, 2), 'utf8');
  console.log(`install record ${id}: package_version=${VERSION} entries=${rec.entries.length}`);
}

// ------------------------------------------------------------------ self check
let bad = 0;
for (const e of entries) {
  const p = path.join(PERSONAL, e.path);
  if (!fs.existsSync(p) || fs.statSync(p).size !== e.size || sha256(p) !== e.sha256) bad++;
}
console.log(`manifest self-check: ${entries.length - bad}/${entries.length} ok`);
