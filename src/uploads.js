// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {randomBytes} from 'node:crypto';
import {writeFileSync,statSync,existsSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname,resolve,basename} from 'node:path';
import {config} from './config.js';
// Keep uploads on the same persistent volume as the SQLite database.
// The public URL stays /uploads/<filename>, but the actual files are private data.
const uploads=resolve(dirname(config.dbPath),'uploads');
const MAX_BODY=35*1024*1024; // Multiple ticket images/video files; individual limits apply below.
export async function parseRequestBody(req) {
  const parts=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(new Error('Request too large (maximum 35 MB total).'),{status:413});parts.push(chunk);}
  const buffer=Buffer.concat(parts);
  const type=String(req.headers['content-type']||'');
  if(type.startsWith('application/x-www-form-urlencoded')){
    if(buffer.length>200*1024)throw Object.assign(new Error('Form too long.'),{status:413});
    return {fields:Object.fromEntries(new URLSearchParams(buffer.toString('utf8'))),files:{}};
  }
  if(type.startsWith('multipart/form-data')){
    const m=/boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(type);if(!m)throw Object.assign(new Error('Malformed upload.'),{status:400});
    const boundary='--'+(m[1]||m[2]);if(boundary.length>130)throw Object.assign(new Error('Invalid upload boundary.'),{status:400});
    const delimiter=Buffer.from(boundary);const fields={};const files={};let pos=buffer.indexOf(delimiter);let count=0;
    while(pos>=0 && count++<35){
      pos+=delimiter.length;if(buffer.subarray(pos,pos+2).toString()==='--')break;
      if(buffer.subarray(pos,pos+2).toString()!=='\r\n')break;
      pos+=2;const headEnd=buffer.indexOf('\r\n\r\n',pos);if(headEnd<0||headEnd-pos>2000)break;
      const header=buffer.subarray(pos,headEnd).toString('utf8');
      const disp=/content-disposition:\s*form-data;\s*name="([\w-]{1,60})"(?:;\s*filename="([^"]{0,150})")?/i.exec(header);
      if(!disp)break;
      const end=buffer.indexOf(Buffer.from('\r\n'+boundary),headEnd+4);
      if(end<0)break;
      const value=buffer.subarray(headEnd+4,end);const field=disp[1];
      if(disp[2]!==undefined){if(disp[2]){const file={name:disp[2],buffer:value};if(field==='evidence'){(files.evidence??=[]).push(file);}else files[field]=file;}}
      else if(value.length<10000)fields[field]=value.toString('utf8');
      pos=end+2;const next=buffer.indexOf(delimiter,pos);if(next!==pos)break;
    }
    return {fields,files};
  }
  if(buffer.length===0)return {fields:{},files:{}};
  throw Object.assign(new Error('Unsupported form encoding.'),{status:415});
}
export function imageExtension(b){
  if(b.length>4*1024*1024||b.length<12)return null;
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpg';
  if(b.subarray(0,6).toString('ascii')==='GIF87a'||b.subarray(0,6).toString('ascii')==='GIF89a')return 'gif';
  if(b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP')return 'webp';
  return null;
}
export function saveImage(file) {
  if(!file)return '';
  const ext=imageExtension(file.buffer);
  if(!ext)throw Object.assign(new Error('Use a valid PNG, JPEG, GIF or WebP image, max 4 MB.'),{status:400});
  const name=randomBytes(16).toString('hex')+'.'+ext;
  // Fresh installations may not yet have an uploads directory.
  mkdirSync(uploads,{recursive:true});
  writeFileSync(resolve(uploads,name),file.buffer,{flag:'wx',mode:0o644});
  return '/uploads/'+name;
}
export function safeImageFile(path) {
  if(!/^\/uploads\/[a-f0-9]{32}\.(png|jpg|gif|webp)$/.test(path))return null;
  const file=resolve(uploads,path.split('/').at(-1));return existsSync(file)&&statSync(file).isFile()?file:null;
}

// Ticket evidence is private. Never serve these files from the general /uploads static handler.
const ticketUploads=resolve(dirname(config.dbPath),'ticket-files');
const knownTypes={
  png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp',
  mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'
};
export function ticketMediaExtension(b){
  if(!Buffer.isBuffer(b)||b.length<12||b.length>12*1024*1024)return null;
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'jpg';
  if(['GIF87a','GIF89a'].includes(b.subarray(0,6).toString('ascii')))return 'gif';
  if(b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP')return 'webp';
  if(b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))return 'webm';
  if(b.subarray(4,8).toString('ascii')==='ftyp'){
    return b.subarray(8,12).toString('ascii')==='qt  '?'mov':'mp4';
  }
  return null;
}
export function saveTicketEvidence(files=[]){
 if(!Array.isArray(files)||files.length>5)throw Object.assign(new Error('Upload at most five files.'),{status:400});
 const items=files.map(file=>{
   const ext=ticketMediaExtension(file.buffer);
   if(!ext)throw Object.assign(new Error('Evidence must be JPG, PNG, GIF, WebP, MP4, MOV or WebM; max 12 MB per file.'),{status:400});
   return {buffer:file.buffer,ext,name:basename(String(file.name||'evidence').replaceAll('\\\\','/')).replace(/[^a-zA-Z0-9 ._()-]/g,'_').slice(0,100)||'evidence'};
 });
 mkdirSync(ticketUploads,{recursive:true});
 const stored=[];
 try{
   for(const item of items){
     const filename=randomBytes(16).toString('hex')+'.'+item.ext;
     const path='/ticket-files/'+filename;
     writeFileSync(resolve(ticketUploads,filename),item.buffer,{flag:'wx',mode:0o600});
     stored.push({path,name:item.name,mime:knownTypes[item.ext],size:item.buffer.length});
   }
   return stored;
 }catch(e){
   for(const x of stored){try{unlinkSync(resolve(ticketUploads,x.path.split('/').at(-1)));}catch{}}
   throw e;
 }
}
export function deleteTicketEvidence(files=[]){
 for(const x of files){if(!x?.path)continue;
   const file=safeTicketFile(x.path);
   if(file)try{unlinkSync(file);}catch{}
 }
}
export function safeTicketFile(path) {
 if(!/^\/ticket-files\/[a-f0-9]{32}\.(png|jpg|gif|webp|mp4|mov|webm)$/.test(path))return null;
 const file=resolve(ticketUploads,path.split('/').at(-1));
 return existsSync(file)&&statSync(file).isFile()?file:null;
}
