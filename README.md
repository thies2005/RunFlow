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
- **`App/`**: The Android mobile application source code.

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

> [!IMPORTANT]
> The native Android app is currently in **Alpha** status. Active development is currently **paused** as the focus has shifted towards the Web platform and PWA (Progressive Web App) for mobile use.

The Android app is built with Kotlin and Jetpack Compose.

### 1. Requirements
- **Android Studio** (Koala or newer recommended).
- **JDK 17**.

### 2. Setup
1. Open the project in Android Studio by selecting the `App` directory.
2. Allow Gradle to sync and download dependencies.
3. Configure the backend URL in the app settings or build config if necessary (refer to `App` source for endpoint configuration, typically dynamic).

### 3. Build
Build the APK using Gradle:
```bash
cd App
./gradlew assembleDebug
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
