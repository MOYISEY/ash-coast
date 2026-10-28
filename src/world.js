import {createExpeditionDecor} from './expedition-art.js';
import {makeExplorationArt} from './exploration-art.js';
import {landscapeGround} from './landscape.js';
import {makePlaceArt} from './place-art.js';
import * as T from 'three';
import { rng, LOOT, ZONES, stormStatus } from './core.js';
import {surfaceLibrary,makeSky} from './art.js';
import {decorateWorld,makeCollectibles,makeThreats,makeWeapon} from './details.js';

export function createView(canvas,world){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new T.Scene();scene.background=new T.Color('#8b9897');scene.fog=new T.FogExp2('#8b9897',.0065);const sky=makeSky(scene);
 const camera=new T.PerspectiveCamera(73,innerWidth/innerHeight,.08,600);camera.rotation.order='YXZ';scene.add(camera);
 scene.add(new T.HemisphereLight('#b9d0df','#59665c',1.85));
 const sun=new T.DirectionalLight('#ffd6ab',3.2);sun.position.set(-98,48,-108);scene.add(sun);
 sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:1,far:260});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;scene.add(sun.target);
 renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;
 const random=rng(552),mats={},surfaces=surfaceLibrary();
 for(const [name,color] of Object.entries({concrete:'#89948d',brick:'#9b8671',teal:'#477a7e',rust:'#9a6c4b',dark:'#293b40',rubble:'#71766c',wood:'#79664f',road:'#424e50',line:'#b6b59a',grass:'#59684a',bark:'#525747',metal:'#566467',pale:'#b6baa8',apartment:'#a2a294',hazard:'#dfc684',gate:'#ad984f'}))mats[name]=surfaces.material(color,name==='road'?'asphalt':name==='hazard'||name==='gate'?'hazard':name==='brick'?'brick':name==='rust'||name==='metal'?'rust':name==='wood'||name==='bark'?'wood':'concrete',name==='road'?.12:.42);
 const batches={};const mat4=new T.Matrix4(),pos=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
 function box(x,y,z,w,h,d,mat='concrete',rz=0,ry=0){
  (batches[mat]??=[]).push({x,y,z,w,h,d,rz,ry});
 }
 landscapeGround(scene,surfaces);
 box(0,.005,0,10,.04,202,'road');box(0,.012,43,190,.04,8,'road');box(0,.014,-35,190,.04,8,'road');box(-39,.01,-16,8,.04,138,'road');box(52,.01,-10,7,.04,150,'road');
 for(let z=-95;z<90;z+=10)box(.1,.045,z,.17,.02,3,'line');
 for(let x=-90;x<95;x+=10){box(x,.045,43,3,.02,.16,'line');box(x,.045,-35,3,.02,.16,'line');}
 // Cracks, grass seams, and broken kerbs are drawn into the same instance batches.
 for(let z=-92;z<82;z+=5){box(-5.5,.12,z,.35,.25,3,'concrete');box(5.5,.12,z,.35,.25,2,'concrete');}
 for(let i=0;i<110;i++){const z=random()*190-95,x=random()*8-4;box(x,.04,z,.04,.02,.7+random()*2,'dark',0,random()*2);}
 for(const b of world.boxes){
  if(['serviceGate','purifier','entryPost'].includes(b.kind)||b.color==='rubble')continue;
  box(b.x,b.y+b.h/2,b.z,b.w,b.h,b.d,b.color);
  if(b.h>3&&b.color==='concrete'){
   // Exposed aggregate and scars, kept off entrances and purely decorative.
   for(let j=0;j<3;j++){const y=.6+random()*(b.h-1);if(b.w>b.d)box(b.x+(random()-.5)*b.w*.8,y,b.z+b.d/2+.015,.6+random()*1.7,.07,.03,'dark');else box(b.x+b.w/2+.015,y,b.z+(random()-.5)*b.d*.8,.03,.07,.6+random()*1.7,'dark');}
   if(b.h>5){box(b.x, b.h+.45,b.z,.07,.9,.07,'metal');box(b.x+.4,b.h+.25,b.z,.07,.5,.07,'metal');}
  }
  if(b.color==='rust'&&b.h>3){for(let j=-b.w/2+.4;j<b.w/2;j+=.7)box(b.x+j,b.h/2,b.z+b.d/2+.03,.07,b.h-.15,.06,'metal');}
  if(b.color==='rust'&&b.h===1.7){box(b.x-2,.45,b.z+1.4,1,.9,.25,'dark');box(b.x+2,.45,b.z+1.4,1,.9,.25,'dark');}
 }
 // Shelter details: table, radio, lamp, striped doorway. The table is behind interaction point.
 box(-.4,1.7,89.4,1.3,.7,.7,'metal');box(-.4,1.72,88.99,.7,.32,.03,'teal');box(.1,2.3,89.4,.04,.9,.04,'metal');
 for(const x of [-6,6])box(x,2,79, .3,4,.3,'pale');
 const lamp=new T.PointLight('#f7ba64',22,16,2);lamp.position.set(0,3.1,85);scene.add(lamp);
 box(0,3.5,89.3,.6,.12,.3,'pale');
 // Dead coastal trees, clustered off the roads and building interiors.
 for(let i=0;i<110;i++){
  const x=(random()-.5)*250,z=(random()-.5)*250;
  if(x>97||Math.abs(x)<12||Math.abs(z-43)<8||Math.abs(z+35)<8||Math.abs(x-52)<9||Math.abs(x+39)<9||world.colliders.some(b=>Math.abs(b.x-x)<b.w/2+7&&Math.abs(b.z-z)<b.d/2+7)||Math.hypot(x,z-85)<19)continue;
  const h=4+random()*7;box(x,h/2,z,.24,h,.27,'bark',random()*.1);box(x+.55,h*.7,z,.16,h*.4,.17,'bark',-.55);box(x-.5,h*.6,z,.15,h*.3,.15,'bark',.6);
 }
 // Grass is built as bent blades in the district pass.
 for(let z=-85;z<80;z+=27){box(-8,5,z,.2,10,.2,'wood');box(-8,9.1,z,3,.13,.14,'wood');box(-7.1,8.9,z,.15,.5,.15,'pale');box(-8.8,8.9,z,.15,.5,.15,'pale');}
 // Cable spans.
 const wireMat=new T.LineBasicMaterial({color:'#344d43'});
 for(let z=-85;z<53;z+=27){const pts=[];for(let i=0;i<=12;i++)pts.push(new T.Vector3(-7.1,9-Math.sin(i/12*Math.PI)*1.4,z+i/12*27));scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),wireMat));}
 // Distant silhouettes are scenery outside the playable bounds.
 for(let i=0;i<24;i++){const x=(i-12)*18,h=8+random()*18;box(x,h/2,-145-random()*24,12+random()*8,h,14,'teal');}
 for(const [x,z,h] of [[75,-84,30],[83,-83,23]]){box(x,h/2,z,3,h,3,'rust');box(x,h*.8,z,3.1,2,3.1,'pale');}
 for(let z=-95;z<105;z+=13){box(100,-.7,z,4,2.2,12,'concrete');box(98.2,.4,z,.3,.8,9,'pale');}
 // The animated sea and coastline details are built by the district pass.
 for(const [x,z] of [[101,43],[101,-35]]){box(x+9,.35,z,23,.8,5,'wood');for(let j=0;j<5;j++)box(x+j*4,-.5,z, .4,3,.4,'wood');}
 // Hills surrounding the inland boundary.
 const hillGeo=new T.ConeGeometry(45,25,6);for(let i=0;i<12;i++){const h=new T.Mesh(hillGeo,mats.teal);h.position.set(-160+Math.sin(i)*25,2,-180+i*33);h.scale.y=.5+random();scene.add(h);}
 const decor=decorateWorld(scene,world,mats,renderer,surfaces);
 for(const [name,list] of Object.entries(batches)){
  const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mats[name],list.length);
  list.forEach((b,i)=>{pos.set(b.x,b.y,b.z);q.setFromEuler(new T.Euler(0,b.ry,b.rz));scale.set(b.w,b.h,b.d);mat4.compose(pos,q,scale);mesh.setMatrixAt(i,mat4);});
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
 }
 function sign(text,x,y,z,width=5,color='#d0c49b'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#243a33';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(8,8,496,112);g.fillStyle=color;g.font='bold 38px Arial';g.textAlign='center';g.fillText(text,256,79);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));m.position.set(x,y,z);scene.add(m);
 }
 sign('ПРИЛИВ / 07',0,3.1,78.48,7);sign('КВАРТАЛ 04 · ВХОД',-50,4.6,-10.13,3.2);sign('НАСОСНАЯ',51,4.8,35.05,7);sign('РЕЛЕЙНЫЙ ЦЕХ',34,5,-45.4,8);sign('☢ ВЫСОКИЙ ФОН',28,2.1,-41,5,'#dbb268');sign('ПОБЕРЕЖЬЕ →',8,2.5,47,4);
 // Radiation patches: coloured pools and floating cinders.
 for(const zone of ZONES){const disk=new T.Mesh(new T.CircleGeometry(zone.r,48),new T.MeshBasicMaterial({color:'#a6b45c',transparent:true,opacity:.09,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.set(zone.x,.06,zone.z);scene.add(disk);}
 const {lootMeshes,labels}=makeCollectibles(scene,mats);
 const enemyMeshes=makeThreats(scene,mats);
 const particleGeo=new T.BufferGeometry(),particlePositions=new Float32Array(450*3);
 for(let i=0;i<450;i++){particlePositions[i*3]=(random()-.5)*150;particlePositions[i*3+1]=random()*22;particlePositions[i*3+2]=(random()-.5)*150;}
 particleGeo.setAttribute('position',new T.BufferAttribute(particlePositions,3));const ash=new T.Points(particleGeo,new T.PointsMaterial({color:'#dfdfbb',size:.065,transparent:true,opacity:.5,depthWrite:false}));scene.add(ash);
 // Small flare pistol, camera-space, animated only when walking/firing.
 const expedition=createExpeditionDecor(scene,mats);
 const exploration=makeExplorationArt(scene,mats,surfaces);
 const places=makePlaceArt(scene,mats);
 const {weapon,muzzle}=makeWeapon(camera,mats);
 let quality='medium',shadowFrame=0;
 function setQuality(q){quality=q;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?1:q==='high'?1.6:1.25));sun.shadow.mapSize.set(q==='low'?1024:q==='high'?2048:1536,q==='low'?1024:q==='high'?2048:1536);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}decor.setQuality(q);renderer.shadowMap.needsUpdate=true;}
 setQuality('medium');
 function render(s,{menu=false,dt=.016,flash=0}={}){
  const storm=stormStatus(s),severity=storm.phase==='active'?1:storm.phase==='warning'?(1-storm.remaining/40)*.35:0;
  const fogTarget=.0065+severity*.033;scene.fog.density=T.MathUtils.lerp(scene.fog.density,fogTarget,Math.min(1,dt*2));
  scene.fog.color.lerp(new T.Color(severity>.5?'#857665':'#8b9897'),Math.min(1,dt*2));
  sun.intensity=T.MathUtils.lerp(sun.intensity,3.2-severity*2.5,Math.min(1,dt*2));
  sky.material.uniforms.storm.value=T.MathUtils.lerp(sky.material.uniforms.storm.value,severity,Math.min(1,dt*2));
  expedition.update(s);exploration.update(s);places.update(s);
  if(menu){camera.position.set(10,3.1,71);camera.lookAt(28,3,-25);weapon.visible=false;}
  else{camera.position.set(s.player.x,1.72+Math.sin(s.steps*1.8)*.025,s.player.z);camera.rotation.set(s.player.pitch,s.player.yaw,0,'YXZ');weapon.visible=true;weapon.position.y=-.3+Math.sin(s.steps*2)*.015+flash*.1;weapon.rotation.x=flash*.35;}
  sky.position.copy(camera.position);muzzle.visible=flash>.55;decor.update(s,dt);for(const [id,group] of lootMeshes)group.visible=!s.collected.includes(id);
  for(const l of labels)l.sprite.visible=!s.collected.includes(l.id)&&Math.hypot(l.x-s.player.x,l.z-s.player.z)<20;
  s.enemies.forEach((e,i)=>{const mesh=enemyMeshes[i];mesh.visible=e.hp>0;const old=mesh.position.clone();mesh.position.set(e.x,0,e.z);const dx=e.x-old.x,dz=e.z-old.z;if(Math.hypot(dx,dz)>.001)mesh.rotation.y=Math.atan2(-dx,-dz);mesh.userData.legs.forEach((leg,j)=>leg.rotation.x=Math.sin(s.time*8+j*2)*.3);});
  ash.position.set(s.player.x,0,s.player.z);ash.rotation.y=s.time*(.008+severity*.06);ash.material.opacity=.5+severity*.35;ash.material.size=.065+severity*.09;
  const pp=particleGeo.attributes.position;for(let i=0;i<450;i++){pp.array[i*3]+=dt*severity*13;if(pp.array[i*3]>75)pp.array[i*3]=-75;pp.array[i*3+1]-=dt*(.45+severity*2.2);if(pp.array[i*3+1]<0)pp.array[i*3+1]=22;}pp.needsUpdate=true;
  if(shadowFrame++%8===0){const sx=Math.round(camera.position.x/2)*2,sz=Math.round(camera.position.z/2)*2;sun.position.set(sx-98,48,sz-108);sun.target.position.set(sx,0,sz);renderer.shadowMap.needsUpdate=true;}
  renderer.render(scene,camera);
 }
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('error').hidden=false;document.getElementById('error').textContent='Браузер потерял графический контекст. Обновите страницу и продолжите сохранённую игру. При повторении выберите низкое качество.';});
 return {render,setQuality,renderer,camera,scene,get quality(){return quality;}};
}
