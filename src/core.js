// Deterministic game rules. Metres and seconds are game units.
export const SAVE_KEY = 'ash-coast-save-v1';
export const PARTS = ['antenna', 'cell', 'module'];
export const PART_NAMES = {antenna:'Антенна',cell:'Энергоячейка',module:'Модуль связи'};
export const SHELTER = {x:0,z:85};
export const ZONES = [{x:35,z:-61,r:24},{x:-37,z:-44,r:17}];
export const LANDMARKS = [{x:-49,z:-17,name:'Квартал 04',part:'antenna'}, {x:51,z:25,name:'Насосная',part:'cell'}, {x:34,z:-68,name:'Релейный цех',part:'module'}];
export function rng(seed=731){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function makeWorld(){
 const boxes=[];
 const add=(x,z,w,d,h,color='concrete',y=0,solid=true)=>boxes.push({x,z,w,d,h,color,y,solid});
 // The shelter is open toward the road, south side of the map.
 add(-7,85,1,13,4);add(7,85,1,13,4);add(0,91,14,1,4);add(0,85,15,14,.7,'concrete',4,false);add(0,89.5,3,1,1.4,'wood');
 // Ruined blocks: no impassable floors, entrances align with the street.
 for(const [x,z] of [[-50,-18],[-64,12],[-28,20],[-65,-44],[56,58],[75,-18]]){
  add(x-7,z,1,15,6);add(x+7,z,1,15,4.8);add(x,z-7,15,1,6);
  add(x-5,z+7,4,1,3.5);add(x+5,z+7,4,1,5);
  add(x-5,z-4,2.7,3,1.2,'brick');
  add(x-4,z-7,3,.7,2,'brick',6,false);
 }
 // Pump station: open south entrance.
 add(43,25,1,18,5,'teal');add(59,25,1,18,5,'teal');add(51,16,17,1,5);add(51,25,18,20,.6,'rust',5.2,false);
 // Industrial hall is roofless and entered through a six metre opening.
 add(22,-60,1,28,7);add(46,-60,1,28,7);add(34,-74,25,1,6);
 add(25,-46,7,1,4);add(43,-46,7,1,4);
 for(const x of [25,43])add(x,-66,3,5,2.5,'rust');
 for(const [x,z] of [[-15,49],[20,20],[-19,-12],[10,-34],[67,-56],[-82,50],[78,78]]){
  add(x,z,6,2.8,1.7,'rust');add(x-.7,z,3,2.5,.8,'dark',1.7,false);
 }
 // Shipping containers, concrete roadblocks, rubble.
 for(const [x,z,w,d] of [[62,-47,7,15],[74,-56,7,15],[-83,-8,7,15],[-78,-70,16,6],[13,-86,16,6],[-19,67,7,1],[19,67,7,1],[-13,1,5,1]])add(x,z,w,d,3.4,'rust');
 const random=rng();
 for(let i=0;i<65;i++){
  const x=(random()-.5)*190,z=(random()-.5)*185;
  if(Math.abs(x)<10 || LANDMARKS.some(l=>Math.hypot(l.x-x,l.z-z)<18)||Math.hypot(x,z-85)<22)continue;
  if(boxes.some(b=>Math.abs(b.x-x)<b.w/2+2&&Math.abs(b.z-z)<b.d/2+2))continue;
  add(x,z,.8+random()*2,1+random()*2,.4+random()*1.4,'rubble');
 }
 return {boxes,colliders:boxes.filter(b=>b.solid).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d}))};
}
export function initialState(){return {
 version:1,player:{x:0,z:82,yaw:0,pitch:0},hp:100,hunger:90,thirst:90,stamina:100,radiation:0,filter:100,
 inventory:{food:1,water:1,med:1,filter:1,ammo:9},parts:[],collected:[],time:0,kills:0,mode:'playing',
 enemies:[{id:0,x:-60,z:-1,hp:2,cool:0,homeX:-60,homeZ:-1},{id:1,x:64,z:7,hp:2,cool:0,homeX:64,homeZ:7},{id:2,x:12,z:-51,hp:2,cool:0,homeX:12,homeZ:-51},{id:3,x:-20,z:-65,hp:2,cool:0,homeX:-20,homeZ:-65}],
 attackCool:0,shotCool:0,steps:0
};}
export const LOOT = [
 ...LANDMARKS.map(l=>({id:l.part,x:l.x,z:l.z,type:'part',name:PART_NAMES[l.part]})),
 {id:'cache1',x:-17,z:52,type:'food',name:'Консервы'}, {id:'cache2',x:20,z:24,type:'water',name:'Вода'},
 {id:'cache3',x:-52,z:-12,type:'ammo',name:'Патроны × 4'}, {id:'cache4',x:52,z:31,type:'filter',name:'Фильтр'},
 {id:'cache5',x:32,z:-51,type:'med',name:'Аптечка'}, {id:'cache6',x:-27,z:24,type:'water',name:'Вода'},
 {id:'cache7',x:5,z:74,type:'food',name:'Консервы'}, {id:'cache8',x:61,z:54,type:'ammo',name:'Патроны × 4'}
];
export function collides(x,z,colliders,r=.48){
 if(x<-98+r||x>98-r||z<-98+r||z>97-r)return true;
 return colliders.some(b=>{const cx=Math.max(b.x-b.w/2,Math.min(x,b.x+b.w/2)),cz=Math.max(b.z-b.d/2,Math.min(z,b.z+b.d/2));return (x-cx)**2+(z-cz)**2<r*r;});
}
export function move(body,dx,dz,colliders,r=.48){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 for(let i=0;i<n;i++){if(!collides(body.x+dx/n,body.z,colliders,r))body.x+=dx/n;if(!collides(body.x,body.z+dz/n,colliders,r))body.z+=dz/n;}
}
export function lineClear(a,b,colliders){
 // Clip the complete segment against both AABB slabs: thin corner crossings
 // must block shots, visibility and interactions even between sample points.
 return !colliders.some(c=>{
  let enter=0,exit=1;
  for(const [start,delta,min,max] of [[a.x,b.x-a.x,c.x-c.w/2,c.x+c.w/2],[a.z,b.z-a.z,c.z-c.d/2,c.z+c.d/2]]){
   if(delta===0){if(start<min||start>max)return false;continue;}
   const t1=(min-start)/delta,t2=(max-start)/delta;
   enter=Math.max(enter,Math.min(t1,t2));exit=Math.min(exit,Math.max(t1,t2));
   if(enter>exit)return false;
  }
  return true;
 });
}
export function inShelter(s){return Math.abs(s.player.x)<6 && s.player.z>79 && s.player.z<91;}
export function weather(s){return Math.floor(s.time/100)%3===1;}
export function danger(s){if(inShelter(s))return 0;return ZONES.reduce((v,z)=>v+Math.max(0,1-Math.hypot(s.player.x-z.x,s.player.z-z.z)/z.r)*3,0)+(weather(s)?.45:0);}
export function nearest(s,colliders){
 const candidates=LOOT.filter(l=>!s.collected.includes(l.id)&&Math.hypot(l.x-s.player.x,l.z-s.player.z)<3.2&&lineClear(s.player,l,colliders));
 candidates.sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z));
 if(candidates[0])return candidates[0];
 if(Math.hypot(s.player.x,s.player.z-87)<3.3)return {id:'shelter',name:'Радиостанция убежища'};
 return null;
}
export function interact(s,colliders){
 if(s.mode!=='playing')return '';
 const obj=nearest(s,colliders);if(!obj)return '';
 if(obj.id==='shelter'){
  if(s.parts.length===3){s.mode='won';return 'Сигнал принят. На другом берегу есть живые.';}
  return `Укрытие. Для связи нужны ещё ${3-s.parts.length} детали. Здесь здоровье и доза восстанавливаются.`;
 }
 s.collected.push(obj.id);
 if(obj.type==='part')s.parts.push(obj.id);else s.inventory[obj.type]+=obj.type==='ammo'?4:1;
 return `Найдено: ${obj.name}`;
}
export function consume(s,type){
 if(s.mode!=='playing'||!s.inventory[type])return 'Нет в рюкзаке';
 if(!['food','water','med','filter'].includes(type))return '';
 s.inventory[type]--;
 if(type==='food'){s.hunger=Math.min(100,s.hunger+45);s.hp=Math.min(100,s.hp+4);}
 if(type==='water')s.thirst=Math.min(100,s.thirst+50);
 if(type==='med')s.hp=Math.min(100,s.hp+45);
 if(type==='filter')s.filter=100;
 return {food:'Консервы съедены',water:'Вода выпита',med:'Раны обработаны',filter:'Фильтр заменён'}[type];
}
export function attack(s,colliders,melee=false){
 if(s.mode!=='playing'||(melee?s.attackCool>0||s.stamina<22:s.shotCool>0||s.inventory.ammo<1))return {fired:false};
 if(melee){s.stamina-=22;s.attackCool=1.1;}else{s.inventory.ammo--;s.shotCool=.38;}
 const range=melee?3.5:36;
 const targets=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-s.player.x,e.z-s.player.z)<range&&lineClear(s.player,e,colliders));
 targets.sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z));
 for(const e of targets){
  const angle=Math.atan2(-(e.x-s.player.x),-(e.z-s.player.z));const diff=Math.atan2(Math.sin(angle-s.player.yaw),Math.cos(angle-s.player.yaw));
  if(Math.abs(diff)<(melee?.85:.15)&&Math.abs(s.player.pitch)<.45){e.hp--;if(e.hp<=0)s.kills++;else{move(e,-Math.sin(s.player.yaw)*1.5,-Math.cos(s.player.yaw)*1.5,colliders,.6);e.cool=1;}return {fired:true,hit:true};}
 }
 return {fired:true,hit:false};
}
export function tick(s,input,dt,colliders){
 if(s.mode!=='playing')return;
 dt=Math.min(.05,Math.max(0,dt));s.time+=dt;s.attackCool=Math.max(0,s.attackCool-dt);s.shotCool=Math.max(0,s.shotCool-dt);
 const safe=inShelter(s),rad=danger(s);let f=input.forward||0,side=input.side||0,n=Math.hypot(f,side);if(n>1){f/=n;side/=n;}
 const running=input.sprint&&n>0&&s.stamina>3;
 const speed=running?7.4:4.2;
 const oldX=s.player.x,oldZ=s.player.z;
 move(s.player,(-Math.sin(s.player.yaw)*f+Math.cos(s.player.yaw)*side)*speed*dt,(-Math.cos(s.player.yaw)*f-Math.sin(s.player.yaw)*side)*speed*dt,colliders);
 s.steps+=Math.hypot(s.player.x-oldX,s.player.z-oldZ);s.stamina=Math.max(0,Math.min(100,s.stamina+(running?-15:10)*dt));
 if(!safe){s.hunger=Math.max(0,s.hunger-.1*dt);s.thirst=Math.max(0,s.thirst-(running?.23:.15)*dt);}
 if(rad>0){const protectedByFilter=s.filter>0;s.filter=Math.max(0,s.filter-rad*.9*dt);s.radiation=Math.min(100,s.radiation+rad*(protectedByFilter?.28:1.4)*dt);}
 else s.radiation=Math.max(0,s.radiation-(safe?3:.035)*dt);
 if(s.radiation>65||s.hunger===0||s.thirst===0)s.hp-=((s.radiation>65?1.8:0)+(s.hunger===0?.5:0)+(s.thirst===0?1:0))*dt;
 if(safe)s.hp=Math.min(100,s.hp+3*dt);
 for(const e of s.enemies){
  if(e.hp<=0)continue;e.cool=Math.max(0,e.cool-dt);
  const dist=Math.hypot(e.x-s.player.x,e.z-s.player.z),sees=!safe&&dist<(running?27:19)&&lineClear(e,s.player,colliders);
  const tx=sees?s.player.x:e.homeX+Math.sin(s.time*.15+e.id)*3,tz=sees?s.player.z:e.homeZ+Math.cos(s.time*.15+e.id)*3;
  const d=Math.hypot(tx-e.x,tz-e.z);if(d>1.3)move(e,(tx-e.x)/d*(sees?3.5:1)*dt,(tz-e.z)/d*(sees?3.5:1)*dt,colliders,.6);
  if(sees&&dist<2&&e.cool===0){s.hp-=12;e.cool=1.3;}
 }
 s.hp=Math.max(0,s.hp);if(s.hp===0)s.mode='dead';
}
export function serialize(s){return JSON.stringify({...s,version:1});}
export function restore(raw,colliders){
 try{
  const s=JSON.parse(raw);
  if(s.version!==1||!s.player||!s.inventory||!Array.isArray(s.enemies)||s.enemies.length!==4||!Array.isArray(s.collected)||!Array.isArray(s.parts))return null;
  for(const k of ['hp','hunger','thirst','stamina','radiation','filter','time','steps','kills','attackCool','shotCool'])if(!Number.isFinite(s[k])||s[k]<0)return null;
  for(const k of ['hp','hunger','thirst','stamina','radiation','filter'])if(s[k]>100)return null;
  if(s.hp<=0||!['playing','won'].includes(s.mode))return null;
  if(![s.player.x,s.player.z,s.player.yaw,s.player.pitch].every(Number.isFinite)||collides(s.player.x,s.player.z,colliders))return null;
  for(const k of ['food','water','med','filter','ammo'])if(!Number.isInteger(s.inventory[k])||s.inventory[k]<0||s.inventory[k]>999)return null;
  if(new Set(s.parts).size!==s.parts.length||s.parts.some(p=>!PARTS.includes(p)||!s.collected.includes(p)))return null;
  if(new Set(s.collected).size!==s.collected.length||s.collected.some(p=>!LOOT.some(l=>l.id===p)))return null;
  for(const e of s.enemies)if(![e.x,e.z,e.hp,e.cool,e.homeX,e.homeZ].every(Number.isFinite)||e.hp<0||e.hp>2||Math.abs(e.x)>100||Math.abs(e.z)>100)return null;
  if(s.mode==='won'&&s.parts.length!==3)return null;
  return s;
 }catch{return null;}
}
