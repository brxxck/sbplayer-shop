// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Four server-chosen daily Arcade challenges, rotating UTC at midnight.
import {shell,esc,token,titlebar} from './views.js';
const n=x=>Number(x||0).toLocaleString('en-GB');
const date=x=>new Date(x).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC';
const previousLabels={'feed-like':'Main Feed like','feed-comment':'Main Feed comment','suggestion-vote':'Suggestion vote'};
function taskCard(ctx,c,index){
 const status=c.claimed?'✓ Claimed today':c.ready?'✓ Complete — ready to claim':'○ '+n(c.progress)+' / '+n(c.target)+' rounds';
 const action=c.claimed?'<button class="btn btn-outline" type="button" disabled>Claimed ✓</button>':
   c.ready?'<form method="post" action="/points/daily/claim">'+token(ctx)
    +'<input type="hidden" name="challenge" value="'+esc(c.id)+'">'
    +'<button class="btn btn-primary" type="submit">Claim '+n(c.reward)+' points</button></form>':
    '<a class="btn btn-outline" href="'+esc(c.href)+'">'+esc(c.link)+' →</a>';
 return '<article class="daily-task '+(c.claimed?'daily-task-claimed':c.ready?'daily-task-ready':'')+'" aria-labelledby="daily-task-'+index+'">'
  +'<div class="daily-task-top"><span class="daily-task-icon" aria-hidden="true">'+c.icon+'</span><span class="daily-task-reward">+'+n(c.reward)+' <small>PTS</small></span></div>'
  +'<h2 id="daily-task-'+index+'">'+esc(c.title)+'</h2><p>'+esc(c.description)+'</p>'
  +'<div class="daily-task-progress"><div class="daily-task-progress-line"><span>Rounds completed</span><strong>'+n(c.progress)+' / '+n(c.target)+'</strong></div>'+
    '<progress max="'+n(c.target)+'" value="'+n(c.progress)+'" aria-label="'+esc(c.title)+' progress"></progress></div>'
  +'<div class="daily-task-footer"><span class="daily-task-state '+(c.claimed?'claimed':c.ready?'ready':'pending')+'">'+status+'</span>'+action+'</div></article>';
}
export function dailyRewardsPage(ctx,state,{balance=0,history=[]}={}){
 const cards=state.challenges.map((c,index)=>taskCard(ctx,c,index)).join('');
 const f=state.freeSpins;
 const freeAction=f.claimedToday?'<a class="btn btn-primary" href="/arcade/slots">Use free spins →</a>':
  f.ready?'<form action="/points/daily/free-spins/claim" method="post">'+token(ctx)+
  '<button class="btn btn-primary" type="submit">Claim 50 free spins</button></form>':
  '<span class="daily-bonus-pending">Claim all four challenges to unlock the 50 free spins.</span>';
 const historyRows=history.map(x=>'<tr><td>'+esc(x.day_key)+'</td><td>'+
  esc(state.challenges.find(c=>c.id===x.challenge_id)?.title||previousLabels[x.challenge_id]||x.challenge_id.replace(/^play-/,'')+' Challenge')+
  '</td><td class="daily-positive">+'+n(x.amount)+'</td></tr>').join('')
  ||'<tr><td colspan="3">No daily rewards claimed yet.</td></tr>';
 return shell(ctx,'Daily Rewards',
  '<link rel="stylesheet" href="/static/daily-rewards.css?v=arcade-4-dailies-free-spins-v2">'
  +titlebar('DAILY ARCADE REWARDS','Four rotating game challenges','New games, targets and 100–500-point rewards each day. Complete all four to earn 50 free Slots spins.')
  +'<div class="daily-reward-summary">'
   +'<div><small>TODAY EARNED</small><strong>'+n(state.earned)+' / '+n(state.total)+' pts</strong></div>'
   +'<div><small>CHALLENGES COMPLETED</small><strong>'+state.completed+' / '+state.challenges.length+'</strong></div>'
   +'<div><small>READY TO CLAIM</small><strong>'+n(state.available)+' pts</strong></div>'
   +'<div><small>YOUR POINT BALANCE</small><strong>'+n(balance)+' pts</strong></div>'
  +'</div>'
  +'<section class="panel padded daily-reward-intro"><div><h2>🎁 Today’s Daily Challenges</h2>'
   +'<p>Finish <strong>15–20 paid rounds</strong> in each of today’s four Arcade games. Earn <strong>100–500 points</strong> per challenge. Games, goals and prizes change every day.</p></div>'
   +'<div class="daily-reward-reset"><small>RESETS</small><strong>00:00 UTC</strong><span>Next: '+esc(date(state.resetAt))+'</span></div></section>'
  +'<section class="daily-task-grid" aria-label="Four daily challenges">'+cards+'</section>'
  +'<section class="panel padded daily-free-spin-bonus"><div><span class="daily-bonus-eyebrow">ALL FOUR COMPLETED · DAILY BONUS</span><h2>🎰 50 Free Slots Spins</h2>'
   +'<p><strong>50 points per spin</strong>, completely free. Any winning points are paid directly into your website balance. Free spins do not count towards paid-spin challenges.</p>'
   +'<div class="daily-free-spin-meta"><span>Free spins available: <strong>'+n(f.available)+'</strong></span>'+
   '<span>Today: <strong>'+(f.claimedToday?'Claimed':f.ready?'Ready to claim':'Locked')+'</strong></span></div></div>'
   +'<div class="daily-bonus-action">'+freeAction+'</div></section>'
  +'<section class="panel padded daily-reward-help"><h2>How it works</h2>'
   +'<p>Only <strong>completed, paid rounds</strong> count. A multi-ball Plinko drop counts as one round. Free spins, unfinished games, and failed attempts never count. Replaying or refreshing a settled result cannot increase progress.</p>'
   +'<p>Tasks reset at <strong>00:00 UTC</strong>. Each prize and the 50-spin daily bonus can be claimed once per day. Unused earned free-spin credits stay available for later.</p>'
   +'<div class="daily-reward-links"><a class="btn btn-outline" href="/arcade">Solo Arcade →</a> '
   +'<a class="btn btn-outline" href="/arcade/slots">Slots →</a> <a class="btn btn-outline" href="/points">Level Points →</a></div></section>'
  +'<section class="panel padded daily-reward-history"><h2>Recent Daily Rewards</h2><div class="table-wrap"><table>'
   +'<thead><tr><th>Date (UTC)</th><th>Challenge</th><th>Points</th></tr></thead><tbody>'+historyRows+'</tbody></table></div></section>'
 );
}
