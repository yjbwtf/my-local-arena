/*
 * Build 1.4.7.3: CS2 1.41.9.7 (build 2000943, 2026-11-11/12) compatibility.
 *
 * Root cause of the 2026-11-12 start-up crashes:
 *   1.41.9.7 changed IGameEventSystem::PostEventAbstract's net-message handle
 *   from INetworkMessageImpl (polymorphic INetworkMessageInternal*) to a plain
 *   NetMessageInfo_t record. CounterStrikeSharp 1.0.378/1.0.379 still called
 *   GetNetMessageInfo() virtually on it:
 *     - UserMessage::GetMessageID()  -> 0xc0000005 @ counterstrikesharp.dll+0xbc7cb
 *       (read at 0xffffffff00000000, ~4s after launch / at every user message)
 *     - ClientPrint native           -> 0xc0000005 in coreclr when a plugin used
 *       Utilities.PrintToChat (e.g. RoundDamageRecap at round start)
 *
 * Upstream fixed it in commit 2eb9a57 ("fix: Game Update 1.41.9.7", PR #1490)
 * and released CounterStrikeSharp v1.0.380 on 2026-11-12.
 *
 * Also in this build: Steam's 1.41.9.7 update overwrote
 * cfg/gamemode_retakecasual.cfg (added mp_bot_ai_bt, reset freezetime/restart
 * delay, dropped "exec my_bot_normal_config.cfg"), which made the panel report
 * a hash mismatch. The file is merged: new official mp_bot_ai_bt kept, our
 * freezetime 7 / restart delay 5 / exec line re-applied.
 *
 * Everything else (enhanced bots 1.4.7-era, plus components) is unchanged:
 * upstream CS2-Bot-Improver has not released a 1.41.9.7 build yet (latest is
 * v1.4.8 from 2026-11-07; its BotController/BotHider APIs are incompatible
 * with the locally compiled Impl/PlusMatchCoordinator plugins).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const VERSION = '1.4.7.3';
const SRC = 'F:/LocalArena-v1.4.7.2-local';
const GAME = 'G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const OUT = 'F:/DeepSeek_harness_ws/others/cs2-crash-fix/out-1473';
const REPO = 'F:/DeepSeek_harness_ws/others/cs2-crash-fix/repo';
const FEED_BASE = 'https://github.com/yjbwtf/my-local-arena';
const KEYS = path.join(SRC, 'release/keys');

const CSS_BIN = 'addons/counterstrikesharp/bin/win64/counterstrikesharp.dll';
const CSS_BIN_SHA = 'afdaae023f5d7d6c7b18619a547be0805a94892258c9e74bebc8a80069d07e03';
const CSS_API = 'addons/counterstrikesharp/api/CounterStrikeSharp.API.dll';

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

// ---------------------------------------------------------------- preconditions
if (sha256(path.join(SRC, CSS_BIN)) !== CSS_BIN_SHA) {
  throw new Error('CounterStrikeSharp binary is not the official 1.0.380 build');
}
const apiDll = fs.readFileSync(path.join(SRC, CSS_API)).toString('latin1');
if (!apiDll.includes('1.0.380')) throw new Error('CounterStrikeSharp.API is not 1.0.380');

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

// ---------------------------------------------------------------- install record
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

// ---------------------------------------------------------------- verify (no deploy: payload already deployed)
function verify(root, label) {
  let missing = 0;
  let bad = 0;
  let parked = 0;
  let policy = 0;
  for (const e of entries) {
    const p = path.join(root, e.path);
    if (!fs.existsSync(p)) {
      if (fs.existsSync(p + '.csbip-disabled')) { parked++; continue; }
      missing++;
      continue;
    }
    if (fs.statSync(p).size !== e.size || sha256(p) !== e.sha256) {
      if (e.restore_policy === 'preserve-config') policy++;
      else bad++;
    }
  }
  console.log(`${label}: missing=${missing} mismatch=${bad} parked=${parked} preserve-drift=${policy} -> ${missing + bad === 0 ? 'OK' : 'FAIL'}`);
  return missing + bad;
}
let fail = verify(SRC, 'panel payload');
fail += verify(GAME, 'CS2 install ');

// ---------------------------------------------------------------- stage + zip
const STAGE = path.join(OUT, 'stage', `LocalArena-v${VERSION}-windows`);
fs.rmSync(path.join(OUT, 'stage'), { recursive: true, force: true });
ensureDir(STAGE);

// payload contents
for (const rel of files) {
  const dst = path.join(STAGE, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(path.join(SRC, rel), dst);
}
fs.copyFileSync(path.join(SRC, 'plus-payload-manifest.json'), path.join(STAGE, 'plus-payload-manifest.json'));
fs.copyFileSync(path.join(SRC, 'LocalArena.exe'), path.join(STAGE, 'LocalArena.exe'));
for (const name of ['README.md', 'README.zh-CN.md']) {
  const p = path.join(REPO, name);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(STAGE, name));
  else if (fs.existsSync(path.join(SRC, name))) fs.copyFileSync(path.join(SRC, name), path.join(STAGE, name));
}
for (const name of ['LICENSE', 'THIRD-PARTY-NOTICES.md', 'CHANGELOG.md']) fs.copyFileSync(path.join(REPO, name), path.join(STAGE, name));
ensureDir(path.join(STAGE, 'licenses'));
for (const f of walk(path.join(REPO, 'licenses'))) fs.copyFileSync(path.join(REPO, 'licenses', f), path.join(STAGE, 'licenses', f));

const REL = path.join(OUT, 'release');
ensureDir(REL);
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

// ---------------------------------------------------------------- signed feed
const pluginZip = path.join(REL, `LocalArena-plugin-v${VERSION}-windows.zip`);
const fullZip = path.join(REL, `LocalArena-v${VERSION}-windows.zip`);
const pluginStat = fs.statSync(pluginZip);
const prevFeed = JSON.parse(fs.readFileSync(path.join(REPO, 'feed/latest.json'), 'utf8'));
const latest = {
  schema_version: 1,
  release_version: VERSION,
  published_at: new Date().toISOString(),
  release_notes_url: `${FEED_BASE}/releases/tag/v${VERSION}`,
  components: {
    panel: { ...prevFeed.components.panel, version: '1.4.3.3' },
    plugin: {
      version: VERSION,
      url: `${FEED_BASE}/releases/download/v${VERSION}/LocalArena-plugin-v${VERSION}-windows.zip`,
      size: pluginStat.size,
      sha256: sha256(pluginZip),
      min_panel_version: '1.4.3.3',
    },
  },
};
const text = JSON.stringify(latest, null, 2);
fs.writeFileSync(path.join(REL, 'latest.json'), text, 'utf8');
const privPem = fs.readFileSync(path.join(KEYS, 'local-update-signing-key.pem'));
const priv = crypto.createPrivateKey(privPem);
fs.writeFileSync(path.join(REL, 'latest.json.sig'), crypto.sign(null, Buffer.from(text, 'utf8'), priv).toString('base64') + '\n', 'ascii');

const sums = [];
for (const name of [`LocalArena-v${VERSION}-windows.zip`, `LocalArena-plugin-v${VERSION}-windows.zip`, 'latest.json', 'latest.json.sig']) {
  sums.push(`${sha256(path.join(REL, name))}  ${name}`);
}
fs.writeFileSync(path.join(REL, 'SHA256SUMS.txt'), sums.join('\n') + '\n', 'ascii');
console.log(sums.join('\n'));
console.log(`build complete: ${VERSION} ${fail === 0 ? '(checks OK)' : '(checks FAILED)'}`);
process.exit(fail === 0 ? 0 : 1);
