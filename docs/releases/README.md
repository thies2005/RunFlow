<h1 align="center">Android releases</h1>

<p align="center"><strong>Project reference</strong><br>Setup, usage, and maintenance guidance.</p>

<p align="center">
  <a href="../../README.md">Project overview</a>
</p>

The workflow `android-release.yml` follows the CloudBridge release contract and
`github-release-publishing` skill. Every push to `master` builds the exact trigger
SHA, runs compile/unit tests/lint, verifies signing and package metadata, and
updates one **Development build — automatic** prerelease at `development`.
It reuses the release ID. Binary, metadata, and checksum filenames include the
version, complete source SHA, and Actions run/attempt IDs. New assets are uploaded and downloaded for
verification before superseded assets are removed; the development tag moves
last. A stale master build is retained as an Actions artifact, without publication.
A same-commit development rerun uses new filenames, preserving the previous
complete set until the replacement is verified.

Manual Actions runs default to `publish=false`: they validate and retain signed
artifacts without publishing. Only master or a matching version tag is allowed.
Shared publication runs are serialized and never cancelled during asset upload.
PRs and other branches use the separate checks workflow without signing secrets.

## Signing setup

The GitHub repository secrets are `KEYSTORE_BASE64`, `STORE_PASSWORD`, `KEY_ALIAS`,
and `KEY_PASSWORD`. Retain the existing native Android release key. Do not generate
a replacement or copy a legacy Capacitor key merely because it has the same app
name. Set repository variable `RELEASE_CERT_SHA256` to the trusted native APK's
64-character lowercase public certificate SHA-256. The selected existing native
key is `539151c5b2faa7d68bde4266a9277a7bd4fda76b091d53998a89585ab85d2094`.
Old GitHub APKs signed with `b7197d694959f6184a47edc2ec96bdb46c974ed53417277471d78abd81d8434c`
require a reinstall to migrate; newer local native installs update normally. The workflow checks both the
configured key and every built artifact against this value, failing closed when
it is missing. Signing files are ephemeral and removed even after a failed build.
Keep a separate private offline backup of the keystore and credentials.

## Stable release, only after an explicit user instruction

Ordinary pushes never publish a stable release. An agent may create/push a stable
`vX.Y.Z` tag only when the user explicitly requests that release. Prepare it as follows:

1. Fetch master and work from its current tip. Keep its history append-only.
2. Choose the requested numeric version, update the literal `versionName`, and
   add concise actual changes in `docs/releases/X.Y.Z.md`.
3. Codes use fixed epoch **1000000**: development is `1000000 + 2 * commit_count`;
   stable at that SHA adds **1**. Set the literal stable `versionCode` to
   `1000000 + 2 * (git rev-list --count HEAD + 1) + 1` when exactly one preparation
   commit remains. Recalculate if another commit or merge changes the final count.
   The workflow requires the committed stable code to match the actual final SHA.
   Codes must remain below 2100000000. Never rewrite master history.
4. Run required checks, commit only intended changes, push master, and verify its
   development workflow succeeds. Confirm the unused tag and final source/version.
5. Push the matching `vX.Y.Z` tag at that exact commit; monitor Actions to completion
   and verify release downloads, signatures, checksums, Latest, and source SHA.

Stable uses a draft identified by its release ID, retains/reuses an interrupted
draft, verifies the full uploaded inventory, then publishes it as **Latest**.
An existing published stable release is verified using its original downloaded
manifest, checksums, metadata and signatures on rerun; its assets and tag are never
replaced. Rebuilt bytes need not equal previously published bytes. Version codes in earlier stable notes are checked when
available. Legacy releases without code metadata need manual comparison. A
stable release can update development at its own commit; newer development
commits have higher codes, so switching back to stable may require waiting for
a later stable release. This migration's million-code epoch exceeds historical
native builds; future local stable builds must use the committed release code.

## Obtainium

Add `https://github.com/thies2005/RunFlow` in Obtainium. For stable updates, leave
prereleases disabled and use tag filter `^v[0-9]+\.[0-9]+\.[0-9]+$`. For development,
enable prereleases and use tag filter `^development$`; allow checking the rolling
release's asset/version changes. The APK's embedded version code increases with
source history. Choose the `.apk` asset; `.aab` is for Play, not sideloading.

For rolling development updates, turn on **Release Date as Version** and **Use Latest Asset Date as Release Date**, and turn off **Verify Latest Tag**. The `development` tag stays constant, so tracking its name alone will miss replacement builds. Keep the tag filter at `^development$` and the APK filter at `\.apk$`. Before the first new stable release, use this development configuration. See the [Obtainium source options](https://wiki.obtainium.imranr.dev/sources/) and [version tracking](https://wiki.obtainium.imranr.dev/app_tracking/).

## F-Droid and future Google Play

`fdroid/metadata/com.runflow2.app.yml` is a **disabled draft**. The project is
licensed GPL-3.0-or-later. Review all
transitive dependencies, source availability and build reproducibility, and
replace the placeholder with a verified immutable stable commit. A GitHub-signed
APK does not establish F-Droid inclusion. To share signing across F-Droid and
GitHub, F-Droid must verify reproducible builds and accept the developer signature;
otherwise its independently signed APK cannot update this app directly.

The workflow produces a signed AAB and verifies its manifest with official
bundletool. No Google Play upload is enabled. Complete Play Console listing,
policy/target SDK checks and Play App Signing enrollment later. If direct updates
between Play and GitHub are required, enroll the existing app signing key rather
than accepting a different Google-generated app signing identity; use a separate
Play upload key when configuring that channel.
