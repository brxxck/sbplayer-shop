<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# Owner-only InPvP session pairing for MegaSMP

The website can reuse an **InPvP website session** to read permitted MegaSMP team data every five minutes. It does not mint, intercept, extract, or reuse Microsoft's OAuth or Xbox refresh tokens. InPvP stores a website token in localStorage; Microsoft Graph User.Read tokens are not usable for InPvP login.

## Deploy safely

1. Keep the existing Railway website, SQLite database, and mounted persistent volume exactly as they are. **Back up the existing Railway volume** before deploying. Do not recreate the Railway service or move DB_PATH.
2. Keep Dockerfile.mega (includes Playwright/Chromium) configured for collector use.
3. On Railway **Variables**, set `MEGA_TEAM_SESSION_KEY` to a unique random 32-byte base64 string, generated locally:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`
   Keep the key secret, backed up separately, and stable across deploys. Rotating it invalidates the saved session, which then must be paired again.
4. Set `MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED=true` and `MEGA_TEAM_BROWSER_AUTO_START=true` only after confirming you have permission to collect the team page. The worker will then check every five minutes.
5. Visit **https://sbstore.info/owner/mega/session** while signed into the website as an owner/co-owner. This route is not linked publicly. Generate a one-time pairing code.
6. On your **own Windows computer**, use a clean private checkout of the repository:
   ```powershell
   npm install --no-save --package-lock=false playwright
   npx playwright install chromium
   node scripts/pair-inpvp-session.js
   ```
7. Enter the short-lived code, sign in **on InPvP** using its ordinary Microsoft button in the opened Chromium window, and return to InPvP. Press Enter to transfer only the authenticated `inpvp.net` storage to the website over HTTPS. Microsoft cookies and passwords remain on the local machine. The local browser closes without creating a permanent profile.
8. The worker reloads the encrypted InPvP session from the existing Railway volume before each capture. After a successful read it can save rotated InPvP browser state back to the encrypted vault, so long as the owner hasn't replaced or deleted it.
9. Return to the private page to see that a session is saved. Check the existing MegaSMP Team panel, collector diagnostics, and Railway logs for **actual** successful captures; saved is not equivalent to authenticated.
10. If InPvP asks you to sign in again (website sessions normally expire in seven days), repeat the pairing. You cannot renew an InPvP session using a Microsoft Graph access token. Use the owner-only Delete control to revoke the website's local copy. For full revocation, sign out in InPvP and revoke account sessions as appropriate.

## Security and limits

- Access to owner controls requires current verified Discord owner/co-owner status and CSRF protection. Pair uploads require an unguessable one-time setup code with ten-minute TTL and strict rate/size limits.
- Browser storage is filtered to `inpvp.net` origins/cookies, encrypted at rest with AES-256-GCM, and written only under the app's private SQLite volume. It is never available via static files, read-only exports, normal admin pages, logs, or screenshots.
- Never put `MEGA_TEAM_SESSION_KEY`, the pairing code, Microsoft credentials, or authenticated browser storage in GitHub, Discord, chat, or ordinary website tickets.
- Successful browser reads remain labeled **observed** and partial. No claims of lifetime coverage or verified current roster are made from partial logs.
- Avoid using `--login` on the legacy persistent-profile worker when encrypted mode is configured: use the local pairing script. Legacy profiles may contain unencrypted sessions; remove old copies once the new encrypted path is confirmed.
- Only one InPvP session is currently shared with the collector. Website co-owners able to manage the session should be people you explicitly trust.
- It is not possible to guarantee permanent login. InPvP can expire or revoke sessions, and Microsoft may ask for interactive sign-in again.
