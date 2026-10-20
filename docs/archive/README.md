# Documentation Archive

Point-in-time records kept for provenance. Each file is accurate **for the commit/date it
describes**, not for the current code. Do not use these as implementation references — go
through [`docs/README.md`](../README.md) for the living docs.

## Inventory

### Historical audits (superseded by shipped work)

| File | Date | Subject |
|---|---|---|
| `TRAINING_PLAN_LOGIC_AUDIT_2026-05-26.md` | 2026-05-26 | Workout target-range feature; references the removed Flutter display paths |
| `TRAINING_PLAN_GENERATION_SOTA_AUDIT_2026-05-27.md` | 2026-05-27 | Plan-generator SOTA audit (grades per sport); several findings since fixed or reworked |
| `PLAN_GEN_AUDIT.md` | 2026-05 | Audits the removed Flutter 13-step plan wizard |
| `FINAL_REVIEW.md` | 2026-05-13 | Phase review of the `/plan-advanced` builder build-out |
| `audit-web-2026-07.md` | 2026-07-08 | Web security/quality audit at commit `37d9702f`; findings fed the 2026-10 security rounds |
| `appspeed23.6.md`, `audit17.5.md`, `audit_review.md` | 2026-05/06 | Audits of the **Flutter app**, which was removed at v2.3.0 (source backed up out of repo) |
| `planning-audit-2026-10-13.md` | 2026-10-13 | Planning-subsystem snapshot that fed the Oct 2026 feature/fix rounds |

### Executed plans & blueprints

| File | Date | Subject |
|---|---|---|
| `plans/2026-10-13-training-planning-round.md` | 2026-10-13 | Master plan for the structured-workout v2 / studio / cycling / MCP round — executed (see git log) |
| `2026_10_13_zcode_master_workflow.md` | 2026-10-13 | Execution blueprint for the same round (Room v13, `/calendar`, dual MCP, cycling) — landed |
| `2026_10_13_zcode_security_remediation_workflow.md` | 2026-10-13 | SEC-1..6 hardening pass — executed (commits `fe74d5c8`, `0986b5db`, …) |
| `plans/2026-09-06-web-health-nav-sync-fixes.md` | 2026-09-06 | Health/nav/sync fix plan — predates the Flutter removal, since reshaped by `/calendar` |
| `structured-workout-schema-v2-design.md` | 2026-10-13 | Design spec for Structured Workout v2 — implemented in `Web/src/lib/plans/structured.ts` (implementation is authoritative) |

### Completed operational runbooks

| File | Date | Subject |
|---|---|---|
| `COMPLETE_UPDATE.md` | 2026-02-12 | 47-issue remediation changelog (references files that no longer exist) |
| `MIGRATION.md` | 2026-02-12 | One-shot operator runbook for that remediation — fully executed |
| `migration/` (8 files) | 2026-03 | Node 22→24 / Prisma 5→7 / Next 14→15 / React 18→19 / Tailwind 3→4 migration runbooks — all phases complete; `PHASE_05_CAPACITOR.md` doubly obsolete (mobile is now the native app) |
