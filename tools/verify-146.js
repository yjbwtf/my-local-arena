const fs=require('fs'),path=require('path'),crypto=require('crypto');
const VERSION='1.4.6.1';
const P=`F:/LocalArena-v${VERSION}-local`;
const GAME='G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const SERVER=GAME+'/bin/win64/server.dll';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const man=JSON.parse(fs.readFileSync(path.join(P,'plus-payload-manifest.json'),'utf8'));
console.log(`manifest: version=${man.package_version} entries=${man.entries.length}`);
// "preserve-config" entries (player presets, bot options, difficulty botprofile.vpk)
// are expected to diverge on purpose - the panel rewrites them and does not treat
// them as payload corruption - so they are reported separately and never fail.
function verify(root,label){
  let miss=0,bad=0,policy=0;const policyPaths=[];
  for(const e of man.entries){
    const p=path.join(root,e.path);
    if(!fs.existsSync(p)){miss++;continue;}
    if(fs.statSync(p).size!==e.size||sha(p)!==e.sha256){
      if(e.restore_policy==='preserve-config'){policy++;policyPaths.push(e.path);}
      else bad++;
    }
  }
  console.log(`${label}: missing=${miss} mismatch=${bad} preserve-config-drift=${policy} -> ${miss+bad===0?'OK':'FAIL'}`);
  for(const p of policyPaths) console.log(`      (expected) ${p}`);
  return miss+bad;
}
let fail=verify(P,'panel payload (package)')+verify(GAME,'CS2 install     (target) ');
// record check
const inst=path.join(P,'.csbip/installations');
for(const id of fs.readdirSync(inst)){const rp=path.join(inst,id,'record.json');if(!fs.existsSync(rp))continue;const rec=JSON.parse(fs.readFileSync(rp,'utf8'));const mm=new Map(man.entries.map(e=>[e.path,e.sha256]));let stale=0;for(const e of rec.entries) if(mm.get(e.path)!==e.installed_sha256) stale++;console.log(`install record ${id}: version=${rec.package_version} entries=${rec.entries.length} stale=${stale} -> ${stale===0?'OK':'FAIL'}`);fail+=stale;}
// signature checks
const dll=fs.readFileSync(path.join(P,'addons/counterstrikesharp/plugins/PlayerKnifeCustomizer/PlayerKnifeCustomizer.dll')).toString('utf16le');
const NEW='48 89 4C 24 ? 53 41 55 41 56', OLD='40 53 55 41 56 48 81 EC 90 00 00 00';
console.log(`skin plugin signature: new=${dll.includes(NEW)} old=${dll.includes(OLD)} -> ${dll.includes(NEW)&&!dll.includes(OLD)?'OK':'FAIL'}`);
const buf=fs.readFileSync(SERVER); const parts=NEW.split(' ').map(x=>x==='?'?-1:parseInt(x,16));
let hits=0; for(let i=0;i<=buf.length-parts.length;i++){ if(parts[0]>=0&&buf[i]!==parts[0])continue; let ok=true; for(let j=1;j<parts.length;j++) if(parts[j]>=0&&buf[i+j]!==parts[j]){ok=false;break;} if(ok)hits++; }
console.log(`server.dll (${buf.length} bytes): signature matches=${hits} -> ${hits===1?'OK':'CHECK'}`);
// 1.4.6 files present
const up='F:/DeepSeek_harness_ws/cs2/downloads/extract-1.4.6';
for(const f of ['addons/counterstrikesharp/plugins/BotAimImprover/BotAimImprover.dll','addons/counterstrikesharp/plugins/BotState/BotState.dll']){
  const same=sha(path.join(P,f))===sha(path.join(up,f));
  console.log(`1.4.6 file ${f.split('/').pop()}: matches upstream -> ${same?'OK':'FAIL'}`);
}
// vpk check
const vpk=fs.readFileSync(path.join(P,'overrides/High/botprofile.vpk'));
console.log(`overrides/High/botprofile.vpk size=${vpk.length} (expect 116082) -> ${vpk.length===116082?'OK':'CHECK'}`);
process.exit(fail===0?0:1);
