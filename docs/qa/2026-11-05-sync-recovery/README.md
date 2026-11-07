# Android account sync and diagnostics — 5 November 2026

Corrective release: **2.8.2**, version code 23.

The user's copied log showed `activity_create` uploads receiving HTTP 429 and being dead-lettered after eight attempts. Inspection confirmed the queue loop selected the same failed pending items repeatedly within one sync cycle. Uploads also preceded profile/plan reads, so failed or rate-limited activity operations could prevent the app from loading the web account's profile and plan.

## Changes

- Profile, plan, and activity downloads precede uploads. Download failures are isolated and reported; a malformed activity page cannot prevent profile/plan hydration or cause pruning after an incomplete pull.
- Pending and failed deletion tombstones prevent downloads from recreating locally deleted items.
- Upload processing is bounded to one attempt per selected item per cycle. HTTP 429 stops writes without incrementing retries or dead-lettering the affected item.
- Upload cooldown is persisted, honors both Retry-After header forms and the server's JSON `details.retryAfter`, and covers rate limits from priority reads too. Other writes respect the same cooldown.
- Settings → Troubleshooting → **Copy diagnostics** copies every retained event (up to 300), metadata and full unique stack traces. Repeated stacks use references; credentials are redacted. Copy failures offer **Save diagnostics** through the native document picker, without clearing the log.

## Verification

- Kotlin compilation, **554 tests**, and signed `assembleRelease` passed.
- Actual authenticated HTTP/Room integration: a 300-upload backlog received 429 while a named profile (68.5 kg, max HR 185), active web plan, and workout were stored correctly. No queued record burned an attempt on 429. A new manager honored the persisted cooldown.
- Further integration checks: bounded one-attempt 503 retries, profile-read 429 blocking later writes, header/body cooldown precedence, partial-page preservation, and pending deletion tombstones.
- Exported the database created by that integration test and loaded it into the isolated, offline API 35 emulator. The signed release UI displayed the synced profile and web plan/workout. These screenshots show **synthetic test account data**, not a live fetch from the user's Strava account.
- Physically tapped Copy diagnostics on the final signed APK. Verified the native clipboard by pasting into an unsaved profile field: report header, version, queue metadata, and events were present. Discarded the field edit; the stored profile name remained unchanged.
- Installed/delivered APK hashes match; signature validation and `git diff --check` passed. No crash was recorded during these checks. Original emulator data and network settings were restored after testing.

## Limits

Previously dead-lettered uploads remain stored and are not automatically replayed. Their original HTTP failure causes were not persisted, so blindly replaying all permanent failures could create invalid or duplicate uploads. The fix prevents further 429 retry exhaustion and allows account downloads to proceed.

The user's live account sync outcome remains to be confirmed on their phone. No accounts were merged, backend data changed, production deployment performed, or Strava credentials requested. If data is still missing, the new copied report includes account ID, server origin and individual profile/plan pull outcomes needed to identify the remaining failure.

## Artifact

`out/apk/RunFlow-2.8.2-sync-recovery-release.apk`

SHA-256: `c48b12f17050d3b70ef849501221dd07f64af33cd1495ff2632fcc26fedd0cf1`.

## Review execution

Terra implemented the change and independently reviewed it. The supported pull-side 429 gap was fixed and rechecked successfully. GLM's plan review completed and its backend JSON retry-delay finding was addressed. The GLM code-diff review did not complete after about eleven minutes and was stopped; no completed GLM code-review sign-off is claimed. The final Gemini Argon request failed with provider credit exhaustion. Validation therefore relies on the completed Terra review/recheck, primary code inspection, real-sync integration tests, full passing suite, and signed-release UI/clipboard checks above.
