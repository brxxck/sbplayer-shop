// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import http from 'node:http';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,basename,extname,dirname} from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {config,root,validateConfig} from './config.js';
import {db,one,all,run,transaction,getSetting,setSetting,upsertUser,ensureProfile} from './db.js';
import {appendAudit,verifyAudit} from './audit.js';
import {shouldAuditAction,VISIBLE_AUDIT_ACTIONS,collectAuditDiscordIds,readableAuditRows} from './audit-display.js';
import {classify,hasVerifiedAdministratorPermission,manageableRoles,protectedRole,highestPosition,targetEligible,limitText,text,idOK,normalizeProfile,safeHttpUrl,suggestionStates,isFinal} from './logic.js';
import * as liveDiscord from './discord.js';
import {randomToken,sha256} from './discord.js';
import {parseRequestBody,saveImage,safeImageFile,saveTicketEvidence,deleteTicketEvidence,safeTicketFile} from './uploads.js';
import * as view from './views.js';
import * as microsoftView from './owner-microsoft-views.js';
import {megaSessionPage} from './mega-session-views.js';
import {createMegaSessionVault} from './mega-session-vault.js';
import {createMegaSessionPairing} from './mega-session-pairing.js';
import {createOwnerMicrosoftAuth} from './owner-microsoft.js';
import * as supportView from './support-views.js';
import * as promotionView from './promotion-views.js';
import {promotionEligibility,promotionTicket,promotionDecisions,promotionMessages,ownPromotions,queuePromotions,createPromotion,writePromotionMessage,decidePromotion,deliverPromotion} from './promotions.js';
import * as homeView from './home-views.js';
import * as socialView from './social-views.js';
import {MEGA_TEAM_ID,activeMegaSeason,TEAM_REFRESH_MS,validGamertag,upsertMegaMember,setMegaMemberStatus,addMegaTransaction,recordMegaBank,createMegaSeason} from './mega-team.js';
import {megaDashboard,importMegaSnapshot} from './mega-team-data.js';
import {megaTeamPanel} from './mega-team-views.js';
import * as megaTopViews from './mega-top10-views.js';
import {top10Leaderboard,topTeamDetails,TOP10_URL} from './mega-top10-store.js';
import {allMegaPlayerProfileLinks,linkMegaPlayerProfile,unlinkMegaPlayerProfile} from './mega-player-profile-links.js';
import {createMegaTeamSync} from './mega-team-sync.js';
import {createMegaBrowserRunner} from './mega-team-browser-runner.js';
import {megaCapturedBankHistory} from './mega-team-bank-history.js';
import {megaDiscordMatches,megaDiscordMatchCandidates,linkMegaDiscordAccount,unlinkMegaDiscordAccount} from './mega-team-discord-matches.js';
import {megaHistoryPage,megaMatchesPage} from './mega-team-history-views.js';
import {notifySocial,notificationCount,notificationsFor,markNotificationsRead,connectionsFor,repliesFor,allowedProfileTabs} from './social.js';
import {SUPPORT_CATEGORIES,categoryLabel,categoryExists,supportTicket,supportMessages,supportAttachments,mySupportTickets,openSupportTickets,allSupportTickets,staffChatRecent,staffChatAfter,staffChatRow,createSupportTicket,writeSupportMessage,updateSupportStatus,reserveSupportPing,sendStaffChat} from './support.js';
import {resolveStaffReport,accessibleSupportTicket,supportQueueVisible} from './support-access.js';
import {createProfileRoleLookup} from './profile-roles.js';
import {SBS_TEAM_LEADER_ROLE_ID,SBS_TEAM_MEMBER_ROLE_ID,sbsTeamMembership} from './sbs-team.js';
import {STORE_TEAM_GROUP_ORDER,externalStaffKind,storeTeamGroup} from './team-categories.js';
import {ticketMessages,applicationAttachments,writeTicketReply,reserveStaffPing,ownerRecommendation,awaitingOwnerQueue,ownerReview} from './tickets.js';
import {application,ownApplications,activeApplication,latestApplication,applicationCounts,staffQueue,reviewerVotes,adminVotes,reviewerVote,adminVote,userProfile,profileSections,listPosts,postDetails,listComments,listSuggestions,suggestionDetails,suggestionVoters,deliverAcceptedRole} from './services.js';

class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
class Redirect extends Error {constructor(path){super('Redirect');this.path=path;}}
const invalid=(message='Invalid input')=>{throw new HttpError(400,message);};
const forbidden=(message='You do not have access to this page.')=>{throw new HttpError(403,message);};
const missing=()=>{throw new HttpError(404,'Not found.');};
const now=()=>Date.now();
function cookies(raw=''){const result={};for(const part of raw.split(';')){const pos=part.indexOf('=');if(pos<0)continue;try{result[decodeURIComponent(part.slice(0,pos).trim())]=decodeURIComponent(part.slice(pos+1).trim());}catch{}}return result;}
function secureEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
const responseHeaders={
  'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin',
  'x-frame-options':'DENY','permissions-policy':'camera=(),microphone=(),geolocation=()',
  'cross-origin-resource-policy':'same-origin',
  'content-security-policy':"default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://cdn.discordapp.com data: blob:; media-src 'self' blob:; connect-src 'self'; upgrade-insecure-requests"
};
function respond(res,status,body,type='text/html; charset=utf-8',extra={}) {res.writeHead(status,{'content-type':type,'cache-control':'no-store',...extra});res.end(body);}
function redirect(res,url){res.writeHead(303,{location:url,'cache-control':'no-store'});res.end();}
// V1.5.3: private media stays under the *same* ticket authorization checks as downloads.
// The stored filename extension (validated from file signatures at upload) chooses MIME,
// not untrusted metadata. Existing links still download; ?preview=1 permits inline media.
const evidenceMime=Object.freeze({
  png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp',
  mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'
});
function sendTicketEvidence(req,res,file,{preview=false}={}){
  const ext=extname(file).slice(1).toLowerCase();
  const mime=evidenceMime[ext];
  if(!mime)throw new HttpError(404,'Evidence type not supported.');
  const data=readFileSync(file);
  const inline=preview&&(mime.startsWith('image/')||mime.startsWith('video/'));
  const video=mime.startsWith('video/');
  const headers={
    'content-disposition':(inline?'inline':'attachment')+'; filename="ticket-evidence.'+ext+'"',
    'x-content-type-options':'nosniff','cache-control':'private, no-store',
    'cross-origin-resource-policy':'same-origin',
    ...(video?{'accept-ranges':'bytes'}:{})
  };
  // Partial content is required for seeking and resuming MP4/WebM in browsers.
  if(inline&&video&&req.headers.range){
    const range=/^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range));
    if(!range||(range[1]===''&&range[2]===''))return respond(res,416,'',mime,{...headers,'content-range':'bytes */'+data.length});
    let start,end;
    if(range[1]===''){
      const suffix=Number(range[2]);
      if(!Number.isSafeInteger(suffix)||suffix<1)return respond(res,416,'',mime,{...headers,'content-range':'bytes */'+data.length});
      start=Math.max(0,data.length-suffix);
      end=data.length-1;
    }else{
      start=Number(range[1]);end=range[2]===''?data.length-1:Number(range[2]);
    }
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=data.length||end<start)
      return respond(res,416,'',mime,{...headers,'content-range':'bytes */'+data.length});
    end=Math.min(end,data.length-1);
    return respond(res,206,data.subarray(start,end+1),mime,{...headers,'content-range':'bytes '+start+'-'+end+'/'+data.length});
  }
  return respond(res,200,data,mime,headers);
}

const urlWithNotice=(to,message,kind='success')=>{const u=new URL(to,'http://localhost');u.searchParams.set('notice',String(message).slice(0,250));u.searchParams.set('type',kind);return u.pathname+u.search;};
function setCookie(res,name,value,{maxAge=0}={}) {
  const host=config.production?'; Secure':'';
  const v=`${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${host}${maxAge?`; Max-Age=${maxAge}`:'; Max-Age=0'}`;
  res.setHeader('Set-Cookie',[...(res.getHeader('Set-Cookie')||[]),v]);
}
const idFrom=(s)=>{const v=Number(s);return Number.isSafeInteger(v)&&v>0?v:null;};
const pageNumber=v=>Number.isInteger(Number(v))?Math.max(0,Math.min(100,Number(v))):0;
function socialReturn(fields,id){
  if(fields.origin==='saved')return '/saved#post-'+id;
  if(Object.prototype.hasOwnProperty.call(fields,'feed_page')){
    const page=pageNumber(fields.feed_page),tab=fields.feed_tab==='following'?'following':'all';
    const params=new URLSearchParams();
    if(tab==='following')params.set('tab','following');
    if(page)params.set('page',String(page));
    return '/feed'+(params.size?'?'+params:'')+'#post-'+id;
  }
  return '/post/'+id;
}
const isStaffRole=r=>['reviewer','admin','owner'].includes(r);
const isAdminRole=r=>['admin','owner'].includes(r);
const appealRoute=p=>p==='/'||p==='/team'||p==='/tickets/new'||p==='/tickets/mine'||/^\/tickets\/(new\/ban_appeal|\d+(?:\/reply)?|attachments\/\d+)$/.test(p);
const ipOf=req=>{
  const remote=String(req.socket.remoteAddress||'').slice(0,90);
  return config.trustProxy?String(req.headers['x-forwarded-for']||remote).split(',')[0].trim().slice(0,90):remote;
};
function headerError(err){if(err instanceof HttpError)return err;if([400,413,415].includes(err?.status))return new HttpError(err.status,String(err.message).slice(0,300));return new HttpError(500,'An unexpected error occurred.');}
function csrfForm(form,ctx){if(!ctx.session || !secureEqual(form.fields._csrf,ctx.session.csrf))forbidden('Session verification failed. Refresh the page and retry.');}
const formValue=(fields,name,max,min=0)=>{const val=limitText(fields[name],max,min);if(val===null)invalid(`Invalid or missing field: ${name}`);return val;};
const validVote=choice=>['accept','deny'].includes(choice);
function logAction(ctx,action,target='',details={},outcome='ok') {
  if(!shouldAuditAction(action))return;
  transaction(()=>appendAudit(db,{actor:ctx.user?.id||'anonymous',role:ctx.role,action,target,outcome,details,ip:ctx.ip}));
}
function loadPosts(viewerId,page=0,userId=null,limit=20){return listPosts(viewerId,{page,userId,limit});}
const safeStatic={'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'};
async function serveStatic(res,path) {
  let file;
  if(path.startsWith('/uploads/'))file=safeImageFile(path);
  else if(['/static/style.css','/static/app.js','/static/evidence.js','/static/mega-team.js','/static/mega-top10.js','/static/sb-logo.png'].includes(path))file=resolve(root,'public',basename(path));
  else return false;
  if(!file)throw new HttpError(404,'Image not found');
  const stat=statSync(file);if(stat.size>10*1024*1024)throw new HttpError(413,'File too large');
  // CSS/JS change between releases. Never let an old stylesheet break a newer HTML layout.
  const cacheControl = ['.css','.js'].includes(extname(file)) ? 'no-store, max-age=0' : 'public, max-age=3600';
  respond(res,200,readFileSync(file),safeStatic[extname(file)]||'application/octet-stream',{'cache-control':cacheControl,'x-content-type-options':'nosniff'});
  return true;
}
const rateBuckets=new Map();
function rate(ctx,name,max,windowMs=60000){
  const key=(ctx.user?.id||ctx.ip)+'|'+name;
  const data=rateBuckets.get(key);const stamp=now();
  if(!data||stamp-data.at>windowMs){rateBuckets.set(key,{at:stamp,count:1});return;}
  if(++data.count>max)throw new HttpError(429,'Too many requests. Try again later.');
}
setInterval(()=>{const t=now();for(const [k,v] of rateBuckets)if(t-v.at>3600000)rateBuckets.delete(k);run('DELETE FROM sessions WHERE expires_at<?',t);},3600000).unref();

export function createServer({discord=liveDiscord,testLogin=false}={}){
  let teamCache=null;
  const megaSync=createMegaTeamSync();
  const megaBrowser=createMegaBrowserRunner();
  const microsoftAuth=createOwnerMicrosoftAuth({baseUrl:config.baseUrl});
  const megaSessionVault=createMegaSessionVault({dbPath:config.dbPath});
  const megaSessionPairing=createMegaSessionPairing({vault:megaSessionVault});
  const getProfileRoles=createProfileRoleLookup(discord,config.guildId);
  // Resolve historical IDs on read without changing the signed hash-chain records.
  // Local users are preferred; limited external lookups are cached to protect API quotas.
  const auditNameCache=new Map();
  async function auditUsernamesFor(events){
    const ids=collectAuditDiscordIds(events), labels=new Map();
    for(let i=0;i<ids.length;i+=150){
      const batch=ids.slice(i,i+150);
      if(!batch.length)continue;
      const found=all('SELECT id,username FROM users WHERE id IN ('+batch.map(()=>'?').join(',')+')',...batch);
      for(const user of found){
        if(user.username&&user.username!=='unknown')labels.set(user.id,user.username);
      }
    }
    const stamp=now(),unknown=ids.filter(id=>!labels.has(id));
    for(const id of unknown){
      const cached=auditNameCache.get(id);
      if(cached && cached.expires>stamp && cached.name)labels.set(id,cached.name);
    }
    const needLookup=unknown.filter(id=>!labels.has(id)&&(!auditNameCache.has(id)||auditNameCache.get(id).expires<=stamp)).slice(0,6);
    await Promise.all(needLookup.map(async id=>{
      let name='';
      try{
        const m=await discord.getGuildMember(id);
        name=String(m?.user?.username||'');
      }catch{}
      if(auditNameCache.size>=500)auditNameCache.delete(auditNameCache.keys().next().value);
      auditNameCache.set(id,{name,expires:stamp+300000});
      if(name)labels.set(id,name);
    }));
    return labels;
  }
  async function handle(req,res) {
    Object.entries(responseHeaders).forEach(([key,value])=>res.setHeader(key,value));
    if(config.production)res.setHeader('strict-transport-security','max-age=31536000; includeSubDomains');
    const url=new URL(req.url||'/','http://localhost');
    const pathname=url.pathname;
    const ctx={pathname,user:null,role:'none',session:null,member:null,guild:null,promotionEligible:false,staffNavigation:false,notificationCount:0,csrf:'',ip:ipOf(req),config,notice:url.searchParams.get('notice')||'',noticeType:url.searchParams.get('type')||''};
    const c=cookies(req.headers.cookie);
    if(c.sid){const session=one('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?',sha256(c.sid),now());if(session){ctx.session=session;ctx.user=one('SELECT * FROM users WHERE id=?',session.user_id);ctx.csrf=session.csrf;}}
    // Share the member's uploaded avatar with the global header; Discord avatar remains fallback.
    if(ctx.user)ctx.profileAvatarPath=one('SELECT avatar_path FROM profiles WHERE user_id=?',ctx.user.id)?.avatar_path||'';
    const html=(content,status=200)=>respond(res,status,content);
    const success=(path,message)=>redirect(res,urlWithNotice(path,message));
    const warn=(path,message)=>redirect(res,urlWithNotice(path,message,'error'));
    async function member(){
      if(ctx.member)return;
      if(!ctx.user)throw new Redirect('/auth/login');
      const [guild,actual]=await Promise.all([discord.getGuild(),discord.getGuildMember(ctx.user.id)]);
      if(!guild)throw new HttpError(503,'Discord server verification is currently unavailable.');
      ctx.guild=guild;
      if(!actual||actual.pending){
        // Discord OAuth verifies the account, even when the user is not a guild member.
        // Non-members can submit/track Ban Appeals and browse the staff directory only.
        if(!appealRoute(pathname))throw new HttpError(403,'Server membership is required for this feature. Non-members may submit Ban Appeals or view Meet the Team.');
        ctx.role='appeal-only';return;
      }
      ctx.member=actual;
      const coowners=new Set(all('SELECT user_id FROM owner_allowlist').map(x=>x.user_id));
      ctx.role=classify(actual,guild.owner_id,ctx.user.id,config,coowners);
       // Use *verified Discord role permissions* as an additional admin identity source.
       // A real Discord Administrator must not lose staff-ticket access because
       // ADMIN_ROLE_IDS is missing that particular role. Never trust role names alone.
       try {
         const guildRoles=await discord.getRoles();
         if(ctx.role!=='owner'&&hasVerifiedAdministratorPermission(actual,guildRoles))
           ctx.role='admin';
         ctx.promotionEligible=!!promotionEligibility(actual,guildRoles,config);
         const owned=new Set(actual.roles||[]);
         // Non-admin team roles affect navigation only, never privileged access.
         ctx.staffNavigation=isStaffRole(ctx.role)||ctx.promotionEligible||
           guildRoles.some(r=>owned.has(r.id)&&['Staff','Mod','Temp Mod'].includes(storeTeamGroup(r,config)));
       }catch{
         // Bot role lookup failure must never grant additional permissions.
         ctx.promotionEligible=false;
         ctx.staffNavigation=isStaffRole(ctx.role);
       }
      if(ctx.role==='none')forbidden('Complete Discord membership screening before using the website.');
      ctx.notificationCount=notificationCount(ctx.user.id);
      // Routine browsing, session refreshes and page loads must not fill the audit.
      // Successful reads of individual private tickets are recorded at their routes.
    }
    async function authorize(level){
      await member();
      const okay=level==='staff'?isStaffRole(ctx.role):level==='admin'?isAdminRole(ctx.role):level==='owner'?ctx.role==='owner':true;
      if(!okay){logAction(ctx,'security.access.denied',pathname,{required:level},'denied');forbidden();}
    }
    async function form(){
      const parsed=await parseRequestBody(req);csrfForm(parsed,ctx);return parsed;
    }
    if(req.method==='GET' && pathname.startsWith('/uploads/')){
      await member();
      const privateOwner=one('SELECT user_id FROM profiles WHERE public=0 AND (avatar_path=? OR banner_path=? OR background_path=?)',pathname,pathname,pathname);
      if(privateOwner && privateOwner.user_id!==ctx.user.id)forbidden('This profile image is private.');
    }
    if(req.method==='GET'&&await serveStatic(res,pathname))return;
    if(pathname==='/health'&&req.method==='GET'){return respond(res,200,JSON.stringify({ok:true,version:'1.8.0',browserCaptureConfigured:megaBrowser.enabled}),'application/json; charset=utf-8');}
    if(pathname==='/'&&req.method==='GET'){
      if(!ctx.user)return html(view.home(ctx));
      await member();
      if(ctx.role==='appeal-only')return html(homeView.appealHome(ctx,{tickets:mySupportTickets(ctx.user.id).filter(t=>t.category==='ban_appeal')}));
      if(!isStaffRole(ctx.role)){
        const posts=listPosts(ctx.user.id,{limit:4}),tickets=mySupportTickets(ctx.user.id),applications=ownApplications(ctx.user.id);
        return html(homeView.memberHome(ctx,{posts,tickets,applications}));
      }
      // Use the same permission filter for the homepage, full staff queue and ticket URLs.
      const supports=await supportQueueVisible(ctx,openSupportTickets(),discord,config);
       const promotions=isAdminRole(ctx.role)?queuePromotions():[];
      const applications=all("SELECT a.*,u.display_name,u.username FROM applications a JOIN users u ON u.id=a.user_id WHERE a.status NOT IN ('accepted','denied') ORDER BY a.updated_at DESC LIMIT 150");
      const tickets=[
        ...supports.map(t=>({...t,displayId:'T-'+t.id,href:'/staff/tickets/'+t.id})),
         ...promotions.map(t=>({...t,displayId:'P-'+t.id,category:'promotion',href:'/staff/promotions/'+t.id})),
        ...applications.map(a=>({...a,displayId:'A-'+a.id,category:'application',href:'/staff/applications/'+a.id}))
      ].sort((a,b)=>b.updated_at-a.updated_at);
      return html(homeView.staffHome(ctx,{tickets,staffMessages:staffChatRecent(),applications,activeCount:supports.length,ownerCount:ctx.role==='owner'?awaitingOwnerQueue().length:0}));
    }
    if(pathname==='/auth/login'&&req.method==='GET'){
      rate(ctx,'auth.login',15);const state=randomToken(),verifier=randomToken();
      const requested=String(url.searchParams.get('next')||'');
      const next=requested.startsWith('/')&&!requested.startsWith('//')&&view.linkPreviewData(requested)?requested:'/';
      setCookie(res,'oauth',Buffer.from(JSON.stringify({state,verifier,next})).toString('base64url'),{maxAge:600});
      res.writeHead(302,{location:discord.authUrl(state,sha256(verifier))});res.end();return;
    }
    if(pathname==='/auth/callback'&&req.method==='GET'){
      rate(ctx,'auth.callback',25);let saved;
      try{saved=JSON.parse(Buffer.from(c.oauth||'','base64url').toString('utf8'));}catch{}
      setCookie(res,'oauth','');
      if(!saved || !secureEqual(url.searchParams.get('state'),saved.state)||!url.searchParams.get('code'))invalid('Discord authorization was cancelled or expired. Try signing in again.');
      const token=await discord.exchangeCode(url.searchParams.get('code'),saved.verifier);
      const [profile,oauthMember,guild]=await Promise.all([discord.getDiscordUser(token.access_token),discord.getOAuthGuildMember(token.access_token),discord.getGuild()]);
      if(!profile||!idOK(profile.id)||profile.bot||!guild)forbidden('A valid personal Discord account is required.');
      // Anyone with a personal Discord account can sign in. Non-members have limited Ban Appeal and team-directory access.
      const actual=await discord.getGuildMember(profile.id);
      upsertUser(profile);ensureProfile(profile.id);
      if(c.sid)run('DELETE FROM sessions WHERE token_hash=?',sha256(c.sid));
      const sid=randomToken(),csrf=randomToken();run('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)',sha256(sid),profile.id,csrf,now()+7*86400000);
      setCookie(res,'sid',sid,{maxAge:7*86400});
      const coowners=new Set(all('SELECT user_id FROM owner_allowlist').map(x=>x.user_id));
      const role=actual&&!actual.pending?classify(actual,guild.owner_id,profile.id,config,coowners):'appeal-only';
      if(isStaffRole(role))logAction({...ctx,user:profile,role},'staff.login',profile.id);
      // Never allow off-site OAuth redirects. Return to the original share URL if permitted.
      const requested=String(saved.next||'');
      const next=requested.startsWith('/')&&!requested.startsWith('//')&&view.linkPreviewData(requested)?requested:'/';
      return redirect(res,role==='appeal-only'?'/tickets/new/ban_appeal':next);
    }
    if(testLogin && process.env.NODE_ENV==='test' && pathname.startsWith('/__test/login/') && req.method==='GET'){
      const id=pathname.split('/').pop();if(!idOK(id))invalid();const m=await discord.getGuildMember(id);
      // Test-only login can emulate a Discord-authenticated user who is banned from the guild.
      upsertUser(m?{...m,user:m.user||{id,username:'test'+id,global_name:'Test '+id}}:{id,username:'test'+id,global_name:'Test '+id});ensureProfile(id);
      const sid=randomToken();run('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)',sha256(sid),id,randomToken(),now()+86400000);
      setCookie(res,'sid',sid,{maxAge:86400});return redirect(res,'/dashboard');
    }
    if(pathname==='/auth/logout'&&req.method==='POST'){
      if(!ctx.user) return redirect(res,'/');
      try{await member();}catch{}
      await form();
      if(isStaffRole(ctx.role))logAction(ctx,'staff.logout',ctx.user.id);
      if(c.sid)run('DELETE FROM sessions WHERE token_hash=?',sha256(c.sid));setCookie(res,'sid','');return redirect(res,'/');
    }

    // One-use local InPvP browser handoff. No Discord cookie required: a
    // cryptographically random owner-issued code is the short-lived credential.
    if(pathname==='/owner/mega/session/pair'&&req.method==='POST'){
      rate(ctx,'mega.session.pair.upload',7,60000);
      if(!megaSessionVault.configured)
        return respond(res,503,JSON.stringify({saved:false}),
          'application/json; charset=utf-8');
      if(String(req.headers['content-type']||'').split(';')[0].trim()!=='application/json')
        return respond(res,415,JSON.stringify({saved:false}),
          'application/json; charset=utf-8');
      const limit=320*1024;
      let chunks=[],bytes=0;
      try{
        for await(const chunk of req){
          bytes+=chunk.length;
          if(bytes>limit)throw new HttpError(413,'Pairing upload too large.');
          chunks.push(chunk);
        }
      }catch{
        return respond(res,413,JSON.stringify({saved:false}),
          'application/json; charset=utf-8');
      }
      let upload;
      try{upload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
      catch{
        return respond(res,400,JSON.stringify({saved:false}),
          'application/json; charset=utf-8');
      }
      let paired;
      try{paired=megaSessionPairing.redeem(upload?.code,upload?.state);}
      catch{
        return respond(res,403,JSON.stringify({saved:false}),
          'application/json; charset=utf-8');
      }
      transaction(()=>appendAudit(db,{actor:paired.ownerId,role:'owner',
        action:'mega.session.paired',target:'inpvp-website',ip:ctx.ip,
        details:{source:'one-use-owner-pairing'}}));
      return respond(res,200,JSON.stringify({saved:true}),
        'application/json; charset=utf-8');
    }

    // Public, non-sensitive HTML for signed-out links. Discordbot can read OG tags
    // without being redirected to Discord OAuth. Real protected data remains gated.
    if(req.method==='GET' && !ctx.user && pathname!=='/' && view.linkPreviewData(pathname))
      return html(view.signedOutPreview(ctx));

    // All routes below this point are server-member-only.
    await member();

    // Private Microsoft Graph OAuth utility: no public navigation or persistent tokens.
    // Callback must be processed before the generic server-member routes.
    if(pathname==='/owner/microsoft/callback'&&req.method==='GET'){
      await authorize('owner');
      rate(ctx,'owner.microsoft.callback',15,3600000);
      const state=String(url.searchParams.get('state')||'');
      const code=String(url.searchParams.get('code')||'');
      const error=String(url.searchParams.get('error')||'');
      const completed=await microsoftAuth.complete({
        state,code,error,sessionKey:ctx.session.token_hash,userId:ctx.user.id
      });
      logAction(ctx,completed.cancelled?'owner.microsoft.cancel':'owner.microsoft.connect',
        'microsoft-graph',{result:completed.cancelled?'cancelled':'connected'});
      return redirect(res,urlWithNotice('/owner/microsoft',completed.cancelled?
        'Microsoft sign-in cancelled.':'Microsoft Graph access token obtained.'));
    }
    if(pathname==='/owner/microsoft'&&req.method==='GET'){
      await authorize('owner');
      rate(ctx,'owner.microsoft.read',40,60000);
      return html(microsoftView.ownerMicrosoftPage(ctx,{
        ...microsoftAuth.status(ctx.session.token_hash,ctx.user.id),
        redirectUri:microsoftAuth.redirectUri
      }));
    }
    if(pathname==='/owner/microsoft/start'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'owner.microsoft.start',5,3600000);
      await form();
      if(!microsoftAuth.configured)
        return warn('/owner/microsoft','Microsoft app registration is not configured.');
      const target=microsoftAuth.begin(ctx.session.token_hash,ctx.user.id);
      logAction(ctx,'owner.microsoft.start','microsoft-graph');
      return redirect(res,target);
    }
    if(pathname==='/owner/microsoft/reveal'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'owner.microsoft.reveal',5,3600000);
      await form();
      const token=microsoftAuth.reveal(ctx.session.token_hash,ctx.user.id);
      if(!token)return warn('/owner/microsoft','Token expired or already revealed. Sign in again.');
      logAction(ctx,'owner.microsoft.reveal','microsoft-graph',{result:'one-time'});
      return html(microsoftView.ownerMicrosoftTokenPage(ctx,token));
    }
    if(pathname==='/owner/microsoft/forget'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'owner.microsoft.forget',12,3600000);
      await form();
      microsoftAuth.forget(ctx.session.token_hash,ctx.user.id);
      logAction(ctx,'owner.microsoft.forget','microsoft-graph');
      return success('/owner/microsoft','Local Microsoft authorization cleared.');
    }

    // V1.5: an obvious canonical entry to each user's own public or private profile.
    if(pathname==='/profile'&&req.method==='GET')return redirect(res,'/u/'+ctx.user.id);
    if(pathname==='/notifications'&&req.method==='GET')
      return html(socialView.notifications(ctx,{items:notificationsFor(ctx.user.id)}));
    if(pathname==='/notifications/read'&&req.method==='POST'){
      rate(ctx,'social.notifications.read',30,60000);await form();
      markNotificationsRead(ctx.user.id);
      return redirect(res,'/notifications');
    }
    const notificationMatch=/^\/notifications\/(\d+)\/read$/.exec(pathname);
    if(notificationMatch&&req.method==='POST'){
      rate(ctx,'social.notifications.read',30,60000);await form();
      markNotificationsRead(ctx.user.id,idFrom(notificationMatch[1]));
      return redirect(res,'/notifications');
    }
    if(pathname==='/saved'&&req.method==='GET'){
      const page=pageNumber(url.searchParams.get('page'));
      return html(socialView.savedPosts(ctx,{posts:listPosts(ctx.user.id,{page,saved:true}),page}));
    }
    // Session management pages require live Discord owner/co-owner authorization.
    if(pathname==='/owner/mega/session'&&req.method==='GET'){
      await authorize('owner');
      rate(ctx,'mega.session.status',40,60000);
      return html(megaSessionPage(ctx,{
        ...megaSessionVault.status(),collectorEnabled:megaBrowser.enabled
      }));
    }
    if(pathname==='/owner/mega/session/code'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'mega.session.pair.code',5,3600000);
      await form();
      if(!megaSessionVault.configured)
        return warn('/owner/mega/session','Encrypted session storage is not configured.');
      const issued=megaSessionPairing.issue(ctx.user.id);
      logAction(ctx,'mega.session.pair_code','inpvp-website');
      return html(megaSessionPage(ctx,{...megaSessionVault.status(),
        collectorEnabled:megaBrowser.enabled,pairCode:issued.code,
        expiresAt:issued.expiresAt}));
    }
    if(pathname==='/owner/mega/session/disconnect'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'mega.session.disconnect',12,3600000);
      await form();
      megaSessionVault.clear();
      logAction(ctx,'mega.session.deleted','inpvp-website');
      return success('/owner/mega/session','Stored InPvP browser session deleted.');
    }

    // Railway's last failed public InPvP capture is visible only to the
    // verified website owner. It is never served by /static or /uploads.
    if(pathname==='/owner/mega/collector-screenshot.png'&&req.method==='GET'){
      await authorize('owner');
      rate(ctx,'mega.collector.owner-diagnostic',12,60000);
      const screenshot=resolve(dirname(config.dbPath),'mega-bank-last-failure.png');
      if(!existsSync(screenshot))missing();
      const stat=statSync(screenshot);
      if(!stat.isFile()||stat.size<100||stat.size>8*1024*1024)missing();
      return respond(res,200,readFileSync(screenshot),'image/png',{
        'cache-control':'private, no-store',
        'content-disposition':'inline; filename="mega-bank-private-diagnostic.png"'
      });
    }
    // V1.8: standalone MegaSMP home, current Top 10 and per-team details.
    // Read-only routes serve stored snapshots; only the worker reads InPvP.
    if(pathname==='/mega-team'&&req.method==='GET'){
      await member();
      const data=megaDashboard(url.searchParams.get('season')||undefined);
      const links=allMegaPlayerProfileLinks({season:data.season.season});
      let discordGroups=[];
      try{
        const members=[];
        let cursor='';
        for(let i=0;i<5;i++){
          const batch=await discord.listMembers(cursor,1000);
          if(!Array.isArray(batch)||!batch.length)break;
          members.push(...batch);
          if(batch.length<1000)break;
          cursor=batch.at(-1)?.user?.id||'';
          if(!cursor)break;
        }
        const leaders=[],players=[];
        for(const person of members){
          if(!person?.user?.id||person.user.bot||person.pending)continue;
          const kind=sbsTeamMembership(person.roles||[]);
          if(!kind.leader&&!kind.member)continue;
          const user={...person.user,display_name:person.nick||person.user.global_name||person.user.username};
          if(kind.leader)leaders.push(user);else players.push(user);
        }
        discordGroups=[{title:'SBs Team Leaders',members:leaders},
          {title:'SBs Team Members',members:players}].filter(g=>g.members.length);
      }catch{
        // Discord directory lookup should never block saved InPvP data.
        discordGroups=[];
      }
      return html(megaTopViews.megaHubPage(ctx,{
        listing:top10Leaderboard(),
        megaContent:megaTeamPanel(ctx,{data,discordGroups,discordMatches:links,syncEnabled:megaSync.enabled})
      }));
    }
    if(pathname==='/mega-team/leaderboard'&&req.method==='GET'){
      await member();
      rate(ctx,'mega.top10.page',60,60000);
      return html(megaTopViews.megaLeaderboardPage(ctx,top10Leaderboard()));
    }
    if(pathname==='/mega-team/top10.json'&&req.method==='GET'){
      await member();
      rate(ctx,'mega.top10.read',90,60000);
      return respond(res,200,JSON.stringify(top10Leaderboard()),
        'application/json; charset=utf-8');
    }
    const megaTeamDetailMatch=/^\/mega-team\/teams\/([A-Za-z0-9-]{1,48})$/.exec(pathname);
    if(megaTeamDetailMatch&&req.method==='GET'){
      await member();
      rate(ctx,'mega.top10.team.read',60,60000);
      const detail=topTeamDetails(megaTeamDetailMatch[1]);
      if(!detail)missing();
      return html(megaTopViews.megaTeamDetailsPage(ctx,{
        team:detail,links:allMegaPlayerProfileLinks(),
        currentSeason:activeMegaSeason()
      }));
    }
    if(pathname==='/mega-team/links'&&req.method==='GET'){
      await authorize('owner');
      rate(ctx,'mega.profile.search',25,60000);
      const q=String(url.searchParams.get('q')||'').trim().slice(0,64);
      const player=String(url.searchParams.get('player')||'').trim().slice(0,32);
      let results=[],error='';
      if(q.length>=2){
        try{
          if(idOK(q)){
            const m=await discord.getGuildMember(q);
            if(m?.user&&!m.user.bot&&!m.pending)results=[m];
          }else{
            const found=await discord.searchMembers(q,25);
            results=(Array.isArray(found)?found:[]).filter(m=>m?.user&&!m.user.bot&&!m.pending);
          }
        }catch{error='Discord member search temporarily unavailable.';}
      }
      return html(megaTopViews.megaProfileLinksPage(ctx,{
        q,player,results,links:allMegaPlayerProfileLinks(),error
      }));
    }
    if(pathname==='/mega-team/links'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'mega.profile.write',20,3600000);
      const {fields}=await form();
      const gamertag=String(fields.gamertag||'').trim();
      if(!validGamertag(gamertag))invalid('Invalid Minecraft Gamertag.');
      const back='/mega-team/links?player='+encodeURIComponent(gamertag);
      if(fields.mode==='unlink'){
        const old=unlinkMegaPlayerProfile(gamertag);
        if(old.changed)logAction(ctx,'mega.profile.unlink','mega:'+gamertag,
          {previousDiscordId:old.previousId});
        return success(back,old.changed?'Profile link removed.':'No global link existed.');
      }
      if(fields.mode!=='link')invalid('Unknown linking operation.');
      const discordId=String(fields.discord_user_id||'').trim();
      if(!idOK(discordId))invalid('Select a Discord server member.');
      let actual;
      try{actual=await discord.getGuildMember(discordId);}
      catch{throw new HttpError(503,'Discord membership verification unavailable.');}
      if(!actual?.user||actual.user.id!==discordId||actual.user.bot||actual.pending)
        invalid('This account is not a verified Discord member.');
      upsertUser(actual);ensureProfile(discordId);
      const result=linkMegaPlayerProfile({gamertag,discordId,actorId:ctx.user.id});
      if(result.changed)logAction(ctx,'mega.profile.link','mega:'+gamertag,
        {discordId,previousDiscordId:result.previousId});
      return success(back,'Minecraft username attached to the Discord website profile.');
    }
    // Prepared branch only: all saved bank events remain browsable through pages.
    // This endpoint does not contact InPvP or modify existing bank totals.
    if(pathname==='/team/mega/history'&&req.method==='GET'){
      rate(ctx,'mega.history.read',80,60000);
      const requested=String(url.searchParams.get('season')||activeMegaSeason());
      if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',requested))missing();
      const history=megaCapturedBankHistory({
        season:requested,page:url.searchParams.get('page'),
        kind:url.searchParams.get('kind')||'all',gamertag:url.searchParams.get('player')||''
      });
      return html(megaHistoryPage(ctx,{...history,seasons:all('SELECT season,label FROM mega_team_seasons ORDER BY created_at DESC,season DESC')}));
    }
    // Owner-verified Minecraft -> Discord associations, never based on role names.
    if(pathname==='/team/mega/matches'&&req.method==='GET'){
      await authorize('owner');
      rate(ctx,'mega.match.search',25,60000);
      const season=String(url.searchParams.get('season')||activeMegaSeason());
      const foundSeason=one('SELECT label FROM mega_team_seasons WHERE season=?',season);
      if(!foundSeason)missing();
      const q=String(url.searchParams.get('q')||'').trim().slice(0,64);
      let results=[],searchError='';
      if(q.length>=2){
        try{
          if(idOK(q)){
            const person=await discord.getGuildMember(q);
            if(person?.user&&!person.user.bot&&!person.pending)results=[person];
          }else{
            const matches=await discord.searchMembers(q,25);
            results=(Array.isArray(matches)?matches:[]).filter(person=>person?.user&&!person.user.bot&&!person.pending);
          }
        }catch{searchError='Discord member search is temporarily unavailable. No match was changed.';}
      }
      return html(megaMatchesPage(ctx,{
        season,seasonLabel:foundSeason.label,
        players:megaDiscordMatchCandidates(season),matches:megaDiscordMatches(season),
        q,results,preselected:String(url.searchParams.get('gamertag')||''),error:searchError
      }));
    }
    if(pathname==='/team/mega/match'&&req.method==='POST'){
      await authorize('owner');
      rate(ctx,'mega.match.change',30,3600000);
      const {fields}=await form();
      const season=String(fields.season||activeMegaSeason());
      if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))missing();
      const name=String(fields.gamertag||'').trim();
      if(!validGamertag(name))invalid('Invalid Minecraft username.');
      const back='/team/mega/matches?season='+encodeURIComponent(season)+'&gamertag='+encodeURIComponent(name);
      if(fields.mode==='unlink'){
        const removed=unlinkMegaDiscordAccount({season,gamertag:name});
        if(removed.changed)logAction(ctx,'mega.team.discord.unlink','mega-gamertag:'+name,
          {season,previousDiscordId:removed.previousId});
        return success(back,removed.changed?'Discord account unlinked.':'No existing Discord match was found.');
      }
      if(fields.mode!=='link')invalid('Select an account-link action.');
      const discordId=String(fields.discord_user_id||'').trim();
      if(!idOK(discordId))invalid('Choose a valid Discord user.');
      let actual;
      try{actual=await discord.getGuildMember(discordId);}
      catch{throw new HttpError(503,'Discord membership could not be verified. Please retry.');}
      if(!actual?.user||actual.user.id!==discordId||actual.pending||actual.user.bot)
        invalid('The Discord account is not a verified non-bot member of this server.');
      upsertUser(actual);ensureProfile(discordId);
      try{
        const linked=linkMegaDiscordAccount({season,gamertag:name,discordId,actorId:ctx.user.id});
        if(linked.changed)logAction(ctx,'mega.team.discord.link','mega-gamertag:'+name,
          {season,discordUserId:discordId,previousDiscordId:linked.previousId});
        return success(back,'Minecraft username linked to the verified Discord member.');
      }catch(error){invalid(String(error.message||'Unable to link Minecraft user.').slice(0,170));}
    }
    if(pathname==='/team/mega/data'&&req.method==='GET'){
      rate(ctx,'mega.team.read',80,60000);
      const data=megaDashboard(url.searchParams.get('season')||undefined);
      const matches=new Map(allMegaPlayerProfileLinks({season:data.season.season}).map(m=>[m.gamertag.toLowerCase(),m]));
      data.members=data.members.map(m=>{
        const linked=matches.get(m.gamertag.toLowerCase());
        return {...m,linkedDiscord:linked?{id:linked.discordId,username:linked.username||linked.displayName||'Discord member'}:null};
      });
      // Readers may view contribution figures, not administrative notes or Discord IDs.
      if(!isAdminRole(ctx.role)){
        data.members=data.members.map(({discordId,...rest})=>rest);
        data.transactions=data.transactions.map(({notes,actor_id,...rest})=>rest);
      }
      return respond(res,200,JSON.stringify({...data,syncEnabled:megaSync.enabled,browserCaptureEnabled:megaBrowser.enabled}),'application/json; charset=utf-8');
    }
    if(pathname.startsWith('/team/mega/')&&req.method==='POST'){
      const task=pathname.slice('/team/mega/'.length);
      await authorize(task==='season'?'owner':'admin');
      rate(ctx,'mega.team.change',40,3600000);
      const {fields}=await form();
      const current=activeMegaSeason();
      const selected=String(fields.season||current);
      if(task!=='season'&&selected!==current)invalid('Only the current season can be edited.');
      const back='/mega-team?season='+encodeURIComponent(current);
      try{
        if(task==='roster'){
          const names=String(fields.gamertags||'').split(/[\r\n,]+/).map(x=>x.trim()).filter(Boolean);
          if(!names.length||names.length>100||String(fields.gamertags||'').length>3000)invalid('Add 1 to 100 Gamertags.');
          if(names.some(x=>!validGamertag(x)))invalid('One or more Minecraft Gamertags are invalid.');
          const role=['Leader','Officer','Member'].includes(fields.role)?fields.role:'Member';
          const unique=[...new Map(names.map(x=>[x.toLowerCase(),x])).values()];
          transaction(()=>{for(const gamertag of unique)upsertMegaMember({season:current,gamertag,role,source:'manual'});});
          logAction(ctx,'mega.team.member.upsert','mega:'+MEGA_TEAM_ID,{season:current,count:unique.length});
          return success(back,'Updated '+unique.length+' Minecraft roster entries.');
        }
        if(task==='member-status'){
          const id=Number(fields.member_id);
          if(!Number.isSafeInteger(id)||id<1)invalid('Select a team member.');
          setMegaMemberStatus({season:current,memberId:id,status:fields.status});
          logAction(ctx,'mega.team.member.status','mega-member:'+id,{season:current,status:fields.status});
          return success(back,'Updated player membership status.');
        }
        if(task==='transaction'){
          const id=Number(fields.member_id);
          if(!Number.isSafeInteger(id)||id<1)invalid('Select a team member.');
          const transactionId=addMegaTransaction({season:current,memberId:id,kind:fields.kind,
            amount:fields.amount,notes:fields.notes||'',actorId:ctx.user.id});
          logAction(ctx,'mega.team.transaction.record','mega-transaction:'+transactionId,
            {season:current,memberId:id,kind:fields.kind,amount:fields.amount});
          return success(back,'Contribution recorded. This is not verified by InPvP.');
        }
        if(task==='bank'){
          const snapshotId=recordMegaBank({season:current,balance:fields.balance,source:'manual'});
          logAction(ctx,'mega.team.bank.snapshot','mega-bank:'+snapshotId,{season:current,balance:fields.balance});
          return success(back,'Reported bank balance saved.');
        }
        if(task==='import'){
          const raw=String(fields.snapshot||'');
          if(!raw||raw.length>100000)invalid('Snapshot must be valid JSON under 100 KB.');
          let payload;try{payload=JSON.parse(raw);}catch{invalid('Snapshot is not valid JSON.');}
          if(payload?.season&&payload.season!==current)invalid('Import only into the active season.');
          payload.season=current;
          const result=importMegaSnapshot(payload,{source:'manual_import'});
          logAction(ctx,'mega.team.snapshot.import','mega:'+MEGA_TEAM_ID,
            {season:current,count:result.count,source:'manual_import'});
          return success(back,'Manually submitted team snapshot imported.');
        }
        if(task==='season'){
          const next=createMegaSeason(fields.label);
          logAction(ctx,'mega.team.season.create','mega-season:'+next,{name:fields.label});
          return success('/mega-team?season='+encodeURIComponent(next),'New season created; prior history preserved.');
        }
      }catch(error){
        if(error instanceof HttpError)throw error;
        invalid(String(error.message||'Invalid team update.').slice(0,190));
      }
      missing();
    }
    // V1.3.1 support tickets: one permission check is reused by listing, page and attachment routes.
    function denyAppealOnlyOtherTypes(category) {
      if(ctx.role==='appeal-only'&&category!=='ban_appeal')forbidden('Non-members can submit Ban Appeals only.');
    }
    const supportTicketMatch=/^\/tickets\/(\d+)$/.exec(pathname);
    const staffSupportMatch=/^\/staff\/tickets\/(\d+)$/.exec(pathname);
    const supportReplyMatch=/^\/(staff\/)?tickets\/(\d+)\/reply$/.exec(pathname);
    const attachmentMatch=/^\/tickets\/attachments\/(\d+)$/.exec(pathname);
    async function requireSupportAccess(t,forStaff=false) {
      if(!t)missing();
      if(forStaff&&!isStaffRole(ctx.role))forbidden();
      if(ctx.role==='appeal-only' && (t.category!=='ban_appeal'||t.user_id!==ctx.user.id))missing();
      if(!await accessibleSupportTicket(ctx,t,discord,config,{staffView:forStaff}))missing();
    }
    if(pathname==='/tickets/new'&&req.method==='GET') {
      if(ctx.role==='appeal-only')return redirect(res,'/tickets/new/ban_appeal');
      return html(supportView.chooseTicket(ctx));
    }
    // V1.4 promotion tickets are separate private records, not generic support requests.
    async function stageForCurrentUser(){
      if(!ctx.member||ctx.member.pending)return null;
      const roles=await discord.getRoles();
      return promotionEligibility(ctx.member,roles,config);
    }
    if(pathname==='/promotions'&&req.method==='GET'){
      return html(promotionView.promotionHome(ctx,{stage:await stageForCurrentUser(),tickets:ownPromotions(ctx.user.id)}));
    }
    if(pathname==='/promotions/new'&&['GET','POST'].includes(req.method)){
      const stage=await stageForCurrentUser();
      if(!stage)forbidden('Only current Temp Mods and Mods can submit promotion tickets.');
      if(req.method==='GET')return html(promotionView.promotionForm(ctx,stage));
      rate(ctx,'promotion.submit',3,86400000);
      const {fields}=await form();
      const reason=formValue(fields,'reason',3000,30);
      if(one("SELECT id FROM promotion_tickets WHERE user_id=? AND (status IN ('open','reviewing') OR (status='accepted' AND role_sync_status!='assigned'))",ctx.user.id))
        return warn('/promotions','You already have a promotion request in progress.');
      const id=createPromotion({userId:ctx.user.id,stage,reason,role:ctx.role,ip:ctx.ip});
      await discord.notify({title:'New Promotion Ticket #'+id,description:'A staff member requested '+stage.fromLabel+' → '+stage.toLabel+'.',
        fields:[{name:'Review privately',value:config.baseUrl+'/staff/promotions/'+id}],pingHere:false});
      return success('/promotions/'+id,'Promotion ticket submitted.');
    }
    if(pathname==='/staff/promotions'&&req.method==='GET'){
      await authorize('admin');
      return html(promotionView.promotionQueue(ctx,{tickets:queuePromotions(url.searchParams.get('status')==='all')}));
    }
    const promotionPageMatch=/^\/(staff\/)?promotions\/(\d+)$/.exec(pathname);
    const promotionActionMatch=/^\/(staff\/)?promotions\/(\d+)\/(reply|decide|retry)$/.exec(pathname);
    if(promotionPageMatch&&req.method==='GET'){
      const staffView=!!promotionPageMatch[1],id=idFrom(promotionPageMatch[2]),ticket=promotionTicket(id);
      if(staffView)await authorize('admin');
      if(!ticket)missing();
      if(!staffView&&ticket.user_id!==ctx.user.id)missing();
      if(!staffView)run('UPDATE promotion_tickets SET applicant_seen_at=? WHERE id=?',now(),id);
      logAction(ctx,'promotion.access','promotion:'+id,{staffView});
      return html(promotionView.promotionDetails(ctx,{ticket,staffView,decisions:staffView?promotionDecisions(id):[],messages:promotionMessages(id)}));
    }
    if(promotionActionMatch&&req.method==='POST'){
      const staffView=!!promotionActionMatch[1],id=idFrom(promotionActionMatch[2]),action=promotionActionMatch[3];
      if(staffView)await authorize('admin');
      if(!staffView&&action!=='reply')forbidden();
      const ticket=promotionTicket(id);
      if(!ticket)missing();
      if(!staffView&&ticket.user_id!==ctx.user.id)missing();
      rate(ctx,'promotion.action',15,3600000);
      const {fields}=await form();
      if(action==='reply'){
        const body=formValue(fields,'body',2000,1);
        writePromotionMessage({ticketId:id,userId:ctx.user.id,role:ctx.role,body,ip:ctx.ip});
        return success(staffView?'/staff/promotions/'+id:'/promotions/'+id,'Reply sent.');
      }
      if(action==='decide'){
        if(!['accept','deny'].includes(fields.choice))invalid('Invalid decision.');
        if(ticket.user_id===ctx.user.id)forbidden('You cannot decide your own promotion.');
        if(one('SELECT 1 FROM promotion_decisions WHERE ticket_id=? AND admin_id=?',id,ctx.user.id))return warn('/staff/promotions/'+id,'You have already voted on this promotion.');
        if(!['open','reviewing'].includes(ticket.status))return warn('/staff/promotions/'+id,'Already finalized.');
        const note=formValue(fields,'note',1500,0);
        const outcome=decidePromotion({ticketId:id,adminId:ctx.user.id,choice:fields.choice,note,role:ctx.role,ip:ctx.ip});
        if(outcome.result.final==='accepted'){
          const result=await deliverPromotion({ticketId:id,actorId:ctx.user.id,role:ctx.role,ip:ctx.ip,discord});
          return result.ok?success('/staff/promotions/'+id,'Two admin approvals recorded; Discord promotion completed.'):
            warn('/staff/promotions/'+id,'Promotion accepted; role delivery failed: '+String(result.error).slice(0,120));
        }
        if(outcome.result.final==='denied')return success('/staff/promotions/'+id,'Two admins denied the promotion.');
        return success('/staff/promotions/'+id,'Admin vote saved. Waiting for a second matching vote.');
      }
      if(action==='retry'){
        if(ticket.status!=='accepted')invalid('Promotion is not accepted.');
        const result=await deliverPromotion({ticketId:id,actorId:ctx.user.id,role:ctx.role,ip:ctx.ip,discord});
        return result.ok?success('/staff/promotions/'+id,'Discord role delivery confirmed.'):
          warn('/staff/promotions/'+id,'Role delivery failed: '+String(result.error).slice(0,120));
      }
    }

    const createTicketMatch=/^\/tickets\/new\/([a-z_]+)$/.exec(pathname);
    if(createTicketMatch&&['GET','POST'].includes(req.method)){
      const category=createTicketMatch[1];
      if(!categoryExists(category))missing();
      denyAppealOnlyOtherTypes(category);
      if(req.method==='GET')return html(supportView.newTicket(ctx,{category}));
      rate(ctx,category==='ban_appeal'?'ban_appeal.create':'support.create',category==='ban_appeal'?3:6,86400000);
      const {fields,files}=await form();
      const values={};
      if(category==='bug_report')values.description=formValue(fields,'description',3000,10);
      if(category==='player_report'){
        values.reported_player=formValue(fields,'reported_player',150,2);
        values.rule_broken=formValue(fields,'rule_broken',150,2);
        values.description=formValue(fields,'description',3000,10);
      }
      if(category==='reward_claim')values.prize=formValue(fields,'prize',150,2);
      if(category==='staff_report'){
        values.staff_username=formValue(fields,'staff_username',150,2);
        values.description=formValue(fields,'description',3000,10);
      }
      if(category==='ban_appeal'){
        values.minecraft_username=formValue(fields,'minecraft_username',150,2);
        values.ban_reason=formValue(fields,'ban_reason',150,2);
        values.appeal_reason=formValue(fields,'appeal_reason',3000,10);
        if(one("SELECT 1 FROM support_tickets WHERE user_id=? AND category='ban_appeal' AND status!='resolved' LIMIT 1",ctx.user.id))
          return warn('/tickets/mine','You already have an active Ban Appeal. Please use its conversation to add information.');
      }
      const evidence=Array.isArray(files.evidence)?files.evidence:[];
      if(['player_report','staff_report'].includes(category)&&!evidence.length)invalid('Evidence is required for Player and Staff Reports.');
      if(evidence.length>5)invalid('Upload at most five files.');
      let visibility='staff',reportedId='',reportReason='';
      if(category==='staff_report'){
        const coowners=new Set(all('SELECT user_id FROM owner_allowlist').map(x=>x.user_id));
        const resolved=await resolveStaffReport(discord,values.staff_username,config,ctx.guild.owner_id,coowners);
        visibility=resolved.visibility;reportedId=resolved.reportedId;reportReason=resolved.reason;
        if(reportedId===ctx.user.id)invalid('You cannot submit a staff report about your own account.');
      }
      const stored=saveTicketEvidence(evidence);
      let id;
      try{id=createSupportTicket({userId:ctx.user.id,category,fields:values,reportedId,visibility,attachments:stored,ip:ctx.ip,role:ctx.role});}
      catch(error){deleteTicketEvidence(stored);throw error;}
      const privateReport=category==='staff_report';
      const delivered=await discord.notify({
        title:categoryLabel(category)+' — New Ticket #'+id,
        description:privateReport?'Confidential staff report. Open the restricted website ticket to view it.':'A new support ticket is ready for review.',
        fields:[{name:'Ticket',value:config.baseUrl+'/staff/tickets/'+id}],
        target:privateReport?(visibility==='owner'?'ownerReport':'adminReport'):'default',
        pingHere:!privateReport
      });
      logAction(ctx,'support_ticket.webhook','support_ticket:'+id,{category,visibility,reportReason:privateReport?reportReason:undefined,delivered});
      return success('/tickets/'+id,'Your ticket was submitted successfully.');
    }
    if(pathname==='/tickets/mine'&&req.method==='GET'){
      const supports=mySupportTickets(ctx.user.id)
        .filter(t=>ctx.role!=='appeal-only'||t.category==='ban_appeal')
        .map(t=>({...t,href:'/tickets/'+t.id}));
      const promotions=ctx.role==='appeal-only'?[]:ownPromotions(ctx.user.id).map(p=>({...p,category:'promotion',href:'/promotions/'+p.id}));
       const apps=ctx.role==='appeal-only'?[]:ownApplications(ctx.user.id)
        .map(a=>({...a,category:'application',unread:a.unread_replies||0,href:'/dashboard/applications/'+a.id}));
      return html(supportView.myTickets(ctx,{tickets:[...supports,...apps,...promotions].sort((a,b)=>b.updated_at-a.updated_at)}));
    }
    const applicationAttachmentMatch=/^\/applications\/attachments\/(\d+)$/.exec(pathname);
    if(applicationAttachmentMatch&&req.method==='GET'){
      const att=one('SELECT * FROM application_ticket_attachments WHERE id=?',idFrom(applicationAttachmentMatch[1]));
      if(!att)missing();
      const app=application(att.application_id);
      if(!app || (app.user_id!==ctx.user.id && !isStaffRole(ctx.role)))missing();
      const file=safeTicketFile(att.stored_path);
      if(!file)missing();
      logAction(ctx,'application.attachment.access','application:'+app.id,{attachmentId:att.id});
      return sendTicketEvidence(req,res,file,{preview:url.searchParams.get('preview')==='1'});
    }
    if(attachmentMatch&&req.method==='GET'){
      const att=one('SELECT * FROM support_ticket_attachments WHERE id=?',idFrom(attachmentMatch[1]));
      if(!att)missing();
      const t=supportTicket(att.ticket_id);
      await requireSupportAccess(t);
      const file=safeTicketFile(att.stored_path);
      if(!file)missing();
      logAction(ctx,'support_ticket.attachment.access','support_ticket:'+t.id,{attachmentId:att.id});
      return sendTicketEvidence(req,res,file,{preview:url.searchParams.get('preview')==='1'});
    }
    if((supportTicketMatch||staffSupportMatch)&&req.method==='GET'){
      const forStaff=!!staffSupportMatch;
      if(forStaff)await authorize('staff');
      const id=idFrom((staffSupportMatch||supportTicketMatch)[1]),t=supportTicket(id);
      await requireSupportAccess(t,forStaff);
      if(!forStaff&&t.user_id===ctx.user.id)run('UPDATE support_tickets SET applicant_seen_at=? WHERE id=?',now(),id);
      logAction(ctx,'support_ticket.access','support_ticket:'+id,{access:forStaff?'staff':'member'});
      return html(supportView.supportTicketPage(ctx,{
        ticket:t,messages:supportMessages(id),attachments:supportAttachments(id),staff:forStaff
      }));
    }
    if(supportReplyMatch&&req.method==='POST'){
      const forStaff=!!supportReplyMatch[1];
      if(forStaff)await authorize('staff');
      rate(ctx,'support.reply',12,60000);
      const id=idFrom(supportReplyMatch[2]),t=supportTicket(id);
      await requireSupportAccess(t,forStaff);
      const {fields,files}=await form();
      const body=formValue(fields,'body',2000,1);
      const evidence=Array.isArray(files.evidence)?files.evidence:[];
      if(evidence.length>5)invalid('Upload at most five files.');
      const isApplicant=t.user_id===ctx.user.id&&!forStaff;
      const stored=saveTicketEvidence(evidence);
      try{writeSupportMessage({ticketId:id,userId:ctx.user.id,role:ctx.role,body,ip:ctx.ip,isApplicant,attachments:stored});}
      catch(error){deleteTicketEvidence(stored);throw error;}
      // Confidential reports never notify a broader staff channel.
      if(isApplicant){
        const privateReport=t.category==='staff_report';
        const pingHere=privateReport?false:reserveSupportPing(id,300000);
        const delivered=await discord.notify({
          title:'New Ticket Reply — '+categoryLabel(t.category)+' #'+id,
          description:privateReport?'New reply on a confidential staff report.':'An applicant replied to a ticket.',
          fields:[{name:'Ticket',value:config.baseUrl+'/staff/tickets/'+id}],
          target:privateReport?(t.visibility==='owner'?'ownerReport':'adminReport'):'default',
          pingHere
        });
        logAction(ctx,'support_ticket.reply_webhook','support_ticket:'+id,{delivered,pingHere});
      }
      return success(forStaff?'/staff/tickets/'+id:'/tickets/'+id,'Reply sent.');
    }
    if(pathname==='/staff/tickets'&&req.method==='GET'){
      await authorize('staff');
      const scope=url.searchParams.get('status')==='all'?'all':'active';
      const available=await supportQueueVisible(ctx,scope==='all'?allSupportTickets():openSupportTickets(),discord,config);
       const promotions=isAdminRole(ctx.role)?queuePromotions(scope==='all'):[];
      const apps=scope==='all'
        ?all('SELECT a.*,u.username,u.display_name FROM applications a JOIN users u ON u.id=a.user_id ORDER BY a.updated_at DESC LIMIT 150')
        :all("SELECT a.*,u.username,u.display_name FROM applications a JOIN users u ON u.id=a.user_id WHERE a.status NOT IN ('accepted','denied') ORDER BY a.updated_at DESC LIMIT 150");
      const tickets=[
        ...available.map(t=>({...t,href:'/staff/tickets/'+t.id,displayId:'T-'+t.id})),
         ...promotions.map(t=>({...t,category:'promotion',href:'/staff/promotions/'+t.id,displayId:'P-'+t.id})),
        ...apps.map(a=>({...a,category:'application',href:'/staff/applications/'+a.id,displayId:'A-'+a.id}))
      ].sort((a,b)=>b.updated_at-a.updated_at);
      return html(supportView.staffTicketQueue(ctx,{tickets,status:scope}));
    }
    const staffStatusMatch=/^\/staff\/tickets\/(\d+)\/status$/.exec(pathname);
    if(staffStatusMatch&&req.method==='POST'){
      await authorize('staff');rate(ctx,'support.status',20,3600000);
      const id=idFrom(staffStatusMatch[1]),t=supportTicket(id);
      await requireSupportAccess(t,true);
      const {fields}=await form();
      if(!['open','reviewing','resolved'].includes(fields.status))invalid('Invalid status');
      updateSupportStatus({ticketId:id,userId:ctx.user.id,role:ctx.role,ip:ctx.ip,status:fields.status});
      return success('/staff/tickets/'+id,'Ticket status updated.');
    }
    if(pathname==='/staff/chat/messages'&&req.method==='GET'){
      await authorize('staff');rate(ctx,'staff.chat.read',45,60000);
      const after=Number(url.searchParams.get('after')||0);
      if(!Number.isSafeInteger(after)||after<0)invalid();
      return respond(res,200,JSON.stringify({messages:staffChatAfter(after).map(m=>({
        id:m.id,author_id:m.author_id,display_name:m.display_name,username:m.username,avatar:m.avatar,
        body:m.body,created_at:m.created_at
      }))}),'application/json; charset=utf-8');
    }
    if(pathname==='/staff/chat/send'&&req.method==='POST'){
      await authorize('staff');rate(ctx,'staff.chat.send',15,60000);
      const {fields}=await form();
      const body=formValue(fields,'body',1500,1);
      sendStaffChat({userId:ctx.user.id,role:ctx.role,body,ip:ctx.ip});
      return success('/','Message sent to staff chat.');
    }

    if(pathname==='/dashboard'&&req.method==='GET')return html(view.dashboard(ctx,ownApplications(ctx.user.id)));
    let ownTicketMatch=/^\/dashboard\/applications\/(\d+)$/.exec(pathname);
    if(ownTicketMatch&&req.method==='GET'){
      const id=idFrom(ownTicketMatch[1]);
      const ticket=one('SELECT * FROM applications WHERE id=? AND user_id=?',id,ctx.user.id);
      if(!ticket)missing();
      const messages=ticketMessages(id);
      run('UPDATE applications SET applicant_seen_at=? WHERE id=?',now(),id);
      logAction(ctx,'application.access','application:'+id,{access:'applicant'});
      return html(view.ownTicket(ctx,ticket,messages,applicationAttachments(id)));
    }
    // One private reply route for applicants and for staff; never accept a ticket ID as proof of access.
    const ticketReplyMatch=/^\/(dashboard|staff)\/applications\/(\d+)\/reply$/.exec(pathname);
    if(ticketReplyMatch&&req.method==='POST'){
      const staffReply=ticketReplyMatch[1]==='staff';
      if(staffReply)await authorize('staff');
      const id=idFrom(ticketReplyMatch[2]);const a=application(id);
      if(!a)missing();
      if(!staffReply&&a.user_id!==ctx.user.id)missing();
      rate(ctx,'application.reply',8,600000);
      const {fields,files}=await form();
      const body=formValue(fields,'body',2000,1);
      const evidence=Array.isArray(files.evidence)?files.evidence:[];
      if(evidence.length>5)invalid('Upload at most five files.');
      const stored=saveTicketEvidence(evidence);
      let msg;
      try{msg=writeTicketReply({appId:id,userId:ctx.user.id,role:ctx.role,body,ip:ctx.ip,attachments:stored});}
      catch(error){deleteTicketEvidence(stored);throw error;}
      if(!staffReply){
        const pingHere=reserveStaffPing(id,300000);
        const delivered=await discord.notify({title:'Applicant Reply — Staff Application #'+id,
          description:'A member has replied to their application. Please open the private ticket to read the response.',
          fields:[{name:'Applicant',value:a.user_id},{name:'Open staff ticket',value:config.baseUrl+'/staff/applications/'+id}],
          pingHere});
        logAction(ctx,'application.reply.webhook','application:'+id,{messageId:msg.id,pingHere,delivered});
      }
      return success(staffReply?'/staff/applications/'+id:'/dashboard/applications/'+id,'Reply posted.');
    }
    if(pathname==='/apply'&&req.method==='GET'){
      const recent=latestApplication(ctx.user.id);
      return html(view.apply(ctx,{active:activeApplication(ctx.user.id),cooldown:recent&&now()-recent.created_at<7*86400000,open:getSetting('applications_open','true')==='true'}));
    }
    if(pathname==='/apply'&&req.method==='POST'){
      rate(ctx,'application.submit',3,3600000);
      const {fields}=await form();
      if(getSetting('applications_open','true')!=='true')return warn('/dashboard','Applications are currently closed.');
      const position=formValue(fields,'position',80,1);
      if(!config.applicationRoles.includes(position))invalid('Unknown staff position');
      const age=formValue(fields,'age_bracket',40,1);
      if(!['Under 16','16–17','18+','Prefer not to say'].includes(age))invalid('Invalid age selection');
      const timezone=formValue(fields,'timezone',80,2);
      const availability=formValue(fields,'availability',2500,30),experience=formValue(fields,'experience',2500,30),motivation=formValue(fields,'motivation',2500,30),scenario=formValue(fields,'scenario',2500,30);
      if(activeApplication(ctx.user.id))return warn('/dashboard','You have an active application already.');
      const recent=latestApplication(ctx.user.id);
      if(recent&&now()-recent.created_at<7*86400000)return warn('/dashboard','Please wait 7 days between applications.');
      const stamp=now();
      const id=transaction(()=>{
        const result=run('INSERT INTO applications(user_id,position,age_bracket,timezone,availability,experience,motivation,scenario,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',ctx.user.id,position,age,timezone,availability,experience,motivation,scenario,stamp,stamp);
        appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'application.submitted',target:'application:'+result.lastInsertRowid,details:{position},ip:ctx.ip});return Number(result.lastInsertRowid);
      });
      // Reserve the initial staff ping so rapid follow-up messages cannot flood the staff-only channel.
      run('UPDATE applications SET last_staff_ping_at=? WHERE id=?',stamp,id);
      const delivered=await discord.notify({title:'New Staff Application',description:`Application #${id} for **${position}**`,
        fields:[{name:'Discord User ID',value:ctx.user.id},{name:'Review',value:config.baseUrl+'/staff/applications/'+id}],pingHere:true});
      logAction(ctx,'application.submitted.webhook','application:'+id,{pingHere:true,delivered});
      return success('/dashboard','Your application was submitted successfully.');
    }
    if(pathname==='/staff'&&req.method==='GET'){
      await authorize('staff');logAction(ctx,'review.queue.view','applications');
      return html(view.staff(ctx,{apps:staffQueue(ctx.user.id,isAdminRole(ctx.role)),counts:applicationCounts()}));
    }
    let m=/^\/staff\/applications\/(\d+)$/.exec(pathname);
    if(m&&req.method==='GET'){
      await authorize('staff');const id=idFrom(m[1]),a=application(id);if(!a)missing();
      const reviewed=one('SELECT * FROM reviewer_votes WHERE application_id=? AND reviewer_id=?',id,ctx.user.id);
      // Reviewed tickets leave a reviewer's pending queue, but remain available for ticket conversation.
      logAction(ctx,'application.access','application:'+id,{access:'staff'});
      const voted=one('SELECT * FROM admin_decisions WHERE application_id=? AND admin_id=?',id,ctx.user.id);
      return html(view.review(ctx,{app:a,reviewerVotes:isAdminRole(ctx.role)?reviewerVotes(id):[],adminVotes:isAdminRole(ctx.role)?adminVotes(id):[],myReviewerVote:reviewed,myAdminVote:voted,messages:ticketMessages(id),attachments:applicationAttachments(id),ownerRecommendation:ownerRecommendation(id)}));
    }
    m=/^\/staff\/applications\/(\d+)\/(review|decide|note|interview|sync)$/.exec(pathname);
    if(m&&req.method==='POST'){
      const id=idFrom(m[1]),action=m[2],a=application(id);
      await authorize(action==='review'?'staff':'admin');rate(ctx,'review.write',40,3600000);
      const {fields}=await form();if(!a)missing();
      if(action==='review'){
        if(isFinal(a.status))return warn('/staff','Application is already finalized.');
        const choice=fields.choice;if(!validVote(choice))invalid('Invalid vote');
        const note=formValue(fields,'note',1500,0);
        if(one('SELECT 1 FROM reviewer_votes WHERE application_id=? AND reviewer_id=?',id,ctx.user.id))return warn('/staff','You already reviewed this ticket.');
        reviewerVote({appId:id,userId:ctx.user.id,choice,note,role:ctx.role,ip:ctx.ip});
        return success('/staff','Your optional vote was recorded and the ticket left your queue.');
      }
      if(action==='decide'){
        const choice=fields.choice;if(!validVote(choice))invalid('Invalid decision');
        const note=formValue(fields,'note',1500,0);
        if(one('SELECT 1 FROM admin_decisions WHERE application_id=? AND admin_id=?',id,ctx.user.id))return warn(pathname.replace(/\/decide$/,''),'You have already submitted an admin decision.');
        if(isFinal(a.status))return warn('/staff','Application is finalized.');
        if(ownerRecommendation(id))return warn(`/staff/applications/${id}`,'Already awaiting unk.sb final approval.');
        const out=adminVote({appId:id,userId:ctx.user.id,choice,note,role:ctx.role,ip:ctx.ip});
        if(out.result.final){
          await discord.notify({title:'Owner Approval Required — Application #'+id,
            description:'Two admins recommend **'+out.result.final+'**. Only unk.sb can finalize the application.',
            fields:[{name:'Applicant',value:a.user_id},{name:'Owner review',value:config.baseUrl+'/owner/approvals'}]});
          return success(`/staff/applications/${id}`,'Two matching admin votes recorded. Awaiting unk.sb final approval; no role has been assigned.');
        }
        await discord.notify({title:'Admin Application Vote',description:`An admin voted on application #${id}. Waiting for two matching decisions.`});
        return success(`/staff/applications/${id}`,'Admin vote saved. A second matching admin vote is required.');
      }
      if(action==='note'){
        const note=formValue(fields,'note',2000,0);
        transaction(()=>{run('UPDATE applications SET staff_note=?,updated_at=? WHERE id=?',note,now(),id);appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'application.note.update',target:'application:'+id,details:{before:a.staff_note,after:note},ip:ctx.ip});});
        return success(`/staff/applications/${id}`,'Private admin note saved.');
      }
      if(action==='interview'){
        if(isFinal(a.status))return warn(`/staff/applications/${id}`,'Already finalized.');
        transaction(()=>{run("UPDATE applications SET status='interview',updated_at=? WHERE id=?",now(),id);appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'application.interview',target:'application:'+id,details:{previous:a.status},ip:ctx.ip});});
        return success(`/staff/applications/${id}`,'Marked for interview. Final decision still requires two admins.');
      }
      if(action==='sync'){
        if(a.status!=='accepted')invalid('Not accepted');
        const result=await deliverAcceptedRole({appId:id,actorId:ctx.user.id,role:ctx.role,ip:ctx.ip,discord});
        return result.ok?success(`/staff/applications/${id}`,'Discord role assignment confirmed.'):warn(`/staff/applications/${id}`,'Role sync failed: '+String(result.error).slice(0,120));
      }
    }
    // Only the specific configured Discord user ID can finalize tickets; a co-owner role is not sufficient.
    if(pathname==='/owner/approvals'&&req.method==='GET'){
      await authorize('owner');
      return html(view.ownerApprovals(ctx,{apps:awaitingOwnerQueue(),enabled:!!config.finalApproverId&&ctx.user.id===config.finalApproverId}));
    }
    const ownerActionMatch=/^\/owner\/applications\/(\d+)\/action$/.exec(pathname);
    if(ownerActionMatch&&req.method==='POST'){
      await authorize('owner');
      if(!config.finalApproverId||ctx.user.id!==config.finalApproverId)forbidden('Only the configured final approver (unk.sb) can approve staff applications.');
      rate(ctx,'owner.final.review',15,3600000);
      const id=idFrom(ownerActionMatch[1]),a=application(id);if(!a)missing();
      const {fields}=await form();
      const action=String(fields.action||'');
      if(!['approve','deny','return'].includes(action))invalid('Invalid owner decision.');
      const note=formValue(fields,'note',2000,0);
      if(isFinal(a.status))return warn('/owner/approvals','This application has already been finalized.');
      if(!ownerRecommendation(id))return warn('/owner/approvals','Two matching admin votes are required first.');
      const result=ownerReview({appId:id,ownerId:ctx.user.id,action,note,ip:ctx.ip});
      if(result.outcome==='accepted'){
        const sync=await deliverAcceptedRole({appId:id,actorId:ctx.user.id,role:ctx.role,ip:ctx.ip,discord});
        await discord.notify({title:'Staff Application Accepted — Owner Approved',description:'unk.sb approved application #'+id,
          fields:[{name:'Applicant',value:a.user_id},{name:'Role delivery',value:sync.ok?'Assigned':'Failed — retry needed'}]});
      }else if(result.outcome==='denied'){
        await discord.notify({title:'Staff Application Denied — Owner Decision',
          description:'unk.sb finalized application #'+id+' as denied.',
          fields:[{name:'Applicant',value:a.user_id}]});
      }else{
        await discord.notify({title:'Application Returned for Review',
          description:'unk.sb returned application #'+id+' for a new admin review round.'});
      }
      return success('/staff/applications/'+id,'Owner decision saved: '+result.outcome+'.');
    }
    if(pathname==='/feed'&&req.method==='GET'){
      const page=pageNumber(url.searchParams.get('page'));
      const tab=url.searchParams.get('tab')==='following'?'following':'all';
      return html(view.feed(ctx,{posts:listPosts(ctx.user.id,{page,following:tab==='following'}),page,tab}));
    }
    if(pathname==='/feed/create'&&req.method==='POST'){
      rate(ctx,'feed.create',8,600000);const {fields,files}=await form();const body=formValue(fields,'body',1500,0);
      if(!body&&!files.image)invalid('Add some text or a picture.');
      const image=files.image?saveImage(files.image):'';
      const result=run('INSERT INTO posts(user_id,body,image_path,created_at) VALUES(?,?,?,?)',ctx.user.id,body,image,now());
      if(isStaffRole(ctx.role))logAction(ctx,'social.post.create','post:'+result.lastInsertRowid,{preview:body.slice(0,120)});
      return success('/feed','Post published.');
    }
    m=/^\/post\/(\d+)$/.exec(pathname);
    if(m&&req.method==='GET'){
      const id=idFrom(m[1]),post=postDetails(id,ctx.user.id);if(!post)missing();
      return html(view.postDetail(ctx,{post,comments:listComments('post',id)}));
    }
    m=/^\/post\/(\d+)\/(like|repost|comment|bookmark)$/.exec(pathname);
    if(m&&req.method==='POST'){
      const id=idFrom(m[1]),action=m[2];rate(ctx,`post.${action}`,action==='comment'?15:90,600000);
      const {fields}=await form(),post=postDetails(id,ctx.user.id);if(!post)missing();
      if(action==='like'){
        const exists=one('SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?',id,ctx.user.id);
        if(exists)run('DELETE FROM post_likes WHERE post_id=? AND user_id=?',id,ctx.user.id);
        else {run('INSERT INTO post_likes(post_id,user_id,created_at) VALUES(?,?,?)',id,ctx.user.id,now());notifySocial(post.user_id,ctx.user.id,'like',id);}
        if(isStaffRole(ctx.role))logAction(ctx,'social.post.like',`post:${id}`,{before:!!exists,after:!exists});
        // JavaScript-enhanced likes update in place so scrolling the feed never opens Post Details.
        if(String(req.headers.accept||'').includes('application/json')){
          const count=one('SELECT COUNT(*) AS count FROM post_likes WHERE post_id=?',id)?.count||0;
          return respond(res,200,JSON.stringify({post_id:id,liked:!exists,like_count:count}),'application/json; charset=utf-8');
        }
        return redirect(res,socialReturn(fields,id));
      }
      if(action==='repost'){
        if(post.repost_of)invalid('Nested reposts are not supported');
        const existing=one('SELECT id FROM posts WHERE user_id=? AND repost_of=? AND deleted_at IS NULL',ctx.user.id,id);
        if(existing)run('UPDATE posts SET deleted_at=? WHERE id=?',now(),existing.id);
        else {run('INSERT INTO posts(user_id,body,repost_of,created_at) VALUES(?,?,?,?)',ctx.user.id,'',id,now());notifySocial(post.user_id,ctx.user.id,'repost',id);}
        if(isStaffRole(ctx.role))logAction(ctx,'social.post.repost',`post:${id}`,{before:!!existing,after:!existing});
        if(String(req.headers.accept||'').includes('application/json')){
          const count=one('SELECT COUNT(*) AS count FROM posts WHERE repost_of=? AND deleted_at IS NULL',id)?.count||0;
          return respond(res,200,JSON.stringify({post_id:id,reposted:!existing,repost_count:count}),'application/json; charset=utf-8');
        }
        return redirect(res,socialReturn(fields,id));
      }
      if(action==='bookmark'){
        const old=one('SELECT 1 FROM post_bookmarks WHERE post_id=? AND user_id=?',id,ctx.user.id);
        if(old)run('DELETE FROM post_bookmarks WHERE post_id=? AND user_id=?',id,ctx.user.id);
        else run('INSERT INTO post_bookmarks(post_id,user_id,created_at) VALUES(?,?,?)',id,ctx.user.id,now());
        if(String(req.headers.accept||'').includes('application/json'))
          return respond(res,200,JSON.stringify({post_id:id,saved:!old}),'application/json; charset=utf-8');
        return redirect(res,socialReturn(fields,id));
      }
      if(action==='comment'){
        const body=formValue(fields,'body',1000,1);run('INSERT INTO comments(kind,target_id,user_id,body,created_at) VALUES(?,?,?,?,?)','post',String(id),ctx.user.id,body,now());notifySocial(post.user_id,ctx.user.id,'comment',id);
        if(isStaffRole(ctx.role))logAction(ctx,'social.comment.create','post:'+id,{body:body.slice(0,100)});
        return redirect(res,`/post/${id}`);
      }
    }
    if(pathname==='/suggestions'&&req.method==='GET'){
      const page=pageNumber(url.searchParams.get('page'));return html(view.suggestions(ctx,{items:listSuggestions(page),page}));
    }
    if(pathname==='/suggestions/create'&&req.method==='POST'){
      rate(ctx,'suggestion.create',3,3600000);const {fields}=await form();
      const title=formValue(fields,'title',100,5),body=formValue(fields,'body',3000,15);
      const result=run('INSERT INTO suggestions(user_id,title,body,created_at,updated_at) VALUES(?,?,?,?,?)',ctx.user.id,title,body,now(),now());
      if(isStaffRole(ctx.role))logAction(ctx,'suggestion.create','suggestion:'+result.lastInsertRowid,{title});
      await discord.notify({title:'New Server Suggestion',description:`${title}\n${config.baseUrl}/suggestions/${result.lastInsertRowid}`});
      return success(`/suggestions/${result.lastInsertRowid}`,'Suggestion published.');
    }
    m=/^\/suggestions\/(\d+)$/.exec(pathname);
    if(m&&req.method==='GET'){
      const id=idFrom(m[1]),s=suggestionDetails(id);if(!s)missing();
      return html(view.suggestionDetail(ctx,{s,comments:listComments('suggestion',id),voters:isAdminRole(ctx.role)?suggestionVoters(id):[],myVote:one('SELECT choice FROM suggestion_votes WHERE suggestion_id=? AND user_id=?',id,ctx.user.id)?.choice||''}));
    }
    m=/^\/suggestions\/(\d+)\/(vote|comment|status)$/.exec(pathname);
    if(m&&req.method==='POST'){
      const id=idFrom(m[1]),action=m[2];if(action==='status')await authorize('admin');
      rate(ctx,`suggestions.${action}`,action==='comment'?20:80,600000);
      const {fields}=await form(),s=suggestionDetails(id);if(!s)missing();
      if(action==='vote'){
        if(!['yes','no'].includes(fields.choice))invalid('Invalid vote');
        const existing=one('SELECT choice FROM suggestion_votes WHERE suggestion_id=? AND user_id=?',id,ctx.user.id);
        if(existing?.choice===fields.choice)run('DELETE FROM suggestion_votes WHERE suggestion_id=? AND user_id=?',id,ctx.user.id);
        else run('INSERT INTO suggestion_votes(suggestion_id,user_id,choice,created_at) VALUES(?,?,?,?) ON CONFLICT(suggestion_id,user_id) DO UPDATE SET choice=excluded.choice,created_at=excluded.created_at',id,ctx.user.id,fields.choice,now());
        if(isStaffRole(ctx.role))logAction(ctx,'suggestion.vote','suggestion:'+id,{choice:existing?.choice===fields.choice?'removed':fields.choice});
        return redirect(res,`/suggestions/${id}`);
      }
      if(action==='comment'){
        const body=formValue(fields,'body',1000,1);run('INSERT INTO comments(kind,target_id,user_id,body,created_at) VALUES(?,?,?,?,?)','suggestion',String(id),ctx.user.id,body,now());
        if(isStaffRole(ctx.role))logAction(ctx,'suggestion.comment','suggestion:'+id,{body:body.slice(0,100)});
        return redirect(res,`/suggestions/${id}`);
      }
      if(action==='status'){
        if(!suggestionStates.has(fields.status))invalid('Invalid status');
        transaction(()=>{run('UPDATE suggestions SET status=?,updated_at=? WHERE id=?',fields.status,now(),id);appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'suggestion.status',target:'suggestion:'+id,details:{before:s.status,after:fields.status},ip:ctx.ip});});
        return success(`/suggestions/${id}`,'Suggestion status updated.');
      }
    }
    if(pathname==='/members'&&req.method==='GET'){
      const q=text(url.searchParams.get('q'),80),found=[];let fallback=false;
      if(q){
        if(idOK(q)){
          try{const m=await discord.getGuildMember(q);if(m){upsertUser(m);ensureProfile(q);found.push(one('SELECT * FROM users WHERE id=?',q));}}catch{fallback=true;}
        }else{
          try{
            const list=await discord.searchMembers(q,30);
            for(const m of list||[]){if(!m.user||m.user.bot)continue;upsertUser(m);ensureProfile(m.user.id);found.push(one('SELECT u.*,p.nickname,p.avatar_path FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?',m.user.id));}
          }catch{fallback=true;}
        }
      }
      if(!q||fallback){
        const local=all('SELECT u.*,p.nickname,p.avatar_path FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.username LIKE ? OR u.display_name LIKE ? ORDER BY u.updated_at DESC LIMIT 30',`%${q}%`,`%${q}%`);
        const seen=new Set(found.map(m=>m.id));for(const u of local)if(!seen.has(u.id)){found.push(u);seen.add(u.id);}
      }
      return html(view.members(ctx,{found,q,fallback}));
    }
    if(pathname==='/team'&&req.method==='GET'){
      if(url.searchParams.get('tab')==='mega'){
        const season=url.searchParams.get('season');
        return redirect(res,'/mega-team'+(season?'?season='+encodeURIComponent(season):''));
      }
      const roles=await discord.getRoles();let list=[],partial=false;
      if(teamCache && now()-teamCache.at<90000){list=teamCache.list;partial=teamCache.partial;}
      else{
        let after='';try{
          for(let i=0;i<5;i++){
            const members=await discord.listMembers(after,1000);
            if(!Array.isArray(members))break;
            list.push(...members);if(members.length<1000)break;
            after=members.at(-1)?.user?.id||'';
            if(i===4)partial=true;
          }
        }catch{partial=true;
          const known=all('SELECT id FROM users ORDER BY updated_at DESC LIMIT 50');
          for(const u of known){try{const m=await discord.getGuildMember(u.id);if(m)list.push(m);}catch{break;}}
        }
        teamCache={at:now(),list,partial};
      }
      // Only exact internal staff categories enter Our Staff; Mega/Prison staff
      // and SBs x Scam members keep their own independent directories.
      const knownRoleKind=externalStaffKind;
      const byId=new Map(roles.map(r=>[r.id,r]));
      const categorized=new Map(),knownMembers=new Map([['mega',[]],['prison',[]]]);
      const sbsLeaders=[],sbsMembers=[];const seen=new Set();
      for(const m of list){
        const id=m.user?.id;if(!id||m.user.bot||seen.has(id))continue;
        seen.add(id);const memberRoles=(m.roles||[]).map(x=>byId.get(x)).filter(Boolean);
        const external=memberRoles.filter(r=>knownRoleKind(r.name));
        const sbs=sbsTeamMembership(m.roles);
        const storeRoles=memberRoles.map(role=>({...role,group:storeTeamGroup(role,config)}))
          .filter(role=>role.group&&role.id!==SBS_TEAM_LEADER_ROLE_ID&&role.id!==SBS_TEAM_MEMBER_ROLE_ID);
        if(!storeRoles.length&&!external.length&&!sbs.leader&&!sbs.member&&id!==ctx.guild.owner_id)continue;
        storeRoles.sort((a,b)=>b.position-a.position);
        upsertUser(m);ensureProfile(id);
        const profile=one('SELECT nickname,avatar_path,public FROM profiles WHERE user_id=?',id)||{};
        const info={...m.user,display_name:m.nick||m.user.global_name||m.user.username,nickname:profile.public?profile.nickname:'',avatar_path:profile.public?profile.avatar_path:'',sbsMember:sbs.member};
        // Show dual-role leaders once, within the leaders group, not twice in Team Members.
        if(sbs.leader)sbsLeaders.push({...info,staffTitle:'SBs Team Leader'});
        else if(sbs.member)sbsMembers.push({...info,staffTitle:'SBs Team Member'});
        // Members holding both communities' roles appear in each relevant Known Members tab.
        // An actual SB Store staff member also retains their primary internal team listing.
        for(const externalRole of external){
          const kind=knownRoleKind(externalRole.name);
          if(kind&&!knownMembers.get(kind).some(existing=>existing.id===id))
            knownMembers.get(kind).push({...info,staffTitle:externalRole.name});
        }
        if(storeRoles.length||id===ctx.guild.owner_id){
          // One section per member, ordered by internal hierarchy, even with multiple roles.
          const rank=id===ctx.guild.owner_id?'Ownership':
            STORE_TEAM_GROUP_ORDER.find(group=>storeRoles.some(role=>role.group===group));
          const matched=storeRoles.find(role=>role.group===rank);
          if(!categorized.has(rank))categorized.set(rank,[]);
          categorized.get(rank).push({...info,staffTitle:id===ctx.guild.owner_id?'Server Owner':matched?.name||rank});
        }
      }
      // Ensure the real guild owner appears even if outside a paginated member listing.
      if(!seen.has(ctx.guild.owner_id)){
        try{const owner=await discord.getGuildMember(ctx.guild.owner_id);if(owner?.user){upsertUser(owner);ensureProfile(owner.user.id);if(!categorized.has('Ownership'))categorized.set('Ownership',[]);categorized.get('Ownership').unshift({...owner.user,display_name:owner.nick||owner.user.global_name||owner.user.username,staffTitle:'Server Owner'});}}catch{partial=true;}
      }
      const groups=STORE_TEAM_GROUP_ORDER.map(title=>({title,members:(categorized.get(title)||[]).sort((a,b)=>String(a.display_name).localeCompare(String(b.display_name)))}))
        .filter(group=>group.members.length||['Staff','Mod','Temp Mod'].includes(group.title));
      const knownGroups=[
        {key:'mega',title:'Mega SMP Staff',members:knownMembers.get('mega')},
        {key:'prison',title:'Prison Staff',members:knownMembers.get('prison')}
      ].map(g=>({...g,members:g.members.sort((a,b)=>String(a.display_name).localeCompare(String(b.display_name)))}));
      const sortByName=(a,b)=>String(a.nickname||a.display_name).localeCompare(String(b.nickname||b.display_name));
      const sbsGroups=[{title:'SBs Team Leaders',members:sbsLeaders.sort(sortByName)},{title:'SBs Team Members',members:sbsMembers.sort(sortByName)}].filter(g=>g.members.length);
      const selected=['team','sbs','known'].includes(url.searchParams.get('tab'))?url.searchParams.get('tab'):'team';
      const knownTab=url.searchParams.get('known')==='prison'?'prison':'mega';
      return html(view.team(ctx,{groups,knownGroups,sbsGroups,tab:selected,knownTab,partial,rolesCount:roles.length}));
    }
    let userMatch=/^\/u\/(\d{15,22})$/.exec(pathname);
    if(userMatch && req.method==='GET'){
      const id=userMatch[1];let person=one('SELECT * FROM users WHERE id=?',id);
      if(!person){const actual=await discord.getGuildMember(id);if(!actual?.user)missing();upsertUser(actual);ensureProfile(id);person=one('SELECT * FROM users WHERE id=?',id);}
      const profile=userProfile(id),self=id===ctx.user.id,privateProfile=!!profile&&!profile.public&&!self;
      const counts=privateProfile?{}:{
        posts:one('SELECT count(*) c FROM posts WHERE user_id=? AND deleted_at IS NULL',id).c,
        followers:one('SELECT count(*) c FROM follows WHERE followed_id=?',id).c,
        following:one('SELECT count(*) c FROM follows WHERE follower_id=?',id).c,
        suggestions:one('SELECT count(*) c FROM suggestions WHERE user_id=? AND deleted_at IS NULL',id).c
      };
      const requestedTab=url.searchParams.get('tab')||'posts';
      const tab=allowedProfileTabs.has(requestedTab)?requestedTab:'posts';
      if(tab==='likes'&&!self)missing();
      const related=privateProfile?[]:tab==='media'?listPosts(ctx.user.id,{userId:id,media:true,limit:20}):
        tab==='likes'?listPosts(ctx.user.id,{likesFor:id,limit:20}):
        tab==='posts'?loadPosts(ctx.user.id,0,id,15):[];
      const activityReplies=privateProfile||tab!=='replies'?[]:repliesFor(id);
      const pinnedPost=!privateProfile&&profile?.pinned_post_id?postDetails(profile.pinned_post_id,ctx.user.id):null;
      const sections=privateProfile?[]:profileSections(id);
      const comments=privateProfile||!profile?.allow_comments?[]:listComments('profile',id);
      // Never request or render Discord roles for somebody else's private profile.
      const discordRoles=privateProfile?{state:'hidden',roles:[]}:
        await getProfileRoles(id,self?ctx.member:null);
      const sbsMember=discordRoles.state==='loaded'&&sbsTeamMembership(discordRoles.roles.map(role=>role.id)).member;
      return html(view.profile(ctx,{person,profile,posts:related,pinnedPost,sections,comments,counts,self,following:!!one('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?',ctx.user.id,id),privateProfile,discordRoles,sbsMember,tab,activityReplies}));
    }
    userMatch=/^\/u\/(\d{15,22})\/(followers|following)$/.exec(pathname);
    if(userMatch&&req.method==='GET'){
      const id=userMatch[1],which=userMatch[2],person=one('SELECT * FROM users WHERE id=?',id);
      if(!person)missing();
      const profile=userProfile(id)||{};
      const self=id===ctx.user.id;
      if(!self&&(!profile.public||!profile.show_follows))missing();
      return html(socialView.connections(ctx,{person,profile,which,items:connectionsFor(id,which,ctx.user.id),self}));
    }
    userMatch=/^\/u\/(\d{15,22})\/(follow|comment)$/.exec(pathname);
    if(userMatch&&req.method==='POST'){
      const id=userMatch[1],action=userMatch[2];rate(ctx,'profile.'+action,20,600000);
      const {fields}=await form();const person=one('SELECT * FROM users WHERE id=?',id);
      if(!person)missing();if(id===ctx.user.id&&action==='follow')invalid('Cannot follow yourself');
      const profile=userProfile(id);if(!profile?.public&&id!==ctx.user.id)forbidden('This profile is private');
      if(action==='follow'){
        const already=one('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?',ctx.user.id,id);
        if(already)run('DELETE FROM follows WHERE follower_id=? AND followed_id=?',ctx.user.id,id);
        else {run('INSERT INTO follows(follower_id,followed_id,created_at) VALUES(?,?,?)',ctx.user.id,id,now());notifySocial(id,ctx.user.id,'follow',id);}
        if(isStaffRole(ctx.role))logAction(ctx,'profile.follow','profile:'+id,{before:!!already,after:!already});
        return redirect(res,`/u/${id}`);
      }
      if(!profile?.allow_comments)forbidden('Profile comments are disabled.');
      const body=formValue(fields,'body',1000,1);
      run('INSERT INTO comments(kind,target_id,user_id,body,created_at) VALUES(?,?,?,?,?)','profile',id,ctx.user.id,body,now());
      notifySocial(id,ctx.user.id,'profile_comment',id);
      if(isStaffRole(ctx.role))logAction(ctx,'profile.comment','profile:'+id,{body:body.slice(0,100)});
      return redirect(res,`/u/${id}`);
    }
    if(pathname==='/profile/edit'&&req.method==='GET'){
      ensureProfile(ctx.user.id);
      return html(view.profileEdit(ctx,{profile:userProfile(ctx.user.id),sections:profileSections(ctx.user.id),posts:loadPosts(ctx.user.id,0,ctx.user.id,100).filter(p=>!p.repost_of)}));
    }
    if(pathname==='/profile/edit'&&req.method==='POST'){
      rate(ctx,'profile.edit',30,3600000);const {fields}=await form();
      const existing=userProfile(ctx.user.id)||{};
      const profile=normalizeProfile(fields,existing);
      run(`UPDATE profiles SET nickname=?,bio=?,pronouns=?,status_text=?,accent=?,theme=?,font=?,layout=?,animations=?,public=?,allow_comments=?,show_follows=?,social_1=?,social_2=?,social_3=?,updated_at=? WHERE user_id=?`,
        profile.nickname,profile.bio,profile.pronouns,profile.status_text,profile.accent,profile.theme,profile.font,profile.layout,profile.animations,profile.public,profile.allow_comments,profile.show_follows,profile.social_1,profile.social_2,profile.social_3,now(),ctx.user.id);
      if(isStaffRole(ctx.role))logAction(ctx,'profile.edit','profile:'+ctx.user.id,{sections:['identity','appearance','privacy']});
      return success('/profile/edit','Profile saved.');
    }
    let pm=/^\/profile\/upload\/(avatar|banner|background)$/.exec(pathname);
    if(pm&&req.method==='POST'){
      rate(ctx,'profile.upload',8,3600000);const {files}=await form();if(!files.image)invalid('Choose an image.');
      const path=saveImage(files.image),column={avatar:'avatar_path',banner:'banner_path',background:'background_path'}[pm[1]];
      run(`UPDATE profiles SET ${column}=?,updated_at=? WHERE user_id=?`,path,now(),ctx.user.id);
      if(isStaffRole(ctx.role))logAction(ctx,'profile.image.upload','profile:'+ctx.user.id,{slot:pm[1]});
      return success('/profile/edit','Profile image updated.');
    }
    if(pathname==='/profile/section'&&req.method==='POST'){
      rate(ctx,'profile.section',20,3600000);const {fields}=await form(),title=formValue(fields,'title',65,1),body=formValue(fields,'content',1200,1);
      if(one('SELECT COUNT(*) c FROM profile_sections WHERE user_id=?',ctx.user.id).c>=12)invalid('Maximum 12 profile sections.');
      const order=one('SELECT COALESCE(MAX(sort_order),-1)+1 next FROM profile_sections WHERE user_id=?',ctx.user.id).next;
      const result=run('INSERT INTO profile_sections(user_id,title,content,sort_order,visible) VALUES(?,?,?,?,1)',ctx.user.id,title,body,order);
      if(isStaffRole(ctx.role))logAction(ctx,'profile.section.create','profile:'+ctx.user.id,{sectionId:result.lastInsertRowid,title});
      return success('/profile/edit','Custom section created.');
    }
    pm=/^\/profile\/section\/(\d+)\/(delete|move|edit)$/.exec(pathname);
    if(pm&&req.method==='POST'){
      rate(ctx,'profile.section',30,3600000);const {fields}=await form(),id=idFrom(pm[1]),action=pm[2];
      const section=one('SELECT * FROM profile_sections WHERE id=? AND user_id=?',id,ctx.user.id);if(!section)missing();
      if(action==='delete')run('DELETE FROM profile_sections WHERE id=?',id);
      if(action==='edit'){
        const title=formValue(fields,'title',65,1),content=formValue(fields,'content',1200,1);
        run('UPDATE profile_sections SET title=?,content=?,visible=? WHERE id=?',title,content,fields.visible==='on'?1:0,id);
      }
      if(action==='move'){
        const dir=fields.direction;if(!['up','down'].includes(dir))invalid();
        const neighbor=one(`SELECT * FROM profile_sections WHERE user_id=? AND (sort_order ${dir==='up'?'<':'>'} ?) ORDER BY sort_order ${dir==='up'?'DESC':'ASC'} LIMIT 1`,ctx.user.id,section.sort_order);
        if(neighbor)transaction(()=>{run('UPDATE profile_sections SET sort_order=? WHERE id=?',neighbor.sort_order,section.id);run('UPDATE profile_sections SET sort_order=? WHERE id=?',section.sort_order,neighbor.id);});
      }
      if(isStaffRole(ctx.role))logAction(ctx,'profile.section.'+action,'profile:'+ctx.user.id,{sectionId:id});
      return success('/profile/edit','Section updated.');
    }
    if(pathname==='/profile/pin'&&req.method==='POST'){
      const {fields}=await form(),id=fields.post_id?idFrom(fields.post_id):null;
      if(id&&!one('SELECT 1 FROM posts WHERE id=? AND user_id=? AND deleted_at IS NULL',id,ctx.user.id))invalid('Choose one of your own posts.');
      run('UPDATE profiles SET pinned_post_id=?,updated_at=? WHERE user_id=?',id,now(),ctx.user.id);
      if(isStaffRole(ctx.role))logAction(ctx,'profile.post.pin','profile:'+ctx.user.id,{postId:id});
      return success('/profile/edit','Pinned post updated.');
    }
    let contentMatch=/^\/content\/(post|suggestion|comment)\/(\d+)\/delete$/.exec(pathname);
    if(contentMatch&&req.method==='POST'){
      rate(ctx,'content.delete',30,3600000);await form();
      const kind=contentMatch[1],id=idFrom(contentMatch[2]);
      const table={post:'posts',suggestion:'suggestions',comment:'comments'}[kind];
      const item=one(`SELECT * FROM ${table} WHERE id=?`,id);if(!item)missing();
      if(item.user_id!==ctx.user.id&&!isAdminRole(ctx.role))forbidden();
      transaction(()=>{
        run(`UPDATE ${table} SET deleted_at=? WHERE id=? AND deleted_at IS NULL`,now(),id);
        if(isStaffRole(ctx.role))appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'content.delete',target:kind+':'+id,details:{userId:item.user_id,staffModeration:item.user_id!==ctx.user.id},ip:ctx.ip});
      });
      return success(kind==='suggestion'?'/suggestions':'/feed','Content removed.');
    }
    if(pathname==='/report'&&req.method==='GET'){
      const kind=url.searchParams.get('kind'),id=url.searchParams.get('id');
      if(!['post','suggestion','comment','profile'].includes(kind)||!/^\d{1,22}$/.test(id||''))invalid('Invalid report target');
      return html(view.report(ctx,{kind,id}));
    }
    if(pathname==='/report'&&req.method==='POST'){
      rate(ctx,'content.report',8,3600000);const {fields}=await form();
      const kind=fields.kind,id=String(fields.id||''),reason=formValue(fields,'reason',500,10);
      if(!['post','suggestion','comment','profile'].includes(kind)||!/^\d{1,22}$/.test(id))invalid('Invalid report');
      const table={post:'posts',suggestion:'suggestions',comment:'comments',profile:'profiles'}[kind];
      if(!one(`SELECT 1 FROM ${table} WHERE ${kind==='profile'?'user_id':'id'}=?`,id))missing();
      run('INSERT INTO reports(reporter_id,kind,target_id,reason,created_at) VALUES(?,?,?,?,?)',ctx.user.id,kind,id,reason,now());
      if(isStaffRole(ctx.role))logAction(ctx,'moderation.report',''+kind+':'+id,{reason});
      return success('/feed','Your report was submitted to the admins.');
    }
    if(pathname==='/admin/roles'&&req.method==='GET'){
      await authorize('admin');
      const [roles,botUser]=await Promise.all([discord.getRoles(),discord.getBotIdentity()]);
      const botMember=await discord.getGuildMember(botUser.id);
      if(!botMember)throw new HttpError(503,'The bot is not a member of your Discord server.');
      const manageable=manageableRoles(roles,botMember,config);
      const find=text(url.searchParams.get('member'),80);let selected=null,lookupError='',candidates=[];
      if(find){
        try{
          let found=null;
          if(idOK(find))found=await discord.getGuildMember(find);
          else{
            const matches=await discord.searchMembers(find,30);
            found=(matches||[]).find(m=>m.user?.username?.toLowerCase()===find.toLowerCase()||m.nick?.toLowerCase()===find.toLowerCase());
            if(!found&&matches?.length===1)found=matches[0];
            if(!found&&matches?.length>1){lookupError='Multiple members matched. Choose the correct Discord account below.';candidates=matches.filter(x=>x.user).slice(0,25).map(x=>({id:x.user.id,username:x.user.username,display_name:x.nick||x.user.global_name||x.user.username,avatar:x.user.avatar}));}
          }
          if(found?.user){upsertUser(found);selected={...found.user,display_name:found.nick||found.user.global_name||found.user.username,roles:found.roles||[]};}
          else if(!lookupError)lookupError='No matching server member found.';
        }catch(e){lookupError='Discord member search unavailable. Search by numeric Discord user ID or enable Guild Members Intent.';}
      }
      logAction(ctx,'roles.dashboard.view','roles',{selected:selected?.id||null});
      return html(view.roles(ctx,{roles:roles.sort((a,b)=>b.position-a.position),manageable,selected,find,candidates,errorText:lookupError,botPosition:highestPosition(botMember,roles)}));
    }
    if(pathname==='/admin/roles/change'&&req.method==='POST'){
      await authorize('admin');rate(ctx,'role.change',30,3600000);
      const {fields}=await form(),id=String(fields.user_id||''),roleId=String(fields.role_id||''),action=fields.action;
      if(!idOK(id)||!idOK(roleId)||!['add','remove'].includes(action))invalid('Invalid role change request');
      logAction(ctx,'role.change.attempt',id,{roleId,action},'attempt');
      const [roles,botIdentity,target]=await Promise.all([discord.getRoles(),discord.getBotIdentity(),discord.getGuildMember(id)]);
      if(!target)missing();
      const botMember=await discord.getGuildMember(botIdentity.id);
      if(!botMember)throw new HttpError(503,'Bot membership is not available.');
      const allowed=new Set(manageableRoles(roles,botMember,config).map(r=>r.id));
      if(!allowed.has(roleId)){
        logAction(ctx,'role.change.blocked',id,{roleId,action,why:'protected or bot hierarchy'},'denied');
        forbidden('This role is protected, has management permissions, or is above the bot.');
      }
      const coowners=new Set(all('SELECT user_id FROM owner_allowlist').map(x=>x.user_id));
      if(!targetEligible(target,roles,botMember,ctx.guild.owner_id,id,config,coowners)){
        logAction(ctx,'role.change.blocked',id,{roleId,action,why:'protected target'},'denied');
        forbidden('This user is protected or higher than the bot.');
      }
      const before=target.roles.includes(roleId);
      try{
        if(action==='add'&&!before)await discord.addRole(id,roleId,`SB Store website: ${ctx.user.id} assigns role`);
        if(action==='remove'&&before)await discord.removeRole(id,roleId,`SB Store website: ${ctx.user.id} removes role`);
      }catch(e){logAction(ctx,'role.change.failed',id,{roleId,action,error:String(e.message).slice(0,250)},'error');throw new HttpError(502,'Discord could not change this role: '+String(e.message).slice(0,160));}
      logAction(ctx,'role.change.success',id,{roleId,action,before,after:action==='add'});
      await discord.notify({title:'Staff Role Changed',description:`${ctx.user.id} ${action==='add'?'assigned':'removed'} Discord role ${roleId} ${action==='add'?'to':'from'} ${id}.`});
      teamCache=null;
      return success('/admin/roles?member='+encodeURIComponent(id),`Role ${action==='add'?'assignment':'removal'} confirmed.`);
    }
    if(pathname==='/admin/settings'&&req.method==='GET'){
      await authorize('admin');const [roles,botIdentity]=await Promise.all([discord.getRoles(),discord.getBotIdentity()]);
      const botMember=await discord.getGuildMember(botIdentity.id);
      if(!botMember)throw new HttpError(503,'Bot not found in Discord server.');
      const manageable=manageableRoles(roles,botMember,config);
      const roleMap=Object.fromEntries(config.applicationRoles.map(x=>[x,getSetting('map:'+x,'')]));
      logAction(ctx,'settings.view','application.settings');
      return html(view.settings(ctx,{open:getSetting('applications_open','true')==='true',roles,manageable,roleMap}));
    }
    if(pathname==='/admin/settings/webhook/test'&&req.method==='POST'){
      await authorize('owner');rate(ctx,'webhook.test',5,600000);
      const {fields}=await form();
      const target=String(fields.target||'default');
      if(!['default','adminReport','ownerReport'].includes(target))invalid('Unknown webhook destination.');
      const configured=target==='adminReport'?!!config.adminReportWebhook:target==='ownerReport'?!!config.ownerReportWebhook:!!config.webhook;
      if(!configured)return warn('/admin/settings','That webhook is not configured in Railway Variables.');
      const delivered=await discord.notify({title:'SB Store Webhook Test',
        description:'Manual test of the '+(target==='default'?'staff':target==='adminReport'?'admin report':'owner report')+' channel. No @here ping was sent.',
        fields:[{name:'Triggered by Discord user ID',value:ctx.user.id},{name:'Website',value:config.baseUrl}],
        target,pingHere:false});
      logAction(ctx,'settings.webhook.test','discord.webhook',{target,delivered});
      return delivered?success('/admin/settings','Webhook test delivered successfully.'):warn('/admin/settings','Webhook test failed. Check the webhook URL and Railway logs.');
    }
    if(pathname==='/admin/settings/open'&&req.method==='POST'){
      await authorize('admin');rate(ctx,'settings',20,3600000);const {fields}=await form();
      if(!['true','false'].includes(fields.open))invalid();
      const before=getSetting('applications_open','true');
      transaction(()=>{setSetting('applications_open',fields.open);appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'settings.applications_open',target:'settings',details:{before,after:fields.open},ip:ctx.ip});});
      return success('/admin/settings','Application submissions updated.');
    }
    if(pathname==='/admin/settings/mapping'&&req.method==='POST'){
      await authorize('admin');rate(ctx,'settings',20,3600000);const {fields}=await form();
      const [roles,botIdentity]=await Promise.all([discord.getRoles(),discord.getBotIdentity()]);
      const botMember=await discord.getGuildMember(botIdentity.id);if(!botMember)throw new HttpError(503,'Bot not found');
      const allowed=new Set(manageableRoles(roles,botMember,config).map(r=>r.id));
      const updates={};for(const position of config.applicationRoles){
        const id=String(fields['map_'+position]||'');if(id&&!allowed.has(id))forbidden('Mapped role is protected or unavailable.');updates[position]=id;
      }
      transaction(()=>{
        const previous=Object.fromEntries(config.applicationRoles.map(p=>[p,getSetting('map:'+p,'')]));
        for(const [position,id] of Object.entries(updates))setSetting('map:'+position,id);
        appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'settings.role_mapping',target:'settings',details:{before:previous,after:updates},ip:ctx.ip});
      });
      return success('/admin/settings','Application role mappings saved.');
    }
    if(pathname==='/admin/moderation'&&req.method==='GET'){
      await authorize('admin');logAction(ctx,'moderation.queue.view','reports');
      const reports=all("SELECT r.*,u.display_name FROM reports r JOIN users u ON u.id=r.reporter_id WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 200");
      return html(view.moderation(ctx,{reports}));
    }
    let modMatch=/^\/admin\/moderation\/(\d+)\/resolve$/.exec(pathname);
    if(modMatch&&req.method==='POST'){
      await authorize('admin');rate(ctx,'moderation.action',40,3600000);
      const {fields}=await form(),id=idFrom(modMatch[1]);
      if(!['dismiss','remove'].includes(fields.action))invalid();
      const report=one("SELECT * FROM reports WHERE id=? AND status='open'",id);if(!report)missing();
      transaction(()=>{
        if(fields.action==='remove'){
          if(['post','suggestion','comment'].includes(report.kind)){
            const tbl={post:'posts',suggestion:'suggestions',comment:'comments'}[report.kind];
            run(`UPDATE ${tbl} SET deleted_at=? WHERE id=? AND deleted_at IS NULL`,now(),Number(report.target_id));
          }else if(report.kind==='profile')run('UPDATE profiles SET public=0,updated_at=? WHERE user_id=?',now(),report.target_id);
        }
        run('UPDATE reports SET status=?,reviewed_by=?,reviewed_at=? WHERE id=?',fields.action==='remove'?'removed':'dismissed',ctx.user.id,now(),id);
        appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'moderation.report.'+fields.action,target:report.kind+':'+report.target_id,details:{reportId:id,reason:report.reason},ip:ctx.ip});
      });
      return success('/admin/moderation','Report processed.');
    }
    if(pathname==='/owner/audit'&&req.method==='GET'){
      await authorize('owner');
      const filter=text(url.searchParams.get('q'),80),like='%'+filter+'%';
      // Name search is read-only; keep the raw IDs and original hash-chained rows.
      const actionList=VISIBLE_AUDIT_ACTIONS.map(()=>'?').join(',');
      const events=filter?all(`SELECT a.* FROM owner_audit_log a
        LEFT JOIN users u ON u.id=a.actor_id
        WHERE a.action IN (${actionList}) AND
          (a.actor_id LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?
          OR a.action LIKE ? OR a.target LIKE ? OR a.details LIKE ? OR a.outcome LIKE ?)
        ORDER BY a.id DESC LIMIT 300`,...VISIBLE_AUDIT_ACTIONS,like,like,like,like,like,like,like):
        all('SELECT * FROM owner_audit_log WHERE action IN ('+actionList+') ORDER BY id DESC LIMIT 300',...VISIBLE_AUDIT_ACTIONS);
      const names=await auditUsernamesFor(events);
      return html(view.audit(ctx,{events:readableAuditRows(events,names),verified:verifyAudit(db),filter}));
    }
    if(pathname==='/owner/audit/export'&&req.method==='GET'){
      await authorize('owner');
      const csvValue=value=>{let s=String(value??'');if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
      // Keep original fields and hashes for forensic verification; add readable columns.
      const keys=['id','at','actor_id','actor_role','action','target','outcome','details','ip','previous_hash','entry_hash'];
      const names=new Map(all('SELECT id,username FROM users')
        .filter(user=>user.username&&user.username!=='unknown')
        .map(user=>[user.id,user.username]));
      const includeFullHistory=url.searchParams.get('full')==='1';
      const actionList=VISIBLE_AUDIT_ACTIONS.map(()=>'?').join(',');
      const statement=includeFullHistory?
        db.prepare('SELECT * FROM owner_audit_log ORDER BY id'):
        db.prepare('SELECT * FROM owner_audit_log WHERE action IN ('+actionList+') ORDER BY id');
      res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="sbs-owner-audit.csv"','cache-control':'no-store'});
      res.write([...keys,'actor_username','target_display','details_display'].join(',')+'\r\n');
      for(const row of statement.iterate(...(includeFullHistory?[]:VISIBLE_AUDIT_ACTIONS))){
        const display=readableAuditRows([row],names)[0];
        const fields=[...keys.map(k=>row[k]),display.actorDisplay,display.targetDisplay,display.detailsDisplay];
        res.write(fields.map(csvValue).join(',')+'\r\n');
      }
      res.end();return;
    }
    if(pathname==='/owner/owners'&&req.method==='GET'){
      await authorize('owner');if(ctx.user.id!==ctx.guild.owner_id)forbidden('Only the verified Discord server owner may change co-owner access.');
      return html(view.owners(ctx,{owners:all('SELECT oa.*,u.username,u.display_name FROM owner_allowlist oa LEFT JOIN users u ON u.id=oa.user_id ORDER BY oa.created_at DESC')}));
    }
    if(pathname==='/owner/owners'&&req.method==='POST'){
      await authorize('owner');if(ctx.user.id!==ctx.guild.owner_id)forbidden('Only the verified Discord server owner can grant owner access.');
      rate(ctx,'owner.access',20,3600000);const {fields}=await form(),id=String(fields.user_id||'');if(!idOK(id))invalid('Invalid Discord user ID');
      const m=await discord.getGuildMember(id);if(!m||m.pending)invalid('This account is not a verified member of the server.');
      transaction(()=>{run('INSERT OR IGNORE INTO owner_allowlist(user_id,added_by,created_at) VALUES(?,?,?)',id,ctx.user.id,now());appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'owner.access.granted',target:id,ip:ctx.ip});});
      return success('/owner/owners','Co-owner access granted.');
    }
    if(pathname==='/owner/owners/remove'&&req.method==='POST'){
      await authorize('owner');if(ctx.user.id!==ctx.guild.owner_id)forbidden('Only the verified Discord server owner can revoke access.');
      const {fields}=await form(),id=String(fields.user_id||'');if(!idOK(id))invalid();
      transaction(()=>{run('DELETE FROM owner_allowlist WHERE user_id=?',id);appendAudit(db,{actor:ctx.user.id,role:ctx.role,action:'owner.access.revoked',target:id,ip:ctx.ip});});
      return success('/owner/owners','Co-owner access revoked.');
    }
    missing();
  }
  const website=http.createServer(async(req,res)=>{
    try{await handle(req,res);}catch(e){
      if(res.headersSent){if(!res.writableEnded)res.end();return;}
      if(e instanceof Redirect)return redirect(res,e.path);
      const err=headerError(e);
      if(err.status>=500)console.error('[Website error]',e.message);
      let ctx={pathname:'',user:null,role:'none',csrf:'',config,notice:''};
      try{const c=cookies(req.headers.cookie);if(c.sid){const s=one('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?',sha256(c.sid),now());if(s){ctx.session=s;ctx.user=one('SELECT * FROM users WHERE id=?',s.user_id);ctx.csrf=s.csrf;}}}catch{}
      const message=err.status===500?'An unexpected error occurred.':err.message;
      const out=err.status===403 && message.includes('member')?view.notMember(ctx,message):view.error(ctx,err.status,message);
      respond(res,err.status,out);
    }
  });
  megaSync.start();
  megaBrowser.start();
  website.on('close',()=>{megaSync.stop();megaBrowser.stop();});
  return website;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  validateConfig();const server=createServer();
  server.listen(config.port,()=>console.log(`SB's & Cam's Store Community V1.8.0 running at ${config.baseUrl}`));
}
