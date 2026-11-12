// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VISIBLE_AUDIT_ACTIONS,shouldAuditAction,collectAuditDiscordIds,auditDisplayText,readableAuditRows} from '../src/audit-display.js';

test('only state-changing actions and private ticket access belong in the concise audit',()=>{
  const good=[
    'application.submitted','application.reply','application.access',
    'support_ticket.create','support_ticket.reply','support_ticket.status',
    'support_ticket.access','support_ticket.attachment.access',
    'application.attachment.access','staff_chat.message','admin.decision',
    'reviewer.vote','application.owner_review','application.role.assigned',
    'role.change.success','profile.edit','profile.section.delete','content.delete',
    'moderation.report.remove','suggestion.vote','owner.access.revoked'
  ];
  for(const action of good)assert.equal(shouldAuditAction(action),true,action+' should be audited');
  for(const action of [
    'staff.page.read','staff.request.attempt','staff.login','staff.logout',
    'owner.audit.view','owner.audit.export','review.queue.view','roles.dashboard.view',
    'moderation.queue.view','settings.view','owner.access.view','security.access.denied',
    'role.change.attempt','role.change.blocked','role.change.failed',
    'application.submitted.webhook','support_ticket.reply_webhook','application.reply.webhook'
  ])assert.equal(shouldAuditAction(action),false,action+' must not clutter the audit');
  assert.equal(VISIBLE_AUDIT_ACTIONS.length,new Set(VISIBLE_AUDIT_ACTIONS).size);
});

test('actor, target and nested detail IDs resolve to Discord usernames without mutating historical rows',()=>{
  const owner='145689132004221042',other='145689132004221043',unresolved='145689132004221044';
  const details=JSON.stringify({who:other,members:[owner],unknown:unresolved,roleId:'1539085168281919648'});
  const original={id:1,actor_id:owner,actor_role:'owner',action:'owner.access.granted',
    target:'user:'+other,details};
  const before=JSON.stringify(original);
  const labels=new Map([[owner,'unk.sb'],[other,'sample_user']]);
  const [row]=readableAuditRows([original],labels);
  assert.equal(row.actorDisplay,'@unk.sb');
  assert.equal(row.actorKnown,true);
  assert.equal(row.targetDisplay,'user:@sample_user');
  assert.match(row.detailsDisplay,/"who":"@sample_user"/);
  assert.match(row.detailsDisplay,/"members":\["@unk.sb"\]/);
  assert.match(row.detailsDisplay,/"unknown":"145689132004221044"/);
  assert.match(row.detailsDisplay,/"roleId":"1539085168281919648"/);
  assert.equal(JSON.stringify(original),before,'original fields and hashes must remain unmodified');
  assert.deepEqual(collectAuditDiscordIds([original]).sort(),
    [owner,other,unresolved,'1539085168281919648'].sort());
});

test('Discord name conversion is literal and cannot inject HTML on its own',()=>{
  const id='145689132004221042';
  const label='<script>alert(1)</script>';
  assert.equal(auditDisplayText('User '+id,new Map([[id,label]])),'User @'+label);
  // HTML escaping is applied by the view, not by this data-layer formatter.
  assert.equal(auditDisplayText('abc'+id+'def',new Map([[id,'test']])), 'abc@testdef');
  assert.equal(auditDisplayText('1234',new Map([[id,'test']])), '1234');
  const rows=readableAuditRows([{actor_id:'anonymous',target:'audit',details:'{}'}],new Map());
  assert.equal(rows[0].actorDisplay,'Anonymous');
});
