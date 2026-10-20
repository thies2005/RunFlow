# RunFlow Documentation Index

Start here. Everything below is either a **living reference** (kept current with the code) or a
**historical record** (point-in-time, kept for provenance in [`archive/`](archive/)).

## Living references

| Document | What it covers |
|---|---|
| [../README.md](../README.md) | Project overview, architecture, quick start, doc map |
| [../Web/DOCUMENTATION.md](../Web/DOCUMENTATION.md) | **Main web reference**: architecture, data models, metrics formulas, structured workouts v2, full API surface, deployment |
| [MCP_API.md](MCP_API.md) | Both MCP servers (`/mcp` private, `/mcp/public`): tools, OAuth 2.1 + PKCE + DCR, Claude/Gemini setup |
| [PLAN_GENERATION_API.md](PLAN_GENERATION_API.md) | Public plan-generation API contract + agent eval-dataset prompt |
| [../Web/MOBILE_API.md](../Web/MOBILE_API.md) | Native Android app ↔ server protocol (JWT, endpoint catalog, offline-first sync, App Links) |
| [../android/README.md](../android/README.md) | Android app: features, architecture, build & signing |
| [../COOLIFY_DEPLOY.md](../COOLIFY_DEPLOY.md) | Production deployment on Coolify (migrator, cron services, backups) |
| [../CODING_STANDARDS.md](../CODING_STANDARDS.md) | Code conventions (TypeScript/React + Kotlin) |
| [../AGENTS.md](../AGENTS.md) | Notes for coding agents (build commands, engine rules) |
| [../Web/MONITORING.md](../Web/MONITORING.md) | Sentry, health checks, alert thresholds |
| [../Web/RELEASE_NOTES.md](../Web/RELEASE_NOTES.md) | Release history |
| [../Web/docs/BREACH_PROCEDURE.md](../Web/docs/BREACH_PROCEDURE.md) | GDPR breach procedure (Art. 33/34) |
| [../Web/docs/DPIA.md](../Web/docs/DPIA.md) | Data protection impact assessment |
| [../Web/docs/PERFORMANCE_MONITORING.md](../Web/docs/PERFORMANCE_MONITORING.md) | Admin performance tab reference |

## Current in one paragraph

RunFlow is a self-hosted multi-sport training platform: a Next.js 15 web app in `Web/`
(dashboard, `/calendar`, `/plan-advanced` studio, analytics, health, AI coach, MCP servers,
full REST API) and a native Kotlin/Compose Android app in `android/` (offline-first training,
guided workout player, Health Connect, readiness scoring) that talks to the same server via a
JWT API. Plans cover 17 race types; structured workouts v2 carry per-step pace/HR/power/RPE
targets and export to `.zwo`. Analytics span running (VDOT, two-metric VO2max, TRIMP, PMC) and
cycling (eFTP, MMP curves, NP/IF/VI, bike TSS). The Flutter app and Capacitor wrapper are
retired; the on-device Daniels plan engine was removed in v2.3.0 (the web engine is the only
engine).

## Archive ([archive/](archive/))

Point-in-time records — audits, executed plans, migration runbooks. Accurate for the commit
they describe, **not** for HEAD. See [archive/README.md](archive/README.md) for the inventory.
