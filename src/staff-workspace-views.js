// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {icon} from './icons.js';
import {categoryLabel,ticketFields} from './support.js';
import {moderationLabels} from './discord-moderation.js';
import {esc,shell,tag} from './views.js';

const queue='/staff/tickets';
const moderation='/staff/discord-moderation';
const finalStates=new Set(['accepted','denied','resolved']);
const requestTypes=new Set(['application','promotion','team_application']);
const attentionOrder=['awaiting_owner','awaiting_staff','open','reviewing'];
const date=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'});
const statesLabel=value=>value.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const canModerate=ctx=>['admin','owner'].includes(ctx.role);
const readQuery=(params,key)=>String(params.get(key)||'').trim().slice(0,80);
const formatDate=stamp=>Number.isFinite(stamp)&&stamp>0?date.format(stamp):'—';
const item=(href,label,current,glyph)=>`<a href="${esc(href)}"${current?' aria-current="page"':''}>${glyph?icon(glyph,{size:17}):''}${esc(label)}</a>`;
const options=(values,selected)=>values.map(([key,label])=>`<option value="${esc(key)}"${key===selected?' selected':''}>${esc(label)}</option>`).join('');

function workspace(ctx,section,body){
 return shell(ctx,'Staff Workspace',`<div class="staff-workspace">
  <header class="staff-workspace-header"><span class="staff-workspace-icon">${icon('shield-check',{size:26})}</span>
   <div><h1>Staff Workspace</h1><p>SB’s &amp; Cam’s Store Discord</p></div>
  </header>
  <nav class="staff-workspace-tabs" aria-label="Staff workspace">
   ${item(queue,'Tickets',section==='tickets','tickets')}
   ${canModerate(ctx)?item(moderation,'Discord Moderation',section==='moderation','gavel'):''}
   ${item(queue+'?view=requests','Staff Requests',section==='requests','file-pen-line')}
  </nav>
  ${body}
 </div>`);
}
function caseSubject(ticket){
 const fields=ticketFields(ticket);
 const title=fields.affected_page||fields.reported_player||fields.staff_username||fields.prize||
  ticket.position||ticket.minecraft_ign||ticket.to_label;
 return title?String(title).slice(0,120):categoryLabel(ticket.category);
}
function caseRows(tickets){
 if(!tickets.length)return '<div class="staff-workspace-empty">No cases match this view.</div>';
 return `<div class="table-wrap staff-workspace-table"><table><thead><tr>
 <th scope="col">Case</th><th scope="col">Discord member</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Updated</th>
 </tr></thead><tbody>${tickets.map(t=>`<tr${t.unread?' class="staff-workspace-unread"':''}>
   <td><a class="staff-case-link" href="${esc(t.href)}"><small>#${esc(t.displayId)}</small><strong>${esc(caseSubject(t))}</strong></a></td>
   <td data-label="Discord member"><strong>${esc(t.display_name||t.username||'Member')}</strong>${t.username?`<small>@${esc(t.username)}</small>`:''}</td>
   <td><span class="staff-case-type">${esc(categoryLabel(t.category))}</span></td>
   <td>${tag(t.queue_status||t.status)}${t.unread?`<small class="staff-case-unread">${t.unread} unread</small>`:''}</td>
   <td data-label="Updated"><time datetime="${new Date(t.updated_at).toISOString()}">${esc(formatDate(t.updated_at))}</time></td>
  </tr>`).join('')}</tbody></table></div>`;
}
function ticketAnalytics(tickets){
 const closed=tickets.filter(t=>finalStates.has(t.status)).length;
 const unread=tickets.filter(t=>t.unread>0).length;
 const waiting=tickets.filter(t=>t.queue_status==='awaiting_member').length;
 const byType=Map.groupBy(tickets,t=>t.category);
 const counts=[...byType].sort((a,b)=>b[1].length-a[1].length);
 return `<section class="staff-analytics">
  <h2>Ticket analytics</h2><p class="muted">Based on the recent cases you can access in this workspace.</p>
  <div class="staff-stat-grid">
  ${[['Cases',tickets.length],['Active',tickets.length-closed],['Closed',closed],['With unread replies',unread],['Waiting on member',waiting]].map(([name,count])=>
   `<div><span>${name}</span><strong>${count}</strong></div>`).join('')}</div>
  <h3>Cases by type</h3>
  ${counts.length?`<div class="staff-breakdown">${counts.map(([type,rows])=>
   `<div><span>${esc(categoryLabel(type))}</span><meter aria-label="${esc(categoryLabel(type))}" min="0" max="${tickets.length}" value="${rows.length}"></meter><strong>${rows.length}</strong></div>`).join('')}</div>`:
   '<p class="muted">No cases to summarize.</p>'}
 </section>`;
}

export function staffTicketWorkspace(ctx,{tickets,query,teamCounts}){
 const requestedView=query.get('view');
 const view=['unread','analytics','requests'].includes(requestedView)?requestedView:'all';
 const active=view==='all'&&query.get('status')==='active';
 const current=view==='all'?(active?'active':'all'):view;
 const candidates=tickets.filter(t=>view==='requests'?requestTypes.has(t.category):view==='unread'?t.unread>0:true);
 const categories=[...new Set([...candidates.map(t=>t.category),...(teamCounts!==null&&['all','requests'].includes(view)?['team_application']:[])])];
 const statuses=[...new Set(candidates.map(t=>t.queue_status||t.status))];
 const type=categories.includes(query.get('type'))?query.get('type'):'';
 const state=statuses.includes(query.get('state'))?query.get('state'):'';
 const sort=['oldest','attention'].includes(query.get('sort'))?query.get('sort'):'newest';
 const q=readQuery(query,'q'),term=q.toLowerCase();
 const rank=t=>{const i=attentionOrder.indexOf(t.queue_status||t.status);return i<0?attentionOrder.length:i;};
 const rows=candidates.filter(t=>(!type||t.category===type)&&(!state||(t.queue_status||t.status)===state)&&
  (!term||[t.displayId,t.user_id,t.username,t.display_name,caseSubject(t),categoryLabel(t.category)]
   .some(value=>String(value||'').toLowerCase().includes(term))));
 if(sort==='oldest')rows.sort((a,b)=>a.updated_at-b.updated_at);
 if(sort==='attention')rows.sort((a,b)=>rank(a)-rank(b)||a.updated_at-b.updated_at);
 const pageSize=40,pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const page=Math.min(pages,Math.max(1,Math.trunc(Number(query.get('page'))||1)));
 const link=(pageNumber)=>queue+'?'+new URLSearchParams({
  ...(view!=='all'?{view}:{}),...(active?{status:'active'}:{}),...(q?{q}:{}),
  ...(type?{type}:{}),...(state?{state}:{}),...(sort!=='newest'?{sort}:{}),page:pageNumber
 });
 const reset=view!=='all'?queue+'?view='+view:active?queue+'?status=active':queue;
 const pager=pages>1?`<nav class="staff-workspace-pager" aria-label="Case pages">
  ${page>1?item(link(page-1),'Previous',false):''}<span>Page ${page} of ${pages}</span>${page<pages?item(link(page+1),'Next',false):''}</nav>`:'';
 const filters=`<form method="get" action="${queue}" class="staff-filters">
 ${view!=='all'?`<input type="hidden" name="view" value="${view}">`:''}${active?'<input type="hidden" name="status" value="active">':''}
 <label>Search cases<input type="search" name="q" value="${esc(q)}" maxlength="80" placeholder="Case ID, Discord member or subject"></label>
 <label>Type<select name="type">${options([['','All types'],...categories.map(key=>[key,categoryLabel(key)])],type)}</select></label>
 <label>Status<select name="state">${options([['','All statuses'],...statuses.map(key=>[key,statesLabel(key)])],state)}</select></label>
 <label>Sort by<select name="sort">${options([['newest','Last updated'],['oldest','Longest waiting'],['attention','Needs attention']],sort)}</select></label>
 <div class="staff-filter-actions"><button class="btn btn-primary btn-sm">Filter</button><a class="btn btn-outline btn-sm" href="${reset}">Reset</a></div>
 </form>`;
 const teamNote=teamCounts===null?'':`<div class="staff-queue-note"><span><b>Team applications:</b> ${Number(teamCounts.total||0)} stored · ${Number(teamCounts.active||0)} active</span>
  <a href="${queue}?type=team_application">Filter team applications</a>${ctx.role==='owner'?'<a href="/owner/recruitment-diagnostics">Check stored submissions</a>':''}</div>`;
 const labels={all:'All Tickets',active:'Active Queue',unread:'Unread',requests:'Staff Requests'};
 return workspace(ctx,view==='requests'?'requests':'tickets',`<section class="staff-workspace-panel">
  <nav class="staff-workspace-subtabs" aria-label="Ticket views">
   ${item(queue,'All Tickets',current==='all')}${item(queue+'?status=active','Active Queue',current==='active')}
   ${item(queue+'?view=unread','Unread',current==='unread')}${item(queue+'?view=analytics','Analytics',current==='analytics')}
   <a class="staff-personal-tickets" href="/tickets/mine">My submitted tickets</a>
  </nav>
  ${view==='analytics'?ticketAnalytics(tickets):`${filters}${teamNote}
   <div class="staff-results-heading"><h2>${labels[current]}</h2><span>${rows.length} ${rows.length===1?'case':'cases'}</span></div>
   ${caseRows(rows.slice((page-1)*pageSize,page*pageSize))}${pager}`}
 </section>`);
}

export function discordModerationWorkspace(ctx,{events,available,partial,query}){
 const member=readQuery(query,'member'),staff=readQuery(query,'moderator');
 const type=Object.hasOwn(moderationLabels,query.get('type'))?query.get('type'):'';
 const matches=(q,name,id)=>!q||`${name} ${id||''}`.toLowerCase().includes(q.toLowerCase());
 const rows=events.filter(e=>(!type||e.kind===type)&&matches(member,e.member,e.memberId)&&matches(staff,e.moderator,e.moderatorId));
 return workspace(ctx,'moderation',`<section class="staff-workspace-panel">
  <div class="staff-results-heading"><div><h2>Discord moderation activity</h2><p class="muted">Recent entries from the Discord server audit log.</p></div><a class="btn btn-outline btn-sm" href="/admin/moderation">Website reports</a></div>
  <form class="staff-filters staff-moderation-filters" action="${moderation}" method="get">
   <label>Discord member<input type="search" name="member" maxlength="80" value="${esc(member)}" placeholder="Username or ID"></label>
   <label>Moderator<input type="search" name="moderator" maxlength="80" value="${esc(staff)}" placeholder="Username or ID"></label>
   <label>Action<select name="type">${options([['','All actions'],...Object.entries(moderationLabels)],type)}</select></label>
   <div class="staff-filter-actions"><button class="btn btn-primary btn-sm">Filter</button><a class="btn btn-outline btn-sm" href="${moderation}">Reset</a></div>
  </form>
  ${!available?'<div class="staff-workspace-empty">Discord audit log unavailable. Check that the bot has View Audit Log permission, then try again.</div>':
  `${partial?'<p class="staff-queue-note">Some Discord activity could not be loaded.</p>':''}
   ${rows.length?`<div class="table-wrap staff-workspace-table"><table><thead><tr><th scope="col">Action</th><th scope="col">Discord member</th><th scope="col">Moderator</th><th scope="col">Reason</th><th scope="col">When</th></tr></thead><tbody>
   ${rows.map(row=>`<tr><td><span class="staff-case-type">${moderationLabels[row.kind]}</span></td><td data-label="Member">${esc(row.member)}</td>
   <td data-label="Moderator">${esc(row.moderator)}</td><td data-label="Reason">${esc(row.reason||'—')}${row.timeoutUntil?`<small>Until ${esc(formatDate(row.timeoutUntil))}</small>`:''}</td>
   <td data-label="When">${esc(formatDate(row.createdAt))}</td></tr>`).join('')}</tbody></table></div>`:
    '<div class="staff-workspace-empty">No recent moderation entries match these filters.</div>'}`}
 </section>`);
}
