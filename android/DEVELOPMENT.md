# Android development and testing

The native app is in `android/`. `Web/android/` is a separate Capacitor project;
do not use it to develop the Kotlin/Compose app. Run the commands below from `android/`.
The app can run offline without a backend, account, or Strava client ID.

## Installed environment

This workstation has JDK 17 at `/home/thies/sdk/jdk-17`, Android SDK at
`/home/thies/Android/Sdk`, platform/build tools 36, and the `Pixel7_API35` AVD
with KVM acceleration. A separate `RunFlow_Test_API35` AVD uses the installed
API 35 AOSP image for development tests. Gradle 8.14 is provided by `./gradlew`.
No global Gradle installation or Android Studio is needed.

```bash
./dev doctor
./dev check
```

`check` compiles the app, runs JVM tests, runs Android lint, and compiles device
tests. Reports are in `app/build/reports/tests/testDebugUnitTest/index.html` and
`app/build/reports/lint-results-debug.html`.

For a fresh JVM test execution, bypassing Gradle's up-to-date/build cache:

```bash
./gradlew testDebugUnitTest --rerun-tasks
```

## Emulator and daily development

In one terminal, start the dedicated test emulator (close it normally when done):

```bash
./dev emulator
# Headless alternative:
./dev emulator RunFlow_Test_API35 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect
```

In another terminal:

```bash
./dev wait
./dev device-test
```

For a signed release, start `./dev emulator Pixel7_API35` instead and use
`./dev run` to build, install with existing data preserved, and launch.
Use `./dev logcat` for the app's current process; restart it after process changes.
When both emulators are running, use `adb devices -l` and set `ANDROID_SERIAL`.

`run` uses the release build as required by this repository. Release signing uses
the existing gitignored `key.properties` and keystore. Keep these private.
`./dev release` builds without installing. The signed APK is
`app/build/outputs/apk/release/app-release.apk`. Without signing configuration,
Gradle can produce an unsigned release, which `run` cannot install.

For step-through debugging, explicitly choose a debug build:

```bash
./gradlew installDebug
adb shell am start -W -n com.runflow2.app/.MainActivity
```

Debug and release currently share `com.runflow2.app`. Android rejects replacing
an installation signed with a different key. Use a separate AVD for debug/device
tests rather than removing an app containing real user data.

With multiple devices, select one explicitly:

```bash
ANDROID_SERIAL=emulator-5554 ./dev run
ANDROID_SERIAL=emulator-5556 ./dev device-test
```

## Device tests

```bash
./dev device-test
```

This builds and installs the debug app and its AndroidJUnitRunner test APK, then
executes Compose UI tests. `AppSmokeTest` exercises the real application startup,
offline onboarding when needed, and Plan/Analytics/Athlete/Today navigation. It
does not sign in and requires no backend. Use a dedicated test emulator: it
persists onboarding changes in normal app storage, and does not erase app data.
Existing authenticated installations should not be used as test fixtures.

Reports: `app/build/reports/androidTests/connected/debug/index.html`.
Add JVM tests under `app/src/test/java` for pure logic and mocked HTTP contracts;
add device tests under `app/src/androidTest/java` for Android runtime and Compose
behavior. GPS, Health Connect, notification permissions, and OAuth still need
scenario-specific device/account testing; the smoke test does not cover them.

## Optional local backend

The app defaults to the hosted RunFlow server. For backend development, use Node
24 and the separate instructions in the root README and `Web/DOCUMENTATION.md`.
Keep the existing `Web/.env` private. Do not run schema changes against an unknown
database; use a dedicated local PostgreSQL database.

With the local web server listening on port 3000 and a **debug** app installed:

```bash
./dev local-backend
```

Set the app's Settings server URL to `http://localhost:3000`. `adb reverse` works
for emulators and USB devices. On the standard emulator, `http://10.0.2.2:3000`
is another route to the host. The debug network security config permits HTTP only
for localhost, 127.0.0.1, and 10.0.2.2; release requires HTTPS. Use a test account
for sync checks. OAuth also needs matching server-side redirect configuration.

## New machines and CI

Install JDK 17 and Android command-line tools, accept SDK licenses, then install:

```bash
sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' \
  'emulator' 'system-images;android-35;default;x86_64'
avdmanager create avd -n RunFlow_Test_API35 -k 'system-images;android-35;default;x86_64' -d pixel_7
```

Set `sdk.dir` in gitignored `android/local.properties` to the SDK installation.
Set `JAVA_HOME` to JDK 17; `./dev` overrides the workstation-specific
`org.gradle.java.home` with it. For direct wrapper commands on another machine:

```bash
./gradlew -Dorg.gradle.java.home="$JAVA_HOME" :app:compileDebugKotlin testDebugUnitTest
```

`.github/workflows/android.yml` runs compile/unit/lint checks and device tests on
an API 35 emulator, uploading reports even on failure. CI does not need release
signing keys. These jobs run on Android changes and can also be started manually.
Before pushing Android changes, compile and unit tests must both pass.

## Installed Android CLI

Android CLI `1.1.16717390` is installed at `~/.local/bin/android` and recognizes
this native Gradle project. From `android/`:

```bash
android info
android describe --project_dir="$PWD"
android emulator list
android screen --help
android layout --help
android input --help
```

`describe` indexes debug/release APK locations in ignored Gradle metadata.
Use the screen, layout, and input commands for interactive inspection; use
`./dev device-test` for repeatable automated assertions. The helper adds SDK
emulator/platform tools to PATH for its own process without changing shell files.

## Troubleshooting

- Gradle cache permission errors or ADB socket failures inside a restricted agent
  sandbox: run the commands through an approved host execution.
- Missing virtualization: `emulator -accel-check` diagnoses KVM access. Use a
  physical API 29+ device with USB debugging when virtualization is unavailable.
- ADB `unauthorized`: unlock the phone and accept its USB debugging prompt.
- ADB `offline`: wait for boot, then inspect `adb devices -l` before retrying.
- Lint failures: inspect the HTML report; do not baseline errors without review.

Testing setup follows the official [Compose testing guide](https://developer.android.com/develop/ui/compose/testing)
and [AndroidJUnitRunner documentation](https://developer.android.com/training/testing/instrumented-tests/androidx-test-libraries/runner).
