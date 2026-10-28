import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateConfig} from '../public/js/runtime-config.mjs';
const root=new URL('../',import.meta.url);
validateConfig(JSON.parse(fs.readFileSync(new URL('public/api/payment-config.json',root),'utf8')));
const cli=process.env.APPDATA+'/npm/node_modules/firebase-tools/lib/bin/firebase.js';
if(!fs.existsSync(cli))throw Error('Firebase CLI not installed');
for(const [project,config] of [['tomsss','firebase.json'],['zpasss','firebase.zpass.json']]){
 const result=spawnSync(process.execPath,[cli,'deploy','--only','hosting','--project',project,'--config',config,'--non-interactive'],{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
