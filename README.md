# RunFlow

RunFlow is a production-grade running performance dashboard that combines the best of **Runna** (structured training plans) and **Runalyze** (deep analytics). It is containerized with Docker for easy deployment and uses Cloudflare Tunnels for secure external access.

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS & Recharts for visualization.
- **Backend**: Next.js API Routes.
- **Database**: PostgreSQL 16 (persisted via Docker volume).
- **ORM**: Prisma for type-safe database access.
- **Auth**: NextAuth.js with Strava OAuth provider.
- **Networking**: Cloudflare Tunnel (`cloudflared`) for secure public access without opening ports.

## 🚀 Deployment & Workflow

We utilize a **Dual-Branch Strategy** to seamlessly handle local development and production deployment.

### Branches

| Branch | Purpose | Docker Composition |
| :--- | :--- | :--- |
| **`main`** | Development & Source | Configured to **build** images locally (`build: .`). Changes here trigger builds. |
| **`dockerhub`** | Production Deployment | Configured to **pull** pre-built images (`image: t23wes3/runflow:TAG`). Best for servers. |

### The Deployment Script

The heart of our workflow is `scripts/deploy.ps1`. This PowerShell script automates the entire release process:

1.  **Bumps the version** in `package.json`.
2.  **Builds multi-arch images** (amd64/arm64) and pushes them to Docker Hub.
3.  Configures `docker-compose.yml` for **local build** and pushes to `main`.
4.  Configures `docker-compose.yml` for **image pull** and pushes to `dockerhub`.

### 🐳 Docker Hub Images

Our automated builds are available on Docker Hub as `t23wes3/runflow`. 

- **Link**: [t23wes3/runflow](https://hub.docker.com/r/t23wes3/runflow)
- **Architectures**: Multi-arch support for `linux/amd64` and `linux/arm64` (Raspberry Pi, ARM servers).

The `dockerhub` branch is pre-configured to pull these images, making deployment on production servers a simple `docker compose pull && docker compose up -d` process.

#### Usage

To deploy a new version from your development machine:

```powershell
# 1. Ensure you are on the main branch
git checkout main

# 2. Run deployment script
# Usage: .\scripts\deploy.ps1 "Your commit message"
.\scripts\deploy.ps1 "Added new analytics charts"
```

If you only changed code/docs and don't need a new Docker build (lighter update):

```powershell
.\scripts\deploy.ps1 "Update README" -SkipDocker
```

---

## 🛠️ Setup Guide

### Prerequisites

- **Docker & Docker Compose**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Node.js** (Optional, for local script execution)
- **Strava Account**: For API credentials.
- **Cloudflare Account**: For Tunnels.

### 1. Configuration (.env)

Duplicate `.env.example` to `.env` and configure the following:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Postgres connection string. Default: `postgresql://runflow:runflow@db:5432/runflow` |
| `NEXTAUTH_URL` | The full public URL of your app (e.g., `https://run.yourdomain.com`). |
| `NEXTAUTH_SECRET` | A random string for encryption. Generate with `openssl rand -base64 32`. |
| `STRAVA_CLIENT_ID` | From [Strava API Settings](https://www.strava.com/settings/api). |
| `STRAVA_CLIENT_SECRET` | From [Strava API Settings](https://www.strava.com/settings/api). |
| `TUNNEL_TOKEN` | Cloudflare Tunnel token. Get from Zero Trust Dashboard. |

### 2. Running Locally (Development)

Run the app locally with hot-reloading (via Docker mount) or standard build.

```bash
# Clone the repository
git clone https://github.com/t23wes3/RunFlow.git
cd RunFlow

# Start services (App, DB, Tunnel)
docker compose up --build
```

Access the app at `http://localhost:3000`.

### 3. Deploying to Production (Server)

On your VPS (e.g., Ubuntu, Raspberry Pi), use the `dockerhub` branch for a lightweight deployment.

```bash
# 1. Clone the repository (first time)
git clone -b dockerhub https://github.com/t23wes3/RunFlow.git
cd RunFlow

# 2. Set up environment
# Create your .env file here with production credentials

# 3. Pull and Start
docker compose pull
docker compose up -d
```

**Updating Production:**

When you've deployed a new version via the script, simply run this on your server:

```bash
git pull origin dockerhub
docker compose pull
docker compose up -d
```

---

## 🧪 Testing & Quality

To ensure stability, RunFlow includes a comprehensive test suite and strict build checks.

### Basic Testing
Run unit and snapshot tests using Jest:
```bash
npm run test
```

### Integration Testing
Run database-connected integration tests:
```bash
npm run test:integration
```

### Production Build Check
To verify the application compiles correctly and matches production requirements before deploying:
```bash
npm run build
```

---

## 📚 Features & Physics

### Key Metrics
- **TRIMP (Training Impulse)**: Calculated using Banister's formula based on heart rate reserve.
- **CTL (Chronic Training Load)**: 42-day weighted average of daily stress (Fitness).
- **ATL (Acute Training Load)**: 7-day weighted average (Fatigue).
- **TSB (Training Stress Balance)**: CTL - ATL (Form).
- **Effective VO2max**: Derived from race performances or training data.

### Cross-Training Logic
Cycling and other aerobic activities contribute to your **Cardiovascular Fitness (CTL)** but are excluded from **Running Impact Stress**. This allows you to track total metabolic fitness while monitoring specific running load to prevent injury.

---

## ❓ Troubleshooting

**Q: Database connection failed?**
A: Ensure the `db` service is healthy (`docker ps`) and `DATABASE_URL` in `.env` matches the postgres credentials.

**Q: "No matching manifest for linux/arm64..."**
A: Ensure you used the `deploy.ps1` script which builds multi-arch images. Standard local builds might only be amd64.

**Q: NextAuth "Try signing in with a different account"?**
A: Check that your `NEXTAUTH_URL` matches exactly the URL you are accessing (including https) and that the callback URL in Strava settings matches `https://your-domain.com/api/auth/callback/strava`.
