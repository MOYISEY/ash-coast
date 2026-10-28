import * as T from 'three';
// Original macro terrain shading; one ground draw, no post-processing passes.
export function landscapeGround(scene,surfaces){
 const map=surfaces.texture('soil');map.repeat.set(36,72);
 const mat=new T.MeshStandardMaterial({map,color:'#b5b4a3',roughness:1,bumpMap:map,bumpScale:.07});
 mat.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLandscape;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLandscape=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLandscape;');
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 lp=vLandscape.xz;
   float ashBand=sin(lp.x*.14+sin(lp.y*.062)*2.5)+cos(lp.y*.09+lp.x*.035);
   float paleAsh=smoothstep(-.8,1.4,ashBand);
   float drift=pow(.5+.5*sin(lp.x*1.8+lp.y*.63+sin(lp.y*.12)*2.),7.);
   vec3 soil=mix(vec3(.53,.64,.62),vec3(1.15,1.08,.85),paleAsh);
   float coast=smoothstep(65.,99.,lp.x);
   soil=mix(soil,vec3(.54,.64,.65),coast*.48);
   diffuseColor.rgb*=soil*(1.-drift*.07);
  `);
 };
 mat.customProgramCacheKey=()=> 'ash-landscape-040';
 const ground=new T.Mesh(new T.PlaneGeometry(320,650),mat);ground.rotation.x=-Math.PI/2;ground.position.set(-60,-.06,0);ground.receiveShadow=true;scene.add(ground);
 // Layered offshore/inland horizon, outside the saved movement domain.
 const geo=new T.PlaneGeometry(130,400,12,30),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setZ(i,Math.pow(Math.max(0,Math.sin(z*.031)+Math.cos(x*.047+z*.013)*.6),2)*8+8);}
 geo.computeVertexNormals();const ridge=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#586867',roughness:1}));ridge.rotation.x=-Math.PI/2;ridge.position.set(-186,0,-10);scene.add(ridge);
 return ground;
}
