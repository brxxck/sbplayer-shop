// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {db,all,one,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {isFinal} from './logic.js';
import {config} from './config.js';

// Keep conversations and owner decisions in additive tables. Existing application records are never rebuilt.
export const ticketMessages=appId=>all(`SELECT * FROM (
  SELECT t.*,u.username,u.display_name,u.avatar FROM ticket_messages t
  JOIN users u ON u.id=t.author_id WHERE t.application_id=? ORDER BY t.id DESC LIMIT 250
) ORDER BY id ASC`,appId);

export function writeTicketReply({appId,userId,role,body,ip}) {
  return transaction(()=>{
    const a=one('SELECT id FROM applications WHERE id=?',appId);
    if(!a)throw new Error('Application not found');
    const stamp=Date.now();
    const result=run('INSERT INTO ticket_messages(application_id,author_id,author_role,body,created_at) VALUES(?,?,?,?,?)',appId,userId,role,body,stamp);
    appendAudit(db,{actor:userId,role,action:'application.reply',target:'application:'+appId,details:{messageId:Number(result.lastInsertRowid),length:body.length},ip});
    return {id:Number(result.lastInsertRowid),at:stamp};
  });
}

export function reserveStaffPing(appId,cooldownMs=300000) {
  return transaction(()=>{
    const stamp=Date.now();
    const result=run('UPDATE applications SET last_staff_ping_at=? WHERE id=? AND last_staff_ping_at<=?',stamp,appId,stamp-cooldownMs);
    return result.changes===1;
  });
}

export function ownerRecommendation(appId) {
  const rows=all('SELECT admin_id,choice FROM admin_decisions WHERE application_id=?',appId).filter(v=>v.admin_id!==config.finalApproverId);
  const accepts=rows.filter(x=>x.choice==='accept').length;
  const denies=rows.filter(x=>x.choice==='deny').length;
  return accepts>=2?'accepted':denies>=2?'denied':null;
}

export function awaitingOwnerQueue() {
  return all(`SELECT a.*,u.display_name,u.username,u.avatar,
  (SELECT COUNT(*) FROM admin_decisions d WHERE d.application_id=a.id AND d.choice='accept') accepts,
  (SELECT COUNT(*) FROM admin_decisions d WHERE d.application_id=a.id AND d.choice='deny') denies
  FROM applications a JOIN users u ON u.id=a.user_id
  WHERE a.status NOT IN ('accepted','denied') AND
  ((SELECT COUNT(*) FROM admin_decisions d WHERE d.application_id=a.id AND d.choice='accept')>=2 OR
   (SELECT COUNT(*) FROM admin_decisions d WHERE d.application_id=a.id AND d.choice='deny')>=2)
  ORDER BY a.updated_at DESC LIMIT 200`);
}

export function ownerReview({appId,ownerId,action,note,ip}) {
  if(!['approve','deny','return'].includes(action))throw new Error('Invalid owner action');
  return transaction(()=>{
    const a=one('SELECT * FROM applications WHERE id=?',appId);
    if(!a || isFinal(a.status))throw new Error('Application is already finalized or unavailable');
    const recommendation=ownerRecommendation(appId);
    if(!recommendation)throw new Error('Two matching admin votes are required before owner review');
    const stamp=Date.now();
    const outcome=action==='return'?'reviewing':action==='deny'?'denied':recommendation;
    if(action==='return'){
      // Votes remain in the tamper-evident audit ledger; clear only active-round votes.
      run('DELETE FROM admin_decisions WHERE application_id=?',appId);
      run("UPDATE applications SET status='reviewing',updated_at=? WHERE id=?",stamp,appId);
    } else {
      run("UPDATE applications SET status=?,updated_at=?,finalized_at=?,finalized_by=?,role_sync_status=?,role_sync_error='' WHERE id=?",
        outcome,stamp,stamp,ownerId,outcome==='accepted'?'pending':'none',appId);
    }
    run('INSERT INTO owner_review_actions(application_id,owner_id,recommendation,action,outcome,note,created_at) VALUES(?,?,?,?,?,?,?)',
      appId,ownerId,recommendation,action,outcome,note,stamp);
    appendAudit(db,{actor:ownerId,role:'owner',action:'application.owner_review',target:'application:'+appId,
      details:{recommendation,action,outcome,note,position:a.position},ip});
    return {outcome,recommendation,action};
  });
}
