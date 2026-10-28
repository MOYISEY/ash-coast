import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {g,world,position,base,collect,advance,saved,preparation,repairReady,repaired,finalReady,phaseFixtures,assertFinite} from '../fixtures.mjs';
import {output} from '../config.mjs';
const records=[];
function scenario(name,fn){test(name,()=>{try{const evidence=fn();records.push({name,status:'PASS',evidence});}catch(e){records.push({name,status:'FAIL',error:e.stack});throw e;}});}
for(const [id,phase] of [['clear','clear'],['warning','warning'],['activeOutside','active'],['activeRoof','active'],['settled','settled']]){
 scenario('save/restore and identical continuation in '+id,()=>{
  const s=phaseFixtures()[id];assert.equal(g.stormStatus(s).phase,phase);const copy=saved(s).state;
  advance(s,8);advance(copy,8);assert.deepEqual(copy,s);assertFinite(s);saved(s);
  return {phase,continuedTime:s.time,storm:s.storm,covered:g.stormStatus(s).covered};
 });
}
scenario('repair/craft failures are atomic; unique kit and repeated repair remain one-time after reload',()=>{
 let s=preparation(false);const before=g.serialize(s);assert(!g.produce(s,'outpostKit').ok);assert.equal(g.serialize(s),before);
 position(s,75,-17);const noKit=g.serialize(s);g.interact(s,world.colliders);assert.equal(g.serialize(s),noKit);
 collect(s,'relay-crate');base(s);assert(g.produce(s,'outpostKit').ok);const once=g.serialize(s);assert(!g.produce(s,'outpostKit').ok);assert.equal(g.serialize(s),once);s=saved(s).state;
 position(s,75,-17);g.interact(s,world.colliders);assert(s.outpost.repaired);assert.equal(s.inventory.outpostKit,0);s=saved(s).state;const done=g.serialize(s);for(let i=0;i<20;i++)g.interact(s,world.colliders);assert.equal(g.serialize(s),done);
 return {repaired:s.outpost.repaired,kit:s.inventory.outpostKit,materials:s.inventory};
});
scenario('finite water: full pack, three portions, restore after each draw, empty repeats never refill',()=>{
 let s=repaired();for(const id of ['cache2','cache6'])collect(s,id);assert.equal(s.inventory.water,3);position(s,g.OUTPOST.pump.x,g.OUTPOST.pump.z);g.interact(s,world.colliders);
 const full=g.serialize(s);g.interact(s,world.colliders);assert.equal(g.serialize(s),full);const draws=[];
 for(let i=0;i<3;i++){if(s.thirst>=100){position(s,83,43);advance(s,1);position(s,g.OUTPOST.pump.x,g.OUTPOST.pump.z);}g.consume(s,'water');g.interact(s,world.colliders);s=saved(s).state;assert.equal(s.outpost.waterTaken,i+1);assert.equal(s.outpost.waterRemaining,2-i);assertFinite(s);draws.push({...s.outpost});}
 g.consume(s,'water');const empty=g.serialize(s);for(let i=0;i<100;i++)g.interact(s,world.colliders);assert.equal(g.serialize(s),empty);
 return {draws,final:s.outpost};
});
scenario('final missing wiring/phase/part never spends; won reload and repeated interaction are stable',()=>{
 let s=finalReady(false);assert.equal(s.inventory.wire,0);const noWire=g.serialize(s);g.interact(s,world.colliders);assert.equal(g.serialize(s),noWire);
 s=finalReady();s.time=190;const beforeStorm=g.serialize(s);g.interact(s,world.colliders);assert.equal(g.serialize(s),beforeStorm);s.time=200;
 const incomplete=structuredClone(s);incomplete.parts.pop();incomplete.collected=incomplete.collected.filter(id=>id!=='module');const noPart=g.serialize(incomplete);g.interact(incomplete,world.colliders);assert.equal(g.serialize(incomplete),noPart);
 const wire=s.inventory.wire,metal=s.inventory.scrap;g.interact(s,world.colliders);assert.equal(s.mode,'won');assert.equal(s.inventory.wire,wire-1);assert.equal(s.inventory.scrap,metal-1);s=saved(s).state;const won=g.serialize(s);for(let i=0;i<20;i++)g.interact(s,world.colliders);advance(s,20);assert.equal(g.serialize(s),won);
 return {mode:s.mode,parts:s.parts,wireSpent:1,metalSpent:1};
});
scenario('complete rule transaction chain survives a checkpoint at every transition',()=>{
 let s=preparation();const checkpoints=[];function mark(name){s=saved(s).state;checkpoints.push({name,time:s.time,mode:s.mode,post:{...s.outpost}});assertFinite(s);}
 mark('bench');assert(g.produce(s,'outpostKit').ok);mark('kit');base(s);advance(s,105);mark('warning');advance(s,35);mark('active');position(s,75,-17);g.interact(s,world.colliders);mark('repair');position(s,g.OUTPOST.pump.x,g.OUTPOST.pump.z);g.interact(s,world.colliders);mark('pump');g.interact(s,world.colliders);mark('water');advance(s,60);mark('settled');
 for(const id of g.PARTS)collect(s,id);collect(s,'pump-crate');position(s,73,-21);g.interact(s,world.colliders);assert.equal(s.mode,'won');mark('final');return {scope:'pure core integration with explicit positions; not gameplay',checkpoints};
});
after(async()=>output('integration-rules.json',{scope:'deterministic state-transition integration; explicit test positions; not real gameplay',success:records.every(r=>r.status==='PASS'),records}));
