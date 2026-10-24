const fs=require('fs'),path=require('path');
const GAME='G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game';
const ADD=GAME+'/csgo/addons';
const MOD={server:GAME+'/csgo/bin/win64/server.dll',engine2:GAME+'/bin/win64/engine2.dll',client:GAME+'/csgo/bin/win64/client.dll',host:GAME+'/csgo/bin/win64/host.dll'};
const cache={};
const buf=n=>{ if(!(n in cache)) cache[n]=fs.existsSync(MOD[n])?fs.readFileSync(MOD[n]):null; return cache[n]; };
function scan(mod,pat){
  const b=buf(mod); if(!b) return -1;
  const p=String(pat).trim().split(/\s+/).map(x=>/^\?+$/.test(x)?-1:parseInt(x,16));
  if(p.length<4||p.some(v=>Number.isNaN(v))) return -1;
  const a=p.findIndex(v=>v>=0); let hits=0;
  for(let i=0;i+p.length<=b.length;i++){ if(b[i+a]!==p[a]) continue; let ok=true; for(let j=a;j<p.length;j++){ if(p[j]>=0&&b[i+j]!==p[j]){ok=false;break;} } if(ok){hits++; if(hits>1)return hits;} }
  return hits;
}
const best=pat=>{ for(const m of ['server','engine2','client','host']){ const h=scan(m,pat); if(h===1) return m; } return null; };
for(const n of ['BotHider','BotController','BotVision']){
  const f=path.join(ADD,n,'gamedata.json');
  if(!fs.existsSync(f)){ console.log(`${n}: no gamedata.json`); continue; }
  const gd=JSON.parse(fs.readFileSync(f,'utf8'));
  const flat=[]; (function w(o,pre){ for(const k of Object.keys(o)){ const v=o[k]; if(typeof v==='string'&&/^[0-9A-Fa-f?]{2}( [0-9A-Fa-f?]{1,2})+$/.test(v.trim())) flat.push([pre+k,v]); else if(v&&typeof v==='object') w(v,pre+k+'.'); } })(gd,'');
  const bad=flat.filter(([,p])=>!best(p));
  console.log(`${n.padEnd(14)} ${flat.length} sig(s): ${bad.length?bad.length+' NOT FOUND':'all resolve'}`);
  for(const [k] of bad.slice(0,10)) console.log('      NOT FOUND '+k);
}
writeLogs();
function writeLogs(){
  for(const f of ['BotHider','BotController','BotVision']){
    const d=path.join(ADD,f,'logs');
    if(fs.existsSync(d)){ const files=fs.readdirSync(d).sort(); const last=files[files.length-1]; const p=path.join(d,last);
      const t=fs.readFileSync(p,'utf8').trim().split('\n'); console.log(`--- ${f}/${last} (${t.length} lines) last 3:`); console.log(t.slice(-3).map(l=>'     '+l.slice(0,160)).join('\n')); }
  }
}
