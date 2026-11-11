<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# Version 1.2.1 verification checklist

## Implemented

- Dark blue Discord-inspired UI, supplied SB logo, Discord username/avatar in header.
- Discord OAuth2 identify + membership, live bot guild verification, owner detection.
- Applicant-only private tickets; original staff application form and existing database migration.
- Optional reviewer votes (queue hides individually voted tickets), two separate matching admin decisions, admin vote list and notes.
- Accepted application automatic safe role delivery with visible failure state and admin retry.
- Live role detection; protected Discord role management; admin recruiting and role mapping settings.
- Twitter-like member-only main feed: posts, images, likes, reposts, public comments, deletions, follows.
- Separate suggestion feed: public yes/no counts, one vote per member, changed/removed votes, public comments, admin-only voter identities, admin statuses.
- Member directory searching Discord, server Team Members based on Discord role hierarchy.
- Customizable website profile with photos, colour themes, layouts, fonts, bio, links, sections, privacy, pinned posts and optional effects.
- Owner-only append-only audit events, tamper-evident hash chain, complete CSV export, configurable co-owner authorization.
- Staff moderation queue, content reports, soft removal, login/session/CSRF/rate-limit safeguards.

## V1.2.1 visual repair and verification

- Found a concrete upgrade bug: static CSS/JS previously returned `Cache-Control: public, max-age=3600` while keeping the same URL as V1.1. Browsers could load the old stylesheet against V1.2 markup. Fixed with versioned stylesheet/script URLs and `Cache-Control: no-store, max-age=0` for styles and scripts.
- The server logo now renders at 44x44 pixels in the sidebar. Signed-in account images render at 32x32 in the header and 40x40 in the pinned sidebar identity. The home image is limited to 148x148 pixels on desktop.
- The authenticated sidebar scrolls its navigation independently, keeping member identity visible at the bottom. The desktop-only header and mobile branding are correctly shown/hidden at responsive breakpoints.
- Browser rendering checks using local inline assets/CSS at desktop 1440x900 and mobile 390x844 validated image dimensions, header heights, hidden mobile branding on desktop, and visible profile summary. These checks do not substitute for end-to-end live Discord testing.

## Automated checks

**19 / 19 Node integration and layout tests passed** (15 existing feature/security tests plus 4 layout/cache regressions). Tests use simulated Discord identities/roles and a temporary SQLite database. Never add production credentials to tests.


## Requires real Discord validation

- OAuth2 callback, bot installation and permissions, webhook post delivery.
- Guild Members privileged intent for full server directory/team roster.
- Exact staff role mappings and bot role hierarchy for successful live role assignment.
- Public HTTPS hosting and multi-user capacity testing.

## Security limitations / deployment notes

- Full audit records only actions the **website** sees, not direct Discord commands or server changes.
- Hash-chain detection does not replace protected storage/backups or physical admin controls.
- The built-in in-memory rate limiter is for one server process; deploy with shared rate-limiting and object storage if traffic grows.
- Uploaded pictures have a size cap and image signature validation, but large-scale production needs malware/media scanning and retention controls.
- The site is a runnable local Node app; it does not automatically deploy to a domain.
