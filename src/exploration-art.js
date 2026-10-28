import * as T from 'three';
import {geometryBatches} from './art.js';
import {rng} from './core.js';
import {SUPPLY_TRAIL} from './exploration.js';

// Render-only dressing: tall objects share existing solid footprints or are
// above head height / beyond the district boundary. Traversable ground stays flat.
export function makeExplorationArt(scene,mats,surfaces){
 mats.ash=surfaces.material('#c0b9a1','soil',.23);
 mats.signal=new T.MeshStandardMaterial({color:'#dd9c55',roughness:.88});
 const cloth=document.createElement('canvas');cloth.width=cloth.height=128;const cg=cloth.getContext('2d');cg.fillStyle='#8ca8aa';cg.fillRect(0,0,128,128);cg.fillStyle='#c3c5ae';cg.fillRect(0,8,128,6);cg.fillRect(0,112,128,6);for(let i=0;i<128;i+=3){cg.fillStyle='#243a3b25';cg.fillRect(i,0,1,128);cg.fillRect(0,i,128,1);}const clothMap=new T.CanvasTexture(cloth);clothMap.colorSpace=T.SRGBColorSpace;clothMap.wrapS=clothMap.wrapT=T.RepeatWrapping;
 mats.canvas=new T.MeshStandardMaterial({map:clothMap,color:'#a6b9b2',emissive:'#223c3d',emissiveIntensity:.35,roughness:1,side:T.DoubleSide});
 mats.chalk=new T.MeshBasicMaterial({color:'#c3d4c2'});
 const batch=geometryBatches(scene,mats),{box,cylinder,rock}=batch,r=rng(4407);
 // 1. Broken coastal shelves: entirely beyond x98, outside playable ground.
 for(let z=-108;z<=110;z+=5){const x=101+r()*4;rock(x,-1.25,z,6+r()*4,3.6+r()*2,6+r()*5,'dark',r()*3);rock(x+4,-2,z,9,3,8,'rubble',r()*3);}
 // Wind-laid ash ridges stay very shallow, off roads and entrances.
 for(let i=0;i<130;i++){
  const x=r()*188-94,z=r()*186-94;
  if(Math.abs(x)<10||Math.abs(x-52)<7||Math.abs(x+39)<7||Math.abs(z-43)<7||Math.abs(z+35)<7||Math.hypot(x,z-85)<24)continue;
  rock(x,-.13,z,2+r()*5,.35+r()*.1,1+r()*3,'ash',-.6);
 }
 // A grounded ferry sits outside the eastern boundary, seen from the supply quay.
 // Its shape points toward the evacuated district; it isn't a playable vehicle.
 const hull=new T.Mesh(new T.CylinderGeometry(2.7,1.5,17,6,1),mats.rust);hull.rotation.set(Math.PI/2,0,.12);hull.position.set(110,.7,-6);hull.castShadow=true;scene.add(hull);
 box(110,2.1,-6,4.1,.3,13,'wood',.12);box(110,3.1,-9,3.2,1.8,4,'pale',.12);box(110,3.25,-6.98,2.5,.7,.05,'window');box(110,4.1,-9,3.6,.14,4.3,'teal');
 cylinder(111,5.9,-9,.055,4,'metal');box(111.5,7.6,-9,.9,.55,.025,'canvas',.15);
 // Low relief beach foam / wrack breaks the formerly ruler-straight water edge.
 for(let z=-100;z<=100;z+=4){box(107+r()*2,-.47,z,1+r()*2,.035,2.3,'pale',0,r()*.5);}
 // 2. The existing ruin at56,58 becomes the evacuation assembly courtyard.
 // Luggage rests on the existing solid masonry block at51,54.
 for(const [x,z,w,h] of [[50.4,53.5,.65,.55],[51.3,54.2,.9,.7],[50.9,55,.7,.4]]){
  box(x,1.2+h/2,z,w,h,.5,'wood');box(x,1.25+h,z,w*.6,.06,.07,'metal');box(x,1.2+h*.5,z+.26,.06,h,.025,'signal');
 }
 // Bench remains embedded along the back wall, outside walkable floor.
 for(const x of [54.2,56.2,58.2,60.2]){box(x,.6,51.45,1.7,.15,.7,'wood');box(x,1,51.2,1.7,.7,.12,'teal');for(const dx of [-.6,.6])box(x+dx,.3,51.2,.07,.6,.07,'metal');}
 // Tarp overhead, three torn panels; no floor-level invisible obstacle.
 for(let i=0;i<3;i++){
  const geo=new T.PlaneGeometry(2.2,7,5,7),a=geo.attributes.position;
  for(let j=0;j<a.count;j++)a.setZ(j,Math.sin(a.getY(j)*.65+i)*.17+Math.sin(a.getX(j)*1.2)*.1);
  geo.computeVertexNormals();const m=new T.Mesh(geo,mats.canvas);m.rotation.set(-Math.PI/2,0,.04+i*.03);m.position.set(51+i*3.1,4.65,56.5);m.castShadow=true;scene.add(m);
 }
 // Suspended ropes and wall-fixed queue numbers tell the same small story.
 for(const x of [49.7,62.3])box(x,4.65,56.5,.035,.035,9,'metal');
 box(62.25,2.7,54.8,.08,1.2,.08,'metal');box(62.2,3.2,54.8,.8,.55,.04,'canvas',-.12,Math.PI/2);
 // A repaired antenna watch-room in quarter04: tools on existing brick plinth.
 box(-55,1.4,-22,.75,.4,.55,'teal');cylinder(-54.7,2,-22,.025,.9,'metal');box(-55,1.6,-22.3,1,.08,.12,'rust');
 for(let i=0;i<4;i++)box(-51+i*.7,2.5,-24.46,.035,2,.02,'signal',.13);
 // 3. A small, authored supply trail, readable on low and ending at existing ammo.
 for(let i=0;i<SUPPLY_TRAIL.length;i++){
  const [x,z]=SUPPLY_TRAIL[i],next=SUPPLY_TRAIL[Math.min(i+1,SUPPLY_TRAIL.length-1)],angle=Math.atan2(next[0]-x,next[1]-z);
  for(const side of [-1,1])box(x+side*.22,.09,z,.12,.035,.9,'canvas',0,angle+side*.55);
 }
 // World arrows use existing lamp posts / container faces, never extra HUD menus.
 for(const [x,z,ry]of[[20,44,0],[52,43,0],[82,14,Math.PI/2]]){
  box(x,2.1,z,1.6,.35,.06,'canvas',0,ry);box(x+.45,2.1,z+.04,.12,.45,.04,'pale',.65,ry);
 }
 batch.flush();
 function board(lines,x,y,z,w,h,color='#d6bd87',ry=0){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');g.fillStyle='#243b3b';g.fillRect(0,0,1024,512);
  g.fillStyle=color;g.fillRect(0,0,24,512);g.strokeStyle='#c5b997';g.lineWidth=3;g.strokeRect(36,25,960,461);g.textAlign='left';
  lines.forEach((line,i)=>{g.fillStyle=i===0?color:'#d6d7bf';g.font=(i===0?'bold 67':'37')+'px Arial';g.fillText(line,70,115+i*92,880);});
  // Original weathering scratches, deterministic and sparse enough to read.
  for(let i=0;i<80;i++){g.fillStyle='#0e262222';g.fillRect(r()*1024,r()*512,2+r()*30,1+r()*4);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,side:T.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;scene.add(m);return m;
 }
 board(['ПОСЛЕДНИЙ РЕЙС 07','ПЕРЕПРАВА ЗАКРЫТА','Кто остался — держитесь берега.','Сигнальный запас → синий флажок'],57,2.7,51.7,6,3);
 board(['НЕ ДОЖДАЛИСЬ','147 черт на стене.','Антенна рядом с сумкой.','Сумка ремонтника — у входа.'],-50,2.7,-24.3,4.5,2.3);
 board(['РЕЙСОВ БОЛЬШЕ НЕТ','ЗАПАС ДЛЯ СЕВЕРНОГО ПОСТА','Провод и сорбент — под стеной.'],98.25,1.8,-13,2.4,1.2,'#d6bd87',-Math.PI/2);
 const cue=new T.Group();cue.position.set(61,0,54);
 const pole=new T.Mesh(new T.CylinderGeometry(.025,.025,2.2,6),mats.metal);pole.position.y=1.1;cue.add(pole);
 const flag=new T.Mesh(new T.PlaneGeometry(.6,.45,4,2),mats.canvas);flag.position.set(.3,1.95,0);cue.add(flag);scene.add(cue);
 const found=board(['СИГНАЛ ПРИНЯТ','ЗАПАС ЗАБРАН'],61,1.8,54.1,1.3,.65,'#d6bd87');
 return {update(s){const taken=s.collected.includes('cache8');flag.visible=!taken;found.visible=taken;flag.rotation.y=Math.sin(s.time*2)*.12;}};
}
