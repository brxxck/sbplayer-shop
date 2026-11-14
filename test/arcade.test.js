// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sb-arcade-'));
const guild='100000000000000001',owner='100000000000000002',alice='100000000000000003',bob='100000000000000004',charlie='100000000000000005';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'arcade.sqlite'),DISCORD_GUILD_ID:guild});
const {db,run,one}=await import('../src/db.js');
const {syncLevelSnapshot,claimLevelPoints,levelWallet,DEFAULT_LEVEL_BOT}=await import('../src/level-points.js');
const arcade=await import('../src/arcade.js');
for(const id of [owner,alice,bob,charlie]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',id,id,'Arcade '+id,Date.now());
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,0)',guild,id,10000);
}
const form=(wager=100,more={})=>({wager:String(wager),request_id:randomUUID(),...more});
const total=()=>[owner,alice,bob,charlie].reduce((sum,id)=>sum+levelWallet(id).balance,0);
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

test('house flip wins double wager or loses it, and never mutates balance twice',()=>{
 const starting=levelWallet(alice).balance;
 const fields=form(100,{face:'heads'});
 const id=arcade.houseCoin(alice,fields),round=arcade.getRound(alice,id,'coinflip');
 assert.ok(['won','lost'].includes(round.status));
 assert.ok(['heads','tails'].includes(round.details.landed));
 assert.equal(round.payout,round.status==='won'?200:0);
 assert.equal(levelWallet(alice).balance,starting-100+round.payout);
 assert.equal(arcade.houseCoin(alice,fields),id);
 assert.equal(levelWallet(alice).balance,starting-100+round.payout);
 assert.throws(()=>arcade.getRound(bob,id,'coinflip'),e=>e.status===404);
 assert.throws(()=>arcade.houseCoin(alice,form(100,{face:'edge'})),e=>e.status===400);
});

test('slots spin uses saved reels with only one debit and one payout',()=>{
 const starting=levelWallet(alice).balance,fields=form(125);
 const id=arcade.spinSlots(alice,fields),round=arcade.getRound(alice,id,'slots');
 assert.equal(round.details.reels.length,3);
 assert.ok(round.details.reels.every(s=>['Cherry','Lemon','Bell','Diamond','Seven'].includes(s)));
 assert.equal(levelWallet(alice).balance,starting-125+round.payout);
 assert.equal(arcade.spinSlots(alice,fields),id);
 assert.equal(levelWallet(alice).balance,starting-125+round.payout);
});

test('Mines supports saved board, safe reveal, cashout and duplicate payout protection',()=>{
 const initial=levelWallet(alice).balance;
 const id=arcade.createMines(alice,form(100,{bombs:'4'}));
 const round=arcade.getRound(alice,id,'mines');
 assert.equal(round.status,'active');
 assert.equal(round.details.bombs.length,4);
 assert.equal(levelWallet(alice).balance,initial-100);
 assert.throws(()=>arcade.cashMines(alice,id),e=>e.status===409);
 const safe=Array.from({length:25},(_,i)=>i).find(i=>!round.details.bombs.includes(i));
 arcade.revealMines(alice,id,safe);
 const before=levelWallet(alice).balance;
 arcade.cashMines(alice,id);
 const terminal=arcade.getRound(alice,id,'mines');
 assert.equal(terminal.status,'cashed_out');
 assert.ok(terminal.payout>=100);
 assert.equal(levelWallet(alice).balance,before+terminal.payout);
 arcade.cashMines(alice,id);
 arcade.revealMines(alice,id,safe);
 assert.equal(levelWallet(alice).balance,before+terminal.payout);
 assert.throws(()=>arcade.createMines(bob,form(2,{bombs:'3'})),e=>e.status===400);
});

test('Mines immediately loses wager when bomb uncovered',()=>{
 const initial=levelWallet(bob).balance;
 const id=arcade.createMines(bob,form(100,{bombs:'1'}));
 const bomb=arcade.getRound(bob,id,'mines').details.bombs[0];
 arcade.revealMines(bob,id,bomb);
 const r=arcade.getRound(bob,id,'mines');
 assert.equal(r.status,'lost');assert.equal(r.payout,0);
 assert.equal(levelWallet(bob).balance,initial-100);
});

test('Crash starts with a hidden future crash point, settles auto-collect once',()=>{
 const start=levelWallet(alice).balance,fields=form(100,{auto_at:'1.50'});
 const id=arcade.startCrash(alice,fields);
 assert.equal(arcade.startCrash(alice,fields),id);
 assert.throws(()=>arcade.startCrash(alice,form(100)),e=>e.status===409);
 const round=arcade.getRound(alice,id,'crash');
 assert.equal(round.status,'active');
 const modified={...round.details,startedAt:Date.now()-10000,crashAt:600,autoAt:150};
 run('UPDATE arcade_rounds SET details_json=? WHERE id=?',JSON.stringify(modified),id);
 const visible=arcade.crashStatus(alice);
 assert.equal(visible.round.status,'cashed_out');
 assert.equal(visible.round.crashAt,600);
 assert.equal(visible.round.payout,150);
 assert.equal(levelWallet(alice).balance,start+50);
 arcade.cashCrash(alice,id);
 assert.equal(levelWallet(alice).balance,start+50);
});

test('Crash rejects late manual cashout, duplicate start and unbounded multipliers',()=>{
 const before=levelWallet(bob).balance;
 const id=arcade.startCrash(bob,form(100));
 const details={...arcade.getRound(bob,id,'crash').details,startedAt:Date.now()-12000,crashAt:100};
 run('UPDATE arcade_rounds SET details_json=? WHERE id=?',JSON.stringify(details),id);
 arcade.cashCrash(bob,id);
 assert.equal(arcade.getRound(bob,id,'crash').status,'lost');
 assert.equal(levelWallet(bob).balance,before-100);
 assert.throws(()=>arcade.startCrash(bob,form(100,{auto_at:'99999'})),e=>e.status===400);
});

test('PvP equal wagers pay entire pot to winner; joining and cancellation cannot duplicate transfers',()=>{
 const start=total();
 const challenge=arcade.createChallenge(alice,form(100,{face:'heads'}));
 assert.equal(levelWallet(alice).balance,one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',guild,alice).balance);
 assert.equal(arcade.openChallenges(bob).some(c=>c.id===challenge),true);
 assert.throws(()=>arcade.joinChallenge(alice,challenge),e=>e.status===409);
 arcade.joinChallenge(bob,challenge);
 assert.equal(arcade.joinChallenge(bob,challenge),challenge);
 const c=one('SELECT * FROM arcade_challenges WHERE id=?',challenge);
 assert.equal(c.status,'complete');assert.ok([alice,bob].includes(c.winner_id));
 assert.equal(total(),start);
 const rounds=arcade.recentRounds(alice,'coinflip_pvp');
 assert.equal(rounds[0].payout,c.winner_id===alice?200:0);
 assert.throws(()=>arcade.cancelChallenge(alice,challenge),e=>e.status===409);
});

test('private PvP challenge only allows invited opponent; expires refund wagers',()=>{
 const before=levelWallet(alice).balance;
 const challenge=arcade.createChallenge(alice,form(150,{face:'tails',target_id:bob}));
 assert.equal(arcade.openChallenges(charlie).some(c=>c.id===challenge),false);
 assert.throws(()=>arcade.joinChallenge(charlie,challenge),e=>e.status===403);
 assert.equal(levelWallet(alice).balance,before-150);
 run('UPDATE arcade_challenges SET expires_at=? WHERE id=?',Date.now()-10,challenge);
 arcade.sweepArcade();
 assert.equal(levelWallet(alice).balance,before);
 arcade.sweepArcade();assert.equal(levelWallet(alice).balance,before);
 assert.equal(one('SELECT status FROM arcade_challenges WHERE id=?',challenge).status,'expired');
});

test('point claims remain compatible with wagers and cumulative wallet balance',()=>{
 const before=levelWallet(charlie).balance;
 syncLevelSnapshot({bot_id:DEFAULT_LEVEL_BOT,guild_id:guild,user_id:charlie,level:'5',xp:'10'});
 assert.equal(claimLevelPoints(charlie),500);
 assert.equal(levelWallet(charlie).balance,before+500);
 assert.equal(levelWallet(charlie).claimedLevel,5);
 assert.equal(levelWallet(charlie).claimable,0);
 assert.throws(()=>arcade.houseCoin(charlie,form(2000,{face:'tails'})),e=>e.status===400);
 assert.throws(()=>arcade.houseCoin(charlie,form(0,{face:'tails'})),e=>e.status===400);
 const poor='100000000000000006';run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',poor,'poor','Poor',Date.now());
 assert.throws(()=>arcade.houseCoin(poor,form(100,{face:'heads'})),e=>e.status===409);
 assert.equal(levelWallet(poor).balance,0);
});

test('HTTP arcade routes require verified login and CSRF; pages omit numeric odds',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'tester'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const publicPage=await fetch(base+'/arcade',{redirect:'manual'});
  assert.equal(publicPage.status,303);
  const login=await fetch(base+'/__test/login/'+charlie,{redirect:'manual'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const page=await fetch(base+'/arcade/coinflip',{headers:{cookie}});
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/Play the house/);
  assert.match(html,/Challenge a member/);
  assert.doesNotMatch(html,/\bRTP\b|40%|101%|50%/i);
  const csrf=/name="_csrf" value="([^"]+)"/.exec(html)[1];
  const send=(body)=>fetch(base+'/arcade/coinflip/house',{method:'POST',redirect:'manual',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
  assert.equal((await send({_csrf:'wrong',...form(100,{face:'heads'})})).status,403);
  const result=await send({_csrf:csrf,...form(100,{face:'heads'})});
  assert.equal(result.status,303);
  assert.match(result.headers.get('location'),/^\/arcade\/coinflip\?round=\d+$/);
  const assets=await fetch(base+'/static/arcade.css');
  assert.equal(assets.status,200);
  const minePage=await fetch(base+'/arcade/mines',{headers:{cookie}});
  assert.equal(minePage.status,200);
  assert.equal((await fetch(base+'/arcade/crash',{headers:{cookie}})).status,200);
  assert.equal((await fetch(base+'/arcade/slots',{headers:{cookie}})).status,200);
  assert.equal((await fetch(base+'/arcade/history',{headers:{cookie}})).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
