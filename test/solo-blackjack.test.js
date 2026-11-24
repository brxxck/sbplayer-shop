// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'sb-solo-blackjack-'));
const guild='100000000000000001';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(dir,'solo-blackjack.sqlite'),DISCORD_GUILD_ID:guild});
const {db,one,all,run}=await import('../src/db.js');
await import('../src/level-points.js');
const {walletChange,recentRounds,arcadeSummary,getRound}=await import('../src/arcade.js');
const {soloBlackjackSnapshot,soloBlackjackStart,soloBlackjackAction}=await import('../src/solo-blackjack.js');
const {blackjackValue}=await import('../src/blackjack-rules.js');
const alice='100000000000000121',bob='100000000000000122',poor='100000000000000123';
for(const user of [alice,bob,poor]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',user,user,'Solo Test '+user,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,user,user===poor?100:10000);
}
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const card=(rank,suit='S')=>({rank,suit});
const order=(...cards)=>[...cards].reverse();
const start=(user,wager,shoe,key=randomUUID())=>
 soloBlackjackStart(user,{wager:String(wager),request_id:key},shoe);
const move=(user,round,action,revision,key=randomUUID())=>
 soloBlackjackAction(user,{round_id:String(round),action,revision:String(revision),request_id:key});
const state=(user,id=null)=>soloBlackjackSnapshot(user,id);
const balance=user=>one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,user).balance;
function reset(){
 db.exec('DELETE FROM solo_blackjack_actions;DELETE FROM solo_blackjack_state;DELETE FROM arcade_rounds;'+
  'DELETE FROM arcade_transfers;UPDATE level_point_wallets SET balance=10000;');
 run('UPDATE level_point_wallets SET balance=100 WHERE guild_id=? AND user_id=?',guild,poor);
}
const stored=id=>JSON.parse(one('SELECT state_json FROM solo_blackjack_state WHERE round_id=?',id).state_json);

test('Fresh hand debits exactly one wager, hides dealer hole and shoe in ALL public state',()=>{
 reset();const key=randomUUID();
 const initial=balance(alice);
 const id=start(alice,125,order(card('10'),card('9'),card('6'),card('8'),card('2')),key);
 assert.equal(balance(alice),initial-125);
 const current=state(alice);
 assert.equal(current.phase,'playing');
 assert.equal(current.roundId,id);
 assert.equal(current.wager,125);
 assert.equal(current.initialWager,125);
 assert.equal(current.dealer.length,2);
 assert.deepEqual(current.dealer[1],{back:true});
 assert.equal(current.dealerValue,null);
 assert.deepEqual(current.hands[0].cards,[card('10'),card('6')]);
 assert.deepEqual(current.actions,['hit','stand','double']);
 assert.equal(Object.hasOwn(current,'shoe'),false);
 assert.equal(JSON.stringify(current).includes('"shoe"'),false);
 const publicRow=getRound(alice,id,'blackjack_solo');
 assert.equal(Object.hasOwn(publicRow.details,'shoe'),false);
 assert.deepEqual(publicRow.details.dealer[1],{back:true});
 assert.equal(stored(id).dealer[1].rank,'8');
 assert.ok(stored(id).shoe.length>0);
 assert.equal(start(alice,125,order(card('A'),card('10'),card('K'),card('9')),key),id);
 assert.equal(balance(alice),initial-125);
 assert.throws(()=>start(alice,100,order(card('A'),card('10'),card('K'),card('9')),key),
  error=>error.status===409);
 assert.throws(()=>start(alice,100,order(card('A'),card('10'),card('K'),card('9'))),
  error=>error.status===409,'only one active solo Blackjack hand per player');
});
test('Natural Blackjack immediately pays 3:2, rounded down to a whole point',()=>{
 reset();const initial=balance(alice);
 const id=start(alice,101,order(card('A'),card('10'),card('K'),card('7')));
 const finished=state(alice,id);
 assert.equal(finished.phase,'settled');
 assert.equal(finished.status,'won');
 assert.equal(finished.payout,252);
 assert.equal(finished.profit,151);
 assert.equal(finished.hands[0].outcome,'blackjack');
 assert.equal(balance(alice),initial-101+252);
 assert.equal(stored(id).shoe.length,0,'unused secret shoe is removed after payout');
 assert.equal(arcadeSummary(alice).wins,1);
 assert.equal(recentRounds(alice,'blackjack_solo',1)[0].id,id);
});
test('Natural dealer defeats ordinary 21, while two natural Blackjacks push',()=>{
 reset();
 const first=start(alice,125,order(card('10'),card('A'),card('7'),card('K')));
 assert.equal(state(alice,first).status,'lost');
 assert.equal(balance(alice),9875);
 const second=start(alice,101,order(card('A'),card('A'),card('K'),card('Q')));
 const both=state(alice,second);
 assert.equal(both.phase,'settled');
 assert.equal(both.status,'push');
 assert.equal(both.payout,101);
 assert.equal(both.profit,0);
 assert.equal(balance(alice),9875);
});
test('Hit to 21 automatically stands; a bust loses without dealer drawing',()=>{
 reset();
 const id=start(alice,100,order(card('10'),card('9'),card('9'),card('8'),card('2')));
 const turn=state(alice,id);
 assert.equal(turn.hands[0].value.total,19);
 move(alice,id,'hit',turn.revision);
 const outcome=state(alice,id);
 assert.equal(outcome.phase,'settled');
 assert.equal(outcome.hands[0].value.total,21);
 assert.equal(outcome.payout,200);
 assert.equal(outcome.status,'won');
 const second=start(alice,100,order(card('10'),card('9'),card('9'),card('8'),card('5')));
 move(alice,second,'hit',state(alice,second).revision);
 const lost=state(alice,second);
 assert.equal(lost.phase,'settled');
 assert.equal(lost.hands[0].outcome,'bust');
 assert.equal(lost.hands[0].value.total,24);
 assert.equal(lost.payout,0);
 assert.deepEqual(lost.dealer,[card('9'),card('8')]);
});
test('Stand plays dealer to 17 and pays only once, even on a duplicate action request',()=>{
 reset();
 const id=start(alice,100,order(card('10'),card('9'),card('7'),card('7'),card('10')));
 const before=state(alice,id),key=randomUUID();
 move(alice,id,'stand',before.revision,key);
 const finished=state(alice,id);
 assert.equal(finished.phase,'settled');
 assert.equal(finished.dealerValue.total,26);
 assert.equal(finished.hands[0].outcome,'won');
 assert.equal(finished.profit,100);
 assert.equal(balance(alice),10100);
 move(alice,id,'stand',before.revision,key);
 assert.equal(balance(alice),10100);
 assert.equal(one("SELECT COUNT(*) AS n FROM arcade_transfers WHERE reason='blackjack.solo.payout'").n,1);
 assert.equal(one('SELECT COUNT(*) AS n FROM solo_blackjack_actions WHERE request_key=?',key).n,1);
 assert.throws(()=>move(alice,id,'hit',before.revision,key),e=>e.status===409);
 assert.throws(()=>move(alice,id,'stand',before.revision),e=>e.status===409);
});
test('Double Down reserves a second equal wager and receives exactly one card',()=>{
 reset();
 const id=start(alice,125,order(card('10'),card('9'),card('6'),card('8'),card('5')));
 const before=state(alice,id),key=randomUUID();
 assert.ok(before.actions.includes('double'));
 move(alice,id,'double',before.revision,key);
 const ended=state(alice,id);
 assert.equal(ended.phase,'settled');
 assert.equal(ended.hands[0].cards.length,3);
 assert.equal(ended.hands[0].value.total,21);
 assert.equal(ended.hands[0].wager,250);
 assert.equal(ended.hands[0].doubled,true);
 assert.equal(ended.wager,250);
 assert.equal(ended.payout,500);
 assert.equal(ended.profit,250);
 assert.equal(balance(alice),10250);
 move(alice,id,'double',before.revision,key);
 assert.equal(balance(alice),10250);
 assert.equal(one("SELECT COUNT(*) AS n FROM arcade_transfers WHERE reason='blackjack.solo.double'").n,1);
 assert.equal(one("SELECT COUNT(*) AS n FROM arcade_transfers WHERE reason='blackjack.solo.payout'").n,1);
 assert.equal(getRound(alice,id,'blackjack_solo').wager,250);
});
test('Split matching ranks creates two separately playable hands without natural 3:2',()=>{
 reset();
 const id=start(alice,100,order(card('8'),card('10'),card('8','H'),card('7'),card('3'),card('4'),card('10')));
 let before=state(alice,id);
 assert.ok(before.actions.includes('split'));
 move(alice,id,'split',before.revision);
 const split=state(alice,id);
 assert.equal(split.phase,'playing');
 assert.equal(split.hands.length,2);
 assert.equal(split.hands[0].cards.length,2);
 assert.equal(split.hands[1].cards.length,2);
 assert.equal(split.wager,200);
 assert.equal(balance(alice),9800);
 assert.equal(split.activeIndex,0);
 assert.deepEqual(split.hands[0].cards,[card('8'),card('3')]);
 assert.deepEqual(split.hands[1].cards,[card('8','H'),card('4')]);
 // Hit makes the first hand 21; stand the second at 12.
 move(alice,id,'hit',split.revision);
 const second=state(alice,id);
 assert.equal(second.activeIndex,1);
 assert.equal(second.hands[0].value.total,21);
 move(alice,id,'stand',second.revision);
 const finished=state(alice,id);
 assert.equal(finished.phase,'settled');
 assert.equal(finished.hands[0].outcome,'won');
 assert.equal(finished.hands[1].outcome,'lost');
 assert.equal(finished.payout,200);
 assert.equal(finished.wager,200);
 assert.equal(finished.profit,0);
 assert.equal(balance(alice),10000);
 assert.equal(finished.hands[0].split,true);
});
test('Splitting aces deals one extra card per ace and settles without extra actions',()=>{
 reset();
 const id=start(alice,100,order(card('A'),card('10'),card('A','H'),card('7'),card('K'),card('9')));
 move(alice,id,'split',state(alice,id).revision);
 const ended=state(alice,id);
 assert.equal(ended.phase,'settled');
 assert.equal(ended.wager,200);
 assert.equal(ended.hands.length,2);
 assert.equal(ended.hands[0].value.total,21);
 assert.equal(ended.hands[0].outcome,'won','Split ace + king is NOT natural Blackjack');
 assert.equal(ended.hands[1].value.total,20);
 assert.equal(ended.hands[1].outcome,'won');
 assert.equal(ended.payout,400);
 assert.equal(balance(alice),10200);
});
test('Insufficient funds disable double/split, reject overspending and wrong-user actions',()=>{
 reset();
 const id=start(poor,100,order(card('8'),card('9'),card('8'),card('7'),card('3')));
 const turn=state(poor,id);
 assert.deepEqual(turn.actions,['hit','stand']);
 assert.equal(balance(poor),0);
 assert.throws(()=>move(poor,id,'double',turn.revision),e=>e.status===409);
 assert.throws(()=>move(poor,id,'split',turn.revision),e=>e.status===409);
 assert.throws(()=>state(alice,id),e=>e.status===404);
 assert.throws(()=>move(alice,id,'stand',turn.revision),e=>e.status===404);
 assert.equal(balance(poor),0);
 move(poor,id,'stand',turn.revision);
 assert.equal(state(poor,id).phase,'settled');
 assert.throws(()=>start(poor,100,order(card('A'),card('9'),card('K'),card('8'))),
  e=>e.status===409,'a depleted wallet cannot wager 100 points');
});
test('Stale revisions and request replay cannot double charge or draw in two tabs',()=>{
 reset();
 const id=start(alice,100,order(card('10'),card('9'),card('5'),card('8'),card('2'),card('5')));
 const first=state(alice,id),key=randomUUID();
 move(alice,id,'hit',first.revision,key);
 const later=state(alice,id);
 assert.equal(later.phase,'playing');
 assert.equal(later.revision,first.revision+1);
 assert.equal(later.hands[0].cards.length,3);
 assert.throws(()=>move(alice,id,'hit',first.revision),e=>e.status===409);
 assert.throws(()=>move(alice,id,'stand',first.revision),e=>e.status===409);
 assert.throws(()=>move(bob,id,'hit',first.revision,key),e=>e.status===409);
 assert.equal(state(alice,id).hands[0].cards.length,3);
 assert.equal(balance(alice),9900);
 move(alice,id,'stand',later.revision);
 assert.equal(state(alice,id).phase,'settled');
 assert.equal(one("SELECT COUNT(*) AS n FROM arcade_rounds WHERE game='blackjack_solo'").n,1);
});
test('Invalid wagers, action names and UUID values are rejected without any point changes',()=>{
 reset();
 const before=balance(alice);
 for(const wager of ['0','9007199254740992','100.5','2e2','-1','NaN',''])
  assert.throws(()=>soloBlackjackStart(alice,{wager,request_id:randomUUID()}),
   e=>e.status===400);
 assert.throws(()=>soloBlackjackStart(alice,{wager:'100',request_id:'invalid'}),e=>e.status===400);
 assert.equal(balance(alice),before);
 const id=start(alice,100,order(card('10'),card('9'),card('7'),card('8'),card('10')));
 assert.throws(()=>move(alice,id,'insurance',state(alice,id).revision),e=>e.status===400);
 assert.throws(()=>soloBlackjackAction(alice,{round_id:String(id),action:'hit',revision:'abc',
  request_id:randomUUID()}),e=>e.status===400);
 assert.equal(balance(alice),before-100);
});
test('Existing Online Blackjack uses a separate game and private solo history never leaks',()=>{
 reset();
 const id=start(alice,100,order(card('10'),card('9'),card('7'),card('8'),card('4')));
 const only=recentRounds(alice,'blackjack_solo',5);
 assert.equal(only.length,1);
 assert.equal(only[0].game,'blackjack_solo');
 assert.equal(only[0].details.dealer[1].back,true);
 assert.throws(()=>getRound(bob,id,'blackjack_solo'),e=>e.status===404);
 const generic=arcadeSummary(alice);
 assert.equal(generic.played,0,'active rounds are excluded from completed-game statistics');
 move(alice,id,'hit',state(alice,id).revision);
 assert.equal(arcadeSummary(alice).played,1);
 assert.equal(recentRounds(alice,'blackjack_solo',1)[0].id,id);
});

test('A finished historical hand never permits a second start while another hand is active',()=>{
 reset();
 const first=start(alice,100,order(card('A'),card('10'),card('K'),card('7')));
 assert.equal(state(alice,first).phase,'settled');
 const second=start(alice,150,order(card('10'),card('9'),card('6'),card('8')));
 const historical=state(alice,first);
 assert.equal(historical.activeRoundId,second);
 assert.equal(historical.canBet,false);
 assert.equal(state(alice).roundId,second,'the default view always resumes the active hand');
 assert.throws(()=>start(alice,100,order(card('A'),card('10'),card('K'),card('7'))),
  e=>e.status===409);
});
test('Card-deck failure rolls back the attempted move, action record and round revision',()=>{
 reset();
 const id=start(alice,100,order(card('10'),card('9'),card('6'),card('8')));
 const before=state(alice,id),key=randomUUID(),money=balance(alice);
 assert.throws(()=>move(alice,id,'hit',before.revision,key),/ran out of cards/);
 assert.equal(state(alice,id).revision,before.revision);
 assert.deepEqual(state(alice,id).hands[0].cards,before.hands[0].cards);
 assert.equal(balance(alice),money);
 assert.equal(one('SELECT COUNT(*) AS n FROM solo_blackjack_actions WHERE request_key=?',key).n,0);
});
test('Big natural wins qualify for the shared cinematic with server-settled timestamps',()=>{
 reset();
 const id=start(alice,1000,order(card('A'),card('10'),card('K'),card('7')));
 const final=state(alice,id);
 assert.equal(final.phase,'settled');
 assert.equal(final.profit,1500);
 assert.equal(final.cinematic,true);
 assert.ok(final.settledAt>0);
 assert.equal(balance(alice),11500);
});
