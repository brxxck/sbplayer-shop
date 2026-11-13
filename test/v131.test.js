// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const tmp=mkdtempSync(join(tmpdir(),'sbs-v131-'));
const ids={guild:'160000000000000001',owner:'160000000000000002',adminA:'160000000000000003',
 adminB:'160000000000000004',reviewer:'160000000000000005',member:'160000000000000006',
 other:'160000000000000007',banned:'160000000000000008'};
const roles={admin:'260000000000000001',reviewer:'260000000000000002',nativeAdmin:'260000000000000003',nameOnlyAdmin:'260000000000000004'};
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(tmp,'new.sqlite'),DISCORD_CLIENT_ID:'160000000000000011',
 DISCORD_CLIENT_SECRET:'fixture',DISCORD_BOT_TOKEN:'fixture',DISCORD_GUILD_ID:ids.guild,
 ADMIN_ROLE_IDS:roles.admin,REVIEWER_ROLE_IDS:roles.reviewer,FINAL_APPROVER_USER_ID:ids.owner,
 APPLICATION_ROLES:'Helper,Moderator',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef',
   DISCORD_ADMIN_REPORT_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef',DISCORD_OWNER_REPORT_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef'});
const {createServer}=await import('../src/server.js');
const {db,one,all}=await import('../src/db.js');
const {saveXboxLink}=await import('../src/xbox-gamertag-links.js');
const {config}=await import('../src/config.js');
const members=new Map();
for(const [key,id] of Object.entries(ids)){
 if(['guild','banned'].includes(key))continue;
 members.set(id,{user:{id,username:key.toLowerCase(),global_name:key,avatar:null},roles:
  key.startsWith('admin')?[roles.admin]:key==='reviewer'?[roles.reviewer]:[],pending:false});
}
const notifications=[];
const discord={
 getGuild:async()=>({id:ids.guild,owner_id:ids.owner}),
 getGuildMember:async id=>members.get(id)||null,
 searchMembers:async q=>[...members.values()].filter(m=>m.user.username.startsWith(q.toLowerCase())),
 getRoles:async()=>[{id:ids.guild,name:'@everyone',position:0,permissions:'0'},{id:roles.admin,name:'Administrator',position:20,permissions:'8'},{id:roles.reviewer,name:'Staff',position:5,permissions:'0'},{id:roles.nativeAdmin,name:'Security Team',position:18,permissions:'8'},{id:roles.nameOnlyAdmin,name:'Administrator',position:12,permissions:'0'}],
 listMembers:async()=>[...members.values()],
 notify:async data=>{notifications.push(data);return true;}
};
let server,base;const sessions=new Map();
before(async()=>{
 server=createServer({discord,testLogin:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
 for(const name of ['owner','adminA','adminB','reviewer','member','other','banned']){
  const r=await fetch(base+'/__test/login/'+ids[name],{redirect:'manual'});
  assert.equal(r.status,303,'fixture sign-in for '+name);
  const cookie=r.headers.get('set-cookie').split(';')[0];
  const path=name==='banned'?'/tickets/new/ban_appeal':name==='member'||name==='other'?'/tickets/new/bug_report':'/';
  const page=await fetch(base+path,{headers:{cookie},redirect:'manual'});
  assert.equal(page.status,200,'fixture home for '+name);
  const csrf=/name="_csrf" value="([^"]+)"/.exec(await page.text())?.[1];
  assert.ok(csrf,'CSRF for '+name);
  sessions.set(name,{cookie,csrf});
  if(name!=='banned')saveXboxLink({userId:ids[name],
   identityKey:String(Object.keys(ids).indexOf(name)+1).padStart(64,'0'),
   gamertag:'V131'+Object.keys(ids).indexOf(name)});

 }
});
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(tmp,{recursive:true,force:true});});
const get=(path,who)=>fetch(base+path,{headers:who?{cookie:sessions.get(who).cookie}:{},redirect:'manual'});
const post=(path,who,fields={})=>{
 const x=sessions.get(who);
 return fetch(base+path,{method:'POST',headers:{cookie:x.cookie,'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({_csrf:x.csrf,...fields}),redirect:'manual'});
};
async function multipart(path,who,fields={},evidence=[]){
 const x=sessions.get(who),form=new FormData();form.set('_csrf',x.csrf);
 for(const [k,v] of Object.entries(fields))form.set(k,v);
 for(const file of evidence)form.append('evidence',new Blob([file.bytes],{type:file.type||'image/png'}),file.name||'proof.png');
 return fetch(base+path,{method:'POST',headers:{cookie:x.cookie},body:form,redirect:'manual'});
}
const png=readFileSync(new URL('../public/sb-logo.png',import.meta.url));
const fakeImage={bytes:png,name:'proof.png'};

test('role-aware homepages, correct ticket categories, Discord identity and placeholders',async()=>{
 const member=await (await get('/','member')).text();
 assert.match(member,/MEMBER DASHBOARD/);
 assert.match(member,/Submit a Ticket/);
 assert.doesNotMatch(member,/staff-chat-messages/);
 const staff=await (await get('/','reviewer')).text();
 assert.match(staff,/STAFF WORKSPACE/);
 assert.match(staff,/staff-chat-messages/);
 assert.match(staff,/Customize Profile/);
 const picker=await (await get('/tickets/new','member')).text();
 for(const label of ['Bug Report','Player Report','Reward Claim','Staff Report','Ban Appeal','View My Tickets'])
  assert.ok(picker.includes(label));
 assert.ok(!picker.includes('Media Rank Application'));
 const player=await (await get('/tickets/new/player_report','member')).text();
 assert.match(player,/Player&#39;s username/);
 assert.ok(player.includes('e.g. Hard-R, Spamming, Threats'));
 assert.ok(player.includes('Verified via Discord'));
 assert.doesNotMatch(player,/Email Address/);
 assert.match(await (await get('/tickets/new/reward_claim','member')).text(),/e\.g\. Discord Nitro/);
 assert.match(await (await get('/tickets/new/staff_report','member')).text(),/Staff member&#39;s username/);
 assert.match(await (await get('/tickets/new/ban_appeal','member')).text(),/e\.g\. Hard-R, Spamming, Threats/);
});

test('bug report with media has private chat and staff replies; member can reopen resolved ticket',async()=>{
 const note="<script>alert('bad')</script> The button crashes when I click it.";
 let r=await multipart('/tickets/new/bug_report','member',{description:note},[fakeImage]);
 assert.equal(r.status,303);
 const t=one("SELECT * FROM support_tickets WHERE user_id=? AND category='bug_report'",ids.member);
 assert.ok(t);assert.equal(t.visibility,'staff');
 const at=one('SELECT * FROM support_ticket_attachments WHERE ticket_id=?',t.id);
 assert.ok(at);
 assert.equal((await get('/tickets/attachments/'+at.id,'member')).status,200);
 assert.equal((await get('/tickets/attachments/'+at.id,'other')).status,404);
 assert.equal((await get('/tickets/attachments/'+at.id,'reviewer')).status,200);
 const direct=await get('/tickets/attachments/'+at.id,'member');
 assert.match(direct.headers.get('content-disposition'),/^attachment;/,'existing links still download evidence');
 assert.match(direct.headers.get('cache-control'),/no-store/);
 const embedded=await get('/tickets/attachments/'+at.id+'?preview=1','member');
 assert.equal(embedded.status,200);
 assert.equal(embedded.headers.get('content-type'),'image/png','validated image has safe type');
 assert.match(embedded.headers.get('content-disposition'),/^inline;/);
 assert.equal((await get('/tickets/attachments/'+at.id+'?preview=1','other')).status,404,'private inline image remains inaccessible');
 let html=await (await get('/tickets/'+t.id,'member')).text();
 assert.ok(html.includes('data-evidence-open'),'ticket shows clickable image gallery');
 assert.ok(html.includes('/tickets/attachments/'+at.id+'?preview=1'),'thumbnail uses authenticated preview route');
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);
 assert.match(html,/Write your reply/);assert.match(html,/Upload video\/pictures/);
 assert.equal((await post('/staff/tickets/'+t.id+'/reply','member',{body:'Forged'})).status,403);
 assert.equal((await post('/staff/tickets/'+t.id+'/reply','reviewer',{body:'Thanks, we are looking into it.'})).status,303);
 assert.equal((await post('/staff/tickets/'+t.id+'/status','reviewer',{status:'resolved'})).status,303);
 assert.equal(one('SELECT status FROM support_tickets WHERE id=?',t.id).status,'resolved');
 assert.equal((await post('/tickets/'+t.id+'/reply','member',{body:'I have more information to add.'})).status,303);
 assert.equal(one('SELECT status FROM support_tickets WHERE id=?',t.id).status,'open');
 assert.equal((await get('/tickets/'+t.id,'other')).status,404);
 html=await (await get('/tickets/'+t.id,'member')).text();
 assert.ok(html.includes('Thanks, we are looking into it.'));
 assert.equal(one('SELECT COUNT(*) c FROM support_ticket_messages WHERE ticket_id=?',t.id).c,2);
 assert.ok(notifications.some(n=>n.pingHere===true && n.title.includes('Bug Report')));
});


test('private video evidence supports inline playback and HTTP byte-range seeking',async()=>{
 const mp4=Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);
 const created=await multipart('/tickets/new/bug_report','other',{
   description:'Video evidence should play and allow private, authenticated media seeking.'
 },[{bytes:mp4,name:'incident.mp4',type:'video/mp4'}]);
 assert.equal(created.status,303);
 const ticket=one("SELECT id FROM support_tickets WHERE user_id=? AND category='bug_report' ORDER BY id DESC LIMIT 1",ids.other);
 const att=one('SELECT * FROM support_ticket_attachments WHERE ticket_id=?',ticket.id);
 assert.ok(att);
 const path='/tickets/attachments/'+att.id;
 const download=await get(path,'other');
 assert.match(download.headers.get('content-disposition'),/^attachment;/);
 const preview=await get(path+'?preview=1','other');
 assert.equal(preview.status,200);
 assert.equal(preview.headers.get('content-type'),'video/mp4');
 assert.match(preview.headers.get('content-disposition'),/^inline;/);
 assert.equal(preview.headers.get('accept-ranges'),'bytes');
 assert.equal((await preview.arrayBuffer()).byteLength,mp4.byteLength);
 const session=sessions.get('other');
 const part=await fetch(base+path+'?preview=1',{headers:{cookie:session.cookie,range:'bytes=0-7'},redirect:'manual'});
 assert.equal(part.status,206);
 assert.equal(part.headers.get('content-range'),'bytes 0-7/'+mp4.byteLength);
 assert.equal((await part.arrayBuffer()).byteLength,8);
 const suffix=await fetch(base+path+'?preview=1',{headers:{cookie:session.cookie,range:'bytes=-4'},redirect:'manual'});
 assert.equal(suffix.status,206);
 assert.equal(suffix.headers.get('content-range'),'bytes 16-19/20');
 const bad=await fetch(base+path+'?preview=1',{headers:{cookie:session.cookie,range:'bytes=999-1000'},redirect:'manual'});
 assert.equal(bad.status,416);
 assert.equal(bad.headers.get('content-range'),'bytes */20');
 assert.equal((await get(path+'?preview=1','member')).status,404,'other members cannot stream the video');
 assert.equal((await get(path+'?preview=1','adminB')).status,200,'authorized admins can stream regular-ticket evidence');
 const page=await (await get('/tickets/'+ticket.id,'other')).text();
 assert.ok(page.includes('data-evidence-kind="video"'));
 assert.ok(page.includes('data-evidence-download="'+path+'"'));
});

test('admins can open ordinary tickets with Discord Administrator permission even when their role ID is not configured',async()=>{
 const member=members.get(ids.other),originalRoles=[...member.roles];
 const {createSupportTicket}=await import('../src/support.js');
 const ticketId=createSupportTicket({
   userId:ids.member,category:'bug_report',
   fields:{description:'Verified administrator must be able to access a community support ticket.'},
   role:'member',ip:'127.0.0.1'
 });
 const confidentialId=createSupportTicket({
   userId:ids.member,category:'staff_report',
   fields:{staff_username:'admina',description:'This report remains restricted to the server owner.'},
   reportedId:ids.owner,visibility:'owner',role:'member',ip:'127.0.0.1'
 });
 try{
   // A name that looks like "Administrator" is NOT authority for support access.
   member.roles=[roles.nameOnlyAdmin];
   assert.equal((await get('/staff/tickets','other')).status,403,'role name alone does not grant access');
   assert.equal((await get('/staff/tickets/'+ticketId,'other')).status,403);

   // Actual Discord Administrator permission grants the same staff ticket access as configured admins.
   member.roles=[roles.nativeAdmin];
   const queueResponse=await get('/staff/tickets','other');
   assert.equal(queueResponse.status,200,'Discord Administrator role can open staff ticket queue');
   const queue=await queueResponse.text();
   assert.ok(queue.includes('/staff/tickets/'+ticketId),'regular support ticket is visible in queue');
   assert.ok(queue.includes('href="/tickets/mine"'),'admins can reach their personal tickets from staff queue');
   assert.equal((await get('/staff/tickets/'+ticketId,'other')).status,200,'Discord Administrator can open ticket details');
   assert.equal((await get('/tickets/attachments/999999','other')).status,404,'unknown attachment remains unavailable');
   assert.equal((await get('/staff/tickets/'+confidentialId,'other')).status,404,'owner-only staff reports remain confidential');
   assert.equal((await get('/owner/audit','other')).status,403,'Discord Administrator never receives owner audit access');
   const home=await (await get('/','other')).text();
   assert.ok(home.includes('href="/staff/tickets"'),'verified administrator gets staff navigation');
   assert.equal((await get('/tickets/mine','other')).status,200,'admin can still open their personal ticket listing');

   // When permissions disappear, the same account loses privileged access on the next request.
   member.roles=[];
   assert.equal((await get('/staff/tickets/'+ticketId,'other')).status,403,'role removal takes effect immediately');
 }finally{member.roles=originalRoles;}
 assert.equal((await get('/staff/tickets/'+ticketId,'adminB')).status,200,'explicitly configured admins remain supported');
 assert.equal((await get('/staff/tickets/'+confidentialId,'owner')).status,200,'owner keeps access to confidential reports');
});

test('staff reports about admins are owner-confidential in queues, pages and attachments',async()=>{
 let r=await multipart('/tickets/new/staff_report','member',{
  staff_username:'admina',description:'I want management to investigate a serious concern.'
 },[fakeImage]);
 assert.equal(r.status,303);
 const t=one("SELECT * FROM support_tickets WHERE category='staff_report' AND reported_user_id=?",ids.adminA);
 assert.ok(t);assert.equal(t.visibility,'owner');
 const att=one('SELECT * FROM support_ticket_attachments WHERE ticket_id=?',t.id);
 for(const who of ['reviewer','adminA','adminB']){
  assert.equal((await get('/staff/tickets/'+t.id,who)).status,404);
  assert.equal((await get('/tickets/attachments/'+att.id,who)).status,404);
 }
 assert.equal((await get('/staff/tickets/'+t.id,'owner')).status,200);
 assert.equal((await get('/tickets/'+t.id,'member')).status,200);
 assert.equal((await get('/tickets/attachments/'+att.id,'owner')).status,200);
 assert.equal((await get('/tickets/attachments/'+att.id+'?preview=1','adminB')).status,404,'preview cannot bypass owner-only report');
 assert.equal((await get('/tickets/attachments/'+att.id+'?preview=1','owner')).status,200,'owner can preview confidential report');
 const queue=await (await get('/staff/tickets?status=all','adminB')).text();
 assert.ok(!queue.includes('/staff/tickets/'+t.id));
 const adminHome=await (await get('/','adminB')).text();
 assert.ok(!adminHome.includes('/staff/tickets/'+t.id));
 assert.ok(notifications.some(n=>n.target==='ownerReport'&&n.title.includes('Staff Report')));
 assert.ok(!notifications.some(n=>n.target==='default'&&n.title.includes('Staff Report')));
});

test('reviewer staff report is admin-only, becomes permanently owner-only after promotion',async()=>{
 let r=await multipart('/tickets/new/staff_report','other',{
  staff_username:'reviewer',description:'Please investigate this staff response.'
 },[fakeImage]);assert.equal(r.status,303);
 const t=one("SELECT * FROM support_tickets WHERE category='staff_report' AND reported_user_id=?",ids.reviewer);
 assert.ok(t);assert.equal(t.visibility,'admin');
 assert.equal((await get('/staff/tickets/'+t.id,'reviewer')).status,404);
 assert.equal((await get('/staff/tickets/'+t.id,'adminB')).status,200);
 members.get(ids.reviewer).roles=[roles.admin];
 assert.equal((await get('/staff/tickets/'+t.id,'adminB')).status,404);
 assert.equal(one('SELECT visibility FROM support_tickets WHERE id=?',t.id).visibility,'owner');
 assert.equal((await get('/staff/tickets/'+t.id,'owner')).status,200);
 members.get(ids.reviewer).roles=[roles.reviewer];
 assert.equal((await get('/staff/tickets/'+t.id,'adminB')).status,404,'owner confidentiality is sticky');
});


test('staff submitting confidential reports cannot see them through staff queues',async()=>{
 const r=await multipart('/tickets/new/staff_report','reviewer',{
  staff_username:'admina',description:'I am a staff reviewer reporting an admin to management.'
 },[fakeImage]);
 assert.equal(r.status,303);
 const t=one("SELECT * FROM support_tickets WHERE category='staff_report' AND user_id=? ORDER BY id DESC LIMIT 1",ids.reviewer);
 assert.ok(t);assert.equal(t.visibility,'owner');
 const queue=await (await get('/staff/tickets?status=all','reviewer')).text();
 assert.ok(!queue.includes('/staff/tickets/'+t.id));
 const home=await (await get('/','reviewer')).text();
 assert.ok(!home.includes('/staff/tickets/'+t.id));
 assert.equal((await get('/staff/tickets/'+t.id,'reviewer')).status,404);
 assert.equal((await get('/tickets/'+t.id,'reviewer')).status,200,'applicant still sees own report');
 assert.equal((await get('/staff/tickets/'+t.id,'owner')).status,200);
});

test('owner-only webhook test controls use the designated channel and never @here',async()=>{
 assert.equal((await post('/admin/settings/webhook/test','adminB',{target:'ownerReport'})).status,403);
 for(const target of ['default','adminReport','ownerReport']){
  const r=await post('/admin/settings/webhook/test','owner',{target});
  assert.equal(r.status,303);
  assert.equal(notifications.at(-1).target,target);
  assert.equal(notifications.at(-1).pingHere,false);
 }
 assert.equal((await post('/admin/settings/webhook/test','owner',{target:'arbitrary'})).status,400);
});

test('staff chat is private, stores messages and returns them via the polling endpoint',async()=>{
 assert.equal((await get('/staff/chat/messages?after=0','member')).status,403);
 assert.equal((await post('/staff/chat/send','member',{body:'unauthorized'})).status,403);
 assert.equal((await post('/staff/chat/send','reviewer',{body:'Someone check ticket #8 please.'})).status,303);
 const response=await get('/staff/chat/messages?after=0','adminB');
 assert.equal(response.status,200);
 const body=await response.json();
 assert.ok(body.messages.some(m=>m.body==='Someone check ticket #8 please.'));
 const page=await (await get('/','owner')).text();
 assert.ok(page.includes('Someone check ticket #8 please.'));
 assert.equal(one('SELECT COUNT(*) c FROM staff_chat_messages').c,1);
});

test('non-members can sign in, submit Ban Appeals, and view the staff team only',async()=>{
 const home=await (await get('/','banned')).text();
 assert.match(home,/Ban appeal/);
 assert.match(home,/Meet the Team/);
 assert.match(home,/href="\/team"/);
 const staff=await get('/team','banned');
 assert.equal(staff.status,200);
 const html=await staff.text();
 assert.match(html,/Meet our <span class="gradient">team/);
 assert.match(html,/Our Staff/);
 assert.match(html,/class="team-card panel"/);
 assert.doesNotMatch(html,/href="\/u\/\d+"/,'non-member team cards are read-only');
 assert.equal((await get('/team?tab=sbs','banned')).status,200);
 assert.equal((await get('/team?tab=known&known=mega','banned')).status,200);
 for(const path of ['/feed','/members','/suggestions','/apply','/dashboard','/profile/edit','/u/'+ids.adminA,
   '/staff','/staff/tickets','/admin/settings','/owner/audit']){
   assert.equal((await get(path,'banned')).status,403,'restricted non-member route: '+path);
 }
 assert.equal((await get('/feed','banned')).status,403);
 assert.equal((await get('/staff/tickets','banned')).status,403);
 assert.equal((await get('/tickets/new/player_report','banned')).status,403);
 assert.equal((await get('/tickets/new/ban_appeal','banned')).status,200);
 assert.equal((await post('/tickets/new/ban_appeal','banned',{
  minecraft_username:'BannedPlayer',ban_reason:'Spamming',
  appeal_reason:'I believe I was banned by mistake and would like to explain.'
 })).status,303);
 const t=one("SELECT * FROM support_tickets WHERE category='ban_appeal' AND user_id=?",ids.banned);
 assert.ok(t);
 assert.equal((await get('/tickets/'+t.id,'banned')).status,200);
 assert.equal((await get('/tickets/'+t.id,'other')).status,404);
 assert.equal((await get('/tickets/mine','banned')).status,200);
 assert.equal((await post('/tickets/new/ban_appeal','banned',{
  minecraft_username:'BannedPlayer',ban_reason:'Spamming',
  appeal_reason:'I believe I was banned by mistake and would like to explain.'
 })).status,303);
 assert.equal(one("SELECT COUNT(*) c FROM support_tickets WHERE category='ban_appeal' AND user_id=?",ids.banned).c,1);
});

test('staff application conversation accepts private media replies and keeps owner approval separate',async()=>{
 const answers={position:'Helper',age_bracket:'18+',timezone:'UTC',
  availability:'I can volunteer throughout the week after school or work.',
  experience:'I have experience volunteering for large gaming communities.',
  motivation:'I care about making a safe helpful environment for everyone.',
  scenario:'I would ask both sides to provide evidence and avoid public arguments.'};
 assert.equal((await post('/apply','other',answers)).status,303);
 const a=one('SELECT * FROM applications WHERE user_id=?',ids.other);assert.ok(a);
 assert.equal((await multipart('/dashboard/applications/'+a.id+'/reply','other',{body:'Here is some useful evidence.'},[fakeImage])).status,303);
 const att=one('SELECT * FROM application_ticket_attachments WHERE application_id=?',a.id);assert.ok(att);
 assert.equal((await get('/applications/attachments/'+att.id,'other')).status,200);
 assert.equal((await get('/applications/attachments/'+att.id,'member')).status,404);
 assert.equal((await get('/applications/attachments/'+att.id,'adminB')).status,200);
 const memberPreview=await get('/applications/attachments/'+att.id+'?preview=1','other');
 assert.equal(memberPreview.status,200);
 assert.match(memberPreview.headers.get('content-disposition'),/^inline;/);
 assert.equal((await get('/applications/attachments/'+att.id+'?preview=1','member')).status,404);
 assert.equal((await get('/applications/attachments/'+att.id+'?preview=1','adminB')).status,200);
 const page=await (await get('/dashboard/applications/'+a.id,'other')).text();
 assert.ok(page.includes('data-evidence-open'),'application conversation also shows media previews');
 assert.ok(page.includes('/applications/attachments/'+att.id+'?preview=1'));
 assert.match(page,/ticket-chat-log/);assert.match(page,/Upload video\/pictures/);
 assert.equal((await post('/staff/applications/'+a.id+'/reply','reviewer',{body:'Your ticket is in review.'})).status,303);
 assert.match(await (await get('/dashboard/applications/'+a.id,'other')).text(),/Your ticket is in review/);
 assert.equal(one('SELECT status FROM applications WHERE id=?',a.id).status,'pending');
});

test('malformed evidence and unsafe category do not create support tickets',async()=>{
 assert.equal((await post('/tickets/new/application','member',{})).status,404);
 const before=one('SELECT COUNT(*) c FROM support_tickets').c;
 const result=await multipart('/tickets/new/player_report','member',{
  reported_player:'Player',rule_broken:'Spamming',description:'The player was spamming and threatening people.'
 },[{bytes:Buffer.from('not really a PNG'),name:'proof.png'}]);
 assert.equal(result.status,400);
 assert.equal(one('SELECT COUNT(*) c FROM support_tickets').c,before);
});
