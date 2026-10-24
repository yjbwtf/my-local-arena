/*
 * Build 1.4.6.2: the CounterStrikeSharp 1.0.378 compatibility payload.
 *
 * CS2 1.41.9.2 (2026-10-22/23) broke CounterStrikeSharp 1.0.376: its
 * CCSPlayerPawnBase_PostThink signature no longer matches server.dll, so the
 * CSSharp native hook jumps to garbage and cs2.exe dies with 0xc0000005 inside
 * counterstrikesharp.dll. 1.0.378 restores all 28 signatures ("Update Schema
 * Definitions to 1.41.9.2").
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VERSION = '1.4.6.2';
const SRC = `F:/LocalArena-v${VERSION}-local`;
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const OUT = 'F:/DeepSeek_harness_ws/cs2/out/publish2';
const REPO = 'F:/DeepSeek_harness_ws/cs2/out/publish/repo';
const LIST = 'F:/DeepSeek_harness_ws/cs2/out/payload-list-1462.json';

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

const files = JSON.parse(fs.readFileSync(LIST, 'utf8'));
const entries = files
  .map((rel) => {
    const p = path.join(SRC, rel);
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
const manifestText = JSON.stringify({ schema_version: 1, package_version: VERSION, entries }, null, 2) + '\n';
fs.writeFileSync(path.join(SRC, 'plus-payload-manifest.json'), manifestText, 'utf8');
fs.writeFileSync(path.join(GAME, 'plus-payload-manifest.json'), manifestText, 'utf8');
console.log(`manifest ${VERSION}: ${entries.length} entries (payload + game dir)`);

// install record
const instRoot = path.join(SRC, '.csbip/installations');
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
  console.log(`install record ${id}: ${VERSION}, ${rec.entries.length} entries`);
}

// ---------------------------------------------------------------- release staging
const STAGE = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);
fs.rmSync(path.join(OUT, 'stage'), { recursive: true, force: true });
ensureDir(STAGE);
for (const rel of walk(SRC)) {
  if (rel.startsWith('.csbip/') || rel.startsWith('release/')) continue;
  if (/^(start-panel-with-proxy\.cmd|涓汉鐗堣鏄嶾.md)$/.test(rel)) continue;
  const dst = path.join(STAGE, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(SRC, rel), dst);
}
fs.copyFileSync(path.join(REPO, 'THIRD-PARTY-NOTICES.md'), path.join(STAGE, 'THIRD-PARTY-NOTICES.md'));
fs.copyFileSync(path.join(REPO, 'LICENSE'), path.join(STAGE, 'LICENSE'));
ensureDir(path.join(STAGE, 'licenses'));
for (const f of walk(path.join(REPO, 'licenses'))) {
  fs.copyFileSync(path.join(REPO, 'licenses', f), path.join(STAGE, 'licenses', f));
}
console.log('staged ->', STAGE);

// self check + game dir check
function verify(root, label) {
  let bad = 0;
  let policy = 0;
  for (const e of entries) {
    const p = path.join(root, e.path);
    if (!fs.existsSync(p) || fs.statSync(p).size !== e.size || sha256(p) !== e.sha256) {
      if (e.restore_policy === 'preserve-config') policy++;
      else {
        bad++;
        if (bad <= 5) console.log(`   MISMATCH ${label}: ${e.path}`);
      }
    }
  }
  console.log(`${label}: hard-mismatch=${bad} preserve-config-drift=${policy} -> ${bad === 0 ? 'OK' : 'FAIL'}`);
  return bad;
}
let fail = verify(SRC, 'panel payload');
fail += verify(GAME, 'CS2 install ');

// zip + feed
const REL = path.join(OUT, 'release');
ensureDir(REL);
ensureDir(path.join(REL, 'keys'));
for (const f of walk(path.join(SRC, 'release/keys'))) {
  fs.copyFileSync(path.join(SRC, 'release/keys', f), path.join(REL, 'keys', f));
}
const ps1 = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stage = '${STAGE.replace(/\\/g, '/')}'
$rel = '${REL.replace(/\\/g, '/')}'
$full = Join-Path $rel 'LocalArena-v${VERSION}-windows.zip'
if (Test-Path $full) { Remove-Item $full -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $full, [System.IO.Compression.CompressionLevel]::Optimal, $true)
$plugStage = Join-Path $stage 'plugin-update'
Remove-Item $plugStage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $plugStage | Out-Null
foreach ($n in @('addons','cfg','overrides','plus-payload-manifest.json','LICENSE','THIRD-PARTY-NOTICES.md','licenses')) {
  Copy-Item (Join-Path $stage $n) -Destination $plugStage -Recurse -Force
}
$plug = Join-Path $rel 'LocalArena-plugin-v${VERSION}-windows.zip'
if (Test-Path $plug) { Remove-Item $plug -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($plugStage, $plug, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Output "zips written"
`;
fs.writeFileSync(path.join(OUT, 'zip.ps1'), ps1, 'utf8');
console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(OUT, 'zip.ps1')], { encoding: 'utf8' }).trim());

execFileSync(
  process.execPath,
  [
    'F:/DeepSeek_harness_ws/cs2/make-feed.js',
    VERSION,
    VERSION,
    'https://github.com/yjbwtf/my-local-arena',
  ],
  { encoding: 'utf8', env: { ...process.env, RELEASE_DIR: REL }, stdio: 'inherit' }
);
console.log('build complete:', VERSION, fail === 0 ? '(all checks OK)' : '(checks FAILED)');
process.exit(fail === 0 ? 0 : 1);

