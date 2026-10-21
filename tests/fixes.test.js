import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,makeWorld,lineClear,tick} from '../src/core.js';

test('segment/AABB clipping blocks corners and tangencies in both directions',()=>{
 const walls=[{x:0,z:0,w:2,d:2}];
 for(const [a,b,clear] of [
  [{x:-2,z:1.8},{x:.2,z:.9},false],
  [{x:-2,z:1},{x:2,z:1},false],
  [{x:-2,z:1.01},{x:2,z:1.01},true],
  [{x:1.01,z:-2},{x:1.01,z:2},true],
  [{x:-2,z:0},{x:2,z:0},false],
  [{x:2,z:2},{x:2,z:2},true],
  [{x:0,z:0},{x:0,z:0},false]
 ]){assert.equal(lineClear(a,b,walls),clear);assert.equal(lineClear(b,a,walls),clear);}
});

test('twenty seconds pressing against a wall records only the actual six metres',()=>{
 const s=initialState(),start={...s.player},{colliders}=makeWorld();
 for(let i=0;i<400;i++)tick(s,{side:1,sprint:true},.05,colliders);
 const travelled=Math.hypot(s.player.x-start.x,s.player.z-start.z);
 assert(travelled>5.8&&travelled<6.1);assert(Math.abs(s.steps-travelled)<1e-9);
 const stopped=s.steps;for(let i=0;i<100;i++)tick(s,{side:1},.05,colliders);
 assert.equal(s.steps,stopped,'distance and footstep animation stay stopped at the wall');
});

test('unobstructed diagonal movement records normalized actual distance',()=>{
 const s=initialState();s.player.x=0;s.player.z=60;const start={...s.player};
 for(let i=0;i<20;i++)tick(s,{forward:1,side:1},.05,[]);
 assert(Math.abs(s.steps-4.2)<1e-9);
 assert(Math.abs(s.steps-Math.hypot(s.player.x-start.x,s.player.z-start.z))<1e-9);
});
