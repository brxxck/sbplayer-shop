// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Navigation only exposes destinations the session may discover; routes still authorize independently.
export function navigationGroups(ctx){
 const member=!!ctx.user&&ctx.role!=='appeal-only';
 const staff=['reviewer','admin','owner'].includes(ctx.role),admin=['admin','owner'].includes(ctx.role);
 const groups=[{label:'Community',items:[['/','Home']]}];
 if(!ctx.user)return groups;
 if(!member){groups.push({label:'Support',items:[['/tickets/new/ban_appeal','Ban Appeal'],['/tickets/mine','My Appeals'],['/team','Meet the Team']]});return groups;}
 groups[0].items.push(['/feed','Main Feed'],['/suggestions','Suggestions']);
 groups.push({label:'People',items:[['/members','Members'],['/team','Teams']]},
  {label:'MegaSMP',items:[['/mega-team','Overview'],['/mega-team/leaderboard','Top 10'],['/mega-team/transactions','Transactions']]},
  {label:'Support',items:[['/tickets/new','New Ticket'],['/tickets/mine','My Tickets'],['/applications','Applications']]});
 if(staff)groups.push({label:'Staff',collapsible:true,items:[['/staff/tickets','Active Cases'],['/staff','Staff Applications'],...(admin?[['/staff/promotions','Promotions']]:[]),...(ctx.teamRecruiter?[['/team-applications/review','Team Recruitment']]:[])]});
 else if(ctx.teamRecruiter)groups.push({label:'Recruitment',collapsible:true,items:[['/team-applications/review','Team Recruitment']]});
 if(admin)groups.push({label:'Administration',collapsible:true,items:[['/admin/roles','Roles'],['/admin/moderation','Moderation'],['/admin/dm-reports','Message Reports'],['/admin/settings','Settings']]});
 if(ctx.role==='owner')groups.push({label:'Owner',collapsible:true,items:[['/owner/approvals','Final Approvals'],['/owner/audit','Audit Log'],['/owner/owners','Owner Access'],['/mega-team/links','Link Profiles'],['/team/mega/matches','Match Accounts']]});
 return groups;
}
export function renderNavigation(ctx,link){return navigationGroups(ctx).map(g=>{
 const active=g.items.some(([p])=>ctx.pathname===p||ctx.pathname?.startsWith(p+'/'));
 const links=g.items.map(([p,label])=>link(p,label,'',ctx)).join('');
 return g.collapsible?`<details class="nav-group" ${active?'open':''}><summary>${g.label}</summary><nav aria-label="${g.label}">${links}</nav></details>`:`<div class="sidebar-title">${g.label.toUpperCase()}</div><nav aria-label="${g.label}">${links}</nav>`;
}).join('');}
export function renderMobile(ctx){
 const links=ctx.role==='appeal-only'?[['/','Home'],['/tickets/mine','Appeals'],['/team','Team']]:[['/','Home'],['/feed','Feed'],['/messages','Messages']];
 return links.map(([p,l])=>`<a href="${p}" ${ctx.pathname===p?'aria-current="page"':''}>${l}</a>`).join('')+`<details class="mobile-more"><summary>More</summary><nav aria-label="More pages">${navigationGroups(ctx).map(g=>`<strong>${g.label}</strong>`+g.items.filter(([p])=>!links.some(([x])=>x===p)).map(([p,l])=>`<a href="${p}">${l}</a>`).join('')).join('')}</nav></details>`;
}
