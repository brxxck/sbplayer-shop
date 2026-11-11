<!-- // BUILT BY SB // RUNING ON WEED AND CAFFEINE -->
# SB's & Cam's Store — Community Website

Private source repository for the Discord-based community portal intended for **https://sbplayer.shop**.

## Current status

The repository is initialized with a `.gitignore` to protect Discord credentials, SQLite databases, sessions, and uploaded member data. **The website V1.2.1 application source has not been uploaded yet.** Do not deploy this repository until its actual application files are present.

## Safely upload the website source from Windows

1. Download and extract `sbs-cams-community-v1.2.1-ui-fix.zip`.
2. Clone this private repository into a **new** folder:

```powershell
git clone https://github.com/brxxck/sbplayer-shop.git
```

3. Copy the application source files from the extracted ZIP into the freshly cloned `sbplayer-shop` folder, including `package.json`, the `src` directory, `public` static assets, tests and configuration templates.
4. **Do not copy** your real `.env`, `data`, `public/uploads`, `node_modules`, or any local database, backup, session, token or secret files. Leave the repository's protective `.gitignore` in place.
5. Open PowerShell inside the cloned `sbplayer-shop` directory and run:

```powershell
git add .
git status --short
git diff --cached --name-only
```

Inspect the exact staged file list. Confirm it contains application source and `package.json` but **no** private values or user data. If you find anything sensitive, **do not commit or push**: unstage it with `git restore --staged -- <filename>` and remove the sensitive file from the cloned working folder.

When everything is safe:

```powershell
git commit -m "Add SB's & Cam's Store V1.2.1 source"
git push origin main
```

GitHub may prompt for browser login.

## Deployment notes

- Node.js 24 recommended
- Configure private environment variables in hosting settings; don't upload `.env`
- Persistent storage for SQLite data and media uploads
- HTTPS, production `BASE_URL=https://sbplayer.shop`
- Discord OAuth redirect `https://sbplayer.shop/auth/callback`
- Discord bot installed in the target guild, with required permissions and role hierarchy

Rotate any Discord Client Secret, Bot Token, or webhook previously disclosed in a chat before launch.
