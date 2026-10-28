import * as oldGame from '../tests/reference-0.3.1/core.js';
import {chromium} from '../node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {serveFrozen} from './server.mjs';
import {ROOT,BASE,CHROME,output} from './config.mjs';
import {g,world,position,base,collect,advance,saved,preparation,repairReady,finalReady,phaseFixtures} from './fixtures.mjs';
const server=await serveFrozen();let browser,context,page;
try{browser=await chromium.launch({executablePath:CHROME,headless:true,chromiumSandbox:true});context=await browser.newContext({viewport:{width:1280,height:720}});page=await context.newPage();}
catch(e){if(browser)await browser.close();await server.close();await output('ui-integration.json',{baseline:'0.5.0',success:false,workflow:{available:false},stage:'ordinary browser setup',failure:e.stack});throw e;}
const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
const report={baseline:'0.5.0',bundleSha256:server.bundleSha256,scope:'checkpoint-based UI integration; seeded legitimate saved states, not natural full gameplay',browser:browser.version(),activationAPIsUsed:false,syntheticFocusEvents:false,checks,errors};
const snap=()=>page.evaluate(()=>window.__ASH__.snapshot());
const raw=key=>page.evaluate(key=>localStorage.getItem(key),key);
const photos=path.join(ROOT,'evidence/ui');await fs.mkdir(photos,{recursive:true});
const photo=name=>page.screenshot({path:path.join(photos,name+'.jpg')});
async function load(name,state){
 const checkpoint=saved(state).raw;await output('checkpoints/'+name+'.json',JSON.parse(checkpoint));
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:g.SAVE_KEY,value:checkpoint});await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');
 const loaded=await snap();for(const k of ['inventory','outpost','parts','collected','shelter'])assert.deepEqual(loaded[k],state[k],name+' '+k);
 assert(loaded.time>=state.time-.001&&loaded.time<state.time+1);return loaded;
}
async function reload(name){
 await page.keyboard.press('F5');const stored=JSON.parse(await raw(g.SAVE_KEY));await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');const loaded=await snap();
 for(const k of ['inventory','outpost','parts','collected','shelter','mode'])assert.deepEqual(loaded[k],stored[k],name+' '+k);
 assert(loaded.time>=stored.time-.001&&loaded.time<stored.time+1);return loaded;
}
async function walkInside(){
 await page.keyboard.press('KeyR');await page.keyboard.down('KeyW');try{await page.waitForFunction(()=>window.__ASH__.snapshot().player.z<=-20.9,{},{timeout:8000});}finally{await page.keyboard.up('KeyW');}
 await page.keyboard.down('KeyD');try{await page.waitForFunction(()=>window.__ASH__.snapshot().player.x>=78.8,{},{timeout:8000});}finally{await page.keyboard.up('KeyD');}
}
try{
 await page.goto(server.origin,{waitUntil:'networkidle'});
 const legacy={};legacy[g.LEGACY_SAVE_KEYS[0]]=await fs.readFile(path.join(BASE,'tests/fixtures/save-v2.json'),'utf8');legacy[g.LEGACY_SAVE_KEYS[1]]=await fs.readFile(path.join(BASE,'tests/fixtures/save-v1.json'),'utf8');
 await page.evaluate(data=>{for(const [key,value]of Object.entries(data))localStorage.setItem(key,value);},legacy);await page.reload({waitUntil:'networkidle'});assert(await page.locator('#continue-game').isDisabled());
 await page.click('#new-game');assert.match(await page.locator('#survival-plan').innerText(),/верстак.*комплект/);const first=await snap(),wallStart=Date.now();await page.keyboard.down('KeyW');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');const moved=await snap();
 const frames=await page.evaluate(()=>new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('90 rAF frames took over 8s')),8000),values=[];let prev=performance.now();function f(now){values.push(now-prev);prev=now;if(values.length===90){clearTimeout(t);resolve(values);}else requestAnimationFrame(f);}requestAnimationFrame(f);}));
 const telemetry=await page.evaluate(()=>JSON.parse(document.querySelector('#telemetry').textContent));
 report.workflow={type:'ordinary local Chrome + Playwright, isolated temporary context, no tab activation',requestedKeyHoldMs:1000,probeWallSecondsIncluding90RafFrames:(Date.now()-wallStart)/1000,gameSeconds:moved.time-first.time,movedMetres:moved.steps-first.steps,meanRafMs:frames.reduce((a,b)=>a+b,0)/frames.length,gpu:telemetry.metrics.gpu};
 assert(moved.time-first.time>.6,'game clock is too throttled for reliable ordinary input');assert(moved.steps-first.steps>2.4,'W input did not produce enough real motion');
 report.workflow.available=true;checks.push({name:'ordinary UI/input viability',pass:true});
 for(const [id,state]of Object.entries(phaseFixtures())){
  await load(id,state);const phase=g.stormStatus(state).phase;await page.waitForTimeout(200);assert.equal(g.stormStatus(await snap()).phase,phase);
  if(['warning','active'].includes(phase)){assert(await page.locator('#storm-banner').isVisible());const text=await page.locator('#storm-banner').innerText();assert.match(text,phase==='warning'?/пепельный фронт/:id==='activeRoof'?/КРОВЛЯ ЗАЩИЩАЕТ/:/ОТКРЫТОЕ МЕСТО/);}else assert(await page.locator('#storm-banner').isHidden());
  if(id==='activeOutside')assert.match(await page.locator('#rad-state').innerText(),/ОПАСНАЯ ЗОНА/);if(id==='activeRoof'){assert.match(await page.locator('#rad-state').innerText(),/ФОН НИЗКИЙ/);assert.match(await page.locator('#survival-plan').innerText(),/запусти насос/);}
  const after=await reload(id);assert.equal(g.stormStatus(after).phase,phase);await photo('phase-'+id);checks.push({name:'save/reload '+id,phase,pass:true});
 }
 await load('craft-insufficient',preparation(false));await page.keyboard.press('KeyB');assert(await page.locator('#craft-outpostKit').isDisabled());assert.match(await page.locator('#craft-outpostKit').innerText(),/материалов/);
 await load('craft-ready',preparation());await page.keyboard.press('KeyB');const materials=(await snap()).inventory;await page.click('#craft-outpostKit');let s=await snap();assert.equal(s.inventory.outpostKit,1);assert.equal(s.inventory.scrap,materials.scrap-2);assert.equal(s.inventory.wire,materials.wire-1);assert(await page.locator('#craft-outpostKit').isDisabled());
 const button=await page.locator('#craft-outpostKit').boundingBox(),once={...s.inventory};await page.mouse.click(button.x+button.width/2,button.y+button.height/2);assert.deepEqual((await snap()).inventory,once);await photo('craft');await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');assert.equal((await snap()).inventory.outpostKit,1);checks.push({name:'craft missing materials/once/autosave/reload',pass:true});
 const repair=repairReady();for(const id of ['cache2','cache6'])collect(repair,id);base(repair);advance(repair,150);position(repair,75,-17);
 await load('repair-active-storm',repair);await page.waitForTimeout(150);assert.match(await page.locator('#storm-banner').innerText(),/ОТКРЫТОЕ МЕСТО/);await page.keyboard.press('KeyE');assert((await snap()).outpost.repaired);assert.equal((await snap()).inventory.outpostKit,0);await page.waitForTimeout(150);assert.match(await page.locator('#storm-banner').innerText(),/КРОВЛЯ ЗАЩИЩАЕТ/);
 const fixed={...(await snap()).outpost};await page.keyboard.press('KeyE');assert.deepEqual((await snap()).outpost,fixed);await reload('repair');await photo('repair-covered');checks.push({name:'repair during storm changes protection, once, saved',pass:true});
 await walkInside();await page.keyboard.press('KeyE');assert.equal((await snap()).outpost.waterRemaining,3);const full={...(await snap()).outpost};await page.keyboard.press('KeyE');assert.deepEqual((await snap()).outpost,full);
 // A distinct setup checkpoint depletes the pack through consume/tick rules.
 const emptyPack=await snap();while(emptyPack.inventory.water>0){if(emptyPack.thirst>=100){position(emptyPack,83,43);advance(emptyPack,1);}g.consume(emptyPack,'water');}position(emptyPack,g.OUTPOST.pump.x,g.OUTPOST.pump.z);await load('pump-empty-pack',emptyPack);
 for(let i=0;i<3;i++){await page.keyboard.press('KeyE');s=await reload('water-'+i);assert.equal(s.outpost.waterRemaining,2-i);assert.equal(s.outpost.waterTaken,i+1);}
 await page.keyboard.press('Digit2');const noMore=(await snap()).inventory.water;await page.keyboard.press('KeyE');await page.keyboard.press('KeyE');assert.equal((await snap()).inventory.water,noMore);assert.equal((await snap()).outpost.waterRemaining,0);await photo('water-empty');checks.push({name:'full pack/three water portions/drink/reload/repeated empty',pass:true});
 const wounded=oldGame.initialState();wounded.hp=50;wounded.hunger=wounded.thirst=20;assert.equal(saved(wounded).raw,oldGame.serialize(wounded));await load('old-v3-wounded-wait',wounded);await page.waitForTimeout(2500);assert.equal((await snap()).hp,50);assert(await page.locator('#health-hint').isVisible());await reload('wounded wait');
 await page.keyboard.press('Digit1');assert.equal((await snap()).hp,50);assert.equal((await snap()).hunger,65);await page.keyboard.press('Digit2');assert.equal((await snap()).hp,50);assert.equal((await snap()).thirst,70);
 await page.keyboard.press('Digit3');assert.equal((await snap()).hp,95);assert.equal((await snap()).inventory.med,0);await page.waitForTimeout(2500);assert.equal((await snap()).hp,95);await reload('medicine wound');await photo('wound-treated');checks.push({name:'wound persists while waiting; food/water not medicine; finite medicine and reload',pass:true});
 const fullStats=g.initialState();fullStats.hunger=fullStats.thirst=fullStats.filter=100;await load('full-stats',fullStats);const fullInventory={...(await snap()).inventory};await page.keyboard.press('KeyI');for(const button of await page.locator('#inventory-items button').all())assert(await button.isDisabled());await page.keyboard.press('KeyI');for(const key of ['Digit1','Digit2','Digit3','Digit4'])await page.keyboard.press(key);assert.deepEqual((await snap()).inventory,fullInventory);assert(await page.locator('#health-hint').isHidden());checks.push({name:'full stats preserve items and disable unnecessary inventory use',pass:true});
 await load('final-before-storm',finalReady(true,180));const stormCost={...(await snap()).inventory};await page.keyboard.press('KeyE');assert.equal((await snap()).mode,'playing');assert.deepEqual((await snap()).inventory,stormCost);
 await load('final-no-wire',finalReady(false));const noWire={...(await snap()).inventory};await page.keyboard.press('KeyE');assert.equal((await snap()).mode,'playing');assert.deepEqual((await snap()).inventory,noWire);
 await load('final-ready',finalReady());assert.match(await page.locator('#survival-plan').innerText(),/3 детали.*1 металл.*1 провод/);const cost={...(await snap()).inventory};await page.keyboard.press('KeyE');s=await snap();assert.equal(s.mode,'won');assert.equal(s.inventory.wire,cost.wire-1);assert.equal(s.inventory.scrap,cost.scrap-1);assert(await page.locator('#ending').isVisible());await photo('ending');
 const wonRaw=await raw(g.SAVE_KEY);assert.equal(g.restore(wonRaw,world.colliders).mode,'won');await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');assert.equal((await snap()).mode,'won');await page.keyboard.press('KeyE');assert.deepEqual((await snap()).inventory,s.inventory);checks.push({name:'final guarded before storm/missing wire, once and reload',pass:true});
 const protectedPost=repairReady();g.interact(protectedPost,world.colliders);advance(protectedPost,150);position(protectedPost,76,-12);await load('p3-post-name',protectedPost);await page.waitForFunction(()=>document.querySelector('#location').textContent==='Северный пост');assert.match(await page.locator('#storm-banner').innerText(),/КРОВЛЯ ЗАЩИЩАЕТ/);await photo('p3-post-name-covered');await page.keyboard.down('KeyS');try{await page.waitForFunction(()=>window.__ASH__.snapshot().player.z>-8,{},{timeout:6000});}finally{await page.keyboard.up('KeyS');}await page.keyboard.down('KeyD');try{await page.waitForFunction(()=>window.__ASH__.snapshot().player.x>=80,{},{timeout:6000});}finally{await page.keyboard.up('KeyD');}await page.waitForFunction(()=>document.querySelector('#location').textContent==='Причал без рейсов');assert.match(await page.locator('#storm-banner').innerText(),/ОТКРЫТОЕ МЕСТО/);await photo('p3-left-post-quay');checks.push({name:'P3 post shelter name and storm coverage take precedence; ordinary exit restores quay name',pass:true});
 const oldWon=JSON.parse(await fs.readFile(path.join(BASE,'tests/fixtures/save-v3-0.3.2-won.json'),'utf8'));await load('actual-032-won',oldWon);assert.deepEqual(await snap(),oldWon);assert(await page.locator('#ending').isVisible());await photo('old-032-won');checks.push({name:'actual 0.3.2 v3 win snapshot retains exact progress in UI',pass:true});
 for(const [key,value]of Object.entries(legacy))assert.equal(await raw(key),value);checks.push({name:'both legacy save keys remain byte-identical through all checkpoints',pass:true});
 assert.equal(errors.length,0);report.success=true;
}catch(e){report.success=false;report.failure=e.stack;report.failureState=await snap().catch(()=>null);await photo('failure').catch(()=>{});process.exitCode=1;}
finally{await browser.close();await server.close();await output('ui-integration.json',report);console.log(JSON.stringify({success:report.success,workflow:report.workflow,checks:checks.map(x=>x.name),failure:report.failure,errors}));}
