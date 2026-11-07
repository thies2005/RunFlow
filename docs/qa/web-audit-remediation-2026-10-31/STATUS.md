# Remediation status — November 1, 2026

Detailed implementation plan: [PLAN.md](PLAN.md). Source audit: [REPORT.md](../product-design-audit-2026-10-31/REPORT.md).

Implementation used GPT-6.1 Terra agents at medium reasoning for planning/calendar, metrics/dashboard, and auth/settings, with coordinator integration. Existing Health changes and unrelated Android work were preserved. No production migration, deployment, commit, or push was performed.

## Finding ledger

“Implemented” means the identified code/UX defect has a corrective change. It does not mean every browser, screen reader, integration, or acceptance scenario has been certified.

| Finding | Implementation | Evidence / limits |
|---|---|---|
| F01 Date consistency | Consistent local day keys and explicit date-only schedule parsing in calendar and mini-calendar. | Calendar regression tests; see PLANNING.md for timezone scope. |
| F02 Mobile editor | Collapsible calendar, wrapping toolbar, shrinking workout content. | Browser viewport checks and screenshots recorded by planning agent. |
| F03 Cycling metric consistency | Shared manual/estimated/missing FTP resolver; no unannounced watts/weight defaults. | Resolver and dashboard/stats tests; old stored power zones may retain an earlier FTP. |
| F04 Generation safety | Review/cancel step, protected history boundary, explicitly scoped workout restoration. | Replacement-scope tests and browser review checks; restoration does not claim to restore all phase/settings metadata. |
| F05 Provider autofill | Distinct labeled provider fields, autocomplete hints, URL validation, intentional key input before test. | Invalid URL produces no request in tests. Password managers may disregard hints; universal autofill prevention is not claimed. |
| F06 Accessible controls | Names, checked/pressed/expanded states, named dialogs and stacked focus handling in audited flows. | Shared modal tests and browser recovery focus checks. Full screen-reader and native-back matrix unverified. |
| F07 Workout row overlap | Wrapping title/status/action lanes with explicit linked/manual state. | Source implementation and component/API regression coverage; arbitrary long translations remain untested. |
| F08 Load provenance | Sport/period/source labels and completed-estimate vs recorded-activity semantics; shared cycling calculation. | Dashboard/stats contracts tested. Full physiological reconciliation/performance benchmarking not claimed. |
| F09 Week identity | Monday-based plan-start week alignment and visible duration conflict/fallback notices. | Planning tests, aligned dashboard calculation; legacy data conflicts are surfaced rather than silently rewritten. |
| F10 Completion semantics | “Complete…” predicts dialog; live completion count and linked/manual status. | Existing persistence behavior preserved; app source reviewed. |
| F11 Health navigation | Desktop Health link, matching back control, mobile Health tab and route synchronization. | Shared local-browser navigation checks passed, no page errors. |
| F12 Settings width | Wide accessible desktop settings dialog; explicit immediate/profile/calibration save descriptions. | Auth/settings tests; full settings matrix not exercised. |
| F13 AI eligibility | Actionable approval/setup states; denial, load failure, and disabled AI separated. | Code review and focused tests. Real provider/account matrix unverified. |
| F14 Recovery modal | Shared named dialog, associated fields, focus containment and return. | Browser Shift+Tab wrap and Escape/focus return verified. Real email/code delivery unverified. |
| F15 Mobile auth hierarchy | Compact introduction and earlier sign-in entry. | Mobile browser screenshot. Software-keyboard/zoom matrix unverified. |
| F16 Persistent auth labels | Visible labels, reveal controls, upfront password rules. | Browser sign-in/registration inspection. Real account creation not performed. |
| F17 Readability | Shared muted/primary button tokens with measured contrast; larger decision labels in affected planning/settings controls. | Standard token pairs measured below. Not a whole-product WCAG conformance result. |
| F18 Analytics consistency | Consistent PMC metric colors, non-color line cues, labeled independent range/sport scopes and states. | Compile/unit checks; comprehensive assistive-technology chart review unverified. |
| F19 Brand/version | Shared multi-sport auth identity and web package-sourced footer version. | Compile/source checks; independent Android release untouched. |
| F20 Import entry | Calendar import action reaches import flow directly. | Planning browser check and import regression coverage. |
| F21 Health desktop | Wide nutrition/meal area with overview/sidebar; mobile sequence retained. | Previous four-width checks plus current desktop/mobile browser smoke. |
| F22 Vocabulary/data absence | Explicit missing FTP/load, units and pluralization; completion labels; rest-day export suppressed in planning. | Targeted source/tests. Not an exhaustive rewrite of all product copy. |

## Shared contrast measurements

Calculated sRGB relative luminance ratios for standard unmodified surfaces:

- Light muted text `#60676e` on white: **5.73:1**; on `#edefea`: **4.95:1**.
- Light primary button white on `#b83b16`: **5.71:1**.
- Dark primary button `#121417` on `#ff6a3c`: **6.48:1**.
- Dark muted text `#a6aba5` on `#22262b`: **6.51:1**.

Opacity, mixed/tinted backgrounds, chart marks and disabled states require separate measurement. These numbers do not certify all rendered combinations.

## Validation record

- Shared desktop Health navigation, mobile Health tab/current-page state, and Back to Dashboard → Home synchronization passed in a local headless browser; no page errors (`SHARED-BROWSER.json`).
- Final TypeScript compile: passed with no diagnostics (`typecheck.log`).
- Full web Jest result: **158 suites passed; 1,598 tests passed**. Saved in `tests.log`. Run with `--runInBand --forceExit`; Jest still has open handles after tests, so process shutdown cleanliness is not claimed.
- Focused agent tests and browser evidence: [AUTH-SETTINGS.md](AUTH-SETTINGS.md), [METRICS.md](METRICS.md), [PLANNING.md](PLANNING.md).
- An existing quota test assumed yesterday always belongs to the current month. It failed at the November 1 boundary; its test clock is now fixed inside a month without changing production quota logic.
- The first full suite also exposed missing mocks for the new shared cycling calculation; those were fixed alongside regression assertions for absent/estimated FTP. Final results supersede that initial run.

## Remaining verification boundaries

Real Strava OAuth/sync, provider requests/billing, account verification/recovery email delivery, exhaustive CSV import/export formats, native permissions/back, screen-reader coverage, 200% zoom, all browser/password-manager combinations, and production performance are not certified here. Synthetic local fixtures and manual browser checks cannot establish those outcomes. Existing server and isolated audit database can be stopped after review; user production data was not used.
