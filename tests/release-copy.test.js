import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import * as g from '../src/core.js';
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const refresh=source.match(/function refreshSave\(\)\{[\s\S]*?\n\}/)[0];
const finish=source.match(/function finish\(\)\{[\s\S]*?\n\}/)[0];
const wonRaw=fs.readFileSync(new URL('./fixtures/save-v3-0.4.5-natural-won.json',import.meta.url),'utf8');
function render({raw=null,state=null,error=false,mode='writer',legacy=null}={}){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,disabled:false});return nodes.get(id);};
 const primary={raw,state,error},empty={raw:null,state:null,error:false};
 const records=new Map([[g.SAVE_KEY,primary],[g.LEGACY_SAVE_KEYS[1],{raw:legacy,state:null,error:false}]]);
 const store={inspect:(k=g.SAVE_KEY)=>records.get(k)||empty,status:()=>({mode,canReplace:mode==='writer',canWrite:false})};
 const c=vm.createContext({$:node,store,readSave:()=>primary.state,LEGACY_SAVE_KEYS:g.LEGACY_SAVE_KEYS,BACKUP_KEY:g.SAVE_KEY+'-backup',SAFETY_KEY:g.SAVE_KEY+'-before-recovery',storageMessage:()=>mode,s:g.initialState(),sessionStarted:false});
 vm.runInContext(refresh+'\nrefreshSave();',c);assert.equal(primary.raw,raw);return {node,c};
}
test('fresh writable profile offers a clear beginning without a corruption or format warning',()=>{
 const {node}=render();assert.match(node('save-note').textContent,/Начните новый путь/);assert.doesNotMatch(node('save-note').textContent,/не чита|отсутств|v3/i);assert.equal(node('new-game').disabled,false);assert.equal(node('export-primary').disabled,true);
});
for(const raw of ['{','',JSON.stringify({version:99,hello:'исходные байты'})])test('unreadable primary is distinct from absent and remains exportable: '+JSON.stringify(raw),()=>{
 const {node}=render({raw});assert.match(node('save-note').textContent,/не удалось прочитать/);assert.match(node('save-note').textContent,/не удалены/);assert.doesNotMatch(node('save-note').textContent,/Начните новый путь/);assert.equal(node('export-primary').disabled,false);assert.equal(node('continue-game').disabled,true);
});
test('storage access failure is unavailable rather than fresh; read-only mode stays explicit',()=>{
 let {node}=render({error:true,mode:'storage-error'});assert.match(node('save-note').textContent,/недоступно/);assert.doesNotMatch(node('save-note').textContent,/Начните новый путь/);assert.equal(node('new-game').disabled,true);
 ({node}=render({mode:'unsupported'}));assert.doesNotMatch(node('save-note').textContent,/Начните новый путь/);assert.equal(node('new-game').disabled,true);
});
test('actual old natural won v3 loads and legacy-only record stays separate',()=>{
 assert.equal(createHash('sha256').update(wonRaw).digest('hex'),'9844e5d5b519db259b04fc27276b4e695de9aa0c180c8710fd5032d442d8c309');
 const old=g.restore(wonRaw,g.makeWorld().colliders);assert(old);assert.equal(old.mode,'won');
 let {node}=render({raw:wonRaw,state:old});assert.match(node('save-note').textContent,/3\/3 деталей/);assert.equal(node('continue-game').disabled,false);
 ({node}=render({legacy:'legacy raw unchanged'}));assert.match(node('save-note').textContent,/оставлены отдельно/);assert.equal(node('export-v1').hidden,false);
});
test('actual won epilogue closes this expedition without an unavailable station; loss remains actionable',()=>{
 for(const mode of ['won','dead']){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id);};
  const c=vm.createContext({$:node,s:{mode,parts:['cell','module','antenna'],time:434,steps:998,kills:2},setScreen(){},refreshSave(){}});vm.runInContext(finish+'\nfinish();',c);
  if(mode==='won'){assert.match(node('end-label').textContent,/ЭКСПЕДИЦИЯ ЗАВЕРШЕНА/);assert.match(node('end-text').textContent,/Прилив/);assert.doesNotMatch(node('end-text').textContent,/следующ|за дамбой|срез|станци/i);}
  else assert.match(node('end-text').textContent,/Загрузи сохранение/);
 }
});
