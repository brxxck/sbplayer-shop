// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const tmp=mkdtempSync(join(tmpdir(),'sb-solo-blackjack-http-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000141',bob='100000000000000142';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(tmp,'solo-http.sqlite'),
 DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,one,run}=await import('../src/db.js');
await import('../src/level-points.js');
const {createServer}=await import('../src/server.js');
const {soloBlackjackStart,soloBlackjackSnapshot}=await import('../src/solo-blackjack.js');
for(const id of [alice,bob]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Solo Blackjack Member',Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',
  guild,id,5000);
}
const app=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'solo_blackjack'},roles:[],pending:false}),
 getRoles:async()=>[]
}});
await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+app.address().port;
after(async()=>{await new Promise(resolve=>app.close(resolve));db.close();rmSync(tmp,{recursive:true,force:true});});
const card=(rank,suit='S')=>({rank,suit});
const shoe=(...cards)=>[...cards].reverse();
function reset(){
 db.exec("DELETE FROM solo_blackjack_actions;DELETE FROM solo_blackjack_state;"+
  "DELETE FROM arcade_rounds WHERE game='blackjack_solo';"+
  "DELETE FROM arcade_transfers WHERE reason LIKE 'blackjack.solo.%';"+
  "UPDATE level_point_wallets SET balance=5000;");
}
const balance=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,user).balance;
async function login(user){
 const res=await fetch(base+'/__test/login/'+user,{redirect:'manual'});
 const cookie=res.headers.get('set-cookie')?.split(';')[0];
 const page=await (await fetch(base+'/arcade/blackjack',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(cookie&&csrf);
 return {cookie,csrf,page};
}
async function post(path,member,fields={},csrf=member.csrf,accept='application/json'){
 return fetch(base+path,{method:'POST',redirect:'manual',
  headers:{cookie:member.cookie,Accept:accept,'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({_csrf:csrf,...fields})});
}
async function getState(member,round=null){
 const response=await fetch(base+'/arcade/blackjack/state'+(round?'?round='+round:''),
  {headers:{cookie:member.cookie,Accept:'application/json'}});
 assert.equal(response.status,200);
 return response.json();
}
test('Guest sees metadata only, never wallet, dealer cards, private state or action routes',async()=>{
 reset();
 const guest=await fetch(base+'/arcade/blackjack',{redirect:'manual'});
 assert.equal(guest.status,200);
 const html=await guest.text();
 assert.match(html,/Solo Blackjack/);
 assert.doesNotMatch(html,/data-solo-blackjack-root|data-sbj-state|Solo Blackjack Member/);
 const privateStatus=await fetch(base+'/arcade/blackjack/state',{redirect:'manual'});
 assert.ok([302,303].includes(privateStatus.status));
 const denied=await fetch(base+'/arcade/blackjack/start',{method:'POST',redirect:'manual'});
 assert.ok([302,303,403].includes(denied.status));
});
test('Arcade home and game nav show Solo Blackjack beside existing games',async()=>{
 reset();
 const a=await login(alice);
 assert.match(a.page,/data-solo-blackjack-root/);
 assert.match(a.page,/data-sbj-table/);
 assert.match(a.page,/data-sbj-controls/);
 assert.match(a.page,/data-sbj-wager/);
 assert.match(a.page,/name="request_id"/);
 assert.match(a.page,/\/static\/solo-blackjack\.css/);
 assert.match(a.page,/\/static\/solo-blackjack\.js/);
 assert.match(a.page,/\/static\/online-blackjack\.css/);
 assert.match(a.page,/href="\/arcade\/online\/blackjack"/);
 assert.match(a.page,/6 DECKS/);
 const home=await (await fetch(base+'/arcade',{headers:{cookie:a.cookie}})).text();
 assert.match(home,/href="\/arcade\/blackjack"/);
 assert.match(home,/Six solo games/);
 const js=await fetch(base+'/static/solo-blackjack.js');
 assert.equal(js.status,200);
 assert.match(await js.text(),/data-sbj-form/);
 const css=await fetch(base+'/static/solo-blackjack.css');
 assert.equal(css.status,200);
});
test('Start hand is CSRF protected, charges one wager, then responds with hidden-card-safe HTML',async()=>{
 reset();const a=await login(alice);
 const fields={wager:'100',request_id:randomUUID()};
 let response=await post('/arcade/blackjack/start',a,fields,'wrong');
 assert.equal(response.status,403);
 assert.equal(balance(alice),5000);
 response=await post('/arcade/blackjack/start',a,fields);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.ok,true);
 assert.ok(result.state.roundId>0);
 assert.ok(['playing','settled'].includes(result.state.phase));
 assert.equal(result.state.initialWager,100);
 assert.equal(result.state.wager,100);
 assert.equal(result.state.hands[0].cards.length,2);
 assert.ok(result.state.dealer.length>=2,'A settled dealer may draw additional cards');
 if(result.state.phase==='playing')assert.equal(result.state.dealer.length,2);
 assert.equal(Object.hasOwn(result.state,'shoe'),false);
 assert.doesNotMatch(JSON.stringify(result),/"shoe"/);
 assert.match(result.table,/SB BLACKJACK/);
 assert.match(result.controls,/data-sbj-/);
 assert.equal(balance(alice),5000-100+result.state.payout);
 const saved=await getState(a,result.state.roundId);
 assert.equal(saved.state.roundId,result.state.roundId);
 if(saved.state.phase==='playing'){
  assert.deepEqual(saved.state.dealer[1],{back:true});
  assert.equal(saved.state.dealerValue,null);
  const row=one('SELECT details_json FROM arcade_rounds WHERE id=?',saved.state.roundId);
  assert.deepEqual(JSON.parse(row.details_json).dealer[1],{back:true});
 }
 const repeated=await post('/arcade/blackjack/start',a,fields);
 assert.equal(repeated.status,200);
 assert.equal((await repeated.json()).state.roundId,result.state.roundId);
 assert.equal(balance(alice),5000-100+result.state.payout);
});
test('POST actions validate revision, ownership and replay IDs with no double charge',async()=>{
 reset();const a=await login(alice),b=await login(bob);
 const id=soloBlackjackStart(alice,{wager:'125',request_id:randomUUID()},
  shoe(card('10'),card('9'),card('6'),card('8'),card('5')));
 const first=(await getState(a,id)).state;
 assert.equal(first.phase,'playing');
 assert.ok(first.actions.includes('double'));
 const fields={round_id:String(id),revision:String(first.revision),
  move:'double',request_id:randomUUID()};
 const activeHtml=await (await fetch(base+'/arcade/blackjack?round='+id,
  {headers:{cookie:a.cookie}})).text();
 assert.match(activeHtml,/name="move" value="double"/);
 assert.doesNotMatch(activeHtml,/name="action" value="double"/);
 let response=await post('/arcade/blackjack/action',a,fields,'invalid');
 assert.equal(response.status,403);
 assert.equal(balance(alice),4875);
 response=await post('/arcade/blackjack/action',b,fields);
 assert.equal(response.status,404,'Another player cannot operate a private game');
 response=await post('/arcade/blackjack/action',a,fields);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.state.phase,'settled');
 assert.equal(result.state.hands[0].cards.length,3);
 assert.equal(result.state.hands[0].wager,250);
 assert.equal(result.state.payout,500);
 assert.equal(balance(alice),5250);
 assert.match(result.table,/21/);
 assert.match(result.controls,/Deal Cards/);
 response=await post('/arcade/blackjack/action',a,fields);
 assert.equal(response.status,200);
 assert.equal((await response.json()).state.payout,500);
 assert.equal(balance(alice),5250);
 response=await post('/arcade/blackjack/action',a,{...fields,request_id:randomUUID()});
 assert.equal(response.status,409);
 response=await fetch(base+'/arcade/blackjack?round='+id,{headers:{cookie:b.cookie}});
 assert.equal(response.status,404);
 assert.equal(one("SELECT COUNT(*) AS n FROM arcade_transfers WHERE reason='blackjack.solo.payout'").n,1);
});
test('Native no-JavaScript forms redirect and restore the last wager and hand across refresh',async()=>{
 reset();
 const a=await login(alice);
 const res=await post('/arcade/blackjack/start',a,{wager:'215',request_id:randomUUID()},a.csrf,'text/html');
 assert.equal(res.status,303);
 assert.match(res.headers.get('location'),/\/arcade\/blackjack\?round=\d+/);
 const id=parseInt(res.headers.get('location').split('round=')[1],10);
 const loaded=await fetch(base+'/arcade/blackjack?round='+id,{headers:{cookie:a.cookie}});
 assert.equal(loaded.status,200);
 const page=await loaded.text();
 assert.match(page,/data-sbj-table/);
 const round=soloBlackjackSnapshot(alice,id);
 assert.equal(round.lastWager,215);
 if(round.phase==='playing'){
  assert.match(page,/data-sbj-action/);
  const stand=await post('/arcade/blackjack/action',a,{
   round_id:String(id),revision:String(round.revision),action:'stand',
   request_id:randomUUID()
  },a.csrf,'text/html');
  assert.equal(stand.status,303);
  assert.match(stand.headers.get('location'),/\/arcade\/blackjack\?round=/);
 }
 const next=await (await fetch(base+'/arcade/blackjack',{headers:{cookie:a.cookie}})).text();
 assert.match(next,/data-last-round-at=/);
 assert.match(next,/value="215"/,'new wager defaults to last initial wager');
});
