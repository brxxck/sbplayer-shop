// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,titlebar,esc,token} from './views.js';

export function ownerMicrosoftPage(ctx,{configured=false,connected=false,expiresAt=null,redirectUri=''}={}){
  const section=!configured?
    '<p class="muted">Microsoft sign-in is disabled until the owner configures the app registration in Railway.</p>'+
    '<p class="muted tiny">Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET. Register the callback as a Web redirect URI:</p>'+
    '<code>'+esc(redirectUri)+'</code>':
    '<p class="muted">This connects a personal Microsoft account using Microsoft Graph User.Read. It is not an Xbox or Minecraft Bedrock session.</p>'+
    (connected?
      '<p><strong>Graph access token ready.</strong> Expires '+esc(new Date(expiresAt).toLocaleString())+'.</p>'+
      '<form method="post" action="/owner/microsoft/reveal">'+token(ctx)+
      '<button class="btn btn-primary" type="submit">Reveal token once</button></form>':
      '<form method="post" action="/owner/microsoft/start">'+token(ctx)+
      '<button class="btn btn-primary" type="submit">Connect with Microsoft</button></form>');
  const forget=connected?'<form method="post" action="/owner/microsoft/forget">'+token(ctx)+
    '<button class="btn btn-outline" type="submit">Forget local token</button></form>':'';
  return shell(ctx,'Private Microsoft Login',titlebar(
    'OWNER ONLY','Microsoft <span class="gradient">connection.</span>',
    'A private utility for the verified site owner and authorized co-owners.'
  )+'<section class="panel padded narrow"><h2>Microsoft Graph authorization</h2>'+
  '<p class="muted tiny">Not linked from public navigation. Only the website owner can use this page.</p>'+
  section+forget+
  '<p class="muted tiny">No Microsoft passwords, refresh tokens or access tokens are saved to disk. Revealing a token displays it once and clears the server copy.</p>'+
  '</section>');
}

export function ownerMicrosoftTokenPage(ctx,accessToken){
  return shell(ctx,'Microsoft Access Token',titlebar(
    'OWNER ONLY','One-time <span class="gradient">access token.</span>',
    'For Microsoft Graph only. Never share or paste this token into chat or public pages.'
  )+'<section class="panel padded narrow"><h2>Copy your Graph token</h2>'+
  '<p class="muted">This token has been removed from server memory. Close this page when finished.</p>'+
  '<textarea readonly spellcheck="false" rows="8" aria-label="Microsoft Graph access token">'+esc(accessToken)+'</textarea>'+
  '<p><a class="btn btn-outline" href="/owner/microsoft">Back to Microsoft connection</a></p></section>');
}
