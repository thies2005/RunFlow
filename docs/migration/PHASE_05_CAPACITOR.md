# PHASE 05 — Capacitor: Verify v8 Native Projects

## Goal

Verify that all Capacitor 8 native project configuration is correct. The project already has Capacitor 8 packages installed (`^8.0.1`), but this phase confirms all native Android configuration matches Capacitor 8 requirements, including SDK versions, Gradle versions, and the `density` configChanges attribute.

## Documentation References

| Source | Context7 ID / URL |
|---|---|
| Capacitor 8 Update Guide | Context7 `/ionic-team/capacitor-docs` — query `updating 8-0` |
| Capacitor 8 Plugin Migration | Context7 `/ionic-team/capacitor-docs` — query `updating plugins 8-0` |
| Official Capacitor 8 Docs | https://capacitorjs.com/docs/updating/8-0 |

## In Scope

- Verify `variables.gradle` matches Capacitor 8 requirements
- Verify `AndroidManifest.xml` has `density` in `configChanges`
- Verify `build.gradle` SDK versions
- Verify Gradle wrapper version
- Verify AGP (Android Gradle Plugin) version
- Verify local Android Studio version meets Capacitor 8 requirements
- Verify Capacitor CLI config (`capacitor.config.ts`)
- Verify all installed Capacitor plugins, including third-party plugins, are on a Capacitor 8-compatible release line
- Run `npx cap sync android` and verify it succeeds
- Run Android build and verify it compiles

## Out of Scope

- No Capacitor package version changes (already at v8)
- No iOS project (does not exist in this repository)
- No new Capacitor plugins
- No changes to web application code
- No changes to security middleware

## Preconditions

- Phases 01–04 completed and merged
- Android SDK installed locally (for build verification)
- Android Studio Otter | 2025.2.1 or newer installed locally
- `Web/android/` directory exists with native project
- Git on clean branch: `git checkout -b migration/phase-05-capacitor`

## Files Allowed To Change

| File | Change Type |
|---|---|
| `Web/android/variables.gradle` | Verify/update if versions don't match |
| `Web/android/app/src/main/AndroidManifest.xml` | Verify `density` in configChanges |
| `Web/android/build.gradle` | Verify AGP version |
| `Web/android/gradle/wrapper/gradle-wrapper.properties` | Verify Gradle version |
| `Web/capacitor.config.ts` | Verify configuration |

## Files Forbidden To Change

- `Web/src/**` — No application code
- `Web/prisma/**` — No schema changes
- `Web/next.config.mjs` — No framework config
- `Web/Dockerfile` — No Docker changes
- `Web/src/middleware.ts` — No security changes

## Exact Package Changes

No package version changes expected. All Capacitor packages are already at `^8.0.1`:
- `@capacitor/android: ^8.0.1`
- `@capacitor/app: ^8.0.0`
- `@capacitor/camera: ^8.0.1`
- `@capacitor/cli: ^8.0.1`
- `@capacitor/core: ^8.0.1`
- `@capacitor/filesystem: ^8.1.2`
- `@capacitor/local-notifications: ^8.0.1`
- `@capacitor/share: ^8.0.1`
- `@capacitor-mlkit/barcode-scanning: ^8.0.1`
- `@capgo/capacitor-health: ^8.2.5`

## Required Code Changes

### Pre-flight Verification

Before making any changes, verify the current state of all native configuration files.

### 1. Verify `Web/android/variables.gradle`

**Current state (already verified correct):**

```gradle
ext {
    minSdkVersion = 26
    compileSdkVersion = 36
    targetSdkVersion = 36
    androidxActivityVersion = '1.11.0'
    androidxAppCompatVersion = '1.7.1'
    androidxCoordinatorLayoutVersion = '1.3.0'
    androidxCoreVersion = '1.17.0'
    androidxFragmentVersion = '1.8.9'
    coreSplashScreenVersion = '1.2.0'
    androidxWebkitVersion = '1.14.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.3.0'
    androidxEspressoCoreVersion = '3.7.0'
    cordovaAndroidVersion = '14.0.1'
}
```

**Capacitor 8 requirements per Context7 `/ionic-team/capacitor-docs`:**

| Variable | Capacitor 8 Default | Current | Status |
|---|---|---|---|
| `compileSdk` | 36 | 36 | MATCH |
| `targetSdkVersion` | 36 | 36 | MATCH |
| `minSdkVersion` | 24 | 26 | OK (higher) |
| `androidxAppCompatVersion` | 1.7.1 | 1.7.1 | MATCH |
| `androidxJunitVersion` | 1.3.0 | 1.3.0 | MATCH |
| `androidxEspressoCoreVersion` | 3.7.0 | 3.7.0 | MATCH |
| `androidxActivityVersion` | 1.11.0 | 1.11.0 | MATCH |
| `androidxCoordinatorLayoutVersion` | 1.3.0 | 1.3.0 | MATCH |
| `androidxCoreVersion` | 1.17.0 | 1.17.0 | MATCH |
| `androidxFragmentVersion` | 1.8.9 | 1.8.9 | MATCH |
| `coreSplashScreenVersion` | 1.2.0 | 1.2.0 | MATCH |
| `androidxWebkitVersion` | 1.14.0 | 1.14.0 | MATCH |

**Result:** All versions match in the current repository snapshot. No changes are currently expected here.

### 2. Verify `Web/android/app/src/main/AndroidManifest.xml` — `density`

**Current state (already verified correct):**

```xml
android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
```

Per Context7 `/ionic-team/capacitor-docs` — Capacitor 8 requires `density` in configChanges:

```
- android:configChanges="...|navigation"
+ android:configChanges="...|navigation|density"
```

**Result:** `density` is already present in the current repository snapshot. No changes are currently expected here.

### 3. Verify `Web/android/build.gradle` — AGP version

**Current state:** AGP 8.13.2

Per Context7 docs, Capacitor 8 recommends AGP 8.13.0+. The upgrade guide suggests using Android Studio's AGP Upgrade Assistant.

**Result:** AGP 8.13.2 >= 8.13.0 in the current repository snapshot. No changes are currently expected here.

### 4. Verify `Web/android/gradle/wrapper/gradle-wrapper.properties`

**Current state:** Gradle 8.14.3

Per Context7 `/ionic-team/capacitor-docs` — Capacitor 8 requires Gradle 8.14.3.

**Result:** Exact match in the current repository snapshot. No changes are currently expected here.

### 5. Run `npx cap sync android`

```bash
cd Web
npx cap sync android
```

This synchronizes the web build with the native Android project. Verify no errors.

### 5a. Verify toolchain and plugin compatibility

- Confirm local Android Studio is `Otter | 2025.2.1` or newer.
- Confirm local Node.js runtime is 22+ (already satisfied by Phase 01's Node 24 target).
- Verify all official Capacitor packages remain on major 8.
- Verify third-party plugins used by this repo, especially `@capacitor-mlkit/barcode-scanning` and `@capgo/capacitor-health`, publish Capacitor 8-compatible versions.

### 5b. Note for absent iOS project

The repo currently has no `Web/ios/` native project. No iOS migration work is required in this phase. If an iOS project is added later, Capacitor 8 requires Xcode 26+ and an iOS deployment target of 15.0.

### 6. Run Android build

```bash
cd Web/android
./gradlew assembleDebug
```

Verify the build completes successfully.

## Validation Commands

```bash
cd Web

# Verify Capacitor packages at v8
grep "@capacitor" package.json

# Verify Android Studio version manually
# Expected: Otter | 2025.2.1 or newer

# Sync web build to native
npx cap sync android

# Android build
cd android
./gradlew assembleDebug
cd ..

# Verify variables.gradle values
cat android/variables.gradle

# Verify density in AndroidManifest
grep "density" android/app/src/main/AndroidManifest.xml

# Verify Gradle version
cat android/gradle/wrapper/gradle-wrapper.properties | grep distributionUrl

# Verify AGP version
grep "com.android.tools.build:gradle" android/build.gradle
```

## Expected Failures And How To Fix Them

### 1. `npx cap sync` fails due to missing web build

**Symptom:** `Capacitor could not find the web assets directory`.

**Fix:** Run `npm run build` first, then `npx cap sync android`.

### 2. Gradle build fails with SDK version error

**Symptom:** `Failed to install the following Android SDK packages as some licences have not been accepted`.

**Fix:** Accept SDK licenses:
```bash
yes | sdkmanager --licenses
```

### 3. Gradle build fails with AGP compatibility error

**Symptom:** `Android Gradle plugin requires Java 17 to run`.

**Fix:** Ensure `JAVA_HOME` points to JDK 17+:
```bash
java -version
export JAVA_HOME=/path/to/jdk-17
```

### 4. `@capgo/capacitor-health` not compatible with Capacitor 8

**Symptom:** Plugin fails to initialize or native method not found.

**Fix:** Verify `@capgo/capacitor-health@^8.2.5` is compatible with Capacitor 8. Check the plugin's changelog/release notes. Update if a newer version is available.

## Rollback Plan

This is a **verification-only phase** with no expected code changes. If changes are needed:

1. `git revert` the phase-05 commit on main (if any changes were made).
2. All changes are in native Android config only — no web code affected.
3. Capacitor sync can be re-run at any time.

## Approval Gate

Before merging, verify:

- [ ] `variables.gradle` matches Capacitor 8 requirements (all values verified)
- [ ] Android Studio version meets Capacitor 8 requirements
- [ ] `AndroidManifest.xml` contains `density` in `configChanges`
- [ ] Gradle wrapper version is 8.14.3
- [ ] AGP version >= 8.13.0
- [ ] All installed Capacitor plugins, including third-party plugins, are confirmed compatible with Capacitor 8
- [ ] `npx cap sync android` succeeds
- [ ] Android debug build compiles successfully
- [ ] No web application code was modified
- [ ] No security middleware changes

## Commit Message

```
migration(phase-05): verify Capacitor 8 native Android configuration
```
