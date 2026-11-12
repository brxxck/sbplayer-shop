<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# MegaSMP Bank Event Log — read-only automatic capture (unpublished preparation)

**Status:** Code prepared. Not merged into main, not deployed to Railway, and not yet calibrated against the real InPvP team-page HTML. The user reports MegaSMP staff permit automatic viewing of their team's records even though they will not supply a separate API or export.

## What the separate collector does

It uses an ordinary Playwright browser with a private user-controlled login profile. The process opens only the SBsxScam team page, selects Event Log → Bank, reads the displayed rows, and checks again every five minutes.

https://inpvp.net/megasmp/teams?team=SBsxScam&gamemode=megasmp&id=5638a504-3347-43fc-89d6-424dad53b7f6

It does not bypass logins, CAPTCHA challenges, account restrictions or rate limits. It never sends team-bank commands, makes deposits/withdrawals, or calls undocumented endpoints.

The independent captured-event database records Gamertag, action, exact amount in cents, displayed timestamp, optional provider event ID, and first/last-seen times. Repeated checks do not blindly increment totals. If the page supplies no stable event IDs, identical actions within the same displayed minute remain ambiguous. Stored totals are labelled as OBSERVED, not lifetime.

## Source files

- src/mega-team-bank-event-parser.js — event normalization and exact cents (including $0.67)
- src/mega-team-page-collector.js — read-only bank-tab browser inspection, scrolling and pagination
- src/mega-team-bank-event-store.js — additive SQLite event ledger and sync-status records
- scripts/mega-bank-browser-worker.js — user-controlled login, one-time capture or five-minute worker
- test/mega-team-bank-browser.test.js — parser, duplicate, timestamp and browser-flow tests

## First local setup

Use Node.js 22+ and a separate test database. Do not point the unverified worker at production /app/data.

1. Check out GitHub branch feature/megasmp-bank-auto-collector-unpublished.
2. Install Chromium automation support locally without publishing any dependencies:

       npm install --no-save --package-lock=false playwright
       npx playwright install chromium

3. Configure environment variables outside Git, using your preferred environment manager:

       DB_PATH=/private/path/mega-test.sqlite
       MEGA_TEAM_BROWSER_PROFILE_DIR=/private/path/mega-browser-profile
       MEGA_TEAM_BROWSER_AUTOMATION_ALLOWED=true

4. If InPvP requires your normal login, run the visible browser and sign in manually:

       node scripts/mega-bank-browser-worker.js --login

5. Test one read-only capture:

       node scripts/mega-bank-browser-worker.js --once

6. After verifying the actual team and event rows, run the five-minute worker:

       node scripts/mega-bank-browser-worker.js

On Windows PowerShell, set values using $env:KEY = "value" rather than export. The background worker needs a computer or separately deployed service that stays running; it is NOT running on Railway while this branch remains unmerged. Never commit the browser session profile, private cookies, or credentials.

## Site-layout calibration

The screenshot shows a Bank tab and rows resembling:

    Nov 9 11:17 PM  GermanBurgers Deposited $800,000
    Nov 9 9:18 PM   SBisOnTop Deposited $30,000,000
    Nov 3 1:35 AM  YTPAW Deposited $0.67

The full live DOM could not be inspected from the current environment. The collector uses read-only heuristics, which require verification on the actual website. If its automatic DOM matching fails, MEGA_TEAM_BANK_ROW_SELECTOR can be set to the specific event-row CSS selector after inspecting the page normally.

Before enabling unattended collection, confirm actual row markup, availability of transaction IDs and exact timestamps/timezone, pagination/scroll limits, login-session duration, and the full-history boundary. Incomplete or ambiguous history must NOT be described as a lifetime total.

## Integration safeguards

This preparation records captured browser events separately from the current website's manual ledger and cumulative imports. Do not add the separate event totals to imported totals or existing bank balances (that would double count). A future reviewed integration can select one authoritative source, reconcile seasons, and display observed values with their coverage status.

No site code in published main is modified. No Railway service, environment settings, database, or persistent storage is touched. The collector is NOT a guaranteed live connection until the actual DOM and session behavior have been tested.


## Unpublished history browser and Discord account matching

The preparation branch now includes a paginated Full Bank History page:

- /team/mega/history?season=current — shows all captured events in 50-record pages, with Minecraft Gamertag, season and deposit/withdrawal filters.
- The MegaSMP Team tab links to Full Bank History, with clear captured-only/partial-history labels. The ordinary manual contribution ledger remains separate: the two sources are never added together.
- Events are read from the persistent database, not a 100-row excerpt. The displayed time is labelled timezone-unverified unless a precise timestamp is available; default ordering uses capture batches rather than unverified exact times.
- /team/mega/matches?season=current — OWNER-ONLY Minecraft/Discord matching page. The owner searches the live Discord guild, selects a Gamertag from the captured event log or recorded roster, and links it to a verified non-bot server member. All link/unlink actions are CSRF protected and owner-audited.
- Owners can correct or remove an association, and can match several Minecraft accounts (alts) to one Discord user. Associations are scoped by season. They do not prove ownership of the Minecraft account and cannot grant permissions.
- Linked Discord profile names appear next to Gamertags in the captured-event history and the team roster. The five-minute on-site refresh keeps the links visible without a reload.
- The collector supports Next, Next Page, Load more events, Show older events and More events controls, with bounded pagination. It still needs calibration against the actual InPvP page.

Security: Guild membership is required to view the history. Only verified server owners may search and match Discord users. A mere username or role name is not treated as proof.

Completeness: Full History means all successfully captured bank events, NOT guaranteed lifetime history. InPvP may expose fewer than every past bank event, and visible rows without stable event IDs remain provisional.

Release gate: Nothing in this preparation branch is enabled on Railway or merged into main. Before publishing, verify the actual InPvP Bank Event Log selectors, pagination, permissions and event identities; ensure captured sums are not added onto manual or cumulative totals.
