// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {createHash,randomBytes} from 'node:crypto';
import {config} from './config.js';
export const randomToken=()=>randomBytes(32).toString('base64url');
export const sha256=s=>createHash('sha256').update(s).digest('base64url');
const api='https://discord.com/api/v10';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,options={},attempt=0) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
  let response;
  try{response=await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
  if(response.status===429 && attempt<2){
    let seconds=1;try{seconds=Math.min(4,Number((await response.json()).retry_after)||1);}catch{}
    await sleep(seconds*1000);return request(url,options,attempt+1);
  }
  if(response.status===204)return null;
  if(response.status===404)return null;
  if(!response.ok){let detail='';try{detail=(await response.json()).message||'';}catch{}
    throw new Error(`Discord API HTTP ${response.status}${detail?': '+detail:''}`);
  }
  return response.json();
}
const bot=(path,options={})=>request(api+path,{...options,headers:{authorization:'Bot '+config.botToken,...(options.headers||{})}});
export function authUrl(state,challenge) {
  const p=new URLSearchParams({client_id:config.clientId,redirect_uri:config.baseUrl+'/auth/callback',response_type:'code',scope:'identify guilds.members.read',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'consent'});
  return 'https://discord.com/oauth2/authorize?'+p;
}
export async function exchangeCode(code,verifier) {
  const body=new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,grant_type:'authorization_code',code,redirect_uri:config.baseUrl+'/auth/callback',code_verifier:verifier});
  return request('https://discord.com/api/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
}
export const getDiscordUser=accessToken=>request(api+'/users/@me',{headers:{authorization:'Bearer '+accessToken}});
export const getOAuthGuildMember=token=>request(`${api}/users/@me/guilds/${config.guildId}/member`,{headers:{authorization:'Bearer '+token}});
export const getGuild=()=>bot(`/guilds/${config.guildId}`);
export const getRoles=()=>bot(`/guilds/${config.guildId}/roles`);
export const getGuildMember=id=>bot(`/guilds/${config.guildId}/members/${encodeURIComponent(id)}`);
export const getBotIdentity=()=>bot('/users/@me');
export const searchMembers=(q,limit=25)=>bot(`/guilds/${config.guildId}/members/search?query=${encodeURIComponent(q)}&limit=${limit}`);
export const listMembers=(after='',limit=1000)=>bot(`/guilds/${config.guildId}/members?limit=${limit}${after?'&after='+encodeURIComponent(after):''}`);
export const addRole=(userId,roleId,reason)=>bot(`/guilds/${config.guildId}/members/${userId}/roles/${roleId}`,{method:'PUT',headers:{'x-audit-log-reason':encodeURIComponent(reason).slice(0,250)}});
export const removeRole=(userId,roleId,reason)=>bot(`/guilds/${config.guildId}/members/${userId}/roles/${roleId}`,{method:'DELETE',headers:{'x-audit-log-reason':encodeURIComponent(reason).slice(0,250)}});
export async function notify({title,description='',fields=[],color=0x3b82f6}) {
  if(!config.webhook)return false;
  try{
    await request(config.webhook,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'SB Store Community',allowed_mentions:{parse:[]},embeds:[{title:String(title).slice(0,256),description:String(description).slice(0,2000),fields:fields.slice(0,10),color,timestamp:new Date().toISOString()}]})});
    return true;
  }catch(e){console.error('Discord webhook failed:',e.message);return false;}
}
export function discordAvatar(user,size=128) {
  if(!user)return '';
  const id=user.id||user.user_id,avatar=user.avatar;
  if(id&&avatar&&/^\d{15,22}$/.test(String(id))&&/^[a-zA-Z0-9_]+$/.test(avatar))return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_')?'gif':'png'}?size=${size}`;
  return 'https://cdn.discordapp.com/embed/avatars/'+String(Number(BigInt(id||'0')%5n))+'.png';
}
