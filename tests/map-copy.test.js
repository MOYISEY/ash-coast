import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,ROUTES,serialize} from '../src/core.js';
import {mapRouteHelp} from '../src/map-copy.js';

test('map caption names current routes and second shelter; obsolete factory caption is removed',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<p id="map-route-help">/);assert.match(html,/Северный пост/);
 assert(!html.includes('В цех: коротко через опасный южный двор'));
 const text=mapRouteHelp(initialState());for(const route of ROUTES)assert(text.includes(route.name));
 assert.match(text,/короче/i);assert.match(text,/загрязнение/i);assert.match(text,/ветер/i);assert.match(text,/верстак/);assert.match(text,/Северного поста/);
});
test('map copy follows preparation, repair, water, storm and final states without mutating progress',()=>{
 const s=initialState();const check=pattern=>{const before=serialize(s),text=mapRouteHelp(s);assert.match(text,pattern);assert.match(text,/Теплотрасса/);assert.match(text,/Береговая дуга/);assert(!text.includes('опасный южный двор'));assert.equal(serialize(s),before);};
 check(/Оборудуй верстак/);s.shelter.workbench=true;check(/Изготовь ремонтный комплект/);s.inventory.outpostKit=1;check(/Отнеси ремонтный комплект/);
 s.inventory.outpostKit=0;s.outpost.repaired=true;check(/запусти насос/);s.outpost.waterOnline=true;check(/возьми чистую воду/);
 s.outpost.waterTaken=1;s.outpost.waterRemaining=2;s.time=140;check(/Пережди бурю/);s.time=200;check(/Собери три отмеченные детали/);
 s.parts=['cell','antenna','module'];s.collected=[...s.parts];check(/Собери радиолинию на Северном посту/);
});
