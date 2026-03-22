# PraesagiumChain Installation (Windows / WSL)

**Full stack setup** (PostgreSQL, Docker, contracts, backend, frontend) is documented in **[docs/setup.md](docs/setup.md)** — use that as the primary guide for new machines.

This file is the **supplement for Windows developers**: terminal profile, Node inside WSL, and `node-gyp`-related pitfalls. Follow it when you develop on Windows with WSL2.

---

To avoid `node-gyp` errors (EPERM on `C:\Windows`), UNC paths, and "no package.json", **everything must run in WSL with Node installed inside WSL**, not with Windows Node.

---

## 1. Use WSL terminal in Cursor

The project includes configuration so the integrated terminal defaults to **WSL** on Windows:

- **File:** `.vscode/settings.json` → `terminal.integrated.defaultProfile.windows: "Ubuntu (WSL)"`
- If your WSL distro has a different name (e.g. `Ubuntu-22.04`), change `"Ubuntu"` to your distro name in that profile.

**What to do:** close any open terminals, open a **new** terminal in Cursor (Ctrl+` or Terminal → New terminal). It should open an **Ubuntu (WSL)** terminal. The prompt should look like `user@host:~$` or `user@host:/path$`.

If you don't see the "Ubuntu (WSL)" option, install the **WSL** extension in Cursor and open the terminal again.

---

## 2. Node inside WSL

In that WSL terminal, check which Node you're using:

```bash
node -p "process.platform"
```

- If you see **`linux`** → good, continue to step 3.
- If you see **`win32`** or an error → you're using Windows Node. Install Node inside WSL:

**With nvm (recommended):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**With apt:**

```bash
sudo apt update && sudo apt install -y nodejs npm
```

Check again: `node -p "process.platform"` should be `linux`.

---

## 3. Install the whole project

From the project root, run (with bash directly, not npm):

```bash
./scripts/install-all.sh
```

Do not use `npm run install:all` if your npm in WSL is the Windows one (fails with CMD/UNC).

That script installs:

- **Root** dependencies (Hardhat, OpenZeppelin, Chainlink)
- **Frontend** dependencies (Next.js, Wagmi, etc.)
- **CRE** dependencies (with `--ignore-scripts`; the postinstall `cre-setup` is not on public npm)
- **Backend Rust** (if you have `cargo` installed)

---

## 4. If only the frontend fails

If the root and the rest install fine but the frontend fails or errors:

```bash
./scripts/install-frontend.sh
```

or:

```bash
npm run install:frontend
```

That cleans `node_modules` and `frontend/node_modules` and does a fresh `npm install` from the repo root (which includes the frontend workspace).

---

## 5. Verify Node is correct

```bash
./scripts/check-node.sh
```

It should say something like: `OK: Node is Linux`.

---

## 6. How to run

- **Frontend:** `cd frontend && npm run dev` → http://localhost:3000  
- **Local Hardhat node:** `npm run node`  
- **Backend (after Hardhat is running):** `npm run backend`

---

## Quick summary

1. Open a **new terminal** in Cursor (must be WSL).
2. Check `node -p "process.platform"` → `linux`.
3. From project root: `./scripts/install-all.sh` (or `npm run install:all`).
4. Run: `cd frontend && npm run dev`.
