# GPS activity route verification — 5 November 2026

Activity details on native Android and web render GPS as a north-up vector track on the existing themed surface, with start/finish markers and no map tiles or map SDK. Android uses stream coordinates with a local recording-route fallback and retains pace/HR coloring and chart scrubbing. Native recordings now upload aligned GPS samples including the final fix within the sample cap. Strava imports request and persist GPS for supported outdoor sports and other activities with location evidence.

## Validation

- Android: `./gradlew :app:compileDebugKotlin testDebugUnitTest` passed; 542 tests, zero failures or errors.
- Web: `npx tsc --noEmit --pretty false` passed.
- Web focused Jest: 18 tests passed across ActivityRoute, ActivityDetailsModal.gps, routeProjection, and Strava fetch suites.
- Actual React renderer and project Tailwind/theme CSS rendered in headless Chrome at 390px in light and dark themes. Loop, date-line crossing, straight track, and absent-GPS fixtures checked visually; no horizontal overflow. Screenshots beside this report are renderer fixtures, not authenticated production activities.
- `git diff --check` passed.
- Initial implementation validation did not have an Android device attached. The subsequent signed-release emulator checks and APK delivery are recorded in [android-emulator/README.md](android-emulator/README.md). Live Strava network integration was not exercised.

## Independent review

Two GPT-6.1 Terra subagents reviewed Android and web independently and rechecked fixes. Findings addressed: concurrent/late Room caching, original GPS sample progress after invalid-fix filtering, recording endpoint/sample-cap alignment, separate network error/retry state, isolated web retries that preserve edits, and late-response protection during activity switching. Both reviewers found no remaining blocker in the reviewed feature.

The repository-requested Gemini 4 Argon review also completed. Its supported outdoor-sport import filter finding was fixed and rechecked by Terra; its retry/state finding had already been fixed during the review. GLM plan review was stopped after stalling; GLM implementation failed on provider usage quota and left partial changes. The primary agent inspected and completed the implementation. No GLM code-review sign-off is claimed.

## Known data limitation

Older imported activities without stored GPS still have no route. Existing Strava sync normally skips established records, so ordinary sync is not a historical GPS backfill. No migration, automatic history backfill, or third-party route lookup was added. Activities with stored coordinates and new imports/recordings use the new route views.
