// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
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
  const arcadeHome=await fetch(base+'/arcade',{headers:{cookie}});
  assert.equal(arcadeHome.status,200);
  const arcadeHomeHtml=await arcadeHome.text();
  assert.match(arcadeHomeHtml,/class="arcade-points-stat"/);
  assert.match(arcadeHomeHtml,/class="arcade-get-more" href="\/points"/);
  assert.match(arcadeHomeHtml,/Get more from levels/);
  assert.match(html,/Play the House/i);
  assert.match(html,/Challenge to Coin Flip/);
  assert.doesNotMatch(html.split('<div class="arcade-root">')[1],/\bRTP\b|40%|101%|50%/i);
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

test('Fast Arcade returns a stable Mines grid and never inserts Saving into a tile',async()=>{
 const {createServer}=await import('../src/server.js');
 const calls={guild:0,member:0,roles:0};
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>{calls.guild++;return {id:guild,owner_id:owner};},
  getGuildMember:async id=>{calls.member++;return {user:{id,username:'fast-test'},roles:[],pending:false};},
  getRoles:async()=>{calls.roles++;return [];}
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const headers={'accept':'application/json','x-arcade-async':'1'};
 try{
  const login=await fetch(base+'/__test/login/'+alice,{redirect:'manual'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const page=await fetch(base+'/arcade/mines',{headers:{cookie}});
  assert.equal(page.status,200);
  const html=await page.text();
  const csrf=/name="_csrf" value="([^"]+)"/.exec(html)[1];
  const verified={...calls};
  assert.ok(verified.member>=1,'initial page verifies guild membership');
  const send=(url,fields,fast=true)=>fetch(base+url,{
   method:'POST',redirect:'manual',
   headers:{cookie,'content-type':'application/x-www-form-urlencoded',...(fast?headers:{})},
   body:new URLSearchParams({_csrf:csrf,...fields})
  });
  const start=await send('/arcade/mines/start',form(100,{bombs:'3'}));
  assert.equal(start.status,200);
  assert.match(start.headers.get('content-type'),/application\/json/);
  const started=await start.json();
  assert.equal(started.ok,true);
  assert.match(started.html,/class="arcade-mine-grid"/);
  assert.doesNotMatch(started.html,/action="\/arcade\/mines\/start"/,'the disabled wager form must not crowd an active grid');
  assert.doesNotMatch(started.html,/Saving/);
  assert.doesNotMatch(started.html,/<html|<head|<body/);
  assert.doesNotMatch(started.html,/💣/,'bomb locations stay hidden during active rounds');
  assert.equal((started.html.match(/class="arcade-mine-tile"/g)||[]).length,25);
  const roundId=Number(new URL(started.url,'http://localhost').searchParams.get('round'));
  const bombs=arcade.getRound(alice,roundId,'mines').details.bombs;
  const safe=Array.from({length:25},(_,i)=>i).find(i=>!bombs.includes(i));
  const opened=await send('/arcade/mines/'+roundId+'/reveal',{tile:String(safe)});
  assert.equal(opened.status,200);
  const rendered=await opened.json();
  assert.equal(rendered.ok,true);
  assert.match(rendered.html,/Safe picks <strong>1<\/strong>/);
  assert.match(rendered.html,/class="arcade-mine-tile revealed(?: |")/);
  assert.doesNotMatch(rendered.html,/Saving/);
  assert.equal(calls.member,verified.member,'rapid arcade actions should reuse a verified session');
  assert.equal(calls.guild,verified.guild,'guild lookup should not run per tile');
  assert.equal(calls.roles,verified.roles,'role lookup should not run per tile');
  const before=levelWallet(alice).balance;
  const failed=await send('/arcade/mines/'+roundId+'/collect',{_csrf:'bad'});
  assert.equal(failed.status,403);
  assert.equal((await failed.json()).ok,false);
  assert.equal(levelWallet(alice).balance,before);
  const claimed=await send('/arcade/mines/'+roundId+'/collect',{});
  assert.equal(claimed.status,200);
  const collected=await claimed.json();
  assert.match(collected.html,/LAST RESULT/);
  assert.equal(arcade.getRound(alice,roundId,'mines').status,'cashed_out');
  assert.equal(calls.member,verified.member);
  const native=await send('/arcade/mines/start',form(100,{bombs:'2'}),false);
  assert.equal(native.status,303,'ordinary forms must retain no-JS redirects');
 }finally{
  await new Promise(resolve=>server.close(resolve));
 }
});

test('Fast Arcade settles house, slots and Crash without a page navigation or leaking outcomes',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'fast-tester'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/__test/login/'+bob,{redirect:'manual'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const page=await (await fetch(base+'/arcade/coinflip',{headers:{cookie}})).text();
  const csrf=/name="_csrf" value="([^"]+)"/.exec(page)[1];
  const send=async(path,fields)=>{
   const response=await fetch(base+path,{
    method:'POST',redirect:'manual',
    headers:{cookie,accept:'application/json','x-arcade-async':'1','content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({_csrf:csrf,...fields})
   });
   assert.equal(response.status,200,path+' responds with in-page update');
   const payload=await response.json();
   assert.equal(payload.ok,true);
   assert.match(payload.html,/class="arcade-root"/);
   assert.ok(!payload.html.includes('<html'),'no entire page reload markup');
   return payload;
  };
  const house=await send('/arcade/coinflip/house',form(100,{face:'heads'}));
  assert.match(house.html,/LAST RESULT/);
  assert.match(house.url,/^\/arcade\/coinflip\?round=/);
  assert.doesNotMatch(house.html,/40%|50%|RTP/i);
  const slots=await send('/arcade/slots/spin',form(100));
  assert.match(slots.html,/class="arcade-slot-reels"/);
  assert.match(slots.html,/LAST RESULT/);
  const crash=await send('/arcade/crash/start',form(100,{auto_at:'1.50'}));
  assert.match(crash.html,/data-crash-active="1"/);
  assert.doesNotMatch(crash.html,/crashAt|autoTime|crashTime/,'crash position must remain secret until result');
  const status=await fetch(base+'/arcade/api/crash/fragment',{
   headers:{cookie,accept:'application/json','x-arcade-async':'1'},redirect:'manual'
  });
  assert.equal(status.status,200);
  assert.match((await status.json()).html,/data-crash-active="1"/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Arcade no longer triggers the global Saving form message or page reload on every tile',()=>{
 const globalFormJs=readFileSync(new URL('../public/upgrade.js',import.meta.url),'utf8');
 const arcadeJs=readFileSync(new URL('../public/arcade.js',import.meta.url),'utf8');
 const arcadeCss=readFileSync(new URL('../public/arcade.css',import.meta.url),'utf8');
 assert.match(globalFormJs,/form\.closest\('\.arcade-root'\)/);
 assert.match(arcadeJs,/root\.replaceWith\(updated\)/);
 assert.match(arcadeJs,/function queueTile\(/);
 assert.match(arcadeJs,/aria-busy/);
 assert.match(arcadeJs,/x-arcade-async/);
 assert.doesNotMatch(arcadeJs,/location\.assign|location\.reload|window\.location\.href=/);
 assert.match(arcadeCss,/\.arcade-mine-grid form\{/);
 assert.match(arcadeCss,/\.arcade-tile-pending/);
});

test('V1.21: Coin Flip keeps house mode in Arcade, with real SB and CAM faces and no PvP lobby',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'player'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/__test/login/'+alice,{redirect:'manual'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const res=await fetch(base+'/arcade/coinflip',{headers:{cookie}});
  assert.equal(res.status,200);
  const body=await res.text();
  assert.match(body,/SB vs CAM/);
  assert.match(body,/SB \(Heads\)/);
  assert.match(body,/CAM \(Tails\)/);
  assert.match(body,/class="arcade-coin-face arcade-coin-sb"/);
  assert.match(body,/class="arcade-coin-face arcade-coin-cam"/);
  assert.doesNotMatch(body,/<h2>⚔️ Challenge a member<\/h2>/);
  assert.doesNotMatch(body,/<h2>Open coin flips<\/h2>/);
  assert.doesNotMatch(body.split('<div class="arcade-root">')[1],/40%|50%|\bRTP\b/i);
  const slots=await (await fetch(base+'/arcade/slots',{headers:{cookie}})).text();
  assert.match(slots,/data-reel-index="0"/);
  assert.match(slots,/data-reel-index="2"/);
  assert.match(slots,/arcade-reel-window/);
  const script=await fetch(base+'/static/arcade.js');
  assert.equal(script.status,200);
  const js=await script.text();
  assert.match(js,/beginSlotSpin/);
  assert.match(js,/finishSlotSpin/);
  assert.match(js,/data-crash-rocket/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('V1.21: Private profile invites notify only targets; accept/decline settle once and retain history',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'member'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const auth=async(id,path)=>{
   const login=await fetch(base+'/__test/login/'+id,{redirect:'manual'});
   const cookie=login.headers.get('set-cookie').split(';')[0];
   const page=await (await fetch(base+path,{headers:{cookie}})).text();
   return {cookie,csrf:/name="_csrf" value="([^"]+)"/.exec(page)[1],page};
 };
 try{
  const a=await auth(alice,'/u/'+bob);
  const b=await auth(bob,'/u/'+alice);
  const outsider=await auth(charlie,'/arcade');
  assert.match(a.page,/data-open-coin-challenge/);
  assert.match(a.page,/data-profile-challenge-form/);
  assert.ok(a.page.includes('name="target_id" value="'+bob+'"'));
  assert.doesNotMatch(a.page.split('data-profile-challenge-dialog')[1].split('</dialog>')[0],/\bRTP\b|40%|50%/i);
  const sent=await fetch(base+'/arcade/coinflip/challenges',{
   method:'POST',redirect:'manual',headers:{cookie:a.cookie,accept:'application/json','x-arcade-challenge':'1'},
   body:new URLSearchParams({_csrf:a.csrf,...form(125,{target_id:bob,face:'tails'})})
  });
  assert.equal(sent.status,200);
  const created=await sent.json();assert.equal(created.ok,true);
  const id=created.challenge.id;
  assert.equal(created.challenge.status,'open');
  assert.equal(created.challenge.result,null,'outcome hidden before acceptance');
  const inbox=await fetch(base+'/arcade/api/challenges/incoming',{headers:{cookie:b.cookie}});
  assert.equal(inbox.status,200);
  const incoming=(await inbox.json()).challenges;
  assert.ok(incoming.some(c=>c.id===id&&c.creator_id===alice&&c.target_id===bob));
  const others=(await (await fetch(base+'/arcade/api/challenges/incoming',{headers:{cookie:outsider.cookie}})).json()).challenges;
  assert.equal(others.some(c=>c.id===id),false,'challenges are private');
  assert.equal((await fetch(base+'/arcade/api/challenges/'+id,{headers:{cookie:outsider.cookie}})).status,404);
  const before=levelWallet(bob).balance;
  const joined=await fetch(base+'/arcade/coinflip/challenges/'+id+'/join',{
   method:'POST',redirect:'manual',headers:{cookie:b.cookie,accept:'application/json','x-arcade-challenge':'1'},
   body:new URLSearchParams({_csrf:b.csrf})
  });
  assert.equal(joined.status,200);
  const result=(await joined.json()).challenge;
  assert.equal(result.status,'complete');
  assert.ok(['heads','tails'].includes(result.result));
  assert.ok([alice,bob].includes(result.winner_id));
  assert.equal(arcade.challengeForUser(alice,id).status,'complete');
  assert.ok(arcade.challengeHistory(alice).some(c=>c.id===id));
  const again=await fetch(base+'/arcade/coinflip/challenges/'+id+'/join',{
   method:'POST',redirect:'manual',headers:{cookie:b.cookie,accept:'application/json','x-arcade-challenge':'1'},
   body:new URLSearchParams({_csrf:b.csrf})
  });
  assert.equal(again.status,200);
  assert.equal(levelWallet(bob).balance,before-125+(result.winner_id===bob?250:0));
  const selfProfile=await (await fetch(base+'/u/'+alice,{headers:{cookie:a.cookie}})).text();
  assert.match(selfProfile,/Recent Coin Flips/);
  const start=levelWallet(alice).balance;
  const next=arcade.createChallenge(alice,form(150,{face:'heads',target_id:bob}));
  const pendingProfile=await (await fetch(base+'/u/'+alice,{headers:{cookie:a.cookie}})).text();
  assert.match(pendingProfile,/Pending Coin Flips/);
  assert.match(pendingProfile,/Cancel &amp; Refund/);
  const declined=await fetch(base+'/arcade/coinflip/challenges/'+next+'/decline',{
   method:'POST',redirect:'manual',headers:{cookie:b.cookie,accept:'application/json','x-arcade-challenge':'1'},
   body:new URLSearchParams({_csrf:b.csrf})
  });
  assert.equal(declined.status,200);
  assert.equal((await declined.json()).challenge.status,'declined');
  assert.equal(levelWallet(alice).balance,start);
  arcade.declineChallenge(bob,next);assert.equal(levelWallet(alice).balance,start);
  const js=(await (await fetch(base+'/static/arcade-challenges.js')).text());
  assert.match(js,/sb:arcade-challenge/);
  assert.match(js,/className='arcade-challenge-overlay'/);
  assert.match(js,/data-pvp-accept/);
  assert.match(js,/data-pvp-decline/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('V1.21: Crash rocket result screen persists payout until Play Again',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'member'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/__test/login/'+charlie,{redirect:'manual'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const id=arcade.startCrash(charlie,form(100,{auto_at:'1.50'}));
  const round=arcade.getRound(charlie,id,'crash');
  const modified={...round.details,startedAt:Date.now()-10000,crashAt:500,autoAt:150};
  run('UPDATE arcade_rounds SET details_json=? WHERE id=?',JSON.stringify(modified),id);
  const page=await fetch(base+'/arcade/crash',{headers:{cookie}});
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/Successfully Cashed Out!/);
  assert.match(html,/1\.50×/);
  assert.match(html,/POINTS PROFIT/);
  assert.match(html,/\+50 points/);
  assert.match(html,/data-crash-rocket/);
  assert.match(html,/data-crash-chart-line/);
  assert.match(html,/href="\/arcade\/crash\?again=1"/);
  assert.doesNotMatch(html,/action="\/arcade\/crash\/start"/,'no new game form before Play Again');
  const replay=(await (await fetch(base+'/arcade/crash?again=1',{headers:{cookie}})).text());
  assert.match(replay,/action="\/arcade\/crash\/start"/);
  assert.match(replay,/Ready to launch/);
  assert.match(replay,/data-crash-replay="1"/);
  assert.doesNotMatch(replay,/Successfully Cashed Out!/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('V1.21: Global form handlers cannot inject Saving messages into Mines or profile invites',()=>{
 const global=readFileSync(new URL('../public/upgrade.js',import.meta.url),'utf8');
 const arcadeJs=readFileSync(new URL('../public/arcade.js',import.meta.url),'utf8');
 const arcadeCss=readFileSync(new URL('../public/arcade.css',import.meta.url),'utf8');
 const pvpCss=readFileSync(new URL('../public/arcade-challenges.css',import.meta.url),'utf8');
 assert.match(global,/form\.closest\('\.arcade-root'\)/);
 assert.match(global,/form\.matches\('\[data-profile-challenge-form\]'\)/);
 assert.match(arcadeJs,/root\.replaceWith\(updated\)/);
 assert.match(arcadeCss,/grid-template-columns:repeat\(5,1fr\)/);
 assert.match(pvpCss,/position:fixed/);
 assert.match(pvpCss,/height:100dvh/);
});
