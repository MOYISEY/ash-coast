import assert from 'node:assert/strict';
import {STORM,stormStatus} from '../src/expedition.js';
export const HUD_CASES=[
 {id:'clear',time:STORM.warningAt-5,x:75,z:-8,phase:'clear'},
 {id:'warning',time:STORM.warningAt+10,x:75,z:-8,phase:'warning'},
 {id:'active',time:STORM.startsAt+15,x:75,z:-8,phase:'active'},
 {id:'covered',time:STORM.startsAt+15,x:75,z:-12,repaired:true,phase:'active'},
 {id:'quarter',time:STORM.endsAt+10,x:-50,z:-15,phase:'settled'}
];
export function assertHudFixture(s,c){const actual=stormStatus(s);assert.equal(actual.phase,c.phase,c.id+' actual storm phase');return actual;}
