// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'sb-daily-rewards-'));
const guild='100000000000000001',owner='100000000000000002';
const alice='100000000000000003',bob='100000000000000004',other='100000000000000005';
Object.assign(process.env,{NODE_ENV:'test',DB_PATH:join(temp,'data.sqlite'),DISCORD_GUILD_ID:guild});
const {db,one,all,run}=await import('../src/db.js');
const {levelWallet}=await import('../src/level-points.js');
const rewards=await import('../src/daily-rewards.js');
const arcade=await import('../src/arcade.js');
for(const id of [owner,alice,bob,other]){
 run('INSERT INTO users(id,username,display_name,updated_at) VALUES(?,?,?,?)',
  id,'member-'+id.slice(-3),'Member '+id.slice(-3),Date.now());
}
run('INSERT INTO level_point_wallets(guild_id,user_id,balance,claimed_level) VALUES(?,?,?,?)',guild,alice,200,4);
const postFor=(user,at=Date.now())=>Number(run('INSERT INTO posts(user_id,body,created_at) VALUES(?,?,?)',
 user,'Community post',at).lastInsertRowid);
const suggestionFor=(user,at=Date.now())=>Number(run(
 'INSERT INTO suggestions(user_id,title,body,created_at,updated_at) VALUES(?,?,?,?,?)',
 user,'New community idea','Let us do something fun together',at,at).lastInsertRowid);
const likePost=(id,user,at=Date.now())=>run('INSERT INTO post_likes(post_id,user_id,created_at) VALUES(?,?,?)',id,user,at);
const commentOn=(id,user,body,at=Date.now())=>run("INSERT INTO comments(kind,target_id,user_id,body,created_at) VALUES('post',?,?,?,?)",
 String(id),user,body,at);
const vote=(id,user,at=Date.now())=>run("INSERT INTO suggestion_votes(suggestion_id,user_id,choice,created_at) VALUES(?,?,'yes',?)",id,user,at);
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

test('Three non-game daily tasks independently qualify and award exactly 50 points each',()=>{
 const initial=rewards.dailyRewardsStatus(alice);
 assert.deepEqual(initial.challenges.map(x=>x.id),['feed-like','feed-comment','suggestion-vote']);
 assert.equal(initial.available,0);
 assert.equal(initial.total,150);
 assert.equal(initial.resetAt-initial.start,86400000);
 const post=postFor(bob);
 const suggestion=suggestionFor(bob);
 likePost(post,alice);
 let state=rewards.dailyRewardsStatus(alice);
 assert.equal(state.available,50);
 assert.equal(state.challenges[0].ready,true);
 assert.equal(state.challenges[1].ready,false);
 assert.equal(rewards.claimDailyReward(alice,'feed-like').amount,50);
 assert.equal(levelWallet(alice).balance,250);
 assert.equal(levelWallet(alice).claimedLevel,4,'daily rewards do not advance level claim progress');
 assert.throws(()=>rewards.claimDailyReward(alice,'feed-like'),e=>e.status===409);
 commentOn(post,alice,'This community post is great!');
 vote(suggestion,alice);
 state=rewards.dailyRewardsStatus(alice);
 assert.equal(state.available,100);
 const collected=rewards.claimDailyReward(alice,'feed-comment');
 assert.equal(collected.amount,50);
 rewards.claimDailyReward(alice,'suggestion-vote');
 state=rewards.dailyRewardsStatus(alice);
 assert.equal(state.claimed,3);
 assert.equal(state.earned,150);
 assert.equal(state.available,0);
 assert.equal(levelWallet(alice).balance,350);
 assert.equal(rewards.dailyRewardHistory(alice).length,3);
 assert.equal(one("SELECT COUNT(*) n FROM arcade_transfers WHERE guild_id=? AND user_id=? AND reason='daily.reward'",guild,alice).n,3);
 assert.equal(one('SELECT COUNT(*) n FROM daily_reward_claims WHERE guild_id=? AND user_id=?',guild,alice).n,3);
 assert.throws(()=>rewards.claimDailyReward(alice,'bogus'),e=>e.status===404);
});

test('Self likes, self comments, short comments and self votes do not complete tasks',()=>{
 const ownPost=postFor(other),ownSuggestion=suggestionFor(other);
 likePost(ownPost,other);
 commentOn(ownPost,other,'Commenting on my own post is not valid');
 vote(ownSuggestion,other);
 let s=rewards.dailyRewardsStatus(other);
 assert.equal(s.completed,0);
 assert.equal(s.available,0);
 assert.throws(()=>rewards.claimDailyReward(other,'feed-like'),e=>e.status===409);
 const peerPost=postFor(bob),peerSuggestion=suggestionFor(bob);
 commentOn(peerPost,other,'Short');
 s=rewards.dailyRewardsStatus(other);assert.equal(s.challenges[1].ready,false);
 const another=postFor(bob);
 run('UPDATE posts SET deleted_at=? WHERE id=?',Date.now(),another);
 likePost(another,other);
 s=rewards.dailyRewardsStatus(other);assert.equal(s.challenges[0].ready,false);
 commentOn(peerPost,other,'Valid longer comment');
 vote(peerSuggestion,other);
 s=rewards.dailyRewardsStatus(other);
 assert.equal(s.challenges[1].ready,true);
 assert.equal(s.challenges[2].ready,true);
 assert.equal(s.challenges[0].ready,false);
 const amount=rewards.claimDailyReward(other,'feed-comment').amount;
 assert.equal(amount,50);
 assert.equal(levelWallet(other).balance,50,'first-ever reward creates a wallet');
});

test('Daily rewards reset at midnight UTC, without deleting previously earned balances',()=>{
 const user=bob,at=Date.parse('2026-11-15T23:59:58.000Z');
 const post=postFor(owner,at-1000);
 likePost(post,user,at-500);
 let state=rewards.dailyRewardsStatus(user,at);
 assert.equal(state.challenges[0].ready,true);
 assert.equal(state.day,'2026-11-15');
 rewards.claimDailyReward(user,'feed-like',at);
 assert.equal(levelWallet(user).balance,50);
 state=rewards.dailyRewardsStatus(user,at+5000);
 assert.equal(state.day,'2026-11-16');
 assert.equal(state.challenges[0].ready,false);
 assert.equal(state.claimed,0);
 assert.equal(levelWallet(user).balance,50);
 likePost(postFor(owner,at+5000),user,at+5100);
 assert.equal(rewards.dailyRewardsStatus(user,at+7000).challenges[0].ready,true);
 rewards.claimDailyReward(user,'feed-like',at+7000);
 assert.equal(levelWallet(user).balance,100);
 assert.equal(one('SELECT COUNT(*) AS n FROM daily_reward_claims WHERE guild_id=? AND user_id=? AND challenge_id=?',
  guild,user,'feed-like').n,2);
 assert.throws(()=>rewards.claimDailyReward(user,'feed-like',at+7000),e=>e.status===409);
});

test('Signed-in member can complete a post like, comment and suggestion vote through the website then claim',async()=>{
 const {createServer}=await import('../src/server.js');
 const server=createServer({testLogin:true,discord:{
  getGuild:async()=>({id:guild,owner_id:owner}),
  getGuildMember:async id=>({user:{id,username:'member'},roles:[],pending:false}),
  getRoles:async()=>[]
 }});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const guest=await fetch(base+'/points/daily',{redirect:'manual'});
  assert.equal(guest.status,200,'public Discord metadata page must not show private daily rewards');
  assert.doesNotMatch(await guest.text(),/action="\/points\/daily\/claim"/);
  const auth=await fetch(base+'/__test/login/'+alice,{redirect:'manual'});
  const cookie=auth.headers.get('set-cookie').split(';')[0];
  const get=path=>fetch(base+path,{headers:{cookie}});
  let response=await get('/points/daily');
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Three challenges/);
  assert.match(html,/Like a post/);
  assert.match(html,/Leave a comment/);
  assert.match(html,/Vote yes or no/);
  assert.match(html,/00:00 UTC/);
  const csrf=/name="_csrf" value="([^"]+)"/.exec(html)[1];
  const post=postFor(owner),suggestion=suggestionFor(owner);
  const send=(path,fields,antiCsrf=csrf)=>fetch(base+path,{
   method:'POST',redirect:'manual',headers:{cookie,'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({_csrf:antiCsrf,...fields})
  });
  const noCsrf=await send('/points/daily/claim',{challenge:'feed-like'},'bad');
  assert.equal(noCsrf.status,403);
  const before=levelWallet(alice).balance;
  const notReady=await send('/points/daily/claim',{challenge:'feed-like'});
  assert.equal(notReady.status,409);
  const liked=await send('/post/'+post+'/like',{});
  assert.equal(liked.status,303);
  response=await get('/points/daily');
  assert.match(await response.text(),/Completed — ready to claim/);
  const first=await send('/points/daily/claim',{challenge:'feed-like'});
  assert.equal(first.status,303);
  assert.equal(levelWallet(alice).balance,before+50);
  assert.equal((await send('/points/daily/claim',{challenge:'feed-like'})).status,409);
  assert.equal((await send('/post/'+post+'/comment',{body:'A nice long community reply!'})).status,303);
  assert.equal((await send('/suggestions/'+suggestion+'/vote',{choice:'yes'})).status,303);
  assert.equal((await send('/points/daily/claim',{challenge:'feed-comment'})).status,303);
  assert.equal((await send('/points/daily/claim',{challenge:'suggestion-vote'})).status,303);
  assert.equal(levelWallet(alice).balance,before+150);
  const final=(await (await get('/points/daily')).text());
  assert.match(final,/150 \/ 150 pts/);
  assert.match(final,/3 \/ 3/);
  assert.match(final,/Claimed today/);
  assert.match(final,/Recent Daily Rewards/);
  assert.equal((await fetch(base+'/points/daily/claim',{method:'POST',redirect:'manual'})).status,303,'signed out cannot credit points');
  assert.equal((await get('/static/daily-rewards.css')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
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
