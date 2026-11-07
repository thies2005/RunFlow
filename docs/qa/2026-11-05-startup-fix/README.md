# Android startup/session correction — 5 November 2026

Corrective release: **2.8.1 (version code 22)**. Install over the existing RunFlow installation with the same signing key. No database reset, uninstall, forced logout on startup, or replacement of the user's profile is part of this repair.

## Findings and changes

- Reproduced a failed-refresh loop in the old release with a synthetic persisted session. The protected request received HTTP 401, then the refresh endpoint's own HTTP 401 invoked the same authenticator while the refresh mutex was held. Authentication endpoints now terminate without recursive refresh.
- Removed duplicate server-setting observers. Restoring the saved initial origin preserves tokens; sync waits for the persisted origin. Intentional later origin changes still clear the previous session.
- Serialized refresh and session clearing, bound refresh to its requesting host, and made origin validation/token/header snapshots atomic with origin publication. Retained old-host requests cannot acquire a new host's credentials.
- Origin-observer failure and cancellation release waiters.
- Unexpected sync/parser errors are logged and exposed through sync status instead of escaping the background sync job. Coroutine cancellation still propagates. Failed readiness recomputation is logged and retried later without advancing its version marker.
- Navigation waits for saved settings before selecting onboarding versus the dashboard. The dashboard does not display the empty-profile welcome text until Room has supplied its first profile result.

## Validation

- `./gradlew :app:compileDebugKotlin testDebugUnitTest assembleRelease` passed.
- **550 JVM tests, zero failures/errors.** New regressions cover delayed initial custom origin, real later origin changes, failed and successful refresh, actual malformed Retrofit activities responses, cancellation, delayed refresh during a server switch, and a controlled request-token snapshot/server-switch interleaving.
- Signed, minified release installed on the API 35 AOSP emulator using `adb install -r`.
- Cached database fixture migrated from schema 15 to 16. All **134 activities and the existing profile** remained; persisted synthetic session bytes were identical before and after the update/custom-origin restore.
- Rejected synthetic refresh returned a finite HTTP 401 sync failure; the app stayed alive, stored session bytes remained intact, and the final crash buffer was empty.
- A deliberately absent profile plus failed sync remained usable without a process closure. This fixture intentionally shows the welcome text after confirming that no profile exists.
- The installed APK and delivered APK hashes match. APK signature verification passed; `git diff --check` passed.

The exact closure on the user's phone was not reproduced or confirmed without that phone's crash log. No real Strava credentials were used; successful refresh is covered with MockWebServer, and emulator session tests use synthetic stored credentials. This release prevents the identified startup failure paths; it cannot reconstruct credentials that an older build already erased.

## Review and providers

A Terra subagent implemented the initial correction and independently reviewed the origin/refresh races. The primary agent completed the interrupted concurrency fixes and regression tests after the implementation subagent reached its usage limit. Terra's final focused recheck found no further actionable issue in the atomic origin/header snapshot correction. GLM plan/diff reviewers were attempted but unavailable due to provider quota; no GLM sign-off is claimed. The final Gemini 4 Argon review completed successfully and found no blocking defect in the reviewed startup, session, sync, and initialization changes.

## Artifact

`out/apk/RunFlow-2.8.1-startup-fix-release.apk` (repository root).

SHA-256: `b7593f3c61389bc2b846465358750e90e6c79cd06bcbd0006e3d6da7d0263ecf`.
