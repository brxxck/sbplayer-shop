// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const folder=mkdtempSync(join(tmpdir(),'sb-roulette-http-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000191',bob='100000000000000192';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(folder,'roulette-http.sqlite'),
 DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,run,one}=await import('../src/db.js');
await import('../src/level-points.js');
const {createServer}=await import('../src/server.js');
const {rouletteOutcome,rouletteCommitment}=await import('../src/roulette-rules.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  id,id,'Roulette Member '+id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',
  guild,id,5000);
}
const server=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'roulette_member'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();rmSync(folder,{recursive:true,force:true});});
async function login(id){
 const res=await fetch(origin+'/__test/login/'+id,{redirect:'manual'});
 const cookie=res.headers.get('set-cookie')?.split(';')[0];
 const page=await (await fetch(origin+'/arcade/online/roulette',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(cookie&&csrf,'session and CSRF token exist');
 return {cookie,csrf,page};
}
async function state(member){
 const response=await fetch(origin+'/arcade/online/roulette/state',{
  headers:{cookie:member.cookie,Accept:'application/json'}});
 assert.equal(response.status,200);
 return response.json();
}
async function post(path,member,fields={},csrf=member.csrf){
 return fetch(origin+path,{method:'POST',redirect:'manual',
  headers:{cookie:member.cookie,Accept:'application/json',
   'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({_csrf:csrf,...fields})});
}
const bet=(round_id,bets,request_id=randomUUID())=>({
 round_id:String(round_id),request_id,bets_json:JSON.stringify(bets)
});
test('Signed-out visitors see only safe preview, not balance or unrevealed seed',async()=>{
 const preview=await fetch(origin+'/arcade/online/roulette',{redirect:'manual'});
 assert.equal(preview.status,200);
 const markup=await preview.text();
 assert.match(markup,/Roulette/);
 assert.doesNotMatch(markup,/data-roulette-root|data-roulette-balance|Roulette Member/);
 const privateResponse=await fetch(origin+'/arcade/online/roulette/state',{redirect:'manual'});
 assert.ok([302,303].includes(privateResponse.status));
 const unauthenticated=await fetch(origin+'/arcade/online/roulette/bet',{method:'POST',redirect:'manual'});
 assert.ok([302,303,403].includes(unauthenticated.status));
});
test('Roulette is in Online Games and has a complete betting board, wheel, assets and countdown',async()=>{
 const member=await login(alice);
 assert.match(member.page,/data-roulette-root/);
 assert.match(member.page,/data-roulette-canvas/);
 assert.match(member.page,/30 full seconds/);
 assert.match(member.page,/data-roulette-choice="number:0"/);
 assert.match(member.page,/data-roulette-choice="number:36"/);
 assert.match(member.page,/data-roulette-choice="color:red"/);
 assert.match(member.page,/data-roulette-choice="column:1"/);
 assert.match(member.page,/data-roulette-catalog/);
 assert.match(member.page,/data-roulette-repeat/);
 assert.match(member.page,/\/static\/online-roulette\.js/);
 assert.match(member.page,/\/static\/online-roulette\.css/);
 const lobby=await (await fetch(origin+'/arcade/online',{headers:{cookie:member.cookie}})).text();
 assert.match(lobby,/data-online-game="roulette"/);
 assert.match(lobby,/href="\/arcade\/online\/roulette"/);
 assert.match(lobby,/PLAYERS BETTING/);
 const js=await fetch(origin+'/static/online-roulette.js');
 assert.equal(js.status,200);
 assert.match(await js.text(),/roulette-canvas/);
 const css=await fetch(origin+'/static/online-roulette.css');
 assert.equal(css.status,200);
});
test('A shared state never reveals the winning number or seed before spin ends',async()=>{
 const a=await login(alice),b=await login(bob);
 const oneState=await state(a),otherState=await state(b);
 assert.equal(oneState.roundId,otherState.roundId);
 assert.equal(oneState.phase,'betting');
 assert.equal(oneState.winningNumber,null);
 assert.equal(oneState.seed,null);
 assert.equal(otherState.seed,null);
 assert.equal(oneState.commitment.length,64);
 assert.equal(oneState.betClosesAt-oneState.createdAt,30000);
 assert.equal(oneState.spinEndsAt-oneState.betClosesAt,8000);
 assert.equal(oneState.resultsEndsAt-oneState.spinEndsAt,4000);
});
test('Form data is CSRF checked; multiple chips deduct once; other players see only public bets',async()=>{
 const member=await login(alice),outsider=await login(bob);
 const initial=await state(member),before=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 const payload=bet(initial.roundId,[{key:'number:17',stake:25},{key:'color:black',stake:50}]);
 let response=await post('/arcade/online/roulette/bet',member,payload,'bad');
 assert.equal(response.status,403);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,before);
 response=await post('/arcade/online/roulette/bet',member,payload);
 assert.equal(response.status,200);
 let confirmed=await response.json();
 assert.equal(confirmed.myWager,75);
 assert.equal(confirmed.myBets.length,2);
 assert.equal(confirmed.roundWager,75);
 assert.equal(confirmed.roundPlayers,1);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,before-75);
 assert.equal(confirmed.repeatBets.length,2);
 const view=await state(outsider);
 assert.equal(view.roundWager,75);
 assert.equal(view.myWager,0);
 assert.equal(view.myBets.length,0);
 assert.equal(view.seed,null);
 response=await post('/arcade/online/roulette/bet',member,payload);
 assert.equal(response.status,200);
 assert.equal((await response.json()).myWager,75);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,before-75);
 response=await post('/arcade/online/roulette/bet',member,{...payload,
  bets_json:JSON.stringify([{key:'number:18',stake:25}])});
 assert.equal(response.status,409);
 response=await post('/arcade/online/roulette/bet',outsider,payload);
 assert.equal(response.status,409);
});
test('Roulette heartbeat requires CSRF and counts current viewers',async()=>{
 const a=await login(alice);
 const denied=await post('/arcade/online/roulette/heartbeat',a,{},'bad');
 assert.equal(denied.status,403);
 const allowed=await post('/arcade/online/roulette/heartbeat',a);
 assert.equal(allowed.status,200);
 assert.ok((await allowed.json()).watching>=1);
});
test('The deadline locks point wagers even if an old page still displays Confirm',async()=>{
 const a=await login(alice);
 const current=await state(a);
 run('UPDATE online_roulette_rounds SET bet_closes_at=?,spin_ends_at=?,results_ends_at=? WHERE id=?',
  Date.now()-1,Date.now()+8000,Date.now()+12000,current.roundId);
 const original=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 const response=await post('/arcade/online/roulette/bet',a,
  bet(current.roundId,[{key:'color:red',stake:500}]));
 assert.equal(response.status,409);
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,original);
 const stateAfter=await state(a);
 assert.equal(stateAfter.phase,'spinning');
 assert.equal(stateAfter.winningNumber,null);
});
test('Result phase exposes a verifiable winning number and immutable wallet settlement',async()=>{
 const a=await login(alice);
 const s=await state(a);
 // Move the spin end into the past; the server must settle any previously
 // accepted chips once, and reveal a seed that reproduces the winning number.
 run("UPDATE online_roulette_rounds SET spin_ends_at=?,results_ends_at=? WHERE id=?",
  Date.now()-1,Date.now()+4000,s.roundId);
 const reveal=await state(a);
 assert.equal(reveal.phase,'results');
 assert.ok(reveal.winningNumber>=0&&reveal.winningNumber<=36);
 assert.equal(rouletteCommitment(reveal.seed),reveal.commitment);
 assert.equal(rouletteOutcome(reveal.seed,reveal.roundId),reveal.winningNumber);
 const before=one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance;
 const again=await state(a);
 assert.equal(again.phase,'results');
 assert.equal(one('SELECT balance FROM level_point_wallets WHERE user_id=?',alice).balance,before);
 assert.ok(reveal.history.some(item=>item.roundId===reveal.roundId));
});
