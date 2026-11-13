// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// A single Chromium process is shared with the existing SBsxScam collector.
// One source scan per minute; one verified team detail at a time, 30s apart.
// Never use an undocumented API or make simultaneous bursts of team requests.
import {TOP10_LIST_POLL_MS,TOP10_TEAM_SPACING_MS,
  allTop10KnownTeams,saveTop10Leaderboard,top10NextDue,noteTop10Failure,
  noteTopTeamAttempt,noteTopTeamFailure,saveTopTeamDetails} from './mega-top10-store.js';
import {captureTop10Leaderboard,captureTopTeamDetails} from './mega-top10-collector.js';

const safeDiagnostic=e=>{
 const d=e?.safeDiagnostic;
 if(!d||typeof d!=='object')return '';
 const type=['found','empty','layout','upstream-sync','sign-in','verification','test-fixture','unavailable']
   .includes(d.mode)?d.mode:'unknown';
 const safeCount=n=>Number.isInteger(n)&&n>=0&&n<=100000?n:0;
 return ' [mode='+type+
  ',rows='+safeCount(d.rows)+',dom='+safeCount(d.fromDom)+
  ',text='+safeCount(d.fromText)+',table='+safeCount(d.tableCount)+
  ',role='+safeCount(d.roleCount)+',styled='+safeCount(d.styledCount)+
  ',sync='+!!d.syncing+',columns='+!!d.columns+']';
};
const safeError=e=>{
 const message=String(e?.message||'');
 if(message.startsWith('InPvP Top 10 listing was not fully rendered'))
   return 'InPvP Top 10 listing not fully rendered; previously captured ranking retained.';
 if(message.startsWith('New Top 10 team has no discoverable'))
   return 'New Top 10 team link was not available from the rendered listing.';
 if(message.startsWith('Top 10 listing incomplete'))
   return 'InPvP Top 10 list incomplete; old ranking preserved.';
 if(message.startsWith('InPvP detail not available'))
   return 'InPvP team detail was not readable; older stats retained.';
 if(message.startsWith('Team page redirected'))
   return 'InPvP team page redirected away from team details.';
 return 'InPvP browser read failed; source data was not replaced.';
};
export function createMegaTop10Poller({
 browser,encryptedMode=false,vault=null,mainBusy=()=>false,
 onLog=message=>console.log('[Mega Top10] '+message)
}={}){
 if(!browser)throw new Error('Browser required for MegaSMP Top 10 collector.');
 let busy=false,stopping=false,listTimer=null,detailTimer=null;
 async function withPage(work){
   let context=null,page=null;
   try{
     if(encryptedMode){
       const state=vault?.load()||null;
       context=await browser.newContext({
         ...(state?{storageState:state}:{}),
         acceptDownloads:false,serviceWorkers:'block',
         viewport:{width:1360,height:850}
       });
     }else context=browser; // already a persistent context
     page=await context.newPage();
     return await work(page);
   }finally{
     if(page)await page.close().catch(()=>{});
     if(encryptedMode&&context)await context.close().catch(()=>{});
   }
 }
 async function updateList(){
   if(busy||mainBusy()||stopping)return false;
   busy=true;
   try{
     const rows=await withPage(page=>
       captureTop10Leaderboard(page,{knownTeams:allTop10KnownTeams()}));
     const result=saveTop10Leaderboard(rows);
     onLog('Verified '+result.count+' teams. '+(result.changed?
       'Ranking changed; newly discovered: '+result.newTeams.length+'.':
       'No ranking changes.'));
     return true;
   }catch(error){
     const message=safeError(error)+safeDiagnostic(error);
     noteTop10Failure(message);
     onLog(message);
     return false;
   }finally{busy=false;}
 }
 async function updateOneTeam(){
   if(busy||mainBusy()||stopping)return false;
   const target=top10NextDue();
   if(!target)return false;
   busy=true;
   // Protect against repeated reads of an unavailable source.
   noteTopTeamAttempt(target.id);
   try{
     const capture=await withPage(page=>captureTopTeamDetails(page,target));
     const result=saveTopTeamDetails(target.id,capture);
     onLog('Team '+target.name+' captured: roster '+
       (capture.memberStatus==='observed'?result.members:'unavailable')+
       ', bank log '+(['observed','empty_visible_log'].includes(capture.eventStatus)?
         capture.eventStatus:'unavailable')+
       ', '+result.eventsObserved+' visible events, '+result.eventsAdded+
       ' newly saved.');
     return true;
   }catch(error){
     noteTopTeamFailure(target.id,safeError(error));
     onLog('Team detail unavailable ('+target.name+'): '+safeError(error));
     return false;
   }finally{busy=false;}
 }
 function start(){
   if(stopping||listTimer||detailTimer)return;
   // First full SBsxScam capture is already scheduled by the parent worker.
   // Start ranking discovery now and stagger all other teams over five minutes.
   void updateList();
   listTimer=setInterval(()=>{void updateList();},TOP10_LIST_POLL_MS);
   detailTimer=setInterval(()=>{void updateOneTeam();},TOP10_TEAM_SPACING_MS);
 }
 async function stop(){
   stopping=true;
   if(listTimer)clearInterval(listTimer);
   if(detailTimer)clearInterval(detailTimer);
   listTimer=null;detailTimer=null;
   while(busy)await new Promise(resolve=>setTimeout(resolve,100));
 }
 return {start,stop,updateList,updateOneTeam,get busy(){return busy;}};
}
