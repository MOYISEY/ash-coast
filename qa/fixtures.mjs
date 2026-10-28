import assert from 'node:assert/strict';
import * as g from '../src/core.js';
export {g};
export const world=g.makeWorld();
export function position(s,x,z){s.player={x,z,yaw:0,pitch:0};}
export function collect(s,id){const l=g.LOOT.find(x=>x.id===id);assert(l,id);position(s,l.x,l.z);for(let i=0;i<4&&!s.collected.includes(id);i++)g.interact(s,world.colliders);assert(s.collected.includes(id),'collect '+id);}
export function base(s){position(s,0,83);}
export function advance(s,seconds,input={}){for(let t=0;t<seconds;t+=.02)g.tick(s,input,Math.min(.02,seconds-t),world.colliders);}
export function saved(s){const raw=g.serialize(s),loaded=g.restore(raw,world.colliders);assert(loaded,'restorable checkpoint');assert.deepEqual(loaded,s);return {raw,state:loaded};}
export function preparation(includeRelay=true){
 const s=g.initialState();for(const id of ['shore-crate','garage-crate'])collect(s,id);if(includeRelay)collect(s,'relay-crate');
 base(s);assert(g.produce(s,'workbench',true).ok);return s;
}
export function repairReady(){const s=preparation();assert(g.produce(s,'outpostKit').ok);position(s,75,-17);return s;}
export function repaired(){const s=repairReady();g.interact(s,world.colliders);assert(s.outpost.repaired);return s;}
export function finalReady(wiring=true,time=200){
 // Reachable sparse-loot state: one wire was spent on the kit, so a later
 // pump crate is still needed for the final link. No direct inventory grants.
 const s=g.initialState();for(const id of ['shore-crate','garage-crate','ruins-crate'])collect(s,id);base(s);assert(g.produce(s,'workbench',true).ok);assert(g.produce(s,'outpostKit').ok);
 advance(s,time);position(s,75,-17);g.interact(s,world.colliders);position(s,g.OUTPOST.pump.x,g.OUTPOST.pump.z);g.interact(s,world.colliders);g.interact(s,world.colliders);
 for(const id of g.PARTS)collect(s,id);if(wiring)collect(s,'pump-crate');position(s,73,-21);return s;
}
export function phaseFixtures(){
 const a=preparation();base(a);
 const clear=structuredClone(a);advance(clear,50);
 const warning=structuredClone(a);advance(warning,105);
 const activeOutside=structuredClone(a);advance(activeOutside,150);position(activeOutside,83,43);
 const activeRoof=repaired();base(activeRoof);advance(activeRoof,150);position(activeRoof,75,-17);
 const settled=structuredClone(a);advance(settled,200);
 return {clear,warning,activeOutside,activeRoof,settled};
}
export function assertFinite(s){for(const n of Object.values(s.inventory))assert(Number.isInteger(n)&&n>=0);assert(s.outpost.waterRemaining>=0&&s.outpost.waterTaken<=3);}
