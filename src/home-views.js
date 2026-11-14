// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,avatar,tag,token,titlebar,applicationStatusTag} from './views.js';
import {categoryLabel} from './support.js';
import {icon} from './icons.js';

const date=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const text=v=>esc(String(v??'')).replace(/\n/g,'<br>');
const greeting=u=>(u?.display_name||u?.username||'Member').slice(0,35);
export function memberHome(ctx,{posts=[],tickets=[],applications=[]}={}){
 const active=tickets.filter(t=>t.status!=='resolved').length;
 const unread=tickets.reduce((sum,t)=>sum+(Number(t.unread)||0),0);
 const pending=applications.filter(a=>!['accepted','denied'].includes(a.status)).length;
 return shell(ctx,'Home',`<div class="dash-home">
   <section class="dash-welcome">
     <div>
       <h1>Welcome back, <span class="gradient">${esc(greeting(ctx.user))}.</span></h1>

       <div class="dash-welcome-actions"><a class="btn btn-primary" href="/tickets/new">+ Submit a Ticket</a>
       <a class="btn btn-outline" href="/feed">Community Feed →</a><a class="btn btn-outline" href="/profile">${icon('circle-user-round',{size:17})} My Profile</a></div></div>
     <img class="dash-brand-mark" src="/static/sb-logo.png" alt="SB Store" width="112" height="112">
   </section>
   <div class="dash-summary-row">
     <a href="/tickets/mine" class="dash-summary-card"><span>OPEN TICKETS</span><strong>${active}</strong><small>${unread?String(unread)+' unread':'View'} →</small></a>
     <a href="/dashboard" class="dash-summary-card"><span>APPLICATIONS</span><strong>${pending}</strong><small>View →</small></a>
     <a href="/profile" class="dash-summary-card"><span>PROFILE</span><strong>${icon('circle-user-round',{size:30})}</strong><small>View →</small></a>
   </div>
   <div class="dash-member-grid">
     <section class="panel padded dash-quick-actions"><div class="section-heading"><h2>Quick access</h2></div>
       <a class="dash-action" href="/tickets/new"><span class="dash-action-icon">${icon('ticket-plus',{size:21})}</span><span><b>Submit a Ticket</b><small>Reports and appeals</small></span><span class="dash-chevron">${icon('chevron-right',{size:18})}</span></a>
       <a class="dash-action" href="/tickets/mine"><span class="dash-action-icon">${icon('tickets',{size:21})}</span><span><b>View My Tickets</b><small>Track your requests</small></span><span class="dash-chevron">${icon('chevron-right',{size:18})}</span></a>
       <a class="dash-action" href="/profile"><span class="dash-action-icon">${icon('circle-user-round',{size:21})}</span><span><b>My Profile</b><small>Posts and activity</small></span><span class="dash-chevron">${icon('chevron-right',{size:18})}</span></a><a class="dash-action" href="/profile/edit"><span class="dash-action-icon">${icon('user-round-pen',{size:21})}</span><span><b>Customize Profile</b><small>Edit appearance</small></span><span class="dash-chevron">${icon('chevron-right',{size:18})}</span></a>
     </section>
     <section class="panel padded dash-feed-preview"><div class="section-heading"><h2>Main Feed</h2><a href="/feed" class="table-link">See all →</a></div>
       ${posts.length?posts.map(p=>`<article class="dash-post-preview">
        ${avatar({id:p.user_id,avatar:p.avatar,display_name:p.display_name},'sm')}
        <div><div class="dash-post-top"><b>${esc(p.nickname||p.display_name)}</b><small>@${esc(p.username)} · ${date(p.created_at)}</small></div>
        <p>${text(p.body||'Shared a picture with the community.').slice(0,1200)}</p>
        <a class="table-link" href="/post/${p.id}">View post →</a></div></article>`).join(''):'<p class="muted">No community posts yet. Be the first to share something.</p>'}
     </section>
   </div>
 </div>`);
}
export function staffHome(ctx,{tickets=[],staffMessages=[],applications=[],activeCount=0,ownerCount=0}={}){
 const items=tickets;
 const awaitingMember=items.filter(t=>t.queue_status==='awaiting_member').length;
 const awaitingOwner=items.filter(t=>t.queue_status==='awaiting_owner').length;
 const needsAttention=items.filter(t=>ctx.role==='owner'?t.queue_status==='awaiting_owner'||t.queue_status==='awaiting_staff':!['awaiting_member','awaiting_owner'].includes(t.queue_status)).length; // Scrollable live list of all active tickets returned by the staff queue.
 return shell(ctx,'Staff Home',`<div class="dash-home">
   <section class="dash-welcome staff-hero">
     <div>
       <h1>Staff command <span class="gradient">center.</span></h1>

       <div class="dash-welcome-actions"><a href="/staff/tickets" class="btn btn-primary">View All Tickets →</a>
       <a href="/applications" class="btn btn-outline">Application management</a></div></div>
   </section>
   <div class="dash-summary-row">
     <a class="dash-summary-card" href="/staff/tickets"><span>ACTIVE CASES</span><strong>${items.length}</strong><small>View →</small></a>
     <a class="dash-summary-card" href="/staff"><span>APPLICATIONS</span><strong>${applications.length}</strong><small>View →</small></a>
     <a class="dash-summary-card" href="${ctx.role==='owner'?'/owner/approvals':'/staff/tickets'}"><span>${ctx.role==='owner'?'FINAL APPROVALS':'NEEDS MY ATTENTION'}</span>
       <strong>${ctx.role==='owner'?ownerCount:needsAttention}</strong><small>${ctx.role==='owner'?'Review':'Edit'} →</small></a>
   </div>
   <div class="staff-dashboard-columns">
     <section class="panel padded staff-chat-panel"><div class="section-heading">
        <div><h2>Staff Chat</h2></div><span class="pill pill-accepted">${icon('activity',{size:14})} Team</span>
      </div>
      <div id="staff-chat-messages" class="staff-chat-messages" data-last-id="${staffMessages.at(-1)?.id||0}" data-poll-url="/staff/chat/messages">
        ${staffMessages.length?staffMessages.map(m=>staffChatMessage(m)).join(''):'<div class="empty staff-chat-empty">No messages yet. Say hello to your team.</div>'}
      </div>
      <form id="staff-chat-form" method="post" action="/staff/chat/send">${token(ctx)}
        <label class="sr-only" for="staff-chat-body">Message staff</label>
        <textarea id="staff-chat-body" name="body" rows="3" maxlength="1500" required placeholder="Message your staff team..."></textarea>
        <div class="staff-chat-compose-actions">
        <button type="submit" class="btn btn-primary">Send Message →</button></div>
      </form>
     </section>
     <section class="panel padded dash-staff-tickets">
       <div class="section-heading"><div><h2>Active Cases</h2></div>
       <a href="/staff/tickets" class="table-link">Full queue →</a></div>
       <p class="muted tiny">${items.filter(t=>!['application','promotion'].includes(t.category)).length} support · ${items.filter(t=>t.category==='application').length} applications · ${items.filter(t=>t.category==='promotion').length} promotions</p><p class="muted tiny">${needsAttention} need attention · ${awaitingMember} awaiting member · ${awaitingOwner} awaiting owner</p><div class="dash-ticket-list">${items.length?items.map(t=>`<a class="dash-ticket-row" href="${t.href}">
         <span class="ticket-type-label ticket-type-${esc(t.category)}">${categoryLabel(t.category)}</span>
         <span class="dash-ticket-member"><b>${esc(t.display_name||'Member')}</b><small>#${esc(t.displayId||t.id)} · ${date(t.updated_at)} · <span data-wait-since="${t.updated_at}"></span></small></span>
         <span class="dash-ticket-status">${tag(t.queue_status||t.status)}${t.unread?`<span class="pill">${t.unread} unread</span>`:''}</span>
       </a>`).join(''):'<div class="empty">No active cases.</div>'}</div>
     </section>
   </div>
 </div>`);
}
export function staffChatMessage(m){
 const who=esc(m.display_name||m.username||'Staff');
 return `<article class="staff-chat-message" data-message-id="${m.id}">
  ${avatar({id:m.author_id,avatar:m.avatar,display_name:m.display_name},'sm')}
  <div class="staff-chat-entry"><div class="staff-chat-meta"><b>${who}</b><small>@${esc(m.username)} · ${date(m.created_at)}</small></div>
  <div class="staff-chat-text">${text(m.body)}</div></div></article>`;
}
export function appealHome(ctx,{tickets=[]}={}){
 return shell(ctx,'Ban Appeal',`<section class="dash-welcome"><div>
 <h1>Ban appeal <span class="gradient">portal.</span></h1>
 <p>You are signed in with Discord, but you're not a verified member of this server. You can submit and follow a Ban Appeal, or explore our staff team.</p>
 <div class="dash-welcome-actions"><a class="btn btn-primary" href="/tickets/new/ban_appeal">Submit Ban Appeal</a>
 <a class="btn btn-outline" href="/tickets/mine">View My Appeals (${tickets.length})</a>
 <a class="btn btn-outline" href="/team">Meet the Team</a></div></div></section>`);
}
