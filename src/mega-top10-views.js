// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Standalone MegaSMP UI. Source-unverified and missing fields are clearly
// labeled instead of manufacturing complete team or player statistics.
import {shell,titlebar,esc,token} from './views.js';
import {icon} from './icons.js';
import {MEGA_TEAM_ID} from './mega-team.js';
const attr=esc;
const date=ms=>ms?new Date(ms).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not yet verified';
const number=n=>n===null||n===undefined?'Not recorded':Number(n).toLocaleString('en-US');
const moneyCents=cents=>Number.isSafeInteger(cents)&&cents>=0?
  '$'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'Not recorded';
const signedMoneyCents=cents=>Number.isSafeInteger(cents)?
  (cents<0?'-':'')+moneyCents(Math.abs(cents)):'Not recorded';
const mainTeam=listing=>listing.teams.find(t=>t.id===MEGA_TEAM_ID)||null;
const lastLabel=listing=>listing.live?
  (Date.now()-listing.status.last_success>15*60000?'Saved listing (stale)':'Latest verified listing'):
  'Reference links · live ranking not verified';

function teamAnchor(team,label){
 return '<a class="mega-top-team-link" href="/mega-team/teams/'+attr(team.id)+'">'+esc(label||team.name)+'</a>';
}
function teamRows(listing){
 return listing.teams.map(t=>'<tr>'+
  '<td class="mega-rank"><a href="/mega-team/teams/'+attr(t.id)+'">'+
   (listing.live&&t.rank?'#'+t.rank:'—')+'</a></td>'+
  '<td>'+teamAnchor(t,t.name)+(t.id===MEGA_TEAM_ID?' <small>Our team</small>':'')+'</td>'+
  '<td class="mega-number">'+(t.bankText?esc(t.bankText):moneyCents(t.bankCents))+
   (t.approximate?'<small>Rounded by InPvP</small>':'')+'</td>'+
  '<td class="mega-number">'+number(t.level)+'</td>'+
  '<td class="mega-number">'+number(t.views)+'</td>'+
  '<td class="mega-number">'+number(t.memberCount)+'</td>'+
  '<td><a href="'+attr(t.url)+'" target="_blank" rel="noopener noreferrer" class="quiet-link">InPvP ↗</a></td>'+
  '</tr>').join('')||'<tr><td colspan="7">No verified leaderboard results yet.</td></tr>';
}
const statusText=listing=>'<div class="mega-top-status">'+
 '<span>'+esc(lastLabel(listing))+'</span>'+
 '<span>Last source check: '+esc(date(listing.status.last_success))+'</span>'+
 (listing.status.last_error?'<span>Collector notice: '+esc(listing.status.last_error)+'</span>':'')+
 '</div>';
function topTable(listing){
 return '<div class="table-wrap panel"><table class="mega-table mega-top-table">'+
   '<thead><tr><th>PLACE</th><th>TEAM</th><th>BANK</th><th>LEVEL</th><th>VIEWS</th><th>MEMBERS</th><th>SOURCE</th></tr></thead>'+
   '<tbody data-top10-rows>'+teamRows(listing)+'</tbody></table></div>';
}
export function megaHubPage(ctx,{listing,megaContent}){
 const own=mainTeam(listing),rank=listing.live&&own?.rank?'#'+own.rank:'Unverified';
 const intro=titlebar('MEGASMP PORTAL',
   'SBsxScam <span class="gradient">MegaSMP.</span> <a href="/mega-team/leaderboard" class="mega-title-place" data-mega-title-rank>'+esc(rank)+'</a>',
   'Live team rankings and independently observed bank statistics from InPvP.')+
   '<div class="mega-top-hero panel"><div><span class="eyebrow">OUR TEAM POSITION</span>'+
   '<a href="/mega-team/leaderboard" class="mega-top-rank" data-mega-sb-rank>'+
   esc(rank)+' '+icon('arrow-up-right',{size:24})+'</a>'+
   '<p>Open the Top 10 leaderboard to see the current standings. Rank is shown only after verification.</p></div>'+
   '<div class="mega-top-actions"><a class="btn btn-primary" href="/mega-team/leaderboard">'+
   icon('trophy',{size:17})+' View Top 10 teams</a>'+
   '<a class="btn btn-outline" href="/mega-team/teams/'+attr(MEGA_TEAM_ID)+'">'+
   icon('users',{size:17})+' Team details</a>'+
   (ctx.role==='owner'?'<a class="btn btn-outline" href="/mega-team/links">'+
    icon('user-round-check',{size:17})+' Link Minecraft profiles</a>':'')+
   '</div></div>'+statusText(listing);
 return shell(ctx,'MegaSMP Team','<div class="mega-top-page" data-top10-board>'+
   intro+megaContent+'</div>');
}
export function megaLeaderboardPage(ctx,listing){
 const intro=titlebar('MEGASMP LEADERBOARD',
   'Top <span class="gradient">10 teams.</span>',
   'Positions are read from the official InPvP leaderboard. Each team has a separate profile and verified source link.');
 const notice=!listing.live?
  '<p class="mega-top-notice">The first live Top 10 capture is not yet available. Teams below are previously provided reference links; their rankings are intentionally unverified.</p>':
  '<p class="mega-top-notice">Only the latest successfully captured source ranking is shown. InPvP may update less frequently than the one-minute checks; these standings can be delayed.</p>';
 return shell(ctx,'MegaSMP Top 10',
  '<div class="mega-top-page" data-top10-board>'+
  intro+'<div class="mega-top-actions"><a href="/mega-team" class="btn btn-outline">'+
  icon('arrow-left',{size:17})+' SBsxScam dashboard</a>'+
  '<a href="https://inpvp.net/megasmp/teams" target="_blank" rel="noopener noreferrer" class="btn btn-outline">'+
  icon('external-link',{size:17})+' Official leaderboard</a></div>'+
  statusText(listing)+notice+topTable(listing)+
  '<p class="muted tiny">Leaderboard checked every minute while the approved collector is enabled. Detailed team records are fetched one at a time, roughly 30 seconds apart, with a five-minute target per team. Missing values remain unverified.</p>'+
  '</div>');
}
function playerName(name,linked){
 if(linked&&/^\d{15,22}$/.test(String(linked.discordId)))
  return '<a class="mega-top-team-link" href="/u/'+attr(linked.discordId)+'" title="Open linked Discord profile">'+
   icon('user-round-check',{size:15})+' '+esc(name)+'</a>'+
   '<small>Owner-linked Discord: @'+esc(linked.username||linked.displayName||'member')+'</small>';
 return '<strong>'+esc(name)+'</strong><small>No Discord profile linked</small>';
}
export function megaTeamDetailsPage(ctx,{team,links=[],currentSeason='current'}){
 const byName=new Map(links.map(link=>[link.gamertag.toLowerCase(),link]));
 const rank=team.rank&&Date.now()-team.rankObservedAt<=15*60000?'#'+team.rank:
   team.rank?'#'+team.rank+' (saved)':'Not currently verified in Top 10';
 const header=titlebar('MEGASMP TEAM PROFILE',
    esc(team.name)+' <span class="gradient">statistics.</span>',
    'Observed information from the team’s InPvP page; incomplete or unavailable fields remain explicitly marked.');
 const fields=[['Leaderboard position',rank],['Team bank',team.bankText||moneyCents(team.bankCents)],
   ['Level',number(team.level)],['Views',number(team.views)],
   ['Displayed member count',number(team.memberCount)],['Observed bank events',number(team.eventCount)]];
 const tiles='<div class="mega-top-kpis">'+fields.map(([label,value])=>
   '<div class="mega-stat panel"><span class="mega-stat-label">'+esc(label)+'</span>'+
   '<strong>'+esc(value)+'</strong></div>').join('')+'</div>';
 const players=team.members.length?team.members.map(m=>{
   const linked=byName.get(m.gamertag.toLowerCase());
   const recorded=m.eventCount>0;
   return '<tr><td>'+playerName(m.gamertag,linked)+
     (m.rosterObserved?'<small>Observed on team roster</small>':
      '<small>Bank activity only · membership not confirmed</small>')+'</td>'+
     '<td>'+esc(m.role||'Not verified')+'</td>'+
     '<td class="mega-number">'+(recorded?moneyCents(m.depositsCents):'Not recorded')+'</td>'+
     '<td class="mega-number">'+(recorded?moneyCents(m.withdrawalsCents):'Not recorded')+'</td>'+
     '<td class="mega-number">'+(recorded?signedMoneyCents(m.netCents):'Not recorded')+'</td>'+
     '<td class="mega-number">'+(recorded?number(m.eventCount):'—')+'</td></tr>';
 }).join(''):'<tr><td colspan="6">No confirmed team members or bank transactions have been captured yet.</td></tr>';
 const last=team.detailObservedAt;
 const events=team.events.length?team.events.map(e=>'<tr><td>'+esc(e.displayTime)+'</td>'+
   '<td>'+playerName(e.gamertag,byName.get(e.gamertag.toLowerCase()))+'</td>'+
   '<td>'+esc(e.kind==='deposit'?'Deposit':'Withdrawal')+'</td>'+
   '<td class="mega-number">'+moneyCents(e.amountCents)+'</td></tr>').join(''):
   '<tr><td colspan="4">No visible bank events recorded yet.</td></tr>';
 return shell(ctx,team.name+' · MegaSMP',
  '<div class="mega-top-page">'+header+
  '<div class="mega-top-actions"><a class="btn btn-outline" href="/mega-team/leaderboard">'+
    icon('arrow-left',{size:17})+' Top 10 leaderboard</a>'+
    (team.id===MEGA_TEAM_ID?'<a class="btn btn-primary" href="/mega-team">SBsxScam full dashboard</a>':'')+
    '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="'+attr(team.url)+'">'+
    icon('external-link',{size:17})+' Official InPvP team</a>'+
    (ctx.role==='owner'?'<a class="btn btn-outline" href="/mega-team/links">Link player profiles</a>':'')+
   '</div>'+
   '<p class="mega-top-notice">Team details last captured: '+esc(date(last))+
   (team.detailError?' · Last collection warning: '+esc(team.detailError):'')+
   '. Contribution amounts reflect only observed events, not verified lifetime totals.</p>'+
   tiles+
   '<section class="mega-section"><div class="mega-section-head"><h3>Players and contributions</h3>'+
   '<p>Click a Minecraft name to open its linked website profile when the owner has associated an account.</p></div>'+
   '<div class="table-wrap panel"><table class="mega-table"><thead><tr>'+
   '<th>MINECRAFT PLAYER</th><th>ROLE</th><th>OBSERVED DEPOSITS</th><th>OBSERVED WITHDRAWALS</th><th>OBSERVED NET</th><th>EVENTS</th>'+
   '</tr></thead><tbody>'+players+'</tbody></table></div></section>'+
   '<section class="mega-section"><div class="mega-section-head"><h3>Observed bank activity</h3>'+
   '<p>Read-only transactions from this team’s visible InPvP Bank Event Log; partial history.</p></div>'+
   '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>DISPLAYED TIME</th>'+
   '<th>PLAYER</th><th>TYPE</th><th>AMOUNT</th></tr></thead><tbody>'+events+
   '</tbody></table></div></section></div>');
}

export function megaProfileLinksPage(ctx,{q='',player='',results=[],links=[],error=''}={}){
 const options=results.map(m=>{
   const id=String(m.user?.id||'');
   if(!/^\d{15,22}$/.test(id)||m.user?.bot||m.pending)return '';
   return '<option value="'+attr(id)+'">'+esc(m.nick||m.user?.global_name||m.user?.username||id)+
     ' (@'+esc(m.user?.username||id)+')</option>';
 }).join('');
 const rows=links.length?links.map(link=>{
   const global=link.source==='owner';
   return '<tr><td>'+esc(link.gamertag)+'</td><td><a href="/u/'+attr(link.discordId)+'">'+
     '@'+esc(link.username||link.displayName||link.discordId)+'</a></td>'+
     '<td>'+esc(global?'Owner-linked (global)':'Existing season match')+'</td>'+
     '<td>'+(global?'<form method="post" action="/mega-team/links">'+token(ctx)+
       '<input type="hidden" name="gamertag" value="'+attr(link.gamertag)+'">'+
       '<input type="hidden" name="mode" value="unlink">'+
       '<button type="submit" class="btn btn-outline btn-sm">Unlink</button></form>':
       '<a href="/team/mega/matches" class="quiet-link">Manage season match</a>')+'</td></tr>';
 }).join(''):'<tr><td colspan="4">No Minecraft accounts linked to website profiles.</td></tr>';
 return shell(ctx,'Minecraft Profile Links',titlebar('OWNER TOOLS',
   'Minecraft ↔ <span class="gradient">Discord profiles.</span>',
   'Match an in-game username to a verified Discord member. Links do not prove Minecraft ownership or grant roles.')+
   '<div class="mega-top-page"><div class="mega-top-actions">'+
   '<a class="btn btn-outline" href="/mega-team">'+icon('arrow-left',{size:17})+' MegaSMP dashboard</a></div>'+
   (error?'<p class="alert alert-error">'+esc(error)+'</p>':'')+
   '<form method="get" action="/mega-team/links" class="panel padded mega-top-link-form">'+
   '<label>In-game name<input name="player" value="'+attr(player)+'" maxlength="32" placeholder="Minecraft Gamertag"></label>'+
   '<label>Find server profile by Discord username or ID<input name="q" value="'+attr(q)+'" maxlength="64" placeholder="Search Discord members" required></label>'+
   '<button class="btn btn-outline" type="submit">Search verified members</button></form>'+
   '<form method="post" action="/mega-team/links" class="panel padded mega-top-link-form">'+token(ctx)+
   '<h3>Attach a Discord profile</h3>'+
   '<input type="hidden" name="mode" value="link">'+
   '<label>Minecraft Gamertag<input name="gamertag" value="'+attr(player)+'" maxlength="32" required placeholder="e.g. SBisOnTop"></label>'+
   '<label>Verified Discord account<select name="discord_user_id" required>'+
   (options||'<option value="">Search for a Discord member above</option>')+'</select></label>'+
   '<button class="btn btn-primary" type="submit"'+(options?'':' disabled')+'>'+
   icon('user-round-check',{size:17})+' Save profile association</button>'+
   '<p class="muted tiny">Only the verified website owner/co-owners can change these links. Every change is audited. Do not interpret an owner-entered link as external account verification.</p></form>'+
   '<section class="mega-section"><h3>Linked Minecraft accounts</h3>'+
   '<div class="table-wrap panel"><table class="mega-table"><thead><tr>'+
   '<th>GAMERTAG</th><th>DISCORD PROFILE</th><th>SOURCE</th><th>ACTION</th>'+
   '</tr></thead><tbody>'+rows+'</tbody></table></div></section></div>');
}
