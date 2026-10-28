import {mapRouteHelp} from './map-copy.js';
import {explorationAt,explorationCaption} from './exploration.js';
import './style.css';
import './candidate.css';
import {createView} from './world.js';
import {createSaveCoordinator,BACKUP_KEY,SAFETY_KEY} from './save-coordinator.js';
import {makeWorld,initialState,tick,interact,consume,canConsume,attack,nearest,inShelter,danger,weather,serialize,restore,SAVE_KEY,LEGACY_SAVE_KEY,LEGACY_SAVE_KEYS,STORM,OUTPOST,ROUTES,stormStatus,inBaseShelter,LOOT,LANDMARKS,ZONES,PARTS,PART_NAMES,MATERIAL_NAMES,UPGRADES,RECIPES,productionCheck,produce} from './core.js';

const $=id=>document.getElementById(id),world=makeWorld();
let s=initialState(),screen='front',keys=new Set(),drag=false,pointerGesture=null,pointerFallback=false,view,flash=0,toastUntil=0,lastSave=0,uiTime=0,previousHp=100,seenHit=-1,sessionStarted=false;
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
let pendingAction=null,confirmReturn='front',importTicket=null;
const safeStorage=(()=>{try{return localStorage;}catch{return {getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');}};}})();
const safeLocks=(()=>{try{return navigator.locks;}catch{return undefined;}})();
const store=createSaveCoordinator({storage:safeStorage,locks:safeLocks,key:SAVE_KEY,encode:serialize,validate:raw=>restore(raw,world.colliders),onStatus:()=>queueMicrotask(()=>{if(!store.status().canWrite&&['play','inventory','map','workshop'].includes(screen))setScreen('menu');refreshSave();})});
function readSave(){return store.inspect().state;}
function storageMessage(){const q=store.status();return {idle:'Проверяем доступ к записи…',busy:'Другая вкладка владеет записью. Здесь путь остановлен. Закройте её и проверьте доступ.',unsupported:'Безопасная запись не поддерживается этим браузером. Доступен экспорт.',conflict:'Сейв изменён извне. Запись остановлена; экспортируйте эту сессию и загрузите актуальный путь.',released:'Запись освобождена.', 'storage-error':'Хранилище недоступно. Запись остановлена.', 'write-error':'Не удалось записать путь. Прежний основной сейв оставлен; доступен экспорт.', 'verify-error':'Запись могла завершиться, но проверка недоступна. Перечитайте основной сейв перед повтором.', 'lock-error':'Владение записью потеряно. Здесь путь остановлен.'}[q.mode]||(q.loaded?'Запись закреплена за этой вкладкой.':'Доступ к записи получен. Сначала загрузите актуальный путь или явно начните новый.');}
function refreshSave(){
 const primary=store.inspect(),saved=primary.state,q=store.status();$('continue-game').disabled=!saved||!q.canReplace;$('load').disabled=!saved||!q.canReplace;$('end-load').disabled=!saved||!q.canReplace;$('new-game').disabled=$('restart').disabled=$('end-new').disabled=!q.canReplace;$('save').disabled=!q.canWrite||s.mode!=='playing';$('resume').disabled=!q.canWrite||s.mode!=='playing';
 const v1=store.inspect(LEGACY_SAVE_KEYS[1]).raw,v2=store.inspect(LEGACY_SAVE_KEYS[0]).raw;
 $('save-note').textContent=primary.error?'Хранилище сохранений недоступно. Проверьте сообщение о записи ниже.':saved?`Сохранённый путь: ${saved.parts.length}/3 деталей · ${Math.floor(saved.time/60)} мин · ${saved.outpost.repaired?'Северный пост готов':'пост не восстановлен'}`:primary.raw!==null?'Сохранение не удалось прочитать. Данные не удалены: экспортируйте путь или проверьте резервную копию.':v1||v2?'Старые v1/v2 оставлены отдельно. Они не переносятся в новый мир; доступны экспорт и продолжение0.1.1.':q.canReplace?'Начните новый путь. Прогресс будет сохраняться в этом браузере.':'Запись пока недоступна. Проверьте сообщение о сохранении ниже.';
 $('writer-status').textContent=storageMessage();$('menu-status').textContent=storageMessage();
 const backup=store.inspect(BACKUP_KEY),safety=store.inspect(SAFETY_KEY);$('recover-backup').disabled=!backup.state||!q.canReplace;$('export-primary').disabled=store.inspect().raw===null;$('export-backup').disabled=backup.raw===null;$('export-safety').disabled=safety.raw===null;$('export-session').disabled=!sessionStarted;
 $('export-v1').hidden=!v1;$('export-v2').hidden=!v2;$('legacy-continue').hidden=!v1;$('import-v3').disabled=!q.canReplace;$('confirm-new-yes').disabled=!q.canReplace;
 $('backup-preview').textContent=backup.state?`Копия: HP${Math.ceil(backup.state.hp)}, ${backup.state.parts.length}/3 деталей, ${Math.floor(backup.state.time)} игровых секунд.`:backup.raw!==null?'Копия не читается этой версией; исходные байты можно экспортировать.':'Резервной копии пока нет.';
}
function save(manual=false){
 if(s.hp<=0)return false;const r=store.commit(s);if(r.ok){s=r.state;lastSave=s.time;if(manual)toast('Путь сохранён.');}else if(manual)toast(storageMessage());refreshSave();return r.ok;
}
function exportRaw(raw,name){if(typeof raw!=='string')return;const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function adopt(next,loaded){s=next;sessionStarted=true;previousHp=s.hp;lastSave=s.time;lastStep=s.steps;seenHit=s.lastHit?.time??-1;flash=0;initAudio();if(s.mode==='won'){finish();return;}setScreen('play');toast(loaded?'Путь восстановлен':'Новый путь начат. Старые кампании оставлены отдельно.');updateHUD();refreshSave();}
function ask(action,title,body,yes){pendingAction=action;confirmReturn=screen;$('confirm-title').textContent=title;$('confirm-action').textContent={new:'НОВЫЙ ПУТЬ',load:'ЗАГРУЗКА',backup:'РЕЗЕРВНАЯ КОПИЯ',import:'ИМПОРТ СОХРАНЕНИЯ'}[action.kind];$('confirm-body').textContent=body;$('confirm-new-status').textContent='';$('confirm-new-yes').textContent=yes;setScreen('confirm');refreshSave();}
function cancelPending(){if(!pendingAction)return;pendingAction=null;setScreen(confirmReturn);}
function requestNew(){if(!store.status().canReplace)return;const action={kind:'new',ticket:store.capture()};if(sessionStarted||store.inspect().raw!==null)ask(action,'Начать сначала?','Текущая живая сессия будет записана в резервную копию. После поражения сохраним последние записанные данные. Новый путь заменит только v3. Резервный слот один: прежнюю копию можно заранее экспортировать.','СОХРАНИТЬ КОПИЮ И НАЧАТЬ');else{pendingAction=action;confirmPending();}}
function requestLoad(){if(!store.status().canReplace)return;const a={kind:'load'};if(sessionStarted)ask(a,'Загрузить актуальный путь?','Несохранённая сессия этой вкладки заменится. При необходимости сначала отмените и экспортируйте её.','ЗАГРУЗИТЬ АКТУАЛЬНЫЙ');else{pendingAction=a;confirmPending();}}
function confirmPending(){
 const a=pendingAction;if(!a||!store.status().canReplace)return false;let r;
 if(a.kind==='load')r=store.loadLatest();
 else if(a.kind==='new'){
  let raw=store.inspect().raw;if(sessionStarted&&s.hp>0&&['playing','won'].includes(s.mode)){raw=serialize(s);if(!store.preview(raw).ok){$('confirm-new-status').textContent='Текущая сессия не читается. Сначала экспортируйте её.';return false;}}
  r=store.replace(initialState(),{ticket:a.ticket,preserveKey:!store.preview(raw).ok&&store.inspect(BACKUP_KEY).state?SAFETY_KEY:BACKUP_KEY,preserveRaw:raw});
 }else r=store.replace(a.state,{ticket:a.ticket,preserveKey:SAFETY_KEY,sourceCheck:a.kind==='backup'?{key:BACKUP_KEY,raw:a.raw}:null});
 if(!r.ok){$('confirm-new-status').textContent=r.reason==='verify-error'?'Запись могла завершиться. Не повторяйте замену вслепую: отмените подтверждение и перечитайте основной сейв.':({stale:'Подтверждение устарело. Отмените и проверьте актуальный путь.',conflict:'Основной сейв изменён другой сессией. Запись остановлена.', 'source-changed':'Резервная копия изменилась. Отмените и проверьте её снова.', 'write-error':'Замена не завершена. Основной сейв оставлен; защитная копия уже могла записаться.',invalid:'Формат не прошёл проверку. Данные не заменены.',readonly:'Запись сейчас недоступна.'}[r.reason]||'Замена не выполнена. Отмените и проверьте доступ к записи.');refreshSave();return false;}
 pendingAction=null;adopt(r.state,a.kind!=='new');return true;
}
function begin(load=false){return load?requestLoad():requestNew();}
function setScreen(next){
 if(['play','inventory','map','workshop'].includes(next)&&!store.status().canWrite)next='menu';if(next==='play'&&s.mode!=='playing')next='end';
 const tools=$('save-tools');tools.hidden=!['front','menu','end'].includes(next);if(next==='front')$('save-note').parentNode.append(tools);else if(next==='menu')$('menu-status').parentNode.append(tools);else if(next==='end')$('ending').querySelector('.panel').insertBefore(tools,$('end-load'));
 screen=next;keys.clear();drag=false;pointerGesture=null;
 for(const [id,which] of [['front','front'],['menu','menu'],['inventory','inventory'],['map-screen','map'],['ending','end'],['workshop','workshop'],['confirm-new','confirm']])$(id).hidden=which!==next;
 $('hud').hidden=next==='front';$('crosshair').style.display=next==='play'?'block':'none';
 if(next!=='play'&&document.pointerLockElement)document.exitPointerLock();
 if(ambient)ambient.gain.value=next==='play'?.35:.1;
 if(next==='inventory')drawInventory();if(next==='map')drawMap();if(next==='workshop')drawWorkshop();
}
function usePointerFallback(){
 if(pointerFallback)return;pointerFallback=true;
 toast('Без захвата мыши: щелчок ЛКМ или ПРОБЕЛ — выстрел; перетаскивание мышью или стрелки — обзор.');
}
function lock(){try{const p=$('world').requestPointerLock();if(p?.catch)p.catch(usePointerFallback);}catch{usePointerFallback();}}
const restartGuard={request:requestNew,confirm:confirmPending,cancel:cancelPending};
$('confirm-new-yes').onclick=confirmPending;$('confirm-new-no').onclick=cancelPending;
$('new-game').onclick=requestNew;$('continue-game').onclick=requestLoad;$('restart').onclick=requestNew;$('end-new').onclick=requestNew;$('end-load').onclick=requestLoad;
$('writer-retry').onclick=()=>store.acquire().then(refreshSave);
$('recover-backup').onclick=()=>{const b=store.inspect(BACKUP_KEY);if(!b.state||!store.status().canReplace)return;ask({kind:'backup',state:b.state,raw:b.raw,ticket:store.capture()},'Восстановить копию?',`HP${Math.ceil(b.state.hp)} · ${b.state.parts.length}/3 деталей · ${Math.floor(b.state.time)} игровых секунд. Имеющиеся данные основного сейва сохранятся отдельно; исходная копия не заменится.`,'ВОССТАНОВИТЬ КОПИЮ');};
for(const [id,key,name]of[['export-primary',SAVE_KEY,'ash-coast-v3-primary'],['export-backup',BACKUP_KEY,'ash-coast-v3-backup'],['export-safety',SAFETY_KEY,'ash-coast-v3-before-recovery'],['export-v1','ash-coast-save-v1','ash-coast-v1-original'],['export-v2','ash-coast-save-v2','ash-coast-v2-original']])$(id).onclick=()=>exportRaw(store.inspect(key).raw,name);
$('export-session').onclick=()=>exportRaw(serialize(s),'ash-coast-unsaved-session');
$('import-v3').onclick=()=>{importTicket=store.capture();$('import-file').click();};
$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;const ticket=importTicket||store.capture();importTicket=null;e.target.value='';if(file.size>2*1024*1024){toast('Файл слишком велик; исходный файл не изменён.');return;}const raw=await file.text(),p=store.preview(raw);if(!p.ok){let version;try{version=JSON.parse(raw).version;}catch{}toast(version===1||version===2?'Импорт v1/v2 в новую экспедицию не поддерживается. Исходный файл не изменён; старую кампанию продолжает прежняя версия игры.':'Файл повреждён или имеет неизвестный формат. Запись не выполнена.');return;}ask({kind:'import',state:p.state,raw,ticket},'Импортировать v3?',`HP${Math.ceil(p.state.hp)} · ${p.state.parts.length}/3 деталей · ${Math.floor(p.state.time)} игровых секунд. Имеющиеся данные основного сейва сохранятся отдельно.`,'СОХРАНИТЬ ТЕКУЩИЙ И ИМПОРТИРОВАТЬ');};
addEventListener('storage',e=>store.handleStorage(e));addEventListener('pagehide',()=>store.release());addEventListener('pageshow',e=>{if(e.persisted)store.acquire().then(refreshSave);});
$('pause-btn').onclick=()=>setScreen('menu');$('resume').onclick=()=>setScreen('play');$('save').onclick=()=>save(true);$('load').onclick=()=>begin(true);
$('map-open').onclick=()=>setScreen('map');$('map-close').onclick=()=>setScreen('play');$('inventory-close').onclick=()=>setScreen('play');
$('workshop-close').onclick=()=>setScreen('play');
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
function shoot(melee=false){if(!store.status().canWrite)return;const result=attack(s,world.colliders,melee);if(!result.fired){if(!melee&&s.inventory.ammo===0)toast('Патронов нет. Q — удар вблизи; бегите к укрытию.');return;}flash=1;tone(melee?65:160,melee?.12:.21,melee?.4:1,'sawtooth');if(result.hit){toast(result.killed?'Угроза устранена':'Попадание');tone(result.killed?220:320,.08,.2);}updateHUD();}
function openWorkshop(){if(!inBaseShelter(s)){toast('Мастерская находится в убежище. Собирайте материалы и возвращайтесь к верстаку.');return;}setScreen('workshop');}
addEventListener('keydown',e=>{
 if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F5','F9'].includes(e.code))e.preventDefault();
 keys.add(e.code);if(e.repeat)return;
 if(e.code==='Escape'){
  if(screen==='play'||screen==='end')setScreen('menu');else if(screen==='confirm')restartGuard.cancel();else if(['menu','inventory','map','workshop'].includes(screen))setScreen('play');return;
 }
 if(e.code==='KeyM'&&['play','map'].includes(screen)){setScreen(screen==='map'?'play':'map');return;}
 if(['KeyI','Tab'].includes(e.code)&&['play','inventory'].includes(screen)){setScreen(screen==='inventory'?'play':'inventory');return;}
 if(e.code==='KeyB'&&['play','workshop'].includes(screen)){if(screen==='workshop')setScreen('play');else openWorkshop();return;}
 if(screen!=='play')return;
 if(e.code==='KeyE'){if(nearest(s,world.colliders)?.id==='workshop'){openWorkshop();return;}const wasGate=s.gateOpened,beforeOutpost=JSON.stringify(s.outpost);const msg=interact(s,world.colliders);toast(msg);if(msg)tone(500,.12,.2);if(wasGate!==s.gateOpened||beforeOutpost!==JSON.stringify(s.outpost))save();if(s.mode==='won'){save();finish();}updateHUD();}
 if(e.code==='KeyQ')shoot(true);if(e.code==='Space')shoot();if(e.code==='KeyR'){s.player.yaw=0;s.player.pitch=0;}
 const types={Digit1:'food',Digit2:'water',Digit3:'med',Digit4:'filter'};if(types[e.code]){toast(consume(s,types[e.code]));updateHUD();}
 if(e.code==='F5')save(true);if(e.code==='F9')begin(true);
});
addEventListener('keyup',e=>keys.delete(e.code));
function finish(){
 setScreen('end');const won=s.mode==='won';
 $('end-label').textContent=won?'ВТОРОЙ ОГОНЬ / ЭКСПЕДИЦИЯ ЗАВЕРШЕНА':'ПУТЬ ПРЕРВАН';
 $('end-title').textContent=won?'На Северном посту снова горит свет.':'Берег забрал ещё один след.';
 $('end-text').textContent=won?'Из приёмника ответили: «Прилив слышит тебя. Северный пост снова на связи». Ты пережил бурю, восстановил пост и запустил насос. Экспедиция завершена.':'Загрузи сохранение или подготовь следующий выход заново.';
 $('end-stats').textContent=`Детали ${s.parts.length}/3 · ${Math.floor(s.time/60)} мин ${Math.floor(s.time%60)} сек · Пройдено ${Math.round(s.steps)} м · Устранено угроз: ${s.kills}`;refreshSave();
}
function updateHUD(){
 $('health-hint').hidden=s.hp>=100;
 $('health-hint').textContent=s.inventory.med>0?'Укрытие не лечит. Аптечка [3].':'Укрытие не лечит. Нужна аптечка.';
 for(const k of ['hp','stamina'])$(k).value=s[k];for(const k of ['hp','hunger','thirst'])$(k+'-val').textContent=Math.ceil(s[k]);
 $('rad-val').textContent=s.radiation.toFixed(1);const d=danger(s);$('rad-state').textContent=d>1?'ОПАСНАЯ ЗОНА':d>.1?'ФОН ПОВЫШЕН':'ФОН НИЗКИЙ';$('rad-state').style.color=d>1?'#edb46b':'#b9cbb5';
 $('filter-val').textContent=`ФИЛЬТР ${Math.ceil(s.filter)}% · ПАТРОНЫ ${s.inventory.ammo}`;
 $('materials-hud').textContent=Object.entries(MATERIAL_NAMES).map(([k,v])=>`${v.toUpperCase()} ${s.inventory[k]}`).join(' · ');
 const storm=stormStatus(s),seconds=Math.ceil(storm.remaining);
 $('survival-plan').textContent=!s.shelter.workbench?'Первый шаг: верстак в «Приливе» — 3 металла + 1 ткань. Затем ремонтный комплект.':!s.outpost.repaired?(s.inventory.outpostKit?'Комплект готов. Восстанови Северный пост: северо-восток карты.':'Комплект поста: 2 металла + 1 ткань + 1 провод, B в «Приливе».'):!s.outpost.waterOnline||!s.outpost.waterTaken?'На Северном посту запусти насос и возьми воду [E].':'После бури собери радиолинию на Северном посту: 3 детали + 1 металл + 1 провод.';
 $('mission').textContent=`Детали передатчика: ${s.parts.length} / 3`;
 $('checklist').innerHTML=PARTS.map(p=>`<div class="${s.parts.includes(p)?'done':''}">${s.parts.includes(p)?'◆':'◇'} ${PART_NAMES[p]}</div>`).join('')+`<div class="${s.outpost.repaired?'done':''}">${s.outpost.repaired?'◆':'◇'} Северный пост</div><div class="${s.outpost.waterTaken?'done':''}">${s.outpost.waterTaken?'◆':'◇'} Чистая вода</div>`;
 let loc='Прибрежная дорога';if(inBaseShelter(s))loc='Убежище «Прилив»';else if(Math.hypot(s.player.x-75,s.player.z+18)<19)loc='Северный пост';else for(const l of LANDMARKS)if(Math.hypot(l.x-s.player.x,l.z-s.player.z)<25)loc=l.name;
 if(s.player.x>82)loc='Береговая дуга';const discovery=explorationAt(s);if(discovery)loc=discovery.title;$('location').textContent=loc;
 $('weather').textContent=storm.phase==='warning'?`Пепельный фронт: ${seconds} с до бури`:storm.phase==='active'?'Пепельная буря':explorationCaption(s)||(storm.phase==='settled'?'Фронт прошёл • путь открыт':'Тихий пепел');
 $('storm-banner').hidden=!['warning','active'].includes(storm.phase)||screen!=='play';
 $('storm-banner').className=storm.phase;
 $('storm-banner').textContent=storm.phase==='warning'?`РАДИО: пепельный фронт через ${seconds} с. Укройся: «Прилив», насосная или восстановленный пост.`:`БУРЯ • ${seconds} с до затихания • ${storm.covered?'КРОВЛЯ ЗАЩИЩАЕТ':'ОТКРЫТОЕ МЕСТО: ищи кровлю, береги фильтр и воду'}`;
 const yaw=((s.player.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),dirs=['С','СЗ','З','ЮЗ','Ю','ЮВ','В','СВ'];$('compass').textContent=`· · · ${dirs[Math.round(yaw/(Math.PI/4))%8]} · · · ${Math.round((360-yaw*180/Math.PI)%360)}°`;
 const obj=nearest(s,world.colliders);$('prompt').style.display=obj&&screen==='play'?'block':'none';$('prompt').textContent=obj?`[E] ${obj.name}`:'';
 if(s.hp<previousHp-.1){$('damage').style.opacity=.65;setTimeout(()=>$('damage').style.opacity=0,350);}previousHp=s.hp;
 if(s.lastHit&&s.time-s.lastHit.time<2){
  const angle=Math.atan2(-(s.lastHit.x-s.player.x),-(s.lastHit.z-s.player.z))-s.player.yaw,diff=Math.atan2(Math.sin(angle),Math.cos(angle));
  $('hit-ring').style.opacity=String(Math.min(1,(2-(s.time-s.lastHit.time))*1.4));$('hit-arrow').style.transform=`rotate(${-diff}rad)`;
  $('hit-label').textContent=Math.abs(diff)>Math.PI*.75?'УДАР СО СПИНЫ':Math.abs(diff)<Math.PI*.25?'УДАР СПЕРЕДИ':diff>0?'УДАР СЛЕВА':'УДАР СПРАВА';
  if(s.lastHit.time!==seenHit){tone(80,.15,.5,'sawtooth');seenHit=s.lastHit.time;}
 }else $('hit-ring').style.opacity=0;
}
function drawInventory(){
 const info={food:['Консервы','+45 сытости; раны не лечит'],water:['Чистая вода','+50 воды'],med:['Аптечка','+45 здоровья'],filter:['Фильтр','Восстановить фильтр до 100%']};
 $('inventory-items').replaceChildren();
 for(const [type,[name,description]] of Object.entries(info)){
  const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');text.textContent=`${name} × ${s.inventory[type]}`;const small=document.createElement('small');small.textContent=description;text.append(small);button.textContent='ИСПОЛЬЗОВАТЬ';button.disabled=!canConsume(s,type);button.onclick=()=>{if(!store.status().canWrite)return;toast(consume(s,type));drawInventory();updateHUD();};row.append(text,button);$('inventory-items').append(row);
 }
 const ammo=document.createElement('p');ammo.textContent=`Патроны: ${s.inventory.ammo}. Пепельнику нужны два попадания; выстрелы не проходят через стены.`;$('inventory-items').append(ammo);$('parts-info').textContent=`Передатчик: ${s.parts.map(p=>PART_NAMES[p]).join(', ')||'детали пока не найдены'}`;
 const raw=document.createElement('p');raw.textContent=Object.entries(MATERIAL_NAMES).map(([k,v])=>`${v}: ${s.inventory[k]}`).join(' · ')+(s.inventory.outpostKit?' · Ремонтный комплект × 1':'')+(s.inventory.gateKit?' · Привод шлюза × 1':'');$('inventory-items').append(raw);
}
function drawWorkshop(){
 $('workshop-materials').textContent=Object.entries(MATERIAL_NAMES).map(([k,v])=>`${v} ${s.inventory[k]}`).join('  /  ');
 $('workshop-status').textContent=s.shelter.purifier?'Очиститель работает: здесь можно восстановиться перед новой вылазкой.':s.shelter.workbench?'Верстак оборудован. Материалы общие: выберите, что нужнее следующей вылазке.':'Первый шаг — 3 металла и 1 ткань на верстак. Затем можно готовиться к цеху.';
 for(const [target,items,upgrade] of [['workshop-upgrades',UPGRADES,true],['workshop-recipes',RECIPES,false]]){
  const container=$(target);container.replaceChildren();
  for(const [id,recipe] of Object.entries(items)){
   const card=document.createElement('article');card.className='recipe-card';const title=document.createElement('h3');title.textContent=recipe.name;const desc=document.createElement('p');desc.textContent=recipe.description;const cost=document.createElement('small');cost.textContent=Object.entries(recipe.cost).map(([k,v])=>`${MATERIAL_NAMES[k]} ${v}`).join(' + ');const button=document.createElement('button');button.id=(upgrade?'upgrade-':'craft-')+id;const unavailable=productionCheck(s,id,upgrade);button.disabled=!!unavailable;button.textContent=unavailable||(upgrade?'УСТАНОВИТЬ':'ИЗГОТОВИТЬ');button.onclick=()=>{if(!store.status().canWrite)return;const result=produce(s,id,upgrade);toast(result.message);if(result.ok){tone(420,.15,.2);save();}drawWorkshop();updateHUD();};card.append(title,desc,cost,button);container.append(card);
  }
 }
}
function drawMap(){
 $('map-route-help').textContent=mapRouteHelp(s);
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
 for(const l of LOOT.filter(l=>l.type==='materials'&&!s.collected.includes(l.id))){g.fillStyle=l.id==='hot-crate'?'#b46b32':'#557d75';g.fillRect(X(l.x)-4,Z(l.z)-4,8,8);}
 for(const [x,z] of [[-50,-10],[51,34],[34,-45]]){g.fillStyle='#2e5649';g.beginPath();g.moveTo(X(x),Z(z)-3);g.lineTo(X(x)-4,Z(z)+5);g.lineTo(X(x)+4,Z(z)+5);g.fill();}
 if(s.gateOpened){g.fillStyle='#5baf9b44';g.fillRect(X(30),Z(-73),17*scale,23*scale);}label(s.gateOpened?'ШЛЮЗ ОТКРЫТ':'ШЛЮЗ: ПРИВОД',48,-56);
 for(const route of ROUTES){g.strokeStyle=route.color;g.lineWidth=3;g.setLineDash([7,4]);g.beginPath();route.points.forEach(([x,z],i)=>i?g.lineTo(X(x),Z(z)):g.moveTo(X(x),Z(z)));g.stroke();g.setLineDash([]);}
 label(s.outpost.repaired?'Северный пост • готов':'Северный пост • ремонт',56,-30);label('Теплотрасса • фон',7,8);label('Берег • ветер',62,43);
 label('⌂ УБЕЖИЩЕ',-14,94);g.save();g.translate(X(s.player.x),Z(s.player.z));g.rotate(-s.player.yaw);g.fillStyle='#203c3a';g.strokeStyle='#f2db9e';g.lineWidth=2;g.beginPath();g.moveTo(0,-10);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();
}
let previous=performance.now(),fpsTime=previous,fpsFrames=0;
function frame(now){
 const dt=Math.min((now-previous)/1000,.05),rawMs=now-previous;previous=now;flash=Math.max(0,flash-dt*7);
 if(screen==='play'&&store.status().canWrite){
  if(keys.has('ArrowLeft'))s.player.yaw+=dt*1.7;if(keys.has('ArrowRight'))s.player.yaw-=dt*1.7;
  if(keys.has('ArrowUp'))s.player.pitch=Math.min(1.1,s.player.pitch+dt);if(keys.has('ArrowDown'))s.player.pitch=Math.max(-1.1,s.player.pitch-dt);
  tick(s,{forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')},dt,world.colliders);
  if(s.steps-lastStep>2.3){tone(65,.055,.08);lastStep=s.steps;}
  if(danger(s)>.1&&s.time>nextGeiger){tone(1600,.018,.12,'square');nextGeiger=s.time+.15+Math.random()/(danger(s)*3);}
  if(s.mode==='playing'&&s.time-lastSave>=20)save();
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
refreshSave();updateHUD();requestAnimationFrame(frame);store.acquire().then(r=>{refreshSave();if(r.reason==='busy')setTimeout(()=>{if(store.status().mode==='busy')store.acquire().then(refreshSave);},300);});
// Read-only telemetry for repeatable local QA. Mutation helpers exist only on ?qa=1.
window.__ASH__={storage:()=>store.status(),snapshot:()=>structuredClone(s),metrics:()=>({...metrics,frames:[...metrics.frames],width:innerWidth,height:innerHeight,pixelRatio:view.renderer.getPixelRatio(),quality:view.quality,renderer:view.renderer.getContext().getParameter(view.renderer.getContext().RENDERER)}),screen:()=>screen};
if(new URLSearchParams(location.search).get('qa')==='1')window.__ASH_QA__={setState:next=>{s=structuredClone(next);previousHp=s.hp;updateHUD();},step:(seconds,input={})=>{for(let t=0;t<seconds;t+=.02)tick(s,input,Math.min(.02,seconds-t),world.colliders);updateHUD();if(s.mode==='dead')finish();},setScreen,deferSave:ms=>{const old=structuredClone(s),ticket=store.capture();return new Promise(resolve=>setTimeout(()=>resolve(store.commit(old,{ticket})),ms));},world:()=>structuredClone(world)};
