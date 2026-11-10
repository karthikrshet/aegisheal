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
git clone https://github.com/<your-username>/aegisheal.git
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
