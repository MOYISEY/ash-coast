// Cooperative writer ownership + optimistic record validation. No origin-wide clearing.
export const SAVE_LOCK='ash-coast.writer.v3';
export const BACKUP_KEY='ash-coast-save-v3-backup';
export const SAFETY_KEY='ash-coast-save-v3-before-recovery';
export function createSaveCoordinator({storage,locks,key='ash-coast-save-v3',encode,validate,onStatus=()=>{},makeId=()=>globalThis.crypto?.randomUUID?.()||'writer-'+Date.now().toString(36)+Math.random().toString(36).slice(2)}){
 const writer=makeId();let mode='idle',loaded=false,held=false,generation=0,lease=0,attempt=0,expected=null,revision=0,releaseLock=null,acquiring=null,disposed=false;
 const status=()=>({mode,loaded,held,generation,revision,canWrite:held&&mode==='writer'&&loaded,canReplace:held&&mode==='writer'});
 const emit=()=>onStatus(status());
 function decode(raw){
  if(typeof raw!=='string'||raw.length>2*1024*1024)return null;
  const s=validate(raw);if(!s)return null;
  const m=s.saveMeta;if(m!==undefined&&(!m||m.format!==1||!Number.isSafeInteger(m.revision)||m.revision<1||typeof m.writer!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(m.writer)))return null;
  return s;
 }
 function inspect(k=key){try{const raw=storage.getItem(k);return {raw,state:decode(raw),error:false};}catch{return {raw:null,state:null,error:true};}}
 function stop(reason){mode=reason;loaded=false;generation++;emit();return {ok:false,reason};}
 function capture(){return Object.freeze({generation,lease,raw:expected,revision});}
 function check(ticket){
  if(!held||mode!=='writer')return {ok:false,reason:'readonly'};
  if(!ticket||ticket.generation!==generation||ticket.lease!==lease||ticket.raw!==expected||ticket.revision!==revision)return {ok:false,reason:'stale'};
  const cur=inspect();if(cur.error)return stop('storage-error');
  if(cur.raw!==expected||(cur.state?.saveMeta?.revision??0)!==revision)return stop('conflict');
  return {ok:true};
 }
 async function acquire(){
  if(disposed)return {ok:false,reason:'released'};
  if(held){const c=inspect();if(c.error)return stop('storage-error');expected=c.raw;revision=c.state?.saveMeta?.revision??0;loaded=false;mode='writer';generation++;emit();return {ok:true,raw:expected};}
  if(acquiring)return acquiring;
  if(!locks?.request){mode='unsupported';emit();return {ok:false,reason:'unsupported'};}
  const request=++attempt;
  acquiring=new Promise(resolve=>{
   let resolved=false;const ready=v=>{if(!resolved){resolved=true;resolve(v);}};
   try{Promise.resolve(locks.request(SAVE_LOCK,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(disposed||request!==attempt){ready({ok:false,reason:'released'});return;}
    if(!lock){mode='busy';loaded=false;emit();ready({ok:false,reason:'busy'});return;}
    held=true;lease++;generation++;const c=inspect();
    if(c.error){held=false;mode='storage-error';emit();ready({ok:false,reason:'storage-error'});return;}
    expected=c.raw;revision=c.state?.saveMeta?.revision??0;mode='writer';loaded=false;
    const hold=new Promise(r=>releaseLock=r);emit();ready({ok:true,raw:expected});await hold;
   })).catch(()=>{if(request===attempt){held=false;const end=releaseLock;releaseLock=null;end?.();stop('lock-error');}ready({ok:false,reason:'lock-error'});});}
   catch{if(request===attempt){mode='lock-error';emit();}ready({ok:false,reason:'lock-error'});}
  });
  try{return await acquiring;}finally{acquiring=null;}
 }
 function release(){attempt++;held=false;loaded=false;generation++;lease++;mode='released';const r=releaseLock;releaseLock=null;r?.();emit();}
 function loadLatest(){
  if(!held||mode!=='writer')return {ok:false,reason:'readonly'};
  const c=inspect();if(c.error)return stop('storage-error');expected=c.raw;revision=c.state?.saveMeta?.revision??0;generation++;loaded=!!c.state;emit();return c.state?{ok:true,state:c.state,raw:c.raw}:{ok:false,reason:c.raw===null?'missing':'invalid'};
 }
 function write(state,{ticket=capture(),preserveKey=null,preserveRaw=undefined,sourceCheck=null,replace=false}={}){
  if(!replace&&!loaded)return {ok:false,reason:'reload-required'};
  const gate=check(ticket);if(!gate.ok)return gate;
  let candidate;try{candidate=decode(encode(state));}catch{return {ok:false,reason:'invalid'};}
  // A file/backup cannot choose the next revision of this owned primary.
  const baseRevision=revision;
  if(!candidate||baseRevision>=Number.MAX_SAFE_INTEGER)return {ok:false,reason:'invalid'};
  if(sourceCheck){const actual=inspect(sourceCheck.key);if(actual.error)return stop('storage-error');if(actual.raw!==sourceCheck.raw)return {ok:false,reason:'source-changed'};}
  const next={...candidate,saveMeta:{format:1,revision:baseRevision+1,writer}},raw=encode(next);if(!decode(raw))return {ok:false,reason:'invalid'};
  if(preserveKey!==null&&![BACKUP_KEY,SAFETY_KEY].includes(preserveKey))return {ok:false,reason:'invalid-key'};
  let wrotePrimary=false;
  try{
   if(preserveKey!==null){const original=preserveRaw===undefined?expected:preserveRaw;if(original!==null)storage.setItem(preserveKey,original);}
   // Recheck after safety write: a mock/reentrant external writer must not be erased.
   const again=check(ticket);if(!again.ok)return again;
   storage.setItem(key,raw);wrotePrimary=true;
   if(storage.getItem(key)!==raw)return stop('conflict');
  }catch{return stop(wrotePrimary?'verify-error':'write-error');}
  expected=raw;revision=next.saveMeta.revision;loaded=true;generation++;emit();return {ok:true,state:next,raw};
 }
 function commit(state,options={}){return write(state,options);}
 function replace(state,options={}){return write(state,{...options,replace:true});}
 function preview(raw){const state=decode(raw);return state?{ok:true,state}:{ok:false,reason:'invalid'};}
 function handleStorage(e){
  if(e.storageArea&&e.storageArea!==storage)return;
  if(e.key!==null&&![key,BACKUP_KEY,SAFETY_KEY,'ash-coast-save-v1','ash-coast-save-v2'].includes(e.key))return;
  if(e.key===key||e.key===null){const c=inspect();if(c.error){stop('storage-error');return;}if(c.raw!==expected){stop(held?'conflict':'busy');return;}}
  emit();
 }
 return {status,capture,acquire,release,loadLatest,commit,replace,preview,inspect,handleStorage,dispose(){disposed=true;release();}};
}
