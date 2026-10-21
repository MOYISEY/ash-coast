// Isolated browser regression test for this local game only. No user browser profile.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeWorld,collides,LANDMARKS,SAVE_KEY} from '../src/core.js';
const world=makeWorld();
const evidence=process.env.EVIDENCE_DIR||'evidence/0.1.1';
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{channel:'chrome'}),headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],report={version:'0.1.1',checks:[],performance:[],route:[],errors};
page.on('pageerror',e=>errors.push(e.message));
await fs.mkdir(evidence,{recursive:true});
const snap=()=>page.evaluate(()=>{const m=window.__ASH__.metrics();delete m.frames;return {state:window.__ASH__.snapshot(),screen:window.__ASH__.screen(),metrics:m};});
function pathTo(start,goal){
 const key=(x,z)=>`${x},${z}`,queue=[[Math.round(start.x),Math.round(start.z)]],came=new Map([[key(...queue[0]),null]]);let end;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];if(Math.hypot(x-goal.x,z-goal.z)<1.1){end=[x,z];break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!came.has(k)&&!collides(nx,nz,world.colliders,.68)){came.set(k,[x,z]);queue.push([nx,nz]);}}
 }
 assert(end,'route exists');const path=[];for(let p=end;p;p=came.get(key(...p)))path.push({x:p[0],z:p[1]});return path.reverse();
}
async function walk(goal){
 let lastDistance=Infinity,stuck=0;
 for(let attempt=0;attempt<500;attempt++){
  const {state:s}=await snap();assert.equal(s.mode,'playing','survives route');
  const distance=Math.hypot(s.player.x-goal.x,s.player.z-goal.z);if(distance<2)return;
  if(s.hp<60&&s.inventory.med)await page.keyboard.press('Digit3');
  if(s.thirst<55&&s.inventory.water)await page.keyboard.press('Digit2');
  if(s.hunger<55&&s.inventory.food)await page.keyboard.press('Digit1');
  const path=pathTo(s.player,goal);let target=path[1]||goal;
  // Combine collinear grid edges into longer real keyboard moves, with a one-second cap.
  if(path.length>2){const dx=path[1].x-path[0].x,dz=path[1].z-path[0].z;for(let i=2;i<Math.min(path.length,5);i++){if(path[i].x-path[i-1].x!==dx||path[i].z-path[i-1].z!==dz)break;target=path[i];}}
  let dx=target.x-s.player.x,dz=target.z-s.player.z;
  const horizontal=Math.abs(dx)>Math.abs(dz),key=horizontal?(dx>0?'KeyD':'KeyA'):(dz>0?'KeyS':'KeyW');
  const duration=Math.max(45,Math.min(950,Math.abs(horizontal?dx:dz)/4.2*1000));
  await page.keyboard.press('KeyR');await page.keyboard.down(key);await page.waitForTimeout(duration);await page.keyboard.up(key);
  if(Math.abs(distance-lastDistance)<.02)stuck++;else stuck=0;
  if(stuck>8)throw Error(`stuck near ${JSON.stringify(s.player)}`);lastDistance=distance;
 }
 throw Error('route timeout');
}
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#telemetry').textContent.length>20);
 await page.screenshot({path:`${evidence}/qa-title.jpg`});
 await page.click('#new-game');await page.keyboard.press('KeyR');
 const start=(await snap()).state;
 await page.keyboard.down('KeyW');await page.waitForTimeout(800);await page.keyboard.up('KeyW');
 assert((await snap()).state.player.z<start.player.z-2);report.checks.push('Real keyboard movement');
 await page.keyboard.press('KeyM');assert(await page.locator('#map-screen').isVisible());
 const paused=(await snap()).state.time;await page.waitForTimeout(300);assert.equal((await snap()).state.time,paused);await page.screenshot({path:`${evidence}/qa-map.jpg`});await page.keyboard.press('KeyM');report.checks.push('Map pauses simulation');
 // Probe actual shelter-wall collision with input, then restart for the mission.
 await page.keyboard.down('KeyD');await page.waitForTimeout(2200);await page.keyboard.up('KeyD');
 assert((await snap()).state.player.x<6.1);report.checks.push('Wall collision from real keyboard input');
 await page.keyboard.press('Escape');await page.click('#restart');
 for(const [i,goal] of LANDMARKS.entries()){
  await walk(goal);await page.keyboard.press('KeyE');const current=(await snap()).state;assert(current.parts.includes(goal.part));
  report.route.push({landmark:goal.name,position:current.player,time:current.time,hp:current.hp});console.log('Reached: '+goal.name);
  await page.screenshot({path:`${evidence}/qa-part-${i+1}.jpg`});
  if(i===0){
   await page.keyboard.press('F5');const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
   await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');
   const loaded=(await snap()).state;assert(loaded.parts.includes(goal.part));assert(Math.hypot(loaded.player.x-saved.player.x,loaded.player.z-saved.player.z)<.1);assert.equal(loaded.inventory.ammo,saved.inventory.ammo);report.checks.push('Save reload preserves position, inventory and collected objective');
  }
 }
 await walk({x:0,z:87});await page.keyboard.press('KeyE');assert.equal((await snap()).state.mode,'won');assert(await page.locator('#ending').isVisible());
 report.checks.push('All 3 parts and return: full mission won with threats active, real keyboard movement, no teleports');
 await page.screenshot({path:`${evidence}/qa-victory.jpg`});
 await page.click('#end-new');const fresh=(await snap()).state;assert.equal(fresh.parts.length,0);assert.equal(fresh.hp,100);assert.equal(fresh.inventory.ammo,9);report.checks.push('Restart resets mission, supplies and health');
 await page.keyboard.press('KeyI');await page.locator('#inventory-items button').nth(0).click();assert.equal((await snap()).state.inventory.food,0);await page.keyboard.press('KeyI');report.checks.push('Inventory consumption through UI');
 await page.keyboard.press('Escape');await page.selectOption('#quality','low');await page.click('#resume');await page.waitForTimeout(4500);report.performance.push((await snap()).metrics);
 await page.keyboard.press('Escape');await page.selectOption('#quality','medium');await page.click('#resume');await page.waitForTimeout(4500);report.performance.push((await snap()).metrics);
 // A separate explicit scenario checks the losing UI without changing the completed route.
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:5173/')+'?qa=1',{waitUntil:'networkidle'});await page.click('#new-game');
 await page.evaluate(()=>{const s=window.__ASH__.snapshot();s.hp=1;s.radiation=99;s.player.x=0;s.player.z=65;s.enemies.forEach(e=>e.hp=0);window.__ASH_QA__.setState(s);window.__ASH_QA__.step(2);});
 assert.equal((await snap()).state.mode,'dead');assert(await page.locator('#ending').isVisible());await page.screenshot({path:`${evidence}/qa-defeat.jpg`});report.checks.push('Losing state and defeat UI from an explicit isolated radiation scenario');
 await page.click('#end-load');assert.equal((await snap()).state.mode,'playing');report.checks.push('Reload after death resumes last living save');
 await page.evaluate(key=>localStorage.setItem(key,'corrupted-test-data'),SAVE_KEY);await page.reload({waitUntil:'networkidle'});assert(await page.locator('#continue-game').isDisabled());report.checks.push('Corrupt save is rejected safely');
 assert.equal(errors.length,0);report.checks.push('No uncaught JavaScript errors');report.success=true;
}catch(e){report.success=false;report.failure=e.stack;await page.screenshot({path:`${evidence}/qa-failure.jpg`}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(`${evidence}/browser-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
