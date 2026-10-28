import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {SAVE_KEY,restore,makeWorld} from '../src/core.js';
const out='evidence/reset';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>page.evaluate(()=>window.__ASH__.snapshot());
const report={version:'0.3.2',realControls:true,teleports:false,saveInjection:false,checks:[],errors};
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5186/',{waitUntil:'networkidle'});await page.click('#new-game');
 await page.keyboard.press('KeyR');
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__ASH__.snapshot().player.z<=73.2);await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyD');await page.waitForFunction(()=>window.__ASH__.snapshot().player.x>=8.8);await page.keyboard.up('KeyD');
 for(let i=0;i<3;i++){if((await snapshot()).collected.includes('shore-crate'))break;await page.keyboard.press('KeyE');}
 await page.keyboard.press('Escape');const current=await snapshot();
 assert(current.collected.includes('shore-crate'));assert(current.time<20,'before first autosave');
 const stored=await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY);assert.equal(JSON.parse(stored).time,0);assert.equal(JSON.parse(stored).inventory.scrap,0);
 await page.click('#restart');await page.locator('#confirm-new').waitFor({state:'visible'});await page.screenshot({path:out+'/01-unsaved-confirm.jpg'});
 await page.click('#confirm-new-no');assert.deepEqual(await snapshot(),current);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY),stored);report.checks.push('early real crate pickup with time-zero stored save requests confirmation; cancel preserves unsaved session');
 await page.click('#restart');await page.click('#confirm-new-yes');
 const backup=await page.evaluate(key=>localStorage.getItem(key+'-backup'),SAVE_KEY);assert.deepEqual(restore(backup,makeWorld().colliders),current);
 assert.equal((await snapshot()).inventory.scrap,0);report.checks.push('confirm backs up latest live session with crate, not old time-zero save; reset starts fresh');
 await page.screenshot({path:out+'/02-reset-after-backup.jpg'});report.before=current;report.backup=JSON.parse(backup);report.success=errors.length===0;assert(report.success);
}catch(e){report.success=false;report.failure=e.stack;await page.screenshot({path:out+'/failure.jpg'}).catch(()=>{});process.exitCode=1;}
finally{await fs.writeFile(out+'/reset-browser-report.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({success:report.success,checks:report.checks,failure:report.failure,errors}));}
