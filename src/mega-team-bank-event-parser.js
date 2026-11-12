// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Prepared read-only event-log parsing. No API key or internal InPvP endpoint needed.
// The DOM collector is provisional until calibrated against the live team page.
import {createHash} from 'node:crypto';
import {MEGA_TEAM_ID,validGamertag} from './mega-team.js';

const CENT_LIMIT=BigInt(Number.MAX_SAFE_INTEGER);
const MONTH='(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';
const DISPLAY_TIME=new RegExp('^('+MONTH+'\\s+\\d{1,2}(?:,?\\s+\\d{4})?\\s+\\d{1,2}:\\d{2}\\s*(?:AM|PM)?)\\s+','i');
const EVENT=/\b(Deposited|Deposit|Withdrawn|Withdrew|Withdraw|Withdrawal)\s+(\$[\d,]+(?:\.\d{1,2})?|\$?\d+(?:\.\d{1,2})?)\s*$/i;
const ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/;
const now=()=>Date.now();

export function parseMegaMoneyCents(raw){
  const value=String(raw??'').trim();
  if(!/^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value))
    throw new Error('Bank amount must be a full dollar value with at most two decimal places.');
  const [whole,decimal='']=value.replace(/[$,]/g,'').split('.');
  const cents=BigInt(whole)*100n+BigInt((decimal+'00').slice(0,2));
  if(cents<1n||cents>CENT_LIMIT)throw new Error('Bank amount exceeds exact safe-integer precision.');
  return Number(cents);
}
export function formatMegaCents(cents){
  if(!Number.isSafeInteger(cents)||cents<0)throw new Error('Invalid cents.');
  const amount=BigInt(cents);
  return (amount/100n).toString()+'.'+(amount%100n).toString().padStart(2,'0');
}
const action=raw=>{
  const v=String(raw??'').trim().toLowerCase();
  if(['deposited','deposit','bank deposit'].includes(v))return 'deposit';
  if(['withdrew','withdraw','withdrawn','withdrawal','bank withdrawal'].includes(v))return 'withdrawal';
  throw new Error('Unknown bank action.');
};
const isoTime=raw=>{
  if(raw===null||raw===undefined||raw==='')return null;
  if(typeof raw==='number'){
    if(Number.isSafeInteger(raw)&&raw>946684800000&&raw<now()+86400000)return raw;
    throw new Error('Invalid event timestamp.');
  }
  const s=String(raw).trim();
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(Z|[+-]\d\d:\d\d)$/i.test(s))
    throw new Error('Event timestamps must include a timezone.');
  const ms=Date.parse(s);
  if(!Number.isSafeInteger(ms)||ms<946684800000||ms>now()+86400000)
    throw new Error('Invalid event timestamp.');
  return ms;
};
const cleanLine=text=>String(text??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();

export function parseMegaEventRow(row){
  if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Invalid event-log row.');
  const text=cleanLine(row.text);
  let gamertag=row.gamertag||row.player||null;
  let verb=row.action||row.kind||null;
  let amount=row.amount||null;
  let displayTime=cleanLine(row.displayTime||row.display_time||'');
  if(!gamertag||!verb||!amount){
    const match=EVENT.exec(text);
    if(!match)throw new Error('Not a recognized bank deposit or withdrawal row.');
    verb??=match[1];amount??=match[2];
    const before=text.slice(0,match.index).trim();
    const time=DISPLAY_TIME.exec(before);
    if(time){displayTime||=cleanLine(time[1]);gamertag??=before.slice(time[0].length).trim();}
    else gamertag??=before;
  }
  if(!displayTime)displayTime=cleanLine(row.display_time||'');
  const name=validGamertag(gamertag);
  if(!name)throw new Error('Missing or invalid player Gamertag.');
  const eventId=String(row.eventId||row.event_id||'').trim();
  if(eventId&&!ID_PATTERN.test(eventId))throw new Error('Invalid provider event ID.');
  const timestamp=isoTime(row.occurredAt??row.timestamp??null);
  if(!timestamp&&!displayTime)throw new Error('Timestamp missing: cannot safely identify repeated events.');
  if(displayTime.length>75)throw new Error('Invalid displayed timestamp.');
  return {eventId:eventId||null,gamertag:name,kind:action(verb),
    amountCents:parseMegaMoneyCents(amount),displayTime,occurredAt:timestamp,
    timePrecision:timestamp?'exact':'display_only'};
}
export function prepareMegaEvents(rows,{teamId=MEGA_TEAM_ID,season='current'}={}){
  if(teamId!==MEGA_TEAM_ID)throw new Error('Team ID mismatch.');
  if(!Array.isArray(rows)||rows.length>10000)throw new Error('Expected at most 10,000 bank event rows.');
  const counts=new Map(),events=[],errors=[],withinBatch=new Map();
  for(const [index,row] of rows.entries()){
    let event;
    try{event=parseMegaEventRow(row);}catch(e){errors.push({index,reason:e.message});continue;}
    const base=[teamId,season,event.gamertag.toLowerCase(),event.kind,
      event.amountCents,event.occurredAt||'',event.displayTime.toLowerCase()].join('|');
    const fingerprint=createHash('sha256').update(base).digest('hex');
    const ordinal=(counts.get(fingerprint)||0)+1;
    counts.set(fingerprint,ordinal);
    const eventId=event.eventId?'provider:'+event.eventId:'visible:'+fingerprint.slice(0,40)+':'+ordinal;
    const previous=withinBatch.get(eventId);
    if(previous){
      if(JSON.stringify(previous)!==JSON.stringify(event))errors.push({index,reason:'Conflicting duplicate provider event ID.'});
      continue;
    }
    withinBatch.set(eventId,event);
    events.push({...event,season,teamId,eventId,
      identity:event.eventId?'provider':'visible_fingerprint',ordinal});
  }
  return {events,errors,readCount:rows.length,
    complete:errors.length===0,
    identityCaveat:events.some(e=>e.identity!=='provider')};
}
