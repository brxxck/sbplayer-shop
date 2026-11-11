<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB's & Cam's Store — Community Portal V1.2.1

**Discord-authenticated staff applications, reviewer voting, admin consensus, Twitter-like posts, suggestions, customizable profiles, Team Members, Discord role management, and an owner-only tamper-evident audit.** The website retains the requested navy/electric-blue theme, supplied SB logo, and signed-in Discord username/avatar. This is a runnable starter project, **not a hosted website**.

## V1.2.1 layout repair

V1.2.1 fixes oversized logo/avatar images and broken layouts caused by an old cached stylesheet. This release versions the CSS/JS/image asset URLs and serves styles/scripts with `Cache-Control: no-store`, so the browser cannot keep using V1.1 styles after upgrading. The sidebar SB logo is 44px; signed-in avatars are 32px in the header and 40px in the sidebar. The home hero image is at most 148px on desktop, smaller on tablets, hidden on narrow mobile screens. The mobile-only brand is hidden on desktop.

**Upgrade:** Stop the old server, extract V1.2.1 into a new folder, copy your existing `.env`, `data` and, if applicable, `public/uploads`. Keep them private. Run `npm.cmd run dev`, then press `Ctrl + Shift + R` once in your browser. Do not copy `.env` into a chat.

## Requirements

- **Node.js 22.13+** (Node.js **24.x recommended**; the original PC in this conversation runs Node 24.22.0).
- Discord developer application and an application bot installed on your server.
- Discord server Owner privileges for the initial owner audit; optional co-owner accounts can be granted from the site.
- On Windows, use **`npm.cmd`** rather than `npm` if PowerShell blocks `npm.ps1`.

This project uses **Node's built-in SQLite**. There are **zero third-party npm dependencies** and no `better-sqlite3` native build step. On Node 22 the SQLite API may produce an experimental warning; Node 24 is recommended.

## First launch on Windows

1. Extract the ZIP into a folder such as `C:\Users\spakk\Downloads\sbs-cams-community-v1.2`.
2. Open PowerShell in the extracted project directory.
3. If upgrading, **copy your existing `.env` and `data` folder from V1.1** into this directory while both servers are stopped. Also copy the old `public/uploads` directory if you had uploads from a more recent build. **Never share the `.env` file**. Do not overwrite the packaged `.env.example`.
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
| `OWNER_USER_IDS` | Optional **co-owner user IDs** (NOT role IDs) who can access Owner Audit |
| `OWNER_ROLE_IDS` | Optional role IDs to mark **protected**, not to grant owner access |
| `PROTECTED_ROLE_IDS` | Additional sensitive roles never managed through the role tool |
| `TEAM_ROLE_IDS` | Optional additional roles to include in Team Members |
| `APPLICATION_ROLES` | Staff positions, e.g. `Helper,Moderator,Staff` |
| `APPLICATION_ROLE_IDS` | Optional mapping `Helper:123...,Moderator:456...`; can also configure in Admin Settings |
| `APPLICATIONS_OPEN` | Initial state (`true` or `false`), then persisted in database |
| `DISCORD_WEBHOOK_URL` | Optional staff-channel notifications (private) |
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

**Critical application rule:** Reviewer votes are **optional** and never needed to finalize. **Two different admins must independently vote the same way** (both Accept or both Deny) before the application is finalized. A split vote remains open until two admins agree. Each admin can vote once per application. Reviewers lose the ticket from their pending queue as soon as they submit a vote. Members can access only their own application list.

On acceptance, the app immediately tries to assign the mapped Discord role. If Discord rejects the role assignment, the application remains `accepted`, the role delivery status says `failed`, and an admin can use **Retry role delivery** on that application. The failure and any retry are logged for owners.

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
- **Uploads:** PNG / JPEG / GIF / WebP detected by file signatures, maximum 4 MB, stored under `public/uploads`; only Discord-authenticated, currently verified members can open uploads. Images associated with private profiles are restricted to that profile owner.

## Owner-only audit

Open **Owner Audit Log** in the sidebar when signed in as the server's verified owner or an authorized co-owner. The audit includes staff page reads, write attempts, reviewer votes, individual admin decisions, final approvals, private notes, role changes and failures, suggestion moderation, profile edits, and access denials. Each record contains actor ID, permission level, event, target, outcome, timestamp, IP address and structured details. Secrets and OAuth/bot credentials are never recorded. Use **Export CSV** for the complete history, and verify the chained hashes with:

```powershell
npm.cmd run audit:verify
```

The chain detects modifications to **retained** rows; it cannot prevent someone with unrestricted filesystem access from replacing the entire DB and its backups. Set up protected off-machine backups and limit database filesystem access. Actions performed directly inside Discord are **not** collected by this site; for that you'd need a separate Discord event/audit-log ingestion feature.

## Backups and hosting

- **Before upgrading**, stop the server, back up `.env` privately and copy **the entire** `data/` directory plus `public/uploads/`. With SQLite WAL, copy the DB when the website is stopped, or make an SQLite online backup; avoid copying only an active `.sqlite` while WAL data is pending.
- Avoid storing the server in an automatically resetting cloud filesystem. SQLite data and uploaded images require **persistent storage**.
- For a public domain, use HTTPS with a secure reverse proxy, set `NODE_ENV=production` and `BASE_URL=https://your-domain.example`, and register the corresponding Discord OAuth2 redirect.
- Protect the `.env` and database at filesystem level; do not publish them in GitHub or a website folder.
- For a high-traffic public launch, add central rate limiting, external object storage, backups, observability, and load testing.

## Verification status

The package includes local automated tests (`npm.cmd test`) for the security-sensitive functionality: member-only access, reviewer queue, two matching admin decisions, admin-vote disagreement, automatic acceptance role assignment, protected Discord roles, public vs admin-only suggestion votes, profile customization, uploads, owner-only audit/co-owners, CSV, CSRF, and hash-chain verification. These tests run with a **fake Discord API**. Live Discord OAuth2, full guild member search, bot role hierarchy, webhook delivery, and deployment require validation using your server and newly rotated credentials.

## Safety note about previously shared credentials

A Client Secret, Bot Token and webhook URL were pasted into this conversation earlier. **Rotate/recreate all three before putting the website into live use**, then update your private `.env`. This ZIP contains **none of those values**.
