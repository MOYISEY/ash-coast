import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,STORM,stormStatus} from '../../src/core.js';
import {HUD_CASES,assertHudFixture} from '../hud-cases.mjs';
test('HUD warning fixture uses actual warning interval; 90 seconds is explicitly clear',()=>{
 const s=initialState();s.time=90;assert.equal(stormStatus(s).phase,'clear');
 const c=HUD_CASES.find(x=>x.id==='warning');assert(c.time>=STORM.warningAt&&c.time<STORM.startsAt);s.time=c.time;assert.equal(assertHudFixture(s,c).remaining,STORM.startsAt-c.time);
 s.time=90;assert.throws(()=>assertHudFixture(s,c),/actual storm phase/);
});
test('all HUD phase labels and coverage match the production storm state',()=>{
 for(const c of HUD_CASES){const s=initialState();s.time=c.time;s.player={x:c.x,z:c.z,yaw:0,pitch:0};s.outpost.repaired=!!c.repaired;const phase=assertHudFixture(s,c);assert.equal(phase.covered,!!c.repaired);}
});
