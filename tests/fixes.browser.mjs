// Real browser input regression checks on isolated, explicitly constructed scenes.
// The denied-pointer-lock case deliberately models the failure seen by the reviewer.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialState} from '../src/core.js';
const url=process.env.GAME_URL||'http://127.0.0.1:5173/';
const out=process.env.EVIDENCE_DIR||'evidence/0.1.1';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{channel:'chrome'}),headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const errors=[],report={version:'0.1.1',browser:browser.version(),checks:[],corners:[],errors,focusSwitch:'NOT VERIFIED: no real browser tab switch tested'};
const context=await browser.newContext({viewport:{width:1280,height:720}});
await context.addInitScript(()=>{
 Object.defineProperty(Element.prototype,'requestPointerLock',{configurable:true,value(){window.__qaLockRequests=(window.__qaLockRequests||0)+1;return Promise.reject(new DOMException('Explicit regression scenario: pointer lock denied','NotAllowedError'));}});
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__ASH__.snapshot());
try{
 await page.goto(url+'?qa=1',{waitUntil:'networkidle'});await page.click('#new-game');
 const canvas=page.locator('#world');
 await canvas.click({position:{x:640,y:360}});
 await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('ПРОБЕЛ'));
 assert.equal((await state()).inventory.ammo,9,'first gesture attempts capture without spending ammunition');
 assert.match(await page.locator('#quick').innerText(),/ПРОБЕЛ/);
 await canvas.click({position:{x:640,y:360}});assert.equal((await state()).inventory.ammo,8);
 await page.waitForTimeout(420);await canvas.click({position:{x:640,y:360}});assert.equal((await state()).inventory.ammo,7);
 assert.equal(await page.evaluate(()=>window.__qaLockRequests),1,'failure does not cause an endless capture/retry loop');
 report.checks.push('D2: first denial displays fallback; repeated LMB clicks fire; Space is visible; capture is not retried');
 const beforeDrag=await state();await page.mouse.move(640,360);await page.mouse.down();await page.mouse.move(750,395,{steps:8});await page.mouse.up();
 const afterDrag=await state();assert.notEqual(afterDrag.player.yaw,beforeDrag.player.yaw);assert.equal(afterDrag.inventory.ammo,beforeDrag.inventory.ammo);
 report.checks.push('D2: LMB drag turns camera without spending ammunition');
 await page.waitForFunction(()=>window.__ASH__.snapshot().shotCool===0);await page.keyboard.press('Space');assert.equal((await state()).inventory.ammo,6);
 await page.screenshot({path:out+'/fallback-controls.jpg'});report.checks.push('D2: Space still fires after refused pointer lock');
 await page.evaluate(s=>window.__ASH_QA__.setState(s),initialState());
 await page.keyboard.down('Shift');await page.keyboard.down('KeyD');await page.waitForTimeout(4500);await page.keyboard.up('KeyD');await page.keyboard.up('Shift');
 const atWall=await state();assert(atWall.player.x>5.8&&atWall.player.x<6.1);assert(Math.abs(atWall.steps-atWall.player.x)<1e-8);
 await page.keyboard.down('KeyD');await page.waitForTimeout(1000);await page.keyboard.up('KeyD');assert.equal((await state()).steps,atWall.steps);
 report.distance={actualDisplacement:atWall.player.x,recordedDistance:atWall.steps};report.checks.push('D3: sprint into shelter wall and continued input record only actual movement');
 const fixtures=[
  {name:'ruined block south wall',a:{x:-65.89752113912255,z:11.11813715659082},b:{x:-52.42422602483415,z:33.978130740307506}},
  {name:'shipping container',a:{x:72.7087859949097,z:-65.49958781339228},b:{x:50.952722631131124,z:-48.60821748031947}},
  {name:'pump north wall',a:{x:47.170082735829055,z:4.458090970292687},b:{x:37.47278475638699,z:27.60717010333945}}
 ];
 for(const f of fixtures){
  const s=initialState();s.enemies.forEach(e=>e.hp=0);s.player={...f.a,yaw:Math.atan2(-(f.b.x-f.a.x),-(f.b.z-f.a.z)),pitch:0};s.enemies[0]={id:0,...f.b,hp:2,cool:100,homeX:f.b.x,homeZ:f.b.z-3};
  await page.evaluate(s=>window.__ASH_QA__.setState(s),s);await page.keyboard.press('Space');
  const after=await state();assert.equal(after.inventory.ammo,8);assert.equal(after.enemies[0].hp,2,f.name);
  report.corners.push({name:f.name,ammoAfter:after.inventory.ammo,enemyHpAfter:after.enemies[0].hp});
 }
 await page.screenshot({path:out+'/corner-blocked.jpg'});report.checks.push('D1: all three exact reviewer corner scenes block real Space shots in rendered browser');
 // A separate context tests the actual platform API without forcing success or denial.
 const natural=await browser.newContext({viewport:{width:1280,height:720}}),actual=await natural.newPage();
 await actual.goto(url,{waitUntil:'networkidle'});await actual.click('#new-game');await actual.locator('#world').click({position:{x:640,y:360}});await actual.waitForTimeout(250);
 if(await actual.evaluate(()=>document.pointerLockElement?.id==='world')){
  await actual.locator('#world').click({position:{x:640,y:360}});assert.equal((await actual.evaluate(()=>window.__ASH__.snapshot())).inventory.ammo,8);report.pointerLock='PASS: actual API acquired lock; LMB shot spent one round';
 }else report.pointerLock='NOT VERIFIED: actual browser did not acquire pointer lock; forced-denial fallback passed separately';
 await natural.close();assert.equal(errors.length,0);report.success=true;
}catch(e){report.success=false;report.failure=e.stack;process.exitCode=1;await page.screenshot({path:out+'/fixes-failure.jpg'}).catch(()=>{});}
finally{await fs.writeFile(out+'/fixes-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
