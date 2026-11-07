# Web audit remediation plan — October 31, 2026

Source: ../product-design-audit-2026-10-31/REPORT.md. Implement within the existing Next.js architecture and design system. Preserve the completed Health desktop/mobile work and unrelated Android changes. No deployment, production database edits, commit, or push is required.

## Execution and ownership

Use three GPT-6.1 Terra agents at medium reasoning. Agents share this checkout, own disjoint files, and must report any necessary cross-boundary change before editing. The coordinator owns shared styles, integration, final validation, and the closure ledger. Each agent reads the detailed source findings, inspects current code, implements the fix, and runs meaningful focused checks. Avoid speculative architectural rewrites.

1. Planning/calendar agent: dates, editor responsiveness/accessibility, generation safety, week identity, import entry (F01/F02/F04/F09/F20 and related F06/F17/F22).
2. Metrics/dashboard agent: metric provenance, cycling derivation, workload summaries, activity rows, completion semantics, analytics legends/filters (F03/F07/F08/F10/F18 and related F06/F17/F22).
3. Auth/settings agent: provider fields, auth/recovery UX, responsive auth, settings panels, AI entitlement, product identity (F05/F12/F13/F14/F15/F16/F19 and related F06/F17/F22).
4. Coordinator: preserve and verify F11/F21, audit shared navigation and style gaps, integrate changes, run compile/tests and local browser regression, record exact evidence and remaining limits.

## Finding-by-finding implementation and acceptance

| Finding | Implementation | Acceptance / verification |
|---|---|---|
| F01 Dates | Replace mixed UTC/local day keys with explicit consistent date helpers across calendar aggregation, lists, mini-calendar, and date-only schedules. Preserve intended activity timezone semantics. | Same activity/workout day across surfaces; regression fixtures around UTC offsets, midnight, DST and month boundaries. |
| F02 Mobile editor | Collapse or hide mini-calendar at narrow widths with an accessible reopen control; wrap toolbar; allow workout panel to shrink and fill width. | Read/edit/add/save at 320/390/768/1280px; no clipped essential actions or document overflow. |
| F03 FTP | Resolve active FTP and W/kg from a common basis, distinguish manual/estimated/missing, remove unannounced 250W fallback, align dashboard derivation. | Missing/manual/estimated states consistent; unavailable values never look measured. |
| F04 Generation | Before mutation, explain affected future dates, preserve completed history, preview parameters/change scope and require explicit replacement confirmation. Provide restore/undo if supported; do not promise unsupported recovery. | Cancel makes no change; review predicts affected scope; successful mutation retains completed history and communicates result. |
| F05 Autofill | Persistent provider labels, explicit field identities/autocomplete behavior, validated HTTP(S) base URL and appropriate key handling; prevent invalid test/save. | Login credentials do not masquerade as provider settings; invalid URL rejected without network call. |
| F06 Accessible controls | Name icon controls, expose selected/expanded/checked states, full date labels, semantic switches/dialogs. Sweep touched flows plus central navigation. | Accessible names for actions; keyboard focus and state clear; no conformance claim without full testing. |
| F07 Workout rows | Separate title from status/action lanes; prevent overlapping badges; allow readable wrapping. | Long/linked/completed/rest rows readable at narrow and desktop widths. |
| F08 Metric basis | Label source, sport, period, completion definition and forecast; share computation where labels promise the same values. | Known fixture reconciled or intentional difference explicitly explained. Do not erase legitimate physiological distinctions. |
| F09 Week identity | Use date-based plan week consistently; distinguish viewport week and phase week; surface duration/phase conflicts for imported or legacy data. | No simultaneous unexplained W1/W5/W6; conflicting phase lengths produce actionable notice. |
| F10 Completion | Rename dialog-opening action to predict the workflow; show completed state and distinguish manual versus linked completion. | Action label matches behavior; save updates/persists and state is announced. |
| F11 Health navigation | Preserve desktop Health link and Back to Dashboard already implemented; check supported mobile entry if needed without redesigning cards. | Visible entry and return navigation work. |
| F12 Settings | Move complex nested profile settings from tiny dropdown to appropriately sized accessible drawer/dialog; retain existing logic, separate immediate versus explicit save semantics. | Readable form width; save reachable; focus/Escape/scroll predictable. |
| F13 AI entitlement | Replace misleading enable CTA with eligibility-specific language and achievable action; distinguish admin service and personal-key setup. | Every entitlement state has clear next step; no surprise provider calls. |
| F14 Recovery | Reuse shared named modal, label email, contain focus, retain Escape and focus return. | Dialog announcement, Tab cycle, Escape and return focus verified. |
| F15 Mobile auth | Compact mobile intro; place sign-in methods/form first while preserving readable consent. | Primary action discoverable on phone; desktop identity retained. |
| F16 Auth forms | Persistent visible labels, upfront password guidance, accessible reveal controls and field-associated errors. | Purpose remains visible after fill; validation/reveal behavior keyboard accessible. |
| F17 Readability | Improve small decision-bearing labels and semantic contrast tokens in affected UI; inspect actual light/dark combinations. | Measured checks for applicable tokens; zoom/reflow and focus inspected; retain explicit limits. |
| F18 Filters/colors | Standardize CTL/ATL/TSB legend colors and label independent period/sport controls; expose selected states. | Range scope and sport scope understandable; consistent colors plus non-color cues. |
| F19 Identity/version | Align auth shell/brand copy with multi-sport product; source web version from package metadata. | Auth screens share identity; footer version matches web package; no Android version coupling. |
| F20 Import | Route import CTA directly to import UI, not generic manual editor; separate studio entry when useful. | Import template/input/preview accessible immediately; cancel and validation work. |
| F21 Health desktop | Preserve completed two-column layout, meal grid, mobile order and optional guidance placement. | Recheck 1440/1024/768/390 plus configured nutrition/water state. |
| F22 Vocabulary | Normalize missing vs zero, units, pluralization and action labels in affected flows; hide unsupported rest-day export. | Unavailable vs zero explained; export only supported types; labels meaningful. |

## Verification gates

- Review diffs for unintended source changes and avoid modifying unrelated Android work.
- Run focused regression tests for dates, metric contracts, URL validation and generation safety where appropriate; do not create tests merely mirroring CSS.
- Run TypeScript compile check. Run affected existing unit tests and broader relevant web tests if feasible.
- Use the isolated local QA database and synthetic test user, never production. Verify login, dashboard/Health navigation, completion, calendar dates, responsive editor, generation review/cancel, settings, recovery and AI setup states.
- Capture before/after evidence for major visual changes at desktop/phone sizes. Browser availability and external service gaps must be documented honestly.
- Maintain STATUS.md with each finding's implementation, verification evidence, and any residual limits. A code change alone does not justify claiming every acceptance case tested.
