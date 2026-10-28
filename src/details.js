import * as T from 'three';
import {LOOT,rng} from './core.js';
import {geometryBatches,makeSea} from './art.js';

export function decorateWorld(scene,world,mats,renderer){
 mats.window=new T.MeshStandardMaterial({color:'#172b32',roughness:.4,metalness:.3});mats.lamp=new T.MeshBasicMaterial({color:'#ffcc86'});mats.blueLamp=new T.MeshBasicMaterial({color:'#b8e1db'});
 const {box,cylinder,rock,flush}=geometryBatches(scene,mats),r=rng(927),temp=new T.Object3D();
 // Boarded facade openings and balcony ledges supply scale without walkable fake doors.
 for(const b of world.boxes){
  if(b.color==='rubble'){rock(b.x,b.h*.45,b.z,b.w,b.h,b.d,'rubble',r()*2);continue;}
  if(!b.solid||!['concrete','apartment'].includes(b.color)||b.h<4)continue;
  const horizontal=b.w>b.d,len=horizontal?b.w:b.d;
  for(let y=2.7;y<b.h-1;y+=3.3)for(let a=-len/2+2;a<len/2-1;a+=3.2){
   const x=horizontal?b.x+a:b.x+b.w/2+.025,z=horizontal?b.z+b.d/2+.025:b.z+a;
   box(x,y,z,horizontal?1.35:.08,1.55,horizontal?.08:1.35,'window');box(x,y+.9,z,horizontal?1.65:.16,.14,horizontal?.16:1.65,'pale');
   box(x,y,z,horizontal?1.55:.11,.13,horizontal?.11:1.55,'wood',horizontal?.28:0,horizontal?0:.18);
  }
 }
 for(let y=4;y<18;y+=3.3){box(-84,y,16.1,10,.18,1.2,'dark');box(-84,y+.65,16.65,10,.1,.1,'metal');for(let x=-88;x<=-80;x+=2)box(x,y+.35,16.65,.08,.6,.08,'metal');}
 for(const [x,z] of [[-50,-18],[-64,12],[-28,20],[-65,-44],[56,58],[75,-18]]){
  box(x,.016,z,13,.025,13,'road');
  for(let j=0;j<8;j++)rock(x+(j%2?-5.5:5.5),.2,z-6+r()*9,.7+r(),.45,.6,'brick',r()*3);
 }
 for(const b of world.boxes.filter(b=>b.color==='rust'&&b.h===1.7)){
  for(const x of [-2,2])for(const z of [-1.4,1.4])cylinder(b.x+x,.5,b.z+z,.48,.22,'dark',Math.PI/2);
  box(b.x-.4,2.2,b.z+1.27,2.5,.48,.05,'window');box(b.x-2.4,1.1,b.z+1.43,.5,.23,.04,'pale');
 }
 // Iconic water tower over the pump's existing solid piers.
 cylinder(68,11.7,25,4.3,4,'teal');cylinder(68,9.7,25,4.5,.3,'metal');cylinder(68,13.8,25,4.6,.4,'pale');
 for(let y=10.2;y<13.8;y+=1.1)cylinder(68,y,25,4.35,.07,'metal');
 cylinder(62,4.2,25,.24,12,'teal',0,Math.PI/2);cylinder(68,6.8,25,.24,5.2,'teal');
 for(let y=1;y<10;y+=.6)box(72.7,y,25,.8,.06,.1,'metal');for(const z of [24.6,25.4])box(72.7,5,z,.06,10,.06,'metal');
 for(const z of [-70,-60,-48]){box(34,7.6,z,25,.25,.25,'metal');for(const x of [25,31,37,43])box(x,8.6,z,6,.13,.18,'rust',x<34?.35:-.35);}
 for(const x of [25,43]){cylinder(x,2.8,-66,1,.7,'metal');cylinder(x,3.2,-66,.12,.5,'rust');box(x,3.5,-66,1.2,.08,.12,'hazard');}
 for(const [x,z,h] of [[75,-84,30],[83,-83,23]]){cylinder(x,h/2,z,1.8,h,'rust');for(let y=h*.5;y<h;y+=4)cylinder(x,y,z,1.83,1.6,'pale');cylinder(x,h+.1,z,2,.3,'dark');}
 for(let z=-95;z<105;z+=13){for(let zz=z-5;zz<z+6;zz+=3)box(98.3,1.1,zz,.08,1.2,.08,'metal');box(98.3,1.6,z,.08,.08,11,'metal');}
 for(let i=0;i<10;i++)rock(-160+Math.sin(i)*15,3,-170+i*32,65,25+r()*26,65,'dark',i);
 function entrance(x,z,w,mat){
  for(const side of [-1,1])box(x+side*w/2,2.1,z,.18,4.2,.2,mat);box(x,4.1,z,w+.3,.25,.25,mat);box(x,3.7,z+.15,.8,.15,.15,mat==='teal'?'blueLamp':'lamp');
  box(x,.055,z+2.5,.12,.02,2,'line');box(x-.3,.06,z+1.8,.12,.02,.8,'line',0,-.7);box(x+.3,.06,z+1.8,.12,.02,.8,'line',0,.7);
 }
 entrance(-50,-10,6,'rust');entrance(51,34.2,7,'teal');entrance(34,-45.4,11,'hazard');
 for(const z of [-59,-53])box(46.6,2.5,z,.3,5,.3,'hazard');box(46.6,5,-56,.3,.35,6.5,'hazard');
 box(4.7,1.15,86.6,2.2,.17,1.5,'dark');box(5.5,2.2,87.1,.12,2,.12,'metal');box(4.8,3.1,87.1,1.5,.12,.15,'lamp');
 flush();
 const gate=new T.Mesh(new T.BoxGeometry(.8,5,6),mats.gate);gate.position.set(46,2.5,-56);gate.castShadow=true;gate.receiveShadow=true;scene.add(gate);
 const workbench=new T.Group(),purifier=new T.Group();
 const piece=(group,w,h,d,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mats[mat]);m.position.set(x,y,z);group.add(m);return m;};
 piece(workbench,.5,.35,.4,4.6,1.45,86.5,'teal');piece(workbench,.08,.55,.08,4.35,1.65,86.45,'metal');piece(workbench,.8,.06,.14,4.3,1.3,86.2,'rust');
 piece(purifier,1.5,2,.8,-5.2,1.1,87,'teal');for(let y=.5;y<1.8;y+=.2)piece(purifier,1.2,.05,.05,-5.2,y,86.57,'dark');piece(purifier,.17,.08,.04,-4.7,1.9,86.55,'blueLamp');scene.add(workbench,purifier);
 function sign(text,x,y,z,w,color='#e7d7ad',ry=0){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#203637';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=4;g.strokeRect(8,8,496,112);g.fillStyle=color;g.font='bold 36px Arial';g.textAlign='center';g.fillText(text,256,78);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);
 }
 sign('02',68,12,29.34,4,'#b9dedb');sign('04',-84,16,15.56,6);sign('СЕРВИС · НУЖЕН ПРИВОД',46.8,3.8,-56,5,'#c0d5ca',Math.PI/2);sign('ВЕРСТАК · B',4.4,2.4,87.2,3.2);sign('ВОРОНКА · БОГАТЫЙ ЗАПАС',-31,2,-32,6,'#e1b56a');
 // Contact darkening is cheap and remains visible on low.
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gradient=g.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'#0009');gradient.addColorStop(1,'#0000');g.fillStyle=gradient;g.fillRect(0,0,64,64);
 const footprints=world.boxes.filter(b=>b.solid&&b.h>1),contact=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,opacity:.4,depthWrite:false}),footprints.length);
 footprints.forEach((b,i)=>{temp.position.set(b.x,.025,b.z);temp.rotation.set(-Math.PI/2,0,0);temp.scale.set(b.w+3,b.d+3,1);temp.updateMatrix();contact.setMatrixAt(i,temp.matrix);});scene.add(contact);
 const puddles=new T.InstancedMesh(new T.CircleGeometry(1,20),new T.MeshStandardMaterial({color:'#526968',roughness:.18,metalness:.45,transparent:true,opacity:.45,depthWrite:false}),5);
 [[-2,54,1.1,2.4],[3,10,.8,1.8],[-39,-7,1,2.6],[53,4,1.2,2],[22,43,2.6,1]].forEach(([x,z,w,d],i)=>{temp.position.set(x,.045,z);temp.rotation.set(-Math.PI/2,0,.3);temp.scale.set(w,d,1);temp.updateMatrix();puddles.setMatrixAt(i,temp.matrix);});scene.add(puddles);
 const vertices=[];for(let i=0;i<3;i++){
  const a=i*Math.PI/3,dx=Math.cos(a)*.11,dz=Math.sin(a)*.11,h=.63+i*.04,bx=Math.sin(a)*.08,bz=Math.cos(a)*.08;
  const p=[[-dx,0,-dz],[dx,0,dz],[-dx*.45+bx,h*.55,-dz*.45+bz],[dx*.45+bx,h*.55,dz*.45+bz],[bx*2,h,bz*2]];
  for(const index of [0,1,2,1,3,2,2,3,4])vertices.push(...p[index]);
 }
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));grassGeo.computeVertexNormals();const grassMat=new T.MeshStandardMaterial({color:'#686f59',roughness:1,side:T.DoubleSide});let grassShader;
 grassMat.onBeforeCompile=shader=>{grassShader=shader;shader.uniforms.windTime={value:0};shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float windTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(windTime+instanceMatrix[3].x*.3+instanceMatrix[3].z*.2)*pow(position.y,2.)*.16;');};
 const tufts=[];for(let i=0;i<3300;i++){const x=(r()-.5)*220,z=(r()-.5)*210;if(x>97||Math.abs(x)<7||Math.abs(z-43)<5||Math.abs(z+35)<5||Math.abs(x-52)<5||Math.abs(x+39)<5||world.colliders.some(b=>Math.abs(b.x-x)<b.w/2+1.3&&Math.abs(b.z-z)<b.d/2+1.3)||Math.hypot(x,z-85)<10)continue;tufts.push({x,z,size:.3+r()*.8,angle:r()*6.28});}
 const grass=new T.InstancedMesh(grassGeo,grassMat,tufts.length);tufts.forEach((b,i)=>{temp.position.set(b.x,0,b.z);temp.rotation.set(0,b.angle,0);temp.scale.setScalar(b.size);temp.updateMatrix();grass.setMatrixAt(i,temp.matrix);});grass.receiveShadow=true;scene.add(grass);
 const sea=makeSea(scene);let elapsed=0,previousFlags='';
 return {
  setQuality(q){grass.count=Math.min(tufts.length,q==='low'?1000:tufts.length);},
  update(s,dt){elapsed+=dt;sea.uniforms.time.value=elapsed;if(grassShader)grassShader.uniforms.windTime.value=elapsed*.8;gate.position.y=s.gateOpened?7.5:2.5;workbench.visible=s.shelter?.workbench||false;purifier.visible=s.shelter?.purifier||false;const flags=[s.gateOpened,s.shelter?.workbench,s.shelter?.purifier].join();if(flags!==previousFlags){renderer.shadowMap.needsUpdate=true;previousFlags=flags;}}
 };
}

function mesh(group,geometry,material,x,y,z,rx=0,rz=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.set(rx,0,rz);m.castShadow=true;group.add(m);return m;}
export function makeCollectibles(scene,mats){
 const lootMeshes=new Map(),labels=[],gold=new T.MeshStandardMaterial({color:'#d6ba79',metalness:.55,roughness:.4}),cyan=new T.MeshStandardMaterial({color:'#609d9b',metalness:.4,roughness:.4});
 for(const l of LOOT){
  const group=new T.Group();group.position.set(l.x,0,l.z);
  if(l.type==='part'){
   mesh(group,new T.BoxGeometry(.9,.38,.65),mats.dark,0,.2,0);
   if(l.id==='antenna'){mesh(group,new T.CylinderGeometry(.045,.06,1.25,8),gold,0,1,0);for(const y of [.7,1,1.3])mesh(group,new T.CylinderGeometry(.025,.025,1.05,6),gold,0,y,0,0,Math.PI/2);}
   else if(l.id==='cell'){mesh(group,new T.CylinderGeometry(.3,.3,.85,12),cyan,0,.82,0);mesh(group,new T.CylinderGeometry(.22,.22,.08,12),mats.blueLamp,0,1.28,0);mesh(group,new T.TorusGeometry(.22,.035,5,12),gold,0,1.45,0);}
   else{mesh(group,new T.BoxGeometry(.8,.6,.4),cyan,0,.77,0);mesh(group,new T.BoxGeometry(.52,.24,.02),mats.blueLamp,0,.83,.21);for(const x of [-.25,0,.25])mesh(group,new T.CylinderGeometry(.05,.05,.08,8),gold,x,.58,.22,Math.PI/2);}
   mesh(group,new T.TorusGeometry(.8,.02,5,32),mats.blueLamp,0,.04,0,Math.PI/2);
   // Antenna keeps its model/ring and nearby [E] prompt; no billboard over the story.
   if(l.id!=='antenna'){
   const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');g.fillStyle='#142c2ce6';g.fillRect(0,0,256,64);g.fillStyle='#e3d2a5';g.font='bold 21px Arial';g.textAlign='center';g.fillText(l.name.toUpperCase(),128,40);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:true}));sprite.position.set(l.x,2.2,l.z);sprite.scale.set(2.8,.7,1);scene.add(sprite);labels.push({id:l.id,sprite,x:l.x,z:l.z});
   }
  }else if(l.type==='materials'){
   mesh(group,new T.BoxGeometry(1.05,.65,.75),mats.wood,0,.35,0);for(const x of [-.4,.4])mesh(group,new T.BoxGeometry(.07,.7,.8),mats.metal,x,.35,0);mesh(group,new T.BoxGeometry(.45,.2,.02),l.id==='hot-crate'?mats.lamp:mats.blueLamp,0,.4,.39);
  }else if(l.type==='water'||l.type==='filter'){
   mesh(group,new T.CylinderGeometry(.17,.22,.6,10),l.type==='water'?cyan:mats.metal,0,.35,0);mesh(group,new T.CylinderGeometry(.13,.13,.12,10),mats.pale,0,.7,0);
  }else{mesh(group,new T.BoxGeometry(.6,.4,.4),l.type==='med'?cyan:mats.rust,0,.24,0);mesh(group,new T.BoxGeometry(.38,.07,.42),mats.pale,0,.25,.01);}
  scene.add(group);lootMeshes.set(l.id,group);
 }
 return {lootMeshes,labels};
}
export function makeThreats(scene,mats){
 const result=[];for(let i=0;i<4;i++){
  const group=new T.Group(),skin=new T.MeshStandardMaterial({color:'#4d5650',roughness:1});
  mesh(group,new T.CapsuleGeometry(.36,.95,3,7),skin,0,.9,0,Math.PI/2);mesh(group,new T.IcosahedronGeometry(.38,1),skin,0,1,-.93);mesh(group,new T.BoxGeometry(.38,.24,.45),mats.dark,0,.82,-1.18);
  const legs=[];for(const x of [-.3,.3])for(const z of [-.5,.5])legs.push(mesh(group,new T.CylinderGeometry(.08,.055,.7,6),skin,x,.4,z));for(const x of [-.2,.2])mesh(group,new T.SphereGeometry(.04,5,4),mats.lamp,x,1.09,-1.24);for(let z=-.5;z<.7;z+=.3)mesh(group,new T.ConeGeometry(.08,.25,4),mats.pale,0,1.3,z);group.userData.legs=legs;scene.add(group);result.push(group);
 }return result;
}
export function makeWeapon(camera,mats){
 const weapon=new T.Group();camera.add(weapon);weapon.position.set(.28,-.3,-.53);weapon.scale.setScalar(.8);
 mesh(weapon,new T.CylinderGeometry(.065,.075,.36,12),mats.dark,0,.04,-.08,Math.PI/2);mesh(weapon,new T.CylinderGeometry(.09,.09,.1,12),mats.metal,0,.04,-.26,Math.PI/2);mesh(weapon,new T.BoxGeometry(.1,.11,.2),mats.rust,0,-.03,.06);mesh(weapon,new T.BoxGeometry(.09,.2,.12),mats.wood,0,-.15,.1,0,-.13);mesh(weapon,new T.BoxGeometry(.15,.11,.2),mats.grass,.01,-.24,.16);mesh(weapon,new T.TorusGeometry(.055,.012,5,10),mats.metal,0,-.11,-.02,0,Math.PI/2);
 weapon.traverse(o=>o.castShadow=false);const muzzle=mesh(weapon,new T.SphereGeometry(.08,5,4),mats.lamp,0,.04,-.35);muzzle.castShadow=false;return {weapon,muzzle};
}
