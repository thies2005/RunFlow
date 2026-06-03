# AGENTS.md

## Build Commands

### Build APK (always include Strava Client ID)
```
flutter build apk --release --dart-define=STRAVA_CLIENT_ID=193995
```

### Analyze
```
flutter analyze
```

### Test
```
flutter test
```

## Pre-push Checklist

Before pushing changes to the Flutter app, always run both:
1. `flutter analyze` - must pass with zero errors 
2. `flutter test` - must pass with zero failures

## Important Notes
- Always build with `--dart-define=STRAVA_CLIENT_ID=193995` to include Strava configuration.
- The Strava Client ID is injected at build time via `String.fromEnvironment('STRAVA_CLIENT_ID')`.
- Working directory for Flutter commands: `flutter/`
