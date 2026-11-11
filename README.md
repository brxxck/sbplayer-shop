<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB's & Cam's Store — Community Website

Private source repository for the Discord-based community portal planned for **https://sbplayer.shop**.

## Repository upload status

The repository has been initialized with protective Git ignore rules. The V1.2.1 application source is **not uploaded yet**. Do not deploy until the application files are present.

## Upload the V1.2.1 source from Windows

1. Download and extract the `sbs-cams-community-v1.2.1-ui-fix.zip` project.
2. **Do not copy your `.env`, `data`, or `public/uploads` into the repository.** They contain live secrets, member submissions, and private data.
3. Open PowerShell in the extracted project folder (the one containing `package.json`).
4. Run:

```powershell
git init
git branch -M main
git remote add origin https://github.com/brxxck/sbplayer-shop.git
git fetch origin main
git reset --soft origin/main
git add .
git status --short
git diff --cached --name-only
```

Before committing, check that the staged list includes source files and `package.json`, **but not** any `.env`, database, private session files, or uploaded member content. If anything sensitive is staged, stop and unstage it; do not push.

Then run:

```powershell
git commit -m "Add SB's & Cam's Store V1.2.1 source"
git push -u origin main
```

If Git asks for sign-in, use GitHub's browser authorization. If the remote already exists, check `git remote -v` before changing it.

## Deployment requirements

- Node.js 24
- Configured private environment variables on the host
- Persistent volumes for SQLite and uploaded media
- HTTPS and Discord OAuth callback `https://sbplayer.shop/auth/callback`
- A verified Discord bot with the appropriate member intent and role hierarchy

Never commit or share Discord credentials. Rotate any previously disclosed Client Secret, Bot Token, or webhook. 
