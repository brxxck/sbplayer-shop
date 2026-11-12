<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB's & Cam's Store — Community Portal V1.3.9

**Discord-authenticated staff applications, reviewer voting, admin consensus, Twitter-like posts, suggestions, customizable profiles, Team Members, Discord role management, and an owner-only tamper-evident audit.** The website retains the requested navy/electric-blue theme, supplied SB logo, and signed-in Discord username/avatar. This repository powers the Railway-hosted website and also supports local Node development.

## V1.3.9 — Focused audit, Discord usernames, and restricted access for non-members

- **Owner audit events** now show Discord **@usernames** instead of raw user IDs wherever a verified username can be resolved. Original numeric IDs remain intact in the underlying, hash-chained records. Known usernames are resolved from the app's local user database, with bounded Discord membership lookups for missing names. Unknown/unresolvable accounts show the ID rather than an invented identity.
- The **target and details** columns also display resolved usernames where possible; exports retain the original IDs, row hashes, and other forensic data plus readable display columns.
- **Audit scope:** record **state changes** (staff review decisions, ticket replies and status updates, role changes, settings, owner access, profile/content edits, etc.) and **successful access to individual private tickets/attachments**. Routine page loads, audit page views, queue refreshes, failed attempts and webhook notification delivery no longer add noisy audit entries.
- Old browsing-related events are **hidden from the audit page** and from its default **Export changes & ticket access** CSV, but are **not deleted or changed**. Owners can use **Full historical CSV** to retrieve all original events, preserving the tamper-evident hash chain.
- **Any personal Discord account may sign in** using OAuth, even if it isn't in the Discord guild. Missing guild membership or pending membership screening gives the restricted \`appeal-only\` role, which can **submit and track its own Ban Appeals** and now visit **Meet the Team** (including Our Staff, Team Members / SBs x Scam, and Known Members). Regular feeds, member profiles, other ticket types and staff/admin features remain blocked.
- For restricted users, the team directory cards show names, avatars and role labels but **do not link to member profiles**. The restricted homepage and sidebar include **Meet the Team**, and people signing in from shared team links return to that page after Discord authentication.
- **Safe Railway update:** no destructive migrations, no changes to existing application/ticket data, and no new environment variables. **Back up the existing Railway volume**, keep \`/app/data\` mounted and \`DB_PATH=/app/data/app.sqlite\`, deploy the latest tested GitHub \`main\` on your existing \`sbplayer-shop\` service, and verify \`https://sbstore.info/health\` returns \`"version":"1.3.9"\`.
- **Test procedure:** sign in with a Discord account that is *not* in your server, verify the **Ban Appeal** and **Meet the Team** links work, then confirm \`/feed\`, \`/dashboard\`, \`/members\` and \`/staff\` deny access. Check Owner Audit Log for @username labels and clean event categories.

## V1.3.8 — Staff, Mod and Temp Mod sections

- **Our Staff** keeps **Ownership** and **Administration**, then replaces the former generic **Other Staff** grid with three separate groups in this order: **Staff → Mod → Temp Mod**. Each group is visible even if no members are currently assigned.
- **Temp Mod** membership is determined exclusively by the Discord role ID \`1539085168281919648\`, not by fuzzy name matching. The label uses the role's current Discord name.
- **Mod** includes the store's \`Mod\`, \`Moderator\`, and \`Head Mod\` roles. **Staff** includes normal/head/senior store \`Staff\` roles, plus explicitly configured reviewer/team staff roles when they do not hold a more specific rank.
- People with more than one staff role appear **once**, in their highest applicable group: **Ownership > Administration > Staff > Mod > Temp Mod**. The displayed role badge comes from the matched internal role, not unrelated Mega SMP staff roles.
- **Known Members** (Mega SMP / Prison staff) and **Team Members** (SBs x Scam) remain separate. External staff and team roles cannot accidentally create an **Our Staff** card.
- **Safe deployment:** This is a presentation/role-classification update. No database schema changes or new Railway settings are needed. Keep the existing \`sbplayer-shop\` service and \`/app/data\` volume, back up before redeploying GitHub \`main\`, and verify \`https://sbstore.info/health\` reports \`"version":"1.3.8"\`.

## V1.3.7 — Mega Staff Trusted directory fix and cleaner heading

- **Mega Smp Staff Trusted** (including equivalent Mega SMP / Mega Staff Trusted spellings) is classified as an **external Mega SMP staff role**, not as SB Store staff.
- Users holding only a Mega SMP Staff / Staff Trusted role (or one plus an SBs Team Member/Leader role) **do not appear under Our Staff**. They appear under **Known Members → Mega SMP Staff** instead.
- Users with both a legitimate store-staff role and an external Mega SMP Staff Trusted role still appear under **Our Staff** with their actual store-staff title, and in the Mega SMP known-members list.
- The explanatory text **“Automatically detected from N Discord server roles.”** beneath the **Meet our team** heading has been removed. The directories remain automatically populated from verified Discord member roles.
- Existing tab order remains **Our Staff → Team Members → Known Members**, with SBs x Scam and Prison Staff grouping unchanged.
- **Safe Railway deployment:** no database changes, schema updates or new variables. Keep the existing \`sbplayer-shop\` service and \`/app/data\` volume. Back up first, deploy the tested \`main\` branch, then confirm \`https://sbstore.info/health\` reports \`"version":"1.3.7"\`.

## V1.3.6 — SBs x Scam Team Members and red [SBs] name tag

- The top navigation on **Team Members** now appears in this exact order: **Our Staff → Team Members → Known Members**. The first keeps the existing store-staff groups, and the third keeps the Mega SMP Staff and Prison Staff subtabs.
- The new **Team Members** tab is labelled **SBs x Scam** inside the page and finds members from two exact Discord role IDs:
  - **SBs Team Leader:** \`1557586028729077841\`
  - **SBs Team Member:** \`1565070132676661439\`
- Team Members are grouped into **SBs Team Leaders** and **SBs Team Members**. If someone has both roles, they appear once under Team Leaders; if they also genuinely belong to store staff or a Known Members group, they remain visible in those other tabs.
- **[SBs]** is displayed in **red immediately after the display name** on team directory cards and member profiles for users who **actually have the SBs Team Member role**. A leader who doesn't also hold the member role does not receive the tag. This badge is derived from verified Discord role membership, not editable profile text.
- A member having only an SBs role is not treated as a store staff member solely because of that role. Badge visibility respects existing private profile permissions.
- **Safe Railway deployment:** no database migrations, no new variables, no role changes and no volume reset. Keep your existing \`sbplayer-shop\` service, \`/app/data\` volume and \`DB_PATH=/app/data/app.sqlite\`. Back up your volume first, deploy the latest tested GitHub \`main\` commit, then verify \`https://sbstore.info/health\` returns \`"version":"1.3.6"\` and open \`https://sbstore.info/team?tab=sbs\`. The bot needs Guild Members Intent for a complete member list.

## V1.3.5 — Discord roles on every member profile

- Every member profile now has a **Discord Roles** section **directly below the bio and above the profile statistics**, using coloured, mobile-wrapping badges for the user's roles from the configured Discord guild.
- Role names and colours come from live Discord server role definitions, ordered by **Discord role position** (highest first). The shared **\`@everyone\`** role is excluded; managed, regular community, store-staff, Mega SMP Staff and Prison Staff roles are included when assigned.
- This is **read-only** and requires no manual role entry. Role and member lookups are cached for **60 seconds** to reduce Discord API usage; refresh the member's profile after that interval to see changes. Your own page uses your freshly verified Discord membership where possible.
- **Privacy:** another user's private profile does not show roles and does not trigger an additional role lookup. A person viewing their own private profile can still see their roles.
- Missing Discord data is shown as an unavailable state, never fabricated roles. Escaped role labels and validated hex colours prevent user-controlled role names from injecting markup or CSS.
- **Safe deployment:** keep the existing Railway service and \`/app/data\` persistent volume. This release changes presentation and read-only API lookups only: **no SQLite schema changes, no reset, and no new environment variables**. Back up the volume as normal, deploy the latest \`main\` commit, then verify \`https://sbstore.info/health\` returns \`"version":"1.3.5"\`.

## V1.3.4 — Known Members tab on Meet the Team

- **Meet the Team** now has two main tabs: **Meet the Team** for SB Store team members and **Known Members** for external-community staff recognised by their Discord roles.
- **Known Members** contains two category tabs: **Mega SMP Staff** and **Prison Staff**, automatically populated from matching Discord role names (`Mega Smp Staff`, `Mega SMP Staff`, or `Prison Staff`, case and punctuation insensitive).
- A member whose *only* qualifying staff role is Mega SMP or Prison Staff is **not incorrectly listed as Other Staff** for the store. If someone is also real store staff (admin, moderator, helper, or store-team role), they stay in the core Meet the Team section and also show in the matching Known Members tab.
- A person holding both external roles appears in both Known Members categories, once per category. Buttons and counts work on mobile and desktop, with active section indicated for keyboard and screen-reader users.
- The page continues using Discord role membership already queried by the site; **no new environment variables, role IDs, or database schema changes** are needed. The bot still needs **Server Members Intent** to retrieve the full server member list.
- **Safe deployment:** Keep your existing Railway `sbplayer-shop` service, `/app/data` volume, and `DB_PATH=/app/data/app.sqlite`. Back up the volume before deployment, then deploy the latest GitHub `main` commit. Verify `https://sbstore.info/health` returns `"version":"1.3.4"` and open **Team Members → Known Members → Mega SMP Staff / Prison Staff**.

## V1.3.3 — Branded Discord link previews

Discord was showing its own homepage on shared \`sbstore.info/team\` links because signed-out web crawlers received a Discord OAuth redirect and the pages lacked Open Graph metadata.

- All site pages now serve **server-rendered Open Graph and Twitter Card tags** with \`SB's & Cam's Store\` branding, the existing public SB logo (\`/static/sb-logo.png\`), an absolute canonical \`BASE_URL\`, and a route-specific safe description for common pages.
- Clicking **Continue with Discord** on a shared link now carries a verified same-site return path through OAuth, so a member signing in from `/team` returns to `/team` rather than being dumped on Home. Unsafe or external return URLs are rejected.
- Signed-out visitors (including Discordbot) can fetch **public login landing pages** for \`/team\`, \`/members\`, \`/feed\`, \`/suggestions\`, \`/apply\`, \`/tickets/new\`, \`/dashboard\`, and common shared ticket/profile links, with the normal **Continue with Discord** action. Actual user/member/staff content still requires authenticated authorization.
- Shared private ticket and staff-application links show only a **generic Private Ticket preview**. Ticket IDs, replies, staff reports, decisions and attachments are **not** displayed to the crawler.
- **Safe deployment:** Back up the existing Railway volume, keep \`DB_PATH=/app/data/app.sqlite\`, and redeploy the same service from GitHub \`main\`. There are **no database changes** and no new Railway variables. Ensure \`BASE_URL=https://sbstore.info\` is already set.
- Check \`/health\` for \`"version":"1.3.3"\`, then paste \`https://sbstore.info/team?preview=133\` into a **new Discord message**. Discord can cache old previews; a new query string prompts a fresh fetch. The card should say **Our Team | SB's & Cam's Store** with the SB logo.

Note: If Chrome or Discord flags the domain as dangerous, that separate domain reputation issue still needs to be resolved. Metadata cannot override security or trust warnings.

## V1.3.2 — unk.sb may vote and make a separate final approval decision

- **unk.sb can cast an admin recommendation vote** (Accept or Deny), exactly like other admins. The vote counts as **one** of the two matching votes, not as an automatic final decision.
- Another **distinct admin** must agree to establish a recommendation. One admin account may vote only once per application. The designated final approver can **separately** click **Final Accept**, **Final Deny**, or **Return for re-review** when two matching votes have been recorded.
- **Final Accept** only appears after **two Accept** recommendations. If the recommendation is Deny, the owner can **Final Deny** or **Return for re-review**. A final Deny can also override an Accept recommendation.
- No Discord role is assigned, and no application is accepted or denied, until the explicit final action from the configured **FINAL_APPROVER_USER_ID**. All votes and final actions have separate audit records.
- The admin review page no longer incorrectly displays "This application is finalized" on tickets that are merely Reviewing.
- **Safe update:** This version does not reset or rebuild the SQLite database. Back up the existing Railway volume, confirm `DB_PATH=/app/data/app.sqlite`, and deploy the latest GitHub `main` commit in the same Railway service. Do not delete the volume or service. `/health` returns `"version":"1.3.2"`. No new environment variables are required beyond the existing V1.3.1 configuration.

## V1.3.1 — Member/Staff Dashboards and Chat-Style Support Tickets

- **Member Home:** personalized welcome, **Submit a Ticket**, My Tickets counters, live Main Feed preview, and **Customize Profile** shortcut.
- **Staff Home:** built-in private staff chat (polls new messages every 8 seconds, no Discord @here), all accessible active support/staff-application tickets with **ticket type labels**, shortcut to Customize Profile, and owner Final Approvals shortcut.
- **Ticket picker:** **Bug Report, Player Report, Reward Claim, Staff Report, Ban Appeal**, plus **View My Tickets**. Each opens its own dedicated form.
- **Discord-verified identity:** all forms show the logged-in Discord username and **Verified via Discord**; no email-address field.
- **Exact placeholders:** Player Report username: "Player's username"; Rule Broken and Ban Appeal Reason: "e.g. Hard-R, Spamming, Threats"; Reward Claim: "e.g. Discord Nitro"; Staff Report: "Staff member's username"; Bug Report: "Describe the bug in detail...".
- **Conversations:** members, reviewers, admins and owners can exchange private replies on the tickets they're authorized to see. The chat view supports **Upload video/pictures** (up to 5 files per message, 12 MB per file, 35 MB combined) and a staff-only **Mark as resolved** control for support tickets. Member replies reopen a resolved support ticket. Existing staff applications keep their separate two-admin + unk.sb final-approval rule.
- **Report confidentiality:** regular staff can view ordinary support tickets; **Staff Reports** are **admin/owner only**. Staff Reports about an **admin/owner** are **owner-only**, including messages, uploads, counts, search/queues, and direct URLs. Unknown or ambiguously matched staff identities are owner-only until verified. A subject promoted to admin is immediately hidden from admins when the role is rechecked, and remains owner-confidential afterward.
- **Private Discord notifications:** ordinary new tickets trigger @here in the existing staff-only webhook; applicant replies are limited to one @here per ticket per 5 minutes. Staff Reports never go to that general channel: they use the separately configured admin or owner report webhooks **without @here**. If a private webhook is missing, the confidential notification is suppressed rather than falling back to the general staff channel.
- **Ban appeals for banned users:** Discord OAuth can authenticate non-guild users for *only* the Ban Appeal form, their own appeals and replies. All other website pages remain blocked until verified guild membership. One unresolved Ban Appeal per account.
- **Default profile UI:** repairs default typography, headings, empty states, sizing, spacing, mobile layout and avatar/header positioning without resetting custom profile data.
- **No destructive migrations:** uses additive SQLite tables for support tickets, private attachments and staff-chat messages. Existing applications, votes, member accounts, posts, suggestions, profiles, sessions, logs and image uploads are left intact. Evidence is stored under \`/app/data/ticket-files\` outside public static serving.

### Railway V1.3.1 safe update checklist

1. Go to the existing Railway service \`sbplayer-shop\`. Under **Volumes**, confirm the same persistent volume remains mounted at **\`/app/data\`**. Confirm **\`DB_PATH=/app/data/app.sqlite\`** under Variables. DO NOT delete the volume or create a replacement service.
2. Under **Backups**, create or verify a volume snapshot *before* deploying. For SQLite in WAL mode, use a SQLite-aware backup or Railway volume snapshot rather than copying only the open \`.sqlite\` file.
3. Confirm \`BASE_URL=https://sbstore.info\`, \`DISCORD_WEBHOOK_URL\`, \`FINAL_APPROVER_USER_ID\` (unk.sb's **numeric Discord user ID**), \`ADMIN_ROLE_IDS\`, \`REVIEWER_ROLE_IDS\` remain configured.
4. Add **\`DISCORD_ADMIN_REPORT_WEBHOOK_URL\`** pointing to a **private admin/owner-only Discord channel**. Add **\`DISCORD_OWNER_REPORT_WEBHOOK_URL\`** pointing to a **separate owner-only channel**. Do not reuse the general staff-channel webhook; leave either unset if the corresponding private channel does not exist yet.
5. Deploy the latest V1.3.1 GitHub \`main\` commit through Railway's existing connected GitHub deployment. If auto-deployment is enabled, inspect the latest deployment rather than clicking a second deploy.
6. Visit \`https://sbstore.info/health\` and check \`"version":"1.3.1"\`. Sign in: check the Member or Staff homepage appropriate to your Discord role. Test ticket creation and staff chat.
7. As an owner, visit **Admin Settings → Discord staff webhook**. Use **Test Staff Webhook**, **Test Admin Reports**, or **Test Owner Reports**. All are **no-ping** tests. Confirm the messages arrive in the intended private channels.

Member-uploaded profile images stay in \`/app/data/uploads\`, ticket media in \`/app/data/ticket-files\`, and all new messages and tickets in \`/app/data/app.sqlite\`. Do not change their persistent storage paths. An ordinary code redeploy does not delete correctly mounted volume data.

**Security:** the Chrome Safe Browsing warning previously observed for \`sbstore.info\` is a separate outstanding issue; investigate Google Search Console Security Issues before encouraging public traffic. Rotate leaked Discord bot, OAuth and webhook secrets and remove sensitive database history from public GitHub.

## V1.3.0: private ticket replies, @here webhook and final owner authorization

- Applicants and staff can reply privately on any application ticket. Staff notes and votes stay hidden from applicants. Reviewers may reopen a ticket to reply after submitting their optional vote, while it remains removed from their pending-review queue. Applicants see unread staff replies in **My Applications**.
- New applications send **@here** to the configured Discord staff-channel webhook. Applicant replies notify the staff channel, with @here limited to once per ticket per five minutes to avoid ping flooding. Staff replies and final decisions do not ping @here.
- Admin consensus now creates a **recommendation**, not a final decision. Two different admins must agree before **unk.sb** authorizes final acceptance/denial. Only after the configured owner's approval does the bot try to assign the accepted staff role. The owner may override to Deny or return the ticket for a fresh voting round. Existing finalized tickets remain finalized.
- **Owner → Final Approvals** lists tickets awaiting the final decision. **Admin Settings → Discord staff webhook → Test Webhook** is visible to owners and sends a no-ping test. All actions are audited.
- Set Railway Variable **FINAL_APPROVER_USER_ID** to unk.sb's **numeric Discord user ID**, not username. This gate fails closed if the ID is missing. The account also needs owner permissions: either be the verified Discord server owner or appear in **OWNER_USER_IDS**. Other admins and co-owners cannot bypass the explicit final approver ID check.
- The webhook must post in a **staff-only Discord channel**, and its integration must be permitted to mention @here. No applicant text is copied into webhook messages, and the Test Webhook button deliberately sends no @here.

### Updating on Railway without deleting live data

1. **Back up first.** In Railway, open the production `sbplayer-shop` service → **Backups** and make/verify a volume snapshot (and keep an independent backup if possible).
2. Check the Railway **Volume** is still attached at `/app/data`, and **Variables** includes `DB_PATH=/app/data/app.sqlite`. Uploaded images must be in `/app/data/uploads`.
3. Set `FINAL_APPROVER_USER_ID` and verify `OWNER_USER_IDS` only if unk.sb isn't already the actual Discord guild owner. Keep the secret webhook URL in `DISCORD_WEBHOOK_URL` and ensure `BASE_URL=https://sbstore.info`.
4. Deploy the updated GitHub `main` branch through Railway's connected GitHub deployment (automatic if enabled, otherwise choose **Deploy Latest**). **Do not delete or recreate the Railway service, volume or database. Do not switch DB_PATH to an ephemeral path.**
5. Open `/health` and confirm version `1.3.0`. Sign in as unk.sb, visit **Admin Settings → Test Webhook**, then check **Final Approvals**.
6. Existing applications, users, votes, sessions, profiles, posts, suggestions, audit, and uploads survive because this release adds only new tables and new optional columns to the same SQLite database on the existing volume.

**Warning:** If you deployed with an ephemeral database instead of the mounted volume, a rebuild will not preserve those old bytes. Confirm the path/mount and snapshot before upgrading. Before public promotion, clear any active browser security warning and rotate previously leaked bot/webhook credentials.

## V1.2.1 layout repair

V1.2.1 fixes oversized logo/avatar images and broken layouts caused by an old cached stylesheet. This release versions the CSS/JS/image asset URLs and serves styles/scripts with `Cache-Control: no-store`, so the browser cannot keep using V1.1 styles after upgrading. The sidebar SB logo is 44px; signed-in avatars are 32px in the header and 40px in the sidebar. The home hero image is at most 148px on desktop, smaller on tablets, hidden on narrow mobile screens. The mobile-only brand is hidden on desktop.

**Upgrade:** Stop the old server, extract V1.2.1 into a new folder, copy your existing `.env` and `data`. If your old deployment contains images in `public/uploads`, move those into `data/uploads` before switching versions. Keep them private. Run `npm.cmd run dev`, then press `Ctrl + Shift + R` once in your browser. Do not copy `.env` into a chat.

## Requirements

- **Node.js 22.13+** (Node.js **24.x recommended**; the original PC in this conversation runs Node 24.22.0).
- Discord developer application and an application bot installed on your server.
- Discord server Owner privileges for the initial owner audit; optional co-owner accounts can be granted from the site.
- On Windows, use **`npm.cmd`** rather than `npm` if PowerShell blocks `npm.ps1`.

This project uses **Node's built-in SQLite**. There are **zero third-party npm dependencies** and no `better-sqlite3` native build step. On Node 22 the SQLite API may produce an experimental warning; Node 24 is recommended.

## First launch on Windows

1. Extract the ZIP into a folder such as `C:\Users\spakk\Downloads\sbs-cams-community-v1.2`.
2. Open PowerShell in the extracted project directory.
3. If upgrading, **copy your existing `.env` and `data` folder from V1.1** into this directory while both servers are stopped. If you had images in the previous `public/uploads`, copy those files into `data/uploads` (not `public/uploads`) before launching this version. **Never share the `.env` file**. Do not overwrite the packaged `.env.example`.
4. If setting up new: `Copy-Item .env.example .env` then `notepad .env`. Add Discord IDs and credentials locally.
5. `npm.cmd install` — optional, but familiar; there are no external dependencies.
6. `npm.cmd test` — automated test suite (uses its own fake Discord adapter and temporary database, **not** your real Discord account).
7. `npm.cmd run diagnose` — checks your real bot/server/role access without printing tokens.
8. `npm.cmd run dev`
9. Open **http://localhost:3000** and sign in with Discord.

Or double-click `start-windows.bat` after configuring `.env`.

**Important:** V1.1's `node_modules` folder is no longer needed; don't copy it. Existing users, sessions (until expiry), and staff application records in `data/app.sqlite` are preserved. Legacy application status changes are imported into the owner audit as **legacy_import** records; events that V1.1 never tracked cannot be reconstructed.

## Configure your Discord application

1. Open https://discord.com/developers/applications and select your application.
2. In **OAuth2 → Redirects**, register `http://localhost:3000/auth/callback` exactly. If you change `BASE_URL`, update the redirect accordingly.
3. The website requests OAuth2 scopes `identify` and `guilds.members.read` when members sign in.
4. Enable **Guild Install** and add the application bot to SB's & Cam's Store. The bot's token belongs in `DISCORD_BOT_TOKEN` — **not in the browser**.
5. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent / Guild Members** for complete member search and the Team Members page (and complete member enumeration). Prefix searches or pagination may fail without it; site login can still work because it also uses a user-consented membership scope.
6. Grant the bot **Manage Roles** if it should assign accepted staff roles or let admins manage roles through the site. Drag the bot's highest role **above any staff roles it needs to assign**. It does not need Discord's Administrator permission.
7. Create a private staff-channel webhook and set `DISCORD_WEBHOOK_URL` to receive application and role-change notifications.
8. Discord's **server owner** is detected from the verified Guild API `owner_id`. The site does not trust any client-supplied owner flag.

### `.env` settings

The existing V1.1 settings remain supported:

| Key | Purpose |
| --- | --- |
| `NODE_ENV` | `development` locally, `production` on HTTPS deployment |
| `BASE_URL` / `PORT` | Public site URL and HTTP port |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth2 credentials (secret is private) |
| `DISCORD_BOT_TOKEN` | Bot token (private) |
| `DISCORD_GUILD_ID` | Your Discord server ID |
| `REVIEWER_ROLE_IDS` | Comma-separated reviewer Discord role IDs |
| `ADMIN_ROLE_IDS` | Comma-separated website admin Discord role IDs |
| `OWNER_USER_IDS` | Optional **co-owner user IDs** (NOT role IDs) who can access Owner Audit |\n| `FINAL_APPROVER_USER_ID` | **Required for final staff approvals:** unk.sb's numeric Discord user ID; never a username |
| `OWNER_ROLE_IDS` | Optional role IDs to mark **protected**, not to grant owner access |
| `PROTECTED_ROLE_IDS` | Additional sensitive roles never managed through the role tool |
| `TEAM_ROLE_IDS` | Optional additional roles to include in Team Members |
| `APPLICATION_ROLES` | Staff positions, e.g. `Helper,Moderator,Staff` |
| `APPLICATION_ROLE_IDS` | Optional mapping `Helper:123...,Moderator:456...`; can also configure in Admin Settings |
| `APPLICATIONS_OPEN` | Initial state (`true` or `false`), then persisted in database |
| `DISCORD_WEBHOOK_URL` | Optional staff-channel notifications (private) |
| `DISCORD_ADMIN_REPORT_WEBHOOK_URL` | Private admin-only Staff Report notification channel (never general staff) |
| `DISCORD_OWNER_REPORT_WEBHOOK_URL` | Owner-only notification channel for reports about admins and ambiguous cases |
| `DISCORD_INVITE_URL` | Optional server invite |
| `DB_PATH` | SQLite path, default `data/app.sqlite` |
| `TRUST_PROXY` | `0` locally; set only when your trusted deployment proxy requires it |

If `APPLICATION_ROLE_IDS` isn't specified, the application matches detected Discord role **names exactly** (case-insensitive). Use **Admin Settings → Role Mappings** to select the correct roles and avoid ambiguity.

## Permission model

| Action | Member | Reviewer | Admin | Owner |
| --- | :---: | :---: | :---: | :---: |
| Own applications, feeds, profiles, suggestions | ✓ | ✓ | ✓ | ✓ |
| Review pending staff applications | — | ✓ | ✓ | ✓ |
| Optional advisory reviewer vote | — | ✓ | ✓ | ✓ |
| Read other reviewers' identities/votes | — | — | ✓ | ✓ |
| Cast final admin decision | — | — | ✓ | ✓ |
| Assign safe roles / configure recruitment | — | — | ✓ | ✓ |
| See suggestion voter identities | — | — | ✓ | ✓ |
| View/export the full owner audit | — | — | — | ✓ |
| Grant/revoke website co-owner access | — | — | — | **Verified Discord server owner only** |

**Critical application rule (V1.3.0):** Reviewer votes are **optional**. **Two different admins must independently vote the same way** (both Accept or both Deny) before the application can be sent to **unk.sb for mandatory final authorization**. A split vote stays open until two admins agree. Only unk.sb's configured Discord user ID can finalize, deny, or return for review. Reviewers lose the ticket from the pending vote queue after voting, but can still access the private conversation. Applicants can read and reply only to their own tickets.

Only after unk.sb approves an acceptance recommendation, the app tries to assign the mapped Discord role. If Discord rejects the role assignment, the application remains `accepted`, the role delivery status says `failed`, and an admin can use **Retry role delivery** on that application. The failure and any retry are logged for owners.

### Role-management safeguards

The site fetches **all roles directly from Discord**, including hierarchy, permissions and color. It blocks role assignment/removal for:

- Roles with **Administrator**, **Manage Roles**, or **Manage Server** permissions.
- Roles referenced by `ADMIN_ROLE_IDS`, `OWNER_ROLE_IDS`, `PROTECTED_ROLE_IDS` and roles named like Owner / Admin / Management.
- Managed bot/integration roles, `@everyone`, roles at or above the bot's highest role.
- The server owner, protected co-owners, and member targets beyond the bot's hierarchy.

These security rules apply **on the server**, not only to the visible buttons. The bot also needs actual Discord permissions. All successful/failed attempts are audited.

## Community and profiles

- **Main Feed:** posts (up to 1,500 characters), optional images, likes, replies, reposts, and reporting. Profiles show the member's posts.
- **Suggestions:** distinct feed, title/body, one `Yes` or `No` vote per Discord member, public totals, vote switching/removal, public comments, and admin-only voter lists. Admins can mark `Under Review`, `Planned`, `Accepted`, `Declined`, `Implemented`.
- **Member directory:** live Discord username/nickname prefix search and Discord ID lookup. Limited fallback to users who have logged into the site if Discord's Guild Members Intent isn't available.
- **Team Members:** derives groups from detected Discord roles. Complete guild listing depends on the privileged Guild Members Intent; fallback may be incomplete and is explicitly labeled in the UI.
- **Profiles:** Discord identity, custom website name, status, pronouns, bio, avatar, banner, background image, accent palettes, themes, typography, layout, optional effects, external social links, follow counts, pinned post, editable/reorderable/show-hide custom sections, wall comments and privacy controls. Website customization does not modify Discord profiles. No arbitrary scripts, custom HTML or custom CSS are allowed.
- **Uploads:** PNG / JPEG / GIF / WebP detected by file signatures, maximum 4 MB, stored beside the SQLite database under `data/uploads` (under `/app/data/uploads` on Railway); only Discord-authenticated, currently verified members can open uploads. Images associated with private profiles are restricted to that profile owner.

## Owner-only audit

Open **Owner Audit Log** in the sidebar when signed in as the server's verified owner or an authorized co-owner. The audit includes staff page reads, write attempts, reviewer votes, individual admin decisions, final approvals, private notes, role changes and failures, suggestion moderation, profile edits, and access denials. Each record contains actor ID, permission level, event, target, outcome, timestamp, IP address and structured details. Secrets and OAuth/bot credentials are never recorded. Use **Export CSV** for the complete history, and verify the chained hashes with:

```powershell
npm.cmd run audit:verify
```

The chain detects modifications to **retained** rows; it cannot prevent someone with unrestricted filesystem access from replacing the entire DB and its backups. Set up protected off-machine backups and limit database filesystem access. Actions performed directly inside Discord are **not** collected by this site; for that you'd need a separate Discord event/audit-log ingestion feature.

## Railway persistent uploads and backups

1. Attach your Railway volume to the website service at **`/app/data`**, and set **`DB_PATH=/app/data/app.sqlite`** in Railway Variables. Member images are now stored under **`/app/data/uploads`** on the same volume as the SQLite database. Browser URLs remain `/uploads/<filename>` and are served by the existing authenticated route.
2. Before deploying this fix over an older live website that has existing uploaded images, **copy existing files from `/app/public/uploads` to `/app/data/uploads` while the old deployment is still running**. If the old container has already been replaced, images stored only on ephemeral disk may be gone. Verify the copy before removing anything.
3. Open the website service's **Backups** tab once the volume is attached. Enable **Daily**, and optionally **Weekly** and **Monthly**. Railway currently retains daily backups for 6 days, weekly for 27 days and monthly for 89 days. You may also create a manual snapshot.
4. Backups are incremental volume snapshots, not an offsite archive immune to deleting or wiping the volume. Keep occasional independent exports and test the restore procedure.

For migration, use Railway's authenticated CLI/SSH, and never expose the uploads folder through direct static-file serving. For SQLite, avoid copying only a live `.sqlite` file while WAL data might be pending; use a stopped-server or SQLite online backup.

## Backups and hosting

- **Before upgrading**, stop the server, back up `.env` privately and copy **the entire** `data/` directory (including its `uploads/` folder). For versions before this storage fix, also migrate any images from `public/uploads/` into `data/uploads/`. With SQLite WAL, copy the DB when the website is stopped, or make an SQLite online backup; avoid copying only an active `.sqlite` while WAL data is pending.
- Avoid storing the server in an automatically resetting cloud filesystem. SQLite data and uploaded images require **persistent storage**.
- For a public domain, use HTTPS with a secure reverse proxy, set `NODE_ENV=production` and `BASE_URL=https://your-domain.example`, and register the corresponding Discord OAuth2 redirect.
- Protect the `.env` and database at filesystem level; do not publish them in GitHub or a website folder.
- For a high-traffic public launch, add central rate limiting, external object storage, backups, observability, and load testing.

## Verification status

The package includes local automated tests (`npm.cmd test`) for the security-sensitive functionality: member-only access, reviewer queue, two matching admin decisions, admin-vote disagreement, automatic acceptance role assignment, protected Discord roles, public vs admin-only suggestion votes, profile customization, uploads, owner-only audit/co-owners, CSV, CSRF, and hash-chain verification. These tests run with a **fake Discord API**. Live Discord OAuth2, full guild member search, bot role hierarchy, webhook delivery, and deployment require validation using your server and newly rotated credentials.

## Safety note about previously shared credentials

A Client Secret, Bot Token and webhook URL were pasted into this conversation earlier. **Rotate/recreate all three before putting the website into live use**, then update your private `.env`. This ZIP contains **none of those values**.
