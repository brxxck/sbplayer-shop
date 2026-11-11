// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {db,all,one,run,getSetting,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {manageableRoles,protectedRole,consensus,isFinal} from './logic.js';
import {config} from './config.js';
export const application=(id)=>one('SELECT a.*,u.username,u.display_name,u.avatar FROM applications a JOIN users u ON u.id=a.user_id WHERE a.id=?',id);
export const ownApplications=id=>all('SELECT * FROM applications WHERE user_id=? ORDER BY created_at DESC LIMIT 100',id);
export const activeApplication=id=>one("SELECT id FROM applications WHERE user_id=? AND status NOT IN ('accepted','denied') ORDER BY created_at DESC LIMIT 1",id);
export const latestApplication=id=>one('SELECT created_at FROM applications WHERE user_id=? ORDER BY created_at DESC LIMIT 1',id);
export const applicationCounts=()=>Object.fromEntries(all('SELECT status,count(*) count FROM applications GROUP BY status').map(x=>[x.status,x.count]));
export function staffQueue(userId,admin){
  return admin?all('SELECT a.*,u.username,u.display_name,u.avatar FROM applications a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 250'):
  all("SELECT a.*,u.username,u.display_name,u.avatar FROM applications a JOIN users u ON u.id=a.user_id WHERE a.status NOT IN ('accepted','denied') AND NOT EXISTS(SELECT 1 FROM reviewer_votes v WHERE v.application_id=a.id AND v.reviewer_id=?) ORDER BY a.created_at DESC LIMIT 200",userId);
}
export const reviewerVotes=id=>all('SELECT v.*,u.display_name FROM reviewer_votes v JOIN users u ON u.id=v.reviewer_id WHERE v.application_id=? ORDER BY v.created_at',id);
export const adminVotes=id=>all('SELECT v.*,u.display_name FROM admin_decisions v JOIN users u ON u.id=v.admin_id WHERE v.application_id=? ORDER BY v.created_at',id);
export function reviewerVote({appId,userId,choice,note,role,ip}){
  return transaction(()=>{
    const a=application(appId);if(!a || isFinal(a.status))throw new Error('Application unavailable');
    if(one('SELECT 1 FROM reviewer_votes WHERE application_id=? AND reviewer_id=?',appId,userId))throw new Error('You have already voted');
    run('INSERT INTO reviewer_votes (application_id,reviewer_id,choice,note,created_at) VALUES(?,?,?,?,?)',appId,userId,choice,note,Date.now());
    if(a.status==='pending')run("UPDATE applications SET status='reviewing',updated_at=? WHERE id=?",Date.now(),appId);
    appendAudit(db,{actor:userId,role,action:'reviewer.vote',target:'application:'+appId,details:{choice,note},ip});
    return a;
  });
}
export function adminVote({appId,userId,choice,note,role,ip}){
  return transaction(()=>{
    const a=application(appId);if(!a || isFinal(a.status))throw new Error('Application unavailable or finalized');
    const old=all('SELECT admin_id,choice FROM admin_decisions WHERE application_id=?',appId);
    if(old.filter(v=>v.choice==='accept').length>=2 || old.filter(v=>v.choice==='deny').length>=2)
      throw new Error('Application is waiting for final owner approval');
    const result=consensus(old,{admin_id:userId,choice});
    run('INSERT INTO admin_decisions (application_id,admin_id,choice,note,created_at) VALUES(?,?,?,?,?)',appId,userId,choice,note,Date.now());
    // Admin consensus is a recommendation only. Only unk.sb may finalize via ownerReview().
    run("UPDATE applications SET status=CASE WHEN status='pending' THEN 'reviewing' ELSE status END,updated_at=? WHERE id=?",Date.now(),appId);
    if(result.final)appendAudit(db,{actor:userId,role,action:'application.consensus.reached',target:'application:'+appId,
      details:{recommendation:result.final,accepts:result.accepts,denies:result.denies},ip});
    appendAudit(db,{actor:userId,role,action:'admin.decision',target:'application:'+appId,details:{choice,note,...result},ip});
    return {result,app:a};
  });
}
export const userProfile=id=>one('SELECT * FROM profiles WHERE user_id=?',id);
export const profileSections=id=>all('SELECT * FROM profile_sections WHERE user_id=? ORDER BY sort_order,id',id);
export function listPosts(viewerId,{page=0,userId=null,limit=20}={}){
  const where=['p.deleted_at IS NULL'];const args=[];
  if(userId){where.push('p.user_id=?');args.push(userId);}
  const sql=`SELECT p.*,u.username,u.display_name,u.avatar,pr.nickname,pr.avatar_path,
  (SELECT COUNT(*) FROM post_likes l WHERE l.post_id=p.id) AS like_count,
  (SELECT COUNT(*) FROM comments c WHERE c.kind='post' AND c.target_id=CAST(p.id AS TEXT) AND c.deleted_at IS NULL) AS comment_count,
  (SELECT COUNT(*) FROM posts rp WHERE rp.repost_of=p.id AND rp.deleted_at IS NULL) AS repost_count,
  EXISTS(SELECT 1 FROM post_likes WHERE post_id=p.id AND user_id=?) AS liked,
  EXISTS(SELECT 1 FROM posts r WHERE r.repost_of=p.id AND r.user_id=? AND r.deleted_at IS NULL) AS reposted
  FROM posts p JOIN users u ON u.id=p.user_id LEFT JOIN profiles pr ON pr.user_id=u.id
  WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  return all(sql,viewerId,viewerId,...args,limit,Math.min(1000,Math.max(0,page))*limit);
}
export function postDetails(id,viewerId){return one(`SELECT p.*,u.username,u.display_name,u.avatar,pr.nickname,pr.avatar_path,
  (SELECT COUNT(*) FROM post_likes WHERE post_id=p.id) AS like_count,
  (SELECT COUNT(*) FROM comments WHERE kind='post' AND target_id=CAST(p.id AS TEXT) AND deleted_at IS NULL) AS comment_count,
  (SELECT COUNT(*) FROM posts WHERE repost_of=p.id AND deleted_at IS NULL) AS repost_count,
  EXISTS(SELECT 1 FROM post_likes WHERE post_id=p.id AND user_id=?) AS liked,
  EXISTS(SELECT 1 FROM posts WHERE repost_of=p.id AND user_id=? AND deleted_at IS NULL) AS reposted
  FROM posts p JOIN users u ON u.id=p.user_id LEFT JOIN profiles pr ON pr.user_id=p.user_id
  WHERE p.id=? AND p.deleted_at IS NULL`,viewerId,viewerId,id);
}
export const listComments=(kind,targetId)=>all(`SELECT c.*,u.username,u.display_name,u.avatar,p.nickname FROM comments c JOIN users u ON c.user_id=u.id LEFT JOIN profiles p ON p.user_id=u.id WHERE c.kind=? AND c.target_id=? AND c.deleted_at IS NULL ORDER BY c.created_at ASC LIMIT 300`,kind,String(targetId));
export function listSuggestions(page=0){return all(`SELECT s.*,u.username,u.display_name,u.avatar,
  (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id=s.id AND v.choice='yes') yes_count,
  (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id=s.id AND v.choice='no') no_count
  FROM suggestions s JOIN users u ON u.id=s.user_id WHERE s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 20 OFFSET ?`,Math.min(1000,Math.max(0,page))*20);}
export function suggestionDetails(id){return one(`SELECT s.*,u.username,u.display_name,u.avatar,
  (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id=s.id AND v.choice='yes') yes_count,
  (SELECT COUNT(*) FROM suggestion_votes v WHERE v.suggestion_id=s.id AND v.choice='no') no_count
  FROM suggestions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.deleted_at IS NULL`,id);}
export function suggestionVoters(id){return all('SELECT v.user_id,v.choice,u.display_name FROM suggestion_votes v JOIN users u ON u.id=v.user_id WHERE v.suggestion_id=? ORDER BY v.created_at',id);}
export function roleMapping(position,roles,manageable){
  const configured=getSetting('map:'+position,'');
  const ok=new Set(manageable.map(r=>r.id));
  if(configured){const r=roles.find(r=>r.id===configured);return r&&ok.has(r.id)?r:null;}
  return manageable.find(r=>r.name.toLowerCase()===position.toLowerCase())||null;
}
export async function deliverAcceptedRole({appId,actorId,role,ip,discord}){
  const a=application(appId);if(!a||a.status!=='accepted')throw new Error('Application is not accepted');
  if(a.role_sync_status==='assigned')return {ok:true,already:true};
  try{
    const [roles,botIdentity,guild,target]=await Promise.all([discord.getRoles(),discord.getBotIdentity(),discord.getGuild(),discord.getGuildMember(a.user_id)]);
    if(!target)throw new Error('Applicant is no longer in the Discord server');
    const botMember=await discord.getGuildMember(botIdentity.id);
    if(!botMember)throw new Error('Bot is not a verified server member');
    const manageable=manageableRoles(roles,botMember,config);
    const targetRole=roleMapping(a.position,roles,manageable);
    if(!targetRole)throw new Error('No safe assignable Discord role is mapped to the position '+a.position);
    if(!target.roles.includes(targetRole.id))await discord.addRole(a.user_id,targetRole.id,`SB Store accepted application #${appId}`);
    transaction(()=>{
      run("UPDATE applications SET role_sync_status='assigned',role_sync_error='',role_sync_role=?,updated_at=? WHERE id=?",targetRole.id,Date.now(),appId);
      appendAudit(db,{actor:actorId,role,action:'application.role.assigned',target:a.user_id,details:{appId,roleId:targetRole.id,roleName:targetRole.name},ip});
    });
    return {ok:true,roleId:targetRole.id};
  }catch(error){
    transaction(()=>{
      run("UPDATE applications SET role_sync_status='failed',role_sync_error=?,updated_at=? WHERE id=?",String(error.message).slice(0,350),Date.now(),appId);
      appendAudit(db,{actor:actorId,role,action:'application.role.failed',target:a.user_id,details:{appId,error:String(error.message).slice(0,350)},outcome:'error',ip});
    });
    return {ok:false,error:error.message};
  }
}
