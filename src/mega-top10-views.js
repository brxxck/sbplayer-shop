// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Standalone MegaSMP UI. Source-unverified and missing fields are clearly
// labeled instead of manufacturing complete team or player statistics.
import {shell,titlebar,esc,token} from './views.js';
import {icon} from './icons.js';
import {MEGA_TEAM_ID} from './mega-team.js';
const attr=esc;
const date=ms=>ms?new Date(ms).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not yet verified';
export function teamBankText(team){
 if(team&&typeof team.bankText==='string'&&/^\$[\d,]+(?:\.\d{1,3})?[KMBT]?$/i.test(team.bankText))
  return team.bankText;
 if(team&&Number.isSafeInteger(team.bankCents)&&team.bankCents>=0)
  return '$'+(team.bankCents/100).toLocaleString('en-US',
   {minimumFractionDigits:2,maximumFractionDigits:2});
 return null;
}
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
  '<td class="mega-number">'+esc(teamBankText(t)||'Not available')+
    (t.approximate&&teamBankText(t)?'<small>Rounded by InPvP</small>':'')+'</td>'+
  '<td><a href="'+attr(t.url)+'" target="_blank" rel="noopener noreferrer" class="quiet-link">InPvP ↗</a></td>'+
  '</tr>').join('')||'<tr><td colspan="4">No current team listing available.</td></tr>';
}
const statusText=listing=>'<div class="mega-top-status">'+
 '<span>'+esc(lastLabel(listing))+'</span>'+
 '<span>Last source check: '+esc(date(listing.status.last_success))+'</span>'+
 (listing.status.last_error?'<span>Collector notice: '+esc(listing.status.last_error)+'</span>':'')+
 '</div>';
function topTable(listing){
 return '<div class="table-wrap panel"><table class="mega-table mega-top-table">'+
   '<thead><tr><th>PLACE</th><th>TEAM</th><th>TEAM BANK</th><th>OFFICIAL PAGE</th></tr></thead>'+
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
   'Latest team placements, reported bank balances and all currently visible player names.');
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
  '<p class="muted tiny">Rankings are checked every minute when collection is enabled. Team member lists are checked separately, one team at a time. Unavailable player names are not guessed.</p>'+
  '</div>');
}
function playerName(name,linked){
 if(linked&&/^\d{15,22}$/.test(String(linked.discordId)))
  return '<a class="mega-top-team-link" href="/u/'+attr(linked.discordId)+'" title="Open linked Discord profile">'+
    icon('user-round-check',{size:15})+' '+esc(name)+'</a>';
 return '<strong>'+esc(name)+'</strong>';
}
export function megaTeamDetailsPage(ctx,{team,links=[]}){
 const byName=new Map(links.map(link=>[link.gamertag.toLowerCase(),link]));
 const rank=team.rank&&Date.now()-team.rankObservedAt<=15*60000?'#'+team.rank:
   team.rank?'#'+team.rank+' (last captured)':'Position unverified';
 const header=titlebar('MEGASMP TEAM',
    esc(team.name)+' <span class="gradient">players.</span>',
    'Team bank balance and member names captured from the official InPvP team page.');
 const roster=team.members.filter(m=>m.rosterObserved);
 const memberRows=roster.map(m=>{
   const linked=byName.get(m.gamertag.toLowerCase());
   return '<tr><td>'+playerName(m.gamertag,linked)+'</td></tr>';
 }).join('');
 const total=Number.isSafeInteger(team.memberCount)&&team.memberCount>=0?
   team.memberCount:null;
 const captured=roster.length;
 const complete=!!team.rosterComplete&&total!==null&&captured===total;
 const sourceBank=teamBankText(team);
 const bank='<div class="mega-top-kpis">'+
   '<div class="mega-stat panel"><span class="mega-stat-label">Team bank balance</span>'+
     '<strong>'+esc(sourceBank||'Not available')+'</strong>'+
     (team.approximate&&sourceBank?'<small>Rounded by InPvP</small>':'')+'</div>'+
   '<div class="mega-stat panel"><span class="mega-stat-label">Top 10 placement</span>'+
     '<strong>'+esc(rank)+'</strong></div>'+
   '</div>';
 const progress=total!==null?
   (complete?'All '+total+' member names captured':
     captured+' of '+total+' reported member names captured'+
      (captured?' · partial list':'')):
   (captured+' player names captured · total membership unverified');
 const rosterDate=team.rosterObservedAt|| (captured?team.detailObservedAt:0);
 const playerSection=roster.length?
   '<div class="table-wrap panel"><table class="mega-table">'+
   '<thead><tr><th>MINECRAFT PLAYER</th></tr></thead>'+
   '<tbody>'+memberRows+'</tbody></table></div>':
   '<p class="mega-top-notice">InPvP has not exposed the player names for this team to the website collector yet. You can view the official team page while collection continues.</p>';
 return shell(ctx,team.name+' · MegaSMP',
  '<div class="mega-top-page">'+header+
  '<div class="mega-top-actions"><a class="btn btn-outline" href="/mega-team/leaderboard">'+
   icon('arrow-left',{size:17})+' Top 10 leaderboard</a>'+
   (team.id===MEGA_TEAM_ID?'<a class="btn btn-primary" href="/mega-team">SBsxScam full bank dashboard</a>':'')+
   '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="'+attr(team.url)+'">'+
   icon('external-link',{size:17})+' Official InPvP team</a>'+
   (ctx.role==='owner'?'<a class="btn btn-outline" href="/mega-team/links">Link player profiles</a>':'')+
   '</div>'+bank+
   '<section class="mega-section"><div class="mega-section-head"><h3>Team members</h3>'+
   '<p>'+esc(progress)+' · Last names captured: '+esc(date(rosterDate))+
   '. Click a linked name to open its Discord website profile.</p></div>'+
   (!complete&&captured?'<p class="mega-top-notice">The saved player list may be incomplete or outdated. It will be refreshed as more member pages become visible on InPvP.</p>':'')+
   playerSection+'</section></div>');
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
