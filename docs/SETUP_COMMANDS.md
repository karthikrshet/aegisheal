# Setup commands — one by one

Copy each command, paste it into the terminal, press **Enter**, wait until it finishes, then go to the next one. Lines starting with `#` are explanations — don't paste them.

## Windows (PowerShell)

Open **Start → "PowerShell"**.

```powershell
# 1. Check Node.js (need v20 or newer). If missing: winget install OpenJS.NodeJS.LTS
node -v
```

```powershell
# 2. Check Git. If missing: winget install Git.Git   (then close and reopen PowerShell)
git --version
```

```powershell
# 3. Go to the folder where you keep projects
cd $HOME\Documents
```

```powershell
# 4. Download AegisHeal
git clone https://github.com/karthikrshet/aegisheal.git
```

```powershell
# 5. Enter the project
cd aegisheal
```

```powershell
# 6. Install everything (1–3 minutes)
npm install
```

```powershell
# 7. Create server\.env with a random secret
npm run setup
```

```powershell
# 8. Create demo accounts
npm run seed
```

```powershell
# 9. Start AegisHeal, then open http://localhost:5173
npm run dev
```

> If PowerShell says *running scripts is disabled*, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use **Command Prompt** — the same commands work there.

## macOS (Terminal)

```bash
# 1. Install Homebrew-managed Node.js if `node -v` fails
brew install node@20
```

```bash
node -v
```

```bash
git --version
```

```bash
cd ~/Documents
```

```bash
git clone https://github.com/karthikrshet/aegisheal.git
```

```bash
cd aegisheal
```

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run seed
```

```bash
npm run dev
```

## Linux (Ubuntu / Debian)

```bash
# Node.js 20 from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

```bash
sudo apt-get install -y nodejs git
```

```bash
node -v
```

```bash
git clone https://github.com/karthikrshet/aegisheal.git
```

```bash
cd aegisheal
```

```bash
npm install
```

```bash
npm run setup
```

```bash
npm run seed
```

```bash
npm run dev
```

## Your own `.env` (optional)

`npm run setup` already created `server/.env`. To set your own values instead, copy the template and edit it:

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

Open `.env`, change `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (and optionally `ANTHROPIC_API_KEY`), save, and restart `npm run dev`. Never commit `.env`.

## After installation

| Goal | Command |
|---|---|
| Start again later | `npm run dev` (inside the project folder) |
| Stop | `Ctrl + C` |
| Run all tests | `npm test` |
| Production mode (one port, :4000) | `npm start` |
| Get the latest code | `git pull` then `npm install` |
| Start from a clean database | `npm run reset-data -- --yes` then `npm run seed` |

## Using an AI coding assistant (prompts)

If you use Claude Code (or a similar assistant) in this folder, these prompts work well — the assistant reads `CLAUDE.md` and the skills in `.claude/skills` automatically:

1. `Set up this project and start it` — installs, creates .env, seeds and runs the app.
2. `Run the self-healing demo and tell me the MTTR of each incident`
3. `Run all tests and fix anything that fails`
4. `Add a new recovery action that <does X>` — follows the *add-recovery-action* skill.
5. `Teach the agent a new failure type: <describe symptom>` — follows *add-failure-signature*.
6. `Prepare the project for submission` — follows *release-checklist*.
