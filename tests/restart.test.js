import test from 'node:test';
import assert from 'node:assert/strict';
import {createRestartGuard} from '../src/restart.js';
import {initialState,makeWorld,interact,consume,serialize,restore} from '../src/core.js';
const world=makeWorld();
function harness({started=true,raw=serialize(initialState()),state=initialState(),screen='menu'}={}){
 const h={state,started,raw,screen,backups:[],begins:0,errors:[],failRead:false,failWrite:false};
 h.guard=createRestartGuard({
  getState:()=>h.state,getScreen:()=>h.screen,sessionStarted:()=>h.started,
  readRaw:()=>{if(h.failRead)throw Error('read denied');return h.raw;},
  writeBackup:value=>{if(h.failWrite)throw Error('quota exceeded');h.backups.push(value);},
  encode:serialize,validate:value=>restore(value,world.colliders),
  showConfirmation:()=>{h.screen='confirm';},setScreen:value=>{h.screen=value;},
  begin:()=>{h.begins++;h.state=initialState();h.started=true;h.raw=serialize(h.state);h.screen='play';},
  onError:message=>h.errors.push(message)
 });return h;
}
function earlyCrate(){const s=initialState();s.player={x:9,z:73,yaw:0,pitch:0};s.time=.4;interact(s,world.colliders);assert(s.collected.includes('shore-crate'));return s;}
test('N1: first crate before autosave requests confirmation; cancel retains current unsaved state',()=>{
 const h=harness({state:earlyCrate()}),before=serialize(h.state),stored=h.raw;
 assert(h.guard.request());assert.equal(h.screen,'confirm');assert.equal(h.begins,0);
 assert(h.guard.cancel());assert.equal(h.screen,'menu');assert.equal(serialize(h.state),before);assert.equal(h.raw,stored);assert.equal(h.backups.length,0);
});
test('N1: confirmed reset backs up the current viable session, not the time-zero stored save',()=>{
 const h=harness({state:earlyCrate()}),latest=serialize(h.state),old=h.raw;
 assert.notEqual(latest,old);h.guard.request();assert(h.guard.confirm());
 assert.equal(h.backups[0],latest);const recovered=restore(h.backups[0],world.colliders);
 assert.equal(recovered.inventory.scrap,2);assert.equal(recovered.inventory.cloth,1);assert(recovered.collected.includes('shore-crate'));
 assert.equal(h.begins,1);assert.equal(h.state.inventory.scrap,0);assert(!h.guard.confirm());assert.equal(h.begins,1,'double confirmation cannot restart twice');
});
test('sub-second consumption, zero-time active session and missing stored save all require confirmation',()=>{
 for(const raw of [null,serialize(initialState())]){
  const h=harness({raw});consume(h.state,'food');assert.equal(h.state.time,0);h.guard.request();assert.equal(h.screen,'confirm');assert.equal(h.begins,0);h.guard.cancel();assert.equal(h.state.inventory.food,0);
 }
 const fresh=harness();fresh.guard.request();assert.equal(fresh.screen,'confirm');
});
test('front screen uses existing saved bytes, including corrupt bytes; genuinely fresh front starts directly',()=>{
 for(const raw of [serialize(initialState()),'unreadable saved data']){const h=harness({started:false,raw,screen:'front'});h.guard.request();assert.equal(h.screen,'confirm');h.guard.confirm();assert.equal(h.backups[0],raw);}
 const h=harness({started:false,raw:null,screen:'front'});assert(!h.guard.request());assert.equal(h.begins,1);assert.equal(h.backups.length,0);
});
test('backup write failure leaves current state, original saved bytes and confirmation intact',()=>{
 const h=harness({state:earlyCrate()}),before=serialize(h.state),old=h.raw;h.guard.request();h.failWrite=true;
 assert(!h.guard.confirm());assert.equal(h.begins,0);assert.equal(h.screen,'confirm');assert.equal(serialize(h.state),before);assert.equal(h.raw,old);assert.equal(h.backups.length,0);assert.equal(h.errors.length,1);
});
test('storage read failures and invalid current live state cannot silently reset progress',()=>{
 const h=harness({state:earlyCrate()});h.failRead=true;assert(!h.guard.request());assert.equal(h.begins,0);h.failRead=false;h.guard.request();h.failRead=true;assert(!h.guard.confirm());assert.equal(h.begins,0);
 h.failRead=false;h.state.inventory.scrap=-1;assert(!h.guard.confirm());assert.equal(h.begins,0);assert.equal(h.backups.length,0);
});
test('defeat preserves the last saved viable state, while won current session is backed up',()=>{
 const dead=harness();dead.state.hp=0;dead.state.mode='dead';dead.screen='end';const old=dead.raw;dead.guard.request();dead.guard.confirm();assert.equal(dead.backups[0],old);
 const won=harness();won.state.parts=['antenna','cell','module'];won.state.collected=[...won.state.parts];won.state.shelter.workbench=true;won.state.mode='won';won.state.time=195;won.state.outpost={repaired:true,waterOnline:true,waterRemaining:2,waterTaken:1};won.screen='end';const latest=serialize(won.state);won.guard.request();won.guard.confirm();assert.equal(won.backups[0],latest);
});
