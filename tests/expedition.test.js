import test from 'node:test';
import assert from 'node:assert/strict';
import {STORM,OUTPOST,ROUTES,initialState,makeWorld,LOOT,MATERIAL_CRATES,PARTS,stormStatus,stormCovered,inShelter,danger,tick,produce,interact,restore,serialize,SAVE_KEY,LEGACY_SAVE_KEYS,activeColliders,collides} from '../src/core.js';
const world=makeWorld();
const seconds=(s,n)=>{for(let t=0;t<n;t+=.02)tick(s,{},Math.min(.02,n-t),world.colliders);};
const at=(s,p)=>s.player={x:p.x,z:p.z,yaw:0,pitch:0};
function ready(){const s=initialState();s.shelter.workbench=true;s.outpost={repaired:true,waterOnline:true,waterRemaining:2,waterTaken:1};s.time=STORM.endsAt;return s;}
test('storm warns forty seconds before one bounded event; pause/death cannot advance it',()=>{
 const s=initialState();for(const [time,phase] of [[94.99,'clear'],[95,'warning'],[134.99,'warning'],[135,'active'],[194.99,'active'],[195,'settled'],[1000,'settled']]){s.time=time;assert.equal(stormStatus(s).phase,phase);}
 s.time=95;assert.equal(stormStatus(s).remaining,40);s.mode='dead';seconds(s,60);assert.equal(s.time,95);
});
test('weather exposure raises real dose, filter and water cost; pump roof protects without healing',()=>{
 const open=initialState(),roof=initialState();for(const s of [open,roof]){s.time=135;s.enemies.forEach(e=>e.hp=0);s.hp=60;}
 at(open,{x:83,z:43});at(roof,{x:51,z:25});assert(stormCovered(roof));assert(!inShelter(roof));seconds(open,12);seconds(roof,12);
 assert(open.radiation>roof.radiation+10);assert(open.filter<roof.filter-30);assert(open.thirst<roof.thirst-4);assert.equal(roof.hp,60);assert(roof.storm.sheltered>11.99);assert(open.storm.exposed>11.99);
});
test('closed post is exposed, restored post is a real protected region; install consumes one unique kit',()=>{
 const s=initialState();s.shelter.workbench=true;s.inventory.outpostKit=1;s.time=140;at(s,{x:75,z:-17});assert(!stormCovered(s));assert(danger(s)>2);
 interact(s,world.colliders);assert(s.outpost.repaired);assert.equal(s.inventory.outpostKit,0);assert(inShelter(s));assert(stormCovered(s));assert.equal(danger(s),0);
 const before=serialize(s);interact(s,world.colliders);assert.equal(serialize(s),before);at(s,{x:0,z:83});assert(!produce(s,'outpostKit').ok);
});
test('water pump starts once, yields only three finite portions, and respects pack capacity',()=>{
 const s=ready();s.outpost.waterOnline=false;s.outpost.waterRemaining=s.outpost.waterTaken=0;s.inventory.water=0;at(s,OUTPOST.pump);
 interact(s,world.colliders);assert.equal(s.outpost.waterRemaining,3);assert.equal(s.inventory.water,0);
 for(let i=0;i<20;i++)interact(s,world.colliders);assert.equal(s.inventory.water,3);assert.equal(s.outpost.waterTaken,3);assert.equal(s.outpost.waterRemaining,0);
 const before=serialize(s);interact(s,world.colliders);assert.equal(serialize(s),before);
});
test('final link requires completed storm, repaired post, drawn water, all parts and final wiring',()=>{
 const s=ready();s.parts=[...PARTS];s.collected=[...PARTS];s.inventory.scrap=s.inventory.wire=1;at(s,OUTPOST.radio);
 s.time=194;interact(s,world.colliders);assert.equal(s.mode,'playing');s.time=195;s.outpost.waterTaken=0;s.outpost.waterRemaining=3;interact(s,world.colliders);assert.equal(s.mode,'playing');
 s.outpost.waterTaken=1;s.outpost.waterRemaining=2;interact(s,world.colliders);assert.equal(s.mode,'won');assert.equal(s.inventory.scrap,0);assert.equal(s.inventory.wire,0);const before=serialize(s);interact(s,world.colliders);assert.equal(serialize(s),before);
});
test('save v3 round-trips warning, active shelter/exposure, post, finite water and victory; rejects impossible states',()=>{
 for(const time of [95,135,150,195,200]){const s=ready();s.time=time;assert.deepEqual(restore(serialize(s),world.colliders),s);}
 const s=ready();for(const mutate of [a=>a.outpost.waterRemaining=4,a=>a.outpost.waterTaken=-1,a=>a.outpost.repaired=false,a=>a.inventory.outpostKit=1,a=>a.storm.exposed=100,a=>a.outpost.waterOnline=false]){const bad=structuredClone(s);mutate(bad);assert.equal(restore(serialize(bad),world.colliders),null);}
 assert(!LEGACY_SAVE_KEYS.includes(SAVE_KEY));assert.equal(restore(JSON.stringify({...s,version:2}),world.colliders),null);
});
test('every affordable production order leaves final wiring and a recoverable outpost kit',()=>{
 const s=initialState();for(const [k] of Object.entries(s.inventory)){if(['scrap','cloth','wire','sorbent'].includes(k))s.inventory[k]=MATERIAL_CRATES.reduce((sum,c)=>sum+(c.contents[k]||0),0);}
 s.collected=MATERIAL_CRATES.map(c=>c.id);const queue=[s],seen=new Set();let repaired=0;
 const key=a=>JSON.stringify([a.inventory,a.shelter,a.outpost.repaired,a.gateOpened]);
 for(let i=0;i<queue.length;i++){
  const a=queue[i],k=key(a);if(seen.has(k))continue;seen.add(k);
  assert(a.inventory.scrap>=1);assert(a.inventory.wire>=1);assert.deepEqual(restore(serialize(a),world.colliders),a);
  if(!a.outpost.repaired&&!a.inventory.outpostKit){assert(a.inventory.cloth>=1);assert(a.inventory.wire>=2,'one wire for repair plus final link');assert(a.inventory.scrap>=3);}
  for(const [id,upgrade] of [['workbench',true],['purifier',true],['gateKit',false],['outpostKit',false],['filter',false],['med',false]]){const b=structuredClone(a);if(produce(b,id,upgrade).ok)queue.push(b);}
  if(a.inventory.outpostKit){const b=structuredClone(a);at(b,{x:75,z:-17});interact(b,world.colliders);assert(b.outpost.repaired);repaired++;at(b,{x:0,z:83});queue.push(b);}
 }
 assert(seen.size>100);assert(repaired>0);
});
test('route waypoints and post stations are reachable with collision-safe BFS; short route has a real fixed hazard',()=>{
 const s=initialState(),obs=activeColliders(s,world.colliders),key=(x,z)=>x+','+z,q=[[0,82]],seen=new Set(['0,82']);
 for(let i=0;i<q.length;i++){const [x,z]=q[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&!collides(nx,nz,obs,.7)){seen.add(k);q.push([nx,nz]);}}}
 for(const [x,z] of [...ROUTES.flatMap(r=>r.points),[72,-22],[79,-21]])assert([...seen].some(k=>{const [a,b]=k.split(',').map(Number);return Math.hypot(a-x,b-z)<1.5;}),x+','+z);
 at(s,{x:32,z:6});const hot=danger(s);at(s,{x:83,z:6});assert(hot>danger(s)+1.5);
});
test('all 128 finite crate subsets and every affordable recipe sequence retain a recoverable ending',()=>{
 for(let mask=0;mask<(1<<MATERIAL_CRATES.length);mask++){
  const start=initialState(),remaining=[];for(let i=0;i<MATERIAL_CRATES.length;i++){const crate=MATERIAL_CRATES[i];if(mask&(1<<i)){start.collected.push(crate.id);for(const [k,n] of Object.entries(crate.contents))start.inventory[k]+=n;}else remaining.push(crate);}
  const queue=[start],seen=new Set();
  for(let i=0;i<queue.length;i++){
   const s=queue[i],key=JSON.stringify([s.inventory,s.shelter]);if(seen.has(key))continue;seen.add(key);
   const finish=structuredClone(s);for(const crate of remaining){finish.collected.push(crate.id);for(const [k,n] of Object.entries(crate.contents))finish.inventory[k]+=n;}
   if(!finish.shelter.workbench)assert(produce(finish,'workbench',true).ok,'recover workbench mask '+mask);
   if(!finish.inventory.outpostKit)assert(produce(finish,'outpostKit').ok,'recover outpost kit mask '+mask);
   at(finish,{x:75,z:-17});interact(finish,world.colliders);assert(finish.outpost.repaired);
   at(finish,OUTPOST.pump);interact(finish,world.colliders);interact(finish,world.colliders);finish.parts=[...PARTS];finish.collected.push(...PARTS);finish.time=195;at(finish,OUTPOST.radio);interact(finish,world.colliders);assert.equal(finish.mode,'won','recover ending mask '+mask);
   for(const [id,upgrade] of [['workbench',true],['purifier',true],['gateKit',false],['outpostKit',false],['filter',false],['med',false]]){const next=structuredClone(s);if(produce(next,id,upgrade).ok)queue.push(next);}
  }
 }
});
