// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// One-instance SSE event bus. No private message content is sent through broadcast events.
import {dmSettings} from './community-data.js';
const subscribers=new Map();
const presence=new Map();
const MAX_STREAMS_PER_USER=5;
const HEARTBEAT_STALE=90000;
const AWAY_MS=300000;
let sequence=0;
function send(res,type,detail={}){
  if(res.destroyed||res.writableEnded)return;
  const packet='id: '+(++sequence)+'\nevent: '+type+'\ndata: '+JSON.stringify(detail)+'\n\n';
  if(!res.write(packet)&&res.writableLength>256*1024)res.end();
}
export function notifyUser(userId,type,detail={}){
  for(const res of subscribers.get(userId)||[])send(res,type,detail);
}
export function notifyEveryone(type,detail={}){
  for(const bucket of subscribers.values())for(const res of bucket)send(res,type,detail);
}
function stateOf(userId){
  if(dmSettings(userId).presence==='invisible')return 'offline';
  const info=presence.get(userId);
  if(!info||Date.now()-info.seen>HEARTBEAT_STALE)return 'offline';
  return Date.now()-info.active>AWAY_MS?'away':'online';
}
export function onlineStatus(userId){return stateOf(userId);}
export function ping(userId,active=true){
  const old=stateOf(userId);
  const stamp=Date.now(),record=presence.get(userId)||{seen:stamp,active:stamp};
  record.seen=stamp;
  if(active)record.active=stamp;
  presence.set(userId,record);
  if(old!==stateOf(userId))notifyEveryone('presence',{userId,status:stateOf(userId)});
}
export function presencePreferenceChanged(userId){
  notifyEveryone('presence',{userId,status:stateOf(userId)});
}
const sessionStreams=new Map();
export function subscribe(res,userId,sessionHash){
  let bucket=subscribers.get(userId);
  if(!bucket){bucket=new Set();subscribers.set(userId,bucket);}
  if(bucket.size>=MAX_STREAMS_PER_USER){res.writeHead(429,{'content-type':'text/plain'});res.end('Too many live sessions');return;}
  res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform',connection:'keep-alive','x-accel-buffering':'no','x-content-type-options':'nosniff'});
  res.write(': live stream established\n\n');
  bucket.add(res);
  let sockets=sessionStreams.get(sessionHash);
  if(!sockets){sockets=new Set();sessionStreams.set(sessionHash,sockets);}
  sockets.add(res);
  ping(userId,true);
  send(res,'ready',{connected:true});
  const timer=setInterval(()=>{
    if(res.writableEnded||res.destroyed){cleanup();return;}
    res.write(': keepalive\n\n');
    // Expired or logged-out sessions must not retain an open real-time stream.
    if(typeof onSessionValid==='function'&&!onSessionValid(sessionHash,userId)){res.end();cleanup();}
  },25000);
  timer.unref();
  function cleanup(){
    clearInterval(timer);bucket.delete(res);
    sockets.delete(res);
    if(!sockets.size)sessionStreams.delete(sessionHash);
    if(!bucket.size)subscribers.delete(userId);
  }
  res.on('close',cleanup);
}
let onSessionValid=null;
export function setSessionValidator(fn){onSessionValid=fn;}
export function revokeSession(hash){
  for(const res of sessionStreams.get(hash)||[])res.end();
}
export function tickPresence(){
  for(const [userId,record] of presence){
    if(Date.now()-record.seen>HEARTBEAT_STALE*2){presence.delete(userId);notifyEveryone('presence',{userId,status:'offline'});}
    else if(Date.now()-record.active>AWAY_MS&&record.awayNotified!==true){
      record.awayNotified=true;
      notifyEveryone('presence',{userId,status:stateOf(userId)});
    }
  }
}
const timer=setInterval(tickPresence,30000);
timer.unref();