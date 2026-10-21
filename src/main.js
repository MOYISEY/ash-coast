import './style.css';
import {createView} from './world.js';
import {makeWorld,initialState,tick,interact,consume,attack,nearest,inShelter,danger,weather,serialize,restore,SAVE_KEY,LOOT,LANDMARKS,ZONES,PARTS,PART_NAMES} from './core.js';

const $=id=>document.getElementById(id),world=makeWorld();
let s=initialState(),screen='front',keys=new Set(),drag=false,pointerGesture=null,pointerFallback=false,view,flash=0,toastUntil=0,lastSave=0,uiTime=0,previousHp=100;
const metrics={frames:[],fps:0,frameMs:0,drawCalls:0,triangles:0};
try{view=createView($('world'),world);}catch(e){$('error').hidden=false;$('error').textContent='Не удалось запустить WebGL 2. Откройте игру в актуальном Chrome или Edge с поддержкой WebGL 2. '+e.message;throw e;}
let audio,master,ambient,lastStep=0,nextGeiger=0;
function initAudio(){
 try{
  if(audio){audio.resume();return;}
  audio=new AudioContext();master=audio.createGain();master.gain.value=.17;master.connect(audio.destination);
  const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),data=buffer.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){v=(v+(Math.random()*2-1)*.025)*.985;data[i]=v;}
  const noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;ambient=audio.createGain();ambient.gain.value=.3;noise.connect(filter).connect(ambient).connect(master);noise.start();
 }catch{}
}
function tone(freq=100,duration=.08,volume=.15,type='triangle'){
 if(!audio||!master)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.25),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain).connect(master);osc.start();osc.stop(audio.currentTime+duration);
}
function toast(message){if(!message)return;$('toast').textContent=message;$('toast').style.opacity=1;toastUntil=performance.now()+4000;}
function readSave(){try{return restore(localStorage.getItem(SAVE_KEY),world.colliders);}catch{return null;}}
function refreshSave(){const saved=readSave();$('continue-game').disabled=!saved;$('load').disabled=!saved;$('end-load').disabled=!saved;$('save-note').textContent=saved?`Сохранённый путь: ${saved.parts.length}/3 деталей · ${Math.floor(saved.time/60)} мин`:'Первый выход. Сохранения пока нет.';}
function save(manual=false){
 if(s.hp<=0)return false;
 try{localStorage.setItem(SAVE_KEY,serialize(s));lastSave=s.time;refreshSave();if(manual){toast('Путь сохранён в этом браузере');$('menu-status').textContent='Путь сохранён.';}return true;}catch{if(manual){toast('Хранилище недоступно. Браузер не разрешил сохранить путь.');$('menu-status').textContent='Хранилище браузера недоступно.';}return false;}
}
function setScreen(next){
 screen=next;keys.clear();drag=false;pointerGesture=null;
 for(const [id,which] of [['front','front'],['menu','menu'],['inventory','inventory'],['map-screen','map'],['ending','end']])$(id).hidden=which!==next;
 $('hud').hidden=next==='front';$('crosshair').style.display=next==='play'?'block':'none';
 if(next!=='play'&&document.pointerLockElement)document.exitPointerLock();
 if(ambient)ambient.gain.value=next==='play'?.35:.1;
 if(next==='inventory')drawInventory();if(next==='map')drawMap();
}
function usePointerFallback(){
 if(pointerFallback)return;pointerFallback=true;
 toast('Без захвата мыши: щелчок ЛКМ или ПРОБЕЛ — выстрел; перетаскивание мышью или стрелки — обзор.');
}
function lock(){try{const p=$('world').requestPointerLock();if(p?.catch)p.catch(usePointerFallback);}catch{usePointerFallback();}}
function begin(load=false){
 const saved=load?readSave():null;if(load&&!saved){toast('Сохранение не найдено или повреждено');return;}
 s=saved||initialState();previousHp=s.hp;lastSave=s.time;lastStep=s.steps;flash=0;initAudio();
 if(s.mode==='won'){finish();return;}
 setScreen('play');if(!load)save();toast(load?'Путь восстановлен':'Вы в убежище «Прилив». M — карта. Найдите три детали и вернитесь к радиостанции.');updateHUD();
}
$('new-game').onclick=()=>begin();$('continue-game').onclick=()=>begin(true);$('restart').onclick=()=>begin();$('end-new').onclick=()=>begin();$('end-load').onclick=()=>begin(true);
$('pause-btn').onclick=()=>setScreen('menu');$('resume').onclick=()=>setScreen('play');$('save').onclick=()=>save(true);$('load').onclick=()=>begin(true);
$('map-open').onclick=()=>setScreen('map');$('map-close').onclick=()=>setScreen('play');$('inventory-close').onclick=()=>setScreen('play');
$('quality').onchange=e=>view.setQuality(e.target.value);$('sound').onchange=e=>{if(master)master.gain.value=e.target.checked?.17:0;};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===$('world')){pointerFallback=false;drag=false;pointerGesture=null;}else if(screen==='play')setScreen('menu');});
document.addEventListener('pointerlockerror',usePointerFallback);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='play')setScreen('menu');});
addEventListener('blur',()=>{keys.clear();if(screen==='play')setScreen('menu');});
$('world').addEventListener('mousedown',e=>{
 if(screen!=='play')return;
 if(document.pointerLockElement===$('world')){if(e.button===0)shoot();return;}
 if(e.button!==0&&e.button!==2)return;
 drag=true;pointerGesture={x:e.clientX,y:e.clientY,moved:false,fireOnRelease:e.button===0&&pointerFallback};
 if(e.button===0&&!pointerFallback)lock();
});
addEventListener('mouseup',e=>{
 const gesture=pointerGesture;drag=false;pointerGesture=null;
 if(screen==='play'&&!document.pointerLockElement&&e.target===$('world')&&e.button===0&&gesture?.fireOnRelease&&!gesture.moved)shoot();
});
addEventListener('mousemove',e=>{
 if(screen!=='play'||(document.pointerLockElement!==$('world')&&!drag))return;
 if(!document.pointerLockElement&&pointerGesture){
  if(Math.hypot(e.clientX-pointerGesture.x,e.clientY-pointerGesture.y)>5)pointerGesture.moved=true;
  if(!pointerGesture.moved)return;
 }
 s.player.yaw-=e.movementX*.0022;s.player.pitch=Math.max(-1.2,Math.min(1.15,s.player.pitch-e.movementY*.0022));
});
$('world').addEventListener('contextmenu',e=>e.preventDefault());
function shoot(melee=false){const result=attack(s,world.colliders,melee);if(!result.fired){if(!melee&&s.inventory.ammo===0)toast('Патронов нет. Q — удар вблизи; бегите к укрытию.');return;}flash=1;tone(melee?65:160,melee?.12:.21,melee?.4:1,'sawtooth');if(result.hit){toast('Попадание');tone(320,.08,.2);}updateHUD();}
addEventListener('keydown',e=>{
 if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F5','F9'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.repeat)return;
 if(e.code==='Escape'){
  if(screen==='play')setScreen('menu');else if(['menu','inventory','map'].includes(screen))setScreen('play');return;
 }
 if(e.code==='KeyM'&&['play','map'].includes(screen)){setScreen(screen==='map'?'play':'map');return;}
 if(['KeyI','Tab'].includes(e.code)&&['play','inventory'].includes(screen)){setScreen(screen==='inventory'?'play':'inventory');return;}
 if(screen!=='play')return;
 if(e.code==='KeyE'){const msg=interact(s,world.colliders);toast(msg);if(msg)tone(500,.12,.2);if(s.mode==='won'){save();finish();}updateHUD();}
 if(e.code==='KeyQ')shoot(true);if(e.code==='Space')shoot();if(e.code==='KeyR'){s.player.yaw=0;s.player.pitch=0;}
 const types={Digit1:'food',Digit2:'water',Digit3:'med',Digit4:'filter'};if(types[e.code]){toast(consume(s,types[e.code]));updateHUD();}
 if(e.code==='F5')save(true);if(e.code==='F9')begin(true);
});
addEventListener('keyup',e=>keys.delete(e.code));
function finish(){
 setScreen('end');const won=s.mode==='won';
 $('end-label').textContent=won?'СИГНАЛ ДОШЁЛ / КОНЕЦ ПЕРВОГО СРЕЗА':'ЭТОТ ПУТЬ ОБОРВАЛСЯ';
 $('end-title').textContent=won?'«Прилив», мы вас слышим.':'Берег сохранит тишину';
 $('end-text').textContent=won?'Из треска рождается чужой голос. На другом берегу ответили. Сегодня вы вернули этому месту надежду.':'Прибрежный район не прощает истощения. Воспользуйтесь сохранением или начните новый путь. В убежище можно восстановить здоровье и снизить накопленную игровую дозу.';
 $('end-stats').textContent=`Детали ${s.parts.length}/3 · ${Math.floor(s.time/60)} мин ${Math.floor(s.time%60)} сек · Пройдено ${Math.round(s.steps)} м · Устранено угроз: ${s.kills}`;refreshSave();
}
function updateHUD(){
 for(const k of ['hp','stamina'])$(k).value=s[k];for(const k of ['hp','hunger','thirst'])$(k+'-val').textContent=Math.ceil(s[k]);
 $('rad-val').textContent=s.radiation.toFixed(1);const d=danger(s);$('rad-state').textContent=d>1?'ОПАСНАЯ ЗОНА':d>.1?'ФОН ПОВЫШЕН':'ФОН НИЗКИЙ';$('rad-state').style.color=d>1?'#edb46b':'#b9cbb5';
 $('filter-val').textContent=`ФИЛЬТР ${Math.ceil(s.filter)}% · ПАТРОНЫ ${s.inventory.ammo}`;
 $('mission').textContent=s.parts.length===3?'Вернитесь в убежище и включите передатчик [E]':`Детали передатчика: ${s.parts.length} / 3`;
 $('checklist').innerHTML=PARTS.map(p=>`<div class="${s.parts.includes(p)?'done':''}">${s.parts.includes(p)?'◆':'◇'} ${PART_NAMES[p]}</div>`).join('');
 let loc='Прибрежная дорога';if(inShelter(s))loc='Убежище «Прилив»';else for(const l of LANDMARKS)if(Math.hypot(l.x-s.player.x,l.z-s.player.z)<25)loc=l.name;
 if(s.player.x>82)loc='Старые причалы';$('location').textContent=loc;$('weather').textContent=weather(s)?'Пепельный шквал · фон растёт':'Тихий пепел';
 const yaw=((s.player.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),dirs=['С','СЗ','З','ЮЗ','Ю','ЮВ','В','СВ'];$('compass').textContent=`· · · ${dirs[Math.round(yaw/(Math.PI/4))%8]} · · · ${Math.round((360-yaw*180/Math.PI)%360)}°`;
 const obj=nearest(s,world.colliders);$('prompt').style.display=obj&&screen==='play'?'block':'none';$('prompt').textContent=obj?`[E] ${obj.name}`:'';
 if(s.hp<previousHp-.1){$('damage').style.opacity=.65;setTimeout(()=>$('damage').style.opacity=0,180);}previousHp=s.hp;
}
function drawInventory(){
 const info={food:['Консервы','+45 сытости · +4 здоровья'],water:['Чистая вода','+50 воды'],med:['Аптечка','+45 здоровья'],filter:['Фильтр','Восстановить фильтр до 100%']};
 $('inventory-items').replaceChildren();
 for(const [type,[name,description]] of Object.entries(info)){
  const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');text.textContent=`${name} × ${s.inventory[type]}`;const small=document.createElement('small');small.textContent=description;text.append(small);button.textContent='ИСПОЛЬЗОВАТЬ';button.disabled=s.inventory[type]<1;button.onclick=()=>{toast(consume(s,type));drawInventory();updateHUD();};row.append(text,button);$('inventory-items').append(row);
 }
 const ammo=document.createElement('p');ammo.textContent=`Патроны: ${s.inventory.ammo}. Пепельнику нужны два попадания; выстрелы не проходят через стены.`;$('inventory-items').append(ammo);$('parts-info').textContent=`Передатчик: ${s.parts.map(p=>PART_NAMES[p]).join(', ')||'детали пока не найдены'}`;
}
function drawMap(){
 const c=$('map'),g=c.getContext('2d'),size=600,ox=60,oy=20,scale=2.65;
 const X=x=>ox+size/2+x*scale,Z=z=>oy+size/2+z*scale;
 g.fillStyle='#d3ceb2';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#8b947e';g.lineWidth=1;
 for(let n=-100;n<=100;n+=20){g.beginPath();g.moveTo(X(n),Z(-100));g.lineTo(X(n),Z(100));g.stroke();g.beginPath();g.moveTo(X(-100),Z(n));g.lineTo(X(100),Z(n));g.stroke();}
 g.fillStyle='#77958a';g.fillRect(X(98),Z(-100),80,200*scale);g.fillStyle='#6c7762';g.font='bold 13px Arial';g.fillText('С ↑',X(-98),Z(-105));g.fillText('МОРЕ',X(102),Z(70));
 g.strokeStyle='#a09f86';g.lineWidth=9;for(const [a,b] of [[[-1,-98],[-1,97]],[[-98,43],[98,43]],[[-98,-35],[98,-35]],[[-39,-86],[-39,55]],[[52,-85],[52,70]]]){g.beginPath();g.moveTo(X(a[0]),Z(a[1]));g.lineTo(X(b[0]),Z(b[1]));g.stroke();}
 g.fillStyle='#657462';for(const b of world.colliders)g.fillRect(X(b.x-b.w/2),Z(b.z-b.d/2),Math.max(2,b.w*scale),Math.max(2,b.d*scale));
 for(const zone of ZONES){g.save();g.beginPath();g.arc(X(zone.x),Z(zone.z),zone.r*scale,0,Math.PI*2);g.clip();g.fillStyle='#9a7b4255';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#9b7c4777';g.lineWidth=1;for(let i=-700;i<800;i+=9){g.beginPath();g.moveTo(i,0);g.lineTo(i+700,700);g.stroke();}g.restore();}
 const label=(text,x,z,color='#304b3e')=>{g.font='bold 13px Arial';g.fillStyle='#e4dec9';const w=g.measureText(text).width;g.fillRect(X(x)-4,Z(z)-14,w+8,21);g.fillStyle=color;g.fillText(text,X(x),Z(z));};
 for(const l of LANDMARKS){g.fillStyle=s.parts.includes(l.part)?'#53816b':'#bc792f';g.beginPath();g.arc(X(l.x),Z(l.z),7,0,Math.PI*2);g.fill();label(`${s.parts.includes(l.part)?'✓':'◆'} ${l.name}`,l.x-18,l.z-12);}
 label('⌂ УБЕЖИЩЕ',-14,94);g.save();g.translate(X(s.player.x),Z(s.player.z));g.rotate(-s.player.yaw);g.fillStyle='#203c3a';g.strokeStyle='#f2db9e';g.lineWidth=2;g.beginPath();g.moveTo(0,-10);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();
}
let previous=performance.now(),fpsTime=previous,fpsFrames=0;
function frame(now){
 const dt=Math.min((now-previous)/1000,.05),rawMs=now-previous;previous=now;flash=Math.max(0,flash-dt*7);
 if(screen==='play'){
  if(keys.has('ArrowLeft'))s.player.yaw+=dt*1.7;if(keys.has('ArrowRight'))s.player.yaw-=dt*1.7;
  if(keys.has('ArrowUp'))s.player.pitch=Math.min(1.1,s.player.pitch+dt);if(keys.has('ArrowDown'))s.player.pitch=Math.max(-1.1,s.player.pitch-dt);
  tick(s,{forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')},dt,world.colliders);
  if(s.steps-lastStep>2.3){tone(65,.055,.08);lastStep=s.steps;}
  if(danger(s)>.1&&s.time>nextGeiger){tone(1600,.018,.12,'square');nextGeiger=s.time+.15+Math.random()/(danger(s)*3);}
  if(s.time-lastSave>=20)save();
  if(s.mode==='dead')finish();
 }
 uiTime+=dt;if(uiTime>.12){updateHUD();uiTime=0;}
 if(now>toastUntil)$('toast').style.opacity=0;
 view.render(s,{menu:screen==='front',dt,flash});
 if(screen==='play'){metrics.frames.push(rawMs);if(metrics.frames.length>600)metrics.frames.shift();}
 fpsFrames++;if(now-fpsTime>1000){metrics.fps=Math.round(fpsFrames*1000/(now-fpsTime));metrics.drawCalls=view.renderer.info.render.calls;metrics.triangles=view.renderer.info.render.triangles;metrics.frameMs=metrics.frames.length?metrics.frames.reduce((a,b)=>a+b,0)/metrics.frames.length:0;$('perf').textContent=`${metrics.fps} FPS · ${view.quality.toUpperCase()} · F5 СОХРАНИТЬ / F9 ЗАГРУЗИТЬ`;fpsTime=now;fpsFrames=0;}
 $('telemetry').textContent=JSON.stringify({state:s,screen,metrics:{...metrics,frames:undefined,width:innerWidth,height:innerHeight,pixelRatio:view.renderer.getPixelRatio(),quality:view.quality,gpu:(()=>{const gl=view.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);})()}});
 requestAnimationFrame(frame);
}
refreshSave();updateHUD();requestAnimationFrame(frame);
// Read-only telemetry for repeatable local QA. Mutation helpers exist only on ?qa=1.
window.__ASH__={snapshot:()=>structuredClone(s),metrics:()=>({...metrics,frames:[...metrics.frames],width:innerWidth,height:innerHeight,pixelRatio:view.renderer.getPixelRatio(),quality:view.quality,renderer:view.renderer.getContext().getParameter(view.renderer.getContext().RENDERER)}),screen:()=>screen};
if(new URLSearchParams(location.search).get('qa')==='1')window.__ASH_QA__={setState:next=>{s=structuredClone(next);previousHp=s.hp;updateHUD();},step:(seconds,input={})=>{for(let t=0;t<seconds;t+=.02)tick(s,input,Math.min(.02,seconds-t),world.colliders);updateHUD();if(s.mode==='dead')finish();},setScreen,world:()=>structuredClone(world)};
