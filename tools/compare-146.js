/*
 * Compare the currently installed payload with the upstream CS2-Bot-Improver 1.4.6
 * payload, so the merge can be a deliberate decision instead of a blind overwrite.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CUR = 'F:/LocalArena-v1.4.3.4-local';
const E = 'F:/DeepSeek_harness_ws/cs2/downloads/extract-1.4.6';

// layer we deliberately keep from the current install (pinned runtime + Local-Arena plus components)
const KEEP = [
  /^addons\/counterstrikesharp\/(api|bin|dotnet|lang|configs|gamedata|source)\//,
  /^addons\/metamod\//,
  /^addons\/metamod\.vdf$/,
  /^addons\/metamod_x64\.vdf$/,
  /^addons\/RayTrace\//,
  /^addons\/counterstrikesharp\/plugins\/RayTraceImpl\//,
  /^addons\/BotHider\//,
  /^addons\/counterstrikesharp\/plugins\/BotHiderImpl\//,
  /^addons\/counterstrikesharp\/shared\/(BotHiderApi|0Harmony)\//,
  /^addons\/counterstrikesharp\/plugins\/(PlayerKnifeCustomizer|PlusMatchCoordinator|OfflineMatchTelemetry|TeamLineupInjector)\//,
  /^cfg\/my_bot_(ffa|normal)_config\.cfg$/,
  /^overrides\//,
  /^addons\/counterstrikesharp\/plugins\/README\.txt$/,
];

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(root, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...walk(root, r));
    else out.push(r);
  }
  return out;
}

const cur = walk(CUR).filter((f) => /^(addons|cfg|overrides)\//.test(f));
const up = walk(E).filter((f) => /^(addons|cfg|overrides)\//.test(f));
const curSet = new Set(cur);
const upSet = new Set(up);

const update = [];
const keepBecausePinned = [];
const newFromUpstream = [];
const onlyCurrent = [];

for (const f of up) {
  const pinned = KEEP.some((re) => re.test(f));
  if (!curSet.has(f)) {
    newFromUpstream.push(f);
    continue;
  }
  const same = sha(path.join(CUR, f)) === sha(path.join(E, f));
  if (same) continue;
  (pinned ? keepBecausePinned : update).push(f);
}
for (const f of cur) if (!upSet.has(f) && !KEEP.some((re) => re.test(f))) onlyCurrent.push(f);

const group = (list) => {
  const g = {};
  for (const f of list) {
    const k = f.split('/').slice(0, 4).join('/');
    g[k] = (g[k] || 0) + 1;
  }
  return Object.entries(g).sort();
};

console.log(`current payload files: ${cur.length}   upstream 1.4.6 payloade files: ${up.length}`);
console.log(`\n=== would UPDATE from 1.4.6 (${update.length})`);
for (const [k, n] of group(update)) console.log(`   ${k} (${n})`);
console.log(update.filter((f) => !/_catalog|charm_placements|grenades\//.test(f)).join('\n'));
console.log(`\n=== differs but PINNED (kept current) (${keepBecausePinned.length})`);
console.log(keepBecausePinned.join('\n'));
console.log(`\n=== new files only in 1.4.6 (${newFromUpstream.length})`);
console.log(newFromUpstream.join('\n'));
console.log(`\n=== only in current payload, not in 1.4.6 (${onlyCurrent.length})`);
console.log(onlyCurrent.join('\n'));
