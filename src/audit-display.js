// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Read-only presentation of immutable, hash-chained audit records.
const discordIdPattern=/(?<![0-9])[0-9]{15,22}(?![0-9])/g;
const decimalDiscordId=/^[0-9]{15,22}$/;

// Log only meaningful data changes or access to a specific private ticket.
// The audit ledger is tamper-evident: never rewrite rows to replace IDs.
const changingActions=new Set([
  // Direct writes and meaningful review decisions, including legacy event names.
  'application.submitted','application.note.update','application.interview','application.reply',
  'admin.decision','application.consensus.reached','reviewer.vote',
  'application.owner_review','application.role.assigned','application.role.failed',
  'support_ticket.create','support_ticket.reply','support_ticket.status','staff_chat.message',
  'owner.access.granted','owner.access.revoked',
  'settings.applications_open','settings.role_mapping','settings.webhook.test',
  'content.delete','moderation.report','moderation.report.dismiss','moderation.report.remove',
  'role.change.success',
  'social.post.create','social.post.like','social.post.repost','social.comment.create',
  'suggestion.create','suggestion.vote','suggestion.comment','suggestion.status',
  'profile.follow','profile.comment','profile.edit','profile.image.upload','profile.post.pin',
  'profile.section.create','profile.section.edit','profile.section.move','profile.section.delete',
   'mega.team.member.upsert','mega.team.member.status','mega.team.transaction.record',
   'mega.team.bank.snapshot','mega.team.snapshot.import','mega.team.season.create',
   'mega.team.discord.link','mega.team.discord.unlink',
  // Ticket reads only. Legacy application.view events were successful ticket reads.
  'application.view','application.access','application.attachment.access',
  'support_ticket.access','support_ticket.attachment.access',
   'promotion.create','promotion.reply','promotion.admin.vote','promotion.decision',
   'promotion.access','promotion.role.assigned','promotion.role.failed'
]);
export const VISIBLE_AUDIT_ACTIONS=Object.freeze([...changingActions]);
export function shouldAuditAction(action){return changingActions.has(action);}
export function collectAuditDiscordIds(rows){
  const ids=new Set();
  for(const row of rows){
    for(const value of [row.actor_id,row.target,row.details]){
      const input=String(value??'');
      for(const match of input.matchAll(discordIdPattern))ids.add(match[0]);
    }
  }
  return [...ids];
}
export function auditDisplayText(input,labels=new Map()){
  return String(input??'').replace(discordIdPattern,id=>{
    const username=labels.get(id);
    return username?'@'+username:id;
  });
}
export function readableAuditRows(rows,labels=new Map()){
  return rows.map(row=>({
    ...row,
    actorDisplay:labels.get(String(row.actor_id))?'@'+labels.get(String(row.actor_id)):
      row.actor_id==='anonymous'?'Anonymous':String(row.actor_id??'Unknown'),
    targetDisplay:auditDisplayText(row.target,labels),
    detailsDisplay:auditDisplayText(row.details,labels),
    actorKnown:decimalDiscordId.test(String(row.actor_id))&&labels.has(String(row.actor_id))
  }));
}
