// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Three rotating paid-game challenges plus a fourth independent 50 x 50 free Spins daily reward.
// Rewards use the existing website points. Free spins debit no player points.
// The user retains unspent free-spin credits across UTC daily resets.
import {db,all,one,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {slotOutcome,slotTier} from './slots-rules.js';

// Three distinct games rotate at midnight UTC. Each game task changes its required
// round count (15-20) and point reward (100-500) every day.
export const DAILY_CHALLENGE_COUNT=3;
export const DAILY_REWARD_MIN=100;
export const DAILY_REWARD_MAX=500;
export const DAILY_FREE_SPINS=50;
export const DAILY_FREE_SPIN_STAKE=50;
const DAILY_GAME_POOL=Object.freeze([
 Object.freeze({game:'coinflip',icon:'🪙',name:'Coin Flip',href:'/arcade/coinflip',link:'Play Coin Flip',unit:'rounds'}),
 Object.freeze({game:'plinko',icon:'🔴',name:'Plinko',href:'/arcade/plinko',link:'Play Plinko',unit:'drops'}),
 Object.freeze({game:'slots',icon:'🎰',name:'Slots',href:'/arcade/slots',link:'Play Slots',unit:'paid spins'}),
 Object.freeze({game:'crash',icon:'🚀',name:'Crash',href:'/arcade/crash',link:'Play Crash',unit:'rounds'}),
 Object.freeze({game:'mines',icon:'💎',name:'Mines',href:'/arcade/mines',link:'Play Mines',unit:'completed rounds'}),
 Object.freeze({game:'blackjack_solo',icon:'🃏',name:'Solo Blackjack',href:'/arcade/blackjack',link:'Play Blackjack',unit:'hands'})
]);
// Deterministic daily server-wide rotation; no user can reroll their tasks.
// Each numbered challenge slot changes game, required rounds AND prize daily.
export function dailyChallengeSchedule(at=Date.now()){
 const {start}=utcRewardDay(at),dayIndex=Math.floor(start/86400000);
 return Object.freeze(Array.from({length:DAILY_CHALLENGE_COUNT},(_,i)=>{
  const game=DAILY_GAME_POOL[(dayIndex+i)%DAILY_GAME_POOL.length];
  const target=15+((dayIndex+i*2)%6);
  const reward=DAILY_REWARD_MIN+50*((dayIndex+i*3)%9);
  return Object.freeze({
   id:'play-'+game.game,game:game.game,target,reward,
   icon:game.icon,title:game.name+' Challenge',
   description:'Complete '+target+' paid '+game.name+' '+game.unit+' today.',
   href:game.href,link:game.link
  });
 }));
}
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const validUser=user=>{const s=String(user||'');if(!/^[0-9]{15,22}$/.test(s))fail(400,'Invalid Discord user.');return s;};
const validRequest=key=>{const s=String(key||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))fail(400,'Invalid free-spin request.');return s;};
db.exec("CREATE TABLE IF NOT EXISTS daily_reward_claims ("+
 "guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),"+
 "day_key TEXT NOT NULL,challenge_id TEXT NOT NULL,"+
 "amount INTEGER NOT NULL CHECK(amount>0),claimed_at INTEGER NOT NULL,"+
 "PRIMARY KEY(guild_id,user_id,day_key,challenge_id));"+
 "CREATE INDEX IF NOT EXISTS idx_daily_reward_claims_user ON daily_reward_claims(guild_id,user_id,day_key);"+
 "CREATE TABLE IF NOT EXISTS daily_free_spin_credits ("+
 "guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),remaining INTEGER NOT NULL DEFAULT 0 CHECK(remaining>=0),"+
 "updated_at INTEGER NOT NULL,PRIMARY KEY(guild_id,user_id));"+
 "CREATE TABLE IF NOT EXISTS daily_free_spin_claims ("+
 "guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),"+
 "day_key TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),claimed_at INTEGER NOT NULL,"+
 "PRIMARY KEY(guild_id,user_id,day_key));"
);
export function utcRewardDay(at=Date.now()){
 if(!Number.isSafeInteger(at)||at<0||at>8640000000000000)fail(400,'Invalid reward date.');
 const day=new Date(at).toISOString().slice(0,10);
 const start=Date.parse(day+'T00:00:00.000Z');
 return {day,start,end:start+86400000};
}
export function freeSpinCredits(userId){
 const id=validUser(userId);
 return one('SELECT remaining FROM daily_free_spin_credits WHERE guild_id=? AND user_id=?',config.guildId,id)?.remaining||0;
}
function paidRoundCount(user,game,start,end){
 // An accepted, completed paid round is counted once, regardless of Plinko
 // batch size. Exclude free spins, and never count failed/active/refunded play.
 return one("SELECT COUNT(*) AS n FROM arcade_rounds WHERE guild_id=? AND user_id=? "+
  "AND game=? AND wager>=10 AND status NOT IN ('active','cancelled','refunded') "+
  "AND created_at>=? AND created_at<?",config.guildId,user,game,start,end)?.n||0;
}
export function dailyRewardsStatus(userId,at=Date.now()){
 const user=validUser(userId),{day,start,end}=utcRewardDay(at);
 const claims=all("SELECT challenge_id,amount FROM daily_reward_claims "+
  "WHERE guild_id=? AND user_id=? AND day_key=?",config.guildId,user,day);
 const claimed=new Map(claims.map(x=>[x.challenge_id,x.amount]));
 const challenges=dailyChallengeSchedule(at).map(c=>{
  const progress=Math.min(c.target,paidRoundCount(user,c.game,start,end));
  const complete=progress>=c.target||claimed.has(c.id);
  return {...c,progress,complete,claimed:claimed.has(c.id),ready:progress>=c.target&&!claimed.has(c.id),reward:claimed.get(c.id)||c.reward};
 });
 const bonusClaimed=!!one('SELECT 1 FROM daily_free_spin_claims WHERE guild_id=? AND user_id=? AND day_key=?',
  config.guildId,user,day);
 const claimedCount=challenges.filter(c=>c.claimed).length;
 return {day,start,end,resetAt:end,challenges,
  completed:challenges.filter(c=>c.complete).length+(bonusClaimed?1:0),
  claimed:claimedCount+(bonusClaimed?1:0),earned:challenges.filter(c=>c.claimed).reduce((n,c)=>n+c.reward,0),
  available:challenges.filter(c=>c.ready).reduce((n,c)=>n+c.reward,0),
  total:challenges.reduce((n,c)=>n+c.reward,0),
  freeSpins:{stake:DAILY_FREE_SPIN_STAKE,quantity:DAILY_FREE_SPINS,
   available:freeSpinCredits(user),claimedToday:bonusClaimed,
   ready:!bonusClaimed}};
}
export function claimDailyReward(userId,challengeId,at=Date.now()){
 const user=validUser(userId);
 return transaction(()=>{
  const state=dailyRewardsStatus(user,at);
  const challenge=state.challenges.find(c=>c.id===challengeId);
  if(!challenge)fail(404,'Daily challenge not found.');
  if(challenge.claimed)fail(409,'You already claimed this challenge today.');
  if(!challenge.ready)fail(409,'Complete the Arcade challenge before claiming points.');
  const stamp=Date.now();
  run('INSERT INTO daily_reward_claims(guild_id,user_id,day_key,challenge_id,amount,claimed_at) VALUES(?,?,?,?,?,?)',
   config.guildId,user,state.day,challengeId,challenge.reward,stamp);
  walletChange(user,challenge.reward,'daily.reward',
   'daily:'+config.guildId+':'+user+':'+state.day+':'+challengeId);
  return {challengeId,amount:challenge.reward,day:state.day,
   balance:one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,user).balance};
 });
}
export function claimDailyFreeSpins(userId,at=Date.now()){
 const user=validUser(userId);
 return transaction(()=>{
  const state=dailyRewardsStatus(user,at);
  if(state.freeSpins.claimedToday)fail(409,'You have already claimed today\'s free spins.');
  if(!state.freeSpins.ready)fail(409,'You have already claimed today\'s free spins.');
  const stamp=Date.now();
  run('INSERT INTO daily_free_spin_claims(guild_id,user_id,day_key,quantity,claimed_at) VALUES(?,?,?,?,?)',
   config.guildId,user,state.day,DAILY_FREE_SPINS,stamp);
  run('INSERT INTO daily_free_spin_credits(guild_id,user_id,remaining,updated_at) VALUES(?,?,?,?) '+
   'ON CONFLICT(guild_id,user_id) DO UPDATE SET remaining=remaining+excluded.remaining,updated_at=excluded.updated_at',
   config.guildId,user,DAILY_FREE_SPINS,stamp);
  return {quantity:DAILY_FREE_SPINS,stake:DAILY_FREE_SPIN_STAKE,remaining:freeSpinCredits(user),day:state.day};
 });
}
export function spinDailyFreeSlots(userId,fields){
 const user=validUser(userId),key=validRequest(fields?.request_id);
 return transaction(()=>{
  const previous=one('SELECT id,user_id,details_json FROM arcade_rounds WHERE request_key=?',key);
  if(previous){
   const d=JSON.parse(previous.details_json||'{}');
   if(previous.user_id!==user||!d.isRewardSpin)fail(409,'This request ID is already used.');
   return previous.id;
  }
  const stamp=Date.now();
  if(run('UPDATE daily_free_spin_credits SET remaining=remaining-1,updated_at=? WHERE guild_id=? AND user_id=? AND remaining>0',
    stamp,config.guildId,user).changes!==1)
   fail(409,'No free spins left. Claim your next daily free-spin reward.');
  const outcome=slotOutcome();
  const payout=Math.floor(DAILY_FREE_SPIN_STAKE*outcome.multiplier+1e-8);
  if(payout)walletChange(user,payout,'slots.free.reward','slots:free:reward:'+key);
  const details={...outcome,version:2,isRewardSpin:true,unitStake:DAILY_FREE_SPIN_STAKE,
   tier:slotTier(outcome.multiplier)};
  return Number(run('INSERT INTO arcade_rounds(guild_id,user_id,game,wager,payout,status,details_json,request_key,created_at,updated_at) '+
   'VALUES(?,?,?,?,?,?,?,?,?,?)',config.guildId,user,'slots',0,payout,payout?'won':'lost',
    JSON.stringify(details),key,stamp,stamp).lastInsertRowid);
 });
}
export function dailyRewardHistory(userId,limit=15){
 const user=validUser(userId);
 return all('SELECT day_key,challenge_id,amount,claimed_at FROM daily_reward_claims '+
  'WHERE guild_id=? AND user_id=? ORDER BY claimed_at DESC LIMIT ?',
  config.guildId,user,Math.max(1,Math.min(50,Number(limit)||15)));
}
