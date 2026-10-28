import * as T from 'three';
export function createExpeditionDecor(scene,mats){
 const mesh=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;};
 function sign(text,x,y,z,width=7,height=1.3){
  const c=document.createElement('canvas');c.width=768;c.height=160;const g=c.getContext('2d');g.fillStyle='#173b3b';g.fillRect(0,0,768,160);g.strokeStyle='#d2c69e';g.lineWidth=6;g.strokeRect(7,7,754,146);g.fillStyle='#eee1bd';g.font='bold 39px Arial';g.textAlign='center';const lines=text.split('|');lines.forEach((line,i)=>g.fillText(line,384,lines.length===1?95:65+i*56));
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:t,side:T.DoubleSide}),x,y,z);return m;
 }
 sign('СЕВЕРНЫЙ ПОСТ | КРОВЛЯ • ВОДА • СВЯЗЬ',75,4.2,-10.4,7,1.5);
 sign('ТЕПЛОТРАССА ← | КОРОЧЕ • ЗАГРЯЗНЕНИЕ',20,2.6,42,6,1.3);
 sign('БЕРЕГОВАЯ ДУГА → | ОБХОД • СИЛЬНЫЙ ВЕТЕР',20,4,42,6,1.3);
 mesh(new T.CylinderGeometry(.09,.09,4.6,8),mats.metal,20,2.3,42.1);
 const roof=mesh(new T.BoxGeometry(13,.22,14),mats.teal,75,5.6,-18);
 const lamp=mesh(new T.BoxGeometry(.8,.15,.25),mats.blueLamp,75,3.8,-10.7);
 const waterLight=mesh(new T.SphereGeometry(.12,8,5),mats.blueLamp,79,2,-22.7);
 mesh(new T.CylinderGeometry(.5,.5,1.6,12),mats.teal,79,.85,-23.1);mesh(new T.CylinderGeometry(.07,.07,1,8),mats.metal,79,1.2,-22.5).rotation.x=Math.PI/2;
 mesh(new T.BoxGeometry(1.2,.8,.35),mats.wood,72,1.1,-24.3);mesh(new T.CylinderGeometry(.03,.03,3,8),mats.metal,72,2.7,-24.3);
 sign('НАСОС • ЧИСТАЯ ВОДА',79,2.5,-24.25,3,.6);sign('РАДИОЛИНИЯ',72,2,-24.25,2.5,.55);
 const patch=mesh(new T.PlaneGeometry(11,12),new T.MeshBasicMaterial({color:'#63b8af',transparent:true,opacity:.065,depthWrite:false}),75,.035,-18);patch.rotation.x=-Math.PI/2;
 // Ruptured pipe marks the short route's persistent fictional contamination.
 mesh(new T.CylinderGeometry(.6,.6,13,12),mats.rust,32,1,6).rotation.z=Math.PI/2;
 sign('РАЗРЫВ ТРУБЫ | ФОН ПОВЫШЕН',32,3,10,5,1.2);
 const ring=mesh(new T.RingGeometry(17.6,18,64),new T.MeshBasicMaterial({color:'#be8c45',side:T.DoubleSide,transparent:true,opacity:.3}),32,.04,6);ring.rotation.x=-Math.PI/2;
 const plumes=[];for(let i=0;i<7;i++){const p=mesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:'#a78a58',transparent:true,opacity:.12,depthWrite:false}),32,1+i*.55,6);p.scale.set(1+i*.2,.6,1+i*.2);plumes.push(p);}
 return {update(s){roof.visible=lamp.visible=patch.visible=s.outpost.repaired;waterLight.visible=s.outpost.waterOnline;for(let i=0;i<plumes.length;i++)plumes[i].position.x=32+Math.sin(s.time*.4+i)*.5;}};
}
