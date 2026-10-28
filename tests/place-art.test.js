import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import fs from 'node:fs';
import {makePlaceArt} from '../src/place-art.js';
import * as g from '../src/core.js';
const world=g.makeWorld();
function art(){
 const context={fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 try{const mats=Object.fromEntries(['metal','rust','dark','wood','teal'].map(n=>[n,new T.MeshStandardMaterial()]));return makePlaceArt(new T.Scene(),mats);}finally{globalThis.document=previous;}
}
test('place art reads finite water and existing discovery, without changing saved state',()=>{
 const a=art(),s=g.initialState();s.shelter.workbench=true;s.outpost.repaired=true;s.outpost.waterOnline=true;
 for(let n=0;n<=3;n++){s.outpost.waterRemaining=n;s.outpost.waterTaken=3-n;const raw=g.serialize(s);a.update(s);assert.equal(g.serialize(s),raw);assert.equal(a.levels.filter(m=>m.material.color.getHexString()==='b6ead5').length,n);assert(a.workSignal.visible);}
 s.collected.push('ruins-crate');a.update(s);assert.equal(a.workSignal.visible,false);s.outpost.repaired=false;s.outpost.waterOnline=false;a.update(s);assert.equal(a.beacon.material.color.getHexString(),'334d48');assert(a.levels.every(m=>m.material.color.getHexString()==='334d48'));
});
test('low solid additions fit existing masonry or the existing tiny pump fixture; entrance ground remains clear',()=>{
 const a=art();a.group.updateMatrixWorld(true);let checked=0;
 for(const m of a.group.children){if(m.userData.flatWall)continue;const b=new T.Box3().setFromObject(m);if(b.min.y>=1.9)continue;checked++;
  const masonry=world.colliders.some(c=>b.min.x>=c.x-c.w/2-.16&&b.max.x<=c.x+c.w/2+.16&&b.min.z>=c.z-c.d/2-.16&&b.max.z<=c.z+c.d/2+.16);
  const pump=m.name.startsWith('water-gauge')&&b.min.x>=78.5&&b.max.x<=79.5&&b.min.z>=-23.65&&b.max.z<=-22.45;
  assert(masonry||pump,m.name+' must not create a solid silhouette in the walkable floor');
 }
 assert(checked>=10);for(const [x,z]of[[-50,-10],[-50,-13],[-49,-14],[75,-10],[75,-13],[79,-22]])assert(!g.collides(x,z,world.colliders));
});
test('old v3 progress including optional metadata stays byte-identical under all new art updates',()=>{
 const a=art();for(const file of ['save-v3-0.3.2-won.json','save-v3-0.4.0-won.json']){
  const p=new URL('./fixtures/'+file,import.meta.url);if(!fs.existsSync(p))continue;
  const raw=fs.readFileSync(p,'utf8'),s=g.restore(raw,world.colliders);assert(s);s.saveMeta={format:1,revision:42,writer:'synthetic-profile'};const before=JSON.stringify(s);for(let i=0;i<20;i++)a.update(s);assert.equal(JSON.stringify(s),before);
 }
});
