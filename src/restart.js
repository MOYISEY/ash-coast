// Keep reset policy independent of rendering so unsaved sessions can be tested.
export function createRestartGuard({getState,getScreen,sessionStarted,readRaw,writeBackup,encode,validate,showConfirmation,setScreen,begin,onError}){
 let returnScreen=null;
 function request(){
  let raw;try{raw=readRaw();}catch{onError('Не удалось проверить сохранение. Новый путь пока не начат.');return false;}
  // Even a sub-second live session may already have spent or collected an item.
  if(sessionStarted()||raw!==null){returnScreen=getScreen();showConfirmation();return true;}
  begin();return false;
 }
 function confirm(){
  if(returnScreen===null)return false;
  try{
   const raw=readRaw(),state=getState();let backup=raw;
   if(sessionStarted()&&state.hp>0&&['playing','won'].includes(state.mode)){
    backup=encode(state);
    if(!validate(backup))throw new Error('Current session cannot be restored');
   }
   // A defeated session cannot be continued; retain the last stored snapshot.
   // Invalid stored bytes are also preserved verbatim rather than discarded.
   if(backup!==null)writeBackup(backup);
  }catch{onError('Не удалось сохранить резервную копию. Текущий путь оставлен.');return false;}
  returnScreen=null;begin();return true;
 }
 function cancel(){
  if(returnScreen===null)return false;
  const previous=returnScreen;returnScreen=null;setScreen(previous);return true;
 }
 return {request,confirm,cancel};
}
