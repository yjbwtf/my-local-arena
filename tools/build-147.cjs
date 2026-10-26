/*
 * Build 1.4.7.1: merge CS2-Bot-Improver 1.4.7 (2026-10-25, "updated signatures and
 * offsets" for CS2 1.41.9.2) into the personal Local-Arena build.
 *
 * Takes only the 23 files upstream actually changed (managed bot plugins, native
 * BotController/BotVision + gamedata, BotControllerApi, three gamemode cfgs).
 * Keeps the Local-Arena plus components, the BotHider ABI pair used by the panel,
 * CounterStrikeSharp 1.0.378 (byte-identical to what 1.4.7 bundles) and the
 * already-converted BotProfile-only overrides (unchanged upstream since 1.4.6).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VERSION = '1.4.7.1';
const PREV = 'F:/LocalArena-v1.4.6.2-local';
const SRC = `F:/LocalArena-v${VERSION}-local`;
const UP = 'F:/DeepSeek_harness_ws/cs2/downloads/extract-1.4.7';
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const OUT = 'F:/DeepSeek_harness_ws/cs2/out/publish3';
const REPO = 'F:/DeepSeek_harness_ws/cs2/out/publish/repo';

const UPDATE = [
  'addons/BotController/bin/win64/BotController.dll',
  'addons/BotVision/bin/win64/BotVision.dll',
  'addons/BotVision/gamedata.json',
  'addons/counterstrikesharp/plugins/BotAI/BotAI.deps.json',
  'addons/counterstrikesharp/plugins/BotAI/BotAI.dll',
  'addons/counterstrikesharp/plugins/BotAI/BotAI.pdb',
  'addons/counterstrikesharp/plugins/BotAimImprover/BotAimImprover.deps.json',
  'addons/counterstrikesharp/plugins/BotAimImprover/BotAimImprover.dll',
  'addons/counterstrikesharp/plugins/BotAimImprover/BotAimImprover.pdb',
  'addons/counterstrikesharp/plugins/BotControllerImpl/BotControllerImpl.dll',
  'addons/counterstrikesharp/plugins/BotRandomizer/BotRandomizer.deps.json',
  'addons/counterstrikesharp/plugins/BotRandomizer/BotRandomizer.dll',
  'addons/counterstrikesharp/plugins/BotRandomizer/BotRandomizer.pdb',
  'addons/counterstrikesharp/plugins/BotState/BotState.deps.json',
  'addons/counterstrikesharp/plugins/BotState/BotState.dll',
  'addons/counterstrikesharp/plugins/BotState/BotState.pdb',
  'addons/counterstrikesharp/plugins/NadeSystem/NadeSystem.deps.json',
  'addons/counterstrikesharp/plugins/NadeSystem/NadeSystem.dll',
  'addons/counterstrikesharp/plugins/NadeSystem/NadeSystem.pdb',
  'addons/counterstrikesharp/shared/BotControllerApi/BotControllerApi.dll',
  'cfg/gamemode_casual.cfg',
  'cfg/gamemode_competitive.cfg',
  'cfg/gamemode_competitive2v2.cfg',
];

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

// ---------------------------------------------------------------- 1. rename folder + apply 1.4.7 files
if (!fs.existsSync(SRC)) {
  if (!fs.existsSync(PREV)) throw new Error(`neither ${SRC} nor ${PREV} exists`);
  fs.renameSync(PREV, SRC);
  console.log(`renamed ${path.basename(PREV)} -> ${path.basename(SRC)}`);
}
for (const rel of UPDATE) {
  const from = path.join(UP, rel);
  const to = path.join(SRC, rel);
  if (!fs.existsSync(from)) throw new Error('missing upstream file: ' + rel);
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}
console.log(`applied ${UPDATE.length} files from CS2-Bot-Improver 1.4.7`);

// ---------------------------------------------------------------- 2. manifest
const files = [];
for (const root of ['addons', 'cfg', 'overrides']) files.push(...walk(SRC, root));
files.sort();
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
console.log(`manifest ${VERSION}: ${entries.length} entries`);

// ---------------------------------------------------------------- 3. deploy to the CS2 install
// the panel parks bot plugins as "<name>.csbip-disabled" in cosmetics-preview mode,
// so write into the parked file when it exists instead of creating a duplicate
let wrote = 0;
let parked = 0;
for (const rel of files) {
  const src = path.join(SRC, rel);
  let dst = path.join(GAME, rel);
  if (!fs.existsSync(dst) && fs.existsSync(dst + '.csbip-disabled')) {
    dst += '.csbip-disabled';
    parked++;
  }
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  wrote++;
}
console.log(`deployed ${wrote} files to the CS2 install (${parked} written into panel-parked files)`);

// ---------------------------------------------------------------- 4. install record
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

// ---------------------------------------------------------------- 5. verify
function verify(root, label) {
  let missing = 0;
  let bad = 0;
  let parkedCount = 0;
  let policy = 0;
  for (const e of entries) {
    const p = path.join(root, e.path);
    if (!fs.existsSync(p)) {
      if (fs.existsSync(p + '.csbip-disabled')) {
        parkedCount++;
        continue;
      }
      missing++;
      continue;
    }
    if (fs.statSync(p).size !== e.size || sha256(p) !== e.sha256) {
      if (e.restore_policy === 'preserve-config') policy++;
      else bad++;
    }
  }
  console.log(`${label}: missing=${missing} mismatch=${bad} parked=${parkedCount} preserve-drift=${policy} -> ${missing + bad === 0 ? 'OK' : 'FAIL'}`);
  return missing + bad;
}
let fail = verify(SRC, 'panel payload');
fail += verify(GAME, 'CS2 install ');

// ---------------------------------------------------------------- 6. release staging + zips
const STAGE = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);
fs.rmSync(path.join(OUT, 'stage'), { recursive: true, force: true });
ensureDir(STAGE);
for (const rel of walk(SRC)) {
  if (rel.startsWith('.csbip/') || rel.startsWith('release/')) continue;
  if (/^(start-panel-with-proxy\.cmd|个人版说明\.md|CHANGELOG\.md)$/.test(rel)) continue;
  const dst = path.join(STAGE, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(SRC, rel), dst);
}
fs.copyFileSync(path.join(REPO, 'THIRD-PARTY-NOTICES.md'), path.join(STAGE, 'THIRD-PARTY-NOTICES.md'));
fs.copyFileSync(path.join(REPO, 'LICENSE'), path.join(STAGE, 'LICENSE'));
ensureDir(path.join(STAGE, 'licenses'));
for (const f of walk(path.join(REPO, 'licenses'))) fs.copyFileSync(path.join(REPO, 'licenses', f), path.join(STAGE, 'licenses', f));

const REL = path.join(OUT, 'release');
ensureDir(REL);
ensureDir(path.join(REL, 'keys'));
for (const f of walk(path.join(SRC, 'release/keys'))) fs.copyFileSync(path.join(SRC, 'release/keys', f), path.join(REL, 'keys', f));
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
Write-Output 'zips written'
`;
fs.writeFileSync(path.join(OUT, 'zip.ps1'), ps1, 'utf8');
console.log(execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(OUT, 'zip.ps1')], { encoding: 'utf8' }).trim());

execFileSync(process.execPath, ['F:/DeepSeek_harness_ws/cs2/make-feed.js', VERSION, VERSION, 'https://github.com/yjbwtf/my-local-arena'], {
  encoding: 'utf8',
  env: { ...process.env, RELEASE_DIR: REL },
  stdio: 'inherit',
});
console.log(`build complete: ${VERSION} ${fail === 0 ? '(all checks OK)' : '(checks FAILED)'}`);
process.exit(fail === 0 ? 0 : 1);
