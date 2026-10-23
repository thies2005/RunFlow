# RunFlow Model Context Protocol (MCP) API Reference

RunFlow exposes two Model Context Protocol (MCP) server endpoints conforming to the [Model Context Protocol Specification](https://modelcontextprotocol.io/):

1. **Personal Paid-Premium MCP**: `https://runflow.schuelken.uk/mcp`
   - Complete coaching, plan generation, workout manipulation, fitness inspection, and cycling/swimming analytics suite.
   - Dual authentication: **OAuth 2.1 with PKCE & Dynamic Client Registration (RFC 7591 / RFC 8414)** or **Personal API Key (`rf_...`)**.
   - Requires active **RunFlow Pro (Tier 2/3)** or Admin status.
   - Strict Strava API compliance and multi-rule Safety Advisory Engine with automatic snapshots.
2. **Public Stateless PlanGen MCP**: `https://runflow.schuelken.uk/mcp/public`
   - Anonymous plan generation and instant web export for all 17 race distances and durations.
   - No login or credentials required (rate limited to 10 requests / hour / IP).

---

## 1. Authentication & Discovery

### OAuth 2.1 PKCE Flow (Direct Domain Login)

RunFlow implements direct domain login for modern MCP clients (such as Claude Desktop, Claude Web Connectors, and Gemini Custom MCP).

1. **Discovery**:
   - `GET /.well-known/oauth-protected-resource` returns the resource identifier and authorization server URLs.
   - `GET /.well-known/oauth-authorization-server` returns RFC 8414 server metadata.
2. **Dynamic Client Registration (RFC 7591)**:
   - `POST /mcp/oauth/register` registers client credentials dynamically (whitelisting Claude, Anthropic, Google, and localhost redirect URIs).
3. **Authorization & Consent**:
   - `GET /mcp/oauth/authorize` redirects the browser to `/mcp/authorize` for user consent.
   - Users on Tier 2/3 see a Race-Timing styled consent card. Approving issues a single-use authorization code (10-minute TTL).
   - Free-tier accounts see a Pro upgrade requirement banner.
4. **Token Exchange & Refresh**:
   - `POST /mcp/oauth/token` exchanges `code` and `code_verifier` (S256 PKCE) for a 30-day access token (`rf_mcp_...`) and 90-day refresh token (`rf_mcpr_...`).

### Personal API Key Authentication

Athletes can also authenticate by passing an API key in the `Authorization` header:
```http
Authorization: Bearer rf_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Unauthenticated requests to `/mcp` return `401 Unauthorized` with:
```http
WWW-Authenticate: Bearer realm="RunFlow MCP", resource_metadata="https://runflow.schuelken.uk/.well-known/oauth-protected-resource"
```

If an account downgrades to a free tier, requests return JSON-RPC error `-32002`:
```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32002,
    "message": "RunFlow Personal MCP requires an active Paid Premium account (Tier 2/3)."
  }
}
```

---

## 2. Client Setup Guides

### Claude Desktop & Claude Web

In Claude Desktop (`claude_desktop_config.json`) or Claude Web Connectors:

#### Direct Remote MCP (Recommended):
Add `https://runflow.schuelken.uk/mcp` as a remote connector URL. Claude will automatically discover the OAuth endpoints, open your browser to log into RunFlow, present the consent card, and securely obtain tokens via PKCE.

#### With API Key:
```json
{
  "mcpServers": {
    "runflow": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://runflow.schuelken.uk/mcp"],
      "env": {
        "HTTP_AUTHORIZATION": "Bearer rf_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Gemini Custom MCP

Configure Gemini Custom Tool / MCP connector:
- **Server URL**: `https://runflow.schuelken.uk/mcp`
- **Auth Type**: OAuth 2.1 (PKCE) or Bearer Token (`rf_YOUR_API_KEY_HERE`)
- **Scopes**: `mcp:full`

### Public PlanGen MCP (No Login)

In any MCP-capable client:
- **Server URL**: `https://runflow.schuelken.uk/mcp/public`
- **Tools Available**: `generate_running_plan`, `export_plan_url`

---

## 3. Tool Suite Reference (Personal MCP `/mcp` — v3.0, 31 Tools)

### Read / Inspection Tools (10 Tools — Auto-Approved, Zero User Prompts)

| Tool | Purpose | Annotations |
| :--- | :--- | :--- |
| `get_athlete_profile` | Returns VDOT, effective VDOT, run training paces (min/km & min/mi), Bike FTP, Coggan zones (with W/kg bounds), contiguous `planBikeZones`, Swim CSS & paces, HR zones (Z1–Z6 bpm), and unit preferences. | `readOnlyHint: true` |
| `get_fitness_metrics` | Returns current and series PMC metrics (`ctl`, `atl`, `tsb`, `workloadRatio`), complete Running PMC (`ctlRunning`, `atlRunning`, `tsbRunning`), Cycling PMC (`ctlBike`, `atlBike`, `tsbBike`), weekly ramp rate, and overtraining risk classification. | `readOnlyHint: true` |
| `get_cycling_analytics` | Returns Mean Maximal Power (MMP) curve (5s..60m in Watts & W/kg with monotonic `allTimePeakWatts`), eFTP, normalized NP/IF/VI/bikeTss trends, Coggan distribution, and Strava-scrubbed `ridesSeries`. | `readOnlyHint: true` |
| `get_running_analytics` | Returns running volume summary, effective VDOT, training paces, HR zone distribution, and Strava-scrubbed `runsSeries`. | `readOnlyHint: true` |
| `get_swimming_analytics` | Returns swimming volume summary, CSS (`sec/100m`), swim pace zones, and Strava-scrubbed `swimsSeries`. | `readOnlyHint: true` |
| `get_training_plan` | Pulls the active or specified training plan, `phaseBlocks`, volume/TSS targets, coaching summaries, and workouts. Supports `includeStructuredSteps: false` (default when `includeAllWorkouts: true`), `summaryOnly`, and `sport` filter. | `readOnlyHint: true` |
| `list_training_plans` | Lists all athlete training plans (`active`, `completed`, or `archived`) with workout and snapshot counts. | `readOnlyHint: true` |
| `list_plan_snapshots` | Lists available undo snapshots for a training plan with timestamp, operation, and workout counts. | `readOnlyHint: true` |
| `get_recent_activities` | Returns `{ count, activities }` in a date window with strict Strava API compliance scrubbing and normalized cycling IF/TSS. | `readOnlyHint: true` |
| `get_readiness_and_health` | Returns latest `DailyReadinessRecord` (reconciled with multi-sport `DailyFitness` CTL/ATL/TSB load), compact `readinessHistory`, `healthLogs`, and `baseline`. | `readOnlyHint: true` |

### Atomic Batch & Lifecycle Write Tools (21 Tools — Single-Turn, Snapshot-Protected)

Every plan mutation runs inside a database transaction, calls `createSnapshot(goalId, description, operation)` before mutating, and evaluates modality-aware safety rules via `evaluatePlanSafety(goalId)`. Connected AI agents MUST prefer the `*_batch`, `shift_plan_dates`, and `create_custom_training_plan` tools when mutating 2+ workouts to avoid N+1 user confirmation prompts.

| Tool | Purpose | Annotations |
| :--- | :--- | :--- |
| `create_custom_training_plan` | Creates a custom `Goal` (`creationMode: AI_ASSISTED`) with custom `phaseBlocks`, multi-sport volume/TSS targets, `strengthPerWeek`, and up to 200 canonical v2 workouts in 1 atomic transaction. | `readOnlyHint: false` |
| `create_training_plan` | Generates a standard template-based training plan using the internal `STANDARD_BUILDER` engine. | `readOnlyHint: false` |
| `update_training_plan_phases` | Updates Goal metadata (`name`, `planStartDate`, `raceDate`, `sport`, `raceType`, `trainingFocus`), frequencies, `restDays`, `phaseBlocks`, and volume/TSS targets. | `readOnlyHint: false` |
| `set_active_training_plan` | Atomically switches `isActive: true` to the specified `goalId` and deactivates other plans. | `readOnlyHint: false` |
| `delete_training_plan` | Soft-archives or permanently deletes a training plan by `goalId` and activates the next most recent plan. | `destructiveHint: true` |
| `import_plan_workouts_batch` | Batch-imports 1..200 workouts with full v2 `structuredSteps`, `sport` (`RUN`, `BIKE`, `SWIM`, `STRENGTH`), `order`, `notes`, targets, `lockPlannedTss`, selective `replaceFilter`, and returns `importedWorkoutIds`. | `readOnlyHint: false` |
| `modify_workouts_batch` | Atomically updates fields, targets, `sport`, `scheduledDate`, `order`, `plannedTss`, or `structuredSteps` across 1..200 existing workouts by `workoutId`. | `readOnlyHint: false` |
| `reschedule_workouts_batch` | Atomically moves 1..200 workouts to new dates and/or intra-day orders in a single transaction. | `readOnlyHint: false` |
| `shift_plan_dates` | Shifts all workouts in a plan or date window forward/backward by `deltaDays` (`+/- N` days) in 1 atomic transaction. | `readOnlyHint: false` |
| `delete_workouts_batch` | Atomically deletes multiple workouts by `workoutIds` array or date/sport filter after taking an auto-snapshot. | `destructiveHint: true` |
| `mark_workouts_status_batch` | Atomically marks 1..200 workouts completed/uncompleted with optional `linkedActivityId` and runs adaptive recalibration once. | `readOnlyHint: false` |
| `restore_plan_snapshot` | Atomically rolls back a training plan to a specified `snapshotId` (or latest undo snapshot) with a pre-restore safety backup. | `readOnlyHint: false` |
| `create_structured_workout` | Inserts a single workout with canonical v2 steps and auto-computed TSS (never fabricates running distance on `BIKE`/`STRENGTH`). | `readOnlyHint: false` |
| `modify_workout` | Updates fields, targets, date/order, or v2 steps on a single workout. | `readOnlyHint: false` |
| `reschedule_workout` | Moves a single planned workout to a new date and optional order. | `readOnlyHint: false` |
| `swap_workouts` | Atomically swaps scheduled dates and orders between two planned workouts. | `readOnlyHint: false` |
| `delete_workout` | Deletes a single planned workout after taking an auto-snapshot. | `destructiveHint: true` |
| `mark_workout_status` | Marks a single workout completed/uncompleted, links an activity, and returns `adaptationResult`. | `readOnlyHint: false` |
| `recalibrate_thresholds` | Updates VDOT, FTP, Swim CSS, or HR zones and recalculates future paces while preserving explicit/locked `plannedTss` (`preserveCustomWorkoutTss: true`). | `readOnlyHint: false` |
| `save_weekly_coaching_summary` | Creates, updates, or deletes a weekly coaching summary snapshot (`up to 1,000 chars`). | `readOnlyHint: false` |
| `log_daily_health` | Upserts `DailyHealthLog` (`weightKg`, `steps`, `waterIntakeMl`, `activeCalories`) and `DailyReadinessRecord.subjectiveJson` (`soreness`, `fatigue`, `sleepQuality`, `stress`, `mood`). | `readOnlyHint: false` |

---

## 4. Safety Advisory Engine

All plan mutations return an array of `safetyAdvisory` objects:
```json
{
  "level": "info" | "warning" | "critical",
  "rule": "weekly_volume_spike" | "long_run_cap" | "consecutive_hard_days" | "projected_tsb_overload",
  "message": "Human-readable exercise science explanation and advisory"
}
```

### Safety Rules Evaluated:
1. **`weekly_volume_spike`** (`warning`): Triggers when weekly distance or TSS increases by more than 10% vs. the prior week AND vs. the 4-week rolling average.
2. **`long_run_cap`** (`warning`): Triggers when a single long run exceeds 35% of total weekly running distance.
3. **`consecutive_hard_days`** (`critical`): Triggers when hard workouts (`INTERVALS`, `TEMPO`, `REPETITIONS`, `RIDE_INTERVALS`, `RACE`) occur on back-to-back calendar days.
4. **`projected_tsb_overload`** (`critical`): Triggers when projected Training Stress Balance (TSB) drops below `-30`.

---

## 5. Strava API Compliance Rules

Under Strava API Developer Terms:
- For any activity synchronized with Strava (`stravaId != null`), RunFlow **NEVER** returns `name`, `description`, `rawJson`, `streams`, `laps`, or `splits` sensor arrays to external AI models or third-party servers.
- Only RunFlow's proprietary computed summary metrics (e.g., `distance`, `movingTime`, `npWatts`, `intensityFactor`, `variabilityIndex`, `bikeTss`, `runningTss`, `estimatedVdot`, `efficiencyFactor`, `aerobicDecoupling`, zone times) are returned.
- A compliance notice is explicitly attached to each Strava-synced activity:
  ```json
  "stravaComplianceNotice": "Activity title, description, and raw GPS/sensor streams are omitted for Strava-synced activities per Strava API terms. To inspect raw Strava activity details or streams, please use the official Strava MCP server."
  ```
