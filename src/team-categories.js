// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Public team-directory classification only. Never use display roles for authorization.
export const TEMP_MOD_ROLE_ID='1539085168281919648';
export const STORE_TEAM_GROUP_ORDER=['Ownership','Administration','Staff','Mod','Temp Mod'];

const normalized=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');

export function externalStaffKind(name){
 const key=normalized(name);
 if((key.startsWith('megasmp')||key.startsWith('megastaff'))&&key.includes('staff'))return 'mega';
 if(key.startsWith('prison')&&key.includes('staff'))return 'prison';
 return null;
}

export function storeTeamGroup(role,settings={}){
 if(!role?.id)return null;
 const id=String(role.id),key=normalized(role.name);
 // External communities and SBs x Scam have their own tabs. A generic 'staff'
 // substring must never add them to the SB Store staff directory.
 if(externalStaffKind(role.name)||key.startsWith('sbs'))return null;
 if(id===TEMP_MOD_ROLE_ID)return 'Temp Mod';
 if(settings.ownerRoleIds?.has(id)||/^(?:co)?owners?$/.test(key)||key==='ownership')return 'Ownership';
 if(settings.adminIds?.has(id)||/^(?:head|senior|sr)?(?:admin|administrator|administrators)$/.test(key)||
   ['administration','management'].includes(key))return 'Administration';
 if(/^(?:head|senior|sr)?(?:mod|moderator|moderators|moderation)$/.test(key))return 'Mod';
 if(/^(?:head|senior|sr)?staff$/.test(key)||['helper','helpers','support'].includes(key))return 'Staff';
 // Deliberately configured internal role IDs still count as store staff,
 // without accidentally treating any other role containing "staff" as internal.
 if(settings.teamRoleIds?.has(id)||settings.reviewerIds?.has(id))return 'Staff';
 return null;
}
