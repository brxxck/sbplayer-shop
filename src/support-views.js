// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,token,avatar,tag,titlebar,ticketFeedback} from './views.js';
import {SUPPORT_CATEGORIES,categoryLabel,ticketFields} from './support.js';
import {icon} from './icons.js';
import {caseState} from './upgrade-data.js';
import {evidenceGallery} from './evidence-views.js';
import {ticketIsFinal} from './ticket-workflow.js';

const types=[
 {id:'bug_report',label:'Bug Report',desc:'Report a website or community bug',icon:'bug',tone:'green'},
 {id:'player_report',label:'Player Report',desc:'Report rule-breaking behaviour',icon:'flag',tone:'amber'},
 {id:'reward_claim',label:'Reward Claim',desc:'Claim a prize or reward',icon:'gift',tone:'violet'},
 {id:'staff_report',label:'Staff Report',desc:'Confidential complaint to management',icon:'shield-ban',tone:'red'},
 {id:'ban_appeal',label:'Ban Appeal',desc:'Appeal a Minecraft ban or mute',icon:'scale',tone:'red'}
];
const date=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const val=v=>esc(v??'');
const text=v=>esc(v??'').replace(/\n/g,'<br>');
const field=(name,label,{placeholder='',help='',required=true,multiline=false}={})=>{
 const control=multiline?`<textarea name="${name}" ${required?'required':''} minlength="${required?'10':'0'}" maxlength="3000" rows="5" placeholder="${val(placeholder)}"></textarea>`:
   `<input name="${name}" type="text" maxlength="150" ${required?'required':''} placeholder="${val(placeholder)}">`;
 return `<label>${val(label)}${help?`<small class="ticket-field-help">${val(help)}</small>`:''}${control}</label>`;
};
export function chooseTicket(ctx){
 // Application cards use Discord role eligibility supplied by the server, not browser state.
 const promotion=ctx.promotionEligible?
  '<a class="support-choice tone-violet" href="/promotions/new"><span class="support-choice-icon">'+icon('award',{size:22})+'</span><span class="support-choice-content"><b>Promotion Ticket</b><small>Request a staff promotion</small></span><span class="support-chevron">'+icon('chevron-right',{size:20})+'</span></a>':'';
 const joinTeam=ctx.teamApplicationEligible?
  '<a class="support-choice tone-blue" href="/team-applications/apply"><span class="support-choice-icon">'+icon('users-round',{size:22})+'</span><span class="support-choice-content"><b>Join SBsxScam</b><small>Apply to the MegaSMP team</small></span><span class="support-chevron">'+icon('chevron-right',{size:20})+'</span></a>':'';
 return shell(ctx,'Submit a Ticket',`<div class="support-container">
 ${titlebar('CONTACT SUPPORT','How can we <span class="gradient">help?</span>','Choose a ticket type.')}
 <div class="support-picker">${types.map(t=>`<a class="support-choice tone-${t.tone}" href="/tickets/new/${t.id}"><span class="support-choice-icon">${icon(t.icon,{size:22})}</span>
  <span class="support-choice-content"><b>${t.label}</b><small>${t.desc}</small></span><span class="support-chevron">${icon('chevron-right',{size:20})}</span></a>`).join('')}${promotion}${joinTeam}</div>
 <a class="support-choice support-view-all" href="/tickets/mine"><span class="support-choice-icon">${icon('tickets',{size:22})}</span>
 <span class="support-choice-content"><b>View My Tickets</b><small>Open and past tickets</small></span><span class="support-chevron">${icon('chevron-right',{size:20})}</span></a>
 </div>`);
}
export function newTicket(ctx,{category}){
 const definition=types.find(t=>t.id===category);
 const labels={
   bug_report:field('affected_page','Affected page',{required:false,placeholder:'/feed, profile, messages…'})+field('steps','Steps to reproduce',{multiline:true,required:false})+field('expected','Expected result',{multiline:true,required:false})+field('actual','Actual result',{multiline:true,required:false})+field('description','Description',{multiline:true,placeholder:'What went wrong?'}),
   player_report:field('reported_player','Player',{placeholder:"Player's username or Discord ID"})+
     field('rule_broken','Rule',{placeholder:'e.g. Hard-R, Spamming, Threats'})+
     field('description','Details',{multiline:true,placeholder:'What happened?'}),
   reward_claim:field('prize','Reward / Prize',{placeholder:'e.g. Discord Nitro'}),
   staff_report:field('staff_username','Staff member',{placeholder:"Staff member's username or Discord ID"})+
     field('description','Details',{multiline:true,placeholder:'What happened?'}),
   ban_appeal:field('minecraft_username','Minecraft Username',{placeholder:'Your Minecraft username'})+
     field('ban_reason','Ban reason',{placeholder:'e.g. Hard-R, Spamming, Threats'})+
     field('appeal_reason','Appeal reason',{multiline:true,placeholder:'Explain your appeal...'})
 };
 const required=['player_report','staff_report'].includes(category);
 const evidenceText=required?'Evidence (required)':'Evidence (optional)';
 return shell(ctx,definition?.label||'New Ticket',`<div class="support-form-wrap">
 <a class="support-back" href="/tickets/new">← Back</a>
 <form class="support-form panel padded" method="post" enctype="multipart/form-data" action="/tickets/new/${val(category)}">
 ${token(ctx)}<h1 class="support-form-title">${definition?.label||''}</h1>
 <label>Discord <span class="verified-discord">${icon('badge-check',{size:16})} Verified via Discord</span>
 <input value="@${val(ctx.user?.username||'Discord member')}" readonly class="discord-identity"></label>
 ${labels[category]||''}
 ${required?field('evidence_unavailable_reason','If evidence is unavailable, explain why',{required:false,multiline:true,help:'Attach evidence below, or give a detailed explanation (at least 30 characters).'}):''}
 <label class="support-upload-label">${required?'Evidence or explanation required':evidenceText}
 <span class="ticket-field-help">Images or video · 5 files max · 12 MB each</span>
 <span class="support-upload"><span>Upload files</span>
 <input type="file" name="evidence" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm" multiple></span>
 </label>

 <button class="btn support-submit ${category==='ban_appeal'?'appeal-submit':''}" type="submit">${category==='ban_appeal'?'Submit Appeal':'Submit Ticket'}</button>
 </form></div>`);
}
export function myTickets(ctx,{tickets=[],view='all',selectedTicket=null}){
 const closed=tickets.filter(t=>ticketIsFinal(t.status));
 const pending=tickets.filter(t=>!ticketIsFinal(t.status));
 const selected=view==='resolved'?closed:view==='pending'?pending:tickets;
 return shell(ctx,'My Tickets',`<div class="support-container staff-workspace">
 ${titlebar('MY SUPPORT','My Tickets','','<a class="btn btn-primary" href="/tickets/new">New ticket</a>')}
 <section class="staff-workspace-panel">
  <nav class="staff-workspace-subtabs" aria-label="My ticket views">
  <a href="/tickets/mine"${view==='all'?' aria-current="page"':''}>All tickets</a>
  <a href="/tickets/mine?view=pending"${view==='pending'?' aria-current="page"':''}>Pending · ${pending.length}</a>
  <a href="/tickets/mine?view=resolved"${view==='resolved'?' aria-current="page"':''}>Resolved · ${closed.length}</a>
  </nav>
  ${selected.length?`<div class="my-ticket-list">${selected.map(t=>`<details>
   <summary><span><strong>${val(categoryLabel(t.category))}</strong> <small>#${val(t.id)}</small></span>
    ${tag(caseState(t))}${t.unread?` <span class="pill pill-reviewing">${t.unread} new</span>`:''}</summary>
   <p>Updated ${date(t.updated_at)}</p>
   ${t.href==='/tickets/'+t.id?`<a class="btn btn-outline btn-sm" href="/tickets/mine?view=${view}&amp;ticket=${t.id}#selected-ticket">View conversation</a>`:''}
   <a class="btn btn-outline btn-sm" href="${val(t.href)}">Open full ticket</a>
  </details>`).join('')}</div>`:'<div class="staff-workspace-empty">No '+(view==='all'?'':view+' ')+'tickets.</div>'}
 ${selectedTicket?supportTicketContent(ctx,selectedTicket):''}
 </section></div>`);
}
function fieldList(ticket){
 const data=ticketFields(ticket);
 const pairs={
  bug_report:[['Affected page',data.affected_page],['Steps to reproduce',data.steps],['Expected',data.expected],['Actual',data.actual],['Description',data.description]],
  player_report:[['Player',data.reported_player],['Rule',data.rule_broken],['Details',data.description],['Evidence unavailable',data.evidence_unavailable_reason]],
  reward_claim:[['Reward / Prize',data.prize]],
  staff_report:[['Staff member',data.staff_username],['Details',data.description],['Evidence unavailable',data.evidence_unavailable_reason]],
  ban_appeal:[['Minecraft Username',data.minecraft_username],['Ban reason',data.ban_reason],['Appeal reason',data.appeal_reason]]
 };
 return (pairs[ticket.category]||[]).filter(([,v])=>v).map(([label,v])=>`<div class="answer"><b>${label}</b><p>${text(v)}</p></div>`).join('');
}
function staffActions(ctx,ticket,state,history,embedded){
 const base='/staff/tickets/'+ticket.id;
 const form=(inner)=>`<form method="post" action="${base}/workflow" class="staff-ticket-action">${token(ctx)}${embedded}${inner}</form>`;
 const assignee=state.assignee||state.assignee_id;
 const toggle=state.assignee_id?
  ((state.assignee_id===ctx.user.id||['admin','owner'].includes(ctx.role))?form('<button class="btn btn-outline btn-sm" name="action" value="unassign">Unassign</button>'):''):
  form('<button class="btn btn-primary btn-sm" name="action" value="claim">Claim ticket</button>');
 const clear=state.escalation&&(ctx.role==='owner'||(ctx.role==='admin'&&state.escalation==='admins'));
 return `<div class="staff-ticket-tools">
  <section><h3>Assignment</h3><p>${esc(assignee||'Unassigned')}</p>${toggle}</section>
  <section><h3>Escalation</h3><p>${state.escalation?'Waiting for '+(state.escalation==='owners'?'owners':'admins'):'No escalation'}</p>
   ${state.escalation!=='owners'?form(`<input type="hidden" name="action" value="escalate"><div class="staff-ticket-buttons">
    ${ticket.visibility==='owner'?'':'<button class="btn btn-outline btn-sm" name="target" value="admins">Escalate to admins</button>'}
    <button class="btn btn-outline btn-sm" name="target" value="owners">Escalate to owners</button></div>`):''}
   ${clear?form('<button class="btn btn-outline btn-sm" name="action" value="clear_escalation">Clear escalation</button>'):''}
  </section>
  <section><h3>My private tag</h3>${form(`<label><span class="sr-only">Private tag</span><input name="label" value="${esc(state.privateTag||'')}" maxlength="32" placeholder="Add a tag"></label>
    <button class="btn btn-outline btn-sm" name="action" value="tag">Save tag</button>`)}</section>
  ${history.length?`<section><h3>Other tickets by this member</h3><ul>${history.map(t=>
    `<li><a href="/staff/tickets/${t.id}">#T-${t.id} · ${esc(categoryLabel(t.category))}</a></li>`).join('')}</ul></section>`:''}
 </div>`;
}

export function supportTicketContent(ctx,{ticket,messages=[],attachments=[],staff=false,workflow=null,history=[],notes=[],feedback,embedded=false}){
 const privateTier=ticket.category==='staff_report'?(ticket.visibility==='owner'?'Owner Confidential':'Admin Confidential'):'';
 const back=staff?'/staff/tickets':'/tickets/mine';
 const submit=staff?'/staff/tickets/'+ticket.id+'/reply':'/tickets/'+ticket.id+'/reply';
 const staffPath='/staff/tickets/'+ticket.id;
 const returnField=embedded?'<input type="hidden" name="workspace" value="1">':'';
 const filesFor=id=>evidenceGallery(attachments.filter(f=>f.message_id===id),'/tickets/attachments',true);
 const initialFiles=attachments.filter(f=>!f.message_id);
 const firstResponse=messages.find(m=>m.author_id!==ticket.user_id);
 const canModerate=['admin','owner'].includes(ctx.role);
 const fullStaff=staff&&ctx.role!=='trial-mod';
 return `<div class="ticket-view staff-ticket-detail" id="selected-ticket">
 <div class="staff-ticket-top"><div>
 <h2>Ticket <span class="gradient">#${ticket.id}</span></h2>
 <div class="ticket-detail-head"><span class="ticket-type-label ticket-type-${val(ticket.category)}">${categoryLabel(ticket.category)}</span> ${tag(caseState(ticket))}
 ${privateTier?`<span class="pill pill-protected">${privateTier}</span>`:''}</div></div>
 <div class="staff-ticket-buttons">
 ${staff?`<button class="btn btn-outline btn-sm" type="button" data-copy-ticket="${staffPath}">Copy ticket link</button>`:''}
 <a class="btn btn-outline btn-sm" href="${back}">${embedded?'Close ticket view':'Back to tickets'}</a>
 </div></div>
 <div class="staff-ticket-grid">
 <section class="panel padded ticket-conversation chat-ticket"><h3>Conversation</h3>
 <div class="staff-ticket-original"><h4>Original request</h4>${fieldList(ticket)}${initialFiles.length?evidenceGallery(initialFiles):''}</div>
 <div class="ticket-chat-log">${messages.map(m=>`<article class="ticket-message chat-bubble ${m.author_id===ctx.user.id?'is-own':''}">
     ${avatar({id:m.author_id,avatar:m.avatar,display_name:m.display_name},'sm')}
     <div class="ticket-message-main"><div class="ticket-message-meta"><b>${val(m.display_name)}</b>
       <small>${m.author_id===ticket.user_id?'Member':'Staff'} · ${date(m.created_at)}</small></div>
       <div class="ticket-bubble-body">${text(m.body)}</div>
       ${filesFor(m.id)?`<div class="ticket-message-files">${filesFor(m.id)}</div>`:''}
     </div></article>`).join('')}</div>
 <form method="post" action="${submit}" enctype="multipart/form-data" class="ticket-chat-composer">
  ${token(ctx)}${returnField}
  <label>Public reply<textarea name="body" rows="3" maxlength="2000" minlength="1" required placeholder="Write your reply…"></textarea></label>
  ${staff?`<label>Quick replies<select data-ticket-quick-reply><option value="">Choose a template</option>
   <option value="Thanks for reaching out. We’re reviewing your ticket and will update you here.">Acknowledge ticket</option>
   <option value="Could you share a screenshot or clip, plus the Discord channel and approximate time this happened?">Request evidence</option>
   <option value="Thanks for reporting this. We’ve reviewed it and are closing this ticket.">Close ticket reply</option>
  </select></label>`:''}
  <div class="ticket-compose-actions"><label class="btn btn-outline btn-sm ticket-upload-control">Upload video/pictures
   <input type="file" name="evidence" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"></label>
   <small class="muted">Max 5 files · 12 MB each</small><button class="btn btn-primary btn-sm" type="submit">Send reply</button></div>
 </form>
 ${fullStaff?`<details class="staff-ticket-notes"><summary>Internal notes · ${notes.length}</summary>
  ${notes.map(note=>`<article><b>${esc(note.display_name)}</b> <small>${date(note.created_at)}</small><p>${text(note.body)}</p></article>`).join('')}
  <form method="post" action="${staffPath}/workflow">${token(ctx)}${returnField}
  <label>Staff-only note<textarea name="note" rows="3" maxlength="2000" required></textarea></label>
  <button class="btn btn-outline btn-sm" name="action" value="note">Save internal note</button></form></details>`:
  (!staff&&ticket.user_id===ctx.user.id?ticketFeedback(ctx,'support',ticket,feedback,embedded):'')}
 </section>
 <aside class="panel padded staff-ticket-sidebar">
 <h3>Discord member</h3><div class="ticket-reporter">${avatar({id:ticket.user_id,avatar:ticket.avatar,display_name:ticket.display_name},'sm')}
 <span><b>${val(ticket.display_name)}</b><small>@${val(ticket.username)}</small></span></div>
 ${staff?`<div class="staff-ticket-buttons"><a href="/u/${esc(ticket.user_id)}">View profile</a> <button type="button" class="btn btn-outline btn-sm" data-copy-discord-id="${esc(ticket.user_id)}">Copy Discord ID</button>
 ${canModerate?`<a href="/staff/discord-moderation?member=${esc(ticket.user_id)}">Moderation history</a>`:''}</div>
 ${fullStaff?staffActions(ctx,ticket,workflow||{},history,returnField):''}`:''}
 <h3>Timeline</h3><dl class="staff-ticket-timeline"><dt>Opened</dt><dd>${date(ticket.created_at)}</dd>
 ${firstResponse?`<dt>First staff reply</dt><dd>${date(firstResponse.created_at)}</dd>`:''}
 ${ticket.resolved_at?`<dt>Resolved</dt><dd>${date(ticket.resolved_at)}</dd>`:''}</dl>
 ${fullStaff?`<form method="post" action="${staffPath}/status" class="ticket-status-form">${token(ctx)}${returnField}
 <label>Status<select name="status">${['open','reviewing','resolved'].map(x=>`<option value="${x}" ${ticket.status===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label>
 <button class="btn btn-outline btn-sm">Update status</button></form>`:''}
 ${staff&&ticket.status!=='resolved'?`<form method="post" action="${staffPath}/status">${token(ctx)}${returnField}
 <button class="btn btn-outline btn-sm" name="status" value="resolved">Mark as resolved</button></form>`:''}
 </aside></div></div>`;
}
export function supportTicketPage(ctx,props){
 return shell(ctx,'Ticket #'+props.ticket.id,`<div class="staff-workspace">${supportTicketContent(ctx,props)}</div>`);
}
