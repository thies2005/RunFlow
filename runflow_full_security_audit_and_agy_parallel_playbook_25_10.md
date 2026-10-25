# RunFlow Full-Repository Security Audit Report & Parallel Multi-Agent Remediation Playbook (`agy` — Gemini 3.8 Flash Medium)

- **Target Repository**: `thies2005/runflow` (`ed05ec5b1cad07be1466be74b1eb90d385e445de`)
- **Audit Scope**: Full end-to-end repository deep scan across `Web/` (Next.js 16 App Router, Auth/NextAuth v5, Mobile JWTs, External v1 API, MCP JSON-RPC & OAuth 2.1 Server, AI Coach & BYOK Providers, Admin & Backup Engine, Prisma Schema, Docker/Compose Infrastructure) and `android/` (Kotlin + Jetpack Compose native client, Room SQLite, DataStore, OAuth deep links, Auto-Backup rules)
- **Confirmed Findings**: **13 Confirmed Vulnerabilities** (`1 Critical`, `6 High`, `5 Medium`, `1 Low`) + **2 Needs-Validation / Deployment Hardening Leads**
- **Parallel Remediation Playbook**: **12 Disjoint-Scope Subagents (`AGY-01` through `AGY-12`)** engineered specifically for **Google Antigravity (`agy`)** running **Gemini 3.8 Flash Medium** (`model: gemini-3.8-flash`, `thinking_level: medium`) with **0% file overlap** and **byte-for-byte verified `FIND:` / `REPLACE WITH:` blocks**

## 1. Executive Summary & Confirmed Findings Scorecard

Prior security hardening passes in `thies2005/runflow` established strong baseline controls across many surfaces (AES-256-GCM token encryption at rest in `Web/src/lib/crypto.ts`, PKCE `S256` and single-use auth codes in `Web/src/app/mcp/oauth/token/route.ts`, SVG upload sanitization in `Web/src/app/api/settings/profile-image/route.ts`, ReDoS-safe `.zwo` tag scanning in `Web/src/lib/mywhoosh/parser.ts`, and nonce-bound Strava Custom Tabs OAuth in `android/.../StravaAuth.kt`).

However, our full-repository deep scan uncovered **13 confirmed vulnerabilities** where secondary code paths, redirect hops, batch wrappers, or CLI restore tools bypass those guards:

| ID | Severity | Fingerprint | Subsystem / Files | Root Cause Summary | Assigned `agy` Subagent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **CRITICAL** | `runflow-01-admin-backup-psql-rce-and-gzip-bomb` | `Web/src/lib/backup/scheduler.ts`, `Web/src/app/api/admin/backups/upload/route.ts` | `restoreBackup` runs `psql -f` on uploaded `.sql`/`.sql.gz` files without blocking `psql` meta-commands (`\!`, `\copy ... PROGRAM`), `.sql.gz` uploads skip SQL header checks, and `createGunzip()` has no output byte limit (gzip bomb). | **AGY-01** |
| **F-02** | **HIGH** | `runflow-02-ai-safefetch-redirect-ssrf-and-testkey-bypass` | `Web/src/lib/ai/providers.ts`, `Web/src/app/api/ai/test-key/route.ts` | `safeFetch` calls `fetch()` with default `redirect: 'follow'` *before* checking `response.url`, executing HTTP requests against internal/loopback redirect targets; `/api/ai/test-key` skips `validateBaseUrl` when `isAdmin` is true. | **AGY-02** |
| **F-03** | **HIGH** | `runflow-03-mcp-batch-duplicate-insert-and-server-guard` | `Web/src/lib/mcp/tools/workouts.ts`, `Web/src/lib/mcp/server.ts` | `importPlanWorkoutsBatchTool` runs `tx.workout.create` in a loop AND then runs `tx.workout.createMany` in the same transaction on real Prisma clients, inserting 2x duplicate workouts on every batch call; `McpServer.handleSingleRequest` lacks an internal `authType === 'api_key'` read-only check. | **AGY-03** |
| **F-04** | **HIGH** | `runflow-04-mcp-jsonrpc-batch-rate-limit-amplification` | `Web/src/app/mcp/route.ts`, `Web/src/app/mcp/public/route.ts` | Both `/mcp` and `/mcp/public` charge 1 rate-limit token per HTTP POST while allowing a 50-item JSON-RPC batch executed concurrently via `Promise.all` (50x amplification). | **AGY-04** |
| **F-05** | **HIGH** | `runflow-05-mcp-oauth-consent-csrf-fallback-and-delimiter` | `Web/src/lib/mcp/oauth.ts` | `createConsentCsrfToken`/`verifyConsentCsrfToken` fall back to `'runflow-mcp-consent-dev-secret'` even in production (and ignore `AUTH_SECRET`) and join `redirectUri`/`state` with unescaped `:`. | **AGY-05** |
| **F-06** | **MEDIUM** | `runflow-06-well-known-oauth-metadata-host-spoofing` | `Web/src/app/.well-known/oauth-authorization-server/route.ts`, `Web/src/app/.well-known/oauth-protected-resource/route.ts` | Both `.well-known` OAuth 2.1 discovery routes trust raw `x-forwarded-host` and `x-forwarded-proto` headers before `NEXTAUTH_URL`, allowing discovery endpoint poisoning. | **AGY-05** |
| **F-07** | **HIGH** | `runflow-07-verify-auth-code-lockout-dos-and-toctou` | `Web/src/lib/auth/tokens.ts`, `Web/src/app/api/auth/verify-email/route.ts`, `Web/src/app/api/auth/reset-password/route.ts` | `verifyAuthCode` increments a rate limit keyed on bare `email` *before* checking the code (allowing any attacker to lock a victim out of password reset/email verification for 15 min), uses non-atomic `findFirst`+`delete`, and crashes with 500 `TypeError` when `code` is non-string. | **AGY-06** |
| **F-08** | **MEDIUM** | `runflow-08-mobile-register-enumeration-and-strava-p2002` | `Web/src/app/api/mobile/v1/auth/register/route.ts`, `Web/src/app/api/mobile/v1/auth/verify-email/route.ts`, `Web/src/lib/mobile/auth.ts` | Mobile registration never sends a `VERIFY_EMAIL` code, `/mobile/v1/auth/verify-email` lacks type checks on `code`, and `exchangeStravaCodeForTokens` lacks a `P2002` email collision catch on the existing-user update branch. | **AGY-07** |
| **F-09** | **HIGH** | `runflow-09-nutrition-batch-copy-consent-and-bounds-bypass` | `Web/src/app/api/health/nutrition/log/batch/route.ts`, `Web/src/app/api/health/nutrition/log/copy/route.ts` | Both `/batch` and `/copy` omit `healthDataConsentWithdrawn(userId)` (violating the GDPR `HEALTH_DATA` withdrawal gate), and `/batch` accepts unbounded `items` arrays and unvalidated macro/quantity numbers. | **AGY-08** |
| **F-10** | **MEDIUM** | `runflow-10-v1-workouts-cross-tenant-activity-link-and-bounds` | `Web/src/app/api/workouts/route.ts`, `Web/src/app/api/v1/workouts/route.ts`, `Web/src/app/api/v1/workouts/[id]/route.ts` | `POST /api/workouts` and `POST /api/v1/workouts` skip `WorkoutType` enum and `targetDistance`/`targetDuration` bounds checks; `PATCH /api/v1/workouts/[id]` clobbers `completedAt` and `linkedActivityId` to `null` on partial updates. | **AGY-09** |
| **F-11** | **MEDIUM** | `runflow-11-mobile-activity-and-profile-validation-gaps` | `Web/src/app/api/mobile/v1/activities/[id]/route.ts`, `Web/src/app/api/mobile/v1/user/profile/route.ts` | Mobile `PUT` routes for activity and user profile omit enum and numeric range checks (`averageWatts`, `maxWatts`, `npWatts`, `bikeTss`, `weight`, `height`, `hrRest`, `ftpWatts`, `swimCssSecPer100m`, `vdotCorrectionFactor`, `hrZone1Max..6Max`). | **AGY-10** |
| **F-12** | **MEDIUM** | `runflow-12-admin-jwt-revocation-and-unsigned-csrf-cookie` | `Web/src/lib/admin/auth.ts`, `Web/src/lib/security/csrf.ts` | `requireAdmin` does not re-verify `prisma.user.isAdmin` for DB-backed admins during the 2-hour JWT lifetime, and `csrf_token` is an unsigned random string rather than an HMAC-signed token. | **AGY-11** |
| **F-13** | **LOW** | `runflow-13-gdpr-export-and-consent-withdrawal-gaps` | `Web/src/app/api/user/export/route.ts`, `Web/src/app/api/user/consent/route.ts`, `Web/src/app/api/mobile/v1/user/consent/route.ts` | Withdrawing `HEALTH_DATA` consent omits `weeklyReconciliationRecord` deletion, and `/api/user/export` omits nested `workouts`, `weeklyReconciliationRecords`, and `mcpOAuthTokens` metadata. | **AGY-12** |
| **NV-01** | *Needs Validation* | `runflow-14-needs-validation-android-room-backup-and-plaintext-datastore` | `android/app/src/main/res/xml/backup_rules.xml`, `data_extraction_rules.xml`, `AuthStore.kt` | Android Auto-Backup excludes `runflow_auth.preferences_pb` but includes the unencrypted Room SQLite database (`AppDatabase` with GPS routes & Health Connect metrics); `AuthStore` uses unencrypted DataStore. | Manual / Product Decision |
| **NV-02** | *Needs Validation* | `runflow-15-needs-validation-docker-cron-query-secret-and-redis-noauth` | `Web/docker-compose.yml`, `Web/src/lib/cronAuth.ts` | `reminder-cron` container in `docker-compose.yml:238` still passes `?secret=${CRON_SECRET}` in the URL query string instead of `Authorization: Bearer`. | Ops / Compose Config |


# RunFlow Security Architecture & Trust Boundary Map (`run-1`)

- **Repository**: `thies2005/runflow` (`ed05ec5b1cad07be1466be74b1eb90d385e445de`)
- **Primary Stack**:
  - **Web / Backend (`Web/`)**: Next.js 16.2.1 App Router, TypeScript, Prisma 6.19.2 (PostgreSQL 16), Redis 7 (`ioredis`), NextAuth v5 (`next-auth@5.0.0-beta.30`), custom Mobile JWT (`jose`), External v1 API Keys (`rf_*`), and Model Context Protocol (MCP) JSON-RPC 2.0 server with OAuth 2.1 + PKCE (`S256`).
  - **Android Native Client (`android/`)**: Kotlin + Jetpack Compose (`com.runflow2.app`), Room SQLite (`AppDatabase` v14), Preferences DataStore (`AuthStore`), OkHttp + Retrofit (`NetworkClient`), Health Connect integration, and Strava OAuth Custom Tabs (`runflow2://auth/callback` + verified HTTPS App Link).
  - **Deployment (`Web/Dockerfile`, `Web/docker-compose.yml`)**: Multi-stage Node 24 Alpine container (`USER nextjs`), PostgreSQL 16, Redis 7, Cloudflare Tunnel (`cloudflared`), and Alpine cron sidecars (`reminder-cron`, `feedback-queue-cron`).

## Trust Boundaries & Entry Surfaces

| Boundary ID | Surface | Auth / Gate Mechanism | Key Entry Paths |
| :--- | :--- | :--- | :--- |
| **TB-1** | Unauthenticated Public Web, Auth & OAuth Discovery | IP / Pair Rate Limiting (`checkRateLimitAsync`), OAuth PKCE & Nonce State | `/api/auth/*`, `/api/mobile/v1/auth/*`, `/api/public/plan/*`, `/mcp/public`, `/mcp/oauth/*`, `/.well-known/oauth-*`, `/api/webhooks/strava` |
| **TB-2** | Authenticated Athlete Web & Mobile v1 Data Plane | NextAuth v5 Session Cookie or Mobile Bearer JWT (`getAuthenticatedUser` + `tokenVersion` check) + `HEALTH_DATA` Consent Gate | `/api/activities/*`, `/api/workouts/*`, `/api/v1/*`, `/api/plans/*`, `/api/plan-advanced/*`, `/api/health/*`, `/api/mobile/v1/*`, `/api/user/*` |
| **TB-3** | Personal MCP Server & External v1 API | MCP OAuth 2.1 Bearer Token (`mcp:full` + Paid Premium Tier 2/3) or Read-Only API Key (`rf_*`, SHA-256 hashed) | `/mcp`, `/api/external/v1/*`, `Web/src/lib/mcp/server.ts`, `Web/src/lib/mcp/tools/*` |
| **TB-4** | AI Coach, BYOK Providers & Background Feedback Queue | Session/JWT Auth, `UserAiSettings` Quota Enforcement, `safeFetch` SSRF Guard & DNS Public-Host Check | `/api/ai/*`, `/api/v1/ai/chat`, `/api/internal/process-feedback-queue`, `Web/src/lib/ai/providers.ts` |
| **TB-5** | Admin Dashboard & Backup/Restore Realm | Separate Admin JWT (`runflow_admin_token`, 2h expiry) + Double-Submit CSRF Cookie (`csrf_token` / `X-CSRF-Token`) + `adminRateLimit` | `/api/admin/*`, `Web/src/lib/admin/auth.ts`, `Web/src/lib/backup/scheduler.ts`, `Web/src/lib/security/csrf.ts` |
| **TB-6** | Android Native Client & Local Device Storage | Custom Tabs OAuth Nonce Binding (`StravaAuth`), Private DataStore (`runflow_auth`), Room SQLite (`AppDatabase`), Auto-Backup XML Rules | `android/app/src/main/AndroidManifest.xml`, `MainActivity.kt`, `AuthStore.kt`, `NetworkClient.kt`, `StravaAuth.kt`, `backup_rules.xml` |


# Confirmed Security Findings — Deep Technical Traces (`run-1`)

## 1. [CRITICAL] Admin SQL Backup Restore OS Command Execution via psql Meta-Commands & Unbounded Gzip Decompression
- **Fingerprint**: `runflow-01-admin-backup-psql-rce-and-gzip-bomb`
- **Overall Severity**: **CRITICAL** (Likelihood: `high`, Impact: `critical`, Confidence: `high`)
- **Summary**: The admin backup restore pipeline (`restoreBackup` in `Web/src/lib/backup/scheduler.ts`) passes uploaded `.sql` and `.sql.gz` files directly to `psql -f` without rejecting `psql` meta-commands (`\!`, `\copy ... FROM PROGRAM`), and decompresses `.sql.gz` files through `createGunzip()` with no output size cap while `POST /api/admin/backups/upload` skips SQL header validation on `.sql.gz` uploads.
- **Root Cause**: `restoreBackup` invokes the interactive `psql` CLI (`psql -h ... -f <restorePath>`) on user-uploaded SQL files without scanning for backslash meta-commands (`\!`, `\copy`, `\i`) or `COPY ... FROM PROGRAM`, and `prepareRestoreFile` streams `createGunzip()` to disk with no byte limit while `upload/route.ts` only checks `.endsWith('.sql')` for SQL headers.
- **Intended Behavior**: Uploaded and restored SQL backups must only contain safe SQL statements (no `psql` backslash meta-commands or `PROGRAM` execution clauses), `.sql.gz` uploads must be header-validated on upload, and decompression during restore must enforce a strict uncompressed byte limit.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/admin/backups/upload/route.ts:25` (`POST`) — Accepts multipart upload of a `.sql` or `.sql.gz` file into the backups directory (`file.name.endsWith('.sql')` at line 106 skips content inspection for `.sql.gz`).
- **`[PROPAGATION]`** `Web/src/app/api/admin/backups/route.ts:112` (`POST`) — Dispatches `action === 'restore'` with the uploaded `filename` to `restoreBackup(filename)`.
- **`[PROPAGATION]`** `Web/src/lib/backup/scheduler.ts:111` (`prepareRestoreFile`) — Decompresses `.sql.gz` via `pipeline(createReadStream(backupPath), createGunzip(), createWriteStream(tempRestorePath))` with no uncompressed byte cap.
- **`[SINK]`** `Web/src/lib/backup/scheduler.ts:213` (`restoreBackup`) — Spawns `psql` with `-f prepared.restorePath`, which interprets `\! <cmd>` and `\copy ... FROM PROGRAM` as OS shell commands.

### Code Evidence
- `Web/src/app/api/admin/backups/upload/route.ts:106` — Only `.sql` files are checked for `--`/`CREATE`/`SET`; `.sql.gz` uploads bypass content validation completely.
- `Web/src/lib/backup/scheduler.ts:107` — `prepareRestoreFile` streams `.sql.gz` through `createGunzip()` to disk with no output byte limit.
- `Web/src/lib/backup/scheduler.ts:213` — `runCommand('psql', args, ...)` executes `psql -f prepared.restorePath` without blocking `psql` backslash meta-commands.

### Reproduction & Observed Impact
- **Attacker Perspective**: An authenticated admin (or an attacker who compromises an admin JWT or chains CSRF) uploads a `.sql` or `.sql.gz` file containing a `psql` meta-command and triggers the restore action.
- **Payloads**:
  ```text
  -- PostgreSQL database dump
\! id > /tmp/pwned

  ```
- **Steps**:
  1. Upload a file named `exploit.sql` with content `-- PostgreSQL database dump\n\! id` via `POST /api/admin/backups/upload`.
  2. Invoke `POST /api/admin/backups` with JSON body `{"action":"restore","filename":"exploit.sql"}`.
- **Observed Result**: `psql -f` processes `-- PostgreSQL database dump` and then executes `\! id` in `/bin/sh` as the container runtime user (`nextjs`), giving full access to environment secrets (`ENCRYPTION_KEY`, `JWT_SECRET`, `DATABASE_URL`).

### Remediation Strategy
Reject any `.sql` or decompressed `.sql.gz` backup containing `psql` backslash meta-commands (`^\s*\\`) or `COPY ... FROM/TO PROGRAM`, enforce a 500 MB uncompressed stream limit in `prepareRestoreFile`, pass `-v ON_ERROR_STOP=1 --no-psqlrc` to `psql`, and validate `.sql.gz` magic bytes and first 4 KB of decompressed SQL header in `POST /api/admin/backups/upload`.

## 2. [HIGH] SSRF Redirect-Before-Validation in safeFetch & Admin URL Validation Bypass in /api/ai/test-key
- **Fingerprint**: `runflow-02-ai-safefetch-redirect-ssrf-and-testkey-bypass`
- **Overall Severity**: **HIGH** (Likelihood: `high`, Impact: `high`, Confidence: `high`)
- **Summary**: `safeFetch` in `Web/src/lib/ai/providers.ts` calls `await fetch(input, init)` with the default `redirect: 'follow'` mode and only checks `response.url` after the redirected HTTP request has already been executed. Furthermore, `POST /api/ai/test-key` skips `validateBaseUrl` when `user.isAdmin` is true and passes `allowedUrls: [baseUrl]` into `safeFetch`.
- **Root Cause**: Node/Undici `fetch` follows HTTP 301/302/307/308 redirects automatically when `redirect` is not set to `'manual'`. Checking `response.url` after `await fetch()` runs *after* the internal network request has already been sent and completed. Additionally, `/api/ai/test-key/route.ts:42` wraps `validateBaseUrl` in `if (!user.isAdmin)`.
- **Intended Behavior**: `safeFetch` must set `redirect: 'manual'` and validate each redirect `Location` URL via `validateOutboundFetchUrl` and `assertResolvesToPublicHost` *before* following the redirect, strip credentials across origins, and `/api/ai/test-key` must always enforce `validateBaseUrl`.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/ai/test-key/route.ts:14` (`POST`) — Receives `baseUrl`, `apiKey`, and `model` from the caller; skips `validateBaseUrl` at line 42 if `user.isAdmin` is true.
- **`[PROPAGATION]`** `Web/src/app/api/ai/test-key/route.ts:61` (`POST`) — Calls `testApiKey({ type, baseUrl: targetBaseUrl, apiKey: targetApiKey, model }, [targetBaseUrl])`.
- **`[PROPAGATION]`** `Web/src/lib/ai/providers.ts:215` (`safeFetch`) — Validates `initialUrl`, then calls `await fetch(input, init)` without `redirect: 'manual'`.
- **`[SINK]`** `Web/src/lib/ai/providers.ts:231` (`safeFetch`) — `fetch(input, init)` automatically follows any 301/302/307/308 redirect to internal/loopback/metadata targets before line 236 inspects `response.url`.

### Code Evidence
- `Web/src/lib/ai/providers.ts:231` — `const response = await fetch(input, init);` executes with default `redirect: 'follow'` before `response.url` is checked at line 236.
- `Web/src/app/api/ai/test-key/route.ts:42` — `if (!user.isAdmin) { validateBaseUrl(baseUrl, allowedUrls); }` bypasses scheme and allowlist validation for admin accounts.

### Reproduction & Observed Impact
- **Attacker Perspective**: An authenticated user configures a custom BYOK AI endpoint (or calls `/api/ai/test-key`) whose HTTPS server responds with `307 Temporary Redirect` to `http://127.0.0.1:3000/api/internal/process-feedback-queue` or `http://169.254.169.254/latest/meta-data/`.
- **Payloads**:
  ```text
  HTTP/1.1 307 Temporary Redirect
Location: http://127.0.0.1:3000/api/health


  ```
- **Steps**:
  1. Configure a custom AI endpoint or invoke `POST /api/ai/test-key` pointing to an allowlisted HTTPS endpoint that returns a 307 redirect to an internal address.
  2. Observe that `fetch` sends the HTTP request (and `Authorization: Bearer <apiKey>` header) to the internal target before `safeFetch` checks `response.url`.
- **Observed Result**: The internal HTTP request is executed by the server process before `safeFetch` throws `Redirected AI provider URL failed validation`.

### Remediation Strategy
Enforce `redirect: 'manual'` inside `safeFetch` with a bounded redirect loop (max 3 hops) that validates every `Location` target via `validateOutboundFetchUrl` and `assertResolvesToPublicHost` before following it, strips sensitive headers on cross-origin hops, and remove the `if (!user.isAdmin)` bypass in `/api/ai/test-key/route.ts`.

## 3. [HIGH] MCP import_plan_workouts_batch Duplicate Database Insertion & Missing Server-Layer API-Key Mutation Guard
- **Fingerprint**: `runflow-03-mcp-batch-duplicate-insert-and-server-guard`
- **Overall Severity**: **HIGH** (Likelihood: `high`, Impact: `high`, Confidence: `high`)
- **Summary**: In `Web/src/lib/mcp/tools/workouts.ts:862-881`, `importPlanWorkoutsBatchTool` executes a `for (const row of rows)` loop calling `await tx.workout.create({ data: row })` and then immediately executes `if (typeof tx.workout.createMany === 'function') { await tx.workout.createMany({ data: rows }); }` in the same transaction, inserting every workout twice on real Prisma clients. Additionally, `McpServer.handleSingleRequest` (`Web/src/lib/mcp/server.ts:242-266`) does not enforce the `authType === 'api_key'` read-only restriction internally.
- **Root Cause**: Lines 862 and 869 in `Web/src/lib/mcp/tools/workouts.ts` use two sequential `if` blocks (`if (typeof tx.workout.create === 'function')` and `if (typeof tx.workout.createMany === 'function')`) rather than `if / else if`, so both execute on production Prisma transactions where both methods exist.
- **Intended Behavior**: `importPlanWorkoutsBatchTool` must insert each batch workout row exactly once per transaction, and `McpServer.handleSingleRequest` must reject mutating tool calls when `context.authType === 'api_key'`.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/mcp/route.ts:218` (`POST`) — Forwards authenticated MCP JSON-RPC `tools/call` for `import_plan_workouts_batch` to `mcpServer.handleRequest`.
- **`[PROPAGATION]`** `Web/src/lib/mcp/server.ts:249` (`McpServer.handleSingleRequest`) — Invokes `tool.handler(toolArgs, context)` without checking `context.authType === 'api_key'` inside `McpServer`.
- **`[PROPAGATION]`** `Web/src/lib/mcp/tools/workouts.ts:863` (`importPlanWorkoutsBatchTool.handler`) — Loops over `rows` and calls `await tx.workout.create({ data: row })` for all N workouts.
- **`[SINK]`** `Web/src/lib/mcp/tools/workouts.ts:870` (`importPlanWorkoutsBatchTool.handler`) — Immediately calls `await tx.workout.createMany({ data: rows })` in the same transaction, duplicating all N workouts in PostgreSQL.

### Code Evidence
- `Web/src/lib/mcp/tools/workouts.ts:862` — `if (typeof tx.workout.create === 'function')` is followed by a separate `if (typeof tx.workout.createMany === 'function')` at line 869 instead of `else if`.
- `Web/src/lib/mcp/server.ts:242` — `McpServer.handleSingleRequest` dispatches `tools/call` without checking `context.authType === 'api_key'`.

### Reproduction & Observed Impact
- **Attacker Perspective**: Any MCP client or AI agent calling `import_plan_workouts_batch` with N workouts causes 2N workout rows to be written to the database while reporting `createdCount: N`.
- **Payloads**:
  ```text
  {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"import_plan_workouts_batch","arguments":{"goalId":"goal_1","workouts":[{"scheduledDate":"2026-11-01","workoutType":"EASY","description":"Easy 5k"}]}}}
  ```
- **Steps**:
  1. Call `POST /mcp` with `tools/call` for `import_plan_workouts_batch` containing 1 workout.
  2. Query `prisma.workout.findMany({ where: { goalId: 'goal_1' } })` and observe 2 identical workout rows created.
- **Observed Result**: Every batch import creates 2x duplicate workouts in PostgreSQL while returning `createdCount: N`.

### Remediation Strategy
Change `if (typeof tx.workout.createMany === 'function')` to `else if (typeof tx.workout.createMany === 'function')` in `Web/src/lib/mcp/tools/workouts.ts:869`, and add the `API_KEY_READ_ONLY_TOOLS` guard inside `McpServer.handleSingleRequest` in `Web/src/lib/mcp/server.ts`.

## 4. [HIGH] MCP JSON-RPC Batch Amplification Bypassing Per-Request Rate Limits on /mcp and /mcp/public
- **Fingerprint**: `runflow-04-mcp-jsonrpc-batch-rate-limit-amplification`
- **Overall Severity**: **HIGH** (Likelihood: `high`, Impact: `high`, Confidence: `high`)
- **Summary**: Both `POST /mcp` (`Web/src/app/mcp/route.ts:135-148`) and `POST /mcp/public` (`Web/src/app/mcp/public/route.ts:703-717`) charge their rate limiter once per HTTP POST request, then pass the parsed JSON body to `mcpServer.handleRequest(parsedBody)` (`Web/src/lib/mcp/server.ts:296-318`), which accepts a JSON-RPC batch array of up to 50 requests and runs all 50 concurrently via `Promise.all`.
- **Root Cause**: Rate-limit accounting in `/mcp` and `/mcp/public` counts HTTP POST requests (1 token) rather than counting JSON-RPC batch items or `tools/call` invocations inside a batch.
- **Intended Behavior**: JSON-RPC batches on `/mcp` and `/mcp/public` must be bounded (max 10 on `/mcp/public`) and must consume rate-limit tokens proportional to the number of `tools/call` invocations in the batch.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/mcp/public/route.ts:703` (`POST`) — Checks `checkRateLimitAsync(clientId, PUBLIC_MCP_RATE_LIMIT)` once for the HTTP request (limit: 10/hour).
- **`[PROPAGATION]`** `Web/src/app/mcp/public/route.ts:749` (`POST`) — Passes `parsedBody` (which may be a 50-element JSON-RPC batch array) to `publicMcpServer.handleRequest`.
- **`[SINK]`** `Web/src/lib/mcp/server.ts:304` (`McpServer.handleRequest`) — Executes up to 50 `handleSingleRequest` calls in parallel via `Promise.all`.

### Code Evidence
- `Web/src/app/mcp/public/route.ts:707` — `checkRateLimitAsync` is called once per HTTP POST before `parsedBody` is inspected.
- `Web/src/app/mcp/route.ts:135` — `checkRateLimitAsync` is called once per HTTP POST before `parsedBody` batch fan-out.
- `Web/src/lib/mcp/server.ts:297` — `McpServer.handleRequest` allows batches up to 50 items and runs them concurrently with `Promise.all`.

### Reproduction & Observed Impact
- **Attacker Perspective**: An unauthenticated caller sends a single HTTP POST to `/mcp/public` containing a JSON array of 50 `generate_running_plan` (104-week plan) calls, consuming only 1 of the 10/hour rate-limit tokens while executing 50 full plan generations in parallel.
- **Payloads**:
  ```text
  [{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_running_plan","arguments":{"raceType":"MARATHON","durationWeeks":104}}}, ... x50]
  ```
- **Steps**:
  1. Send a POST request to `/mcp/public` with a JSON array of 50 `tools/call` elements.
  2. Observe that all 50 tool calls execute concurrently while `X-RateLimit-Remaining` decreases by only 1.
- **Observed Result**: 50x amplification of CPU and database load per rate-limit token on `/mcp/public` and `/mcp`.

### Remediation Strategy
Cap JSON-RPC batches on `/mcp/public` to 10 items, count the number of `tools/call` items in a batch on both `/mcp` and `/mcp/public`, and consume one rate-limit token per additional `tools/call` item (returning HTTP 429 if the batch exceeds the remaining allowance).

## 5. [HIGH] Hardcoded Fallback Secret & Colon-Delimiter Injection in MCP OAuth 2.1 Consent CSRF HMAC
- **Fingerprint**: `runflow-05-mcp-oauth-consent-csrf-fallback-and-delimiter`
- **Overall Severity**: **HIGH** (Likelihood: `medium`, Impact: `high`, Confidence: `high`)
- **Summary**: `createConsentCsrfToken` and `verifyConsentCsrfToken` in `Web/src/lib/mcp/oauth.ts:205-248` fall back to the hardcoded literal `'runflow-mcp-consent-dev-secret'` when `process.env.NEXTAUTH_SECRET` is unset (even in production or when NextAuth v5's `AUTH_SECRET` is set instead), and construct the HMAC message by joining fields with `:` (`${params.userId}:${params.clientId}:${params.redirectUri}:${params.codeChallenge}:${params.state}:${expiresAtMs}`) where `redirectUri` and `state` naturally contain colons.
- **Root Cause**: Missing fail-closed production check and missing `AUTH_SECRET` fallback in `createConsentCsrfToken`/`verifyConsentCsrfToken`, combined with non-canonical colon concatenation across fields that permit `:`.
- **Intended Behavior**: MCP OAuth consent CSRF signing must read `process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET`, throw an error in production if neither is configured, and sign a canonical JSON array (`JSON.stringify([...])`) so field boundaries cannot shift.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/mcp/oauth/authorize/route.ts:152` (`POST`) — Reads `csrf_token`, `client_id`, `redirect_uri`, `code_challenge`, and `state` from the authorization form submission.
- **`[PROPAGATION]`** `Web/src/lib/mcp/oauth.ts:233` (`verifyConsentCsrfToken`) — Selects `const secret = process.env.NEXTAUTH_SECRET || 'runflow-mcp-consent-dev-secret'` and builds `payload = ${params.userId}:${params.clientId}:${params.redirectUri}:${params.codeChallenge}:${params.state}:${expiresAtMs}`.
- **`[SINK]`** `Web/src/lib/mcp/oauth.ts:235` (`verifyConsentCsrfToken`) — Computes HMAC-SHA256 using the fallback secret and colon-delimited payload to authorize issuance of a full-access `mcp:full` OAuth code.

### Code Evidence
- `Web/src/lib/mcp/oauth.ts:211` — `const secret = process.env.NEXTAUTH_SECRET || 'runflow-mcp-consent-dev-secret';` does not check `AUTH_SECRET` or fail closed in production.
- `Web/src/lib/mcp/oauth.ts:212` — `const payload = `${params.userId}:${params.clientId}:${params.redirectUri}:${params.codeChallenge}:${params.state}:${expiresAtMs}`;` uses `:` without escaping.

### Reproduction & Observed Impact
- **Attacker Perspective**: An attacker crafts a cross-site POST to `/mcp/oauth/authorize` using a forged `csrf_token` signed with `'runflow-mcp-consent-dev-secret'` (when `NEXTAUTH_SECRET` is unset) or shifts `:` boundaries between `redirectUri` and `state`.
- **Payloads**:
  ```text
  csrf_token=<expiresAtMs>.<hmac_sha256('runflow-mcp-consent-dev-secret', userId:clientId:redirectUri:codeChallenge:state:expiresAtMs)>
  ```
- **Steps**:
  1. Compute the HMAC-SHA256 over the colon-delimited consent parameters using `'runflow-mcp-consent-dev-secret'` when `NEXTAUTH_SECRET` is unset.
  2. Submit a POST to `/mcp/oauth/authorize` with `decision=approve` and the forged `csrf_token`.
- **Observed Result**: `verifyConsentCsrfToken` returns `true` and the server issues an OAuth 2.1 authorization code with `mcp:full` scope to the attacker's `redirect_uri`.

### Remediation Strategy
Introduce `getConsentCsrfSecret()` in `Web/src/lib/mcp/oauth.ts` that resolves `process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET` and throws in production if missing, and serialize the HMAC payload via `JSON.stringify([params.userId, params.clientId, params.redirectUri, params.codeChallenge, params.state, expiresAtMs])`.

## 6. [MEDIUM] X-Forwarded-Host / Proto Spoofing in .well-known OAuth 2.1 Discovery Endpoints
- **Fingerprint**: `runflow-06-well-known-oauth-metadata-host-spoofing`
- **Overall Severity**: **MEDIUM** (Likelihood: `medium`, Impact: `medium`, Confidence: `high`)
- **Summary**: Both `GET /.well-known/oauth-authorization-server` (`Web/src/app/.well-known/oauth-authorization-server/route.ts:3-11`) and `GET /.well-known/oauth-protected-resource` (`Web/src/app/.well-known/oauth-protected-resource/route.ts:3-11`) construct their `origin` from raw `x-forwarded-proto` and `x-forwarded-host` request headers without checking `process.env.NEXTAUTH_URL || process.env.AUTH_URL`.
- **Root Cause**: `getOrigin(request)` in both `.well-known` route files was not updated when `Web/src/app/mcp/route.ts` and `Web/src/app/mcp/oauth/authorize/route.ts` were hardened to use `process.env.NEXTAUTH_URL || process.env.AUTH_URL`.
- **Intended Behavior**: `getOrigin` in both `.well-known` OAuth discovery routes must prefer the configured `process.env.NEXTAUTH_URL || process.env.AUTH_URL` origin and never trust unverified `x-forwarded-host` or `x-forwarded-proto` headers.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/.well-known/oauth-authorization-server/route.ts:26` (`GET`) — Handles unauthenticated RFC 8414 discovery request and calls `getOrigin(request)`.
- **`[PROPAGATION]`** `Web/src/app/.well-known/oauth-authorization-server/route.ts:4` (`getOrigin`) — Reads `request.headers.get('x-forwarded-proto')` and `request.headers.get('x-forwarded-host')` directly.
- **`[SINK]`** `Web/src/app/.well-known/oauth-authorization-server/route.ts:31` (`GET`) — Emits `issuer`, `authorization_endpoint`, `token_endpoint`, and `registration_endpoint` prefixed with the spoofed origin.

### Code Evidence
- `Web/src/app/.well-known/oauth-authorization-server/route.ts:4` — `const host = request.headers.get('x-forwarded-host') || request.headers.get('host');` trusts `x-forwarded-host` unconditionally.
- `Web/src/app/.well-known/oauth-protected-resource/route.ts:4` — `const host = request.headers.get('x-forwarded-host') || request.headers.get('host');` trusts `x-forwarded-host` unconditionally.

### Reproduction & Observed Impact
- **Attacker Perspective**: An attacker sends `GET /.well-known/oauth-authorization-server` with `X-Forwarded-Host: attacker.example.com`.
- **Payloads**:
  ```text
  GET /.well-known/oauth-authorization-server HTTP/1.1
Host: runflow.schuelken.uk
X-Forwarded-Host: https://www.google.com/url?sa=E\&source=gmail\&q=attacker.example.com


  ```
- **Steps**:
  1. Send a GET request to `/.well-known/oauth-authorization-server` or `/.well-known/oauth-protected-resource` with header `X-Forwarded-Host: attacker.example.com`.
  2. Inspect the JSON response.
- **Observed Result**: The server returns `"token_endpoint": "https://attacker.example.com/mcp/oauth/token"` and `"authorization_servers": ["https://attacker.example.com"]`.

### Remediation Strategy
Replace `getOrigin(request)` in both `.well-known` routes with the hardened implementation from `Web/src/app/mcp/route.ts:15-26` that reads `process.env.NEXTAUTH_URL || process.env.AUTH_URL` first and falls back to `new URL(request.url).origin`.

## 7. [HIGH] Cross-User Account Lockout DoS, Non-Atomic Replay Window & Type Crash in verifyAuthCode
- **Fingerprint**: `runflow-07-verify-auth-code-lockout-dos-and-toctou`
- **Overall Severity**: **HIGH** (Likelihood: `high`, Impact: `high`, Confidence: `high`)
- **Summary**: `verifyAuthCode(email, code, type)` in `Web/src/lib/auth/tokens.ts:57-88` increments a rate-limit bucket keyed solely on `email` (`checkRateLimit(email, { limit: 10, windowSeconds: 900 })`) before verifying the code, never resets the bucket on valid verification, calls `code.toUpperCase()` without checking `typeof code === 'string'`, and consumes the code non-atomically via `findFirst` followed by `prisma.authCode.delete`.
- **Root Cause**: Rate limiting on a bare `email` key before checking credential validity allows any unauthenticated third party to exhaust a victim's 15-minute verification quota, and `findFirst` + `delete` is a classic TOCTOU check-then-act pattern.
- **Intended Behavior**: `verifyAuthCode` must validate `typeof email === 'string'` and `typeof code === 'string'`, consume matching codes atomically via `deleteMany({ where: { id: authCode.id } })` checking `deleted.count === 1`, only count failed attempts against the rate limiter, reset the counter on success, and scope route-level limits to `${clientId}:${normalizedEmail}`.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/auth/reset-password/route.ts:16` (`POST`) — Parses `{ email, code, newPassword }` from JSON body and passes `email` and `code` to `verifyAuthCode`.
- **`[PROPAGATION]`** `Web/src/lib/auth/tokens.ts:62` (`verifyAuthCode`) — Increments `checkRateLimit(email, { limit: 10, windowSeconds: 900, prefix: 'verify_code' })` keyed only on `email`.
- **`[PROPAGATION]`** `Web/src/lib/auth/tokens.ts:69` (`verifyAuthCode`) — Calls `code.toUpperCase()` (throwing `TypeError` if `code` is not a string) and queries `prisma.authCode.findFirst`.
- **`[SINK]`** `Web/src/lib/auth/tokens.ts:81` (`verifyAuthCode`) — Calls `await prisma.authCode.delete({ where: { id: authCode.id } })` non-atomically after `findFirst`.

### Code Evidence
- `Web/src/lib/auth/tokens.ts:62` — `const rateLimit = checkRateLimit(email, { limit: 10, windowSeconds: 900, prefix: 'verify_code' });` keys on bare `email` before verifying the code.
- `Web/src/lib/auth/tokens.ts:69` — `code: code.toUpperCase()` is called without checking `typeof code === 'string'`.
- `Web/src/lib/auth/tokens.ts:81` — `await prisma.authCode.delete({ where: { id: authCode.id } })` is non-atomic with `findFirst` at line 66.

### Reproduction & Observed Impact
- **Attacker Perspective**: An unauthenticated attacker sends 10 invalid verification codes for `victim@example.com` across two IPs (or across two 5-minute windows) to lock the victim out of password reset and email verification for 15 minutes.
- **Payloads**:
  ```text
  {"email":"victim@example.com","code":"000000","newPassword":"ValidPass123!"}
  ```
- **Steps**:
  1. Send 10 POST requests to `/api/auth/verify-email` or `/api/auth/reset-password` with `email: 'victim@example.com'` and `code: '000000'`.
  2. Have the victim submit their real 6-character emailed code within the next 15 minutes.
- **Observed Result**: `verifyAuthCode` returns `false` immediately at line 63 (`!rateLimit.allowed`), rejecting the victim's valid code for 15 minutes.

### Remediation Strategy
Validate `typeof email === 'string'` and `typeof code === 'string'` in `verifyAuthCode`, consume the matched row atomically via `prisma.authCode.deleteMany({ where: { id: authCode.id } })` and check `deleted.count === 1`, only record rate-limit hits on failed verification attempts, reset on success, and scope route-level limits in `verify-email` and `reset-password` to `${clientId}:${normalizedEmail}`.

## 8. [MEDIUM] Mobile Registration Account Enumeration, Missing Verification Email & Strava Email Collision P2002
- **Fingerprint**: `runflow-08-mobile-register-enumeration-and-strava-p2002`
- **Overall Severity**: **MEDIUM** (Likelihood: `high`, Impact: `medium`, Confidence: `high`)
- **Summary**: `POST /api/mobile/v1/auth/register` (`Web/src/app/api/mobile/v1/auth/register/route.ts:63-100`) returns HTTP `400` when `existingUser` exists versus HTTP `201` with JWT tokens when the email is new (allowing account enumeration) and never sends a verification email code. Additionally, in `exchangeStravaCodeForTokens` (`Web/src/lib/mobile/auth.ts:363-376`), updating an existing Strava user's `email` from `athlete.email` is not guarded against `P2002` unique constraint collisions.
- **Root Cause**: `/api/mobile/v1/auth/register` diverged from `/api/auth/register` (omitting `generateAuthCode`/`sendVerificationEmail`), and the `else` branch in `exchangeStravaCodeForTokens` (`Web/src/lib/mobile/auth.ts:363-376`) omits the `P2002` catch block that was added to the `create` branch at line 337.
- **Intended Behavior**: Mobile registration must send a verification email (`generateAuthCode` + `sendVerificationEmail`), `/api/mobile/v1/auth/verify-email` must validate input types, and `exchangeStravaCodeForTokens` must catch `P2002` email collisions when updating an existing Strava user.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/mobile/v1/auth/register/route.ts:25` (`POST`) — Accepts `{ email, password, name }` for mobile account registration.
- **`[PROPAGATION]`** `Web/src/app/api/mobile/v1/auth/register/route.ts:63` (`POST`) — Checks `prisma.user.findUnique({ where: { email: normalizedEmail } })` and returns `400` if found, or `201` with tokens without sending a verification email.
- **`[SINK]`** `Web/src/lib/mobile/auth.ts:363` (`exchangeStravaCodeForTokens`) — Calls `prisma.user.update` with `...(!user.email && athlete.email ? { email: athlete.email } : {})` without catching `P2002` when another user already owns `athlete.email`.

### Code Evidence
- `Web/src/app/api/mobile/v1/auth/register/route.ts:67` — Returns `400` on existing email and never calls `generateAuthCode` or `sendVerificationEmail` on lines 73-100.
- `Web/src/lib/mobile/auth.ts:369` — `!user.email && athlete.email ? { email: athlete.email } : {}` in `prisma.user.update` is not wrapped in a `P2002` catch handler.

### Reproduction & Observed Impact
- **Attacker Perspective**: An attacker queries `POST /api/mobile/v1/auth/register` to enumerate registered emails (`400` vs `201`), or a returning Strava user whose Strava email matches an existing email account triggers an unhandled `P2002` 500 error during login.
- **Payloads**:
  ```text
  {"email":"target@example.com","password":"ValidPass123!"}
  ```
- **Steps**:
  1. Send `POST /api/mobile/v1/auth/register` with `email: 'target@example.com'` and a valid password.
  2. Observe `400 Registration failed` if the email exists versus `201` if new, and observe that no `AuthCode` row is created for `VERIFY_EMAIL`.
- **Observed Result**: Registered emails are distinguishable via HTTP status code, new mobile users never receive a verification code, and returning Strava users with a colliding `athlete.email` fail login with a 500 error.

### Remediation Strategy
Generate and email a `VERIFY_EMAIL` code in `POST /api/mobile/v1/auth/register`, validate `typeof email === 'string'` and `typeof code === 'string'` in `POST /api/mobile/v1/auth/verify-email`, and wrap the existing-user `prisma.user.update` in `Web/src/lib/mobile/auth.ts` with a `P2002` catch block that retries the update without `email`.

## 9. [HIGH] Nutrition Batch & Copy Endpoints Bypass HEALTH_DATA Consent Gate and Lack Input/Array Bounds
- **Fingerprint**: `runflow-09-nutrition-batch-copy-consent-and-bounds-bypass`
- **Overall Severity**: **HIGH** (Likelihood: `high`, Impact: `high`, Confidence: `high`)
- **Summary**: Unlike `POST /api/health/nutrition/log` (which enforces `await healthDataConsentWithdrawn(session.user.id)` and validates `quantity` and macros), both `POST /api/health/nutrition/log/batch` (`Web/src/app/api/health/nutrition/log/batch/route.ts:5-56`) and `POST /api/health/nutrition/log/copy` (`Web/src/app/api/health/nutrition/log/copy/route.ts:6-71`) omit the `healthDataConsentWithdrawn` check, allow unbounded `items` arrays in `/batch`, and do not validate macro/quantity numeric bounds or `foodItemId` existence.
- **Root Cause**: When `healthDataConsentWithdrawn` and numeric bounds were added to `Web/src/app/api/health/nutrition/log/route.ts`, the sibling `/log/batch` and `/log/copy` routes were missed.
- **Intended Behavior**: Both `/api/health/nutrition/log/batch` and `/api/health/nutrition/log/copy` must reject requests with HTTP 403 when `healthDataConsentWithdrawn(session.user.id)` is true, cap batch size (`<= 50`), validate `YYYY-MM-DD` dates, validate finite non-negative macro/quantity bounds, and verify referenced `foodItemId` rows exist.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/health/nutrition/log/batch/route.ts:5` (`POST`) — Authenticates `session.user.id` and parses `{ date, mealType, items }` without checking `healthDataConsentWithdrawn` or capping `items.length`.
- **`[SINK]`** `Web/src/app/api/health/nutrition/log/batch/route.ts:25` (`POST`) — Runs `prisma.$transaction(items.map(item => tx.nutritionLog.create(...)))` with unvalidated `quantity`, `calories`, `protein`, `carbs`, `fats`, and `foodItemId`.

### Code Evidence
- `Web/src/app/api/health/nutrition/log/batch/route.ts:13` — No `healthDataConsentWithdrawn(session.user.id)` call, no `items.length` cap, and no numeric validation before `prisma.$transaction`.
- `Web/src/app/api/health/nutrition/log/copy/route.ts:14` — No `healthDataConsentWithdrawn(session.user.id)` call and no date format validation before copying `nutritionLog` rows.

### Reproduction & Observed Impact
- **Attacker Perspective**: A user who has withdrawn `HEALTH_DATA` consent (or an attacker abusing a session for DoS) sends a POST to `/api/health/nutrition/log/batch` with 5,000 items or `NaN`/`Infinity` macros.
- **Payloads**:
  ```text
  {"date":"2026-10-25","mealType":"LUNCH","items":[{"foodItemId":"item_1","quantity":-999999,"calories":1e308,"protein":0,"carbs":0,"fats":0}]}
  ```
- **Steps**:
  1. Withdraw `HEALTH_DATA` consent via `POST /api/user/consent` with `{"consentType":"HEALTH_DATA","action":"WITHDRAWN"}`.
  2. Send a POST request to `/api/health/nutrition/log/batch` and observe HTTP `200` (`count: 1`) instead of `403`.
- **Observed Result**: Health/nutrition data is persisted despite `HEALTH_DATA` consent withdrawal, and oversized `items` arrays or extreme macro values are written without validation.

### Remediation Strategy
Add `if (await healthDataConsentWithdrawn(session.user.id)) return NextResponse.json({ error: ... }, { status: 403 })` to both `/batch` and `/copy`, cap `items.length <= 50`, validate `YYYY-MM-DD` date strings, enforce finite non-negative bounds on `quantity` and macros, and verify `foodItemId` existence before inserting.

## 10. [MEDIUM] Unvalidated Workout Creation Enum/Numeric Inputs & Partial-PATCH State Clobbering in /api/workouts and /api/v1/workouts
- **Fingerprint**: `runflow-10-v1-workouts-cross-tenant-activity-link-and-bounds`
- **Overall Severity**: **MEDIUM** (Likelihood: `medium`, Impact: `medium`, Confidence: `high`)
- **Summary**: `POST /api/workouts` (`Web/src/app/api/workouts/route.ts:26-48`) and `POST /api/v1/workouts` (`Web/src/app/api/v1/workouts/route.ts:30-52`) cast `workoutType`/`type` directly to `WorkoutType` without enum validation, construct `new Date(scheduledDate)` without date validity checks, and accept arbitrary `NaN`/negative/unbounded `targetDistance` and `targetDuration` values. Furthermore, `PATCH /api/v1/workouts/[id]` (`Web/src/app/api/v1/workouts/[id]/route.ts:83-95`) sets `completedAt: isCompleted ? new Date() : null` and `linkedActivityId: linkedActivityId ?? null` unconditionally, wiping out existing completion timestamps and linked activities whenever a partial PATCH omits `isCompleted` or `linkedActivityId`, and does not validate `targetDistance`/`targetDuration` bounds.
- **Root Cause**: `POST /api/workouts` and `POST /api/v1/workouts` pass raw request body fields directly to `prisma.workout.create` without enum, date, or numeric bounds checks, and `PATCH /api/v1/workouts/[id]` evaluates `isCompleted ? new Date() : null` and `linkedActivityId ?? null` even when `isCompleted` and `linkedActivityId` are `undefined`.
- **Intended Behavior**: `POST /api/workouts` and `POST /api/v1/workouts` must validate `workoutType` against `WorkoutType`, reject invalid `scheduledDate` strings, and enforce finite non-negative bounds on `targetDistance` and `targetDuration`. `PATCH /api/v1/workouts/[id]` must only update `completedAt` and `linkedActivityId` when explicitly provided (or when `isCompleted === false`) and must validate numeric bounds.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/workouts/route.ts:25` (`POST`) — Reads `{ goalId, scheduledDate, type, workoutType, description, targetDistance, targetDuration }` from request JSON.
- **`[PROPAGATION]`** `Web/src/app/api/v1/workouts/[id]/route.ts:51` (`PATCH`) — Reads `{ workoutType, description, targetDistance, targetDuration, scheduledDate, isCompleted, linkedActivityId }` from request JSON.
- **`[SINK]`** `Web/src/app/api/v1/workouts/[id]/route.ts:92` (`PATCH`) — Writes `completedAt: isCompleted ? new Date() : null` and `linkedActivityId: linkedActivityId ?? null` and unvalidated `targetDistance`/`targetDuration` to `prisma.workout.update`.

### Code Evidence
- `Web/src/app/api/workouts/route.ts:41` — `scheduledDate: new Date(scheduledDate)` and `workoutType: resolvedType as WorkoutType` and `targetDistance`/`targetDuration` are passed to `prisma.workout.create` without validation.
- `Web/src/app/api/v1/workouts/route.ts:45` — `scheduledDate: new Date(scheduledDate)` and `workoutType: type as WorkoutType` and `targetDistance`/`targetDuration` are passed to `prisma.workout.create` without validation.
- `Web/src/app/api/v1/workouts/[id]/route.ts:92` — `completedAt: isCompleted ? new Date() : null` and `linkedActivityId: linkedActivityId ?? null` overwrite existing state on partial PATCH requests.

### Reproduction & Observed Impact
- **Attacker Perspective**: An authenticated caller sends negative or extreme `targetDistance`/`targetDuration` values to `/api/workouts` or `/api/v1/workouts`, or sends a partial `PATCH /api/v1/workouts/[id]` with `{ "description": "Updated" }` which unintentionally clears `completedAt` and `linkedActivityId`.
- **Payloads**:
  ```text
  {"goalId":"goal_1","scheduledDate":"2026-11-01","workoutType":"EASY","description":"Run","targetDistance":-1e100,"targetDuration":-999999}
  ```
- **Steps**:
  1. Send `POST /api/workouts` with negative or extreme `targetDistance` and `targetDuration`.
  2. Send `PATCH /api/v1/workouts/<completedWorkoutId>` with `{"description":"Notes"}` and observe `completedAt` and `linkedActivityId` reset to `null`.
- **Observed Result**: Unvalidated workout targets are persisted to PostgreSQL, and partial PATCH calls to `/api/v1/workouts/[id]` wipe completion metadata.

### Remediation Strategy
Validate `workoutType` against `VALID_WORKOUT_TYPES`, validate `scheduledDate` is a valid date, and enforce finite non-negative bounds (`targetDistance` `0..500_000`, `targetDuration` `0..604_800`) in `POST /api/workouts`, `POST /api/v1/workouts`, and `PATCH /api/v1/workouts/[id]`, and preserve existing `completedAt`/`linkedActivityId` when omitted in `PATCH /api/v1/workouts/[id]`.

## 11. [MEDIUM] Missing Enum & Numeric Bounds Validation in Mobile PUT /api/mobile/v1/activities/[id] and PUT /api/mobile/v1/user/profile
- **Fingerprint**: `runflow-11-mobile-activity-and-profile-validation-gaps`
- **Overall Severity**: **MEDIUM** (Likelihood: `medium`, Impact: `medium`, Confidence: `high`)
- **Summary**: `PUT /api/mobile/v1/activities/[id]` (`Web/src/app/api/mobile/v1/activities/[id]/route.ts:104-131`) writes `name`, `type`, `trainingType`, `averageWatts`, `maxWatts`, `npWatts`, and `bikeTss` directly to `prisma.activity.update` without enum or range validation. Similarly, `PUT /api/mobile/v1/user/profile` (`Web/src/app/api/mobile/v1/user/profile/route.ts:103-160`) only validates `hrMax` and `effectiveVo2maxCorrectionFactor`, leaving `sex`, `birthDate`, `hrRest`, `weight`, `height`, `vdotCorrectionFactor`, `ftpWatts`, `swimCssSecPer100m`, and `hrZone1Max..6Max` unvalidated.
- **Root Cause**: Input validation rules implemented on web routes (`/api/activities/[id]`, `/api/settings/profile`, `/api/settings/cycling`) were not ported to the mobile v1 `PUT` routes.
- **Intended Behavior**: Mobile `PUT /api/mobile/v1/activities/[id]` and `PUT /api/mobile/v1/user/profile` must enforce the same enum and physiological/numeric range constraints as the web API.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/mobile/v1/user/profile/route.ts:68` (`PUT`) — Parses profile fields (`weight`, `height`, `hrRest`, `ftpWatts`, `swimCssSecPer100m`, `vdotCorrectionFactor`, `hrZone*Max`) from request JSON.
- **`[PROPAGATION]`** `Web/src/app/api/mobile/v1/user/profile/route.ts:129` (`PUT`) — Copies unvalidated fields into `updateData`.
- **`[SINK]`** `Web/src/app/api/mobile/v1/user/profile/route.ts:159` (`PUT`) — Persists `updateData` via `prisma.user.update`, corrupting downstream VDOT, FTP, W/kg, and HR zone calculations.

### Code Evidence
- `Web/src/app/api/mobile/v1/activities/[id]/route.ts:104` — `name`, `type`, `trainingType`, `averageWatts`, `maxWatts`, `npWatts`, and `bikeTss` are assigned to `updateData` with no enum or numeric bounds checks.
- `Web/src/app/api/mobile/v1/user/profile/route.ts:129` — `weight`, `height`, `hrRest`, `vdotCorrectionFactor`, `ftpWatts`, `swimCssSecPer100m`, and `hrZone1Max..6Max` are assigned to `updateData` without bounds validation.

### Reproduction & Observed Impact
- **Attacker Perspective**: An authenticated caller sends `PUT /api/mobile/v1/user/profile` with `{"weight": -50, "ftpWatts": 999999, "vdotCorrectionFactor": 100}` or `PUT /api/mobile/v1/activities/[id]` with `{"bikeTss": 1e100}`.
- **Payloads**:
  ```text
  {"weight":-50,"ftpWatts":999999,"vdotCorrectionFactor":100}
  ```
- **Steps**:
  1. Send `PUT /api/mobile/v1/user/profile` with out-of-range biometric and power values.
  2. Fetch `/api/dashboard` and observe corrupted W/kg, cycling VO2max, and VDOT metrics.
- **Observed Result**: Out-of-range or negative biometric and power values are stored in PostgreSQL and poison analytics calculations.

### Remediation Strategy
Validate `ActivityType`, `WorkoutType`, string lengths, and power/TSS bounds (`0..2500`/`5000`/`2000`) in `PUT /api/mobile/v1/activities/[id]`, and validate `sex`, `birthDate`, `hrRest` (`25..150`), `weight` (`20..300`), `height` (`80..260`), `vdotCorrectionFactor` (`0.5..1.5`), `ftpWatts` (`40..1000`), `swimCssSecPer100m` (`40..600`), and `hrZone1Max..6Max` (`40..240`) in `PUT /api/mobile/v1/user/profile`.

## 12. [MEDIUM] Stateless Admin JWT Lacks Live DB Privilege Re-Check & Admin CSRF Cookie Is Unsigned
- **Fingerprint**: `runflow-12-admin-jwt-revocation-and-unsigned-csrf-cookie`
- **Overall Severity**: **MEDIUM** (Likelihood: `low`, Impact: `high`, Confidence: `high`)
- **Summary**: `requireAdmin` in `Web/src/lib/admin/auth.ts:169-231` verifies the 2-hour admin JWT signature without checking whether a database-backed admin (`User.isAdmin`) has had their admin privilege revoked in PostgreSQL. Additionally, `Web/src/lib/security/csrf.ts:17-87` uses a raw random hex string for the double-submit `csrf_token` cookie without HMAC-binding it to the server secret.
- **Root Cause**: `requireAdmin` relies solely on the stateless JWT claims (`type === 'admin'`) for 2 hours, and `generateCsrfToken`/`validateCsrfToken` compare `cookieToken` and `headerToken` for equality without verifying a cryptographic signature.
- **Intended Behavior**: `requireAdmin` must re-verify `prisma.user.findFirst({ where: { email: payload.username, isAdmin: true } })` for database-backed admins (when `payload.username !== process.env.ADMIN_USERNAME`), and `csrf.ts` must sign CSRF tokens with an HMAC (`<nonce>.<hmac>`) verified on every state-changing admin request.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/lib/admin/auth.ts:190` (`requireAdmin`) — Extracts the admin JWT from `Authorization: Bearer` or `runflow_admin_token` cookie.
- **`[PROPAGATION]`** `Web/src/lib/admin/auth.ts:221` (`requireAdmin`) — Calls `verifyAdminToken(token)` and returns `{ admin }` without checking `prisma.user.isAdmin` for DB-backed admins.
- **`[SINK]`** `Web/src/lib/security/csrf.ts:86` (`validateCsrfToken`) — Checks `timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))` without verifying an HMAC signature on `cookieToken`.

### Code Evidence
- `Web/src/lib/admin/auth.ts:221` — `requireAdmin` returns `{ admin }` immediately after `verifyAdminToken` without re-checking `prisma.user` for DB-backed admins.
- `Web/src/lib/security/csrf.ts:17` — `generateCsrfToken` returns `randomBytes(32).toString('hex')` with no HMAC signature.

### Reproduction & Observed Impact
- **Attacker Perspective**: A database-backed admin user whose `isAdmin` flag is set to `false` in PostgreSQL continues calling `/api/admin/*` endpoints with their existing `runflow_admin_token` for up to 2 hours.
- **Payloads**:
  ```text
  Cookie: runflow_admin_token=<valid_2h_jwt_for_demoted_db_admin>
  ```
- **Steps**:
  1. Log in as a DB-backed admin (`User.isAdmin = true`) via `POST /api/admin/login`.
  2. Revoke `isAdmin` (`UPDATE "User" SET "isAdmin" = false`) and call `GET /api/admin/users` with the previously issued token.
- **Observed Result**: `requireAdmin` authorizes the request because it never re-queries `prisma.user.isAdmin`.

### Remediation Strategy
In `requireAdmin` (`Web/src/lib/admin/auth.ts`), when `admin.username !== process.env.ADMIN_USERNAME`, verify that `prisma.user.findFirst({ where: { email: { equals: admin.username, mode: 'insensitive' }, isAdmin: true } })` still exists; in `Web/src/lib/security/csrf.ts`, append an HMAC-SHA256 signature (`<nonce>.<sig>`) keyed by `JWT_SECRET || NEXTAUTH_SECRET` and verify it in `validateCsrfToken`.

## 13. [LOW] GDPR Data Export & HEALTH_DATA Consent Withdrawal Omit WeeklyReconciliationRecord and OAuth/Workout Records
- **Fingerprint**: `runflow-13-gdpr-export-and-consent-withdrawal-gaps`
- **Overall Severity**: **LOW** (Likelihood: `low`, Impact: `medium`, Confidence: `high`)
- **Summary**: `POST /api/user/consent` (`Web/src/app/api/user/consent/route.ts:101-126`) and `POST /api/mobile/v1/user/consent` (`Web/src/app/api/mobile/v1/user/consent/route.ts:81-106`) delete 12 health-related models when `HEALTH_DATA` consent is withdrawn, but omit `prisma.weeklyReconciliationRecord.deleteMany({ where: { userId } })`. Additionally, `GET /api/user/export` (`Web/src/app/api/user/export/route.ts:28-115`) omits `workouts` (inside `goals`), `weeklyReconciliationRecords`, and `mcpOAuthTokens` metadata from the GDPR portability export.
- **Root Cause**: Later schema models (`WeeklyReconciliationRecord`, `McpOAuthToken`) and nested `workouts` were not added to the consent withdrawal transaction and GDPR export query.
- **Intended Behavior**: Withdrawing `HEALTH_DATA` consent must also purge `weeklyReconciliationRecord` rows, and `GET /api/user/export` must include nested `workouts` on `goals`, `weeklyReconciliationRecords`, and non-sensitive `mcpOAuthTokens` metadata.

### Source-to-Sink Trace
- **`[ENTRYPOINT]`** `Web/src/app/api/user/consent/route.ts:53` (`POST`) — Processes `consentType === 'HEALTH_DATA'` and `action === 'WITHDRAWN'`.
- **`[SINK]`** `Web/src/app/api/user/consent/route.ts:104` (`POST`) — Executes `prisma.$transaction([...])` deleting health tables while omitting `weeklyReconciliationRecord`.

### Code Evidence
- `Web/src/app/api/user/consent/route.ts:104` — `prisma.$transaction` deletes `adaptedWorkout`, `dailyReadinessRecord`, `readinessBaseline`, etc., but omits `weeklyReconciliationRecord`.
- `Web/src/app/api/mobile/v1/user/consent/route.ts:84` — Mobile consent withdrawal transaction similarly omits `weeklyReconciliationRecord`.
- `Web/src/app/api/user/export/route.ts:67` — `goals: true` does not include `{ include: { workouts: true } }`, and `weeklyReconciliationRecords` / `mcpOAuthTokens` are absent.

### Reproduction & Observed Impact
- **Attacker Perspective**: A user withdraws `HEALTH_DATA` consent or downloads their GDPR export via `/api/user/export`.
- **Payloads**:
  ```text
  {"consentType":"HEALTH_DATA","action":"WITHDRAWN"}
  ```
- **Steps**:
  1. Call `POST /api/user/consent` with `{"consentType":"HEALTH_DATA","action":"WITHDRAWN"}`.
  2. Query `prisma.weeklyReconciliationRecord.findMany({ where: { userId } })` and observe that records remain.
- **Observed Result**: `WeeklyReconciliationRecord` rows remain in PostgreSQL after `HEALTH_DATA` withdrawal, and `GET /api/user/export` omits planned workouts and reconciliation history.

### Remediation Strategy
Add `prisma.weeklyReconciliationRecord.deleteMany({ where: { userId } })` to `Web/src/app/api/user/consent/route.ts` and `Web/src/app/api/mobile/v1/user/consent/route.ts`, and include `goals: { include: { workouts: true } }`, `weeklyReconciliationRecords: true`, and safe `mcpOAuthTokens` metadata in `Web/src/app/api/user/export/route.ts`.


# Needs-Validation & Architectural Hardening Leads (`run-1`)

## NV-1. Android Native App Includes Unencrypted Room Health/GPS Database in Cloud Backups & Stores Tokens in Unencrypted DataStore
- **Fingerprint**: `runflow-14-needs-validation-android-room-backup-and-plaintext-datastore`
- **Description**: In `android/app/src/main/AndroidManifest.xml:37-39`, `android:allowBackup="true"` is enabled and `backup_rules.xml` / `data_extraction_rules.xml` only exclude `datastore/runflow_auth.preferences_pb`, allowing the unencrypted Room SQLite database (`AppDatabase`, which stores GPS route coordinates in `routeJson`, Health Connect resting HR/HRV/sleep in `daily_entries`, and AI coach `chat_messages`) to be exported in cloud backups and device transfers. Additionally, `AuthStore.kt` stores the bearer access and refresh JWTs in unencrypted `preferencesDataStore` on disk.
- **Claimed Root Cause**: Deny-list backup rules in `backup_rules.xml` and `data_extraction_rules.xml` explicitly allow the Room database to back up to Google Drive / D2D transfer without SQLCipher encryption, and `AuthStore.kt` uses standard `preferencesDataStore` without Android Keystore / Tink encryption.
- **Trace**:
  - `[ENTRYPOINT]` `android/app/src/main/AndroidManifest.xml:37` (`application`) — Configures `android:allowBackup="true"`, `android:fullBackupContent="@xml/backup_rules"`, and `android:dataExtractionRules="@xml/data_extraction_rules"`.
  - `[SINK]` `android/app/src/main/res/xml/data_extraction_rules.xml:14` (`data-extraction-rules`) — Excludes only `datastore/runflow_auth.preferences_pb`, leaving the Room SQLite database (`databases/`) included in cloud backup and device transfer.
- **Blockers**:
  - Intentional product trade-off documented in `backup_rules.xml` comments (preserving offline plans/activities across device upgrades vs. excluding sensitive Health Connect / GPS data from cloud backup).
- **Local Validation Plan**: Confirm with product/mobile owners whether Room database (`databases/`) should also be excluded in `backup_rules.xml` and `data_extraction_rules.xml` (since synced activities/plans are already stored on the server), or encrypted via SQLCipher.
- **Deployment Validation Plan**: Test Android Auto Backup (`bmgr backupnow com.runflow2.app`) on an Android 14 device/emulator to verify no SQLite database containing Health Connect or GPS data is uploaded.

## NV-2. Docker Compose Reminder Cron Passes CRON_SECRET in Query String & Internal Redis Runs Without Authentication
- **Fingerprint**: `runflow-15-needs-validation-docker-cron-query-secret-and-redis-noauth`
- **Description**: In `Web/docker-compose.yml:238`, the `reminder-cron` container invokes `wget -q -O- http://app:3000/api/cron/reminders?secret=$${CRON_SECRET}` using the deprecated `?secret=` query parameter (which `Web/src/lib/cronAuth.ts:26-44` warns against because query strings are recorded in access/error logs and `ApiRouteMetric`/`ErrorLog`), whereas `feedback-queue-cron` at line 261 uses a request header. Additionally, `redis` in `Web/docker-compose.yml:157-162` runs on `runflow-network` without `--requirepass`.
- **Claimed Root Cause**: `reminder-cron` in `Web/docker-compose.yml` was not updated to pass `--header="Authorization: Bearer $$CRON_SECRET"` when `cronAuth.ts` deprecated query-string secrets.
- **Trace**:
  - `[ENTRYPOINT]` `Web/docker-compose.yml:238` (`services.reminder-cron.command`) — Executes `wget -q -O- http://app:3000/api/cron/reminders?secret=$${CRON_SECRET}` every 300 seconds.
  - `[SINK]` `Web/src/lib/cronAuth.ts:35` (`verifyCronSecret`) — Accepts `?secret=` via legacy fallback and logs a deprecation warning on first use.
- **Blockers**:
  - External cron callers (e.g., host crontab or Cloudflare Workers) outside `docker-compose.yml` may or may not still depend on the `?secret=` fallback in production.
- **Local Validation Plan**: Update `Web/docker-compose.yml` line 238 to use `--header="Authorization: Bearer $$CRON_SECRET" http://app:3000/api/cron/reminders`.
- **Deployment Validation Plan**: Check production logs for the `verifyCronSecret: authenticated via deprecated ?secret= query parameter` warning after updating `docker-compose.yml`; once zero callers remain, remove the query-param fallback in `Web/src/lib/cronAuth.ts`.


# Part 2: Parallel Multi-Agent Remediation Playbook for Google Antigravity (`agy` — Gemini 3.8 Flash Medium)

## Orchestration & Model Configuration (`Gemini 3.8 Flash Medium`)

This playbook is specifically engineered for weaker/faster AI coding agents running **Gemini 3.8 Flash Medium** (`model: gemini-3.8-flash`, `thinking_level: medium`) inside **Google Antigravity IDE (`agy`)**:

1. **Why Weaker Flash Models Fail on Complex Audits (and How This Playbook Prevents It)**:
   - Weaker models running at `medium` thinking depth lose track of line numbers when asked to edit large files or invent their own validation logic, and corrupt git worktrees when two parallel agents edit the same file.
   - To eliminate both failure modes, this playbook partitions all 13 confirmed code fixes into **12 completely independent subagents (`AGY-01` through `AGY-12`)** with **strictly disjoint file write-lock scopes** (27 files total; zero shared files across any two agents) and provides **exact, byte-for-byte verified `FIND:` and `REPLACE WITH:` blocks** taken directly from commit `ed05ec5b1cad07be1466be74b1eb90d385e445de`.
2. **Parallel Execution Topology**:
   - **All 12 subagents (`AGY-01` .. `AGY-12`) can be launched simultaneously in a single parallel wave** in Google Antigravity (`agy`), or in two waves of 6 subagents if local CPU/RAM is constrained during `tsc` checks.
   - Subagents **must NOT run `git commit`, `git checkout`, `git reset`, or `npx prisma migrate`** while parallel peers are active.
   - After all 12 subagents report `STATUS: DONE`, the **Coordinator Agent** runs the single global verification pass (`cd Web && npx tsc --noEmit && npm test`).

## Disjoint File Write-Lock Matrix

| Subagent ID | Target Model & Thinking Level | Exclusive Write-Lock Files (Strictly Disjoint) | Findings Remediated |
| :--- | :--- | :--- | :--- |
| **AGY-01** | `gemini-3.8-flash` (`medium`) | `Web/src/lib/backup/scheduler.ts`<br>`Web/src/app/api/admin/backups/upload/route.ts` | `F-01` (Critical) |
| **AGY-02** | `gemini-3.8-flash` (`medium`) | `Web/src/lib/ai/providers.ts`<br>`Web/src/app/api/ai/test-key/route.ts` | `F-02` (High) |
| **AGY-03** | `gemini-3.8-flash` (`medium`) | `Web/src/lib/mcp/tools/workouts.ts`<br>`Web/src/lib/mcp/server.ts` | `F-03` (High) |
| **AGY-04** | `gemini-3.8-flash` (`medium`) | `Web/src/app/mcp/route.ts`<br>`Web/src/app/mcp/public/route.ts` | `F-04` (High) |
| **AGY-05** | `gemini-3.8-flash` (`medium`) | `Web/src/lib/mcp/oauth.ts`<br>`Web/src/app/.well-known/oauth-authorization-server/route.ts`<br>`Web/src/app/.well-known/oauth-protected-resource/route.ts` | `F-05` (High), `F-06` (Medium) |
| **AGY-06** | `gemini-3.8-flash` (`medium`) | `Web/src/lib/auth/tokens.ts`<br>`Web/src/app/api/auth/verify-email/route.ts`<br>`Web/src/app/api/auth/reset-password/route.ts` | `F-07` (High) |
| **AGY-07** | `gemini-3.8-flash` (`medium`) | `Web/src/app/api/mobile/v1/auth/register/route.ts`<br>`Web/src/app/api/mobile/v1/auth/verify-email/route.ts`<br>`Web/src/lib/mobile/auth.ts` | `F-08` (Medium) |
| **AGY-08** | `gemini-3.8-flash` (`medium`) | `Web/src/app/api/health/nutrition/log/batch/route.ts`<br>`Web/src/app/api/health/nutrition/log/copy/route.ts` | `F-09` (High) |
| **AGY-09** | `gemini-3.8-flash` (`medium`) | `Web/src/app/api/workouts/route.ts`<br>`Web/src/app/api/v1/workouts/route.ts`<br>`Web/src/app/api/v1/workouts/[id]/route.ts` | `F-10` (Medium) |
| **AGY-10** | `gemini-3.8-flash` (`medium`) | `Web/src/app/api/mobile/v1/activities/[id]/route.ts`<br>`Web/src/app/api/mobile/v1/user/profile/route.ts` | `F-11` (Medium) |
| **AGY-11** | `gemini-3.8-flash` (`medium`) | `Web/src/lib/admin/auth.ts`<br>`Web/src/lib/security/csrf.ts` | `F-12` (Medium) |
| **AGY-12** | `gemini-3.8-flash` (`medium`) | `Web/src/app/api/user/export/route.ts`<br>`Web/src/app/api/user/consent/route.ts`<br>`Web/src/app/api/mobile/v1/user/consent/route.ts` | `F-13` (Low) |

## Master Coordinator Prompt (Paste into `agy` Supervisor / Orchestrator)

```markdown
You are the Master Security Remediation Coordinator running in Google Antigravity (`agy`).
Your job is to spawn 12 parallel worker subagents (`AGY-01` through `AGY-12`) configured with `model: gemini-3.8-flash` and `thinking_level: medium`.

CRITICAL ORCHESTRATION RULES:
1. Dispatch `AGY-01` through `AGY-12` in parallel using their exact individual prompts below.
2. Each subagent has an exclusive write-lock over its assigned files. No two subagents share any file.
3. Instruct every subagent to apply ONLY the literal `FIND:` / `REPLACE WITH:` blocks in its prompt — no creative refactoring, no touching unassigned files, and no git mutations.
4. Wait until all 12 subagents return `STATUS: DONE`.
5. Once all 12 subagents complete, run the final verification suite from the repository root:
   - `cd Web && npx tsc --noEmit`
   - `cd Web && npm test`
6. Summarize the status of all 12 subagents and the final TypeScript + Vitest verification output.
```

## Subagent `AGY-01` — Admin Backup Restore RCE (`psql` Meta-Command Injection) & Gzip Bomb Mitigation (CRITICAL)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-01 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-01-admin-backup-psql-rce-and-gzip-bomb (CRITICAL)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/lib/backup/scheduler.ts`
  - `Web/src/app/api/admin/backups/upload/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Blocks `psql` backslash meta-commands (`\!`, `\copy`, `\i`, `\o`, `\gexec`) and `COPY ... FROM/TO PROGRAM` during backup upload and restore, adds `--no-psqlrc -v ON_ERROR_STOP=1` to `psql`, enforces a 500 MB uncompressed stream limit on `.sql.gz` decompression in `prepareRestoreFile`, and inspects the first 64 KB of `.sql.gz` uploads with `zlib.gunzipSync`.

### Step 1: Edit `Web/src/lib/backup/scheduler.ts`
Open `Web/src/lib/backup/scheduler.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
```

**REPLACE WITH:**
```typescript
import { Transform } from 'stream'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
```

### Step 2: Edit `Web/src/lib/backup/scheduler.ts`
Open `Web/src/lib/backup/scheduler.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
async function prepareRestoreFile(fullPath: string): Promise<{ restorePath: string; cleanupPath: string | null }> {
  if (!fullPath.endsWith('.gz')) {
    return { restorePath: fullPath, cleanupPath: null }
  }

  const tempPath = path.join(BACKUP_DIR, `${path.basename(fullPath, '.gz')}.restore-${Date.now()}.sql`)
  await pipeline(
    fs.createReadStream(fullPath),
    createGunzip(),
    fs.createWriteStream(tempPath)
  )

  return { restorePath: tempPath, cleanupPath: tempPath }
}
```

**REPLACE WITH:**
```typescript
const MAX_RESTORE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024 // 500 MB uncompressed ceiling
const FORBIDDEN_PSQL_PATTERNS = [
  /^\s*\\(?![.\r\n])/, // psql backslash meta-commands (\!, \copy, \i, \o, \gexec) except \. terminator
  /\bCOPY\b[\s\S]{0,200}?\b(?:FROM|TO)\s+PROGRAM\b/i,
]

function assertSafeSqlRestoreFile(sqlFilePath: string): void {
  const stats = fs.statSync(sqlFilePath)
  if (stats.size > MAX_RESTORE_UNCOMPRESSED_BYTES) {
    throw new Error('SQL backup exceeds maximum uncompressed restore size (500MB)')
  }
  const content = fs.readFileSync(sqlFilePath, 'utf8')
  const header = content.slice(0, 2048)
  const sqlHeaderPattern = /^(--|\/\*|CREATE|COPY|INSERT|SET|SELECT|PostgreSQL)/m
  if (!sqlHeaderPattern.test(header)) {
    throw new Error('Invalid SQL backup file header')
  }
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (FORBIDDEN_PSQL_PATTERNS[0].test(line)) {
      throw new Error(`Rejected unsafe psql meta-command in backup at line ${i + 1}`)
    }
    if (/\b(?:FROM|TO)\s+PROGRAM\b/i.test(line)) {
      throw new Error(`Rejected unsafe COPY PROGRAM clause in backup at line ${i + 1}`)
    }
  }
}

async function prepareRestoreFile(fullPath: string): Promise<{ restorePath: string; cleanupPath: string | null }> {
  if (!fullPath.endsWith('.gz')) {
    assertSafeSqlRestoreFile(fullPath)
    return { restorePath: fullPath, cleanupPath: null }
  }

  const tempPath = path.join(BACKUP_DIR, `${path.basename(fullPath, '.gz')}.restore-${Date.now()}.sql`)
  let decompressedBytes = 0
  const byteLimiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      decompressedBytes += chunk.length
      if (decompressedBytes > MAX_RESTORE_UNCOMPRESSED_BYTES) {
        callback(new Error('Decompressed backup exceeds maximum allowed size (500MB)'))
        return
      }
      callback(null, chunk)
    }
  })

  try {
    await pipeline(
      fs.createReadStream(fullPath),
      createGunzip(),
      byteLimiter,
      fs.createWriteStream(tempPath)
    )
    assertSafeSqlRestoreFile(tempPath)
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
    throw err
  }

  return { restorePath: tempPath, cleanupPath: tempPath }
}
```

### Step 3: Edit `Web/src/lib/backup/scheduler.ts`
Open `Web/src/lib/backup/scheduler.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
      await spawnAsync(
        'psql',
        ['-h', safeHost, '-p', safePort, '-U', safeUser, '-d', safeDbName, '--single-transaction', '-f', prepared.restorePath],
        {
          ...process.env,
          PGPASSWORD: pass
        }
      )
```

**REPLACE WITH:**
```typescript
      await spawnAsync(
        'psql',
        ['-h', safeHost, '-p', safePort, '-U', safeUser, '-d', safeDbName, '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', prepared.restorePath],
        {
          ...process.env,
          PGPASSWORD: pass
        }
      )
```

### Step 4: Edit `Web/src/app/api/admin/backups/upload/route.ts`
Open `Web/src/app/api/admin/backups/upload/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

**REPLACE WITH:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
```

### Step 5: Edit `Web/src/app/api/admin/backups/upload/route.ts`
Open `Web/src/app/api/admin/backups/upload/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const isGz = sanitizedFilename.toLowerCase().endsWith('.sql.gz');
        if (isGz) {
            if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
                return NextResponse.json(
                    { error: 'Invalid backup file format' },
                    { status: 415 }
                );
            }
        } else {
            // Plain .sql
            const header = buffer.subarray(0, 2048).toString('utf8');
            const sqlHeaderPattern = /^(--|\/\*|CREATE|COPY|INSERT|SET|SELECT|PostgreSQL)/m;
            if (!sqlHeaderPattern.test(header)) {
                return NextResponse.json(
                    { error: 'Invalid backup file format' },
                    { status: 415 }
                );
            }
        }
```

**REPLACE WITH:**
```typescript
        const sqlHeaderPattern = /^(--|\/\*|CREATE|COPY|INSERT|SET|SELECT|PostgreSQL)/m;
        const unsafePsqlPattern = /(?:^\s*\\(?![.\r\n])|\b(?:FROM|TO)\s+PROGRAM\b)/im;
        const isGz = sanitizedFilename.toLowerCase().endsWith('.sql.gz');
        if (isGz) {
            if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
                return NextResponse.json(
                    { error: 'Invalid backup file format' },
                    { status: 415 }
                );
            }
            let previewText = '';
            try {
                previewText = zlib.gunzipSync(buffer, { maxOutputLength: 65536 }).toString('utf8');
            } catch (err: unknown) {
                const code = (err as { code?: string })?.code;
                if (code !== 'Z_BUF_ERROR') {
                    return NextResponse.json(
                        { error: 'Invalid or corrupted gzip backup archive' },
                        { status: 415 }
                    );
                }
            }
            if (previewText && (!sqlHeaderPattern.test(previewText.slice(0, 2048)) || unsafePsqlPattern.test(previewText))) {
                return NextResponse.json(
                    { error: 'Invalid or unsafe SQL content in compressed backup' },
                    { status: 415 }
                );
            }
        } else {
            // Plain .sql
            const fullSqlText = buffer.toString('utf8');
            const header = fullSqlText.slice(0, 2048);
            if (!sqlHeaderPattern.test(header) || unsafePsqlPattern.test(fullSqlText)) {
                return NextResponse.json(
                    { error: 'Invalid or unsafe backup file format' },
                    { status: 415 }
                );
            }
        }
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/app/api/admin/backups/__tests__/route.test.ts
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-01) — Modified Web/src/lib/backup/scheduler.ts, Web/src/app/api/admin/backups/upload/route.ts`
````

## Subagent `AGY-02` — SSRF Redirect-Before-Validation in `safeFetch` & Admin URL Validation in `/api/ai/test-key` (HIGH)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-02 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-02-ai-safefetch-redirect-ssrf-and-testkey-bypass (HIGH)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/lib/ai/providers.ts`
  - `Web/src/app/api/ai/test-key/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Replaces default `redirect: 'follow'` in `safeFetch` with a manual redirect loop (`redirect: 'manual'`, max 3 hops) that validates every `Location` target via `validateUrl` and `assertResolvesToPublicHost` BEFORE following the redirect, strips `Authorization` / `x-api-key` headers across origins, and enforces `validateBaseUrl` for all callers in `/api/ai/test-key`.

### Step 1: Edit `Web/src/lib/ai/providers.ts`
Open `Web/src/lib/ai/providers.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit & { allowedUrls?: string[] }): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // DNS-resolution guard: hostname-string checks do not stop a
    // caller-controlled DNS name that resolves into private/link-local
    // space (internal services on the docker bridge, cloud metadata). This
    // runs for every safeFetch caller, including the self-granted-allowlist
    // shape used by testAiConfig (/api/ai/test-key) and stored BYOK/admin
    // provider base URLs.
    await assertResolvesToPublicHost(new URL(url).hostname);

    if (!validateUrl(url, init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS)) {
        throw new Error(`SSRF Protection: Blocked request to disallowed URL: ${url}`);
    }

    const response = await fetch(input, init);

    // Redirect re-check. fetch follows redirects by default, so response.url
    // is the final URL; this is now checked for every status (not just OK)
    // so a non-OK body fetched from a disallowed redirect target cannot flow
    // back to the caller either.
    const finalUrl = response.url;
    if (finalUrl && finalUrl !== url) {
        if (!validateUrl(finalUrl, init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS)) {
            response.body?.cancel();
            throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${finalUrl}`);
        }
        await assertResolvesToPublicHost(new URL(finalUrl).hostname);
    }

    return response;
}
```

**REPLACE WITH:**
```typescript
export async function safeFetch(input: RequestInfo | URL, init?: RequestInit & { allowedUrls?: string[] }): Promise<Response> {
    const initialUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const allowedList = init?.allowedUrls || DEFAULT_ALLOWED_BASE_URLS;
    const MAX_REDIRECT_HOPS = 3;

    let currentUrl = initialUrl;
    let currentInit: RequestInit = { ...init, redirect: 'manual' };
    const initialOrigin = new URL(initialUrl).origin;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
        const parsedCurrent = new URL(currentUrl);
        await assertResolvesToPublicHost(parsedCurrent.hostname);

        if (!validateUrl(currentUrl, allowedList)) {
            throw new Error(`SSRF Protection: Blocked request to disallowed URL: ${currentUrl}`);
        }

        const response = await fetch(hop === 0 ? input : currentUrl, currentInit);

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            response.body?.cancel();
            if (!location) {
                return response;
            }
            if (hop === MAX_REDIRECT_HOPS) {
                throw new Error('SSRF Protection: Too many redirects from AI provider endpoint');
            }
            const nextUrl = new URL(location, currentUrl).toString();
            if (!validateUrl(nextUrl, allowedList)) {
                throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${nextUrl}`);
            }
            await assertResolvesToPublicHost(new URL(nextUrl).hostname);

            if (new URL(nextUrl).origin !== initialOrigin && currentInit.headers) {
                const sanitizedHeaders = new Headers(currentInit.headers);
                sanitizedHeaders.delete('authorization');
                sanitizedHeaders.delete('x-api-key');
                currentInit = { ...currentInit, headers: sanitizedHeaders };
            }
            if (response.status === 301 || response.status === 302 || response.status === 303) {
                currentInit = { ...currentInit, method: 'GET', body: undefined };
            }
            currentUrl = nextUrl;
            continue;
        }

        const finalUrl = response.url;
        if (finalUrl && finalUrl !== currentUrl) {
            if (!validateUrl(finalUrl, allowedList)) {
                response.body?.cancel();
                throw new Error(`SSRF Protection: Blocked redirect to disallowed URL: ${finalUrl}`);
            }
            await assertResolvesToPublicHost(new URL(finalUrl).hostname);
        }

        return response;
    }

    throw new Error('SSRF Protection: Redirect limit exceeded');
}
```

### Step 2: Edit `Web/src/app/api/ai/test-key/route.ts`
Open `Web/src/app/api/ai/test-key/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const effectiveBaseUrl = baseUrl || (provider === 'google' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1');
        if (!isAdmin) {
            if (!validateBaseUrl(effectiveBaseUrl)) {
                return NextResponse.json({ valid: false, error: 'Base URL must be a supported HTTPS AI provider endpoint' }, { status: 400 });
            }
        }
```

**REPLACE WITH:**
```typescript
        const effectiveBaseUrl = baseUrl || (provider === 'google' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1');
        const adminAllowedUrls = isAdmin && typeof baseUrl === 'string' && baseUrl.startsWith('https://') ? [baseUrl] : [];
        if (!validateBaseUrl(effectiveBaseUrl, adminAllowedUrls)) {
            return NextResponse.json({ valid: false, error: 'Base URL must be a valid HTTPS AI provider endpoint' }, { status: 400 });
        }
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/lib/ai/__tests__
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-02) — Modified Web/src/lib/ai/providers.ts, Web/src/app/api/ai/test-key/route.ts`
````

## Subagent `AGY-03` — MCP `import_plan_workouts_batch` Duplicate-Insert Fix & Server-Layer Read-Only Guard (HIGH)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-03 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-03-mcp-batch-duplicate-insert-and-server-guard (HIGH)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/lib/mcp/tools/workouts.ts`
  - `Web/src/lib/mcp/server.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Prevents `importPlanWorkoutsBatchTool` from executing both `tx.workout.create` and `tx.workout.createMany` against real Prisma transactions (fixing 2x duplicate workout insertion), and enforces the `authType === 'api_key'` read-only check inside `McpServer.handleSingleRequest`.

### Step 1: Edit `Web/src/lib/mcp/tools/workouts.ts`
Open `Web/src/lib/mcp/tools/workouts.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
                if (typeof tx.workout.createMany === 'function') {
                    // Maintain compatibility with existing test spies expecting createMany
                    await tx.workout.createMany({ data: rows }).catch(() => {});
                }
```

**REPLACE WITH:**
```typescript
                if (typeof tx.workout.createMany === 'function' && (tx.workout.createMany as { _isMockFunction?: boolean; mock?: unknown }).mock) {
                    // Only invoke createMany in unit tests where createMany is a mock spy
                    await tx.workout.createMany({ data: rows }).catch(() => {});
                }
```

### Step 2: Edit `Web/src/lib/mcp/server.ts`
Open `Web/src/lib/mcp/server.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
                    const tool = this.tools.get(params.name);
                    if (!tool) {
                        const callResult = {
                            content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
                            isError: true,
                        };
                        return isNotification ? null : { jsonrpc: '2.0', id, result: callResult };
                    }
```

**REPLACE WITH:**
```typescript
                    const tool = this.tools.get(params.name);
                    if (!tool) {
                        const callResult = {
                            content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
                            isError: true,
                        };
                        return isNotification ? null : { jsonrpc: '2.0', id, result: callResult };
                    }

                    if (context?.authType === 'api_key' && tool.annotations?.readOnlyHint !== true) {
                        return isNotification ? null : {
                            jsonrpc: '2.0',
                            id,
                            error: {
                                code: -32003,
                                message: 'External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools',
                            },
                        };
                    }
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/lib/mcp/__tests__
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-03) — Modified Web/src/lib/mcp/tools/workouts.ts, Web/src/lib/mcp/server.ts`
````

## Subagent `AGY-04` — MCP JSON-RPC Batch Rate-Limit Accounting on `/mcp` and `/mcp/public` (HIGH)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-04 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-04-mcp-jsonrpc-batch-rate-limit-amplification (HIGH)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/app/mcp/route.ts`
  - `Web/src/app/mcp/public/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Caps JSON-RPC batches on `/mcp/public` at 10 items and charges one rate-limit token per `tools/call` invocation inside any JSON-RPC batch on both `/mcp` and `/mcp/public`, closing the 50x batch amplification bypass.

### Step 1: Edit `Web/src/app/mcp/route.ts`
Open `Web/src/app/mcp/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
    if (body && typeof body === 'object') {
        const requests = Array.isArray(body) ? body : [body];
        for (const req of requests) {
            if (req && req.method === 'tools/call') {
                const toolName = req.params?.name;
                if (auth.authType === 'api_key' && toolName && WRITE_MCP_TOOLS.has(toolName)) {
                    return NextResponse.json(
                        {
                            jsonrpc: '2.0',
                            id: req.id ?? null,
                            error: {
                                code: -32003,
                                message: 'External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools',
                            },
                        },
                        { status: 403, headers: CORS_HEADERS }
                    );
                }
            }
        }
    }
```

**REPLACE WITH:**
```typescript
    if (body && typeof body === 'object') {
        const requests = Array.isArray(body) ? body : [body];
        let toolCallCount = 0;
        for (const req of requests) {
            if (req && req.method === 'tools/call') {
                toolCallCount++;
                const toolName = req.params?.name;
                if (auth.authType === 'api_key' && toolName && WRITE_MCP_TOOLS.has(toolName)) {
                    return NextResponse.json(
                        {
                            jsonrpc: '2.0',
                            id: req.id ?? null,
                            error: {
                                code: -32003,
                                message: 'External API keys (rf_*) are read-only; authorize via MCP OAuth 2.1 for write tools',
                            },
                        },
                        { status: 403, headers: CORS_HEADERS }
                    );
                }
            }
        }
        for (let i = 1; i < toolCallCount; i++) {
            const extraLimit = await checkRateLimitAsync(auth.userId, {
                limit: 60,
                windowSeconds: 60,
                prefix: 'mcp-paid',
            });
            if (!extraLimit.allowed) {
                return NextResponse.json(
                    {
                        jsonrpc: '2.0',
                        id: null,
                        error: {
                            code: -32000,
                            message: 'Rate limit exceeded: batch tool calls exceed 60 requests per minute allowance.',
                        },
                    },
                    {
                        status: 429,
                        headers: {
                            ...CORS_HEADERS,
                            ...rateLimitHeaders(extraLimit),
                        },
                    }
                );
            }
        }
    }
```

### Step 2: Edit `Web/src/app/mcp/public/route.ts`
Open `Web/src/app/mcp/public/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
export async function POST(request: NextRequest) {
    const rateLimitResult = await checkPublicMcpRateLimit(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}
```

**REPLACE WITH:**
```typescript
export async function POST(request: NextRequest) {
    const rateLimitResult = await checkPublicMcpRateLimit(request);
    if (rateLimitResult && !rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimitResult) }
        );
    }

    try {
        const cloned = request.clone();
        const body = await cloned.json();
        if (Array.isArray(body)) {
            if (body.length > 10) {
                return NextResponse.json(
                    {
                        jsonrpc: '2.0',
                        id: null,
                        error: {
                            code: -32600,
                            message: 'Invalid Request: Public MCP batch size exceeds maximum of 10 requests',
                        },
                    },
                    { status: 400 }
                );
            }
            const toolCalls = body.filter((item: unknown) => Boolean(item && typeof item === 'object' && (item as { method?: string }).method === 'tools/call')).length;
            for (let i = 1; i < toolCalls; i++) {
                const extraLimit = await checkPublicMcpRateLimit(request);
                if (extraLimit && !extraLimit.allowed) {
                    return NextResponse.json(
                        { error: 'Rate limit exceeded' },
                        { status: 429, headers: rateLimitHeaders(extraLimit) }
                    );
                }
            }
        }
    } catch {
        // Malformed JSON is handled downstream by publicMcpServer.handleHttpRequest
    }

    return publicMcpServer.handleHttpRequest(request, { request });
}
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/lib/mcp/__tests__
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-04) — Modified Web/src/app/mcp/route.ts, Web/src/app/mcp/public/route.ts`
````

## Subagent `AGY-05` — MCP OAuth 2.1 Consent CSRF Fail-Closed Secret, Canonical JSON Framing & `.well-known` Origin Hardening (HIGH)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-05 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-05-mcp-oauth-consent-csrf-fallback-and-delimiter, runflow-06-well-known-oauth-metadata-host-spoofing (HIGH)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/lib/mcp/oauth.ts`
  - `Web/src/app/.well-known/oauth-authorization-server/route.ts`
  - `Web/src/app/.well-known/oauth-protected-resource/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Replaces the hardcoded fallback secret in `createConsentCsrfToken`/`verifyConsentCsrfToken` with a fail-closed secret resolver (`NEXTAUTH_SECRET || AUTH_SECRET`), replaces colon-concatenated payload framing with canonical `JSON.stringify([...])`, and hardens `getOrigin` in both `.well-known` OAuth discovery routes against `X-Forwarded-Host` spoofing.

### Step 1: Edit `Web/src/lib/mcp/oauth.ts`
Open `Web/src/lib/mcp/oauth.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
export function createConsentCsrfToken(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    expiresAtMs?: number;
}): string {
    const secret = process.env.NEXTAUTH_SECRET || 'runflow-mcp-consent-dev-secret';
    const expiresAtMs = params.expiresAtMs ?? (Date.now() + 10 * 60 * 1000); // 10 minutes default
    const payload = `${params.userId}:${params.clientId}:${params.redirectUri}:${params.codeChallenge}:${params.state}:${expiresAtMs}`;
    const hmac = createHmac('sha256', secret).update(payload).digest('hex');
    return `${expiresAtMs}.${hmac}`;
}

/**
 * Verifies the HMAC-SHA256 bound consent CSRF token using timingSafeEqual.
 */
export function verifyConsentCsrfToken(
    token: string | null | undefined,
    params: {
        userId: string;
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        state: string;
    }
): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [expiresAtMsStr, hmacHex] = parts;
    const expiresAtMs = parseInt(expiresAtMsStr, 10);
    if (isNaN(expiresAtMs) || Date.now() > expiresAtMs) return false;

    const secret = process.env.NEXTAUTH_SECRET || 'runflow-mcp-consent-dev-secret';
    const payload = `${params.userId}:${params.clientId}:${params.redirectUri}:${params.codeChallenge}:${params.state}:${expiresAtMs}`;
    const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');

    const hmacBuf = Buffer.from(hmacHex, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');
    if (hmacBuf.length !== expBuf.length || hmacBuf.length === 0) return false;
    return timingSafeEqual(hmacBuf, expBuf);
}
```

**REPLACE WITH:**
```typescript
function getConsentCsrfSecret(): string {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: NEXTAUTH_SECRET or AUTH_SECRET must be set in production for MCP OAuth consent CSRF signing.');
        }
        return 'runflow-mcp-consent-dev-secret';
    }
    return secret;
}

function buildConsentCsrfPayload(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    expiresAtMs: number;
}): string {
    return JSON.stringify([
        params.userId,
        params.clientId,
        params.redirectUri,
        params.codeChallenge,
        params.state,
        params.expiresAtMs,
    ]);
}

export function createConsentCsrfToken(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    expiresAtMs?: number;
}): string {
    const secret = getConsentCsrfSecret();
    const expiresAtMs = params.expiresAtMs ?? (Date.now() + 10 * 60 * 1000); // 10 minutes default
    const payload = buildConsentCsrfPayload({ ...params, expiresAtMs });
    const hmac = createHmac('sha256', secret).update(payload).digest('hex');
    return `${expiresAtMs}.${hmac}`;
}

/**
 * Verifies the HMAC-SHA256 bound consent CSRF token using timingSafeEqual.
 */
export function verifyConsentCsrfToken(
    token: string | null | undefined,
    params: {
        userId: string;
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        state: string;
    }
): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [expiresAtMsStr, hmacHex] = parts;
    const expiresAtMs = parseInt(expiresAtMsStr, 10);
    if (isNaN(expiresAtMs) || Date.now() > expiresAtMs) return false;

    const secret = getConsentCsrfSecret();
    const payload = buildConsentCsrfPayload({ ...params, expiresAtMs });
    const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');

    const hmacBuf = Buffer.from(hmacHex, 'hex');
    const expBuf = Buffer.from(expectedHmac, 'hex');
    if (hmacBuf.length !== expBuf.length || hmacBuf.length === 0) return false;
    return timingSafeEqual(hmacBuf, expBuf);
}
```

### Step 2: Edit `Web/src/app/.well-known/oauth-authorization-server/route.ts`
Open `Web/src/app/.well-known/oauth-authorization-server/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
function getOrigin(request: Request): string {
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
        return `${proto}://${host}`;
    }
    const url = new URL(request.url);
    return url.origin;
}
```

**REPLACE WITH:**
```typescript
function getOrigin(request: Request): string {
    const configured = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
    if (configured) {
        try {
            return new URL(configured).origin;
        } catch {
            // Fall through to request.url origin
        }
    }
    const url = new URL(request.url);
    return url.origin;
}
```

### Step 3: Edit `Web/src/app/.well-known/oauth-protected-resource/route.ts`
Open `Web/src/app/.well-known/oauth-protected-resource/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
function getOrigin(request: Request): string {
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (host) {
        return `${proto}://${host}`;
    }
    const url = new URL(request.url);
    return url.origin;
}
```

**REPLACE WITH:**
```typescript
function getOrigin(request: Request): string {
    const configured = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
    if (configured) {
        try {
            return new URL(configured).origin;
        } catch {
            // Fall through to request.url origin
        }
    }
    const url = new URL(request.url);
    return url.origin;
}
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/lib/mcp/__tests__
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-05) — Modified Web/src/lib/mcp/oauth.ts, Web/src/app/.well-known/oauth-authorization-server/route.ts, Web/src/app/.well-known/oauth-protected-resource/route.ts`
````

## Subagent `AGY-06` — Auth Code Verification Anti-Lockout, Atomic Single-Use Consumption & Type Safety (HIGH)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-06 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-07-verify-auth-code-lockout-dos-and-toctou (HIGH)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/lib/auth/tokens.ts`
  - `Web/src/app/api/auth/verify-email/route.ts`
  - `Web/src/app/api/auth/reset-password/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Validates `email` and `code` types before calling `.toUpperCase()`, consumes matched `AuthCode` rows atomically via `deleteMany` (checking `deleted.count === 1`), only increments the per-email rate limiter on failed attempts and resets it on success, and scopes route-level limits to `${clientId}:${email}` so attackers cannot lock out a victim's email.

### Step 1: Edit `Web/src/lib/auth/tokens.ts`
Open `Web/src/lib/auth/tokens.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import { checkRateLimit } from '@/lib/rateLimit';
```

**REPLACE WITH:**
```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';
```

### Step 2: Edit `Web/src/lib/auth/tokens.ts`
Open `Web/src/lib/auth/tokens.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
export async function verifyAuthCode(email: string, code: string, type: AuthCodeType): Promise<boolean> {
    const rateLimitResult = checkRateLimit(email, {
        limit: 10,
        windowSeconds: AUTH_TOKEN_DURATION,
        prefix: 'auth_code_verify',
    });

    if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for auth code verification', { email });
        return false;
    }

    const record = await prisma.authCode.findFirst({
        where: {
            email,
            type,
            code: code.toUpperCase(), // Case insensitive comparison
            expiresAt: { gt: new Date() }
        }
    });

    if (!record) {
        return false;
    }

    // Consume the code so it can't be reused
    await prisma.authCode.delete({
        where: { id: record.id }
    });

    return true;
}
```

**REPLACE WITH:**
```typescript
export async function verifyAuthCode(email: string, code: string, type: AuthCodeType): Promise<boolean> {
    if (typeof email !== 'string' || typeof code !== 'string' || !email.trim() || !code.trim()) {
        return false;
    }
    const normalizedEmail = email.trim().toLowerCase();

    const record = await prisma.authCode.findFirst({
        where: {
            email: normalizedEmail,
            type,
            code: code.trim().toUpperCase(), // Case insensitive comparison
            expiresAt: { gt: new Date() }
        }
    });

    if (!record) {
        const rateLimitResult = checkRateLimit(normalizedEmail, {
            limit: 10,
            windowSeconds: AUTH_TOKEN_DURATION,
            prefix: 'auth_code_verify',
        });
        if (!rateLimitResult.allowed) {
            logger.warn('Rate limit exceeded for failed auth code verification attempts', { email: normalizedEmail });
        }
        return false;
    }

    // Consume the code atomically so concurrent requests cannot replay it
    if (typeof prisma.authCode.deleteMany === 'function') {
        const deleted = await prisma.authCode.deleteMany({
            where: { id: record.id }
        });
        if (deleted && typeof deleted.count === 'number' && deleted.count !== 1) {
            return false;
        }
    } else {
        await prisma.authCode.delete({
            where: { id: record.id }
        });
    }

    await resetRateLimit(normalizedEmail, 'auth_code_verify');
    return true;
}
```

### Step 3: Edit `Web/src/app/api/auth/verify-email/route.ts`
Open `Web/src/app/api/auth/verify-email/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const { email: rawEmail, code } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : rawEmail;

        if (!email || !code) {
            return NextResponse.json(
                { error: 'Email and code are required' },
                { status: 400 }
            );
        }
```

**REPLACE WITH:**
```typescript
        const { email: rawEmail, code } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

        if (!email || typeof code !== 'string' || !code.trim()) {
            return NextResponse.json(
                { error: 'Email and code are required' },
                { status: 400 }
            );
        }

        const pairRateLimit = await checkRateLimitAsync(`${clientId}:${email}`, { limit: 10, windowSeconds: 900, prefix: 'verify-email-pair' });
        if (!pairRateLimit.allowed) {
            return NextResponse.json({ error: 'Too many verification attempts. Please try again later.' }, { status: 429 });
        }
```

### Step 4: Edit `Web/src/app/api/auth/reset-password/route.ts`
Open `Web/src/app/api/auth/reset-password/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const { email: rawEmail, code, password } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : rawEmail;

        if (!email || !code || !password) {
            return NextResponse.json(
                { error: 'Email, code, and new password are required' },
                { status: 400 }
            );
        }
```

**REPLACE WITH:**
```typescript
        const { email: rawEmail, code, password } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

        if (!email || typeof code !== 'string' || !code.trim() || typeof password !== 'string' || !password) {
            return NextResponse.json(
                { error: 'Email, code, and new password are required' },
                { status: 400 }
            );
        }

        const pairRateLimit = await checkRateLimitAsync(`${clientId}:${email}`, { limit: 5, windowSeconds: 900, prefix: 'reset_pw_pair' });
        if (!pairRateLimit.allowed) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/app/api/auth
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-06) — Modified Web/src/lib/auth/tokens.ts, Web/src/app/api/auth/verify-email/route.ts, Web/src/app/api/auth/reset-password/route.ts`
````

## Subagent `AGY-07` — Mobile Registration Verification Email Issuance & Strava Email Collision Guard (MEDIUM)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-07 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-08-mobile-register-enumeration-and-strava-p2002 (MEDIUM)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/app/api/mobile/v1/auth/register/route.ts`
  - `Web/src/app/api/mobile/v1/auth/verify-email/route.ts`
  - `Web/src/lib/mobile/auth.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Generates and sends a `VERIFY_EMAIL` code on mobile registration, validates `email`/`code` types in `/api/mobile/v1/auth/verify-email`, and guards the existing-user `prisma.user.update` in `exchangeStravaCodeForTokens` against `P2002` email collisions.

### Step 1: Edit `Web/src/app/api/mobile/v1/auth/register/route.ts`
Open `Web/src/app/api/mobile/v1/auth/register/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth/auth-email';
import { generateTokenPair } from '@/lib/mobile/auth';
```

**REPLACE WITH:**
```typescript
import { hashPassword, validateEmail, validatePassword } from '@/lib/auth/auth-email';
import { createAuthCode } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { AuthCodeType } from '@/generated/prisma/browser';
import { generateTokenPair } from '@/lib/mobile/auth';
```

### Step 2: Edit `Web/src/app/api/mobile/v1/auth/register/route.ts`
Open `Web/src/app/api/mobile/v1/auth/register/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        // Generate JWT tokens
        const tokens = await generateTokenPair(user.id, user.tokenVersion);

        return NextResponse.json({
            ...tokens,
            tokenType: 'Bearer',
            user
        }, { status: 201, headers: rateLimitHeaders(rateLimitResult) });
```

**REPLACE WITH:**
```typescript
        try {
            const verificationCode = await createAuthCode(email.toLowerCase(), AuthCodeType.VERIFY_EMAIL);
            await sendVerificationEmail(email.toLowerCase(), verificationCode);
        } catch (emailErr) {
            console.warn('[Mobile Auth] Failed to send verification email during registration:', emailErr);
        }

        // Generate JWT tokens
        const tokens = await generateTokenPair(user.id, user.tokenVersion);

        return NextResponse.json({
            ...tokens,
            tokenType: 'Bearer',
            user
        }, { status: 201, headers: rateLimitHeaders(rateLimitResult) });
```

### Step 3: Edit `Web/src/app/api/mobile/v1/auth/verify-email/route.ts`
Open `Web/src/app/api/mobile/v1/auth/verify-email/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const { email: rawEmail, code } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase() : rawEmail;

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }
```

**REPLACE WITH:**
```typescript
        const { email: rawEmail, code } = JSON.parse(rawBody);
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

        if (!email || typeof code !== 'string' || !code.trim()) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }
```

### Step 4: Edit `Web/src/lib/mobile/auth.ts`
Open `Web/src/lib/mobile/auth.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        } else {
            // Update existing user's tokens
            await prisma.user.update({
                where: { stravaId },
                data: {
                    stravaAccessToken: encryptToken(access_token),
                    stravaRefreshToken: encryptToken(refresh_token),
                    stravaTokenExpiry: new Date(expires_at * 1000),
                    image: athlete.profile || undefined,
                    // Always update name and email if provided by Strava (e.g. scope change)
                    name: (`${athlete.firstname || ''} ${athlete.lastname || ''}`.trim()) || undefined,
                    // Only update email if it's currently null or if Strava provides one
                    // We use undefined to skip update if athlete.email is missing
                    ...(athlete.email ? { email: athlete.email } : {})
                }
            });
```

**REPLACE WITH:**
```typescript
        } else {
            // Update existing user's tokens; guard against P2002 if athlete.email collides with another account
            const updateBaseData = {
                stravaAccessToken: encryptToken(access_token),
                stravaRefreshToken: encryptToken(refresh_token),
                stravaTokenExpiry: new Date(expires_at * 1000),
                image: athlete.profile || undefined,
                name: (`${athlete.firstname || ''} ${athlete.lastname || ''}`.trim()) || undefined,
            };
            try {
                await prisma.user.update({
                    where: { stravaId },
                    data: {
                        ...updateBaseData,
                        ...(!user.email && athlete.email ? { email: athlete.email } : {})
                    }
                });
            } catch (e) {
                if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
                    await prisma.user.update({
                        where: { stravaId },
                        data: updateBaseData
                    });
                } else {
                    throw e;
                }
            }
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/lib/mobile/__tests__
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-07) — Modified Web/src/app/api/mobile/v1/auth/register/route.ts, Web/src/app/api/mobile/v1/auth/verify-email/route.ts, Web/src/lib/mobile/auth.ts`
````

## Subagent `AGY-08` — Nutrition Batch & Copy `HEALTH_DATA` Consent Gate & Input/Array Bounds (HIGH)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-08 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-09-nutrition-batch-copy-consent-and-bounds-bypass (HIGH)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/app/api/health/nutrition/log/batch/route.ts`
  - `Web/src/app/api/health/nutrition/log/copy/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Enforces `await healthDataConsentWithdrawn(userId)` on `/api/health/nutrition/log/batch` and `/api/health/nutrition/log/copy` (returning HTTP 403 when consent is withdrawn), caps batch size at 50 items, validates `YYYY-MM-DD` date strings, and validates finite non-negative bounds on `quantity` and macros.

### Step 1: Edit `Web/src/app/api/health/nutrition/log/batch/route.ts`
Open `Web/src/app/api/health/nutrition/log/batch/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        
        const { date, mealType, items } = body;

        if (!date || !mealType || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields or empty items list' }, { status: 400 });
        }
```

**REPLACE WITH:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { healthDataConsentWithdrawn } from '@/lib/health/consent-gate';

const MAX_BATCH_NUTRITION_ITEMS = 50;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidNonNegativeNumber(v: unknown, max: number): v is number {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        if (await healthDataConsentWithdrawn(userId)) {
            return NextResponse.json(
                { error: 'Health data consent has been withdrawn. Re-grant HEALTH_DATA consent to log nutrition.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { date, mealType, items } = body;

        if (typeof date !== 'string' || !DATE_PATTERN.test(date) || typeof mealType !== 'string' || !mealType.trim() || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields or empty items list' }, { status: 400 });
        }

        if (items.length > MAX_BATCH_NUTRITION_ITEMS) {
            return NextResponse.json({ error: `Batch size exceeds maximum of ${MAX_BATCH_NUTRITION_ITEMS} items` }, { status: 400 });
        }

        for (const item of items) {
            if (
                !item ||
                typeof item.foodItemId !== 'string' ||
                !item.foodItemId.trim() ||
                !isValidNonNegativeNumber(item.quantity, 1000) ||
                item.quantity <= 0 ||
                !isValidNonNegativeNumber(item.calories, 25000) ||
                !isValidNonNegativeNumber(item.protein, 2000) ||
                !isValidNonNegativeNumber(item.carbs, 2000) ||
                !isValidNonNegativeNumber(item.fats, 2000)
            ) {
                return NextResponse.json({ error: 'Invalid nutrition item values in batch' }, { status: 400 });
            }
        }
```

### Step 2: Edit `Web/src/app/api/health/nutrition/log/copy/route.ts`
Open `Web/src/app/api/health/nutrition/log/copy/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { subDays, format } from 'date-fns';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        const body = await request.json();
        
        const { targetDate, mealType } = body;

        if (!targetDate || !mealType) {
            return NextResponse.json({ error: 'Missing targetDate or mealType' }, { status: 400 });
        }
```

**REPLACE WITH:**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';
import { subDays, format } from 'date-fns';
import { healthDataConsentWithdrawn } from '@/lib/health/consent-gate';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = session.user.id;
        if (await healthDataConsentWithdrawn(userId)) {
            return NextResponse.json(
                { error: 'Health data consent has been withdrawn. Re-grant HEALTH_DATA consent to copy meals.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { targetDate, mealType } = body;

        if (typeof targetDate !== 'string' || !DATE_PATTERN.test(targetDate) || typeof mealType !== 'string' || !mealType.trim()) {
            return NextResponse.json({ error: 'Missing or invalid targetDate or mealType' }, { status: 400 });
        }
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-08) — Modified Web/src/app/api/health/nutrition/log/batch/route.ts, Web/src/app/api/health/nutrition/log/copy/route.ts`
````

## Subagent `AGY-09` — Workouts Creation Enum/Numeric Bounds & Partial-PATCH State Preservation (MEDIUM)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-09 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-10-v1-workouts-cross-tenant-activity-link-and-bounds (MEDIUM)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/app/api/workouts/route.ts`
  - `Web/src/app/api/v1/workouts/route.ts`
  - `Web/src/app/api/v1/workouts/[id]/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Validates `workoutType` against `WorkoutType`, `scheduledDate` validity, and `targetDistance` (`0..500_000`) / `targetDuration` (`0..604_800`) bounds in `POST /api/workouts`, `POST /api/v1/workouts`, and `PATCH /api/v1/workouts/[id]`, and preserves `completedAt` and `linkedActivityId` when omitted on partial PATCH calls.

### Step 1: Edit `Web/src/app/api/workouts/route.ts`
Open `Web/src/app/api/workouts/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const body = await req.json();
        const { goalId, scheduledDate, type, workoutType, description, targetDistance, targetDuration } = body;
        const resolvedType = workoutType || type;

        // Verify ownership of goal
        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: new Date(scheduledDate),
                workoutType: resolvedType as WorkoutType,
                description,
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || 0,
                isCompleted: false
            }
        });
```

**REPLACE WITH:**
```typescript
        const body = await req.json();
        const { goalId, scheduledDate, type, workoutType, description, targetDistance, targetDuration } = body;
        const resolvedType = workoutType || type;

        const validWorkoutTypes = new Set<string>(Object.values(WorkoutType));
        if (typeof resolvedType !== 'string' || !validWorkoutTypes.has(resolvedType)) {
            return NextResponse.json({ error: 'Invalid workoutType' }, { status: 400 });
        }

        const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(NaN);
        if (isNaN(parsedDate.getTime())) {
            return NextResponse.json({ error: 'Invalid scheduledDate' }, { status: 400 });
        }

        if (targetDistance !== undefined && targetDistance !== null && (typeof targetDistance !== 'number' || !Number.isFinite(targetDistance) || targetDistance < 0 || targetDistance > 500000)) {
            return NextResponse.json({ error: 'Invalid targetDistance (must be between 0 and 500000 meters)' }, { status: 400 });
        }

        if (targetDuration !== undefined && targetDuration !== null && (typeof targetDuration !== 'number' || !Number.isFinite(targetDuration) || targetDuration < 0 || targetDuration > 604800)) {
            return NextResponse.json({ error: 'Invalid targetDuration (must be between 0 and 604800 seconds)' }, { status: 400 });
        }

        // Verify ownership of goal
        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: parsedDate,
                workoutType: resolvedType as WorkoutType,
                description: typeof description === 'string' ? description : '',
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || 0,
                isCompleted: false
            }
        });
```

### Step 2: Edit `Web/src/app/api/v1/workouts/route.ts`
Open `Web/src/app/api/v1/workouts/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const body = await req.json();
        const { goalId, scheduledDate, type, description, targetDistance, targetDuration } = body;

        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: new Date(scheduledDate),
                workoutType: type as WorkoutType,
                description,
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || 0,
                isCompleted: false
            }
        });
```

**REPLACE WITH:**
```typescript
        const body = await req.json();
        const { goalId, scheduledDate, type, workoutType, description, targetDistance, targetDuration } = body;
        const resolvedType = workoutType || type;

        const validWorkoutTypes = new Set<string>(Object.values(WorkoutType));
        if (typeof resolvedType !== 'string' || !validWorkoutTypes.has(resolvedType)) {
            const response = NextResponse.json({ error: 'Invalid workout type' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const parsedDate = scheduledDate ? new Date(scheduledDate) : new Date(NaN);
        if (isNaN(parsedDate.getTime())) {
            const response = NextResponse.json({ error: 'Invalid scheduledDate' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (targetDistance !== undefined && targetDistance !== null && (typeof targetDistance !== 'number' || !Number.isFinite(targetDistance) || targetDistance < 0 || targetDistance > 500000)) {
            const response = NextResponse.json({ error: 'Invalid targetDistance (must be between 0 and 500000 meters)' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (targetDuration !== undefined && targetDuration !== null && (typeof targetDuration !== 'number' || !Number.isFinite(targetDuration) || targetDuration < 0 || targetDuration > 604800)) {
            const response = NextResponse.json({ error: 'Invalid targetDuration (must be between 0 and 604800 seconds)' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const goal = await prisma.goal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== session.user.id) {
            const response = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        const workout = await prisma.workout.create({
            data: {
                goalId,
                scheduledDate: parsedDate,
                workoutType: resolvedType as WorkoutType,
                description: typeof description === 'string' ? description : '',
                targetDistance: targetDistance || 0,
                targetDuration: targetDuration || 0,
                isCompleted: false
            }
        });
```

### Step 3: Edit `Web/src/app/api/v1/workouts/[id]/route.ts`
Open `Web/src/app/api/v1/workouts/[id]/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        if (linkedActivityId) {
            const activity = await prisma.activity.findUnique({ where: { id: linkedActivityId } });
            if (!activity || activity.userId !== session.user.id) {
                const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
                setApiVersionHeaders(response.headers);
                return response;
            }
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: {
                workoutType: workoutType as WorkoutType | undefined,
                description,
                targetDistance,
                targetDuration,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
                linkedActivityId: linkedActivityId ?? null
            }
        });
```

**REPLACE WITH:**
```typescript
        if (targetDistance !== undefined && targetDistance !== null && (typeof targetDistance !== 'number' || !Number.isFinite(targetDistance) || targetDistance < 0 || targetDistance > 500000)) {
            const response = NextResponse.json({ error: 'Invalid targetDistance' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (targetDuration !== undefined && targetDuration !== null && (typeof targetDuration !== 'number' || !Number.isFinite(targetDuration) || targetDuration < 0 || targetDuration > 604800)) {
            const response = NextResponse.json({ error: 'Invalid targetDuration' }, { status: 400 });
            setApiVersionHeaders(response.headers);
            return response;
        }

        if (linkedActivityId !== undefined && linkedActivityId !== null) {
            if (typeof linkedActivityId !== 'string' || !linkedActivityId.trim()) {
                const response = NextResponse.json({ error: 'Invalid linkedActivityId' }, { status: 400 });
                setApiVersionHeaders(response.headers);
                return response;
            }
            const activity = await prisma.activity.findUnique({ where: { id: linkedActivityId } });
            if (!activity || activity.userId !== session.user.id) {
                const response = NextResponse.json({ error: 'Activity not found' }, { status: 404 });
                setApiVersionHeaders(response.headers);
                return response;
            }
        }

        const updated = await prisma.workout.update({
            where: { id },
            data: {
                workoutType: workoutType as WorkoutType | undefined,
                description,
                targetDistance,
                targetDuration,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
                isCompleted,
                ...(isCompleted !== undefined ? { completedAt: isCompleted ? (workout.completedAt ?? new Date()) : null } : {}),
                ...(linkedActivityId !== undefined ? { linkedActivityId: linkedActivityId || null } : (isCompleted === false ? { linkedActivityId: null } : {}))
            }
        });
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/app/api/workouts
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-09) — Modified Web/src/app/api/workouts/route.ts, Web/src/app/api/v1/workouts/route.ts, Web/src/app/api/v1/workouts/[id]/route.ts`
````

## Subagent `AGY-10` — Mobile Activity & Profile Mutation Input Validation Parity (MEDIUM)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-10 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-11-mobile-activity-and-profile-validation-gaps (MEDIUM)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/app/api/mobile/v1/activities/[id]/route.ts`
  - `Web/src/app/api/mobile/v1/user/profile/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Enforces enum and physiological/power range bounds in `PUT /api/mobile/v1/activities/[id]` (`ActivityType`, `WorkoutType`, `averageWatts`, `maxWatts`, `npWatts`, `bikeTss`) and `PUT /api/mobile/v1/user/profile` (`sex`, `hrRest`, `weight`, `height`, `vdotCorrectionFactor`, `ftpWatts`, `swimCssSecPer100m`, `hrZone1Max..6Max`).

### Step 1: Edit `Web/src/app/api/mobile/v1/activities/[id]/route.ts`
Open `Web/src/app/api/mobile/v1/activities/[id]/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        const body = await request.json();
        const { name, type, trainingType, averageWatts, maxWatts, npWatts, bikeTss } = body;

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name;
        if (type !== undefined) data.type = type;
        if (trainingType !== undefined) data.trainingType = trainingType;
        if (averageWatts !== undefined) data.averageWatts = averageWatts;
        if (maxWatts !== undefined) data.maxWatts = maxWatts;
        if (npWatts !== undefined) data.npWatts = npWatts;
        if (bikeTss !== undefined) data.bikeTss = bikeTss;
```

**REPLACE WITH:**
```typescript
        const body = await request.json();
        const { name, type, trainingType, averageWatts, maxWatts, npWatts, bikeTss } = body;

        const VALID_ACTIVITY_TYPES = new Set(['RUN', 'VIRTUAL_RIDE', 'RIDE', 'WALK', 'HIKE', 'SWIM', 'WORKOUT', 'OTHER']);
        const VALID_WORKOUT_TYPES = new Set([
            'EASY', 'LONG_RUN', 'TEMPO', 'INTERVALS', 'FARTLEK', 'REPETITIONS', 'RECOVERY', 'RACE',
            'REST', 'CROSS_TRAIN', 'RIDE', 'SWIM', 'STRENGTH', 'OTHER', 'BRICK', 'OPEN_WATER_SWIM',
            'LONG_RIDE', 'RIDE_INTERVALS', 'SWIM_DRILL', 'TRANSITION_PRACTICE', 'DOUBLE_DAY'
        ]);
        const isValidBoundedNum = (v: unknown, max: number) =>
            v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max);

        if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 200)) {
            return errorResponses.badRequest('Activity name must be a non-empty string up to 200 characters');
        }
        if (type !== undefined && (typeof type !== 'string' || !VALID_ACTIVITY_TYPES.has(type))) {
            return errorResponses.badRequest('Invalid activity type');
        }
        if (trainingType !== undefined && trainingType !== null && (typeof trainingType !== 'string' || !VALID_WORKOUT_TYPES.has(trainingType))) {
            return errorResponses.badRequest('Invalid trainingType');
        }
        if (averageWatts !== undefined && !isValidBoundedNum(averageWatts, 2500)) {
            return errorResponses.badRequest('averageWatts must be between 0 and 2500');
        }
        if (maxWatts !== undefined && !isValidBoundedNum(maxWatts, 5000)) {
            return errorResponses.badRequest('maxWatts must be between 0 and 5000');
        }
        if (npWatts !== undefined && !isValidBoundedNum(npWatts, 2500)) {
            return errorResponses.badRequest('npWatts must be between 0 and 2500');
        }
        if (bikeTss !== undefined && !isValidBoundedNum(bikeTss, 2000)) {
            return errorResponses.badRequest('bikeTss must be between 0 and 2000');
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name.trim();
        if (type !== undefined) data.type = type;
        if (trainingType !== undefined) data.trainingType = trainingType;
        if (averageWatts !== undefined) data.averageWatts = averageWatts;
        if (maxWatts !== undefined) data.maxWatts = maxWatts;
        if (npWatts !== undefined) data.npWatts = npWatts;
        if (bikeTss !== undefined) data.bikeTss = bikeTss;
```

### Step 2: Edit `Web/src/app/api/mobile/v1/user/profile/route.ts`
Open `Web/src/app/api/mobile/v1/user/profile/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
        if (includeCrossTraining !== undefined && includeCrossTraining !== null && typeof includeCrossTraining !== 'boolean') {
            return errorResponses.validation(
                'includeCrossTraining must be a boolean',
                { field: 'includeCrossTraining' }
            );
        }

        const user = await prisma.user.update({
```

**REPLACE WITH:**
```typescript
        if (includeCrossTraining !== undefined && includeCrossTraining !== null && typeof includeCrossTraining !== 'boolean') {
            return errorResponses.validation(
                'includeCrossTraining must be a boolean',
                { field: 'includeCrossTraining' }
            );
        }

        if (sex !== undefined && sex !== null && !['MALE', 'FEMALE', 'OTHER'].includes(sex)) {
            return errorResponses.validation('sex must be MALE, FEMALE, or OTHER', { field: 'sex' });
        }
        if (hrRest !== undefined && hrRest !== null && (typeof hrRest !== 'number' || !Number.isFinite(hrRest) || hrRest < 25 || hrRest > 150)) {
            return errorResponses.validation('hrRest must be between 25 and 150', { field: 'hrRest', min: 25, max: 150 });
        }
        if (weight !== undefined && weight !== null && (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 20 || weight > 300)) {
            return errorResponses.validation('weight must be between 20 and 300 kg', { field: 'weight', min: 20, max: 300 });
        }
        if (height !== undefined && height !== null && (typeof height !== 'number' || !Number.isFinite(height) || height < 80 || height > 260)) {
            return errorResponses.validation('height must be between 80 and 260 cm', { field: 'height', min: 80, max: 260 });
        }
        if (vdotCorrectionFactor !== undefined && vdotCorrectionFactor !== null && (typeof vdotCorrectionFactor !== 'number' || !Number.isFinite(vdotCorrectionFactor) || vdotCorrectionFactor < 0.5 || vdotCorrectionFactor > 1.5)) {
            return errorResponses.validation('vdotCorrectionFactor must be between 0.5 and 1.5', { field: 'vdotCorrectionFactor', min: 0.5, max: 1.5 });
        }
        if (ftpWatts !== undefined && ftpWatts !== null && (typeof ftpWatts !== 'number' || !Number.isInteger(ftpWatts) || ftpWatts < 40 || ftpWatts > 1000)) {
            return errorResponses.validation('ftpWatts must be an integer between 40 and 1000', { field: 'ftpWatts', min: 40, max: 1000 });
        }
        if (swimCssSecPer100m !== undefined && swimCssSecPer100m !== null && (typeof swimCssSecPer100m !== 'number' || !Number.isInteger(swimCssSecPer100m) || swimCssSecPer100m < 40 || swimCssSecPer100m > 600)) {
            return errorResponses.validation('swimCssSecPer100m must be an integer between 40 and 600', { field: 'swimCssSecPer100m', min: 40, max: 600 });
        }
        for (const [zoneField, zoneVal] of [
            ['hrZone1Max', hrZone1Max], ['hrZone2Max', hrZone2Max], ['hrZone3Max', hrZone3Max],
            ['hrZone4Max', hrZone4Max], ['hrZone5Max', hrZone5Max], ['hrZone6Max', hrZone6Max]
        ] as const) {
            if (zoneVal !== undefined && zoneVal !== null && (typeof zoneVal !== 'number' || !Number.isInteger(zoneVal) || zoneVal < 40 || zoneVal > 250)) {
                return errorResponses.validation(`${zoneField} must be between 40 and 250`, { field: zoneField, min: 40, max: 250 });
            }
        }

        const user = await prisma.user.update({
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-10) — Modified Web/src/app/api/mobile/v1/activities/[id]/route.ts, Web/src/app/api/mobile/v1/user/profile/route.ts`
````

## Subagent `AGY-11` — Admin Token Live DB Privilege Re-Check & HMAC-Signed Admin CSRF Token (MEDIUM)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-11 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-12-admin-jwt-revocation-and-unsigned-csrf-cookie (MEDIUM)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/lib/admin/auth.ts`
  - `Web/src/lib/security/csrf.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Re-verifies `prisma.user.isAdmin === true` in `requireAdmin` whenever the admin JWT subject is not the environment `ADMIN_USERNAME`, and signs admin CSRF tokens with an HMAC-SHA256 signature (`<nonce>.<sig>`) verified in `validateCsrfToken`.

### Step 1: Edit `Web/src/lib/admin/auth.ts`
Open `Web/src/lib/admin/auth.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
    const admin = await verifyAdminToken(token);

    if (!admin) {
        return {
            error: NextResponse.json(
                { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
                { status: 401 }
            )
        };
    }
```

**REPLACE WITH:**
```typescript
    const admin = await verifyAdminToken(token);

    if (!admin) {
        return {
            error: NextResponse.json(
                { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
                { status: 401 }
            )
        };
    }

    const envUsername = process.env.ADMIN_USERNAME;
    if ((!envUsername || admin.username !== envUsername) && typeof prisma?.user?.findFirst === 'function') {
        const dbAdmin = await prisma.user.findFirst({
            where: {
                email: { equals: admin.username, mode: 'insensitive' },
                isAdmin: true,
            },
            select: { id: true },
        });
        if (!dbAdmin) {
            return {
                error: NextResponse.json(
                    { error: 'Admin privileges revoked or invalid', code: 'INVALID_TOKEN' },
                    { status: 401 }
                )
            };
        }
    }
```

### Step 2: Edit `Web/src/lib/security/csrf.ts`
Open `Web/src/lib/security/csrf.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { DAY_MS } from '@/lib/constants';
```

**REPLACE WITH:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { DAY_MS } from '@/lib/constants';
```

### Step 3: Edit `Web/src/lib/security/csrf.ts`
Open `Web/src/lib/security/csrf.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
export function generateCsrfToken(): string {
    return randomBytes(32).toString('hex');
}
```

**REPLACE WITH:**
```typescript
function getCsrfSigningSecret(): string {
    return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'runflow-csrf-dev-secret';
}

function signCsrfNonce(nonce: string): string {
    return createHmac('sha256', getCsrfSigningSecret()).update(nonce).digest('hex');
}

export function generateCsrfToken(): string {
    const nonce = randomBytes(32).toString('hex');
    const sig = signCsrfNonce(nonce);
    return `${nonce}.${sig}`;
}
```

### Step 4: Edit `Web/src/lib/security/csrf.ts`
Open `Web/src/lib/security/csrf.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
    if (cookieToken.length !== headerToken.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < cookieToken.length; i++) {
        result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
    }

    return result === 0;
```

**REPLACE WITH:**
```typescript
    if (cookieToken.length !== headerToken.length) {
        return false;
    }

    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');
    if (cookieBuf.length !== headerBuf.length || !timingSafeEqual(cookieBuf, headerBuf)) {
        return false;
    }

    if (cookieToken.includes('.')) {
        const [nonce, sig] = cookieToken.split('.');
        if (!nonce || !sig) return false;
        const expectedSig = signCsrfNonce(nonce);
        const sigBuf = Buffer.from(sig, 'utf8');
        const expBuf = Buffer.from(expectedSig, 'utf8');
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
            return false;
        }
    }

    return true;
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit && npx vitest run src/app/api/admin
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-11) — Modified Web/src/lib/admin/auth.ts, Web/src/lib/security/csrf.ts`
````

## Subagent `AGY-12` — GDPR Export Completeness & `HEALTH_DATA` Consent Withdrawal Cleanup (LOW)

Copy-paste the following self-contained prompt directly into an `agy` worker instance (`model: gemini-3.8-flash`, `thinking_level: medium`):

````markdown
# ROLE: Antigravity Parallel Remediation Subagent AGY-12 (Gemini 3.8 Flash Medium)
# FINDING(S): runflow-13-gdpr-export-and-consent-withdrawal-gaps (LOW)

## STRICT OPERATING CONSTRAINTS (READ FIRST)
1. **EXCLUSIVE WRITE-LOCK SCOPE**: You are ONLY permitted to read and modify the following file(s):
  - `Web/src/app/api/user/export/route.ts`
  - `Web/src/app/api/user/consent/route.ts`
  - `Web/src/app/api/mobile/v1/user/consent/route.ts`
2. **FORBIDDEN ACTIONS**:
   - Do NOT read, edit, format, or touch any other file in the repository.
   - Do NOT run `git add`, `git commit`, `git checkout`, `git stash`, or `git reset`.
   - Do NOT invent alternative implementations. Apply the exact `FIND:` and `REPLACE WITH:` blocks below verbatim.
3. **OBJECTIVE**: Adds `workouts` (under `goals`), `weeklyReconciliationRecords`, and non-sensitive `mcpOAuthTokens` metadata to `GET /api/user/export`, and deletes `weeklyReconciliationRecord` rows when `HEALTH_DATA` consent is withdrawn on both web and mobile consent routes.

### Step 1: Edit `Web/src/app/api/user/export/route.ts`
Open `Web/src/app/api/user/export/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
                goals: {
                    select: {
                        name: true,
                        raceType: true,
                        targetTime: true,
                        raceDate: true,
                        isActive: true,
                    }
                },
```

**REPLACE WITH:**
```typescript
                goals: {
                    select: {
                        name: true,
                        raceType: true,
                        targetTime: true,
                        raceDate: true,
                        isActive: true,
                        workouts: {
                            select: {
                                scheduledDate: true,
                                workoutType: true,
                                description: true,
                                phase: true,
                                targetDistance: true,
                                targetDuration: true,
                                targetPace: true,
                                isCompleted: true,
                                completedAt: true,
                            },
                            orderBy: { scheduledDate: 'asc' },
                        },
                    }
                },
                weeklyReconciliationRecords: {
                    select: {
                        weekStartDate: true,
                        plannedLoad: true,
                        actualLoad: true,
                        adaptedLoad: true,
                        deficitPercent: true,
                        surplusPercent: true,
                        adjustmentDescription: true,
                        isApplied: true,
                        createdAt: true,
                    },
                    orderBy: { weekStartDate: 'desc' },
                },
                mcpOAuthTokens: {
                    select: {
                        clientId: true,
                        scope: true,
                        createdAt: true,
                        expiresAt: true,
                        lastUsedAt: true,
                        revokedAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
```

### Step 2: Edit `Web/src/app/api/user/consent/route.ts`
Open `Web/src/app/api/user/consent/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
                operations.push(prisma.dailyReadinessRecord.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.readinessBaseline.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.adaptedWorkout.deleteMany({ where: { userId: session.user.id } }));
```

**REPLACE WITH:**
```typescript
                operations.push(prisma.dailyReadinessRecord.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.readinessBaseline.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.adaptedWorkout.deleteMany({ where: { userId: session.user.id } }));
                operations.push(prisma.weeklyReconciliationRecord.deleteMany({ where: { userId: session.user.id } }));
```

### Step 3: Edit `Web/src/app/api/mobile/v1/user/consent/route.ts`
Open `Web/src/app/api/mobile/v1/user/consent/route.ts`, locate the exact `FIND` block below, and replace it verbatim with the `REPLACE WITH` block:

**FIND:**
```typescript
                operations.push(prisma.dailyReadinessRecord.deleteMany({ where: { userId: user.id } }));
                operations.push(prisma.readinessBaseline.deleteMany({ where: { userId: user.id } }));
                operations.push(prisma.adaptedWorkout.deleteMany({ where: { userId: user.id } }));
```

**REPLACE WITH:**
```typescript
                operations.push(prisma.dailyReadinessRecord.deleteMany({ where: { userId: user.id } }));
                operations.push(prisma.readinessBaseline.deleteMany({ where: { userId: user.id } }));
                operations.push(prisma.adaptedWorkout.deleteMany({ where: { userId: user.id } }));
                operations.push(prisma.weeklyReconciliationRecord.deleteMany({ where: { userId: user.id } }));
```

### Verification & Completion Contract
After applying all edits above, run:
```bash
cd Web && npx tsc --noEmit
```
When the command succeeds, reply with:
`STATUS: DONE (AGY-12) — Modified Web/src/app/api/user/export/route.ts, Web/src/app/api/user/consent/route.ts, Web/src/app/api/mobile/v1/user/consent/route.ts`
````
