// BUILT BY SB // RUNING ON WEED AND CAFFEINE
export const DISCORD_ADMIN = 1n << 3n;
export const MANAGE_GUILD = 1n << 5n;
export const MANAGE_ROLES = 1n << 28n;
export const idOK = id => typeof id==='string' && /^\d{15,22}$/.test(id);
export const text = (s,limit=2000) => typeof s==='string' ? s.replace(/\r/g,'').trim().slice(0,limit+1) : '';
export const limitText=(s,max,min=0)=>{const v=text(s,max); return v.length>=min && v.length<=max?v:null;};
export const isFinal = status => status === 'accepted' || status === 'denied';
// A live, bot-verified Discord Administrator permission is equivalent to an explicit
// configured admin role for site access. Role names alone are never authoritative.
// Do not use this as an owner grant: owner-only access remains independently verified.
export function hasVerifiedAdministratorPermission(member,guildRoles=[]){
  const owned=new Set(member?.roles||[]);
  return Array.isArray(guildRoles)&&guildRoles.some(role=>{
    if(!role||!owned.has(role.id))return false;
    try{return (BigInt(role.permissions||'0')&DISCORD_ADMIN)!==0n;}catch{return false;}
  });
}
export function classify(member, ownerId, userId, cfg, dynamicOwners=new Set()) {
  if (!member || member.pending) return 'none';
  if (userId===ownerId || cfg.ownerIds.has(userId) || dynamicOwners.has(userId)) return 'owner';
  const roles=new Set(member.roles||[]);
  if ([...cfg.adminIds].some(id=>roles.has(id))) return 'admin';
  if ([...cfg.reviewerIds].some(id=>roles.has(id))) return 'reviewer';
  return 'member';
}
export function protectedRole(role,cfg) {
  if (!role || role.id===cfg.guildId || role.managed || cfg.adminIds.has(role.id) || cfg.ownerRoleIds.has(role.id) || cfg.protectedIds?.has(role.id) || /(^|\W)(co.?owner|owner|admin|administrator|management)(\W|$)/i.test(role.name||'')) return true;
  const bits=BigInt(role.permissions||'0');
  return !!(bits & (DISCORD_ADMIN | MANAGE_ROLES | MANAGE_GUILD));
}
export function highestPosition(member,roles) {
  const owned=new Set(member?.roles||[]);
  return roles.filter(r=>owned.has(r.id)).reduce((max,r)=>Math.max(max,Number(r.position)||0),0);
}
export function manageableRoles(roles, botMember, cfg) {
  const botMax=highestPosition(botMember,roles);
  return roles.filter(r=>!protectedRole(r,cfg) && Number(r.position)<botMax);
}
export function targetEligible(target,roles,botMember,ownerId,userId,cfg,dynamicOwners=new Set()) {
  if (!target || userId===ownerId || cfg.ownerIds.has(userId)||dynamicOwners.has(userId)) return false;
  return highestPosition(target,roles)<highestPosition(botMember,roles);
}
export function consensus(rows, nextVote) {
  if (!['accept','deny'].includes(nextVote.choice)) throw new Error('Invalid admin decision');
  if (rows.some(r=>r.admin_id===nextVote.admin_id)) throw new Error('Admin has already voted');
  const list=[...rows,nextVote];
  const accepts=new Set(list.filter(r=>r.choice==='accept').map(r=>r.admin_id)).size;
  const denies=new Set(list.filter(r=>r.choice==='deny').map(r=>r.admin_id)).size;
  return {accepts,denies,final:accepts>=2?'accepted':denies>=2?'denied':null};
}
export function safeHttpUrl(value) {
  if (!value || typeof value!=='string' || value.length>500) return '';
  try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
}
export const ACCENTS=new Set(['blue','emerald','pink','gold','violet','red','cyan','silver']);
export const THEMES=new Set(['midnight','glass','minimal','neon','royal','forest']);
export const FONTS=new Set(['system','rounded','serif','mono']);
export const PROFILE_LAYOUTS=new Set(['classic','compact','showcase']);
export function normalizeProfile(input,existing={}) {
  return {
    nickname:limitText(input.nickname,40)||'',bio:limitText(input.bio,500)||'',pronouns:limitText(input.pronouns,35)||'',
    status_text:limitText(input.status_text,100)||'',accent:ACCENTS.has(input.accent)?input.accent:'blue',
    theme:THEMES.has(input.theme)?input.theme:'midnight',font:FONTS.has(input.font)?input.font:'system',
    layout:PROFILE_LAYOUTS.has(input.layout)?input.layout:'classic',
    animations:input.animations==='on'?1:0,public:input.public==='on'?1:0,
    allow_comments:input.allow_comments==='on'?1:0,show_follows:input.show_follows==='on'?1:0,
    social_1:safeHttpUrl(input.social_1),social_2:safeHttpUrl(input.social_2),social_3:safeHttpUrl(input.social_3),
    avatar_path:existing.avatar_path||'',banner_path:existing.banner_path||'',background_path:existing.background_path||''
  };
}
export const suggestionStates=new Set(['under_review','planned','accepted','declined','implemented']);
export function visibleVoteCounts(votes) {return {yes:votes.filter(v=>v.choice==='yes').length,no:votes.filter(v=>v.choice==='no').length};}
