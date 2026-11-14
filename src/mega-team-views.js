// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Team financial reports distinguish confirmed source totals from manually entered records.
import {esc,avatar,token} from './views.js';
const attr=esc; // Escape every attribute value before it enters markup.
import {icon} from './icons.js';

const fmtMoney=v=>v===null||v===undefined?'—':'$'+Number(v).toLocaleString('en-US');
const fmtShort=v=>v===null||v===undefined?'—':'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v);
const date=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not available';
const sourceLabel=key=>key==='authorized_feed'?'Authorized feed':key==='manual_import'?'Submitted snapshot':key==='manual'?'Recorded manually':key==='browser_capture'?'InPvP observed':key==='browser_capture_approx'?'Approximate InPvP display':key==='captured_events'?'Observed activity':key==='browser_roster'?'Observed roster':'Not recorded';
const moneyCell=v=>v===null?'<span class="mega-unknown">Not recorded</span>':fmtMoney(v);
const summaryCard=(key,label,amount,detail,iconName)=>'<div class="mega-stat panel">'+
 '<div class="mega-stat-label">'+icon(iconName,{size:20})+' '+label+'</div>'+
 '<strong data-mega-value="'+key+'">'+fmtShort(amount)+'</strong>'+
 '<small>'+detail+'</small></div>';
function memberRow(m,linked){
 const id=linked&&/^\d{15,22}$/.test(String(linked.discordId||''))?linked.discordId:null;
 const playerName=id?'<a class="mega-top-team-link" href="/u/'+attr(id)+'" title="Open linked Discord profile">'+esc(m.gamertag)+'</a>':'<b>'+esc(m.gamertag)+'</b>';
 return '<tr><td><span class="mega-player">'+icon(m.role==='Leader'?'crown':'user-round',{size:17})+
  playerName+(m.status==='former'?'<span class="mega-former">Former</span>':m.status==='observed'?'<span class="mega-former">Observed (not verified roster)</span>':'')+
  '</span><small>'+esc(m.role)+' · '+esc(sourceLabel(m.source))+'</small>'+
 (linked?'<small><a class="mega-matched-discord" href="/u/'+attr(linked.discordId)+'">'+
  icon('user-round-check',{size:15})+' @'+esc(linked.username||linked.displayName||linked.discordId)+'</a></small>':'')+'</td>'+
 '<td class="mega-number">'+moneyCell(m.deposits??m.observedDeposits)+(m.deposits===null&&m.observedDeposits!=null?' <small>Captured only</small>':'')+'</td>'+
 '<td class="mega-number">'+moneyCell(m.withdrawals??m.observedWithdrawals)+'</td>'+
 '<td class="mega-number">'+moneyCell(m.net??m.observedNet)+'</td></tr>';
}
const leaderboard=(members,links,field='deposits')=>members.filter(m=>m.status!=='former'&&
 (m[field]!=null||m.observedDeposits!=null)).sort((a,b)=>{
 const x=Number(b[field]??b.observedDeposits??-1),y=Number(a[field]??a.observedDeposits??-1);
 return x-y||a.gamertag.localeCompare(b.gamertag);
}).map((m,i)=>{
 const linked=links.get(m.gamertag.toLowerCase());
 const name=linked&&/^\d{15,22}$/.test(String(linked.discordId||''))?
  '<a href="/u/'+attr(linked.discordId)+'" class="mega-top-team-link">'+esc(m.gamertag)+'</a>':esc(m.gamertag);
 return '<tr><td class="mega-rank">#'+(i+1)+'</td><td>'+name+
  (m.status==='observed'?'<small>Captured activity only</small>':'')+'</td>'+
  '<td class="mega-number">'+moneyCell(m[field]??m.observedDeposits)+'</td></tr>';
}).join('');
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
    '<button class="btn btn-outline" type="submit">'+icon('wallet',{size:17})+' Save balance</button></form>'+
   '<form class="panel padded" method="post" action="/team/mega/member-status">'+csrf+base+
    '<h4>Member status</h4><label>Team member<select name="member_id" required>'+options+'</select></label>'+
    '<label>Status<select name="status"><option value="former">Former player</option><option value="active">Active player</option></select></label>'+
    '<button class="btn btn-outline" type="submit" '+(members.length?'':'disabled')+'>'+icon('user-round-check',{size:17})+' Update status</button></form></div>';
 const owner=ctx.role==='owner'?'<form class="panel padded mega-season-form" method="post" action="/team/mega/season">'+csrf+
  '<h4>Start a new season</h4><label>New season name<input name="label" minlength="2" maxlength="45" required placeholder="Season 4 — November 2026"></label>'+
  '<p class="muted tiny">Keeps the previous season and all contributions archived.</p>'+
  '<button class="btn btn-outline" type="submit">'+icon('calendar-days',{size:17})+' Create season</button></form>':'';
 const sample={team_id:data.teamId,season,updated_at:new Date().toISOString(),complete_roster:true,bank_balance:null,
    members:[{gamertag:'ExamplePlayer',role:'Member',active:true,deposits:null,withdrawals:null}]};
 const importForm='<details class="panel padded mega-import"><summary>Import a permitted structured data snapshot</summary>'+
  '<p class="muted tiny">This is an owner-supplied import; it is not a live InPvP connection. Existing cumulative totals for those players will be replaced, not added to your manual ledger.</p>'+
  '<form method="post" action="/team/mega/import">'+csrf+base+
  '<label>JSON export<textarea name="snapshot" rows="7" maxlength="100000" required placeholder="'+attr(JSON.stringify(sample,null,2))+'"></textarea></label>'+
  '<button class="btn btn-outline" type="submit">'+icon('upload',{size:17})+' Import snapshot</button></form></details>';
 return edit+owner+importForm+'</section>';
}
export function megaTeamPanel(ctx,{data,discordGroups=[],discordMatches=[],syncEnabled=false}){
 const admin=['owner','admin'].includes(ctx.role),restricted=ctx.role==='appeal-only';
 if(restricted)return '<div class="mega-dashboard"><section class="mega-hero panel"><h2>SBsxScam MegaSMP Team</h2>'+
  '<p>Team bank records and individual contributions are available to verified Discord server members.</p>'+
  '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="'+attr(data.teamUrl)+'">'+icon('external-link',{size:17})+' View public InPvP team page</a></section>'+
  discordRoster(discordGroups,true)+'</div>';
 const full=data.members.filter(m=>m.status==='active');
 const sourceUpdated=data.sync.last_source_at||0;
 const stale=syncEnabled&&sourceUpdated&&(Date.now()-sourceUpdated>15*60000);
 const captureStatus=data.captured?.status||null;
 const captureEnabled=process.env.MEGA_TEAM_BROWSER_AUTO_START==='true'&&process.env.MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED==='true';
 const captureLast=captureStatus?.last_success||0;
 const captureText=captureLast?(Date.now()-captureLast>15*60000?'Browser capture stale: ':'Browser captured: ')+date(captureLast):
  captureEnabled?'Browser collector enabled; awaiting first successful capture':
  'Browser collector not configured';
 const syncLabel=!syncEnabled?'No authorized live feed configured':!data.sync.last_success?'Awaiting first authorized sync':
   stale?'Source outdated — showing last saved values':'Authorized feed last synced '+date(data.sync.last_success);
 const coverage=data.totals.withBoth+'/'+data.totals.recordedMembers+' recorded members have both totals';
 const stateLabel=data.totals.missing?'Partial totals · '+coverage:'Complete recorded roster coverage · '+coverage;
 const seasons=data.seasons.map(s=>'<option value="'+attr(s.season)+'" '+(s.season===data.season.season?'selected':'')+'>'+esc(s.label)+'</option>').join('');
 const linkedByGamertag=new Map(discordMatches.map(link=>[link.gamertag.toLowerCase(),link]));
 const rank=leaderboard(data.members,linkedByGamertag);
 const hasObserved=Number(data.captured?.totalEvents||0)>0;
 const observedDeposits=hasObserved?Number(data.captured.deposited):null;
 const observedWithdrawals=hasObserved?Number(data.captured.withdrawn):null;
 const observedNet=hasObserved&&Number.isFinite(observedDeposits)&&Number.isFinite(observedWithdrawals)?
  observedDeposits-observedWithdrawals:null;
 const sourceHint='Partial observed bank activity; not lifetime contributions';
 const summary='<section class="mega-stats" aria-label="MegaSMP financial summary">'+
  summaryCard('balance','Reported team bank',data.bank?.balance??null,'Source: '+esc(sourceLabel(data.bank?.source)),'wallet')+
  summaryCard('deposits',data.totals.deposited==null?'Observed deposits':'Recorded deposits',
    data.totals.deposited??observedDeposits,data.totals.deposited==null?sourceHint:'Partial if players lack records','arrow-down-to-line')+
  summaryCard('withdrawals',data.totals.withdrawn==null?'Observed withdrawals':'Recorded withdrawals',
    data.totals.withdrawn??observedWithdrawals,data.totals.withdrawn==null?sourceHint:'Partial if players lack records','arrow-up-from-line')+
  summaryCard('net',data.totals.net==null?'Observed net':'Net recorded contributions',
    data.totals.net??observedNet,data.totals.net==null?sourceHint:'Shown when all recorded players have both totals','chart-no-axes-combined')+
  '</section>';
 const rows=data.members.length?data.members.map(m=>memberRow(m,linkedByGamertag.get(m.gamertag.toLowerCase()))).join(''):'<tr><td colspan="4">No in-game roster imported yet. Team admins can add Gamertags or import an authorized snapshot.</td></tr>';
 const history=data.transactions.map(t=>'<tr><td>'+date(t.occurred_at)+'</td><td>'+esc(t.gamertag)+'</td>'+
  '<td><span class="mega-'+t.kind+'">'+(t.kind==='deposit'?'Deposit':'Withdrawal')+'</span></td>'+
  '<td class="mega-number">'+fmtMoney(t.amount)+'</td></tr>').join('')||
  '<tr><td colspan="4">No individually recorded transactions. Imported cumulative totals do not include transaction dates.</td></tr>';
 return '<div class="mega-dashboard" data-mega-dashboard data-season="'+attr(data.season.season)+'">'+
  '<section class="mega-hero panel"><div class="mega-hero-heading"><div>'+
  '<h2>Team <span>overview</span></h2>'+
  '</div>'+
  '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="'+attr(data.teamUrl)+'">'+
  icon('external-link',{size:17})+' Open on InPvP</a></div>'+
  '<div class="mega-status-line"><span data-mega-syncstatus>'+esc(syncLabel)+'</span><span data-mega-capturestatus>'+esc(captureText)+'</span>'+
  '<span data-mega-updated>Updated: '+date(sourceUpdated||data.bank?.as_of)+'</span></div>'+
  '<p class="mega-disclaimer">Captured figures can be incomplete and do not prove current membership. Manual totals stay separate. Updates need a configured collector.</p>'+ (captureStatus?.last_error?'<p class="mega-disclaimer" data-mega-captureerror>Collector warning: '+esc(captureStatus.last_error)+'</p>':'<p class="mega-disclaimer" data-mega-captureerror></p>')+
  '</section>'+
  '<div class="mega-toolbar"><form method="get" action="/mega-team" class="mega-season-select">'+
  '<label>Season <select name="season">'+seasons+'</select></label><button class="btn btn-outline btn-sm" type="submit">View</button></form>'+
  '<button class="btn btn-outline btn-sm" type="button" data-mega-refresh>'+icon('refresh-cw',{size:17})+' Refresh</button>'+
  '<span class="mega-muted" data-mega-timestamp aria-live="polite"></span></div>'+
  '<section class="mega-data-clarity" role="status" aria-label="Team bank data quality">'+
  '<b>Saved team records · NOT REAL-TIME</b>'+
  '<p>The reported team bank, manually recorded contributions and observed bank events are separate figures. Captured events may be incomplete and do not establish lifetime deposits or withdrawals. Linked Discord members and captured player names do not prove the current complete in-game roster.</p>'+
  '<p>Source status: <strong data-mega-banner-sync>'+esc(syncLabel)+'</strong> · <span data-mega-banner-coverage>'+esc(stateLabel)+'</span></p></section>'+
  summary+'<div class="mega-coverage" data-mega-coverage>'+icon('info',{size:17})+' '+esc(stateLabel)+'</div>'+
  '<nav class="mega-section-links" aria-label="MegaSMP dashboard sections"><a href="#mega-members">Members</a>'+
  '<a href="#mega-leaderboard">Leaderboard</a><a href="#mega-bank-history">Bank activity</a>'+
  '<a href="/team/mega/history?season='+encodeURIComponent(data.season.season)+'">Bank history</a>'+
  '<a href="#mega-observed">Captured events</a><a href="#mega-discord-roster">Discord members</a>'+
  (ctx.role==='owner'?'<a href="/team/mega/matches?season='+encodeURIComponent(data.season.season)+'">Match accounts</a>':'')+'</nav>'+
  '<section class="mega-section" id="mega-members"><div class="mega-section-head"><div><h3>In-game team roster</h3>'+
  '<p>Recorded players; Discord roles shown separately.</p></div>'+
  '<span class="mega-source-badge"><span data-mega-count>'+full.length+'</span> recorded</span></div>'+
  '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>PLAYER</th><th>DEPOSITED</th><th>WITHDRAWN</th><th>NET</th></tr></thead>'+
  '<tbody data-mega-rows>'+rows+'</tbody></table></div></section>'+
  '<section class="mega-section" id="mega-leaderboard"><div class="mega-section-head"><div><h3>Contribution leaderboard</h3>'+
  '<p>Deposit totals may be incomplete.</p></div></div>'+
  '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>RANK</th><th>GAMERTAG</th><th>DEPOSITED</th></tr></thead>'+
  '<tbody data-mega-leaderboard>'+rank+'</tbody></table></div></section>'+
  '<section class="mega-section" id="mega-bank-history"><div class="mega-section-head"><div><h3>Recorded bank activity</h3>'+
  '<p>Manual entries, not full InPvP history.</p></div></div>'+
  '<div class="table-wrap panel"><table class="mega-table"><thead><tr><th>DATE</th><th>PLAYER</th><th>TYPE</th><th>AMOUNT</th></tr></thead>'+
  '<tbody data-mega-history>'+history+'</tbody></table></div></section>'+
  '<section class="mega-section" id="mega-observed"><div class="mega-section-head"><div><h3>Captured bank activity</h3>'+
  '<p>Captured events; separate from manual totals and possibly incomplete.</p></div>'+
  '<span class="mega-source-badge">'+Number(data.captured?.totalEvents||0)+' saved events</span></div>'+
  '<div class="mega-stats">'+
  summaryCard('captured-deposits','Observed deposits',data.captured?.deposited??null,'Captured events only','arrow-down-to-line')+
  summaryCard('captured-withdrawals','Observed withdrawals',data.captured?.withdrawn??null,'Captured events only','arrow-up-from-line')+
  '</div><div class="table-wrap panel"><table class="mega-table"><thead><tr><th>DISPLAYED TIME</th><th>PLAYER</th><th>TYPE</th><th>AMOUNT</th></tr></thead>'+
  '<tbody data-mega-observed>'+((data.capturedTransactions||[]).map(t=>'<tr><td>'+esc(t.time||'Not available')+'</td><td>'+esc(t.gamertag)+'</td><td>'+esc(t.kind)+'</td><td class="mega-number">$'+esc(t.amount)+'</td></tr>').join('')||
  '<tr><td colspan="4">No browser-captured bank events yet.</td></tr>')+'</tbody></table></div></section>'+
  discordRoster(discordGroups,restricted)+(admin&&data.season.season===data.activeSeason?manager(ctx,data):'')+'</div>';
}
