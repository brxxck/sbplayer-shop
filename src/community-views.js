// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,avatar,esc,token,titlebar} from './views.js';
import {dmSettings,isBlocking} from './community-data.js';
import {onlineStatus} from './community-live.js';
const fmt=stamp=>new Date(stamp).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});
function presence(userId){const status=onlineStatus(userId);return '<span class="presence-chip" data-presence-id="'+esc(userId)+'" data-status="'+status+'"><span class="presence-dot"></span><span class="presence-label">'+(status==='online'?'Online':status==='away'?'Away':'Offline')+'</span></span>';}
export function inboxRows(threads=[]){
  return threads.map(t=>'<a class="dm-thread panel" href="/messages/'+t.id+'">'+avatar(t.peer,'md',true)+
    '<span class="dm-thread-body"><b>'+esc(t.peer.nickname||t.peer.display_name)+'</b>'+presence(t.peer.id)+
    '<small>'+esc(t.latest?(t.latest.deleted_at?'Message deleted':t.latest.body.slice(0,90)):'Start a conversation')+'</small></span>'+
    (t.unread?'<b class="dm-unread">'+Math.min(t.unread,99)+'</b>':'')+'</a>').join('');
}
export function inbox(ctx,threads=[]){
  const contents=inboxRows(threads);
  const settings=dmSettings(ctx.user.id);
  return shell(ctx,'Messages','<section class="dm-page" data-dm-inbox>'+titlebar('PRIVATE CONVERSATIONS','Your <span class="gradient">messages.</span>','Conversations stay private between participants.')+
    '<div class="dm-grid"><div class="stack"><form class="panel padded" method="post" action="/messages/start">'+token(ctx)+
    '<label>Start a new conversation <input name="q" placeholder="Member username or Discord ID" maxlength="80" required></label><button class="btn btn-primary" type="submit">Find and message</button></form>'+
    '<section class="stack"><label>Filter conversations<input type="search" data-dm-filter placeholder="Search your conversations" autocomplete="off"></label><div class="stack" data-dm-list>'+(contents||'<div class="panel empty">No conversations yet. Visit a member profile or search above to send a message.</div>')+'</div></section></div>'+
    '<section class="panel padded"><h2>Messaging settings</h2><form method="post" action="/messages/settings">'+token(ctx)+
    '<label>Who can message you <select name="allow_messages">'+
    [['members','All website members'],['following','People I follow'],['nobody','Nobody']].map(([value,label])=>'<option value="'+value+'" '+(settings.allow_messages===value?'selected':'')+'>'+label+'</option>').join('')+
    '</select></label><label>Online visibility <select name="presence"><option value="online" '+(settings.presence==='online'?'selected':'')+'>Visible</option><option value="invisible" '+(settings.presence==='invisible'?'selected':'')+'>Invisible</option></select></label>'+
    '<label class="check-label"><input type="checkbox" name="read_receipts" value="1" '+(settings.read_receipts?'checked':'')+'> Show read receipts to other members</label>'+
    '<button class="btn btn-outline">Save preferences</button></form></section></div></section>');
}
function bubble(ctx,m,read){
  const mine=m.sender_id===ctx.user.id;
  const message=m.deleted_at?'This message was removed.':esc(m.body).replace(/\n/g,'<br>');
  const attached=(m.attachments||[]).map(file=>'<a class="dm-attachment" href="/messages/files/'+file.id+'">'+esc(file.name)+'</a>').join('');
  return '<article class="dm-bubble '+(mine?'dm-mine':'dm-theirs')+'" data-message-id="'+m.id+'" data-message-version="'+Math.max(Number(m.edited_at)||0,Number(m.deleted_at)||0)+'"><div class="dm-bubble-body">'+message+attached+'</div>'+
    '<small>'+fmt(m.created_at)+(m.edited_at?' · Edited':'')+(mine&&read>=m.id?' · Seen':'')+'</small>'+
    (!m.deleted_at&&mine?'<div class="dm-bubble-tools">'+
      '<button type="button" class="btn btn-quiet btn-xs" data-dm-edit="'+m.id+'">Edit</button>'+
      '<form action="/messages/'+m.thread_id+'/delete/'+m.id+'" method="post">'+token(ctx)+'<button class="btn btn-quiet btn-xs" type="submit">Delete</button></form></div>':'')+
    (!m.deleted_at&&!mine?'<button type="button" class="btn btn-quiet btn-xs" data-dm-report="'+m.id+'">Report</button>':'')+'</article>';
}
export function conversation(ctx,{thread,peer,messages,otherRead,readAllowed,blocked}){
  return shell(ctx,'Messages','<section class="dm-page" data-dm-thread="'+thread.id+'" data-peer-id="'+esc(peer.id)+'" data-csrf="'+esc(ctx.csrf)+'">'+
    '<a href="/messages" class="table-link">← All messages</a><header class="dm-conversation-header panel">'+
    avatar(peer,'md',true)+'<div><b>'+esc(peer.nickname||peer.display_name)+'</b>'+presence(peer.id)+'</div>'+
    '<form action="/messages/block/'+esc(peer.id)+'" method="post" class="dm-block-form">'+token(ctx)+
    '<input type="hidden" name="block" value="'+(isBlocking(ctx.user.id,peer.id)?'0':'1')+'">'+
    '<button class="btn btn-quiet btn-xs" type="submit">'+(isBlocking(ctx.user.id,peer.id)?'Unblock':'Block')+'</button></form></header>'+
    '<div class="dm-history panel" id="dm-history">'+messages.map(m=>bubble(ctx,m,otherRead)).join('')+'</div>'+
    '<p class="muted tiny" data-dm-typing aria-live="polite"></p>'+
    (blocked?'<p class="alert alert-error">This conversation is blocked. Unblock to send messages.</p>':
    '<form method="post" action="/messages/'+thread.id+'/send" enctype="multipart/form-data" class="dm-compose panel padded" data-dm-send>'+token(ctx)+
    '<textarea name="body" maxlength="2000" placeholder="Write a private message..." rows="2"></textarea>'+
    '<div class="dm-compose-actions"><label class="upload-label">Attach files (up to 3)<input type="file" name="evidence" multiple accept="image/png,image/jpeg,image/webp,image/gif"></label>'+
    '<button class="btn btn-primary" type="submit">Send message</button></div><p class="muted tiny" role="status" data-dm-error></p></form>')+
    '</section>');
}
export function reportsPage(ctx,reports=[]){
  return shell(ctx,'Message Reports','<section class="dm-page">'+titlebar('MODERATION','Reported <span class="gradient">messages.</span>',
    'Only messages explicitly reported by participants are available here.')+
    reports.map(r=>'<article class="panel padded"><b>Report #'+r.id+' · '+esc(r.status)+'</b><p>From @'+esc(r.reporter_name)+' about @'+esc(r.sender_name)+'</p>'+
    '<p><b>Reason:</b> '+esc(r.reason)+'</p><p><b>Reported message:</b> '+esc(r.message_snapshot)+'</p>'+
    (r.status==='open'?'<form method="post" action="/admin/dm-reports/'+r.id+'">'+token(ctx)+
    '<button class="btn btn-outline btn-sm" name="status" value="dismissed">Dismiss</button> '+
    '<button class="btn btn-primary btn-sm" name="status" value="resolved">Resolve</button></form>':'')+'</article>').join('')+
    (reports.length?'':'<div class="panel empty">No message reports.</div>')+'</section>');
}
export function messageFragment(ctx,threadId,m,read=0){return bubble(ctx,{...m,thread_id:threadId},read);}
export function presenceChip(userId){return presence(userId);}