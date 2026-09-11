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
