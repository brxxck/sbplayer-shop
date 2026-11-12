// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sbs-app-test-'));
const ids={guild:'100000000000000001',owner:'100000000000000002',adminA:'100000000000000003',adminB:'100000000000000004',adminC:'100000000000000005',reviewer:'100000000000000006',member:'100000000000000007',member2:'100000000000000008',bot:'100000000000000009',member3:'100000000000000010',member4:'100000000000000012',member5:'100000000000000013',member6:'100000000000000014'};
const roles={admin:'200000000000000001',reviewer:'200000000000000002',helper:'200000000000000003',vip:'200000000000000004',bot:'200000000000000005',manage:'200000000000000006',mega:'200000000000000007',prison:'200000000000000008',storeStaff:'200000000000000009',sbsLeader:'1557586028729077841',sbsMember:'1565070132676661439'};
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'testing.sqlite'),DISCORD_CLIENT_ID:'100000000000000011',DISCORD_CLIENT_SECRET:'mock-secret',DISCORD_BOT_TOKEN:'mock-bot-token',DISCORD_GUILD_ID:ids.guild,REVIEWER_ROLE_IDS:roles.reviewer,ADMIN_ROLE_IDS:roles.admin,OWNER_USER_IDS:'',FINAL_APPROVER_USER_ID:ids.owner,DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef',APPLICATION_ROLES:'Helper,Moderator,Staff',APPLICATION_ROLE_IDS:''});
const {createServer}=await import('../src/server.js');
const {one,all,run,db}=await import('../src/db.js');
const {config}=await import('../src/config.js');
const {verifyAudit}=await import('../src/audit.js');
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
  {id:roles.sbsLeader,name:'SBs Team Leader',position:12,permissions:'0',managed:false,color:0xdb2626},
  {id:roles.sbsMember,name:'[SBs] SBs Team Member',position:11,permissions:'0',managed:false,color:0xff2525}
];
const memberMap=new Map();
for(const [key,id] of Object.entries(ids))if(key!=='guild')memberMap.set(id,{user:{id,username:key.toLowerCase(),global_name:key,avatar:null,bot:key==='bot'},roles:key.startsWith('admin')?[roles.admin]:key==='reviewer'?[roles.reviewer]:key==='bot'?[roles.bot]:[],pending:false});
 // Simulate external-community roles, cross-community members and real store staff.
 memberMap.get(ids.member3).roles.push(roles.mega);
 memberMap.get(ids.member4).roles.push(roles.prison);
 memberMap.get(ids.member5).roles.push(roles.mega,roles.prison);
 memberMap.get(ids.member6).roles.push(roles.storeStaff);
 memberMap.get(ids.adminA).roles.push(roles.mega,roles.sbsMember);
 memberMap.get(ids.member2).roles.push(roles.sbsMember);
 memberMap.get(ids.member3).roles.push(roles.sbsLeader);
 memberMap.get(ids.member4).roles.push(roles.sbsLeader,roles.sbsMember);
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

test('Meet the Team keeps store staff and Known Members separates Mega SMP / Prison tabs',async()=>{
  const team=await (await get('/team','member')).text();
  assert.ok(team.includes('Meet the Team'));
  assert.ok(team.includes('Known Members'));
  assert.ok(team.includes('href="/team?tab=known"'));
  assert.ok(team.includes('Other Staff'));
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
  assert.ok(unknown.includes('Other Staff'),'unknown top-level tab safely returns main team');
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
  assert.ok(page.includes('>Our Staff</span>'));
  assert.ok(page.includes('>Team Members</span>'));
  assert.ok(page.includes('>Known Members</span>'));
  assert.ok(page.indexOf('>Our Staff</span>')<page.indexOf('>Team Members</span>'));
  assert.ok(page.indexOf('>Team Members</span>')<page.indexOf('>Known Members</span>'));
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
  assert.equal(updated.status,'accepted');assert.equal(updated.role_sync_status,'assigned');assert.equal(updated.role_sync_role,roles.helper);assert.equal(additions,1);
  assert.ok(memberMap.get(ids.member).roles.includes(roles.helper));
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
  assert.equal(memberMap.get(ids.member2).roles.includes(roles.helper),false);
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
  assert.equal(memberMap.get(ids.member5).roles.includes(roles.helper),false);
});

test('unk.sb can cast second Accept vote but staff role requires a separate final Accept',async()=>{
  assert.equal((await post('/apply','member6',answers)).status,303);
  const a=one('SELECT * FROM applications WHERE user_id=?',ids.member6);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'adminB',{choice:'accept'})).status,303);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'owner',{choice:'accept'})).status,303);
  assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'reviewing');
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,2);
  assert.equal(memberMap.get(ids.member6).roles.includes(roles.helper),false);
  const page=await (await get(`/staff/applications/${a.id}`,'owner')).text();
  assert.match(page,/Final Accept/);
  assert.match(page,/Final Deny/);
  assert.equal((await post(`/staff/applications/${a.id}/decide`,'owner',{choice:'accept'})).status,303);
  assert.equal(one('SELECT COUNT(*) c FROM admin_decisions WHERE application_id=?',a.id).c,2,'owner can vote only once');
  assert.equal((await post(`/owner/applications/${a.id}/action`,'owner',{action:'approve'})).status,303);
  const decided=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(decided.status,'accepted');assert.equal(decided.finalized_by,ids.owner);
  assert.equal(memberMap.get(ids.member6).roles.includes(roles.helper),true);
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
  assert.equal(memberMap.get(ids.member4).roles.includes(roles.helper),false);
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

test('all staff access events retained and audit hash chain still valid',async()=>{
  const logs=all('SELECT * FROM owner_audit_log ORDER BY id');
  assert.ok(logs.some(x=>x.action==='staff.page.read'));
  assert.ok(logs.some(x=>x.action==='staff.request.attempt'));
  assert.ok(logs.some(x=>x.action==='owner.access.granted'));
  assert.ok(logs.some(x=>x.action==='role.change.blocked'));
  assert.ok(logs.some(x=>x.action==='application.role.assigned'));
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
  assert.equal(memberMap.get(ids.member3).roles.includes(roles.helper),false);
  assert.equal((await post(`/staff/applications/${a.id}/sync`,'adminA',{})).status,303);
  current=one('SELECT * FROM applications WHERE id=?',a.id);
  assert.equal(current.role_sync_status,'assigned');
  assert.equal(memberMap.get(ids.member3).roles.includes(roles.helper),true);
  assert.ok(all('SELECT action FROM owner_audit_log WHERE target=?',''+ids.member3).some(x=>x.action==='application.role.failed'));
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

test('audit verification detects a changed ledger record and succeeds after restoring',()=>{
  const row=one('SELECT id,action FROM owner_audit_log ORDER BY id LIMIT 1');
  assert.ok(row);
  run('UPDATE owner_audit_log SET action=? WHERE id=?','tampered.record',row.id);
  assert.equal(verifyAudit(db).ok,false);
  run('UPDATE owner_audit_log SET action=? WHERE id=?',row.action,row.id);
  assert.equal(verifyAudit(db).ok,true);
});
