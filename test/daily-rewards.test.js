// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';

const temp=mkdtempSync(join(tmpdir(),'sb-daily-rewards-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000003',bob='100000000000000004',other='100000000000000005',webMember='100000000000000011';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'data.sqlite'),DISCORD_GUILD_ID:guild});
const {db,one,all,run}=await import('../src/db.js');
const {levelWallet}=await import('../src/level-points.js');
const rewards=await import('../src/daily-rewards.js');
const arcade=await import('../src/arcade.js');
for(const id of [owner,alice,bob,other,webMember]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  id,'member-'+id.slice(-3),'Member '+id.slice(-3),Date.now());
}
for(const id of [alice,bob,other,webMember]){
 run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,?)',guild,id,10000,4);
}
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});
function paidRounds(user,game,count,at=Date.now()){
 for(let i=0;i<count;i++)run(
  'INSERT INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
  guild,user,game,10,0,'lost','{}',randomUUID(),at,at
 );
}
test('Exactly three unique daily games rotate targets (15-20) and prizes (100-500), plus fourth free-spin reward',()=>{
 const at=Date.now();
 assert.equal(rewards.DAILY_CHALLENGE_COUNT,3);
 assert.equal(rewards.DAILY_FREE_SPINS,50);
 assert.equal(rewards.DAILY_FREE_SPIN_STAKE,50);
 const today=rewards.dailyRewardsStatus(alice,at);
 const tomorrow=rewards.dailyRewardsStatus(alice,at+86400000);
 assert.equal(today.challenges.length,3);
 assert.equal(new Set(today.challenges.map(c=>c.game)).size,3);
 assert.equal(today.completed,0);
 assert.equal(today.claimed,0);
 assert.equal(today.freeSpins.ready,true,'daily 50 free spins are NOT gated behind the game tasks');
 assert.equal(today.freeSpins.available,0);
 assert.ok(today.total>=300&&today.total<=1500);
 for(const task of today.challenges){
  assert.ok(task.target>=15&&task.target<=20);
  assert.ok(task.reward>=100&&task.reward<=500);
  assert.equal(task.progress,0);
 }
 assert.notDeepEqual(today.challenges.map(c=>[c.game,c.target,c.reward]),
  tomorrow.challenges.map(c=>[c.game,c.target,c.reward]));
 assert.deepEqual(rewards.dailyChallengeSchedule(at),rewards.dailyChallengeSchedule(at));
 assert.equal(today.resetAt-today.start,86400000);
});
test('50 free 50-point Slots spins claim independently once daily and each spin cannot charge the wallet',()=>{
 const initial=levelWallet(alice).balance;
 let daily=rewards.dailyRewardsStatus(alice);
 assert.equal(daily.challenges.every(c=>!c.claimed),true);
 const claim=rewards.claimDailyFreeSpins(alice);
 assert.deepEqual([claim.quantity,claim.stake,claim.remaining],[50,50,50]);
 assert.equal(levelWallet(alice).balance,initial);
 assert.equal(rewards.dailyRewardsStatus(alice).completed,1,'free spins are the fourth daily reward');
 assert.throws(()=>rewards.claimDailyFreeSpins(alice),e=>e.status===409);
 const req={request_id:randomUUID()},first= rewards.spinDailyFreeSlots(alice,req);
 const round=arcade.getRound(alice,first,'slots');
 assert.equal(round.game,'slots');
 assert.equal(round.wager,0);
 assert.equal(round.details.isRewardSpin,true);
 assert.equal(round.details.unitStake,50);
 assert.ok(round.payout>=0);
 assert.equal(round.payout,Math.floor(50*round.details.multiplier+1e-8));
 assert.equal(rewards.freeSpinCredits(alice),49);
 assert.equal(levelWallet(alice).balance,initial+round.payout);
 assert.equal(rewards.spinDailyFreeSlots(alice,req),first,'same request key cannot repeat the spin');
 assert.equal(rewards.freeSpinCredits(alice),49);
 assert.equal(levelWallet(alice).balance,initial+round.payout);
 assert.ok(!rewards.dailyRewardsStatus(alice).challenges.some(c=>c.progress>0),'free spins never complete game challenges');
 assert.equal(one("SELECT COUNT(*) n FROM arcade_transfers WHERE user_id=? AND reason='slots.free.reward'",alice).n,
  round.payout?1:0);
 const tomorrow=Date.now()+86400000;
 const claim2=rewards.claimDailyFreeSpins(alice,tomorrow);
 assert.equal(claim2.remaining,99,'unspent daily free spins persist across resets');
 assert.equal(rewards.dailyRewardsStatus(alice,tomorrow).freeSpins.claimedToday,true);
});
test('Daily paid game rounds award their distinct scheduled points only once',()=>{
 const today=rewards.dailyRewardsStatus(bob);
 for(const c of today.challenges){
  paidRounds(bob,c.game,c.target-1,today.start+5000);
  const pending=rewards.dailyRewardsStatus(bob).challenges.find(x=>x.id===c.id);
  assert.equal(pending.progress,c.target-1);
  assert.equal(pending.ready,false);
  assert.throws(()=>rewards.claimDailyReward(bob,c.id),e=>e.status===409);
  paidRounds(bob,c.game,1,today.start+5000);
  const ready=rewards.dailyRewardsStatus(bob).challenges.find(x=>x.id===c.id);
  assert.equal(ready.progress,c.target);
  assert.equal(ready.ready,true);
  const before=levelWallet(bob).balance;
  const claim=rewards.claimDailyReward(bob,c.id);
  assert.equal(claim.amount,c.reward);
  assert.equal(levelWallet(bob).balance,before+c.reward);
  assert.throws(()=>rewards.claimDailyReward(bob,c.id),e=>e.status===409);
 }
 const result=rewards.dailyRewardsStatus(bob);
 assert.equal(result.challenges.length,3);
 assert.equal(result.completed,3);
 assert.equal(result.claimed,3);
 assert.equal(result.earned,result.total);
 assert.equal(result.available,0);
 assert.equal(result.freeSpins.ready,true,'daily free spin remains an independent fourth reward');
 assert.equal(rewards.dailyRewardHistory(bob).length,3);
 assert.equal(one("SELECT COUNT(*) n FROM arcade_transfers WHERE user_id=? AND reason='daily.reward'",bob).n,3);
});
test('UTC reset rotates game challenges but never removes previously awarded points',()=>{
 const at=Date.parse('2026-11-15T23:59:58Z');
 const day1=rewards.dailyRewardsStatus(other,at);
 const c=day1.challenges[0];
 paidRounds(other,c.game,c.target,at);
 assert.equal(rewards.dailyRewardsStatus(other,at).challenges[0].ready,true);
 const gained=rewards.claimDailyReward(other,c.id,at);
 const after=levelWallet(other).balance;
 assert.equal(gained.amount,c.reward);
 const day2=rewards.dailyRewardsStatus(other,at+5000);
 assert.notEqual(day2.day,day1.day);
 assert.equal(day2.claimed,0);
 assert.equal(day2.earned,0);
 assert.equal(levelWallet(other).balance,after);
 assert.equal(rewards.dailyRewardHistory(other).length,1);
});
test('Discord member can claim the fourth daily free-spin reward and play Slots without paying',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'member'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const auth=await fetch(base+'/__test/login/'+webMember,{redirect:'manual'});
  const cookie=auth.headers.get('set-cookie').split(';')[0];
  const get=path=>fetch(base+path,{headers:{cookie}});
  let response=await get('/points/daily');
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Four daily rewards/);
  assert.match(html,/RESET IN/);
  assert.match(html,/data-daily-reset-countdown/);
  assert.ok(html.includes('/static/daily-rewards.js'));
  assert.ok(html.includes('<small>RESET IN</small><strong data-daily-reset-countdown'),'the reset box must show countdown instead of a static clock');
  const reset=html.match(new RegExp('data-reset-at="([0-9]+)" data-server-now="([0-9]+)"'));
  assert.ok(reset,'the countdown must be supplied with UTC reset and server timestamps');
  assert.equal(new Date(Number(reset[1])).toISOString().slice(11,19),'00:00:00');
  assert.equal((await get('/static/daily-rewards.js')).status,200);
  assert.match(html,/50 Free Slots Spins/);
  assert.match(html,/Claim 50 free spins/);
  assert.equal((html.match(/class="daily-task /g)||[]).length,4);
  const csrf=/name="_csrf" value="([^"]+)"/.exec(html)[1];
  const send=(path,fields={},antiCsrf=csrf)=>fetch(base+path,{
   method:'POST',redirect:'manual',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({_csrf:antiCsrf,...fields})
  });
  const start=levelWallet(webMember).balance;
  assert.equal((await send('/points/daily/free-spins/claim',{},'bad')).status,403);
  assert.equal((await send('/points/daily/free-spins/claim')).status,303);
  assert.equal(rewards.freeSpinCredits(webMember),50);
  assert.equal((await send('/points/daily/free-spins/claim')).status,409);
  response=await get('/arcade/slots');
  assert.equal(response.status,200);
  const slots=await response.text();
  assert.match(slots,/50 available · 50-point stake/);
  assert.match(slots,/\/arcade\/slots\/free-spin/);
  const runSpin=await send('/arcade/slots/free-spin',{request_id:randomUUID()});
  assert.equal(runSpin.status,303);
  assert.equal(rewards.freeSpinCredits(webMember),49);
  assert.ok(levelWallet(webMember).balance>=start);
  assert.equal(one("SELECT COUNT(*) n FROM arcade_rounds WHERE user_id=? AND game='slots' AND wager=0",webMember).n,1);
  assert.equal((await get('/static/daily-rewards.css')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Daily rewards countdown ticks every second and refreshes once at midnight UTC',()=>{
 const source=readFileSync(new URL('../public/daily-rewards.js',import.meta.url),'utf8');
 const resetAt=Date.parse('2026-11-17T00:00:00Z');
 const timer={dataset:{resetAt:String(resetAt),serverNow:String(resetAt-5000)},textContent:''};
 let elapsed=0,tick=null,visibility=null,reloads=0;
 const context={
  document:{querySelector:selector=>selector==='[data-daily-reset-countdown]'?timer:null,
   addEventListener:(event,cb)=>{if(event==='visibilitychange')visibility=cb;},hidden:false},
  performance:{now:()=>elapsed},
  Date:{now:()=>100000+elapsed},
  window:{setInterval:(fn,ms)=>{assert.equal(ms,1000);tick=fn;},
   location:{reload:()=>{reloads++;}}}
 };
 runInNewContext(source,context);
 assert.equal(timer.textContent,'00:00:05');
 assert.equal(typeof tick,'function');
 elapsed=2000;tick();assert.equal(timer.textContent,'00:00:03');
 elapsed=4000;visibility();assert.equal(timer.textContent,'00:00:01');
 elapsed=5200;tick();assert.equal(timer.textContent,'00:00:00');
 assert.equal(reloads,1);
 elapsed=8000;tick();assert.equal(reloads,1,'never reload more than once at rollover');
});

test('Gold crown sits over the real #1 profile photo, never lower ranked avatars',async()=>{
 const {arcadeLeaderboardPage}=await import('../src/arcade-views.js');
 const first={position:1,user_id:owner,balance:3000,username:'owner',display_name:'First',
  profile_public:1,avatar:null,nickname:'',avatar_path:null};
 const second={...first,position:2,user_id:bob,balance:1000,display_name:'Second'};
 const rendered=arcadeLeaderboardPage({
  user:{id:alice},pathname:'/arcade/leaderboard',arcadeFragment:true
 },{balance:200},{leaders:[first,second],self:null,total:2});
 assert.match(rendered,/arcade-leaderboard-crown/);
 assert.match(rendered,/First place crown/);
 assert.match(rendered,/👑/);
 assert.equal((rendered.match(/class="arcade-leaderboard-crown"/g)||[]).length,1);
 const firstIndex=rendered.indexOf('arcade-leaderboard-top-1');
 const crownIndex=rendered.indexOf('arcade-leaderboard-crown');
 const secondIndex=rendered.indexOf('arcade-leaderboard-top-2');
 assert.ok(firstIndex<crownIndex && crownIndex<secondIndex,'crown belongs to first avatar');
 const css=readFileSync(new URL('../public/arcade.css',import.meta.url),'utf8');
 assert.match(css,/\.arcade-leaderboard-crown/);
 assert.match(css,/position:absolute/);
 assert.match(css,/top:-23px/);
});
