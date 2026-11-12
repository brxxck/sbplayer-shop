// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Only InPvP's own browser storage is eligible for transfer; Microsoft/Xbox
// cookies and OAuth tokens from other origins are deliberately excluded.
const isInPvP=host=>host==='inpvp.net'||/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.inpvp\.net$/.test(host);
const cookieName=/^[a-zA-Z0-9_.$-]{1,256}$/;
const storageKey=name=>typeof name==='string'&&name.length>0&&name.length<=256&&
  !/[\\u0000-\\u001f\\u007f]/.test(name);

export function sanitizeInPvPStorageState(source){
  if(!source||typeof source!=='object'||Array.isArray(source))
    throw new Error('Invalid browser session export.');
  if(!Array.isArray(source.cookies)||!Array.isArray(source.origins)||
     source.cookies.length>250||source.origins.length>12)
    throw new Error('Invalid browser storage contents.');
  const cookies=[];
  for(const cookie of source.cookies){
    if(!cookie||typeof cookie!=='object')continue;
    const domain=String(cookie.domain||'').toLowerCase();
    if(!isInPvP(domain.replace(/^\./,'')))continue;
    if(!cookieName.test(cookie.name)||typeof cookie.value!=='string'||
       cookie.value.length>8192||typeof cookie.path!=='string'||
       !cookie.path.startsWith('/')||cookie.path.length>1024)
      throw new Error('Invalid InPvP cookie.');
    const c={name:cookie.name,value:cookie.value,domain,path:cookie.path,
      secure:!!cookie.secure,httpOnly:!!cookie.httpOnly};
    if(cookie.expires!==undefined){
      if(!Number.isFinite(cookie.expires)||cookie.expires < -1||
         cookie.expires>99999999999)throw new Error('Invalid cookie expiration.');
      c.expires=cookie.expires;
    }
    if(cookie.sameSite!==undefined){
      if(!['Strict','Lax','None'].includes(cookie.sameSite))
        throw new Error('Invalid SameSite policy.');
      c.sameSite=cookie.sameSite;
    }
    cookies.push(c);
  }
  const origins=[];
  for(const entry of source.origins){
    if(!entry||typeof entry!=='object'||typeof entry.origin!=='string')continue;
    let origin;
    try{origin=new URL(entry.origin);}catch{continue;}
    if(origin.protocol!=='https:'||!isInPvP(origin.hostname)||
       entry.origin!==origin.origin)continue;
    if(!Array.isArray(entry.localStorage)||entry.localStorage.length>150)
      throw new Error('Invalid InPvP localStorage.');
    const localStorage=[];
    for(const row of entry.localStorage){
      if(!row||!storageKey(row.name)||typeof row.value!=='string'||
         row.value.length>65536)throw new Error('Invalid InPvP storage entry.');
      localStorage.push({name:row.name,value:row.value});
    }
    if(localStorage.length)origins.push({origin:origin.origin,localStorage});
  }
  const state={cookies,origins};
  if(!cookies.length&&!origins.length)
    throw new Error('No InPvP session data detected. Complete the InPvP sign-in first.');
  if(Buffer.byteLength(JSON.stringify(state),'utf8')>256*1024)
    throw new Error('InPvP session data exceeds maximum size.');
  return state;
}
