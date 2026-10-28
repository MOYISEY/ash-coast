import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as g from '../src/core.js';
import {outpostNodes,interactOutpost} from '../src/expedition.js';
import {explorationAt,explorationCaption} from '../src/exploration.js';
const world=g.makeWorld();
const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const hud=source.match(/function updateHUD\(\)\{[\s\S]*?\n\}/)?.[0];assert(hud);
function render(s){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',innerHTML:'',hidden:false,style:{}});return nodes.get(id);};
 const context=vm.createContext({...g,s,world,screen:'play',$:node,explorationAt,explorationCaption,previousHp:s.hp,seenHit:-1,tone(){},setTimeout(){}});
 vm.runInContext(hud+'\nupdateHUD();',context);return node('prompt');
}
function post({repaired=true,online=false,remaining=0}={}){
 const s=g.initialState();s.shelter.workbench=true;s.outpost={repaired,waterOnline:online,waterRemaining:remaining,waterTaken:online?3-remaining:0};s.player={x:79,z:-21,yaw:0,pitch:0};return s;
}
test('outpost names carry no hotkey; the actual nearest/updateHUD adds exactly one E',()=>{
 const cases=[];
 for(const kit of [0,1]){const s=post({repaired:false});s.inventory.outpostKit=kit;s.player={x:75,z:-17,yaw:0,pitch:0};cases.push(s);}
 const radio=post();radio.player={x:72,z:-22,yaw:0,pitch:0};cases.push(radio,post());
 for(let n=0;n<=3;n++)cases.push(post({online:true,remaining:n}));
 for(const s of cases){const before=g.serialize(s);for(const n of outpostNodes(s))assert(!n.name.includes('[E]'),'hotkey duplicated in node name');const prompt=render(s);assert.equal(prompt.style.display,'block');assert.equal((prompt.textContent.match(/\[E\]/g)||[]).length,1);assert.equal(g.serialize(s),before);}
});
test('actual HUD spells the finite water quantities 0/1/2/3 correctly',()=>{
 for(const [n,word]of[[0,'порций'],[1,'порция'],[2,'порции'],[3,'порции']]){
  const s=post({online:true,remaining:n});assert.equal(render(s).textContent,`[E] Чистая вода: ${n} ${word}`);
 }
});
test('copy changes do not alter repair, finite water or repeated save/restore state',()=>{
 let s=post({repaired:false});s.inventory.outpostKit=1;s.inventory.water=0;
 interactOutpost(s,'outpostRepair');assert(s.outpost.repaired);assert.equal(s.inventory.outpostKit,0);interactOutpost(s,'outpostWater');assert.equal(s.outpost.waterRemaining,3);
 for(let n=3;n>=0;n--){
  for(let i=0;i<3;i++){const raw=g.serialize(s);render(s);assert.equal(g.serialize(s),raw);const loaded=g.restore(raw,world.colliders);assert(loaded);assert.equal(g.serialize(loaded),raw);s=loaded;}
  assert.equal(s.outpost.waterRemaining,n);if(n)interactOutpost(s,'outpostWater');
 }
 const empty=g.serialize(s);for(let i=0;i<10;i++)interactOutpost(s,'outpostWater');assert.equal(g.serialize(s),empty);assert.equal(s.inventory.water,3);assert.equal(s.outpost.waterTaken,3);
});
test('old v3 fixtures including the independent natural-route victory roundtrip without migration',()=>{
 for(const f of ['save-v3-0.3.2-won.json','save-v3-0.4.0-won.json','save-v3-0.4.2-independent-won.json']){
  const raw=fs.readFileSync(new URL('./fixtures/'+f,import.meta.url),'utf8'),s=g.restore(raw,world.colliders);assert(s);const before=g.serialize(s);outpostNodes(s);assert.equal(g.serialize(s),before);
  for(let i=0;i<3;i++){const next=g.restore(g.serialize(s),world.colliders);assert.deepEqual(next,s);}
 }
});
