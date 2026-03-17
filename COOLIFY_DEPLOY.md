# Deploying RunFlow on Coolify

This guide walks you through deploying RunFlow (frontend + PostgreSQL database) on [Coolify](https://coolify.io) using the included `docker-compose.coolify.yml`.

> **Existing deployment not affected.** The original `docker-compose.yml` and `Dockerfile` are unchanged. The new `docker-compose.coolify.yml` is a separate file used only by Coolify.

---

## What gets deployed

| Service | Description |
|---|---|
| `app` | Next.js 14 frontend (port 3000, proxied by Coolify) |
| `db` | PostgreSQL 16 database (internal only) |
| `migrator` | One-shot container — runs Prisma migrations on every deploy |
| `permissions-fixer` | One-shot container — sets correct ownership on the backups volume |
| `backup` | Automated pg_dump every 6 hours, keeps 7 days / 4 weeks / 6 months |
| `reminder-cron` | Polls `/api/cron/reminders` every 5 minutes |
| `feedback-queue-cron` | Polls `/api/internal/process-feedback-queue` every 60 seconds |

---

## Prerequisites

- A running Coolify instance (v4.x or later)
- Your GitHub repository connected as a Source in Coolify
- A server added to Coolify with Docker installed

---

## Step 1 — Create a new resource

1. In the Coolify sidebar, click **Projects** and open (or create) your project.
2. Click **+ New Resource**.
3. Select **Docker Compose**.
4. When asked for the source, choose **Git Repository** and pick your GitHub repo (`thies2005/run-flow` or whatever yours is called).
5. Set the **branch** to `coolify`.

---

## Step 2 — General configuration

After the resource is created you land on the **Configuration → General** page.

| Field | Value |
|---|---|
| **Build Pack** | `Docker Compose` |
| **Base Directory** | `/Web` |
| **Docker Compose Location** | `/docker-compose.coolify.yml` |
| **Domains** | Set your desired domain, e.g. `https://runflow.yourdomain.com` — or click **Generate Domain** for a free `*.sslip.io` subdomain |

> The `SERVICE_FQDN_APP=3000` line in the compose file tells Coolify that the `app` service on port 3000 is the one to attach your domain to. You do **not** need to configure ports manually.

---

## Step 3 — Environment Variables

Go to **Configuration → Environment Variables** and add the following. Required fields are marked with *.

### Database (required)

| Variable | Example / Notes |
|---|---|
| `POSTGRES_USER` | `runflow` |
| `POSTGRES_PASSWORD` * | Generate a strong password — e.g. `openssl rand -base64 32` |
| `POSTGRES_DB` | `runflow` |

> `DATABASE_URL` is assembled automatically inside the compose file from the three variables above. You do **not** need to set it separately.

### Application (required)

| Variable | How to generate |
|---|---|
| `NEXTAUTH_SECRET` * | `openssl rand -base64 32` |
| `NEXTAUTH_URL` * | Your full public URL — e.g. `https://runflow.yourdomain.com` |
| `ENCRYPTION_KEY` * | `openssl rand -base64 32` |
| `JWT_SECRET` * | `openssl rand -base64 32` (min 32 chars) |
| `CRON_SECRET` * | `openssl rand -hex 20` |
| `ADMIN_USERNAME` * | e.g. `admin` |
| `ADMIN_PASSWORD` * | Strong password |

### JWT token expiry (optional — defaults shown)

| Variable | Default |
|---|---|
| `JWT_ACCESS_EXPIRY` | `24h` |
| `JWT_REFRESH_EXPIRY` | `30d` |

### Strava integration (optional)

Create an app at [strava.com/settings/api](https://www.strava.com/settings/api) first.

| Variable | Notes |
|---|---|
| `STRAVA_CLIENT_ID` | Numeric App ID from Strava |
| `STRAVA_CLIENT_SECRET` | Client Secret from Strava |
| `STRAVA_VERIFY_TOKEN` | Any random string — used to verify webhook calls |

### Push notifications / VAPID (optional)

Generate a VAPID key pair once:

```bash
npx web-push generate-vapid-keys
```

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | The public key output |
| `VAPID_PRIVATE_KEY` | The private key output |

### Email / SMTP (optional)

| Variable | Example |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` (for STARTTLS) or `true` (for SSL/465) |
| `SMTP_USER` | Your email address |
| `SMTP_PASS` | App password (not your login password) |
| `SMTP_FROM` | `RunFlow <no-reply@yourdomain.com>` |

### Nutrition API — FatSecret (optional)

Register at [platform.fatsecret.com](https://platform.fatsecret.com/api/).

| Variable | Notes |
|---|---|
| `FATSECRET_CLIENT_ID` | From FatSecret developer portal |
| `FATSECRET_CLIENT_SECRET` | From FatSecret developer portal |

### Error tracking — Sentry (optional)

| Variable | Notes |
|---|---|
| `SENTRY_DSN` | From your Sentry project settings |
| `NEXT_PUBLIC_SENTRY_DSN` | Same DSN (needed at build time for client-side Sentry) |

> If using Sentry, also set `NEXT_PUBLIC_SENTRY_DSN` as a **Build Variable** (not just a runtime env var) so it gets baked into the Next.js client bundle during the Docker build.

---

## Step 4 — Persistent Storage

Coolify manages volumes declared in the compose file automatically. The following named volumes will be created:

| Volume | Used by |
|---|---|
| `postgres_data` | PostgreSQL data directory |
| `backups` | Automated database backups |

No additional action needed — Coolify handles these on first deploy.

---

## Step 5 — Deploy

Click **Deploy** (top-right). Coolify will:

1. Clone your repository from the `coolify` branch.
2. Build the Docker image using `Web/Dockerfile` (multi-stage, ~5-10 min first build).
3. Start `db` and wait for it to be healthy.
4. Run `permissions-fixer` and `migrator` (applies all Prisma migrations automatically).
5. Start `app`, `backup`, `reminder-cron`, and `feedback-queue-cron`.
6. Assign your domain and provision a TLS certificate automatically.

You can watch progress under the **Deployments** tab and live logs under **Logs**.

---

## Step 6 — Verify

Once the deploy shows as **Running**, open your domain in a browser. You should see the RunFlow login page.

To confirm the database migrations applied successfully, check the `migrator` container logs in Coolify's **Logs** tab — look for `All migrations have been successfully applied.`

---

## Strava webhook setup (after first deploy)

If you enabled Strava, register the webhook callback with Strava's API once your domain is live:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_STRAVA_CLIENT_ID \
  -F client_secret=YOUR_STRAVA_CLIENT_SECRET \
  -F callback_url=https://runflow.yourdomain.com/api/webhooks/strava \
  -F verify_token=YOUR_STRAVA_VERIFY_TOKEN
```

---

## Redeploying

Every push to the `coolify` branch can trigger an automatic redeploy. Enable this in Coolify under **Configuration → Git Source → Auto Deploy on Push**.

On each redeploy the `migrator` container runs again and applies any new migrations — no manual database work needed.

---

## Differences between this and the original docker-compose.yml

| Feature | `docker-compose.yml` (original) | `docker-compose.coolify.yml` |
|---|---|---|
| Reverse proxy | Cloudflare Tunnel (`tunnel` service) | Coolify's built-in Traefik proxy |
| Host port mappings | `3000:3000`, `5434:5432` | None (all internal) |
| HTTPS / TLS | Via Cloudflare | Auto-provisioned by Coolify |
| Backup volume | Bind mount `./backups` | Named volume `backups` |
| `container_name` | Explicit names | Omitted (Coolify manages naming) |

The `Dockerfile` is **identical** for both deployments.
