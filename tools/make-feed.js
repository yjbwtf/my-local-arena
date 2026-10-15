/*
 * Build the signed update feed (latest.json + latest.json.sig) and SHA256SUMS.txt
 * for a personal Local-Arena build.
 *
 *   node make-feed.js <version> [pluginFeedVersion] [feedBase]
 *
 * feedBase is where the release assets will live. The panel's own manifest URL is
 * patched separately (repatch-panel.js, must be exactly 77 bytes), but the plugin
 * ZIP url inside latest.json must point at the real asset location:
 *
 *   own GitHub release : https://github.com/<owner>/<repo>
 *   local TLS feed     : https://localhost:8791/local-arena-feeds
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VERSION = process.argv[2] || '1.4.6.1';
const FEED_BASE = process.argv[4] || process.env.FEED_BASE || 'https://github.com/OWNER/REPO';
const RELEASE = process.env.RELEASE_DIR || `F:/LocalArena-v${VERSION}-local/release`;
const KEYS = path.join(RELEASE, 'keys');
const pluginZipName = `LocalArena-plugin-v${VERSION}-windows.zip`;
const fullZipName = `LocalArena-v${VERSION}-windows.zip`;
const feedPluginVersion = process.argv[3] || VERSION;

const officialLatest = 'F:/LocalArena-v1.4.3.3-windows/.csbip/updates/latest.json';
const official = JSON.parse(fs.readFileSync(officialLatest, 'utf8'));

const pluginZip = path.join(RELEASE, pluginZipName);
if (!fs.existsSync(pluginZip)) throw new Error(`missing ${pluginZip} - build the ZIPs first`);
const stat = fs.statSync(pluginZip);
const sha = crypto.createHash('sha256').update(fs.readFileSync(pluginZip)).digest('hex');

const latest = {
  schema_version: 1,
  release_version: VERSION,
  published_at: new Date().toISOString(),
  release_notes_url: 'https://github.com/numakkiyu/Local-Arena/releases',
  components: {
    // keep the pinned official panel entry so the running panel never tries to replace itself
    panel: { ...official.components.panel, version: '1.4.3.3' },
    plugin: {
      version: feedPluginVersion,
      url: `${FEED_BASE}/releases/download/v${VERSION}/${pluginZipName}`,
      size: stat.size,
      sha256: sha,
      min_panel_version: '1.4.3.3',
    },
  },
};
const latestPath = path.join(RELEASE, 'latest.json');
const text = JSON.stringify(latest, null, 2);
fs.writeFileSync(latestPath, text, 'utf8');

const seed = crypto.createPrivateKey(fs.readFileSync(path.join(KEYS, 'local-update-signing-key.pem')));
fs.writeFileSync(
  path.join(RELEASE, 'latest.json.sig'),
  crypto.sign(null, Buffer.from(text, 'utf8'), seed).toString('base64') + '\n',
  'ascii'
);

const sums = [];
for (const name of [pluginZipName, fullZipName, 'latest.json', 'latest.json.sig']) {
  const p = path.join(RELEASE, name);
  if (fs.existsSync(p)) sums.push(`${crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}  ${name}`);
}
fs.writeFileSync(path.join(RELEASE, 'SHA256SUMS.txt'), sums.join('\n') + '\n', 'ascii');
console.log(`feed: plugin=${feedPluginVersion} url=${latest.components.plugin.url}`);
console.log(sums.join('\n'));
