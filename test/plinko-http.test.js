// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=mkdtempSync(join(tmpdir(),'sb-plinko-http-'));
const guild='100000000000000001',owner='100000000000000002',
 alice='100000000000000181',bob='100000000000000182';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'plinko-http.sqlite'),
 DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,one,run}=await import('../src/db.js');
await import('../src/level-points.js');
const {createServer}=await import('../src/server.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  id,id,'Plinko Test Member',Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',
  guild,id,5000);
}
const server=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'plinko-member'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(dir,{recursive:true,force:true});});
async function login(id){
 const response=await fetch(base+'/__test/login/'+id,{redirect:'manual'});
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 const page=await (await fetch(base+'/arcade/plinko',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(cookie&&csrf);
 return {cookie,csrf,page};
}
async function post(path,member,fields,token=member.csrf){
 return fetch(base+path,{method:'POST',redirect:'manual',headers:{
  cookie:member.cookie,Accept:'application/json','x-arcade-async':'1',
  'Content-Type':'application/x-www-form-urlencoded'
 },body:new URLSearchParams({_csrf:token,...fields})});
}
const input=(wager=50,rows=12,risk='medium',count=1,key=randomUUID())=>({
 wager:String(wager),rows:String(rows),risk,count:String(count),request_id:key
});

test('Unauthenticated users get public Plinko metadata without wallet or private history',async()=>{
 const preview=await fetch(base+'/arcade/plinko',{redirect:'manual'});
 assert.equal(preview.status,200);
 const body=await preview.text();
 assert.match(body,/Plinko/);
 assert.doesNotMatch(body,/data-plinko-root|data-plinko-balance|Plinko Test Member/);
 const unauthedPost=await fetch(base+'/arcade/plinko/drop',{method:'POST',redirect:'manual'});
 assert.ok([302,303,401,403].includes(unauthedPost.status));
});
test('Plinko appears on Arcade homepage and renders rows, risk, batch, Canvas and assets',async()=>{
 const member=await login(alice);
 assert.match(member.page,/data-plinko-canvas/);
 assert.match(member.page,/name="risk"/);
 assert.match(member.page,/value="low"/);
 assert.match(member.page,/value="medium"/);
 assert.match(member.page,/value="high"/);
 assert.match(member.page,/8 rows/);
 assert.match(member.page,/12 rows/);
 assert.match(member.page,/16 rows/);
 assert.match(member.page,/value="10"/);
 assert.match(member.page,/data-plinko-slots/);
 assert.match(member.page,/data-plinko-balance data-plinko-wallet="5000"/);
 assert.doesNotMatch(member.page,/THEORETICAL RETURN|data-plinko-odds/i);
 assert.match(member.page,/\/static\/plinko\.css/);
 assert.match(member.page,/\/static\/plinko\.js/);
 const arcade=(await (await fetch(base+'/arcade',{headers:{cookie:member.cookie}})).text());
 assert.match(arcade,/href="\/arcade\/plinko"/);
 const js=await fetch(base+'/static/plinko.js');
 assert.equal(js.status,200);
 assert.match(await js.text(),/data-plinko-form/);
 const css=await fetch(base+'/static/plinko.css');
 assert.equal(css.status,200);
});
test('Plinko wager POST requires valid CSRF; fast Arcade mode settles and returns an animated result',async()=>{
 const member=await login(alice);
 const before=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 const fields=input(75,8,'low',5);
 let response=await post('/arcade/plinko/drop',member,fields,'invalid');
 assert.equal(response.status,403);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,before);
 response=await post('/arcade/plinko/drop',member,fields);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.ok,true);
 assert.equal(result.round.game,'plinko');
 assert.equal(result.round.wager,375);
 assert.equal(result.round.details.rows,8);
 assert.equal(result.round.details.risk,'low');
 assert.equal(result.round.details.count,5);
 assert.equal(result.round.details.balls.length,5);
 assert.equal(result.round.details.balls.reduce((s,b)=>s+b.payout,0),result.round.payout);
 assert.ok(result.round.details.balls.every(b=>b.decisions.length===8&&
  b.decisions.reduce((s,x)=>s+x,0)===b.slot));
 assert.match(result.html,/data-plinko-last/);
 assert.match(result.html,/data-arcade-wager="plinko"/);
 assert.match(result.html,/arcade-root/);
 assert.ok(result.url.endsWith('?round='+result.round.id));
 const balance=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 assert.equal(balance,before-result.round.wager+result.round.payout);
 assert.match(result.html,new RegExp('data-plinko-wallet="'+balance+'"'));
 assert.doesNotMatch(result.html,/THEORETICAL RETURN|data-plinko-odds/i);
 const retry=await post('/arcade/plinko/drop',member,fields);
 assert.equal(retry.status,200);
 assert.equal((await retry.json()).round.id,result.round.id);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,balance);
 response=await post('/arcade/plinko/drop',member,{...fields,wager:'90'});
 assert.equal(response.status,409);
 response=await post('/arcade/plinko/drop',member,{...fields,request_id:randomUUID(),wager:'2000'});
 assert.equal(response.status,400);
});
test('Native form redirects, last per-ball wager returns across devices and history includes Plinko',async()=>{
 const member=await login(alice);
 const response=await fetch(base+'/arcade/plinko',{headers:{cookie:member.cookie}});
 const content=await response.text();
 assert.match(content,/value="75"/,'the most recently submitted wager per ball is restored');
 const history=await (await fetch(base+'/arcade/history',{headers:{cookie:member.cookie}})).text();
 assert.match(history,/Plinko/);
 assert.match(history,/plinko wager|plinko payout/i);
 const form=new URLSearchParams({_csrf:member.csrf,...input(50,12,'high',1)});
 const native=await fetch(base+'/arcade/plinko/drop',{method:'POST',redirect:'manual',
  headers:{cookie:member.cookie,'Content-Type':'application/x-www-form-urlencoded'},body:form});
 assert.equal(native.status,303);
 assert.match(native.headers.get('location'),/\/arcade\/plinko\?round=/);
 const first=parseInt(native.headers.get('location').split('round=')[1],10);
 const own=await fetch(base+'/arcade/plinko?round='+first,{headers:{cookie:member.cookie}});
 assert.equal(own.status,200);
 assert.match(await own.text(),/Replay last drop/);
 const other=await login(bob);
 const denied=await fetch(base+'/arcade/plinko?round='+first,{headers:{cookie:other.cookie}});
 assert.equal(denied.status,404);
 const blocked=await post('/arcade/plinko/drop',other,input(1000,12,'medium',10));
 assert.equal(blocked.status,409,'cannot stake more than the wallet');
});
