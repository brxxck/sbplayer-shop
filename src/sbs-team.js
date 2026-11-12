// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// SBs x Scam Discord role IDs. This feature never changes Discord roles.
export const SBS_TEAM_LEADER_ROLE_ID='1557586028729077841';
export const SBS_TEAM_MEMBER_ROLE_ID='1565070132676661439';

export function sbsTeamMembership(assignedRoles=[]){
 const ids=new Set(Array.isArray(assignedRoles)?assignedRoles.map(String):[]);
 return {
  leader:ids.has(SBS_TEAM_LEADER_ROLE_ID),
  member:ids.has(SBS_TEAM_MEMBER_ROLE_ID)
 };
}
