// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sb-blackjack-http-'));
const guild='100000000000000001',owner='100000000000000002',
 alice='100000000000000103',bob='100000000000000104';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'blackjack-http.sqlite'),
 DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,run,one}=await import('../src/db.js');
await import('../src/level-points.js');
const {createServer}=await import('../src/server.js');
const {blackjackSnapshot}=await import('../src/online-blackjack.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Blackjack Member',Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,id,5000);
}
const server=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'blackjack_member'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(temp,{recursive:true,force:true});});
async function login(id){
 const login=await fetch(base+'/__test/login/'+id,{redirect:'manual'});
 const cookie=login.headers.get('set-cookie')?.split(';')[0];
 const page=await (await fetch(base+'/arcade/online',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(cookie&&csrf);
 return {cookie,csrf};
}
async function request(path,member,fields={},csrf=member?.csrf){
 return fetch(base+path,{method:'POST',redirect:'manual',
  headers:{cookie:member?.cookie||'',Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({_csrf:csrf,...fields})
 });
}
test('Unauthenticated visitors receive only an Arcade preview; private table data remains protected',async()=>{
 const publicView=await fetch(base+'/arcade/online/blackjack',{redirect:'manual'});
 assert.equal(publicView.status,200);
 const publicHtml=await publicView.text();
 assert.doesNotMatch(publicHtml,/data-bj-table|data-bj-wallet|Blackjack Member/);
 const status=await fetch(base+'/arcade/online/blackjack/state',{redirect:'manual'});
 assert.ok([302,303].includes(status.status));
});
test('Blackjack route renders table, phase assets and lobby link with CSRF-protected queue join',async()=>{
 const member=await login(alice);
 let response=await fetch(base+'/arcade/online',{headers:{cookie:member.cookie}});
 let text=await response.text();
 assert.equal(response.status,200);
 assert.match(text,/Open Blackjack table/);
 assert.match(text,/Online Games/);
 response=await request('/arcade/online/join',member,{game:'blackjack'},'invalid');
 assert.equal(response.status,403);
 response=await request('/arcade/online/join',member,{game:'blackjack'});
 assert.equal(response.status,303);
 response=await fetch(base+'/arcade/online/blackjack',{headers:{cookie:member.cookie}});
 assert.equal(response.status,200);
 text=await response.text();
 assert.match(text,/SB BLACKJACK|SB DEALER/);
 assert.match(text,/data-blackjack-root/);
 assert.match(text,/\/static\/online-blackjack\.css/);
 assert.match(text,/\/static\/online-blackjack\.js/);
 assert.match(text,/Place wager/);
 const js=await fetch(base+'/static/online-blackjack.js');
 assert.equal(js.status,200);
 assert.match(await js.text(),/data-bj-action/);
 const css=await fetch(base+'/static/online-blackjack.css');
 assert.equal(css.status,200);
});
test('Blackjack API requires membership, valid CSRF and server-chosen seat',async()=>{
 const member=await login(alice);
 const outsider=await login(bob);
 let response=await fetch(base+'/arcade/online/blackjack/state',{headers:{cookie:member.cookie,Accept:'application/json'}});
 assert.equal(response.status,200);
 const state=await response.json();
 assert.equal(state.phase,'betting');
 assert.equal(state.canBet,true);
 assert.ok(state.players.length<=4);
 assert.equal(Object.hasOwn(state,'shoe'),false);
 const payload={round_id:String(state.roundId),wager:'150',request_id:randomUUID()};
 response=await request('/arcade/online/blackjack/bet',member,payload,'invalid');
 assert.equal(response.status,403);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,5000);
 response=await request('/arcade/online/blackjack/bet',outsider,payload);
 assert.equal(response.status,409,'Spectators cannot wager on someone else’s seat');
 response=await request('/arcade/online/blackjack/bet',member,payload);
 assert.equal(response.status,200);
 const accepted=await response.json();
 assert.equal(accepted.placedBet,150);
 assert.equal(accepted.roundWager,150);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,4850);
 response=await request('/arcade/online/blackjack/bet',member,payload);
 assert.equal(response.status,200,'Duplicate request id is safe');
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,4850);
 response=await request('/arcade/online/blackjack/action',member,{
  round_id:String(state.roundId),action:'hit',seq:String(state.seq),request_id:randomUUID()
 });
 assert.equal(response.status,409,'Actions are not allowed before the deal');
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,4850);
});
