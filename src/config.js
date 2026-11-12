// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function loadEnv(file = resolve(root, '.env')) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || Object.hasOwn(process.env, m[1])) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
loadEnv();
const ids = (s) => new Set((s || '').split(',').map(x=>x.trim()).filter(x=>/^\d{15,22}$/.test(x)));
const pairs = (s) => Object.fromEntries((s || '').split(',').map(x=>x.trim().split(':')).filter(x=>x.length===2 && x[0] && /^\d{15,22}$/.test(x[1])));
export const config = {
  port: Number(process.env.PORT || 3000),
  production: process.env.NODE_ENV === 'production',
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  botToken: process.env.DISCORD_BOT_TOKEN || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  reviewerIds: ids(process.env.REVIEWER_ROLE_IDS),
  adminIds: ids(process.env.ADMIN_ROLE_IDS),
  ownerIds: ids(process.env.OWNER_USER_IDS),
  finalApproverId: (process.env.FINAL_APPROVER_USER_ID || '').trim(),
  ownerRoleIds: ids(process.env.OWNER_ROLE_IDS),
  protectedIds: ids(process.env.PROTECTED_ROLE_IDS),
  teamRoleIds: ids(process.env.TEAM_ROLE_IDS),
  applicationRoleIds: pairs(process.env.APPLICATION_ROLE_IDS),
  webhook: process.env.DISCORD_WEBHOOK_URL || '',
  adminReportWebhook: process.env.DISCORD_ADMIN_REPORT_WEBHOOK_URL || '',
  ownerReportWebhook: process.env.DISCORD_OWNER_REPORT_WEBHOOK_URL || '',

  invite: process.env.DISCORD_INVITE_URL || '',
  applicationRoles: (process.env.APPLICATION_ROLES || 'Helper,Moderator,Staff').split(',').map(x=>x.trim()).filter(Boolean).slice(0, 25),
  applicationsOpen: process.env.APPLICATIONS_OPEN !== 'false',
  trustProxy: Number(process.env.TRUST_PROXY || '0') || 0,
  dbPath: resolve(root, process.env.DB_PATH || 'data/app.sqlite')
};
export function validateConfig() {
  const required = {DISCORD_CLIENT_ID:config.clientId,DISCORD_CLIENT_SECRET:config.clientSecret,DISCORD_BOT_TOKEN:config.botToken,DISCORD_GUILD_ID:config.guildId};
  const missing = Object.entries(required).filter(([,v])=>!v).map(([k])=>k);
  if (missing.length) throw new Error('Missing .env values: '+missing.join(', '));
  if (!Number.isSafeInteger(config.port) || config.port<1 || config.port>65535) throw new Error('Invalid PORT');
  const u = new URL(config.baseUrl);
  if (config.production && u.protocol !== 'https:') throw new Error('Production BASE_URL must use https');
  if (u.protocol !== 'https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw new Error('BASE_URL must use HTTPS, except localhost');
  for (const [label,url] of Object.entries({DISCORD_WEBHOOK_URL:config.webhook,DISCORD_ADMIN_REPORT_WEBHOOK_URL:config.adminReportWebhook,DISCORD_OWNER_REPORT_WEBHOOK_URL:config.ownerReportWebhook})) {
    if (url && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+$/.test(url)) throw new Error('Invalid '+label);
  }
  if (config.production && !config.adminIds.size) throw new Error('Production requires ADMIN_ROLE_IDS');
  if (config.finalApproverId && !/^\d{15,22}$/.test(config.finalApproverId)) throw new Error('FINAL_APPROVER_USER_ID must be a numeric Discord user ID');
}
