// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// V1.5 pages for private notifications, bookmarks and the relationship graph.
import {shell,esc,token,titlebar,avatar,postCard} from './views.js';
import {icon} from './icons.js';

const date=value=>value?new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'';
const kindText={
  follow:'started following you',
  like:'liked your post',
  comment:'replied to your post',
  repost:'reposted your post',
  profile_comment:'left a comment on your profile'
};
function target(n){
  if(n.kind==='follow')return '/u/'+encodeURIComponent(n.actor_id);
  if(n.kind==='profile_comment')return '/profile';
  return /^\d+$/.test(String(n.target_id))?'/post/'+Number(n.target_id):'/feed';
}
export function notifications(ctx,{items=[]}={}){
  const unread=items.filter(n=>!n.read_at).length;
  const action='<form method="post" action="/notifications/read">'+token(ctx)+'<button class="btn btn-outline btn-sm" type="submit">'+icon('check-check',{size:16})+' Mark all read</button></form>';
  const list=items.map(n=>{
    const name=esc(n.nickname||n.display_name||n.username);
    const classes='social-notification panel'+(!n.read_at?' unread':'');
    return '<article class="'+classes+'">'+
      '<a href="'+target(n)+'" class="social-notification-person">'+
      avatar({id:n.actor_id,avatar:n.avatar,display_name:n.display_name,nickname:n.nickname,avatar_path:n.avatar_path},'md',true)+
      '<span><b>'+name+'</b> '+esc(kindText[n.kind]||'interacted with you')+
      '<small>'+date(n.created_at)+'</small></span></a>'+
      (!n.read_at?'<form method="post" action="/notifications/'+n.id+'/read">'+token(ctx)+
        '<button type="submit" class="btn btn-quiet btn-xs" aria-label="Mark notification read">Mark read</button></form>':
        '<span class="muted tiny">Read</span>')+'</article>';
  }).join('');
  return shell(ctx,'Notifications','<div class="social-page">'+
    titlebar('YOUR ACTIVITY','<span class="gradient">Notifications.</span>',
      '',unread?action:'')+
    '<div class="social-notifications-list">'+
    (list||'<div class="panel empty">No notifications yet.</div>')+
    '</div></div>');
}
export function savedPosts(ctx,{posts=[],page=0}={}){
  const html=posts.length?posts.map(p=>postCard(ctx,p,{fromSaved:true})).join(''):
    '<div class="panel empty">No saved posts yet.</div>';
  const prev=page?'<a class="btn btn-outline btn-sm" href="/saved?page='+(page-1)+'">← Newer</a>':'';
  const next=posts.length===20?'<a class="btn btn-outline btn-sm" href="/saved?page='+(page+1)+'">Older →</a>':'';
  return shell(ctx,'Saved Posts','<div class="social-page">'+
    titlebar('PRIVATE COLLECTION','Saved <span class="gradient">posts.</span>',
      'Private to you.',
      '<a class="btn btn-outline" href="/feed">'+icon('newspaper',{size:17})+' Browse feed</a>')+
    '<div class="social-post-list">'+html+'</div><div class="pager">'+prev+next+'</div></div>');
}
export function connections(ctx,{person,profile={},which='followers',items=[],self=false}={}){
  const label=which==='following'?'Following':'Followers';
  const owner=person.display_name||person.username;
  const cards=items.map(u=>'<a class="social-person panel" href="/u/'+encodeURIComponent(u.id)+'">'+
    avatar(u,'lg',true)+'<span class="social-person-main"><b>'+esc(u.nickname||u.display_name)+'</b>'+
    '<small>@'+esc(u.username)+'</small>'+
    (u.bio?'<span class="social-person-bio">'+esc(u.bio.slice(0,115))+'</span>':'')+
    '</span><span class="table-link">View profile '+icon('chevron-right',{size:16})+'</span></a>').join('');
  return shell(ctx,label,'<div class="social-page">'+
    '<a class="support-back" href="/u/'+encodeURIComponent(person.id)+'">'+icon('arrow-left',{size:16})+' Back to profile</a>'+
    titlebar('COMMUNITY CONNECTIONS',esc(owner)+' <span class="gradient">'+label.toLowerCase()+'.</span>',
      '')+
    '<nav class="social-tabs" aria-label="Connection lists">'+
    '<a class="social-tab '+(which==='followers'?'active':'')+'" href="/u/'+encodeURIComponent(person.id)+'/followers">Followers</a>'+
    '<a class="social-tab '+(which==='following'?'active':'')+'" href="/u/'+encodeURIComponent(person.id)+'/following">Following</a></nav>'+
    '<div class="social-people">'+(cards||'<div class="panel empty">No visible '+label.toLowerCase()+' yet.</div>')+'</div></div>');
}
