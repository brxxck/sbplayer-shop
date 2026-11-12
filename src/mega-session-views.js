// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,titlebar,esc,token} from './views.js';

export function megaSessionPage(ctx,{configured=false,saved=false,savedAt=null,
  collectorEnabled=false,pairCode=null,expiresAt=null}={}){
  const status=!configured?'Encrypted storage not configured':
    saved?'Encrypted InPvP session saved':'No InPvP session saved';
  const details=!configured?
    '<p class="muted">Ask the website owner to set MEGA_TEAM_SESSION_KEY on the current Railway service. Use a new random 32-byte base64 key, and do not put it in GitHub.</p>':
    '<p class="muted">'+(saved?
      'Your last paired InPvP browser session is available for the read-only collector. This does not prove it is still valid.' :
      'Pair a login from a local Chromium browser. No Microsoft password or OAuth token is sent to SB Store.')+'</p>';
  const pair=pairCode?
    '<div class="panel padded"><h3>One-time pairing code</h3>'+
    '<p class="muted">Private code; expires '+esc(new Date(expiresAt).toLocaleTimeString())+'. Use it once in the local pairing script.</p>'+
    '<p><code style="overflow-wrap:anywhere">'+esc(pairCode)+'</code></p></div>':'';
  return shell(ctx,'Private InPvP Session',titlebar('OWNER ONLY',
    'InPvP <span class="gradient">session pairing.</span>',
    'Connect a personal InPvP session for permitted read-only MegaSMP team updates.'
  )+'<section class="panel padded narrow"><h2>Connection status</h2>'+
    '<p><strong>'+esc(status)+'</strong></p>'+details+
    '<p class="muted tiny">Last saved: '+(savedAt?esc(new Date(savedAt).toLocaleString()):'Never')+
    ' · Five-minute collector: '+(collectorEnabled?'Enabled':'Disabled')+'</p>'+
    '<p class="muted tiny">InPvP sessions can expire. The website cannot silently reissue Microsoft or InPvP credentials. You will need to pair again when the session expires.</p>'+
    (configured?'<form method="post" action="/owner/mega/session/code">'+token(ctx)+
       '<button class="btn btn-primary" type="submit">Generate one-time pairing code</button></form>':'')+
    pair+
    (saved?'<form method="post" action="/owner/mega/session/disconnect">'+token(ctx)+
       '<button class="btn btn-outline" type="submit">Delete saved InPvP session</button></form>':'')+
    '<h3>First-time setup on your Windows PC</h3>'+
    '<p class="muted">Use Node.js 22+ in a private checkout of your website source:</p>'+
    '<pre><code>npm install --no-save --package-lock=false playwright\nnpx playwright install chromium\nnode scripts/pair-inpvp-session.js</code></pre>'+
    '<p class="muted tiny">The local browser uses official Microsoft/InPvP sign-in. Only InPvP cookies and localStorage are uploaded to this website. Do not share pairing codes.</p>'+
  '</section>');
}
