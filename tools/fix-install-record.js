/*
 * Refresh the panel-side installation record so "已安装版本" and the managed-file
 * health check agree with the payload we just deployed.
 */
const fs = require('fs');
const path = require('path');

const P = 'F:/LocalArena-v1.4.3.4-local';
const VERSION = '1.4.3.4';
const instRoot = path.join(P, '.csbip/installations');
const man = JSON.parse(fs.readFileSync(path.join(P, 'plus-payload-manifest.json'), 'utf8'));

for (const id of fs.readdirSync(instRoot)) {
  const rp = path.join(instRoot, id, 'record.json');
  if (!fs.existsSync(rp)) continue;
  const rec = JSON.parse(fs.readFileSync(rp, 'utf8'));
  const old = new Map((rec.entries || []).map((e) => [e.path, e]));
  const entries = man.entries
    .map((m) => {
      const prev = old.get(m.path) || {
        path: m.path,
        original_existed: false,
        original_sha256: null,
        original_backup: null,
      };
      return {
        path: m.path,
        original_existed: prev.original_existed,
        original_sha256: prev.original_sha256,
        original_backup: prev.original_backup,
        installed_sha256: m.sha256,
        ownership: m.ownership,
        restore_policy: m.restore_policy,
      };
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  rec.package_version = VERSION;
  rec.entries = entries;
  fs.writeFileSync(rp, JSON.stringify(rec, null, 2), 'utf8');
  console.log(`${id}: package_version=${rec.package_version} entries=${entries.length} (was ${old.size})`);
}
