// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Server-rendered owner-only Point All UI. No client-supplied recipient lists.
import {shell,esc,token,titlebar,avatar} from './views.js';
import {MAX_GRANT_PER_MEMBER,MAX_GRANT_RECIPIENTS,MAX_GRANT_TOTAL} from './owner-point-grants.js';
const n=value=>Number(value||0).toLocaleString('en-GB');
const when=value=>new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
const scopes={single:'One Discord member',everyone:'Everyone in the Discord server',online:'Online on the website'};

export function pointAllPage(ctx,{preview=null,search='',matches=[],recent=[],onlineCount=0,userId=''}={}){
 const results=matches.length?matches.map(member=>
  '<a class="pointall-search-result" href="/owner/point-all?user_id='+encodeURIComponent(member.id)+'">'
  +avatar({...member,id:member.id},'sm')
  +'<span><strong>'+esc(member.display_name||member.username)+'</strong><small>@'
  +esc(member.username)+' · '+esc(member.id)+'</small></span><span>Choose →</span></a>'
 ).join(''):(search?'<p class="muted tiny">No matching registered website members. You can still enter a Discord member ID manually.</p>':'');
 const isPending=preview?.status==='pending'&&preview.expires_at>Date.now();
 const isApplied=preview?.status==='applied';
 const sample=preview?.recipients?.slice(0,8).map(person=>
  '<li>'+esc(person.display_name)+' <span class="muted">(@'+esc(person.username)+')</span></li>').join('')||'';
 const previewBlock=preview?'<section class="panel padded pointall-preview" aria-labelledby="pointall-review">'
  +'<div class="section-heading"><h2 id="pointall-review">'+(isApplied?'✅ Grant completed':isPending?'Review point grant':'Grant preview expired')+'</h2></div>'
  +'<p>'+(isApplied?'This point grant has already been processed. Reopening or resubmitting it cannot issue points twice.':isPending?'Check the recipients and totals before you approve this grant. No balances have changed yet.':'This preview is no longer valid. Create a new preview to grant points.')+'</p>'
  +'<div class="pointall-review-stats"><div><small>RECIPIENTS</small><strong>'+n(preview.recipient_count)+'</strong></div>'
  +'<div><small>POINTS EACH</small><strong>'+n(preview.amount)+'</strong></div>'
  +'<div><small>TOTAL POINTS</small><strong>'+n(preview.total)+'</strong></div></div>'
  +'<p><b>Audience:</b> '+esc(scopes[preview.scope]||preview.scope)
  +' · <b>Reason:</b> '+esc(preview.reason)+'</p>'
  +'<div class="pointall-sample"><h3>Recipient preview</h3><ul>'+sample
  +(preview.recipient_count>8?'<li class="muted">…and '+n(preview.recipient_count-8)+' more</li>':'')
  +'</ul></div>'
  +(isPending?'<p class="muted tiny">This recipient list was captured when you clicked Review. The preview expires at '+esc(when(preview.expires_at))+'.</p>'
   +'<form method="post" action="/owner/point-all/confirm" class="pointall-confirm-form">'
   +token(ctx)+'<input type="hidden" name="grant_id" value="'+esc(preview.id)+'">'
   +'<label><strong>Type GRANT to confirm</strong><input name="confirmation" pattern="GRANT" maxlength="5" autocomplete="off" required placeholder="GRANT"></label>'
   +'<div class="actions"><button class="btn btn-primary" type="submit">Grant '+n(preview.total)+' points to '+n(preview.recipient_count)+' member'+(preview.recipient_count===1?'':'s')+'</button>'
   +'<a class="btn btn-outline" href="/owner/point-all">Cancel</a></div></form>'
   :'<a class="btn btn-outline" href="/owner/point-all">Create another grant</a>')
  +'</section>':'';
 const recentBody=recent.map(row=>
  '<tr><td>'+esc(when(row.confirmed_at))+'</td><td>'+esc(row.actor_name)+'</td>'
  +'<td>'+esc(scopes[row.scope]||row.scope)+'</td><td>'+n(row.recipient_count)+'</td>'
  +'<td>+'+n(row.amount)+'</td><td>+'+n(row.total)+'</td><td>'+esc(row.reason)+'</td></tr>'
 ).join('')||'<tr><td colspan="7">No points have been granted by an owner yet.</td></tr>';

 return shell(ctx,'Point All',
  '<link rel="stylesheet" href="/static/point-all.css?v=1">'
  +titlebar('OWNER ACCESS ONLY','Point <span class="gradient">All.</span>',
   'Give bonus Arcade points to one Discord member, every server member, or everyone active on the website.')
  +'<div class="pointall-summary"><div><small>ONLINE ON WEBSITE</small><strong>'+n(onlineCount)+'</strong></div>'
  +'<div><small>MAXIMUM PER MEMBER</small><strong>'+n(MAX_GRANT_PER_MEMBER)+'</strong></div>'
  +'<div><small>MAXIMUM RECIPIENTS</small><strong>'+n(MAX_GRANT_RECIPIENTS)+'</strong></div></div>'
  +previewBlock
  +'<div class="pointall-layout">'
  +'<section class="panel padded"><h2>Give members points</h2>'
  +'<p class="muted">These are bonus entertainment points. They are added directly to the same wallet used by Arcade and Discord level rewards. Existing levels and claims are not changed.</p>'
  +'<form method="post" action="/owner/point-all/preview" class="pointall-form">'+token(ctx)
  +'<fieldset class="pointall-scopes"><legend>Who should receive points?</legend>'
  +'<label><input type="radio" name="scope" value="single" checked><span><strong>Specific player</strong><small>Send points to one verified Discord server member</small></span></label>'
  +'<label><input type="radio" name="scope" value="everyone"><span><strong>Everyone</strong><small>All verified, non-bot members in your Discord server (even if they have never signed in)</small></span></label>'
  +'<label><input type="radio" name="scope" value="online"><span><strong>Everyone online</strong><small>Members actively using this website now; not Discord online status or idle sessions</small></span></label>'
  +'</fieldset>'
  +'<label>Specific member Discord ID <small class="muted">(only for Specific player)</small>'
  +'<input name="user_id" inputmode="numeric" maxlength="22" pattern="[0-9]{15,22}" placeholder="123456789012345678" value="'+esc(userId)+'"></label>'
  +'<label>Points per member<input type="number" name="amount" min="1" max="'+MAX_GRANT_PER_MEMBER+'" value="100" step="1" required></label>'
  +'<label>Reason for this grant<input name="reason" minlength="3" maxlength="180" value="" placeholder="Event reward / Bonus points" required></label>'
  +'<p class="muted tiny">Maximum '+n(MAX_GRANT_TOTAL)+' points per grant. You must review the recipient count and type GRANT before any balance changes.</p>'
  +'<button type="submit" class="btn btn-primary">Review point distribution →</button></form></section>'
  +'<section class="panel padded pointall-member-search"><h2>Find a player</h2>'
  +'<p class="muted tiny">Search registered website accounts by Discord username or display name, then choose one. A Discord ID can also be entered directly for members who have not signed in.</p>'
  +'<form method="get" action="/owner/point-all" class="pointall-search-form">'
  +'<input name="find" maxlength="65" value="'+esc(search)+'" placeholder="Discord username or name">'
  +'<button class="btn btn-outline" type="submit">Find member</button></form>'
  +'<div class="pointall-search-results">'+results+'</div>'
  +'<div class="pointall-help"><h3>How Point All works</h3><p><strong>Everyone:</strong> uses a fresh Discord member list. If the bot cannot list members, the grant is blocked rather than silently skipping people.</p>'
  +'<p><strong>Everyone online:</strong> uses the website’s active presence (visible, recently active sessions). It does not read Discord’s green/idle indicators.</p>'
  +'<p><strong>Safety:</strong> each grant has a review step, a 10-minute expiry, a one-time confirmation, and an owner audit record.</p></div></section>'
  +'</div>'
  +'<section class="panel padded pointall-history"><div class="section-heading"><h2>Recent point grants</h2><a href="/owner/audit">Owner audit log →</a></div>'
  +'<div class="table-wrap"><table><thead><tr><th>Date</th><th>Owner</th><th>Audience</th><th>Members</th><th>Each</th><th>Total</th><th>Reason</th></tr></thead>'
  +'<tbody>'+recentBody+'</tbody></table></div></section>');
}
