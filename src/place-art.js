import * as T from 'three';

// Original, render-only additions to two EXISTING places. No floor obstacle,
// loot ID, collider, interaction or saved field is added.
export function makePlaceArt(scene,mats){
 const group=new T.Group();group.name='existing-place-detail';scene.add(group);
 const brass=new T.MeshStandardMaterial({color:'#c39a5d',roughness:.85});
 const ceramic=new T.MeshStandardMaterial({color:'#d8d0b2',roughness:.86});
 const lit=new T.MeshBasicMaterial({color:'#b6ead5'}),off=new T.MeshBasicMaterial({color:'#334d48'});
 const orange=new T.MeshBasicMaterial({color:'#dfb773'});
 const add=(geo,mat,x,y,z,name)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.name=name;group.add(m);return m;};
 const box=(x,y,z,w,h,d,mat=mats.metal,name='solid')=>add(new T.BoxGeometry(w,h,d),mat,x,y,z,name);
 const pipe=(x,y,z,r,h,mat=mats.metal,name='pipe')=>add(new T.CylinderGeometry(r,r,h,10),mat,x,y,z,name);
 function panel(lines,x,y,z,w,h,{diagram=false,ry=0}={}){
  const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d');
  g.fillStyle=diagram?'#2f4c4e':'#9b7549';g.fillRect(0,0,512,512);g.strokeStyle='#d0ccb0';g.lineWidth=3;g.strokeRect(14,14,484,484);g.fillStyle='#e2dbc1';g.font='bold 58px Arial';g.textAlign='center';
  lines.forEach((t,i)=>g.fillText(t,256,78+i*72,470));
  if(diagram){g.lineWidth=4;g.beginPath();g.moveTo(66,420);g.lineTo(446,420);g.moveTo(220,420);g.lineTo(220,260);g.lineTo(300,260);g.lineTo(300,420);for(const [x,y]of[[220,280],[300,300],[220,330]]){g.moveTo(x-45,y);g.lineTo(x+45,y);}g.stroke();g.font='22px monospace';g.fillText('04 / 147',390,468);}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  const m=add(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,side:T.DoubleSide}),x,y,z,'wall-panel');m.rotation.y=ry;m.userData.flatWall=true;return m;
 }
 // Quarter04: everything below head height sits inside the existing brick plinth.
 box(-55,1.27,-22,2.4,.14,2.1,mats.wood,'repair-table');
 box(-55.6,1.61,-22.45,.85,.55,.55,mats.teal,'repair-radio');
 box(-55.6,1.63,-22.16,.69,.31,.025,mats.dark,'radio-face');
 for(let i=0;i<3;i++)pipe(-55.85+i*.24,1.45,-22.12,.045,.04,brass,'radio-dial').rotation.x=Math.PI/2;
 const coil=add(new T.TorusGeometry(.27,.055,5,14),mats.rust,-54.45,1.47,-21.9,'cable-coil');coil.rotation.x=Math.PI/2;
 box(-54.6,1.38,-22.65,.55,.06,.45,ceramic,'repair-paper');
 for(let i=0;i<3;i++){box(-55.7+i*.44,1.38,-21.4,.3,.04,.06,brass,'tool');pipe(-55.65+i*.44,1.4,-21.42,.06,.035,mats.metal,'tool-ring');}
 // Stand clear of the window planks (front face z=-24.42). Rails attach the
 // diagram to the existing masonry instead of letting the planks cut its face.
 for(const x of [-56.2,-53.8])box(x,3.15,-24.4,.07,2.45,.2,mats.wood,'diagram-mount');
 panel(['УЗЕЛ 04','ДЕРЖАТЬ СВЯЗЬ'],-55,3.15,-24.28,2.35,2.35,{diagram:true});
 panel(['04','РЕМОНТ','ВХОД →'],-54.9,2.1,-10.46,1.25,2.05);
 // Keep the original supported frame from details.js. The redundant elevated
 // lintel had no contact with either jamb, so it is removed.
 for(const x of [-53.2,-46.8])box(x,2.0,-10.7,.12,3.4,.15,brass,'wall-jamb');
 const workSignal=box(-55.2,1.63,-22.15,.13,.06,.03,orange,'repair-cache-signal');
 // North Post: gravity-tank silhouette above its EXISTING rear/right masonry.
 // No duplicate ferry, evacuation set or ground trail.
 for(const x of [79,81])for(const z of [-25.2,-24.7])pipe(x,7.0,z,.065,2,mats.metal,'tank-support');
 const tank=pipe(80,8.65,-24.95,1.52,2.3,mats.teal,'post-gravity-tank');
 for(const y of [7.55,8.05,9.25,9.8])pipe(80,y,-24.95,1.57,.09,brass,'tank-band');
 pipe(80,10.0,-24.95,.11,.5,mats.metal,'tank-vent');
 const beacon=box(80,10.35,-24.95,.38,.22,.38,off,'post-beacon');
 panel(['07','ВОДА'],80,8.65,-23.37,1.45,1.75);
 pipe(80,4.25,-24.3,.09,4.5,mats.rust,'wall-water-pipe');
 pipe(79.5,2.05,-24.3,.09,1,mats.rust,'water-elbow').rotation.z=Math.PI/2;
 for(const x of [70,80]){box(x,2.0,-10.46,.32,2.7,.025,brass,'post-wall-stripe');box(x,3.4,-10.44,.65,.2,.025,ceramic,'post-wall-cap');}
 // Gauge shows the already finite three portions, including an empty state.
 box(79,1.0,-22.55,.31,1.04,.04,mats.dark,'water-gauge-case');
 const levels=[.69,1,1.31].map(y=>box(79,y,-22.52,.21,.2,.025,off,'water-gauge-level'));
 panel(['3','ПОРЦИИ'],80.8,2.7,-24.42,.9,1.1);
 return {group,tank,beacon,levels,workSignal,update(s){
  beacon.material=s.outpost.repaired?orange:off;
  workSignal.visible=!s.collected.includes('ruins-crate');
  levels.forEach((m,i)=>m.material=s.outpost.waterOnline&&s.outpost.waterRemaining>i?lit:off);
 }};
}
