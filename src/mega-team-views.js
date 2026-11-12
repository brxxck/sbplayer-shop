// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Team financial reports distinguish confirmed source totals from manually entered records.
import {esc,avatar,token} from './views.js';
const attr=esc; // Escape every attribute value before it enters markup.
import {icon} from './icons.js';

const fmtMoney=v=>v===null||v===undefined?'—':'$'+Number(v).toLocaleString('en-US');
const fmtShort=v=>v===null||v===undefined?'—':'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v);
const date=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not available';
const sourceLabel=key=>key==='authorized_feed'?'Authorized feed':key==='manual_import'?'Submitted snapshot':key==='manual'?'Recorded manually':'Not recorded';
const moneyCell=v=>v===null?'<span class="mega-unknown">Not recorded</span>':fmtMoney(v);
const summaryCard=(key,label,amount,detail,iconName)=>'<div class="mega-stat panel">'+
 '<div class="mega-stat-label">'+icon(iconName,{size:20})+' '+label+'</div>'+
 '<strong data-mega-value="'+key+'">'+fmtShort(amount)+'</strong>'+
 '<small>'+detail+'</small></div>';
function memberRow(m){
 return '<tr><td><span class="mega-player">'+icon(m.role==='Leader'?'crown':'user-round',{size:17})+
  '<b>'+esc(m.gamertag)+'</b>'+(m.status==='former'?'<span class="mega-former">Former</span>':'')+
  '</span><small>'+esc(m.role)+' · '+esc(sourceLabel(m.source))+'</small></td>'+
 '<td class="mega-number">'+moneyCell(m.deposits)+'</td>'+
 '<td class="mega-number">'+moneyCell(m.withdrawals)+'</td>'+
 '<td class="mega-number">'+moneyCell(m.net)+'</td></tr>';
}
const leaderboard=(members,field='deposits')=>members.filter(m=>m.status==='active').sort((a,b)=>{
 const x=b[field]??-1,y=a[field]??-1;
 return x-y||a.gamertag.localeCompare(b.gamertag);
}).map((m,i)=>'<tr><td class="mega-rank">#'+(i+1)+'</td><td>'+esc(m.gamertag)+'</td>'+
 '<td class="mega-number">'+moneyCell(m[field])+'</td></tr>').join('');
function discordRoster(groups,restricted){
 const seen=new Set(),members=groups.flatMap(g=>g.members).filter(m=>{
  if(!m.id||seen.has(m.id))return false;seen.add(m.id);return true;
 });
 return '<section class="mega-section" id="mega-discord-roster"><div class="mega-section-head"><div><h3>Discord team roster</h3>'+
 '<p>These accounts have SBs team Discord roles. This does not verify in-game membership or a Minecraft Gamertag.</p></div>'+
 '<span class="mega-muted">'+members.length+' Discord accounts</span></div>'+
 (members.length?'<div class="mega-discord-grid">'+members.map(m=>{
  const profile=restricted?'<div class="mega-discord-member">':'<a class="mega-discord-member" href="/u/'+attr(m.id)+'">';
  const end=restricted?'</div>':'</a>';
  return profile+avatar(m,'sm',true)+'<span><b>'+esc(m.nickname||m.display_name||m.username)+'</b><small>@'+esc(m.username)+'</small></span>'+end;
 }).join('')+'</div>':'<p class="muted">No Discord team roles are currently visible.</p>')+'</section>';
}
function manager(ctx,data){
 const members=data.members.filter(m=>m.status==='active'),season=data.season.season;
 const csrf=token(ctx);
 const options=members.map(m=>'<option value="'+m.id+'">'+esc(m.gamertag)+'</option>').join('');
 const base='<input type="hidden" name="season" value="'+attr(season)+'">';
 const edit='<section class="mega-section mega-manager" id="mega-manage"><div class="mega-section-head"><div>'+
   '<h3>Team management</h3><p>Administrative records are labelled as manual until a permitted source confirms them.</p></div>'+
   '<span class="mega-source-badge">Admin only</span></div>'+
   '<div class="mega-manager-grid">'+
   '<form class="panel padded" method="post" action="/team/mega/roster">'+csrf+base+
    '<h4>Add / update players</h4><label>Minecraft Gamertags (one per line)<textarea name="gamertags" maxlength="3000" rows="4" required placeholder="ExamplePlayer123&#10;AnotherPlayer"></textarea></label>'+
    '<label>Role<select name="role"><option>Member</option><option>Officer</option><option>Leader</option></select></label>'+
    '<button class="btn btn-primary" type="submit">'+icon('user-round-plus',{size:17})+' Save roster</button></form>'+
   '<form class="panel padded" method="post" action="/team/mega/transaction">'+csrf+base+
    '<h4>Record a contribution</h4><label>Team member<select name="member_id" required>'+options+'</select></label>'+
    '<label>Type<select name="kind"><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option></select></label>'+
    '<label>Amount<input name="amount" type="number" min="1" max="1000000000000000" step="1" required placeholder="1000000"></label>'+
    '<label>Optional note<input name="notes" maxlength="240" placeholder="Confirmed in-game deposit"></label>'+
    '<button class="btn btn-primary" type="submit" '+(members.length?'':'disabled')+'>'+icon('plus',{size:17})+' Record contribution</button></form>'+
   '<form class="panel padded" method="post" action="/team/mega/bank">'+csrf+base+
    '<h4>Reported bank balance</h4><label>Balance<input name="balance" type="number" min="0" max="1000000000000000" step="1" required></label>'+
    '<p class="muted tiny">Bank balance is separate from lifetime deposits and withdrawals.</p>'+
    '<button class="btn btn-outline" type="submit">'+icon('wallet',{size:17})+' Save balance</button></form></div>';
 const owner=ctx.role==='owner'?'<form class="panel padded mega-season-form" method="post" action="/team/mega/season">'+csrf+
  '<h4>Start a new season</h4><label>New season name<input name="label" minlength="2" maxlength="45" required placeholder="Season 4 — November 2026"></label>'+
  '<p class="muted tiny">Keeps the previous season and all contributions archived.</p>'+
  '<button class="btn btn-outline" type="submit">'+icon('calendar-days',{size:17})+' Create season</button></form>':'';
 const sample={team_id:data.teamId,season,updated_at:'2026-11-12T20:00:00Z',complete_roster:true,bank_balance:null,
    members:[{gamertag:'ExamplePlayer',role:'Member',active:true,deposits:null,withdrawals:null}]};
 const importForm='<details class="panel padded mega-import"><summary>Import a permitted structured data snapshot</summary>'+
  '<p class="muted tiny">This is an owner-supplied import; it is not a live InPvP connection. Existing cumulative totals for those players will be replaced, not added to your manual ledger.</p>'+
  '<form method="post" action="/team/mega/import">'+csrf+base+
  '<label>JSON export<textarea name="snapshot" rows="7" maxlength="100000" required placeholder="'+attr(JSON.stringify(sample,null,2))+'"></textarea></label>'+
  '<button class="btn btn-outline" type="submit">'+icon('upload',{size:17})+' Import snapshot</button></form></details>';
 return edit+owner+importForm+'</section>';
}
export function megaTeamPanel(ctx,{data,discordGroups=[],syncEnabled=false}){
 const admin=['owner','admin'].includes(ctx.role),restricted=ctx.role==='appeal-only';
 const full=data.members.filter(m=>m.status==='active');
 const sourceUpdated=data.sync.last_source_at||0;
 const stale=syncEnabled&&sourceUpdated&&(Date.now()-sourceUpdated>15*60000);
 const syncLabel=!syncEnabled?'No authorized live feed configured':!data.sync.last_success?'Awaiting first authorized sync':
   stale?'Source outdated — showing last saved values':'Authorized feed last synced '+date(data.sync.last_success);
 const coverage=data.totals.withBoth+'/'+data.totals.activeMembers+' members have both totals';
 const stateLabel=data.totals.missing?'Partial totals · '+coverage:'Complete recorded roster coverage · '+coverage;
 const seasons=data.seasons.map(s=>'<option value="'+attr(s.season)+'" '+(s.season===data.season.season?'selected':'')+'>'+esc(s.label)+'</option>').join('');
 const rank=leaderboard(data.members);
 const summary='<section class="mega-stats" aria-label="MegaSMP financial summary">'+
  summaryCard('balance','Reported team bank',data.bank?.balance??null,'From '+esc(sourceLabel(data.bank?.source)),'wallet')+
  summaryCard('deposits','Known deposits',data.totals.deposited,'Partial if some players lack records','arrow-down-to-line')+
  summaryCard('withdrawals','Known withdrawals',data.totals.withdrawn,'Partial if some players lack records','arrow-up-from-line')+
  summaryCard('net','Net recorded contributions',data.totals.net,'Deposits minus withdrawals','chart-no-axes-combined')+
  '</section>';
 const rows=data.members.length?data.members.map(memberRow).join(''):'<tr><td colspan="4">No in-game roster imported yet. Team admins can add Gamertags or import an authorized snapshot.</td></tr>';
 const history=data.transactions.map(t=>'<tr><td>'+date(t.occurred_at)+'</td><td>'+esc(t.gamertag)+'</td>'+
  '<td><span class="mega-'+t.kind+'">'+(t.kind==='deposit'?'Deposit':'Withdrawal')+'</span></td>'+
  '<td class="mega-number">'+fmtMoney(t.amount)+'</td></tr>').join('')||
  '<tr><td colspan="4">No individually recorded transactions. Imported cumulative totals do not include transaction dates.</td></tr>';
 return '<div class="mega-dashboard" data-mega-dashboard data-season="'+attr(data.season.season)+'">'+
  '<section class="mega-hero panel"><div class="mega-hero-heading"><div>'+
  '<span class="eyebrow">'+icon('shield-check',{size:17})+' MEGASMP TEAM</span>'+
  '<h2>SBsxScam <span>dashboard</span></h2>'+
  '<p>Track the game roster, recorded contributions, withdrawals and season history.</p></div>'+
  '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="'+attr(data.teamUrl)+'">'+
  icon('external-link',{size:17})+' Official InPvP team page</a></div>'+
  '<div class="mega-status-line"><span data-mega-syncstatus>'+esc(syncLabel)+'</span>'+
  '<span data-mega-updated>Latest known source: '+date(sourceUpdated||data.bank?.as_of)+'</span></div>'+
  '<p class="mega-disclaimer">Financial figures are recorded or imported values, not independently verified live transactions. Missing values remain unreported. Refreshing this page does not scrape InPvP.</p>'+
  '</section>'+
  '<div class="mega-toolbar"><form method="get" action="/team" class="mega-season-select">'+
  '<input type="hidden" name="tab" value="mega"><label>Season <select name="season" onchange="this.form.requestSubmit()">'+seasons+'</select></label></form>'+
  '<button class="btn btn-outline btn-sm" type="button" data-mega-refresh>'+icon('refresh-cw',{size:17})+' Refresh displayed data</button>'+
  '<span class="mega-muted" data-mega-timestamp aria-live="polite"></span></div>'+
  summary+'<div class="mega-coverage" data-mega-coverage>'+icon('info',{size:17})+' '+esc(stateLabel)+'</div>'+
  '<nav class="mega-section-links" aria-label="MegaSMP dashboard sections"><a href="#mega-members">Members</a>'+
  '<a href="#mega-leaderboard">Leaderboard</a><a href="#mega-bank-history">Bank activity</a>'+
  '<a href="#mega-discord-roster">Discord members</a></nav>'+
  '<section class="mega-section" id="mega-members"><div class="mega-section-head"><div><h3>In-game team roster</h3>'+
  '<p>Player Gamertags from recorded or imported data. Discord role holders are listed separately.</p></div>'+
  '<span class="mega-source-badge"><span data-mega-count>'+full.length+'</span> recorded</span></div>'+
  '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>PLAYER</th><th>DEPOSITED</th><th>WITHDRAWN</th><th>NET</th></tr></thead>'+
  '<tbody data-mega-rows>'+rows+'</tbody></table></div></section>'+
  '<section class="mega-section" id="mega-leaderboard"><div class="mega-section-head"><div><h3>Contribution leaderboard</h3>'+
  '<p>Ranked by known cumulative deposits. Players with missing data appear last.</p></div></div>'+
  '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>RANK</th><th>GAMERTAG</th><th>DEPOSITED</th></tr></thead>'+
  '<tbody data-mega-leaderboard>'+rank+'</tbody></table></div></section>'+
  '<section class="mega-section" id="mega-bank-history"><div class="mega-section-head"><div><h3>Recorded bank activity</h3>'+
  '<p>Owner-entered transaction records (not a complete InPvP transaction history).</p></div></div>'+
  '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>DATE</th><th>PLAYER</th><th>TYPE</th><th>AMOUNT</th></tr></thead>'+
  '<tbody data-mega-history>'+history+'</tbody></table></div></section>'+
  discordRoster(discordGroups,restricted)+(admin&&data.season.season===data.activeSeason?manager(ctx,data):'')+'</div>';
}
