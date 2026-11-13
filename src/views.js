// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {discordAvatar} from './discord.js';
import {safeHttpUrl} from './logic.js';
import {icon,navigationIcon} from './icons.js';
import {evidenceGallery,evidenceViewerDialog} from './evidence-views.js';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const lines=v=>esc(v).replace(/\n/g,'<br>');
const when=v=>v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
const path=(s)=>String(s||'').startsWith('/uploads/')?s:'';
// Version the stylesheet URL so upgrades cannot reuse stale browser CSS.
const assetVersion = '1.8.0-mega-standalone';
const name=u=>u?.nickname||u?.display_name||u?.global_name||u?.username||'Unknown';
export function avatar(u,size='md',custom=false) {
  const source=custom&&u?.avatar_path?path(u.avatar_path):discordAvatar(u);
  const px={sm:32,side:40,md:43,menu:56,lg:64,xl:83,xxl:106}[size]||43;
  // Explicit HTML dimensions and inline fallbacks keep images small even if a browser delays loading CSS.
  return `<img class="avatar ${size}" src="${attr(source)}" alt="Avatar of ${attr(name(u))}" width="${px}" height="${px}" style="width:${px}px;height:${px}px;min-width:${px}px;max-width:${px}px;max-height:${px}px;object-fit:cover;border-radius:50%" loading="${size==='menu'||size==='sm'?'eager':'lazy'}" decoding="async">`;
}
export function tag(status) {return `<span class="pill pill-${attr(status||'pending')}">${esc(String(status||'pending').replaceAll('_',' '))}</span>`;}
export const token=(ctx)=>`<input type="hidden" name="_csrf" value="${attr(ctx.csrf)}">`;
const navLink=(link,label,icon,ctx)=>`<a class="nav-link ${ctx.pathname===link||ctx.pathname.startsWith(link+'/')?'active':''}" href="${link}"><span class="nav-icon">${navigationIcon(link)}</span><span>${label}</span></a>`;

// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Public, non-sensitive Discord previews. Do not include private ticket details.
const publicLinkPages=Object.freeze({
 '/':["SB's & Cam's Store","Official SB's & Cam's Store community website. Connect with Discord, share posts, open tickets and discover our team."],
 '/team':["Our Team | SB's & Cam's Store","Meet the staff and community team of SB's & Cam's Store. Sign in with Discord to browse the team."],
 '/mega-team':["MegaSMP | SB's & Cam's Store","SBsxScam team statistics and captured MegaSMP Top 10 standings."],
 '/mega-team/leaderboard':["MegaSMP Top 10 | SB's & Cam's Store","Verified InPvP team standings, level, bank and stats."],
 '/members':["Community Members | SB's & Cam's Store","Find member profiles and connect with our community."],
 '/feed':["Main Feed | SB's & Cam's Store","Browse posts, updates and community conversations."],
 '/saved':["Saved Posts | SB's & Cam's Store","Private saved social posts for signed-in members."],
 '/notifications':["Notifications | SB's & Cam's Store","Private social activity notifications for signed-in members."],
 '/suggestions':["Server Suggestions | SB's & Cam's Store","Share your ideas and vote on community suggestions."],
 '/apply':["Staff Applications | SB's & Cam's Store","Apply for a staff role and track your application on the official portal."],
 '/tickets/new':["Support Tickets | SB's & Cam's Store","Create a private report, reward claim or ban appeal in our support portal."],
 '/tickets/new/ban_appeal':["Ban Appeals | SB's & Cam's Store","Submit a ban or mute appeal through our Discord-verified support portal."],
 '/dashboard':["My Applications | SB's & Cam's Store","Sign in to follow your staff applications and private messages."],
 '/tickets/mine':["My Support Tickets | SB's & Cam's Store","Sign in with Discord to access your private ticket history."],
 '/staff':["Staff Reviews | SB's & Cam's Store","Private staff applications and review tools. Authorized staff sign-in required."],
 '/promotions': ["Promotion Tickets | SB's & Cam's Store","Private promotion requests for Temp Mods and Mods."],
  '/staff/promotions': ["Promotion Reviews | SB's & Cam's Store","Private promotion decisions for administrators."],
  '/staff/tickets':["Staff Support Tickets | SB's & Cam's Store","Private staff support queue. Authorized Discord role required."],
 '/owner/approvals':["Owner Final Approvals | SB's & Cam's Store","Private staff application decisions for authorized owners."]
});
export function linkPreviewData(p='/'){
 if(Object.prototype.hasOwnProperty.call(publicLinkPages,p))return publicLinkPages[p];
 if(/^\/u\/\d{15,22}$/.test(p))return ["Member Profile | SB's & Cam's Store","Discover member profiles on the official community website."];
 if(/^\/post\/\d+$/.test(p))return ["Community Post | SB's & Cam's Store","Sign in with Discord to view a community post and conversation."];
 if(/^\/(?:tickets\/\d+|dashboard\/applications\/\d+|staff\/(?:tickets|applications)\/\d+)$/.test(p))
   return ["Private Ticket | SB's & Cam's Store","Sign in with Discord to view this private ticket. Report details and messages are not publicly visible."];
 return null;
}
function socialMetadata(ctx){
 const [title,description]=linkPreviewData(ctx.pathname)||["SB's & Cam's Store","The official community website for SB's & Cam's Store."];
 const base=ctx.config?.baseUrl||'https://sbstore.info';
 const url=new URL(ctx.pathname?.startsWith('/')?ctx.pathname:'/',base).href;
 const img=new URL('/static/sb-logo.png',base).href;
 return '<meta name="description" content="'+esc(description)+'">'+
   '<meta property="og:type" content="website">'+
   '<meta property="og:site_name" content="SB&#39;s &amp; Cam&#39;s Store">'+
   '<meta property="og:title" content="'+esc(title)+'">'+
   '<meta property="og:description" content="'+esc(description)+'">'+
   '<meta property="og:url" content="'+esc(url)+'">'+
   '<meta property="og:image" content="'+esc(img)+'">'+
   '<meta property="og:image:type" content="image/png">'+
   '<meta property="og:image:alt" content="SB&#39;s &amp; Cam&#39;s Store logo">'+
   '<meta name="twitter:card" content="summary">'+
   '<meta name="twitter:title" content="'+esc(title)+'">'+
   '<meta name="twitter:description" content="'+esc(description)+'">'+
   '<meta name="twitter:image" content="'+esc(img)+'">';
}
export function signedOutPreview(ctx){
 const p=linkPreviewData(ctx.pathname);
 if(!p)throw Error('Page is not publicly previewable');
 return shell(ctx,p[0],'<div class="hero"><div><div class="eyebrow">SB&#39;S &amp; CAM&#39;S STORE</div>'+
   '<h2>'+esc(p[0])+'</h2><p>'+esc(p[1])+'</p>'+
   '<div class="actions"><a class="btn btn-primary" href="/auth/login?next='+encodeURIComponent(ctx.pathname)+'">Continue with Discord →</a>'+
   '<a class="btn btn-outline" href="/">Visit homepage</a></div></div>'+
   '<div class="hero-logo"><img src="/static/sb-logo.png" width="148" height="148" alt="SB Store logo" style="width:148px;height:148px;object-fit:cover"></div></div>');
}

// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Header-level social navigation works on desktop and in the compact mobile account menu.
function socialHeaderAccount(ctx){
  const u=ctx.user;
  if(!u)return '<a class="btn btn-primary btn-sm" href="/auth/login">Login with Discord</a>';
  const profileUrl=ctx.role==='appeal-only'?'/':'/profile';
  const accountUser={...u,avatar_path:ctx.profileAvatarPath||u.avatar_path||''};
  const identity='<a class="account-profile-link" href="'+profileUrl+'" aria-label="View my profile">'+avatar(accountUser,'sm',true)+
    '<span class="account-name"><b>'+esc(u.display_name)+'</b><small>@'+esc(u.username)+'</small></span></a>';
  const signOut='<form method="post" action="/auth/logout">'+token(ctx)+
    '<button type="submit" class="account-menu-logout">'+icon('log-out',{size:18})+' Sign out</button></form>';
  if(ctx.role==='appeal-only')return identity+'<form method="post" action="/auth/logout">'+token(ctx)+
    '<button class="btn btn-quiet btn-xs" type="submit">Log out</button></form>';
  const unread=Math.max(0,Number(ctx.notificationCount)||0);
  const number=unread>99?'99+':String(unread);
  const quick=[
    ['feed','/feed','newspaper','Main Feed'],
    ['members','/members','user-round-search','Find Members'],
    ['notifications','/notifications','bell','Notifications'],
    ['saved','/saved','bookmark','Saved Posts']
  ].map(([key,url,iconName,label])=>
    '<a class="top-social-link top-social-'+key+'" href="'+url+'" aria-label="'+label+
    (key==='notifications'&&unread?' ('+unread+' unread)':'')+'" title="'+label+'">'+
    '<span class="top-social-symbol" aria-hidden="true">'+icon(iconName,{size:19})+'</span>'+
    (key==='notifications'&&unread?'<span class="top-social-badge">'+number+'</span>':'')+
    '</a>').join('');
  const own='/u/'+attr(u.id);
  const menuLink=(href,iconName,label)=>'<a href="'+href+'"><span class="menu-action-icon" aria-hidden="true">'+icon(iconName,{size:19})+'</span><span>'+label+'</span></a>';
  const accountMenu='<details class="top-account-dropdown" data-account-dropdown>'+
    '<summary title="Open your profile menu" aria-label="Open your profile menu">'+icon('chevron-down',{size:19})+'</summary>'+
    '<div class="top-account-menu">'+
      '<div class="top-account-menu-head"><a class="top-account-menu-avatar" href="/profile" aria-label="View my profile">'+avatar(accountUser,'menu',true)+'</a><div class="top-account-menu-identity"><b>'+esc(u.display_name)+'</b><small>@'+esc(u.username)+'</small><span class="top-account-menu-linked">'+icon('badge-check',{size:14})+' Discord linked</span></div></div>'+
      '<div class="top-account-menu-label">MY PROFILE</div>'+
      menuLink('/profile','circle-user-round','View My Profile')+
      menuLink('/profile/edit','user-round-pen','Edit Profile')+
      menuLink(own+'?tab=posts','file-text','My Posts')+
      menuLink(own+'?tab=replies','message-circle-reply','My Replies')+
      menuLink(own+'?tab=media','images','My Photos')+
      menuLink(own+'?tab=likes','heart','Liked Posts')+
      menuLink(own+'/followers','users-round','Followers')+
      menuLink(own+'/following','user-round-check','Following')+
      '<div class="top-account-menu-label">COMMUNITY</div>'+
      menuLink('/feed','newspaper','Main Feed')+
      menuLink('/feed?tab=following','rss','Following Feed')+
      menuLink('/notifications','bell',unread?'Notifications · '+number+' new':'Notifications')+
      menuLink('/saved','bookmark','Saved Posts')+
      menuLink('/members','user-round-search','Find Members')+
      '<div class="top-account-menu-signout">'+signOut+'</div>'+
    '</div></details>';
  return '<nav class="top-social-shortcuts" aria-label="Social quick links">'+quick+'</nav>'+identity+accountMenu;
}

export function shell(ctx,title,content) {
  const user=ctx.user,role=ctx.role||'none';
  const staff=['reviewer','admin','owner'].includes(role),admin=['admin','owner'].includes(role);
  const canPromotion=!!ctx.promotionEligible;
  const staffNavigation=staff||!!ctx.staffNavigation||canPromotion;
  const unread=Number(ctx.notificationCount)||0;
  return `<!doctype html>
<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#071325"><title>${esc(title)} · SB's & Cam's Store</title>${socialMetadata(ctx)}<link rel="icon" href="/static/sb-logo.png?v=${assetVersion}" type="image/png"><link rel="stylesheet" href="/static/style.css?v=${assetVersion}"><script src="/static/app.js?v=${assetVersion}" defer></script><script src="/static/evidence.js?v=${assetVersion}" defer></script><script src="/static/mega-team.js?v=${assetVersion}" defer></script><script src="/static/mega-top10.js?v=${assetVersion}" defer></script></head>
<body><div class="shell"><aside class="sidebar"><div class="sidebar-scroll"><a href="/" class="brand"><img class="brand-logo" src="/static/sb-logo.png?v=${assetVersion}" alt="SB logo" width="44" height="44" style="width:44px;height:44px;min-width:44px;max-width:44px;max-height:44px;object-fit:cover"><span><b>SB's & Cam's</b><small>STORE COMMUNITY</small></span></a>
<div class="sidebar-title">DISCOVER</div><nav>${navLink('/','Home','⌂',ctx)}${user?`${role==='appeal-only'?`${navLink('/tickets/new/ban_appeal','Submit Ban Appeal','✉',ctx)}${navLink('/tickets/mine','My Appeals','◷',ctx)}${navLink('/team','Meet the Team','♛',ctx)}`:`${navLink('/tickets/new','Submit a Ticket','✉',ctx)}${!staffNavigation?navLink('/tickets/mine','My Tickets','◷',ctx):''}${!staffNavigation?navLink('/dashboard','My Applications','▣',ctx):''}${staffNavigation?navLink('/promotions','Apply for a Promotion','✎',ctx):navLink('/apply','Apply for Staff','✎',ctx)}${navLink('/feed','Main Feed','◉',ctx)}${navLink('/suggestions','Server Suggestions','✧',ctx)}${navLink('/members','Socials & Members','♧',ctx)}${navLink('/team','Team Members','♛',ctx)}${navLink('/mega-team','MegaSMP Team','♛',ctx)}`}`:''}</nav>
${user&&role!=='appeal-only'?`<div class="sidebar-title">MY SOCIAL</div><nav>${navLink('/profile','My Profile','◉',ctx)}${navLink('/notifications',unread?'Notifications ('+unread+')':'Notifications','♢',ctx)}${navLink('/saved','Saved Posts','▤',ctx)}${navLink('/profile/edit','Customize Profile','✦',ctx)}</nav>`:''}
${staff?`<div class="sidebar-title">STAFF TOOLS</div><nav>${navLink('/staff/tickets','All Tickets','▣',ctx)}${navLink('/staff','Application Reviews','▤',ctx)}${admin?navLink('/staff/promotions','Promotion Reviews','♛',ctx):''}${admin?`${navLink('/admin/roles','Role Management','⬡',ctx)}${navLink('/admin/settings','Admin Settings','⚙',ctx)}${navLink('/admin/moderation','Moderation','⚑',ctx)}`:''}${role==='owner'?`${navLink('/owner/approvals','Final Approvals','✓',ctx)}${navLink('/owner/audit','Owner Audit Log','☷',ctx)}${navLink('/owner/owners','Owner Access','♜',ctx)}`:''}</nav>`:''}
</div><div class="side-bottom">${user?`<a class="side-profile" href="${role==='appeal-only'?'/':'/profile'}">${avatar(user,'side')}<span><b>${esc(user.display_name)}</b><small>@${esc(user.username)}</small></span></a>`:`<span class="muted tiny">Discord-connected community</span>`}<span class="status-dot"></span></div></aside>
<div class="main"><header class="topbar"><a class="mobile-brand" href="/"><img src="/static/sb-logo.png?v=${assetVersion}" alt="SB" width="36" height="36" style="width:36px;height:36px;max-width:36px;max-height:36px;object-fit:cover"><span>SB's & Cam's Store</span></a><div class="breadcrumbs"><span class="muted">Community</span><span class="sep">/</span><b>${esc(title)}</b></div><div class="top-account">${socialHeaderAccount(ctx)}</div></header>
${user?`<nav class="mobile-nav">${role==='appeal-only'?'<a href="/tickets/new/ban_appeal">Ban Appeal</a><a href="/tickets/mine">My Appeals</a><a href="/team">Meet the Team</a>':'<a href="/tickets/new">Submit Ticket</a>'+(staffNavigation?'':'<a href="/tickets/mine">My Tickets</a><a href="/dashboard">Applications</a>')+'<a href="/feed">Feed</a>'}${role==='appeal-only'?'':'<a href="/suggestions">Suggestions</a><a href="/members">Members</a><a href="/team">Team</a><a href="/mega-team">MegaSMP</a>'}${staffNavigation?'<a href="/promotions">Apply for a Promotion</a>':''}${role==='appeal-only'?'':'<a href="/profile">My Profile</a><a href="/notifications">Notifications</a><a href="/saved">Saved</a>'}${staff?'<a href="/staff">Reviews</a>':''}${role==='owner'?'<a href="/owner/audit">Audit</a>':''}</nav>`:''}
<main class="content">${ctx.notice?`<div class="alert ${ctx.noticeType==='error'?'alert-error':'alert-success'}" role="status">${esc(ctx.notice)}</div>`:''}${content}</main><footer class="footer"><span>© ${new Date().getFullYear()} SB's & Cam's Store</span><span>Connected to Discord · Community Portal V1.8.0</span></footer></div></div>${evidenceViewerDialog()}</body></html>`;
}
export const titlebar=(eyebrow,title,subtitle='',extra='')=>`<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${title}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>${extra}</div>`;
export function home(ctx){return shell(ctx,'Home',`${titlebar('WELCOME TO THE COMMUNITY',`SB's & Cam's <span class="gradient">Store.</span>`,'Your staff portal, community feed, suggestions and member profiles — all connected to Discord.')}
<div class="hero"><div><div class="eyebrow">ONE COMMUNITY. ONE PLACE.</div><h2>Build the community<br>you want to be part of.</h2><p>Apply for staff, share updates, vote on suggestions, and discover who's on the team.</p><div class="actions">${ctx.user?'<a class="btn btn-primary" href="/feed">Explore the feed →</a><a class="btn btn-outline" href="/apply">Apply for staff</a>':'<a class="btn btn-primary" href="/auth/login">Continue with Discord →</a>'}</div></div><div class="hero-logo"><img src="/static/sb-logo.png?v=${assetVersion}" alt="SB Store logo" width="148" height="148" style="width:148px;height:148px;max-width:148px;max-height:148px;object-fit:cover"></div></div>
<div class="feature-grid"><a class="tile" href="${ctx.user?'/dashboard':'/auth/login'}"><span class="tile-icon">${icon('clipboard-list',{size:28})}</span><b>Staff Applications</b><p>Apply and follow your application status.</p><span class="tile-link">Get started →</span></a><a class="tile" href="${ctx.user?'/feed':'/auth/login'}"><span class="tile-icon">${icon('newspaper',{size:28})}</span><b>Community Feed</b><p>Post updates, pictures and join conversations.</p><span class="tile-link">Explore posts →</span></a><a class="tile" href="${ctx.user?'/suggestions':'/auth/login'}"><span class="tile-icon">${icon('lightbulb',{size:28})}</span><b>Make a Suggestion</b><p>Shape the server with community-wide votes.</p><span class="tile-link">View suggestions →</span></a></div>`);}
export function error(ctx,code,message){return shell(ctx,'Error',`<div class="error-panel"><div class="error-code">${esc(code)}</div><h1>${esc(message)}</h1><p>If this persists, contact the website owner.</p><a href="/" class="btn btn-primary">Back to home</a></div>`);}
export function notMember(ctx,message){return shell(ctx,'Membership required',`<div class="error-panel"><div class="error-code">${icon('lock-keyhole',{size:34})}</div><h1>Discord membership required</h1><p>${esc(message)}</p>${ctx.config.invite?`<a class="btn btn-primary" href="${attr(ctx.config.invite)}" rel="noopener noreferrer" target="_blank">Join the server ↗</a>`:''}<a class="btn btn-outline" href="/auth/login">Try another Discord account</a></div>`);}
export function dashboard(ctx,apps){return shell(ctx,'My Applications',`${titlebar('PERSONAL DASHBOARD','Your <span class="gradient">applications.</span>','Only you can view your application tickets and their outcomes.','<a class="btn btn-primary" href="/apply">New application +</a>')}
<div class="stats-three"><div class="stat"><small>TOTAL APPLICATIONS</small><strong>${apps.length}</strong></div><div class="stat"><small>ACTIVE</small><strong>${apps.filter(a=>!['accepted','denied'].includes(a.status)).length}</strong></div><div class="stat"><small>DECIDED</small><strong>${apps.filter(a=>['accepted','denied'].includes(a.status)).length}</strong></div></div>
<div class="panel"><div class="panel-heading"><h2>Application history</h2><span class="muted">Private to your account</span></div>${apps.length?`<div class="table-wrap"><table><thead><tr><th>TICKET</th><th>POSITION</th><th>SUBMITTED</th><th>STATUS</th><th>NEW REPLIES</th><th>ROLE DELIVERY</th></tr></thead><tbody>${apps.map(a=>`<tr><td><a class="table-link" href="/dashboard/applications/${a.id}">#${a.id} →</a></td><td>${esc(a.position)}</td><td>${when(a.created_at)}</td><td>${tag(a.status)}</td><td>${a.unread_replies?`<span class="pill pill-under_review">${a.unread_replies} unread</span>`:'—'}</td><td>${a.status==='accepted'?tag(a.role_sync_status):'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No applications yet. Select “New application” to get started.</div>'}</div>`);}
export function ownTicket(ctx,a,messages=[],attachments=[]){return shell(ctx,'My Application #'+a.id,`${titlebar('PRIVATE APPLICATION',`Your ticket <span class="gradient">#${a.id}</span>`,`Submitted ${when(a.created_at)}`,tag(a.status))}<div class="detail-column"><div class="panel padded"><h2>My application</h2><p class="muted tiny">Only you can access these answers. Staff decisions and private reviewer notes are not visible here.</p>${[['Position',a.position],['Age bracket',a.age_bracket],['Timezone',a.timezone],['Availability',a.availability],['Experience',a.experience],['Motivation',a.motivation],['Scenario',a.scenario]].map(([label,value])=>`<div class="answer"><b>${esc(label)}</b><p>${lines(value)}</p></div>`).join('')}</div><div class="panel padded"><h2>Current status</h2>${tag(a.status)}${a.status==='accepted'?`<p>Discord role delivery: ${tag(a.role_sync_status)}</p>`:''}<p class="muted tiny">You can reply to the staff team in the private conversation below.</p><a href="/dashboard" class="btn btn-outline">← All my applications</a></div>${ticketThread(ctx,a,messages,false,attachments)}</div>`);}
export function apply(ctx,{active,cooldown,open}){
const disabled=!open||active||cooldown;return shell(ctx,'Apply for Staff',`${titlebar('STAFF RECRUITMENT','Join our <span class="gradient">staff team.</span>','Tell us about your experience and why you would like to help the community.')}
${disabled?`<div class="panel padded"><h2>${!open?'Applications are currently closed':active?'You already have an active application':'Reapplication cooldown'}</h2><p>${!open?'Please check back later.':active?'Your previous ticket must be decided before you can apply again.':'Please wait 7 days after your most recent application before applying again.'}</p><a class="btn btn-outline" href="/dashboard">My applications</a></div>`:
`<form class="panel form" method="post" action="/apply">${token(ctx)}<div class="form-heading"><span class="step">01</span><div><h2>About you</h2><p>Your basic information</p></div></div><div class="field-grid"><label>Role to apply for<select required name="position"><option value="">Choose a role</option>${ctx.config.applicationRoles.map(x=>`<option value="${attr(x)}">${esc(x)}</option>`).join('')}</select></label><label>Age range<select required name="age_bracket"><option value="">Choose age range</option>${['Under 16','16–17','18+','Prefer not to say'].map(x=>`<option>${esc(x)}</option>`).join('')}</select></label></div><label>Timezone<input name="timezone" required maxlength="80" minlength="2" placeholder="GMT / UTC+1"></label><div class="form-heading spaced"><span class="step">02</span><div><h2>Experience and availability</h2><p>Written answers must be 30–2,500 characters</p></div></div><label>When can you be active?<textarea name="availability" required minlength="30" maxlength="2500" rows="3"></textarea></label><label>What moderation or community experience do you have?<textarea name="experience" required minlength="30" maxlength="2500" rows="4"></textarea></label><label>Why do you want to be staff?<textarea name="motivation" required minlength="30" maxlength="2500" rows="4"></textarea></label><div class="form-heading spaced"><span class="step">03</span><div><h2>Scenario</h2></div></div><label>Two members accuse each other of scamming in public chat. What would you do?<textarea name="scenario" required minlength="30" maxlength="2500" rows="5"></textarea></label><div class="form-actions"><span class="muted tiny">Two separate admins must agree before an application is accepted or denied.</span><button class="btn btn-primary">Submit application →</button></div></form>`}`);}
export function staff(ctx,{apps,counts}){const admin=['admin','owner'].includes(ctx.role);return shell(ctx,'Staff Reviews',`${titlebar('STAFF WORKSPACE',admin?'Application <span class="gradient">management.</span>':'Your <span class="gradient">review queue.</span>',admin?'Two separate admin votes are needed to decide an application. Reviewer votes are optional.':'All pending applications are available until you cast your optional review vote.')}
<div class="stats-three"><div class="stat"><small>AWAITING DECISION</small><strong>${counts.pending||0}</strong></div><div class="stat"><small>UNDER REVIEW</small><strong>${(counts.reviewing||0)+(counts.interview||0)}</strong></div><div class="stat"><small>ACCEPTED</small><strong>${counts.accepted||0}</strong></div></div>
<div class="panel"><div class="panel-heading"><h2>${admin?'All application tickets':'Not yet reviewed by you'}</h2><span class="muted">${apps.length} ticket${apps.length===1?'':'s'}</span></div><div class="table-wrap"><table><thead><tr><th>APPLICANT</th><th>ROLE</th><th>SUBMITTED</th><th>STATUS</th><th></th></tr></thead><tbody>${apps.map(a=>`<tr><td><a class="member-inline" href="/u/${attr(a.user_id)}">${avatar({id:a.user_id,avatar:a.avatar,display_name:a.display_name},'sm')}<span><b>${esc(a.display_name)}</b><small>@${esc(a.username)}</small></span></a></td><td>${esc(a.position)}</td><td>${when(a.created_at)}</td><td>${tag(a.status)}</td><td><a class="table-link" href="/staff/applications/${a.id}">${admin?'Open ticket':'Review →'}</a></td></tr>`).join('')}</tbody></table>${apps.length?'':'<div class="empty">Nothing left in your review queue.</div>'}</div></div>`);}
export function review(ctx,{app,reviewerVotes=[],adminVotes=[],myReviewerVote=null,myAdminVote=null,messages=[],attachments=[],ownerRecommendation=null}){
const admin=['admin','owner'].includes(ctx.role),final=['accepted','denied'].includes(app.status);
const accepts=adminVotes.filter(x=>x.choice==='accept').length,denies=adminVotes.filter(x=>x.choice==='deny').length;
return shell(ctx,`Application #${app.id}`,`${titlebar(`TICKET #${app.id}`,`Review <span class="gradient">${esc(app.display_name)}</span>`,`@${app.username} · ${when(app.created_at)}`,tag(app.status))}
<div class="review-grid"><section class="panel padded"><div class="panel-heading"><h2>Applicant responses</h2><a href="/u/${attr(app.user_id)}" class="quiet-link">View profile →</a></div>${[['Position',app.position],['Age range',app.age_bracket],['Timezone',app.timezone],['Availability',app.availability],['Experience',app.experience],['Why staff?',app.motivation],['Scenario',app.scenario]].map(([k,v])=>`<div class="answer"><b>${esc(k)}</b><p>${lines(v)}</p></div>`).join('')}</section>
<div class="stack">
${admin?`<section class="panel padded"><h2>Admin decision</h2><p class="muted tiny">Requires two separate admins voting the same way. Reviewer votes never determine the final outcome.</p><div class="vote-summary"><div class="accept-label">${icon('check',{size:17})} ${accepts} Accept</div><div class="deny-label">${icon('x',{size:17})} ${denies} Deny</div></div>${!final&&!myAdminVote&&!ownerRecommendation?`<form method="post" action="/staff/applications/${app.id}/decide">${token(ctx)}<label>Optional private decision note<textarea name="note" maxlength="1500" rows="3" placeholder="Reasoning for other admins"></textarea></label><div class="choice-row"><button class="btn btn-success" name="choice" value="accept">Vote Accept</button><button class="btn btn-danger" name="choice" value="deny">Vote Deny</button></div></form>`:myAdminVote?`<div class="notice-box">Your admin vote: <b>${esc(myAdminVote.choice)}</b> · ${when(myAdminVote.created_at)}. Final authorization is a separate action.</div>` :ownerRecommendation?`<div class="notice-box">Two matching admin votes recorded: <b>${esc(ownerRecommendation)}</b>. Awaiting unk.sb final approval.</div>`:final?'<div class="notice-box">This application is finalized.</div>':'<div class="notice-box">Waiting for two matching admin votes.</div>'}
${final?`<p>Final outcome: ${tag(app.status)}</p>`:''}
${app.status==='accepted'?`<div class="notice-box"><b>Discord role:</b> ${tag(app.role_sync_status)}<p class="tiny">${esc(app.role_sync_error||'Assigned through the bot when possible.')}</p>${app.role_sync_status!=='assigned'?`<form method="post" action="/staff/applications/${app.id}/sync">${token(ctx)}<button class="btn btn-outline btn-sm">Retry role delivery</button></form>`:''}</div>`:''}
${!final?`<form method="post" action="/staff/applications/${app.id}/interview">${token(ctx)}<button class="btn btn-outline btn-sm">Mark as interviewing</button></form>`:''}
</section><section class="panel padded"><h2>Individual reviewer votes</h2>${reviewerVotes.length?reviewerVotes.map(v=>`<div class="audit-mini"><b>${esc(v.display_name||v.reviewer_id)}</b> ${tag(v.choice)}<small>${when(v.created_at)}</small>${v.note?`<p>${lines(v.note)}</p>`:''}</div>`).join(''):'<p class="muted tiny">No optional reviewer votes yet.</p>'}<h3>Admin decisions</h3>${adminVotes.length?adminVotes.map(v=>`<div class="audit-mini"><b>${esc(v.display_name||v.admin_id)}</b> ${tag(v.choice)}<small>${when(v.created_at)}</small>${v.note?`<p>${lines(v.note)}</p>`:''}</div>`).join(''):'<p class="muted tiny">No admin votes yet.</p>'}</section>
<section class="panel padded"><h2>Private admin note</h2><form method="post" action="/staff/applications/${app.id}/note">${token(ctx)}<label>Visible to admins<textarea name="note" rows="4" maxlength="2000">${esc(app.staff_note||'')}</textarea></label><button class="btn btn-primary btn-sm">Save note</button></form></section>`:
`<section class="panel padded"><h2>Optional reviewer vote</h2><p class="muted">Your vote is advisory. Admins see it; only two matching admin decisions can finalize this application.</p>${myReviewerVote?`<div class="notice-box">Already voted ${esc(myReviewerVote.choice)}. This ticket will leave your pending review queue.</div>`:!final?`<form method="post" action="/staff/applications/${app.id}/review">${token(ctx)}<label>Optional review notes<textarea name="note" maxlength="1500" rows="4" placeholder="Private feedback for admins"></textarea></label><div class="choice-row"><button class="btn btn-success" name="choice" value="accept">Recommend Accept</button><button class="btn btn-danger" name="choice" value="deny">Recommend Deny</button></div></form>`:'<p>Already finalized.</p>'}</section>`}
</div></div>${ownerFinalPanel(ctx,app,ownerRecommendation)}${ticketThread(ctx,app,messages,true,attachments)}`);
}

// Private ticket messages are displayed to the applicant and authorized server staff only.
// Message bodies are escaped; the role label is derived from the server session.
export function ticketThread(ctx,app,messages=[],forStaff=false,attachments=[]){
  const action=(forStaff?'/staff':'/dashboard')+'/applications/'+app.id+'/reply';
  const fileHtml=messageId=>evidenceGallery(attachments.filter(a=>a.message_id===messageId),'/applications/attachments',true);
  return `<section class="panel padded ticket-conversation chat-ticket">
    <div class="panel-heading ticket-heading"><div><h2>Ticket conversation</h2><p class="muted tiny">Private chat between the applicant and authorized staff</p></div>
      <span class="pill pill-accepted">${messages.length} messages</span></div>
    <div class="ticket-chat-log">${messages.length?messages.map(m=>`<article class="ticket-message chat-bubble ${m.author_id===ctx.user.id?'is-own':''}">
      ${avatar({id:m.author_id,avatar:m.avatar,display_name:m.display_name},'sm')}
      <div class="ticket-message-main"><div class="ticket-message-meta"><b>${esc(m.display_name||m.username)}</b>
        <small>${m.author_id===app.user_id?'Applicant':'Staff'} · ${when(m.created_at)}</small></div>
        <div class="ticket-bubble-body">${lines(m.body)}</div>${fileHtml(m.id)?`<div class="ticket-message-files">${fileHtml(m.id)}</div>`:''}
      </div></article>`).join(''):'<div class="empty">No messages yet. Start the private conversation below.</div>'}</div>
    <form method="post" action="${action}" enctype="multipart/form-data" class="ticket-chat-composer">${token(ctx)}
      <label class="sr-only">Your reply</label><textarea name="body" required minlength="1" maxlength="2000" rows="3" placeholder="Write your reply..."></textarea>
      <div class="ticket-compose-actions"><label class="btn btn-outline btn-sm ticket-upload-control">${icon('paperclip',{size:17})} Upload video/pictures
         <input type="file" name="evidence" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm">
      </label><small class="muted">Max 5 files · 12 MB each</small><button class="btn btn-primary btn-sm">Send Reply →</button></div>
    </form>
  </section>`;
}
export function ownerFinalPanel(ctx,app,recommendation){
 if(ctx.role!=='owner')return '';
 const matched=!!ctx.config.finalApproverId&&ctx.user?.id===ctx.config.finalApproverId;
 const final=['accepted','denied'].includes(app.status);
 return `<section class="panel padded owner-review-panel">
   <h2>unk.sb — Final application approval</h2>
   <p class="muted">Two different admins must agree. Your own admin vote can count as one, but acceptance, denial and Discord role delivery still require your separate final authorization.</p>
   ${final?`<div class="notice-box">Final outcome: ${tag(app.status)}</div>`:
     !matched?`<div class="notice-box">Final approval is locked. Configure FINAL_APPROVER_USER_ID in Railway with unk.sb's numeric Discord user ID, and ensure the account has owner access.</div>`:
     !recommendation?`<div class="notice-box">Waiting for two matching admin votes. You can cast an admin vote above, then return here after a second admin agrees.</div>`:
     `<div class="notice-box">Admin recommendation: <b>${esc(recommendation)}</b> · Final authorization required.</div>
       <form method="post" action="/owner/applications/${app.id}/action">${token(ctx)}
       <label>Decision note<textarea name="note" maxlength="2000" rows="3" placeholder="Optional explanation for the audit"></textarea></label>
       <div class="choice-row">${recommendation==='accepted'?'<button class="btn btn-success" name="action" value="approve">Final Accept</button>':''}
       <button class="btn btn-danger" name="action" value="deny">Final Deny</button>
       <button class="btn btn-outline" name="action" value="return">Return for re-review</button></div>
       ${recommendation==='denied'?'<p class="muted tiny">Acceptance requires two matching Accept votes; use Return for re-review if you disagree.</p>':''}</form>`}
   </section>`;
}
export function ownerApprovals(ctx,{apps=[],enabled=false}){
 return shell(ctx,'Final Approvals',`${titlebar('OWNER FINAL REVIEW','Applications awaiting <span class="gradient">unk.sb.</span>','Two admin votes are required before you can make the final decision.')}
 ${!enabled?'<div class="alert alert-error">Final approval is locked until FINAL_APPROVER_USER_ID is set to the correct Discord user ID for unk.sb in Railway Variables.</div>':''}
 <div class="panel"><div class="panel-heading"><h2>Awaiting final authorization</h2><span class="muted">${apps.length} ticket${apps.length===1?'':'s'}</span></div>
 <div class="table-wrap"><table><thead><tr><th>APPLICANT</th><th>POSITION</th><th>ADMIN VOTES</th><th></th></tr></thead>
 <tbody>${apps.map(a=>`<tr><td>${esc(a.display_name)} (@${esc(a.username)})</td><td>${esc(a.position)}</td>
 <td><span class="accept-label">${a.accepts} Accept</span> · <span class="deny-label">${a.denies} Deny</span></td>
 <td><a class="table-link" href="/staff/applications/${a.id}">Review ticket #${a.id} →</a></td></tr>`).join('')}</tbody></table>
 ${apps.length?'':'<div class="empty">No applications currently need final approval.</div>'}</div></div>`);
}

const postUser=(p)=>({id:p.user_id,avatar:p.avatar,display_name:p.display_name,username:p.username,nickname:p.nickname,avatar_path:p.avatar_path});
export function postCard(ctx,p,{feedPage=null,feedTab='all',fromSaved=false}={}){
const mine=ctx.user?.id===p.user_id,admin=['admin','owner'].includes(ctx.role);
const contextFields=feedPage!==null?`<input type="hidden" name="feed_page" value="${feedPage}"><input type="hidden" name="feed_tab" value="${attr(feedTab)}">`:fromSaved?'<input type="hidden" name="origin" value="saved">':'';
return `<article id="post-${p.id}" class="feed-card panel"><div class="post-head">${avatar(postUser(p),'md',true)}<div class="post-who"><a href="/u/${attr(p.user_id)}"><b>${esc(p.nickname||p.display_name)}</b></a><span>@${esc(p.username)} · ${when(p.created_at)}</span></div>${p.repost_of?'<span class="pill">'+icon('repeat-2',{size:14})+' Reposted</span>':''}${mine||admin?`<form method="post" action="/content/post/${p.id}/delete" data-confirm="Delete this post?">${token(ctx)}<button class="icon-btn" aria-label="Remove post" title="Remove post">${icon('trash',{size:18})}</button></form>`:''}</div>
${p.repost_of?`<div class="repost-note"><a href="/post/${p.repost_of}">View original post ↗</a></div>`:''}${p.body?`<div class="post-body">${lines(p.body)}</div>`:''}${p.image_path?`<a href="/post/${p.id}"><img class="post-image" loading="lazy" src="${attr(path(p.image_path))}" alt="Post attachment"></a>`:''}
<div class="post-actions"><form method="post" action="/post/${p.id}/like" data-post-like>${token(ctx)}${contextFields}<button type="submit" class="action-btn ${p.liked?'activated':''}" aria-pressed="${p.liked?'true':'false'}" aria-label="${p.liked?'Unlike post':'Like post'}"><span data-like-heart aria-hidden="true">${icon('heart',{size:18})}</span> <span data-like-count>${p.like_count||0}</span></button></form><a class="action-btn" href="/post/${p.id}" aria-label="Comments">${icon('message-circle',{size:18})} ${p.comment_count||0}</a>${p.repost_of?'':`<form method="post" action="/post/${p.id}/repost" data-post-repost>${token(ctx)}${contextFields}<button type="submit" class="action-btn ${p.reposted?'activated':''}" aria-pressed="${p.reposted?'true':'false'}" aria-label="${p.reposted?'Undo repost':'Repost'}" >${icon('repeat-2',{size:18})} <span data-repost-count>${p.repost_count||0}</span></button></form>`}<form method="post" action="/post/${p.id}/bookmark" data-post-bookmark>${token(ctx)}${contextFields}<button type="submit" class="action-btn ${p.bookmarked?'activated':''}" aria-pressed="${p.bookmarked?'true':'false'}" aria-label="${p.bookmarked?'Remove saved post':'Save post'}">${icon('bookmark',{size:18})}<span data-bookmark-label>${p.bookmarked?'Saved':'Save'}</span></button></form><button type="button" class="action-btn" data-share-path="/post/${p.id}" aria-label="Share post">${icon('share-2',{size:18})} Share</button><a class="action-btn" href="/post/${p.id}">Open ${icon('arrow-right',{size:16})}</a>${!mine?`<a class="action-btn" href="/report?kind=post&id=${p.id}" >${icon('flag',{size:16})} Report</a>`:''}</div></article>`;
}
export function feed(ctx,{posts=[],page=0,tab='all'}) {return shell(ctx,'Main Feed',`${titlebar('COMMUNITY SOCIALS','The <span class="gradient">main feed.</span>','Share moments, updates, screenshots and conversations with the server.')}
<form method="post" enctype="multipart/form-data" action="/feed/create" class="panel compose">${token(ctx)}<div class="compose-head">${avatar(ctx.user,'md')}<div><b>${esc(ctx.user.display_name)}</b><span>Share something with the community</span></div></div><label class="sr-only" for="post-body">Your post</label><textarea id="post-body" name="body" rows="3" maxlength="1500" placeholder="What's happening in SB's & Cam's Store?"></textarea><div class="compose-footer"><label class="upload-label">${icon('image-plus',{size:18})} Add photo<input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif"></label><button class="btn btn-primary">Publish post →</button></div></form>
<nav class="social-tabs" aria-label="Feed filters"><a class="social-tab ${tab==='all'?'active':''}" href="/feed">For You · Community</a><a class="social-tab ${tab==='following'?'active':''}" href="/feed?tab=following">Following</a></nav>
<div class="feed-layout"><div class="stack">${posts.map(p=>postCard(ctx,p,{feedPage:page,feedTab:tab})).join('')||`<div class="empty panel">${tab==='following'?'Nothing from followed accounts yet. Find people to follow in Socials & Members.':'No posts yet. Be the first to share something!'}</div>`}<div class="pager">${page>0?`<a href="/feed?${tab==='following'?'tab=following&':''}page=${page-1}" class="btn btn-outline btn-sm">← Newer</a>`:''}${posts.length>=20?`<a href="/feed?${tab==='following'?'tab=following&':''}page=${page+1}" class="btn btn-outline btn-sm">Older →</a>`:''}</div></div><aside class="panel padded side-card"><h3>Your Social Hub</h3><p>Keep up with the community, save posts and check who follows you.</p><div class="social-aside-links"><a href="/profile">${icon('circle-user-round',{size:17})} My Profile</a><a href="/notifications">${icon('bell',{size:17})} Notifications</a><a href="/saved">${icon('bookmark',{size:17})} Saved Posts</a><a href="/members">${icon('user-round-search',{size:17})} Find Members</a></div></aside></div>`);}
export function commentList(ctx,comments,kind,targetId){return `<div class="comment-stack">${comments.map(c=>`<div class="comment"><div class="comment-author">${avatar({id:c.user_id,avatar:c.avatar,display_name:c.display_name},'sm')}<div><b><a href="/u/${attr(c.user_id)}">${esc(c.nickname||c.display_name)}</a></b><small>${when(c.created_at)}</small></div>${ctx.user.id===c.user_id||['admin','owner'].includes(ctx.role)?`<form method="post" action="/content/comment/${c.id}/delete" data-confirm="Delete comment?">${token(ctx)}<button class="icon-btn" title="Remove comment">×</button></form>`:''}</div><p>${lines(c.body)}</p></div>`).join('')||'<p class="muted">No comments yet.</p>'}</div><form class="comment-form" method="post" action="/${kind}/${targetId}/comment">${token(ctx)}<textarea name="body" required rows="2" minlength="1" maxlength="1000" placeholder="Write a public comment..."></textarea><button class="btn btn-primary btn-sm">Comment</button></form>`;}
export function postDetail(ctx,{post,comments}){return shell(ctx,'Post',`${titlebar('MAIN FEED','Post <span class="gradient">details.</span>')}<div class="detail-column">${postCard(ctx,post)}<div class="panel padded"><h2>Replies</h2>${commentList(ctx,comments,'post',post.id)}</div></div>`);}
export function suggestionCard(ctx,s){return `<article class="panel suggestion-card"><div class="suggestion-top"><div><span class="eyebrow">SUGGESTION #${s.id}</span><h3><a href="/suggestions/${s.id}">${esc(s.title)}</a></h3></div>${tag(s.status)}</div><p>${lines(s.body.length>500?s.body.slice(0,500)+'…':s.body)}</p><div class="suggestion-bottom"><a class="member-inline" href="/u/${attr(s.user_id)}">${avatar({id:s.user_id,avatar:s.avatar,display_name:s.display_name},'sm')}<span>${esc(s.display_name)}</span></a><div class="vote-totals"><span class="yes">${icon('thumbs-up',{size:16})} ${s.yes_count||0} Yes</span><span class="no">${icon('thumbs-down',{size:16})} ${s.no_count||0} No</span></div><a href="/suggestions/${s.id}" class="table-link">Vote / Comment →</a></div></article>`;}
export function suggestions(ctx,{items,page=0}){return shell(ctx,'Server Suggestions',`${titlebar('SHAPE THE COMMUNITY','Server <span class="gradient">suggestions.</span>','Vote yes or no, leave public comments, and help decide what comes next.')}
<div class="feed-layout"><div class="stack"><form method="post" action="/suggestions/create" class="panel compose">${token(ctx)}<h2>Suggest an improvement</h2><label>Short title<input name="title" minlength="5" maxlength="100" required placeholder="What should we improve?"></label><label>Your suggestion<textarea name="body" minlength="15" maxlength="3000" rows="4" required placeholder="Explain your idea and why it would help the server..."></textarea></label><div class="form-actions"><span class="muted tiny">Vote counts are public; voter identities are only visible to admins.</span><button class="btn btn-primary">Publish suggestion →</button></div></form>${items.map(s=>suggestionCard(ctx,s)).join('')||'<div class="empty panel">Be the first to suggest an improvement.</div>'}<div class="pager">${page>0?`<a href="/suggestions?page=${page-1}" class="btn btn-outline btn-sm">← Newer</a>`:''}${items.length>=20?`<a href="/suggestions?page=${page+1}" class="btn btn-outline btn-sm">Older →</a>`:''}</div></div><aside class="panel padded side-card"><h3>How voting works</h3><p>Each Discord member has one vote per suggestion. You can change it anytime. Everyone sees the totals, but only admins can view who voted.</p></aside></div>`);}
export function suggestionDetail(ctx,{s,comments,voters=[],myVote=''}){
const admin=['admin','owner'].includes(ctx.role);
return shell(ctx,'Suggestion #'+s.id,`${titlebar('SERVER SUGGESTIONS',esc(s.title),`Posted ${when(s.created_at)}`,tag(s.status))}<div class="feed-layout"><div class="stack"><div class="panel padded"><div class="post-head">${avatar({id:s.user_id,avatar:s.avatar,display_name:s.display_name},'md')}<div class="post-who"><a href="/u/${attr(s.user_id)}"><b>${esc(s.display_name)}</b></a><span>@${esc(s.username)}</span></div>${ctx.user.id===s.user_id||admin?`<form method="post" action="/content/suggestion/${s.id}/delete" data-confirm="Remove suggestion?">${token(ctx)}<button class="icon-btn" title="Remove suggestion" aria-label="Remove suggestion">${icon('trash',{size:18})}</button></form>`:''}</div><p class="suggestion-full">${lines(s.body)}</p><div class="vote-grid"><form method="post" action="/suggestions/${s.id}/vote">${token(ctx)}<button name="choice" value="yes" class="vote-tile yes-tile ${myVote==='yes'?'selected':''}"><span>${icon('thumbs-up',{size:19})} Yes</span><strong>${s.yes_count||0}</strong></button></form><form method="post" action="/suggestions/${s.id}/vote">${token(ctx)}<button name="choice" value="no" class="vote-tile no-tile ${myVote==='no'?'selected':''}"><span>${icon('thumbs-down',{size:19})} No</span><strong>${s.no_count||0}</strong></button></form></div><p class="muted tiny">${myVote?'You voted '+myVote+'. Select the same option to remove your vote.':'Vote yes or no. Your identity is hidden from members.'}</p>${ctx.user.id!==s.user_id?`<a class="quiet-link" href="/report?kind=suggestion&id=${s.id}">⚑ Report suggestion</a>`:''}</div><section class="panel padded"><h2>Public comments</h2>${commentList(ctx,comments,'suggestions',s.id)}</section></div>
<aside class="stack"><section class="panel padded"><h3>Suggestion status</h3>${tag(s.status)}${admin?`<form method="post" action="/suggestions/${s.id}/status">${token(ctx)}<label>Update status<select name="status">${['under_review','planned','accepted','declined','implemented'].map(x=>`<option value="${x}" ${s.status===x?'selected':''}>${esc(x.replace('_',' '))}</option>`).join('')}</select></label><button class="btn btn-primary btn-sm">Update status</button></form>`:'<p class="muted tiny">Admins manage the status.</p>'}</section>
${admin?`<section class="panel padded"><h3>Who voted <span class="pill">Admin only</span></h3><p class="muted tiny">Individual voter identities are never sent to regular members.</p>${voters.length?voters.map(v=>`<div class="voter-row"><a href="/u/${attr(v.user_id)}">${esc(v.display_name||v.user_id)}</a> ${tag(v.choice)}</div>`).join(''):'<p class="muted">No votes yet.</p>'}</section>`:''}</aside></div>`);
}
export function members(ctx,{found=[],q='',fallback=false}){return shell(ctx,'Socials & Members',`${titlebar('COMMUNITY DIRECTORY','Find your <span class="gradient">people.</span>','Search Discord server members and view their customizable profiles.')}
<form method="get" action="/members" class="panel search-panel"><label class="sr-only" for="member-search">Search members</label><input id="member-search" name="q" value="${attr(q)}" maxlength="80" placeholder="Search by Discord username or user ID..."><button class="btn btn-primary">Search members</button></form>${fallback?'<div class="alert alert-error">Discord member search is unavailable. Showing website members only. Enable Guild Members Intent in the Discord Developer Portal for complete search.</div>':''}<div class="member-grid">${found.map(m=>`<a class="member-card panel" href="/u/${attr(m.id)}">${avatar(m,'lg',true)}<b>${esc(m.nickname||m.display_name)}</b><span>@${esc(m.username)}</span><span class="table-link">View profile →</span></a>`).join('')||'<div class="empty panel">No members found. Try another username.</div>'}</div>`);}
// BUILT BY SB // RUNING ON WEED AND CAFFEINE
const sbsNameTag=member=>member?'<span class="sbs-member-tag" title="SBs Team Member" aria-label="SBs Team Member">[SBs]</span>':'';
const teamCards=(members,restricted=false)=>members.map(m=>`<${restricted?'div':'a'} class="team-card panel"${restricted?'':` href="/u/${attr(m.id)}"`}><div class="team-banner"></div>
 ${avatar(m,'xl',true)}<h3>${esc(m.nickname||m.display_name)}${sbsNameTag(m.sbsMember)}</h3><p>@${esc(m.username)}</p>
 ${tag(m.staffTitle)}${restricted?'':'<span class="table-link">View profile →</span>'}</${restricted?'div':'a'}>`).join('');
export function team(ctx,{groups=[],sbsGroups=[],knownGroups=[],tab='team',knownTab='mega',partial=false,rolesCount=0}){
 const knownTotal=new Set(knownGroups.flatMap(g=>g.members.map(m=>m.id))).size;
 const selected=knownGroups.find(g=>g.key===knownTab)||knownGroups[0]||{key:'mega',title:'Mega SMP Staff',members:[]};
 const sbsTotal=sbsGroups.reduce((sum,g)=>sum+g.members.length,0);
 const restricted=ctx.role==='appeal-only';
 const tabs=`<nav class="team-directory-tabs" aria-label="Meet the team sections">
 <a class="team-directory-tab ${tab==='team'?'active':''}" href="/team?tab=team" ${tab==='team'?'aria-current="page"':''}>
   <span>Our Staff</span><small>Store staff</small></a>
 <a class="team-directory-tab ${tab==='sbs'?'active':''}" href="/team?tab=sbs" ${tab==='sbs'?'aria-current="page"':''}>
   <span>Team Members</span><small>${sbsTotal} member${sbsTotal===1?'':'s'}</small></a>
 <a class="team-directory-tab ${tab==='known'?'active':''}" href="/team?tab=known" ${tab==='known'?'aria-current="page"':''}>
   <span>Known Members</span><small>${knownTotal} member${knownTotal===1?'':'s'}</small></a>
 </nav>`;
 const knownContent=`<section class="team-section known-member-section">
   <div class="section-heading"><div><h2>Known Members</h2><p class="muted tiny">Recognised Mega SMP and Prison staff members from our Discord server.</p></div>
     <span class="muted">${knownTotal} member${knownTotal===1?'':'s'}</span></div>
   <nav class="known-member-tabs" aria-label="Known member categories">
     ${knownGroups.map(g=>`<a href="/team?tab=known&amp;known=${attr(g.key)}" class="known-member-tab ${selected.key===g.key?'active':''}" ${selected.key===g.key?'aria-current="page"':''}>
        ${esc(g.title)} <span>${g.members.length}</span></a>`).join('')}
   </nav>
   <div class="member-grid">${teamCards(selected.members,restricted)}</div>
   ${selected.members.length?'':'<div class="empty panel">No '+esc(selected.title)+' members found yet. Check that these Discord roles exist and the bot has member-list access.</div>'}
 </section>`;
 const sbsContent=`<section class="team-section sbs-team-section"><div class="section-heading"><div>
   <h2>SBs x Scam</h2><p class="muted tiny">SBs Team Leaders and Team Members, verified through Discord roles.</p></div>
   <span class="muted">${sbsTotal} member${sbsTotal===1?'':'s'}</span></div>
   ${sbsGroups.map(g=>`<section class="team-section">
     <div class="section-heading"><h3>${esc(g.title)}</h3><span class="muted">${g.members.length} member${g.members.length===1?'':'s'}</span></div>
     <div class="member-grid">${teamCards(g.members,restricted)}</div>
   ${g.members.length?'':'<p class="muted tiny team-empty-group">No members currently assigned.</p>'}
   </section>`).join('')||
       '<div class="empty panel">No SBs x Scam team members found yet. Check the two Discord team roles and Guild Members Intent.</div>'}
 </section>`;
 const teamContent=groups.map(g=>`<section class="team-section">
   <div class="section-heading"><h2>${esc(g.title)}</h2>
     <span class="muted">${g.members.length} member${g.members.length===1?'':'s'}</span></div>
   <div class="member-grid">${teamCards(g.members,restricted)}</div></section>`).join('')||
   '<div class="empty panel">No team members detected yet. Check your bot permissions and role configuration.</div>';
 return shell(ctx,'Team Members',`${titlebar('THE PEOPLE BEHIND THE SERVER','Meet our <span class="gradient">team.</span>')}
   ${partial?'<div class="alert alert-error">Full server member listing is unavailable or incomplete. Enable Guild Members Intent for the bot to show the complete team.</div>':''}
   ${tabs}${tab==='known'?knownContent:tab==='sbs'?sbsContent:teamContent}`);
}

// BUILT BY SB // RUNING ON WEED AND CAFFEINE
export function discordRoleSection({state='unavailable',roles=[]}={}){
 const visible=Array.isArray(roles)?roles:[];
 const badges=visible.map(role=>{
   // Role names are Discord-supplied text. Only a six-digit hex colour may enter CSS.
   const color=/^#[0-9a-f]{6}$/i.test(String(role.color||''))?role.color:'#8296b5';
   return `<span class="profile-role-badge" role="listitem" style="--role-accent:${color}"><span class="profile-role-dot" aria-hidden="true"></span>${esc(role.name)}</span>`;
 }).join('');
 const count=visible.length;
 const note=state==='loaded'?count+' role'+(count===1?'':'s'):'';
 const empty=state==='not_member'?'No current server roles found.':
   state==='unavailable'?'Discord roles are temporarily unavailable. Refresh to try again.':
   'No Discord roles assigned.';
 return `<section class="profile-discord-roles" aria-label="Discord roles">
   <div class="profile-roles-heading"><h2>Discord Roles</h2>
   ${note?`<span class="profile-roles-count">${note}</span>`:''}</div>
   ${state==='loaded'&&count?`<div class="profile-roles-list" role="list">${badges}</div>`:
     `<p class="profile-roles-empty">${empty}</p>`}
 </section>`;
}
export function profile(ctx,{person,profile,sections=[],posts=[],pinnedPost=null,comments=[],counts={},self=false,following=false,privateProfile=false,discordRoles={state:'unavailable',roles:[]},sbsMember=false,tab='posts',activityReplies=[]}){
const canView=!privateProfile,u={...person,...(canView?profile:{})};
const tabNames={posts:'Posts',replies:'Replies',media:'Media',likes:'Liked Posts'};
const profileTabs=['posts','replies','media',...(self?['likes']:[])].map(v=>`<a class="social-tab ${tab===v?'active':''}" href="/u/${attr(person.id)}?tab=${v}">${tabNames[v]}</a>`).join('');
const replyCards=activityReplies.map(r=>`<article class="panel padded profile-reply"><span class="eyebrow">REPLY TO @${esc(r.original_author)}</span><p>${lines(r.body)}</p><a class="table-link" href="/post/${attr(r.target_id)}">View conversation →</a></article>`).join('');
const tabContent=tab==='replies'?replyCards||'<div class="panel empty">No replies to posts yet.</div>':posts.filter(p=>tab!=='posts'||p.id!==pinnedPost?.id).map(p=>postCard(ctx,p)).join('')||`<div class="panel empty">${tab==='media'?'No photo posts yet.':tab==='likes'?'You have not liked any posts yet.':'No posts from this member yet.'}</div>`;
return shell(ctx,self?'My Profile':'Member Profile',`<section class="profile-page theme-${attr(profile?.theme||'midnight')} accent-${attr(profile?.accent||'blue')} font-${attr(profile?.font||'system')} layout-${attr(profile?.layout||'classic')} ${profile?.animations?'fx-enabled':''}">
<div class="profile-banner" ${canView&&profile?.banner_path?`style="background-image:url('${attr(path(profile.banner_path))}')"`:''}></div>
<div class="profile-panel panel" ${canView&&profile?.background_path?`style="background-image:linear-gradient(90deg,rgba(8,20,42,.92),rgba(8,20,42,.95)),url('${attr(path(profile.background_path))}')"`:''}><div class="profile-top">${avatar(u,'xxl',true)}<div class="profile-actions">${self?'<a href="/profile/edit" class="btn btn-outline">'+icon('user-round-pen',{size:17})+' Edit profile</a>':`<form method="post" action="/u/${attr(person.id)}/follow">${token(ctx)}<button class="btn ${following?'btn-outline':'btn-primary'}">${following?'Following ✓':'+ Follow'}</button></form>`}<button type="button" class="btn btn-quiet" data-share-path="/u/${attr(person.id)}">${icon('share-2',{size:17})} Share</button></div></div><div class="profile-identity"><h1>${esc(u.nickname||u.display_name)}${canView?sbsNameTag(sbsMember):''}</h1><span>@${esc(person.username)} <span class="verified">${icon('badge-check',{size:16})} Discord linked</span></span>${canView&&profile?.pronouns?`<span class="muted"> · ${esc(profile.pronouns)}</span>`:''}</div>${canView&&profile?.status_text?`<p class="profile-status">${icon('sparkles',{size:17})} ${esc(profile.status_text)}</p>`:''}<p class="profile-bio">${canView?lines(profile?.bio||'Member of SB’s & Cam’s Store.'):privateProfile?'This member has made their profile private.':''}</p>${canView?discordRoleSection(discordRoles):''}<div class="profile-stats"><span><b>${counts.posts||0}</b> Posts</span>${canView&&(!profile||profile.show_follows||self)?`<a href="/u/${attr(person.id)}/followers"><b>${counts.followers||0}</b> Followers</a><a href="/u/${attr(person.id)}/following"><b>${counts.following||0}</b> Following</a>`:''}<span><b>${counts.suggestions||0}</b> Suggestions</span></div>${canView?`<div class="profile-links">${[profile?.social_1,profile?.social_2,profile?.social_3].filter(Boolean).map(v=>`<a href="${attr(safeHttpUrl(v))}" rel="noopener noreferrer nofollow" target="_blank">↗ ${esc(new URL(v).hostname)}</a>`).join('')}</div>`:''}</div>
${canView?`<div class="profile-columns"><div class="stack">${sections.filter(s=>s.visible).map(s=>`<section class="panel padded profile-section"><h3>${esc(s.title)}</h3><p>${lines(s.content)}</p></section>`).join('')||'<div class="panel padded"><p class="muted">This member has not added custom sections yet.</p></div>'}<section class="panel padded"><h2>Profile wall</h2>${profile?.allow_comments!==0?commentList(ctx,comments,'u',person.id):'<p class="muted">Profile comments are disabled.</p>'}</section></div><div class="stack">${tab==='posts'&&pinnedPost?`<section class="panel padded"><span class="eyebrow">${icon('pin',{size:15})} PINNED POST</span></section>${postCard(ctx,pinnedPost)}`:''}<nav class="social-tabs" aria-label="Profile activity tabs">${profileTabs}</nav>${tabContent}</div></div>`:''}</section>`);
}
const selected=(value,current)=>value===current?'selected':'';
const checked=v=>v?'checked':'';
export function profileEdit(ctx,{profile,sections=[],posts=[]}) {
return shell(ctx,'Customize Profile',`${titlebar('YOUR PERSONAL SPACE','Design your <span class="gradient">profile.</span>','Customize every part of your member page with colours, fonts, images and custom sections.','<a href="/profile" class="btn btn-primary">View My Profile →</a>')}
<div class="profile-edit-grid"><div class="stack"><form method="post" action="/profile/edit" class="panel padded form">${token(ctx)}<h2>Identity and biography</h2><label>Website display name<input name="nickname" maxlength="40" value="${attr(profile.nickname)}" placeholder="Use your Discord name"></label><label>Pronouns (optional)<input name="pronouns" maxlength="35" value="${attr(profile.pronouns)}"></label><label>Short status<input name="status_text" maxlength="100" value="${attr(profile.status_text)}" placeholder="What are you working on?"></label><label>Bio<textarea name="bio" maxlength="500" rows="4">${esc(profile.bio)}</textarea></label><h2 class="spaced">Appearance</h2><div class="field-grid"><label>Profile theme<select name="theme">${['midnight','glass','minimal','neon','royal','forest'].map(x=>`<option value="${x}" ${selected(x,profile.theme)}>${esc(x[0].toUpperCase()+x.slice(1))}</option>`).join('')}</select></label><label>Accent colour<select name="accent">${['blue','emerald','pink','gold','violet','red','cyan','silver'].map(x=>`<option value="${x}" ${selected(x,profile.accent)}>${esc(x)}</option>`).join('')}</select></label><label>Font<select name="font">${['system','rounded','serif','mono'].map(x=>`<option value="${x}" ${selected(x,profile.font)}>${esc(x)}</option>`).join('')}</select></label><label>Profile layout<select name="layout">${['classic','compact','showcase'].map(x=>`<option value="${x}" ${selected(x,profile.layout)}>${esc(x)}</option>`).join('')}</select></label></div><div class="toggle-list"><label class="check-label"><input type="checkbox" name="animations" ${checked(profile.animations)}> Visual effects and animations</label><label class="check-label"><input type="checkbox" name="public" ${checked(profile.public)}> Public member profile</label><label class="check-label"><input type="checkbox" name="allow_comments" ${checked(profile.allow_comments)}> Allow comments on my profile</label><label class="check-label"><input type="checkbox" name="show_follows" ${checked(profile.show_follows)}> Display follower counts</label></div><h2 class="spaced">External links</h2><label>Link 1<input name="social_1" type="url" maxlength="500" value="${attr(profile.social_1)}" placeholder="https://..."></label><label>Link 2<input name="social_2" type="url" maxlength="500" value="${attr(profile.social_2)}"></label><label>Link 3<input name="social_3" type="url" maxlength="500" value="${attr(profile.social_3)}"></label><button class="btn btn-primary">Save profile changes</button></form>
<div class="panel padded"><h2>Customize profile photos</h2><p class="muted tiny">PNG, JPEG, GIF and WebP up to 4 MB. Website-only images do not change Discord.</p>${[['avatar','Profile picture'],['banner','Profile banner'],['background','Background image']].map(([slot,title])=>`<form method="post" enctype="multipart/form-data" action="/profile/upload/${slot}" class="image-form">${token(ctx)}<label>${title}<input type="file" name="image" required accept="image/png,image/jpeg,image/gif,image/webp"></label><button class="btn btn-outline btn-sm">Upload ${title.toLowerCase()}</button></form>`).join('')}</div></div>
<div class="stack"><section class="panel padded"><h2>Custom profile sections</h2><p class="muted tiny">Add as many short sections as you like (up to 12). Reorder with arrows. Only text is supported; embedded scripts or custom CSS are blocked.</p>${sections.map(s=>`<div class="custom-section"><h3>${esc(s.title)}</h3><p>${lines(s.content)}</p><div class="actions"><form method="post" action="/profile/section/${s.id}/move">${token(ctx)}<button class="btn btn-quiet btn-xs" name="direction" value="up">↑</button><button class="btn btn-quiet btn-xs" name="direction" value="down">↓</button></form><form method="post" action="/profile/section/${s.id}/delete" data-confirm="Delete this custom section?">${token(ctx)}<button class="btn btn-danger btn-xs">Delete</button></form></div><details><summary>Edit section</summary><form class="form" method="post" action="/profile/section/${s.id}/edit">${token(ctx)}<label>Title<input name="title" maxlength="65" value="${attr(s.title)}" required></label><label>Content<textarea name="content" maxlength="1200" rows="3" required>${esc(s.content)}</textarea></label><label class="check-label"><input name="visible" type="checkbox" ${checked(s.visible)}> Publicly visible</label><button class="btn btn-outline btn-sm">Save section</button></form></details></div>`).join('')}
<form method="post" action="/profile/section" class="form">${token(ctx)}<label>Section title<input name="title" maxlength="65" required placeholder="Favourite games, About me..."></label><label>Section text<textarea name="content" maxlength="1200" rows="4" required></textarea></label><button class="btn btn-outline">Add new section +</button></form></section>
<section class="panel padded"><h2>Pin a post</h2><p class="muted tiny">Pin any of your posts on your profile.</p><form method="post" action="/profile/pin">${token(ctx)}<label>Choose your post<select name="post_id"><option value="">No pinned post</option>${posts.map(p=>`<option value="${p.id}" ${Number(profile.pinned_post_id)===p.id?'selected':''}>#${p.id}: ${esc(p.body.slice(0,48))}</option>`).join('')}</select></label><button class="btn btn-outline btn-sm">Update pin</button></form></section><a class="btn btn-outline" href="/u/${attr(ctx.user.id)}">View my profile →</a></div></div>`);
}
export function roles(ctx,{roles=[],manageable=[],selected=null,botPosition=0,find='',candidates=[],errorText=''}) {
  const can=new Set(manageable.map(r=>r.id)),owned=new Set(selected?.roles||[]);
  return shell(ctx,'Role Management',`${titlebar('ADMIN CONSOLE','Discord <span class="gradient">role management.</span>','Every role is synchronized from your Discord server. Protected and high-ranking roles cannot be modified.')}
<div class="stats-three"><div class="stat"><small>DETECTED ROLES</small><strong>${roles.length}</strong></div><div class="stat"><small>ASSIGNABLE ROLES</small><strong>${manageable.length}</strong></div><div class="stat"><small>PROTECTED / OUT OF REACH</small><strong>${roles.length-manageable.length}</strong></div></div>
<form method="get" action="/admin/roles" class="panel search-panel"><input name="member" maxlength="80" value="${attr(find)}" placeholder="Search Discord username or enter user ID..."><button class="btn btn-primary">Find member</button></form>${errorText?`<div class="alert alert-error">${esc(errorText)}</div>`:''}${candidates.length?`<div class="panel padded"><h3>Matching Discord members</h3><div class="member-grid">${candidates.map(x=>`<a class="member-card" href="/admin/roles?member=${attr(x.id)}">${avatar(x,'lg')}<b>${esc(x.display_name)}</b><small>@${esc(x.username)}</small><span class="table-link">Manage →</span></a>`).join('')}</div></div>`:''}
${selected?`<section class="panel padded"><div class="section-heading"><h2>Manage ${esc(selected.display_name)}</h2>${avatar(selected,'md')}</div><p class="muted">@${esc(selected.username)} · ${esc(selected.id)} · Protected roles are read-only.</p><div class="role-grid">${roles.filter(r=>r.id!==ctx.config.guildId).map(r=>`<div class="role-row"><span class="role-dot" style="background:#${Number(r.color||0).toString(16).padStart(6,'0').slice(-6)}"></span><div class="role-details"><b>${esc(r.name)}</b><small>Position ${r.position} · ${owned.has(r.id)?'Assigned':'Not assigned'}</small></div>${can.has(r.id)?`<form method="post" action="/admin/roles/change">${token(ctx)}<input type="hidden" name="user_id" value="${attr(selected.id)}"><input type="hidden" name="role_id" value="${attr(r.id)}"><button name="action" value="${owned.has(r.id)?'remove':'add'}" class="btn ${owned.has(r.id)?'btn-outline':'btn-primary'} btn-xs">${owned.has(r.id)?'Remove':'Assign'}</button></form>`:`<span class="pill">${icon('lock-keyhole',{size:15})} Protected</span>`}</div>`).join('')}</div></section>`:'<div class="panel padded"><h2>Choose a member first</h2><p>Search their Discord username or paste their user ID to see available roles.</p></div>'}
<section class="panel"><div class="panel-heading"><h2>Detected server roles</h2><span class="muted">Refresh this page to synchronize</span></div><div class="table-wrap"><table><thead><tr><th>ROLE</th><th>POSITION</th><th>ROLE ID</th><th>STATUS</th></tr></thead><tbody>${roles.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.position}</td><td class="id-text">${esc(r.id)}</td><td>${can.has(r.id)?tag('assignable'):tag('protected')}</td></tr>`).join('')}</tbody></table></div></section>`);
}
export function settings(ctx,{open,roles,roleMap,manageable}) {
const ids=new Set(manageable.map(r=>r.id));return shell(ctx,'Admin Settings',`${titlebar('ADMIN CONSOLE','Application <span class="gradient">settings.</span>','Manage applications and legacy role mapping settings. All newly accepted applicants receive Mod - temp.')}
<div class="admin-grid"><section class="panel padded"><h2>Open / close applications</h2><p class="muted">Currently ${open?'open':'closed'} for submissions.</p><form method="post" action="/admin/settings/open">${token(ctx)}<button name="open" value="${open?'false':'true'}" class="btn ${open?'btn-danger':'btn-primary'}">${open?'Close applications':'Open applications'}</button></form></section>
<section class="panel padded"><h2>Accepted application → Discord role</h2><p class="muted tiny">Legacy position mapping is retained for compatibility but no longer controls new applications. V1.4 always assigns the Mod - temp role after final approval. Configure PROMOTION_TEMP_ROLE_ID in Railway variables.</p><form method="post" action="/admin/settings/mapping">${token(ctx)}${ctx.config.applicationRoles.map(position=>`<label>${esc(position)}<select name="map_${attr(position)}"><option value="">Auto-detect by role name</option>${roles.filter(r=>ids.has(r.id)).map(r=>`<option value="${attr(r.id)}" ${roleMap[position]===r.id?'selected':''}>${esc(r.name)} (${r.id})</option>`).join('')}</select></label>`).join('')}<button class="btn btn-primary">Save role mappings</button></form></section></div>
${ctx.role==='owner'?`<section class="panel padded owner-settings-box"><h2>Discord staff webhook</h2>
<p class="muted">Send a no-ping test to each configured Discord channel. The general staff channel uses @here for new tickets; confidential Staff Reports use separate admin or owner channels.</p>
<form method="post" action="/admin/settings/webhook/test">${token(ctx)}<div class="actions">
<button class="btn btn-outline btn-sm" name="target" value="default">Test Staff Webhook →</button>
<button class="btn btn-outline btn-sm" name="target" value="adminReport">Test Admin Reports →</button>
<button class="btn btn-outline btn-sm" name="target" value="ownerReport">Test Owner Reports →</button></div></form>
<p class="muted tiny">Designated final approver: ${ctx.config.finalApproverId?esc(ctx.config.finalApproverId):'Not configured (FINAL_APPROVER_USER_ID)'}</p>
</section>`:''}`);
}
export function moderation(ctx,{reports=[]}) {return shell(ctx,'Moderation',`${titlebar('ADMIN CONSOLE','Content <span class="gradient">moderation.</span>','Review reported posts, comments, profiles and suggestions.')}
<div class="panel"><div class="panel-heading"><h2>Open reports</h2><span class="muted">${reports.length} reports</span></div><div class="table-wrap"><table><thead><tr><th>REPORTER</th><th>CONTENT</th><th>REASON</th><th>DATE</th><th>ACTION</th></tr></thead><tbody>${reports.map(r=>`<tr><td>${esc(r.display_name)}</td><td><b>${esc(r.kind)}</b> #${esc(r.target_id)}</td><td>${esc(r.reason)}</td><td>${when(r.created_at)}</td><td><form method="post" action="/admin/moderation/${r.id}/resolve">${token(ctx)}<button class="btn btn-outline btn-xs" name="action" value="dismiss">Dismiss</button><button class="btn btn-danger btn-xs" name="action" value="remove">Remove content</button></form></td></tr>`).join('')}</tbody></table>${reports.length?'':'<div class="empty">No open reports.</div>'}</div></div>`);}
export function report(ctx,{kind,id}){return shell(ctx,'Report Content',`${titlebar('COMMUNITY SAFETY','Report <span class="gradient">content.</span>','Reports are private to authorized admins.')}
<form class="panel padded form narrow" method="post" action="/report">${token(ctx)}<input type="hidden" name="kind" value="${attr(kind)}"><input type="hidden" name="id" value="${attr(id)}"><p>Reporting ${esc(kind)} #${esc(id)}</p><label>Reason<textarea name="reason" minlength="10" maxlength="500" required rows="4" placeholder="Describe the problem..."></textarea></label><button class="btn btn-primary">Submit report</button></form>`);}
export function audit(ctx,{events=[],verified,filter=''}){return shell(ctx,'Owner Audit Log',`${titlebar('OWNER ACCESS ONLY','Complete <span class="gradient">activity audit.</span>','Private to the verified server owner and authorized co-owners. Website changes and successful access to private tickets are recorded. Routine page visits are not logged.')}
<div class="stats-three"><div class="stat"><small>CHAIN INTEGRITY</small><strong class="${verified.ok?'success-text':'danger-text'}">${verified.ok?'Verified':'WARNING'}</strong></div><div class="stat"><small>HISTORICAL LEDGER RECORDS</small><strong>${verified.count}</strong></div><div class="stat"><small>LOG ACCESS</small><strong>Owners</strong></div></div>
<form method="get" action="/owner/audit" class="panel search-panel"><input name="q" maxlength="80" value="${attr(filter)}" placeholder="Filter by Discord username, user ID, action, target or outcome..."><button class="btn btn-primary">Filter</button><a class="btn btn-outline" href="/owner/audit/export">Export changes &amp; ticket access</a><a class="btn btn-outline" href="/owner/audit/export?full=1">Full historical CSV</a></form>
<section class="panel"><div class="panel-heading"><h2>Changes &amp; ticket access</h2><span class="muted">Newest first · ${events.length} displayed</span></div><div class="table-wrap"><table><thead><tr><th>TIME</th><th>ACTOR / ROLE</th><th>ACTION</th><th>TARGET</th><th>RESULT</th><th>DETAILS</th></tr></thead><tbody>${events.map(e=>`<tr><td class="nowrap">${when(e.at)}</td><td><b title="Discord user ID: ${attr(e.actor_id)}">${e.actorKnown?`<a href="/u/${attr(e.actor_id)}">${esc(e.actorDisplay)}</a>`:`${esc(e.actorDisplay||e.actor_id)}`}</b><div class="id-text">${esc(e.actor_role)}</div></td><td>${esc(e.action)}</td><td class="id-text">${esc(e.targetDisplay??e.target)}</td><td>${tag(e.outcome)}</td><td><details><summary>Details</summary><pre class="audit-json">${esc(e.detailsDisplay??e.details)}</pre></details></td></tr>`).join('')}</tbody></table>${events.length?'':'<div class="empty">No matching audit events.</div>'}</div></section><p class="muted tiny">Routine page views and historical page-view spam are hidden from this list. Full forensic history remains retained and is available in the optional full CSV export. Original Discord IDs and hashes remain unchanged for verification.</p><p class="muted tiny">Tamper-evident hashes detect edits to retained records. Protect the database and its backups separately; a local administrator with full filesystem access can replace both.</p>`);}
export function owners(ctx,{owners=[]}) {return shell(ctx,'Owner Access',`${titlebar('VERIFIED SERVER OWNER','Co-owner <span class="gradient">access.</span>','Only the Discord server owner can grant or revoke co-owner access to private audit records.')}
<div class="panel padded narrow"><h2>Authorize a co-owner</h2><p class="muted tiny">Enter a Discord USER ID, not a role ID. This grants sensitive website owner access, including all audit records.</p><form method="post" action="/owner/owners">${token(ctx)}<label>Discord user ID<input name="user_id" pattern="[0-9]{15,22}" maxlength="22" required placeholder="123456789012345678"></label><button class="btn btn-primary">Grant owner access</button></form><hr><h3>Authorized co-owners</h3>${owners.map(o=>`<div class="owner-row"><span title="Discord user ID: ${attr(o.user_id)}">${o.username?`@${esc(o.username)}`:`ID: ${esc(o.user_id)}`} <small>Added ${when(o.created_at)}</small></span><form method="post" action="/owner/owners/remove">${token(ctx)}<input type="hidden" name="user_id" value="${attr(o.user_id)}"><button class="btn btn-danger btn-xs">Revoke</button></form></div>`).join('')||'<p class="muted">None yet. The actual Discord guild owner always has access.</p>'}<p class="muted tiny">Additional co-owners configured in OWNER_USER_IDS can be removed only from the .env file.</p></div>`);}
