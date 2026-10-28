// Render-only paired scenes. These explicit camera fixtures are not a playthrough.
import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
const out=process.env.EVIDENCE_DIR||'evidence/comparison';await fs.mkdir(out,{recursive:true});
const scenes=[
 {id:'road',x:0,z:73,yaw:0,pitch:0},
 {id:'pump',x:51,z:44,yaw:0,pitch:0},
 {id:'quarter',x:-50,z:0,yaw:0,pitch:0},
 {id:'factory',x:34,z:-30,yaw:0,pitch:0},
 {id:'coast',x:88,z:27,yaw:-Math.PI/2,pitch:0},
 {id:'shelter',x:0,z:82,yaw:Math.PI,pitch:0}
];
const browser=await chromium.launch({channel:'chrome',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']});
const report={browser:browser.version(),viewport:{width:1280,height:720},dpr:1,mode:'render-only fixed camera and game time; no gameplay claims',warmupFrames:240,sampleFrames:300,results:[],errors:[]};
const frames=(page,n)=>page.evaluate(n=>new Promise(resolve=>{let last=performance.now();const values=[];function sample(now){values.push(now-last);last=now;if(values.length>=n)resolve(values);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}),n);
try{
 for(const quality of ['low','medium'])for(const [version,url] of [['0.2.0',process.env.BASELINE_URL||'http://127.0.0.1:5184/'],['0.3.0',process.env.CANDIDATE_URL||'http://127.0.0.1:5183/']]){
  const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push({version,error:e.message}));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text()))report.errors.push({version,error:m.text()});});
  await page.goto(url+'?qa=1',{waitUntil:'networkidle'});await page.click('#new-game');
  await page.evaluate(()=>window.__ASH_QA__.setScreen('menu'));await page.selectOption('#quality',quality);await page.evaluate(()=>window.__ASH_QA__.setScreen('play'));
  for(const fixture of scenes){
   await page.evaluate(f=>{const s=window.__ASH__.snapshot();s.player={x:f.x,z:f.z,yaw:f.yaw,pitch:f.pitch};s.mode='benchmark';s.time=0;s.steps=0;s.parts=[];s.collected=[];window.__ASH_QA__.setState(s);document.querySelector('#toast').style.opacity=0;},fixture);
   await frames(page,report.warmupFrames);const samples=await frames(page,report.sampleFrames),sorted=[...samples].sort((a,b)=>a-b);
   const telemetry=await page.evaluate(()=>JSON.parse(document.querySelector('#telemetry').textContent));
   const image=out+'/'+version+'-'+quality+'-'+fixture.id+'.jpg';await page.screenshot({path:image});
   report.results.push({version,quality,scene:fixture.id,camera:fixture,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:sorted.at(-1),drawCalls:telemetry.metrics.drawCalls,triangles:telemetry.metrics.triangles,pixelRatio:telemetry.metrics.pixelRatio,gpu:telemetry.metrics.gpu,image});
   console.log(version+' '+quality+' '+fixture.id+' p95 '+report.results.at(-1).p95Ms.toFixed(2)+'ms');
  }
  await context.close();
 }
 report.success=report.errors.length===0;report.conditions='Same Chrome process, separate clean contexts, identical 240 rAF-frame warmup and 300 samples for every scene/version/profile. Post-cache-cleanup comparison uses these new measurements only; no comparison with old warm-cache records.';
}catch(e){report.success=false;report.failure=e.stack;process.exitCode=1;}
finally{await fs.writeFile(out+'/comparison.json',JSON.stringify(report,null,2));await browser.close();}
