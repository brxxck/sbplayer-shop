// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// PREPARATION BRANCH ONLY — opt-in, read-only MegaSMP bank-event browser worker.
// Run as a separate process after installing Playwright. No public website changes.
// Never commit the browser profile: it contains your authenticated session.
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
import {createInterface} from 'node:readline/promises';
import {MEGA_TEAM_URL,activeMegaSeason,TEAM_REFRESH_MS} from '../src/mega-team.js';
import {captureTeamBankPage} from '../src/mega-team-page-collector.js';
import {noteMegaCaptureFailure} from '../src/mega-team-bank-event-store.js';
import {saveMegaBrowserCapture} from '../src/mega-team-browser-snapshot.js';

const args=new Set(process.argv.slice(2));
const allowed=process.env.MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED==='true';
if(!allowed){
  console.error('Browser worker disabled. Only enable after site owner permission: MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED=true');
  process.exitCode=1;
}else{
  const rawProfile=process.env.MEGA_TEAM_BROWSER_PROFILE_DIR||
    resolve(homedir(),'.sbs-megasmp-private-browser');
  const profile=resolve(rawProfile);
  mkdirSync(profile,{recursive:true,mode:0o700});
  let playwright;
  try{playwright=await import('playwright');}
  catch{console.error('Playwright is not installed. See docs/MEGASMP_BROWSER_PREP.md.');process.exitCode=1;}
  if(playwright){
    const login=args.has('--login');
    const headless=!login&&process.env.MEGA_TEAM_BROWSER_HEADLESS!=='false';
    const browser=await playwright.chromium.launchPersistentContext(profile,{
      headless,acceptDownloads:false,serviceWorkers:'block',
      viewport:{width:1360,height:850}
    });
    let busy=false,stopped=false,timer=null;
    async function collect(){
      if(busy||stopped)return;
      busy=true;
      const page=await browser.newPage();
      try{
        const capture=await captureTeamBankPage(page,{
          url:MEGA_TEAM_URL,
          selector:process.env.MEGA_TEAM_BANK_ROW_SELECTOR||''
        });
        // Running a browser does not imply complete historic coverage.
        const result=saveMegaBrowserCapture(capture,{
          season:activeMegaSeason()
        });
        console.log('[Mega bank] captured '+result.seen+' rows, '+result.inserted+
          ' new, '+result.duplicates+' already known; '+result.rosterSeen+' roster observations; bank '+(result.bankSeen?'observed':'unavailable')+'. History completeness unverified.');
      }catch(error){
        const message=String(error.message||'Capture failed').slice(0,160);
        noteMegaCaptureFailure(activeMegaSeason(),message);
        console.error('[Mega bank] '+message);
      }finally{
        await page.close().catch(()=>{});
        busy=false;
      }
    }
    try{
      if(login){
        const page=await browser.newPage();
        await page.goto(MEGA_TEAM_URL,{waitUntil:'domcontentloaded'});
        console.log('Use this visible browser to sign in normally if needed, then inspect the Bank Event Log.');
        const rl=createInterface({input:process.stdin,output:process.stdout});
        await rl.question('Press Enter when the Bank Event Log is visible. Session stays only in your local profile. ');
        rl.close();
        await page.close();
      }else{
        await collect();
        if(!args.has('--once')){
          timer=setInterval(()=>{void collect();},TEAM_REFRESH_MS);
          console.log('[Mega bank] read-only capture scheduled every five minutes.');
          const shutdown=async()=>{
            if(stopped)return;stopped=true;
            if(timer)clearInterval(timer);
            while(busy)await new Promise(done=>setTimeout(done,250));
            await browser.close();
          };
          process.once('SIGINT',()=>{void shutdown();});
          process.once('SIGTERM',()=>{void shutdown();});
        }
      }
    }finally{
      if(login||args.has('--once'))await browser.close();
    }
  }
}
