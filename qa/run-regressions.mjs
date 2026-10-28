import {spawn} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {BASE,ROOT,output} from './config.mjs';
import {serveFrozen} from './server.mjs';
const server=await serveFrozen(),out=path.join(ROOT,'evidence/regressions');await fs.mkdir(out,{recursive:true});
try{
 const child=spawn(process.execPath,[path.join(BASE,'tests/fixes.browser.mjs')],{cwd:BASE,env:{...process.env,GAME_URL:server.origin,EVIDENCE_DIR:out},stdio:['ignore','pipe','pipe'],windowsHide:true});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);const code=await new Promise(r=>child.on('exit',r));await output('regressions/driver-output.txt',stdout+stderr);const r=JSON.parse(await fs.readFile(path.join(out,'fixes-browser-report.json'),'utf8'));r.bundleSha256=server.bundleSha256;await output('regressions/fixes-browser-report.json',r);assert(code===0&&r.success,r.failure||stderr);console.log(JSON.stringify({success:r.success,corners:r.corners.length,distance:r.distance,pointerLock:r.pointerLock,checks:r.checks}));
}finally{await server.close();}
