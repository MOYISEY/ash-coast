import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('R1 actual finish/setScreen keep storage/export controls available on victory/error and defeat',()=>{
 const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),setScreen=source.match(/function setScreen\(next\)\{[\s\S]*?\n\}/)?.[0],finish=source.match(/function finish\(\)\{[\s\S]*?\n\}/)?.[0];assert(setScreen&&finish);
 for(const mode of ['won','dead']){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,style:{},textContent:'',append(child){child.parent=id;},insertBefore(child){child.parent=id;},querySelector(){return node(id+'-panel');},parentNode:{append(child){child.parent=id+'-parent';}}});return nodes.get(id);};
  const c=vm.createContext({screen:'play',store:{status:()=>({canWrite:false})},$:node,keys:new Set(),drag:false,pointerGesture:null,document:{pointerLockElement:null},ambient:null,s:{mode,parts:['cell','antenna','module'],time:200,steps:300,kills:1},refreshSave(){},drawInventory(){},drawMap(){},drawWorkshop(){}});vm.runInContext(setScreen+'\n'+finish+'\nfinish();',c);assert.equal(c.screen,'end');assert.equal(node('save-tools').hidden,false);assert.equal(node('save-tools').parent,'ending-panel');assert.equal(c.s.mode,mode);
 }
});
