# RunFlow Android: detailed QA and product-design audit

Date: **31 October 2026** · Native Android release **2.8.0 (21)** · Base Git commit **74aaace4**, with the current uncommitted environment-setup changes. This is an audit report; no product fixes were applied during this audit.

## Verdict

The offline app launches, records and saves a synthetic run, navigates its core tabs, and generates a training plan. However, it should not be treated as ready for a polished public onboarding experience: a new install silently becomes a fully trained demo athlete, and multiple screens disagree about values, choices or units. Recording and larger-text navigation need layout fixes.

**16 findings: 1 P1, 13 P2, 2 P3.** P1 means address before exposing the affected flow to new users; P2 means a material inconsistency or accessibility/interaction problem; P3 means a lower-priority clarity or usability improvement. Severity is this audit’s prioritization, not a formal release gate.

## Scope, environment and method

- Fresh isolated **RunFlow_Audit_API35** emulator, Android 15 / API 35 AOSP x86_64, Pixel 7 profile, 1080×2400 pixels, 420 dpi (approximately 411 dp wide), Europe/Bucharest timezone.
- Signed, R8-minified release APK; SHA-256: `a26632433d7de0b048f7b6abeabfa6a4d75855d723dcfde8b6555d22babd16fa`.
- Normal text size and 150% system text size; light theme and app-selected dark theme; metric and imperial settings. System text size was restored to 1.0 after testing.
- ADB launch/input, fresh UIAutomator trees for target coordinates, exact emulator screenshots inspected in this run, filtered app logs, crash buffer and source inspection to explain observed behavior.
- Skills used: Test Android Apps / Android Emulator QA and Product Design / Audit. Screenshot evidence comes from the native emulator, not a recreated webpage.
- No account was used. No OAuth flow was completed, no email sent, and no production training records were modified. All saved activities/plans in this run belong to the isolated audit emulator.
- The test goal was deliberately named **Audit 5K**, but **Marathon remained selected** in the race selector. Its Marathon result is expected for that selected race, not a detected race-type bug.
- Screenshot filenames are capture identifiers. Some early recording filenames refer to the intended action but actually contain permission dialogs; the gallery captions below identify their real visible state.

## Fresh automated verification

`./gradlew :app:testDebugUnitTest --rerun :app:lintDebug` succeeded during this audit. **525 tests across 46 suites; zero failures/errors/skips.** The JVM test task was actually rerun; lint reused its current analysis outputs. Lint reports **zero errors, 33 warnings and 18 hints**. The dedicated audit emulator’s crash buffer was empty at collection time. These checks do not establish crash-free behavior outside the observed flows.

Evidence: [Gradle output](evidence/gradle-verification.txt), [verification metadata](evidence/verification.json), [crash buffer](evidence/crash-log.txt), [filtered app logs](evidence/app-log.txt), [installed package metadata](evidence/package.txt). UI-tree XML files are saved under `evidence/` with matching screenshot identifiers.

## Numbered flow coverage

| Step | Task | Observed health | Screenshots |
|---|---|---|---|
| 1 | Fresh onboarding and source selection | Works; demo disclosure fails | 01–06 |
| 2 | Dashboard and athlete/profile inspection | Loads; identity and metric consistency issues | 06–10 |
| 3 | Analytics and recovery empty states | Loads; summary/scale issues | 10–11 |
| 4 | Sport selection and permission denial/retry | Completes; copy/timing issues | 12–20 |
| 5 | Recording, auto-pause and resume | Works; control labels break | 21–23 |
| 6 | Finish, save and activity detail | Saves locally; endpoint timing issue | 24–25 |
| 7 | Eight-step running-plan wizard | Completes; contrast/default-state issues | 26–33 |
| 8 | Plan creation and saved result | 96 workouts created; load/target display issues | 34 |
| 9 | Athlete navigation, settings and sign-in entry | Loads; diagnostics friction | 35–40 |
| 10 | CSV export handoff | Partial: Android chooser has no receiving apps | 41 |
| 11 | Imperial units and dark appearance | Applied; mixed units/system-bar issues | 42 |
| 12 | 150% text-size accessibility check | Fails readable navigation reflow | 43–44 |
| 13 | Recovery sheet and empty/default Save | Scrollable after expansion; default-state mismatch | 45–49 |

## What works well

The onboarding has clear primary actions and readable spacing at normal text size. The app offers an offline route without requiring an account. Main navigation is persistent and selected tabs are visible. Recovery empty states explain which data is missing. Recording presents GPS accuracy and supports auto-pause/resume; a saved recording opens its detail page. The wizard has explicit progress, back navigation, and successfully creates a local plan. Unit chips do convert when Imperial is chosen, and the dark content palette remains visually coherent apart from system-bar handling.

## Findings and concrete fixes

### F01 · P1 · Fresh installation impersonates a trained athlete and uses demo history for planning

**Reproduce:** Install on a new AVD; finish onboarding; choose Set up offline; leave Health Connect without granting access; open Today, Athlete, and New plan.

**Observed:** Today immediately reports 55.8 km and fitness 54; Athlete contains Thies, birth year 1998, 71.5 kg, 181 cm, HR thresholds and 120 runs. No demo banner appears. The wizard says “Your history says VDOT 52.6” and derives starting volume from approximately 55 km of sample history.

**Why it matters:** A newcomer can mistake synthetic training history, health measurements and pace prescriptions for their own. This is more than cosmetic sample content: it becomes input to a real local plan.

**Code evidence / likely cause:** [RunFlowApp.kt:113](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/RunFlowApp.kt:113) calls the seeder on first launch; [DemoSeeder.kt:46](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/data/seed/DemoSeeder.kt:46) supplies the personal defaults. The wizard consumes resulting history.

**How to fix:** Start production installs with an empty profile. Make Explore demo a separate explicit choice, use a clearly fictional athlete, and keep demo data outside normal metric/plan inputs. Show a persistent Demo mode banner and a clear exit/reset action. Require the user’s own calibration before generating personalized targets.

**Acceptance check:** Fresh offline install shows no invented identity or records. Demo mode is unmistakable. A real plan never derives VDOT, body metrics or weekly volume from demo entries.

**Screenshot evidence:** [Capture 06](#capture-06), [Capture 08](#capture-08), [Capture 26](#capture-26), [Capture 29](#capture-29), [Capture 32](#capture-32)

### F02 · P2 · Dashboard and Analytics disagree because they format the same metrics differently

**Reproduce:** Before recording or editing anything, compare Today’s Form card with Analytics → Overview. Repeat after returning to Today.

**Observed:** Today shows CTL 54, ATL 61, TSB -6; Analytics shows CTL 55, ATL 62, TSB -7. The same mismatch remains later in the audit.

**Why it matters:** Users cannot reconcile their training status between the summary and detail screens.

**Code evidence / likely cause:** [Format.kt:207](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/core/util/Format.kt:207) truncates with toInt(); [DashboardScreen.kt:305](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt:305) and line 430 use it. [OverviewAnalyticsTab.kt:185](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/analytics/OverviewAnalyticsTab.kt:185) and nearby labels use roundToInt(). This confirms a display mismatch, not evidence of two different underlying physiological estimates.

**How to fix:** Use one shared rounded formatter for CTL/ATL/TSB in cards, legends, accessibility summaries and detail screens. Keep the sign convention consistent for negative form values.

**Acceptance check:** Identical underlying values, including negative fractions, render identically on Today and every Analytics summary.

**Screenshot evidence:** [Capture 06](#capture-06), [Capture 10](#capture-10), [Capture 42](#capture-42), [Capture 44](#capture-44)

### F03 · P2 · Block-load display combines zero TSS with adherence calculated from another measure

**Reproduce:** Open the seeded Training Plan; then create a new offline plan and inspect its 4-Week Block Load summary.

**Observed:** The seeded plan displays “0 / 0 TSS · 85% Adherence”. A newly generated plan with 96 scheduled workouts and nonzero distances displays “0 / 0 TSS · 0% Adherence”.

**Why it matters:** A precise adherence percentage beside an unusable zero-load denominator gives no explanation of what was measured. The fresh plan also visually signals poor adherence before meaningful training has occurred.

**Code evidence / likely cause:** [PlanScreen.kt:512](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/PlanScreen.kt:512) always labels the header as TSS. [ComplianceCalculator.kt:186](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/domain/plan/ComplianceCalculator.kt:186) falls back to distance, duration or completion count when planned TSS is unavailable. The fallback is not reflected in the header label.

**How to fix:** Return the actual compliance basis with the result and label it Distance adherence, Duration adherence or Workout completion. Show Load unavailable rather than zero when planned load is missing. Calculate planned load for generated workouts where supported, and use a neutral Not started state for future sessions.

**Acceptance check:** No header shows 0/0 TSS with unexplained nonzero adherence. Generated plans either contain valid planned load or explicitly name the fallback measure.

**Screenshot evidence:** [Capture 07](#capture-07), [Capture 34](#capture-34)

### F04 · P2 · Critical recording button labels break mid-word at normal text size

**Reproduce:** Start a recording with permissions granted; inspect active controls; allow auto-pause; resume.

**Observed:** At font scale 1.0, Finish is rendered “Finis / h”, Resume “Resu / me”, and Pause “Paus / e”. Lap fits because its button receives more width.

**Why it matters:** These controls need immediate recognition during exercise. The problem occurs on a normal Pixel 7 layout before accessibility scaling.

**Code evidence / likely cause:** [RecordScreen.kt:634](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/RecordScreen.kt:634) puts three icon-and-label controls in a fixed row with weights 1 / 1.2 / 1 and 56 dp height, leaving too little room after button padding and icons.

**How to fix:** Use a responsive control layout: a full-width primary Pause/Resume action with a second row for Finish and Lap, or icon-above-label controls with adequate measured width. Preserve readable labels rather than reducing text size. Support a longer Lap / Next label.

**Acceptance check:** Finish, Pause, Resume and Lap / Next are readable without mid-word wrapping at 1.0, 1.3, 1.5 and 2.0 font scales and on narrower screens.

**Screenshot evidence:** [Capture 21](#capture-21), [Capture 22](#capture-22), [Capture 23](#capture-23)

### F05 · P2 · Recording starts while optional permission dialogs still cover the app

**Reproduce:** Deny permissions on first attempt; grant location using Grant; press Start while physical-activity/notification access is still denied.

**Observed:** The recording screen and timer start behind the physical-activity and notification dialogs. The notification screenshot already shows 0:17 elapsed while the user is still deciding whether to allow notifications.

**Why it matters:** Permission setup time can become recorded workout time, and the user cannot see or use recording controls while system dialogs cover them.

**Code evidence / likely cause:** [RecordScreen.kt:142](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/RecordScreen.kt:142) launches optional permission requests and immediately calls RecordingService.start when location is already granted.

**How to fix:** Finish the permission sequence before starting the countdown or service. Track a pending Start intent and resume it from the permission result callback. Treat optional denial as a supported state, with a clear explanation of the feature affected.

**Acceptance check:** No timer advances behind permission dialogs. After required access is resolved, the user sees one unambiguous start/countdown transition.

**Screenshot evidence:** [Capture 19](#capture-19), [Capture 20](#capture-20)

### F06 · P2 · Finishing does not freeze the recorded workout time

**Reproduce:** While recording, press Finish; leave the confirmation open before choosing Save.

**Observed:** The confirmation was captured around 0:44–0:45. The final saved activity reports 1:02 after the confirmation remained open. The live timer continues in the background.

**Why it matters:** Time spent deciding between Save, Discard and Keep going changes the saved activity. This is especially noticeable on short workouts or when users review the confirmation slowly.

**Code evidence / likely cause:** [RecordScreen.kt:170](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/RecordScreen.kt:170) only opens showStopDialog; ACTION_STOP is sent when Save is pressed.

**How to fix:** Pause or snapshot the session when Finish is requested. Save that frozen endpoint. Keep going should explicitly restore the previous running state, and closing the dialog should follow the same documented policy.

**Acceptance check:** Waiting 30 seconds on Finish confirmation does not increase the saved workout duration or distance. Keep going resumes without losing prior data.

**Screenshot evidence:** [Capture 24](#capture-24), [Capture 25](#capture-25)

### F07 · P2 · Changing sport leaves run-specific instructions and accessibility text

**Reproduce:** Open Record and select Strength instead of Run.

**Observed:** The selected chip changes to Strength, but the subtitle remains “GPS run with live pace coaching”, the start action is exposed as “Start run”, and the UI still says GPS is required for distance and pace. Run-specific auto-pause/voice-coach copy remains.

**Why it matters:** The app offers several activity types but does not explain which recording capabilities apply. A screen-reader user also hears the wrong activity on the primary action.

**Code evidence / likely cause:** [RecordScreen.kt:270](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/RecordScreen.kt:270) updates selectedSportType, while surrounding copy and start semantics remain run-specific.

**How to fix:** Derive the title, action label, metrics, permission rationale and supported options from the selected activity. Decide whether Strength supports a timer-only session and whether Swim means outdoor GPS or pool logging; communicate that explicitly.

**Acceptance check:** Each sport presents matching visible and accessible labels. Permission requests are justified by supported features rather than generic run copy.

**Screenshot evidence:** [Capture 12](#capture-12), [Capture 13](#capture-13), [Capture 18](#capture-18)

### F08 · P2 · Imperial settings convert metric chips but leave generated descriptions in kilometres

**Reproduce:** Choose Imperial (mi) in Settings; return to Today and inspect the same planned workout.

**Observed:** The workout shows “Easy Run: 4.0km” while its adjacent chips show “2.5 mi” and “8:23 /mi”. Weekly distance converts to miles correctly.

**Why it matters:** The same workout mixes measurement systems and forces users to decide which distance to follow.

**Code evidence / likely cause:** [DashboardScreen.kt:691](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/DashboardScreen.kt:691) renders w.description directly; generated descriptions contain baked-in distance text, while chips use the unit formatter.

**How to fix:** Generate display descriptions from structured workout data and the selected unit. Preserve imported free text as quoted original instructions if conversion cannot be reliable; do not blindly replace km strings inside arbitrary notes.

**Acceptance check:** Generated workout names, descriptions, distance chips, pace labels and recording summaries use the selected measurement system consistently.

**Screenshot evidence:** [Capture 40](#capture-40), [Capture 42](#capture-42)

### F09 · P2 · App-selected dark theme leaves dark status-bar icons on a dark background

**Reproduce:** Keep Android in its default light appearance; select Dark inside RunFlow Settings; return to Today.

**Observed:** The content turns dark, but the time, Wi-Fi, cellular and battery icons at the top remain black and are very difficult to read. Opening the recovery sheet produces white system icons, highlighting the inconsistency.

**Why it matters:** System status information becomes unreadable when the app theme differs from the system theme.

**Code evidence / likely cause:** [MainActivity.kt:15](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/MainActivity.kt:15) calls enableEdgeToEdge before content; [RunFlowRoot.kt:124](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/RunFlowRoot.kt:124) resolves the app theme separately. Updating system-bar appearance from the resolved app theme is the likely missing connection.

**How to fix:** Update WindowInsetsControllerCompat light-status-bar and light-navigation-bar appearance whenever the resolved application theme changes. Apply a consistent background/scrim policy for system bars and modal windows.

**Acceptance check:** Status and navigation controls remain readable for system-light/app-dark, system-dark/app-light, System theme, and modal sheets.

**Screenshot evidence:** [Capture 42](#capture-42), [Capture 43](#capture-43), [Capture 49](#capture-49)

### F10 · P2 · 150% text scaling breaks Analytics and bottom-navigation labels

**Reproduce:** Set the audit emulator font_scale to 1.5; open Analytics → Overview.

**Observed:** Overview becomes “Overvi / ew” and Recovery “Recov / ery”; the outer segments grow to two lines while Run/Bike stay one line. The selected bottom Analytics label splits its final “s” onto a second line. Today also ellipsizes the recovery hint and form details.

**Why it matters:** Larger text exposes rigid navigation layouts and hides supporting information. This is a confirmed visual accessibility issue; TalkBack behavior was not tested.

**Code evidence / likely cause:** [AnalyticsScreen.kt:163](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/AnalyticsScreen.kt:163) uses four labeled/icon segments in one row. [RunFlowRoot.kt:210](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/RunFlowRoot.kt:210) uses five ShortNavigationBarItems with labels.

**How to fix:** Use scrollable tabs or a two-row/adaptive section selector, keep each label as a readable unit, and allow the bottom bar sufficient label space or a suitable accessible alternate layout. Reflow supporting cards at larger text sizes.

**Acceptance check:** At 1.5 and 2.0 text scales, navigation words do not split mid-word, selected states remain clear, and essential supporting text can be read without truncation.

**Screenshot evidence:** [Capture 43](#capture-43), [Capture 44](#capture-44)

### F11 · P2 · Selected plan-category description has low contrast

**Reproduce:** Open New training plan with the default Run category selected.

**Observed:** The selected card uses a slate background while its description and icon remain dark. Pixel sampling of the solid subtitle foreground/background gives approximately 2.13:1 (#40434b on #6e7488). This is a screenshot measurement, not a full accessibility certification.

**Why it matters:** Choosing a category makes its explanatory text harder to read than the unselected choices.

**Code evidence / likely cause:** [PlanWizardScreen.kt:517](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt:517) uses secondaryContainer for the selected card, but the subtitle at line 532 still uses onSurfaceVariant and the icon uses primary.

**How to fix:** Use the paired onSecondaryContainer color for selected-card text and icon, or choose an accessible selected surface. Keep a non-color selection cue such as a checkmark and explicit selected semantics.

**Acceptance check:** Measure selected/unselected text contrast in static and dynamic palettes, light/dark themes. Normal-size body text reaches the chosen accessibility target; selection remains perceivable without color alone.

**Screenshot evidence:** [Capture 26](#capture-26)

### F12 · P2 · Default Sunday long-run selection is hidden off-screen

**Reproduce:** Advance through the default Run plan wizard to Weekly schedule without changing days.

**Observed:** The Long run day row displays Monday through Saturday with none visibly selected. Sunday is not visible, yet the generated plan schedules its first long run for Sunday. The Rest days section shows Sunday on a wrapped second row.

**Why it matters:** The chosen long-run day is not visible at the moment the user commits the plan, and identical day selectors behave differently on the same screen.

**Code evidence / likely cause:** [PlanWizardScreen.kt:126](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt:126) defaults longRunDay to SUNDAY; [PlanWizardScreen.kt:1281](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt:1281) uses a horizontally scrolling Row, while rest days use FlowRow.

**How to fix:** Use a wrapping seven-day control consistently, or automatically scroll the selected day into view and show a plain-text selected-day summary. Include long-run and quality-day choices in a compact confirmation before creation.

**Acceptance check:** All seven days, including the default selected Sunday, are discoverable without guessing. The selected day is visible before Create plan is pressed.

**Screenshot evidence:** [Capture 33](#capture-33), [Capture 34](#capture-34)

### F13 · P2 · Recovery sliders display answered values that are not actually saved

**Reproduce:** Open Today → Recovery on a day without entries; expand the sheet; leave the three sliders at their visible 5/10 defaults and save without entering vitals.

**Observed:** The form visibly presents Exhaustion, Muscle soreness and Stress as 5/10. Save closes the sheet, but the dashboard remains unavailable and changes its hint to “No vitals yet”. Source inspection confirms untouched sliders are saved as null.

**Why it matters:** The screen displays what looks like an answer while internally treating it as unanswered. Users who really feel 5/10 must move away and back to record that value.

**Code evidence / likely cause:** [DailyFormSheet.kt:100](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/components/DailyFormSheet.kt:100) initializes sliders to 5, tracks separate touched flags, and only persists touched values. This avoids fabricated health answers but does not communicate the distinction.

**How to fix:** Show Not answered until explicitly selected. Provide an accessible way to confirm the displayed value, and disable Save when nothing has changed or explain what was saved. Prefer an explicit score picker or a Use 5/10 action over requiring incidental slider movement.

**Acceptance check:** Unanswered values are visibly unanswered. A user can intentionally save 5/10 without first choosing another value. Empty Save never looks like successful wellness logging.

**Screenshot evidence:** [Capture 47](#capture-47), [Capture 48](#capture-48), [Capture 49](#capture-49)

### F14 · P3 · Diagnostics dominate Settings and intercept expected page scrolling

**Reproduce:** Open Settings from Athlete; scroll upward with the gesture beginning over the diagnostics content.

**Observed:** A large raw diagnostic panel appears before Units, Theme and workout preferences. During the audit, scrolling over it moved the log contents while the settings page only advanced slightly, requiring gestures outside the panel.

**Why it matters:** Common preferences are harder to find, and nested scrolling makes the page feel inconsistent. Raw worker/object strings are prominent in a normal user flow.

**Code evidence / likely cause:** [SettingsScreen.kt:199](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/SettingsScreen.kt:199) renders the diagnostics section near the top of the settings list.

**How to fix:** Move diagnostics into a collapsed Troubleshooting section lower in Settings. Present friendly status first, with a separate scrollable log viewer and copy/export controls when needed.

**Acceptance check:** Users can reach Units and Theme with predictable page scrolling. Technical logs remain available without dominating the normal preferences flow.

**Screenshot evidence:** [Capture 37](#capture-37), [Capture 39](#capture-39), [Capture 40](#capture-40)

### F15 · P3 · Charts provide insufficient readable scale/context in captured states

**Reproduce:** Inspect Analytics Overview’s fitness chart and the recorded activity’s Elevation chart.

**Observed:** The fitness chart has colored lines and a legend but no visible numeric Y-axis in the captured viewport. The activity chart shows a large empty-looking elevation plot, only a 0:00–0:33 X range, while total activity time is 1:02.

**Why it matters:** The user cannot tell from these views whether a flat/empty chart represents valid zero elevation, insufficient samples, or a different time basis. The session’s stream duration can differ from moving time; this audit does not establish a corrupt recording.

**Code evidence / likely cause:** [Charts.kt:1](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/components/Charts.kt:1) and [ActivityDetailScreen.kt:1](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/ActivityDetailScreen.kt:1) are the relevant presentation areas; confirm data availability and stream/elapsed-time semantics before changing calculations.

**How to fix:** Show axis units, useful ticks and the applicable date/time range. Label insufficient or constant data explicitly. If stream duration differs from session time, identify the sampling range and explain the difference instead of presenting an unexplained blank plot.

**Acceptance check:** A user can read the value scale and time window and distinguish valid zero/constant data from unavailable data. Screen-reader summaries include equivalent context.

**Screenshot evidence:** [Capture 10](#capture-10), [Capture 25](#capture-25)

### F16 · P2 · Displayed target time is not committed unless the slider is moved

**Reproduce:** Advance to Target time, leave the displayed 3:02:30 untouched, press Continue, and create the plan.

**Observed:** The wizard prominently displays 3:02:30, yet the resulting header has no Target field. The seeded plan does show a Target field. The wizard also offers a separate Skip action, although leaving the slider untouched already keeps targetTimeSec null.

**Why it matters:** The visible selected target and the stored choice do not agree. Users cannot tell whether Continue accepted their target or silently chose prediction mode.

**Code evidence / likely cause:** [PlanWizardScreen.kt:813](/home/thies/Projects/RunFlow/android/app/src/main/java/com/runflow2/app/ui/screens/PlanWizardScreen.kt:813) computes a displayed fallback current value without persisting it; only onValueChange at line 824 stores targetTimeSec. Creation passes the nullable value at line 326.

**How to fix:** Make prediction mode explicit. Either persist the displayed target on Continue, or label it Predicted finish and visibly distinguish Use prediction from Set target. Ensure the final plan summary states the chosen mode/value.

**Acceptance check:** Continue with an untouched displayed target has an explicit, consistent meaning. The resulting plan clearly shows the accepted target or prediction mode. No precision difference is hidden between displayed rounded time and stored prediction.

**Screenshot evidence:** [Capture 30](#capture-30), [Capture 34](#capture-34)

## Accessibility assessment and limits

Confirmed visual problems include low selected-card contrast, mid-word wrapping at normal text size, broken 150% navigation labels, and unreadable dark-theme status icons. UI-tree inspection also confirms the start action retains “Start run” when Strength is selected. Positive evidence includes a descriptive fitness-chart accessibility summary in the UI tree and accessible labels on several icon actions.

This was **not** a full WCAG or Android accessibility compliance evaluation. TalkBack reading order, switch access, external keyboard focus, color-vision simulation, full contrast coverage, 200% text, RTL, landscape, tablets/foldables and minimum API 29 runtime were not exercised. Touch-target sizes need measurement of the actual clickable parent bounds rather than the smaller text/icon child bounds. The approximately 2.13:1 selected-card measurement is limited to the captured dynamic light palette.

## Recommended repair order

1. Remove implicit demo identity/history from the real onboarding and plan-calibration path (F01).
2. Correct recording endpoint/permission timing and responsive controls (F04–F07).
3. Make display states agree with stored choices and calculations: rounded metrics, load basis, targets and recovery answers (F02, F03, F13, F16).
4. Resolve accessibility and layout failures: selected colors, system bars, text-scale navigation and selected-day visibility (F09–F12).
5. Unify generated unit-sensitive instructions and simplify settings/chart presentation (F08, F14, F15).

Add regression coverage for user outcomes: fresh install has no synthetic calibration; all metric surfaces show the same rounded values; permission prompts do not accrue workout time; Finish freezes the endpoint; generated descriptions respect units; untouched targets and wellness scores have explicit semantics. Screenshot tests should cover normal and 150%/200% text, light/dark, with long button labels. Do not rely on a navigation smoke test alone to catch these issues.

## Not verified / follow-up test matrix

| Area | Why incomplete | Required next test |
|---|---|---|
| Email auth, registration, reset and Strava OAuth | No test account; only sign-in entry UI inspected | Dedicated staging account, success/failure/expiry/cancel and callback tests |
| Server sync, conflict handling and tenant isolation | Audit stayed signed out | Staging accounts with offline queue, reconnect, duplicate and conflict scenarios |
| AI coach and streaming recovery | Requires authenticated backend/provider | Staging account with request quota, SSE interruption and error cases |
| Health Connect data reads | Android setup opened, then canceled; no wearable records supplied | Populate test records and verify grants, revocation, deduplication and daily import |
| Real GPS, battery and background recording | Emulator supplied synthetic coordinates only | Physical-device outdoor run, screen off, process recreation, weak GPS and permission revocation |
| CSV export contents / PDF / backup restore | CSV reached Android chooser, which had no receiving apps | Install a safe local file receiver, inspect CSV/PDF, then round-trip a disposable backup |
| Other race types and workout editing | One default Marathon plan created through eight steps | 5K/ultra/triathlon/cycling presets; invalid limits; edit/undo and structured execution |
| Profile validation | Form opened and its seeded values inspected; no fields changed | Boundary values, invalid pace/HR, blank name, persistence and units |
| Performance | No dedicated profiler/benchmark run | Physical-device startup/frame/memory evidence; this audit makes no performance claim |

## Screenshot walkthrough

These are the exact inspected screenshots from this audit. Open an image for full resolution. Each capture has a paired UI-tree XML where available. Captures 21 and 22 intentionally show the same auto-paused state; this is not evidence of a successful manual Pause action. Resume was exercised in capture 23. The readiness form was recoverable by expanding the drag handle and scrolling; it is not reported as an inaccessible or permanently blocked sheet.

<a id="capture-01"></a>

### Capture 01 — Onboarding: record every run

![Onboarding: record every run](screenshots/01-onboarding.png)

<a id="capture-02"></a>

### Capture 02 — Onboarding: planning

![Onboarding: planning](screenshots/02-onboarding-plan.png)

<a id="capture-03"></a>

### Capture 03 — Onboarding: analytics

![Onboarding: analytics](screenshots/03-onboarding-analytics.png)

<a id="capture-04"></a>

### Capture 04 — Choose data sources

![Choose data sources](screenshots/04-data-source.png)

<a id="capture-05"></a>

### Capture 05 — Android Health Connect setup opened by offline choice

![Android Health Connect setup opened by offline choice](screenshots/05-offline-setup.png)

<a id="capture-06"></a>

### Capture 06 — Fresh dashboard after canceling Health Connect

![Fresh dashboard after canceling Health Connect](screenshots/06-dashboard.png)

<a id="capture-07"></a>

### Capture 07 — Seeded plan: zero-TSS/nonzero-adherence header

![Seeded plan: zero-TSS/nonzero-adherence header](screenshots/07-plan.png)

<a id="capture-08"></a>

### Capture 08 — Seeded athlete body metrics and identity

![Seeded athlete body metrics and identity](screenshots/08-athlete.png)

<a id="capture-09"></a>

### Capture 09 — Profile editor, unchanged seeded values

![Profile editor, unchanged seeded values](screenshots/09-edit-profile.png)

<a id="capture-10"></a>

### Capture 10 — Analytics Overview before test recording

![Analytics Overview before test recording](screenshots/10-analytics.png)

<a id="capture-11"></a>

### Capture 11 — Recovery empty states

![Recovery empty states](screenshots/11-recovery.png)

<a id="capture-12"></a>

### Capture 12 — Record entry, Run selected and location missing

![Record entry, Run selected and location missing](screenshots/12-record.png)

<a id="capture-13"></a>

### Capture 13 — Strength selected, run-specific copy retained

![Strength selected, run-specific copy retained](screenshots/13-strength.png)

<a id="capture-14"></a>

### Capture 14 — Android location permission prompt

![Android location permission prompt](screenshots/14-permission.png)

<a id="capture-15"></a>

### Capture 15 — Physical-activity prompt after location denial

![Physical-activity prompt after location denial](screenshots/15-permission-denied.png)

<a id="capture-16"></a>

### Capture 16 — Notification prompt during denial flow

![Notification prompt during denial flow](screenshots/16-notification-permission.png)

<a id="capture-17"></a>

### Capture 17 — Location permission retry

![Location permission retry](screenshots/17-permission-retry.png)

<a id="capture-18"></a>

### Capture 18 — Strength entry after location grant

![Strength entry after location grant](screenshots/18-activity-permission-retry.png)

<a id="capture-19"></a>

### Capture 19 — Recording active behind physical-activity permission

![Recording active behind physical-activity permission](screenshots/19-recording.png)

<a id="capture-20"></a>

### Capture 20 — Recording active behind notification permission

![Recording active behind notification permission](screenshots/20-notifications-retry.png)

<a id="capture-21"></a>

### Capture 21 — Run auto-paused; labels wrap

![Run auto-paused; labels wrap](screenshots/21-active-run.png)

<a id="capture-22"></a>

### Capture 22 — Auto-paused state re-captured

![Auto-paused state re-captured](screenshots/22-paused-run.png)

<a id="capture-23"></a>

### Capture 23 — Resumed recording; Pause and Finish labels wrap

![Resumed recording; Pause and Finish labels wrap](screenshots/23-resumed-run.png)

<a id="capture-24"></a>

### Capture 24 — Finish confirmation while time continues

![Finish confirmation while time continues](screenshots/24-finish.png)

<a id="capture-25"></a>

### Capture 25 — Saved synthetic run detail

![Saved synthetic run detail](screenshots/25-saved-run.png)

<a id="capture-26"></a>

### Capture 26 — Plan wizard step 1: selected category contrast

![Plan wizard step 1: selected category contrast](screenshots/26-plan-wizard.png)

<a id="capture-27"></a>

### Capture 27 — Step 2: default Marathon race selected

![Step 2: default Marathon race selected](screenshots/27-race-type.png)

<a id="capture-28"></a>

### Capture 28 — Step 3: race date (filename says plan-method)

![Step 3: race date (filename says plan-method)](screenshots/28-plan-method.png)

<a id="capture-29"></a>

### Capture 29 — Step 4: calibration from seeded history

![Step 4: calibration from seeded history](screenshots/29-calibration.png)

<a id="capture-30"></a>

### Capture 30 — Step 5: displayed target time

![Step 5: displayed target time](screenshots/30-target.png)

<a id="capture-31"></a>

### Capture 31 — Step 6: training volume

![Step 6: training volume](screenshots/31-schedule.png)

<a id="capture-32"></a>

### Capture 32 — Step 7: advanced options

![Step 7: advanced options](screenshots/32-availability.png)

<a id="capture-33"></a>

### Capture 33 — Step 8: weekly schedule with Sunday off-screen

![Step 8: weekly schedule with Sunday off-screen](screenshots/33-review.png)

<a id="capture-34"></a>

### Capture 34 — Created local Marathon plan named Audit 5K

![Created local Marathon plan named Audit 5K](screenshots/34-created-plan.png)

<a id="capture-35"></a>

### Capture 35 — Athlete screen after one scroll

![Athlete screen after one scroll](screenshots/35-athlete-menu.png)

<a id="capture-36"></a>

### Capture 36 — Athlete More menu and saved run

![Athlete More menu and saved run](screenshots/36-athlete-more.png)

<a id="capture-37"></a>

### Capture 37 — Settings account and diagnostics

![Settings account and diagnostics](screenshots/37-settings.png)

<a id="capture-38"></a>

### Capture 38 — Sign-in entry; no credentials submitted

![Sign-in entry; no credentials submitted](screenshots/38-sign-in.png)

<a id="capture-39"></a>

### Capture 39 — Nested diagnostics scrolling and units

![Nested diagnostics scrolling and units](screenshots/39-settings-display.png)

<a id="capture-40"></a>

### Capture 40 — Imperial selected; theme and export settings

![Imperial selected; theme and export settings](screenshots/40-settings-theme.png)

<a id="capture-41"></a>

### Capture 41 — CSV export chooser: no receiving apps on AOSP image

![CSV export chooser: no receiving apps on AOSP image](screenshots/41-export-share.png)

<a id="capture-42"></a>

### Capture 42 — App dark theme and imperial dashboard

![App dark theme and imperial dashboard](screenshots/42-dark-imperial.png)

<a id="capture-43"></a>

### Capture 43 — 150% text: dashboard truncation and dark status icons

![150% text: dashboard truncation and dark status icons](screenshots/43-large-dashboard.png)

<a id="capture-44"></a>

### Capture 44 — 150% text: Analytics segmented and bottom navigation wrapping

![150% text: Analytics segmented and bottom navigation wrapping](screenshots/44-large-analytics.png)

<a id="capture-45"></a>

### Capture 45 — Recovery sheet initially partially expanded

![Recovery sheet initially partially expanded](screenshots/45-readiness-form.png)

<a id="capture-46"></a>

### Capture 46 — Recovery sheet after an ineffective body swipe

![Recovery sheet after an ineffective body swipe](screenshots/46-readiness-expanded.png)

<a id="capture-47"></a>

### Capture 47 — Recovery sheet fully expanded; Save near bottom edge

![Recovery sheet fully expanded; Save near bottom edge](screenshots/47-readiness-full.png)

<a id="capture-48"></a>

### Capture 48 — Recovery sheet scrolled to Save, default sliders shown

![Recovery sheet scrolled to Save, default sliders shown](screenshots/48-recovery-save-visible.png)

<a id="capture-49"></a>

### Capture 49 — After saving untouched recovery defaults: No vitals yet

![After saving untouched recovery defaults: No vitals yet](screenshots/49-recovery-after-empty-save.png)

