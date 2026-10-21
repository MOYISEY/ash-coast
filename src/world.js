import * as T from 'three';
import { rng, LOOT, ZONES } from './core.js';

export function createView(canvas,world){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene();scene.background=new T.Color('#778f87');scene.fog=new T.FogExp2('#778f87',.0105);
 const camera=new T.PerspectiveCamera(73,innerWidth/innerHeight,.08,600);camera.rotation.order='YXZ';scene.add(camera);
 scene.add(new T.HemisphereLight('#d1e0ce','#28372f',2.2));
 const sun=new T.DirectionalLight('#ffe1ac',3.2);sun.position.set(-65,100,-85);scene.add(sun);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:280});sun.shadow.bias=-.001;sun.target.position.set(0,0,0);scene.add(sun.target);
 renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.enabled=false;
 const random=rng(552),mats={};
 for(const [name,color] of Object.entries({concrete:'#777b68',brick:'#765e4c',teal:'#526e65',rust:'#78543e',dark:'#283b38',rubble:'#676b59',wood:'#544d37',road:'#364943',line:'#8d9275',grass:'#626f48',bark:'#4d5541',metal:'#394943',pale:'#a8b19b'}))mats[name]=new T.MeshStandardMaterial({color,roughness:.95});
 const batches={};const mat4=new T.Matrix4(),pos=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
 function box(x,y,z,w,h,d,mat='concrete',rz=0,ry=0){
  (batches[mat]??=[]).push({x,y,z,w,h,d,rz,ry});
 }
 const groundCanvas=document.createElement('canvas');groundCanvas.width=groundCanvas.height=256;const ctx=groundCanvas.getContext('2d');ctx.fillStyle='#66705a';ctx.fillRect(0,0,256,256);
 for(let i=0;i<9000;i++){const g=75+random()*55;ctx.fillStyle=`rgba(${g+4},${g+8},${g-8},.35)`;ctx.fillRect(random()*256,random()*256,random()*3+1,random()*3+1);}
 const tex=new T.CanvasTexture(groundCanvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(45,45);tex.colorSpace=T.SRGBColorSpace;
 const ground=new T.Mesh(new T.PlaneGeometry(650,650),new T.MeshStandardMaterial({map:tex,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.06;ground.receiveShadow=true;scene.add(ground);
 box(0,.005,0,10,.04,202,'road');box(0,.012,43,190,.04,8,'road');box(0,.014,-35,190,.04,8,'road');box(-39,.01,-16,8,.04,138,'road');box(52,.01,-10,7,.04,150,'road');
 for(let z=-95;z<90;z+=10)box(.1,.045,z,.17,.02,3,'line');
 for(let x=-90;x<95;x+=10){box(x,.045,43,3,.02,.16,'line');box(x,.045,-35,3,.02,.16,'line');}
 // Cracks, grass seams, and broken kerbs are drawn into the same instance batches.
 for(let z=-92;z<82;z+=5){box(-5.5,.12,z,.35,.25,3,'concrete');box(5.5,.12,z,.35,.25,2,'concrete');}
 for(let i=0;i<110;i++){const z=random()*190-95,x=random()*8-4;box(x,.04,z,.04,.02,.7+random()*2,'dark',0,random()*2);}
 for(const b of world.boxes){
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
  if(Math.abs(x)<12||Math.abs(z-43)<8||Math.abs(z+35)<8||Math.abs(x-52)<9||Math.abs(x+39)<9||world.colliders.some(b=>Math.abs(b.x-x)<b.w/2+7&&Math.abs(b.z-z)<b.d/2+7)||Math.hypot(x,z-85)<19)continue;
  const h=4+random()*7;box(x,h/2,z,.24,h,.27,'bark',random()*.1);box(x+.55,h*.7,z,.16,h*.4,.17,'bark',-.55);box(x-.5,h*.6,z,.15,h*.3,.15,'bark',.6);
 }
 // Reeds along the sea and ground scrub use instancing.
 for(let i=0;i<950;i++){
  const x=(random()-.5)*235,z=(random()-.5)*235;
  if(Math.abs(x)<7||Math.abs(z-43)<5||Math.abs(z+35)<5||Math.abs(x-52)<5||Math.abs(x+39)<5||world.colliders.some(b=>Math.abs(b.x-x)<b.w/2+1&&Math.abs(b.z-z)<b.d/2+1)||Math.hypot(x,z-85)<9)continue;
  box(x,.15,z,.07,.2+random()*.5,.1,'grass',random()-.5);
 }
 for(let z=-85;z<80;z+=27){box(-8,5,z,.2,10,.2,'wood');box(-8,9.1,z,3,.13,.14,'wood');box(-7.1,8.9,z,.15,.5,.15,'pale');box(-8.8,8.9,z,.15,.5,.15,'pale');}
 // Cable spans.
 const wireMat=new T.LineBasicMaterial({color:'#344d43'});
 for(let z=-85;z<53;z+=27){const pts=[];for(let i=0;i<=12;i++)pts.push(new T.Vector3(-7.1,9-Math.sin(i/12*Math.PI)*1.4,z+i/12*27));scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),wireMat));}
 // Distant silhouettes are scenery outside the playable bounds.
 for(let i=0;i<24;i++){const x=(i-12)*18,h=8+random()*18;box(x,h/2,-145-random()*24,12+random()*8,h,14,'teal');}
 for(const [x,z,h] of [[75,-84,30],[83,-83,23]]){box(x,h/2,z,3,h,3,'rust');box(x,h*.8,z,3.1,2,3.1,'pale');}
 for(let z=-95;z<105;z+=13){box(100,-.7,z,4,2.2,12,'concrete');box(98.2,.4,z,.3,.8,9,'pale');}
 // Sea is gently displaced in the vertex shader, no imported textures.
 const seaMat=new T.MeshStandardMaterial({color:'#557c76',metalness:.45,roughness:.36,transparent:true,opacity:.88});
 const sea=new T.Mesh(new T.PlaneGeometry(330,650,1,1),seaMat);sea.rotation.x=-Math.PI/2;sea.position.set(265,-.62,0);scene.add(sea);
 for(let z=-200;z<220;z+=12)box(118,.025,z,15,.025,.08,'pale',0,.03);
 for(const [x,z] of [[101,43],[101,-35]]){box(x+9,.35,z,23,.8,5,'wood');for(let j=0;j<5;j++)box(x+j*4,-.5,z, .4,3,.4,'wood');}
 // Hills surrounding the inland boundary.
 const hillGeo=new T.ConeGeometry(45,25,6);for(let i=0;i<12;i++){const h=new T.Mesh(hillGeo,mats.teal);h.position.set(-160+Math.sin(i)*25,2,-180+i*33);h.scale.y=.5+random();scene.add(h);}
 for(const [name,list] of Object.entries(batches)){
  const mesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mats[name],list.length);
  list.forEach((b,i)=>{pos.set(b.x,b.y,b.z);q.setFromEuler(new T.Euler(0,b.ry,b.rz));scale.set(b.w,b.h,b.d);mat4.compose(pos,q,scale);mesh.setMatrixAt(i,mat4);});
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
 }
 function sign(text,x,y,z,width=5,color='#d0c49b'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle='#243a33';g.fillRect(0,0,512,128);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(8,8,496,112);g.fillStyle=color;g.font='bold 38px Arial';g.textAlign='center';g.fillText(text,256,79);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));m.position.set(x,y,z);scene.add(m);
 }
 sign('ПРИЛИВ / 07',0,3.1,78.48,7);sign('КВАРТАЛ 04',-49,3,-10,6);sign('НАСОСНАЯ',51,4,34.1,8);sign('РЕЛЕЙНЫЙ ЦЕХ',34,5,-45.4,8);sign('☢ ВЫСОКИЙ ФОН',28,2.1,-41,5,'#dbb268');sign('ПОБЕРЕЖЬЕ →',8,2.5,47,4);
 // Radiation patches: coloured pools and floating cinders.
 for(const zone of ZONES){const disk=new T.Mesh(new T.CircleGeometry(zone.r,48),new T.MeshBasicMaterial({color:'#a6b45c',transparent:true,opacity:.09,depthWrite:false}));disk.rotation.x=-Math.PI/2;disk.position.set(zone.x,.06,zone.z);scene.add(disk);}
 const lootMeshes=new Map();
 for(const l of LOOT){
  const group=new T.Group();group.position.set(l.x,.8,l.z);const isPart=l.type==='part',mat=new T.MeshStandardMaterial({color:isPart?'#e7b96e':'#93bea6',emissive:isPart?'#bc7c30':'#376959',emissiveIntensity:.45,roughness:.5,metalness:.5});
  const mesh=new T.Mesh(isPart?new T.OctahedronGeometry(.4):new T.BoxGeometry(.6,.4,.45),mat);group.add(mesh);
  const halo=new T.Mesh(new T.TorusGeometry(.65,.018,4,32),new T.MeshBasicMaterial({color:isPart?'#e5be7d':'#96bea8',transparent:true,opacity:.7}));halo.rotation.x=-Math.PI/2;halo.position.y=-.6;group.add(halo);scene.add(group);lootMeshes.set(l.id,group);
 }
 const enemyMeshes=[];
 for(let i=0;i<4;i++){
  const group=new T.Group(),bodyMat=new T.MeshStandardMaterial({color:'#3f493c',roughness:1});
  function piece(w,h,d,x,y,z,mat=bodyMat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;}
  piece(.85,.55,1.6,0,.95,0);piece(.62,.6,.65,0,1.1,-.95);piece(.45,.23,.5,0,.91,-1.32);
  const legs=[];for(const x of [-.34,.34])for(const z of [-.55,.55])legs.push(piece(.17,.7,.18,x,.4,z));
  const eyes=new T.MeshBasicMaterial({color:'#ffad57'});piece(.1,.08,.04,-.22,1.25,-1.3,eyes);piece(.1,.08,.04,.22,1.25,-1.3,eyes);
  const spine=piece(.1,.25,1.3,0,1.32,.1);spine.rotation.x=.1;group.userData.legs=legs;scene.add(group);enemyMeshes.push(group);
 }
 const particleGeo=new T.BufferGeometry(),particlePositions=new Float32Array(450*3);
 for(let i=0;i<450;i++){particlePositions[i*3]=(random()-.5)*150;particlePositions[i*3+1]=random()*22;particlePositions[i*3+2]=(random()-.5)*150;}
 particleGeo.setAttribute('position',new T.BufferAttribute(particlePositions,3));const ash=new T.Points(particleGeo,new T.PointsMaterial({color:'#dfdfbb',size:.065,transparent:true,opacity:.5,depthWrite:false}));scene.add(ash);
 // Small improvised flare pistol, camera-space, animated only when walking/firing.
 const weapon=new T.Group();camera.add(weapon);weapon.position.set(.34,-.3,-.55);
 function gunBox(w,h,d,x,y,z,color){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.7,metalness:.4}));m.position.set(x,y,z);weapon.add(m);}
 gunBox(.11,.14,.34,0,0,0,'#354a43');gunBox(.14,.1,.4,0,.08,-.05,'#615d49');gunBox(.09,.23,.14,0,-.13,.1,'#65503b');gunBox(.2,.13,.27,.02,-.25,.15,'#7d7c58');
 let quality='medium';
 function setQuality(q){quality=q;renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?1:q==='high'?1.8:1.35));renderer.shadowMap.enabled=q==='high';sun.shadow.needsUpdate=true;}
 function render(s,{menu=false,dt=.016,flash=0}={}){
  const fogTarget=s.time>=100&&Math.floor(s.time/100)%3===1?.019:.0105;scene.fog.density=T.MathUtils.lerp(scene.fog.density,fogTarget,dt*.2);
  if(menu){camera.position.set(8,5.8,102);camera.lookAt(-7,2,5);weapon.visible=false;}
  else{camera.position.set(s.player.x,1.72+Math.sin(s.steps*1.8)*.025,s.player.z);camera.rotation.set(s.player.pitch,s.player.yaw,0,'YXZ');weapon.visible=true;weapon.position.y=-.3+Math.sin(s.steps*2)*.015+flash*.1;weapon.rotation.x=flash*.35;}
  for(const [id,group] of lootMeshes){group.visible=!s.collected.includes(id);group.children[0].rotation.y=s.time*.7;group.children[0].position.y=Math.sin(s.time*2)*.08;}
  s.enemies.forEach((e,i)=>{const mesh=enemyMeshes[i];mesh.visible=e.hp>0;const old=mesh.position.clone();mesh.position.set(e.x,0,e.z);const dx=e.x-old.x,dz=e.z-old.z;if(Math.hypot(dx,dz)>.001)mesh.rotation.y=Math.atan2(-dx,-dz);mesh.userData.legs.forEach((leg,j)=>leg.rotation.x=Math.sin(s.time*8+j*2)*.3);});
  ash.position.set(s.player.x,0,s.player.z);ash.rotation.y=s.time*.008;
  const pp=particleGeo.attributes.position;for(let i=0;i<450;i++){pp.array[i*3+1]-=dt*.45;if(pp.array[i*3+1]<0)pp.array[i*3+1]=22;}pp.needsUpdate=true;
  renderer.render(scene,camera);
 }
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('error').hidden=false;document.getElementById('error').textContent='Браузер потерял графический контекст. Обновите страницу и продолжите сохранённую игру. При повторении выберите низкое качество.';});
 return {render,setQuality,renderer,camera,scene,get quality(){return quality;}};
}
