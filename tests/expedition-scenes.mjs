// Explicit staged render fixtures, not gameplay or save compatibility evidence.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out='evidence/scenes';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],shots=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:5183/')+'?qa=1',{waitUntil:'networkidle'});await page.click('#new-game');
 for(const quality of ['low','medium']){
  await page.evaluate(()=>window.__ASH_QA__.setScreen('menu'));await page.selectOption('#quality',quality);await page.evaluate(()=>window.__ASH_QA__.setScreen('play'));
  for(const fixture of [{id:'post-before',time:120,repaired:false},{id:'post-restored',time:120,repaired:true},{id:'post-storm',time:155,repaired:true},{id:'post-after-storm',time:200,repaired:true}]){
   await page.evaluate(f=>{const s=window.__ASH__.snapshot();s.mode='benchmark';s.time=f.time;s.player={x:75,z:-5,yaw:0,pitch:0};s.shelter.workbench=true;s.outpost.repaired=f.repaired;s.outpost.waterOnline=f.repaired;s.outpost.waterRemaining=f.repaired?3:0;s.outpost.waterTaken=0;window.__ASH_QA__.setState(s);document.querySelector('#toast').style.opacity=0;},fixture);
   await page.evaluate(()=>new Promise(resolve=>{let n=0;function f(){if(++n>=240)resolve();else requestAnimationFrame(f);}requestAnimationFrame(f);}));
   const file=`${out}/${quality}-${fixture.id}.jpg`;await page.screenshot({path:file});shots.push({quality,...fixture,file});
  }
 }
 assert.equal(errors.length,0);await fs.writeFile(out+'/scenes.json',JSON.stringify({success:true,mode:'explicit fixed render states; no gameplay claims',shots,errors},null,2));console.log('Eight low/medium expedition render scenes passed.');
}finally{await browser.close();}
