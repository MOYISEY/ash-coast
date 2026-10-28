import {ROUTES,STORM} from './core.js';

// Copy only: opening the map must not change expedition state.
export function mapRouteHelp(s){
 const short={pipe:'короче, загрязнение',coast:'длиннее, ветер в бурю'};
 const routes=ROUTES.map(r=>`${r.name}: ${short[r.id]||r.description}.`).join(' ');
 let next;
 if(!s.shelter.workbench)next='Оборудуй верстак в «Приливе»: комплект для Северного поста.';
 else if(!s.outpost.repaired)next=s.inventory.outpostKit?'Отнеси ремонтный комплект на Северный пост: ремонт [E].':'Изготовь ремонтный комплект в «Приливе» для Северного поста.';
 else if(!s.outpost.waterOnline||s.outpost.waterTaken<1)next='Северный пост: запусти насос и возьми чистую воду [E].';
 else if(s.time<STORM.endsAt)next='Пережди бурю: «Прилив», насосная или Северный пост с кровлей.';
 else if(s.parts.length<3)next='Собери три отмеченные детали; радиолиния — Северный пост.';
 else next='Собери радиолинию на Северном посту [E]: 3 детали, металл 1 + провод 1.';
 return `${routes} Кровля — в насосной. ${next}`;
}
