<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# Discord level points connection (V1.19.0)

The website uses its existing Discord OAuth login. Each wallet is bound to a Discord user ID and the configured DISCORD_GUILD_ID. No new Discord bot or OAuth app is needed. This release provides the connection, claims and balances; games are a separate feature.

## Activate

1. Sign in to sbstore.info with a verified website owner account.
2. Open Owner > BotGhost Connection (`/owner/level-points`). Create a connection key.
3. Save the one-time key in BotGhost Secrets as `SB_WEBSITE_LEVELS`, restricted to `https://sbstore.info`. Do not use a Discord bot token.
4. In the Leveling module, create `/website-points` with replies visible only to its command user and a one-minute per-user cooldown.
5. Add a Send an API Request block, named `website-level-sync`:
   - POST `https://sbstore.info/api/integrations/botghost/levels`
   - Header `Authorization: Bearer {SECRET_SB_WEBSITE_LEVELS}`
   - Raw body content type `application/json`
   - Body:

```json
{
  "bot_id": "{bot_id}",
  "guild_id": "{server_id}",
  "user_id": "{user_id}",
  "level": "{BGVAR_bg_leveling_level}",
  "xp": "{BGVAR_bg_leveling_xp}"
}
```

6. Keep variable replacement enabled for headers and body. Use success/error branches with private replies. A response of 200 means the website accepted the level. Do not display a success message for other statuses.
7. Run the command as a real member and check Owner > BotGhost Connection for a received sync. The member can then claim at `/points`.
8. Optionally add the same API action to the end of Level Up's existing flow. The command remains necessary to sync pre-existing levels immediately, and can recover a missed update.

## Rewards and persistence

- 100 points per level. A member already at level 20 can claim 2,000 points once. At level 21, the next claim is 100 points.
- Sync never changes Discord XP or levels and does not automatically credit a wallet. Website claims are explicit and protected by CSRF and live Discord membership checks.
- Claimed levels and the highest received level are retained. Repeated requests, delayed lower-level updates, leaving/rejoining or level resets do not let the same levels pay twice. Reward policy is lifetime per Discord server, not per reset season.
- Snapshot records can arrive before a member's first website visit. Wallets and transactions require their website user record.
- Connection keys are stored as SHA-256 hashes. Rotating or disconnecting a key immediately rejects its future requests; balances/history remain.
- Keep the existing Railway SQLite volume and backups. New tables are created automatically; existing tables are not replaced.
- The accepted bot is SB’s, application ID `1522414493676732456`. The key authenticates the sender; bot/server IDs are additional scope checks.
- Points cannot be bought, cashed out or exchanged for prizes with monetary value. No games or spending endpoints are included yet.

## Validation

`npm test` covers existing application behavior. `node --test test/level-points.test.js` checks key rotation/revocation, validation, existing-level credit, repeat claims, reset/replay handling, pre-login sync, owner authorization, CSRF and end-to-end HTTP claims. A real BotGhost request must still be verified after the shared key is installed.
