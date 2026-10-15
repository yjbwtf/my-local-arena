#!/usr/bin/env node
/*
 * Local update feed server for the personal Local-Arena build.
 *
 *   node serve-updates.js
 *
 * Serves every allowed file in this folder, whatever the request path is: the
 * signed manifest decides which file the panel wants and only the file name is
 * used.
 *
 * The panel's HTTP client is built with reqwest `https_only(true)`, so a plain
 * HTTP feed is rejected ("builder error ... URL scheme is not allowed").
 * Drop a TLS identity into keys/ and this server switches to HTTPS:
 *
 *   keys/cert.pfx + keys/cert.pfx.pass   (PKCS#12, preferred)
 *   keys/cert.pem + keys/key.pem         (PEM)
 *
 * The certificate also has to be trusted by the panel's TLS backend; see
 * keys/README.txt for the certutil commands to add and remove it.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8791);
const ALLOWED_EXT = new Set(['.json', '.sig', '.zip', '.txt', '.pem']);
const PFX = path.join(ROOT, 'keys', 'cert.pfx');
const PFX_PASS = path.join(ROOT, 'keys', 'cert.pfx.pass');
const CERT = path.join(ROOT, 'keys', 'cert.pem');
const KEY = path.join(ROOT, 'keys', 'key.pem');

function handle(req, res) {
  const name = path.basename(new URL(req.url, `http://localhost:${PORT}`).pathname);
  const file = path.join(ROOT, name);
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !fs.existsSync(file)) {
    console.log(`404 ${req.url}`);
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  const body = fs.readFileSync(file);
  console.log(`200 ${req.url} -> ${name} (${body.length} bytes)`);
  res.writeHead(200, {
    'content-type': name.endsWith('.json') ? 'application/json' : 'application/octet-stream',
    'content-length': body.length,
  });
  res.end(body);
}

let tlsOptions = null;
if (fs.existsSync(PFX) && fs.existsSync(PFX_PASS)) {
  tlsOptions = { pfx: fs.readFileSync(PFX), passphrase: fs.readFileSync(PFX_PASS, 'utf8').trim() };
} else if (fs.existsSync(CERT) && fs.existsSync(KEY)) {
  tlsOptions = { cert: fs.readFileSync(CERT), key: fs.readFileSync(KEY) };
}

const scheme = tlsOptions ? 'https' : 'http';
// The panel may resolve "localhost" to ::1 or to 127.0.0.1, so listen on both.
const hosts = ['127.0.0.1', '::1'];
let listening = 0;
for (const host of hosts) {
  const server = tlsOptions ? https.createServer(tlsOptions, handle) : http.createServer(handle);
  server.on('error', (err) => console.log(`  ${host}:${PORT} not bound (${err.code})`));
  server.on('connection', (s) => console.log(`  TCP connection from ${s.remoteAddress}:${s.remotePort}`));
  server.on('secureConnection', (s) => console.log(`  TLS handshake OK (${s.getProtocol()})`));
  server.on('tlsClientError', (err, s) =>
    console.log(`  TLS client error: ${err.code || ''} ${err.message} (${s.remoteAddress})`)
  );
  server.listen(PORT, host, () => {
    console.log(`  listening on ${scheme}://${host}:${PORT}`);
    if (++listening === hosts.length) {
      console.log(`${scheme.toUpperCase()} update feed ready: ${scheme}://localhost:${PORT}/local-arena-feeds/releases/latest/download/latest.json`);
      console.log('Ctrl+C to stop.');
    }
  });
}
