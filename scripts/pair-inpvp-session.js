// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Local-only first login: Microsoft authentication stays in your browser.
// Sends only filtered InPvP cookies/localStorage to your own SB Store over HTTPS.
import {createInterface} from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {sanitizeInPvPStorageState} from '../src/mega-session-state.js';
import {MEGA_TEAM_URL} from '../src/mega-team.js';

const args=process.argv.slice(2);
const local=args.includes('--local');
const site=local?'http://localhost:3000':'https://sbstore.info';
let pw;
try{pw=await import('playwright');}
catch{
  console.error('Playwright is missing. Run: npm install --no-save --package-lock=false playwright');
  console.error('Then run: npx playwright install chromium');
  process.exitCode=1;
}
if(pw){
  const rl=createInterface({input,output});
  let browser;
  try{
    console.log('Open '+site+'/owner/mega/session in your usual browser.');
    console.log('Sign in with Discord as the verified website owner, then generate a pairing code.');
    const code=(await rl.question('Paste the one-time pairing code: ')).trim();
    if(!/^[A-Za-z0-9_-]{32}$/.test(code))
      throw new Error('Invalid pairing code. Generate a new one on the owner-only page.');
    browser=await pw.chromium.launch({headless:false});
    const context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block',
      viewport:{width:1360,height:850}});
    const page=await context.newPage();
    await page.goto(MEGA_TEAM_URL,{waitUntil:'domcontentloaded',timeout:30000});
    console.log('In the Chromium window, sign in normally on InPvP using Microsoft.');
    console.log('Make sure you are back on inpvp.net, and verify you can see your signed-in account.');
    await rl.question('Only after successful InPvP login, press Enter here to pair your session. ');
    const current=new URL(page.url());
    if(current.protocol!=='https:'||
       !(current.hostname==='inpvp.net'||current.hostname.endsWith('.inpvp.net')))
      throw new Error('You are not currently on InPvP. Finish the official login first.');
    const state=sanitizeInPvPStorageState(await context.storageState());
    if(!state.origins.some(o=>o.localStorage.length))
      throw new Error('No InPvP localStorage was found. Finish sign-in and retry.');
    const response=await fetch(site+'/owner/mega/session/pair',{
      method:'POST',redirect:'manual',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({code,state}),
      signal:AbortSignal.timeout(20000)
    });
    if(response.status!==200)
      throw new Error('Session transfer failed (HTTP '+response.status+'). Use a fresh owner pairing code.');
    const result=await response.json();
    if(!result.saved)throw new Error('Website did not confirm the session.');
    console.log('InPvP session securely paired with '+site+'.');
    console.log('Only InPvP session storage was transferred; Microsoft cookies and passwords were not.');
    console.log('Return to the owner page to check status. The collector runs every five minutes when enabled.');
  }catch(error){
    console.error('Pairing failed:',error?.message||'Unknown error');
    process.exitCode=1;
  }finally{
    if(browser)await browser.close().catch(()=>{});
    rl.close();
  }
}
