// BUILT BY SB // RUNING ON WEED AND CAFFEINE
import {shell,esc,token,titlebar} from './views.js';

const action='/owner/ign-connections';
export function ownerIgnConnectionsPage(ctx,connections){
 const rows=connections.map(({discordId,gamertag,username,linkedAt})=>`
  <tr>
   <td>${esc(gamertag)}</td>
   <td><a href="/u/${esc(discordId)}">@${esc(username)}</a><br><small>${esc(discordId)}</small></td>
   <td>${esc(new Date(linkedAt).toLocaleDateString('en-GB'))}</td>
   <td><form method="post" action="${action}">${token(ctx)}
    <input type="hidden" name="discord_user_id" value="${esc(discordId)}">
    <input type="hidden" name="gamertag" value="${esc(gamertag)}">
    <button class="btn btn-outline btn-sm" name="action" value="remove">Remove</button>
   </form></td>
  </tr>`).join('');
 return shell(ctx,'IGN Connections',titlebar('OWNER TOOLS','IGN Connections',
  'Connect a member’s Minecraft IGN when they can’t finish Microsoft sign-in. The connection counts for SBStore applications.')+`
  <form class="panel form" method="post" action="${action}">
   ${token(ctx)}
   <div class="field-grid">
    <label>Discord user ID<input name="discord_user_id" inputmode="numeric" pattern="[0-9]{15,22}" maxlength="22" required></label>
    <label>Minecraft IGN<input name="gamertag" maxlength="32" required></label>
   </div>
   <p class="muted">Saving a new IGN for a member replaces their existing manual connection.</p>
   <div class="form-actions"><button class="btn btn-primary" name="action" value="link">Save IGN connection</button></div>
  </form>
  <section class="panel padded">
   <h2>Manual connections</h2>
   ${rows?`<div class="table-wrap"><table><thead><tr>
    <th>Minecraft IGN</th><th>Discord member</th><th>Linked on</th><th>Action</th>
   </tr></thead><tbody>${rows}</tbody></table></div>`:'<p>No manual IGN connections yet.</p>'}
  </section>`);
}
