import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,initialState,move,collides,tick,interact,consume,attack,serialize,restore,lineClear,LOOT,LANDMARKS,danger,inShelter} from '../src/core.js';
const world=makeWorld();
function seconds(s,n,input={}){for(let t=0;t<n;t+=.02)tick(s,input,Math.min(.02,n-t),world.colliders);}
export function findPath(start,goal){
 const key=(x,z)=>`${x},${z}`,queue=[[Math.round(start.x),Math.round(start.z)]],came=new Map([[key(...queue[0]),null]]);let end;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];if(Math.hypot(x-goal.x,z-goal.z)<1.5){end=[x,z];break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!came.has(k)&&!collides(nx,nz,world.colliders,.62)){came.set(k,[x,z]);queue.push([nx,nz]);}}
 }
 if(!end)return null;const path=[];for(let p=end;p;p=came.get(key(...p)))path.push({x:p[0],z:p[1]});return path.reverse();
}
test('fresh player stands in open shelter, all loot is outside solid geometry',()=>{const s=initialState();assert(inShelter(s));assert(!collides(s.player.x,s.player.z,world.colliders));for(const l of LOOT)assert(!collides(l.x,l.z,world.colliders),l.id);});
test('substepped motion blocks tunnelling, permits wall sliding and keeps map boundary',()=>{const p={x:5,z:85};move(p,20,-5,world.colliders);assert(p.x<6.1);assert(p.z<81);assert(!collides(p.x,p.z,world.colliders));const b={x:90,z:90};move(b,100,100,world.colliders);assert(b.x<98&&b.z<97);});
test('every objective and supply is reachable from the actual spawn',()=>{for(const l of LOOT)assert(findPath(initialState().player,l),`unreachable: ${l.id}`);});
test('complete mission by walking collision-safe paths, collecting and returning',()=>{
 const s=initialState();s.enemies.forEach(e=>e.hp=0);s.shelter.workbench=true;s.inventory.scrap=1;s.inventory.wire=1;s.time=195;s.outpost={repaired:true,waterOnline:true,waterRemaining:2,waterTaken:1}; // Route/assembly fixture; production and combat have separate tests.
 for(const goal of [...LANDMARKS,{x:72,z:-22}]){
  const path=findPath(s.player,goal);assert(path);
  for(const p of path){const dx=p.x-s.player.x,dz=p.z-s.player.z;move(s.player,dx,dz,world.colliders);assert(!collides(s.player.x,s.player.z,world.colliders));}
  interact(s,world.colliders);
 }
 assert.equal(s.parts.length,3);assert.equal(s.mode,'won');
});
test('interaction cannot collect behind a solid wall or duplicate loot',()=>{const s=initialState();s.player={x:42,z:25,yaw:0,pitch:0};assert.equal(interact(s,world.colliders),'');s.player={x:51,z:25,yaw:0,pitch:0};interact(s,world.colliders);interact(s,world.colliders);assert.equal(s.parts.length,1);});
test('sprint spends stamina, pause/death states do not simulate',()=>{const s=initialState();seconds(s,3,{forward:1,sprint:true});assert(s.stamina<60);assert(s.player.z<63);s.mode='dead';const raw=serialize(s);seconds(s,4,{forward:1});assert.equal(serialize(s),raw);});
test('food, water, medicine and filter spend finite inventory',()=>{const s=initialState();s.hp=30;s.hunger=20;s.thirst=20;s.filter=0;for(const k of ['food','water','med','filter'])consume(s,k);assert.equal(s.hp,75);assert.equal(s.hunger,65);assert.equal(s.thirst,70);assert.equal(s.filter,100);consume(s,'med');assert.equal(s.hp,75);assert.equal(s.inventory.med,0);});
test('radiation consumes filters and shelter clears dose while wounds persist',()=>{const s=initialState();s.enemies.forEach(e=>e.hp=0);s.player.x=34;s.player.z=-60;assert(danger(s)>2);seconds(s,15);assert(s.filter<70&&s.radiation>10);s.player.x=0;s.player.z=83;s.hp=50;s.shelter.workbench=true;s.shelter.purifier=true;seconds(s,30);assert(s.hp>0&&s.hp<=50);assert.equal(s.radiation,0);const wound=s.hp;seconds(s,30);assert.equal(s.hp,wound);});
test('starvation, thirst and dose can cause a real losing state',()=>{const s=initialState();s.player.z=65;s.hp=3;s.hunger=s.thirst=0;s.radiation=90;s.enemies.forEach(e=>e.hp=0);seconds(s,5);assert.equal(s.hp,0);assert.equal(s.mode,'dead');});
test('enemy pursues, hurts outside shelter and cannot attack through walls',()=>{const s=initialState();s.player.x=-60;s.player.z=4;const e=s.enemies[0],before=e.z;seconds(s,2);assert(e.z>before);assert(s.hp<100);s.player.x=0;s.player.z=84;const hp=s.hp;seconds(s,4);assert(s.hp>=hp);});
test('weapon consumes ammunition, respects cooldown, kills in two aimed hits',()=>{const s=initialState();s.player={x:0,z:65,yaw:0,pitch:0};s.enemies[0]={id:0,x:0,z:60,hp:2,cool:0,homeX:0,homeZ:60};const ammo=s.inventory.ammo;assert(attack(s,world.colliders).hit);assert(!attack(s,world.colliders).fired);s.shotCool=0;assert(attack(s,world.colliders).hit);assert.equal(s.enemies[0].hp,0);assert.equal(s.kills,1);assert.equal(s.inventory.ammo,ammo-2);assert(!lineClear({x:41,z:25},{x:51,z:25},world.colliders));});
test('save restores position, supplies, enemies, mission, time and weather; rejects corrupt data',()=>{const s=initialState();s.time=111;s.inventory.ammo=2;s.hp=63;s.player.z=75;s.collected=['cell'];s.parts=['cell'];s.enemies[1].hp=0;assert.deepEqual(restore(serialize(s),world.colliders),s);for(const raw of ['no json','{}',JSON.stringify({...s,hp:-2}),JSON.stringify({...s,version:9}),JSON.stringify({...s,parts:['cell','cell']})])assert.equal(restore(raw,world.colliders),null);});
