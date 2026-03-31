# RunFlow — Migration Master Document

## Scope

Upgrade RunFlow's core dependency stack to the selected LTS/stable targets across 6 isolated phases. Each phase produces a green, deployable build.

## Version Matrix

| Component | Current | Target | Phase |
|---|---|---|---|
| Node.js | 22.12.0 | 24 LTS | 01 |
| Prisma | 5.10 | 7.x | 02 |
| React | 18.2 | 19.x | 03 |
| React DOM | 18.2 | 19.x | 03 |
| Next.js | 14.2 | 15.x | 03 |
| next-auth | 4.24 | 5.x | 03 |
| Tailwind CSS | 3.4.1 | 4.2.x | 04 |
| Capacitor | 8.0.1 | 8.x (verify) | 05 |
| TypeScript | 5.3 | ^5.9 | 02 |
| ESLint | 8.56 | 9.x | 06 |

Execution note: pin exact package versions against official docs immediately before execution. If you choose a newer major than listed here (for example, Next.js 16 instead of 15), pause and re-audit the affected phases instead of silently changing the target.

## Global Rules

1. No `as any`, `@ts-ignore`, or `@ts-expect-error`.
2. No `--force` or `--legacy-peer-deps`.
3. No changes to security middleware (CSP, CORS, rate limiting, auth token handling) unless a compatibility fix is required and documented.
4. All secrets via environment variables — never hardcoded.
5. `strict: true` in tsconfig — always.
6. Every phase must pass: `npx tsc --noEmit && npm run build && npm run lint`.
7. Do not move to the next phase until the current phase is approved.

## Documentation Policy

All migration decisions are justified by official documentation retrieved via Context7 MCP or directly from official sources:

| Component | Source | URL |
|---|---|---|
| Node.js 24 | Official release schedule + Node docs | https://nodejs.org/en/about/previous-releases |
| Next.js 15 | Context7 `/vercel/next.js` + GitHub upgrade guide | https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/upgrading/version-15.mdx |
| React 19 | Context7 `/websites/react_dev` + react.dev blog | https://react.dev/blog/2024/04/25/react-19-upgrade-guide |
| Prisma 7 | Context7 `/llmstxt/prisma_io_llms_txt` + Prisma docs | https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 |
| Tailwind CSS 4 | Official docs upgrade guide | https://tailwindcss.com/docs/upgrade-guide |
| Capacitor 8 | Official docs update guide | https://capacitorjs.com/docs/updating/8-0 |

**Rule: If official docs conflict with assumptions in this pack, the official docs win.**

## Phase Order

```
Phase 01 — Infrastructure (Node.js 24, Docker, .nvmrc)
    ↓
Phase 02 — Prisma (5 → 7, ESM, driver adapters, config overhaul)
    ↓
Phase 03 — Next.js + React (14 → 15, 18 → 19, async APIs, next-auth 5)
    ↓
Phase 04 — Tailwind CSS (3 → 4, CSS-first config, utility renames)
    ↓
Phase 05 — Capacitor (Verify v8 native projects, Android configChanges)
    ↓
Phase 06 — Audit + Cleanup (patch deps, lint, typecheck, test, summary log)
```

**Why this order:**
- Node.js is the runtime foundation.
- Prisma 7 forces ESM and a newer TypeScript baseline — must land before framework changes.
- Next.js 15 requires React 19 — upgrade together.
- Tailwind depends on a stable build pipeline.
- Capacitor is already at v8 — just verify.
- Cleanup last, after all major changes settle.

## Approval Workflow

1. Engineer completes phase on a feature branch.
2. Runs all validation commands.
3. Opens PR with phase number in title (e.g., `migration/phase-02-prisma`).
4. Reviewer checks:
   - All validation commands pass.
   - No forbidden files changed.
   - Security-sensitive logic unchanged (or change is documented).
   - Diff is minimal and safe.
5. Reviewer approves or requests changes.
6. Merge to main only after approval.

## Common Validation Commands

```bash
cd Web
npx tsc --noEmit
npm run build
npm run lint
npm run test
```

## Rollback Philosophy

- Every phase is on its own branch.
- If a phase fails in staging, revert the merge.
- Each phase document includes a specific rollback plan.
- Database migrations are irreversible — always backup before Prisma phases.

## Commit Strategy

- One commit per phase (squash merge).
- Commit message format: `migration(phase-XX): <summary>`.
- Do not mix migration changes with feature changes.

## Definition of Done

- [ ] All 6 phases completed and merged.
- [ ] All validation commands pass (`tsc`, `build`, `lint`, `test`).
- [ ] Docker build succeeds (`docker compose build`).
- [ ] PWA service worker registers correctly.
- [ ] Capacitor Android build succeeds.
- [ ] No `--legacy-peer-deps` in Dockerfile or CI.
- [ ] No TypeScript `any` escapes.
- [ ] Security headers verified in staging.
- [ ] Migration summary log produced in Phase 06.
