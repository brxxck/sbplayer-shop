// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,tag,token,titlebar,avatar} from './views.js';
import {TEAM_SKILLS} from './team-applications.js';
const displayMoney=n=>Number(n||0).toLocaleString('en-GB');
const when=v=>new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
const lines=v=>esc(v).replace(/\n/g,'<br>');
const bankLabel={yes:'Yes',sometimes:'Sometimes',no:'No'};
const answer=(label,value)=>'<div class="answer"><b>'+esc(label)+'</b><p>'+lines(value)+'</p></div>';
const requirement=linked=>'<section class="panel padded team-identity-gate"><h2>Verify your accounts</h2>'+
  '<p>Discord and Microsoft/Xbox verification are required to apply.</p>'+
  '<p>Discord: <b>Verified and signed in</b></p>'+
  '<p>Microsoft/Xbox: <b>'+esc(linked?.gamertag?'Verified: '+linked.gamertag:'Not linked')+'</b></p>'+
  (linked?.gamertag?'':'<a class="btn btn-primary" href="/profile/microsoft/start">Link Microsoft / Xbox →</a>')+
  '</section>';
export function teamApplyPage(ctx,{xboxLink=null,active=null,history=[],alreadyMember=false,open=true}={}) {
 const identity=!!xboxLink?.gamertag;
 const historyHtml=history.length?'<section class="panel padded"><h2>Past applications</h2>'+
  '<div class="table-wrap"><table><thead><tr><th>Ticket</th><th>IGN</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>'+
  history.map(a=>'<tr><td>#'+a.id+'</td><td>'+esc(a.minecraft_ign)+'</td><td>'+when(a.created_at)+'</td><td>'+tag(a.status)+'</td><td><a class="table-link" href="/team-applications/'+a.id+'">View</a></td></tr>').join('')+
  '</tbody></table></div></section>':'';
 let body='';
 if(alreadyMember)body='<section class="panel padded"><h2>You already belong to SBs</h2><p>You're already an SBs member.</p></section>';
 else if(active)body='<section class="panel padded"><h2>Application already submitted</h2><p>Your application is '+tag(active.status)+'.</p><a class="btn btn-primary" href="/team-applications/'+active.id+'">View application #'+active.id+' →</a></section>';
 else if(!open)body='<section class="panel padded"><h2>Applications are closed</h2><p>Recruitment is currently closed.</p></section>';
 else if(!identity)body=requirement(xboxLink);
 else body='<form class="panel form team-application-form" action="/team-applications/apply" method="post">'+token(ctx)+
  '<div class="form-heading"><span class="step">01</span><div><h2>Account & team</h2></div></div>'+
  '<div class="field-grid"><label>Verified IGN<input readonly value="'+esc(xboxLink.gamertag)+'"></label>'+
  '<label>Current team<input name="current_team" maxlength="80" placeholder="None / Team name"></label></div>'+
  '<div class="field-grid"><label>Timezone<input name="timezone" required minlength="2" maxlength="80" placeholder="e.g. UK / GMT"></label>'+
  '<label>Previous teams<input name="previous_teams" maxlength="500" placeholder="Previous teams or experience"></label></div>'+
  '<hr><div class="form-heading"><span class="step">02</span><div><h2>Earnings & wealth</h2><p>Full MegaSMP $ amounts, not k/m.</p></div></div>'+
  '<div class="field-grid"><label>Daily earnings ($)<input type="number" name="daily_earnings" min="0" max="999999999999999" step="1" required placeholder="e.g. 5000000"></label>'+
  '<label>Net worth ($)<input type="number" name="net_worth" min="0" max="999999999999999" step="1" required placeholder="e.g. 25000000"></label></div>'+
  '<label>Main income source<textarea name="income_method" required minlength="8" maxlength="1200" rows="3" placeholder="Farming, trading, grinding..."></textarea></label>'+
  '<label>Team bank contributions<select name="bank_contribution" required><option value="">Choose an answer</option><option value="yes">Yes</option><option value="sometimes">Sometimes</option><option value="no">No</option></select></label>'+
  '<hr><div class="form-heading"><span class="step">03</span><div><h2>Activity & skills</h2></div></div>'+
  '<div class="field-grid"><label>Days per week<select name="play_days" required><option value="">Select days</option>'+
   Array.from({length:7},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+' day'+(i?'s':'')+'</option>').join('')+'</select></label>'+
  '<label>Hours per day<input type="number" name="play_hours" required min="0.5" max="24" step="0.5" placeholder="e.g. 4"></label></div>'+
  '<fieldset class="team-skills"><legend>Strengths (up to 5)</legend><div class="team-skill-grid">'+
   TEAM_SKILLS.map(s=>'<label class="check-label"><input type="checkbox" name="skill_'+s.key+'"> '+esc(s.label)+'</label>').join('')+'</div></fieldset>'+
  '<label>Strong suits (optional)<textarea name="strong_suits" maxlength="900" rows="3" placeholder="What do you do best?"></textarea></label>'+
  '<hr><div class="form-heading"><span class="step">04</span><div><h2>About joining</h2></div></div>'+
  '<label>Why SBs?<textarea name="motivation" required minlength="15" maxlength="1800" rows="4"></textarea></label>'+
  '<label>Your contribution<textarea name="contribution" required minlength="15" maxlength="1800" rows="4"></textarea></label>'+
  '<p class="muted tiny">Answers are private to you and team leaders. Figures are self-reported. Acceptance does not automatically grant a role or invite.</p>'+
  '<div class="form-actions"><a href="/mega-team" class="btn btn-outline">Back to MegaSMP</a><button type="submit" class="btn btn-primary">Submit application</button></div></form>';
 return shell(ctx,'Apply to SBs',titlebar('MEGASMP RECRUITMENT','Join <span class="gradient">SBs.</span>','')+
  '<div class="stack narrow">'+body+historyHtml+'</div>');
}
export function myTeamApplicationPage(ctx,{application:a}={}) {
 return shell(ctx,'Team application #'+a.id,titlebar('PRIVATE TEAM APPLICATION','Team application <span class="gradient">#'+a.id+'</span>','Submitted '+when(a.created_at),tag(a.status))+
 '<div class="stack narrow"><section class="panel padded"><h2>Details</h2><p class="muted">Private to you and team leadership.</p>'+
 '<p><b>Minecraft IGN:</b> '+esc(a.minecraft_ign)+'</p><p><b>Daily income:</b> $'+displayMoney(a.daily_earnings)+'</p><p><b>Net worth:</b> $'+displayMoney(a.net_worth)+'</p><p><b>Activity:</b> '+esc(a.play_days)+' days/week, '+esc(a.play_hours)+' hours/active day</p></section>'+
 '<a class="btn btn-outline" href="/team-applications/apply">Back to applications</a></div>');
}
export function teamReviewQueue(ctx,{items=[],status='active',sort='newest',q=''}={}) {
 const options=[['active','Active'],['pending','Pending'],['reviewing','Reviewing'],['interview','Interview'],['accepted','Accepted'],['denied','Denied'],['all','All']];
 const sorts=[['newest','Newest'],['earnings','Highest earnings'],['wealth','Highest net worth'],['activity','Most active']];
 const select=(name,current,values)=>'<select name="'+name+'">'+values.map(([key,label])=>'<option value="'+key+'"'+(key===current?' selected':'')+'>'+label+'</option>').join('')+'</select>';
 return shell(ctx,'SBs Team Recruitment',titlebar('PRIVATE TEAM LEADERSHIP','Team <span class="gradient">recruitment.</span>','')+
 '<section class="panel padded"><form action="/team-applications/review" method="get" class="field-grid"><label>Status'+select('status',status,options)+'</label>'+
 '<label>Sort by'+select('sort',sort,sorts)+'</label><label>Search<input name="q" value="'+esc(q)+'" maxlength="60" placeholder="Search applicants"></label>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">Filter</button></div></form></section>'+
 '<section class="panel"><div class="panel-heading"><h2>Applications</h2><span class="muted">'+items.length+' displayed</span></div>'+
 '<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Earnings/day</th><th>Net worth</th><th>Hours/week</th><th>Status</th><th></th></tr></thead><tbody>'+
 items.map(a=>'<tr><td><a class="member-inline" href="/u/'+esc(a.user_id)+'">'+avatar(a,'sm')+'<span><b>'+esc(a.minecraft_ign)+'</b><small>@'+esc(a.username)+'</small></span></a></td>'+
 '<td>$'+displayMoney(a.daily_earnings)+'</td><td>$'+displayMoney(a.net_worth)+'</td>'+
 '<td>'+Number(a.play_days*a.play_hours).toLocaleString('en-GB')+'</td><td>'+tag(a.status)+'</td>'+
 '<td><a class="table-link" href="/team-applications/review/'+a.id+'">Review →</a></td></tr>').join('')+
 '</tbody></table>'+(items.length?'':'<div class="empty">No matching applications.</div>')+'</div></section>');
}
export function teamReviewDetail(ctx,{application:a}={}) {
 const skills=JSON.parse(a.skills_json||'[]').map(k=>TEAM_SKILLS.find(s=>s.key===k)?.label||k).join(', ');
 const final=['accepted','denied'].includes(a.status),own=a.user_id===ctx.user.id;
 const actions=final?'<div class="notice-box">This application has a final outcome. It cannot be changed here.</div>':own?'<div class="notice-box">You cannot review your own team application.</div>':
 '<form method="post" action="/team-applications/review/'+a.id+'/status">'+token(ctx)+
 '<label>Decision note (optional)<textarea name="note" maxlength="1500" rows="3" placeholder="Reason for the decision"></textarea></label>'+
 '<div class="choice-row"><button name="status" value="reviewing" class="btn btn-outline">Under review</button><button name="status" value="interview" class="btn btn-outline">Interview</button>'+
 '<button name="status" value="accepted" class="btn btn-success">Accept</button><button name="status" value="denied" class="btn btn-danger">Deny</button></div></form>';
 return shell(ctx,'Review SBs application #'+a.id,titlebar('TEAM LEADERSHIP','Review <span class="gradient">'+esc(a.minecraft_ign)+'</span>','Submitted '+when(a.created_at),tag(a.status))+
 '<div class="review-grid"><section class="panel padded"><h2>Applicant details</h2>'+
 answer('Discord',a.display_name+' (@'+a.username+')')+
 answer('Verified Xbox IGN at submission',a.minecraft_ign)+
 answer('Current team',a.current_team||'None given')+
 answer('Daily income','MegaSMP $'+displayMoney(a.daily_earnings))+
 answer('Estimated net worth','MegaSMP $'+displayMoney(a.net_worth))+
 answer('Active days per week',a.play_days)+answer('Hours per active day',a.play_hours)+
 answer('Timezone',a.timezone)+answer('Top skills',skills)+answer('Strong suits',a.strong_suits||'Not specified')+
 answer('Money-making method',a.income_method)+answer('Team bank contribution',bankLabel[a.bank_contribution]||a.bank_contribution)+
 answer('Previous teams',a.previous_teams||'None given')+answer('Why join SBs?',a.motivation)+answer('Expected contribution',a.contribution)+'</section>'+
 '<div class="stack"><section class="panel padded"><h2>Recruitment decision</h2>'+actions+
 '<p class="muted tiny">Decisions don't assign roles or send team invites.</p></section>'+
 '<section class="panel padded"><h2>Private notes</h2><form action="/team-applications/review/'+a.id+'/note" method="post">'+token(ctx)+
 '<label>Notes<textarea name="note" maxlength="2000" rows="5" '+(own?'disabled':'')+'>'+esc(a.reviewer_note||'')+'</textarea></label>'+
 '<button class="btn btn-primary btn-sm" '+(own?'disabled':'')+'>Save note</button></form></section></div></div>'+
 '<a href="/team-applications/review" class="btn btn-outline">Back to applications</a>');
}
