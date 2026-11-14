<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB's & Cam's Store V1.18.2 — Tickets and Team Applications

This patch addresses a reported production screenshot showing `Ticket #${ticket.id}` as literal text, and missing SBsxScam recruitment records in All Tickets.

## Fixes
- The ticket header now interpolates its actual numeric ID, including reward claims and other support categories.
- Team recruitment applications appear in **Active Cases** when pending, reviewing or interviewing, and remain in **All Tickets** after acceptance or denial.
- Each team application is distinguished by `TA-<id>`, labeled **SBsxScam Team Application**, and links to the existing private team-review route.
- The staff homepage includes team recruitment in its total and displays a separate category count.
- Users see their own team recruitment history under **My Tickets** using their applicant-only view.
- The queue's status and unread logic no longer treats team applications as support ticket messages.

## Permission boundaries
- Only administrators/owners and verified team recruiters can discover these applications in the shared staff queue; the existing team-review endpoint re-checks eligibility on every request.
- Non-staff SBs leaders use their separate, role-checked recruitment queue, **not** the main staff ticket queue.
- An applicant sees only their own entries and cannot open the recruiter review page.
- Regular reviewers cannot discover or open team recruitment applications without the required team-leader role.
- Staff reports and other sensitive support tickets retain all their existing access checks.

## Validation and rollout
- Node.js syntax and full integration tests in GitHub Actions, including real HTTP route tests under simulated Discord roles.
- No database migrations, dependencies, or changes to Railway environment variables.
- Back up the current `/app/data` persistent volume before production rollout.
- After deployment, verify `/health` is `1.18.2`. Check support ticket headers and test a new team application in **Active Cases**, **All Tickets**, and its applicant's **My Tickets** history.
- A passing GitHub test suite does not prove Railway has deployed or that the live pages work until verified in a browser.
