import {STORM,OUTPOST,ROUTES,inBaseShelter,inOutpost,stormCovered,stormStatus,stormDose,outpostNodes,interactOutpost,validExpedition} from './expedition.js';
export {STORM,OUTPOST,ROUTES,inBaseShelter,stormCovered,stormStatus} from './expedition.js';
// Deterministic game rules. Metres and seconds are game units.
export const SAVE_KEY = 'ash-coast-save-v3';
export const LEGACY_SAVE_KEY = 'ash-coast-save-v2';
export const LEGACY_SAVE_KEYS = ['ash-coast-save-v2','ash-coast-save-v1'];
export const PARTS = ['antenna', 'cell', 'module'];
export const PART_NAMES = {antenna:'Антенна',cell:'Энергоячейка',module:'Модуль связи'};
export const SHELTER = {x:0,z:85};
export const ZONES = [{x:35,z:-61,r:24,strength:6},{x:-37,z:-44,r:17,strength:4},{x:32,z:6,r:18,strength:2}];
export const WORKSHOP = {x:4,z:85};
export const SERVICE_GATE = {x:47.5,z:-56};
export const PURIFIER_BOUNDS = {x:-5.2,z:87,w:1.5,d:.8};
export const MATERIAL_NAMES = {scrap:'Металл',cloth:'Ткань',wire:'Провод',sorbent:'Сорбент'};
export const UPGRADES = {
 workbench:{name:'Верстак',cost:{scrap:3,cloth:1},description:'Открывает ремонтный комплект поста, фильтры, аптечки и привод шлюза.'},
 purifier:{name:'Очиститель убежища',cost:{scrap:3,wire:1,sorbent:1},requires:'workbench',description:'В «Приливе» игровая доза снижается на 3/с вместо 0,6/с. Раны лечит только аптечка [3].'}
};
export const RECIPES = {
 outpostKit:{name:'Ремонтный комплект поста',cost:{scrap:2,cloth:1,wire:1},result:'outpostKit',description:'Восстанавливает кровлю Северного поста; открывает насос и радиолинию. Установи внутри здания [E].'},
 filter:{name:'Сменный фильтр',cost:{cloth:1,sorbent:1},result:'filter',description:'Восстанавливает запас фильтра до 100% при использовании [4].'},
 med:{name:'Аптечка',cost:{cloth:2,sorbent:1},result:'med',description:'Восстанавливает 45 здоровья [3].'},
 gateKit:{name:'Привод вентиляционного шлюза',cost:{scrap:3,wire:2},result:'gateKit',description:'Установите [E] у восточной двери цеха: откроет вход и продует восточный проход.'}
};
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
 add(22,-60,1,28,7);add(46,-66.5,1,15,7);add(46,-49.5,1,7,7);add(34,-74,25,1,6);
 add(46,-56,1,6,5,'gate');boxes.at(-1).kind='serviceGate';
 add(25,-46,7,1,4);add(43,-46,7,1,4);
 for(const x of [25,43])add(x,-66,3,5,2.5,'rust');
 add(4.7,86.6,2,1.3,1,'wood');
 add(-5.2,87,1.5,.8,2,'teal');boxes.at(-1).kind='purifier';
 for(const [x,z,color] of [[-53,-10,'rust'],[-47,-10,'rust'],[47.5,34.2,'teal'],[54.5,34.2,'teal'],[28.5,-45.4,'hazard'],[39.5,-45.4,'hazard']]){add(x,z,.18,.2,4.2,color);boxes.at(-1).kind='entryPost';}
 // Distinct silhouettes: an apartment shell and the pump's four tower piers.
 add(-84,8,10,15,18,'apartment');
 for(const x of [65.5,70.5])for(const z of [22.5,27.5])add(x,z,.45,.45,10,'metal');
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
 return {boxes,colliders:boxes.filter(b=>b.solid).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d,...(b.kind?{kind:b.kind}:{})}))};
}
export function activeColliders(s,colliders){return colliders.filter(c=>(c.kind!=='serviceGate'||!s.gateOpened)&&(c.kind!=='purifier'||s.shelter.purifier));}
export function initialState(){return {
 version:3,player:{x:0,z:82,yaw:0,pitch:0},hp:100,hunger:90,thirst:90,stamina:100,radiation:0,filter:60,
 inventory:{food:1,water:1,med:1,filter:1,ammo:9,scrap:0,cloth:0,wire:0,sorbent:0,gateKit:0,outpostKit:0},parts:[],collected:[],time:0,kills:0,mode:'playing',
 outpost:{repaired:false,waterOnline:false,waterRemaining:0,waterTaken:0},storm:{exposed:0,sheltered:0},
 shelter:{workbench:false,purifier:false},gateOpened:false,crafted:0,lastHit:null,
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
export const MATERIAL_CRATES = [
 {id:'relay-crate',x:20,z:48,type:'materials',name:'Ящик ремонтной бригады',contents:{scrap:3,cloth:1,wire:1}},
 {id:'shore-crate',x:9,z:73,type:'materials',name:'Ящик у убежища',contents:{scrap:2,cloth:1}},
 {id:'garage-crate',x:-28,z:22,type:'materials',name:'Запас гаража',contents:{scrap:3,wire:1}},
 {id:'ruins-crate',x:-49,z:-14,type:'materials',name:'Сумка ремонтника',contents:{scrap:1,cloth:2,sorbent:1}},
 {id:'pump-crate',x:53,z:27,type:'materials',name:'Запас насосной',contents:{scrap:2,cloth:1,wire:1}},
 {id:'coast-crate',x:81,z:-5,type:'materials',name:'Береговой склад',contents:{scrap:2,wire:2,sorbent:1}},
 {id:'hot-crate',x:-37,z:-44,type:'materials',name:'Запас в заражённой воронке',contents:{scrap:5,cloth:2,sorbent:3}}
];
LOOT.push(...MATERIAL_CRATES);
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
export function inShelter(s){return inBaseShelter(s)||inOutpost(s);}
export function weather(s){return stormStatus(s).phase==='active';}
export function danger(s){
 if(inShelter(s))return 0;
 const ventilated=s.gateOpened&&s.player.x>30&&s.player.x<47&&s.player.z<-50&&s.player.z>-73;
 return ZONES.reduce((v,z,i)=>v+Math.max(0,1-Math.hypot(s.player.x-z.x,s.player.z-z.z)/z.r)*z.strength*(i===0&&ventilated?.12:1),0)+stormDose(s);
}
export function nearest(s,colliders){
 colliders=activeColliders(s,colliders);
 const candidates=LOOT.filter(l=>!s.collected.includes(l.id)&&Math.hypot(l.x-s.player.x,l.z-s.player.z)<3.2&&lineClear(s.player,l,colliders));
 candidates.sort((a,b)=>(a.type==='part'?0:1)-(b.type==='part'?0:1)||Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z));
 if(candidates[0])return candidates[0];
 const post=outpostNodes(s).filter(n=>Math.hypot(n.x-s.player.x,n.z-s.player.z)<3.2&&lineClear(s.player,n,colliders)).sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z))[0];if(post)return post;
 if(Math.hypot(s.player.x,s.player.z-87)<3.3)return {id:'shelter',name:'Радиостанция убежища'};
 if(inShelter(s)&&Math.hypot(s.player.x-WORKSHOP.x,s.player.z-WORKSHOP.z)<3)return {id:'workshop',name:'Мастерская убежища [B]'};
 if(Math.hypot(s.player.x-SERVICE_GATE.x,s.player.z-SERVICE_GATE.z)<3.3)return {id:'serviceGate',name:s.gateOpened?'Шлюз открыт · проход проветривается':s.inventory.gateKit?'Установить привод шлюза':'Шлюз: нужен привод из мастерской'};
 return null;
}
export function interact(s,colliders){
 if(s.mode!=='playing')return '';
 const obj=nearest(s,colliders);if(!obj)return '';
 if(obj.id.startsWith('outpost'))return interactOutpost(s,obj.id);
 if(obj.id==='workshop')return 'Мастерская: [B] — рецепты и улучшения убежища.';
 if(obj.id==='serviceGate'){
  if(s.gateOpened)return 'Шлюз уже открыт. Восточный проход продувается.';
  if(!s.inventory.gateKit)return 'Для шлюза нужен привод: 3 металла + 2 провода на верстаке убежища.';
  s.inventory.gateKit--;s.gateOpened=true;return 'Шлюз открыт. Вентиляция снизила фон в восточном проходе цеха.';
 }
 if(obj.id==='shelter')return 'Прилив — начало пути. Верстак [B]; после бури восстанови Северный пост и свяжи его с нами. Три детали и 1 металл + 1 провод нужны там.';
 s.collected.push(obj.id);
 if(obj.type==='part')s.parts.push(obj.id);
 else if(obj.type==='materials'){for(const [key,amount] of Object.entries(obj.contents))s.inventory[key]+=amount;}
 else s.inventory[obj.type]+=obj.type==='ammo'?4:1;
 return `Найдено: ${obj.name}${obj.contents?' · '+Object.entries(obj.contents).map(([k,v])=>MATERIAL_NAMES[k]+' +'+v).join(', '):''}`;
}
export function productionCheck(s,id,upgrade=false){
 const table=upgrade?UPGRADES:RECIPES,recipe=Object.hasOwn(table,id)?table[id]:null;
 if(!recipe||s.mode!=='playing')return 'Недоступно';
 if(!inBaseShelter(s))return 'Только в убежище';
 if(upgrade&&s.shelter[id])return 'Уже установлено';
 if(upgrade&&id==='purifier'&&collides(s.player.x,s.player.z,[PURIFIER_BOUNDS]))return 'Освободите место у левой стены';
 if((!upgrade||recipe.requires)&&!s.shelter.workbench)return 'Сначала оборудуйте верстак';
 if(!upgrade&&id==='outpostKit'&&(s.outpost.repaired||s.inventory.outpostKit))return s.outpost.repaired?'Пост уже восстановлен':'Комплект уже в рюкзаке';
 if(!upgrade&&id==='gateKit'&&(s.gateOpened||s.inventory.gateKit))return s.gateOpened?'Шлюз уже открыт':'Привод уже в рюкзаке';
 if(!upgrade&&s.inventory[recipe.result]>=8)return 'Запас заполнен';
 if(Object.entries(recipe.cost).some(([k,v])=>!Number.isInteger(s.inventory[k])||s.inventory[k]<v))return 'Не хватает материалов';
 if(!upgrade&&['filter','med'].includes(id)&&!s.outpost.repaired&&!s.inventory.outpostKit&&s.inventory.cloth-recipe.cost.cloth<1)return 'Оставь 1 ткань для ремонтного комплекта поста';
 return '';
}
export function produce(s,id,upgrade=false){
 const error=productionCheck(s,id,upgrade);if(error)return {ok:false,message:error};
 const recipe=(upgrade?UPGRADES:RECIPES)[id];
 for(const [k,v] of Object.entries(recipe.cost))s.inventory[k]-=v;
 if(upgrade)s.shelter[id]=true;else{s.inventory[recipe.result]++;s.crafted++;}
 return {ok:true,message:(upgrade?'Установлено: ':'Изготовлено: ')+recipe.name};
}
const CONSUMABLE_STAT={food:'hunger',water:'thirst',med:'hp',filter:'filter'};
export function canConsume(s,type){return Object.hasOwn(CONSUMABLE_STAT,type)&&s.mode==='playing'&&Number.isInteger(s.inventory[type])&&s.inventory[type]>0&&s[CONSUMABLE_STAT[type]]<100;}
export function consume(s,type){
 if(s.mode!=='playing'||!Number.isInteger(s.inventory[type])||s.inventory[type]<1)return 'Нет в рюкзаке';
 if(!Object.hasOwn(CONSUMABLE_STAT,type))return '';
 if(s[CONSUMABLE_STAT[type]]>=100)return 'Не требуется: показатель полный, предмет сохранён.';
 s.inventory[type]--;
 if(type==='food')s.hunger=Math.min(100,s.hunger+45);
 if(type==='water')s.thirst=Math.min(100,s.thirst+50);
 if(type==='med')s.hp=Math.min(100,s.hp+45);
 if(type==='filter')s.filter=100;
 return {food:'Консервы съедены',water:'Вода выпита',med:'Раны обработаны',filter:'Фильтр заменён'}[type];
}
export function attack(s,colliders,melee=false){
 colliders=activeColliders(s,colliders);
 if(s.mode!=='playing'||(melee?s.attackCool>0||s.stamina<22:s.shotCool>0||s.inventory.ammo<1))return {fired:false};
 if(melee){s.stamina-=22;s.attackCool=1.1;}else{s.inventory.ammo--;s.shotCool=.38;}
 const range=melee?3.5:36;
 const targets=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-s.player.x,e.z-s.player.z)<range&&lineClear(s.player,e,colliders));
 targets.sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z));
 for(const e of targets){
  const angle=Math.atan2(-(e.x-s.player.x),-(e.z-s.player.z));const diff=Math.atan2(Math.sin(angle-s.player.yaw),Math.cos(angle-s.player.yaw));
  if(Math.abs(diff)<(melee?.85:.15)&&Math.abs(s.player.pitch)<.45){e.hp--;if(e.hp<=0)s.kills++;else{move(e,-Math.sin(s.player.yaw)*1.5,-Math.cos(s.player.yaw)*1.5,colliders,.6);e.cool=1;}return {fired:true,hit:true,killed:e.hp<=0};}
 }
 return {fired:true,hit:false};
}
export function tick(s,input,dt,colliders){
 if(s.mode!=='playing')return;
 colliders=activeColliders(s,colliders);
 dt=Math.min(.05,Math.max(0,dt));const beforeTime=s.time;s.time+=dt;
 const stormDt=Math.max(0,Math.min(s.time,STORM.endsAt)-Math.max(beforeTime,STORM.startsAt));
 s.storm[stormCovered(s)?'sheltered':'exposed']+=stormDt;s.attackCool=Math.max(0,s.attackCool-dt);s.shotCool=Math.max(0,s.shotCool-dt);
 const safe=inShelter(s),rad=danger(s);let f=input.forward||0,side=input.side||0,n=Math.hypot(f,side);if(n>1){f/=n;side/=n;}
 const running=input.sprint&&n>0&&s.stamina>3;
 const speed=(running?7.4:4.2)*(weather(s)&&!stormCovered(s)?.78:1);
 const oldX=s.player.x,oldZ=s.player.z;
 move(s.player,(-Math.sin(s.player.yaw)*f+Math.cos(s.player.yaw)*side)*speed*dt,(-Math.cos(s.player.yaw)*f-Math.sin(s.player.yaw)*side)*speed*dt,colliders);
 s.steps+=Math.hypot(s.player.x-oldX,s.player.z-oldZ);s.stamina=Math.max(0,Math.min(100,s.stamina+(running?-15:10)*dt));
 if(!safe){s.hunger=Math.max(0,s.hunger-.1*dt);s.thirst=Math.max(0,s.thirst-((running?.23:.15)+(weather(s)&&!stormCovered(s)?.45:0))*dt);}
 if(rad>0){const protectedByFilter=s.filter>0;s.filter=Math.max(0,s.filter-rad*1.2*dt);s.radiation=Math.min(100,s.radiation+rad*(protectedByFilter?.35:1.8)*dt);}
 else s.radiation=Math.max(0,s.radiation-(safe?(inBaseShelter(s)&&s.shelter.purifier?3:.6):.035)*dt);
 if(s.radiation>65||s.hunger===0||s.thirst===0)s.hp-=((s.radiation>65?1.8:0)+(s.hunger===0?.5:0)+(s.thirst===0?1:0))*dt;
 for(const e of s.enemies){
  if(e.hp<=0)continue;e.cool=Math.max(0,e.cool-dt);
  const dist=Math.hypot(e.x-s.player.x,e.z-s.player.z),sees=!safe&&dist<(running?27:19)&&lineClear(e,s.player,colliders);
  const tx=sees?s.player.x:e.homeX+Math.sin(s.time*.15+e.id)*3,tz=sees?s.player.z:e.homeZ+Math.cos(s.time*.15+e.id)*3;
  const d=Math.hypot(tx-e.x,tz-e.z);if(d>1.3)move(e,(tx-e.x)/d*(sees?3.5:1)*dt,(tz-e.z)/d*(sees?3.5:1)*dt,colliders,.6);
  if(sees&&dist<2&&e.cool===0){s.hp-=12;e.cool=1.3;s.lastHit={x:e.x,z:e.z,time:s.time,kind:'enemy'};}
 }
 s.hp=Math.max(0,s.hp);if(s.hp===0)s.mode='dead';
}
export function serialize(s){return JSON.stringify({...s,version:3});}
export function restore(raw,colliders){
 try{
  const s=JSON.parse(raw);
  if(s.version!==3||!s.player||!s.inventory||!s.shelter||!Array.isArray(s.enemies)||s.enemies.length!==4||!Array.isArray(s.collected)||!Array.isArray(s.parts))return null;
  if(typeof s.shelter.workbench!=='boolean'||typeof s.shelter.purifier!=='boolean'||typeof s.gateOpened!=='boolean'||(s.shelter.purifier&&!s.shelter.workbench))return null;
  if((s.gateOpened||s.inventory.gateKit>0)&&!s.shelter.workbench)return null;
  for(const k of ['hp','hunger','thirst','stamina','radiation','filter','time','steps','kills','attackCool','shotCool'])if(!Number.isFinite(s[k])||s[k]<0)return null;
  for(const k of ['hp','hunger','thirst','stamina','radiation','filter'])if(s[k]>100)return null;
  if(s.hp<=0||!['playing','won'].includes(s.mode))return null;
  if(![s.player.x,s.player.z,s.player.yaw,s.player.pitch].every(Number.isFinite)||Math.abs(s.player.pitch)>1.21||collides(s.player.x,s.player.z,activeColliders(s,colliders)))return null;
  for(const k of ['food','water','med','filter','ammo','scrap','cloth','wire','sorbent','gateKit','outpostKit'])if(!Number.isInteger(s.inventory[k])||s.inventory[k]<0||s.inventory[k]>999)return null;
  if(s.inventory.gateKit>1||(s.gateOpened&&s.inventory.gateKit)||!Number.isInteger(s.crafted)||s.crafted<0||s.crafted>999)return null;
  if(new Set(s.parts).size!==s.parts.length||s.parts.some(p=>!PARTS.includes(p)||!s.collected.includes(p)))return null;
  if(new Set(s.collected).size!==s.collected.length||s.collected.some(p=>!LOOT.some(l=>l.id===p)))return null;
  if(PARTS.some(p=>s.collected.includes(p)!==s.parts.includes(p)))return null;
  if(new Set(s.enemies.map(e=>e.id)).size!==4)return null;
  for(const e of s.enemies)if(![e.x,e.z,e.hp,e.cool,e.homeX,e.homeZ].every(Number.isFinite)||![0,1,2,3].includes(e.id)||e.hp<0||e.hp>2||e.cool<0||e.cool>2||Math.abs(e.x)>100||Math.abs(e.z)>100||Math.abs(e.homeX)>100||Math.abs(e.homeZ)>100)return null;
  if(s.lastHit!==null&&(!s.lastHit||s.lastHit.kind!=='enemy'||![s.lastHit.x,s.lastHit.z,s.lastHit.time].every(Number.isFinite)||s.lastHit.time>s.time))return null;
  if(s.mode==='won'&&s.parts.length!==3)return null;
  if(!validExpedition(s))return null;
  return s;
 }catch{return null;}
}
