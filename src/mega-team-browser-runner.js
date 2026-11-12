// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Co-locate the opt-in read-only browser worker with the website: both processes
// share the SAME mounted SQLite volume. A crash cannot stop the HTTP server.
import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {config} from './config.js';
import {activeMegaSeason} from './mega-team.js';
import {noteMegaCaptureFailure} from './mega-team-bank-event-store.js';

export const browserCaptureConfigured=()=>process.env.NODE_ENV!=='test'&&
 process.env.MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED==='true'&&
 process.env.MEGA_TEAM_BROWSER_AUTO_START==='true';

export function createMegaBrowserRunner({enabled=browserCaptureConfigured(),launch=spawn}={}){
 let child=null,restart=null,stopping=false;
 const script=fileURLToPath(new URL('../scripts/mega-bank-browser-worker.js',import.meta.url));
 const profile=process.env.MEGA_TEAM_BROWSER_PROFILE_DIR||
  resolve(dirname(config.dbPath),'mega-browser-profile');
 function failure(message){
  const safe=String(message).slice(0,150);
  console.error('[Mega collector]',safe);
  try{noteMegaCaptureFailure(activeMegaSeason(),safe);}catch{}
 }
 function start(){
  if(!enabled||stopping||child)return false;
  try{
   child=launch(process.execPath,[script],{
    cwd:resolve(fileURLToPath(new URL('..',import.meta.url))),
    env:{...process.env,DB_PATH:config.dbPath,MEGA_TEAM_BROWSER_PROFILE_DIR:profile},
    stdio:'inherit',shell:false
   });
   child.once('error',error=>failure('Collector could not launch: '+error.message));
   child.once('exit',(code,signal)=>{
    child=null;
    if(stopping)return;
    failure('Collector stopped ('+(signal||code||'unknown')+'). Automatic restart scheduled.');
    restart=setTimeout(()=>{restart=null;start();},60000);
    restart.unref?.();
   });
   return true;
  }catch(error){child=null;failure('Collector launch failed: '+error.message);return false;}
 }
 function stop(){
  stopping=true;
  if(restart)clearTimeout(restart);
  restart=null;
  if(child)child.kill('SIGTERM');
 }
 return {enabled,start,stop};
}
