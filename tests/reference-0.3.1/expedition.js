// One bounded expedition. All timings/doses are fictional game values.
export const STORM={warningAt:95,startsAt:135,endsAt:195};
export const OUTPOST={x:75,z:-18,radio:{x:72,z:-22},pump:{x:79,z:-21}};
export const ROUTES=[
 {id:'pipe',name:'Теплотрасса',description:'Короче; постоянное загрязнение у разрыва трубы.',points:[[0,73],[20,43],[32,-8],[75,-10],[75,-18]],color:'#c58c48'},
 {id:'coast',name:'Береговая дуга',description:'Длиннее, фон ниже; открыта ветру во время бури.',points:[[0,73],[20,43],[83,43],[83,-10],[75,-10],[75,-18]],color:'#467d8c'}
];
export function inBaseShelter(s){return Math.abs(s.player.x)<6&&s.player.z>79&&s.player.z<91;}
export function inOutpost(s){return s.outpost.repaired&&s.player.x>69&&s.player.x<81&&s.player.z>-24&&s.player.z<-11;}
export function stormCovered(s){return inBaseShelter(s)||inOutpost(s)||(s.player.x>44&&s.player.x<58&&s.player.z>17&&s.player.z<33);}
export function stormStatus(s){
 const time=s.time,phase=time<STORM.warningAt?'clear':time<STORM.startsAt?'warning':time<STORM.endsAt?'active':'settled';
 return {phase,remaining:Math.max(0,(phase==='clear'?STORM.warningAt:phase==='warning'?STORM.startsAt:STORM.endsAt)-time),covered:stormCovered(s)};
}
export function stormDose(s){return stormStatus(s).phase==='active'&&!stormCovered(s)?2.2*(s.player.x>70?1.35:1):0;}
export function outpostNodes(s){
 if(!s.outpost.repaired)return [{id:'outpostRepair',x:75,z:-17,name:s.inventory.outpostKit?'Восстановить Северный пост [E]':'Северный пост: нужен ремонтный комплект с верстака'}];
 return [{id:'outpostRadio',...OUTPOST.radio,name:'Радиолиния Северного поста [E]'},
 {id:'outpostWater',...OUTPOST.pump,name:!s.outpost.waterOnline?'Запустить насос чистой воды [E]':`Чистая вода: ${s.outpost.waterRemaining} порции [E]`}];
}
export function interactOutpost(s,id){
 if(id==='outpostRepair'){
  if(s.outpost.repaired)return 'Пост уже восстановлен.';
  if(!s.inventory.outpostKit)return 'Нужен ремонтный комплект: верстак, 2 металла + 1 ткань + 1 провод.';
  s.inventory.outpostKit--;s.outpost.repaired=true;return 'Северный пост восстановлен. Кровля защищает от бури. Насос у правой стены: запусти его [E].';
 }
 if(id==='outpostWater'){
  if(!s.outpost.repaired)return 'Сначала восстанови пост.';
  if(!s.outpost.waterOnline){s.outpost.waterOnline=true;s.outpost.waterRemaining=3;return 'Насос запущен. В накопителе три порции чистой воды. Возьми одну [E].';}
  if(s.outpost.waterRemaining<1)return 'Накопитель пуст. Три порции уже разобраны; ищи другие припасы.';
  if(s.inventory.water>=3)return 'В рюкзаке уже три порции воды. Выпей или оставь запас на потом.';
  s.outpost.waterRemaining--;s.outpost.waterTaken++;s.inventory.water++;return 'Взята чистая вода. Расходуй [2]; остаток хранится на посту.';
 }
 if(id==='outpostRadio'){
  if(!s.outpost.waterOnline||s.outpost.waterTaken<1)return 'Запусти насос и возьми чистую воду для дальнейшего пути.';
  if(s.time<STORM.endsAt)return 'Буря мешает связи. Дождись её затихания под кровлей.';
  if(s.parts.length<3)return `Для радиолинии ещё нужны ${3-s.parts.length} детали передатчика. Отмечены на карте [M].`;
  if(!s.shelter.workbench||s.inventory.scrap<1||s.inventory.wire<1)return 'Для окончательной сборки нужны верстак и 1 металл + 1 провод.';
  s.inventory.scrap--;s.inventory.wire--;s.mode='won';return 'Пост связался с «Приливом». Следующий участок пути отмечен в журнале.';
 }
 return '';
}
export function validExpedition(s){
 const p=s.outpost,t=s.storm;
 if(!p||!t||typeof p.repaired!=='boolean'||typeof p.waterOnline!=='boolean')return false;
 if(!Number.isInteger(p.waterRemaining)||!Number.isInteger(p.waterTaken)||p.waterRemaining<0||p.waterTaken<0||p.waterRemaining>3||p.waterTaken>3)return false;
 if(p.waterOnline?(!p.repaired||p.waterTaken+p.waterRemaining!==3):(p.waterTaken!==0||p.waterRemaining!==0))return false;
 if(p.repaired&&!s.shelter.workbench)return false;
 if(!Number.isInteger(s.inventory.outpostKit)||s.inventory.outpostKit<0||s.inventory.outpostKit>1||(s.inventory.outpostKit&&(p.repaired||!s.shelter.workbench)))return false;
 if(![t.exposed,t.sheltered].every(v=>Number.isFinite(v)&&v>=0)||t.exposed+t.sheltered>Math.min(STORM.endsAt-STORM.startsAt,Math.max(0,s.time-STORM.startsAt))+.001)return false;
 if(s.mode==='won'&&(!p.repaired||!p.waterOnline||!p.waterTaken||s.time<STORM.endsAt))return false;
 return true;
}
