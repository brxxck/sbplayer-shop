// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Only poll an explicitly approved, structured JSON feed; never scrape the InPvP website.
// InPvP's terms prohibit automated website interactions without permission.
import {isIP} from 'node:net';
import {TEAM_REFRESH_MS,MEGA_TEAM_ID,setMegaSyncState} from './mega-team.js';
import {importMegaSnapshot} from './mega-team-data.js';

export function approvedMegaFeedUrl(raw,{inpvpPermission=false}={}){
 if(!raw)return null;
 let url;
 try{url=new URL(raw);}catch{return null;}
 const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||!host.includes('.')||
    host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||isIP(host))
   return null;
 if((host==='inpvp.net'||host.endsWith('.inpvp.net'))&&!inpvpPermission)
   return null;
 if(url.hash)return null;
 return url.toString();
}
export function createMegaTeamSync({
 feedUrl=process.env.MEGA_TEAM_SYNC_URL||'',
 authorized=process.env.MEGA_TEAM_SYNC_AUTHORIZED==='true',
 inpvpPermission=process.env.MEGA_TEAM_INPVP_AUTOMATION_APPROVED==='true',
 token=process.env.MEGA_TEAM_SYNC_TOKEN||'',
 request=fetch
}={}){
 const url=authorized?approvedMegaFeedUrl(feedUrl,{inpvpPermission}):null;
 const enabled=!!url;
 let polling=false,timer=null,initial=null,lastPoll=0;
 async function poll({force=false}={}){
  if(!enabled)return {ok:false,status:'unconfigured'};
  if(polling)return {ok:false,status:'busy'};
  if(!force&&Date.now()-lastPoll<TEAM_REFRESH_MS-2000)return {ok:false,status:'cooldown'};
  polling=true;lastPoll=Date.now();
  setMegaSyncState({attempt:lastPoll});
  try{
   const response=await request(url,{
    method:'GET',redirect:'error',credentials:'omit',
    headers:{accept:'application/json',...(token?{authorization:'Bearer '+token}:{})},
    signal:AbortSignal.timeout(10000)
   });
   if(!response.ok)throw new Error('Trusted team feed returned HTTP '+response.status);
   if(!String(response.headers.get('content-type')||'').toLowerCase().includes('application/json'))
    throw new Error('Trusted team feed must return JSON.');
   const text=await response.text();
   if(text.length>300000)throw new Error('Trusted team feed exceeds the maximum response size.');
   const body=JSON.parse(text);
   if(body?.team_id!==MEGA_TEAM_ID)throw new Error('Trusted feed returned another team.');
   const result=importMegaSnapshot(body,{source:'authorized_feed'});
   return {ok:true,status:'updated',...result};
  }catch(error){
   // Do not persist URL, credentials, or network exception details.
   const message=/team feed returned HTTP|must return JSON|maximum response|another team|snapshot|season|gamertag|member|amount|source/i.test(String(error.message||''))
     ?String(error.message).slice(0,170):'Trusted team feed is temporarily unavailable.';
   setMegaSyncState({error:message});
   return {ok:false,status:'error'};
  }finally{polling=false;}
 }
 function start(){
  if(!enabled||timer)return false;
  initial=setTimeout(()=>{void poll();},1500);initial.unref?.();
  timer=setInterval(()=>{void poll();},TEAM_REFRESH_MS);timer.unref?.();
  return true;
 }
 function stop(){
  if(initial)clearTimeout(initial);if(timer)clearInterval(timer);
  initial=null;timer=null;
 }
 return {enabled,poll,start,stop};
}
