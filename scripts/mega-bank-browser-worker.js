// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Opt-in, read-only MegaSMP bank-event browser worker.
// New mode: encrypted InPvP session under private SQLite volume (not browser profile).
// Legacy persistent profile remains available only when no encryption key is configured.
import {mkdirSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {homedir} from 'node:os';
import {createInterface} from 'node:readline/promises';
import {MEGA_TEAM_URL,activeMegaSeason,TEAM_REFRESH_MS} from '../src/mega-team.js';
import {captureTeamBankPage,megaCollectorPageDiagnostics} from '../src/mega-team-page-collector.js';
import {config} from '../src/config.js';
import {noteMegaCaptureFailure} from '../src/mega-team-bank-event-store.js';
import {saveMegaBrowserCapture} from '../src/mega-team-browser-snapshot.js';
import {createMegaSessionVault} from '../src/mega-session-vault.js';
import {sanitizeInPvPStorageState} from '../src/mega-session-state.js';

const args=new Set(process.argv.slice(2));
const allowed=process.env.MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED==='true';
if(!allowed){
  console.error('Browser worker disabled. Enable only after site owner authorizes read-only checking.');
  process.exitCode=1;
}else{
  const rawProfile=process.env.MEGA_TEAM_BROWSER_PROFILE_DIR||
    resolve(homedir(),'.sbs-megasmp-private-browser');
  const profile=resolve(rawProfile);
  let playwright;
  try{playwright=await import('playwright');}
  catch{console.error('Playwright is not installed. See docs/MEGASMP_BROWSER_PREP.md.');process.exitCode=1;}
  if(playwright){
    const login=args.has('--login');
    const vault=createMegaSessionVault({dbPath:config.dbPath});
    const encryptedMode=vault.configured&&!login;
    const headless=!login&&process.env.MEGA_TEAM_BROWSER_HEADLESS!=='false';
    if(!encryptedMode)mkdirSync(profile,{recursive:true,mode:0o700});
    // An encrypted worker uses fresh memory-only contexts so Chromium cannot
    // save access tokens in an unencrypted persistent profile.
    const browser=encryptedMode?await playwright.chromium.launch({headless}):
      await playwright.chromium.launchPersistentContext(profile,{
        headless,acceptDownloads:false,serviceWorkers:'block',
        viewport:{width:1360,height:850}
      });
    const screenshotPath=resolve(dirname(config.dbPath),'mega-bank-last-failure.png');
    let busy=false,stopped=false,timer=null;
    async function collect(){
      if(busy||stopped)return;
      busy=true;
      let context=null,page=null,originalState=null,revision=null,success=false;
      const transport={failedRequests:0,httpErrors:0,pageErrors:0};
      try{
        if(encryptedMode){
          revision=vault.fingerprint();
          originalState=vault.load();
          context=await browser.newContext({
            ...(originalState?{storageState:originalState}:{}),
            acceptDownloads:false,serviceWorkers:'block',
            viewport:{width:1360,height:850}
          });
        }else context=browser;
        page=await context.newPage();
        // Aggregate page errors only. Never log cookies, URLs with tokens, or headers.
        page.on?.('requestfailed',request=>{
          try{if(['fetch','xhr'].includes(request.resourceType()) &&
            new URL(request.url()).hostname==='inpvp.net')transport.failedRequests++;}
          catch{}
        });
        page.on?.('response',response=>{
          try{if(['fetch','xhr'].includes(response.request().resourceType()) &&
            new URL(response.url()).hostname==='inpvp.net'&&response.status()>=400)
              transport.httpErrors++;}
          catch{}
        });
        page.on?.('pageerror',()=>{transport.pageErrors++;});
        const capture=await captureTeamBankPage(page,{
          url:MEGA_TEAM_URL,selector:process.env.MEGA_TEAM_BANK_ROW_SELECTOR||''
        });
        const result=saveMegaBrowserCapture(capture,{season:activeMegaSeason()});
        success=true;
        console.log('[Mega bank] captured '+result.seen+' rows, '+result.inserted+
          ' new, '+result.duplicates+' already known; '+result.rosterSeen+
          ' roster observations; bank '+(result.bankSeen?'observed':'unavailable')+
          '. History completeness unverified.');
        rmSync(screenshotPath,{force:true});
        if(encryptedMode&&originalState){
          // Retain only successfully used InPvP data. Never save Microsoft state.
          // The revision check prevents stale worker state from replacing a new
          // owner-uploaded session (or restoring a deleted session).
          try{
            const latest=sanitizeInPvPStorageState(await context.storageState());
            if(JSON.stringify(latest)!==JSON.stringify(originalState)){
              const updated=vault.save(latest,{expectedFingerprint:revision});
              if(updated)console.log('[Mega bank] encrypted InPvP session refreshed.');
            }
          }catch{
            console.error('[Mega bank] Could not persist updated session safely.');
          }
        }
      }catch(error){
        // Collector exceptions can contain page URLs or contents: only use
        // pre-existing sanitized page diagnostics and generic security-safe text.
        const message=String(error?.message||'Capture failed').slice(0,160);
        noteMegaCaptureFailure(activeMegaSeason(),message);
        console.error('[Mega bank] '+message);
        if(page){
          const info=await megaCollectorPageDiagnostics(page).catch(()=>({unavailable:true}));
          console.error('[Mega bank][diagnostics] '+JSON.stringify({...info,transport}));
          try{
            await page.screenshot({path:screenshotPath,fullPage:true,
              animations:'disabled',timeout:12000});
            console.error('[Mega bank] Private owner diagnostic screenshot saved.');
          }catch{console.error('[Mega bank] Diagnostic screenshot unavailable.');}
        }
      }finally{
        if(page)await page.close().catch(()=>{});
        if(encryptedMode&&context)await context.close().catch(()=>{});
        busy=false;
      }
    }
    try{
      if(login){
        const page=await browser.newPage();
        await page.goto(MEGA_TEAM_URL,{waitUntil:'domcontentloaded'});
        console.log('Use this visible browser to sign in normally, then inspect the Bank Event Log.');
        const rl=createInterface({input:process.stdin,output:process.stdout});
        await rl.question('Press Enter when the Bank Event Log is visible. ');
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
