<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB Store V1.18.1 — Source Hardening and Consolidation

This release contains the entire supplied V1.18.0 source tree and the following improvements made against it, not a partial or speculative reimplementation.

## Improvements

- Added a shared `src/search-utils.js` with SQL `LIKE` escaping for `%`, `_` and backslashes. Message search, suggestion search, MegaSMP transactions and owner audit filters now search for literal user text.
- Reject impossible YYYY-MM-DD calendar dates instead of allowing `Date.parse` to normalize them, and reject inverted from/to date ranges. Applied to MegaSMP transactions and the owner audit.
- Maintained participant-only DM history/search, owner-only audit, final suggestion voting locks, Phase 1 application decision safeguards, and source-specific MegaSMP financial labels.
- Corrected the supplied archive's mismatched `package-lock.json` version (`1.12.0`) to `1.18.1`, and synchronized package.json, assetVersion, footer, server startup banner, and `/health` version.
- Added regression tests for escaped wildcard searches, calendar validation, reversed ranges and participant authorization.

## Deployment safety

- No production database, user uploads, secrets or bot credentials are included.
- The V1.18 additive `suggestion_history`/`case_reads` tables and pre-migration SQLite snapshot remain unchanged; back up the Railway persistent volume before rollout.
- Source tests use disposable SQLite and mocked Discord. Verify the live OAuth, staff roles, owner permissions, file uploads, chat and SSE reconnect after Railway deployment.
- The project remains intended for one Node process / Railway replica until a shared event broker is introduced.
- V1.18.0 source release notes remain available in `RELEASE-V1.18.0.md`.
