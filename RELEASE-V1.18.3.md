<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB Store V1.18.3 — Team Applications Inside All Tickets

## Request
Team applications must appear in the **same All Tickets list** as reports, reward claims, staff applications and promotions. Staff should not be forced to open a separate recruitment page.

## Implemented
- `/staff/tickets` defaults to **All Tickets**, including accepted/denied applications. `?status=active` shows only open cases.
- Applications stored in `team_applications` are rendered as ordinary case rows with the category **SBsxScam Team Application** and a `TA-<id>` reference. The detail link goes to its restricted review route.
- The same queue's **Type** filter supports team applications; `/staff/tickets?type=team_application` preselects it. Team cards and staff navigation point into this shared queue.
- The applicant's own submission remains available under **My Tickets**; non-staff SBs leaders retain the separate restricted management page. Other support tickets and staff reports keep their existing privacy gates.
- Direct source-table totals show how many applications are stored, independent of Active/All filters.
- Owner-only **Check stored submissions** provides a read-only comparison of team application counts, historical submission audit entries, other ticket totals, database file path and Railway DB_PATH setting. No credentials or member financial details are exposed.

## Important production caveat
If the diagnostic says **0 stored applications**, the website process really sees no rows in its SQLite `team_applications` table. UI changes cannot recover rows stored on a different Railway volume or previous deployment. Compare valid application confirmation links, old volumes, DB_PATH settings and backups. **Do not reset or replace the production database or invite resubmission until this is understood.**

## Release
- Frontend and /health version: `1.18.3`.
- No database migration, package dependency or reset.
- GitHub CI must pass all Node syntax/integration tests before merge.
- Before Railway rollout, back up the persistent `/app/data` mount and verify Discord role permissions, protected team-review links and existing ticket history.
