# RunFlow

RunFlow is a production-grade running performance dashboard that combines structured training plans with deep analytics. It features a robust web platform and a Hybrid Mobile App.

- **Web Platform & PWA**: Containerized Next.js 15 application with App Router and standalone output.
- **Mobile App (Android)**: Hybrid application built with Capacitor, providing native capabilities like Health Connect integration.

[**>>> Full Documentation <<<**](Web/DOCUMENTATION.md) — API reference, metrics formulas, and architecture.
[**>>> Mobile API Documentation <<<**](Web/MOBILE_API.md) — Protocol for Mobile App communication.

---

## 🏗️ Architecture

- **Frontend/Backend**: Next.js 15 + React 19 App Router (Service Layer Architecture).
- **Mobile**: Capacitor (Hybrid) Android App.
- **Database**: PostgreSQL 16.
- **ORM/Auth**: Prisma 7 + NextAuth v5 (Strava OAuth + credentials).
- **Styling**: Tailwind CSS 4.
- **Physics**: Custom implementation of Runalyze TRIMP, CTL/ATL/TSB, and Effective VO2max (7-Zone HR Model).

---

## 📂 Directory Structure

- **`Web/`**: The main application folder (Next.js), DB schema (Prisma), and API backend.
- **`Web/android/`**: The Capacitor Android project (Native wrapper).

---

## 🚀 Server Installation (Web)

RunFlow is designed to be self-hosted using Docker.

### 1. Prerequisites
- **Docker Engine** & **Docker Compose**.
- **Strava Account** (for API credentials).

### 2. Configuration
Navigate to the `Web` directory and configure your environment:

```bash
cd Web
cp .env.example .env
nano .env
```

**Key `.env` Variables**:
- `NEXTAUTH_URL`: Your server URL (e.g., `https://run.yourdomain.com`).
- `NEXTAUTH_SECRET`: Auth secret (`openssl rand -base64 32`).
- `AUTH_URL` / `AUTH_SECRET` / `AUTH_TRUST_HOST`: Optional aliases for Auth.js v5 deployments behind reverse proxies.
- `STRAVA_CLIENT_ID` / `SECRET`: From [Strava API Settings](https://www.strava.com/settings/api).
- `JWT_SECRET`: For mobile app authentication (`openssl rand -base64 32`).

### 3. Build & Run
Run the application using Docker Compose from the `Web` directory:

```bash
cd Web
docker compose up -d --build
```

### 4. Updates
To update the web application:
```bash
git pull origin master
cd Web
docker compose up -d --build
```

---

## 📱 Mobile App (Android)

The **RunFlow Mobile App** is a hybrid app built with **Capacitor**. It wraps the responsive web application and adds native plugins for enhanced functionality.

### Key Features
- **Unified Experience**: Shared UI/UX between web and mobile.
- **Health Connect Integration**: Sync workouts from Garmin, Peloton, and other fitness apps directly from your device's Health Connect store.
- **Native Notifications**: Receive training plan updates and reminders.
- **Background Sync**: Automatically syncs data when the app is active.

### Build Instructions
The mobile app project is located in `Web/android`.

```bash
cd Web
# 1. Build web assets
npm run build

# 2. Sync web assets to Android project
npx cap sync

# 3. Open in Android Studio to build APK/Bundle
npx cap open android
```

---

## 🛠️ Development

### Web (Hot-Reloading)
```bash
cd Web
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Backups
RunFlow supports automated database backups. Check `Web/DOCUMENTATION.md` for configuration details.
