import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE_DIR||'evidence/visual';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5183/?qa=1',{waitUntil:'networkidle'});await page.click('#new-game');
 await page.evaluate(()=>{const s=window.__ASH__.snapshot();s.player={x:0,z:73,yaw:0,pitch:0};s.mode='benchmark';s.time=0;window.__ASH_QA__.setState(s);});
 await page.waitForTimeout(1300);await page.screenshot({path:out+'/road-initial.jpg'});
 const metrics=await page.evaluate(()=>JSON.parse(document.querySelector('#telemetry').textContent).metrics);
 await page.evaluate(()=>{const s=window.__ASH__.snapshot();s.mode='playing';s.player={x:0,z:83,yaw:Math.PI,pitch:0};s.shelter.workbench=true;window.__ASH_QA__.setState(s);});await page.keyboard.press('KeyB');
 const layout=await page.locator('#workshop-close').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,viewport:innerHeight,panelHeight:el.parentElement.clientHeight,contentHeight:el.parentElement.scrollHeight}));
 assert(layout.bottom<=layout.viewport-5,'workshop close button fits 720p without scrolling');await page.screenshot({path:out+'/workshop-layout.jpg'});
 const report={success:errors.length===0,errors,metrics,layout,scenario:'explicit render/UI layout fixture, not a gameplay run'};
 await fs.writeFile(out+'/visual-smoke-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
