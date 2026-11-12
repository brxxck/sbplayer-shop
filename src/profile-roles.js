// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Discord profile roles are read-only, never written to the website database.
const DEFAULT_ROLE_COLOR='#8296b5';

export function profileRoleBadges(member,guildRoles,guildId){
  if(!Array.isArray(member?.roles)||!Array.isArray(guildRoles))return [];
  const assigned=new Set(member.roles.map(String));
  return guildRoles.filter(role=>
    role && role.id && String(role.id)!==String(guildId) && role.name!=='@everyone' &&
    assigned.has(String(role.id))
  ).sort((a,b)=>
    (Number(b.position)||0)-(Number(a.position)||0) ||
    String(b.id).localeCompare(String(a.id))
  ).map(role=>{
    const value=Number(role.color);
    const safe=Number.isSafeInteger(value)&&value>0&&value<=0xffffff;
    return {
      id:String(role.id),
      name:String(role.name||'Unnamed role'),
      color:safe?'#'+value.toString(16).padStart(6,'0'):DEFAULT_ROLE_COLOR
    };
  });
}

export function createProfileRoleLookup(discord,guildId,{ttlMs=60000,clock=Date.now}={}){
  let rolesCache=null;
  const memberCache=new Map();
  async function guildRoles(){
    if(rolesCache&&rolesCache.expiresAt>clock())return rolesCache.value;
    const roles=await discord.getRoles();
    if(!Array.isArray(roles))throw new Error('Discord roles unavailable');
    rolesCache={expiresAt:clock()+ttlMs,value:roles};
    return roles;
  }
  async function guildMember(id){
    const found=memberCache.get(id);
    if(found&&found.expiresAt>clock())return found.value;
    const actual=await discord.getGuildMember(id);
    // Bound cache size; visiting many profiles must not grow server memory unbounded.
    if(memberCache.size>=500){
      for(const [key,item] of memberCache){
        if(item.expiresAt<=clock())memberCache.delete(key);
      }
      if(memberCache.size>=500)memberCache.delete(memberCache.keys().next().value);
    }
    memberCache.set(id,{value:actual,expiresAt:clock()+ttlMs});
    return actual;
  }
  return async (id,currentMember=null)=>{
    try{
      const [roles,member]=await Promise.all([
        guildRoles(),
        currentMember&&String(currentMember.user?.id)===String(id)?currentMember:guildMember(id)
      ]);
      if(!member || member.pending)return {state:'not_member',roles:[]};
      if(!Array.isArray(member.roles))return {state:'unavailable',roles:[]};
      return {state:'loaded',roles:profileRoleBadges(member,roles,guildId)};
    }catch{
      // Fail closed without blocking the rest of the member profile or inventing roles.
      return {state:'unavailable',roles:[]};
    }
  };
}
