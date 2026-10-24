const fs=require('fs'),path=require('path');
const P='F:/LocalArena-v1.4.6.2-local';
function walk(root,rel=''){const o=[];for(const e of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const r=rel?rel+'/'+e.name:e.name;if(e.isDirectory())o.push(...walk(root,r));else o.push(r);}return o;}
const roots=['addons','cfg','overrides'];
let files=[]; for(const r of roots) files=files.concat(walk(P,r));
files.sort();
const old=JSON.parse(fs.readFileSync(P+'/plus-payload-manifest.json','utf8')).entries.map(e=>e.path);
const oldSet=new Set(old), newSet=new Set(files);
const added=files.filter(f=>!oldSet.has(f));
const removed=old.filter(f=>!newSet.has(f));
console.log('payload files now:',files.length,' old manifest:',old.length);
console.log('added:',added.length); added.slice(0,20).forEach(f=>console.log('   + '+f));
console.log('removed:',removed.length); removed.slice(0,20).forEach(f=>console.log('   - '+f));
fs.writeFileSync('F:/DeepSeek_harness_ws/cs2/out/payload-list-1462.json',JSON.stringify(files,null,1));
