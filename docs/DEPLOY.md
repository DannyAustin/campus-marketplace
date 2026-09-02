# Deploying Campus Marketplace

Three pieces go live: a **database** (MongoDB Atlas), the **Go API** (Fly.io or Render),
and the **React frontend** (Vercel or Netlify). All three have free tiers that are enough
for a demo.

Everything the platforms need is already in the repo:

| File | Purpose |
|---|---|
| `Campus-MarketPlace-go/Dockerfile` | Builds the API into a ~15 MB static image |
| `Campus-MarketPlace-go/fly.toml` | Fly.io config: sleeps when idle, health-checks `/health` |
| `Campus-MarketPlace/vercel.json` | Serves `index.html` for client-side routes |
| `Campus-MarketPlace/netlify.toml` | Same, for Netlify |

> **Order matters.** The API needs to know the frontend's URL (CORS) and the frontend needs
> to know the API's URL. Deploy the API first, then the frontend, then come back and update
> the API's `ALLOWED_ORIGINS`. Step 4 covers this.

---

## 1. Database — MongoDB Atlas (free)

1. Sign up at <https://cloud.mongodb.com> and create a **free M0 cluster** (any region near you).
2. **Database Access** → *Add New Database User* → username + a strong password → role
   *Read and write to any database*. Save the password.
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   Fly and Vercel do not publish fixed egress IPs, so this is required. The database still
   requires the username and password — this only opens the network path.
4. **Connect** → *Drivers* → copy the connection string. It looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real password (URL-encode any `@ : / ?` characters).

The app creates the `bookbay` database, its collections and indexes on first start — there
is nothing to import.

---

## 2. API — Fly.io (recommended)

Fly sleeps the machine when idle and wakes it in about a second, so a demo link stays fast
and costs nothing.

```bash
# one-time: install the CLI and sign in
# Windows PowerShell:  iwr https://fly.io/install.ps1 -useb | iex
# macOS/Linux:         curl -L https://fly.io/install.sh | sh
fly auth signup       # or: fly auth login

cd Campus-MarketPlace-go
fly launch --no-deploy        # pick a name; say NO to adding a database
```

`fly launch` may rewrite `fly.toml` — keep the `[http_service]` and `[[http_service.checks]]`
blocks from the committed version if it drops them.

Set the secrets (never commit these):

```bash
fly secrets set \
  JWT_SECRET="$(openssl rand -hex 32)" \
  MONGO_URI="mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
  ALLOWED_ORIGINS="http://localhost:3000"

fly deploy
```

Check it:

```bash
curl https://<your-app>.fly.dev/health
# {"database":"connected","status":"ok"}
```

If that returns `degraded`, the Atlas URI or password is wrong — `fly logs` will say so.

<details>
<summary><b>Alternative: Render (no CLI, all in the browser)</b></summary>

1. <https://render.com> → **New** → **Web Service** → connect the GitHub repo.
2. **Root Directory** `Campus-MarketPlace-go` · **Runtime** Docker · **Instance Type** Free.
3. **Health Check Path**: `/health`
4. **Environment** → add `JWT_SECRET`, `MONGO_URI`, `ALLOWED_ORIGINS`.
5. Create Web Service.

Render's free tier sleeps after 15 minutes and takes ~50 s to wake, so the first click on a
cold demo is slow. Fly is noticeably better for a portfolio link.
</details>

---

## 3. Frontend — Vercel

1. <https://vercel.com> → **Add New** → **Project** → import the GitHub repo.
2. **Root Directory**: `Campus-MarketPlace` *(click Edit — this is not the repo root)*.
3. Framework preset: **Create React App** (auto-detected).
4. **Environment Variables** → add:

   | Name | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://<your-app>.fly.dev` |

   No trailing slash. CRA only exposes variables that start with `REACT_APP_`, and it bakes
   them in **at build time** — changing this later requires a redeploy, not just a restart.
5. **Deploy**.

<details>
<summary><b>Alternative: Netlify</b></summary>

**Add new site** → **Import an existing project** → pick the repo. `netlify.toml` already sets
the base directory, build command and the SPA redirect. Add `REACT_APP_API_URL` under
**Site configuration → Environment variables**, then **Deploy site**.
</details>

---

## 4. Connect them (the step everyone forgets)

The API is still only allowing `http://localhost:3000`, so the deployed frontend will show
*"Could not reach the server"*. Point it at the real frontend origin:

```bash
cd Campus-MarketPlace-go
fly secrets set ALLOWED_ORIGINS="https://<your-project>.vercel.app"
```

On Render: edit the `ALLOWED_ORIGINS` environment variable and redeploy.

The value is the **origin only** — scheme + host, no path and no trailing slash. To keep
local development working too, pass both, comma-separated:

```
ALLOWED_ORIGINS=https://<your-project>.vercel.app,http://localhost:3000
```

Then open the site, register an account, and post an item.

---

## Checklist

- [ ] `curl https://<api>/health` returns `{"database":"connected","status":"ok"}`
- [ ] The frontend loads and the sign-in page renders
- [ ] Registering works — if it fails with *"Could not reach the server"*, `ALLOWED_ORIGINS`
      does not match the frontend origin exactly (check `https` vs `http`, and no trailing slash)
- [ ] Posting an item with a photo works, and the photo displays on the card
- [ ] Refreshing on `/cart` stays on the cart page (this is what the SPA rewrite fixes)
- [ ] `JWT_SECRET` is at least 32 characters — the server refuses to start otherwise

---

## Notes and limits

- **Free-tier sleep.** Fly wakes on the first request (~1 s); Render takes ~50 s. Neither loses data.
- **Photos live in MongoDB** (max 10 MB each) and Atlas M0 gives 512 MB total — fine for a
  demo, but object storage is the right answer for real traffic.
- **Sessions are signed with `JWT_SECRET`.** Changing it signs everyone out. Keep it out of git;
  `.env` files are already ignored.
- **Cost.** Atlas M0, Fly's free allowance and Vercel's hobby tier are all $0. Set a spend limit
  on Fly if you want a hard guarantee.
