# Deploying GPSFDK ERP — MongoDB Atlas + Render (API) + Vercel (Web)

Architecture after deploy:

```
MongoDB Atlas (M0 free)
        ▲
        │ SRV connection string
        │
Render Web Service  ──►  https://gpsfdk-erp-api.onrender.com   (Express API)
        ▲
        │ VITE_API_URL = .../api      (CORS-allowed)
        │
Vercel Static Site  ──►  https://gpsfdk-erp.vercel.app          (React build)
```

Auth works cross-origin because the client sends the JWT in the `Authorization: Bearer`
header (stored in `localStorage`); the httpOnly cookie is a same-origin convenience only.

---

## Step 0 — Push the code to GitHub

Render and Vercel both deploy from a Git repo.

```powershell
cd d:\gpserprefresh
git init
git add .
git commit -m "GPSFDK ERP initial commit"
git branch -M main
git remote add origin https://github.com/<you>/gpsfdk-erp.git
git push -u origin main
```

> `.gitignore` already excludes `node_modules/`, `.env`, `dist/`, and `.mongodata/`,
> so your secrets and the local DB are **not** pushed. Good.

---

## Step 1 — MongoDB Atlas (database)

1. Create a free account at https://www.mongodb.com/cloud/atlas → **Build a Database** → **M0 (Free)**.
2. **Database Access** → Add a user (e.g. `gpsfdk`) with a password. Save the password.
3. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`).
   Render's free tier has rotating IPs, so this is the simplest reliable option.
4. **Connect** → **Drivers** → copy the SRV string. Insert your password and the DB name:

   ```
   mongodb+srv://gpsfdk:<password>@cluster0.xxxxx.mongodb.net/gpsfdk_erp?retryWrites=true&w=majority
   ```

   (The `/gpsfdk_erp` before the `?` is the database name — keep it.)

---

## Step 2 — Render (backend API)

1. https://dashboard.render.com → **New** → **Web Service** → connect your GitHub repo.
2. Configure:
   | Field | Value |
   |-------|-------|
   | **Root Directory** | `server` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |
3. **Environment** → add variables:
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | your Atlas SRV string from Step 1 |
   | `JWT_SECRET` | a long random string (generate below) |
   | `CLIENT_URL` | `http://localhost:5173` *(temporary — update in Step 4)* |
   | `NODE_ENV` | `production` |

   Generate a strong secret:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   > Do **not** set `PORT` — Render injects its own and the server reads `process.env.PORT`.
4. **Create Web Service**. Wait for the deploy; note the URL, e.g.
   `https://gpsfdk-erp-api.onrender.com`.
5. Verify: open `https://gpsfdk-erp-api.onrender.com/api/health` → `{"status":"ok",...}`.

> ⚠️ Free Render services **sleep after ~15 min idle**; the first request then takes
> ~50s to cold-start. Fine for demos; upgrade to a paid instance for always-on.

---

## Step 3 — Vercel (frontend)

1. https://vercel.com → **Add New** → **Project** → import the same repo.
2. Configure:
   | Field | Value |
   |-------|-------|
   | **Root Directory** | `client` |
   | **Framework Preset** | Vite (auto-detected) |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
3. **Environment Variables** → add **before** deploying (Vite inlines env at build time):
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://gpsfdk-erp-api.onrender.com/api` |

   (Use your real Render URL, and keep the trailing `/api`.)
4. **Deploy**. Note the domain, e.g. `https://gpsfdk-erp.vercel.app`.

   `client/vercel.json` already adds the SPA rewrite so refreshing `/dashboard`,
   `/projects`, etc. doesn't 404.

---

## Step 4 — Connect the two (CORS) & seed

1. Back in **Render → Environment**, set `CLIENT_URL` to your Vercel domain
   (no trailing slash). You can list several, comma-separated:
   ```
   https://gpsfdk-erp.vercel.app
   ```
   Save → Render redeploys automatically.

2. **Seed the Atlas database once** from your machine (PowerShell):
   ```powershell
   cd d:\gpserprefresh\server
   $env:MONGODB_URI="<your Atlas SRV string>"
   npm run seed
   Remove-Item Env:MONGODB_URI
   ```
   This loads the demo users, projects, tenders, etc. into Atlas.

3. Open your Vercel URL, log in with `admin@gpsfdk.com` / `password123`, and you're live. 🎉

---

## Redeploys

- **Push to `main`** → Render and Vercel both auto-build and redeploy.
- Changed `VITE_API_URL`? Trigger a fresh Vercel deploy (env is baked in at build time).
- Changed any Render env var? Render redeploys automatically.

## Production hardening checklist

- [ ] `JWT_SECRET` is a fresh random value (not the dev one in `server/.env`).
- [ ] Atlas DB user password is strong and not reused.
- [ ] Consider restricting Atlas Network Access once you know your egress IPs.
- [ ] Remove or rotate the seeded demo accounts / default `password123`.
- [ ] (Optional) Add a custom domain in Vercel and add it to Render `CLIENT_URL`.
- [ ] (Optional) Upgrade Render to a paid instance to avoid cold starts.
