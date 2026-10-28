import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {makeCollectibles} from '../src/details.js';
import * as g from '../src/core.js';
test('antenna has its real model/ring but no billboard at any camera or UI scale; other part labels remain',()=>{
 const original=globalThis.document;globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},fillText(){}};}};}};
 try{const scene=new T.Scene(),mat=new T.MeshBasicMaterial(),mats=new Proxy({},{get:()=>mat});const {labels,lootMeshes}=makeCollectibles(scene,mats);assert.deepEqual(labels.map(l=>l.id),['cell','module']);const antenna=lootMeshes.get('antenna');assert(antenna);assert(antenna.children.filter(m=>m.geometry?.type==='CylinderGeometry').length>=4);assert(antenna.children.some(m=>m.geometry?.type==='TorusGeometry'));assert.equal(antenna.position.x,-49);assert.equal(antenna.position.z,-17);assert.equal(scene.children.filter(o=>o.isSprite).length,2);
 }finally{globalThis.document=original;}
});
test('nearby interaction still names the antenna, grants exactly one part, and roundtrips v3',()=>{
 const s=g.initialState(),w=g.makeWorld();s.player={x:-49,z:-14.2,yaw:0,pitch:0};const n=g.nearest(s,w.colliders);assert.equal(n.id,'antenna');assert.equal(n.name,'Антенна');g.interact(s,w.colliders);assert.deepEqual(s.parts,['antenna']);for(let i=0;i<10;i++)g.interact(s,w.colliders);assert.deepEqual(s.parts,['antenna']);assert.deepEqual(g.restore(g.serialize(s),w.colliders),s);
});
test('actual 0.4.0 v3 win snapshot restores exactly after the render-only label fix',()=>{
 const s=JSON.parse(fs.readFileSync(new URL('./fixtures/save-v3-0.4.0-won.json',import.meta.url),'utf8'));assert.deepEqual(g.restore(JSON.stringify(s),g.makeWorld().colliders),s);
});
