/*
 * Build the publishable (privacy-scrubbed) release assets for the GitHub repo.
 *
 * The locally deployed payload contains the user's own cosmetic presets and bot
 * configs. Those files are "preserve-config" in the panel manifest, so shipping
 * the stock defaults instead keeps every personal setting private while behaving
 * identically for anyone (including this user) who installs the payload.
 *
 *   1.6.1 payload  ->  out/publish/stage/LocalArena-v1.4.6.1-windows
 *                  ->  out/publish/release/LocalArena-v1.4.6.1-windows.zip
 *                      out/publish/release/LocalArena-plugin-v1.4.6.1-windows.zip
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = '1.4.6.1';
const SRC = `F:/LocalArena-v${VERSION}-local`;
const CLONE = 'F:/DeepSeek_harness_ws/cs2/repos/local-arena';
const OUT = 'F:/DeepSeek_harness_ws/cs2/out/publish';
const STAGE = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);

// personal -> stock default
const SCRUB = {
  'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/player_gun_presets.json':
    `${CLONE}/addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/player_gun_presets.json`,
  'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/player_knife_presets.json':
    `${CLONE}/addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/player_knife_presets.json`,
  'cfg/my_bot_ffa_config.cfg': `${CLONE}/cfg/my_bot_ffa_config.cfg`,
  'cfg/my_bot_normal_config.cfg': `${CLONE}/cfg/my_bot_normal_config.cfg`,
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

const srcManifest = JSON.parse(fs.readFileSync(path.join(SRC, 'plus-payload-manifest.json'), 'utf8'));
const list = srcManifest.entries.map((e) => e.path).sort();

fs.rmSync(path.join(OUT, 'stage'), { recursive: true, force: true });
ensureDir(STAGE);
let scrubbed = 0;
for (const rel of list) {
  const from = SCRUB[rel] || path.join(SRC, rel);
  if (SCRUB[rel] && sha256(from) !== sha256(path.join(SRC, rel))) scrubbed++;
  const dst = path.join(STAGE, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(from, dst);
}
for (const f of ['LocalArena.exe', 'WebView2Loader.dll', 'README.md', 'README.zh-CN.md', 'LICENSE']) {
  const p = path.join(SRC, f);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(STAGE, f));
}
console.log(`staged ${list.length} files, ${scrubbed} personal config file(s) replaced with stock defaults`);
for (const rel of Object.keys(SCRUB)) {
  console.log(`   ${rel}${sha256(path.join(STAGE, rel)) === sha256(path.join(SRC, rel)) ? '  (already stock)' : ''}`);
}

const entries = list
  .map((rel) => {
    const p = path.join(STAGE, rel);
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
  path.join(STAGE, 'plus-payload-manifest.json'),
  JSON.stringify({ schema_version: 1, package_version: VERSION, entries }, null, 2) + '\n',
  'utf8'
);
let bad = 0;
for (const e of entries) if (sha256(path.join(STAGE, e.path)) !== e.sha256) bad++;
console.log(`manifest self-check: ${entries.length - bad}/${entries.length} ok`);
