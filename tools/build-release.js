/*
 * Local-Arena personal build (1.4.3.4-local)
 * Merges: Local-Arena 1.4.3.3 "plus" payload + upstream CS2-Bot-Improver 1.4.5 bot payload
 *         + freshly compiled PlayerKnifeCustomizer with the post-2026-09-23 signature.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LA = 'F:/LocalArena-v1.4.3.3-windows';                       // official Local-Arena 1.4.3.3 portable panel dir
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const BUILT = 'F:/DeepSeek_harness_ws/cs2/repos/local-arena/addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/bin/Release/net10.0';
const OUT = 'F:/DeepSeek_harness_ws/cs2/out';
const VERSION = '1.4.3.4';
const PLUGIN_REL = 'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer';

const PAYLOAD_ROOTS = ['addons', 'cfg', 'overrides'];
// Files added by the upstream CS2-Bot-Improver 1.4.5 payload on top of the Local-Arena 1.4.3.3 payload.
const EXTRA_PAYLOAD = [
  'addons/BotHider/config.json',
  'addons/BotVision/bin/win64/BotVision.dll',
  'addons/BotVision/config.json',
  'addons/BotVision/gamedata.json',
  'addons/metamod/BotVision.vdf',
  'cfg/gamemode_rush.cfg',
  'cfg/gamemode_rush_offline.cfg',
  'cfg/my_bot_rush_config.cfg',
];

const PLUGIN_FILES = [
  `${PLUGIN_REL}/PlayerKnifeCustomizer.dll`,
  `${PLUGIN_REL}/PlayerKnifeCustomizer.pdb`,
];

function walk(root, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(root, r));
    else out.push(r);
  }
  return out;
}
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

function componentOf(rel) {
  if (rel.startsWith('addons/counterstrikesharp/plugins/')) return rel.split('/')[3];
  if (rel.startsWith('addons/BotHider/')) return 'BotHider';
  if (rel.startsWith('addons/BotVision/')) return 'BotVision';
  if (rel.startsWith('addons/RayTrace/')) return 'RayTrace';
  if (rel.startsWith('cfg/')) return 'configuration';
  if (rel.startsWith('overrides/')) return 'overrides';
  return 'runtime';
}
function isPlusOwned(rel) {
  return (
    rel.startsWith('addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/') ||
    rel.startsWith('addons/counterstrikesharp/plugins/BotHiderImpl/') ||
    rel.startsWith('addons/counterstrikesharp/plugins/PlusMatchCoordinator/') ||
    rel.startsWith('addons/counterstrikesharp/plugins/TeamLineupInjector/') ||
    rel.startsWith('addons/counterstrikesharp/plugins/OfflineMatchTelemetry/') ||
    rel.startsWith('addons/counterstrikesharp/shared/BotHiderApi/') ||
    rel === 'cfg/my_bot_ffa_config.cfg' ||
    rel === 'cfg/my_bot_normal_config.cfg'
  );
}
function preserveConfig(rel) {
  return (
    /\/PlayerKnifeCustomizer\/player_.*_presets\.json$/.test(rel) ||
    rel === 'addons/counterstrikesharp/plugins/BotRandomizer/bot_randomizer_options.json' ||
    rel === 'cfg/my_bot_ffa_config.cfg' ||
    rel === 'cfg/my_bot_normal_config.cfg' ||
    rel === 'overrides/botprofile.vpk'
  );
}

// ---------------------------------------------------------------- payload set
const officialManifest = JSON.parse(fs.readFileSync(path.join(LA, 'plus-payload-manifest.json'), 'utf8'));
const payload = new Set(officialManifest.entries.map((e) => e.path));
for (const extra of EXTRA_PAYLOAD) {
  if (fs.existsSync(path.join(GAME, extra))) payload.add(extra);
  else console.log('  ! extra payload file missing in game dir:', extra);
}
for (const f of walk(GAME, PLUGIN_REL)) payload.add(f); // keep every shipped PlayerKnifeCustomizer data file

const list = [...payload].sort();
console.log(`payload files: ${list.length}`);
const missing = list.filter((f) => !fs.existsSync(path.join(GAME, f)));
if (missing.length) console.log('  ! missing in game dir:', missing.join(', '));

// ---------------------------------------------------------------- staging
const releaseRoot = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);
fs.rmSync(path.join(OUT, 'stage'), { recursive: true, force: true });
ensureDir(releaseRoot);
for (const rel of list) {
  const dst = path.join(releaseRoot, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(GAME, rel), dst);
}
// fresh PlayerKnifeCustomizer build wins
for (const rel of PLUGIN_FILES) {
  fs.copyFileSync(path.join(BUILT, path.basename(rel)), path.join(releaseRoot, rel));
}
console.log('staged payload ->', releaseRoot);

// ---------------------------------------------------------------- manifest
const entries = list.map((rel) => {
  const p = path.join(releaseRoot, rel);
  const st = fs.statSync(p);
  return {
    path: rel,
    size: st.size,
    sha256: sha256(p),
    component: componentOf(rel),
    ownership: isPlusOwned(rel) ? 'plus' : 'shared',
    restore_policy: preserveConfig(rel) ? 'preserve-config' : 'restore',
  };
});
entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
fs.writeFileSync(
  path.join(releaseRoot, 'plus-payload-manifest.json'),
  JSON.stringify({ schema_version: 1, package_version: VERSION, entries }, null, 2) + '\n',
  'utf8'
);

// ---------------------------------------------------------------- panel files
for (const f of ['LocalArena.exe', 'WebView2Loader.dll', 'README.md', 'README.zh-CN.md', 'LICENSE']) {
  const src = path.join(LA, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(releaseRoot, f));
}
console.log('panel files copied');

// sanity: every manifest entry hash matches the staged file
let bad = 0;
for (const e of entries) if (sha256(path.join(releaseRoot, e.path)) !== e.sha256) bad++;
console.log(`manifest self-check: ${entries.length - bad}/${entries.length} ok`);
console.log('component summary:');
const comp = {};
for (const e of entries) comp[e.component] = (comp[e.component] || 0) + 1;
for (const [k, v] of Object.entries(comp).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(24)} ${v}`);
