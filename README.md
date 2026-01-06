# RunFlow

RunFlow is a production-grade running performance dashboard that combines structured training plans with deep analytics. It is containerized with Docker for easy deployment on any server (VPS, Raspberry Pi, Home Lab).

![RunFlow Dashboard](public/dashboard-preview.png)

## 🏗️ Architecture

- **Frontend/Backend**: Next.js 14 App Router (Service Layer Architecture).
- **Database**: PostgreSQL 16.
- **Physics**: Custom implementation of Runalyze TRIMP, CTL/ATL/TSB, and Effective VO2max.
- **Images**: Multi-arch support (`linux/amd64`, `linux/arm64`) hosted on Docker Hub.

---

## 🚀 Server Installation (Docker Hub)

This is the recommended way to install RunFlow on a Linux server or VPS. We pull the heavy application image from Docker Hub, so you don't need to build it.

### 1. Prerequisites
- **Docker Engine** & **Docker Compose** installed.
- **Git** (to fetch configuration files).
- **Strava Account** (for API credentials).

### 2. Install
On your server, run the following:

```bash
# 1. Clone the repository to get configuration files
# We only need docker-compose.yml and the scripts
git clone https://github.com/t23wes3/RunFlow.git
cd RunFlow

# 2. Configure Environment
# Copy the example file and edit it with your credentials
cp .env.example .env
nano .env
```

**Required .env Configuration**:
- `NEXTAUTH_URL`: Must match your server's access URL (e.g., `https://run.yourdomain.com`).
- `NEXTAUTH_SECRET`: Generate one (e.g., `openssl rand -base64 32`).
- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`: Get these from [Strava Settings](https://www.strava.com/settings/api).

### 3. Deploy
Start the application. Docker will pull the pre-built application image from Docker Hub.

```bash
docker compose up -d
```

*Note: The first run will build a small 'migrator' helper container to set up the database schema. This takes a few moments.*

### 4. Updates
To update to the latest version of RunFlow in the future:

```bash
# Get latest config (if any)
git pull origin main

# Pull latest Docker image
docker compose pull

# Restart
docker compose up -d
```

---

## 🛠️ Local Development (Build from Source)

If you are a developer wanting to modify the code:

```bash
# Clone
git clone https://github.com/t23wes3/RunFlow.git
cd RunFlow

# Start in Dev Mode (Hot-Reloading)
# Uses docker-compose.dev.yml to mount source code
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## ⚙️ Advanced Configuration

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Internal Docker link. Leave default: `postgresql://runflow:runflow@db:5432/runflow` |
| `TUNNEL_TOKEN` | (Optional) Cloudflare Tunnel token for secure remote access. |

## 💾 Backups
Automated backups run every 6 hours and are stored in the `./backups` directory on your server.
To restore:
```bash
./scripts/restore.sh "backup_file_name.sql.gz"
```
