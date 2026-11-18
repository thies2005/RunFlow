# RunFlow

## Purpose and layout

Native Kotlin/Compose Android app in `android/` and Next.js dashboard in `Web/`. The plan engine is the web engine (server when signed in, on-device port otherwise); do not restore the classic Daniels engine.

## Working agreements

- Inspect the code and instructions first; make the smallest correct change and
  preserve unrelated staged, unstaged and untracked work. Never commit secrets.
- Plan and independently review substantial changes in proportion to their risk,
  using available tools. Make routine reversible decisions without approval loops.
- Give delegated workers a bounded scope, working directory and acceptance
  criteria. Assigned workers do not recursively delegate. Serialize shared edits
  and device control, and inspect results before integration.
- Commit, push and publish only when authorized. Report actual providers/fallbacks,
  checks performed and concrete limitations; never imply an unavailable review ran.
- Read the repository root guide when working in a subdirectory. Read
  `../AGENTS.md` for workspace publishing guidance when present; essential project
  safeguards below remain applicable without ancestor-file discovery.

## Setup and commands

From `android/` with JDK 17 and Android SDK: `./gradlew assembleRelease` builds the default requested APK; use `assembleDebug` only when explicitly requested. Release signing uses gitignored `key.properties`; preserve the existing certificate. Without signing configuration the local release build is unsigned; do not label it a signed release. The SDK path comes from local `android/local.properties` or SDK environment variables, not `org.gradle.java.home`. From `Web/`: `npm ci --legacy-peer-deps`, `npm run dev`.

## Verification

From `android/`: `./gradlew :app:compileDebugKotlin testDebugUnitTest lintDebug :app:compileDebugAndroidTestKotlin`; run `./gradlew connectedDebugAndroidTest` when device tests are applicable. From `Web/`: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`; integration and Playwright checks apply when relevant. From the repository root for release workflow changes: `python3 -m unittest discover -s scripts/tests -p 'test_android_release.py'`.

## Android QA

- For Android UI/flow changes, test relevant normal, error and persistence
  scenarios on an appropriate device when available; report blocked scenarios.
- Prefer Gemini 4 Hydrogen through Antigravity (AGY) for Android QA. Use
  GPT-6.1 Terra through Codex when working without AGY. The worker needs both
  adb shell and screenshot viewing. Report the actual provider and any fallback.
- Record device serial, API, package, build variant and source commit. Use
  `adb -s SERIAL` for device operations; inspect UI-tree bounds before taps.
- Capture screenshots and scoped logs without secrets. Report pass/fail/blocked
  outcomes with evidence. Unit tests alone do not establish emulator validation.
- Serialize shared-device control. Do not perform production actions or reset
  user data without authorization.

## Release and boundaries

Preserve signing identity, immutable stable tags and published assets. A stable release requires an explicit request; ordinary pushes authorize no stable release. Follow the repository release guide for source versions, default-branch ancestry, checks, notes and publication; monitor workflows and verify downloads before claiming success. Do not clean up releases without explicit scoped authorization. APK/AAB or metadata alone does not imply Play or F-Droid publication.

Source versionCode must reflect the final full-history commit count including preparation commits. MyWhoosh integration is limited to local workout-file import, offline catalog matching and `.zwo` export. Never contact `mywhoosh.com`, `service14.mywhoosh.com`, `service20.mywhoosh.com`, `coaching.mywhoosh.com`, MyWhoosh CDN hosts or unofficial MyWhoosh HTTP APIs; do not add account/login/token flows, calendar pulls, cloud pushes or MyWhoosh-specific database models.

## Sources

[README](README.md), [release guide](docs/releases/README.md), [Android CI](.github/workflows/android.yml), [web CI](.github/workflows/ci.yml).
