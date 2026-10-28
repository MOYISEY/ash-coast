import test from 'node:test';
import assert from 'node:assert/strict';
import * as now from '../src/core.js';
import * as old from './reference-0.3.1/core.js';
const world=now.makeWorld();
function advance(g,s,n){for(let t=0;t<n;t+=.02)g.tick(s,{},Math.min(.02,n-t),world.colliders);}
function wound(g=now){const s=g.initialState();s.hp=50;s.enemies.forEach(e=>e.hp=0);return s;}
test('waiting 200 seconds in every existing shelter never heals a wound',()=>{
 for(const kind of ['base','purifier','post','pump']){
  const s=wound();if(kind==='purifier')s.shelter.workbench=s.shelter.purifier=true;if(kind==='post'){s.shelter.workbench=true;s.outpost.repaired=true;s.player={x:75,z:-17,yaw:0,pitch:0};}if(kind==='pump')s.player={x:51,z:25,yaw:0,pitch:0};
  advance(now,s,200);assert.equal(s.hp,50,kind);assert.equal(s.radiation,0,kind);assert.equal(s.mode,'playing');
 }
});
test('old free HP50 to HP100 wait is replaced by HP50; one medicine heals once to HP95',()=>{
 const a=wound(old),b=wound();advance(old,a,200);advance(now,b,200);assert.equal(a.hp,100);assert.equal(b.hp,50);
 now.consume(b,'med');assert.equal(b.hp,95);assert.equal(b.inventory.med,0);const once=now.serialize(b);for(let i=0;i<100;i++)now.consume(b,'med');assert.equal(now.serialize(b),once);advance(now,b,200);assert.equal(b.hp,95);
});
test('food and water restore their own depleted stats but never heal wounds',()=>{
 const s=wound();s.hunger=20;s.thirst=20;now.consume(s,'food');now.consume(s,'water');assert.equal(s.hunger,65);assert.equal(s.thirst,70);assert.equal(s.hp,50);assert.equal(s.inventory.food,0);assert.equal(s.inventory.water,0);
});
test('full-stat items are not spent and cannot duplicate or go negative through repeated input',()=>{
 const s=now.initialState();s.hunger=s.thirst=s.filter=100;for(const item of ['food','water','med','filter']){assert(!now.canConsume(s,item));const before=now.serialize(s);for(let i=0;i<100;i++)now.consume(s,item);assert.equal(now.serialize(s),before);assert.equal(s.inventory[item],1);}
 s.hp=80;assert(now.canConsume(s,'med'));now.consume(s,'med');assert.equal(s.hp,100);assert.equal(s.inventory.med,0);now.consume(s,'med');assert.equal(s.inventory.med,0);
});
test('food/water stop depletion damage without becoming direct HP recovery',()=>{
 const s=wound();s.hunger=s.thirst=0;advance(now,s,2);assert(s.hp<50);const hurt=s.hp;now.consume(s,'food');now.consume(s,'water');assert.equal(s.hp,hurt);advance(now,s,20);assert.equal(s.hp,hurt);assert.equal(s.mode,'playing');
});
test('v3 wound, medicine inventory and old saves reload exactly without passive healing',()=>{
 const source=wound(old),raw=old.serialize(source);let s=now.restore(raw,world.colliders);assert.deepEqual(s,source);advance(now,s,20);assert.equal(s.hp,50);now.consume(s,'med');const healed=now.serialize(s);s=now.restore(healed,world.colliders);assert.equal(s.hp,95);assert.equal(s.inventory.med,0);assert.deepEqual(old.restore(healed,world.colliders),s);advance(now,s,20);assert.equal(s.hp,95);assert.equal(old.serialize(source),raw);assert.equal(now.SAVE_KEY,old.SAVE_KEY);
});
test('purifier still clears fictional dose faster while neither shelter heals HP',()=>{
 const a=wound(),b=wound();a.radiation=b.radiation=30;b.shelter.workbench=b.shelter.purifier=true;advance(now,a,10);advance(now,b,10);assert.equal(a.hp,50);assert.equal(b.hp,50);assert(a.radiation>20);assert(b.radiation<1e-9);
});
test('injury alone does not gate a valid ending or require a medicine expenditure',()=>{
 const s=wound();s.shelter.workbench=true;s.outpost={repaired:true,waterOnline:true,waterRemaining:2,waterTaken:1};s.parts=[...now.PARTS];s.collected=[...s.parts];s.time=200;s.inventory.scrap=s.inventory.wire=1;s.player={x:73,z:-21,yaw:0,pitch:0};now.interact(s,world.colliders);assert.equal(s.mode,'won');assert.equal(s.hp,50);assert.equal(s.inventory.med,1);assert(now.restore(now.serialize(s),world.colliders));
});
