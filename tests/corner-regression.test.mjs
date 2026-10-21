import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/core.js';
// Corner regression fixtures: both endpoints are outside solid geometry.
const fixtures=[
 {name:'ruined block south wall',a:{x:-65.89752113912255,z:11.11813715659082},b:{x:-52.42422602483415,z:33.978130740307506}},
 {name:'shipping container',a:{x:72.7087859949097,z:-65.49958781339228},b:{x:50.952722631131124,z:-48.60821748031947}},
 {name:'pump north wall',a:{x:47.170082735829055,z:4.458090970292687},b:{x:37.47278475638699,z:27.60717010333945}}
];
const {colliders}=g.makeWorld();
for(const f of fixtures)test('wall corner blocks shot: '+f.name,()=>{
 const s=g.initialState();s.enemies.forEach(e=>e.hp=0);
 s.player={...f.a,yaw:Math.atan2(-(f.b.x-f.a.x),-(f.b.z-f.a.z)),pitch:0};
 s.enemies[0]={id:0,...f.b,hp:2,cool:0,homeX:f.b.x,homeZ:f.b.z};
 assert(!g.collides(f.a.x,f.a.z,colliders));assert(!g.collides(f.b.x,f.b.z,colliders,.6));
 const result=g.attack(s,colliders);assert.equal(result.hit,false,'shot intersects a real solid corner');
});
