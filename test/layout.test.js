// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sbs-layout-'));
Object.assign(process.env,{
  NODE_ENV:'test',DB_PATH:join(dir,'layout.sqlite'),
  DISCORD_CLIENT_ID:'100000000000000011',DISCORD_CLIENT_SECRET:'fake',
  DISCORD_BOT_TOKEN:'fake',DISCORD_GUILD_ID:'100000000000000001',BASE_URL:'https://sbstore.info'
});
const {home,avatar}=await import('../src/views.js');
const {createServer}=await import('../src/server.js');
const {db}=await import('../src/db.js');
let server;
after(async()=>{
  if(server) await new Promise(resolve=>server.close(resolve));
  db.close();rmSync(dir,{recursive:true,force:true});
});
const blank={pathname:'/',user:null,role:'none',csrf:'',config:{}};
const signed={...blank,user:{id:'100000000000000002',username:'sbs-user',display_name:'SB'},role:'owner',csrf:'fake'};
test('new pages request a versioned stylesheet and logo instead of reusing the previous theme',()=>{
  const page=home(blank);
  assert.match(page,/\/static\/style\.css\?v=1\.5\.0-social-hub/);
  assert.match(page,/\/static\/app\.js\?v=1\.5\.0-social-hub/);
  assert.match(page,/class="brand-logo"[^>]+width="44" height="44"/);
  assert.match(page,/class="hero-logo"><img[^>]+width="148" height="148"/);
  assert.match(page,/<div class="sidebar-scroll">/);
  assert.doesNotMatch(page,/rel="stylesheet"[^>]* defer/);
});
test('signed-in avatars specify safe dimensions and mobile header remains CSS-controlled',()=>{
  const page=home(signed);
  assert.match(page,/class="top-account">[\s\S]*class="avatar sm"[^>]+width="32" height="32"/);
  assert.match(page,/class="side-profile"[^>]*>[\s\S]*class="avatar side"[^>]+width="40" height="40"/);
  assert.match(page,/class="mobile-brand"[^>]+>[\s\S]*width="36" height="36"/);
  assert.match(avatar(signed.user,'xxl'),/width="106" height="106"/);
  assert.match(avatar(signed.user,'unrecognized'),/width="43" height="43"/);
});

test('staff, mods and temp mods use promotion navigation; ordinary members keep applications',()=>{
  const user={id:'100000000000000002',username:'sbs-user',display_name:'SB'};
  const variants=[
    {role:'member',staffNavigation:false,kind:'ordinary member',promote:false},
    {role:'member',staffNavigation:true,kind:'Staff',promote:true},
    {role:'member',staffNavigation:true,kind:'Mod',promote:true},
    {role:'member',promotionEligible:true,kind:'Temp Mod',promote:true},
    {role:'reviewer',kind:'Reviewer staff',promote:true},
    {role:'admin',kind:'Admin',promote:true},
    {role:'owner',kind:'Owner',promote:true}
  ];
  for(const v of variants){
    const page=home({...blank,...v,user,csrf:'fixture'});
    const discover=page.split('<div class="sidebar-title">DISCOVER</div><nav>')[1]?.split('</nav>')[0]||'';
    const mobile=page.split('<nav class="mobile-nav">')[1]?.split('</nav>')[0]||'';
    if(v.promote){
      for(const link of ['/tickets/mine','/dashboard','/apply'])assert.ok(!discover.includes('href="'+link+'"'),v.kind+' must not see '+link+' in sidebar');
      for(const link of ['/tickets/mine','/dashboard'])assert.ok(!mobile.includes('href="'+link+'"'),v.kind+' must not see '+link+' in mobile navigation');
      assert.equal((discover.match(/href="\/promotions"/g)||[]).length,1,v.kind+' gets one promotion link');
      assert.ok(discover.includes('Apply for a Promotion'),v.kind+' should see promotion shortcut');
      assert.ok(mobile.includes('<a href="/promotions">Apply for a Promotion</a>'),v.kind+' should have mobile promotion shortcut');
    }else{
      for(const link of ['/tickets/mine','/dashboard','/apply'])assert.ok(discover.includes('href="'+link+'"'),v.kind+' keeps '+link+' in sidebar');
      for(const link of ['/tickets/mine','/dashboard'])assert.ok(mobile.includes('href="'+link+'"'),v.kind+' keeps '+link+' in mobile navigation');
      assert.ok(!discover.includes('href="/promotions"'),v.kind+' must not see the promotion shortcut');
    }
  }
});


test('full social toolbar appears beside profile name with desktop icons and mobile account menu',()=>{
  const member={...signed,role:'member',notificationCount:7};
  const page=home(member);
  assert.match(page,/class="top-account">[\s\S]*class="top-social-shortcuts"/);
  assert.match(page,/class="top-social-link top-social-feed" href="\/feed"/);
  assert.match(page,/class="top-social-link top-social-members" href="\/members"/);
  assert.match(page,/class="top-social-link top-social-notifications" href="\/notifications"/);
  assert.match(page,/class="top-social-badge">7<\/span>/);
  assert.match(page,/class="top-social-link top-social-saved" href="\/saved"/);
  assert.match(page,/class="account-profile-link" href="\/profile"/);
  assert.match(page,/class="top-account-dropdown"/);
  assert.match(page,/href="\/profile\/edit">/);
  for(const tab of ['posts','replies','media','likes'])
    assert.ok(page.includes('href="/u/'+member.user.id+'?tab='+tab+'"'),tab+' available in menu');
  for(const name of ['Followers','Following','Following Feed','Find Members','Saved Posts','Notifications'])
    assert.ok(page.includes(name),name+' appears in social menus');
  assert.match(page,/class="top-account-menu-signout">[\s\S]*action="\/auth\/logout"/);
  assert.match(page,/class="mobile-nav">[\s\S]*href="\/profile">My Profile<\/a>/);
  assert.match(page,/class="mobile-nav">[\s\S]*href="\/notifications">Notifications<\/a>/);
  assert.ok(!home(blank).includes('top-account-dropdown'),'signed-out home must not expose a social menu');
  assert.ok(!home({...signed,role:'appeal-only'}).includes('top-account-dropdown'),'appeal-only accounts must not see member social options');
  const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
  assert.match(css,/\.topbar\{overflow:visible\}/,'topbar must not clip the profile dropdown');
  assert.match(css,/\.top-account-menu\{[^}]*overflow-y:auto/,'long mobile menus must scroll');
  assert.match(css,/@media\(max-width:610px\)/);
});

test('client handles likes in place without losing feed scroll',()=>{
  const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(script,/form\[data-post-like\]/);
  assert.match(script,/event\.preventDefault\(\)/);
  assert.match(script,/headers:\{accept:'application\/json'\}/);
  assert.match(script,/count\.textContent=String\(result\.like_count\)/);
  assert.match(script,/button\.classList\.toggle\('activated',result\.liked\)/);
});

test('stylesheet has responsive image constraints and hides desktop mobile brand',()=>{
  const css=readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
  assert.match(css,/\.topbar \.mobile-brand\s*\{display:none\}/);
  assert.match(css,/@media\(max-width:840px\)\s*\{\.topbar \.mobile-brand\s*\{display:flex/);
  assert.match(css,/\.hero-logo img\s*\{[^}]*width:148px;[^}]*height:148px/);
  assert.match(css,/\.sidebar-scroll\s*\{[^}]*overflow-y:auto/);
});
test('static CSS and JS are served no-store even with version query; logo is recognized',async()=>{
  server=createServer({discord:{authUrl:(state)=>'https://discord.com/oauth2/authorize?state='+encodeURIComponent(state)}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  for(const path of ['/static/style.css?v=1.4-promotions','/static/app.js?v=1.4-promotions']){
    const resp=await fetch(base+path);
    assert.equal(resp.status,200);
    assert.match(resp.headers.get('cache-control'),/no-store/);
  }
  const logo=await fetch(base+'/static/sb-logo.png?v=1.4-promotions');
  assert.equal(logo.status,200);
  assert.equal(logo.headers.get('content-type'),'image/png');
});


// BUILT BY SB // RUNING ON WEED AND CAFFEINE
test('Discord receives SB Store branded previews without a login redirect',async()=>{
 const base='http://127.0.0.1:'+server.address().port;
 const headers={'user-agent':'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'};
 for(const [path,heading] of [
   ['/','SB&#39;s &amp; Cam&#39;s Store'],
   ['/team','Our Team | SB&#39;s &amp; Cam&#39;s Store'],
   ['/feed','Main Feed | SB&#39;s &amp; Cam&#39;s Store'],
   ['/suggestions','Server Suggestions | SB&#39;s &amp; Cam&#39;s Store'],
   ['/tickets/new','Support Tickets | SB&#39;s &amp; Cam&#39;s Store'],
   ['/apply','Staff Applications | SB&#39;s &amp; Cam&#39;s Store'],
   ['/staff/tickets/12345','Private Ticket | SB&#39;s &amp; Cam&#39;s Store']
 ]){
   const response=await fetch(base+path,{headers,redirect:'manual'});
   assert.equal(response.status,200,'Discordbot gets HTML rather than an OAuth redirect for '+path);
   assert.match(response.headers.get('content-type'),/text\/html/);
   const html=await response.text();
   assert.ok(html.includes('property="og:title" content="'+heading+'"'),path+' should be branded');
   assert.match(html,/property="og:site_name" content="SB&#39;s &amp; Cam&#39;s Store"/);
   assert.match(html,/property="og:image" content="https:\/\/sbstore\.info\/static\/sb-logo\.png"/);
   assert.match(html,/property="og:description" content="[^"]+"/);
   assert.match(html,/name="twitter:card" content="summary"/);
   assert.ok(html.includes('property="og:url" content="https://sbstore.info'+path+'"'));
   if(path!=='/'){
     assert.ok(html.includes('Continue with Discord'));
     assert.ok(html.includes('/auth/login?next='+encodeURIComponent(path)),'link should return to its original page');
   }
   assert.doesNotMatch(html,/discord\.com\/oauth2/,'site previews must not contain OAuth redirects');
 }
});

test('guest preview never exposes ticket data or mistakes private URLs for public records',async()=>{
 const base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/staff/applications/6577',{redirect:'manual'});
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/Private Ticket/);
 assert.doesNotMatch(html,/Applicant responses|Admin decisions|Private admin note|ticket-conversation/);
 assert.doesNotMatch(html,/Application #6577|Ticket #6577/);
 const noPreview=await fetch(base+'/staff/secret/not-a-route',{redirect:'manual'});
 assert.equal(noPreview.status,303,'unknown paths still follow ordinary login checks');
});

test('Discord login keeps safe same-site return paths and rejects off-site redirect attempts',async()=>{
 const base='http://127.0.0.1:'+server.address().port;
 const inspect=async next=>{
   const r=await fetch(base+'/auth/login?next='+encodeURIComponent(next),{redirect:'manual'});
   assert.equal(r.status,302);
   assert.match(r.headers.get('location'),/^https:\/\/discord\.com\/oauth2/);
   const cookie=r.headers.get('set-cookie')||'';
   const encoded=/oauth=([^;]+)/.exec(cookie)?.[1];
   assert.ok(encoded,'OAuth state cookie exists');
   return JSON.parse(Buffer.from(decodeURIComponent(encoded),'base64url').toString('utf8')).next;
 };
 assert.equal(await inspect('/team'),'/team');
 assert.equal(await inspect('/staff/tickets/12345'),'/staff/tickets/12345');
 assert.equal(await inspect('//malicious.example/steal'),'/');
 assert.equal(await inspect('https://malicious.example/steal'),'/');
 assert.equal(await inspect('/unknown-untrusted-route'),'/');
});
