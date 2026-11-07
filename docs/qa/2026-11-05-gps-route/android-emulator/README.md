# Android release UI QA — 5 November 2026

Tested the native Kotlin/Compose app on the API 35 x86_64 AOSP `RunFlow_Audit_API35` emulator. Installed the signed, R8-minified release APK, not a debug build. Existing emulator records were preserved; five clearly named `GPS QA - ...` local activities supplied deterministic fixtures.

## Results

- Stream-backed GPS loop rendered without a map background; overlapping start/finish markers remained distinguishable.
- Pace and HR route chips changed the track coloring and selected state.
- Chart tapping and horizontal dragging highlighted corresponding route positions.
- Legacy `routeJson` rendered when stream GPS was absent.
- An activity without GPS showed the explicit empty state.
- A date-line crossing retained the short continuous shape.
- Malformed/out-of-range GPS fixes were filtered without a crash.
- Light and dark themes were visually checked.
- At 900×2000 pixels, density 420 (approximately 343dp wide), and font scale 1.3, the route controls and legend remained readable.
- Offline loading showed the unavailable state and an enabled route Retry button; retry remained usable without connectivity.

## UI issue found and fixed

The chart's unrestricted `detectDragGestures` consumed vertical swipes. At narrow width and increased font size, this prevented normal scrolling to the route below. Changed the chart to `detectHorizontalDragGestures`; tap handling is unchanged. The same emulator scenario then reached the route with ordinary vertical swipes. An active horizontal scrub screenshot confirms that chart scrubbing still updates the route highlight. A Terra subagent reviewed the gesture arbitration change and found no supported regression.

After this fix, `:app:compileDebugKotlin`, all 542 JVM tests, and `assembleRelease` passed. The final release was installed and the scrolling, horizontal/tap scrubbing, narrow layout, and offline Retry checks were repeated.

## Emulator interruption

The first run with `swiftshader_indirect` experienced one input-focus ANR while a dialog was being dismissed after theme navigation. Main and render-thread traces are in `renderer-anr-threads.txt`. A Terra review found a native graphics buffer stall (`RenderProxy::destroy` waiting while RenderThread was in `dequeueBuffer`/emulated EGL), but the trace does not establish the underlying cause or prove it was emulator-only. No production fix was made from that trace. Cold-booted with `-gpu swiftshader -feature -Vulkan`; subsequent light-theme, configuration, and route interaction checks did not reproduce the ANR. No physical-device comparison was performed.

## Key screenshots

- [Dark route](05-stream-route-dark.png)
- [Pace coloring](07-pace-mode.png)
- [HR coloring](08-hr-mode.png)
- [Missing GPS](13-indoor-verified.png)
- [Date-line route](13-dateline-verified.png)
- [Filtered fixes](13-malformed-verified.png)
- [Light route](28-loop-light-full.png)
- [Final narrow layout](41-final-narrow-route.png)
- [Active horizontal scrub on final release](44-final-horizontal-scrub-active.png)
- [Final offline route Retry](48-final-offline-route-retry.png)

## APK

- Version: 2.8.0, version code 21; minimum Android API 29.
- File: `out/apk/RunFlow-2.8.0-gps-release.apk` at the repository root.
- Signing: APK signature scheme v2 verification passed.
- SHA-256: `f67fbd3afe8f5f18307d79cb4d24ac71fe0e218869bac08b742caa076c779c0d`.
