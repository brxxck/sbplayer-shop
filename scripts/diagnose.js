// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {config,validateConfig} from '../src/config.js';
import {getGuild,getBotIdentity,getGuildMember,getRoles,searchMembers} from '../src/discord.js';
import {manageableRoles} from '../src/logic.js';
try{
  validateConfig();
  const [guild,bot,roles]=await Promise.all([getGuild(),getBotIdentity(),getRoles()]);
  const membership=await getGuildMember(bot.id);
  console.log('Discord server:',guild.name||guild.id);
  console.log('Bot account:',bot.username,'('+bot.id+')');
  console.log('Bot is in server:',membership?'yes':'NO');
  console.log('Total Discord roles:',roles.length);
  console.log('Safe assignable roles:',membership?manageableRoles(roles,membership,config).length:0);
  console.log('Admin role IDs configured:',config.adminIds.size);
  console.log('Reviewer role IDs configured:',config.reviewerIds.size);
  console.log('Verified Discord owner ID:',guild.owner_id);
  try{await searchMembers('a',1);console.log('Server-member search: available');}
  catch(e){console.log('Server-member search: unavailable (check Guild Members Intent)');}
  const user=process.argv[2];
  if(user && /^\d{15,22}$/.test(user)){
    const member=await getGuildMember(user);
    console.log('Specified user is a server member:',member?'yes':'no');
    if(member)console.log('Specified user has',member.roles.length,'roles');
  }
  console.log('Done. No secrets printed.');
}catch(e){console.error('Diagnosis failed:',e.message);process.exitCode=1;}
