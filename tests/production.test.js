import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,makeWorld,serialize,restore,produce,productionCheck,RECIPES,UPGRADES,MATERIAL_CRATES,interact,activeColliders,collides,danger,tick,LEGACY_SAVE_KEY,SAVE_KEY} from '../src/core.js';
const world=makeWorld();
function stock(s){Object.assign(s.inventory,{scrap:15,cloth:8,wire:6,sorbent:6});return s;}
function seconds(s,n){for(let i=0;i<n*20;i++)tick(s,{},.05,world.colliders);}

test('all production costs are positive integer resources, not player-supplied prices',()=>{
 for(const recipe of [...Object.values(RECIPES),...Object.values(UPGRADES)])for(const [key,amount] of Object.entries(recipe.cost)){assert(['scrap','cloth','wire','sorbent'].includes(key));assert(Number.isInteger(amount)&&amount>0);}
});
test('production rejects unknown ids, missing materials, absent bench and field crafting atomically',()=>{
 const s=initialState();for(const id of ['filter','unknown','__proto__','constructor']){const before=serialize(s);assert(!produce(s,id).ok);assert.equal(serialize(s),before);}
 stock(s);s.player.z=70;const before=serialize(s);assert(!produce(s,'workbench',true).ok);assert.equal(serialize(s),before);
});
test('workbench and purifier are one-time upgrades with exact costs',()=>{
 const s=stock(initialState());assert(!produce(s,'purifier',true).ok);assert(produce(s,'workbench',true).ok);assert.equal(s.inventory.scrap,12);assert.equal(s.inventory.cloth,7);
 const once=serialize(s);assert(!produce(s,'workbench',true).ok);assert.equal(serialize(s),once);
 assert(produce(s,'purifier',true).ok);assert.equal(s.inventory.scrap,9);assert.equal(s.inventory.wire,5);assert.equal(s.inventory.sorbent,5);
 const twice=serialize(s);assert(!produce(s,'purifier',true).ok);assert.equal(serialize(s),twice);
});
test('repeated filter crafting never duplicates output or produces negative material counts',()=>{
 const s=initialState();s.shelter.workbench=true;s.outpost.repaired=true;s.inventory.cloth=2;s.inventory.sorbent=2;
 let successes=0;for(let i=0;i<100;i++)if(produce(s,'filter').ok)successes++;
 assert.equal(successes,2);assert.equal(s.inventory.filter,3);assert.equal(s.inventory.cloth,0);assert.equal(s.inventory.sorbent,0);assert.equal(s.crafted,2);
 assert(Object.values(s.inventory).every(v=>Number.isInteger(v)&&v>=0));
});
test('medicine recipe consumes two cloth and one sorbent; finite capacity is enforced',()=>{
 const s=stock(initialState());s.shelter.workbench=true;assert(produce(s,'med').ok);assert.equal(s.inventory.med,2);assert.equal(s.inventory.cloth,6);assert.equal(s.inventory.sorbent,5);
 s.inventory.med=8;const before=serialize(s);assert(!produce(s,'med').ok);assert.equal(serialize(s),before);
});
test('gate drive is unique, consumed once and opens a real collider plus ventilation',()=>{
 const s=stock(initialState());s.shelter.workbench=true;assert(produce(s,'gateKit').ok);assert.equal(s.inventory.gateKit,1);
 const before=serialize(s);assert(!produce(s,'gateKit').ok);assert.equal(serialize(s),before);
 assert(collides(46,-56,activeColliders(s,world.colliders)));s.player={x:48,z:-56,yaw:0,pitch:0};interact(s,world.colliders);
 assert(s.gateOpened);assert.equal(s.inventory.gateKit,0);assert(!collides(46,-56,activeColliders(s,world.colliders)));
 const opened=serialize(s);interact(s,world.colliders);assert.equal(serialize(s),opened);
 s.player.x=0;s.player.z=84;assert(!produce(s,'gateKit').ok);
});
test('ventilated service passage meaningfully reduces dose and filter use at the same position',()=>{
 const a=initialState(),b=initialState();for(const s of [a,b]){s.player={x:34,z:-68,yaw:0,pitch:0};s.enemies.forEach(e=>e.hp=0);}
 b.gateOpened=true;b.shelter.workbench=true;assert(danger(b)<danger(a)*.2);seconds(a,12);seconds(b,12);assert(b.radiation<a.radiation*.25);assert(b.filter>a.filter+30);
});
test('air purifier clears fictional dose faster but never heals wounds',()=>{
 const a=initialState(),b=initialState();for(const s of [a,b]){s.hp=50;s.radiation=30;}b.shelter.workbench=b.shelter.purifier=true;
 seconds(a,10);seconds(b,10);assert.equal(a.hp,50);assert.equal(b.hp,50);assert(b.radiation<1e-9);assert(a.radiation>20);
});
test('new purifier has physical collision and cannot be installed on top of the player',()=>{
 const s=stock(initialState());s.shelter.workbench=true;s.player={x:-5.2,z:87,yaw:0,pitch:0};
 assert(!collides(s.player.x,s.player.z,activeColliders(s,world.colliders)));const before=serialize(s);assert(!produce(s,'purifier',true).ok);assert.equal(serialize(s),before);
 s.player.x=0;assert(produce(s,'purifier',true).ok);assert(collides(-5.2,87,activeColliders(s,world.colliders)));
});
test('material crates are finite and total stock supports both upgrades and a prepared factory route',()=>{
 const s=initialState();for(const crate of MATERIAL_CRATES){s.player={x:crate.x,z:crate.z,yaw:0,pitch:0};for(let i=0;i<3&&!s.collected.includes(crate.id);i++)interact(s,world.colliders);assert(s.collected.includes(crate.id),crate.id);}
 const inventory={...s.inventory};s.player={x:9,z:73,yaw:0,pitch:0};interact(s,world.colliders);assert.deepEqual(s.inventory,inventory);
 s.player={x:0,z:84,yaw:0,pitch:0};for(const id of ['workbench','purifier'])assert(produce(s,id,true).ok);assert(produce(s,'gateKit').ok);assert(produce(s,'filter').ok);
});
test('save v3 round-trips new progression, crafting, loot and an open gate',()=>{
 const s=stock(initialState());produce(s,'workbench',true);produce(s,'purifier',true);produce(s,'filter');produce(s,'gateKit');s.player={x:48,z:-56,yaw:0,pitch:0};interact(s,world.colliders);s.player.x=46;
 assert.deepEqual(restore(serialize(s),world.colliders),s,'position inside opened doorway remains valid');
});
test('three transmitter parts require the workbench and final wiring, spent exactly once',()=>{
 const s=initialState();s.parts=['antenna','cell','module'];s.collected=[...s.parts];s.time=195;s.outpost={repaired:true,waterOnline:true,waterRemaining:2,waterTaken:1};s.player={x:72,z:-22,yaw:0,pitch:0};
 interact(s,world.colliders);assert.equal(s.mode,'playing');s.shelter.workbench=true;interact(s,world.colliders);assert.equal(s.mode,'playing');
 s.inventory.scrap=s.inventory.wire=1;interact(s,world.colliders);assert.equal(s.mode,'won');assert.equal(s.inventory.scrap,0);assert.equal(s.inventory.wire,0);
 const won=serialize(s);interact(s,world.colliders);assert.equal(serialize(s),won);
});
test('invalid progression, inconsistent parts, enemy ids/cooldowns and inventory values are rejected',()=>{
 const valid=initialState();const bad=[];
 for(const mutate of [s=>s.inventory.scrap=-1,s=>s.inventory.cloth=.5,s=>s.inventory.gateKit=2,s=>s.collected=['antenna'],s=>s.player.pitch=1000,s=>delete s.enemies[0].id,s=>s.enemies[0].cool=-1,s=>s.shelter.purifier=true,s=>s.gateOpened=true]){const s=structuredClone(valid);mutate(s);bad.push(s);}
 for(const s of bad)assert.equal(restore(JSON.stringify(s),world.colliders),null);
 assert.notEqual(SAVE_KEY,LEGACY_SAVE_KEY);assert.equal(restore(JSON.stringify({...valid,version:1}),world.colliders),null);
});
