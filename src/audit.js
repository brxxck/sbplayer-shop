// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function appendAudit(db,{actor='',role='',action,target='',outcome='ok',details={},ip=''}) {
  const at=Date.now();
  const last=db.prepare('SELECT entry_hash FROM owner_audit_log ORDER BY id DESC LIMIT 1').get();
  const previous=last?.entry_hash||'GENESIS';
  const packed=JSON.stringify({at,actor,role,action,target,outcome,details,ip,previous});
  const digest=hash(packed);
  return db.prepare('INSERT INTO owner_audit_log (at,actor_id,actor_role,action,target,outcome,details,ip,previous_hash,entry_hash) VALUES (?,?,?,?,?,?,?,?,?,?)').run(at,actor,role,action,target,outcome,JSON.stringify(details),ip,previous,digest);
}
export function verifyAudit(db) {
  let previous='GENESIS';let count=0;
  for (const x of db.prepare('SELECT * FROM owner_audit_log ORDER BY id').iterate()) {
    const packed=JSON.stringify({at:x.at,actor:x.actor_id,role:x.actor_role,action:x.action,target:x.target,outcome:x.outcome,details:JSON.parse(x.details),ip:x.ip,previous});
    if(x.previous_hash!==previous || x.entry_hash!==hash(packed))return {ok:false,count,failedAt:x.id};
    previous=x.entry_hash;count++;
  }
  return {ok:true,count,head:previous};
}
export const auditRow={appendAudit,verifyAudit};
