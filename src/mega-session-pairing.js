// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Single-use, short-lived setup codes permit a local sign-in browser to hand
// a filtered InPvP session to the verified website owner over HTTPS.
import {randomBytes,createHash} from 'node:crypto';

const digest=v=>createHash('sha256').update(v).digest('hex');
export function createMegaSessionPairing({vault,clock=()=>Date.now()}={}){
  if(!vault)throw new Error('Session vault required.');
  const pending=new Map();
  function prune(){
    for(const [hash,item] of pending)if(item.expiresAt<=clock())pending.delete(hash);
  }
  function issue(ownerId){
    if(!vault.configured)throw new Error('InPvP encrypted session storage is not configured.');
    if(!/^[0-9]{15,22}$/.test(String(ownerId||'')))throw new Error('Verified owner required.');
    prune();
    for(const [hash,item] of pending)if(item.ownerId===ownerId)pending.delete(hash);
    if(pending.size>=30)throw new Error('Too many pending account pairings.');
    const code=randomBytes(24).toString('base64url');
    pending.set(digest(code),{ownerId,expiresAt:clock()+10*60000});
    return {code,expiresAt:clock()+10*60000};
  }
  function redeem(code,state){
    if(!vault.configured||typeof code!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(code))
      throw new Error('Invalid or expired pairing code.');
    prune();
    const hash=digest(code),pendingPair=pending.get(hash);
    if(!pendingPair)throw new Error('Invalid or expired pairing code.');
    pending.delete(hash); // Never reuse, including failed uploads.
    vault.save(state);
    return {saved:true,ownerId:pendingPair.ownerId};
  }
  return {issue,redeem};
}
