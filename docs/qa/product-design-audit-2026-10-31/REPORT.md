# RunFlow web app — detailed functionality and design audit

**Date:** October 31, 2026 · **Repository revision:** `74aaace4` · **Method:** Product Design screenshot-first combined UX, functionality, and accessibility audit.

## Verdict

RunFlow has a useful, functioning training core: email sign-in, dashboard data, manual workout completion, activity detail, sport-specific analytics, local engine generation, and manual weight logging all worked in the exercised paths. The strongest weaknesses are **date consistency, mobile editor reflow, derived-metric provenance, predictable plan changes, and accessible control labeling**. Address these before spending time on cosmetic redesign.

This is a detailed **sampled audit of the main surfaces**, not an exhaustive certification of every route, API contract, calculation, device, or integration. Findings distinguish direct observations, code-supported hypotheses, and fixture limitations.

## Environment and isolation

- Ran the existing Next.js development app locally; no application source fixes were made.
- Created Docker container `runflow-design-audit-db-20261031`, PostgreSQL 16, loopback port **55432**, database `runflow_audit`. Applied all **42 existing migrations** successfully.
- Used the repository's `scripts/seed-design-qa.ts`: `qa@runflow.local`, synthetic user name Thies, 18 activities, a Rotterdam Marathon goal, 14 scheduled workouts, 45 daily fitness records, and 30 days of health/readiness fixtures. The QA login password is `Qa12345!`, an existing local-only fixture password; do not reuse it outside this disposable environment.
- Added the missing synthetic TERMS/PRIVACY/AGE consent fixtures directly to this isolated database. The captured consent gate is real, but no legal agreement was accepted on the user's behalf.
- The server receives its audit database URL and local auth URL through process environment overrides. The existing `.env` was not rewritten. Native Android changes already present in the workspace were left untouched.
- Used the built-in in-app browser. Main wide captures are approximately 1280 × 720; later default-width captures are narrower (about 714 px) as the browser panel changed. Explicit mobile tests requested **390 × 844**. Compare screenshots at their recorded dimensions rather than assuming identical scaling.
- Development overlays visible in some captures are **development tooling**, not production defects. Dev compilation/request timings are not production performance measurements.

## User goals and accessibility target

A runner should be able to sign in, understand today's workout, complete/link training, review activity and fitness trends, adjust a plan safely, and log health measurements. Multi-sport users should see consistent cycling/running metrics and clear setup requirements. Accessibility review targets understandable names, focus behavior, keyboard operation, readable state differences, and responsive reflow. No conformance claim is made.

## Flow coverage and functional results

| Step | Surface or action | Observed health / result | Evidence |
|---|---|---|---|
| 1 | Strava/email sign-in entry | Usable; mobile height and introductory jargon need work. OAuth not completed. | 01, 02, 06 |
| 2 | Password recovery | Opens; Escape closes and restores focus. Delivery not tested. | 03 |
| 3 | Registration | Form renders desktop/mobile; no new registration/verification submission. | 04, 05 |
| 4 | QA email sign-in and consent state | Sign-in succeeds; incomplete fixture initially triggers consent gate. | 07, 08 |
| 5 | Dashboard and workout completion | Save succeeds; counter 4/7 → 5/7; later navigation retains state. Dense rows overlap. | 08, 09, 14 |
| 6 | Training calendar | Loads activities and plans; date mismatch confirmed. Initial partial data settled before accepted capture. | 10, 11 |
| 7 | Advanced editor | Desktop loads; narrow-screen editing obstructed by overflow. | 12, 13, 31 |
| 8 | Import / studio entry | Routes to existing Manual editor, not an import task. | 22 |
| 9 | Local engine generation | Generates and changes future workouts; review/restore UX needs work. | 23, 24 |
| 10 | Activity detail and analysis | Opens correctly; missing stream state observed in DOM because fixtures have no streams. | 25, 26 |
| 11 | Combined, cycling, and running analytics | Charts and sport switching work; metric provenance and FTP inconsistencies. | 15, 16, 29, 30 |
| 12 | Profile navigation and biometrics | Opens; settings cramped and several controls unnamed. No profile save exercised. | 17, 18 |
| 13 | Health and weight log | 72.4 → 72.5 kg saved; success toast; reload retains 72.5. Navigation gap. | 19, 20, 21 |
| 14 | AI Coach and setup | Disabled/admin state renders; credential autofill observed. No provider request or settings save. | 27, 28 |

## Confirmed strengths

- Existing components share a recognizable dark palette, panel treatment, and sport accents across much of the app.
- Activity-detail dialogs expose useful headings, named close controls, and granular metrics. Heart-rate zones include text values in addition to colors.
- The main PMC chart exposes a descriptive image name and data-point summary in the accessibility tree.
- Workout completion persists; the UI eventually refreshes both the done counter and effort totals.
- Weight logging gives an explicit success toast and persists across reload.
- Cycling empty-state copy explains that power meters/smart trainers are needed for power curves and HR/power pairs.
- Mobile analytics uses a readable stacked layout and a bottom Home/Calendar/Analytics navigation; that pattern can be extended consistently.

## Findings and priorities

**Priority meaning:** P1 = high-impact functional, trust, access, or recovery issue; P2 = meaningful usability/consistency issue; P3 = polish or content improvement. Priority reflects this audit's evidence and impact, not a security vulnerability severity rating.

### F01 · P1 · Calendar and mini-calendar place records on different days

The dashboard and activity detail identify **Friday easy miles as Friday, October 30**. The training calendar places it under **Saturday 31**. Recovery shakeout is Monday 26 on the dashboard, but Tuesday 27 in the calendar. The editor's main list puts the recovery workout on Monday 26 while its mini-calendar marks recovery on Tuesday 27. This is a reproducible cross-surface inconsistency, not an inference from activity names alone.

**Reproduce:** Sign in → inspect Recent Activities → Calendar → inspect the same activities → Advanced Editor → compare the mini-calendar with the main week list. Compare screenshots 08, 10, 12, and 25. Training execution and activity linking depend on the date being trustworthy.

**Likely cause, supported by code:** `WeeklyView.tsx:71` and `MiniCalendar.tsx:25` derive day keys with `toISOString().split('T')[0]`, whereas other calendar code uses `format(day, 'yyyy-MM-dd')`. Mixing UTC and local day keys can offset records. This is a root-cause hypothesis supported by the implementation; it has not been patched and retested.

**Recommendation:** Adopt one explicit day-key convention for scheduled workouts and one documented timezone rule for activity timestamps. Use it in aggregations, week lists, mini-calendars, and detail screens.

**Acceptance:** The same activity/workout appears on the same intended day in all surfaces. Add regression cases around midnight, month boundaries, DST, and both positive and negative UTC offsets.

![F01: Calendar and mini-calendar place records on different days](screenshots/10-calendar-desktop.jpg)

### F02 · P1 · Advanced editor is largely unusable on a phone

At a requested **390 × 844** viewport, the fixed mini-calendar occupies most of the available width. Workout rows are compressed into a narrow strip; their contents and toolbar actions extend off-screen. A second capture after fresh navigation reproduced the issue. The DOM measured **382 px client width versus 638 px document scroll width** (the scrollbar accounts for the viewport/client-width difference).

**Reproduce:** Open Advanced Editor on a narrow viewport. See screenshots 12, 13, and 31 for the desktop/mobile comparison.

**Code evidence:** `PlanEditorLayout.tsx:371–380` places a `w-64` non-shrinking mini-calendar beside a flexible content panel. There is no responsive collapse at this layout boundary.

**Recommendation:** Collapse the mini-calendar into a date picker or drawer on narrow screens, wrap the toolbar, and give the selected day's workouts the full width. Keep actions reachable without horizontal document scrolling.

**Acceptance:** At 320, 390, 768, and 1280 px, users can read, edit, add, and save a workout. No essential action is clipped. Recheck at browser zoom and with long workout titles.

![F02: Advanced editor is largely unusable on a phone](screenshots/31-mobile-editor-confirmation.jpg)

### F03 · P1 · Cycling metrics disagree about whether FTP is known

The cycling summary displays **Active FTP “– W”**, but immediately underneath it displays **2.76 W/kg**. The same page's power-zone description says **Active FTP (250 W)**. The dashboard's cycling strip displays no Bike VO2max while cycling analytics reports **42.8**. Missing power-stream data is expected in this fixture; contradictory missing/derived values are not explained to the user.

**Reproduce:** Dashboard → Analytics → Open Full Cycling Analytics. Compare screenshots 08 and 16 and the power-zone description in the page DOM.

**Code evidence:** `CyclingAnalyticsSection.tsx:215–216` resolves active FTP separately from W/kg. At line 573 the description substitutes **250** when active FTP is absent. This directly explains at least the unmarked fallback in the zone description; the origin of the W/kg value needs a separate server-data investigation.

**Recommendation:** Resolve FTP once and pass its value, provenance, and confidence to every derived metric. Hide dependent values when unavailable, or label assumptions clearly. Remove the unannounced 250 W fallback.

**Acceptance:** Empty FTP produces a consistent setup state. Entering FTP updates watts, W/kg, zone descriptions, and dashboard metrics consistently. Test measured, manual, estimated, and missing states.

![F03: Cycling metrics disagree about whether FTP is known](screenshots/16-cycling-analytics.jpg)

### F04 · P1 · Plan generation changes future workouts without a review step

Clicking **Generate Plan** in the existing QA plan immediately regenerated future training. The next long run changed from **24 km / 105 TSS** to **27.5 km / 138.7 TSS**; the completed workouts remained visible. There was no preview or clear replacement summary in the captured generator form. This was tested only in the isolated disposable database.

**Reproduce:** Existing plan → Engine Generator → keep displayed defaults → Generate Plan. Compare screenshots 12, 23, and 24.

**Recommendation:** State what dates and unfinished workouts will change before committing. Show a before/after summary, preserve completed history, and provide a reliable restore path. The toolbar exposes Undo, but its ability to restore a regeneration was not verified; Redo is explicitly “coming soon.”

**Acceptance:** Users can identify the affected range and mileage/load changes before saving. Cancel leaves the plan untouched. Restoring the prior plan must be tested explicitly.

![F04: Plan generation changes future workouts without a review step](screenshots/23-engine-generator.jpg)

### F05 · P1 · AI connection fields receive sign-in autofill

Opening AI Features populated the **Base URL** with the synthetic login email `qa@runflow.local`, and the API Key field contained a masked autofilled value. No provider test or settings save was executed. The supplied value was not revealed or compared, so its exact contents are unverified.

**Reproduce:** Sign in with the QA credentials in this browser session → AI Coach → Enable AI Features → inspect provider fields. The Base URL must be a service URL, not an account email.

**DOM evidence:** Base URL is `type="text"`; API Key is `type="password"`; both lack `name` and `autocomplete` attributes. This makes credential autofill a plausible mechanism. Behavior is browser-dependent and should be reproduced in the supported browsers before treating the mechanism as universal.

**Recommendation:** Give provider fields persistent labels, explicit names, URL validation, and appropriate autofill handling. Keep Test API Key disabled until the provider URL is valid and required fields are intentionally supplied. Do not claim autocomplete alone solves every password-manager behavior.

**Acceptance:** Stored RunFlow sign-in credentials never populate provider configuration. Invalid URLs cannot be tested or saved; no secrets appear in screenshots, logs, or validation messages.

![F05: AI connection fields receive sign-in autofill](screenshots/28-ai-setup.jpg)

### F06 · P1 · Important icon controls lack accessible names

The captured accessibility trees expose unnamed buttons in the advanced editor, analytics back control, biometrics switches/back control, AI Coach toolbar, and health body-metrics close control. At the reproduced mobile editor state, a DOM check found **three buttons with no text, aria-label, or title**; additional day-row controls may have other semantics and were not counted as failures solely from that heuristic.

**Impact:** A screen-reader user cannot reliably discover what these controls do. An unlabeled toggle also lacks an understandable state in the captured tree.

**Recommendation:** Name every icon button by action; use switch semantics and an announced checked state for toggles. Use complete dates for mini-calendar buttons, not only “1”, “2”, etc. Expose selected tab/filter states programmatically.

**Acceptance:** Accessible-tree inspection gives every actionable control a useful name, role, and state. Test keyboard navigation, focus visibility, and a screen reader. Relevant accessibility areas include Name/Role/Value and Keyboard; this audit does not certify WCAG compliance.

![F06: Important icon controls lack accessible names](screenshots/12-plan-editor-desktop.jpg)

### F07 · P2 · Workout titles disappear or overlap completion badges

The completed workout rows on the desktop dashboard compress their descriptions severely. Some display essentially the date, icon, metrics, and overlapping **Linked Activity / Done** content, while meaningful workout text is absent or reduced to “S…”. The tree still contains the full text, but a sighted user cannot scan it.

**Reproduce:** Load the populated dashboard at the desktop capture width. See screenshots 08 and 14.

**Recommendation:** Reserve fixed space for status/actions and allow the title a separate line. Show completion once; make secondary actions available on focus as well as hover. Let a dense row expand for detail.

**Acceptance:** Long titles, linked states, completion states, and rest days remain readable at all breakpoints; badges never overlap titles or each other.

![F07: Workout titles disappear or overlap completion badges](screenshots/08-dashboard-desktop.jpg)

### F08 · P2 · Training-load numbers use different bases without explanation

Dashboard Training Status shows **CTL 24 / ATL 44 / TSB –20** (the first two as percentages with absolute values in tooltips). The calendar shows **CTL 34 / ATL 30 / TSB +4**, describing the user as fresh. Dashboard weekly effort is **352 / 325 TSS** after manual completion; the calendar shows **264 / 325** for that week. The editor simultaneously shows **Week 6 effort 276 / 325** and a visible week effort of **220 / 325**.

These differences are confirmed displays, not proof that every formula is wrong. The fixture contains DailyFitness history alongside activity-derived loads, and different views can legitimately use different periods or completion definitions. The user is not told which basis applies.

**Recommendation:** Name the metric source, sport scope, period, and actual-versus-completed-plan distinction. Share an aggregation contract where the UI promises the same metric. Show “as of” dates and explain forecasts.

**Acceptance:** Reconcile a known fixture across all views. Intentional differences are labeled and explained; identical labels/scopes produce identical values.

![F08: Training-load numbers use different bases without explanation](screenshots/14-dashboard-after-save.jpg)

### F09 · P2 · Week numbers and plan duration have competing meanings

The dashboard says **Week 5 of 12**, the editor timeline says **Now (W6)**, the visible current-week block is **Week 1**, and phase blocks total **14 weeks**. The seed itself supplies a 12-week goal and 14 weeks of phase metadata; that part is a fixture inconsistency, not a proven creation-flow defect. The editor still presents several unlabeled week origins simultaneously.

**Recommendation:** Separate plan week, visible-range week, calendar week, and phase week explicitly. Validate stored phase durations against the goal and show a repair notice for conflicting imported/legacy data.

**Acceptance:** Newly generated, imported, and legacy plans either agree on duration or explain the mismatch. A user can tell exactly which dated week is current.

![F09: Week numbers and plan duration have competing meanings](screenshots/12-plan-editor-desktop.jpg)

### F10 · P2 · “Done” opens a full editor rather than completing directly

Clicking the green **Done** button opens **Edit Workout**, prechecks “Mark as completed”, and requires Save. This did persist successfully: the counter moved from **4/7 to 5/7** and remained changed after later navigation. The observed issue is expectation and friction, not a failed save.

**Recommendation:** Use “Mark complete” for an immediate action with undo, or “Complete…” for a dialog. If linking is important, use a focused completion dialog instead of the entire workout editor. Explain the difference between a manual completion and a synced activity.

**Acceptance:** The label predicts the result, focus lands on the relevant step, and the updated state is announced and persists.

![F10: “Done” opens a full editor rather than completing directly](screenshots/09-workout-completion-dialog.jpg)

### F11 · P2 · Health lacks a visible route back to the main app

The implemented `/health` page has a Health title and reminder control, but the captured full accessibility tree has no Home, Dashboard, Calendar, or back navigation. It was reached directly from its implemented route because the desktop profile menu does not expose Health, despite the QA user's health features being enabled. At 390 px its captured tree likewise lacked the bottom navigation present in mobile analytics.

**Recommendation:** Use a shared navigation shell for supported web routes. Expose Health predictably when enabled and add a visible Home/back route. Keep platform-specific informational notices inside the page rather than changing navigation conventions.

**Acceptance:** Users can navigate to Health and back through visible controls on desktop and mobile web, with no need to edit the URL or rely on browser history.

![F11: Health lacks a visible route back to the main app](screenshots/19-health-desktop.jpg)

### F12 · P2 · Complex settings are squeezed into a profile dropdown

Biometrics opens as a narrow, vertically scrolling profile panel over the dashboard. It contains weight/height, race calibration, dashboard layout options, metric selection, units, and health-feature settings. Full explanatory text and Save Profile are deep inside the panel, while the underlying page remains visible and scrollable-looking.

**Recommendation:** Move long settings forms to a dedicated page or a properly sized drawer. Group profile, training calibration, display, and health settings. Clarify which changes save immediately versus through Save Profile or Save Factor.

**Acceptance:** Every section is readable without excessive wrapping; save state is explicit; keyboard focus and scrolling remain predictable; mobile navigation has an equally discoverable entry.

![F12: Complex settings are squeezed into a profile dropdown](screenshots/18-biometrics.jpg)

### F13 · P2 · AI onboarding promises an action the user cannot complete

The empty state offers **Enable AI Features**, but the resulting dialog says **AI access has not been granted by an administrator** and disables enabling. It then shows an optional personal API key configuration, which makes the entitlement boundary harder to understand.

**Recommendation:** Detect eligibility before showing the CTA. Explain whether the user must contact an administrator or may bring their own key, and show only the permitted setup path. Prefer “View AI access” when access cannot be enabled here.

**Acceptance:** Each entitlement state has an achievable next action. No configured-provider request was made in this audit, so model behavior and billing were not tested.

![F13: AI onboarding promises an action the user cannot complete](screenshots/27-ai-coach.jpg)

### F14 · P2 · Recovery dialog uses different modal semantics and backdrop

Reset Password appears as a floating panel while the background remains strongly visible. Its captured accessibility tree exposes a heading and fields but no named dialog, unlike Edit Workout and AI Features. The email textbox is unlabeled in that tree. **Escape successfully closed it and returned focus to Forgot password**, which is a confirmed strength.

**Recommendation:** Reuse the named modal component with a consistent backdrop, dialog labeling, field association, and focus containment. Preserve the working Escape/focus-return behavior.

**Acceptance:** A screen reader announces the dialog and email label. Tab and Shift+Tab stay within it; Escape closes it; focus returns to its trigger. Full tab-cycle testing remains a follow-up.

![F14: Recovery dialog uses different modal semantics and backdrop](screenshots/03-password-recovery.jpg)

### F15 · P2 · Mobile login spends the first screen on introductory content

At 390 × 844, the large stacked introduction occupies roughly the top half of the page; the Strava CTA is near the bottom and explanatory text continues below the viewport. Returning users must move past jargon and marketing content before signing in.

**Recommendation:** On narrow screens, reduce the introductory block and place sign-in controls immediately after a compact brand/title area. Keep consent text readable, avoid hiding necessary information, and retain email as an obvious alternative.

**Acceptance:** At common phone sizes, users can find the sign-in method and understand the disabled CTA without scrolling through a tall introduction. Recheck with cookie notice present and with the software keyboard open.

![F15: Mobile login spends the first screen on introductory content](screenshots/06-login-mobile.jpg)

### F16 · P2 · Auth forms depend on placeholder labels and hidden password rules

Email/password fields visually use placeholders rather than persistent visible labels. The accessibility tree gives most fields names, which is positive, but after typing the visible context can disappear. The empty registration screenshot does not explain password requirements or provide a visible show-password control.

**Recommendation:** Use persistent labels and short password requirements before entry, with accessible inline feedback. Add a labeled reveal control that preserves focus. Avoid requiring a failed submit to discover rules.

**Acceptance:** Field purpose remains visible after typing or autofill. Requirements, errors, and confirmation matching are associated with the relevant field. Registration submission/verification delivery was not exercised because the test user was seeded.

![F16: Auth forms depend on placeholder labels and hidden password rules](screenshots/04-registration-desktop.jpg)

### F17 · P2 · Contrast and very small text need measured verification

Calendar legends, date labels, TRIMP values, phase-block captions, and dashboard metric subtitles are very small and muted against dark panels. Selected/disabled styles sometimes differ mainly in low-contrast color. This is a visual risk assessment; no numerical contrast ratios were measured, so these are not declared WCAG contrast failures.

**Recommendation:** Increase secondary-text size where it carries decisions, use stronger semantic text tokens, and measure actual foreground/background combinations in both themes. Keep disabled states distinguishable without making labels unreadable.

**Acceptance:** Measure contrast for text and controls, test 200% zoom/reflow, and inspect keyboard focus rings. Pay particular attention to calendar cards, linked badges, and settings helper copy.

![F17: Contrast and very small text need measured verification](screenshots/11-calendar-week.jpg)

### F18 · P2 · Metric colors and range controls change across screens

Dashboard CTL is blue and ATL is orange/red; the combined PMC uses cyan for CTL and pink for ATL; cycling PMC renders both Bike TSS and CTL in orange with other distinctions mainly in line style. Analytics also contains a global **42d/90d/180d/1y/all** range, another **1M/3M/6M/1Y/ALL** range, and additional chart-specific controls. Their scopes are not consistently named.

**Recommendation:** Standardize metric colors across product surfaces and pair them with text/line patterns. Label the scope of independent filters and show the active date interval near affected charts. Keep casing and duration units consistent.

**Acceptance:** A user can tell which chart a filter changes. CTL, ATL, and TSB are recognizable without relearning colors or depending solely on color.

![F18: Metric colors and range controls change across screens](screenshots/15-analytics-desktop.jpg)

### F19 · P3 · Brand and copy vary across entry points

Login uses a text RunFlow wordmark and split layout; registration switches to the runner app icon and a centered form. Auth copy positions the app as a running dashboard with CTL/ATL/TSB and “Daniels plans,” while the authenticated product includes cycling and broader training features. The footer displays **v1.2.0**; `Web/package.json` says **1.2.9**. These are product clarity/version-display inconsistencies, not a claim about the Android release number.

**Recommendation:** Reuse an auth shell and brand treatment. Lead with understandable outcomes and explain specialist metrics when needed. Read the displayed web version from one build source.

**Acceptance:** Login, registration, and recovery look like one product; web version matches the deployed web build; multi-sport positioning is intentional and consistent.

![F19: Brand and copy vary across entry points](screenshots/02-email-signin.jpg)

### F20 · P2 · Import entry point does not open an import task

The calendar's **Import CSV / AI Plan Studio** CTA opens the existing plan editor in Manual mode. No import dropzone or import wizard appears in the resulting screen. This does not prove import is absent: it may be nested under Plan actions. It does show that the entry label and immediate destination do not match.

**Recommendation:** Split “Import plan” and “Open plan studio”, or route directly to a clearly titled import dialog. Preserve context and explain what will be created or replaced.

**Acceptance:** Users can reach a sample CSV template, field validation, preview, and commit/cancel through a predictable import entry. Actual CSV upload/commit was not tested.

![F20: Import entry point does not open an import task](screenshots/22-import-studio-result.jpg)

### F21 · P3 · Desktop health wastes space and prioritizes setup over daily tasks

At the desktop capture size, health content occupies a narrow phone-like center column with wide empty margins. An app recommendation, nutrition-goal setup, and meal suggestion card precede daily metrics. Readiness is pushed toward the fold; food entry is further down.

**Recommendation:** Use a desktop grid with daily state first and optional setup in a secondary region. Keep a compact mobile column. Let users dismiss setup guidance once understood, without hiding incomplete setup status.

**Acceptance:** At desktop widths, readiness, body metrics, and primary logging actions are easy to scan together. On mobile, essential daily tasks remain reachable without repeated setup content.

![F21: Desktop health wastes space and prioritizes setup over daily tasks](screenshots/19-health-desktop.jpg)

### F22 · P3 · Labels and missing-data formatting are inconsistent

The app alternates TSS/rTSS/TRIMP, VO2max/VO₂max, Analyse/Analytics, “Supp”, lowercase meal labels, “1 rides,” and different unavailable markers. Rest days expose a .FIT action in the calendar. Some distinctions are technically valid, but they are not explained where users compare them.

**Recommendation:** Establish a small vocabulary/formatting guide: metric name and source, units, singular/plural rules, missing versus zero values, and export eligibility. Use full action words when space allows. Explain derived/estimated metrics at the point of use.

**Acceptance:** Missing values never look like measured zeros; durations/distances have units; export controls only appear for supported workout types; labels remain understandable to non-experts.

![F22: Labels and missing-data formatting are inconsistent](screenshots/16-cycling-analytics.jpg)

## Recommended delivery sequence

1. **Correctness and access:** F01 date keys; F02 mobile editor; F03 FTP provenance; F05 provider autofill; F06 named controls. Verify with focused date, metric, and accessibility tests.
2. **Safe planning:** F04 generation preview/recovery; F08 aggregation contracts; F09 week/duration validation; F10 completion semantics. Include manual-completion-only and linked-activity cases.
3. **Navigation and workflows:** F11 shared shell; F12 settings structure; F13 AI entitlement path; F14 shared modal; F20 direct import task.
4. **Readability and consistency:** F07 row reflow; F15–F19 auth, typography, tokens, ranges, and branding; F21–F22 health layout and vocabulary.

## Follow-up verification matrix

| Area | Required scenarios |
|---|---|
| Dates | UTC ± offsets; DST change; activities near midnight; date-only workouts; week/month/year boundaries; dashboard/calendar/mini-calendar parity |
| Plan safety | Empty plan; generated plan; imported plan; preserve completed workouts; cancel; regeneration diff; undo/restore after generation; reload persistence |
| Metrics | Running only, cycling only, combined; manual versus linked completion; missing FTP, manual FTP, estimated FTP; no HR/power streams; compare identical periods |
| Forms | Empty, malformed, boundary values; password rules; invalid email; server failure; retry; accessible error association; no duplicate submissions |
| Responsive | 320/390/768/1280 px; long names; large text; 200% zoom; software keyboard; sticky navigation; landscape |
| Accessibility | Keyboard-only main journeys; modal focus trap/return; menu Escape; switch/tab states; screen-reader labels; contrast measurement; reduced motion |
| Auth/integrations | Real Strava OAuth/sync/webhook; registration verification; recovery code email; expired sessions; AI enablement and provider errors; food search/barcode/camera |

## Limits and untested areas

- This environment had no working production Strava secret or real linked account, no email delivery setup validated, and no enabled AI access/provider configured for the QA user. No live Strava sync, generated AI response, paid model request, or real email was attempted.
- Activity and health fixtures are synthetic. They contain no activity streams, sparse training history, and a known goal-duration/phase-duration inconsistency. Metrics shown here are useful for detecting presentation/contract mismatches, not validating physiological accuracy. Engine generation was exercised, but its training quality was not evaluated.
- No full registration submission, password-reset code round trip, CSV upload/commit, .FIT/.zwo download/import, nutrition catalog search, camera/barcode permission flow, supplement CRUD, reminders delivery, admin operations, PWA offline/install, or production deployment was exercised.
- No exhaustive race-type, triathlon, cycling-generation, pagination, drag-and-drop, multi-goal, or destructive-action suite was run. No production load/performance benchmarking, penetration test, or medical assessment was performed.
- Accessibility findings use screenshots, accessibility trees, a small DOM inspection, and the observed recovery Escape/focus-return check. They do not substitute for measured contrast, a screen reader, a complete keyboard pass, or automated accessibility scanning.
- Browser credential autofill is a direct observation in this audit session, but exact masked contents and behavior in other browsers were not checked. The AI dialog was canceled without saving or testing credentials.

## Local handoff and reproducibility

The isolated database container is retained with synthetic test data and the generated QA plan. The audit development server was started at `http://127.0.0.1:3000` with process-only environment overrides; it may stop when the tool session ends. Existing database configuration is unchanged.

To restart the audit environment if needed:

```bash
docker start runflow-design-audit-db-20261031
cd /home/thies/Projects/RunFlow/Web
DATABASE_URL=postgresql://audit:runflow-local-audit-only@127.0.0.1:55432/runflow_audit \
NEXTAUTH_URL=http://127.0.0.1:3000 AUTH_URL=http://127.0.0.1:3000 \
npm run dev -- --hostname 127.0.0.1
```

Use `qa@runflow.local` / `Qa12345!` for the local test account. These credentials and the database password are disposable audit fixtures only. Rerunning the existing seed script can restore parts of the fixture; it is not a substitute for a tested plan undo operation.

**Deliverables:** `REPORT.md`, a self-contained `REPORT.html`, all accepted screenshots with a dimension manifest, and `runflow-web-audit.zip` containing the report and images. No production files or data were changed.

**Workflow:** Product Design [audit skill](/home/thies/.codex/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/audit/SKILL.md).

## Additional captured evidence

The following captures complete the flow coverage above. Their filenames identify the step and state.

### 01 login strava

![01 login strava](screenshots/01-login-strava.jpg)

### 05 registration mobile

![05 registration mobile](screenshots/05-registration-mobile.jpg)

### 07 consent gate

![07 consent gate](screenshots/07-consent-gate.jpg)

### 13 plan editor mobile

![13 plan editor mobile](screenshots/13-plan-editor-mobile.jpg)

### 17 navigation menu

![17 navigation menu](screenshots/17-navigation-menu.jpg)

### 20 weight save

![20 weight save](screenshots/20-weight-save.jpg)

### 21 health mobile

![21 health mobile](screenshots/21-health-mobile.jpg)

### 24 engine result

![24 engine result](screenshots/24-engine-result.jpg)

### 25 activity details

![25 activity details](screenshots/25-activity-details.jpg)

### 26 activity analysis

![26 activity analysis](screenshots/26-activity-analysis.jpg)

### 29 analytics mobile

![29 analytics mobile](screenshots/29-analytics-mobile.jpg)

### 30 running mobile

![30 running mobile](screenshots/30-running-mobile.jpg)

