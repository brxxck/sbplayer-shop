// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Standalone, deterministic browser-only helpers. No AI/API, telemetry, storage or requests.
const spelling=Object.freeze({
 teh:'the', thier:'their', recieve:'receive', recieved:'received', recieving:'receiving',
 seperate:'separate', definately:'definitely', definetly:'definitely', occured:'occurred',
 occuring:'occurring', untill:'until', availble:'available', avaliable:'available',
 unfortunatly:'unfortunately', unfortunatley:'unfortunately', adress:'address',
 attatch:'attach', attatched:'attached', evidance:'evidence', evidense:'evidence',
 responce:'response', responceing:'responding', mesage:'message', messgae:'message',
 permision:'permission', permisions:'permissions', premission:'permission',
 escalte:'escalate', escaleted:'escalated', apllication:'application', appilcation:'application',
 screnshot:'screenshot', screenshoot:'screenshot', conection:'connection', conected:'connected',
 verfication:'verification', verfied:'verified', completly:'completely', compltely:'completely',
 suprise:'surprise', reponse:'response', apoligise:'apologise', apoligize:'apologize',
 tommorow:'tomorrow', becuase:'because', becasue:'because', wich:'which', woud:'would',
 shoud:'should', coud:'could', ticketts:'tickets', assinged:'assigned', assigment:'assignment',
 reciept:'receipt', succesful:'successful', sucessfully:'successfully', succesfully:'successfully',
 disconected:'disconnected', accout:'account', acount:'account', loggin:'logging',
 acces:'access', accessable:'accessible', infromation:'information', informaiton:'information',
 invaild:'invalid', diferent:'different', diffrent:'different',
 recomend:'recommend', recomendation:'recommendation', issueing:'issuing',
 peformance:'performance', succes:'success', apologiseing:'apologising'
});
const contractions=Object.freeze({
 cant:"can't", couldnt:"couldn't", wouldnt:"wouldn't", shouldnt:"shouldn't", dont:"don't",
 doesnt:"doesn't", didnt:"didn't", isnt:"isn't", arent:"aren't", wasnt:"wasn't", werent:"weren't",
 havent:"haven't", hasnt:"hasn't", hadnt:"hadn't", wont:"won't", im:"I'm", ive:"I've",
 youre:"you're", youve:"you've", theyre:"they're", weve:"we've", theres:"there's"
});
// "ill" is also a legitimate word; do not automatically alter it.
const terms=Object.freeze({
 discord:'Discord', minecraft:'Minecraft', megasmp:'MegaSMP', inpvp:'InPvP',
 xbox:'Xbox', microsoft:'Microsoft', railway:'Railway', botghost:'BotGhost',
 sbstore:'SBStore', bedrock:'Bedrock', gamertag:'gamertag', ign:'IGN', rvi:'RVI',
 rvis:'RVIs', smp:'SMP', pvp:'PvP', afk:'AFK', ui:'UI', api:'API', oauth:'OAuth',
 sqlite:'SQLite', sbsxscam:'SBsxScam', csrf:'CSRF', orebits:'Orebits'
});
const slang=Object.freeze({u:'you',ur:'your',rn:'right now',pls:'please',plz:'please',
 thx:'thanks',ty:'thank you',btw:'by the way',idk:"I don't know",asap:'as soon as possible',
 gonna:'going to',wanna:'want to',gotta:'have to',cuz:'because',cos:'because'});
const protectedPattern=/(\x60{3}[\s\S]*?(?:\x60{3}|$)|\x60[^\x60\n]*(?:\x60|$)|https?:\/\/[^\s<>]+|(?:www\.|discord\.gg\/)[^\s<>]+|<[@#][!&]?\d+>|[@#][\w.-]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b[\w-]+(?:\.[\w-]+)+\b|\/[A-Za-z][\w-]*|\b[A-Za-z_]*\d[\w-]*\b|\b[A-Z][a-z]+[A-Z][A-Za-z]*\b)/g;
const matchCase=(word,replacement)=>word===word.toUpperCase()&&word.length>1?replacement.toUpperCase():
 word[0]===word[0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement;
function words(value,dict,exclude=[]){
 return value.replace(/\b[A-Za-z]+(?:['’][A-Za-z]+)?\b/g,w=>{
  const key=w.toLowerCase();
  if(exclude.includes(key)||!Object.hasOwn(dict,key))return w;
  return matchCase(w,dict[key]);
 });
}
function corrections(value){
 return words(words(words(value,spelling),contractions,['ill']),terms)
  .replace(/\bi\b/g,'I')
  .replace(/\b([Ii]) am agree\b/g,'$1 agree')
  .replace(/\bwe was\b/gi,m=>matchCase(m,'we were'))
  .replace(/\byou was\b/gi,m=>matchCase(m,'you were'))
  .replace(/\bthey was\b/gi,m=>matchCase(m,'they were'))
  .replace(/\bhe have\b/gi,m=>matchCase(m,'he has'))
  .replace(/\bshe have\b/gi,m=>matchCase(m,'she has'))
  .replace(/\bwe has\b/gi,m=>matchCase(m,'we have'))
  .replace(/\bdoes not works\b/gi,m=>matchCase(m,'does not work'))
  .replace(/\bdid not went\b/gi,m=>matchCase(m,'did not go'));
}
function punctuation(value){
 return value.replace(/[ \t]+([,.;!?])/g,'$1')
  .replace(/([!?;,])(?=[A-Za-z])/g,'$1 ')
  .replace(/(^|[.!?][ \t]+|\n[ \t]*)([a-z])(?=[a-z])/g,(_,start,letter)=>start+letter.toUpperCase());
}
function formatted(value){
 return value.replace(/[ \t]+(?=\n|$)/g,'').replace(/[ \t]{2,}/g,' ')
  .replace(/\n{3,}/g,'\n\n');
}
function professional(value){
 return words(corrections(value),slang)
  .replace(/\bhey\b/gi,m=>matchCase(m,'hello'))
  .replace(/\b(?:can't|cannot) help (?:you )?with this\b/gi,m=>matchCase(m,'cannot assist with this'))
  .replace(/\bwe can't\b/gi,m=>matchCase(m,'we cannot'))
  .replace(/\bwe don't\b/gi,m=>matchCase(m,'we do not'))
  .replace(/\blook into\b/gi,m=>matchCase(m,'investigate'))
  .replace(/\bsend (?:us )?a screenshot\b/gi,m=>matchCase(m,'provide a screenshot'));
}
function friendly(value){
 return words(corrections(value),slang)
  .replace(/\bhello\b/gi,m=>matchCase(m,'hi'))
  .replace(/\bwe cannot\b/gi,m=>matchCase(m,"we can't"))
  .replace(/\bwe are unable to\b/gi,m=>matchCase(m,"we're unable to"))
  .replace(/\bprovide us with\b/gi,m=>matchCase(m,'send us'))
  .replace(/\bthank you for contacting us\b/gi,m=>matchCase(m,'thanks for reaching out'));
}
function concise(value){
 return corrections(value).replace(/\bin order to\b/gi,m=>matchCase(m,'to'))
  .replace(/\bat this moment in time\b/gi,m=>matchCase(m,'right now'))
  .replace(/\bdue to the fact that\b/gi,m=>matchCase(m,'because'))
  .replace(/\bwe would like to let you know that\b[ \t]*/gi,'')
  .replace(/\bplease be advised that\b[ \t]*/gi,'')
  .replace(/\ba total of\b[ \t]*/gi,'');
}
const tools=Object.freeze({
 grammar:corrections,spelling:value=>words(words(value,spelling),terms),punctuation,
 professional,friendly,concise,format:formatted
});
export function improveReply(draft,mode){
 if(typeof draft!=='string'||!Object.hasOwn(tools,mode))return draft;
 // Split around commands, links, IDs, mentions, code, version numbers and mixed-case names.
 const parts=draft.split(protectedPattern);
 const transformed=parts.map((p,i)=>{
  if(i%2)return p;
  let result=tools[mode](p);
  if(['grammar','professional','friendly','concise'].includes(mode))result=punctuation(result);
  // Capitalisation at an interior protected-token boundary is not a sentence start.
  if(i>0&&p&&/^[a-z]/.test(p)&&result&&result[0]===p[0].toUpperCase())
   result=p[0]+result.slice(1);
  return result;
 }).join('');
 let result=transformed;
 if(['grammar','punctuation','professional','friendly','concise'].includes(mode)){
  // Add final punctuation only to ordinary prose, never to a terminal protected token.
  if(parts[parts.length-1].trim()&&/[A-Za-z)]$/.test(result)&&/\s/.test(result.trim())&&!/^\s*[\x60/@#]/.test(result))
   result+='.';
 }
 return result;
}
export function mountWritingAssistant(root){
 const form=root.closest('form'),input=form?.elements.namedItem('body');
 const preview=root.querySelector('[data-writing-preview]'),suggestion=root.querySelector('[data-writing-suggestion]');
 const status=root.querySelector('[data-writing-status]'),undo=root.querySelector('[data-writing-undo]');
 const apply=root.querySelector('[data-writing-apply]');
 if(!input||!preview||!suggestion||!status||!undo||!apply)return;
 let pending=null,previous=null;
 const clear=()=>{pending=null;preview.hidden=true;suggestion.value='';};
 const updateUndo=()=>{undo.disabled=!previous||input.value!==previous.after;};
 const edited=()=>{clear();status.textContent='';updateUndo();};
 input.addEventListener('input',edited);
 // Existing quick replies change the draft via script, so invalidate previews there too.
 form.addEventListener('change',event=>{
  if(event.target.matches?.('[data-ticket-quick-reply]'))queueMicrotask(edited);
 });
 root.addEventListener('click',event=>{
  const button=event.target.closest?.('button');if(!button||!root.contains(button))return;
  if(button.hasAttribute('data-writing-tool')){
   clear();
   const before=input.value;
   if(!before.trim()){status.textContent='Write a reply first.';return;}
   const after=improveReply(before,button.dataset.writingTool);
   if(after===before){status.textContent='No changes suggested by this tool.';return;}
   if(after.length>input.maxLength||!after.trim()){
    status.textContent='Suggestion exceeds the reply limit or is empty. Edit the draft first.';return;
   }
   pending={before,after};suggestion.value=after;preview.hidden=false;
   status.textContent='Review the suggested wording before applying.';
  }else if(button.hasAttribute('data-writing-apply')){
   if(!pending||input.value!==pending.before){clear();status.textContent='Draft changed. Generate a new suggestion.';return;}
   const change=pending;clear();input.value=change.after;previous=change;updateUndo();
   status.textContent='Suggestion applied. You can undo it.';input.focus();
  }else if(button.hasAttribute('data-writing-discard')){
   clear();status.textContent='Suggestion discarded.';
  }else if(button.hasAttribute('data-writing-undo')){
   if(previous&&input.value===previous.after){input.value=previous.before;previous=null;clear();updateUndo();status.textContent='Original draft restored.';input.focus();}
  }
 });
}
if(typeof document!=='undefined'){
 for(const root of document.querySelectorAll('[data-writing-assistant]'))mountWritingAssistant(root);
}
