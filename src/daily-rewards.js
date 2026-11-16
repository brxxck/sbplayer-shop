// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Daily Arcade challenges plus one earned, opt-in 50 x 50-point Slots reward.
// Rewards use the existing website points. Free spins debit no player points.
// The user retains unspent free-spin credits across UTC daily resets.
import {db,all,one,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';
import {slotOutcome,slotTier} from './slots-rules.js';

export const DAILY_REWARD_POINTS=50;
export const DAILY_REWARDS_TOTAL=150;
export const DAILY_FREE_SPINS=50;
export const DAILY_FREE_SPIN_STAKE=50;
export const DAILY_CHALLENGES=Object.freeze([
 Object.freeze({id:'play-coinflip-15',game:'coinflip',target:15,icon:'🪙',title:'Coin Flip Challenge',
  description:'Complete 15 paid Coin Flip rounds today.',href:'/arcade/coinflip',link:'Play Coin Flip'}),
 Object.freeze({id:'play-plinko-18',game:'plinko',target:18,icon:'🔴',title:'Plinko Challenge',
  description:'Complete 18 paid Plinko drops today. One batch counts as one round.',href:'/arcade/plinko',link:'Play Plinko'}),
 Object.freeze({id:'play-slots-20',game:'slots',target:20,icon:'🎰',title:'Slots Challenge',
  description:'Complete 20 paid Slots spins today. Reward free spins do not count.',href:'/arcade/slots',link:'Play Slots'})
]);
const ids=new Set(DAILY_CHALLENGES.map(c=>c.id));
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
 const claimed=new Set(all("SELECT challenge_id FROM daily_reward_claims "+
  "WHERE guild_id=? AND user_id=? AND day_key=?",config.guildId,user,day).map(x=>x.challenge_id));
 const challenges=DAILY_CHALLENGES.map(c=>{
  const progress=Math.min(c.target,paidRoundCount(user,c.game,start,end));
  const complete=progress>=c.target||claimed.has(c.id);
  return {...c,progress,complete,claimed:claimed.has(c.id),ready:progress>=c.target&&!claimed.has(c.id),reward:DAILY_REWARD_POINTS};
 });
 const bonusClaimed=!!one('SELECT 1 FROM daily_free_spin_claims WHERE guild_id=? AND user_id=? AND day_key=?',
  config.guildId,user,day);
 const claimedCount=challenges.filter(c=>c.claimed).length;
 return {day,start,end,resetAt:end,challenges,
  completed:challenges.filter(c=>c.complete).length,
  claimed:claimedCount,earned:claimedCount*DAILY_REWARD_POINTS,
  available:challenges.filter(c=>c.ready).length*DAILY_REWARD_POINTS,
  total:DAILY_REWARDS_TOTAL,
  freeSpins:{stake:DAILY_FREE_SPIN_STAKE,quantity:DAILY_FREE_SPINS,
   available:freeSpinCredits(user),claimedToday:bonusClaimed,
   ready:claimedCount===challenges.length&&!bonusClaimed}};
}
export function claimDailyReward(userId,challengeId,at=Date.now()){
 const user=validUser(userId);
 if(!ids.has(challengeId))fail(404,'Daily challenge not found.');
 return transaction(()=>{
  const state=dailyRewardsStatus(user,at);
  const challenge=state.challenges.find(c=>c.id===challengeId);
  if(challenge.claimed)fail(409,'You already claimed this challenge today.');
  if(!challenge.ready)fail(409,'Complete the Arcade challenge before claiming points.');
  const stamp=Date.now();
  run('INSERT INTO daily_reward_claims(guild_id,user_id,day_key,challenge_id,amount,claimed_at) VALUES(?,?,?,?,?,?)',
   config.guildId,user,state.day,challengeId,DAILY_REWARD_POINTS,stamp);
  walletChange(user,DAILY_REWARD_POINTS,'daily.reward',
   'daily:'+config.guildId+':'+user+':'+state.day+':'+challengeId);
  return {challengeId,amount:DAILY_REWARD_POINTS,day:state.day,
   balance:one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,user).balance};
 });
}
export function claimDailyFreeSpins(userId,at=Date.now()){
 const user=validUser(userId);
 return transaction(()=>{
  const state=dailyRewardsStatus(user,at);
  if(state.freeSpins.claimedToday)fail(409,'You have already claimed today\'s free spins.');
  if(!state.freeSpins.ready)fail(409,'Claim all three completed daily challenges first.');
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
   fail(409,'No free spins left. Complete Daily Rewards to earn more.');
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
