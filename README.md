<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB's & Cam's Store — Community Portal V1.18.2

**Discord-authenticated staff applications, reviewer voting, admin consensus, Twitter-like posts, suggestions, customizable profiles, Team Members, Discord role management, and an owner-only tamper-evident audit.** The website retains the requested navy/electric-blue theme, supplied SB logo, and signed-in Discord username/avatar. This repository powers the Railway-hosted website and also supports local Node development.

## V1.18.2 — Ticket numbers and SBsxScam applications in ticket lists

- Fix the support ticket heading rendering `#\${ticket.id}` literally. The actual ticket number now appears in the visible heading and browser title.
- Show **SBsxScam team applications** in the shared staff **Active Cases / All Tickets** queue, with their own `TA-<id>` identifier, status, and link to the protected team review detail. Only verified website administrators/owners and role-authorized team recruiters can see the recruitment cases there. Ordinary reviewers still cannot view or open private team applications.
- Show each user's own team applications under **My Tickets**, including accepted and denied applications; this is their existing applicant-only detail page, not a staff review link.
- Include active team applications in the authorized staff dashboard. Count recruitment cases separately from support, ordinary staff applications, and promotion tickets.
- Team application statuses and unread counts are handled independently of support-ticket chat messages; private recruiter notes remain restricted to the existing leadership route.
- Add browser-level tests for literal ticket IDs, case queues, owner/admin/reviewer privacy, applicant history, and the Active versus All filters.
- No schema changes, new dependencies, permissions expansion, or deletion of existing ticket/application data.
- After merging and Railway deployment, confirm `/health` reports `1.18.2`. Check the existing `/app/data` volume and test one private team application with an admin/owner account plus its original applicant.

## V1.18.1 — Search, date validation and release consistency

This patch builds on V1.18.0 without replacing its data or permissions. Searches for messages, suggestions, MegaSMP transactions and owner audit records now treat `%`, `_` and backslashes as literal user-entered characters instead of SQL wildcard patterns. Date filters reject impossible calendar days and reversed ranges; the same validation applies to the owner audit. Release version, package lockfile, static asset URLs and health endpoint are synchronized. No new database migrations or dependencies. Details: [RELEASE-V1.18.1.md](RELEASE-V1.18.1.md).

## V1.18.0 — Community, messaging and staff upgrade

This build implements the consolidated interface and correctness upgrade. See [RELEASE-V1.18.0.md](RELEASE-V1.18.0.md) for scope, migration behavior and the checks still required on Railway. Production deployment is not verified by local test results.

- Group navigation into Community, People, MegaSMP, Support, Staff, Administration and Owner. Keep account activities within profiles; retain the notification bell and unread Messages shortcut. Add a keyboard-accessible page finder and compact mobile navigation.
- Correct Active Cases counts and add per-staff unread activity, reply-derived waiting states, queue search/type/status filters, urgency/age ordering, application timelines and a shared Applications entry point.
- Close implemented/declined suggestion voting on the server, preserve votes, and add status explanations/history plus search, status filters and sorting.
- Add two-pane desktop messaging, single-pane mobile threads, participant-authorized history pagination/search, removable upload previews, draft preservation and optional browser alerts.
- Add a paginated Transactions view with manual/captured source filters, player/date/type filters and exact amounts. Keep source records independent; unknown source dates are never substituted with capture times.
- Improve profiles, member discovery, role presentation, attachment controls, failed-form feedback, notification browsing, owner audit filtering/pagination, responsive layouts and reduced-motion support.
- Preserve Phase 1 approval/repost fixes, existing SQLite records, uploads and audit chains. New tables are additive. Before this release's additive migration in production, create a consistent SQLite snapshot next to the database as `<DB_PATH>.pre-v118.backup` if absent.
- Keep one Railway application replica: live presence, rate limits and the SSE bus are process-local. Use the existing persistent volume for both database and uploads.

## V1.12.0 — Phase 1: Correctness and Trust

- Correct the broken **Message** icon on member profiles; the Discord-verified POST form remains CSRF-protected.
- Ensure final owner decisions take precedence over historical admin recommendations in the application UI. Show a clear final outcome/date; do not claim finalized tickets are still awaiting unk.sb.
- Once two distinct admins reach consensus, disable conflicting interview and optional reviewer votes both in the page and on POST routes. Hide owner-pending tickets from reviewer queues, and display **Awaiting owner** in the admin queue. Existing owner approval and required role-delivery checks are preserved.
- Render the **original author, text and media within repost cards** in the feed, post details, saved posts and profiles. Source data is looked up using a left join, escaped before HTML rendering, and omitted for deleted originals with a safe unavailable placeholder. Nested reposts remain disallowed.
- Display prominent **NOT LIVE / saved snapshot** provenance, source freshness, partial roster coverage and bank-data caveats throughout MegaSMP. Top 10 positions come from InPvP's captured ranking, not from sorting bank balances. Keep labels consistent during AJAX refreshes.
- Maintain the previously merged V1.11.1 motion polish and version-aware asset caching. Bump all CSS/JS URLs to \`1.12.0-phase1\` so clients receive the updated assets. No new dependencies or database migrations.
- Tests cover profile HTML, escaped repost content, deleted originals, locked approval actions, final status precedence, privacy checks and snapshot banners.
- **Deployment:** Before a Railway production rollout, back up persistent \`/app/data\`, check \`/health\` returns \`1.12.0\`, and verify owner approval, two-browser message delivery, reposts and the MegaSMP data labels.

## V1.11.1 — Polished motion, smoother messages and safer asset caching

- Add `public/polish.css`, adapted from the supplied SB Store polish layer: subtle feed action feedback, new-post animations, DM bubble transitions, off-screen feed rendering, mobile navigation snapping and improved focus rings. The original dark-blue visual theme remains unchanged.
- Preserve `prefers-reduced-motion`, and only pulse the live indicator when actually connected; reconnection displays a non-pulsing amber dot.
- Replace the inbox full-page reload with an authenticated `/messages/inbox-updates` HTML fragment refresh that retains the conversation filter and unread counters.
- Edit and delete DM bubbles in place without a hard refresh. Message revision stamps prevent old edits/deletions from repeatedly replaying animations.
- Cache CSS and JS as `public, max-age=31536000, immutable` **only for the exact current `?v=1.11.1-polish` URL**. Unversioned and stale-version asset requests remain `no-store`. The HTML and private ticket/message endpoints retain their existing privacy headers.
- Required on every future asset change: bump `assetVersion` in `src/views.js` so clients do not reuse stale CSS/JS. There are no database migrations or new dependencies in this release.
- Verify with `npm test` and confirm `/health` reports `1.11.1`. This change does not include a standalone clickable before/after preview.

## V1.11.0 — Live Community and Private Messaging

- **Real-time live events:** authenticated Server-Sent Events carry non-sensitive activity signals for the Main Feed, private message inbox, notification badges, online status, and staff chat. All protected content is re-fetched by each signed-in participant via authorized endpoints.
- **Main Feed:** new posts arrive automatically at the top; if you're reading older posts, a banner queues new posts without losing your scroll. Like/repost/comment counts are refreshed in place, with a fallback sync every 20 seconds.
- **Private 1:1 DMs:** a Messages area and a Message action on member profiles, with persistent threads, image attachments (up to three per message), typing indicators, read receipts, message edits (15-minute window), delete, search by known username or Discord ID, unread counts, block and report tools.
- **Privacy:** membership-required access, immutable thread participant authorization, conversation content excluded from global events, CSRF validation, participant-only download links, recipient controls for new message requests, invisible presence, optional read receipts, and staff access only to explicitly reported message snapshots.
- **Online status:** active, away and offline states tracked via the site's own browser heartbeats. Invisible users always render offline. This does not reflect Discord or Minecraft presence.
- **Safe migration:** creates additive \`dm_*\` SQLite tables without modifying existing tickets, posts, profiles, verified Xbox gamertags, audit history, or MegaSMP snapshots. Existing Railway DB and uploads must remain on persistent storage.
- **Deployment constraint:** the SSE bus and presence map are local to **one** Node server process. Do not scale Railway to multiple replicas until a shared broker and coordinated presence store are introduced.
- **Degradation:** existing server-rendered pages, forms and authenticated HTTP routes still work without SSE; the browser performs fallback refreshes for open pages.
- **Validation:** run \`npm test\`, check \`/health\` responds with \`1.11.0\`, then verify two real Discord members exchanging messages and browsing the live feed on separate sessions. Back up the persistent volume before deployment.

## V1.9.2 — Fix the Microsoft/Xbox button returning to SBStore

- Replace the Microsoft/Xbox link's HTML POST form with a **normal one-click GET navigation** in the account dropdown and Connected Accounts card. The signed-in session, rate limit, PKCE and single-use OAuth state still apply; `Sec-Fetch-Site: cross-site` starts are rejected.
- Avoid the cross-site redirect restriction some browsers apply to POST form chains, even when Microsoft was explicitly allowlisted under `form-action`. Existing POST routes remain available only for older cached pages and still require CSRF.
- Microsoft OAuth error callbacks previously treated **all errors as cancellation**, immediately redirecting to profile settings. They now report a safe known error category on a dedicated `/profile/microsoft/result` page with clear remediation and a Retry Microsoft link. No OAuth codes, error descriptions or tokens are reflected into HTML or logs.
- Keep Link Microsoft positioned directly below the avatar and username and above MY PROFILE. No changes to InPvP data, Railway encryption keys, team bank, Discord staff access or verified gamertag storage.
- Profile assets now use `1.9.2-xbox-get` to bypass cached page scripts/CSS. Verify the production health version reports `1.9.2` after Railway deploy.
## V1.9.1 — Working Microsoft link in profile dropdown

- The top-right account menu now places **Link Microsoft / Xbox** immediately beneath the member avatar/Discord name and **above MY PROFILE**, including mobile layouts. Linked accounts show their verified gamertag and a **Verify Microsoft / Xbox** action.
- The new menu form submits directly to the existing authenticated `/profile/microsoft/start` route using a CSRF token. If Railway's three Xbox app variables are absent, the action is clearly marked unavailable, rather than silently doing nothing.
- Allow `https://login.microsoftonline.com` as the only new external origin in the browser's `form-action` Content Security Policy. A POST redirect to Microsoft OAuth could previously be blocked by `form-action 'self'`, leaving users on the same screen. All other external form destinations remain prohibited.
- Added regression checks for menu placement, linked and disabled states, CSRF and the configured 303 redirect. No InPvP login/data changes; no Microsoft tokens stored.
- After deploying, hard-refresh the website and click the account dropdown's new button. The live Microsoft/Xbox identity verification flow still depends on Microsoft permitting your app to use Xbox services.
## V1.9.0 — Verified Xbox gamertag linking on Discord profiles

**Scope:** Username/account linking only. No new InPvP data enrichment, shared login sessions, private team access or bank collection.

- A signed-in member can use **Connected Accounts → Microsoft / Xbox** on My Profile or Edit Profile. The verified Xbox gamertag appears on their website profile and is used for existing MegaSMP name-to-Discord profile links.
- Microsoft Entra consumer OAuth with authorization code + PKCE, short-lived per-session state and the `xboxlive.signin` scope; subsequent Xbox user token, XSTS and official profile response validate the gamertag. A gamertag is not proof of a Minecraft purchase.
- **No Microsoft/Xbox tokens or passwords are retained.** Only a verified gamertag and a site-keyed HMAC of the transient Xbox identity are persisted for one-to-one uniqueness. Raw XUIDs are not stored. No Discord roles or session permissions are granted.
- One Xbox account per Discord profile. The member can unlink; identity and gamertag conflicts are rejected. Profile-link actions are recorded in the owner-only tamper-evident audit. Holder-verified Xbox matches supersede older manual and InPvP name associations for display.
- New Railway variables: `XBOX_LINK_CLIENT_ID`, `XBOX_LINK_CLIENT_SECRET`, and a 32+ character stable `XBOX_LINK_ACCOUNT_KEY`. Register a **personal Microsoft accounts only** Web callback at `https://sbstore.info/profile/microsoft/callback`. This is separate from the existing owner-only Microsoft Graph tool.
- The feature remains disabled until credentials are configured. The web UI explains setup status without exposing any credentials. Xbox service/profile access may require Microsoft provisioning; if the API cannot verify a gamertag, the link is not created.
- Existing Discord OAuth, Railway volume and database, InPvP public profile matching, Top 10 ranks and bank history remain untouched.
## V1.8.4 — Automatic Discord profile matching from InPvP member lists

- Every captured Minecraft member name enters a **staggered, read-only public InPvP profile scan queue** (20-second scheduler, sharing the existing Chromium browser with the Top 10 reader). Example: \`https://inpvp.net/mineville/profile/SBisOnTop\` shows a voluntarily linked Discord badge such as \`@unk.sb\`. A public profile is checked only after it appears in a verified team roster.
- Source extraction only uses the normal page header and linked Discord badge; it never reads OAuth tokens, browser storage, passwords, hidden server APIs or untrusted profile biographies. InPvP documentation says the Discord username field is voluntarily linked by the profile owner.
- Matches require a **current Discord guild member** whose actual Discord username exactly matches the InPvP handle, or an exact linked Discord ID (if exposed by InPvP). Nicknames, display names, fuzzy matches, bots and pending/nonmember accounts cannot link automatically.
- Once matched, the verified Discord member gets a **normal public website profile** if one does not already exist; no login session, role, or staff privilege is created. A Minecraft name then links to \`/u/<Discord ID>\` throughout the team and bank-history UI.
- Store automatic links separately from owner-entered global/season links; **owner overrides have priority**. Owner unlink disables further auto linking for that name; owner can re-enable it from \`/mega-team/links\`. All successful automatic links are tamper-evidently audited and labeled as InPvP-sourced in the owner UI.
- Backoff on profile unavailable/undisclosed Discord IDs; never guess identities from follower lists or free-text mentions. Refresh old automatic associations daily without overwriting conflicting Discord IDs.
- Retain existing Railway database mount, encrypted InPvP session, five-minute SBsxScam bank collector, Top 10 balance data and ranked teams. Live InPvP badge markup and actual matching must be confirmed after Railway deployment.

## V1.8.3 — Team bank balances and complete member-name capture

- Restore the **bank balance** column alongside rank and team on the Top 10 page. Keep the current verified InPvP source value, including compact units like \`$1.0B\`. Also display team bank and placement on each team page. Values are labeled "Not available" rather than fabricated if InPvP does not expose them.
- Expand the normal, authenticated InPvP team Member section, including visible Members tabs, "Load more" / "Next" controls and virtualized scrolling. Bounded by 36 page actions and the existing staggered one-team-at-a-time browser worker; no unofficial API access or authentication bypass.
- Track source-listed member total versus **actual distinct names** captured. "All N member names captured" is shown only when a verified member section exposes exactly N names. Otherwise the page shows "X of N captured" and a partial/unavailable note, never invented roster members.
- New idempotent \`roster_complete\` and \`roster_observed_at\` columns record coverage without deleting saved observations. A partial/failed refresh must not overwrite a previously complete or larger roster. Linked Minecraft names still open the owner's chosen Discord website profile.
- Keep SBsxScam's existing five-minute bank-event collector and ledger, all prior 142 event observations, historical team IDs, stored InPvP session and Railway \`/app/data\` volume unchanged. Team pages still do **not** display unsupported deposits, withdrawals or per-player bank histories.
- Actual full member coverage is contingent on InPvP exposing member names and pagination in a permitted website session. Deploy, then confirm coverage against the source member count; automated CI passing alone does not verify live roster availability.

## V1.8.2 — Simple Top 10 and player-only team pages

- The **Top 10 leaderboard is lightweight**: verified placement, team name and the team's real official InPvP link. Removes the empty/duplicate bank, level, view and member-stat columns from this table. One-minute leaderboard discovery and automatic identification of new teams stay enabled.
- Every individual Top 10 team page is focused on **real player names and team roles**, where a visible InPvP member list is available. A linked Minecraft name opens the corresponding Discord profile. A known count (such as Abaddon's 21 members) does not become 21 invented players.
- If InPvP does not expose member names to the collector, the page displays **one concise availability note** instead of blank financial cards, contribution totals or an empty bank-event table.
- Other teams' details **do not scan bank events or contributions**. The original SBsxScam dashboard at `/mega-team` retains its existing working five-minute bank reader, current snapshots, and 142 previously captured events, unchanged.
- Roster reads remain staggered approximately 30 seconds apart with a five-minute per-team target. Captures come only from the normal visible InPvP website, without undocumented APIs or challenge bypasses.
- No new database migration is needed. Existing Railway volume, `DB_PATH`, encryption key, account links and saved source records remain intact. Automated tests cover observed vs unavailable rosters and simplified pages. Real team-name availability still requires Railway verification.

## V1.8.1 — InPvP Top 10 loading, fallback and diagnostics

- Expanded the official rendered leaderboard parser to understand HTML tables, accessible rows, CSS-grid rows and the visible text sequence (rank, team, views, bank, level). Parsing still requires **all ten ordered positions** and never invents unobserved rankings.
- Allow extra time for InPvP client-side data hydration (bounded retries); no requests to undocumented or internal APIs and no verification bypass.
- Failure logs now include **privacy-safe counts and readiness flags only**, e.g. `[mode=upstream-sync,rows=0,dom=0,text=0,table=0,role=0,styled=0,sync=true,columns=false]`. Names, tokens and page contents are not logged.
- The detail collector can read the **ten preconfigured official team URLs even when the public Top 10 list is stuck syncing**. Those team names remain **Unverified** for rank until the directory successfully loads; individual observed stats can appear independently.
- The primary SBsxScam bank collector, encrypted session, Railway volume, permissions and Discord links remain unchanged.
- A successful syntax/test build cannot prove the live InPvP DOM works. After deploying, inspect the `[Mega Top10]` readiness diagnostics and team-detail results. A persistent `mode=upstream-sync` means InPvP itself did not render the directory in the collector's browser.

## V1.8.0 — Standalone MegaSMP Top 10, staggered source checks, linked profiles

- **Standalone MegaSMP portal:** `/mega-team` is a navigation destination, no longer a fourth tab inside Team Members. `/team?tab=mega` redirects to `/mega-team` for old bookmarks. Existing administrative and historical `/team/mega/*` endpoints remain compatible.
- **Ranking and team profiles:** `/mega-team/leaderboard` lists the current verified Top 10 with clickable rank and team entries. `/mega-team/teams/<id>` shows a team's InPvP source URL, bank, level, views, available roster members and **observed** bank activity. Any unavailable values are labeled **Not recorded**; captured events are not lifetime totals.
- **Team URL discovery:** Initial Abaddon, SBsxScam, Abyzz, Abraxas, Auryn, MEOWxD, richmans, Zr0, LandLords and IFranceI URLs come from owner-provided references, **without fabricating live ranking positions**. The browser collector checks the rendered official InPvP leaderboard every minute and learns newly appearing IDs from official links or visible team-name navigation. Incomplete/unverifiable listings never replace the last verified Top 10. The live DOM extraction still requires a Railway end-to-end validation.
- **Staggered updates:** A shared, opt-in Chromium worker checks at most one team detail roughly every 30 seconds and limits per-team detail attempts to once in five minutes. The client refreshes saved rankings through an authenticated, same-origin endpoint, never scraping InPvP from users' browsers. A missed check doesn't invent source changes.
- **Minecraft ↔ website profiles:** Only verified owners/co-owners can associate a Minecraft Gamertag with a verified Discord account at `/mega-team/links`. Linked names in MegaSMP rosters and event history open `/u/<Discord ID>`. Links are audited, editable/removable, and **not** proof of Minecraft account ownership or a grant of Discord permissions.
- **Non-destructive migration:** New SQLite tables supplement the existing data; do not reset the existing Railway `/app/data` volume, encryption key, or `DB_PATH`. Back up the current Railway volume before deploying. InPvP collection remains gated by `MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED=true` and `MEGA_TEAM_BROWSER_AUTO_START=true`, and depends on Playwright Chromium (`Dockerfile.mega`).
- **Live verification required:** Check Railway `[Mega Top10]` messages, the initial "Reference links" status transitioning to "Latest verified listing", current positions and each team's source URL. If InPvP's page changes or blocks collection, the website retains saved snapshots rather than claiming fresh data.

## V1.7.8 — Fix collector startup crash (invalid regular expression)

- Fixed the invalid escaped URL/token redaction patterns in `scripts/mega-bank-browser-worker.js` that made Node fail before the Playwright browser could start. A saved encrypted InPvP session alone cannot produce data while the worker is crashing.
- GitHub Actions now runs `node --check` against **every JavaScript file** in `src`, `scripts`, and `test` before running the test suite so worker syntax failures cannot be missed when the worker is disabled in tests.
- Does not alter session files, encryption keys, existing Railway volume, team data, or collection cadence. Check Railway logs for a successful collector start and the next capture; page-data issues may remain separately.

## V1.7.7 — Fix InPvP browser-session pairing

- Fixed the InPvP localStorage name validator incorrectly rejecting normal keys containing letters and digits due to an escaped regular expression. This caused `Pairing failed: Invalid InPvP storage entry.` during the **local** handoff.
- Storage keys such as `user`, `accessToken`, and `auth0.state` are now accepted; control characters remain rejected. If a value really exceeds 64 KiB, the user gets a separate, non-secret size error.
- Microsoft cookies and non-InPvP browser origins are still excluded; the owner-only 10-minute pairing code, encryption-at-rest, and read-only five-minute collector remain unchanged.
- Update the website source **both on Railway and locally**; old local ZIPs retain the incorrect validator. Generate a fresh one-time code if the previous one has expired. Tests include realistic storage names and malformed entries.

## V1.7.6 — Private InPvP login pairing and encrypted automatic team-data session

- Private owner/co-owner route: `/owner/mega/session`. Never appears in public navigation.
- Owner creates a 10-minute, one-use setup code. Local Playwright Chromium signs in on InPvP with Microsoft's official flow, then sends only `inpvp.net` website storage over HTTPS to SB Store.
- The server saves the filtered InPvP session encrypted with AES-256-GCM on the **existing** Railway volume, under the SQLite directory. The key stays in Railway configuration.
- The five-minute read-only browser collector loads this encrypted session in a memory-only Chromium context. After a successful capture, it can retain legitimate InPvP session updates without overwriting newer owner imports.
- Explicit disconnect removes the encrypted local session. Public admins, reviewers, and ordinary members cannot generate pairing codes or access the owner pages.
- This **does not** save a Microsoft refresh token or promise perpetual authentication. InPvP sessions may expire, and the collector still depends on verified real website DOM/permissions.
- Setup and safe deployment: `docs/INPVP_PERSISTENT_SESSION.md`. Keep the current Railway service and `/app/data` SQLite volume; back up before deployment. No destructive database migrations.

## V1.7.5 — Diagnose Railway's actual InPvP Event Log view

- Railway V1.7.4 shows SBsxScam's roster and bank balance but no Event Log. Rather than guessing another live selector, this release adds a privacy-safe diagnostic report for the *actual* Chromium page: whether the body/main contain Event Log, whether Bank controls are present, rendered page height/scroll depth, page readiness, and counts of unsuccessful same-origin fetch/XHR requests and runtime page errors. No player data, query-string URLs, cookies, headers or error bodies appear in these logs.
- The normal collector tries a native Bank control with exact text even if it lacks an accessibility label. The scrolling helper recognizes short Event Log headings in non-heading elements.
- On capture failure, the worker saves one private screenshot of its real rendered page to the **existing** persistent SQLite volume (e.g., `/app/data/mega-bank-last-failure.png`); a successful capture clears that failure image.
- The screenshot is available **only to a Discord-verified website owner** signed into this portal at `/owner/mega/collector-screenshot.png`. Ordinary members, reviewers, and admins are denied; the image is not stored in public uploads and is sent with `Cache-Control: private, no-store`. It may include what the InPvP browser actually showed, so do not share it publicly.
- Tests cover the owner-only route, missing images, exact native Bank selector, and diagnostic error sanitization. No existing team or application data is reset, and no Railway variables need changing.
- **This is a diagnostic and locator hardening update, not proof of a working live feed.** Next investigation should use both the fresh `[Mega bank][diagnostics]` line and the owner-only screenshot. Do not repeatedly deploy unverified selector guesses or fabricate financial activity.

## V1.7.4 — Public InPvP team Event Log below-the-fold fix

- Screenshot-confirmed behavior: the signed-out SBsxScam team page displays a team overview and Members (22), followed lower down by an Event Log. The Bank filter showed 142 events and All showed 476 in the user-provided images; these counts are **reference observations**, never seeded as live data.
- The collector scrolls the normal public page through its lower sections, in bounded steps, waiting for a real Event Log heading to render before finding the Bank control. This addresses the Railway log `Team detail view unavailable: directory loaded without Event Log` when the detail section is lazy-loaded below the initial viewport. The collector does not call undocumented endpoints, bypass authentication/challenges or fabricate rows.
- Event extraction handles in-line player/action nodes that may render as `GermanBurgersDeposited` with no visible whitespace in the DOM text.
- Bank balance parsing preserves compact units. The screenshot's `$40.3M` is interpreted nominally as `$40,300,000` and labeled **approximate**; it is not mis-stored as `$40.30` or presented as an independently exact balance. Labels live in a new additive table, preserving prior SQLite data.
- The roster extractor recognizes headings such as `Members (22)` and only trusts explicit player attributes/profile links. It never infers full membership from bank activity.
- Additional tests validate scrolling behavior, bounded retries and compact balance units. Railway variables stay unchanged. Actual live success still requires verification from Railway's new `[Mega bank]` logs after deployment.

## V1.7.3 — Event Log parent navigation and missing-data diagnostics

- After opening the configured SBsxScam team URL, the collector first checks for Bank, then attempts the **Event Log** parent view (tab, button, link or visible label), then finds the Bank sub-tab. It allows bounded client-side loading delays before deciding the tab is missing.
- If Bank Event Log rows are already visible, the collector can read them without clicking an unnecessary tab; it does not bypass sign-in, CAPTCHA, consent or site restrictions.
- A missing tab now produces an actionable, privacy-safe reason distinguishing an unavailable team detail page from a visible but unrecognized Event Log/Bank UI. No page contents, cookies or user credentials are logged.
- Roster and balance observations from before/after the tab switch are preserved where available; the existing captured transaction ledger and all other website data are unchanged.
- Added automated tests for parent-to-child navigation, already-selected parent controls and missing detail page diagnostics.

**Operational note:** Actual InPvP Bank Event Log structure and session requirements remain unverified from this environment. If the next Railway log reports that the team detail view is unavailable, the collector cannot create transactions from an empty page; the authenticated browser profile and/or real page markup must be inspected. Existing `MEGA_TEAM_BROWSER_*` and Dockerfile variables remain unchanged.

## V1.7.2 — Bank tab interaction timeout fix

- Fix the live Railway collector stopping at `getByRole('button', {name: /^Bank$/i}).click()`: it now checks all visible matching controls instead of assuming the first Bank button is actionable.
- The collector recognizes an already selected tab and tries a standard keyboard Enter activation when a visible, enabled control cannot be clicked. It does **not** force-click, bypass verification challenges, inject JavaScript events, or click disabled controls.
- Failures now report a bounded, descriptive reason (such as a disabled or blocked Bank tab), instead of only truncating a generic Playwright timeout. Successful collection remains subject to the actual page layout and login state.
- Added regression tests for a pointer click timeout, keyboard fallback, a selected tab and a disabled control. No database migration; existing Railway /app/data, Discord data, and website permissions are unchanged.

## V1.7.1 — opt-in live bank capture and connected dashboard

- Fixed the missing worker startup path: the website can start an independent Playwright worker when `MEGA_TEAM_BROWSER_AUTO_START=true` and `MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED=true`. The worker shares the existing `DB_PATH` (Railway's existing `/app/data` volume), restarts after a failure, and never blocks the website.
- Fixed the missing financial integration: captured bank events now appear in a dedicated **Captured bank activity** section and provide per-player **observed** deposit/withdrawal totals. These amounts are **not added** to manual ledger totals or imported cumulative totals, to avoid double counting.
- Browser-collected roster entries and bank balance are stored separately, with source labels and freshness; the browser roster is only an observation, not a guaranteed complete current in-game roster. A bank balance is only shown when the page exposes a recognisable labelled amount.
- The dashboard displays the last successful browser capture and the most recent collector error (if any). `/health` reports version 1.7.1 and whether the browser collector is configured, not whether a live capture succeeded.
- Added automated checks for event deduplication, display separation, cents, and disabled startup. The Bank tab's actual live DOM and complete membership information still require an authorized end-to-end test.

**Deployment prerequisites (required for actual live data):**

1. In an isolated test, confirm the approved InPvP team page's Bank tab, event rows, pagination, login session, roster, balance, and completeness boundaries. The collector is read-only; do not bypass sign-in or bot challenges.
2. Use Node.js 22+ with Playwright and Chromium installed, or opt into the included `Dockerfile.mega` via the Railway service Dockerfile setting. The existing npm install without this builder does not install a browser.
3. Preserve Railway's existing persistent volume `/app/data`. Set `DB_PATH=/app/data/app.sqlite` **only if that is the existing database path**. Do not create a new empty database or move the volume.
4. If the page requires a login, the worker needs a persistent authenticated Chromium profile. Store `MEGA_TEAM_BROWSER_PROFILE_DIR` on the same private persistent volume; create/login locally in a private test environment before production. Never commit cookies or upload a browser profile to GitHub.
5. After calibrating actual live selectors, set `MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED=true` and `MEGA_TEAM_BROWSER_AUTO_START=true`. Leave both off until tested. If needed, set `MEGA_TEAM_BANK_ROW_SELECTOR` to the verified CSS row selector.
6. Verify `/health`, the dashboard's browser-capture timestamp and errors, and a single small known bank event before treating the connection as operational. Cached events are partial history, not guaranteed lifetime values.

**Important:** Deploying this version alone does not make InPvP live data appear. The browser runtime, accessible page/session, verified selectors, and two opt-in flags are mandatory. Unavailable values remain unknown rather than being filled with guesses.

## V1.7.0 — Captured Bank History and Owner-only Minecraft/Discord Matching

- **Complete stored-history browsing:** `/team/mega/history` presents every *captured* InPvP Bank Event Log transaction using 50-record pages, player/season/type filters, exact amounts (including cents), and linked Discord profiles. Historical coverage is labelled partial until the upstream source is verified complete; unlike the old summary, the history page has no 100-row viewing cap.
- **Owner-only account associations:** `/team/mega/matches` lets a verified Discord server owner search live guild members and associate one or more Minecraft Gamertags with a Discord account. Owners can correct or unlink associations; mappings are season-scoped and carry **no permission or role changes**. Both link and unlink actions are tamper-evident owner-audited, and all writes enforce CSRF.
- **Read-only collector source:** A separate Playwright-compatible script can visit the approved `SBsxScam` InPvP team page, read its visible Bank Event Log, and save events at five-minute intervals, including pagination/older-event controls. It requires an explicitly enabled permission flag, a persistent private browser session and separate runtime; it is **not started by the live website** and its exact HTML selectors have not been validated against InPvP. No unverified automatic transaction import is enabled by this release.
- **No double counting:** Captured events live in an additive, independent SQLite table. The existing manually recorded contributions, authorized-feed cumulative totals, and observed bank events are not blindly added together.
- **Deployment:** Merge to `main` to trigger the existing Railway service, preserving the existing volume `/app/data` and SQLite data. Confirm `/health` reports `1.7.0`. The history and matching pages work even when zero events have been captured. Before running the browser collector against production data, verify the real site and its member history in an isolated test environment; see [browser collector preparation](docs/MEGASMP_BROWSER_PREP.md).
## V1.6.0 — SBsxScam MegaSMP Team Dashboard

- **Dedicated fourth team tab:** Open `/team?tab=mega` (or the sidebar's **MegaSMP Team** link) for SBsxScam's dashboard. The linked InPvP team ID is `5638a504-3347-43fc-89d6-424dad53b7f6`.
- **Separate roster sources:** The current Discord Team Members directory still shows members with the two existing SBs roles; those accounts are explicitly **not assumed** to be Minecraft team members. The new in-game roster starts empty until admins add Gamertags or a permitted structured feed supplies them. No fake financial numbers are seeded.
- **Stats and leaderboard:** Per-player deposits, withdrawals, net contributions, contribution leaderboard, reported bank balance, recorded transaction list, and source labels. Unknown values display as **Not recorded**, never zero. Cumulative authorized-feed totals *replace* manual totals for that member instead of being added to them, preventing double counting. Team deposit/withdrawal subtotals include former members' historical contributions, and remain explicitly partial while some values are missing. The team-wide **net** figure is withheld until all recorded members have both totals; potentially unsafe integer sums are never shown as exact.
- **Season history:** Only the verified server owner can create a new season; previous rosters, bank values and ledger records remain readable. Owners and admins may add/bulk-add Gamertags, update active/former status, enter deposit/withdrawal entries, record an independent bank balance, and import structured snapshots for the active season. All changes require CSRF and are logged in the owner-only audit.
- **Privacy:** Discord accounts that are not verified members of the SB Store guild may still view the Discord team directory, but cannot access the team-bank dashboard or its financial data endpoint. Administrative edits require verified owner/admin privileges.
- **Five-minute refresh:** The browser re-reads the website's own authenticated JSON endpoint without reloading or losing scroll. If an **explicitly authorized JSON feed** is configured, a server-side worker polls it every five minutes and stores successful snapshots in the existing SQLite volume. Failures retain cached data with source timestamps and stale warnings. No external polling occurs by default.
- **InPvP limitation:** Their public teams directory shows *Team data sync in progress*. Individual deposits/withdrawals and full in-game member details have not been verified as available. InPvP's [Terms](https://inpvp.net/terms) restrict automated scripts/bots unless explicitly permitted. **Do not enable InPvP polling without written or otherwise explicit permission.** The ordinary public team-page link does not constitute an API.
- **No new credentials required for manual mode.** Trusted-feed configuration is optional and disabled by default:

  - `MEGA_TEAM_SYNC_URL=https://trusted.example.net/approved-team-snapshot.json` — operator-provided, authorized HTTPS JSON feed (not the InPvP HTML page).
  - `MEGA_TEAM_SYNC_AUTHORIZED=true` — administrator attests they have permission to automate the configured provider.
  - `MEGA_TEAM_SYNC_TOKEN=...` — optional private bearer token; never render it in HTML or logs.
  - `MEGA_TEAM_INPVP_AUTOMATION_APPROVED=true` — only if InPvP has specifically approved an automated interface; otherwise `inpvp.net` hosts remain blocked.

- **Permitted-feed JSON schema** (the same structure can be pasted into the admin import form):
  ```json
  {
    "team_id": "5638a504-3347-43fc-89d6-424dad53b7f6",
    "season": "current",
    "updated_at": "2026-11-12T21:00:00Z",
    "complete_roster": true,
    "bank_balance": null,
    "members": [
      {"gamertag":"ExamplePlayer","role":"Member","active":true,"deposits":null,"withdrawals":null}
    ]
  }
  ```
  Use numbers for known integer amounts; use `null` for unavailable amounts. Season keys must match the website's current season. Changes are validated and committed atomically; previously saved figures are retained when the provider is unavailable.
- **Deployment:** Leave the existing Railway project, SQLite database and persistent `/app/data` volume untouched. Deploy only after the full test suite passes. Confirm `/health` returns `1.6.0`, then visit **Team Members → MegaSMP Team** and add/import real member data.

## V1.5.3 — Private inline Evidence Viewer

- Replace download-only attachment rows with image thumbnails in **Original Evidence** and private support-ticket replies; show application reply attachments in the same gallery.
- A native, keyboard-accessible lightbox opens images full-screen with zoom controls (100–400%), previous/next navigation, filename and download button. MP4 and WebM recordings play inside the ticket with native video controls and HTTP Range requests for seeking. QuickTime MOV playback depends on browser codec support; original download remains available.
- Evidence selection previews appear **before submitting** a support ticket, support reply, or application reply. Selected files stay local until form submission. File count and maximum-size warnings appear in the preview.
- Every inline preview request is authenticated and uses the **same existing ticket/application authorization** as its original download route, preserving staff-report owner confidentiality and application privacy. A `?preview=1` flag permits safe image/video inline rendering, while existing URLs continue downloading. Stored-file extensions determine MIME, with `nosniff`, private `no-store` and same-origin restrictions.
- Uploads, users, SQLite records, role approvals and the owner-only audit remain unchanged. No schema changes or dependencies. Promotion tickets are currently text-only, so this release does not introduce promotion attachments.
- Locally bundled `/static/evidence.js` with CSP limited to site media and local browser Blob previews. Gallery images are loaded lazily and browser object URLs are revoked.
- After successful tests, deploy from GitHub `main` to the existing Railway service, preserving `/app/data`. Verify `/health` reports `1.5.3` and test screenshots/videos with applicant and staff accounts.

## V1.5.2 — Admin support-ticket access fix

- Real Discord **Administrator** permission on a bot-verified guild role grants staff/admin access to support-ticket queues and ticket pages, even when that role ID was accidentally omitted from `ADMIN_ROLE_IDS`. No user-supplied role names or usernames grant access.
- Keep the existing explicitly configured `ADMIN_ROLE_IDS` path and the owner-only authorization separately enforced. Verified Administrator permissions never grant owner status, the private owner audit, or owner-confidential staff reports. The access level is recalculated on each request; losing the permission removes access immediately.
- The **All Tickets** staff queue also links to **My submitted tickets** so administrators can open their own historic tickets (including their private submissions) without restoring the old sidebar clutter.
- No schema changes or new environment variables. Preserve the original Railway service, SQLite database and `/app/data` persistent volume. After deploying tested GitHub `main`, verify `/health` returns `"version":"1.5.2"`.

## V1.5.1 — Genuine Lucide icon refresh and profile picture dropdown

- Replace placeholder Unicode icons in the navigation, top-right profile menu, Main Feed, ticket picker, dashboard actions, social activity and promotion controls with **genuine Lucide SVG outlines**, using semantic choices (for example, ticket-plus for new tickets, bell for alerts and bookmark for saved posts).
- Bundle curated Lucide SVG geometry in `src/lucide-paths-*.js` with the shared `src/icons.js` renderer. Icons load **locally**, without third-party fonts, icon services or runtime CDN calls. Retain the Lucide ISC attribution in [LUCIDE_LICENSE.md](LUCIDE_LICENSE.md).
- Show a **56px uploaded website profile picture** inside the account dropdown, with the Discord avatar as fallback. Apply the custom avatar to the top-bar account photo too. Preserve name, Discord username, and profile controls.
- Keep existing roles, application approvals, private tickets, audit logging, database and uploads intact. Post like/bookmark/share actions preserve their SVG icons when updated in place.
- Verify the responsive dropdown, keyboard and click-away interactions, post actions and role-based pages before deploying. Deploy from tested GitHub `main` through the existing Railway service and preserve the persistent `/app/data` volume. `/health` reports `1.5.1`.

## V1.5.0 — Social Hub and top-right account controls

- **Quick social toolbar beside the profile name:** Feed, Find Members, Notifications (with an unread badge), and Saved Posts. The avatar/name opens the user's own profile, and the adjacent native profile menu exposes Edit Profile, My Posts, Replies, Photos, Liked Posts, Followers, Following, Following Feed, the activity inbox, saved posts, member search, and Sign out. Responsive mobile layout keeps the notifications shortcut and full scrollable menu.
- **My Profile:** clear desktop/sidebar/mobile access, on both member and staff dashboards. Profile activity tabs include Posts, Replies, Photos and private Liked Posts. Followers/Following counts link to accessible relationship lists; self view remains accessible for private profiles.
- **Main Feed:** community or Following-only timeline, in-place Like/Repost/Save actions and shareable local post/profile URLs, without resetting scroll. Saved posts are private to their owner.
- **Activity inbox:** private, per-user notifications for follows, likes, replies, reposts and profile-wall comments, with mark-as-read actions. Prevent rapid toggle spam.
- **Security and data:** Discord-backed login and membership checks, existing CSRF protection and rate limiting, private profile restrictions and additive SQLite social tables. No existing records are deleted. Role/approval/audit policies remain unchanged.
- **Deployment:** Deploy tested GitHub main through the existing Railway service, preserving the /app/data volume. Verify /health version 1.5.0 and test Discord OAuth, profiles, notifications and social actions on live accounts.

## V1.4.4 — Like feed posts without leaving the feed

- Like and unlike posts with a same-origin authenticated JSON request. The heart icon, state and like count update immediately on the current page, without reloading or changing the feed scroll position.
- If JavaScript is disabled, a feed Like form redirects back to the same feed page and post anchor. Liking a post from its detail page retains the existing detail-page fallback. Comments and the explicit Open link still open Post Details.
- Keep CSRF validation, per-user rate limiting, owner audit behavior and the existing SQLite data intact. Automated tests cover JSON like/unlike, non-JavaScript fallbacks and the client update logic. Deploy from tested GitHub main on the existing Railway service and persistent /app/data volume.

## V1.4.3 — Promotion navigation for all SB Store staff ranks

- In both desktop and mobile navigation, **Owner**, **Admin**, **Staff/Reviewer**, **Mod** and **Mod - temp** see **Apply for a Promotion** instead of **Apply for Staff**, and **My Tickets** / **My Applications** are hidden from those ranks. The underlying application and ticket pages remain available; this is a navigation change, not data deletion.
- Determine staff/mod/temp status from the currently verified Discord server member roles. Reuse the existing internal SB Store role classifier; do not incorrectly classify external Mega SMP/Prison staff or SBs team-only members as store staff. Existing owner/admin/reviewer roles remain covered even when a Discord role-list fetch fails.
- Regular members still see **My Tickets**, **My Applications** and **Apply for Staff**. The promotion route itself continues to allow new promotion submissions **only for Temp Mods and Mods**; Staff with no eligible next step see their promotion history but cannot submit a new request. Hide the old duplicate **Promotion Tickets** link for eligible staff ranks.
- Deploy tested GitHub `main` to the existing Railway service without resetting the database or volume. Verify `/health` returns `"version":"1.4.3"`.

## V1.4.2 — Admin and owner promotion link

- Show **Apply for a Promotion** in admin and owner navigation in place of **Apply for Staff**. Keep **My Tickets** and **My Applications** hidden from those two navigation levels. Ordinary members and reviewers keep their original **Apply for Staff** link.
- The link opens the promotion-ticket portal, which checks actual current Discord roles before allowing submission; only Temp Mods and Mods can apply, even if an admin or owner can see the navigation shortcut. Eligible admin/owner accounts get one promotion shortcut, not duplicates.
- The same label appears in desktop and mobile navigation. Existing applications, support tickets, permissions and roles are unchanged.

## V1.4.1 — Admin and owner sidebar cleanup

- Hide **My Tickets**, **My Applications** and **Apply for Staff** from the desktop and mobile navigation for admins and owners. Keep these links for ordinary members and reviewers. The underlying pages and data remain intact; this is a navigation-only permission-aware change.
- Safe Railway update: deploy tested GitHub `main` without replacing the existing service or `/app/data` volume. Verify `/health` reports `1.4.1`.

## V1.4.0 — Temp Mod onboarding and private promotion tickets

- **Accepted staff applications:** two different admins must still agree, followed by the separate final owner authorization by `FINAL_APPROVER_USER_ID` (unk.sb). Only after the final acceptance does Discord receive the **Mod - temp** role. Newly accepted applicants are not assigned their requested application position directly. Discord assignment is idempotent, errors are audited, and an admin can retry a failed delivery.
- **Promotion ticket eligibility:** only verified guild members holding **Mod - temp** or **Mod** can create new promotion requests. The eligibility check uses current Discord member roles on the server; hiding the UI is not the security gate. Members retain access to their own historic promotion conversations after a role change, but cannot create a new ticket without eligibility.
- **Promotion path:** `Mod - temp` → `Mod` → `Staff`. Two *different* admins must vote the same way to accept or deny; each admin can vote only once. Self-approval is blocked. After acceptance, the bot adds the next role, removes the prior rank, and records the result in the owner audit. A partial Discord failure is retryable.
- **Private experience:** promotion requests appear in the ticket picker and in eligible members' sidebar as **Promotion Tickets**; admins have a private **Promotion Reviews** queue. Requests include a reason, private ticket conversation, decision history, role-sync state and an admin retry control. One open/request-under-delivery promotion is allowed per applicant.
- **Role mapping:** default Temp Mod ID is `1539085168281919648`. Prefer setting `PROMOTION_TEMP_ROLE_ID`, `PROMOTION_MOD_ROLE_ID`, and `PROMOTION_STAFF_ROLE_ID` to exact Discord IDs in Railway. If a latter two role names are uniquely `Mod`/`Moderator` and `Staff`, the app can resolve them by name, but never guesses when ambiguous. The bot must have Manage Roles and sit above both roles in a promotion.
- **Safe deployment:** the migration creates new promotion tables/indexes without dropping or rewriting existing data. **Back up the existing Railway volume before upgrading**. Keep the current `sbplayer-shop` service, its volume at `/app/data`, and `DB_PATH=/app/data/app.sqlite`; never recreate the service or volume. Deploy the tested GitHub `main` commit and verify `https://sbstore.info/health` returns `"version":"1.4.0"`. Confirm actual Discord role assignments with a test account; CI uses a mocked Discord API.

## V1.3.9 — Focused audit, Discord usernames, and restricted access for non-members

- **Owner audit events** now show Discord **@usernames** instead of raw user IDs wherever a verified username can be resolved. Original numeric IDs remain intact in the underlying, hash-chained records. Known usernames are resolved from the app's local user database, with bounded Discord membership lookups for missing names. Unknown/unresolvable accounts show the ID rather than an invented identity.
- The **target and details** columns also display resolved usernames where possible; exports retain the original IDs, row hashes, and other forensic data plus readable display columns.
- **Audit scope:** record **state changes** (staff review decisions, ticket replies and status updates, role changes, settings, owner access, profile/content edits, etc.) and **successful access to individual private tickets/attachments**. Routine page loads, audit page views, queue refreshes, failed attempts and webhook notification delivery no longer add noisy audit entries.
- Old browsing-related events are **hidden from the audit page** and from its default **Export changes & ticket access** CSV, but are **not deleted or changed**. Owners can use **Full historical CSV** to retrieve all original events, preserving the tamper-evident hash chain.
- **Any personal Discord account may sign in** using OAuth, even if it isn't in the Discord guild. Missing guild membership or pending membership screening gives the restricted `appeal-only` role, which can **submit and track its own Ban Appeals** and now visit **Meet the Team** (including Our Staff, Team Members / SBs x Scam, and Known Members). Regular feeds, member profiles, other ticket types and staff/admin features remain blocked.
- For restricted users, the team directory cards show names, avatars and role labels but **do not link to member profiles**. The restricted homepage and sidebar include **Meet the Team**, and people signing in from shared team links return to that page after Discord authentication.
- **Safe Railway update:** no destructive migrations, no changes to existing application/ticket data, and no new environment variables. **Back up the existing Railway volume**, keep `/app/data` mounted and `DB_PATH=/app/data/app.sqlite`, deploy the latest tested GitHub `main` on your existing `sbplayer-shop` service, and verify `https://sbstore.info/health` returns `"version":"1.3.9"`.
- **Test procedure:** sign in with a Discord account that is *not* in your server, verify the **Ban Appeal** and **Meet the Team** links work, then confirm `/feed`, `/dashboard`, `/members` and `/staff` deny access. Check Owner Audit Log for @username labels and clean event categories.

## V1.3.8 — Staff, Mod and Temp Mod sections

- **Our Staff** keeps **Ownership** and **Administration**, then replaces the former generic **Other Staff** grid with three separate groups in this order: **Staff → Mod → Temp Mod**. Each group is visible even if no members are currently assigned.
- **Temp Mod** membership is determined exclusively by the Discord role ID `1539085168281919648`, not by fuzzy name matching. The label uses the role's current Discord name.
- **Mod** includes the store's `Mod`, `Moderator`, and `Head Mod` roles. **Staff** includes normal/head/senior store `Staff` roles, plus explicitly configured reviewer/team staff roles when they do not hold a more specific rank.
- People with more than one staff role appear **once**, in their highest applicable group: **Ownership > Administration > Staff > Mod > Temp Mod**. The displayed role badge comes from the matched internal role, not unrelated Mega SMP staff roles.
- **Known Members** (Mega SMP / Prison staff) and **Team Members** (SBs x Scam) remain separate. External staff and team roles cannot accidentally create an **Our Staff** card.
- **Safe deployment:** This is a presentation/role-classification update. No database schema changes or new Railway settings are needed. Keep the existing `sbplayer-shop` service and `/app/data` volume, back up before redeploying GitHub `main`, and verify `https://sbstore.info/health` reports `"version":"1.3.8"`.

## V1.3.7 — Mega Staff Trusted directory fix and cleaner heading

- **Mega Smp Staff Trusted** (including equivalent Mega SMP / Mega Staff Trusted spellings) is classified as an **external Mega SMP staff role**, not as SB Store staff.
- Users holding only a Mega SMP Staff / Staff Trusted role (or one plus an SBs Team Member/Leader role) **do not appear under Our Staff**. They appear under **Known Members → Mega SMP Staff** instead.
- Users with both a legitimate store-staff role and an external Mega SMP Staff Trusted role still appear under **Our Staff** with their actual store-staff title, and in the Mega SMP known-members list.
- The explanatory text **“Automatically detected from N Discord server roles.”** beneath the **Meet our team** heading has been removed. The directories remain automatically populated from verified Discord member roles.
- Existing tab order remains **Our Staff → Team Members → Known Members**, with SBs x Scam and Prison Staff grouping unchanged.
- **Safe Railway deployment:** no database changes, schema updates or new variables. Keep the existing `sbplayer-shop` service and `/app/data` volume. Back up first, deploy the tested `main` branch, then confirm `https://sbstore.info/health` reports `"version":"1.3.7"`.

## V1.3.6 — SBs x Scam Team Members and red [SBs] name tag

- The top navigation on **Team Members** now appears in this exact order: **Our Staff → Team Members → Known Members**. The first keeps the existing store-staff groups, and the third keeps the Mega SMP Staff and Prison Staff subtabs.
- The new **Team Members** tab is labelled **SBs x Scam** inside the page and finds members from two exact Discord role IDs:
  - **SBs Team Leader:** `1557586028729077841`
  - **SBs Team Member:** `1565070132676661439`
- Team Members are grouped into **SBs Team Leaders** and **SBs Team Members**. If someone has both roles, they appear once under Team Leaders; if they also genuinely belong to store staff or a Known Members group, they remain visible in those other tabs.
- **[SBs]** is displayed in **red immediately after the display name** on team directory cards and member profiles for users who **actually have the SBs Team Member role**. A leader who doesn't also hold the member role does not receive the tag. This badge is derived from verified Discord role membership, not editable profile text.
- A member having only an SBs role is not treated as a store staff member solely because of that role. Badge visibility respects existing private profile permissions.
- **Safe Railway deployment:** no database migrations, no new variables, no role changes and no volume reset. Keep your existing `sbplayer-shop` service, `/app/data` volume and `DB_PATH=/app/data/app.sqlite`. Back up your volume first, deploy the latest tested GitHub `main` commit, then verify `https://sbstore.info/health` returns `"version":"1.3.6"` and open `https://sbstore.info/team?tab=sbs`. The bot needs Guild Members Intent for a complete member list.

## V1.3.5 — Discord roles on every member profile

- Every member profile now has a **Discord Roles** section **directly below the bio and above the profile statistics**, using coloured, mobile-wrapping badges for the user's roles from the configured Discord guild.
- Role names and colours come from live Discord server role definitions, ordered by **Discord role position** (highest first). The shared **`@everyone`** role is excluded; managed, regular community, store-staff, Mega SMP Staff and Prison Staff roles are included when assigned.
- This is **read-only** and requires no manual role entry. Role and member lookups are cached for **60 seconds** to reduce Discord API usage; refresh the member's profile after that interval to see changes. Your own page uses your freshly verified Discord membership where possible.
- **Privacy:** another user's private profile does not show roles and does not trigger an additional role lookup. A person viewing their own private profile can still see their roles.
- Missing Discord data is shown as an unavailable state, never fabricated roles. Escaped role labels and validated hex colours prevent user-controlled role names from injecting markup or CSS.
- **Safe deployment:** keep the existing Railway service and `/app/data` persistent volume. This release changes presentation and read-only API lookups only: **no SQLite schema changes, no reset, and no new environment variables**. Back up the volume as normal, deploy the latest `main` commit, then verify `https://sbstore.info/health` returns `"version":"1.3.5"`.

## V1.3.4 — Known Members tab on Meet the Team

- **Meet the Team** now has two main tabs: **Meet the Team** for SB Store team members and **Known Members** for external-community staff recognised by their Discord roles.
- **Known Members** contains two category tabs: **Mega SMP Staff** and **Prison Staff**, automatically populated from matching Discord role names (`Mega Smp Staff`, `Mega SMP Staff`, or `Prison Staff`, case and punctuation insensitive).
- A member whose *only* qualifying staff role is Mega SMP or Prison Staff is **not incorrectly listed as Other Staff** for the store. If someone is also real store staff (admin, moderator, helper, or store-team role), they stay in the core Meet the Team section and also show in the matching Known Members tab.
- A person holding both external roles appears in both Known Members categories, once per category. Buttons and counts work on mobile and desktop, with active section indicated for keyboard and screen-reader users.
- The page continues using Discord role membership already queried by the site; **no new environment variables, role IDs, or database schema changes** are needed. The bot still needs **Server Members Intent** to retrieve the full server member list.
- **Safe deployment:** Keep your existing Railway `sbplayer-shop` service, `/app/data` volume, and `DB_PATH=/app/data/app.sqlite`. Back up the volume before deployment, then deploy the latest GitHub `main` commit. Verify `https://sbstore.info/health` returns `"version":"1.3.4"` and open **Team Members → Known Members → Mega SMP Staff / Prison Staff**.

## V1.3.3 — Branded Discord link previews

Discord was showing its own homepage on shared `sbstore.info/team` links because signed-out web crawlers received a Discord OAuth redirect and the pages lacked Open Graph metadata.

- All site pages now serve **server-rendered Open Graph and Twitter Card tags** with `SB's & Cam's Store` branding, the existing public SB logo (`/static/sb-logo.png`), an absolute canonical `BASE_URL`, and a route-specific safe description for common pages.
- Clicking **Continue with Discord** on a shared link now carries a verified same-site return path through OAuth, so a member signing in from `/team` returns to `/team` rather than being dumped on Home. Unsafe or external return URLs are rejected.
- Signed-out visitors (including Discordbot) can fetch **public login landing pages** for `/team`, `/members`, `/feed`, `/suggestions`, `/apply`, `/tickets/new`, `/dashboard`, and common shared ticket/profile links, with the normal **Continue with Discord** action. Actual user/member/staff content still requires authenticated authorization.
- Shared private ticket and staff-application links show only a **generic Private Ticket preview**. Ticket IDs, replies, staff reports, decisions and attachments are **not** displayed to the crawler.
- **Safe deployment:** Back up the existing Railway volume, keep `DB_PATH=/app/data/app.sqlite`, and redeploy the same service from GitHub `main`. There are **no database changes** and no new Railway variables. Ensure `BASE_URL=https://sbstore.info` is already set.
- Check `/health` for `"version":"1.3.3"`, then paste `https://sbstore.info/team?preview=133` into a **new Discord message**. Discord can cache old previews; a new query string prompts a fresh fetch. The card should say **Our Team | SB's & Cam's Store** with the SB logo.

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
- **No destructive migrations:** uses additive SQLite tables for support tickets, private attachments and staff-chat messages. Existing applications, votes, member accounts, posts, suggestions, profiles, sessions, logs and image uploads are left intact. Evidence is stored under `/app/data/ticket-files` outside public static serving.

### Railway V1.3.1 safe update checklist

1. Go to the existing Railway service `sbplayer-shop`. Under **Volumes**, confirm the same persistent volume remains mounted at **`/app/data`**. Confirm **`DB_PATH=/app/data/app.sqlite`** under Variables. DO NOT delete the volume or create a replacement service.
2. Under **Backups**, create or verify a volume snapshot *before* deploying. For SQLite in WAL mode, use a SQLite-aware backup or Railway volume snapshot rather than copying only the open `.sqlite` file.
3. Confirm `BASE_URL=https://sbstore.info`, `DISCORD_WEBHOOK_URL`, `FINAL_APPROVER_USER_ID` (unk.sb's **numeric Discord user ID**), `ADMIN_ROLE_IDS`, `REVIEWER_ROLE_IDS` remain configured.
4. Add **`DISCORD_ADMIN_REPORT_WEBHOOK_URL`** pointing to a **private admin/owner-only Discord channel**. Add **`DISCORD_OWNER_REPORT_WEBHOOK_URL`** pointing to a **separate owner-only channel**. Do not reuse the general staff-channel webhook; leave either unset if the corresponding private channel does not exist yet.
5. Deploy the latest V1.3.1 GitHub `main` commit through Railway's existing connected GitHub deployment. If auto-deployment is enabled, inspect the latest deployment rather than clicking a second deploy.
6. Visit `https://sbstore.info/health` and check `"version":"1.3.1"`. Sign in: check the Member or Staff homepage appropriate to your Discord role. Test ticket creation and staff chat.
7. As an owner, visit **Admin Settings → Discord staff webhook**. Use **Test Staff Webhook**, **Test Admin Reports**, or **Test Owner Reports**. All are **no-ping** tests. Confirm the messages arrive in the intended private channels.

Member-uploaded profile images stay in `/app/data/uploads`, ticket media in `/app/data/ticket-files`, and all new messages and tickets in `/app/data/app.sqlite`. Do not change their persistent storage paths. An ordinary code redeploy does not delete correctly mounted volume data.

**Security:** the Chrome Safe Browsing warning previously observed for `sbstore.info` is a separate outstanding issue; investigate Google Search Console Security Issues before encouraging public traffic. Rotate leaked Discord bot, OAuth and webhook secrets and remove sensitive database history from public GitHub.

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
