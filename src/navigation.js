// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Navigation only exposes destinations the session may discover; routes still authorize independently.
import {icon} from './icons.js';
export function navigationGroups(ctx){
 const member=!!ctx.user&&ctx.role!=='appeal-only';
 const staff=['reviewer','admin','owner'].includes(ctx.role),admin=['admin','owner'].includes(ctx.role);
 const groups=[{label:'Community',items:[['/','Home']]}];
 if(!ctx.user)return groups;
 if(!member){groups.push({label:'Support',items:[['/tickets/new/ban_appeal','Ban Appeal'],['/tickets/mine','My Appeals'],['/team','Meet the Team']]});return groups;}
 groups[0].items.push(['/feed','Main Feed'],['/suggestions','Suggestions'],['/points','Level Points'],['/arcade','Arcade']);
 groups.push({label:'People',items:[['/members','Members'],['/team','Teams']]},
  {label:'MegaSMP',items:[['/mega-team','Overview'],['/mega-team/leaderboard','Top 10'],['/mega-team/transactions','Transactions']]},
  {label:'Support',items:[['/tickets/new','New Ticket'],['/tickets/mine','My Tickets'],['/applications','Applications']]});
 if(staff)groups.push({label:'Staff',collapsible:true,items:[['/staff/tickets','All Tickets'],['/staff','Staff Applications'],...(admin?[['/staff/promotions','Promotions']]:[])]});
 else if(ctx.teamRecruiter)groups.push({label:'Recruitment',collapsible:true,items:[['/team-applications/review','Team Recruitment']]});
 if(admin)groups.push({label:'Administration',collapsible:true,items:[['/admin/roles','Roles'],['/admin/moderation','Moderation'],['/admin/dm-reports','Message Reports'],['/admin/settings','Settings']]});
 if(ctx.role==='owner')groups.push({label:'Owner',collapsible:true,items:[['/owner/approvals','Final Approvals'],['/owner/audit','Audit Log'],['/owner/level-points','BotGhost Connection'],['/owner/point-all','Point All'],['/owner/owners','Owner Access'],['/mega-team/links','Link Profiles'],['/team/mega/matches','Match Accounts']]});
 return groups;
}
export function renderNavigation(ctx,link){return navigationGroups(ctx).map(g=>{
 const active=g.items.some(([p])=>ctx.pathname===p||ctx.pathname?.startsWith(p+'/'));
 const links=g.items.map(([p,label])=>link(p,label,'',ctx)).join('');
 return g.collapsible?`<details class="nav-group" ${active?'open':''}><summary>${g.label}</summary><nav aria-label="${g.label}">${links}</nav></details>`:`<div class="sidebar-title">${g.label.toUpperCase()}</div><nav aria-label="${g.label}">${links}</nav>`;
}).join('');}
// Compact thumb navigation is visible only at the mobile breakpoint. Full page routes
// and role-based permissions remain unchanged; desktop uses renderNavigation above.
export function renderMobile(ctx){
 const appeal=ctx.role==='appeal-only';
 const quick=appeal?
  [['/','Home','house'],['/tickets/mine','Appeals','tickets'],['/team','Team','users-round']]:
  [['/','Home','house'],['/feed','Feed','newspaper'],['/messages','Messages','message-circle'],['/arcade','Arcade','award']];
 const here=p=>ctx.pathname===p||(p!=='/'&&ctx.pathname?.startsWith(p+'/'));
 const quickLinks=quick.map(([p,label,name])=>
  `<a class="mobile-nav-tab" href="${p}" ${here(p)?'aria-current="page"':''}><span class="mobile-nav-icon" aria-hidden="true">${icon(name,{size:21})}</span><span class="mobile-nav-label">${label}</span></a>`).join('');
 const pages=navigationGroups(ctx).map(group=>{
  const links=group.items.filter(([p])=>!quick.some(([x])=>x===p));
  if(!links.length)return '';
  return `<section class="mobile-menu-section" aria-label="${group.label}"><h3>${group.label}</h3>${links.map(([p,label])=>`<a href="${p}" ${here(p)?'aria-current="page"':''}>${label}</a>`).join('')}</section>`;
 }).join('');
 const moreSelected=!quick.some(([p])=>here(p));
 return quickLinks+`<details class="mobile-more" data-mobile-more ${moreSelected?'data-current="true"':''}>
 <summary class="mobile-nav-tab" aria-label="More pages"><span class="mobile-nav-icon" aria-hidden="true">${icon('list',{size:21})}</span><span class="mobile-nav-label">More</span></summary>
 <button type="button" class="mobile-nav-scrim" data-mobile-more-close aria-label="Close page menu"></button>
 <nav aria-label="All website pages">
  <div class="mobile-menu-header"><h2>Browse the website</h2><button type="button" class="mobile-page-search" data-mobile-page-search>${icon('search',{size:18})} Find a page</button></div>
  ${pages}
 </nav></details>`;
}
