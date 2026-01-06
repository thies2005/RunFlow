# RunFlow

RunFlow is a production-grade running performance dashboard that combines the best of **Runna** (structured training plans) and **Runalyze** (deep analytics). It is containerized with Docker for easy deployment and uses Cloudflare Tunnels for secure external access.

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS & Recharts for visualization.
- **Backend**: Next.js API Routes (Service Layer Architecture).
- **Database**: PostgreSQL 16 (persisted via Docker volume).
- **ORM**: Prisma for type-safe database access.
- **Auth**: NextAuth.js with Strava OAuth provider.
- **Analytics**: Custom implementation of TRIMP, CTL/ATL/TSB, and Effective VO2max (Runalyze physics).
- **Networking**: Cloudflare Tunnel (`cloudflared`) for secure public access without opening ports.

---

## 🚀 Docker Deployment (Recommended)

RunFlow is designed to be deployed using Docker Compose. We provide official multi-arch images (`linux/amd64`, `linux/arm64`) on Docker Hub.

### 1. Prerequisites

- **Docker & Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
- **Strava Account**: For API credentials ([Strava API Settings](https://www.strava.com/settings/api)).
- **Cloudflare Account** (Optional): For secure public access via Tunnels.

### 2. Quick Start

Create a `docker-compose.yml` file or clone the repository:

```bash
git clone https://github.com/t23wes3/RunFlow.git
cd RunFlow
```

Create a `.env` file with your credentials (see Configuration below), then run:

```bash
# Pull the latest image and start
docker compose pull
docker compose up -d
```

### 3. Updating

To update to the latest version:

```bash
docker compose pull
docker compose up -d
```

---

## ⚙️ Configuration

Create a `.env` file in the root directory. You can copy `.env.example` as a template.

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Postgres connection string. Internal Docker default: `postgresql://runflow:runflow@db:5432/runflow` |
| `NEXTAUTH_URL` | The full public URL of your app (e.g., `https://run.yourdomain.com`). |
| `NEXTAUTH_SECRET` | A random string for encryption. Generate with `openssl rand -base64 32`. |
| `STRAVA_CLIENT_ID` | From Strava API Settings. |
| `STRAVA_CLIENT_SECRET` | From Strava API Settings. |
| `TUNNEL_TOKEN` | (Optional) Cloudflare Tunnel token. |

---

## 🛠️ Development

To run the application locally for development:

```bash
# Start in development mode (builds from source, enables hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Database Management

- **Studio**: Run `npx prisma studio` to view data (requires local env setup).
- **Migrations**: `npx prisma migrate dev` (requires local DB connection).

---

## 💾 Backup & Restore

RunFlow includes an automated backup container (`postgres-backup`) that runs every 6 hours.

- **Location**: Backups are stored in `./backups` on the host.
- **Retention**: Keeps 7 daily, 4 weekly, and 6 monthly backups.

### Restoring Data

**Warning**: This will overwrite your current database.

**Windows**:
```powershell
.\scripts\restore.ps1 "backup_filename.sql.gz"
```

**Linux/Mac**:
```bash
./scripts/restore.sh "backup_filename.sql.gz"
```

---

## ⚡ Deployment Script (Maintainers)

For maintainers pushing new versions to Docker Hub:

```powershell
# Usage: .\scripts\deploy.ps1 "Commit message"
# Bumps version, builds multi-arch image, pushes to Hub & GitHub
.\scripts\deploy.ps1 "feat: new analytics engine"
```
