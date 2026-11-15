// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Member-facing community daily rewards. Claim actions stay server-authoritative.
import {shell,esc,token,titlebar} from './views.js';
import {DAILY_REWARD_POINTS,DAILY_REWARDS_TOTAL} from './daily-rewards.js';
const n=x=>Number(x||0).toLocaleString('en-GB');
const date=x=>new Date(x).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC';
const labels={'feed-like':'Main Feed like','feed-comment':'Main Feed comment','suggestion-vote':'Suggestion vote'};
function taskCard(ctx,c,index){
 const status=c.claimed?'✓ Claimed today':c.ready?'✓ Completed — ready to claim':'○ Not completed yet';
 const action=c.claimed?'<button class="btn btn-outline" type="button" disabled>Claimed ✓</button>':
   c.ready?'<form method="post" action="/points/daily/claim">'+token(ctx)
    +'<input type="hidden" name="challenge" value="'+esc(c.id)+'">'
    +'<button class="btn btn-primary" type="submit">Claim '+n(DAILY_REWARD_POINTS)+' points</button></form>':
    '<a class="btn btn-outline" href="'+esc(c.href)+'">'+esc(c.link)+' →</a>';
 return '<article class="daily-task '+(c.claimed?'daily-task-claimed':c.ready?'daily-task-ready':'')+'" aria-labelledby="daily-task-'+index+'">'
  +'<div class="daily-task-top"><span class="daily-task-icon" aria-hidden="true">'+c.icon+'</span><span class="daily-task-reward">+'+n(c.reward)+' <small>PTS</small></span></div>'
  +'<h2 id="daily-task-'+index+'">'+esc(c.title)+'</h2><p>'+esc(c.description)+'</p>'
  +'<div class="daily-task-footer"><span class="daily-task-state '+(c.claimed?'claimed':c.ready?'ready':'pending')+'">'+status+'</span>'+action+'</div></article>';
}
export function dailyRewardsPage(ctx,state,{balance=0,history=[]}={}){
 const cards=state.challenges.map((c,index)=>taskCard(ctx,c,index)).join('');
 const historyRows=history.map(x=>'<tr><td>'+esc(x.day_key)+'</td><td>'+esc(labels[x.challenge_id]||'Community task')+'</td><td class="daily-positive">+'+n(x.amount)+'</td></tr>').join('')
  ||'<tr><td colspan="3">No daily rewards claimed yet.</td></tr>';
 return shell(ctx,'Daily Rewards',
  '<link rel="stylesheet" href="/static/daily-rewards.css?v=1">'
  +titlebar('DAILY COMMUNITY REWARDS','Three challenges. 150 points.','Take part in the community every day to earn bonus Arcade points — no games or wagers required.')
  +'<div class="daily-reward-summary">'
   +'<div><small>TODAY EARNED</small><strong>'+n(state.earned)+' / '+n(DAILY_REWARDS_TOTAL)+' pts</strong></div>'
   +'<div><small>CHALLENGES COMPLETED</small><strong>'+state.completed+' / '+state.challenges.length+'</strong></div>'
   +'<div><small>READY TO CLAIM</small><strong>'+n(state.available)+' pts</strong></div>'
   +'<div><small>YOUR POINT BALANCE</small><strong>'+n(balance)+' pts</strong></div>'
  +'</div>'
  +'<section class="panel padded daily-reward-intro"><div><h2>🎁 Today’s Daily Challenges</h2>'
   +'<p>Complete each community task, return here and claim <strong>50 points per challenge</strong>. Earn up to <strong>150 points per day</strong>.</p></div>'
   +'<div class="daily-reward-reset"><small>RESETS</small><strong>00:00 UTC</strong><span>Next: '+esc(date(state.resetAt))+'</span></div></section>'
  +'<section class="daily-task-grid" aria-label="Daily challenges">'+cards+'</section>'
  +'<section class="panel padded daily-reward-help"><h2>How daily challenges work</h2>'
   +'<p>Likes and comments must be on <strong>another member’s Main Feed post</strong>. Comments must contain at least 12 characters. Suggestion votes must be on another member’s suggestion. The website checks your activity automatically.</p>'
   +'<p>Each challenge is claimable <strong>once per day</strong>. Daily challenges refresh at midnight UTC. Previously earned points stay in your Arcade wallet.</p>'
   +'<div class="daily-reward-links"><a class="btn btn-outline" href="/feed">Main Feed →</a> '
   +'<a class="btn btn-outline" href="/suggestions">Suggestions →</a> <a class="btn btn-outline" href="/points">Level Points →</a></div></section>'
  +'<section class="panel padded daily-reward-history"><h2>Recent Daily Rewards</h2><div class="table-wrap"><table>'
   +'<thead><tr><th>Date (UTC)</th><th>Challenge</th><th>Points</th></tr></thead><tbody>'+historyRows+'</tbody></table></div></section>'
 );
}
