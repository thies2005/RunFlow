# Android profile and plan recovery — 5 November 2026

Corrective release **2.8.3**, version code **24**.

The user's 2.8.2 diagnostics showed the correct authenticated account and 468 downloaded activities, while profile, plans, readiness and metrics returned HTTP 429. After the failed profile pull, automatic body recalculation used a default profile, saved it as dirty and queued a full profile update. Later profile downloads skipped that dirty row. That pending update could also overwrite real server profile fields.

## Changes

- Removed implicit activity-stream backfill from analytics. The old signed APK made 32 optional activity-detail requests in 19.83 seconds during the reproduction, including repeated empty-stream fetches. Explicit activity detail/GPS loading remains available.
- Automatic body calculations require a successfully hydrated profile for the current account and server. They update derived local fields without creating a placeholder profile, queuing a full profile overwrite, or making the profile dirty. Concurrent manual edits are preserved.
- A legacy unhydrated generic profile update remains queued but cannot upload automatically. Settings → Troubleshooting → **Use web profile** explicitly resolves it.
- Recovery downloads and validates the current account first. It snapshots local profile/outbox revisions before the request and aborts if newer edits appear. Under the sync mutex and a Room transaction, it writes a private, fsynced backup of the previous profile, profile outbox and related settings, then replaces the profile and removes only the archived profile queue entries. Archive/network failures preserve the local records. The backup can be exported through Android's document picker.
- Web heart-rate zones and threshold HR/pace are imported alongside name, body measurements and other existing profile fields. Explicit web zones are retained.
- Shared general-endpoint 429 cooldown is persisted and respected by profile, plans, readiness and metrics. Activity-list downloads can still proceed through their separate allowance. Readiness uploads are bounded to eight days per cycle. Queued/deferred status no longer incorrectly says “Up to date”.

## Verification

- `:app:compileDebugKotlin`, **562 unit tests, zero failures**, and signed `assembleRelease` passed. The final strengthened stream regression includes a synced activity with missing streams.
- Production `SyncManager` tests cover initial profile 429 with successful activity download, later profile/plan recovery, blocked legacy generic upload, preservation on 429 and backup failure, newer edits during an in-flight download, complete archive contents, unrelated outbox preservation, signed-out rejection, and no implicit stream requests.
- Reproduced the exact old state in the API 35 emulator using the signed 2.8.2 APK and a local HTTPS server: 468 activities, generic dirty profile, one queued profile update, no plan.
- Installed the signed 2.8.3 APK **over** that state. It retained the activities and queued edit and made zero optional detail requests and zero profile PUTs.
- Physically selected **Use web profile** while the fixture returned 429. The old profile, 468 activities and queued edit remained unchanged; no backup was created.
- Enabled successful server responses and selected the action again. The actual release UI showed the web profile's 68.5 kg, max HR 185, resting HR 48, height 181 cm, FTP 265 W and threshold pace 4:50/km. The database also held the web HR zones and threshold HR. The web plan and its 8 km workout appeared, and the profile queue was empty. No profile PUT occurred.
- Used Android's document picker to export the backup; inspected the exported JSON and confirmed the original generic dirty profile, pending payload and profile preferences were retained.
- Force-stopped/reopened the app: restored account profile and plan persisted. Installed APK bytes match the delivered APK; release signature matches prior releases. No RunFlow crash or ANR was observed.

Screenshots and UI trees in this folder contain **synthetic test account data**, not a live fetch from the user's account. Request counts are in `request-proof.json`; stored values are in `database-proof.txt`.

The temporary emulator test CA initially prevented the system DocumentsUI process from starting because its directory had a shell-only SELinux label. Correcting the emulator fixture label resolved it; the successful export was then verified. The retained crash buffer documents this system-process fixture issue. RunFlow did not crash. Original emulator app data was restored, and the test CA mount, reverse port and exported fixture file were removed.

## Review execution and limits

Terra independently identified the profile-save failure and stream request loop, then audited recovery. Its concrete findings about concurrent edits, omitted web HR fields and backup coverage were addressed. Terra also prepared the backup helper and test scaffold. GLM and Terra made partial implementation changes; the primary agent inspected them, completed integration, fixed test setup/JSON numeric assertions, and performed the final code and emulator checks.

The GLM plan request was stopped after five minutes without a final result; its implementation request was stopped after about six minutes and its code-diff review after about eight minutes without a final result. These are not completed review sign-offs. The Terra implementation worker subsequently hit its usage limit. Both Gemini Argon review requests failed because provider credits were exhausted. No final external-model sign-off is claimed.

No production deployment, server/account data modification, account merge, or real credential access was performed. The user's live phone result still needs confirmation after updating and selecting **Use web profile**; if the server remains rate-limited, the action reports this and can be retried after the cooldown.

## Artifact

[RunFlow 2.8.3 release APK](/home/thies/Projects/RunFlow/out/apk/RunFlow-2.8.3-profile-plan-recovery-release.apk)

SHA-256: `6925055c07667b65e6d68577c87098a6f92db54a35e16dd021e29e48739d2c3e`.

Signing certificate SHA-256: `539151c5b2faa7d68bde4266a9277a7bd4fda76b091d53998a89585ab85d2094`.
