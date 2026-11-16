// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Public, opt-in Solo Blackjack event: ordinary cards, guaranteed payout when doubling.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';

const dir=mkdtempSync(join(tmpdir(),'sb-solo-blackjack-event-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000261',bob='100000000000000262';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'event.sqlite'),DISCORD_GUILD_ID:guild,BASE_URL:'https://sbstore.info'});
const {db,one,run,setSetting}=await import('../src/db.js');
await import('../src/level-points.js');
const {soloBlackjackStart,soloBlackjackSnapshot,soloBlackjackAction,
 SOLO_DOUBLE_EVENT_KEY,soloDoubleEventEnabled}=await import('../src/solo-blackjack.js');
const {createServer}=await import('../src/server.js');
const {soloBlackjackPage}=await import('../src/solo-blackjack-views.js');
for(const id of [alice,bob,owner]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Event Test '+id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,id,10000);
}
const card=(rank,suit='S')=>({rank,suit});
const shoe=(...cards)=>[...cards].reverse();
const start=(user,wager,cards)=>soloBlackjackStart(user,{wager:String(wager),request_id:randomUUID()},cards);
const state=(user,id)=>soloBlackjackSnapshot(user,id);
const move=(user,id,action,revision,key=randomUUID())=>
 soloBlackjackAction(user,{round_id:String(id),revision:String(revision),move:action,request_id:key});
const balance=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,user)?.balance;
function reset(){
 setSetting(SOLO_DOUBLE_EVENT_KEY,'false');
 db.exec("DELETE FROM solo_blackjack_actions;DELETE FROM solo_blackjack_state;"+
  "DELETE FROM arcade_rounds;DELETE FROM arcade_transfers;UPDATE level_point_wallets SET balance=10000;");
}

test('event off retains ordinary bust and loss payouts',()=>{
 reset();
 const id=start(alice,100,shoe(card('10'),card('10'),card('6'),card('8'),card('K')));
 move(alice,id,'double',state(alice,id).revision);
 const ended=state(alice,id);
 assert.equal(ended.hands[0].value.total,26);
 assert.equal(ended.hands[0].outcome,'bust');
 assert.equal(ended.wager,200);
 assert.equal(ended.payout,0);
 assert.equal(balance(alice),9800);
});

test('event on guarantees a winning payout without manipulating the dealt cards',()=>{
 reset();setSetting(SOLO_DOUBLE_EVENT_KEY,'true');
 assert.equal(soloDoubleEventEnabled(),true);
 const id=start(alice,100,shoe(card('10'),card('10'),card('6'),card('8'),card('K')));
 const original=state(alice,id),request=randomUUID();
 move(alice,id,'double',original.revision,request);
 const ended=state(alice,id);
 assert.equal(ended.phase,'settled');
 assert.equal(ended.hands[0].value.total,26,'actual losing card remains visible');
 assert.equal(ended.hands[0].cards[2].rank,'K','shoe is not manipulated');
 assert.equal(ended.hands[0].outcome,'won');
 assert.equal(ended.hands[0].wager,200);
 assert.equal(ended.payout,400,'2x final doubled stake, including returned wager');
 assert.equal(ended.profit,200);
 assert.equal(balance(alice),10200);
 move(alice,id,'double',original.revision,request);
 assert.equal(balance(alice),10200,'retry must never double credit the prize');
 assert.equal(one("SELECT COUNT(*) AS count FROM arcade_transfers WHERE reason='blackjack.solo.payout'").count,1);
});

test('a Double Down bonus earned during the event survives an admin switching it off mid-round',()=>{
 reset();setSetting(SOLO_DOUBLE_EVENT_KEY,'true');
 const id=start(bob,100,shoe(card('8'),card('10'),card('8','H'),card('7'),card('K'),card('2'),card('9')));
 move(bob,id,'split',state(bob,id).revision);
 const split=state(bob,id);
 assert.equal(split.hands.length,2);
 move(bob,id,'double',split.revision);
 const midway=state(bob,id);
 assert.equal(midway.phase,'playing','the second split hand remains to be played');
 assert.equal(midway.hands[0].value.total,27,'losing draw is retained');
 setSetting(SOLO_DOUBLE_EVENT_KEY,'false');
 move(bob,id,'stand',midway.revision);
 const result=state(bob,id);
 assert.equal(result.phase,'settled');
 assert.equal(result.hands[0].outcome,'won');
 assert.equal(result.hands[0].payout,400);
 assert.equal(result.hands[1].outcome,'lost');
 assert.equal(result.wager,300);
 assert.equal(result.payout,400);
 assert.equal(balance(bob),10100);
});

test('every member receives the same active Solo Blackjack event, independent of admin identity',()=>{
 reset();setSetting(SOLO_DOUBLE_EVENT_KEY,'true');
 for(const user of [alice,bob]){
  const id=start(user,100,shoe(card('10'),card('10'),card('6'),card('8'),card('K')));
  move(user,id,'double',state(user,id).revision);
  assert.equal(state(user,id).payout,400);
  assert.equal(balance(user),10200);
 }
});

const app=createServer({testLogin:true,discord:{
 getGuild:async()=>({id:guild,owner_id:owner}),
 getGuildMember:async id=>({user:{id,username:'event_member'},roles:[],pending:false}),
 getRoles:async()=>[],
 getBotIdentity:async()=>({id:'100000000000000299'})
}});
await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+app.address().port;
after(async()=>{await new Promise(resolve=>app.close(resolve));db.close();rmSync(dir,{recursive:true,force:true});});
async function login(user){
 const response=await fetch(base+'/__test/login/'+user,{redirect:'manual'});
 const cookie=response.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie);
 const page=await (await fetch(base+'/arcade/blackjack',{headers:{cookie}})).text();
 const csrf=/name="_csrf" value="([^"]+)"/.exec(page)?.[1];
 assert.ok(csrf);
 return {cookie,csrf};
}
const post=(path,session,payload)=>fetch(base+path,{method:'POST',redirect:'manual',
 headers:{cookie:session.cookie,'Content-Type':'application/x-www-form-urlencoded'},
 body:new URLSearchParams({_csrf:session.csrf,...payload})});

test('admin setting is access controlled, audited, and visible to both Blackjack pages only through short notices',async()=>{
 reset();
 const admin=await login(owner),member=await login(alice);
 const denied=await post('/admin/settings/solo-blackjack-event',member,{enabled:'true'});
 assert.equal(denied.status,403,'ordinary members cannot enable promotions');
 const invalid=await post('/admin/settings/solo-blackjack-event',admin,{enabled:'sometimes'});
 assert.equal(invalid.status,400);
 const started=await post('/admin/settings/solo-blackjack-event',admin,{enabled:'true'});
 assert.equal(started.status,303);
 const publicState=await fetch(base+'/arcade/blackjack/event',{headers:{cookie:member.cookie}});
 assert.equal(publicState.status,200);
 assert.deepEqual(await publicState.json(),{enabled:true});
 assert.equal(soloDoubleEventEnabled(),true);
 const events=one("SELECT COUNT(*) AS count FROM owner_audit_log WHERE action='settings.solo_blackjack_double_event'");
 assert.ok(events?.count>=1,'setting changes are audited');
 const ended=await post('/admin/settings/solo-blackjack-event',admin,{enabled:'false'});
 assert.equal(ended.status,303);
 assert.equal(soloDoubleEventEnabled(),false);
});

test('only a temporary three-second notice is added; underlying Solo Blackjack markup remains in order',()=>{
 const js=readFileSync(new URL('../public/blackjack-event.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../public/blackjack-event.css',import.meta.url),'utf8');
 const browser=readFileSync(new URL('../src/views.js',import.meta.url),'utf8');
 assert.match(js,/setTimeout\(\(\)=>\{toast\.hidden=true;\},3000\)/);
 assert.match(js,/\/arcade\/blackjack\/event/);
 assert.match(js,/not this multiplayer table/);
 assert.match(css,/position:fixed/);
 assert.match(browser,/blackjack-event\.js/);
 assert.match(browser,/blackjack-event\.css/);
 const state={phase:'ready',roundId:null,revision:0,balance:10000,lastWager:50,
  lastWagerAt:0,activeRoundId:null,initialWager:0,wager:0,payout:0,profit:null,status:null,
  dealer:[],dealerValue:null,hands:[],activeIndex:null,actions:[],canBet:true,cinematic:false};
 const ctx={pathname:'/arcade/blackjack',csrf:'test',arcadeFragment:true};
 const output=soloBlackjackPage(ctx,{balance:10000},state,[]);
 assert.ok(output.indexOf('data-sbj-table')<output.indexOf('data-sbj-controls'));
 assert.match(output,/data-sbj-quick="1000"/);
 assert.doesNotMatch(output,/data-sbj-quick="10000"/);
});
