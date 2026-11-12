// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Read-only presentation of immutable, hash-chained audit records.
const discordIdPattern=/(?<![0-9])[0-9]{15,22}(?![0-9])/g;
const decimalDiscordId=/^[0-9]{15,22}$/;

// Log only meaningful data changes or access to a specific private ticket.
// The audit ledger is tamper-evident: never rewrite rows to replace IDs.
const changingActions=new Set([
  'role.change.success','settings.webhook.test',
  'social.post.create','social.post.like','social.post.repost','social.comment.create',
  'suggestion.create','suggestion.vote','suggestion.comment',
  'profile.follow','profile.comment','profile.edit','profile.image.upload','profile.post.pin',
  'moderation.report','support_ticket.access','support_ticket.attachment.access',
  'application.access','application.attachment.access'
]);
export function shouldAuditAction(action){
  return changingActions.has(action) || /^profile\.section\.(create|edit|move|delete)$/.test(action);
}
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
