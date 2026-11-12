// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,token,titlebar,tag,avatar} from './views.js';
import {icon} from './icons.js';
const when=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const html=v=>esc(v||'').replace(/\n/g,'<br>');
const own=id=>'/promotions/'+Number(id);
const staff=id=>'/staff/promotions/'+Number(id);
const rows=(tickets,to)=>tickets.length?
  '<div class="table-wrap"><table><thead><tr><th>USER</th><th>PROMOTION</th><th>STATUS</th><th>UPDATED</th><th></th></tr></thead><tbody>'+
  tickets.map(t=>'<tr><td>'+esc(t.display_name||t.username||'Your ticket')+' #'+t.id+'</td><td>'+esc(t.from_label)+' → '+esc(t.to_label)+'</td><td>'+tag(t.status)+(t.role_sync_status==='failed'?' Delivery failed':'')+'</td><td>'+when(t.updated_at)+'</td><td><a class="table-link" href="'+to(t.id)+'">Open →</a></td></tr>').join('')+
  '</tbody></table></div>':'<div class="empty">No promotion tickets currently.</div>';
export function promotionHome(ctx,{stage=null,tickets=[]}={}){
 const heading=stage?'<h2>Eligible promotion: '+esc(stage.fromLabel)+' → '+esc(stage.toLabel)+'</h2><p class="muted">Two different admins must approve your promotion.</p><a class="btn btn-primary" href="/promotions/new">'+icon('award',{size:17})+' Request Promotion</a>':
 '<p class="muted">You must currently hold Temp Mod or Mod in Discord to submit a new promotion request. Existing tickets remain accessible.</p>';
 return shell(ctx,'Promotion Tickets','<div class="support-container">'+titlebar('STAFF PROGRESSION','Promotion <span class="gradient">tickets.</span>','Only verified Temp Mods and Mods can submit promotion requests.')+
 '<section class="panel padded">'+heading+'</section><section class="panel"><div class="panel-heading"><h2>Your promotion history</h2></div>'+rows(tickets,own)+'</section></div>');
}
export function promotionForm(ctx,stage){
 return shell(ctx,'Request Promotion','<div class="support-form-wrap"><a class="support-back" href="/promotions">← Back</a>'+
 titlebar('STAFF PROGRESSION','Request a <span class="gradient">promotion.</span>','Private request to the administration team.')+
 '<form class="support-form panel padded" method="post" action="/promotions/new">'+token(ctx)+
 '<label>Verified account<input readonly class="discord-identity" value="@'+esc(ctx.user.username)+'"></label>'+
 '<label>Promotion<input readonly class="discord-identity" value="'+esc(stage.fromLabel)+' → '+esc(stage.toLabel)+'"></label>'+
 '<label>Why do you deserve this promotion?<textarea name="reason" rows="7" minlength="30" maxlength="3000" required placeholder="Explain your moderation experience, activity and contributions."></textarea></label>'+
 '<p class="muted tiny">Only one active request at a time. You cannot approve your own request.</p><button class="btn btn-primary">Submit Promotion Ticket</button></form></div>');
}
export function promotionQueue(ctx,{tickets=[]}={}){
 return shell(ctx,'Promotion Reviews','<div class="support-container">'+titlebar('ADMIN REVIEWS','Promotion <span class="gradient">queue.</span>','Two distinct admin approvals are required.')+
 '<div class="panel"><div class="panel-heading"><h2>Promotion requests</h2></div>'+rows(tickets,staff)+'</div></div>');
}
export function promotionDetails(ctx,{ticket,decisions=[],messages=[],staffView=false}){
 const canVote=staffView&&['open','reviewing'].includes(ticket.status)&&ctx.user.id!==ticket.user_id&&!decisions.some(d=>d.admin_id===ctx.user.id);
 const retry=staffView&&ticket.status==='accepted'&&ticket.role_sync_status!=='assigned';
 const path=staffView?staff(ticket.id):own(ticket.id);
 const votes=staffView?'<h3>Admin decisions</h3>'+(decisions.length?decisions.map(d=>'<div class="audit-mini"><b>'+esc(d.display_name||d.admin_id)+'</b> '+tag(d.choice)+'<small>'+when(d.created_at)+'</small><p>'+html(d.note)+'</p></div>').join(''):'<p class="muted">Awaiting admin votes.</p>')+
 (canVote?'<form method="post" action="'+path+'/decide">'+token(ctx)+'<label>Private decision note<textarea name="note" maxlength="1500" rows="3"></textarea></label><div class="choice-row"><button class="btn btn-success" name="choice" value="accept">'+icon('check',{size:17})+' Approve Promotion</button><button class="btn btn-danger" name="choice" value="deny">'+icon('x',{size:17})+' Deny Promotion</button></div></form>':'')+
 (retry?'<form method="post" action="'+path+'/retry">'+token(ctx)+'<button class="btn btn-outline">'+icon('refresh-cw',{size:17})+' Retry Discord Role Delivery</button></form>':''):'';
 const chat=messages.map(m=>'<article class="ticket-message chat-bubble"><div class="ticket-message-main"><div class="ticket-message-meta"><b>'+esc(m.display_name||m.username)+'</b> <small>'+when(m.created_at)+'</small></div><div class="ticket-bubble-body">'+html(m.body)+'</div></div></article>').join('');
 return shell(ctx,'Promotion #'+ticket.id,'<div class="support-container ticket-view"><a class="support-back" href="'+(staffView?'/staff/promotions':'/promotions')+'">← Back</a>'+
 titlebar('PRIVATE PROMOTION TICKET','Promotion <span class="gradient">#'+ticket.id+'</span>','Submitted '+when(ticket.created_at))+
 '<div class="ticket-detail-head">'+tag(ticket.status)+' <span class="pill">'+esc(ticket.from_label)+' → '+esc(ticket.to_label)+'</span></div><div class="ticket-detail-layout">'+
 '<section class="panel padded ticket-detail-card"><h2>Promotion request</h2><div class="ticket-reporter">'+avatar({id:ticket.user_id,avatar:ticket.avatar,display_name:ticket.display_name},'sm')+
 '<span><b>'+esc(ticket.display_name)+'</b><small>@'+esc(ticket.username)+'</small></span></div><div class="answer"><b>Reason</b><p>'+html(ticket.reason)+'</p></div>'+
 (ticket.status==='accepted'?'<div class="notice-box">Discord role delivery: <b>'+esc(ticket.role_sync_status)+'</b><p>'+esc(ticket.role_sync_error)+'</p></div>':'')+votes+'</section>'+
 '<section class="panel padded ticket-conversation chat-ticket"><h2>Private conversation</h2><div class="ticket-chat-log">'+(chat||'<p class="muted">No messages yet.</p>')+'</div>'+
 '<form method="post" action="'+path+'/reply" class="ticket-chat-composer">'+token(ctx)+'<textarea name="body" rows="3" minlength="1" maxlength="2000" required placeholder="Write your reply..."></textarea><button class="btn btn-primary btn-sm">'+icon('send',{size:17})+' Send Reply</button></form>'+
 '</section></div></div>');
}
