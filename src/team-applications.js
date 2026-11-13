// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Independent SBs/MegaSMP recruitment. Values are self-reported, not InPvP-verified.
import {db,one,all,run,transaction} from './db.js';
import {appendAudit} from './audit.js';
import {validGamertag} from './mega-team.js';

export const TEAM_SKILLS=Object.freeze([
 {key:'pvp',label:'PvP / Combat'},
 {key:'farming',label:'Farming & Spawners'},
 {key:'grinding',label:'Grinding / Income'},
 {key:'building',label:'Building & Base Defense'},
 {key:'redstone',label:'Redstone / Automation'},
 {key:'trading',label:'Trading & Economy'},
 {key:'strategy',label:'Strategy / Planning'},
 {key:'leadership',label:'Leadership & Organizing'},
 {key:'events',label:'Events / Community'},
 {key:'other',label:'Other'}
]);

// Additive schema: never rebuild the existing staff-application or MegaSMP tables.
db.exec([
 "CREATE TABLE IF NOT EXISTS team_applications ("+
 "id INTEGER PRIMARY KEY AUTOINCREMENT,"+
 "user_id TEXT NOT NULL REFERENCES users(id),"+
 "minecraft_ign TEXT NOT NULL,xbox_verified INTEGER NOT NULL DEFAULT 1,"+
 "current_team TEXT NOT NULL DEFAULT '',"+
 "daily_earnings INTEGER NOT NULL CHECK(daily_earnings>=0),"+
 "net_worth INTEGER NOT NULL CHECK(net_worth>=0),"+
 "play_days INTEGER NOT NULL CHECK(play_days BETWEEN 1 AND 7),"+
 "play_hours REAL NOT NULL CHECK(play_hours BETWEEN 0.5 AND 24),"+
 "timezone TEXT NOT NULL,skills_json TEXT NOT NULL,strong_suits TEXT NOT NULL DEFAULT '',"+
 "income_method TEXT NOT NULL,bank_contribution TEXT NOT NULL,"+
 "previous_teams TEXT NOT NULL DEFAULT '',motivation TEXT NOT NULL,contribution TEXT NOT NULL,"+
 "status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewing','interview','accepted','denied')),"+
 "reviewer_note TEXT NOT NULL DEFAULT '',reviewed_by TEXT REFERENCES users(id),"+
 "created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)",
 "CREATE UNIQUE INDEX IF NOT EXISTS team_app_one_active ON team_applications(user_id) WHERE status IN ('pending','reviewing','interview')",
 "CREATE INDEX IF NOT EXISTS team_app_status_date ON team_applications(status,created_at DESC)",
 "CREATE INDEX IF NOT EXISTS team_app_user_date ON team_applications(user_id,created_at DESC)"
].join(';')+';');

function requiredText(fields,key,max,min=1) {
 const value=String(fields?.[key]??'').trim();
 if(value.length<min||value.length>max)
  throw new Error('Please complete '+key.replaceAll('_',' ')+' ('+min+' to '+max+' characters).');
 return value;
}
function optionalText(fields,key,max) {
 const value=String(fields?.[key]??'').trim();
 if(value.length>max)throw new Error(key.replaceAll('_',' ')+' is too long.');
 return value;
}
function money(fields,key) {
 const value=String(fields?.[key]??'').trim();
 if(!/^(0|[1-9][0-9]{0,14})$/.test(value))
  throw new Error('Enter '+key.replaceAll('_',' ')+' as a whole number (0 to 999,999,999,999,999).');
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n>999999999999999)throw new Error('Invalid money amount.');
 return n;
}

export function validateTeamApplication(fields,{linkedGamertag=''}={}) {
 // The body is NEVER an identity source. Discord sign-in and Xbox linking are checked by the server route.
 const verified=validGamertag(linkedGamertag);
 if(!verified)throw new Error('A verified Microsoft/Xbox gamertag is required.');
 const days=Number(fields?.play_days),hours=Number(fields?.play_hours);
 if(!Number.isSafeInteger(days)||days<1||days>7)throw new Error('Choose 1 to 7 active days per week.');
 if(!Number.isFinite(hours)||hours<0.5||hours>24||!Number.isInteger(hours*2))
  throw new Error('Choose average daily playtime in half-hour increments (0.5 to 24).');
 const skills=TEAM_SKILLS.filter(s=>fields?.['skill_'+s.key]==='on').map(s=>s.key);
 if(skills.length<1||skills.length>5)throw new Error('Select 1 to 5 team strengths.');
 const bank=requiredText(fields,'bank_contribution',20);
 if(!['yes','sometimes','no'].includes(bank))throw new Error('Choose your team-bank contribution preference.');
 return {
  minecraft_ign:verified,xbox_verified:1,
  current_team:optionalText(fields,'current_team',80),
  daily_earnings:money(fields,'daily_earnings'),net_worth:money(fields,'net_worth'),
  play_days:days,play_hours:hours,timezone:requiredText(fields,'timezone',80,2),
  skills_json:JSON.stringify(skills),strong_suits:optionalText(fields,'strong_suits',900),
  income_method:requiredText(fields,'income_method',1200,8),bank_contribution:bank,
  previous_teams:optionalText(fields,'previous_teams',500),
  motivation:requiredText(fields,'motivation',1800,15),
  contribution:requiredText(fields,'contribution',1800,15)
 };
}

export const teamApplication=id=>one(
 'SELECT a.*,u.username,u.display_name,u.avatar FROM team_applications a JOIN users u ON u.id=a.user_id WHERE a.id=?',id)||null;
export const myTeamApplications=userId=>all(
 'SELECT * FROM team_applications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 60',userId);
export const activeTeamApplication=userId=>one(
 "SELECT * FROM team_applications WHERE user_id=? AND status IN ('pending','reviewing','interview') ORDER BY id DESC LIMIT 1",userId)||null;

export function teamApplicationQueue({status='active',sort='newest',q=''}={}) {
 const statusMap={active:"a.status IN ('pending','reviewing','interview')",pending:"a.status='pending'",reviewing:"a.status='reviewing'",interview:"a.status='interview'",accepted:"a.status='accepted'",denied:"a.status='denied'",all:'1=1'};
 const sortMap={newest:'a.created_at DESC,a.id DESC',earnings:'a.daily_earnings DESC,a.created_at DESC',wealth:'a.net_worth DESC,a.created_at DESC',activity:'(a.play_days*a.play_hours) DESC,a.created_at DESC'};
 const filter=statusMap[status]||statusMap.active,order=sortMap[sort]||sortMap.newest;
 const search=String(q||'').trim().slice(0,60).replace(/[\\%_]/g,'\\$&');
 return all("SELECT a.*,u.username,u.display_name,u.avatar FROM team_applications a JOIN users u ON u.id=a.user_id WHERE "+
  filter+(search?" AND (a.minecraft_ign LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')":'')+
  ' ORDER BY '+order+' LIMIT 200',...(search?Array(3).fill('%'+search+'%'):[]));
}

export function submitTeamApplication({userId,data,actorRole='member',ip=''}) {
 return transaction(()=>{
  if(activeTeamApplication(userId))throw new Error('You already have an active team application.');
  const t=Date.now();
  const columns=['minecraft_ign','xbox_verified','current_team','daily_earnings','net_worth','play_days',
   'play_hours','timezone','skills_json','strong_suits','income_method','bank_contribution',
   'previous_teams','motivation','contribution'];
  const sql='INSERT INTO team_applications(user_id,'+columns.join(',')+',created_at,updated_at) VALUES('+
   Array(columns.length+3).fill('?').join(',')+')';
  const result=run(sql,userId,...columns.map(k=>data[k]),t,t);
  const id=Number(result.lastInsertRowid);
  appendAudit(db,{actor:userId,role:actorRole,action:'team_application.submitted',
   target:'team_application:'+id,details:{minecraftIgn:data.minecraft_ign,xboxVerified:true},ip});
  return id;
 });
}

export function updateTeamApplication({id,actorId,actorRole='admin',status,note='',ip=''}) {
 if(!['reviewing','interview','accepted','denied'].includes(status))throw new Error('Invalid team application status.');
 if(String(note).length>1500)throw new Error('Decision note too long.');
 return transaction(()=>{
  const current=one('SELECT * FROM team_applications WHERE id=?',id);
  if(!current)throw new Error('Application not found.');
  if(current.user_id===actorId)throw new Error('You cannot review your own application.');
  if(['accepted','denied'].includes(current.status))throw new Error('This application has already been finalized.');
  const time=Date.now();
  run('UPDATE team_applications SET status=?,reviewed_by=?,updated_at=? WHERE id=?',status,actorId,time,id);
  appendAudit(db,{actor:actorId,role:actorRole,action:'team_application.status',
   target:'team_application:'+id,details:{before:current.status,after:status,decisionNote:note},ip});
  return status;
 });
}
export function saveTeamApplicationNote({id,actorId,actorRole='admin',note,ip=''}) {
 if(typeof note!=='string'||note.length>2000)throw new Error('Private note is too long.');
 return transaction(()=>{
  const current=one('SELECT * FROM team_applications WHERE id=?',id);
  if(!current)throw new Error('Application not found.');
  if(current.user_id===actorId)throw new Error('You cannot review your own application.');
  run('UPDATE team_applications SET reviewer_note=?,updated_at=? WHERE id=?',note,Date.now(),id);
  appendAudit(db,{actor:actorId,role:actorRole,action:'team_application.note',
   target:'team_application:'+id,details:{previousLength:current.reviewer_note.length,newLength:note.length},ip});
 });
}
