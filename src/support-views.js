// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,token,avatar,tag,titlebar} from './views.js';
import {SUPPORT_CATEGORIES,categoryLabel,ticketFields} from './support.js';
import {icon} from './icons.js';

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
 return shell(ctx,'Submit a Ticket',`<div class="support-container">
 ${titlebar('CONTACT SUPPORT','How can we <span class="gradient">help?</span>','Select the category that best describes your issue. Your Discord identity is verified automatically.')}
 <div class="support-picker">${ctx.promotionEligible?'<a class="support-choice tone-violet" href="/promotions/new"><span class="support-choice-icon">'+icon('award',{size:22})+'</span><span class="support-choice-content"><b>Promotion Ticket</b><small>Request a staff promotion</small></span><span class="support-chevron">'+icon('chevron-right',{size:20})+'</span></a>':''}${types.map(t=>`<a class="support-choice tone-${t.tone}" href="/tickets/new/${t.id}"><span class="support-choice-icon">${icon(t.icon,{size:22})}</span>
  <span class="support-choice-content"><b>${t.label}</b><small>${t.desc}</small></span><span class="support-chevron">${icon('chevron-right',{size:20})}</span></a>`).join('')}</div>
 <a class="support-choice support-view-all" href="/tickets/mine"><span class="support-choice-icon">${icon('tickets',{size:22})}</span>
 <span class="support-choice-content"><b>View My Tickets</b><small>Track your open and resolved tickets</small></span><span class="support-chevron">${icon('chevron-right',{size:20})}</span></a>
 </div>`);
}
export function newTicket(ctx,{category}){
 const definition=types.find(t=>t.id===category);
 const labels={
   bug_report:field('description','Bug Description',{multiline:true,placeholder:'Describe the bug in detail...',help:'Please provide specific details about the bug or issue'}),
   player_report:field('reported_player','Reported Player',{placeholder:"Player's username"})+
     field('rule_broken','Rule Broken',{placeholder:'e.g. Hard-R, Spamming, Threats'})+
     field('description','What Happened?',{multiline:true,placeholder:'Describe what happened in as much detail as possible'}),
   reward_claim:field('prize','Reward / Prize',{placeholder:'e.g. Discord Nitro'}),
   staff_report:field('staff_username','Staff Username',{placeholder:"Staff member's username",help:"Enter the username of the staff member you're reporting"})+
     field('description','What Happened?',{multiline:true,placeholder:'Describe the issue in detail...'}),
   ban_appeal:field('minecraft_username','Minecraft Username',{placeholder:'Your Minecraft username'})+
     field('ban_reason','Reason shown for ban',{placeholder:'e.g. Hard-R, Spamming, Threats'})+
     field('appeal_reason','Why do you believe the ban was a mistake?',{multiline:true,placeholder:'Explain your situation clearly and honestly...'})
 };
 const required=['player_report','staff_report'].includes(category);
 const evidenceText=required?'Evidence (required · images & videos · up to 5)':'Evidence (optional · images & videos · up to 5)';
 return shell(ctx,definition?.label||'New Ticket',`<div class="support-form-wrap">
 <a class="support-back" href="/tickets/new">← Back</a>
 <form class="support-form panel padded" method="post" enctype="multipart/form-data" action="/tickets/new/${val(category)}">
 ${token(ctx)}<div class="support-category">Category: <b>${definition?.label||''}</b></div>
 <label>Discord Username <span class="verified-discord">${icon('badge-check',{size:16})} Verified via Discord</span>
 <input value="@${val(ctx.user?.username||'Discord member')}" readonly class="discord-identity"></label>
 ${labels[category]||''}
 <label class="support-upload-label">${evidenceText}
 <span class="ticket-field-help">JPG, PNG, GIF, WEBP, MP4, MOV or WEBM · up to 5 files, 12 MB each, 35 MB combined</span>
 <span class="support-upload"><span>Click to upload or drag & drop</span><small>Images and video · max 5 files</small>
 <input type="file" name="evidence" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm" multiple ${required?'required':''}></span>
 </label>
 <p class="support-estimate">We aim to resolve issues as quickly as possible.</p>
 <button class="btn support-submit ${category==='ban_appeal'?'appeal-submit':''}" type="submit">${category==='ban_appeal'?'Submit Appeal':'Submit Ticket'}</button>
 </form></div>`);
}
export function myTickets(ctx,{tickets=[]}){
 const appCount=tickets.filter(t=>t.type==='application').length;
 return shell(ctx,'My Tickets',`<div class="support-container">
 ${titlebar('MY SUPPORT','Your <span class="gradient">tickets.</span>','All your support requests and staff applications in one private place.','<a class="btn btn-primary" href="/tickets/new">+ Submit Ticket</a>')}
 <div class="panel"><div class="panel-heading"><h2>Ticket history</h2><span class="muted">${tickets.length} total · ${appCount} application${appCount===1?'':'s'}</span></div>
 ${tickets.length?`<div class="table-wrap"><table><thead><tr><th>TICKET</th><th>TYPE</th><th>STATUS</th><th>LAST UPDATED</th><th></th></tr></thead>
 <tbody>${tickets.map(t=>`<tr><td><b>#${t.id}</b></td><td><span class="ticket-type-label ticket-type-${val(t.category)}">${val(categoryLabel(t.category))}</span></td>
 <td>${tag(t.status)}${t.unread?` <span class="pill pill-reviewing">${t.unread} new</span>`:''}</td><td>${date(t.updated_at)}</td>
 <td><a class="table-link" href="${t.href}">Open →</a></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No tickets yet. Submit your first request when you need help.</div>'}</div></div>`);
}
function fieldList(ticket){
 const data=ticketFields(ticket);
 const pairs={
  bug_report:[['Bug Description',data.description]],
  player_report:[['Reported Player',data.reported_player],['Rule Broken',data.rule_broken],['What Happened?',data.description]],
  reward_claim:[['Reward / Prize',data.prize]],
  staff_report:[['Staff Username',data.staff_username],['What Happened?',data.description]],
  ban_appeal:[['Minecraft Username',data.minecraft_username],['Reason shown for ban',data.ban_reason],['Why do you believe the ban was a mistake?',data.appeal_reason]]
 };
 return (pairs[ticket.category]||[]).map(([label,v])=>`<div class="answer"><b>${label}</b><p>${text(v)}</p></div>`).join('');
}
export function supportTicketPage(ctx,{ticket,messages=[],attachments=[],staff=false}){
 const privateTier=ticket.category==='staff_report'?(ticket.visibility==='owner'?'Owner Confidential':'Admin Confidential'):'';
 const back=staff?'/staff/tickets':'/tickets/mine';
 const submit=staff?'/staff/tickets/'+ticket.id+'/reply':'/tickets/'+ticket.id+'/reply';
 const filesFor=id=>attachments.filter(f=>f.message_id===id).map(f=>
   `<a class="ticket-message-file" href="/tickets/attachments/${f.id}">↧ ${val(f.original_name)} <small>${Math.ceil(f.file_size/1024)} KB</small></a>`).join('');
 const initialFiles=attachments.filter(f=>!f.message_id);
 return shell(ctx,'Ticket #'+ticket.id,`<div class="support-container ticket-view">
 <a class="support-back" href="${back}">← Back to tickets</a>
 ${titlebar('PRIVATE SUPPORT TICKET','Ticket <span class="gradient">#${ticket.id}</span>','Opened '+date(ticket.created_at))}
 <div class="ticket-detail-head"><span class="ticket-type-label ticket-type-${val(ticket.category)}">${categoryLabel(ticket.category)}</span> ${tag(ticket.status)}
 ${privateTier?`<span class="pill pill-protected">${privateTier}</span>`:''}</div>
 <div class="ticket-detail-layout">
 <section class="panel padded ticket-detail-card"><h2>Request details</h2>
 <div class="ticket-reporter">${avatar({id:ticket.user_id,avatar:ticket.avatar,display_name:ticket.display_name},'sm')}
 <span><b>${val(ticket.display_name)}</b><small>@${val(ticket.username)} · Verified via Discord</small></span></div>
 ${fieldList(ticket)}
 ${initialFiles.length?`<h3>Original evidence</h3><div class="ticket-files">${initialFiles.map(f=>`<a class="ticket-file" href="/tickets/attachments/${f.id}">${icon('download',{size:16})} ${val(f.original_name)} <span>${Math.ceil(f.file_size/1024)} KB</span></a>`).join('')}</div>`:'<p class="muted tiny">No original attachments submitted.</p>'}
 ${staff?`<form class="ticket-status-form" method="post" action="/staff/tickets/${ticket.id}/status">${token(ctx)}
  <label>Ticket status<select name="status">${['open','reviewing','resolved'].map(x=>`<option value="${x}" ${ticket.status===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label>
  <button class="btn btn-outline">Update status</button></form>
  ${ticket.status!=='resolved'?`<form method="post" action="/staff/tickets/${ticket.id}/status" class="ticket-resolve-form">${token(ctx)}
  <button class="btn btn-outline btn-sm" name="status" value="resolved">${icon('circle-check',{size:17})} Mark as resolved</button></form>`:''}`:''}
 </section>
 <section class="panel padded ticket-conversation chat-ticket"><div class="panel-heading ticket-heading">
   <div><h2>Ticket conversation</h2><p class="muted tiny">Private messages between you and the support team</p></div>
   <span class="pill pill-accepted">${messages.length} messages</span></div>
   <div class="ticket-chat-log">${messages.length?messages.map(m=>`<article class="ticket-message chat-bubble ${m.author_id===ctx.user.id?'is-own':''}">
     ${avatar({id:m.author_id,avatar:m.avatar,display_name:m.display_name},'sm')}
     <div class="ticket-message-main"><div class="ticket-message-meta"><b>${val(m.display_name)}</b>
       <small>${m.author_id===ticket.user_id?'Member':'Staff'} · ${date(m.created_at)}</small></div>
       <div class="ticket-bubble-body">${text(m.body)}</div>
       ${filesFor(m.id)?`<div class="ticket-message-files">${filesFor(m.id)}</div>`:''}
     </div></article>`).join(''):'<div class="empty">No messages yet. Send a reply to start the conversation.</div>'}</div>
   <form method="post" action="${submit}" enctype="multipart/form-data" class="ticket-chat-composer">
      ${token(ctx)}<label class="sr-only">Reply to ticket</label>
      <textarea name="body" rows="3" maxlength="2000" minlength="1" required placeholder="Write your reply..."></textarea>
      <div class="ticket-compose-actions"><label class="btn btn-outline btn-sm ticket-upload-control">📎 Upload video/pictures
         <input type="file" name="evidence" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm">
      </label><small class="muted">Max 5 files · 12 MB each</small>
      <button class="btn btn-primary btn-sm" type="submit">${icon('send',{size:17})} Send Reply</button></div>
   </form>
 </section></div></div>`);
}
export function staffTicketQueue(ctx,{tickets=[],status='active'}){
 const label=status==='all'?'All accessible tickets':'All active tickets';
 return shell(ctx,'Support Tickets',`<div class="support-container">
 ${titlebar('STAFF TICKETS','Ticket <span class="gradient">queue.</span>','Only tickets you have permission to view will appear.')}
 <div class="actions"><a class="btn ${status==='active'?'btn-primary':'btn-outline'}" href="/staff/tickets">Active</a>
 <a class="btn ${status==='all'?'btn-primary':'btn-outline'}" href="/staff/tickets?status=all">All accessible</a></div>
 <div class="panel ticket-queue-panel"><div class="panel-heading"><h2>${label}</h2><span class="muted">${tickets.length} ticket${tickets.length===1?'':'s'}</span></div>
 ${queueRows(tickets)||'<div class="empty">No tickets currently require attention.</div>'}</div></div>`);
}
export function queueRows(tickets=[]){
 if(!tickets.length)return '';
 return `<div class="table-wrap"><table><thead><tr><th>USER</th><th>TYPE</th><th>STATUS</th><th>UPDATED</th><th></th></tr></thead><tbody>
 ${tickets.map(t=>`<tr><td><b>${val(t.display_name||t.username||'Member')}</b><br><small class="muted">#${val(t.displayId||t.id)}</small></td>
 <td><span class="ticket-type-label ticket-type-${val(t.category)}">${categoryLabel(t.category)}</span></td>
 <td>${tag(t.status)}</td><td>${date(t.updated_at)}</td><td><a class="table-link" href="${t.href}">Open →</a></td></tr>`).join('')}</tbody></table></div>`;
}
