// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sbs-app-test-'));
const ids={guild:'100000000000000001',owner:'100000000000000002',adminA:'100000000000000003',adminB:'100000000000000004',adminC:'100000000000000005',reviewer:'100000000000000006',member:'100000000000000007',member2:'100000000000000008',bot:'100000000000000009',member3:'100000000000000010',member4:'100000000000000012',member5:'100000000000000013',member6:'100000000000000014',member7:'100000000000000015',member8:'100000000000000016',member9:'100000000000000017'};
const roles={admin:'200000000000000001',reviewer:'200000000000000002',helper:'200000000000000003',vip:'200000000000000004',bot:'200000000000000005',manage:'200000000000000006',mega:'200000000000000007',prison:'200000000000000008',storeStaff:'200000000000000009',megaTrusted:'200000000000000010',megaStaffTrusted:'200000000000000011',mod:'200000000000000012',headMod:'200000000000000013',tempMod:'1539085168281919648',sbsLeader:'1557586028729077841',sbsMember:'1565070132676661439'};
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'testing.sqlite'),DISCORD_CLIENT_ID:'100000000000000011',DISCORD_CLIENT_SECRET:'mock-secret',DISCORD_BOT_TOKEN:'mock-bot-token',DISCORD_GUILD_ID:ids.guild,REVIEWER_ROLE_IDS:roles.reviewer,ADMIN_ROLE_IDS:roles.admin,OWNER_USER_IDS:'',FINAL_APPROVER_USER_ID:ids.owner,DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef',APPLICATION_ROLES:'Helper,Moderator,Staff',APPLICATION_ROLE_IDS:''});
const {createServer}=await import('../src/server.js');
const {one,all,run,db}=await import('../src/db.js');
const {saveXboxLink}=await import('../src/xbox-gamertag-links.js');
const {config}=await import('../src/config.js');
const {verifyAudit,appendAudit}=await import('../src/audit.js');
const fakeRoles=[
  {id:ids.guild,name:'@everyone',position:0,permissions:'0',managed:false,color:0},
  {id:roles.admin,name:'Administrator',position:50,permissions:'8',managed:false,color:16711680},
  {id:roles.reviewer,name:'Reviewer',position:25,permissions:'0',managed:false,color:22445},
  {id:roles.helper,name:'Helper',position:10,permissions:'0',managed:false,color:23376},
  {id:roles.vip,name:'VIP',position:9,permissions:'0',managed:false,color:33299},
  {id:roles.manage,name:'Role Manager',position:8,permissions:String(1n<<28n),managed:false,color:2222222},
  {id:roles.bot,name:'SB Bot',position:90,permissions:String(1n<<28n),managed:true,color:442211},
  {id:roles.mega,name:'Mega Smp Staff',position:7,permissions:'0',managed:false,color:112233},
  {id:roles.prison,name:'Prison Staff',position:6,permissions:'0',managed:false,color:223344},
  {id:roles.storeStaff,name:'Staff',position:5,permissions:'0',managed:false,color:334455},
  {id:roles.megaTrusted,name:'Mega Smp Staff Trusted',position:13,permissions:'0',managed:false,color:335577},
  {id:roles.megaStaffTrusted,name:'Mega Staff Trusted',position:14,permissions:'0',managed:false,color:445588},
  {id:roles.sbsLeader,name:'SBs Team Leader',position:12,permissions:'0',managed:false,color:0xdb2626},
  {id:roles.sbsMember,name:'[SBs] SBs Team Member',position:11,permissions:'0',managed:false,color:0xff2525},
  {id:roles.mod,name:'Mod',position:15,permissions:'0',managed:false,color:0x4992db},
  {id:roles.headMod,name:'Head Mod',position:16,permissions:'0',managed:false,color:0x3d9ded},
  {id:roles.tempMod,name:'Temp Mod',position:4,permissions:'0',managed:false,color:0x63c4e6}
];
const memberMap=new Map();
for(const [key,id] of Object.entries(ids))if(key!=='guild')memberMap.set(id,{user:{id,username:key.toLowerCase(),global_name:key,avatar:null,bot:key==='bot'},roles:key.startsWith('admin')?[roles.admin]:key==='reviewer'?[roles.reviewer]:key==='bot'?[roles.bot]:[],pending:false});
 // Simulate external-community roles, cross-community members and real store staff.
 memberMap.get(ids.member3).roles.push(roles.mega);
 memberMap.get(ids.member4).roles.push(roles.prison);
 memberMap.get(ids.member5).roles.push(roles.mega,roles.prison);
 memberMap.get(ids.member6).roles.push(roles.storeStaff);
 memberMap.get(ids.adminA).roles.push(roles.mega,roles.sbsMember);
 memberMap.get(ids.member2).roles.push(roles.sbsMember,roles.megaTrusted);
 memberMap.get(ids.member3).roles.push(roles.sbsLeader,roles.megaStaffTrusted);
 memberMap.get(ids.member4).roles.push(roles.sbsLeader,roles.sbsMember);
 memberMap.get(ids.member6).roles.push(roles.megaTrusted);
 memberMap.get(ids.member7).roles.push(roles.tempMod);
 memberMap.get(ids.member8).roles.push(roles.mod,roles.headMod);
 memberMap.get(ids.member9).roles.push(roles.storeStaff,roles.mod,roles.tempMod);
let additions=0;let failNextRole=false;const notifications=[];
const fake={
  getGuild:async()=>({id:ids.guild,owner_id:ids.owner}),
  getBotIdentity:async()=>({id:ids.bot,username:'sb-bot'}),
  getGuildMember:async id=>memberMap.get(id)||null,
  getRoles:async()=>structuredClone(fakeRoles),
  searchMembers:async q=>[...memberMap.values()].filter(x=>x.user.username.startsWith(q.toLowerCase())),
  listMembers:async()=>[...memberMap.values()],
  addRole:async(id,role)=>{if(failNextRole){failNextRole=false;throw new Error('Mock Discord temporary failure');}const m=memberMap.get(id);if(!m)throw new Error('Unknown test user');if(!m.roles.includes(role))m.roles.push(role);additions++;},
  removeRole:async(id,role)=>{const m=memberMap.get(id);if(!m)throw new Error('Unknown test user');m.roles=m.roles.filter(x=>x!==role);},
  notify:async params=>{notifications.push(params);return true;}
};
let server,base;
const sessions=new Map();
before(async()=>{server=createServer({discord:fake,testLogin:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(temp,{recursive:true,force:true});});
async function get(path,who){return fetch(base+path,{headers:who?{cookie:sessions.get(who).cookie}:{},redirect:'manual'});}
async function login(who){const resp=await fetch(base+'/__test/login/'+ids[who],{redirect:'manual'});assert.equal(resp.status,303);const cookie=resp.headers.get('set-cookie').split(';')[0];const dash=await fetch(base+'/dashboard',{headers:{cookie}});assert.equal(dash.status,200);const html=await dash.text();const csrf=/name="_csrf" value="([^"]+)"/.exec(html)?.[1];assert.ok(csrf);sessions.set(who,{cookie,csrf});}
async function post(path,who,values={}){
  const s=sessions.get(who);return fetch(base+path,{method:'POST',headers:{cookie:s.cookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:s.csrf,...values}),redirect:'manual'});
}
const answers={position:'Helper',age_bracket:'18+',timezone:'GMT',availability:'I am usually active through the evenings and weekends.',experience:'I have helped moderate several online communities in the past.',motivation:'I want to support members and improve the community experience.',scenario:'I would ask them to stop arguing and move the dispute into a private support ticket.'};

test('login as each permission level, and enforce owner-only audit',async()=>{
  for(const x of ['owner','adminA','adminB','adminC','reviewer','member','member2','member3','member4','member5','member6'])await login(x);
  assert.equal((await get('/owner/audit','member')).status,403);
  assert.equal((await get('/owner/audit','adminA')).status,403);
  assert.equal((await get('/admin/roles','reviewer')).status,403);
  assert.equal((await get('/staff','member')).status,403);
  assert.equal((await get('/owner/audit','owner')).status,200);
  assert.equal((await get('/admin/roles','adminA')).status,200);
  assert.equal((await get('/team','member')).status,200);
  assert.equal((await get('/members?q=mem','member')).status,200);
});

test('Xbox gamertag profile integration is disabled cleanly until configured',async()=>{
 const p=await get('/profile/edit','member');
 assert.equal(p.status,200);
 const html=await p.text();
 assert.match(html,/Connected Accounts/);
 assert.match(html,/Xbox linking is not configured yet/);
 assert.doesNotMatch(html,/href="\/profile\/microsoft\/start"/);
 const otherPage=await get('/u/'+ids.member2,'member');
 assert.equal(otherPage.status,200);
 assert.doesNotMatch(await otherPage.text(),/Verified Xbox gamertag:/);
 const start=await post('/profile/microsoft/start','member',{});
 assert.equal(start.status,303);
 assert.equal(start.headers.get('location'),'/profile/microsoft/result?status=not_configured');
 const missingCsrf=await fetch(base+'/profile/microsoft/unlink',{
  method:'POST',headers:{cookie:sessions.get('member').cookie,
   'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({}),redirect:'manual'
 });
 assert.equal(missingCsrf.status,403);
 const unlink=await post('/profile/microsoft/unlink','member',{});
 assert.equal(unlink.status,303);
 assert.match(unlink.headers.get('location'),/No.*Xbox.*gamertag/);
 const callback=await get('/profile/microsoft/callback?state=unknown&code=one','member');
 assert.equal(callback.status,303);
 assert.equal(callback.headers.get('location'),'/profile/microsoft/result?status=expired');
});

test('Xbox account menu navigates to Microsoft via GET, bypassing form-action redirect restrictions',async()=>{
 const envNames=['XBOX_LINK_CLIENT_ID','XBOX_LINK_CLIENT_SECRET','XBOX_LINK_ACCOUNT_KEY'];
 const old=Object.fromEntries(envNames.map(k=>[k,process.env[k]]));
 let extraServer;
 try{
  Object.assign(process.env,{
   XBOX_LINK_CLIENT_ID:'11111111-1111-1111-1111-111111111111',
   XBOX_LINK_CLIENT_SECRET:'fixture-client-secret-value',
   XBOX_LINK_ACCOUNT_KEY:'fixture-integration-key-longer-than-32-characters'
  });
  // An independent configured server exercises the real GET route without
  // ever contacting Microsoft or using any production account credentials.
  extraServer=createServer({discord:fake,testLogin:true});
  await new Promise(resolve=>extraServer.listen(0,'127.0.0.1',resolve));
  const host='http://127.0.0.1:'+extraServer.address().port;
  const memberSession=sessions.get('member'),cookie=memberSession.cookie;
  const home=await fetch(host+'/',{headers:{cookie},redirect:'manual'});
  assert.equal(home.status,200);
  const html=await home.text();
  assert.match(html,/class="top-account-menu-xbox"[\s\S]*?href="\/profile\/microsoft\/start"/);
  assert.doesNotMatch(html,/action="\/profile\/microsoft\/start"/,'no HTML form can block the OAuth redirect');
  const csp=home.headers.get('content-security-policy')||'';
  assert.match(csp,/form-action 'self' https:\/\/login\.microsoftonline\.com;/);
  assert.doesNotMatch(csp,/form-action[^;]*\*/,'forms must remain restricted');
  const response=await fetch(host+'/profile/microsoft/start',{
   method:'GET',redirect:'manual',headers:{cookie,'sec-fetch-site':'same-origin'}
  });
  assert.equal(response.status,303);
  const oauth=new URL(response.headers.get('location'));
  assert.equal(oauth.origin,'https://login.microsoftonline.com');
  assert.equal(oauth.pathname,'/consumers/oauth2/v2.0/authorize');
  assert.equal(oauth.searchParams.get('scope'),'xboxlive.signin');
  assert.equal(oauth.searchParams.get('redirect_uri'),config.baseUrl+'/profile/microsoft/callback');
  assert.ok(oauth.searchParams.get('state'));
  assert.equal(oauth.searchParams.get('code_challenge_method'),'S256');
  const foreign=await fetch(host+'/profile/microsoft/start',{
   method:'GET',redirect:'manual',headers:{cookie,'sec-fetch-site':'cross-site'}
  });
  assert.equal(foreign.status,403,'third-party pages cannot spend OAuth start quotas');
  const failure=await fetch(host+'/profile/microsoft/callback?'+
   new URLSearchParams({state:oauth.searchParams.get('state'),error:'invalid_scope',
    error_description:'SENSITIVE-DETAILS-NOT-FOR-RENDERING'}),{
   redirect:'manual',headers:{cookie}
  });
  assert.equal(failure.status,303);
  assert.equal(failure.headers.get('location'),'/profile/microsoft/result?status=invalid_scope');
  const feedback=await fetch(host+failure.headers.get('location'),{headers:{cookie}});
  assert.equal(feedback.status,200);
  const feedbackHtml=await feedback.text();
  assert.match(feedbackHtml,/Microsoft rejected the Xbox permission/);
  assert.match(feedbackHtml,/Retry Microsoft \/ Xbox sign-in/);
  assert.ok(!feedbackHtml.includes('SENSITIVE-DETAILS-NOT-FOR-RENDERING'));
  const malicious=await fetch(host+'/profile/microsoft/result?status=%3Cscript%3Ebad%3C%2Fscript%3E',{
   headers:{cookie}
  });
  assert.equal(malicious.status,200);
  assert.doesNotMatch(await malicious.text(),/<script>bad<\/script>/);
  // Previously rendered forms remain supported but still need real CSRF.
  const legacy=await fetch(host+'/profile/microsoft/start',{
   method:'POST',redirect:'manual',
   headers:{cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({_csrf:memberSession.csrf})
  });
  assert.equal(legacy.status,303);
  assert.equal(new URL(legacy.headers.get('location')).origin,'https://login.microsoftonline.com');
  const wrong=await fetch(host+'/profile/microsoft/start',{
   method:'POST',redirect:'manual',
   headers:{cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({_csrf:'invalid'})
  });
  assert.equal(wrong.status,403,'legacy POST requires a valid CSRF token');
 }finally{
  if(extraServer?.listening)await new Promise(resolve=>extraServer.close(resolve));
  for(const k of envNames){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 }
});

test('staff and SBs application submissions require Discord AND Microsoft/Xbox verification',async()=>{
  const staff=await get('/apply','member');
  assert.equal(staff.status,200);
  const page=await staff.text();
  assert.match(page,/Verify Microsoft\/Xbox before applying/);
  assert.doesNotMatch(page,/action="\/apply"/,'unverified member must not see staff application form');
  const denied=await post('/apply','member',answers);
  assert.equal(denied.status,403,'server must reject unverified staff submission');
  assert.equal(one('SELECT COUNT(*) n FROM applications WHERE user_id=?',ids.member).n,0);
  const team=await get('/team-applications/apply','member');
  assert.equal(team.status,200);
  assert.match(await team.text(),/Account verification required/);
  const deniedTeam=await post('/team-applications/apply','member',{
    daily_earnings:'500',net_worth:'1000',play_days:'5',play_hours:'3',timezone:'GMT',
    skill_pvp:'on',bank_contribution:'yes',income_method:'I farm crops each day',
    motivation:'I want to join the SBs team.',contribution:'I can contribute money and farms.'
  });
  assert.equal(deniedTeam.status,403,'server must reject unverified team submission');
  assert.equal(one('SELECT COUNT(*) n FROM team_applications WHERE user_id=?',ids.member).n,0);
  assert.equal((await get('/team-applications/review','member')).status,403);
  assert.equal((await get('/team-applications/review','member3')).status,200,'verified SBs leader can review');
  assert.equal((await get('/team-applications/review','adminA')).status,200,'verified website admin can review');
});

test('encrypted InPvP browser session setup is hidden and owner-only',async()=>{
  const path='/owner/mega/session';
  for(const who of ['member','adminA','reviewer'])
    assert.equal((await get(path,who)).status,403,who+' cannot access private InPvP session');
  const owner=await get(path,'owner');
  assert.equal(owner.status,200);
  assert.match(await owner.text(),/session pairing/);
  const home=await (await get('/','member')).text();
  assert.ok(!home.includes('href="/owner/mega/session"'),'no public owner session navigation');
  assert.equal((await post('/owner/mega/session/code','adminA')).status,403);
  assert.equal((await post('/owner/mega/session/disconnect','member')).status,403);
  const pair=await fetch(base+'/owner/mega/session/pair',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({code:'invalid',state:{cookies:[],origins:[]}}),redirect:'manual'
  });
  assert.equal(pair.status,503,'pairing is disabled without encryption key');
});

test('collector diagnostic screenshots require verified website owner access',async()=>{
 const path='/owner/mega/collector-screenshot.png';
 assert.equal((await get(path,'member')).status,403);
 assert.equal((await get(path,'adminA')).status,403);
 assert.equal((await get(path,'reviewer')).status,403);
 assert.equal((await get(path,'owner')).status,404,'no diagnostic file should return 404');
 const file=join(dirname(config.dbPath),'mega-bank-last-failure.png');
 writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(256)]));
 const result=await get(path,'owner');
 assert.equal(result.status,200);
 assert.equal(result.headers.get('content-type'),'image/png');
 assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.equal((await get(path,'adminA')).status,403);
 rmSync(file,{force:true});
});

test('verified SB Store Staff, Mod and Temp Mod Discord roles use promotion navigation',async()=>{
  for(const who of ['member7','member8','member9'])await login(who);
  const promotedNavUsers=['owner','adminA','reviewer','member6','member7','member8','member9'];
  for(const who of promotedNavUsers){
    const response=await get('/',who);
    assert.equal(response.status,200);
    const page=await response.text();
    const nav=page.split('<div class="sidebar-title">DISCOVER</div><nav>')[1]?.split('</nav>')[0]||'';
    assert.ok(nav.includes('Apply for a Promotion'),who+' should have promotion tab');
    assert.equal((nav.match(/href="\/promotions"/g)||[]).length,1,who+' gets one promotion tab');
    assert.ok(!nav.includes('href="/tickets/mine"'),who+' should not have My Tickets tab');
    assert.ok(!nav.includes('href="/dashboard"'),who+' should not have My Applications tab');
    assert.ok(!nav.includes('href="/apply"'),who+' should not have Apply for Staff tab');
  }
  // An external Mega SMP/Prison/SBs role must not be mistaken for SB Store Staff.
  for(const who of ['member','member2','member3','member4']){
    const page=await (await get('/',who)).text();
    const nav=page.split('<div class="sidebar-title">DISCOVER</div><nav>')[1]?.split('</nav>')[0]||'';
    for(const link of ['/tickets/mine','/dashboard','/apply'])assert.ok(nav.includes('href="'+link+'"'),who+' should retain '+link);
    assert.ok(!nav.includes('Apply for a Promotion'),who+' should not see promotion tab');
  }
  assert.equal((await get('/promotions/new','member6')).status,403,'Staff cannot create promotion tickets beyond Staff');
  assert.equal((await get('/promotions/new','member7')).status,200,'Temp Mod can submit promotion requests');
  assert.equal((await get('/promotions/new','member8')).status,200,'Mod can submit promotion requests');
});

test('Our Staff keeps actual store staff and Known Members separates Mega SMP / Prison tabs',async()=>{
  const team=await (await get('/team','member')).text();
  assert.ok(team.includes('Our Staff'));
  assert.ok(team.includes('Known Members'));
  assert.ok(team.includes('href="/team?tab=known"'));
  assert.ok(team.includes('<h2>Staff</h2>'));
  assert.ok(team.includes('member6'),'a store-only Staff role remains on the team');
  assert.ok(team.includes('adminA'),'administrators remain on the store team');
  assert.ok(!team.includes('href="/u/'+ids.member3+'"'),'Mega-only staff should leave the store team tab');
  assert.ok(!team.includes('href="/u/'+ids.member4+'"'),'Prison-only staff should leave the store team tab');
  const knownMega=await (await get('/team?tab=known&known=mega','member')).text();
  assert.match(knownMega,/Known Members/);
  assert.match(knownMega,/Mega SMP Staff/);
  assert.match(knownMega,/Prison Staff/);
  assert.ok(knownMega.includes('href="/u/'+ids.member3+'"'));
  assert.ok(knownMega.includes('href="/u/'+ids.member5+'"'));
  assert.ok(knownMega.includes('href="/u/'+ids.adminA+'"'),'staff who also hold Mega SMP role can appear in both contexts');
  assert.ok(!knownMega.includes('href="/u/'+ids.member4+'"'),'Prison-only staff do not appear in Mega tab');
  assert.ok(knownMega.includes('aria-current="page"'));
  assert.ok(knownMega.includes('href="/team?tab=known&amp;known=prison"'));
  const prison=await (await get('/team?tab=known&known=prison','member')).text();
  assert.ok(prison.includes('href="/u/'+ids.member4+'"'));
  assert.ok(prison.includes('href="/u/'+ids.member5+'"'),'dual external-role members appear in each category');
  assert.ok(!prison.includes('href="/u/'+ids.member3+'"'));
  assert.ok(!prison.includes('href="/u/'+ids.adminA+'"'));
  const invalid=await (await get('/team?tab=known&known=unexpected','member')).text();
  assert.ok(invalid.includes('href="/u/'+ids.member3+'"'),'invalid categories safely default to Mega');
  const unknown=await (await get('/team?tab=unexpected','member')).text();
  assert.ok(unknown.includes('<h2>Staff</h2>'),'unknown top-level tab safely returns main team');
});



test('Other Staff becomes Staff, Mod and Temp Mod, using the exact temporary moderator role ID',async()=>{
 const page=await (await get('/team?tab=team','member')).text();
 const start=page.indexOf('<h2>Staff</h2>');
 const modStart=page.indexOf('<h2>Mod</h2>');
 const tempStart=page.indexOf('<h2>Temp Mod</h2>');
 assert.ok(start>0 && modStart>start && tempStart>modStart,
   'Our Staff shows Staff then Mod then Temp Mod after ownership and administration');
 assert.ok(page.indexOf('<h2>Administration</h2>')<start);
 assert.ok(page.indexOf('<h2>Ownership</h2>')<start);
 assert.doesNotMatch(page,/<h2>Other Staff<\/h2>/);
 assert.doesNotMatch(page,/<h2>Moderation<\/h2>/);
 const staffSection=page.slice(start,modStart),modSection=page.slice(modStart,tempStart),tempSection=page.slice(tempStart);
 const has=(section,id)=>section.includes('href="/u/'+id+'"');
 assert.ok(has(staffSection,ids.member6),'Staff role stays in Staff');
 assert.ok(has(staffSection,ids.member9),'Staff outranks Mod/Temp Mod when a member has multiple roles');
 assert.ok(!has(staffSection,ids.member7),'Temp Mod is not Staff');
 assert.ok(!has(staffSection,ids.member8),'Mod is not Staff');
 assert.ok(has(modSection,ids.member8),'Mod and Head Mod are in Mod');
 assert.ok(modSection.includes('Head Mod'),'the higher Discord role labels a member with multiple Mod ranks');
 assert.ok(!has(modSection,ids.member7));
 assert.ok(!has(modSection,ids.member9),'multi-role users render exactly once in Our Staff');
 assert.ok(has(tempSection,ids.member7),'exact Temp Mod ID is recognized');
 assert.ok(tempSection.includes('>Temp Mod<'));
 assert.equal(page.split('href="/u/'+ids.member9+'"').length-1,1,'each internal team member appears once');
 assert.ok(!has(tempSection,ids.member9));
 const known=await (await get('/team?tab=known&known=mega','member')).text();
 assert.ok(known.includes('href="/u/'+ids.member6+'"'),'existing Mega SMP Staff Trusted handling stays intact');
 const sbs=await (await get('/team?tab=sbs','member')).text();
 assert.ok(sbs.includes('SBs Team Members'),'SBs x Scam tab is unchanged');
});
test('Mega SMP Staff Trusted stays in Known Members, never becomes store staff on its own',async()=>{
  const store=await (await get('/team?tab=team','member')).text();
  assert.ok(!store.includes('href="/u/'+ids.member2+'"'),'trusted Mega staff role plus SBs team role is not SB Store staff');
  assert.ok(!store.includes('href="/u/'+ids.member3+'"'),'Mega Staff Trusted variant plus team leader is not store staff');
  assert.ok(store.includes('href="/u/'+ids.member6+'"'),'true Store Staff role still appears even with trusted external role');
  const storeCard=store.split('href="/u/'+ids.member6+'"')[1]?.split('</a>')[0]||'';
  assert.ok(storeCard.includes('>Staff<'),'store staff badge uses Staff, not Mega Trusted');
  assert.ok(!storeCard.includes('Mega Smp Staff Trusted'),'external role never overrides store role title');
  const knownMega=await (await get('/team?tab=known&known=mega','member')).text();
  for(const id of [ids.member2,ids.member3,ids.member6])
    assert.ok(knownMega.includes('href="/u/'+id+'"'),'trusted Mega role is classified under Known Members');
  assert.equal(knownMega.split('href="/u/'+ids.member3+'"').length-1,1,'multiple Mega staff variants yield one card');
  const prison=await (await get('/team?tab=known&known=prison','member')).text();
  assert.ok(!prison.includes('href="/u/'+ids.member2+'"'),'Mega trusted does not leak into Prison Staff');
});

test('Meet the Team heading omits technical automatic-role-count subtitle',async()=>{
 const page=await (await get('/team','member')).text();
 assert.match(page,/Meet our <span class="gradient">team\.<\/span>/);
 assert.doesNotMatch(page,/Automatically detected from \d+ Discord server roles/);
 assert.ok(page.includes('>Our Staff</span>'),'role-based directory remains functional');
});

test('profile shows every assigned Discord role, correct colours and highest-first order',async()=>{
 const page=await (await get('/u/'+ids.member5,'member')).text();
 assert.match(page,/class="profile-discord-roles"/);
 assert.match(page,/Discord Roles/);
 assert.match(page,/2 roles/);
 assert.ok(page.includes('Mega Smp Staff'));
 assert.ok(page.includes('Prison Staff'));
 assert.ok(page.indexOf('Mega Smp Staff')<page.indexOf('Prison Staff'),'higher-ranked Mega role appears first');
 assert.match(page,/--role-accent:#01b669/);
 assert.match(page,/--role-accent:#036870/);
 assert.ok(!page.includes('>@everyone<'),'universal guild role must not appear');
 const admin=await (await get('/u/'+ids.adminA,'member')).text();
 assert.ok(admin.includes('Administrator'));
 assert.ok(admin.includes('Mega Smp Staff'));
 assert.ok(admin.indexOf('Administrator')<admin.indexOf('Mega Smp Staff'));
 assert.match(admin,/--role-accent:#ff0000/);
 const noRoles=await (await get('/u/'+ids.member,'member')).text();
 assert.match(noRoles,/No Discord roles assigned/);
});

test('private profiles do not expose role badges to other members, but owners see their own',async()=>{
 const id=ids.member4;
 run('UPDATE profiles SET public=0 WHERE user_id=?',id);
 try {
   const other=await (await get('/u/'+id,'member')).text();
   assert.doesNotMatch(other,/class="profile-discord-roles"/);
   assert.doesNotMatch(other,/Prison Staff/);
   assert.match(other,/This member has made their profile private/);
   const self=await (await get('/u/'+id,'member4')).text();
   assert.match(self,/class="profile-discord-roles"/);
   assert.match(self,/Prison Staff/);
 }finally{
   run('UPDATE profiles SET public=1 WHERE user_id=?',id);
 }
});

test('Our Staff, Team Members, Known Members render in requested order with exact team-role membership',async()=>{
  const page=await (await get('/team','member')).text();
  const nav=page.split('<nav class="team-directory-tabs"')[1]?.split('</nav>')[0]||'';
  assert.ok(nav.includes('>Our Staff</span>'));
  assert.ok(nav.includes('>Team Members</span>'));
  assert.ok(nav.includes('>Known Members</span>'));
  assert.ok(nav.indexOf('>Our Staff</span>')<nav.indexOf('>Team Members</span>'));
  assert.ok(nav.indexOf('>Team Members</span>')<nav.indexOf('>Known Members</span>'));
  assert.ok(page.includes('href="/team?tab=sbs"'));
  assert.ok(page.includes('href="/team?tab=known"'));
  assert.ok(!page.includes('href="/u/'+ids.member2+'"'),'SBs-only role does not make a store staff member');
  assert.ok(!page.includes('href="/u/'+ids.member3+'"'),'SBs leader-only role does not make store staff');
  assert.match(page,/adminA[\s\S]*?sbs-member-tag/,'a store admin with SBs Member also has the red badge');
  const team=await (await get('/team?tab=sbs','member')).text();
  assert.ok(team.includes('SBs x Scam'));
  assert.ok(team.includes('SBs Team Leaders'));
  assert.ok(team.includes('SBs Team Members'));
  for(const key of ['member2','member3','member4','adminA'])assert.ok(team.includes('href="/u/'+ids[key]+'"'),key+' should appear');
  assert.ok(!team.includes('href="/u/'+ids.member5+'"'),'external staff without SBs role excluded');
  assert.equal(team.split('href="/u/'+ids.member4+'"').length-1,1,'dual leader/member role shown once');
  assert.match(team,/class="sbs-member-tag" title="SBs Team Member" aria-label="SBs Team Member">\[SBs\]<\/span>/);
  const known=await (await get('/team?tab=known&known=prison','member')).text();
  assert.ok(known.includes('href="/u/'+ids.member4+'"'),'Prison role stays in Known Members');
  assert.ok(known.includes('href="/u/'+ids.member5+'"'));
  assert.ok(known.includes('[SBs]'),'SBs member gets name tag even in Known Members');
  const invalid=await (await get('/team?tab=unexpected','member')).text();
  assert.ok(invalid.includes('>Our Staff</span>'),'unexpected tab defaults to Our Staff');
});


test('MegaSMP leaderboard and owner-only profile linking are separate and secure',async()=>{
 const oldTeam=await (await get('/team?tab=team','member')).text();
 const tabs=oldTeam.split('<nav class="team-directory-tabs"')[1]?.split('</nav>')[0]||'';
 assert.ok(!tabs.includes('href="/team?tab=mega"'),'MegaSMP is no longer embedded in Team Members tabs');
 const landing=await get('/mega-team','member');
 assert.equal(landing.status,200);
 const html=await landing.text();
 assert.ok(html.includes('href="/mega-team/leaderboard"'));
 assert.ok(html.includes('data-mega-title-rank'));
 assert.equal((await get('/mega-team/leaderboard','member')).status,200);
 const directory=await (await get('/mega-team/leaderboard','member')).text();
 assert.ok(directory.includes('Reference links'));
 assert.ok(directory.includes('Abaddon'));
 assert.ok(directory.includes('richmans'));
 assert.ok(directory.includes('d3b46a3c-f5a5-4888-a247-0074ccbfceec'));
 const index=await (await get('/mega-team/top10.json','member')).json();
 assert.equal(index.teams.length,10);
 assert.equal(index.live,false);
 assert.equal((await get('/mega-team/teams/d3b46a3c-f5a5-4888-a247-0074ccbfceec','member')).status,200);
 assert.equal((await get('/mega-team/teams/not-a-team','member')).status,404);
 assert.equal((await get('/mega-team/links','member')).status,403);
 assert.equal((await get('/mega-team/links','adminA')).status,403);
 assert.equal((await get('/mega-team/links','reviewer')).status,403);
 const owner=await get('/mega-team/links?player=SBisOnTop&q=member2','owner');
 assert.equal(owner.status,200);
 assert.ok((await owner.text()).includes('value="'+ids.member2+'"'));
 assert.equal((await post('/mega-team/links','adminA',{mode:'link',gamertag:'SBisOnTop',discord_user_id:ids.member2})).status,403);
 assert.equal((await post('/mega-team/links','owner',{mode:'link',gamertag:'SBisOnTop',discord_user_id:ids.bot})).status,400);
 const csrfMissing=await fetch(base+'/mega-team/links',{method:'POST',
   headers:{cookie:sessions.get('owner').cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({mode:'link',gamertag:'SBisOnTop',discord_user_id:ids.member2}),
   redirect:'manual'
 });
 assert.equal(csrfMissing.status,403);
 assert.equal((await post('/mega-team/links','owner',{mode:'link',gamertag:'SBisOnTop',discord_user_id:ids.member2})).status,303);
 const links=await import('../src/mega-player-profile-links.js');
 assert.equal(links.allMegaPlayerProfileLinks().find(m=>m.gamertag==='SBisOnTop').discordId,ids.member2);
 assert.equal(one("SELECT COUNT(*) AS n FROM owner_audit_log WHERE action='mega.profile.link'").n>=1,true);
 assert.equal((await post('/mega-team/links','owner',{mode:'unlink',gamertag:'SBisOnTop'})).status,303);
 assert.equal(links.allMegaPlayerProfileLinks().some(m=>m.gamertag==='SBisOnTop'),false);
 assert.equal(one("SELECT COUNT(*) AS n FROM owner_audit_log WHERE action='mega.profile.unlink'").n>=1,true);
});

test('MegaSMP dashboard preserves rosters, manually recorded money, source provenance and season history',async()=>{
 const {megaDashboard}=await import('../src/mega-team-data.js');
 const {activeMegaSeason,MEGA_TEAM_ID}=await import('../src/mega-team.js');
 const season=activeMegaSeason();
 const initial=await (await get('/mega-team','member')).text();
 assert.match(initial,/MEGASMP PORTAL/,'MegaSMP is its own standalone page');
 assert.ok(initial.includes('SBsxScam'));
 assert.ok(initial.includes('No in-game roster imported yet'),'unverified Discord team roles are not presented as a verified game roster');
 assert.ok(initial.includes('Discord team roster'),'Discord fallback is clearly labelled');
 assert.ok(initial.includes('No authorized live feed configured'));
 const blank=await (await get('/team/mega/data','member')).json();
 assert.equal(blank.teamId,MEGA_TEAM_ID);
 assert.equal(blank.totals.deposited,null,'unknown totals must not silently display zero');
 assert.equal(blank.totals.withdrawn,null);
 assert.equal(blank.bank,null);
 assert.equal((await get('/team?tab=mega','member')).headers.get('location'),'/mega-team');
 assert.equal((await post('/team/mega/roster','member',{season,gamertags:'UnauthorizedPlayer'})).status,403);
 assert.equal((await post('/team/mega/season','adminA',{label:'Not an owner'})).status,403);
 const roster=await post('/team/mega/roster','adminA',{season,
  gamertags:'TestZulu 123\nTestAlpha\nTESTALPHA',role:'Leader'});
 assert.equal(roster.status,303);
 const id=one('SELECT id FROM mega_team_members WHERE season=? AND gamertag=? COLLATE NOCASE',season,'TestAlpha').id;
 const populated=await (await get('/team/mega/data','member')).json();
 assert.equal(populated.totals.activeMembers,2,'case-insensitive duplicates are suppressed');
 assert.equal(populated.totals.deposited,null,'roster-only members have no financial history');
 const invalid=await post('/team/mega/transaction','adminA',{season,member_id:String(id),kind:'deposit',amount:'1e6'});
 assert.equal(invalid.status,400,'currency must be a safe whole number, never exponential input');
 assert.equal((await post('/team/mega/transaction','member',{season,member_id:String(id),kind:'deposit',amount:'500000'})).status,403);
 assert.equal((await post('/team/mega/transaction','adminA',{season,member_id:String(id),kind:'deposit',amount:'500000',notes:'manual deposit'})).status,303);
 assert.equal((await post('/team/mega/transaction','adminA',{season,member_id:String(id),kind:'withdrawal',amount:'100000'})).status,303);
 assert.equal((await post('/team/mega/bank','adminA',{season,balance:'10000000'})).status,303);
 const recorded=megaDashboard(season);
 assert.equal(recorded.bank.balance,10000000);
 const alpha=recorded.members.find(m=>m.id===id);
 assert.equal(alpha.deposits,500000);
 assert.equal(alpha.withdrawals,100000);
 assert.equal(alpha.net,400000);
 assert.equal(alpha.source,'manual');
 assert.equal(recorded.totals.missing,1,'partial roster coverage is identified');
 assert.equal(recorded.totals.deposited,500000,'known subtotal is not described as a complete team total');
 assert.equal(recorded.totals.withdrawn,100000);
 const snapshot={team_id:MEGA_TEAM_ID,season,updated_at:Date.now(),complete_roster:true,bank_balance:15000000,
   members:[{gamertag:'TestAlpha',role:'Leader',active:true,deposits:800000,withdrawals:150000},
     {gamertag:'TestZulu 123',role:'Member',active:true,deposits:null,withdrawals:null}]};
 const importResult=await post('/team/mega/import','adminA',{season,snapshot:JSON.stringify(snapshot)});
 assert.equal(importResult.status,303);
 const imported=megaDashboard(season),latest=imported.members.find(m=>m.id===id);
 assert.equal(latest.deposits,800000,'cumulative snapshot replaces rather than adds to manual entries');
 assert.equal(latest.withdrawals,150000);
 assert.equal(latest.net,650000);
 assert.equal(latest.source,'manual_import');
 assert.equal(imported.bank.balance,15000000);
 assert.equal(imported.transactions.filter(t=>t.member_id===id).length,0,'manual ledger is not overwritten by imports');
 assert.equal(imported.transactions.length,2);
 assert.equal(imported.totals.missing,1,'missing imported values stay missing');
 assert.equal(imported.totals.net,null,'team net is withheld when any member lacks deposit or withdrawal totals');
 assert.equal((await post('/team/mega/member-status','adminA',{season,member_id:String(id),status:'former'})).status,303);
 assert.equal(megaDashboard(season).totals.activeMembers,1);
 assert.equal(megaDashboard(season).totals.deposited,800000,'former players retain their historical season contribution');
 assert.equal((await post('/team/mega/member-status','adminA',{season,member_id:String(id),status:'active'})).status,303);
 const secret=await fetch(base+'/team/mega/bank',{method:'POST',
  headers:{cookie:sessions.get('adminA').cookie,'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({season,balance:'1'}),redirect:'manual'});
 assert.equal(secret.status,403,'CSRF protection applies to team finance edits');
 assert.equal(one("SELECT COUNT(*) n FROM owner_audit_log WHERE action LIKE 'mega.team.%'").n>=5,true,'owner audit captures all edits');
 const newer=await post('/team/mega/season','owner',{label:'Season 99 - Test Reset'});
 assert.equal(newer.status,303);
 assert.notEqual(activeMegaSeason(),season);
 assert.equal(megaDashboard().members.length,0,'new seasons start with a fresh roster and zero fabricated statistics');
 assert.equal(megaDashboard(season).bank.balance,15000000,'historic balances stay available');
 assert.equal((await get('/team?tab=mega&season='+encodeURIComponent(season),'member')).status,303);
  assert.equal((await get('/mega-team?season='+encodeURIComponent(season),'member')).status,200);
 assert.equal((await post('/team/mega/bank','adminA',{season,balance:'1'})).status,400,'past seasons cannot be silently edited');
});

test('authorized structured team feeds sync every five minutes without scraping InPvP',async()=>{
 const {createMegaTeamSync,approvedMegaFeedUrl}=await import('../src/mega-team-sync.js');
 const {activeMegaSeason,MEGA_TEAM_ID}=await import('../src/mega-team.js');
 const {megaDashboard,importMegaSnapshot}=await import('../src/mega-team-data.js');
 assert.equal(approvedMegaFeedUrl('http://localhost/teams'),null,'SSRF/private hosts must be rejected');
 assert.equal(approvedMegaFeedUrl('https://127.0.0.1/teams'),null);
 assert.equal(approvedMegaFeedUrl('https://inpvp.net/megasmp/teams'),null,'automating InPvP requires permission');
 assert.ok(approvedMegaFeedUrl('https://inpvp.net/megasmp/teams',{inpvpPermission:true}));
 const disabled=createMegaTeamSync({feedUrl:'https://trusted.example.com/team.json',authorized:false,
  request:()=>{throw new Error('Not supposed to run');}});
 assert.equal(disabled.enabled,false);
 assert.deepEqual(await disabled.poll(),{ok:false,status:'unconfigured'});
 const season=activeMegaSeason();
 const payload={team_id:MEGA_TEAM_ID,season,updated_at:Date.now(),complete_roster:true,bank_balance:23000000,
   members:[{gamertag:'FeedPlayer',role:'Officer',active:true,deposits:12345678,withdrawals:null}]};
 let requests=0;
 const feed=createMegaTeamSync({feedUrl:'https://trusted.example.com/team.json',authorized:true,
  request:async(uri,options)=>{
   requests++;
   assert.equal(uri,'https://trusted.example.com/team.json');
   assert.equal(options.redirect,'error');
   assert.equal(options.method,'GET');
   return {ok:true,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(payload)};
  }});
 assert.equal(feed.enabled,true);
 assert.equal((await feed.poll()).ok,true);
 assert.equal(requests,1);
 const after=megaDashboard(season);
 assert.equal(after.bank.balance,23000000);
 const player=after.members.find(m=>m.gamertag==='FeedPlayer');
 assert.equal(player.deposits,12345678);
 assert.equal(player.withdrawals,null);
 assert.equal(player.net,null,'a missing withdrawal total must never be treated as zero');
 assert.equal(player.source,'authorized_feed');
 assert.ok(after.sync.last_success>0);
 assert.equal((await feed.poll()).status,'cooldown','upstream polling must be rate-limited');
 assert.equal(requests,1);
 assert.throws(()=>importMegaSnapshot({...payload,team_id:'wrong'}, {source:'manual_import'}),/identifier/);
 assert.throws(()=>importMegaSnapshot({...payload,members:[
   {gamertag:'DUP',deposits:1,withdrawals:1},
   {gamertag:'dup',deposits:2,withdrawals:2}
 ]},{source:'manual_import'}),/Duplicate/);
});

test('captured event history and verified owner Discord matching are permission-safe',async()=>{
 const {saveMegaCapture}=await import('../src/mega-team-bank-event-store.js');
 const {megaCapturedBankHistory}=await import('../src/mega-team-bank-history.js');
 const {megaDiscordMatches}=await import('../src/mega-team-discord-matches.js');
 const {activeMegaSeason}=await import('../src/mega-team.js');
 const season=activeMegaSeason();
 const captured=Array.from({length:123},(_,i)=>({
   eventId:'http-history-'+String(i).padStart(4,'0'),
   text:'Nov 9 11:17 PM Captured'+String(i).padStart(4,'0')+' '+(i%3===0?'Withdrew':'Deposited')+' '+(100+i)
 }));
 assert.equal(saveMegaCapture(captured,{season,expectedCount:150}).inserted,123);
 assert.equal(megaCapturedBankHistory({season}).total,123);
 assert.equal(megaCapturedBankHistory({season,page:3}).rows.length,23);
 const first=await (await get('/team/mega/history?season='+encodeURIComponent(season),'member')).text();
 assert.ok(first.includes('Captured bank events'));
 assert.ok(first.includes('Page 1 of 3'));
 assert.ok(first.includes('PARTIAL / UNVERIFIED HISTORY'));
 assert.ok(first.includes('Captured0000'));
 assert.ok(!megaCapturedBankHistory({season,page:1}).rows.some(entry=>entry.gamertag==='Captured0122'),
  'only 50 stored entries are rendered per page; filter dropdown may list all players');
 assert.equal((await get('/team/mega/history?season='+encodeURIComponent(season)+'&page=3','member')).status,200);
 const playerPage=await (await get('/team/mega/history?season='+encodeURIComponent(season)+'&player=Captured0001','member')).text();
 assert.ok(playerPage.includes('Captured0001'));
 assert.equal(megaCapturedBankHistory({season,gamertag:'Captured0001'}).rows.some(row=>row.gamertag==='Captured0002'),false,
  'player filtering excludes other transactions even though the selector still lists all Gamertags');
 assert.ok(playerPage.includes('1 matching events'));
 const search=await (await get('/team/mega/matches?season='+encodeURIComponent(season)+'&q=member2&gamertag=Captured0001','owner')).text();
 assert.ok(search.includes('Link a Minecraft'));
 assert.ok(search.includes('value="'+ids.member2+'"'));
 assert.equal((await get('/team/mega/matches','adminA')).status,403);
 assert.equal((await get('/team/mega/matches','member')).status,403);
 assert.equal((await post('/team/mega/match','adminA',{season,mode:'link',gamertag:'Captured0001',discord_user_id:ids.member2})).status,403);
 assert.equal((await post('/team/mega/match','member',{season,mode:'link',gamertag:'Captured0001',discord_user_id:ids.member2})).status,403);
 assert.equal((await post('/team/mega/match','owner',{season,mode:'link',gamertag:'Captured0001',discord_user_id:ids.bot})).status,400);
 assert.equal((await post('/team/mega/match','owner',{season,mode:'link',gamertag:'AbsentGamer',discord_user_id:ids.member2})).status,400);
 const noCsrf=await fetch(base+'/team/mega/match',{method:'POST',
  headers:{cookie:sessions.get('owner').cookie,'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({season,mode:'link',gamertag:'Captured0001',discord_user_id:ids.member2}),redirect:'manual'});
 assert.equal(noCsrf.status,403);
 assert.equal((await post('/team/mega/match','owner',{season,mode:'link',gamertag:'Captured0001',discord_user_id:ids.member2})).status,303);
 assert.equal(megaDiscordMatches(season).find(x=>x.gamertag==='Captured0001').discordId,ids.member2);
 const linkedPage=await (await get('/team/mega/history?season='+encodeURIComponent(season)+'&player=Captured0001','member')).text();
 assert.ok(linkedPage.includes('/u/'+ids.member2));
 assert.ok(linkedPage.includes('@member2'));
 assert.equal((await post('/team/mega/roster','adminA',{season,gamertags:'Captured0001',role:'Member'})).status,303);
 const team=await (await get('/mega-team?season='+encodeURIComponent(season),'member')).text();
 assert.ok(team.includes('/u/'+ids.member2));
 const data=await (await get('/team/mega/data?season='+encodeURIComponent(season),'member')).json();
 assert.equal(data.members.find(x=>x.gamertag==='Captured0001').linkedDiscord.id,ids.member2);
 assert.equal((await post('/team/mega/match','owner',{season,mode:'link',gamertag:'Captured0001',discord_user_id:ids.member3})).status,303);
 assert.equal(megaDiscordMatches(season).find(x=>x.gamertag==='Captured0001').discordId,ids.member3);
 assert.equal((await post('/team/mega/match','owner',{season,mode:'unlink',gamertag:'Captured0001'})).status,303);
 assert.equal(megaDiscordMatches(season).some(x=>x.gamertag==='Captured0001'),false);
 assert.ok(one("SELECT COUNT(*) n FROM owner_audit_log WHERE action='mega.team.discord.link'").n>=2);
 assert.ok(one("SELECT COUNT(*) n FROM owner_audit_log WHERE action='mega.team.discord.unlink'").n>=1);
 assert.equal(verifyAudit(db).ok,true);
});

test('SBs Member tag follows names on profiles but leader-only and private profiles are not mislabeled',async()=>{
  const profile=await (await get('/u/'+ids.member2,'member')).text();
  assert.match(profile,/<h1>member2<span class="sbs-member-tag"[^>]*>\[SBs\]<\/span><\/h1>/);
  const leader=await (await get('/u/'+ids.member3,'member')).text();
  assert.match(leader,/<h1>member3<\/h1>/,'SBs leader-only is not assigned the member badge');
  assert.doesNotMatch(leader,/<h1>member3<span class="sbs-member-tag"/);
  run('UPDATE profiles SET public=0 WHERE user_id=?',ids.member2);
  try{
   const privateView=await (await get('/u/'+ids.member2,'member')).text();
   assert.doesNotMatch(privateView,/<span class="sbs-member-tag"/,'private profile does not expose team badge');
   const owner=await (await get('/u/'+ids.member2,'member2')).text();
   assert.match(owner,/<h1>member2<span class="sbs-member-tag"/,'profile owner sees own badge');
  }finally{run('UPDATE profiles SET public=1 WHERE user_id=?',ids.member2);}
});

test('members submit private applications; optional reviewers vote once then ticket disappears',async()=>{
  // Legacy review-flow fixtures now satisfy both new recruitment identity requirements.
  for(const [key,id] of Object.entries(ids)){
    if(key==='guild'||key==='bot'||!one('SELECT 1 FROM users WHERE id=?',id))continue;
    if(!one('SELECT 1 FROM xbox_gamertag_links WHERE user_id=?',id)){
      saveXboxLink({userId:id,identityKey:(Number(Object.keys(ids).indexOf(key)+1)).toString(16).padStart(64,'0'),gamertag:'Tester'+Object.keys(ids).indexOf(key)});
    }
  }
  let r=await post('/apply','member',answers);assert.equal(r.status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member);assert.equal(a.status,'pending');
  let html=await (await get('/staff','reviewer')).text();assert.ok(html.includes(`Application Reviews`) && html.includes(`#${a.id}`)===false); // ticket links use numeric hrefs
  assert.ok(html.includes(`/staff/applications/${a.id}`));
  r=await post(`/staff/applications/${a.id}/review`,'reviewer',{choice:'accept',note:'Thoughtful answer and good attitude.'});assert.equal(r.status,303);
  html=await (await get('/staff','reviewer')).text();assert.ok(!html.includes(`/staff/applications/${a.id}`));
  assert.equal((await get(`/staff/applications/${a.id}`,'reviewer')).status,200); // voting removes queue entry but does not block replies
  assert.equal((await get(`/staff/applications/${a.id}`,'member')).status,403);
  assert.equal((await get(`/dashboard/applications/${a.id}`,'member')).status,200);
  assert.equal((await get(`/dashboard/applications/${a.id}`,'member2')).status,404);
  assert.equal((await get(`/staff/applications/${a.id}`,'adminA')).status,200);
  assert.equal((await post(`/staff/applications/${a.id}/review`,'reviewer',{choice:'deny'})).status,303);
  assert.equal(one('SELECT COUNT(*) c FROM reviewer_votes WHERE application_id=?',a.id).c,1);
});

test('private ticket replies remain private; @here pings are throttled and test webhook is owner-only',async()=>{
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member);
  const before=notifications.length;
  // A member cannot forge staff/other-member ticket replies.
  assert.equal((await post(`/staff/applications/${a.id}/reply`,'member',{body:'I am staff'})).status,403);
  assert.equal((await post(`/dashboard/applications/${a.id}/reply`,'member2',{body:'Not mine'})).status,404);
  assert.equal((await post(`/dashboard/applications/${a.id}/reply`,'member',{body:'<script>alert(1)</script> Please let me know the next step'})).status,303);
  assert.equal(one('SELECT COUNT(*) c FROM ticket_messages WHERE application_id=?',a.id).c,1);
  let html=await (await get(`/dashboard/applications/${a.id}`,'member')).text();
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(html.includes('<script>alert(1)</script>'),false);
  assert.equal((await get(`/dashboard/applications/${a.id}`,'member2')).status,404);
  assert.ok(notifications.length>before);
  assert.equal(notifications.at(-1).pingHere,false,'recent new-ticket @here should suppress fast follow-up pings');
  run('UPDATE applications SET last_staff_ping_at=0 WHERE id=?',a.id);
  assert.equal((await post(`/dashboard/applications/${a.id}/reply`,'member',{body:'A second message after the cooldown'})).status,303);
  assert.equal(notifications.at(-1).pingHere,true);
  assert.equal((await post(`/staff/applications/${a.id}/reply`,'reviewer',{body:'Thanks, we are reviewing your application.'})).status,303);
  run('UPDATE applications SET applicant_seen_at=0 WHERE id=?',a.id);
  html=await (await get('/dashboard','member')).text();assert.ok(html.includes('unread'));
  html=await (await get(`/dashboard/applications/${a.id}`,'member')).text();assert.ok(html.includes('Thanks, we are reviewing'));
  assert.equal((await post('/admin/settings/webhook/test','adminA',{})).status,403);
  assert.equal((await post('/admin/settings/webhook/test','owner',{})).status,303);
  assert.equal(notifications.at(-1).title,'SB Store Webhook Test');
  assert.equal(notifications.at(-1).pingHere,false,'test should not ping anyone');
});

test('one admin approval does not finalize; two distinct admins approve and Discord role assigned',async()=>{
  const app=one('SELECT * FROM applications WHERE user_id=?',ids.member);
  let r=await post(`/staff/applications/${app.id}/decide`,'adminA',{choice:'accept',note:'Ready for the team'});
  assert.equal(r.status,303);assert.equal(one('SELECT status FROM applications WHERE id=?',app.id).status,'reviewing');assert.equal(additions,0);
  r=await post(`/staff/applications/${app.id}/decide`,'adminA',{choice:'accept',note:'Duplicate vote'});assert.equal(r.status,303);
  assert.equal(one('SELECT count(*) c FROM admin_decisions WHERE application_id=?',app.id).c,1);
  r=await post(`/staff/applications/${app.id}/decide`,'adminB',{choice:'accept',note:'I agree'});assert.equal(r.status,303);

  assert.equal(one('SELECT status FROM applications WHERE id=?',app.id).status,'reviewing','two matching votes cannot finalize');
  assert.equal(additions,0,'roles are not assigned before unk.sb approval');
  const queue=await (await get('/owner/approvals','owner')).text();
  assert.ok(queue.includes(`/staff/applications/${app.id}`));
  assert.equal((await post(`/owner/applications/${app.id}/action`,'adminA',{action:'approve'})).status,403);
  assert.equal((await post(`/owner/applications/${app.id}/action`,'owner',{action:'approve',note:'Approved by unk.sb'})).status,303);
  const updated=one('SELECT * FROM applications WHERE id=?',app.id);
  assert.equal(updated.finalized_by,ids.owner);
  assert.equal(updated.status,'accepted');assert.equal(updated.role_sync_status,'assigned');assert.equal(updated.role_sync_role,roles.tempMod);assert.equal(additions,1);
  assert.ok(memberMap.get(ids.member).roles.includes(roles.tempMod));
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',app.id).c,2);
  const dash=await (await get('/dashboard','member')).text();assert.ok(dash.includes('accepted'));
});

test('two matching admin denials finalize without assigning Discord roles',async()=>{
  assert.equal((await post('/apply','member2',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member2);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminA',{choice:'deny'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminB',{choice:'deny'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'approve'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'denied');
  assert.equal(memberMap.get(ids.member2).roles.includes(roles.tempMod),false);
});

test('unk.sb may vote Deny as one of two admins and must separately finalize Deny',async()=>{
  assert.equal((await post('/apply','member5',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member5);
  const beforePage=await (await get(`/staff/applications/${a.id}`,'owner')).text();
  assert.match(beforePage,/Vote Deny/,'owner sees the same admin voting controls');
  assert.doesNotMatch(beforePage,/This application is finalized\./,'a reviewing application must not display finalized');
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'owner',{choice:'deny',note:'I recommend denial'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,1);
  let page=await (await get(`/staff/applications/${a.id}`,'owner')).text();
  assert.match(page,/Your admin vote:/);
  assert.match(page,/Waiting for two matching admin votes/);
  assert.doesNotMatch(page,/Final Deny/,'final authorization stays locked with one vote');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'deny'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing','the owner cannot finalize before two votes');
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminA',{choice:'deny'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing','two votes are only a recommendation');
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,2);
  assert.ok(one('SELECT 1 FROM admin_decisions WHERE application_id=? AND admin_id=?',a.id,ids.owner),'owner vote is stored');
  assert.ok(one('SELECT 1 FROM admin_decisions WHERE application_id=? AND admin_id=?',a.id,ids.adminA),'second admin vote is stored');
  page=await (await get(`/staff/applications/${a.id}`,'owner')).text();
  assert.match(page,/Final Deny/);
  assert.doesNotMatch(page,/Final Accept/,'a denial recommendation cannot directly accept without two Accept votes');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'adminA',{action:'deny'})).status,403);
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'deny',note:'Separate final rejection'})).status,303);
  const decided=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(decided.status,'denied');assert.equal(decided.finalized_by,ids.owner);
  assert.equal(one('SELECT action FROM owner_review_actions WHERE application_id=?',a.id).action,'deny');
  assert.equal(memberMap.get(ids.member5).roles.includes(roles.tempMod),false);
});

test('unk.sb can cast second Accept vote but staff role requires a separate final Accept',async()=>{
  assert.equal((await post('/apply','member6',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member6);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminB',{choice:'accept'})).status,303);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'owner',{choice:'accept'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,2);
  assert.equal(memberMap.get(ids.member6).roles.includes(roles.tempMod),false);
  const page=await (await get(`/staff/applications/${a.id}`,'owner')).text();
  assert.match(page,/Final Accept/);
  assert.match(page,/Final Deny/);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'owner',{choice:'accept'})).status,303);
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,2,'owner can vote only once');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'approve'})).status,303);
  const decided=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(decided.status,'accepted');assert.equal(decided.finalized_by,ids.owner);
  assert.equal(memberMap.get(ids.member6).roles.includes(roles.tempMod),true);
  assert.equal(one('SELECT action FROM owner_review_actions WHERE application_id=?',a.id).action,'approve');
});

test('unk.sb can override an acceptance recommendation to denial without granting a role',async()=>{
  assert.equal((await post('/apply','member4',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member4);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminA',{choice:'accept'})).status,303);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminB',{choice:'accept'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'deny',note:'Not ready to join staff'})).status,303);
  const current=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(current.status,'denied');assert.equal(current.finalized_by,ids.owner);
  assert.equal(memberMap.get(ids.member4).roles.includes(roles.tempMod),false);
  assert.equal(one('SELECT action FROM owner_review_actions WHERE application_id=? ORDER BY id DESC LIMIT 1',a.id).action,'deny');
});

test('role manager forbids administrator/managed roles but permits safe role assignment',async()=>{
  let r=await post('/admin/roles/change','adminA',{user_id:ids.member2,role_id:roles.admin,action:'add'});
  assert.equal(r.status,403);assert.ok(!memberMap.get(ids.member2).roles.includes(roles.admin));
  r=await post('/admin/roles/change','adminA',{user_id:ids.member2,role_id:roles.manage,action:'add'});
  assert.equal(r.status,403);
  r=await post('/admin/roles/change','adminA',{user_id:ids.member2,role_id:roles.vip,action:'add'});
  assert.equal(r.status,303);assert.ok(memberMap.get(ids.member2).roles.includes(roles.vip));
  r=await post('/admin/roles/change','adminA',{user_id:ids.member2,role_id:roles.vip,action:'remove'});
  assert.equal(r.status,303);assert.ok(!memberMap.get(ids.member2).roles.includes(roles.vip));
  r=await post('/admin/roles/change','adminA',{user_id:ids.owner,role_id:roles.vip,action:'add'});
  assert.equal(r.status,403);
});

test('suggestions show public yes/no totals but voter identities only to admins',async()=>{
  assert.equal((await post('/suggestions/create','member',{title:'Add weekly events',body:'Please add a weekly game night to get everyone involved.'})).status,303);
  const s=one('SELECT * FROM suggestions ORDER BY id DESC LIMIT 1');
  assert.equal((await post(`/suggestions/${s.id}/vote`,'member2',{choice:'yes'})).status,303);
  assert.equal((await post(`/suggestions/${s.id}/vote`,'reviewer',{choice:'no'})).status,303);
  let html=await (await get(`/suggestions/${s.id}`,'member')).text();
  assert.ok(html.includes('1</strong>'));assert.ok(!html.includes('Who voted'));
  assert.ok(!html.includes(ids.member2));assert.ok(!html.includes(ids.reviewer));
  html=await (await get(`/suggestions/${s.id}`,'adminA')).text();
  assert.ok(html.includes('Who voted'));assert.ok(html.includes(ids.member2));assert.ok(html.includes(ids.reviewer));
  assert.equal((await post(`/suggestions/${s.id}/status`,'reviewer',{status:'implemented'})).status,403);
  assert.equal((await post(`/suggestions/${s.id}/status`,'adminA',{status:'planned'})).status,303);
  assert.equal(one('SELECT status FROM suggestions WHERE id=?',s.id).status,'planned');
});

test('liking a feed post stays on the feed, preserves page, and supports in-place JSON toggles',async()=>{
  assert.equal((await post('/feed/create','member2',{body:'A feed post for testing like toggles without navigation.'})).status,303);
  const id=one('SELECT id FROM posts WHERE user_id=? ORDER BY id DESC LIMIT 1',ids.member2).id;
  const feed=await (await get('/feed','member')).text();
  assert.ok(feed.includes('id="post-'+id+'"'),'post has a stable anchor for the no-JS fallback');
  assert.ok(feed.includes('action="/post/'+id+'/like" data-post-like'),'like form opts into JS enhancement');
  assert.ok(feed.includes('name="feed_page" value="0"'),'form records feed pagination');
  assert.match(feed,/data-like-count>/,'like count can update in place');
  const fallback=await post('/post/'+id+'/like','member',{feed_page:'3'});
  assert.equal(fallback.status,303);
  assert.equal(fallback.headers.get('location'),'/feed?page=3#post-'+id,'no-JS like stays on the feed');
  assert.equal(one('SELECT COUNT(*) n FROM post_likes WHERE post_id=?',id).n,1);
  async function jsonLike(){
    const session=sessions.get('member');
    return fetch(base+'/post/'+id+'/like',{
      method:'POST',
      headers:{cookie:session.cookie,'content-type':'application/x-www-form-urlencoded',accept:'application/json'},
      body:new URLSearchParams({_csrf:session.csrf,feed_page:'0'}),
      redirect:'manual'
    });
  }
  const unlike=await jsonLike();
  assert.equal(unlike.status,200,'JS likes must not redirect to Post Details');
  assert.match(unlike.headers.get('content-type'),/application\/json/);
  assert.deepEqual(await unlike.json(),{post_id:id,liked:false,like_count:0});
  const like=await jsonLike();
  assert.equal(like.status,200);
  assert.deepEqual(await like.json(),{post_id:id,liked:true,like_count:1});
  const detail=await (await get('/post/'+id,'member')).text();
  assert.ok(detail.includes('data-post-like'),'the same action still works on Post Details');
  const normal=await post('/post/'+id+'/like','member',{});
  assert.equal(normal.status,303);
  assert.equal(normal.headers.get('location'),'/post/'+id,'ordinary detail-page forms retain their fallback');
});

test('V1.5 social hub offers real profile, saved posts, follow feed, activity and privacy controls',async()=>{
  const owner=ids.member,author=ids.member2,other=ids.member3;
  assert.equal((await get('/profile','member')).status,303);
  assert.equal((await get('/profile','member')).headers.get('location'),'/u/'+owner);
  const header=await (await get('/','member')).text();
  assert.match(header,/class="top-social-shortcuts"/);
  assert.match(header,/class="top-account-dropdown"/);
  assert.ok(header.includes('href="/profile"'));
  assert.ok(header.includes('href="/saved"'));
  assert.ok(header.includes('href="/notifications"'));
  assert.equal((await get('/saved','member')).status,200);
  assert.equal((await get('/notifications','member')).status,200);

  const message='V1.5 SOCIAL AUTHOR POST unique for following feed and saved posts';
  const otherMessage='V1.5 UNFOLLOWED POST unique for verifying feed filters';
  assert.equal((await post('/feed/create','member2',{body:message})).status,303);
  const id=one('SELECT id FROM posts WHERE user_id=? ORDER BY id DESC LIMIT 1',author).id;
  assert.equal((await post('/feed/create','member3',{body:otherMessage})).status,303);
  run('DELETE FROM follows WHERE follower_id=? AND followed_id=?',owner,author);
  run('DELETE FROM follows WHERE follower_id=? AND followed_id=?',owner,other);
  const followingBefore=await (await get('/feed?tab=following','member')).text();
  assert.ok(!followingBefore.includes(message),'following feed excludes unfollowed users');
  assert.equal((await post('/u/'+author+'/follow','member',{})).status,303);
  const followingAfter=await (await get('/feed?tab=following','member')).text();
  assert.ok(followingAfter.includes(message),'followed user content appears');
  assert.ok(!followingAfter.includes(otherMessage),'unfollowed content stays out');
  assert.match(followingAfter,/name="feed_tab" value="following"/);
  const list=await (await get('/u/'+owner+'/following','member')).text();
  assert.ok(list.includes('@member2'));
  const followers=await (await get('/u/'+author+'/followers','member')).text();
  assert.ok(followers.includes('@member'));

  const formSession=sessions.get('member');
  async function ajaxAction(action){
    return fetch(base+'/post/'+id+'/'+action,{
      method:'POST',
      headers:{cookie:formSession.cookie,'content-type':'application/x-www-form-urlencoded',accept:'application/json'},
      body:new URLSearchParams({_csrf:formSession.csrf,feed_page:'0',feed_tab:'following'}),
      redirect:'manual'
    });
  }
  const saved=await ajaxAction('bookmark');
  assert.equal(saved.status,200);
  assert.deepEqual(await saved.json(),{post_id:id,saved:true});
  assert.ok((await (await get('/saved','member')).text()).includes(message));
  assert.ok(!(await (await get('/saved','member3')).text()).includes(message),'saved posts are private');
  const removed=await ajaxAction('bookmark');
  assert.deepEqual(await removed.json(),{post_id:id,saved:false});
  assert.ok(!(await (await get('/saved','member')).text()).includes(message),'unsaving removes the post');
  const noJs=await post('/post/'+id+'/bookmark','member',{feed_page:'2',feed_tab:'following'});
  assert.equal(noJs.status,303);
  assert.equal(noJs.headers.get('location'),'/feed?tab=following&page=2#post-'+id);

  const repost=await ajaxAction('repost');
  assert.equal(repost.status,200);
  const repostState=await repost.json();
  assert.equal(repostState.reposted,true);
  assert.ok(repostState.repost_count>=1);
  const undone=await ajaxAction('repost');
  assert.equal(undone.status,200);
  assert.equal((await undone.json()).reposted,false);

  const like=await ajaxAction('like');
  assert.equal(like.status,200);
  assert.equal((await like.json()).liked,true);
  const ownProfile=await (await get('/u/'+owner+'?tab=likes','member')).text();
  assert.ok(ownProfile.includes(message),'my likes tab shows my liked posts');
  assert.equal((await get('/u/'+owner+'?tab=likes','member2')).status,404,'other members cannot inspect private likes');
  const mine=await (await get('/u/'+owner,'member')).text();
  assert.ok(mine.includes('My Profile')||mine.includes('Edit profile'));
  assert.ok(mine.includes('Followers')&&mine.includes('Following'));
  assert.equal((await get('/u/'+owner+'?tab=replies','member')).status,200);
  assert.equal((await get('/u/'+owner+'?tab=media','member')).status,200);

  const unread=one('SELECT COUNT(*) n FROM social_notifications WHERE recipient_id=? AND read_at=0 AND actor_id=?',author,owner).n;
  assert.ok(unread>=1,'follow/like creates a notification for original author');
  const inbox=await (await get('/notifications','member2')).text();
  assert.ok(inbox.includes('started following you')||inbox.includes('liked your post'));
  assert.match(inbox,/class="top-social-badge"/,'unread count appears beside the username');
  assert.equal((await post('/notifications/read','member2',{})).status,303);
  assert.equal(one('SELECT COUNT(*) n FROM social_notifications WHERE recipient_id=? AND read_at=0',author).n,0);

  const wasPublic=one('SELECT public FROM profiles WHERE user_id=?',author).public;
  try{
    run('UPDATE profiles SET public=0 WHERE user_id=?',author);
    assert.equal((await get('/u/'+author+'/followers','member')).status,404,'private profile hides relationships');
    assert.equal((await get('/u/'+author+'/followers','member2')).status,200,'owner keeps access');
  }finally{run('UPDATE profiles SET public=? WHERE user_id=?',wasPublic,author);}
});

test('posts, comments, profile custom settings, sections and privacy work',async()=>{
  assert.equal((await post('/feed/create','member',{body:'Hello from the community feed!'})).status,303);
  const p=one('SELECT * FROM posts ORDER BY id DESC LIMIT 1');
  assert.equal((await post(`/post/${p.id}/like`,'member2')).status,303);
  assert.equal(one('SELECT COUNT(*) c FROM post_likes WHERE post_id=?',p.id).c,1);
  assert.equal((await post(`/post/${p.id}/repost`,'member2')).status,303);
  assert.equal((await post(`/post/${p.id}/comment`,'member2',{body:'Great to see this feed working.'})).status,303);
  assert.equal((await get('/post/'+p.id,'member')).status,200);
  assert.equal((await post('/profile/edit','member',{nickname:'SB Builder',bio:'I love this community.',theme:'neon',accent:'gold',font:'mono',layout:'showcase',public:'on',allow_comments:'on',show_follows:'on',animations:'on',social_1:'https://example.com'})).status,303);
  let html=await (await get('/u/'+ids.member,'member2')).text();assert.ok(html.includes('SB Builder'));assert.ok(html.includes('theme-neon'));assert.ok(html.includes('accent-gold'));
  assert.equal((await post('/profile/section','member',{title:'My setup',content:'Building a game community website.'})).status,303);
  const section=one('SELECT * FROM profile_sections WHERE user_id=?',ids.member);
  assert.ok(section);assert.equal((await post(`/profile/section/${section.id}/edit`,'member',{title:'About Me',content:'This is my new custom profile section!',visible:'on'})).status,303);
  assert.equal((await post('/profile/pin','member',{post_id:String(p.id)})).status,303);
  html=await (await get('/u/'+ids.member,'member2')).text();assert.ok(html.includes('About Me'));assert.ok(html.includes('PINNED POST'));
  assert.equal((await post('/profile/edit','member',{nickname:'Private Member',theme:'forest',accent:'blue'})).status,303);
  html=await (await get('/u/'+ids.member,'member2')).text();assert.ok(html.includes('This member has made their profile private'));assert.ok(!html.includes('My setup'));
  assert.equal((await post('/profile/section/'+section.id+'/delete','member2')).status,404);
});

test('CSRF protection and owner-only chained audit verification',async()=>{
  const session=sessions.get('adminA');
  const bad=await fetch(base+'/admin/settings/open',{method:'POST',headers:{cookie:session.cookie,'content-type':'application/x-www-form-urlencoded'},body:'open=false',redirect:'manual'});
  assert.equal(bad.status,403);
  const denied=await get('/owner/audit/export','adminA');assert.equal(denied.status,403);
  const exportResp=await get('/owner/audit/export','owner');assert.equal(exportResp.status,200);assert.match(exportResp.headers.get('content-type'),/text\/csv/);
  const csv=await exportResp.text();assert.ok(csv.includes('admin.decision')&&csv.includes('role.change.success')&&csv.includes('reviewer.vote'));
  const verify=verifyAudit(db);assert.equal(verify.ok,true);assert.ok(verify.count>20);
  assert.ok(notifications.length>=2);
});

test('split admin votes wait for a third matching admin, never reviewer quorum',async()=>{
  assert.equal((await post('/apply','reviewer',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.reviewer);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminA',{choice:'accept'})).status,303);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminB',{choice:'deny'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminC',{choice:'accept'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'return',note:'Run another voting round'})).status,303);
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,0);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminA',{choice:'accept'})).status,303);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminC',{choice:'accept'})).status,303);
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'approve'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'accepted');
  assert.equal(one('SELECT COUNT(*) c FROM reviewer_votes WHERE application_id=?',a.id).c,0);
});

test('verified owner can grant and revoke co-owner audit access, admins cannot',async()=>{
  assert.equal((await post('/owner/owners','adminA',{user_id:ids.member2})).status,403);
  assert.equal((await post('/owner/owners','owner',{user_id:ids.member2})).status,303);
  assert.equal((await get('/owner/audit','member2')).status,200);
  const original=one('SELECT id FROM applications WHERE user_id=?',ids.member);
  assert.equal((await post(`/owner/applications/${original.id}/action`,'member2',{action:'approve'})).status,403,'co-owners cannot impersonate unk.sb');
  assert.equal((await get('/owner/owners','member2')).status,403);
  assert.equal((await post('/owner/owners/remove','owner',{user_id:ids.member2})).status,303);
  assert.equal((await get('/owner/audit','member2')).status,403);
});

test('profile image upload validates real image bytes and remains private to account',async()=>{
  const {readFileSync,unlinkSync}=await import('node:fs');const {resolve}=await import('node:path');
  const image=readFileSync(resolve(import.meta.dirname,'../public/sb-logo.png'));
  const good=new FormData();good.set('_csrf',sessions.get('member').csrf);good.set('image',new Blob([image],{type:'image/png'}),'avatar.png');
  let r=await fetch(base+'/profile/upload/avatar',{method:'POST',headers:{cookie:sessions.get('member').cookie},body:good,redirect:'manual'});
  assert.equal(r.status,303);
  const uploaded=one('SELECT avatar_path FROM profiles WHERE user_id=?',ids.member).avatar_path;
  assert.match(uploaded,/^\/uploads\/[a-f0-9]{32}\.png$/);
  const storedFile=join(dirname(config.dbPath),'uploads',basename(uploaded));
  assert.equal(existsSync(storedFile),true,'uploaded file must be stored next to SQLite on the persistent volume');
  assert.equal(existsSync(resolve(import.meta.dirname,'..','public',uploaded.slice(1))),false,'do not save new uploads in ephemeral public folder');
  assert.equal((await get(uploaded,'member2')).status,403);
  assert.equal((await get(uploaded,'member')).status,200);
  const bad=new FormData();bad.set('_csrf',sessions.get('member').csrf);bad.set('image',new Blob(['<script>bad</script>'],{type:'image/png'}),'fake.png');
  r=await fetch(base+'/profile/upload/banner',{method:'POST',headers:{cookie:sessions.get('member').cookie},body:bad,redirect:'manual'});
  assert.equal(r.status,400);
  unlinkSync(storedFile);
});

test('only meaningful changes and private-ticket reads are audited, while hashes stay valid',async()=>{
  const logs=all('SELECT * FROM owner_audit_log ORDER BY id');
  assert.ok(logs.some(x=>x.action==='owner.access.granted'));
  assert.ok(logs.some(x=>x.action==='application.role.assigned'));
  assert.ok(logs.some(x=>x.action==='application.access'));
  assert.ok(logs.some(x=>x.action==='role.change.success'));
  for(const action of ['staff.page.read','staff.request.attempt','owner.audit.view','owner.audit.export',
    'moderation.queue.view','roles.dashboard.view','review.queue.view','role.change.blocked',
    'staff.login','staff.logout','settings.view','security.access.denied']){
      assert.ok(!logs.some(x=>x.action===action),'no routine or failed-attempt audit: '+action);
  }
  const before=logs.length;
  for(let i=0;i<3;i++){
    assert.equal((await get('/','owner')).status,200);
    assert.equal((await get('/team','owner')).status,200);
    assert.equal((await get('/owner/audit','owner')).status,200);
    assert.equal((await get('/staff','owner')).status,200);
  }
  assert.equal(one('SELECT COUNT(*) c FROM owner_audit_log').c,before,'routine browsing adds zero events');
  assert.equal(verifyAudit(db).ok,true);
});

test('audit displays usernames for stored actors, user IDs in targets/details, and CSV keeps original IDs',async()=>{
  const record=one("SELECT * FROM owner_audit_log WHERE actor_id=? AND action='role.change.success' ORDER BY id DESC LIMIT 1",ids.adminA);
  assert.ok(record,'there should be an audited staff role change');
  const page=await (await get('/owner/audit','owner')).text();
  assert.ok(page.includes('@admina'),'human-readable audit actor username');
  assert.ok(page.includes('title="Discord user ID: '+ids.adminA+'"'),'raw ID remains in audit tooltip');
  assert.ok(!page.includes('<b>'+ids.adminA+'</b>'),'actor cell does not show raw Discord ID');
  assert.ok(page.includes('Changes &amp; ticket access'));
  const csv=await (await get('/owner/audit/export','owner')).text();
  assert.ok(csv.includes('actor_username,target_display,details_display'));
  assert.ok(csv.includes('role.change.success'));
  assert.ok(csv.includes(ids.adminA),'raw actor ID retained for forensic export');
  assert.ok(csv.includes('@admina'),'username added for human readability');
  assert.equal(verifyAudit(db).ok,true);
});

// Owner-only role delivery failures must be recorded and retryable, not silently marked assigned.
test('Discord role delivery failure is visible, logged and retryable by an admin',async()=>{
  assert.equal((await post('/apply','member3',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member3);
  failNextRole=true;
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminA',{choice:'accept'})).status,303);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminB',{choice:'accept'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'approve'})).status,303);
  let current=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(current.status,'accepted');assert.equal(current.role_sync_status,'failed');
  assert.match(current.role_sync_error,/temporary failure/);
  assert.equal(memberMap.get(ids.member3).roles.includes(roles.tempMod),false);
  assert.equal((await post(`/staff/applications/${a.id}/sync`,'adminA',{})).status,303);
  current=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(current.role_sync_status,'assigned');
  assert.equal(memberMap.get(ids.member3).roles.includes(roles.tempMod),true);
  assert.ok(all('SELECT action FROM owner_audit_log WHERE target=?',''+ids.member3).some(x=>x.action==='application.role.failed'));
  assert.equal(verifyAudit(db).ok,true);
});

test('V1.4 promotion tickets are role-gated and require two distinct admins',async()=>{
  for(const who of ['member7','member8','member9'])await login(who);
  assert.equal((await get('/promotions/new','member2')).status,403);
  assert.equal((await post('/promotions/new','member2',{reason:'I want promotion to higher staff rank and have years of experience.'})).status,403);
  assert.equal((await get('/promotions/new','member7')).status,200);
  assert.equal((await get('/promotions/new','member8')).status,200);
  assert.equal((await get('/promotions/new','member9')).status,403,'existing Staff is not promotion-eligible');
  assert.equal((await get('/staff/promotions','reviewer')).status,403);
  assert.equal((await get('/staff/promotions','adminA')).status,200);
  const reason='I have been actively moderating the community and responding to member tickets reliably.';
  assert.equal((await post('/promotions/new','member7',{reason})).status,303);
  const p=one('SELECT * FROM promotion_tickets WHERE user_id=? ORDER BY id DESC LIMIT 1',ids.member7);
  assert.equal(p.from_label,'Mod - temp');assert.equal(p.to_label,'Mod');
  assert.equal((await post('/promotions/new','member7',{reason})).status,303);
  assert.equal(one('SELECT COUNT(*) n FROM promotion_tickets WHERE user_id=?',ids.member7).n,1);
  assert.equal((await get('/promotions/'+p.id,'member8')).status,404);
  assert.equal((await get('/staff/promotions/'+p.id,'reviewer')).status,403);
  assert.equal((await post('/staff/promotions/'+p.id+'/decide','member7',{choice:'accept'})).status,403);
  assert.equal((await post('/staff/promotions/'+p.id+'/decide','adminA',{choice:'accept',note:'Excellent activity'})).status,303);
  assert.equal(one('SELECT status FROM promotion_tickets WHERE id=?',p.id).status,'reviewing');
  assert.equal(memberMap.get(ids.member7).roles.includes(roles.mod),false);
  assert.equal((await post('/staff/promotions/'+p.id+'/decide','adminA',{choice:'accept'})).status,303);
  assert.equal(one('SELECT COUNT(*) n FROM promotion_decisions WHERE ticket_id=?',p.id).n,1);
  assert.equal((await post('/staff/promotions/'+p.id+'/decide','adminB',{choice:'accept'})).status,303);
  assert.equal(one('SELECT status FROM promotion_tickets WHERE id=?',p.id).status,'accepted');
  assert.equal(one('SELECT role_sync_status FROM promotion_tickets WHERE id=?',p.id).role_sync_status,'assigned');
  assert.equal(memberMap.get(ids.member7).roles.includes(roles.mod),true);
  assert.equal(memberMap.get(ids.member7).roles.includes(roles.tempMod),false);
  const count=additions;
  assert.equal((await post('/staff/promotions/'+p.id+'/retry','adminA',{})).status,303);
  assert.equal(additions,count,'retries must not duplicate role assignments');
  assert.equal((await get('/promotions/new','member7')).status,200,'new Mod is eligible for Staff');
  assert.equal((await post('/promotions/new','member7',{reason})).status,303);
  const next=one('SELECT * FROM promotion_tickets WHERE user_id=? ORDER BY id DESC LIMIT 1',ids.member7);
  assert.equal(next.to_label,'Staff');
  assert.equal((await post('/staff/promotions/'+next.id+'/decide','adminA',{choice:'deny'})).status,303);
  assert.equal((await post('/staff/promotions/'+next.id+'/decide','adminB',{choice:'deny'})).status,303);
  assert.equal(one('SELECT status FROM promotion_tickets WHERE id=?',next.id).status,'denied');
  assert.equal(memberMap.get(ids.member7).roles.includes(roles.storeStaff),false);
  assert.equal(verifyAudit(db).ok,true);
});

test('V1.4 Mod to Staff promotion retries safely after Discord delivery failure',async()=>{
  assert.equal((await post('/promotions/new','member8',{reason:'I consistently moderate and want to take on a greater responsibility in the community.'})).status,303);
  const p=one('SELECT * FROM promotion_tickets WHERE user_id=? ORDER BY id DESC LIMIT 1',ids.member8);
  assert.equal(p.from_label,'Mod');assert.equal(p.to_label,'Staff');
  failNextRole=true;
  assert.equal((await post('/staff/promotions/'+p.id+'/decide','adminA',{choice:'accept'})).status,303);
  assert.equal((await post('/staff/promotions/'+p.id+'/decide','adminB',{choice:'accept'})).status,303);
  assert.equal(one('SELECT role_sync_status FROM promotion_tickets WHERE id=?',p.id).role_sync_status,'failed');
  assert.equal(memberMap.get(ids.member8).roles.includes(roles.storeStaff),false);
  assert.equal((await post('/staff/promotions/'+p.id+'/retry','adminA',{})).status,303);
  assert.equal(one('SELECT role_sync_status FROM promotion_tickets WHERE id=?',p.id).role_sync_status,'assigned');
  assert.equal(memberMap.get(ids.member8).roles.includes(roles.storeStaff),true);
  assert.equal(memberMap.get(ids.member8).roles.includes(roles.mod),false);
  assert.equal(verifyAudit(db).ok,true);
});

test('a reported abusive post enters moderation queue and admin removal is audited',async()=>{
  assert.equal((await post('/feed/create','member3',{body:'An example post for the moderation test.'})).status,303);
  const p=one('SELECT * FROM posts WHERE user_id=? ORDER BY id DESC LIMIT 1',ids.member3);
  assert.equal((await post('/report','member2',{kind:'post',id:String(p.id),reason:'This needs moderator review for a potential rule violation.'})).status,303);
  const report=one('SELECT * FROM reports WHERE target_id=? AND kind=?',String(p.id),'post');
  assert.ok(report);
  assert.equal((await get('/admin/moderation','member')).status,403);
  assert.equal((await get('/admin/moderation','adminA')).status,200);
  assert.equal((await post(`/admin/moderation/${report.id}/resolve`,'reviewer',{action:'remove'})).status,403);
  assert.equal((await post(`/admin/moderation/${report.id}/resolve`,'adminB',{action:'remove'})).status,303);
  assert.ok(one('SELECT deleted_at FROM posts WHERE id=?',p.id).deleted_at);
  assert.ok(all('SELECT action FROM owner_audit_log WHERE target=?','post:'+p.id).some(x=>x.action==='moderation.report.remove'));
  assert.equal(verifyAudit(db).ok,true);
});

test('legacy noisy page views remain hash-verifiable but are hidden from normal audit and CSV',async()=>{
  const original=one('SELECT COUNT(*) c FROM owner_audit_log').c;
  appendAudit(db,{actor:ids.owner,role:'owner',action:'staff.page.read',target:'/team',
    details:{method:'GET',historical:true},ip:'127.0.0.1'});
  assert.equal(one('SELECT COUNT(*) c FROM owner_audit_log').c,original+1);
  assert.equal(verifyAudit(db).ok,true);
  const page=await (await get('/owner/audit','owner')).text();
  assert.doesNotMatch(page,/staff\.page\.read/,'legacy read spam hidden from the normal table');
  assert.match(page,/Changes &amp; ticket access/);
  const exportCsv=await (await get('/owner/audit/export','owner')).text();
  assert.doesNotMatch(exportCsv,/staff\.page\.read/,'default CSV follows the same meaningful-action filter');
  const fullCsv=await (await get('/owner/audit/export?full=1','owner')).text();
  assert.match(fullCsv,/staff\.page\.read/,'full forensic CSV retains old rows for verification');
  assert.ok(fullCsv.includes('previous_hash,entry_hash'),'hash fields remain exportable');
  assert.equal(verifyAudit(db).ok,true);
});

test('audit verification detects a changed ledger record and succeeds after restoring',()=>{
  const row=one('SELECT id,action FROM owner_audit_log ORDER BY id LIMIT 1');
  assert.ok(row);
  run('UPDATE owner_audit_log SET action=? WHERE id=?','tampered.record',row.id);
  assert.equal(verifyAudit(db).ok,false);
  run('UPDATE owner_audit_log SET action=? WHERE id=?',row.action,row.id);
  assert.equal(verifyAudit(db).ok,true);
});
