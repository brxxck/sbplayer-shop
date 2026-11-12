// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Server-rendered, paginated bank history and owner-only Discord matching UI.
import {shell,titlebar,token,esc} from './views.js';
import {icon} from './icons.js';
const attr=esc;
const fmt=amount=>{
 if(amount===null||amount===undefined)return 'Not recorded';
 const raw=String(amount);
 if(!/^\d+(?:\.\d{2})?$/.test(raw))return 'Not recorded';
 const [whole,cents='00']=raw.split('.');
 return '
const time=ms=>ms?new Date(ms).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Never';
const link=(path,fields)=>path+'?'+new URLSearchParams(fields).toString();

function pager(data){
 const {page,pages,season,kind,player}=data;
 const params={season,page:1,kind,player};
 const item=(target,label,disabled)=>{
   const href=link('/team/mega/history',{...params,page:target});
   return disabled?'<span class="mega-page-disabled">'+label+'</span>':
     '<a class="btn btn-outline btn-sm" href="'+attr(href)+'">'+label+'</a>';
 };
 return '<nav class="mega-history-pages" aria-label="Bank history pagination">'+
   item(Math.max(1,page-1),'Previous',!data.hasPrevious)+
   '<span>Page '+page+' of '+pages+' · '+data.total.toLocaleString('en-US')+' matching events</span>'+
   item(Math.min(pages,page+1),'Next',!data.hasNext)+'</nav>';
}
function memberLink(row){
 const player='<a href="'+attr(link('/team/mega/history',{season:row.season||'current',player:row.gamertag}))+
   '" class="mega-history-gamertag">'+esc(row.gamertag)+'</a>';
 const discord=row.discordId?
   '<a href="/u/'+attr(row.discordId)+'" class="mega-matched-discord">'+
   icon('user-round-check',{size:15})+' @'+esc(row.discordUsername||row.discordName||row.discordId)+'</a>':
   '<span class="mega-history-unmatched">Discord not matched</span>';
 return '<span class="mega-history-person">'+player+discord+'</span>';
}
export function megaHistoryPage(ctx,data){
 const seasons=data.seasons||[];
 const seasonOptions=seasons.map(s=>'<option value="'+attr(s.season)+'"'+
   (s.season===data.season?' selected':'')+'>'+esc(s.label)+'</option>').join('');
 const players=data.players.map(name=>'<option value="'+attr(name)+'"'+
   (name.toLowerCase()===data.player.toLowerCase()?' selected':'')+'>'+esc(name)+'</option>').join('');
 const kindOptions=[['all','All events'],['deposit','Deposits'],['withdrawal','Withdrawals']]
   .map(([value,label])=>'<option value="'+value+'"'+(data.kind===value?' selected':'')+'>'+label+'</option>').join('');
 const coverage=data.coverage==='source_declared_complete'?
   'Source marked the available event history as complete; verify the source range before claiming lifetime totals.':
   'PARTIAL / UNVERIFIED HISTORY — all saved events are browsable, but InPvP may hide older records.';
 const count=data.totals.totalEvents;
 const totals='<div class="mega-history-kpis">'+
  '<div class="mega-history-kpi"><span>Captured bank events</span><strong>'+count.toLocaleString('en-US')+'</strong></div>'+
  '<div class="mega-history-kpi"><span>Observed deposits</span><strong>'+fmt(data.totals.deposited)+'</strong></div>'+
  '<div class="mega-history-kpi"><span>Observed withdrawals</span><strong>'+fmt(data.totals.withdrawn)+'</strong></div>'+
  '</div>';
 const entries=data.rows.length?data.rows.map(row=>{
  const line={...row,season:data.season};
  const label=row.kind==='deposit'?'Deposit':'Withdrawal';
  return '<tr><td><strong>'+esc(row.displayTime||time(row.occurredAt))+'</strong>'+
   '<small>'+esc(row.timePrecision==='exact'?'Source timestamp':'Displayed time (timezone unverified)')+'</small></td>'+
   '<td>'+memberLink(line)+'</td>'+
   '<td><span class="mega-'+row.kind+'">'+label+'</span></td>'+
   '<td class="mega-number">'+fmt(row.amount)+'</td>'+
   '<td><span class="mega-source-label">'+(row.identity==='provider'?'Provider event ID':'Provisional row identity')+'</span></td></tr>';
 }).join(''):'<tr><td colspan="5">No captured bank events match these filters.</td></tr>';
 const filter='<form method="get" action="/team/mega/history" class="mega-history-filters">'+
  '<label>Season<select name="season">'+seasonOptions+'</select></label>'+
  '<label>Player<select name="player"><option value="">All players</option>'+players+'</select></label>'+
  '<label>Type<select name="kind">'+kindOptions+'</select></label>'+
  '<button class="btn btn-outline" type="submit">'+icon('search',{size:17})+' Filter</button></form>';
 const owner=ctx.role==='owner'?
  '<a class="btn btn-primary" href="'+attr(link('/team/mega/matches',{season:data.season}))+'">'+
  icon('user-round-check',{size:17})+' Match Minecraft and Discord</a>':'';
 const body=titlebar('MEGASMP BANK HISTORY','Captured <span class="gradient">transactions.</span>',
   'Every saved Bank Event Log entry, including older pages — no 100-event display cap.')+
   '<div class="mega-history-container"><div class="mega-history-actions">'+
   '<a class="btn btn-outline" href="'+attr(link('/team',{tab:'mega',season:data.season}))+'">'+
   icon('arrow-left',{size:17})+' Team dashboard</a>'+owner+'</div>'+
   '<div class="mega-history-alert" role="status">'+icon('triangle-alert',{size:18})+' '+
   esc(coverage)+'</div>'+
   '<p class="muted tiny">Last successful capture: '+time(data.status?.last_success)+
   '. Captured-order pages may not be strictly chronological when InPvP only exposes displayed timestamps. This event log is separate from manually recorded contributions; totals are not added together.</p>'+
   totals+filter+
   '<div class="table-wrap panel"><table class="mega-table mega-history-table"><thead><tr>'+
   '<th>DISPLAYED TIME</th><th>MINECRAFT / DISCORD</th><th>TYPE</th><th>AMOUNT</th><th>IDENTITY</th>'+
   '</tr></thead><tbody>'+entries+'</tbody></table></div>'+
   pager(data)+'</div>';
 return shell(ctx,'MegaSMP Bank History',body);
}
export function megaMatchesPage(ctx,{season,seasonLabel,players=[],matches=[],q='',results=[],preselected='',error='' }){
 const selected=players.includes(preselected)?preselected:'';
 const current=new Map(matches.map(m=>[m.gamertag.toLowerCase(),m]));
 const options=players.map(gamertag=>{
   const existing=current.get(gamertag.toLowerCase());
   return '<option value="'+attr(gamertag)+'"'+(selected.toLowerCase()===gamertag.toLowerCase()?' selected':'')+'>'+
     esc(gamertag)+(existing?' (currently linked)':'')+'</option>';
 }).join('');
 const found=results.map(member=>{
  const id=String(member.user?.id||''),u=member.user||{};
  if(!/^\d{15,22}$/.test(id)||u.bot||member.pending)return '';
  const label=(member.nick||u.global_name||u.username||'Unknown')+' (@'+(u.username||id)+')';
  return '<option value="'+attr(id)+'">'+esc(label)+'</option>';
 }).join('');
 const search='<form method="get" action="/team/mega/matches" class="mega-history-filters">'+
   '<input type="hidden" name="season" value="'+attr(season)+'">'+
   (selected?'<input type="hidden" name="gamertag" value="'+attr(selected)+'">':'')+
   '<label>Find a Discord member<input name="q" minlength="2" maxlength="64" value="'+attr(q)+
   '" placeholder="Search Discord username or paste user ID"></label>'+
   '<button class="btn btn-outline" type="submit">'+icon('search',{size:17})+' Search Discord</button></form>';
 const linkForm='<form method="post" action="/team/mega/match" class="mega-match-form panel padded">'+token(ctx)+
   '<input type="hidden" name="season" value="'+attr(season)+'">'+
   '<input type="hidden" name="mode" value="link">'+
   '<h3>Link a Minecraft player</h3>'+
   '<label>Minecraft Gamertag<select name="gamertag" required>'+options+'</select></label>'+
   '<label>Verified Discord member<select name="discord_user_id" required>'+
   (found||'<option value="">Search for a member first</option>')+'</select></label>'+
   '<button class="btn btn-primary" type="submit"'+(found&&options?'':' disabled')+'>'+
   icon('user-round-check',{size:18})+' Save account match</button>'+
   '<p class="muted tiny">One Minecraft Gamertag can link to one Discord user; the same Discord user may own multiple Minecraft accounts. This is an owner-entered match, not proof of game-account ownership.</p></form>';
 const rows=matches.length?matches.map(m=>'<tr><td>'+esc(m.gamertag)+'</td>'+
   '<td><a href="/u/'+attr(m.discordId)+'">@'+esc(m.username||m.displayName||m.discordId)+'</a></td>'+
   '<td>'+time(m.linkedAt)+'</td><td>'+
   '<form method="post" action="/team/mega/match">'+token(ctx)+
   '<input type="hidden" name="season" value="'+attr(season)+'">'+
   '<input type="hidden" name="gamertag" value="'+attr(m.gamertag)+'">'+
   '<input type="hidden" name="mode" value="unlink">'+
   '<button class="btn btn-outline btn-sm" type="submit">Unlink</button></form></td></tr>'
 ).join(''):'<tr><td colspan="4">No account matches recorded for this season yet.</td></tr>';
 const body=titlebar('OWNER TOOLS','Minecraft ↔ <span class="gradient">Discord.</span>',
   'Match captured Gamertags to verified Discord server members. Every change is audited.')+
   '<div class="mega-history-container">'+
   '<a class="btn btn-outline" href="'+attr(link('/team/mega/history',{season}))+'">'+
   icon('arrow-left',{size:17})+' Bank event history</a>'+
   '<div class="mega-history-alert">Season: '+esc(seasonLabel)+
   '. Only verified guild members can be matched. Links never grant any role or access.</div>'+
   (error?'<p class="alert alert-error">'+esc(error)+'</p>':'')+
   search+linkForm+
   '<section class="mega-section"><div class="mega-section-head"><h3>Current matches</h3>'+
   '<small>'+matches.length+' recorded</small></div>'+
   '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>MINECRAFT</th><th>DISCORD</th><th>LINKED</th><th>ACTION</th></tr></thead><tbody>'+
   rows+'</tbody></table></div></section></div>';
 return shell(ctx,'Minecraft & Discord Account Matches',body);
}
+whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+cents;
};
const time=ms=>ms?new Date(ms).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Never';
const link=(path,fields)=>path+'?'+new URLSearchParams(fields).toString();

function pager(data){
 const {page,pages,season,kind,player}=data;
 const params={season,page:1,kind,player};
 const item=(target,label,disabled)=>{
   const href=link('/team/mega/history',{...params,page:target});
   return disabled?'<span class="mega-page-disabled">'+label+'</span>':
     '<a class="btn btn-outline btn-sm" href="'+attr(href)+'">'+label+'</a>';
 };
 return '<nav class="mega-history-pages" aria-label="Bank history pagination">'+
   item(Math.max(1,page-1),'Previous',!data.hasPrevious)+
   '<span>Page '+page+' of '+pages+' · '+data.total.toLocaleString('en-US')+' matching events</span>'+
   item(Math.min(pages,page+1),'Next',!data.hasNext)+'</nav>';
}
function memberLink(row){
 const player='<a href="'+attr(link('/team/mega/history',{season:row.season||'current',player:row.gamertag}))+
   '" class="mega-history-gamertag">'+esc(row.gamertag)+'</a>';
 const discord=row.discordId?
   '<a href="/u/'+attr(row.discordId)+'" class="mega-matched-discord">'+
   icon('user-round-check',{size:15})+' @'+esc(row.discordUsername||row.discordName||row.discordId)+'</a>':
   '<span class="mega-history-unmatched">Discord not matched</span>';
 return '<span class="mega-history-person">'+player+discord+'</span>';
}
export function megaHistoryPage(ctx,data){
 const seasons=data.seasons||[];
 const seasonOptions=seasons.map(s=>'<option value="'+attr(s.season)+'"'+
   (s.season===data.season?' selected':'')+'>'+esc(s.label)+'</option>').join('');
 const players=data.players.map(name=>'<option value="'+attr(name)+'"'+
   (name.toLowerCase()===data.player.toLowerCase()?' selected':'')+'>'+esc(name)+'</option>').join('');
 const kindOptions=[['all','All events'],['deposit','Deposits'],['withdrawal','Withdrawals']]
   .map(([value,label])=>'<option value="'+value+'"'+(data.kind===value?' selected':'')+'>'+label+'</option>').join('');
 const coverage=data.coverage==='source_declared_complete'?
   'Source marked the available event history as complete; verify the source range before claiming lifetime totals.':
   'PARTIAL / UNVERIFIED HISTORY — all saved events are browsable, but InPvP may hide older records.';
 const count=data.totals.totalEvents;
 const totals='<div class="mega-history-kpis">'+
  '<div class="mega-history-kpi"><span>Captured bank events</span><strong>'+count.toLocaleString('en-US')+'</strong></div>'+
  '<div class="mega-history-kpi"><span>Observed deposits</span><strong>'+fmt(data.totals.deposited)+'</strong></div>'+
  '<div class="mega-history-kpi"><span>Observed withdrawals</span><strong>'+fmt(data.totals.withdrawn)+'</strong></div>'+
  '</div>';
 const entries=data.rows.length?data.rows.map(row=>{
  const line={...row,season:data.season};
  const label=row.kind==='deposit'?'Deposit':'Withdrawal';
  return '<tr><td><strong>'+esc(row.displayTime||time(row.occurredAt))+'</strong>'+
   '<small>'+esc(row.timePrecision==='exact'?'Source timestamp':'Displayed time (timezone unverified)')+'</small></td>'+
   '<td>'+memberLink(line)+'</td>'+
   '<td><span class="mega-'+row.kind+'">'+label+'</span></td>'+
   '<td class="mega-number">'+fmt(row.amount)+'</td>'+
   '<td><span class="mega-source-label">'+(row.identity==='provider'?'Provider event ID':'Provisional row identity')+'</span></td></tr>';
 }).join(''):'<tr><td colspan="5">No captured bank events match these filters.</td></tr>';
 const filter='<form method="get" action="/team/mega/history" class="mega-history-filters">'+
  '<label>Season<select name="season">'+seasonOptions+'</select></label>'+
  '<label>Player<select name="player"><option value="">All players</option>'+players+'</select></label>'+
  '<label>Type<select name="kind">'+kindOptions+'</select></label>'+
  '<button class="btn btn-outline" type="submit">'+icon('search',{size:17})+' Filter</button></form>';
 const owner=ctx.role==='owner'?
  '<a class="btn btn-primary" href="'+attr(link('/team/mega/matches',{season:data.season}))+'">'+
  icon('user-round-check',{size:17})+' Match Minecraft and Discord</a>':'';
 const body=titlebar('MEGASMP BANK HISTORY','Captured <span class="gradient">transactions.</span>',
   'Every saved Bank Event Log entry, including older pages — no 100-event display cap.')+
   '<div class="mega-history-container"><div class="mega-history-actions">'+
   '<a class="btn btn-outline" href="'+attr(link('/team',{tab:'mega',season:data.season}))+'">'+
   icon('arrow-left',{size:17})+' Team dashboard</a>'+owner+'</div>'+
   '<div class="mega-history-alert" role="status">'+icon('triangle-alert',{size:18})+' '+
   esc(coverage)+'</div>'+
   '<p class="muted tiny">Last successful capture: '+time(data.status?.last_success)+
   '. Captured-order pages may not be strictly chronological when InPvP only exposes displayed timestamps. This event log is separate from manually recorded contributions; totals are not added together.</p>'+
   totals+filter+
   '<div class="table-wrap panel"><table class="mega-table mega-history-table"><thead><tr>'+
   '<th>DISPLAYED TIME</th><th>MINECRAFT / DISCORD</th><th>TYPE</th><th>AMOUNT</th><th>IDENTITY</th>'+
   '</tr></thead><tbody>'+entries+'</tbody></table></div>'+
   pager(data)+'</div>';
 return shell(ctx,'MegaSMP Bank History',body);
}
export function megaMatchesPage(ctx,{season,seasonLabel,players=[],matches=[],q='',results=[],preselected='',error='' }){
 const selected=players.includes(preselected)?preselected:'';
 const current=new Map(matches.map(m=>[m.gamertag.toLowerCase(),m]));
 const options=players.map(gamertag=>{
   const existing=current.get(gamertag.toLowerCase());
   return '<option value="'+attr(gamertag)+'"'+(selected.toLowerCase()===gamertag.toLowerCase()?' selected':'')+'>'+
     esc(gamertag)+(existing?' (currently linked)':'')+'</option>';
 }).join('');
 const found=results.map(member=>{
  const id=String(member.user?.id||''),u=member.user||{};
  if(!/^\d{15,22}$/.test(id)||u.bot||member.pending)return '';
  const label=(member.nick||u.global_name||u.username||'Unknown')+' (@'+(u.username||id)+')';
  return '<option value="'+attr(id)+'">'+esc(label)+'</option>';
 }).join('');
 const search='<form method="get" action="/team/mega/matches" class="mega-history-filters">'+
   '<input type="hidden" name="season" value="'+attr(season)+'">'+
   (selected?'<input type="hidden" name="gamertag" value="'+attr(selected)+'">':'')+
   '<label>Find a Discord member<input name="q" minlength="2" maxlength="64" value="'+attr(q)+
   '" placeholder="Search Discord username or paste user ID"></label>'+
   '<button class="btn btn-outline" type="submit">'+icon('search',{size:17})+' Search Discord</button></form>';
 const linkForm='<form method="post" action="/team/mega/match" class="mega-match-form panel padded">'+token(ctx)+
   '<input type="hidden" name="season" value="'+attr(season)+'">'+
   '<input type="hidden" name="mode" value="link">'+
   '<h3>Link a Minecraft player</h3>'+
   '<label>Minecraft Gamertag<select name="gamertag" required>'+options+'</select></label>'+
   '<label>Verified Discord member<select name="discord_user_id" required>'+
   (found||'<option value="">Search for a member first</option>')+'</select></label>'+
   '<button class="btn btn-primary" type="submit"'+(found&&options?'':' disabled')+'>'+
   icon('user-round-check',{size:18})+' Save account match</button>'+
   '<p class="muted tiny">One Minecraft Gamertag can link to one Discord user; the same Discord user may own multiple Minecraft accounts. This is an owner-entered match, not proof of game-account ownership.</p></form>';
 const rows=matches.length?matches.map(m=>'<tr><td>'+esc(m.gamertag)+'</td>'+
   '<td><a href="/u/'+attr(m.discordId)+'">@'+esc(m.username||m.displayName||m.discordId)+'</a></td>'+
   '<td>'+time(m.linkedAt)+'</td><td>'+
   '<form method="post" action="/team/mega/match">'+token(ctx)+
   '<input type="hidden" name="season" value="'+attr(season)+'">'+
   '<input type="hidden" name="gamertag" value="'+attr(m.gamertag)+'">'+
   '<input type="hidden" name="mode" value="unlink">'+
   '<button class="btn btn-outline btn-sm" type="submit">Unlink</button></form></td></tr>'
 ).join(''):'<tr><td colspan="4">No account matches recorded for this season yet.</td></tr>';
 const body=titlebar('OWNER TOOLS','Minecraft ↔ <span class="gradient">Discord.</span>',
   'Match captured Gamertags to verified Discord server members. Every change is audited.')+
   '<div class="mega-history-container">'+
   '<a class="btn btn-outline" href="'+attr(link('/team/mega/history',{season}))+'">'+
   icon('arrow-left',{size:17})+' Bank event history</a>'+
   '<div class="mega-history-alert">Season: '+esc(seasonLabel)+
   '. Only verified guild members can be matched. Links never grant any role or access.</div>'+
   (error?'<p class="alert alert-error">'+esc(error)+'</p>':'')+
   search+linkForm+
   '<section class="mega-section"><div class="mega-section-head"><h3>Current matches</h3>'+
   '<small>'+matches.length+' recorded</small></div>'+
   '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>MINECRAFT</th><th>DISCORD</th><th>LINKED</th><th>ACTION</th></tr></thead><tbody>'+
   rows+'</tbody></table></div></section></div>';
 return shell(ctx,'Minecraft & Discord Account Matches',body);
}
