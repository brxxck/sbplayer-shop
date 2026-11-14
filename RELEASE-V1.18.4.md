<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB Store V1.18.4 — Recruitment Saved With Support Tickets

## Problem
Team applications were submitted into \`team_applications\`, while normal tickets used \`support_tickets\`. Both tables already shared the same SQLite DB file, so a missing Railway volume cannot be solved by changing the UI. The aim of this release is to create a real support-ticket copy of each submission, preserve recruitment-specific workflows, and backfill existing submissions if they are still stored.

## Implemented
- New applications are written **atomically** to \`team_applications\` and \`support_tickets\`, in one SQLite transaction.
- Each support record uses \`category='team_application'\`, \`visibility='admin'\` and \`fields_json\` with the applicant's verified IGN and full form answers (not private reviewer notes).
- A FK-constrained link table ties the two records together and protects against accidental deletion.
- Startup safely creates linked ticket archives for existing team applications, preserving their timestamps and statuses, with no duplicates on repeat starts.
- Recruitment approval/denial updates the linked support ticket's status. The existing team review and applicant pages remain canonical.
- Generic support replies/status updates are disabled for team archives, preventing decisions from being bypassed. Ordinary staff/reviewers cannot read them. Team leaders retain their separate authorized recruitment view.
- All Tickets displays the same single recruitment row, not two duplicates. Applicant My Tickets likewise remains clean.
- Owner diagnostics compare source team application totals, real support archive totals and link counts to help identify missing data.

## Database compatibility and safety
The legacy support table has a SQLite category CHECK constraint. The upgrade performs a single transactional table rebuild to add \`team_application\`, copies all existing support ticket IDs/fields, recreates indexes and verifies all foreign keys. In production the process first creates \`<DB_PATH>.pre-recruitment-support.backup\` if it does not exist. The existing DB_PATH, Railway volume, users, messages and uploads must not be changed.

This is a schema migration, so **back up the running Railway persistent database and uploads before deploying**. Existing team applications in the active DB are archived automatically. Missing applications from a different or lost volume cannot be reconstructed from GitHub, code, or audit summaries alone.

## Validation
- Run the GitHub Actions Node test suite on this branch.
- Verify the legacy support-table migration preserves messages, attachments and ticket IDs, and that foreign-key checks pass.
- Verify new submissions have one linked team archive, active/finalized state synchronization, and authorized reviewer/owner/participant access.
- After deployment, confirm \`/health\` returns \`1.18.4\`, check \`/owner/recruitment-diagnostics\`, and submit a test recruitment application from a real verified member.
