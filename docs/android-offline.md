# Offline Android and optional self-hosting

RunFlow starts with no configured server and all upload permissions disabled. Training plans, activity storage, analytics/readiness, GPS recording and local exports work on the phone. Health Connect is an optional on-device data source. No account is required for local training.

## Connecting a server

In Settings → Server connection, enter the HTTPS origin of your own RunFlow installation and enable it. Paths, credentials and query strings are rejected. Blank or invalid addresses never select a public server. Email/Strava login becomes available after enabling a server; Strava additionally requires the operator's OAuth registration and internet access. The server's NEXTAUTH_URL is its canonical public origin. Cloudflare tunneling in the generic Compose setup is optional via the tunnel profile.

Choose uploads separately for activities, plans/profile and health metrics. Existing/restored history has separate opt-ins. Future-only health uploads begin with the next local date so a day cannot expose pre-consent measurements. Health-derived payload inputs are restricted accordingly. Disconnect resets upload choices and retains local training and cached conversations. Existing installations also remain disconnected until explicitly enabled; old implicit production settings do not authorize reconnection.

## Health Connect

Select individual categories and grant read permissions. Sleep denial does not prevent activity import. Historical and background access are separate, feature-dependent permissions. Foreground import works without network access; periodic local import has no network constraint but requires supported background access. Without that access, open the app or use Import now.

Reads are paginated and partial grants are respected. Session corrections update imported fields while preserving user edits and previously available metrics whose permissions were revoked. Old imports without provenance are conservatively seeded. Source deletions preserve local history; they do not delete activities from RunFlow. Current activity integration imports summaries, not complete Health Connect GPS routes or sensor streams. The first-observed permission time cannot recover an earlier grant time on upgraded installations.

## Backups and optional features

Backups include training data, source-correction provenance, analytics preferences and cached chats, without credentials. Restore validates contents and links before disconnecting or replacing data; it detaches remote bindings and clears old queues. A partial restore keeps server access disabled and shows instructions to retry. Invalid backups leave the prior dataset and pending operations intact.

AI generation and Strava are optional network features. Cached AI conversations can be read locally. Voice coaching selects an installed non-network English voice; when none exists recording continues without speech. GPS and wearable-provider behavior still require physical-device verification.

This change does not publish a release or establish F-Droid inclusion. The F-Droid recipe remains disabled pending source/dependency review and an actual F-Droid build.

## Verification (7 November 2026)

Implemented and reviewed using gpt-6.1-terra subagents at medium effort, with native orchestration/integration; no alternative provider fallback. The task-only commit was checked in an isolated checkout excluding unrelated local UI changes. Existing user changes were preserved.

- `./gradlew --offline :app:compileDebugKotlin testDebugUnitTest`: passed; 581 tests on the task-only commit, zero failures/errors/skips. The earlier integrated run including unrelated local UI work passed 590 tests.
- Focused Web mobile-login and alternate-domain OAuth callback tests: seven passed.
- Web `tsc --noEmit --incremental false`: passed.
- API 35 isolated emulator, airplane mode and Wi-Fi/mobile data disabled: fresh-install no-server/no-upload assertions and main navigation passed (one instrumentation test).
- MockWebServer/Room tests cover disabled/unconfigured zero requests, upload consent and history boundaries, stale connection fences, redirects, failed history uploads, backup roundtrip and rejected malformed/unresolved backups.
- `git diff --check`: passed.

These checks do not establish physical GPS/background battery behavior, live wearable Health Connect integration, live Strava OAuth on another domain, or F-Droid acceptance. No stable release was published.
