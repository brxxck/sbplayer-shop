// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Browse every captured bank event, not just the 100-event dashboard excerpt.
// When InPvP lacks exact timestamps, capture order is labelled as approximate.
import {all,one} from './db.js';
import {activeMegaSeason,MEGA_TEAM_ID,validGamertag} from './mega-team.js';
import {megaCapturedBankSummary} from './mega-team-bank-event-store.js';
import {formatMegaCents} from './mega-team-bank-event-parser.js';
import './mega-team-discord-matches.js';

const PAGE_LIMIT=50;
const safePage=value=>{
 const page=Number(value);
 return Number.isSafeInteger(page)&&page>=1&&page<=100000? page:1;
};
export function megaCapturedBankHistory({
 season=activeMegaSeason(),page=1,kind='all',gamertag=''
}={}){
 if(!one('SELECT 1 FROM mega_team_seasons WHERE season=?',season))
  throw new Error('Unknown team season.');
 if(!['all','deposit','withdrawal'].includes(kind))throw new Error('Unknown transaction type.');
 const player=String(gamertag||'').trim();
 if(player&&!validGamertag(player))throw new Error('Invalid player filter.');
 const where=['e.season=?'],args=[season];
 if(kind!=='all'){where.push('e.kind=?');args.push(kind);}
 if(player){where.push('e.gamertag=? COLLATE NOCASE');args.push(player);}
 const filter=where.join(' AND ');
 const total=one('SELECT COUNT(*) AS n FROM mega_team_captured_bank_events e WHERE '+filter,...args).n;
 const requested=safePage(page);
 const pages=Math.max(1,Math.ceil(total/PAGE_LIMIT));
 const selected=Math.min(requested,pages);
 const offset=(selected-1)*PAGE_LIMIT;
 const rows=all(
  'SELECT e.id,e.source_event_id AS eventId,e.identity,e.gamertag,e.kind,'+
  'e.amount_cents AS amountCents,e.display_time AS displayTime,e.occurred_at AS occurredAt,'+
  'e.time_precision AS timePrecision,e.first_seen_at AS firstSeen,e.last_seen_at AS lastSeen,'+
  'm.discord_user_id AS discordId,u.username AS discordUsername,u.display_name AS discordName '+
  'FROM mega_team_captured_bank_events e '+
  'LEFT JOIN mega_team_discord_matches m ON m.season=e.season AND m.gamertag=e.gamertag COLLATE NOCASE '+
  'LEFT JOIN users u ON u.id=m.discord_user_id '+
  'WHERE '+filter+' ORDER BY e.first_seen_at DESC,e.id ASC LIMIT ? OFFSET ?',
  ...args,PAGE_LIMIT,offset
 ).map(event=>({...event,amount:formatMegaCents(event.amountCents)}));
 const names=all('SELECT gamertag FROM mega_team_captured_bank_events WHERE season=? '+
  'GROUP BY gamertag COLLATE NOCASE ORDER BY gamertag COLLATE NOCASE LIMIT 5000',season)
  .map(row=>row.gamertag);
 const status=one('SELECT * FROM mega_team_capture_status WHERE season=?',season)||null;
 const totals=megaCapturedBankSummary(season);
 return {teamId:MEGA_TEAM_ID,season,rows,total,page:selected,pages,pageSize:PAGE_LIMIT,
   kind,player,players:names,status,totals,
   hasPrevious:selected>1,hasNext:selected<pages,
   coverage:status?.history_complete===1?'source_declared_complete':'captured_only',
   chronologicalPrecision:rows.every(row=>row.timePrecision==='exact')?'exact':'display_only',
   note:'Displays all saved bank events using pages of 50. Older upstream events absent from InPvP cannot be reconstructed; non-timezoned display text is not an exact timestamp.'};
}
