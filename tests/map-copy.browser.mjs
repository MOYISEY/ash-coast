// Text/UI regression with explicit fixture states; not a gameplay playthrough.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialState} from '../src/core.js';
const out='evidence/map-copy';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
const report={version:'0.3.1',scope:'map caption only; explicit QA states, no gameplay completion claim',checks,errors};
try{
 await page.goto((process.env.GAME_URL||'http://127.0.0.1:5185/')+'?qa=1',{waitUntil:'networkidle'});await page.click('#new-game');await page.keyboard.press('KeyM');
 const verify=async(name,pattern)=>{const text=await page.locator('#map-route-help').innerText();assert.match(text,/Теплотрасса/);assert.match(text,/Береговая дуга/);assert.match(text,/Северн/);assert.match(text,pattern);assert(!text.includes('опасный южный двор'));const layout=await page.locator('#map-route-help').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,panelBottom:el.closest('.map-panel').getBoundingClientRect().bottom,viewport:innerHeight}));assert(layout.bottom<=Math.min(layout.viewport-20,layout.panelBottom-10),'caption fits inside map panel at 720p');checks.push({name,text,layout});};
 await verify('new game -> M',/Оборудуй верстак/);await page.screenshot({path:out+'/01-new-game-map.jpg'});await page.keyboard.press('KeyM');
 const cases=[['repair',s=>{s.shelter.workbench=true;s.inventory.outpostKit=1;},/Отнеси ремонтный комплект/],['water',s=>{s.shelter.workbench=true;s.outpost.repaired=true;},/запусти насос/],['storm',s=>{s.shelter.workbench=true;s.outpost={repaired:true,waterOnline:true,waterTaken:1,waterRemaining:2};s.time=140;},/Пережди бурю/],['after storm',s=>{s.shelter.workbench=true;s.outpost={repaired:true,waterOnline:true,waterTaken:1,waterRemaining:2};s.time=200;},/Собери три отмеченные детали/],['final link',s=>{s.shelter.workbench=true;s.outpost={repaired:true,waterOnline:true,waterTaken:1,waterRemaining:2};s.time=200;s.parts=['cell','antenna','module'];s.collected=[...s.parts];},/Собери радиолинию на Северном посту/]];
 for(const [name,setup,pattern] of cases){const s=initialState();setup(s);s.mode='benchmark';await page.evaluate(s=>window.__ASH_QA__.setState(s),s);await page.keyboard.press('KeyM');const before=await page.evaluate(()=>window.__ASH__.snapshot());await verify(name,pattern);assert.deepEqual(await page.evaluate(()=>window.__ASH__.snapshot()),before);if(name==='final link')await page.screenshot({path:out+'/02-final-goal-map.jpg'});await page.keyboard.press('KeyM');}
 assert.equal(errors.length,0);report.success=true;
}catch(e){report.success=false;report.failure=e.stack;process.exitCode=1;await page.screenshot({path:out+'/failure.jpg'}).catch(()=>{});}
finally{await fs.writeFile(out+'/map-copy-browser-report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
