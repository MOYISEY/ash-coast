// Diagnostic playthrough with known coordinates, real keyboard and UI inputs.
// No teleports, free resources, disabled enemies or mutation helpers in the main run.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialState,makeWorld,activeColliders,collides,lineClear,LOOT,SAVE_KEY,LEGACY_SAVE_KEY,OUTPOST,STORM,stormStatus} from '../src/core.js';
import {SUPPLY_TRAIL} from '../src/exploration.js';
const url=process.env.GAME_URL||'http://127.0.0.1:5188/';
const out=process.env.EVIDENCE_DIR||'evidence/playthrough';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1}),page=await context.newPage();
const world=makeWorld(),errors=[],report={version:'0.4.1',browser:browser.version(),viewport:{width:1280,height:720},checks:[],milestones:[],mainRun:{realKeyboard:true,knownCoordinates:true,teleports:false,resourceInjection:false,enemiesDisabled:false},errors};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
const snap=()=>page.evaluate(()=>window.__ASH__.snapshot());
function pathTo(s,goal){
 const obstacles=activeColliders(s,world.colliders),key=(x,z)=>`${x},${z}`,queue=[[Math.round(s.player.x),Math.round(s.player.z)]],came=new Map([[key(...queue[0]),null]]);let end;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];if(Math.hypot(x-goal.x,z-goal.z)<.9){end=[x,z];break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!came.has(k)&&!collides(nx,nz,obstacles,.68)){came.set(k,[x,z]);queue.push([nx,nz]);}}
 }
 assert(end,'reachable goal '+JSON.stringify(goal));const result=[];for(let p=end;p;p=came.get(key(...p)))result.push({x:p[0],z:p[1]});return result.reverse();
}
async function walk(goal){
 let last=null,stuck=0;
 for(let i=0;i<700;i++){
  const s=await snap();assert.equal(s.mode,'playing','survives route');if(Math.hypot(s.player.x-goal.x,s.player.z-goal.z)<1.25)return;
  if(s.hp<60&&s.inventory.med)await page.keyboard.press('Digit3');if(s.thirst<50&&s.inventory.water)await page.keyboard.press('Digit2');if(s.hunger<50&&s.inventory.food)await page.keyboard.press('Digit1');
  if(s.filter<30&&s.inventory.filter&&s.radiation>8)await page.keyboard.press('Digit4');
  if(await defend(s))continue;
  const path=pathTo(s,goal);let target=path[1]||goal;
  if(path.length>2){const dx=path[1].x-path[0].x,dz=path[1].z-path[0].z;for(let j=2;j<Math.min(path.length,5);j++){if(path[j].x-path[j-1].x!==dx||path[j].z-path[j-1].z!==dz)break;target=path[j];}}
  const dx=target.x-s.player.x,dz=target.z-s.player.z,horizontal=Math.abs(dx)>Math.abs(dz),key=horizontal?(dx>0?'KeyD':'KeyA'):(dz>0?'KeyS':'KeyW'),duration=Math.max(45,Math.min(950,Math.abs(horizontal?dx:dz)/4.2*1000));
  await page.keyboard.press('KeyR');await page.keyboard.down(key);await page.waitForTimeout(duration);await page.keyboard.up(key);
  if(last&&Math.hypot(last.x-s.player.x,last.z-s.player.z)<.02)stuck++;else stuck=0;if(stuck>8)throw Error('stuck '+JSON.stringify(s.player));last={...s.player};
 }
 throw Error('route iteration limit');
}
async function defend(s){
 const obstacles=activeColliders(s,world.colliders),enemy=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-s.player.x,e.z-s.player.z)<14&&lineClear(s.player,e,obstacles)).sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z))[0];
 if(!enemy||s.inventory.ammo<1)return false;
 const angle=Math.atan2(-(enemy.x-s.player.x),-(enemy.z-s.player.z)),delta=Math.atan2(Math.sin(angle-s.player.yaw),Math.cos(angle-s.player.yaw));
 if(Math.abs(delta)>.015){const key=delta>0?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);await page.waitForTimeout(Math.abs(delta)/1.7*1000);await page.keyboard.up(key);}
 await page.waitForFunction(()=>window.__ASH__.snapshot().shotCool===0);await page.keyboard.press('Space');await page.waitForTimeout(60);return true;
}
async function milestone(name){const s=await snap();report.milestones.push({name,time:s.time,hp:s.hp,radiation:s.radiation,filter:s.filter,inventory:s.inventory,outpost:s.outpost,storm:s.storm,outpost:s.outpost,storm:s.storm,shelter:s.shelter,gateOpened:s.gateOpened,parts:s.parts,steps:s.steps});console.log(name);}
async function collect(id){
 if((await snap()).collected.includes(id))return;const item=LOOT.find(l=>l.id===id);assert(item);await walk(item);
 for(let i=0;i<5&&!(await snap()).collected.includes(id);i++){await page.keyboard.press('KeyE');await page.waitForTimeout(40);}
 assert((await snap()).collected.includes(id),'collected '+id);await milestone('Collected '+id);
}
async function workshop(){await walk({x:2,z:83});await page.keyboard.press('KeyB');assert(await page.locator('#workshop').isVisible());}
async function reloadCheck(label){
 await page.keyboard.press('F5');const saved=await snap();await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');const loaded=await snap();
 for(const key of ['inventory','parts','collected','shelter','gateOpened','crafted','outpost'])assert.deepEqual(loaded[key],saved[key],label+' '+key);
 assert(Math.hypot(loaded.player.x-saved.player.x,loaded.player.z-saved.player.z)<.1);report.checks.push(label);
}
const legacy=await fs.readFile(new URL('./fixtures/save-v2.json',import.meta.url),'utf8');
try{
 await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:LEGACY_SAVE_KEY,raw:legacy});await page.reload({waitUntil:'networkidle'});
 assert(await page.locator('#continue-game').isDisabled());assert.match(await page.locator('#save-note').innerText(),/0\.2/);report.checks.push('Real v2 save explicitly refused, retained verbatim under original key');
 await page.click('#new-game');await collect('shore-crate');await collect('relay-crate');await collect('garage-crate');
 await workshop();await page.click('#upgrade-workbench');await page.click('#craft-outpostKit');assert.equal((await snap()).inventory.outpostKit,1);assert(await page.locator('#craft-outpostKit').isDisabled());await page.screenshot({path:out+'/01-preparation.jpg'});await page.keyboard.press('KeyB');
 await reloadCheck('Workbench and unique outpost kit survive full reload');
 // Chosen approach: longer coast arc after the sheltered pump. No teleport or state mutation.
  await walk({x:20,z:43});
  await walk({x:51,z:36});await collect('cell');await collect('pump-crate');
 await walk({x:83,z:43});await milestone('Chose open coast route');await page.screenshot({path:out+'/02-coast-route.jpg'});
 await collect('coast-crate');await walk({x:75,z:-16});
 if(!(await snap()).outpost.repaired)await page.keyboard.press('KeyE');assert((await snap()).outpost.repaired);assert.equal((await snap()).inventory.outpostKit,0);
 await walk(OUTPOST.pump);await page.keyboard.press('KeyE');assert((await snap()).outpost.waterOnline);await page.keyboard.press('KeyE');assert.equal((await snap()).outpost.waterTaken,1);
 await milestone('Restored outpost and drew clean water');await page.screenshot({path:out+'/03-restored-water.jpg'});await reloadCheck('Restored outpost, finite clean water and consumed kit survive full reload');
 if((await snap()).time<STORM.warningAt)await page.waitForFunction(t=>window.__ASH__.snapshot().time>=t,STORM.warningAt,{timeout:110000});
 assert.equal(stormStatus(await snap()).phase,'warning','arrives before the active storm');await page.screenshot({path:out+'/04-warning.jpg'});
 await page.waitForFunction(t=>window.__ASH__.snapshot().time>=t,STORM.startsAt,{timeout:70000});assert.equal(stormStatus(await snap()).phase,'active');
 await reloadCheck('Active storm reload preserves clock, coverage, water and expedition state');
 await page.keyboard.press('Escape');const paused=await snap();await page.waitForTimeout(600);assert.equal((await snap()).time,paused.time);await page.click('#resume');report.checks.push('Real Escape pause freezes active storm clock');
 await walk({x:75,z:-8});await page.keyboard.press('KeyR');await page.screenshot({path:out+'/05-storm-outside.jpg'});await walk({x:75,z:-16});await page.keyboard.press('KeyR');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1848);await page.keyboard.up('ArrowLeft');await page.screenshot({path:out+'/05-storm-sheltered.jpg'});await page.waitForFunction(t=>window.__ASH__.snapshot().time>=t,STORM.endsAt,{timeout:95000});
 assert.equal(stormStatus(await snap()).phase,'settled');assert((await snap()).storm.sheltered>45);await page.screenshot({path:out+'/06-after-storm.jpg'});await milestone('Survived warned storm under restored roof');
 await collect('antenna');await collect('ruins-crate');await workshop();await page.click('#upgrade-purifier');await page.click('#craft-filter');await page.click('#craft-gateKit');
 assert((await snap()).shelter.purifier);assert.equal((await snap()).inventory.gateKit,1);await page.keyboard.press('KeyB');await reloadCheck('Later preparation and new expedition state survive reload');
 // Traverse the shorter contaminated corridor on this later leg, after weather passed.
 await walk({x:20,z:43});
  for(const [x,z]of SUPPLY_TRAIL)await walk({x,z});
  await page.keyboard.press('KeyR');await page.screenshot({path:out+'/01b-discovery-before.jpg'});const supplyBefore=(await snap()).inventory.ammo;await collect('cache8');assert.equal((await snap()).inventory.ammo,supplyBefore+4);
  await page.waitForFunction(()=>document.querySelector('#weather').textContent.includes('запас взят'));await page.screenshot({path:out+'/01c-discovery-collected.jpg'});await reloadCheck('Ordinary-control supply trail, finite ammo reward and collected discovery survive reload');
  await walk({x:32,z:6});await page.screenshot({path:out+'/07-short-pipe-route.jpg'});await milestone('Traversed shorter contaminated pipe route');
 await walk({x:48,z:-56});await page.keyboard.press('KeyE');assert((await snap()).gateOpened);await walk({x:40,z:-56});await collect('module');await reloadCheck('Factory part and open service gate survive reload');
 await walk({x:73,z:-21});const wiring=await snap();await page.keyboard.press('KeyE');assert.equal((await snap()).mode,'won');assert.equal((await snap()).inventory.scrap,wiring.inventory.scrap-1);assert.equal((await snap()).inventory.wire,wiring.inventory.wire-1);await page.screenshot({path:out+'/08-victory.jpg'});report.finish=await snap();report.checks.push('Full preparation, two traversed routes, warned storm, restored second shelter/water and final link via real controls');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_SAVE_KEY),legacy);
 const won=await snap();await page.click('#end-new');await page.click('#confirm-new-no');assert.deepEqual(await snap(),won);await page.click('#end-new');await page.click('#confirm-new-yes');
 const backup=JSON.parse(await page.evaluate(key=>localStorage.getItem(key+'-backup'),SAVE_KEY));assert.deepEqual(backup,won);assert.equal((await snap()).outpost.repaired,false);report.checks.push('Restart cancel retains current win, confirm backs up latest v3 session');
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_SAVE_KEY),legacy);report.checks.push('Original v2 bytes unchanged after new v3 progress/reloads/reset');
 report.focus={result:'NOT VERIFIED: no native focus/visibility transition tested; no attempt to bypass prior tab activation refusal'};
 assert.equal(errors.length,0);report.success=true;
}catch(e){report.success=false;report.failure=e.stack;report.failureState=await snap().catch(()=>null);await page.screenshot({path:out+'/failure.jpg'}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(out+'/candidate-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({success:report.success,checks:report.checks,finish:report.finish,failure:report.failure,errors}));await browser.close();}
