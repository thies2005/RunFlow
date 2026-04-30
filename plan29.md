# RunFlow Flutter — Production Readiness Plan

**Date:** April 29, 2026  
**Baseline:** `flutter analyze` 0 issues, 507/507 tests passing  
**Scope:** Close all remaining audit gaps, achieve production readiness  
**Upstream reference:** `auditsonnet28.md` Section 8 (Orchestration Framework)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Issue Inventory](#2-issue-inventory)
3. [Execution Phases](#3-execution-phases)
4. [Multi-Agent Orchestration](#4-multi-agent-orchestration)
5. [Review Framework](#5-review-framework)
6. [Branch & Merge Strategy](#6-branch--merge-strategy)
7. [Test Strategy by Phase](#7-test-strategy-by-phase)
8. [RACI Ownership](#8-raci-ownership)
9. [Dependency Graph](#9-dependency-graph)
10. [Change-Control Rules](#10-change-control-rules)
11. [Risk Register](#11-risk-register)
12. [Release Readiness Criteria](#12-release-readiness-criteria)
13. [Effort Estimate](#13-effort-estimate)

---

## 1. Executive Summary

A previous implementation pass (Phase A–F from `auditsonnet28.md`) resolved 30+ findings but introduced **two critical regressions** (REG-01, REG-02) and left **22 items open** across architecture, reliability, parity, and infrastructure tiers.

This plan re-baselines all open items, adds the multi-agent governance framework required for production release, and defines measurable exit gates.

**Planning constraint:** This document is planning-only. No implementation work starts until the plan is explicitly approved.

### Critical Regressions (must fix first)

| ID | Issue | Impact |
|----|-------|--------|
| REG-01 | Chat endpoints point to non-existent `/api/mobile/v1/ai/chat/*` — all chat operations 404 | All mobile users cannot chat |
| REG-02 | AI scan sends JSON but mobile v1 endpoint expects FormData — food scanning broken | AI food scan feature non-functional |

### Issue Count by Tier

| Tier | Count | Severity |
|------|-------|----------|
| TIER 1: Regressions + Arch violations | 3 | Critical |
| TIER 2: Reliability bugs | 4 | High |
| TIER 3: Code quality | 5 | Medium |
| TIER 4: Feature parity | 7 | Medium |
| TIER 5: Infrastructure & polish | 6 | Low-Medium |
| **Total** | **25** | |

---

## 2. Issue Inventory

### TIER 1 — Must Fix (breaks user flows or is a regression)

| ID | Category | Issue | Root Cause | Fix Strategy |
|----|----------|-------|------------|-------------|
| REG-01 | API | Chat 404 on mobile | Endpoints point to non-existent `/api/mobile/v1/ai/chat/*` | Revert chat URLs to `/api/ai/chat/*` OR create mobile v1 chat routes on backend. Must verify which auth mechanism `/api/ai/chat/*` uses (NextAuth session vs JWT Bearer). If it accepts Bearer JWT, use it directly. |
| REG-02 | API | AI scan fails on mobile | Sends JSON to endpoint that expects FormData | Send FormData with `image` file field to mobile v1 endpoint, OR switch to the web endpoint that accepts JSON base64. Must verify which endpoint accepts Bearer JWT auth. |
| ARCH-01 | Arch | Domain imports Data models (14 imports, 9 files) | All repository interfaces import `data/models/` directly | Create domain entity classes. Add mapper layer in data repositories. Update domain interfaces to use domain types. |

### TIER 2 — Reliability Bugs

| ID | Category | Issue | Fix |
|----|----------|-------|-----|
| BUG-01 | API | `performBackgroundSync` returns `false` on 401 → infinite Workmanager retries | Return `true` on 401 (permanent). Return `false` only for transient errors (5xx, offline). |
| BUG-02 | Lifecycle | `DeduplicationInterceptor.close()` never called — Timer.periodic leaks forever | Call `close()` explicitly in `AuthState.logout()`. Add `ref.onDispose` for non-keepAlive scenarios. |
| BUG-03 | Dead code | `CancelToken` in `getMessages` is anonymous — never stored, can't be cancelled | Store as `_activeGetToken` field and cancel on disposal, or remove the dead parameter. |
| BUG-04 | Dead code | `isCacheStale` property defined but never called by any consumer | Wire into dashboard provider to show stale indicator, or remove it. |

### TIER 3 — Code Quality

| ID | Category | Issue | Fix |
|----|----------|-------|-----|
| QUAL-01 | Test naming | 3 background_sync tests say "returns true" but assert `false` | Fix test descriptions to match assertions. |
| QUAL-02 | Inconsistency | Two different nutrition defaults: `2000 cal / 3.0L water` (screen) vs `2500 cal / 2.0L water` (API fallback) | Consolidate to single `NutritionTargets.defaults` constant. |
| QUAL-03 | Duplicate | `goal_setup_wizard.dart:935` local `_formatDuration` duplicates shared `formatDuration` | Replace with shared import. |
| QUAL-04 | Minor | Dedup key has trailing `?` for no-param requests | Guard: only append `?${params}` when params non-empty. |
| QUAL-05 | Test gap | Zero tests for: DeduplicationInterceptor, TrainingPacesCard, HrZoneDistributionChart, ShapeCalibrationSheet, NotificationProviders | Add unit/widget tests for each. |

### TIER 4 — Feature Parity

| ID | Feature | Effort | Notes |
|----|---------|--------|-------|
| PAR-01 | Map SDK integration (record + activity route) | 16-20h | `minSdk=29` fine. Location permissions exist. |
| PAR-02 | Email verification flow | 4h | Web has `VerificationModal.tsx`. |
| PAR-03 | GDPR consent tracking | 6h | Web has `ReconsentBanner` + `PendingConsentHandler`. |
| PAR-04 | Drag-and-drop workout reorder | 4h | Web has `/api/workouts/reorder`. |
| PAR-05 | AI meal suggestions | 4h | Web has `AiMealSuggestionModal`. |
| PAR-06 | External API key generation | 2h | Web has `POST /api/settings/api-key`. |
| PAR-07 | GPS accuracy filtering in recording | 2h | Display exists but doesn't filter points >25m. |

### TIER 5 — Infrastructure & Polish

| ID | Feature | Effort | Notes |
|----|---------|--------|-------|
| INF-01 | i18n scaffold (en + de) | 28-36h | ~500+ strings across ~30 screens. |
| INF-02 | Accessibility semantics | 4-6h | 20 bare GestureDetectors need Semantics wrappers. |
| INF-03 | Tablet/landscape layouts | 6-8h | No responsive breakpoints exist. |
| INF-04 | `flutter_markdown` evaluation | 1h | Not truly discontinued but low maintenance. |
| INF-05 | CI coverage reporting | 2h | `flutter test --coverage` + artifact. |
| INF-06 | Golden/image tests | 4-6h | Visual regression for critical screens. |

---

## 3. Execution Phases

### Phase R0 — Emergency Regression Fix

**Goal:** Unbreak chat and AI scan (regressions from previous fix pass).

| # | Task | ID | Est. | Verification |
|---|------|----|------|-------------|
| R0.1 | Investigate backend: does `/api/ai/chat/*` accept Bearer JWT auth or only NextAuth session? | REG-01 | 1h | Confirmed auth mechanism documented |
| R0.2 | Fix chat URLs — revert to `/api/ai/chat/*` (if JWT works) or add mobile v1 routes to backend | REG-01 | 1h | Chat operations return 200 on mobile |
| R0.3 | Investigate backend: which AI scan endpoint accepts what format + auth? | REG-02 | 0.5h | Confirmed contract documented |
| R0.4 | Fix AI scan — match endpoint contract (FormData vs JSON) and auth path | REG-02 | 1h | AI scan returns food data |
| R0.5 | Run full test suite + analyze | Gate | 0.5h | 507/507 pass, 0 analyze issues |

**Exit Criteria:**
- [ ] Chat: send message, list sessions, create session, delete session all return non-401 on mobile JWT
- [ ] AI scan: photo → food item parse returns valid result
- [ ] `flutter analyze`: 0 issues
- [ ] `flutter test`: all pass

### Phase R1 — Reliability Bugs

**Goal:** Eliminate resource leaks, dead code, and incorrect error signaling.

| # | Task | ID | Est. |
|---|------|----|------|
| R1.1 | Fix `performBackgroundSync` return semantics (401→true, 5xx→false, offline→false) | BUG-01 | 0.5h |
| R1.2 | Update background_sync tests to match correct semantics + fix test descriptions | BUG-01, QUAL-01 | 0.5h |
| R1.3 | Add `DeduplicationInterceptor.close()` call on logout in `AuthState.logout()` | BUG-02 | 1h |
| R1.4 | Fix or remove dead `CancelToken` in `getMessages` | BUG-03 | 0.5h |
| R1.5 | Wire `isCacheStale` into dashboard provider or remove it | BUG-04 | 1h |
| R1.6 | Consolidate nutrition defaults to single `NutritionTargets.defaults` | QUAL-02 | 0.5h |
| R1.7 | Replace local `_formatDuration` in goal_setup_wizard with shared import | QUAL-03 | 0.5h |
| R1.8 | Fix dedup key trailing `?` | QUAL-04 | 0.5h |
| R1.9 | Add unit tests for `DeduplicationInterceptor` (constructor, cleanup, dedup, non-idempotent bypass) | QUAL-05 | 2h |

**Exit Criteria:**
- [ ] No `Timer` leaks — verify with `flutter test` (no "A Timer is still pending" warnings)
- [ ] `performBackgroundSync(401)` returns `true`, `performBackgroundSync(500)` returns `false`
- [ ] Zero dead `CancelToken` references in chat repository
- [ ] `isCacheStale` either wired or removed
- [ ] Single nutrition default constant used everywhere
- [ ] New DeduplicationInterceptor tests pass

### Phase R2 — Architecture

**Goal:** Eliminate domain→data coupling. Establish clean architecture boundary.

| # | Task | ID | Est. |
|---|------|----|------|
| R2.1 | Create `lib/domain/entities/` with entity classes mirroring key data models | ARCH-01 | 3h |
| R2.2 | Create `lib/data/mappers/` with bidirectional mappers (domain ↔ data) | ARCH-01 | 3h |
| R2.3 | Update all 9 domain repository interfaces to use domain entities | ARCH-01 | 2h |
| R2.4 | Update all 9 data repository implementations to use mappers | ARCH-01 | 2h |
| R2.5 | Run build_runner + full test suite + analyze; fix breakage | ARCH-01 | 2h |

**Exit Criteria:**
- [ ] `grep -r "data/models" lib/domain/` returns zero results
- [ ] All mapper tests pass (round-trip: domain → data → domain preserves equality)
- [ ] All provider/screen tests pass after interface changes
- [ ] `flutter analyze`: 0 issues

### Phase R3 — Feature Parity

**Goal:** Close feature gaps toward >=88% parity with web app.

| # | Task | ID | Est. | Parallelizable |
|---|------|----|------|----------------|
| R3.1 | Add map SDK (flutter_map + cached tile layer) | PAR-01 | 12h | Yes |
| R3.2 | Integrate map into record screen (live GPS track) | PAR-01 | 4h | Depends on R3.1 |
| R3.3 | Integrate map into activity detail (route replay) | PAR-01 | 4h | Depends on R3.1 |
| R3.4 | Add email verification flow UI + API | PAR-02 | 4h | Yes |
| R3.5 | Add GDPR consent tracking | PAR-03 | 6h | Yes |
| R3.6 | Add drag-to-reorder workouts | PAR-04 | 4h | Yes |
| R3.7 | Add AI meal suggestions | PAR-05 | 4h | Yes |
| R3.8 | Add external API key generation in settings | PAR-06 | 2h | Yes |
| R3.9 | Add GPS accuracy filtering in recording service | PAR-07 | 2h | Yes |

**Exit Criteria:**
- [ ] Map renders live GPS track during recording
- [ ] Map renders route polyline in activity detail
- [ ] GPS points with accuracy >25m are filtered out
- [ ] Parity KPI >= 88% (measured against web feature inventory)
- [ ] No TIER 1/TIER 2 regressions introduced

### Phase R4 — Tests + Quality

**Goal:** Close test coverage gaps and harden CI.

| # | Task | ID | Est. |
|---|------|----|------|
| R4.1 | Widget tests for `TrainingPacesCard` | QUAL-05 | 1h |
| R4.2 | Widget tests for `HrZoneDistributionChart` | QUAL-05 | 1h |
| R4.3 | Widget tests for `ShapeCalibrationSheet` | QUAL-05 | 1h |
| R4.4 | Provider tests for `NotificationProviders` | QUAL-05 | 1h |
| R4.5 | Add golden tests for dashboard, record, nutrition, chat | INF-06 | 4h |
| R4.6 | Add CI coverage reporting (`flutter test --coverage`) | INF-05 | 2h |

**Exit Criteria:**
- [ ] New widget/provider tests pass
- [ ] Golden tests exist for 4 critical screens
- [ ] CI pipeline includes coverage artifact
- [ ] Coverage baseline recorded (target: >=60% on lib/)

### Phase R5 — i18n + Accessibility + Responsive

**Goal:** Make the app production-ready for international users and diverse devices.

| # | Task | ID | Est. |
|---|------|----|------|
| R5.1 | Add i18n scaffold (l10n.yaml, flutter_localizations, intl, ARB generation) | INF-01 | 4h |
| R5.2 | Extract strings: auth screens (login, register, forgot password) | INF-01 | 4h |
| R5.3 | Extract strings: dashboard + activities | INF-01 | 4h |
| R5.4 | Extract strings: health hub (nutrition, body, supplements, fasting, sleep, vitals) | INF-01 | 6h |
| R5.5 | Extract strings: chat, analytics, goals, plan, settings, profile | INF-01 | 6h |
| R5.6 | Add German translation (de.arb) | INF-01 | 4h |
| R5.7 | Add accessibility semantics to 20 bare GestureDetectors | INF-02 | 4h |
| R5.8 | Add responsive breakpoints for dashboard, analytics, health hub | INF-03 | 6h |
| R5.9 | Evaluate + migrate `flutter_markdown` if needed | INF-04 | 1h |

**Exit Criteria:**
- [ ] App runs in `en` and `de` with no fallback English strings visible in German locale
- [ ] `flutter test` shows zero hardcoded English strings in extracted screens
- [ ] Semantics labels on all interactive custom controls
- [ ] Key screens render correctly on 600dp-wide (tablet) viewport
- [ ] No deprecated dependencies remain

---

## 4. Multi-Agent Orchestration

### 4.1 Agent Pool

| Agent Role | Responsibility | Reuse Pattern |
|-----------|---------------|---------------|
| `@general Program Coordinator` | Phase sequencing, gate decisions, risk escalation, final RAG | Persistent across all phases |
| `@general API Agent` | Backend contract verification, endpoint fixes, interceptor work | Reused in R0, R1 |
| `@general UI Agent` | Screen fixes, theme, responsive layouts, accessibility | Reused in R3, R5 |
| `@general Architecture Agent` | Domain boundary refactor, mapper layer, DI cleanup | R2 |
| `@general Feature Agent` | New feature implementation (map, parity items) | R3 |
| `@general QA Agent` | Test writing, CI pipeline, coverage, golden tests | Reused in R1, R4 |
| `@general i18n Agent` | String extraction, ARB files, translations | R5 |
| `@general Review Agent` | Independent phase review — NEVER self-approval | After every phase |

### 4.2 Agent Assignments by Phase

| Phase | Lead Agent | Parallel Agents | Review Agent |
|-------|-----------|----------------|-------------|
| R0 Emergency | API Agent | API Agent (backend investigation) | Review Agent |
| R1 Reliability | API Agent | QA Agent (tests) | Review Agent |
| R2 Architecture | Architecture Agent | QA Agent (regression) | Review Agent |
| R3 Parity | Feature Agent | UI Agent, API Agent (parallel features) | Review Agent |
| R4 Tests | QA Agent | — | Review Agent |
| R5 i18n+A11y | i18n Agent | UI Agent (responsive) | Review Agent |

### 4.3 Parallelization Rules

| Phase | Parallelization Strategy |
|-------|------------------------|
| R0 | Sequential — must confirm backend contract before fixing |
| R1 | Semi-parallel: BUG fixes can run concurrently; tests written after fixes land |
| R2 | Sequential — each step depends on previous (entities → mappers → interfaces → impls) |
| R3 | **Highly parallel**: PAR-02 through PAR-09 are independent. PAR-01 (map) has internal sequence (SDK → record → detail) |
| R4 | Semi-parallel: widget tests independent; golden tests may depend on R3 layout changes |
| R5 | Semi-parallel: i18n extraction sequential per screen group; responsive + accessibility can run in parallel |

### 4.4 Daily Checkpoint Cadence

| Checkpoint | Frequency | Attendees | Output |
|-----------|-----------|-----------|--------|
| Stand-up sync | Daily | Program Coordinator + active phase leads | Blockers, progress %, risk delta |
| Gate review | End of each phase | Review Agent + Program Coordinator + phase lead | Gate result (Pass/Conditional/Fail) |
| Risk burn-down | Weekly | All leads + Program Coordinator | Updated risk register |
| Final release review | Once | Review Agent + Program Coordinator | RAG decision |

---

## 5. Review Framework

### 5.1 Mandatory Independent Review

Every phase requires an **independent** `@general Review Agent` pass. The Review Agent must:
- NOT be the same agent that implemented the phase
- NOT have been consulted on implementation decisions
- Review all changed files, tests, and gate criteria

### 5.2 Required Review Artifacts

| Artifact | Description |
|----------|-------------|
| Scope diff | List of all files changed vs. plan |
| Evidence links | Test output, analyze output, screenshots for UI changes |
| Risk delta | New risks introduced, existing risks mitigated |
| Gate result | `Pass`, `Conditional`, or `Fail` |
| Follow-up tickets | Items deferred or requiring additional work |

### 5.3 Gate Results

| Result | Meaning | Next Action |
|--------|---------|-------------|
| **Pass** | All exit criteria met. No blocking issues. | Proceed to next phase. |
| **Conditional** | Exit criteria met with caveats. Non-blocking gaps exist. | Proceed ONLY after assigning dated remediation owners for each gap. |
| **Fail** | Exit criteria not met or critical regression introduced. | Block. Return to phase. Do not proceed until re-review passes. |

### 5.4 Phase Review Checklists

**R0 Review Checklist:**
- [ ] Chat endpoints verified against actual backend route handlers
- [ ] AI scan format verified against actual backend route handler
- [ ] No auth regression — mobile JWT users can authenticate and call fixed endpoints
- [ ] Test suite: all pass
- [ ] Static analysis: 0 issues

**R1 Review Checklist:**
- [ ] No Timer leaks confirmed (no pending timer warnings in test output)
- [ ] Background sync return values match Workmanager semantics
- [ ] DeduplicationInterceptor cleanup verified (called on logout)
- [ ] Zero dead code: `CancelToken` in getMessages resolved, `isCacheStale` resolved
- [ ] Nutrition defaults consolidated (single source of truth)
- [ ] New tests provide meaningful coverage for DeduplicationInterceptor
- [ ] Test descriptions accurately reflect assertions

**R2 Review Checklist:**
- [ ] `grep -r "package:runflow_flutter/data/models" lib/domain/` returns zero
- [ ] Mapper round-trip tests pass for all entity types
- [ ] Provider codegen (`build_runner`) completed without errors
- [ ] All existing tests still pass after interface changes
- [ ] Architecture ADR documented (entity boundary decision)

**R3 Review Checklist:**
- [ ] Map renders without crash on API >=21 (minSdk=29 satisfied)
- [ ] Map renders without crash when GPS permission denied
- [ ] GPS accuracy filtering rejects points >25m
- [ ] Parity measurement: >=88% against web feature inventory
- [ ] No TIER 1/TIER 2 regression introduced
- [ ] APK size increase from map SDK is documented

**R4 Review Checklist:**
- [ ] New widget/provider tests exist and pass for all 4 untested components
- [ ] Golden tests committed for 4 critical screens
- [ ] CI coverage artifact is generated and uploaded
- [ ] Coverage baseline >=60% on `lib/`

**R5 Review Checklist:**
- [ ] `grep -r "hardcoded English string pattern"` in extracted screens returns zero
- [ ] German locale renders fully in German with no English fallback visible
- [ ] Semantics labels verified on all 20 previously-bare GestureDetectors
- [ ] Responsive layout verified at 360dp (phone) and 600dp (tablet) widths
- [ ] No deprecated dependency warnings
- [ ] No TIER 1/TIER 2 regression introduced

---

## 6. Branch & Merge Strategy

### 6.1 Branch Naming

```
phase/R0-chat-scan-regression
phase/R1-reliability-bugs
phase/R2-architecture-boundary
phase/R3-map-sdk
phase/R3-email-verification
phase/R3-gdpr-consent
phase/R3-workout-reorder
phase/R3-ai-meals
phase/R3-api-key
phase/R3-gps-filtering
phase/R4-test-quality
phase/R5-i18n
phase/R5-accessibility
phase/R5-responsive
```

### 6.2 Merge Rules

| Rule | Description |
|------|-------------|
| Short-lived PRs | One PR per workstream. Max 48h open. |
| Required checks | `flutter analyze`, `flutter test`, independent review signoff |
| No open Critical regressions | PR must not introduce any TIER 1 issue in modified scope |
| Phase gate required | PR for phase N+1 must not merge until phase N gate passes |
| Squash merge | Each workstream PR is squash-merged to `master` |

### 6.3 PR Template

```markdown
## Phase: R<N> — <title>

### Issue IDs
<ID1>, <ID2>, ...

### Changes
- <summary of changes>

### Testing
- [ ] `flutter analyze` — 0 issues
- [ ] `flutter test` — all pass
- [ ] <specific test added/modified>

### Review Gate
- [ ] Independent review signoff
- [ ] No critical regressions in modified scope
```

---

## 7. Test Strategy by Phase

### 7.1 Test Inventory Baseline

| Type | Current Count | Target |
|------|--------------|--------|
| Unit tests | 36 files | +8 files |
| Widget tests | 21 files | +5 files |
| Integration tests | 4 files | No change |
| Golden tests | 0 | +4 files |
| **Total** | **507 tests** | **~560+ tests** |

### 7.2 Phase-Specific Test Requirements

| Phase | Test Type | What to Test | Minimum |
|-------|-----------|-------------|---------|
| R0 | Integration | Chat send/receive with mock backend. AI scan payload format. | 2 tests |
| R1 | Unit | DeduplicationInterceptor: constructor starts timer, close() stops timer, GET dedup works, POST not deduped. Background sync return values. | 8 tests |
| R2 | Unit | Mapper round-trips for each entity type (domain→data→domain). Repository tests updated for domain entities. | 15 tests |
| R3 | Widget + Integration | Map renders, GPS filter rejects bad points. Verification flow UI. ReorderListView. | 10 tests |
| R4 | Widget + Golden | TrainingPacesCard renders with/without data. HrZoneDistributionChart renders. ShapeCalibrationSheet. NotificationProviders. 4 golden tests. | 12 tests |
| R5 | Widget | Locale switching renders correct strings. Semantics tree contains labels. Responsive layout at 600dp. | 8 tests |

### 7.3 Coverage Targets

| Scope | Target | Measurement |
|-------|--------|------------|
| `lib/data/interceptors/` | >=80% | `flutter test --coverage` |
| `lib/data/repositories/` | >=70% | Per-repository file coverage |
| `lib/domain/` | >=90% | Entities and interfaces are thin |
| `lib/presentation/providers/` | >=60% | Provider logic |
| `lib/presentation/widgets/` | >=50% | Widget rendering tests |
| Overall `lib/` | >=60% | Aggregate |

---

## 8. RACI Ownership

### 8.1 Cross-Phase RACI

| Function | Responsible | Accountable | Consulted | Informed |
|----------|------------|-------------|-----------|----------|
| Phase execution | Phase lead `@general` agent | Program Coordinator | API/UI/Arch/QA agents | Product stakeholders |
| Review gates | `@general Review Agent` | Program Coordinator | Implementer agents | Stakeholders |
| Backend contract verification | API Agent | Program Coordinator | — | Phase leads |
| Final release decision | Review Agent | Program Coordinator | All phase leads | Stakeholders |
| i18n translation accuracy | i18n Agent | Program Coordinator | Native speaker | Product |
| Parity measurement | Feature Agent | Program Coordinator | Web team | Product |

### 8.2 Per-Phase RACI

| Phase | Responsible | Accountable | Reviewer |
|-------|------------|-------------|----------|
| R0 | API Agent | Program Coordinator | Review Agent |
| R1 | API Agent | Program Coordinator | Review Agent |
| R2 | Architecture Agent | Program Coordinator | Review Agent |
| R3 | Feature Agent | Program Coordinator | Review Agent |
| R4 | QA Agent | Program Coordinator | Review Agent |
| R5 | i18n Agent | Program Coordinator | Review Agent |

---

## 9. Dependency Graph

```
R0 ──────────────────────────────────────────────────────────┐
  │                                                           │
  ├──→ R1 ──→ R2 ─────────────────────────────────────────────┤
  │         │                                                 │
  │         ├──→ R4 (tests) ──────────────────────────────────┤
  │         │                                                 │
  └──→ R3 (parity features, parallel workstreams) ────────────┤
            │                                                 │
            └──→ R5 (i18n + a11y + responsive) ───────────────┤
                                                              │
                    Final Independent Review ◄──────────────────┘
```

### Hard Gates (must pass before next phase starts)

| From | To | Gate |
|------|----|------|
| R0 | R1 | Chat + AI scan verified working on mobile JWT |
| R1 | R2 | No resource leaks, no dead code, tests pass |
| R2 | R3 | Domain isolation verified, all tests pass |
| R0 | R3 | R0 must pass (baseline stability) |
| R1 | R3 | R1 must pass (reliability baseline) |
| R3 | Final | Parity KPI >= 88%, no regressions |
| R4 | Final | Coverage >= 60%, golden tests committed |
| R5 | Final | i18n + accessibility + responsive verified |

### Soft Gates (recommended but not blocking)

| From | To | Gate |
|------|----|------|
| R2 | R3 | Architecture ADR approved |
| R4 | R5 | CI pipeline with coverage operational |

---

## 10. Change-Control Rules

The following changes **automatically trigger** a re-review of the affected phase and potentially adjacent phases:

| Change Type | Scope | Re-Review Required |
|-------------|-------|-------------------|
| Auth route/token behavior changes | API endpoints, interceptors | Phase R0 + R1 review |
| API request/response contract changes | Repository layer, models | Phase R0 + R1 review |
| Interceptor order/lifecycle changes | `lib/data/interceptors/` | Phase R1 review |
| Global theme token changes | `lib/core/theme/` | Phase R5 review |
| Navigation/lifecycle ownership changes | Router, providers, main.dart | Phase R1 + R2 review |
| Domain entity interface changes | `lib/domain/` | Phase R2 review |
| Map SDK or location permission changes | `pubspec.yaml`, AndroidManifest | Phase R3 review |

### Re-Review Process

1. Change detected (via PR diff or post-merge audit)
2. Affected phase Review Agent re-examines scope
3. Review Agent produces updated gate result
4. If `Conditional` or `Fail`: block further work in dependent phases until resolved
5. If `Pass`: log as accepted change-control event

---

## 11. Risk Register

| # | Risk | Probability | Impact | Phase | Mitigation | Owner |
|---|------|------------|--------|-------|-----------|-------|
| 1 | Chat revert still fails auth (`/api/ai/chat` only accepts NextAuth) | Medium | Critical | R0 | Verify backend auth in R0.1 before fixing. May need to add Bearer JWT support to web chat routes on backend. | API Agent |
| 2 | ARCH-01 refactor breaks provider codegen | Medium | High | R2 | Run `build_runner` after each mapper step. Keep entities 1:1 with models initially (no logic in entities). | Architecture Agent |
| 3 | Map SDK bloats APK >100MB | Low | Medium | R3 | Use `flutter_map` with vector tiles instead of `google_maps_flutter`. Defer satellite tiles to release builds. | Feature Agent |
| 4 | i18n extraction misses dynamic/concatenated strings | Medium | Low | R5 | Use `grep` for string literals after each screen extraction pass. Automated ARB completeness check in CI. | i18n Agent |
| 5 | DeduplicationInterceptor `close()` on `keepAlive` provider tricky | Low | Low | R1 | Call `close()` explicitly in `AuthState.logout()` rather than relying on provider disposal. | API Agent |
| 6 | Backend doesn't have mobile v1 routes for chat or AI scan | Medium | Critical | R0 | May need to create backend routes. Escalate to backend team before Flutter fix. | Program Coordinator |
| 7 | Parallel R3 workstreams create merge conflicts | Medium | Low | R3 | Short-lived PRs per feature. Rebase frequently. Map SDK PR merges first (largest change). | Feature Agent |
| 8 | Parity KPI measurement is subjective | Low | Medium | R3 | Define explicit checklist: web feature → Flutter feature mapping with pass/fail per item. | Program Coordinator |
| 9 | Golden tests break on minor theme tweaks | Medium | Low | R4 | Use `threshold` parameter in golden comparison. Keep golden baselines in version control. | QA Agent |
| 10 | `flutter_markdown` migration introduces rendering regressions in chat | Low | Medium | R5 | Evaluate first. Only migrate if confirmed discontinued. Test chat markdown rendering thoroughly before merging. | i18n Agent |

### Risk Burn-Down Tracking

| Review Point | Open Risks | Mitigated | New | Escalated |
|-------------|-----------|-----------|-----|-----------|
| R0 gate | 10 | 0 | — | — |
| R1 gate | — | — | — | — |
| R2 gate | — | — | — | — |
| R3 gate | — | — | — | — |
| R4 gate | — | — | — | — |
| R5 gate | — | — | — | — |
| Final review | — | — | — | — |

---

## 12. Release Readiness Criteria

### 12.1 Must-Pass (all required for release)

| Criterion | Measurement | Threshold |
|-----------|------------|-----------|
| Static analysis | `flutter analyze` | 0 issues |
| Test suite | `flutter test` | 100% pass |
| Critical regressions | TIER 1 + TIER 2 items | All closed |
| Chat functionality | Manual smoke or integration test | Send + receive works |
| AI scan functionality | Manual smoke or integration test | Photo → food item works |
| Domain boundary | `grep` verification | Zero `data/models` imports in `domain/` |
| Auth on mobile | Integration test | JWT auth flow complete |
| No resource leaks | Test output | No "Timer still pending" warnings |

### 12.2 Should-Pass (strongly recommended)

| Criterion | Measurement | Target |
|-----------|------------|--------|
| Test coverage | `flutter test --coverage` | >=60% on `lib/` |
| Parity KPI | Feature checklist | >=88% |
| Phase gates | Review agent signoff | R0-R5 all Pass |
| Map functionality | Manual smoke | Renders GPS track |
| i18n | Locale test | en + de both work |
| Accessibility | Semantics tree | Labels on all interactive controls |
| APK size | Build output | <80MB |
| Crash-free sessions | Crash reporting dashboard | >=99.5% over 7 days |
| P95 startup time | Release telemetry | <=2.5s on supported devices |

### 12.3 Nice-to-Have (defer to post-release if needed)

| Criterion | Measurement | Target |
|-----------|------------|--------|
| Responsive layouts | Manual QA | Works on 600dp+ |
| Golden tests | CI | 4 critical screens |
| Performance | Profile mode | No jank in scrolling lists |
| Tablet-specific layouts | Manual QA | Multi-pane on tablets |

### 12.5 Required Release Evidence Bundle

Each release candidate must include one evidence bundle attached to the final review:

- `analyze.txt`: output of `flutter analyze`
- `tests.txt`: output of `flutter test`
- `coverage-summary.txt`: parsed coverage summary
- `smoke-checklist.md`: login -> dashboard -> chat -> AI scan -> health (light/dark)
- `risk-register-final.md`: open risks + accepted mitigations
- `phase-gates.md`: R0-R5 gate decisions and reviewers

### 12.4 RAG Release Decision Rubric

| Rating | Criteria | Decision |
|--------|----------|----------|
| **Green** | All must-pass criteria met. All should-pass criteria met. All phase gates Pass. | **Release approved.** Ship to production. |
| **Amber** | All must-pass criteria met. 1-2 should-pass criteria not met but with approved mitigation plan and due dates. | **Conditional release.** Ship with known gaps. Mitigation plan must have owner + date for each gap. |
| **Red** | Any must-pass criterion fails. OR any phase gate is Fail. OR critical regression unresolved. | **Block release.** Return to failing phase. Do not ship. |

---

## 13. Effort Estimate

### 13.1 Per-Phase Estimates

| Phase | Duration | Serial/Parallel | Agent Hours | Notes |
|-------|----------|-----------------|-------------|-------|
| R0 Emergency | 0.5 day | Serial | ~4h | Blocks everything |
| R1 Reliability | 1-2 days | Semi-parallel | ~7h | Depends on R0 |
| R2 Architecture | 3-5 days | Serial (within phase) | ~12h | Depends on R1 |
| R3 Parity | 8-10 days | **Highly parallel** | ~38h | 8 independent features |
| R4 Tests | 2-3 days | Semi-parallel | ~10h | Parallel with R3 |
| R5 i18n+A11y | 8-12 days | Semi-parallel | ~39h | Parallel with R3/R4 |
| Reviews | 1 day per phase | Sequential gates | ~6 days | Independent review after each phase |
| **Total** | | | **~110h + 6 review days** | |

### 13.2 Calendar Estimate

| Execution Mode | Duration | Realistic (with reviews) |
|---------------|----------|------------------------|
| Fully serial | ~35 working days | ~45 working days |
| Parallel R3+R4+R5 | ~20 working days | ~28 working days |
| Parallel with 2 agents | ~15-18 working days | ~22 working days |

### 13.3 Kickoff Checklist (First 48 Hours)

- [ ] Appoint Program Coordinator and phase leads
- [ ] Run R0 backend contract verification (chat auth mechanism, AI scan format)
- [ ] Fix and verify R0 (chat + AI scan)
- [ ] Lock R1 scope strictly to BUG-01 through QUAL-05
- [ ] Create branch `phase/R0-chat-scan-regression`
- [ ] Define smoke path: login → dashboard → chat send → AI scan → health (light + dark)
- [ ] Publish daily checkpoint cadence: gate status + risk burn-down
- [ ] Set up CI pipeline with `flutter analyze` + `flutter test` gates

---

## 14. Assumptions and Non-Goals

### 14.1 Assumptions

- Backend owners are available to confirm/fix chat and AI scan contracts in R0.
- Existing CI can be extended for coverage and golden test artifacts.
- No major product scope change during R0-R2.

### 14.2 Non-Goals for This Plan

- No redesign of the app information architecture.
- No migration away from Riverpod, Dio, or SQLite.
- No admin-web parity work unless it directly impacts mobile user flows.

---

## 15. Rollback and Incident Handling

### 15.1 Rollback Triggers

Rollback to previous stable release candidate if any occurs after merge:

- Chat flow breaks for authenticated users
- AI scan success rate drops below baseline
- App startup crash rate increases above baseline
- New P0/P1 regression appears in auth, sync, or recording flow

### 15.2 Rollback Procedure

1. Freeze merges to `master`
2. Revert offending PR(s) with smallest safe rollback scope
3. Re-run mandatory gates (`analyze`, full tests, smoke path)
4. Open incident ticket with root cause and prevention action
5. Re-enter phase review with independent Review Agent

### 15.3 Hotfix SLA

- P0 regressions: fix or rollback within 4 hours
- P1 regressions: fix within 1 business day

---

## 16. Approval Workflow (No Implementation Yet)

Implementation is intentionally blocked until this plan is approved.

### 16.1 Approval Checklist

- [ ] Product owner approves scope and priority order
- [ ] Engineering lead approves architecture strategy (R2)
- [ ] Backend lead confirms R0 contract path (chat + AI scan)
- [ ] QA lead approves phase gates and evidence format

### 16.2 Start Condition

Work begins only when all approvals are checked and `phase/R0-chat-scan-regression` is created.
