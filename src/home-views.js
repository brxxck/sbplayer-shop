// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,avatar,tag,token,titlebar} from './views.js';
import {categoryLabel} from './support.js';

const date=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const text=v=>esc(String(v??'')).replace(/\n/g,'<br>');
const greeting=u=>(u?.display_name||u?.username||'Member').slice(0,35);
export function memberHome(ctx,{posts=[],tickets=[],applications=[]}={}){
 const active=tickets.filter(t=>t.status!=='resolved').length;
 const unread=tickets.reduce((sum,t)=>sum+(Number(t.unread)||0),0);
 const pending=applications.filter(a=>!['accepted','denied'].includes(a.status)).length;
 return shell(ctx,'Home',`<div class="dash-home">
   <section class="dash-welcome">
     <div><span class="eyebrow">SB'S & CAM'S STORE · MEMBER DASHBOARD</span>
       <h1>Welcome back, <span class="gradient">${esc(greeting(ctx.user))}.</span></h1>
       <p>Your community, support requests and profile in one place.</p>
       <div class="dash-welcome-actions"><a class="btn btn-primary" href="/tickets/new">+ Submit a Ticket</a>
       <a class="btn btn-outline" href="/feed">Community Feed →</a><a class="btn btn-outline" href="/profile">◉ My Profile</a></div></div>
     <img class="dash-brand-mark" src="/static/sb-logo.png" alt="SB Store" width="112" height="112">
   </section>
   <div class="dash-summary-row">
     <a href="/tickets/mine" class="dash-summary-card"><span>MY OPEN TICKETS</span><strong>${active}</strong><small>${unread?String(unread)+' unread replies':'View your support requests'} →</small></a>
     <a href="/dashboard" class="dash-summary-card"><span>STAFF APPLICATIONS</span><strong>${pending}</strong><small>Track application progress →</small></a>
     <a href="/profile" class="dash-summary-card"><span>MY PROFILE</span><strong>◉</strong><small>View your social profile and posts →</small></a>
   </div>
   <div class="dash-member-grid">
     <section class="panel padded dash-quick-actions"><div class="section-heading"><h2>Quick access</h2></div>
       <a class="dash-action" href="/tickets/new"><span class="dash-action-icon">▣</span><span><b>Submit a Ticket</b><small>Bug reports, player reports, reward claims, staff reports and ban appeals</small></span><span class="dash-chevron">›</span></a>
       <a class="dash-action" href="/tickets/mine"><span class="dash-action-icon">◷</span><span><b>View My Tickets</b><small>Continue chats with staff and check resolved tickets</small></span><span class="dash-chevron">›</span></a>
       <a class="dash-action" href="/profile"><span class="dash-action-icon">◉</span><span><b>My Profile</b><small>See your posts, followers, media and activity</small></span><span class="dash-chevron">›</span></a><a class="dash-action" href="/profile/edit"><span class="dash-action-icon">✦</span><span><b>Customize Profile</b><small>Change your bio, banner, pictures, links and layout</small></span><span class="dash-chevron">›</span></a>
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
 const name=greeting(ctx.user);
 const items=tickets; // Scrollable live list of all active tickets returned by the staff queue.
 return shell(ctx,'Staff Home',`<div class="dash-home">
   <section class="dash-welcome staff-hero">
     <div><span class="eyebrow">SB'S & CAM'S STORE · STAFF WORKSPACE</span>
       <h1>Staff command <span class="gradient">center.</span></h1>
       <p>Welcome back, ${esc(name)}. Manage support tickets, talk with your team and keep everything organised.</p>
       <div class="dash-welcome-actions"><a href="/staff/tickets" class="btn btn-primary">View All Tickets →</a>
       <a href="/profile" class="btn btn-outline">◉ My Profile</a><a href="/profile/edit" class="btn btn-outline">✎ Customize Profile</a></div></div>
   </section>
   <div class="dash-summary-row">
     <a class="dash-summary-card" href="/staff/tickets"><span>ACTIVE SUPPORT TICKETS</span><strong>${activeCount}</strong><small>See the full accessible queue →</small></a>
     <a class="dash-summary-card" href="/staff"><span>ACTIVE APPLICATIONS</span><strong>${applications.length}</strong><small>View staff applications →</small></a>
     <a class="dash-summary-card" href="${ctx.role==='owner'?'/owner/approvals':'/profile/edit'}"><span>${ctx.role==='owner'?'FINAL APPROVALS':'CUSTOMIZE PROFILE'}</span>
       <strong>${ctx.role==='owner'?ownerCount:'✎'}</strong><small>${ctx.role==='owner'?'Owner review queue':'Personalize your profile'} →</small></a>
   </div>
   <div class="staff-dashboard-columns">
     <section class="panel padded staff-chat-panel"><div class="section-heading">
        <div><h2>Staff Chat</h2><p class="muted tiny">Private · verified staff members only</p></div><span class="pill pill-accepted">● Team</span>
      </div>
      <div id="staff-chat-messages" class="staff-chat-messages" data-last-id="${staffMessages.at(-1)?.id||0}" data-poll-url="/staff/chat/messages">
        ${staffMessages.length?staffMessages.map(m=>staffChatMessage(m)).join(''):'<div class="empty staff-chat-empty">No messages yet. Say hello to your team.</div>'}
      </div>
      <form id="staff-chat-form" method="post" action="/staff/chat/send">${token(ctx)}
        <label class="sr-only" for="staff-chat-body">Message staff</label>
        <textarea id="staff-chat-body" name="body" rows="3" maxlength="1500" required placeholder="Message your staff team..."></textarea>
        <div class="staff-chat-compose-actions"><span class="muted tiny">Visible to reviewers, admins and owners</span>
        <button type="submit" class="btn btn-primary">Send Message →</button></div>
      </form>
     </section>
     <section class="panel padded dash-staff-tickets">
       <div class="section-heading"><div><h2>All Active Tickets</h2><p class="muted tiny">Support requests and staff applications you can access</p></div>
       <a href="/staff/tickets" class="table-link">Full queue →</a></div>
       <div class="dash-ticket-list">${items.length?items.map(t=>`<a class="dash-ticket-row" href="${t.href}">
         <span class="ticket-type-label ticket-type-${esc(t.category)}">${categoryLabel(t.category)}</span>
         <span class="dash-ticket-member"><b>${esc(t.display_name||'Member')}</b><small>#${esc(t.displayId||t.id)} · ${date(t.updated_at)}</small></span>
         <span class="dash-ticket-status">${tag(t.status)}</span>
       </a>`).join(''):'<div class="empty">There are no active tickets requiring attention.</div>'}</div>
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
 return shell(ctx,'Ban Appeal',`<section class="dash-welcome"><div><span class="eyebrow">DISCORD-VERIFIED APPEALS</span>
 <h1>Ban appeal <span class="gradient">portal.</span></h1>
 <p>You are signed in with Discord, but you're not a verified member of this server. You can submit and follow a Ban Appeal, or explore our staff team.</p>
 <div class="dash-welcome-actions"><a class="btn btn-primary" href="/tickets/new/ban_appeal">Submit Ban Appeal</a>
 <a class="btn btn-outline" href="/tickets/mine">View My Appeals (${tickets.length})</a>
 <a class="btn btn-outline" href="/team">Meet the Team</a></div></div></section>`);
}
