// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Three community-focused daily challenges. No gambling/gameplay required.
// Daily activity and rewards are checked server-side and reset at midnight UTC.
import {db,all,one,run,transaction} from './db.js';
import {config} from './config.js';
import {walletChange} from './arcade.js';

export const DAILY_REWARD_POINTS=50;
export const DAILY_REWARDS_TOTAL=150;
export const DAILY_CHALLENGES=Object.freeze([
 Object.freeze({id:'feed-like',icon:'❤️',title:'Support the Community',
  description:'Like a post from another member on the Main Feed.',href:'/feed',link:'Explore Main Feed'}),
 Object.freeze({id:'feed-comment',icon:'💬',title:'Join the Conversation',
  description:'Leave a comment of at least 12 characters on another member’s Main Feed post.',href:'/feed',link:'Find a Post'}),
 Object.freeze({id:'suggestion-vote',icon:'🗳️',title:'Have Your Say',
  description:'Vote yes or no on another member’s server suggestion.',href:'/suggestions',link:'Browse Suggestions'})
]);
const ids=new Set(DAILY_CHALLENGES.map(c=>c.id));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};

db.exec("CREATE TABLE IF NOT EXISTS daily_reward_claims ("
 +"guild_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),"
 +"day_key TEXT NOT NULL,challenge_id TEXT NOT NULL,"
 +"amount INTEGER NOT NULL CHECK(amount>0),claimed_at INTEGER NOT NULL,"
 +"PRIMARY KEY(guild_id,user_id,day_key,challenge_id));"
 +"CREATE INDEX IF NOT EXISTS idx_daily_reward_claims_user ON daily_reward_claims(guild_id,user_id,day_key);");

export function utcRewardDay(at=Date.now()){
 if(!Number.isSafeInteger(at)||at<0||at>8640000000000000)fail(400,'Invalid reward date.');
 const day=new Date(at).toISOString().slice(0,10);
 const start=Date.parse(day+'T00:00:00.000Z');
 return {day,start,end:start+86400000};
}
function activityCompleted(userId,start,end){
 // Only real, currently visible activity performed after today's UTC reset.
 // Self-interactions, deleted posts/comments/suggestions do not qualify.
 const like=!!one("SELECT 1 FROM post_likes l "
  +"JOIN posts p ON p.id=l.post_id "
  +"WHERE l.user_id=? AND l.created_at>=? AND l.created_at<? "
  +"AND p.deleted_at IS NULL AND p.user_id!=? LIMIT 1",
  userId,start,end,userId);
 const comment=!!one("SELECT 1 FROM comments c "
  +"JOIN posts p ON p.id=CAST(c.target_id AS INTEGER) "
  +"WHERE c.user_id=? AND c.kind='post' AND c.created_at>=? AND c.created_at<? "
  +"AND c.deleted_at IS NULL AND p.deleted_at IS NULL AND p.user_id!=? "
  +"AND LENGTH(TRIM(c.body))>=12 LIMIT 1",
  userId,start,end,userId);
 const vote=!!one("SELECT 1 FROM suggestion_votes v "
  +"JOIN suggestions s ON s.id=v.suggestion_id "
  +"WHERE v.user_id=? AND v.created_at>=? AND v.created_at<? "
  +"AND s.deleted_at IS NULL AND s.user_id!=? LIMIT 1",
  userId,start,end,userId);
 return {'feed-like':like,'feed-comment':comment,'suggestion-vote':vote};
}
export function dailyRewardsStatus(userId,at=Date.now()){
 const {day,start,end}=utcRewardDay(at);
 const activity=activityCompleted(userId,start,end);
 const claimed=new Set(all("SELECT challenge_id FROM daily_reward_claims "
  +"WHERE guild_id=? AND user_id=? AND day_key=?",
  config.guildId,userId,day).map(x=>x.challenge_id));
 const challenges=DAILY_CHALLENGES.map(c=>({
  ...c,complete:activity[c.id]||claimed.has(c.id),claimed:claimed.has(c.id),
  ready:!!activity[c.id]&&!claimed.has(c.id),reward:DAILY_REWARD_POINTS
 }));
 return {day,start,end,resetAt:end,challenges,
  completed:challenges.filter(c=>c.complete).length,
  claimed:challenges.filter(c=>c.claimed).length,
  earned:challenges.filter(c=>c.claimed).length*DAILY_REWARD_POINTS,
  available:challenges.filter(c=>c.ready).length*DAILY_REWARD_POINTS,
  total:DAILY_REWARDS_TOTAL};
}
export function claimDailyReward(userId,challengeId,at=Date.now()){
 if(!ids.has(challengeId))fail(404,'Daily challenge not found.');
 return transaction(()=>{
  const state=dailyRewardsStatus(userId,at);
  const challenge=state.challenges.find(c=>c.id===challengeId);
  if(challenge.claimed)fail(409,'You already claimed this challenge today.');
  if(!challenge.ready)fail(409,'Complete the website challenge before claiming its points.');
  const stamp=Date.now();
  run("INSERT INTO daily_reward_claims"
   +"(guild_id,user_id,day_key,challenge_id,amount,claimed_at) VALUES(?,?,?,?,?,?)",
   config.guildId,userId,state.day,challengeId,DAILY_REWARD_POINTS,stamp);
  walletChange(userId,DAILY_REWARD_POINTS,'daily.reward',
   'daily:'+config.guildId+':'+userId+':'+state.day+':'+challengeId);
  return {challengeId,amount:DAILY_REWARD_POINTS,day:state.day,
   balance:one('SELECT balance FROM level_point_wallets WHERE guild_id=? AND user_id=?',config.guildId,userId).balance};
 });
}
export function dailyRewardHistory(userId,limit=15){
 return all("SELECT day_key,challenge_id,amount,claimed_at FROM daily_reward_claims "
  +"WHERE guild_id=? AND user_id=? ORDER BY claimed_at DESC LIMIT ?",
  config.guildId,userId,Math.max(1,Math.min(50,Number(limit)||15)));
}
