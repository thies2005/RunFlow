# RunFlow Migration Summary

## Date
2026-03-31

## Versions Before
| Component | Version |
|---|---|
| Node.js | 22.12.0 |
| React | 18.2 |
| Next.js | 14.2 |
| Prisma | 5.10 |
| Tailwind CSS | 3.4.1 |
| Capacitor | 8.0.1 |
| next-auth | 4.24 |
| TypeScript | 5.3 |
| ESLint | 8.56 |

## Versions After
| Component | Version |
|---|---|
| Node.js | 24 LTS |
| React | 19.x |
| Next.js | 15.5.14 |
| Prisma | 7.x |
| Tailwind CSS | 4.2.x |
| Capacitor | 8.x (verified) |
| next-auth | 5.0.0-beta.30 |
| TypeScript | 5.9.3 |
| ESLint | 9.39.4 |

## Phases Completed
- [x] Phase 01 - Infrastructure (Node.js 24, Docker, .nvmrc)
- [x] Phase 02 - Prisma (5 -> 7, ESM, driver adapters)
- [x] Phase 03 - Next.js + React (14 -> 15, 18 -> 19, next-auth 4 -> 5)
- [x] Phase 04 - Tailwind CSS (3 -> 4, CSS-first config)
- [x] Phase 05 - Capacitor (v8 verified)
- [x] Phase 06 - Audit + Cleanup

## Breaking Changes Applied
- Prisma migrated to v7 with ESM-compatible configuration and Prisma client generation changes.
- Next.js moved to v15 patterns (async route params, updated auth/session usage with next-auth v5).
- Tailwind migrated to v4 CSS-first config and utility class renames required by v4.
- ESLint moved from v8 to v9 while remaining compatible with `eslint-config-next@15.5.14`.

## Known Issues
- `npm audit` still reports high vulnerabilities in transitive or no-fix packages (`@capacitor/assets` toolchain deps, `xlsx`, and `next-pwa` transitive chain) without safe non-breaking fixes.
- `next-auth@5.0.0-beta.30` still carries a peer expectation for `nodemailer@^6.8.0`; project currently uses `nodemailer@7.0.13`.
- Android debug build cannot be validated in this environment because Java/JDK is not installed (`JAVA_HOME` unset).
- Docker build cannot be validated in this environment because `docker` is not installed.
- TypeScript escape hatches were hardened and removed from tracked source/tests (`as any`, `@ts-ignore`, `@ts-expect-error` now zero matches in `Web/`).

## Validation Results
- TypeScript: PASS
- Build: PASS
- Lint: PASS (with existing warnings)
- Tests: PASS (80/80 suites, 690/690 tests)
- Docker: BLOCKED (docker unavailable in environment)
- PWA: PASS (`public/sw.js`, `public/workbox-*.js` generated)
- Capacitor Android: PARTIAL (sync PASS, Gradle build BLOCKED by missing Java)

## Post-Migration Architecture Notes (2026-04-01)

### Authentication hardening
- Added adapter-level coercion for Strava `providerAccountId` to ensure compatibility with Prisma's string account key.
- Removed custom PKCE cookie overrides (`pkceCodeVerifier`, `state`) to avoid `InvalidCheck` callback failures in NextAuth v5.
- Added `allowDangerousEmailAccountLinking: true` for Strava provider to reduce `OAuthAccountNotLinked` failures for existing credential users.

### Token storage compatibility
- Introduced plaintext fallback paths for Strava token decrypt/read and encrypt/write flows to keep legacy tokens usable if `ENCRYPTION_KEY` is missing, rotated, or invalid at runtime.
- `ENCRYPTION_KEY` remains required for secure production operation and must decode to 32 bytes.

### Build performance tuning
- Removed `experimental.workerThreads: false` and `experimental.cpus: 3` from Next config to restore default Next.js 15 parallel build behavior.
- Added Docker cache mount for Prisma client output during `prisma generate`.
- Added `SENTRY_DISABLE_SOURCEMAP_UPLOAD=1` in build stage to reduce optional build-time overhead.

### Deployment behavior observed in Coolify
- Compilation now completes reliably; deployment failures can still occur later in static page generation due to host resource constraints or deployment timeout behavior.
- Recommended operational baseline for Coolify builds: sufficient RAM headroom for parallel build stages and explicit monitoring of build duration vs resource limits.

### Environment variable naming
- RunFlow currently keeps `NEXTAUTH_URL` and `NEXTAUTH_SECRET` as canonical environment keys in compose and runtime validation.
- `AUTH_URL` and `AUTH_SECRET` remain compatible aliases at the Auth.js layer, but are not the enforced primary keys in current deployment files.
