# RunFlow Flutter

Native Flutter client for the RunFlow mobile experience.

## Requirements

- Flutter 3.41.x
- Dart 3.11.x
- Android SDK 35

## Local Setup

1. Install dependencies:

```bash
flutter pub get
```

2. Regenerate code when providers or models change:

```bash
dart run build_runner build --delete-conflicting-outputs
```

3. Run the app:

```bash
flutter run
```

## Strava OAuth

Strava login uses a build-time define for the client ID.

```bash
flutter run --dart-define=STRAVA_CLIENT_ID=<your-client-id>
```

If `STRAVA_CLIENT_ID` is not provided, the app disables the Strava login action instead of launching an invalid OAuth flow.

## Validation

```bash
flutter analyze
flutter test
```
