# RunFlow

RunFlow is a production-grade running performance dashboard that combines structured training plans with deep analytics. It is containerized with Docker for easy deployment on any server (VPS, Raspberry Pi, Home Lab).

## 🏗️ Architecture

- **Frontend/Backend**: Next.js 14 App Router (Service Layer Architecture).
- **Database**: PostgreSQL 16.
- **Physics**: Custom implementation of Runalyze TRIMP, CTL/ATL/TSB, and Effective VO2max.
- **Platforms**: Builds natively on `linux/amd64` and `linux/arm64`.

---

## 🚀 Server Installation

This is the recommended way to install RunFlow on a Linux server or VPS. The application is built locally from source.

### 1. Prerequisites
- **Docker Engine** & **Docker Compose** installed.
- **Git** (to fetch the source code).
- **Strava Account** (for API credentials).

### 2. Clone & Configure

```bash
# 1. Clone the repository
git clone https://github.com/t23wes3/RunFlow.git
cd RunFlow

# 2. Configure Environment
cp .env.example .env
nano .env
```

**Required .env Configuration**:
| Variable | Description |
| :--- | :--- |
| `NEXTAUTH_URL` | Must match your server's access URL (e.g., `https://run.yourdomain.com`). |
| `NEXTAUTH_SECRET` | A secret key. Generate with: `openssl rand -base64 32`. |
| `STRAVA_CLIENT_ID` | From [Strava API Settings](https://www.strava.com/settings/api). |
| `STRAVA_CLIENT_SECRET` | From [Strava API Settings](https://www.strava.com/settings/api). |

### 3. Build & Deploy

```bash
# Build and start (first run takes a few minutes)
docker compose up -d --build
```

### 4. Updating

To update to the latest version:

```bash
# Pull latest source
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

---

## 🛠️ Local Development

For developers who want hot-reloading:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## 💾 Backups

Automated backups run every 6 hours and are stored in `./backups`.

**To restore:**
```bash
./scripts/restore.sh "backup_file_name.sql.gz"
```

---

## ⚙️ Advanced Configuration

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Internal Docker link. Default: `postgresql://runflow:runflow@db:5432/runflow` |
| `TUNNEL_TOKEN` | (Optional) Cloudflare Tunnel token for secure remote access without port forwarding. |
