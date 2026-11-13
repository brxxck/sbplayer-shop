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
const {evidenceGallery,evidenceViewerDialog}=await import('../src/evidence-views.js');
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
  assert.match(page,/\/static\/style\.css\?v=1\.10\.0-team-applications/);
  assert.match(page,/\/static\/app\.js\?v=1\.10\.0-team-applications/);
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

test('Microsoft link appears under account identity and above My Profile in the dropdown',()=>{
 const ready=home({...signed,xboxConfigured:true,xboxLink:null});
 const begin=ready.indexOf('class="top-account-menu-head"');
 const link=ready.indexOf('class="top-account-menu-xbox"',begin);
 const label=ready.indexOf('class="top-account-menu-label">MY PROFILE',link);
 assert.ok(begin>0 && link>begin && label>link,'link sits between profile identity and MY PROFILE');
 assert.match(ready,/class="top-account-menu-xbox"[\s\S]*?<a href="\/profile\/microsoft\/start" class="top-account-menu-xbox-button">/);
 assert.doesNotMatch(ready,/action="\/profile\/microsoft\/start"/,'OAuth starts by navigating, not submitting a form');
 assert.match(ready,/class="top-account-menu-xbox-button"[^>]*>[\s\S]*?Link Microsoft \/ Xbox/);
 const linked=home({...signed,xboxConfigured:true,xboxLink:{gamertag:'SBisOnTop'}});
 assert.match(linked,/Connected: SBisOnTop/);
 assert.match(linked,/Verify Microsoft \/ Xbox/);
 const unavailable=home({...signed,xboxConfigured:false,xboxLink:null});
 assert.match(unavailable,/Microsoft linking not configured/);
 assert.doesNotMatch(unavailable,/action="\/profile\/microsoft\/start"/,'disabled configuration cannot start a login');
 const appeals=home({...signed,role:'appeal-only',xboxConfigured:true});
 assert.doesNotMatch(appeals,/href="\/profile\/microsoft\/start"/,'non-members cannot begin Xbox linking');
});

test('evidence galleries use authenticated routes, safe filenames, accessible controls and privacy-friendly previews',()=>{
 const card=evidenceGallery([
   {id:12,original_name:'IMG_2794.png',mime_type:'image/png',file_size:887808},
   {id:13,original_name:'proof.mp4',mime_type:'video/mp4',file_size:9987},
   {id:14,original_name:'"<script>alert(1)</script>.png',mime_type:'image/png',file_size:888}
 ],'/tickets/attachments');
 assert.match(card,/class="evidence-gallery"/);
 assert.match(card,/src="\/tickets\/attachments\/12\?preview=1"/);
 assert.match(card,/loading="lazy"/);
 assert.match(card,/data-evidence-kind="image"/);
 assert.match(card,/data-evidence-kind="video"/);
 assert.match(card,/data-evidence-download="\/tickets\/attachments\/13"/);
 assert.match(card,/href="\/tickets\/attachments\/12"/);
 assert.ok(!card.includes('<script>alert(1)</script>'),'filenames are always HTML-escaped');
 assert.ok(card.includes('&quot;&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!card.includes('/ticket-files/'),'storage paths must never appear in gallery markup');
 const application=evidenceGallery([
   {id:3,mime_type:'image/jpeg',original_name:'application.jpg',file_size:1234}
 ],'/applications/attachments',true);
 assert.match(application,/evidence-gallery-compact/);
 assert.ok(application.includes('/applications/attachments/3?preview=1'));
 assert.equal(evidenceGallery([]),'');
 const viewer=evidenceViewerDialog();
 for(const action of ['data-evidence-close','data-evidence-prev','data-evidence-next',
   'data-evidence-zoom-in','data-evidence-zoom-out','data-evidence-reset','data-evidence-download'])
   assert.ok(viewer.includes(action),action);
 const page=home(signed);
 assert.ok(page.includes('data-evidence-dialog'));
 assert.match(page,/\/static\/evidence\.js\?v=/);
 const script=readFileSync(new URL('../public/evidence.js',import.meta.url),'utf8');
 for(const marker of ["document.addEventListener('keydown'","dialog.showModal()","URL.createObjectURL(file)",
   "URL.revokeObjectURL(url)","selected evidence".replace(/^s/,'S'),"name=\"evidence\""])
   assert.ok(script.includes(marker),marker+' evidence viewer behavior');
 assert.match(script,/field\.addEventListener\('change'/);
 assert.match(script,/media\.replaceChildren\(\)/);
});

test('standalone MegaSMP retains roster and five-minute refresh',async()=>{
 const page=home(signed);
 assert.match(page,/\/static\/mega-team\.js\?v=1\.10\.0-team-applications/);
 assert.match(page,/\/static\/mega-top10\.js\?v=1\.10\.0-team-applications/);
 const {megaDashboard}=await import('../src/mega-team-data.js');
 const {megaTeamPanel}=await import('../src/mega-team-views.js');
 const dashboard=megaDashboard();
 const html=megaTeamPanel(signed,{data:dashboard,discordGroups:[],syncEnabled:false});
 assert.match(html,/data-mega-dashboard/);
 assert.match(html,/No authorized live feed configured/);
 assert.match(html,/In-game team roster/);
 assert.match(html,/Discord team roster/);
 assert.match(html,/Contribution leaderboard/);
 assert.match(html,/Reported team bank/);
 assert.match(html,/Not recorded|No in-game roster imported yet/);
 assert.ok(html.includes('href="https://inpvp.net/megasmp/teams?team=SBsxScam&amp;gamemode=megasmp&amp;id=5638a504-3347-43fc-89d6-424dad53b7f6"'));
 assert.match(html,/action="\/team\/mega\/roster"/,'admin management controls are role-scoped');
 assert.match(html,/action="\/team\/mega\/season"/,'owner controls can change the season');
 assert.doesNotMatch(megaTeamPanel({...signed,role:'member'},{data:dashboard,discordGroups:[],syncEnabled:false}),/action="\/team\/mega\/bank"/);
 const nonMember=megaTeamPanel({...signed,role:'appeal-only'},{data:dashboard,discordGroups:[],syncEnabled:false});
 assert.ok(nonMember.includes('verified Discord server members'));
 assert.doesNotMatch(nonMember,/data-mega-value="balance"|action="\/team\/mega\/bank"/);
 const script=readFileSync(new URL('../public/mega-team.js',import.meta.url),'utf8');
 assert.ok(script.includes("fetch('/team/mega/data?season='"));
 assert.match(script,/setInterval\(/);
 assert.ok(script.includes('},300000)'));
 assert.ok(script.includes("textContent="),'user-controlled data must never be inserted with innerHTML');
 assert.doesNotMatch(script,/inpvp\.net\/api/,'the browser must not scrape InPvP');
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
  const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(script,/const topAccountMenu=document\.querySelector\('\[data-account-dropdown\]'\)/);
  assert.match(script,/topAccountMenu\.addEventListener\('keydown'/);
  assert.match(script,/if\(topAccountMenu\.open&&!topAccountMenu\.contains\(event\.target\)\)/);
});

test('curated Lucide SVG icons render in navigation, dropdown, feed and support without missing assets',async()=>{
  const {icon,AVAILABLE_ICONS,NAV_ICON_NAMES}=await import('../src/icons.js');
  const {postCard}=await import('../src/views.js');
  const {chooseTicket}=await import('../src/support-views.js');
  assert.ok(AVAILABLE_ICONS.length>=70,'sitewide refresh should include broad official icon coverage');
  for(const [route,name] of Object.entries(NAV_ICON_NAMES)){
    assert.ok(AVAILABLE_ICONS.includes(name),'missing navigation icon '+route+': '+name);
  }
  for(const name of ['circle-user-round','badge-check','heart','bookmark','message-circle',
    'repeat-2','share-2','award','ticket-plus','bug','gift','shield-ban','scale',
    'chevron-right','trash','send','log-out']){
    assert.ok(AVAILABLE_ICONS.includes(name),'missing core icon '+name);
    const svg=icon(name);
    assert.match(svg,/^<svg /);
    assert.match(svg,/role="presentation" aria-hidden="true"/);
    assert.ok(/<(?:path|circle|rect|line|polyline|polygon|ellipse)\b/.test(svg),name+' should contain genuine SVG geometry');
    assert.ok(!svg.includes('<script'));
  }
  assert.match(icon('bell',{label:'New <notification>'}),/aria-label="New &lt;notification&gt;"/,'label is escaped');

  const custom=home({...signed,profileAvatarPath:'/uploads/avatars/self-picture.png'});
  assert.match(custom,/class="top-account-menu-head">[\s\S]*class="avatar menu" src="\/uploads\/avatars\/self-picture\.png"/);
  assert.match(custom,/class="account-profile-link" href="\/profile"[\s\S]*src="\/uploads\/avatars\/self-picture\.png"/);
  assert.ok(custom.includes('Discord linked'),'dropdown labels verified Discord account');
  assert.ok(custom.includes('class="menu-action-icon"'),'menu items use consistent icon containers');
  assert.ok(custom.includes('class="top-social-shortcuts"'),'top toolbar is preserved');

  const fallback=home({...signed,profileAvatarPath:''});
  assert.match(fallback,/class="avatar menu" src="https:\/\/cdn\.discordapp\.com\//,'Discord avatar fallback is rendered');
  const ticketPage=chooseTicket({...signed,role:'member',promotionEligible:true});
  assert.match(ticketPage,/class="support-choice-icon"><svg [^>]*class="lucide-icon/);
  assert.ok(ticketPage.includes('Promotion Ticket'),'promotion access remains available');

  const example={id:987,user_id:'100000000000000003',username:'tester',display_name:'Test User',
    body:'Lucide test post',created_at:Date.now(),liked:true,bookmarked:true,like_count:1,
    comment_count:2,repost_count:0,reposted:false};
  const card=postCard(signed,example,{feedPage:0});
  assert.match(card,/data-like-heart aria-hidden="true"><svg /);
  assert.match(card,/data-bookmark-label>Saved<\/span>/);
  assert.match(card,/data-repost-count>/);
  assert.ok(card.includes('aria-label="Share post"'));
  const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(script,/heart\.classList\.toggle\('is-liked',result\.liked\)/,'likes retain SVG icon');
  assert.match(script,/label\.textContent=enabled\?'Saved':'Save'/,'bookmarks retain SVG icon');
  assert.match(script,/button\.innerHTML=original/,'share feedback restores original SVG icon');
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
