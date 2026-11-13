// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,token,avatar,tag,titlebar} from './views.js';
import {SUPPORT_CATEGORIES,categoryLabel,ticketFields} from './support.js';
import {icon} from './icons.js';
import {evidenceGallery} from './evidence-views.js';

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
   bug_report:field('description','Describe the bug',{multiline:true,placeholder:'What went wrong?'}),
   player_report:field('reported_player','Player',{placeholder:"Player's username"})+
     field('rule_broken','Rule',{placeholder:'e.g. Hard-R, Spamming, Threats'})+
     field('description','Details',{multiline:true,placeholder:'What happened?'}),
   reward_claim:field('prize','Reward / Prize',{placeholder:'e.g. Discord Nitro'}),
   staff_report:field('staff_username','Staff member',{placeholder:"Staff member's username"})+
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
 <label class="support-upload-label">${evidenceText}
 <span class="ticket-field-help">Images or video · 5 files max · 12 MB each</span>
 <span class="support-upload"><span>Upload files</span>
 <input type="file" name="evidence" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm" multiple ${required?'required':''}></span>
 </label>
 
 <button class="btn support-submit ${category==='ban_appeal'?'appeal-submit':''}" type="submit">${category==='ban_appeal'?'Submit Appeal':'Submit Ticket'}</button>
 </form></div>`);
}
export function myTickets(ctx,{tickets=[]}){
 const appCount=tickets.filter(t=>t.type==='application').length;
 return shell(ctx,'My Tickets',`<div class="support-container">
 ${titlebar('MY SUPPORT','Your <span class="gradient">tickets.</span>','','<a class="btn btn-primary" href="/tickets/new">+ Submit Ticket</a>')}
 <div class="panel"><div class="panel-heading"><h2>History</h2><span class="muted">${tickets.length} total · ${appCount} application${appCount===1?'':'s'}</span></div>
 ${tickets.length?`<div class="table-wrap"><table><thead><tr><th>TICKET</th><th>TYPE</th><th>STATUS</th><th>LAST UPDATED</th><th></th></tr></thead>
 <tbody>${tickets.map(t=>`<tr><td><b>#${t.id}</b></td><td><span class="ticket-type-label ticket-type-${val(t.category)}">${val(categoryLabel(t.category))}</span></td>
 <td>${tag(t.status)}${t.unread?` <span class="pill pill-reviewing">${t.unread} new</span>`:''}</td><td>${date(t.updated_at)}</td>
 <td><a class="table-link" href="${t.href}">Open →</a></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No tickets yet.</div>'}</div></div>`);
}
function fieldList(ticket){
 const data=ticketFields(ticket);
 const pairs={
  bug_report:[['Bug Description',data.description]],
  player_report:[['Player',data.reported_player],['Rule',data.rule_broken],['Details',data.description]],
  reward_claim:[['Reward / Prize',data.prize]],
  staff_report:[['Staff member',data.staff_username],['Details',data.description]],
  ban_appeal:[['Minecraft Username',data.minecraft_username],['Ban reason',data.ban_reason],['Appeal reason',data.appeal_reason]]
 };
 return (pairs[ticket.category]||[]).map(([label,v])=>`<div class="answer"><b>${label}</b><p>${text(v)}</p></div>`).join('');
}
export function supportTicketPage(ctx,{ticket,messages=[],attachments=[],staff=false}){
 const privateTier=ticket.category==='staff_report'?(ticket.visibility==='owner'?'Owner Confidential':'Admin Confidential'):'';
 const back=staff?'/staff/tickets':'/tickets/mine';
 const submit=staff?'/staff/tickets/'+ticket.id+'/reply':'/tickets/'+ticket.id+'/reply';
 const filesFor=id=>evidenceGallery(attachments.filter(f=>f.message_id===id),'/tickets/attachments',true);
 const initialFiles=attachments.filter(f=>!f.message_id);
 return shell(ctx,'Ticket #'+ticket.id,`<div class="support-container ticket-view">
 <a class="support-back" href="${back}">← Back to tickets</a>
 ${titlebar('PRIVATE SUPPORT TICKET','Ticket <span class="gradient">#${ticket.id}</span>','Opened '+date(ticket.created_at))}
 <div class="ticket-detail-head"><span class="ticket-type-label ticket-type-${val(ticket.category)}">${categoryLabel(ticket.category)}</span> ${tag(ticket.status)}
 ${privateTier?`<span class="pill pill-protected">${privateTier}</span>`:''}</div>
 <div class="ticket-detail-layout">
 <section class="panel padded ticket-detail-card"><h2>Request details</h2>
 <div class="ticket-reporter">${avatar({id:ticket.user_id,avatar:ticket.avatar,display_name:ticket.display_name},'sm')}
 <span><b>${val(ticket.display_name)}</b><small>@${val(ticket.username)}</small></span></div>
 ${fieldList(ticket)}
 ${initialFiles.length?`<h3>Original evidence</h3>${evidenceGallery(initialFiles)}`:'<p class="muted tiny">No attachments.</p>'}
 ${staff?`<form class="ticket-status-form" method="post" action="/staff/tickets/${ticket.id}/status">${token(ctx)}
  <label>Ticket status<select name="status">${['open','reviewing','resolved'].map(x=>`<option value="${x}" ${ticket.status===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label>
  <button class="btn btn-outline">Update status</button></form>
  ${ticket.status!=='resolved'?`<form method="post" action="/staff/tickets/${ticket.id}/status" class="ticket-resolve-form">${token(ctx)}
  <button class="btn btn-outline btn-sm" name="status" value="resolved">${icon('circle-check',{size:17})} Mark as resolved</button></form>`:''}`:''}
 </section>
 <section class="panel padded ticket-conversation chat-ticket"><div class="panel-heading ticket-heading">
   <div><h2>Messages</h2></div>
   <span class="pill pill-accepted">${messages.length} messages</span></div>
   <div class="ticket-chat-log">${messages.length?messages.map(m=>`<article class="ticket-message chat-bubble ${m.author_id===ctx.user.id?'is-own':''}">
     ${avatar({id:m.author_id,avatar:m.avatar,display_name:m.display_name},'sm')}
     <div class="ticket-message-main"><div class="ticket-message-meta"><b>${val(m.display_name)}</b>
       <small>${m.author_id===ticket.user_id?'Member':'Staff'} · ${date(m.created_at)}</small></div>
       <div class="ticket-bubble-body">${text(m.body)}</div>
       ${filesFor(m.id)?`<div class="ticket-message-files">${filesFor(m.id)}</div>`:''}
     </div></article>`).join(''):'<div class="empty">No messages yet.</div>'}</div>
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
 ${titlebar('STAFF TICKETS','Ticket <span class="gradient">queue.</span>','')}
 <div class="actions"><a class="btn ${status==='active'?'btn-primary':'btn-outline'}" href="/staff/tickets">Active</a>
 <a class="btn ${status==='all'?'btn-primary':'btn-outline'}" href="/staff/tickets?status=all">All</a>
 <a class="btn btn-outline" href="/tickets/mine">My tickets</a></div>
 <div class="panel ticket-queue-panel"><div class="panel-heading"><h2>${label}</h2><span class="muted">${tickets.length} ticket${tickets.length===1?'':'s'}</span></div>
 ${queueRows(tickets)||'<div class="empty">No active tickets.</div>'}</div></div>`);
}
export function queueRows(tickets=[]){
 if(!tickets.length)return '';
 return `<div class="table-wrap"><table><thead><tr><th>USER</th><th>TYPE</th><th>STATUS</th><th>UPDATED</th><th></th></tr></thead><tbody>
 ${tickets.map(t=>`<tr><td><b>${val(t.display_name||t.username||'Member')}</b><br><small class="muted">#${val(t.displayId||t.id)}</small></td>
 <td><span class="ticket-type-label ticket-type-${val(t.category)}">${categoryLabel(t.category)}</span></td>
 <td>${tag(t.status)}</td><td>${date(t.updated_at)}</td><td><a class="table-link" href="${t.href}">Open →</a></td></tr>`).join('')}</tbody></table></div>`;
}
