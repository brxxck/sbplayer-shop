<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# V1.18.0 build notes

This is a source build for the existing Railway application. It has not been deployed. The 334-item input combines defects, existing functionality, proposed additions and checks that require the live service. This build must not be described as 334 independently verified fixes.

## Implemented

| Area | Result |
| --- | --- |
| Correctness | Active Cases count uses the listed cases; implemented/declined suggestions reject additions, changes and removal of votes on POST routes. Existing Phase 1 decision locks remain. |
| Navigation | Grouped sidebar, collapsible protected tools, compact account menu, primary bell/Messages shortcuts, mobile More menu, active destination, skip link and Ctrl/Cmd+K page finder. |
| Applications | Shared entry point keeps staff, promotions and recruitment separate; application progress timeline, queue filters and decision history. Two admin votes, owner finalization, self-review restrictions and role retries remain independently enforced. |
| Staff | Per-staff unread case activity, last-reply waiting states, type/status/text filters, waiting time, urgency/age ordering, smaller hero and stable staff chat scroll. |
| Support | Structured bug-report fields, evidence previews/removal, evidence-unavailable explanation alternative, clearer submission receipt, status confirmation and confidential-report access restrictions. |
| Feed | Community/Following naming, removal of duplicated social panel and Open actions, media previews/removal, quieter action menus, correct new-post ordering, empty-state removal, deletion events and preserved scroll. |
| Suggestions | Search, status filters, Recent/Most Supported/Most Discussed ordering, public staff explanations/history, closed-state buttons and preserved admin-only voter identity. |
| People | Wider cards, removal of repeated View Profile controls, current Discord role/team filtering, local presence filters, alphabetical/online-first ordering, team search. |
| Profiles | Hidden empty custom-section placeholder, expandable role list, quieter empty wall, profile-setting section links, live appearance preview, sticky Save Changes and secondary Xbox connection management. |
| Messages | Two-pane desktop/single-pane mobile, bottom-anchored bubbles, participant-authorized older pages/search, More menus, attachment previews/removal, failure feedback and drafts, quieter preferences and opt-in browser alerts. |
| MegaSMP | Overview/Top 10/Members/Transactions entry points; fewer rank/financial duplicates; expandable disclosures/administration; unified paginated manual/captured transaction browsing with explicit source/time precision. Unknown dates stay unknown and source records are never reconciled or summed. |
| Administration | Role search/availability filters and protected explanations; role IDs behind detail controls; owner audit actor/action/result/date filters and pagination; original audit hashes/export preserved. |
| Notifications | Read/type filters, row-open read marking, clearer read state, live badge updates and improved saved-post guidance. |
| Reliability | Versioned assets, tab-scoped drafts, in-place form failures, upload-size checks, restored history/search authorization, visibility-aware polling and presence, refreshed SSE state and reduced-motion styling. |
| Persistence | No destructive database rebuild, upload deletion or permission merger. Only `suggestion_history` and `case_reads` tables/indexes are added. Production startup creates a SQLite snapshot before those additions. |

## Validation

Run `npm test` with Node 22.13 or newer. Tests use an isolated SQLite database and fake Discord API. They include suggestion voting locks, source-preserving transactions and cent precision, unknown source dates, unread case state, participant-only message history/search, role-aware navigation, existing Phase 1 approvals, role-delivery failures, sensitive-report permissions and uploads.

JavaScript syntax checks and `git diff --check` are required as well. Final local result: **177 tests passed, 0 failed**. JavaScript syntax, whitespace and SB watermark checks passed across 26 changed files. A production-mode dry run produced a SQLite backup that passed `PRAGMA integrity_check`. These results use disposable local data.

## Remaining verification and limits

- The browser available in this session cannot connect to the local preview (`ERR_CONNECTION_REFUSED`). Desktop/tablet/phone appearance, keyboard flow, upload-removal interactions and simultaneous real-browser sessions remain unverified. Automated rendering assertions do not substitute for these checks.
- Railway deployment, `/health` version, real Discord OAuth, real bot role assignment/retry, webhook destinations, existing persistent images, collector freshness and restart/reconnect behavior require the live environment. No production database or uploads were accessed or backed up during this session; the startup snapshot runs only when deployed to production.
- Member discovery filters operate on up to 30 results from the existing member-search route, not an exhaustive Discord guild export. Generic application/role filters operate on the authorized records currently loaded. Team-recruitment dates are not exposed by every legacy table.
- The profile preview covers text/theme/accent/font/layout appearance; file previews are separate. Browser message alerts work while a page remains open and permission has been granted; this build does not introduce Web Push, a service worker or background delivery after every tab closes.
- Existing mentions are plain post text. This build does not add a full mention-recipient notification system or group similar notifications into a new aggregate record type. Implemented-suggestion release linking and a reconciled full-history financial model are not introduced.
- Process-local SSE/presence/rate limits still require one application replica. A multi-replica redesign is not part of this update.

## Production rollout

1. Retain the Railway persistent volume and database/upload locations. Take a volume backup containing the database and uploads before replacing the running deployment; retain earlier backups.
2. Deploy the tested source through the existing GitHub/Railway integration only after the repository destination is approved. Do not replace environment secrets or the persistent volume.
3. Confirm `/health` returns version `1.18.0`. Confirm the automatic SQLite snapshot exists and application startup completes.
4. Verify member/reviewer/admin/owner navigation, confidential reports and direct attachment URLs; test two matching admin decisions and final owner authorization without applying unintended real role changes.
5. Use two test accounts in separate browsers to verify message receipt/read state, Invisible, notifications, tab closure and reconnection. Verify the existing uploads and MegaSMP source timestamps.
6. If production checks fail, roll the application source back while retaining the database, uploads and additive tables. Never delete the volume to roll back a UI update.
