import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {serveFrozen} from './server.mjs';
import {BASE,ROOT,CHROME,output} from './config.mjs';
import * as g from '../src/core.js';
const RUN=process.env.RELEASE_RUN_NAME||'release-copy';
const K=g.SAVE_KEY,B=K+'-backup',D=path.join(ROOT,'evidence',RUN);
await fs.mkdir(D,{recursive:true});
const server=process.env.RELEASE_GAME_URL?{origin:process.env.RELEASE_GAME_URL,bundleSha256:JSON.parse(await fs.readFile(path.join(BASE,'VERSION.json'),'utf8')).bundleSha256,close:async()=>{}}:await serveFrozen();let browser;
const report={version:'0.5.0',origin:server.origin,bundleSha256:server.bundleSha256,scope:'author real Chrome, isolated synthetic profiles; native old won fixture; NOT a new natural walkthrough',activationAPIsUsed:false,cases:[],errors:[],closed:false};
async function run(name,fn){let ctx;const item={name,passed:false};try{
 ctx=await browser.newContext({viewport:{width:1280,height:720},acceptDownloads:true});
 await fn(ctx,item);item.passed=true;
}catch(e){item.failure=e.stack;}finally{if(ctx)await ctx.close();report.cases.push(item);console.log(JSON.stringify(item));}}
async function load(ctx,seed={},fault=''){
 await ctx.addInitScript(({seed,fault,K})=>{
  const storage=window.localStorage,get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  if(get.call(storage,'__ash_release_seeded__')!=='yes'){for(const [k,v]of Object.entries(seed))set.call(storage,k,v);set.call(storage,'__ash_release_seeded__','yes');}
  window.__releaseRead=k=>get.call(storage,k);window.__releaseWrites=[];
  Storage.prototype.setItem=function(k,v){if(this===storage)window.__releaseWrites.push(k);return set.call(this,k,v);};
  if(fault==='denied')Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Injected denied storage','SecurityError');}});
  if(fault==='noapi')Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
 },{seed,fault,K});
 const p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(server.origin,{waitUntil:'networkidle'});
 assert.match(await p.locator('.intro .eyebrow').innerText(),/ВЕРСИЯ 0\.5\.0/);assert.equal(await p.title(),'Пепельный берег 0.5.0 — Второй огонь');
 if(!fault)await p.waitForFunction(()=>!document.querySelector('#new-game').disabled);
 else await p.waitForFunction(()=>/недоступ|не поддерживается/.test(document.querySelector('#writer-status').textContent));
 return p;
}
const read=(p,k=K)=>p.evaluate(k=>window.__releaseRead(k),k);
async function shot(p,name){await p.screenshot({path:path.join(D,name+'.png')});}
async function exported(p,id,name,expected){await p.locator(id).scrollIntoViewIfNeeded();const event=p.waitForEvent('download');await p.click(id);const download=await event,file=path.join(D,name+'.json');await download.saveAs(file);assert.equal(await fs.readFile(file,'utf8'),expected);return {file:path.relative(BASE,file),sha256:createHash('sha256').update(expected).digest('hex')};}
try{
 browser=await chromium.launch({executablePath:CHROME,headless:true,chromiumSandbox:true});report.browser=browser.version();
 await run('fresh readable profile offers new start and saves/reloads ordinary new game',async(ctx,item)=>{
  const p=await load(ctx);assert.match(await p.locator('#save-note').innerText(),/Начните новый путь/);assert.doesNotMatch(await p.locator('#save-note').innerText(),/не чита|отсутств|v3/i);assert.equal(await read(p),null);assert(await p.locator('#continue-game').isDisabled());await shot(p,'01-fresh');
  await p.click('#new-game');await p.click('#pause-btn');await p.click('#save');const raw=await read(p);assert(g.restore(raw,g.makeWorld().colliders));await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>!document.querySelector('#continue-game').disabled);assert.match(await p.locator('#save-note').innerText(),/Сохранённый путь: 0\/3/);assert.equal(await read(p),raw);await p.click('#continue-game');await p.click('#pause-btn');item.saveBytes=raw.length;
 });
 for(const [name,raw]of [['truncated','{'],['empty',''],['unknown',JSON.stringify({version:99,note:'Не удалять\nисходные байты'})]])await run(name+' save stays distinct, untouched and exact-exportable',async(ctx,item)=>{
  const p=await load(ctx,{[K]:raw});assert.match(await p.locator('#save-note').innerText(),/не удалось прочитать/);assert.match(await p.locator('#save-note').innerText(),/не удалены/);assert.doesNotMatch(await p.locator('#save-note').innerText(),/Начните новый путь/);assert(await p.locator('#continue-game').isDisabled());assert.equal(await read(p),raw);assert.deepEqual(await p.evaluate(()=>window.__releaseWrites),[]);await shot(p,'02-'+name);item.export=await exported(p,'#export-primary',name+'-exact',raw);assert.equal(await read(p),raw);
 });
 await run('denied storage remains explicit and cannot start/write',async(ctx)=>{
  const p=await load(ctx,{},'denied');assert.match(await p.locator('#save-note').innerText(),/недоступно/);assert.doesNotMatch(await p.locator('#save-note').innerText(),/Начните новый путь/);assert(await p.locator('#new-game').isDisabled());assert.deepEqual(await p.evaluate(()=>window.__releaseWrites),[]);await shot(p,'03-denied');
 });
 await run('no WebLocks remains read-only with export of valid old v3',async(ctx,item)=>{
  const raw=await fs.readFile(path.join(BASE,'tests/fixtures/save-v3-0.4.5-natural-won.json'),'utf8'),p=await load(ctx,{[K]:raw},'noapi');assert(await p.locator('#new-game').isDisabled());assert(await p.locator('#continue-game').isDisabled());assert.match(await p.locator('#writer-status').innerText(),/не поддерживается/);item.export=await exported(p,'#export-primary','noapi-old-won',raw);assert.equal(await read(p),raw);
 });
 await run('representative 0.3.2 v3 retains exact raw and loads completed expedition',async(ctx)=>{
  const raw=await fs.readFile(path.join(BASE,'tests/fixtures/save-v3-0.3.2-won.json'),'utf8'),p=await load(ctx,{[K]:raw});assert.match(await p.locator('#save-note').innerText(),/3\/3 деталей/);assert.equal(await read(p),raw);await p.click('#continue-game');await p.waitForSelector('#ending:not([hidden])');assert.match(await p.locator('#end-label').innerText(),/ЭКСПЕДИЦИЯ ЗАВЕРШЕНА/);assert.equal(await read(p),raw);
 });
 await run('actual natural 0.4.5 won: epilogue/export/reload/cancel/restart/backup recovery',async(ctx,item)=>{
  const raw=await fs.readFile(path.join(BASE,'tests/fixtures/save-v3-0.4.5-natural-won.json'),'utf8'),p=await load(ctx,{[K]:raw});await p.click('#continue-game');await p.waitForSelector('#ending:not([hidden])');
  assert.match(await p.locator('#end-label').innerText(),/ЭКСПЕДИЦИЯ ЗАВЕРШЕНА/);assert.match(await p.locator('#end-text').innerText(),/Прилив/);assert.doesNotMatch(await p.locator('#end-text').innerText(),/следующ|станци|срез|за дамбой/i);assert.equal(await read(p),raw);await shot(p,'04-won');
  item.export=await exported(p,'#export-primary','natural045-won',raw);await exported(p,'#export-session','natural045-session',raw);
  await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>!document.querySelector('#continue-game').disabled);await p.click('#continue-game');await p.waitForSelector('#ending:not([hidden])');assert.equal(await read(p),raw);await shot(p,'05-won-reloaded');
  await p.click('#end-new');await p.click('#confirm-new-no');assert(await p.locator('#ending').isVisible());assert.equal(await read(p),raw);
  await p.click('#end-new');await p.click('#confirm-new-yes');await p.click('#pause-btn');const fresh=JSON.parse(await read(p));assert.equal(fresh.parts.length,0);assert.equal(fresh.hp,100);assert(fresh.time<2);assert.equal(await read(p,B),raw);await shot(p,'06-fresh-backup');
  await p.click('#recover-backup');await p.click('#confirm-new-yes');await p.waitForSelector('#ending:not([hidden])');const recovered=JSON.parse(await read(p)),before=JSON.parse(raw);delete recovered.saveMeta;delete before.saveMeta;assert.deepEqual(recovered,before);assert.equal(await read(p,B),raw);await shot(p,'07-restored-won');
 });
 report.success=report.cases.every(x=>x.passed)&&report.errors.length===0;
}finally{if(browser)await browser.close();await server.close();report.closed=true;await output(RUN+'.json',report);console.log(JSON.stringify({success:report.success,passed:report.cases.filter(x=>x.passed).length,errors:report.errors,closed:report.closed}));if(!report.success)process.exitCode=1;}
