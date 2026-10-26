const fs=require('fs'),path=require('path'),crypto=require('crypto');
const CUR='F:/LocalArena-v1.4.6.2-local';
const UP='F:/DeepSeek_harness_ws/cs2/downloads/extract-1.4.7';
const KEEP=[
 /^addons\/counterstrikesharp\/(api|bin|dotnet|lang|configs|gamedata|source)\//,
 /^addons\/metamod\//, /^addons\/metamod\.vdf$/, /^addons\/metamod_x64\.vdf$/,
 /^addons\/RayTrace\//, /^addons\/counterstrikesharp\/plugins\/RayTraceImpl\//,
 /^addons\/BotHider\//, /^addons\/counterstrikesharp\/plugins\/BotHiderImpl\//,
 /^addons\/counterstrikesharp\/shared\/(BotHiderApi|0Harmony)\//,
 /^addons\/counterstrikesharp\/plugins\/(PlayerKnifeCustomizer|PlusMatchCoordinator|OfflineMatchTelemetry|TeamLineupInjector)\//,
 /^cfg\/my_bot_(ffa|normal)_config\.cfg$/, /^overrides\//,
 /^addons\/counterstrikesharp\/plugins\/README\.txt$/,
];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(root,rel=''){const o=[];for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const r=rel?rel+'/'+e.name:e.name;if(e.isDirectory())o.push(...walk(root,r));else o.push(r);}return o;}
const cur=walk(CUR).filter(f=>/^(addons|cfg|overrides)\//.test(f));
const up=walk(UP).filter(f=>/^(addons|cfg|overrides)\//.test(f));
const curSet=new Set(cur), upSet=new Set(up);
const update=[],pinned=[],added=[];
for(const f of up){
  const isPinned=KEEP.some(re=>re.test(f));
  if(!curSet.has(f)){ added.push(f); continue; }
  if(sha(path.join(CUR,f))===sha(path.join(UP,f))) continue;
  if(isPinned) pinned.push(f); else update.push(f);
}
const onlyCur=cur.filter(f=>!upSet.has(f));
const grp=l=>{const g={};for(const f of l){const k=f.split('/').slice(0,4).join('/');g[k]=(g[k]||0)+1;}return Object.entries(g).sort();};
console.log(`cur=${cur.length}  up1.4.7=${up.length}`);
console.log(`\n=== UPDATE from 1.4.7 (${update.length})`);
for(const [k,n] of grp(update)) console.log(`   ${k} (${n})`);
console.log(update.filter(f=>!/grenades\//.test(f)).join('\n'));
console.log(`\n=== differs but PINNED (${pinned.length})`); console.log(pinned.join('\n'));
console.log(`\n=== new in 1.4.7 (${added.length})`); console.log(added.join('\n'));
console.log(`\n=== only in current (${onlyCur.length})`); console.log(onlyCur.filter(f=>!/^addons\/counterstrikesharp\/(api|shared\/RayTraceApi|plugins\/RayTraceImpl)\//.test(f)).join('\n'));
writeVer();
function writeVer(){
  const dj=path.join(UP,'addons/counterstrikesharp/api/CounterStrikeSharp.API.dll');
  console.log('\n1.4.7 bundles CSS API:', fs.existsSync(dj)? require('child_process').execSync(`powershell -NoProfile -Command "(Get-Item '${dj}').VersionInfo.FileVersion"`).toString().trim() : 'n/a');
  for(const f of ['addons/BotHider/bin/win64/BotHider.dll','addons/BotController/bin/win64/BotController.dll','addons/BotVision/bin/win64/BotVision.dll']){
    const p=path.join(UP,f); const c=path.join(CUR,f);
    console.log(f, fs.existsSync(p)? (fs.existsSync(c)? (sha(p)===sha(c)?'same as current':'DIFFERS') : 'new') : 'not shipped');
  }
}
