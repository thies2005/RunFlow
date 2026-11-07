# AGENTS.md

The Flutter app was removed from the repository (v2.3.0). The mobile app is the
native Kotlin/Compose app in `android/`; Strava OAuth is configured server-side,
so no client ID is needed at build time. A backup of the old Flutter source is
kept outside the repo (`~/Documents/runflow-flutter-app-backup-2026-09-11.zip`).

## Build Commands (native Android app)

Working directory for all commands: `android/`

### Build APK
```
./gradlew assembleDebug     # debug APK
./gradlew assembleRelease   # R8-minified + signed (needs android/key.properties)
```

When asked to build the APK, always build the release APK (`assembleRelease`);
only use debug if explicitly requested.

### Compile check
```
./gradlew :app:compileDebugKotlin
```

### Test
```
./gradlew testDebugUnitTest
```

## Pre-push Checklist

Before pushing changes to the Android app, always run:
1. `./gradlew :app:compileDebugKotlin` - must pass with zero errors
2. `./gradlew testDebugUnitTest` - must pass with zero failures

## Important Notes
- JDK 17 and the Android SDK path come from `android/gradle.properties` (`org.gradle.java.home`).
- Release signing reads the gitignored `android/key.properties`; without it the release build is unsigned.
- The plan engine is the web engine only (server when signed in, on-device port otherwise) — the classic Daniels engine was removed in v2.3.0.

## Android release policy

Follow `docs/releases/README.md` and the `github-release-publishing` skill for release
work. Pushes to master update the rolling development prerelease. Create or push a
stable `vX.Y.Z` tag **only after the user explicitly requests that stable release**;
setup, routine fixes and ordinary pushes are not a stable release instruction.
Preserve the native app signing identity. Before release, calculate the source
versionCode from the final full-history commit count (including preparation commits),
verify tag/version/notes and checks, then monitor publication and verify downloads.
Do not choose a project license or delete old releases without explicit user approval.

## MyWhoosh integration constraint

Use local workout-file import, offline catalog matching, and `.zwo` export only.
Do not use unofficial MyWhoosh HTTP APIs or contact `mywhoosh.com`,
`service14.mywhoosh.com`, `service20.mywhoosh.com`, `coaching.mywhoosh.com`,
or MyWhoosh CDN hosts from this integration. Do not add account connections,
login/token flows, calendar pulls, cloud pushes, or MyWhoosh-specific database
models. This preserves the user's October 20, 2026 scope decision.
