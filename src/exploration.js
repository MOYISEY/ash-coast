import {inBaseShelter,inOutpost} from './expedition.js';
// Three authored points of interest reuse existing loot IDs, positions and rewards.
// No new inventory, save field, task screen or balance dependency.
export const EXPLORATION=[
 {id:'last-ferry',x:56,z:58,r:11,title:'Сборный пункт «Рейс 07»',lootId:'cache8',clue:'Рваный тент не укроет от бури. Сигнальный запас — под синим флажком.',found:'Сигнальный запас взят. Здесь ждали последнего рейса.'},
 {id:'repair-watch',x:-50,z:-18,r:10,title:'Квартал 04 · пост ремонтников',lootId:'ruins-crate',clue:'Из этой комнаты следили за антенной. Сумку оставили у стены.',found:'Сумка ремонтника взята. Радиолинию ещё можно вернуть.'},
 {id:'shore-signal',x:81,z:-5,r:9,title:'Причал без рейсов',lootId:'coast-crate',clue:'Лодка осталась за ограждением. Береговой запас — по эту сторону.',found:'Береговой запас взят. Посту пригодится старая проводка.'}
];
export function explorationAt(s){if(inBaseShelter(s)||inOutpost(s))return null;return EXPLORATION.find(p=>Math.hypot(p.x-s.player.x,p.z-s.player.z)<p.r)||null;}
export function explorationCaption(s){const p=explorationAt(s);return p?(s.collected.includes(p.lootId)?p.found:p.clue):'';}
export const SUPPLY_TRAIL=[[25,43],[34,45],[43,47],[46,56],[46,68],[56,68],[56,63],[60,58],[61,55]];
