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
const roles={admin:'260000000000000001',reviewer:'260000000000000002'};
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(tmp,'new.sqlite'),DISCORD_CLIENT_ID:'160000000000000011',
 DISCORD_CLIENT_SECRET:'fixture',DISCORD_BOT_TOKEN:'fixture',DISCORD_GUILD_ID:ids.guild,
 ADMIN_ROLE_IDS:roles.admin,REVIEWER_ROLE_IDS:roles.reviewer,FINAL_APPROVER_USER_ID:ids.owner,
 APPLICATION_ROLES:'Helper,Moderator',DISCORD_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef',
   DISCORD_ADMIN_REPORT_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef',DISCORD_OWNER_REPORT_WEBHOOK_URL:'https://discord.com/api/webhooks/123456789012345678/test_fixture_token_abcdef'});
const {createServer}=await import('../src/server.js');
const {db,one,all}=await import('../src/db.js');
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
 let html=await (await get('/tickets/'+t.id,'member')).text();
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

test('non-members may use Discord-verified Ban Appeal pages only',async()=>{
 assert.match(await (await get('/','banned')).text(),/Ban appeal/);
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
 const page=await (await get('/dashboard/applications/'+a.id,'other')).text();
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
