# RunFlow — Architecture & Coding Standards

> **Purpose:** Reference for AI agents and developers modifying or extending RunFlow — a containerized Next.js running performance dashboard with a hybrid Android app.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript strict mode |
| Styling / Animation | Tailwind CSS, Framer Motion |
| Data Visualization | Recharts |
| State | TanStack React Query (server), React Context (app-wide) |
| Mobile | Capacitor (Android), Google Health Connect (@capgo/capacitor-health) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth — Strava OAuth, Magic Links, email/password (MFA) |
| Infrastructure | Docker, Docker Compose, Redis (rate-limiting & locks) |
| Testing | Jest (unit/integration), Playwright (E2E) |

---

## 2. Directory Structure

```text
Web/
├── src/
│   ├── app/                  # App Router: pages, layouts, API routes
│   │   └── api/              # kebab-case route dirs → route.ts
│   ├── components/           # dashboard/ analytics/ training/ auth/ ui/ health/ chat/
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   ├── metrics/          # VDOT, TRIMP, CTL/ATL/TSB logic
│   │   ├── strava/           # Webhook + API integration
│   │   ├── plan/             # Plan generation utilities
│   │   ├── plans/            # Training plan logic
│   │   ├── db/               # Prisma client & helpers
│   │   ├── __tests__/        # Jest integration tests for lib utilities
│   │   └── utils/
│   └── types/
├── prisma/                   # Schema + migrations
└── android/                  # Capacitor Android wrapper
```

---

## 3. Architecture Patterns

**Data Flow (strict):**
```
Request → API Route (auth + validation) → Service Layer → Prisma → Response
```

**React Server Components:** Default to RSC. Add `'use client'` only for event handlers, browser APIs, or hooks (`useState`, `useEffect`). Never fetch data in `useEffect`.

**Data Sync:**
- Real-time: Strava Webhooks
- Background: Capacitor app via Google Health Connect (Garmin, Peloton, etc.)

---

## 4. Naming Conventions

| Target | Convention | Example |
|---|---|---|
| Functions & variables | `camelCase` | `calculateTrimp` |
| Components / Interfaces / Types | `PascalCase` | `ActivityList`, `ActivityListProps` |
| Exported constants | `UPPER_SNAKE_CASE` | `MAX_VDOT_VALUE` |
| Component files | `PascalCase.tsx` | `ActivityList.tsx` |
| Utility / service files | `kebab-case.ts` | `vdot-calculator.ts` |
| API route dirs | `kebab-case/route.ts` | `api/health/insights/route.ts` |
| Prisma models | `PascalCase` | `model Activity` |

---

## 5. TypeScript & React Rules

- `strict: true` is mandatory — never use `any`; use `unknown` + type guards.
- Explicitly declare return types on all exported functions and route handlers.
- No non-null assertions (`!`). Use `?.` and `??` instead.
- Functional components only. Class components are permitted **only** for `ErrorBoundary`.
- State: `useState` for local, React Query for server state, Context for app-wide.

---

## 6. API & Error Handling

- Routes: `kebab-case` dirs, correct HTTP verbs, one `route.ts` per endpoint.
- Validate all inputs with **Zod** schemas before touching the service layer.
- Responses: always use `cachedResponse` / `errorResponse` helpers.
- Errors: use `ApiError` (`@/lib/apiError`) + `handleApiError`; wrap all logic in `try/catch`.
- Define `loading.tsx` and `error.tsx` at each route segment.

---

## 7. UI, Visualization & Styling

- **Recharts** — all performance/fitness charts. Do not introduce other charting libs.
- **Framer Motion** — all animations. Define variants outside render functions.
- **Tailwind + `cn()`** (clsx + tailwind-merge) for all conditional class composition. Avoid custom CSS.

---

## 8. Database & Security

- Prisma: always `select` only needed fields; use `prisma.$transaction` for atomic operations.
- Call `getServerSession` on every protected route before any logic runs.
- Use `verifyMobileToken` for all Capacitor app requests.
- Always verify **resource ownership** after authentication.
- Never log passwords, tokens, or PII. All secrets via environment variables — never hardcoded.

---

## 9. Infrastructure

- All services run via **Docker Compose**. No manual host dependencies.
- **Redis**: rate-limiting and distributed locks only — not a primary data store.
- Use multi-stage Docker builds. Keep `docker-compose.yml` (dev) and `docker-compose.prod.yml` separate.
- Destructive migrations must be validated on staging before production.

---

## 10. Testing

### Jest (Unit / Integration)
- Structure: `describe` + `it` blocks. Co-locate as `filename.test.ts` under `Web/src/lib/__tests__/` or alongside source files.
- Coverage: **80%+ overall**, **90%+ on metrics, auth, and training plan logic**. All error branches must be tested.
- Mock Prisma, Strava API, and Redis at the module boundary.

### Playwright (E2E)
- Run against a production build (`next build && next start`).
- Use role-based locators (`getByRole`, `getByText`). Avoid CSS selectors.
- Cover: authentication, activity sync, dashboard render, training plan creation.

### Linting
- ESLint (`next/core-web-vitals`): zero warnings. CI must fail on errors.
- All files must pass **Prettier** formatting.

---

## 11. Domain Glossary

| Term | Definition |
|---|---|
| **VDOT** | Daniels-Gilbert VO2max proxy → derives Easy / Marathon / Threshold / Interval / Rep paces |
| **CTL** | Chronic Training Load (Fitness) — 42-day EMA of daily TSS |
| **ATL** | Acute Training Load (Fatigue) — 7-day EMA of daily TSS |
| **TSB** | Training Stress Balance (Form) = CTL − ATL |
| **TRIMP** | Training Impulse — HR × duration load metric |
| **rTSS** | Running Training Stress Score — pace + HR stress metric |
| **Phases** | Base → Build → Peak → Taper (5K / 10K / Half / Full Marathon plans) |

---

## 12. Workflow Requirements

### Session Start — Pull Latest Changes
Before starting any work in a new session, you must always pull the latest changes from the repository:
```bash
git pull origin main
```

### Pre-Push — Build & Test Requirements
Before pushing changes to GitHub, you must complete the following validation steps:

1. **Lint check** (zero warnings required):
   ```bash
   cd Web
   npm run lint
   ```

2. **Build test** (must succeed):
   ```bash
   npm run build
   ```

3. **Run tests** (all tests must pass):
   ```bash
   npm run test
   ```

No push should be made unless all three checks pass. CI will enforce these requirements.
