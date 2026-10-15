const fs=require('fs'),path=require('path'),crypto=require('crypto');
const P='F:/LocalArena-v1.4.6.1-local', G='G:/SteamLibrary/steamapps/common/Counter-Strike Global Offensive/game/csgo';
const man=JSON.parse(fs.readFileSync(path.join(P,'plus-payload-manifest.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const e of man.entries){
  const gp=path.join(G,e.path);
  if(!fs.existsSync(gp)){ console.log('MISSING in game:',e.path); continue; }
  if(fs.statSync(gp).size!==e.size || sha(gp)!==e.sha256){
    const pp=path.join(P,e.path);
    const packOk=fs.existsSync(pp) && sha(pp)===e.sha256;
    console.log(`DIFFERS in game: ${e.path}`);
    console.log(`   policy=${e.restore_policy} ownership=${e.ownership} component=${e.component}`);
    console.log(`   manifest size=${e.size} game size=${fs.statSync(gp).size} mtime=${fs.statSync(gp).mtime.toISOString()}`);
    console.log(`   manifest sha=${e.sha256.slice(0,16)} game sha=${sha(gp).slice(0,16)} panel-payload-matches-manifest=${packOk}`);
  }
}
