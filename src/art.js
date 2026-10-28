import * as T from 'three';
import {rng} from './core.js';

// Original procedural surface library: no downloaded images or third-party assets.
export function surfaceLibrary(){
 const textures=new Map();
 function texture(kind){
  if(textures.has(kind))return textures.get(kind);
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),r=rng(826+kind.length*19);
  g.fillStyle=kind==='asphalt'?'#a9afab':kind==='soil'?'#8e998b':'#e0e1d8';g.fillRect(0,0,512,512);
  const img=g.getImageData(0,0,512,512);
  for(let i=0;i<img.data.length;i+=4){const n=(r()-.5)*(kind==='soil'?50:30);for(let k=0;k<3;k++)img.data[i+k]+=n;}
  g.putImageData(img,0,0);
  for(let i=0;i<130;i++){
   const x=r()*512,y=r()*512,w=5+r()*90,h=5+r()*80;
   const gradient=g.createRadialGradient(x,y,0,x,y,Math.max(w,h));gradient.addColorStop(0,`rgba(30,39,34,${.025+r()*.11})`);gradient.addColorStop(1,'rgba(30,39,34,0)');g.fillStyle=gradient;g.fillRect(x-w,y-h,w*2,h*2);
  }
  if(kind==='brick'){
   g.fillStyle='#686e65';g.fillRect(0,0,512,512);
   for(let row=0;row<12;row++)for(let col=-1;col<6;col++){
    const shade=140+r()*60;g.fillStyle=`rgb(${shade},${shade*.91},${shade*.79})`;g.fillRect(col*105+(row%2)*52, row*43+3,100,37);
   }
  }else if(kind==='rust'){
   for(let i=0;i<160;i++){g.fillStyle=`rgba(80,42,21,${r()*.3})`;g.fillRect(r()*512,r()*512,2+r()*9,10+r()*100);}
   for(let x=0;x<512;x+=32){g.fillStyle='#222d292c';g.fillRect(x,0,2,512);g.fillStyle='#ffffff28';g.fillRect(x+2,0,2,512);}
  }else if(kind==='wood'){
   for(let i=0;i<170;i++){g.strokeStyle=`rgba(35,26,20,${r()*.27})`;g.beginPath();const y=r()*512;g.moveTo(0,y);g.bezierCurveTo(150,y+r()*15,300,y-r()*15,512,y);g.stroke();}
   for(let y=0;y<512;y+=85){g.fillStyle='#1c27284a';g.fillRect(0,y,512,3);}
  }else if(kind==='hazard'){
   g.fillStyle='#d2b353';g.fillRect(0,0,512,512);g.fillStyle='#273033';for(let x=-512;x<900;x+=150){g.beginPath();g.moveTo(x,0);g.lineTo(x+70,0);g.lineTo(x+582,512);g.lineTo(x+512,512);g.fill();}
  }else{
   for(let i=0;i<(kind==='soil'?1200:45);i++){
    const x=r()*512,y=r()*512;g.strokeStyle=kind==='soil'?`rgba(220,223,195,${r()*.4})`:'#1b262a45';g.lineWidth=kind==='soil'?1:.5+r();g.beginPath();g.moveTo(x,y);g.lineTo(x+3+r()*12,y+r()*8);if(kind!=='soil')g.lineTo(x-4+r()*20,y+15+r()*20);g.stroke();
   }
  }
  for(let i=0;i<20;i++){g.fillStyle='#2d38381a';g.fillRect(r()*512,0,2+r()*12,100+r()*350);}
  const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;textures.set(kind,tex);return tex;
 }
 function material(color,kind='concrete',scale=.4){
  const m=new T.MeshStandardMaterial({color,map:texture(kind),roughness:kind==='rust'?.72:kind==='asphalt'?.48:.95,metalness:kind==='rust'?.35:0});
  m.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSurfacePosition; varying vec3 vSurfaceNormal;');
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 surfaceWorld=vec4(transformed,1.0);vec3 surfaceNormal=normal;
    #ifdef USE_INSTANCING
    surfaceWorld=instanceMatrix*surfaceWorld;surfaceNormal=mat3(instanceMatrix)*surfaceNormal;
    #endif
    vSurfacePosition=(modelMatrix*surfaceWorld).xyz;vSurfaceNormal=normalize(mat3(modelMatrix)*surfaceNormal);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSurfacePosition; varying vec3 vSurfaceNormal;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 surfaceN=abs(normalize(vSurfaceNormal));vec2 surfaceUv=surfaceN.y>.6?vSurfacePosition.xz:(surfaceN.x>.6?vSurfacePosition.zy:vSurfacePosition.xy);diffuseColor*=texture2D(map,surfaceUv*${scale.toFixed(3)});
    float rainStain=.5+.5*sin(vSurfacePosition.x*.61+sin(vSurfacePosition.z*.37)*2.);
    diffuseColor.rgb*=mix(vec3(.66,.73,.70),vec3(1.08,1.04,.95),smoothstep(0.,2.8,vSurfacePosition.y)*.65+rainStain*.24);
   `);
   if(kind==='asphalt')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float roadDry=.5+.5*sin(vSurfacePosition.x*.91+sin(vSurfacePosition.z*.13)*3.);
    roughnessFactor=mix(.28,.88,smoothstep(.25,.68,roadDry));`);
  };
  m.customProgramCacheKey=()=>`ash-world-surface-${scale}`;return m;
 }
 return {material,texture};
}

export function makeSky(scene){
 const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{storm:{value:0},sunDir:{value:new T.Vector3(-.65,.24,-.72).normalize()}},vertexShader:'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
  varying vec3 vSky;uniform vec3 sunDir;uniform float storm;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){vec3 d=normalize(vSky);float y=max(d.y,0.);vec3 c=mix(vec3(.72,.68,.56),vec3(.17,.27,.36),pow(y,.55));
   float n=noise(d.xz*7.+vec2(y*9.,y*2.))*.65+noise(d.xz*17.+y*12.)*.35;
   float cloud=smoothstep(.45,.72,n)*smoothstep(.05,.4,y)*(1.-smoothstep(.45,.85,y));c=mix(c,vec3(.46,.49,.48),cloud*.6);
   float sun=max(dot(d,sunDir),0.);c+=vec3(.52,.30,.13)*pow(sun,35.)+vec3(.62,.44,.21)*smoothstep(.9991,.9997,sun);
   c=mix(c,vec3(.29,.27,.235)+n*.07,storm*.92);gl_FragColor=vec4(c,1.);}`});
 const sky=new T.Mesh(new T.SphereGeometry(450,24,12),mat);scene.add(sky);return sky;
}

export function geometryBatches(scene,mats){
 const groups=new Map(),transform=new T.Object3D();
 function add(type,x,y,z,w,h,d,mat,rx=0,ry=0,rz=0){
  const key=type+':'+mat;if(!groups.has(key))groups.set(key,{type,mat,items:[]});groups.get(key).items.push({x,y,z,w,h,d,rx,ry,rz});
 }
 const box=(x,y,z,w,h,d,mat='concrete',rz=0,ry=0,rx=0)=>add('box',x,y,z,w,h,d,mat,rx,ry,rz);
 const cylinder=(x,y,z,r,h,mat='metal',rx=0,rz=0)=>add('cylinder',x,y,z,r,h,r,mat,rx,0,rz);
 const rock=(x,y,z,w,h,d,mat='rubble',ry=0)=>add('rock',x,y,z,w,h,d,mat,0,ry,0);
 function flush(){
  for(const {type,mat,items} of groups.values()){
   const geo=type==='box'?new T.BoxGeometry(1,1,1):type==='cylinder'?new T.CylinderGeometry(1,1,1,12):new T.IcosahedronGeometry(.5,0);
   const mesh=new T.InstancedMesh(geo,mats[mat],items.length);
   items.forEach((b,i)=>{transform.position.set(b.x,b.y,b.z);transform.rotation.set(b.rx,b.ry,b.rz);transform.scale.set(b.w,b.h,b.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
   mesh.castShadow=type!=='rock'||items.length<120;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
  }
 }
 return {box,cylinder,rock,flush};
}

export function makeSea(scene){
 const mat=new T.ShaderMaterial({uniforms:{time:{value:0},fogColor:{value:new T.Color('#8a9792')}},vertexShader:`uniform float time;varying vec3 vWater;void main(){vec3 p=position;p.z+=sin(p.x*.13+time*.6)*.12+sin(p.y*.17+time*.42)*.08;vec4 w=modelMatrix*vec4(p,1.);vWater=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`uniform float time;uniform vec3 fogColor;varying vec3 vWater;void main(){vec3 n=normalize(vec3(-cos(vWater.x*.13+time*.6)*.018,1.,-cos(vWater.z*.17+time*.42)*.014));vec3 v=normalize(cameraPosition-vWater);float f=pow(1.-max(dot(n,v),0.),3.);vec3 c=mix(vec3(.075,.16,.19),vec3(.42,.52,.52),f);float glint=pow(max(dot(reflect(-normalize(vec3(-.65,.24,-.72)),n),v),0.),80.);c+=vec3(.8,.6,.3)*glint*.8;float ripple=pow(max(sin(vWater.z*.5+sin(vWater.x*.05)+time*.6),0.),14.);c+=ripple*.022;float fog=1.-exp(-pow(length(cameraPosition-vWater)*.007,2.));gl_FragColor=vec4(mix(c,fogColor,fog),1.);}`});
 const mesh=new T.Mesh(new T.PlaneGeometry(500,650,55,65),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(350,-.65,0);scene.add(mesh);return mat;
}
