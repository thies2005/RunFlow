# RunFlow

RunFlow is a production-grade running performance dashboard that combines structured training plans with deep analytics. It features a robust web platform and an Android application (Alpha).

- **Web Platform & PWA**: Containerized Next.js application for easy deployment. Our primary focus is on the web experience and the PWA for mobile devices.
- **Mobile App (Android)**: Native Android application for training management. (Currently in Alpha and development is paused).

[**>>> Full Documentation <<<**](Web/DOCUMENTATION.md) — API reference, metrics formulas, and architecture.
[**>>> Mobile API Documentation <<<**](Web/MOBILE_API.md) — Protocol for App-Server communication.

---

## 🏗️ Architecture

- **Frontend/Backend**: Next.js 14 App Router (Service Layer Architecture).
- **Mobile**: Native Kotlin Android App (Jetpack Compose).
- **Database**: PostgreSQL 16.
- **Physics**: Custom implementation of Runalyze TRIMP, CTL/ATL/TSB, and Effective VO2max.

---

## 📂 Directory Structure

- **`Web/`**: The web application (Next.js), DB schema (Prisma), and API backend.
- **`Web/android/`**: The Capacitor Android project (Java/Kotlin wrapper).

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
git pull origin main
cd Web
docker compose up -d --build
```

---

## 📱 Mobile App (Android)

> [!NOTE]
> RunFlow has transitioned to a **Hybrid Mobile App** architecture using **Capacitor**. The previous native Kotlin app is deprecated.

The Android application is now a native wrapper around the web platform, providing the same rich UI with added native capabilities like **Health Connect** integration.

### Features
- **Unified Experience**: Same powerful interface as the web.
- **Health Connect**: Sync activities from Garmin, Peloton, and other apps directly on your phone.
- **Native Notifications**: Stay updated on training plan progress.

### Build Instructions
The mobile app project is located in `Web/android`.

```bash
cd Web
# Build web assets
npm run build
# Sync to Android project
npx cap sync
# Open in Android Studio
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
Specifics for database backups can be found in the Web documentation. Automated backups run every 6 hours if configured.
