import test from 'node:test';
import assert from 'node:assert/strict';
import * as g from '../src/core.js';
import * as old from './reference-0.3.1/core.js';
import {EXPLORATION,explorationAt,explorationCaption,SUPPLY_TRAIL} from '../src/exploration.js';
const w=g.makeWorld();
test('all authored discoveries reward existing finite loot without new save fields',()=>{
 const s=g.initialState();assert.equal(EXPLORATION.length,3);
 for(const p of EXPLORATION){const l=g.LOOT.find(l=>l.id===p.lootId);assert(l);assert(Math.hypot(p.x-l.x,p.z-l.z)<p.r);assert(!g.collides(l.x,l.z,g.activeColliders(s,w.colliders)));s.player={x:l.x,z:l.z,yaw:0,pitch:0};assert.equal(explorationAt(s).id,p.id);assert.equal(explorationCaption(s),p.clue);const before=structuredClone(s.inventory);for(let i=0;i<4&&!s.collected.includes(l.id);i++)g.interact(s,w.colliders);assert(s.collected.includes(l.id));assert.equal(explorationCaption(s),p.found);const after=g.serialize(s);g.interact(s,w.colliders);assert.equal(g.serialize(s),after);assert(s.inventory.ammo>=before.ammo);}
});
test('0.3.2-equivalent v3 progress and wounds roundtrip exactly and captions do not mutate it',()=>{
 const s=old.initialState();s.hp=50;s.player={x:61,z:54,yaw:0,pitch:0};old.interact(s,w.colliders);s.time=30;const raw=old.serialize(s);const restored=g.restore(raw,w.colliders);assert(restored);assert.equal(g.serialize(restored),raw);const before=g.serialize(restored);for(let i=0;i<100;i++){explorationAt(restored);explorationCaption(restored);}assert.equal(g.serialize(restored),before);assert.match(explorationCaption(restored),/взят/);g.tick(restored,{},.05,w.colliders);assert.equal(restored.hp,50);
});
test('a new and a collected discovery keep the same old reward and remain valid on reload',()=>{
 const s=g.initialState();s.player={x:61,z:54,yaw:0,pitch:0};const ammo=s.inventory.ammo;assert.equal(g.nearest(s,w.colliders).id,'cache8');g.interact(s,w.colliders);assert.equal(s.inventory.ammo,ammo+4);assert(g.restore(g.serialize(s),w.colliders));for(let i=0;i<100;i++)g.interact(s,w.colliders);assert.equal(s.inventory.ammo,ammo+4);assert.equal(s.inventory.med,1);
});
test('supply trail is on reachable ground, ending near the existing cache',()=>{
 const goal=g.LOOT.find(l=>l.id==='cache8');for(const [i,[x,z]]of SUPPLY_TRAIL.entries()){assert(!g.collides(x,z,w.colliders),'trail '+x+','+z);if(i){const a=SUPPLY_TRAIL[i-1];const p={x:a[0],z:a[1]};g.move(p,x-p.x,z-p.z,w.colliders);assert(Math.hypot(p.x-x,p.z-z)<1e-8,'trail segment '+i+' avoids walls');}}assert(Math.hypot(SUPPLY_TRAIL.at(-1)[0]-goal.x,SUPPLY_TRAIL.at(-1)[1]-goal.z)<3.2);
});
test('P3: repaired post coverage/name wins over the overlapping quay discovery; outside clues/rewards still work',()=>{
 const s=g.initialState();s.shelter.workbench=true;s.outpost.repaired=true;s.player={x:76,z:-12,yaw:0,pitch:0};s.time=150;assert(!g.collides(s.player.x,s.player.z,w.colliders));assert(g.inShelter(s));assert(g.stormStatus(s).covered);const before=g.serialize(s);assert.equal(explorationAt(s),null);assert.equal(explorationCaption(s),'');assert.equal(g.serialize(s),before);
 s.player={x:81,z:-5,yaw:0,pitch:0};assert(!g.inShelter(s));assert(!g.stormStatus(s).covered);assert.equal(explorationAt(s).id,'shore-signal');assert.match(explorationCaption(s),/Лодка/);g.interact(s,w.colliders);assert.match(explorationCaption(s),/запас взят/);assert(g.restore(g.serialize(s),w.colliders));
});
