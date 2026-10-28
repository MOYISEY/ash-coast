import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SAVE_KEY,LEGACY_SAVE_KEYS} from '../src/core.js';
const old={};old[LEGACY_SAVE_KEYS[0]]=await fs.readFile(new URL('./fixtures/save-v2.json',import.meta.url),'utf8');old[LEGACY_SAVE_KEYS[1]]=await fs.readFile(new URL('./fixtures/save-v1.json',import.meta.url),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const result={version:'0.3.2',scenario:'isolated profile with two genuine legacy save fixtures only; no v3 resource injection',errors};
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5186/',{waitUntil:'networkidle'});await page.evaluate(old=>{for(const [key,raw] of Object.entries(old))localStorage.setItem(key,raw);},old);await page.reload({waitUntil:'networkidle'});
 assert(await page.locator('#continue-game').isDisabled());assert.match(await page.locator('#save-note').innerText(),/0\.1\.1\/0\.2/);
 await page.click('#new-game');await page.keyboard.press('Digit1');await page.keyboard.press('F5');await page.reload({waitUntil:'networkidle'});await page.click('#continue-game');assert.equal((await page.evaluate(()=>window.__ASH__.snapshot())).inventory.food,0);
 await page.keyboard.press('Escape');await page.click('#restart');await page.click('#confirm-new-yes');
 for(const [key,raw] of Object.entries(old))assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);
 const fresh=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),SAVE_KEY));assert.equal(fresh.version,3);assert.equal(fresh.inventory.food,1);assert.equal(errors.length,0);
 result.success=true;result.keys=Object.keys(old);result.checks=['explicit refusal of both v1/v2 saves','real v3 food consumption/save/reload','current-session reset confirmation','both old saves remain byte-identical'];
}catch(e){result.success=false;result.failure=e.stack;process.exitCode=1;}
finally{await fs.mkdir('evidence/legacy',{recursive:true});await fs.writeFile('evidence/legacy/legacy-browser-report.json',JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));}
