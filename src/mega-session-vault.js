// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Encrypt browser storage at rest on the same private Railway volume as SQLite.
// There is no endpoint for downloading or revealing these session credentials.
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,unlinkSync,existsSync,statSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {sanitizeInPvPStorageState} from './mega-session-state.js';

const aad=Buffer.from('SB-Store InPvP browser session v1','utf8');
function keyFromEnv(encoded){
  if(!encoded)return null;
  if(typeof encoded!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(encoded))
    throw new Error('MEGA_TEAM_SESSION_KEY must be a base64-encoded 32-byte key.');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length!==32||bytes.toString('base64')!==encoded)
    throw new Error('MEGA_TEAM_SESSION_KEY must be a base64-encoded 32-byte key.');
  return bytes;
}

export function createMegaSessionVault({key=process.env.MEGA_TEAM_SESSION_KEY||'',
  file,dbPath=process.env.DB_PATH||'data/app.sqlite',clock=()=>Date.now()}={}){
  const secret=keyFromEnv(key);
  const target=resolve(file||resolve(dirname(resolve(dbPath)),'mega-inpvp-session.enc.json'));
  function fingerprint(){
    if(!existsSync(target))return null;
    return createHash('sha256').update(readFileSync(target)).digest('hex');
  }
  function status(){
    const stat=existsSync(target)?statSync(target):null;
    return {configured:!!secret,saved:!!stat&&!!secret,savedAt:stat?.mtimeMs||null};
  }
  function load(){
    if(!secret||!existsSync(target))return null;
    const encrypted=JSON.parse(readFileSync(target,'utf8'));
    if(encrypted.version!==1)throw new Error('Incompatible InPvP session format.');
    const iv=Buffer.from(encrypted.iv||'','base64url');
    const tag=Buffer.from(encrypted.tag||'','base64url');
    const body=Buffer.from(encrypted.body||'','base64url');
    if(iv.length!==12||tag.length!==16||body.length<16||body.length>350000)
      throw new Error('Corrupted InPvP session.');
    const decipher=createDecipheriv('aes-256-gcm',secret,iv);
    decipher.setAAD(aad);decipher.setAuthTag(tag);
    const raw=Buffer.concat([decipher.update(body),decipher.final()]);
    return sanitizeInPvPStorageState(JSON.parse(raw.toString('utf8')));
  }
  function save(input,{expectedFingerprint=undefined}={}){
    if(!secret)throw new Error('InPvP session encryption key not configured.');
    const state=sanitizeInPvPStorageState(input);
    if(expectedFingerprint!==undefined&&fingerprint()!==expectedFingerprint)return false;
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);
    cipher.setAAD(aad);
    const body=Buffer.concat([cipher.update(JSON.stringify(state),'utf8'),cipher.final()]);
    const data=JSON.stringify({version:1,iv:iv.toString('base64url'),
      tag:cipher.getAuthTag().toString('base64url'),body:body.toString('base64url')});
    mkdirSync(dirname(target),{recursive:true,mode:0o700});
    const tmp=target+'.'+randomBytes(6).toString('hex')+'.tmp';
    try{
      writeFileSync(tmp,data,{encoding:'utf8',flag:'wx',mode:0o600});
      renameSync(tmp,target);
    }finally{
      if(existsSync(tmp))unlinkSync(tmp);
    }
    return true;
  }
  function clear(){if(existsSync(target))unlinkSync(target);}
  return {configured:!!secret,target,status,load,save,clear,fingerprint};
}
