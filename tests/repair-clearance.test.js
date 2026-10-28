import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makePlaceArt} from '../src/place-art.js';
import {decorateWorld} from '../src/details.js';
import {makeWorld} from '../src/core.js';

function scene(){
 const context={fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}};}};
 const before=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 try{const s=new T.Scene(),world=makeWorld(),mats=Object.fromEntries(['metal','rust','dark','wood','teal','rubble','brick','pale','line','hazard','gate','grass'].map(n=>[n,new T.MeshStandardMaterial()]));
  decorateWorld(s,world,mats,{shadowMap:{needsUpdate:false}});const a=makePlaceArt(s,mats);s.updateMatrixWorld(true);return {s,a,world};
 }finally{globalThis.document=before;}
}
test('actual boarded-window meshes do not cut in front of the repair diagram from entry/room/close views',()=>{
 const {s,a}=scene(),board=a.group.children.find(m=>m.userData.flatWall&&m.position.x===-55&&m.position.y===3.15);assert(board);
 for(const eye of [[-50,1.72,-6],[-50,1.72,-15],[-52,1.72,-17]])for(const [x,y]of[[-55.5,2.7],[-55,2.843],[-55.7,2.64]]){
  const from=new T.Vector3(...eye),to=new T.Vector3(x,y,board.position.z),direction=to.clone().sub(from),ray=new T.Raycaster(from,direction.clone().normalize(),0,direction.length()+.02);
  const hits=ray.intersectObject(s,true);assert(hits.length);assert(hits[0].object===board,'wood crosses diagram toward '+[x,y]+' from '+eye+'; hit '+hits[0].object.type);
 }
});
test('doorway has no detached added lintel and retains the original supported entrance frame',()=>{
 const {s,a,world}=scene();
 for(const m of a.group.children){if(m.geometry.type!=='BoxGeometry')continue;const b=new T.Box3().setFromObject(m);if(b.max.x-b.min.x<6||Math.abs(m.position.z+10.7)>.3)continue;
  for(const x of [b.min.x+.05,b.max.x-.05])assert(world.boxes.some(w=>w.solid&&x>=w.x-w.w/2&&x<=w.x+w.w/2&&Math.abs(m.position.z-w.z)<=w.d/2+.2&&b.min.y<=w.y+w.h+.15),'added beam end is suspended');
 }
 let originalFrame=false;const matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
 s.traverse(m=>{if(!m.isInstancedMesh)return;for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);if(Math.abs(p.x+50)<.01&&Math.abs(p.y-4.1)<.01&&Math.abs(p.z+10)<.01&&Math.abs(scale.x-6.3)<.01)originalFrame=true;}});
 assert(originalFrame,'existing supported frame must remain');
});
