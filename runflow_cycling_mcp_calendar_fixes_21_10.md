# Multi-Agent Playbook: Cycling Classification, Sport-Aware Metrics, Calendar UX, MCP Connections & Cycling/MyWhoosh Plan Builder

* **Target Environment**: Google Antigravity IDE / Agent Manager
* **Target Model**: **Gemini 3.8 Flash Medium** (`gemini-3.8-flash`, `thinking_level: medium`)
* **Base Commit**: `a5f0c478` (post-`runflow_audit_followup_fixes_21_10.md`)
* **Scope**: Resolve all **7 user-reported UI, analytics, AI coaching, settings, and plan-builder issues**:
  1. **Cycling / FTP Test Classification (`ActivityList.tsx`, `ClientAnalysis.tsx`, `strava/transform.ts`)**: Stop labeling every `RIDE` / `VIRTUAL_RIDE` (such as `"Mywhoosh FTP Test 305w"` and `"Mywhoosh FTP Test 307w"`) as `Recovery` or `EASY`. Classify FTP tests (`FTP Test`), intervals (`Intervals`), threshold/tempo rides (`Tempo / Threshold`), recovery rides (`Recovery Ride`), and endurance rides (`Cycling`), and display speed (`km/h`), power (`W`), and `Bike TSS` on ride cards.
  2. **Sport-Specific Activity Metrics & Cadence Fix (`ActivityDetailsModal.tsx`, `InteractiveStreamsChart.tsx`, `ClientAnalysis.tsx`, `strava/transform.ts`)**:
     - Hide running-only metrics (`GAP`, `rTSS`, `Aerobic Fitness (VO2max)`, and `min/km` pace) on cycling/non-running activities; show `Speed (km/h)`, `Power (W)`, `Bike TSS`, and `Intensity Factor (IF)` on rides.
     - Fix the Strava/Streams cadence bug that doubled cycling cadence (`74 rpm -> 148 spm`) and labeled cycling cadence `spm` instead of `rpm`.
     - Parse fallback wattage from ride titles (e.g., `"Mywhoosh FTP Test 305w"` $\rightarrow$ `305 W`) when Strava stream watts are absent, and always display the **7-Zone Coggan Cycling Power Zones (`Z1`–`Z7` Watts & `%FTP`)** alongside separate **Cycling vs. Running Heart Rate Zones**.
  3. **AI Coach Feedback Sanitization & Sport-Aware Prompting (`feedback.ts`, `prompts.ts`)**: Strip leaked LLM chain-of-thought self-check rubrics (`* *Planned Comparison:* ... * Exact headers? Yes. * Exactly three sections? Yes.`) from `Goal Trajectory` and make the prompt and activity context sport-aware (cycling power/speed/cadence vs. running pace).
  4. **Training Calendar Header & Non-Running Activity Paces (`calendar/page.tsx`, `WeeklyView.tsx`)**: Style the `/calendar` Back button to match the RunFlow design system (`Dashboard` pill button with `ArrowLeft`), and stop showing `/km` running pace on non-running activities (Soccer, Basketball, Paddle, Strength, Cycling) on `/calendar`.
  5. **MCP Server Documentation & Connected AI Client Organization (`MinimalistPillsMenu.tsx`)**: In `Settings -> Connections`, add an **MCP Server & Connected AI Clients** panel with copyable `/mcp` endpoint URL, collapsible setup instructions for OAuth 2.1 interactive clients (Claude Desktop, Cursor, Windsurf, ChatGPT/Gemini) and read-only `rf_*` API keys, plus live organization/revocation of connected OAuth 2.1 MCP clients (`GET` / `DELETE /api/settings/mcp-tokens`).
  6. **Separate Cycling & Running Power + Heart Rate Zones (`MinimalistPillsMenu.tsx`, `HeartRateZonesSection.tsx`, `api/settings/cycling/route.ts`)**: Add a **Running Zones vs. Cycling Zones (Power & HR)** switcher in Settings so athletes can configure and view separate **Cycling Power Zones (Coggan Z1–Z7 Watts)**, **Cycling Heart Rate Zones (7-Zone BPM)**, and **Running Heart Rate & Pace Zones**, with automatic eFTP detection from ride streams and FTP test titles.
  7. **Cycling-Only / MyWhoosh Training Plan Builder with Optional Runs, Swims & Gym Workouts (`TargetRaceSection.tsx`, `PlanVolumeSection.tsx`, `PlanSetupForm.tsx`, `EngineGenerateModal.tsx`, `plans/index.ts`, `plans/generators/no-race.ts`, `plans/generators/triathlon.ts`, `services/plan-creation.ts`)**: Add a dedicated **Cycling (MyWhoosh)** sport option (`CYCLING`) that preselects from all **MyWhoosh Training Plans** (`MYWHOOSH_PLANS`) with `runsPerWeek = 0`, `ridesPerWeek = 4`, `swimsPerWeek = 0`, `strengthPerWeek = 1`, while unlocking the `Runs / Week` (`0–6`), `Swims / Week` (`0–3`), and `Strength & Gym / Week` (`0–4`) sliders so athletes can build a pure MyWhoosh cycling plan or add optional runs, swims, and gym workouts.

## 1. Execution Rules for the Coordinator & Subagents

1. **Single Parallel Wave (4 Disjoint Subagents)**:
   Spawn **Agent-UI-1**, **Agent-UI-2**, **Agent-UI-3**, and **Agent-UI-4** in parallel. Their file write scopes are 100% disjoint (zero shared files).
2. **Exact `FIND` / `REPLACE WITH` Execution**:
   Every subagent prompt below contains exact `FIND` and `REPLACE WITH` blocks verified against the repository. Do **not** skip any block and do **not** improvise alternative logic.
3. **Final Coordinator Verification Gate**:
   Wait until all 4 subagents finish before running `cd Web && npx tsc --noEmit && npm test`.

| Wave | Agent ID | Assigned Fixes | Exclusive Write-Lock Files | Per-Agent Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **Wave 1** | **Agent-UI-1** (`cycling-classification-and-metrics`) | **#1** (FTP Test & Ride Classification) & **#2** (Sport-Specific Modal/Chart/Analysis Metrics, Cadence RPM Fix, Title Watts & Coggan Power Zones) | `Web/src/components/ActivityList.tsx`<br>`Web/src/components/ActivityDetailsModal.tsx`<br>`Web/src/components/InteractiveStreamsChart.tsx`<br>`Web/src/components/analysis/ClientAnalysis.tsx`<br>`Web/src/lib/strava/transform.ts` | `cd Web && npx tsc --noEmit` |
| **Wave 1** | **Agent-UI-2** (`ai-feedback-and-calendar`) | **#3** (AI Feedback Rubric Strip & Sport-Aware Context) & **#4** (Calendar Header Back Button & Non-Run Activity Paces) | `Web/src/lib/ai/prompts.ts`<br>`Web/src/lib/ai/feedback.ts`<br>`Web/src/app/calendar/page.tsx`<br>`Web/src/app/calendar-preview/components/WeeklyView.tsx` | `cd Web && npx tsc --noEmit && npm test -- src/app/api/ai/activity-feedback/__tests__/route.test.ts` |
| **Wave 1** | **Agent-UI-3** (`mcp-connections-and-zones-settings`) | **#5** (Web Settings $\rightarrow$ Connections MCP Docs & Connected Clients) & **#6** (Separate Cycling Power/HR Zones & Running HR Zones) | `Web/src/components/MinimalistPillsMenu.tsx`<br>`Web/src/components/setup/HeartRateZonesSection.tsx`<br>`Web/src/app/api/settings/cycling/route.ts` | `cd Web && npx tsc --noEmit` |
| **Wave 1** | **Agent-UI-4** (`cycling-mywhoosh-plan-builder`) | **#7** (Cycling-Only MyWhoosh Training Plan Option + Optional Runs, Swims & Gym Workouts) | `Web/src/components/setup/TargetRaceSection.tsx`<br>`Web/src/components/setup/PlanVolumeSection.tsx`<br>`Web/src/components/PlanSetupForm.tsx`<br>`Web/src/components/PlanEditor/EngineGenerateModal.tsx`<br>`Web/src/lib/plans/index.ts`<br>`Web/src/lib/plans/generators/no-race.ts`<br>`Web/src/lib/plans/generators/triathlon.ts`<br>`Web/src/lib/services/plan-creation.ts` | `cd Web && npx tsc --noEmit && npm test -- src/lib/plans/__tests__/index.test.ts` |

## 2. Subagent Prompts (Spawn All 4 in Parallel)

### Agent-UI-1 Prompt (`cycling-classification-and-metrics`)

> **Role**: Cycling Classification & Sport Metrics Agent `cycling-classification-and-metrics` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/ActivityList.tsx`
> * `Web/src/components/ActivityDetailsModal.tsx`
> * `Web/src/components/InteractiveStreamsChart.tsx`
> * `Web/src/components/analysis/ClientAnalysis.tsx`
> * `Web/src/lib/strava/transform.ts`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 5 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 1.1: Classify FTP Tests & Cycling Rides Accurately and Show Speed/Watts on Ride Cards in `Web/src/components/ActivityList.tsx`
> Open `Web/src/components/ActivityList.tsx` (lines 56–180).
>
> **FIND:**
> ```tsx
> function isCrossTraining(type: string): boolean {
>     return type === 'VIRTUAL_RIDE' || type === 'RIDE';
> }
> 
> const getWorkoutTypeStyle = (type: WorkoutType) => {
>     switch (type) {
>         case 'LONG_RUN': return 'bg-workout-long-run/10 text-workout-long-run border-workout-long-run/20';
>         case 'TEMPO': return 'bg-workout-tempo/10 text-workout-tempo border-workout-tempo/20';
>         case 'INTERVALS': return 'bg-workout-interval/10 text-workout-interval border-workout-interval/20';
>         case 'FARTLEK': return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20';
>         case 'RACE': return 'bg-workout-race/10 text-workout-race border-workout-race/20';
>         case 'RECOVERY': return 'bg-workout-recovery/10 text-workout-recovery border-workout-recovery/20';
>         case 'STRENGTH': return 'bg-workout-strength/10 text-workout-strength border-workout-strength/20';
>         default: return 'bg-workout-easy/10 text-workout-easy border-workout-easy/20';
>     }
> };
> 
> // Bolt: Wrapped in memo to prevent unnecessary re-renders during list updates
> const ActivityCard = memo(function ActivityCard({ activity }: { activity: ActivityListItem }) {
>     const crossTraining = isCrossTraining(activity.type);
>     const showTag = activity.trainingType && activity.trainingType !== 'EASY' && activity.trainingType !== 'OTHER';
> 
>     return (
>         <div
>             className={`w-full text-left glass-card glass-card-hover p-4 transition-all duration-200 ${crossTraining ? 'recovery-border' : ''
>                 }`}
>         >
>             <div className="flex items-start gap-4">
>                 {/* Activity type icon */}
>                 <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 ${crossTraining
>                     ? 'bg-accent-cyan/15 text-accent-cyan'
>                     : 'bg-accent-orange/15 text-accent-orange'
>                     }`}>
>                     {activityIcons[activity.type]}
>                 </div>
> 
>                 {/* Activity details */}
>                 <div className="flex-1 min-w-0">
>                     <div className="flex items-center gap-2 mb-1">
>                         <h4 className="text-foreground font-semibold truncate">{activity.name}</h4>
>                         {crossTraining && (
>                             <span className="badge badge-recovery text-xs">Recovery</span>
>                         )}
>                         {showTag && (
>                             <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getWorkoutTypeStyle(activity.trainingType!)}`}>
>                                 {activity.trainingType!.replace('_', ' ')}
>                             </span>
>                         )}
>                     </div>
> 
>                     <p className="text-sm text-foreground-muted">
>                         {(() => {
>                             const d = new Date(activity.startDate);
>                             return !isNaN(d.getTime()) ? (
>                                 <>
>                                     {formatDistanceToNow(d, { addSuffix: true })}
>                                     {' • '}
>                                     {format(d, 'EEE, MMM d')}
>                                 </>
>                             ) : (
>                                 <span className="text-accent-pink">Invalid Date</span>
>                             );
>                         })()}
>                     </p>
> 
>                     {/* Stats row */}
>                     <div className="flex flex-wrap items-center gap-4 mt-3">
>                         {/* Distance */}
>                         <div className="flex items-center gap-1">
>                             <TrendingUp className="w-4 h-4 text-foreground-muted" />
>                             <span className="text-foreground font-medium font-mono tabular-nums">
>                                 {(activity.distance / 1000).toFixed(2)} km
>                             </span>
>                         </div>
> 
>                         {/* Duration */}
>                         <div className="flex items-center gap-1">
>                             <Clock className="w-4 h-4 text-foreground-muted" />
>                             <span className="text-foreground font-medium font-mono tabular-nums">
>                                 {formatDuration(activity.movingTime)}
>                             </span>
>                         </div>
> 
>                         {/* Pace (for runs) */}
>                         {activity.type === 'RUN' && activity.averageSpeed && (
>                             <div className="text-foreground-muted font-mono tabular-nums">
>                                 {formatPace(activity.averageSpeed)}
>                             </div>
>                         )}
> 
>                         {/* Heart rate */}
>                         {activity.hasHeartrate && activity.averageHr && (
>                             <div className="flex items-center gap-1">
>                                 <Heart className="w-4 h-4 text-accent-pink" />
>                                 <span className="text-foreground-muted font-mono tabular-nums">{Math.round(activity.averageHr)} bpm</span>
>                             </div>
>                         )}
> 
>                         {/* Elevation */}
>                         {activity.totalElevation && activity.totalElevation > 10 && (
>                             <div className="flex items-center gap-1">
>                                 <Mountain className="w-4 h-4 text-foreground-muted" />
>                                 <span className="text-foreground-muted font-mono tabular-nums">{Math.round(activity.totalElevation)}m</span>
>                             </div>
>                         )}
>                     </div>
> 
>                     {/* TRIMP / TSS if available */}
>                     {(activity.trimp || activity.runningTss) && (
>                         <div className="flex items-center gap-4 mt-2">
>                             {activity.trimp && (
>                                 <span className="text-xs text-foreground-muted">
>                                     TRIMP: <span className="text-accent-cyan font-mono tabular-nums">{activity.trimp.toFixed(0)}</span>
>                                 </span>
>                             )}
>                             {activity.runningTss && (
>                                 <span className="text-xs text-foreground-muted">
>                                     rTSS: <span className="text-accent-orange font-mono tabular-nums">{activity.runningTss.toFixed(0)}</span>
>                                 </span>
>                             )}
>                         </div>
>                     )}
>                 </div>
>             </div>
>         </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
> function isCrossTraining(type: string): boolean {
>     return type === 'VIRTUAL_RIDE' || type === 'RIDE';
> }
> 
> function extractWattsFromTitle(title: string | null | undefined): number | null {
>     if (!title) return null;
>     const match = title.match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
>     if (!match) return null;
>     const val = parseInt(match[1], 10);
>     return val >= 40 && val <= 1500 ? val : null;
> }
> 
> function getCyclingClassificationBadge(activity: ActivityListItem): { label: string; className: string } {
>     const title = activity.name || '';
>     const ifVal = (activity as any).intensityFactor as number | null | undefined;
>     const tType = activity.trainingType;
> 
>     if (/\bftp\s*test\b|\bramp\s*test\b/i.test(title)) {
>         return { label: 'FTP Test', className: 'bg-workout-race/15 text-workout-race border-workout-race/30' };
>     }
>     if (tType === 'RACE' || /\brace\b/i.test(title)) {
>         return { label: 'Bike Race', className: 'bg-workout-race/15 text-workout-race border-workout-race/30' };
>     }
>     if (
>         tType === 'INTERVALS' ||
>         tType === 'RIDE_INTERVALS' ||
>         /\binterval|\bvo2|\banaerobic|\bsprint|\bhiit\b/i.test(title) ||
>         (typeof ifVal === 'number' && ifVal >= 0.88)
>     ) {
>         return { label: 'Bike Intervals', className: 'bg-workout-interval/15 text-workout-interval border-workout-interval/30' };
>     }
>     if (
>         tType === 'TEMPO' ||
>         /\btempo|\bsweet\s*spot|\bthreshold|\bsst\b/i.test(title) ||
>         (typeof ifVal === 'number' && ifVal >= 0.78)
>     ) {
>         return { label: 'Tempo / Threshold', className: 'bg-workout-tempo/15 text-workout-tempo border-workout-tempo/30' };
>     }
>     if (
>         tType === 'LONG_RIDE' ||
>         tType === 'LONG_RUN' ||
>         (activity.movingTime && activity.movingTime >= 7200)
>     ) {
>         return { label: 'Long Ride', className: 'bg-workout-long-run/15 text-workout-long-run border-workout-long-run/30' };
>     }
>     if (
>         tType === 'RECOVERY' ||
>         /\brecovery\b|\beasy\s*spin\b/i.test(title) ||
>         (typeof ifVal === 'number' && ifVal > 0 && ifVal < 0.60)
>     ) {
>         return { label: 'Recovery Spin', className: 'bg-workout-recovery/15 text-workout-recovery border-workout-recovery/30' };
>     }
>     return { label: 'Cycling', className: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30' };
> }
> 
> const getWorkoutTypeStyle = (type: WorkoutType) => {
>     switch (type) {
>         case 'LONG_RUN':
>         case 'LONG_RIDE': return 'bg-workout-long-run/10 text-workout-long-run border-workout-long-run/20';
>         case 'TEMPO': return 'bg-workout-tempo/10 text-workout-tempo border-workout-tempo/20';
>         case 'INTERVALS':
>         case 'RIDE_INTERVALS': return 'bg-workout-interval/10 text-workout-interval border-workout-interval/20';
>         case 'FARTLEK': return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20';
>         case 'RACE': return 'bg-workout-race/10 text-workout-race border-workout-race/20';
>         case 'RECOVERY': return 'bg-workout-recovery/10 text-workout-recovery border-workout-recovery/20';
>         case 'STRENGTH': return 'bg-workout-strength/10 text-workout-strength border-workout-strength/20';
>         default: return 'bg-workout-easy/10 text-workout-easy border-workout-easy/20';
>     }
> };
> 
> // Bolt: Wrapped in memo to prevent unnecessary re-renders during list updates
> const ActivityCard = memo(function ActivityCard({ activity }: { activity: ActivityListItem }) {
>     const crossTraining = isCrossTraining(activity.type);
>     const cyclingBadge = crossTraining ? getCyclingClassificationBadge(activity) : null;
>     const showTag = !crossTraining && activity.trainingType && activity.trainingType !== 'EASY' && activity.trainingType !== 'OTHER';
>     const rideWatts = crossTraining
>         ? ((activity as any).npWatts ?? activity.averageWatts ?? extractWattsFromTitle(activity.name))
>         : null;
>     const bikeTss = crossTraining ? ((activity as any).bikeTss as number | null | undefined) : null;
> 
>     return (
>         <div className="w-full text-left glass-card glass-card-hover p-4 transition-all duration-200">
>             <div className="flex items-start gap-4">
>                 {/* Activity type icon */}
>                 <div className={`w-12 h-12 rounded-md flex items-center justify-center shrink-0 ${crossTraining
>                     ? 'bg-accent-cyan/15 text-accent-cyan'
>                     : 'bg-accent-orange/15 text-accent-orange'
>                     }`}>
>                     {activityIcons[activity.type]}
>                 </div>
> 
>                 {/* Activity details */}
>                 <div className="flex-1 min-w-0">
>                     <div className="flex items-center gap-2 mb-1">
>                         <h4 className="text-foreground font-semibold truncate">{activity.name}</h4>
>                         {cyclingBadge && (
>                             <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cyclingBadge.className}`}>
>                                 {cyclingBadge.label}
>                             </span>
>                         )}
>                         {showTag && (
>                             <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getWorkoutTypeStyle(activity.trainingType!)}`}>
>                                 {activity.trainingType!.replace('_', ' ')}
>                             </span>
>                         )}
>                     </div>
> 
>                     <p className="text-sm text-foreground-muted">
>                         {(() => {
>                             const d = new Date(activity.startDate);
>                             return !isNaN(d.getTime()) ? (
>                                 <>
>                                     {formatDistanceToNow(d, { addSuffix: true })}
>                                     {' • '}
>                                     {format(d, 'EEE, MMM d')}
>                                 </>
>                             ) : (
>                                 <span className="text-accent-pink">Invalid Date</span>
>                             );
>                         })()}
>                     </p>
> 
>                     {/* Stats row */}
>                     <div className="flex flex-wrap items-center gap-4 mt-3">
>                         {/* Distance */}
>                         <div className="flex items-center gap-1">
>                             <TrendingUp className="w-4 h-4 text-foreground-muted" />
>                             <span className="text-foreground font-medium font-mono tabular-nums">
>                                 {(activity.distance / 1000).toFixed(2)} km
>                             </span>
>                         </div>
> 
>                         {/* Duration */}
>                         <div className="flex items-center gap-1">
>                             <Clock className="w-4 h-4 text-foreground-muted" />
>                             <span className="text-foreground font-medium font-mono tabular-nums">
>                                 {formatDuration(activity.movingTime)}
>                             </span>
>                         </div>
> 
>                         {/* Pace (for runs) or Speed & Power (for rides) */}
>                         {activity.type === 'RUN' && activity.averageSpeed && (
>                             <div className="text-foreground-muted font-mono tabular-nums">
>                                 {formatPace(activity.averageSpeed)}
>                             </div>
>                         )}
>                         {crossTraining && activity.averageSpeed && activity.averageSpeed > 0 && (
>                             <div className="text-foreground-muted font-mono tabular-nums">
>                                 {(activity.averageSpeed * 3.6).toFixed(1)} km/h
>                             </div>
>                         )}
>                         {crossTraining && rideWatts && rideWatts > 0 && (
>                             <div className="flex items-center gap-1 text-accent-orange font-mono font-semibold tabular-nums">
>                                 <Zap className="w-3.5 h-3.5" />
>                                 <span>{Math.round(rideWatts)} W</span>
>                             </div>
>                         )}
> 
>                         {/* Heart rate */}
>                         {activity.hasHeartrate && activity.averageHr && (
>                             <div className="flex items-center gap-1">
>                                 <Heart className="w-4 h-4 text-accent-pink" />
>                                 <span className="text-foreground-muted font-mono tabular-nums">{Math.round(activity.averageHr)} bpm</span>
>                             </div>
>                         )}
> 
>                         {/* Elevation */}
>                         {activity.totalElevation && activity.totalElevation > 10 && (
>                             <div className="flex items-center gap-1">
>                                 <Mountain className="w-4 h-4 text-foreground-muted" />
>                                 <span className="text-foreground-muted font-mono tabular-nums">{Math.round(activity.totalElevation)}m</span>
>                             </div>
>                         )}
>                     </div>
> 
>                     {/* TRIMP / TSS if available */}
>                     {(activity.trimp || (!crossTraining && activity.runningTss) || (crossTraining && bikeTss)) && (
>                         <div className="flex items-center gap-4 mt-2">
>                             {activity.trimp && (
>                                 <span className="text-xs text-foreground-muted">
>                                     TRIMP: <span className="text-accent-cyan font-mono tabular-nums">{activity.trimp.toFixed(0)}</span>
>                                 </span>
>                             )}
>                             {!crossTraining && activity.runningTss && (
>                                 <span className="text-xs text-foreground-muted">
>                                     rTSS: <span className="text-accent-orange font-mono tabular-nums">{activity.runningTss.toFixed(0)}</span>
>                                 </span>
>                             )}
>                             {crossTraining && bikeTss && (
>                                 <span className="text-xs text-foreground-muted">
>                                     Bike TSS: <span className="text-accent-orange font-mono tabular-nums">{Math.round(bikeTss)}</span>
>                                 </span>
>                             )}
>                         </div>
>                     )}
>                 </div>
>             </div>
>         </div>
> ```
>
> #### Edit 1.2: Fix Cycling Cadence, Title Watts Extraction, Coggan Power Zones & Sport-Specific Metrics in `Web/src/components/ActivityDetailsModal.tsx`
> Open `Web/src/components/ActivityDetailsModal.tsx`.
>
> First, in `Web/src/components/ActivityDetailsModal.tsx` (lines 11–20):
>
> **FIND:**
> ```tsx
> import {
>     calculateNormalizedPower,
>     calculateIntensityFactor,
>     calculateVariabilityIndex,
>     calculateBikeTss,
>     calculateEfficiencyFactor,
>     calculateAerobicDecoupling,
>     calculatePowerZoneTimes,
> } from '@/lib/metrics/power';
> ```
>
> **REPLACE WITH:**
> ```tsx
> import {
>     calculateNormalizedPower,
>     calculateIntensityFactor,
>     calculateVariabilityIndex,
>     calculateBikeTss,
>     calculateEfficiencyFactor,
>     calculateAerobicDecoupling,
>     calculatePowerZoneTimes,
>     calculateCogganPowerZones,
> } from '@/lib/metrics/power';
> ```
>
> Second, in `Web/src/components/ActivityDetailsModal.tsx` (lines 208–306):
>
> **FIND:**
> ```tsx
>     const powerMetrics = useMemo(() => {
>         if (!activity) return null;
>         const det = detailedActivity as any;
>         const act = activity as any;
> 
>         let npWatts: number | null = det?.npWatts ?? act?.npWatts ?? det?.weightedAverageWatts ?? act?.weightedAverageWatts ?? null;
>         let avgWatts: number | null = det?.averageWatts ?? act?.averageWatts ?? null;
>         const maxWatts: number | null = det?.maxWatts ?? act?.maxWatts ?? null;
>         let intensityFactor: number | null = det?.intensityFactor ?? act?.intensityFactor ?? null;
>         let variabilityIndex: number | null = det?.variabilityIndex ?? act?.variabilityIndex ?? (npWatts && avgWatts && avgWatts > 0 ? Number((npWatts / avgWatts).toFixed(2)) : null);
>         let bikeTss: number | null = det?.bikeTss ?? act?.bikeTss ?? null;
>         const kilojoules: number | null = det?.kilojoules ?? act?.kilojoules ?? null;
>         const deviceWatts: boolean = Boolean(det?.deviceWatts ?? act?.deviceWatts);
>         let efficiencyFactor: number | null = det?.efficiencyFactor ?? act?.efficiencyFactor ?? (npWatts && (activity.averageHr || det?.averageHr) ? Number((npWatts / (activity.averageHr || det?.averageHr)).toFixed(2)) : null);
>         let decouplingPct: number | null = det?.aerobicDecoupling ?? act?.aerobicDecoupling ?? null;
> 
>         let pz1 = det?.powerZone1Time ?? act?.powerZone1Time ?? null;
>         let pz2 = det?.powerZone2Time ?? act?.powerZone2Time ?? null;
>         let pz3 = det?.powerZone3Time ?? act?.powerZone3Time ?? null;
>         let pz4 = det?.powerZone4Time ?? act?.powerZone4Time ?? null;
>         let pz5 = det?.powerZone5Time ?? act?.powerZone5Time ?? null;
>         let pz6 = det?.powerZone6Time ?? act?.powerZone6Time ?? null;
>         let pz7 = det?.powerZone7Time ?? act?.powerZone7Time ?? null;
> 
>         const ftp = cyclingSettings?.ftpWatts || 200;
>         let streamsObj: any = det?.streams;
>         if (typeof streamsObj === 'string') {
>             try { streamsObj = JSON.parse(streamsObj); } catch { streamsObj = null; }
>         }
>         const wattsStream: number[] | undefined = Array.isArray(streamsObj?.watts) ? streamsObj.watts : undefined;
>         const timeStream: number[] | undefined = Array.isArray(streamsObj?.time) ? streamsObj.time : undefined;
>         const hrStream: number[] | undefined = Array.isArray(streamsObj?.heartrate) ? streamsObj.heartrate : undefined;
> 
>         if (wattsStream && wattsStream.length > 0) {
>             if (det?.npWatts == null) {
>                 const computedNp = calculateNormalizedPower(wattsStream);
>                 if (computedNp != null) npWatts = computedNp;
>             }
>             if (intensityFactor == null && npWatts != null) {
>                 intensityFactor = calculateIntensityFactor(npWatts, ftp);
>             }
>             if (bikeTss == null && npWatts != null) {
>                 const movingTime = det?.movingTime ?? act?.movingTime ?? (timeStream ? timeStream[timeStream.length - 1] - timeStream[0] : 0);
>                 const ifFactor = intensityFactor ?? (npWatts / ftp);
>                 bikeTss = calculateBikeTss(movingTime, npWatts, ifFactor, ftp);
>             }
>             if (variabilityIndex == null && npWatts != null && avgWatts && avgWatts > 0) {
>                 variabilityIndex = calculateVariabilityIndex(npWatts, avgWatts);
>             }
>             if (efficiencyFactor == null && npWatts != null && (activity.averageHr || det?.averageHr)) {
>                 efficiencyFactor = calculateEfficiencyFactor(npWatts, activity.averageHr || det?.averageHr);
>             }
>             if (decouplingPct == null && hrStream && hrStream.length > 0) {
>                 decouplingPct = calculateAerobicDecoupling(wattsStream, hrStream, timeStream);
>             }
>             if (pz1 == null || det?.powerZone1Time == null) {
>                 const computedZones = calculatePowerZoneTimes(wattsStream, timeStream, ftp);
>                 pz1 = computedZones[0] ?? 0;
>                 pz2 = computedZones[1] ?? 0;
>                 pz3 = computedZones[2] ?? 0;
>                 pz4 = computedZones[3] ?? 0;
>                 pz5 = computedZones[4] ?? 0;
>                 pz6 = computedZones[5] ?? 0;
>                 pz7 = computedZones[6] ?? 0;
>             }
>         }
> 
>         const athleteWeight = cyclingSettings?.weightKg || null;
>         const wPerKg: number | null = (avgWatts && athleteWeight && athleteWeight > 0) ? Number((avgWatts / athleteWeight).toFixed(2)) : null;
> 
>         const cogganZones = [
>             { name: 'Z1', label: 'Active Recovery', color: 'bg-emerald-500', textColor: 'text-emerald-500', time: pz1 ?? 0 },
>             { name: 'Z2', label: 'Endurance', color: 'bg-blue-500', textColor: 'text-blue-500', time: pz2 ?? 0 },
>             { name: 'Z3', label: 'Tempo', color: 'bg-cyan-500', textColor: 'text-cyan-500', time: pz3 ?? 0 },
>             { name: 'Z4', label: 'Threshold', color: 'bg-amber-500', textColor: 'text-amber-500', time: pz4 ?? 0 },
>             { name: 'Z5', label: 'VO2max', color: 'bg-orange-500', textColor: 'text-orange-500', time: pz5 ?? 0 },
>             { name: 'Z6', label: 'Anaerobic', color: 'bg-purple-500', textColor: 'text-purple-500', time: pz6 ?? 0 },
>             { name: 'Z7', label: 'Neuromuscular', color: 'bg-rose-500', textColor: 'text-rose-500', time: pz7 ?? 0 },
>         ];
>         const totalPowerZoneSec = cogganZones.reduce((sum, z) => sum + z.time, 0);
>         const activePowerZones = cogganZones.filter(z => z.time > 0);
> 
>         return {
>             npWatts,
>             avgWatts,
>             maxWatts,
>             intensityFactor,
>             variabilityIndex,
>             bikeTss,
>             kilojoules,
>             deviceWatts,
>             efficiencyFactor,
>             decouplingPct,
>             wPerKg,
>             cogganZones,
>             totalPowerZoneSec,
>             activePowerZones,
>         };
>     }, [activity, detailedActivity, cyclingSettings]);
> ```
>
> **REPLACE WITH:**
> ```tsx
>     const powerMetrics = useMemo(() => {
>         if (!activity) return null;
>         const det = detailedActivity as any;
>         const act = activity as any;
> 
>         const titleMatch = (name || activity.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
>         const titleWatts = titleMatch ? parseInt(titleMatch[1], 10) : null;
>         const validTitleWatts = titleWatts && titleWatts >= 40 && titleWatts <= 1500 ? titleWatts : null;
> 
>         let npWatts: number | null = det?.npWatts ?? act?.npWatts ?? det?.weightedAverageWatts ?? act?.weightedAverageWatts ?? validTitleWatts ?? null;
>         let avgWatts: number | null = det?.averageWatts ?? act?.averageWatts ?? validTitleWatts ?? null;
>         const maxWatts: number | null = det?.maxWatts ?? act?.maxWatts ?? null;
>         let intensityFactor: number | null = det?.intensityFactor ?? act?.intensityFactor ?? null;
>         let variabilityIndex: number | null = det?.variabilityIndex ?? act?.variabilityIndex ?? (npWatts && avgWatts && avgWatts > 0 ? Number((npWatts / avgWatts).toFixed(2)) : null);
>         let bikeTss: number | null = det?.bikeTss ?? act?.bikeTss ?? null;
>         let kilojoules: number | null = det?.kilojoules ?? act?.kilojoules ?? null;
>         const deviceWatts: boolean = Boolean(det?.deviceWatts ?? act?.deviceWatts ?? validTitleWatts);
>         let efficiencyFactor: number | null = det?.efficiencyFactor ?? act?.efficiencyFactor ?? (npWatts && (activity.averageHr || det?.averageHr) ? Number((npWatts / (activity.averageHr || det?.averageHr)).toFixed(2)) : null);
>         let decouplingPct: number | null = det?.aerobicDecoupling ?? act?.aerobicDecoupling ?? null;
> 
>         let pz1 = det?.powerZone1Time ?? act?.powerZone1Time ?? null;
>         let pz2 = det?.powerZone2Time ?? act?.powerZone2Time ?? null;
>         let pz3 = det?.powerZone3Time ?? act?.powerZone3Time ?? null;
>         let pz4 = det?.powerZone4Time ?? act?.powerZone4Time ?? null;
>         let pz5 = det?.powerZone5Time ?? act?.powerZone5Time ?? null;
>         let pz6 = det?.powerZone6Time ?? act?.powerZone6Time ?? null;
>         let pz7 = det?.powerZone7Time ?? act?.powerZone7Time ?? null;
> 
>         const ftp = cyclingSettings?.ftpWatts || validTitleWatts || 220;
>         let streamsObj: any = det?.streams;
>         if (typeof streamsObj === 'string') {
>             try { streamsObj = JSON.parse(streamsObj); } catch { streamsObj = null; }
>         }
>         const wattsStream: number[] | undefined = Array.isArray(streamsObj?.watts) ? streamsObj.watts : undefined;
>         const timeStream: number[] | undefined = Array.isArray(streamsObj?.time) ? streamsObj.time : undefined;
>         const hrStream: number[] | undefined = Array.isArray(streamsObj?.heartrate) ? streamsObj.heartrate : undefined;
> 
>         if (wattsStream && wattsStream.length > 0) {
>             if (det?.npWatts == null) {
>                 const computedNp = calculateNormalizedPower(wattsStream);
>                 if (computedNp != null) npWatts = computedNp;
>             }
>             if (pz1 == null || det?.powerZone1Time == null) {
>                 const computedZones = calculatePowerZoneTimes(wattsStream, timeStream, ftp);
>                 pz1 = computedZones[0] ?? 0;
>                 pz2 = computedZones[1] ?? 0;
>                 pz3 = computedZones[2] ?? 0;
>                 pz4 = computedZones[3] ?? 0;
>                 pz5 = computedZones[4] ?? 0;
>                 pz6 = computedZones[5] ?? 0;
>                 pz7 = computedZones[6] ?? 0;
>             }
>             if (decouplingPct == null && hrStream && hrStream.length > 0) {
>                 decouplingPct = calculateAerobicDecoupling(wattsStream, hrStream, timeStream);
>             }
>         }
> 
>         const movingTime = det?.movingTime ?? act?.movingTime ?? (timeStream ? timeStream[timeStream.length - 1] - timeStream[0] : 0);
>         if (intensityFactor == null && npWatts != null && ftp > 0) {
>             intensityFactor = calculateIntensityFactor(npWatts, ftp);
>         }
>         if (bikeTss == null && npWatts != null && ftp > 0 && movingTime > 0) {
>             const ifFactor = intensityFactor ?? (npWatts / ftp);
>             bikeTss = calculateBikeTss(movingTime, npWatts, ifFactor, ftp);
>         }
>         if (kilojoules == null && avgWatts != null && movingTime > 0) {
>             kilojoules = Math.round((avgWatts * movingTime) / 1000);
>         }
>         if (variabilityIndex == null && npWatts != null && avgWatts && avgWatts > 0) {
>             variabilityIndex = calculateVariabilityIndex(npWatts, avgWatts);
>         }
>         if (efficiencyFactor == null && npWatts != null && (activity.averageHr || det?.averageHr)) {
>             efficiencyFactor = calculateEfficiencyFactor(npWatts, activity.averageHr || det?.averageHr);
>         }
> 
>         const athleteWeight = cyclingSettings?.weightKg || null;
>         const wPerKg: number | null = (avgWatts && athleteWeight && athleteWeight > 0) ? Number((avgWatts / athleteWeight).toFixed(2)) : null;
>         const cogganDefinitions = calculateCogganPowerZones(ftp, athleteWeight);
> 
>         const cogganZones = [
>             { name: 'Z1', label: 'Active Recovery', color: 'bg-emerald-500', textColor: 'text-emerald-500', time: pz1 ?? 0, minW: cogganDefinitions[0]?.minWatts ?? 0, maxW: cogganDefinitions[0]?.maxWatts ?? null, pctRange: '<55% FTP' },
>             { name: 'Z2', label: 'Endurance', color: 'bg-blue-500', textColor: 'text-blue-500', time: pz2 ?? 0, minW: cogganDefinitions[1]?.minWatts ?? 0, maxW: cogganDefinitions[1]?.maxWatts ?? null, pctRange: '56–75% FTP' },
>             { name: 'Z3', label: 'Tempo', color: 'bg-cyan-500', textColor: 'text-cyan-500', time: pz3 ?? 0, minW: cogganDefinitions[2]?.minWatts ?? 0, maxW: cogganDefinitions[2]?.maxWatts ?? null, pctRange: '76–90% FTP' },
>             { name: 'Z4', label: 'Threshold', color: 'bg-amber-500', textColor: 'text-amber-500', time: pz4 ?? 0, minW: cogganDefinitions[3]?.minWatts ?? 0, maxW: cogganDefinitions[3]?.maxWatts ?? null, pctRange: '91–105% FTP' },
>             { name: 'Z5', label: 'VO2max', color: 'bg-orange-500', textColor: 'text-orange-500', time: pz5 ?? 0, minW: cogganDefinitions[4]?.minWatts ?? 0, maxW: cogganDefinitions[4]?.maxWatts ?? null, pctRange: '106–120% FTP' },
>             { name: 'Z6', label: 'Anaerobic', color: 'bg-purple-500', textColor: 'text-purple-500', time: pz6 ?? 0, minW: cogganDefinitions[5]?.minWatts ?? 0, maxW: cogganDefinitions[5]?.maxWatts ?? null, pctRange: '121–150% FTP' },
>             { name: 'Z7', label: 'Neuromuscular', color: 'bg-rose-500', textColor: 'text-rose-500', time: pz7 ?? 0, minW: cogganDefinitions[6]?.minWatts ?? 0, maxW: cogganDefinitions[6]?.maxWatts ?? null, pctRange: '>150% FTP' },
>         ];
>         const totalPowerZoneSec = cogganZones.reduce((sum, z) => sum + z.time, 0);
>         const activePowerZones = cogganZones.filter(z => z.time > 0);
> 
>         return {
>             ftp,
>             npWatts,
>             avgWatts,
>             maxWatts,
>             intensityFactor,
>             variabilityIndex,
>             bikeTss,
>             kilojoules,
>             deviceWatts,
>             efficiencyFactor,
>             decouplingPct,
>             wPerKg,
>             cogganZones,
>             totalPowerZoneSec,
>             activePowerZones,
>         };
>     }, [activity, detailedActivity, cyclingSettings, name]);
> ```
>
> Third, in `Web/src/components/ActivityDetailsModal.tsx` (lines 513–520):
>
> **FIND:**
> ```tsx
>                         <div className="glass-card p-4 text-center">
>                             <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
>                                 <Zap className="w-3 h-3" /> Cadence
>                             </div>
>                             <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">{activity.averageCadence ? Math.round(activity.averageCadence) : '-'}</div>
>                             <div className="text-xs text-foreground-muted">{isRide ? 'rpm' : 'spm'}</div>
>                         </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
>                         <div className="glass-card p-4 text-center">
>                             <div className="text-foreground-muted text-xs mb-1 flex items-center justify-center gap-1">
>                                 <Zap className="w-3 h-3" /> Cadence
>                             </div>
>                             <div className="text-2xl font-mono tabular-nums font-semibold text-foreground">
>                                 {activity.averageCadence
>                                     ? Math.round(isRide && activity.averageCadence > 130 ? activity.averageCadence / 2 : activity.averageCadence)
>                                     : '-'}
>                             </div>
>                             <div className="text-xs text-foreground-muted">{isRide ? 'rpm' : 'spm'}</div>
>                         </div>
> ```
>
> Fourth, in `Web/src/components/ActivityDetailsModal.tsx` (lines 626–673 and 734–885):
>
> **FIND:**
> ```tsx
>                             {/* 7-Zone Coggan Power Breakdown */}
>                             {powerMetrics.totalPowerZoneSec > 0 && (
>                                 <div className="pt-2">
>                                     <h4 className="text-xs font-semibold text-foreground-muted border-b border-line pb-2 mb-3">
>                                         Coggan Power Zones (Time in Zone)
>                                     </h4>
>                                     {/* Stacked Horizontal Bar */}
>                                     <div className="w-full h-8 rounded-lg overflow-hidden flex bg-background-secondary mb-3">
>                                         {powerMetrics.activePowerZones.map((z, idx) => {
>                                             const pct = (z.time / powerMetrics.totalPowerZoneSec) * 100;
>                                             return (
>                                                 <div
>                                                     key={idx}
>                                                     className={`${z.color} hover:brightness-110 transition-all flex items-center justify-center`}
>                                                     style={{ width: `${pct}%` }}
>                                                     title={`${z.name} ${z.label}: ${formatDuration(z.time)} (${pct.toFixed(1)}%)`}
>                                                 >
>                                                     {pct >= 8 && (
>                                                         <span className="text-[10px] font-bold text-white drop-shadow-xs">
>                                                             {z.name}
>                                                         </span>
>                                                     )}
>                                                 </div>
>                                             );
>                                         })}
>                                     </div>
> 
>                                     {/* Zone Breakdown List */}
>                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
>                                         {powerMetrics.activePowerZones.map((z, idx) => {
>                                             const pct = (z.time / powerMetrics.totalPowerZoneSec) * 100;
>                                             return (
>                                                 <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-md bg-background-secondary/60 text-xs">
>                                                     <div className="flex items-center gap-2">
>                                                         <span className={`w-2.5 h-2.5 rounded-xs ${z.color}`} />
>                                                         <span className={`font-semibold ${z.textColor}`}>{z.name}</span>
>                                                         <span className="text-foreground-muted text-[11px]">{z.label}</span>
>                                                     </div>
>                                                     <div className="flex items-center gap-2">
>                                                         <span className="font-mono text-foreground font-medium">{formatDuration(z.time)}</span>
>                                                         <span className="font-mono text-foreground-muted w-9 text-right">{pct.toFixed(0)}%</span>
>                                                     </div>
>                                                 </div>
>                                             );
>                                         })}
>                                     </div>
>                                 </div>
>                             )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>                             {/* 7-Zone Coggan Power Breakdown */}
>                             <div className="pt-2">
>                                 <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
>                                     <h4 className="text-xs font-semibold text-foreground-muted">
>                                         Cycling Power Zones (Coggan 7-Zone · FTP {powerMetrics.ftp}W)
>                                     </h4>
>                                     {powerMetrics.totalPowerZoneSec > 0 && (
>                                         <span className="text-[11px] text-foreground-muted font-mono">
>                                             Time in Zone
>                                         </span>
>                                     )}
>                                 </div>
>                                 {powerMetrics.totalPowerZoneSec > 0 && (
>                                     <div className="w-full h-8 rounded-lg overflow-hidden flex bg-background-secondary mb-3">
>                                         {powerMetrics.activePowerZones.map((z, idx) => {
>                                             const pct = (z.time / powerMetrics.totalPowerZoneSec) * 100;
>                                             return (
>                                                 <div
>                                                     key={idx}
>                                                     className={`${z.color} hover:brightness-110 transition-all flex items-center justify-center`}
>                                                     style={{ width: `${pct}%` }}
>                                                     title={`${z.name} ${z.label}: ${formatDuration(z.time)} (${pct.toFixed(1)}%)`}
>                                                 >
>                                                     {pct >= 8 && (
>                                                         <span className="text-[10px] font-bold text-white drop-shadow-xs">
>                                                             {z.name}
>                                                         </span>
>                                                     )}
>                                                 </div>
>                                             );
>                                         })}
>                                     </div>
>                                 )}
> 
>                                 {/* Zone Breakdown List (always shows watt targets; includes time in zone when stream exists) */}
>                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
>                                     {powerMetrics.cogganZones.map((z, idx) => {
>                                         const pct = powerMetrics.totalPowerZoneSec > 0 ? (z.time / powerMetrics.totalPowerZoneSec) * 100 : 0;
>                                         return (
>                                             <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-background-secondary/60 text-xs">
>                                                 <div className="flex items-center gap-2">
>                                                     <span className={`w-2.5 h-2.5 rounded-xs ${z.color}`} />
>                                                     <span className={`font-semibold ${z.textColor}`}>{z.name}</span>
>                                                     <span className="text-foreground-muted text-[11px]">{z.label}</span>
>                                                 </div>
>                                                 <div className="flex items-center gap-2">
>                                                     <span className="font-mono text-[11px] text-foreground-muted">
>                                                         {z.minW}–{z.maxW ?? '∞'}W
>                                                     </span>
>                                                     {powerMetrics.totalPowerZoneSec > 0 && (
>                                                         <>
>                                                             <span className="font-mono text-foreground font-medium">{formatDuration(z.time)}</span>
>                                                             <span className="font-mono text-foreground-muted w-8 text-right">{pct.toFixed(0)}%</span>
>                                                         </>
>                                                     )}
>                                                 </div>
>                                             </div>
>                                         );
>                                     })}
>                                 </div>
>                             </div>
> ```
>
> Fifth, in `Web/src/components/ActivityDetailsModal.tsx` (lines 750–885):
>
> **FIND:**
> ```tsx
>                             <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
>                                 <span className="text-foreground-muted">GAP</span>
>                                 <span className="text-accent-cyan font-medium font-mono tabular-nums">{formatPace(activity.gradeAdjustedSpeed)}</span>
>                             </div>
>                         </div>
> 
>                         {/* Training Load */}
>                         <div className="space-y-4">
>                             <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Training Load</h3>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">TRIMP</span>
>                                 <span className="text-accent-cyan font-medium font-mono tabular-nums">{activity.trimp ? activity.trimp.toFixed(0) : '-'}</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">rTSS</span>
>                                 <span className="text-accent-orange font-medium font-mono tabular-nums">{activity.runningTss ? activity.runningTss.toFixed(0) : '-'}</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Intensity</span>
>                                 <span className="text-foreground font-medium font-mono tabular-nums">
>                                     {(activity.averageHr && (userHrMax || activity.maxHr))
>                                         ? `${Math.round((activity.averageHr / (userHrMax || activity.maxHr!)) * 100)}% HRmax`
>                                         : '-'}
>                                 </span>
>                             </div>
>                             <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
>                                 <span className="text-foreground-muted">Aerobic Fitness (VO2max)</span>
>                                 <span className="text-accent-purple font-medium font-mono tabular-nums">{activity.estimatedVdot ? (activity.estimatedVdot * vdotCorrectionFactor).toFixed(1) : '-'}</span>
>                             </div>
>                         </div>
> 
>                         {/* Device / Other */}
>                         <div className="space-y-4">
>                             <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Details</h3>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Calories</span>
>                                 <span className="text-foreground font-medium font-mono tabular-nums">{activity.calories ? Math.round(activity.calories) : '-'} kcal</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Cadence</span>
>                                 <span className="text-foreground font-medium font-mono tabular-nums">{activity.averageCadence ? Math.round(activity.averageCadence) : '-'} spm</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Device</span>
>                                 <span className="text-foreground font-medium text-xs truncate max-w-[120px]">Strava Sync</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">ID</span>
>                                 <span className="text-foreground font-mono text-xs opacity-50">{activity.id.slice(0, 8)}</span>
>                             </div>
>                         </div>
>                     </div>
> 
>                     {/* Zone Distribution Visualization - Enhanced 7-Zone Display */}
>                     {(activity.hrZone1Time || activity.hrZone2Time) && (() => {
>                         const zones = [
>                             { name: 'Z1', label: 'Recovery', color: 'bg-zone-1', textColor: 'text-zone-1', time: activity.hrZone1Time || 0 },
>                             { name: 'Z2', label: 'Aerobic', color: 'bg-zone-2', textColor: 'text-zone-2', time: activity.hrZone2Time || 0 },
>                             { name: 'Z3', label: 'Tempo', color: 'bg-zone-3', textColor: 'text-zone-3', time: activity.hrZone3Time || 0 },
>                             { name: 'Z4', label: 'Threshold', color: 'bg-zone-4', textColor: 'text-zone-4', time: activity.hrZone4Time || 0 },
>                             { name: 'Z5', label: 'VO2max', color: 'bg-zone-5', textColor: 'text-zone-5', time: activity.hrZone5Time || 0 },
>                             { name: 'Z6', label: 'Anaerobic', color: 'bg-accent-blue', textColor: 'text-accent-blue', time: activity.hrZone6Time || 0 },
>                             { name: 'Z7', label: 'Neuromuscular', color: 'bg-workout-long-run', textColor: 'text-workout-long-run', time: activity.hrZone7Time || 0 }
>                         ];
>                         const total = zones.reduce((sum, z) => sum + z.time, 0);
>                         const activeZones = zones.filter(z => z.time > 0);
> 
>                         if (total === 0) return null;
> 
>                         return (
>                             <div className="mt-6 mb-8">
>                                 <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2 mb-4">Heart Rate Zones</h3>
> ```
>
> **REPLACE WITH:**
> ```tsx
>                             {activity.type === 'RUN' ? (
>                                 <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
>                                     <span className="text-foreground-muted">GAP</span>
>                                     <span className="text-accent-cyan font-medium font-mono tabular-nums">{formatPace(activity.gradeAdjustedSpeed)}</span>
>                                 </div>
>                             ) : isRide ? (
>                                 <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
>                                     <span className="text-foreground-muted">Avg Speed</span>
>                                     <span className="text-accent-cyan font-medium font-mono tabular-nums">
>                                         {activity.averageSpeed ? `${(activity.averageSpeed * 3.6).toFixed(1)} km/h` : '-'}
>                                     </span>
>                                 </div>
>                             ) : null}
>                         </div>
> 
>                         {/* Training Load */}
>                         <div className="space-y-4">
>                             <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Training Load</h3>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">TRIMP</span>
>                                 <span className="text-accent-cyan font-medium font-mono tabular-nums">{activity.trimp ? activity.trimp.toFixed(0) : '-'}</span>
>                             </div>
>                             {isRide ? (
>                                 <div className="flex justify-between items-center">
>                                     <span className="text-foreground-muted">Bike TSS</span>
>                                     <span className="text-accent-orange font-medium font-mono tabular-nums">
>                                         {powerMetrics?.bikeTss ? Math.round(powerMetrics.bikeTss) : '-'}
>                                     </span>
>                                 </div>
>                             ) : activity.type === 'RUN' ? (
>                                 <div className="flex justify-between items-center">
>                                     <span className="text-foreground-muted">rTSS</span>
>                                     <span className="text-accent-orange font-medium font-mono tabular-nums">{activity.runningTss ? activity.runningTss.toFixed(0) : '-'}</span>
>                                 </div>
>                             ) : null}
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Intensity</span>
>                                 <span className="text-foreground font-medium font-mono tabular-nums">
>                                     {(activity.averageHr && (userHrMax || activity.maxHr))
>                                         ? `${Math.round((activity.averageHr / (userHrMax || activity.maxHr!)) * 100)}% HRmax`
>                                         : '-'}
>                                 </span>
>                             </div>
>                             {activity.type === 'RUN' ? (
>                                 <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
>                                     <span className="text-foreground-muted">Aerobic Fitness (VO2max)</span>
>                                     <span className="text-accent-purple font-medium font-mono tabular-nums">{activity.estimatedVdot ? (activity.estimatedVdot * vdotCorrectionFactor).toFixed(1) : '-'}</span>
>                                 </div>
>                             ) : isRide ? (
>                                 <div className="flex justify-between items-center border-t border-line pt-2 mt-2">
>                                     <span className="text-foreground-muted">Normalized Power</span>
>                                     <span className="text-accent-orange font-medium font-mono tabular-nums">
>                                         {powerMetrics?.npWatts ? `${powerMetrics.npWatts} W` : '-'}
>                                     </span>
>                                 </div>
>                             ) : null}
>                         </div>
> 
>                         {/* Device / Other */}
>                         <div className="space-y-4">
>                             <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2">Details</h3>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Calories</span>
>                                 <span className="text-foreground font-medium font-mono tabular-nums">{activity.calories ? Math.round(activity.calories) : '-'} kcal</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Cadence</span>
>                                 <span className="text-foreground font-medium font-mono tabular-nums">
>                                     {activity.averageCadence
>                                         ? `${Math.round(isRide && activity.averageCadence > 130 ? activity.averageCadence / 2 : activity.averageCadence)} ${isRide ? 'rpm' : 'spm'}`
>                                         : `- ${isRide ? 'rpm' : 'spm'}`}
>                                 </span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">Device</span>
>                                 <span className="text-foreground font-medium text-xs truncate max-w-[120px]">Strava Sync</span>
>                             </div>
>                             <div className="flex justify-between items-center">
>                                 <span className="text-foreground-muted">ID</span>
>                                 <span className="text-foreground font-mono text-xs opacity-50">{activity.id.slice(0, 8)}</span>
>                             </div>
>                         </div>
>                     </div>
> 
>                     {/* Zone Distribution Visualization - Enhanced 7-Zone Display */}
>                     {(activity.hrZone1Time || activity.hrZone2Time) && (() => {
>                         const zones = [
>                             { name: 'Z1', label: 'Recovery', color: 'bg-zone-1', textColor: 'text-zone-1', time: activity.hrZone1Time || 0 },
>                             { name: 'Z2', label: 'Aerobic', color: 'bg-zone-2', textColor: 'text-zone-2', time: activity.hrZone2Time || 0 },
>                             { name: 'Z3', label: 'Tempo', color: 'bg-zone-3', textColor: 'text-zone-3', time: activity.hrZone3Time || 0 },
>                             { name: 'Z4', label: 'Threshold', color: 'bg-zone-4', textColor: 'text-zone-4', time: activity.hrZone4Time || 0 },
>                             { name: 'Z5', label: 'VO2max', color: 'bg-zone-5', textColor: 'text-zone-5', time: activity.hrZone5Time || 0 },
>                             { name: 'Z6', label: 'Anaerobic', color: 'bg-accent-blue', textColor: 'text-accent-blue', time: activity.hrZone6Time || 0 },
>                             { name: 'Z7', label: 'Neuromuscular', color: 'bg-workout-long-run', textColor: 'text-workout-long-run', time: activity.hrZone7Time || 0 }
>                         ];
>                         const total = zones.reduce((sum, z) => sum + z.time, 0);
>                         const activeZones = zones.filter(z => z.time > 0);
> 
>                         if (total === 0) return null;
> 
>                         return (
>                             <div className="mt-6 mb-8">
>                                 <h3 className="text-sm font-semibold text-foreground-muted border-b border-line pb-2 mb-4">
>                                     {isRide ? 'Cycling Heart Rate Zones' : 'Running Heart Rate Zones'}
>                                 </h3>
> ```
>
> Sixth, in `Web/src/components/ActivityDetailsModal.tsx` (line 880):
>
> **FIND:**
> ```tsx
>                         ) : detailedActivity?.streams ? (
>                             <InteractiveStreamsChart streams={detailedActivity.streams} />
>                         ) : (
> ```
>
> **REPLACE WITH:**
> ```tsx
>                         ) : detailedActivity?.streams ? (
>                             <InteractiveStreamsChart streams={detailedActivity.streams} activityType={activity.type} />
>                         ) : (
> ```
>
> #### Edit 1.3: Make `InteractiveStreamsChart.tsx` Sport-Aware (Speed `km/h` & Cadence `rpm` on Rides, Hide `GAP` on Rides)
> Open `Web/src/components/InteractiveStreamsChart.tsx` (lines 25–48 and 67–280).
>
> First, in `Web/src/components/InteractiveStreamsChart.tsx` (lines 25–48):
>
> **FIND:**
> ```tsx
> interface InteractiveStreamsChartProps {
>     streams: Streams | null;
> }
> 
> const formatPaceTooltip = (val: number) => {
>     if (!val) return '';
>     const mins = Math.floor(val);
>     const secs = Math.round((val - mins) * 60);
>     return `${mins}:${secs.toString().padStart(2, '0')}`;
> };
> 
> 
> import { ChartErrorBoundary } from '@/components/ErrorBoundary';
> 
> function InteractiveStreamsChartInner({ streams }: InteractiveStreamsChartProps) {
>     const [enabledMetrics, setEnabledMetrics] = useState({
>         heartrate: true,
>         pace: true,
>         gap: true, // Grade Adjusted Pace
>         elevation: true,
>         cadence: false
>     });
> ```
>
> **REPLACE WITH:**
> ```tsx
> interface InteractiveStreamsChartProps {
>     streams: Streams | null;
>     activityType?: string;
> }
> 
> const formatPaceTooltip = (val: number) => {
>     if (!val) return '';
>     const mins = Math.floor(val);
>     const secs = Math.round((val - mins) * 60);
>     return `${mins}:${secs.toString().padStart(2, '0')}`;
> };
> 
> 
> import { ChartErrorBoundary } from '@/components/ErrorBoundary';
> 
> function InteractiveStreamsChartInner({ streams, activityType }: InteractiveStreamsChartProps) {
>     const isRide = activityType === 'RIDE' || activityType === 'VIRTUAL_RIDE';
>     const isRun = !activityType || activityType === 'RUN';
> 
>     const [enabledMetrics, setEnabledMetrics] = useState({
>         heartrate: true,
>         pace: true,
>         gap: isRun, // Grade Adjusted Pace only applies to running
>         elevation: true,
>         cadence: false
>     });
> ```
>
> Second, in `Web/src/components/InteractiveStreamsChart.tsx` (lines 67–146):
>
> **FIND:**
> ```tsx
>             // Pace: velocity (m/s) -> min/km
>             if (streams.velocity_smooth && streams.velocity_smooth[i] !== undefined) {
>                 const mPerS = streams.velocity_smooth[i];
>                 if (mPerS > 0.1) {
>                     const minPerKm = (1000 / mPerS) / 60;
>                     // Cap outlier paces to null (not 0) to avoid false data points
>                     point.pace = minPerKm > 20 ? null : minPerKm;
>                 } else {
>                     point.pace = null;
>                 }
>             }
> 
>             // GAP: Grade Adjusted Pace (Runalyze/Minetti approach)
>             // Calculate grade from altitude change and use metabolic cost ratio
>             if (streams.velocity_smooth && streams.altitude && streams.velocity_smooth[i] !== undefined) {
>                 const mPerS = streams.velocity_smooth[i];
>                 if (mPerS > 0.5 && i >= step && streams.altitude[i] !== undefined && streams.altitude[i - step] !== undefined) {
>                     // Calculate grade (vertical / horizontal distance)
>                     const timeDelta = streams.time[i] - streams.time[i - step];
>                     const elevDelta = streams.altitude[i] - streams.altitude[i - step];
>                     const horizDist = mPerS * timeDelta;
>                     const grade = horizDist > 0 ? (elevDelta / horizDist) * 100 : 0; // as percentage
> 
>                     // Minetti metabolic cost formula (simplified)
>                     // Cost ratio relative to flat running
>                     // Uphill: more effort -> GAP faster than actual
>                     // Downhill: less effort (to a point) -> GAP slower than actual
>                     let costRatio = 1.0;
>                     if (grade > 0) {
>                         // Uphill: ~2.5-3% more cost per 1% grade
>                         costRatio = 1 + (grade * 0.03);
>                     } else if (grade < 0) {
>                         // Downhill: optimal around -10%, less cost
>                         const absGrade = Math.abs(grade);
>                         if (absGrade < 10) {
>                             costRatio = 1 - (absGrade * 0.015); // Slight benefit
>                         } else {
>                             costRatio = 0.85 + ((absGrade - 10) * 0.02); // Steeper = harder
>                         }
>                     }
> 
>                     // GAP = actual pace / cost ratio (faster if harder effort)
>                     const actualPace = (1000 / mPerS) / 60;
>                     const gapPace = actualPace / costRatio;
>                     point.gap = gapPace > 20 || gapPace < 2 ? null : gapPace;
>                 } else {
>                     point.gap = null;
>                 }
>             }
> 
>             // Elevation - check !== undefined since 0 is valid
>             if (streams.altitude && streams.altitude[i] !== undefined) {
>                 point.elevation = streams.altitude[i];
>             }
> 
>             // Cadence - multiply by 2 for runs (Strava returns rpm, we show spm)
>             if (streams.cadence && streams.cadence[i] !== undefined) {
>                 point.cadence = streams.cadence[i] * 2;
>             }
> 
>             processed.push(point);
>         }
> 
>         return processed;
>     }, [
>         streams?.time,
>         streams?.heartrate,
>         streams?.velocity_smooth,
>         streams?.altitude,
>         streams?.cadence
>     ]);
> 
>     // Determine which streams are available
>     const hasHeartrate = Boolean(streams?.heartrate?.length);
>     const hasPace = Boolean(streams?.velocity_smooth?.length);
>     const hasGap = Boolean(streams?.velocity_smooth?.length && streams?.altitude?.length);
> ```
>
> **REPLACE WITH:**
> ```tsx
>             // Pace (min/km for runs) or Speed (km/h for rides)
>             if (streams.velocity_smooth && streams.velocity_smooth[i] !== undefined) {
>                 const mPerS = streams.velocity_smooth[i];
>                 if (isRide) {
>                     point.pace = mPerS > 0.1 ? Number((mPerS * 3.6).toFixed(1)) : null;
>                 } else if (mPerS > 0.1) {
>                     const minPerKm = (1000 / mPerS) / 60;
>                     point.pace = minPerKm > 20 ? null : minPerKm;
>                 } else {
>                     point.pace = null;
>                 }
>             }
> 
>             // GAP: Grade Adjusted Pace (only valid for running)
>             if (isRun && streams.velocity_smooth && streams.altitude && streams.velocity_smooth[i] !== undefined) {
>                 const mPerS = streams.velocity_smooth[i];
>                 if (mPerS > 0.5 && i >= step && streams.altitude[i] !== undefined && streams.altitude[i - step] !== undefined) {
>                     const timeDelta = streams.time[i] - streams.time[i - step];
>                     const elevDelta = streams.altitude[i] - streams.altitude[i - step];
>                     const horizDist = mPerS * timeDelta;
>                     const grade = horizDist > 0 ? (elevDelta / horizDist) * 100 : 0;
> 
>                     let costRatio = 1.0;
>                     if (grade > 0) {
>                         costRatio = 1 + (grade * 0.03);
>                     } else if (grade < 0) {
>                         const absGrade = Math.abs(grade);
>                         if (absGrade < 10) {
>                             costRatio = 1 - (absGrade * 0.015);
>                         } else {
>                             costRatio = 0.85 + ((absGrade - 10) * 0.02);
>                         }
>                     }
> 
>                     const actualPace = (1000 / mPerS) / 60;
>                     const gapPace = actualPace / costRatio;
>                     point.gap = gapPace > 20 || gapPace < 2 ? null : gapPace;
>                 } else {
>                     point.gap = null;
>                 }
>             }
> 
>             // Elevation - check !== undefined since 0 is valid
>             if (streams.altitude && streams.altitude[i] !== undefined) {
>                 point.elevation = streams.altitude[i];
>             }
> 
>             // Cadence - multiply by 2 only for runs (Strava returns rpm; cycling uses raw rpm)
>             if (streams.cadence && streams.cadence[i] !== undefined) {
>                 point.cadence = isRide ? streams.cadence[i] : streams.cadence[i] * 2;
>             }
> 
>             processed.push(point);
>         }
> 
>         return processed;
>     }, [
>         streams?.time,
>         streams?.heartrate,
>         streams?.velocity_smooth,
>         streams?.altitude,
>         streams?.cadence,
>         isRide,
>         isRun,
>     ]);
> 
>     // Determine which streams are available
>     const hasHeartrate = Boolean(streams?.heartrate?.length);
>     const hasPace = Boolean(streams?.velocity_smooth?.length);
>     const hasGap = Boolean(isRun && streams?.velocity_smooth?.length && streams?.altitude?.length);
> ```
>
> Third, in `Web/src/components/InteractiveStreamsChart.tsx` (lines 182–280):
>
> **FIND:**
> ```tsx
>                 {hasPace && (
>                     <button
>                         onClick={() => setEnabledMetrics(p => ({ ...p, pace: !p.pace }))}
>                         className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.pace
>                             ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
>                             : 'bg-transparent text-foreground-muted border-foreground/20 hover:text-foreground-muted'
>                             }`}
>                     >
>                         <TrendingUp className="w-3 h-3" /> Pace
>                     </button>
>                 )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>                 {hasPace && (
>                     <button
>                         onClick={() => setEnabledMetrics(p => ({ ...p, pace: !p.pace }))}
>                         className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${enabledMetrics.pace
>                             ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
>                             : 'bg-transparent text-foreground-muted border-foreground/20 hover:text-foreground-muted'
>                             }`}
>                     >
>                         <TrendingUp className="w-3 h-3" /> {isRide ? 'Speed' : 'Pace'}
>                     </button>
>                 )}
> ```
>
> Fourth, in `Web/src/components/InteractiveStreamsChart.tsx` (lines 241–308):
>
> **FIND:**
> ```tsx
>                         <Tooltip content={<ChartTooltip
>                             labelFormatter={(label: any) => `${Math.floor(label / 60)}m ${label % 60 > 0 ? `${label % 60}s` : ''}`}
>                             formatter={(value: any, name: string) => {
>                                 if (name === 'Pace' || name === 'GAP') return [formatPaceTooltip(value) + '/km', name];
>                                 if (name === 'Heart Rate') return [Math.round(value) + ' bpm', name];
>                                 if (name === 'Elevation') return [Math.round(value) + ' m', name];
>                                 if (name === 'Cadence') return [Math.round(value) + ' spm', name];
>                                 return value;
>                             }}
>                         />} />
>                         <Legend wrapperStyle={{ paddingTop: '10px' }} />
> 
>                         {enabledMetrics.heartrate && hasHeartrate && (
>                             <YAxis yAxisId="hr" domain={['dataMin - 10', 'dataMax + 10']} hide />
>                         )}
>                         {enabledMetrics.pace && hasPace && (
>                             <YAxis
>                                 yAxisId="pace"
>                                 domain={[3, 15]}
>                                 reversed
>                                 hide
>                                 ticks={[0, 3, 6, 9, 12, 15]}
>                             />
>                         )}
>                         {enabledMetrics.gap && hasGap && (
>                             <YAxis
>                                 yAxisId="gap"
>                                 domain={[3, 15]}
>                                 reversed
>                                 hide
>                                 ticks={[0, 3, 6, 9, 12, 15]}
>                             />
>                         )}
>                         {enabledMetrics.elevation && hasElevation && (
>                             <YAxis yAxisId="elev" domain={['dataMin', 'dataMax']} hide />
>                         )}
>                         {enabledMetrics.cadence && hasCadence && (
>                             <YAxis yAxisId="cad" domain={[120, 220]} hide />
>                         )}
> 
>                         {enabledMetrics.heartrate && hasHeartrate && (
>                             <Line
>                                 yAxisId="hr"
>                                 type="monotone"
>                                 dataKey="heartrate"
>                                 name="Heart Rate"
>                                 stroke="var(--negative)"
>                                 strokeWidth={2}
>                                 dot={false}
>                                 activeDot={{ r: 4 }}
>                                 isAnimationActive={false}
>                                 connectNulls
>                             />
>                         )}
>                         {enabledMetrics.pace && hasPace && (
>                             <Line
>                                 yAxisId="pace"
>                                 type="monotone"
>                                 dataKey="pace"
>                                 name="Pace"
>                                 stroke="var(--accent-blue)"
>                                 strokeWidth={2}
>                                 dot={false}
>                                 activeDot={{ r: 4 }}
>                                 isAnimationActive={false}
>                                 connectNulls
>                             />
>                         )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>                         <Tooltip content={<ChartTooltip
>                             labelFormatter={(label: any) => `${Math.floor(label / 60)}m ${label % 60 > 0 ? `${label % 60}s` : ''}`}
>                             formatter={(value: any, name: string) => {
>                                 if (name === 'Speed') return [`${Number(value).toFixed(1)} km/h`, name];
>                                 if (name === 'Pace' || name === 'GAP') return [formatPaceTooltip(value) + '/km', name];
>                                 if (name === 'Heart Rate') return [Math.round(value) + ' bpm', name];
>                                 if (name === 'Elevation') return [Math.round(value) + ' m', name];
>                                 if (name === 'Cadence') return [Math.round(value) + (isRide ? ' rpm' : ' spm'), name];
>                                 return value;
>                             }}
>                         />} />
>                         <Legend wrapperStyle={{ paddingTop: '10px' }} />
> 
>                         {enabledMetrics.heartrate && hasHeartrate && (
>                             <YAxis yAxisId="hr" domain={['dataMin - 10', 'dataMax + 10']} hide />
>                         )}
>                         {enabledMetrics.pace && hasPace && (
>                             <YAxis
>                                 yAxisId="pace"
>                                 domain={isRide ? ['dataMin - 2', 'dataMax + 2'] : [3, 15]}
>                                 reversed={!isRide}
>                                 hide
>                             />
>                         )}
>                         {enabledMetrics.gap && hasGap && (
>                             <YAxis
>                                 yAxisId="gap"
>                                 domain={[3, 15]}
>                                 reversed
>                                 hide
>                                 ticks={[0, 3, 6, 9, 12, 15]}
>                             />
>                         )}
>                         {enabledMetrics.elevation && hasElevation && (
>                             <YAxis yAxisId="elev" domain={['dataMin', 'dataMax']} hide />
>                         )}
>                         {enabledMetrics.cadence && hasCadence && (
>                             <YAxis yAxisId="cad" domain={isRide ? [40, 130] : [120, 220]} hide />
>                         )}
> 
>                         {enabledMetrics.heartrate && hasHeartrate && (
>                             <Line
>                                 yAxisId="hr"
>                                 type="monotone"
>                                 dataKey="heartrate"
>                                 name="Heart Rate"
>                                 stroke="var(--negative)"
>                                 strokeWidth={2}
>                                 dot={false}
>                                 activeDot={{ r: 4 }}
>                                 isAnimationActive={false}
>                                 connectNulls
>                             />
>                         )}
>                         {enabledMetrics.pace && hasPace && (
>                             <Line
>                                 yAxisId="pace"
>                                 type="monotone"
>                                 dataKey="pace"
>                                 name={isRide ? 'Speed' : 'Pace'}
>                                 stroke="var(--accent-blue)"
>                                 strokeWidth={2}
>                                 dot={false}
>                                 activeDot={{ r: 4 }}
>                                 isAnimationActive={false}
>                                 connectNulls
>                             />
>                         )}
> ```
>
> #### Edit 1.4: Fix Sport-Specific Summary Cards, Power Zones & Charts on `/activity/[id]/analysis` (`Web/src/components/analysis/ClientAnalysis.tsx`)
> Open `Web/src/components/analysis/ClientAnalysis.tsx` (lines 17–115 and lines 190–295).
>
> First, in `Web/src/components/analysis/ClientAnalysis.tsx` (lines 17–115):
>
> **FIND:**
> ```tsx
> export default function ClientAnalysis({ activity }: ClientAnalysisProps) {
>     const streams = activity.streams;
> 
>     // Memoize chart data transformation to avoid recalculation on re-render
>     const chartData = useMemo(() => {
>         if (!streams?.time) return [];
> 
>         return streams.time.map((t: number, i: number) => {
>             // Determine max pace based on activity type
>             const trainingType = activity.trainingType || 'RUN';
>             // 15 min/km for running, 20 min/km for others (like hiking/walking)
>             const maxPace = (trainingType === 'RUN' || trainingType === 'EASY' || trainingType.includes('RUN')) ? 15 : 20;
> 
>             return {
>                 time: t,
>                 distance: streams.distance ? streams.distance[i] : 0,
>                 hr: streams.heartrate ? streams.heartrate[i] : null,
>                 pace: (streams.velocity_smooth && streams.velocity_smooth[i] > 0.5)
>                     ? Math.min(maxPace, (1000 / streams.velocity_smooth[i]) / 60)
>                     : null,
>                 altitude: streams.altitude ? streams.altitude[i] : null,
>                 cadence: streams.cadence ? streams.cadence[i] * 2 : null,
>             };
>         }).filter((d: any) => d.hr !== null || d.pace !== null);
>     }, [streams, activity.trainingType]);
> 
>     // Memoize formatXAxis to avoid recreating on every render
>     const formatXAxis = useCallback((tickItem: string | number) => {
>         const numTick = typeof tickItem === 'number' ? tickItem : parseFloat(tickItem);
>         const mins = Math.floor(numTick / 60);
>         return `${mins}m`;
>     }, []);
> 
>     const avgHr = activity.averageHr || 0;
> 
>     return (
>         <div className="min-h-screen bg-background text-foreground p-6">
>             {/* Header */}
>             <div className="mb-8 flex items-center gap-4">
>                 <Link href="/" className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
>                     <ArrowLeft className="w-6 h-6" />
>                 </Link>
>                 <div>
>                     <h1 className="text-2xl font-bold">{activity.name}</h1>
>                     <div className="flex items-center gap-2 text-foreground-muted text-sm">
>                         <Calendar className="w-4 h-4" />
>                         <span>{format(new Date(activity.startDate), 'PPP p')}</span>
>                         <span className="px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple text-xs border border-accent-purple/50">
>                             {activity.trainingType?.replace('_', ' ') || 'RUN'}
>                         </span>
>                     </div>
>                 </div>
>             </div>
> 
>             {/* Summary Cards */}
>             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
>                 <div className="glass-card p-4">
>                     <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <MapPin className="w-3 h-3" /> Distance
>                     </div>
>                     <div className="text-2xl font-bold">{(activity.distance / 1000).toFixed(2)} <span className="text-sm font-normal text-foreground-muted">km</span></div>
>                 </div>
>                 <div className="glass-card p-4">
>                     <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Clock className="w-3 h-3" /> Duration
>                     </div>
>                     <div className="text-2xl font-bold">{(activity.movingTime / 60).toFixed(0)} <span className="text-sm font-normal text-foreground-muted">min</span></div>
>                 </div>
>                 <div className="glass-card p-4">
>                     <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Zap className="w-3 h-3" /> Avg Pace
>                     </div>
>                     <div className="text-2xl font-bold">
>                         {activity.averageSpeed ? Math.floor(16.6667 / activity.averageSpeed) + ':' + Math.round((16.6667 / activity.averageSpeed % 1) * 60).toString().padStart(2, '0') : '-'}
>                         <span className="text-sm font-normal text-foreground-muted"> /km</span>
>                     </div>
>                 </div>
>                 <div className="glass-card p-4 text-center">
>                     <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Heart className="w-3 h-3" /> Avg HR
>                     </div>
>                     <div className="text-2xl font-bold">{Math.round(avgHr)} <span className="text-sm font-normal text-foreground-muted">bpm</span></div>
>                 </div>
>                 <div className="glass-card p-4 text-center">
>                     <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Zap className="w-3 h-3" /> Avg Cadence
>                     </div>
>                     <div className="text-2xl font-bold">{activity.averageCadence ? Math.round(activity.averageCadence) : '-'} <span className="text-sm font-normal text-foreground-muted">spm</span></div>
>                 </div>
>             </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
> export default function ClientAnalysis({ activity }: ClientAnalysisProps) {
>     const streams = activity.streams;
>     const isRide = activity.type === 'RIDE' || (activity as any).type === 'VIRTUAL_RIDE' || (activity as any).sportType?.toLowerCase().includes('ride');
>     const titleWattsMatch = (activity.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
>     const parsedTitleWatts = titleWattsMatch ? parseInt(titleWattsMatch[1], 10) : null;
>     const rideWatts = (activity as any).npWatts ?? activity.averageWatts ?? (parsedTitleWatts && parsedTitleWatts >= 40 && parsedTitleWatts <= 1500 ? parsedTitleWatts : null);
> 
>     const badgeLabel = useMemo(() => {
>         if (isRide) {
>             if (/\bftp\s*test\b|\bramp\s*test\b/i.test(activity.name)) return 'FTP TEST';
>             if (activity.trainingType && activity.trainingType !== 'EASY') return activity.trainingType.replace('_', ' ');
>             return 'CYCLING';
>         }
>         return activity.trainingType?.replace('_', ' ') || 'RUN';
>     }, [activity.name, activity.trainingType, isRide]);
> 
>     // Memoize chart data transformation to avoid recalculation on re-render
>     const chartData = useMemo(() => {
>         if (!streams?.time) return [];
> 
>         return streams.time.map((t: number, i: number) => {
>             const trainingType = activity.trainingType || 'RUN';
>             const maxPace = (trainingType === 'RUN' || trainingType === 'EASY' || trainingType.includes('RUN')) ? 15 : 20;
> 
>             return {
>                 time: t,
>                 distance: streams.distance ? streams.distance[i] : 0,
>                 hr: streams.heartrate ? streams.heartrate[i] : null,
>                 pace: (streams.velocity_smooth && streams.velocity_smooth[i] > 0.5)
>                     ? (isRide ? Number((streams.velocity_smooth[i] * 3.6).toFixed(1)) : Math.min(maxPace, (1000 / streams.velocity_smooth[i]) / 60))
>                     : null,
>                 altitude: streams.altitude ? streams.altitude[i] : null,
>                 cadence: streams.cadence ? (isRide ? streams.cadence[i] : streams.cadence[i] * 2) : null,
>             };
>         }).filter((d: any) => d.hr !== null || d.pace !== null);
>     }, [streams, activity.trainingType, isRide]);
> 
>     // Memoize formatXAxis to avoid recreating on every render
>     const formatXAxis = useCallback((tickItem: string | number) => {
>         const numTick = typeof tickItem === 'number' ? tickItem : parseFloat(tickItem);
>         const mins = Math.floor(numTick / 60);
>         return `${mins}m`;
>     }, []);
> 
>     const avgHr = activity.averageHr || 0;
>     const displayCadence = activity.averageCadence
>         ? Math.round(isRide && activity.averageCadence > 130 ? activity.averageCadence / 2 : activity.averageCadence)
>         : null;
> 
>     return (
>         <div className="min-h-screen bg-background text-foreground p-6">
>             {/* Header */}
>             <div className="mb-8 flex items-center gap-4">
>                 <Link href="/" className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
>                     <ArrowLeft className="w-6 h-6" />
>                 </Link>
>                 <div>
>                     <h1 className="text-2xl font-bold">{activity.name}</h1>
>                     <div className="flex items-center gap-2 text-foreground-muted text-sm">
>                         <Calendar className="w-4 h-4" />
>                         <span>{format(new Date(activity.startDate), 'PPP p')}</span>
>                         <span className="px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple text-xs border border-accent-purple/50">
>                             {badgeLabel}
>                         </span>
>                     </div>
>                 </div>
>             </div>
> 
>             {/* Summary Cards */}
>             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
>                 <div className="glass-card p-4">
>                     <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <MapPin className="w-3 h-3" /> Distance
>                     </div>
>                     <div className="text-2xl font-bold">{(activity.distance / 1000).toFixed(2)} <span className="text-sm font-normal text-foreground-muted">km</span></div>
>                 </div>
>                 <div className="glass-card p-4">
>                     <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Clock className="w-3 h-3" /> Duration
>                     </div>
>                     <div className="text-2xl font-bold">{(activity.movingTime / 60).toFixed(0)} <span className="text-sm font-normal text-foreground-muted">min</span></div>
>                 </div>
>                 <div className="glass-card p-4">
>                     <div className="flex items-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Zap className="w-3 h-3" /> {isRide ? (rideWatts ? 'Power / Speed' : 'Avg Speed') : 'Avg Pace'}
>                     </div>
>                     <div className="text-2xl font-bold">
>                         {isRide ? (
>                             rideWatts ? (
>                                 <>
>                                     {Math.round(rideWatts)} <span className="text-sm font-normal text-accent-orange">W</span>
>                                     {activity.averageSpeed ? (
>                                         <span className="text-xs font-normal text-foreground-muted ml-2">
>                                             ({(activity.averageSpeed * 3.6).toFixed(1)} km/h)
>                                         </span>
>                                     ) : null}
>                                 </>
>                             ) : (
>                                 <>
>                                     {activity.averageSpeed ? (activity.averageSpeed * 3.6).toFixed(1) : '-'}
>                                     <span className="text-sm font-normal text-foreground-muted"> km/h</span>
>                                 </>
>                             )
>                         ) : (
>                             <>
>                                 {activity.averageSpeed ? Math.floor(16.6667 / activity.averageSpeed) + ':' + Math.round((16.6667 / activity.averageSpeed % 1) * 60).toString().padStart(2, '0') : '-'}
>                                 <span className="text-sm font-normal text-foreground-muted"> /km</span>
>                             </>
>                         )}
>                     </div>
>                 </div>
>                 <div className="glass-card p-4 text-center">
>                     <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Heart className="w-3 h-3" /> Avg HR
>                     </div>
>                     <div className="text-2xl font-bold">{Math.round(avgHr)} <span className="text-sm font-normal text-foreground-muted">bpm</span></div>
>                 </div>
>                 <div className="glass-card p-4 text-center">
>                     <div className="flex items-center justify-center gap-2 text-foreground-muted text-xs uppercase mb-1">
>                         <Zap className="w-3 h-3" /> Avg Cadence
>                     </div>
>                     <div className="text-2xl font-bold">{displayCadence ?? '-'} <span className="text-sm font-normal text-foreground-muted">{isRide ? 'rpm' : 'spm'}</span></div>
>                 </div>
>             </div>
> ```
>
> Second, in `Web/src/components/analysis/ClientAnalysis.tsx` (lines 190–295):
>
> **FIND:**
> ```tsx
>             {/* Combined Interactive Chart */}
>             <div className="glass-card p-6 mb-8">
>                 <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
>                 <InteractiveStreamsChart streams={streams} />
>             </div>
> 
>             {/* Graphs */}
>             <div className="space-y-6">
>                 {/* Heart Rate Graph */}
>                 <div className="glass-card p-6">
>                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
>                         <Heart className="w-4 h-4 text-red-500" /> Heart Rate
>                     </h3>
>                     <div className="h-[300px] w-full">
>                         <ResponsiveContainer width="100%" height="100%">
>                             <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
>                                 <defs>
>                                     <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
>                                         <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
>                                         <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
>                                     </linearGradient>
>                                 </defs>
>                                 <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
>                                 <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
>                                 <Tooltip
>                                     content={<ChartTooltip labelFormatter={formatXAxis} />}
>                                 />
>                                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
>                                 <Area type="monotone" dataKey="hr" stroke="#ef4444" fillOpacity={1} fill="url(#colorHr)" unit=" bpm" />
>                             </AreaChart>
>                         </ResponsiveContainer>
>                     </div>
>                 </div>
> 
>                 {/* Pace Graph */}
>                 <div className="glass-card p-6">
>                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
>                         <Zap className="w-4 h-4 text-blue-500" /> Pace (min/km)
>                     </h3>
>                     <div className="h-[300px] w-full">
>                         <ResponsiveContainer width="100%" height="100%">
>                             <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
>                                 <defs>
>                                     <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
>                                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
>                                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
>                                     </linearGradient>
>                                 </defs>
>                                 <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
>                                 <YAxis domain={['dataMax', 'dataMin']} stroke="#6b7280" ticks={[0, 3, 6, 9, 12, 15]} />
>                                 <Tooltip
>                                     content={<ChartTooltip
>                                         labelFormatter={formatXAxis}
>                                         formatter={(value: string | number) => {
>                                             const numVal = typeof value === 'number' ? value : parseFloat(value);
>                                             const mins = Math.floor(numVal);
>                                             const secs = Math.round((numVal % 1) * 60).toString().padStart(2, '0');
>                                             return [`${mins}:${secs}`, 'Pace'];
>                                         }}
>                                     />}
>                                 />
>                                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
>                                 <Area type="monotone" dataKey="pace" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPace)" connectNulls />
>                             </AreaChart>
>                         </ResponsiveContainer>
>                     </div>
>                 </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
>             {/* Combined Interactive Chart */}
>             <div className="glass-card p-6 mb-8">
>                 <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
>                 <InteractiveStreamsChart streams={streams} activityType={activity.type} />
>             </div>
> 
>             {/* Graphs */}
>             <div className="space-y-6">
>                 {/* Heart Rate Graph */}
>                 <div className="glass-card p-6">
>                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
>                         <Heart className="w-4 h-4 text-red-500" /> Heart Rate
>                     </h3>
>                     <div className="h-[300px] w-full">
>                         <ResponsiveContainer width="100%" height="100%">
>                             <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
>                                 <defs>
>                                     <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
>                                         <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
>                                         <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
>                                     </linearGradient>
>                                 </defs>
>                                 <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
>                                 <YAxis domain={['auto', 'auto']} stroke="#6b7280" />
>                                 <Tooltip
>                                     content={<ChartTooltip labelFormatter={formatXAxis} />}
>                                 />
>                                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
>                                 <Area type="monotone" dataKey="hr" stroke="#ef4444" fillOpacity={1} fill="url(#colorHr)" unit=" bpm" />
>                             </AreaChart>
>                         </ResponsiveContainer>
>                     </div>
>                 </div>
> 
>                 {/* Pace / Speed Graph */}
>                 <div className="glass-card p-6">
>                     <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
>                         <Zap className="w-4 h-4 text-blue-500" /> {isRide ? 'Speed (km/h)' : 'Pace (min/km)'}
>                     </h3>
>                     <div className="h-[300px] w-full">
>                         <ResponsiveContainer width="100%" height="100%">
>                             <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
>                                 <defs>
>                                     <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
>                                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
>                                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
>                                     </linearGradient>
>                                 </defs>
>                                 <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#6b7280" />
>                                 <YAxis
>                                     domain={isRide ? ['auto', 'auto'] : ['dataMax', 'dataMin']}
>                                     stroke="#6b7280"
>                                     ticks={isRide ? undefined : [0, 3, 6, 9, 12, 15]}
>                                 />
>                                 <Tooltip
>                                     content={<ChartTooltip
>                                         labelFormatter={formatXAxis}
>                                         formatter={(value: string | number) => {
>                                             const numVal = typeof value === 'number' ? value : parseFloat(value);
>                                             if (isRide) return [`${numVal.toFixed(1)} km/h`, 'Speed'];
>                                             const mins = Math.floor(numVal);
>                                             const secs = Math.round((numVal % 1) * 60).toString().padStart(2, '0');
>                                             return [`${mins}:${secs}`, 'Pace'];
>                                         }}
>                                     />}
>                                 />
>                                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
>                                 <Area type="monotone" dataKey="pace" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPace)" connectNulls />
>                             </AreaChart>
>                         </ResponsiveContainer>
>                     </div>
>                 </div>
> ```
>
> Third, in `Web/src/components/analysis/ClientAnalysis.tsx` (lines 286–292):
>
> **FIND:**
> ```tsx
>                 {/* Cadence Graph */}
>                 {chartData.some((d: any) => d.cadence) && (
>                     <div className="glass-card p-6">
>                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
>                             <Zap className="w-4 h-4 text-accent-purple" /> Cadence (spm)
>                         </h3>
> ```
>
> **REPLACE WITH:**
> ```tsx
>                 {/* Cadence Graph */}
>                 {chartData.some((d: any) => d.cadence) && (
>                     <div className="glass-card p-6">
>                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
>                             <Zap className="w-4 h-4 text-accent-purple" /> Cadence ({isRide ? 'rpm' : 'spm'})
>                         </h3>
> ```
>
> #### Edit 1.5: Fix Cycling Classification, Title Watts Fallback & Cadence RPM in `Web/src/lib/strava/transform.ts`
> Open `Web/src/lib/strava/transform.ts` (lines 144–160, lines 292–339, and lines 356–399).
>
> First, in `Web/src/lib/strava/transform.ts` (lines 144–160):
>
> **FIND:**
> ```ts
> function determineWorkoutType(activity: StravaActivity): WorkoutType {
>     if (activity.workout_type === 1) return 'RACE';
>     if (activity.workout_type === 2) return 'LONG_RUN';
>     if (activity.workout_type === 3) return 'INTERVALS';
> 
>     if (activity.type === 'Run' || activity.type === 'VirtualRun') {
>         const distKm = activity.distance / 1000;
>         if (distKm >= 15) return 'LONG_RUN';
>         return 'EASY';
>     }
> 
>     if (activity.type === 'Ride' || activity.type === 'VirtualRide') return 'RIDE';
>     if (activity.type === 'Swim') return 'SWIM';
>     if (activity.type === 'WeightTraining') return 'STRENGTH';
> 
>     return 'OTHER';
> }
> ```
>
> **REPLACE WITH:**
> ```ts
> function determineWorkoutType(activity: StravaActivity): WorkoutType {
>     if (activity.workout_type === 1) return 'RACE';
>     if (activity.workout_type === 2) return 'LONG_RUN';
>     if (activity.workout_type === 3) return 'INTERVALS';
> 
>     if (activity.type === 'Run' || activity.type === 'VirtualRun' || activity.type === 'TrailRun') {
>         const distKm = activity.distance / 1000;
>         if (distKm >= 15) return 'LONG_RUN';
>         return 'EASY';
>     }
> 
>     if (
>         activity.type === 'Ride' ||
>         activity.type === 'VirtualRide' ||
>         activity.type === 'GravelRide' ||
>         activity.type === 'MountainBikeRide'
>     ) {
>         const name = activity.name || '';
>         if (/\bftp\s*test\b|\bramp\s*test\b|\brace\b/i.test(name)) return 'RACE';
>         if (/\binterval|\bvo2|\banaerobic|\bhiit|\bthreshold|\bsweet\s*spot|\btempo\b/i.test(name)) return 'RIDE_INTERVALS';
>         if (/\brecovery\b|\beasy\s*spin\b/i.test(name)) return 'RECOVERY';
>         if ((activity.moving_time ?? 0) >= 7200) return 'LONG_RIDE';
>         return 'RIDE';
>     }
>     if (activity.type === 'Swim') return 'SWIM';
>     if (activity.type === 'WeightTraining') return 'STRENGTH';
> 
>     return 'OTHER';
> }
> ```
>
> Second, in `Web/src/lib/strava/transform.ts` (lines 292–399):
>
> **FIND:**
> ```ts
>     const isCycling = mappedType === ActivityType.RIDE || mappedType === ActivityType.VIRTUAL_RIDE;
>     const hasWattsData = isCycling || Boolean(activity.average_watts || activity.device_watts || streams?.watts);
> 
>     if (hasWattsData) {
>         const ftpWatts = user.ftpWatts ?? null;
> 
>         if (streams?.watts && streams.watts.length > 0) {
>             npWatts = calculateNormalizedPower(
>                 streams.watts,
>                 streams.time,
>                 activity.weighted_average_watts,
>                 activity.average_watts
>             );
> 
>             if (ftpWatts && ftpWatts > 0) {
>                 powerZoneTimes = calculatePowerZoneTimes(streams.watts, streams.time, ftpWatts);
>             }
> 
>             if (streams.heartrate && streams.heartrate.length > 0) {
>                 aerobicDecoupling = calculateAerobicDecoupling(streams.watts, streams.heartrate, streams.time);
>             }
>         } else {
>             npWatts = calculateNormalizedPower(
>                 null,
>                 null,
>                 activity.weighted_average_watts,
>                 activity.average_watts
>             );
>         }
> 
>         const avgWatts = activity.average_watts ?? null;
> 
>         if (npWatts && ftpWatts && ftpWatts > 0) {
>             intensityFactor = calculateIntensityFactor(npWatts, ftpWatts);
>             if (intensityFactor && activity.moving_time > 0) {
>                 bikeTss = calculateBikeTss(activity.moving_time, npWatts, intensityFactor, ftpWatts);
>             }
>         }
> 
>         if (npWatts && avgWatts && avgWatts > 0) {
>             variabilityIndex = calculateVariabilityIndex(npWatts, avgWatts);
>         }
> 
>         if (npWatts && activity.average_heartrate && activity.average_heartrate > 0) {
>             efficiencyFactor = calculateEfficiencyFactor(npWatts, activity.average_heartrate);
>         }
>     }
> 
>     return {
>         trimp,
>         calculatedCalories,
>         runningTss,
>         estimatedVdot,
>         zoneTimes,
>         npWatts,
>         intensityFactor,
>         variabilityIndex,
>         bikeTss,
>         efficiencyFactor,
>         aerobicDecoupling,
>         powerZoneTimes,
>     };
> }
> 
> export function transformActivityData(
>     activity: StravaActivity,
>     metrics: ReturnType<typeof enrichActivityMetrics>
> ): ActivityData {
>     return {
>         name: activity.name,
>         description: activity.description ?? null,
>         type: mapActivityType(activity.type),
>         sportType: activity.sport_type,
>         startDate: new Date(activity.start_date),
>         timezone: activity.timezone,
>         distance: activity.distance,
>         movingTime: activity.moving_time,
>         elapsedTime: activity.elapsed_time,
>         averageSpeed: activity.average_speed,
>         maxSpeed: activity.max_speed,
>         gradeAdjustedSpeed: activity.average_grade_adjusted_speed ?? null,
>         averageHr: activity.average_heartrate ?? null,
>         maxHr: activity.max_heartrate ?? null,
>         averageCadence: activity.average_cadence ? (activity.average_cadence * 2) : null,
>         hasHeartrate: activity.has_heartrate,
>         totalElevation: activity.total_elevation_gain,
>         elevHigh: activity.elev_high ?? null,
>         elevLow: activity.elev_low ?? null,
>         calories: metrics.calculatedCalories,
>         trimp: metrics.trimp,
>         runningTss: metrics.runningTss,
>         estimatedVdot: metrics.estimatedVdot,
>         hrZone1Time: metrics.zoneTimes.z1,
>         hrZone2Time: metrics.zoneTimes.z2,
>         hrZone3Time: metrics.zoneTimes.z3,
>         hrZone4Time: metrics.zoneTimes.z4,
>         hrZone5Time: metrics.zoneTimes.z5,
>         hrZone6Time: metrics.zoneTimes.z6,
>         hrZone7Time: metrics.zoneTimes.z7,
>         rawJson: activity as unknown as Prisma.InputJsonValue,
>         streams: Prisma.JsonNull,
>         trainingType: determineWorkoutType(activity),
>         averageWatts: activity.average_watts ?? null,
> ```
>
> **REPLACE WITH:**
> ```ts
>     const isCycling = mappedType === ActivityType.RIDE || mappedType === ActivityType.VIRTUAL_RIDE;
>     const titleWattsMatch = isCycling ? (activity.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i) : null;
>     const parsedTitleWatts = titleWattsMatch ? parseInt(titleWattsMatch[1], 10) : null;
>     const fallbackTitleWatts = parsedTitleWatts && parsedTitleWatts >= 40 && parsedTitleWatts <= 1500 ? parsedTitleWatts : undefined;
>     const effectiveAvgWatts = activity.average_watts ?? fallbackTitleWatts;
>     const hasWattsData = isCycling || Boolean(effectiveAvgWatts || activity.device_watts || streams?.watts);
> 
>     if (hasWattsData) {
>         const ftpWatts = user.ftpWatts ?? fallbackTitleWatts ?? null;
> 
>         if (streams?.watts && streams.watts.length > 0) {
>             npWatts = calculateNormalizedPower(
>                 streams.watts,
>                 streams.time,
>                 activity.weighted_average_watts,
>                 effectiveAvgWatts
>             );
> 
>             if (ftpWatts && ftpWatts > 0) {
>                 powerZoneTimes = calculatePowerZoneTimes(streams.watts, streams.time, ftpWatts);
>             }
> 
>             if (streams.heartrate && streams.heartrate.length > 0) {
>                 aerobicDecoupling = calculateAerobicDecoupling(streams.watts, streams.heartrate, streams.time);
>             }
>         } else {
>             npWatts = calculateNormalizedPower(
>                 null,
>                 null,
>                 activity.weighted_average_watts,
>                 effectiveAvgWatts
>             );
>         }
> 
>         const avgWatts = effectiveAvgWatts ?? null;
> 
>         if (npWatts && ftpWatts && ftpWatts > 0) {
>             intensityFactor = calculateIntensityFactor(npWatts, ftpWatts);
>             if (intensityFactor && activity.moving_time > 0) {
>                 bikeTss = calculateBikeTss(activity.moving_time, npWatts, intensityFactor, ftpWatts);
>             }
>         }
> 
>         if (npWatts && avgWatts && avgWatts > 0) {
>             variabilityIndex = calculateVariabilityIndex(npWatts, avgWatts);
>         }
> 
>         if (npWatts && activity.average_heartrate && activity.average_heartrate > 0) {
>             efficiencyFactor = calculateEfficiencyFactor(npWatts, activity.average_heartrate);
>         }
>     }
> 
>     return {
>         trimp,
>         calculatedCalories,
>         runningTss,
>         estimatedVdot,
>         zoneTimes,
>         npWatts,
>         intensityFactor,
>         variabilityIndex,
>         bikeTss,
>         efficiencyFactor,
>         aerobicDecoupling,
>         powerZoneTimes,
>     };
> }
> 
> export function transformActivityData(
>     activity: StravaActivity,
>     metrics: ReturnType<typeof enrichActivityMetrics>
> ): ActivityData {
>     const mappedType = mapActivityType(activity.type);
>     const isFootSport = mappedType === ActivityType.RUN || mappedType === ActivityType.WALK || mappedType === ActivityType.HIKE;
>     const isCycling = mappedType === ActivityType.RIDE || mappedType === ActivityType.VIRTUAL_RIDE;
>     const titleWattsMatch = isCycling ? (activity.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i) : null;
>     const parsedTitleWatts = titleWattsMatch ? parseInt(titleWattsMatch[1], 10) : null;
>     const fallbackWatts = parsedTitleWatts && parsedTitleWatts >= 40 && parsedTitleWatts <= 1500 ? parsedTitleWatts : null;
> 
>     return {
>         name: activity.name,
>         description: activity.description ?? null,
>         type: mappedType,
>         sportType: activity.sport_type,
>         startDate: new Date(activity.start_date),
>         timezone: activity.timezone,
>         distance: activity.distance,
>         movingTime: activity.moving_time,
>         elapsedTime: activity.elapsed_time,
>         averageSpeed: activity.average_speed,
>         maxSpeed: activity.max_speed,
>         gradeAdjustedSpeed: activity.average_grade_adjusted_speed ?? null,
>         averageHr: activity.average_heartrate ?? null,
>         maxHr: activity.max_heartrate ?? null,
>         averageCadence: activity.average_cadence ? (isFootSport ? activity.average_cadence * 2 : activity.average_cadence) : null,
>         hasHeartrate: activity.has_heartrate,
>         totalElevation: activity.total_elevation_gain,
>         elevHigh: activity.elev_high ?? null,
>         elevLow: activity.elev_low ?? null,
>         calories: metrics.calculatedCalories,
>         trimp: metrics.trimp,
>         runningTss: metrics.runningTss,
>         estimatedVdot: metrics.estimatedVdot,
>         hrZone1Time: metrics.zoneTimes.z1,
>         hrZone2Time: metrics.zoneTimes.z2,
>         hrZone3Time: metrics.zoneTimes.z3,
>         hrZone4Time: metrics.zoneTimes.z4,
>         hrZone5Time: metrics.zoneTimes.z5,
>         hrZone6Time: metrics.zoneTimes.z6,
>         hrZone7Time: metrics.zoneTimes.z7,
>         rawJson: activity as unknown as Prisma.InputJsonValue,
>         streams: Prisma.JsonNull,
>         trainingType: determineWorkoutType(activity),
>         averageWatts: activity.average_watts ?? fallbackWatts,
> ```
>
> #### Verify Agent-UI-1:
> Run:
> ```bash
> cd Web && npx tsc --noEmit
> ```

---

### Agent-UI-2 Prompt (`ai-feedback-and-calendar`)

> **Role**: AI Feedback Sanitizer & Calendar UX Agent `ai-feedback-and-calendar` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/lib/ai/prompts.ts`
> * `Web/src/lib/ai/feedback.ts`
> * `Web/src/app/calendar/page.tsx`
> * `Web/src/app/calendar-preview/components/WeeklyView.tsx`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 4 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 2.1: Make Activity Feedback Prompt Sport-Aware & Forbid Self-Check Rubric Output in `Web/src/lib/ai/prompts.ts`
> Open `Web/src/lib/ai/prompts.ts` (lines 64–80).
>
> **FIND:**
> ```ts
>     combined: `You are a professional running coach analyzing an athlete's activity data. Provide a structured analysis with EXACTLY three sections. Use the exact markdown headers shown below.
> 
> ## Planned Comparison
> Compare this activity to the planned workout. Consider hitting targets, pace accuracy, heart rate zones, and any deviations. (2-3 sentences)
> 
> ## Progress Analysis
> Analyze this activity relative to their last 2-4 weeks of training. Look for trends, consistency, and signs of progress or fatigue. (2-3 sentences)
> 
> ## Goal Trajectory
> Explain how this run impacts their long-term race goals and readiness. (2-3 sentences)
> 
> IMPORTANT:
> 1. Use the EXACT headers above (including the '## ').
> 2. Return ONLY these three sections.
> 3. DO NOT include any introduction ("Here is your analysis"), conclusion, or conversational filler.
> 4. If a section is not applicable, still include the header and mention why.`,
> ```
>
> **REPLACE WITH:**
> ```ts
>     combined: `You are a professional endurance coach (running, cycling, triathlon, and strength) analyzing an athlete's activity data. Provide a structured analysis with EXACTLY three sections. Use the exact markdown headers shown below.
> 
> ## Planned Comparison
> Compare this activity to the planned workout (or evaluate the session type if unplanned, such as an FTP test, interval ride, easy run, or cross-training session). Use sport-appropriate metrics: power (W), speed (km/h), and cadence (rpm) for cycling; pace (/km) and HR zones for running. (2-3 sentences)
> 
> ## Progress Analysis
> Analyze this activity relative to their last 2-4 weeks of training. Look for trends, aerobic efficiency, power/pace consistency, and signs of progress or fatigue. (2-3 sentences)
> 
> ## Goal Trajectory
> Explain how this session impacts their long-term training plan, FTP/VDOT progression, and race or fitness readiness. (2-3 sentences)
> 
> IMPORTANT:
> 1. Use the EXACT headers above (including the '## ').
> 2. Return ONLY the final prose inside these three sections.
> 3. DO NOT include any introduction, conclusion, self-check checklist, rubric verification ("Exact headers? Yes", "Exactly three sections? Yes"), or draft bullet notes.
> 4. If a section is not applicable, still include the header and mention why.`,
> ```
>
> #### Edit 2.2: Format Cycling Metrics for AI Context & Strip Trailing Self-Check Rubric Leaks in `Web/src/lib/ai/feedback.ts`
> Open `Web/src/lib/ai/feedback.ts` (lines 20–30, lines 160–190, and lines 350–399).
>
> First, in `Web/src/lib/ai/feedback.ts` (lines 22–29):
>
> **FIND:**
> ```ts
> export function normalizeLatexSectionHeaders(raw: string): string {
>     return raw
>         .replace(/^[ \t]*\\{1,2}((?:sub)*)section\*?[ \t]*\{([^}\n]+)\}[ \t]*$/gim, (_m, subs: string, title: string) => {
>             const level = Math.min(1 + Math.floor(subs.length / 3), 6);
>             return '#'.repeat(level) + ' ' + title.trim();
>         });
> }
> ```
>
> **REPLACE WITH:**
> ```ts
> export function normalizeLatexSectionHeaders(raw: string): string {
>     return raw
>         .replace(/^[ \t]*\\{1,2}((?:sub)*)section\*?[ \t]*\{([^}\n]+)\}[ \t]*$/gim, (_m, subs: string, title: string) => {
>             const level = Math.min(1 + Math.floor(subs.length / 3), 6);
>             return '#'.repeat(level) + ' ' + title.trim();
>         });
> }
> 
> /**
>  * Strip leaked chain-of-thought self-check rubrics or draft bullets that some
>  * reasoning models append at the end of a section (e.g. "* *Planned Comparison:* ...",
>  * "* Exact headers? Yes.", "* Exactly three sections? Yes.", "* No intro/outro? Yes.").
>  */
> export function stripTrailingReasoningNoise(sectionText: string): string {
>     const lines = sectionText.split('\n');
>     const cleanedLines: string[] = [];
>     for (const line of lines) {
>         const trimmed = line.trim();
>         if (
>             /^(?:[-*•]|\d+\.)\s*\*?(?:planned\s+comparison|progress\s+analysis|goal\s+trajectory)\*?\s*:/i.test(trimmed) ||
>             /^(?:[-*•]|\d+\.)?\s*(?:exact\s+headers\??|exactly\s+three\s+sections\??|no\s+intro\s*\/?\s*outro\??|2-3\s+sentences\s+per\s+section\??)\s*(?:yes|no|check|✓)?\.?$/i.test(trimmed) ||
>             /^(?:self-check|self-correction|checklist|rubric\s+check|drafting\s+the\s+content|review\s+against\s+constraints)\s*:/i.test(trimmed)
>         ) {
>             continue;
>         }
>         cleanedLines.push(line);
>     }
>     return cleanedLines.join('\n').trim();
> }
> ```
>
> Second, in `Web/src/lib/ai/feedback.ts` (lines 160–190):
>
> **FIND:**
> ```ts
> export function formatActivityForAi(ctx: NonNullable<Awaited<ReturnType<typeof buildActivityContext>>>): string {
>     const a = ctx.activity;
>     let str = `Activity: ${fenceUntrusted(a.name)}\n`;
>     str += `Date: ${a.date}\n`;
>     str += `Type: ${a.type}\n`;
>     str += `Distance: ${(a.distance / 1000).toFixed(2)}km\n`;
>     str += `Duration: ${Math.floor(a.duration / 60)}:${(a.duration % 60).toString().padStart(2, '0')}\n`;
>     str += `Pace: ${Math.floor(a.pace / 60)}:${Math.floor(a.pace % 60).toString().padStart(2, '0')}/km\n`;
> ```
>
> **REPLACE WITH:**
> ```ts
> export function formatActivityForAi(ctx: NonNullable<Awaited<ReturnType<typeof buildActivityContext>>>): string {
>     const a = ctx.activity;
>     const isRide = a.type === 'RIDE' || a.type === 'VIRTUAL_RIDE';
>     const titleWattsMatch = isRide ? (a.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i) : null;
>     const titleWatts = titleWattsMatch ? parseInt(titleWattsMatch[1], 10) : null;
> 
>     let str = `Activity: ${fenceUntrusted(a.name)}\n`;
>     str += `Date: ${a.date}\n`;
>     str += `Type: ${a.type}\n`;
>     str += `Distance: ${(a.distance / 1000).toFixed(2)}km\n`;
>     str += `Duration: ${Math.floor(a.duration / 60)}:${(a.duration % 60).toString().padStart(2, '0')}\n`;
>     if (isRide) {
>         const speedKmh = a.duration > 0 ? ((a.distance / 1000) / (a.duration / 3600)).toFixed(1) : '0.0';
>         str += `Avg Speed: ${speedKmh} km/h\n`;
>         const watts = (a as any).averageWatts ?? titleWatts;
>         if (watts) str += `Power: ${Math.round(watts)} W\n`;
>     } else {
>         str += `Pace: ${Math.floor(a.pace / 60)}:${Math.floor(a.pace % 60).toString().padStart(2, '0')}/km\n`;
>     }
> ```
>
> Third, in `Web/src/lib/ai/feedback.ts` (lines 390–399):
>
> **FIND:**
> ```ts
>         // Fallback: If no sections were parsed, or they are all empty, put the entire cleaned response in progressAnalysis
>         let plannedComparison = sections.plannedComparison || '';
>         let progressAnalysis = sections.progressAnalysis || '';
>         let goalTrajectory = sections.goalTrajectory || '';
> ```
>
> **REPLACE WITH:**
> ```ts
>         // Fallback: If no sections were parsed, or they are all empty, put the entire cleaned response in progressAnalysis
>         let plannedComparison = stripTrailingReasoningNoise(sections.plannedComparison || '');
>         let progressAnalysis = stripTrailingReasoningNoise(sections.progressAnalysis || '');
>         let goalTrajectory = stripTrailingReasoningNoise(sections.goalTrajectory || '');
> ```
>
> #### Edit 2.3: Style `/calendar` Header & Back Button Consistently in `Web/src/app/calendar/page.tsx`
> Open `Web/src/app/calendar/page.tsx` (lines 16–32).
>
> **FIND:**
> ```tsx
>         <div className="min-h-screen bg-background flex flex-col">
>             <header className="topbar sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
>                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
>                     <div className="flex items-center gap-3 h-14">
>                         <button
>                             onClick={() => router.push('/')}
>                             className="p-2 transition-colors"
>                             title="Back to Dashboard"
>                         >
>                             <ArrowLeft className="w-5 h-5" />
>                         </button>
>                         <CalendarRange className="w-5 h-5 text-accent-orange" />
>                         <h1 className="text-lg font-bold">Training Calendar</h1>
>                     </div>
>                 </div>
>             </header>
> ```
>
> **REPLACE WITH:**
> ```tsx
>         <div className="min-h-screen bg-background flex flex-col">
>             <header className="topbar sticky top-0 z-50 border-b border-glass-border bg-background/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
>                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
>                     <div className="flex items-center justify-between h-14">
>                         <div className="flex items-center gap-3">
>                             <button
>                                 type="button"
>                                 onClick={() => router.push('/')}
>                                 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface border border-glass-border text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors"
>                                 title="Back to Dashboard"
>                             >
>                                 <ArrowLeft className="w-4 h-4" />
>                                 <span>Dashboard</span>
>                             </button>
>                             <div className="h-4 w-px bg-glass-border hidden sm:block" />
>                             <div className="flex items-center gap-2">
>                                 <CalendarRange className="w-5 h-5 text-accent-orange" />
>                                 <h1 className="text-base sm:text-lg font-bold text-foreground">Training Calendar</h1>
>                             </div>
>                         </div>
>                     </div>
>                 </div>
>             </header>
> ```
>
> #### Edit 2.4: Stop Showing Running Pace (`/km`) on Non-Running Activities in `Web/src/app/calendar-preview/components/WeeklyView.tsx`
> Open `Web/src/app/calendar-preview/components/WeeklyView.tsx` (lines 180–204).
>
> **FIND:**
> ```tsx
>                 {activities.map((a) => {
>                     const c = colorsFor(a.type);
>                     const isBike = a.type === 'RIDE' || a.sport === 'BIKE';
>                     const isSwim = a.type === 'SWIM' || a.sport === 'SWIM';
> 
>                     let effortMetric: string | null = null;
>                     if (isBike) {
>                         const watts = a.npWatts ?? a.averageWatts;
>                         if (watts && watts > 0) effortMetric = `${Math.round(watts)}W`;
>                     } else if (isSwim) {
>                         if (a.duration > 0 && a.distance > 0) {
>                             effortMetric = fmtPace(a.duration / (a.distance / 100), '100m');
>                         }
>                     } else {
>                         if (a.duration > 0 && a.distance > 0) {
>                             effortMetric = fmtPace(a.duration / (a.distance / 1000), 'km');
>                         }
>                     }
> ```
>
> **REPLACE WITH:**
> ```tsx
>                 {activities.map((a) => {
>                     const c = colorsFor(a.type);
>                     const isBike = a.type === 'RIDE' || (a.type as string) === 'VIRTUAL_RIDE' || a.sport === 'BIKE';
>                     const isSwim = a.type === 'SWIM' || a.sport === 'SWIM';
>                     const isRun = a.type === 'RUN' || a.sport === 'RUN';
> 
>                     let effortMetric: string | null = null;
>                     if (isBike) {
>                         const titleWattsMatch = (a.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
>                         const titleWatts = titleWattsMatch ? parseInt(titleWattsMatch[1], 10) : null;
>                         const watts = a.npWatts ?? a.averageWatts ?? (titleWatts && titleWatts >= 40 && titleWatts <= 1500 ? titleWatts : null);
>                         if (watts && watts > 0) {
>                             effortMetric = `${Math.round(watts)}W`;
>                         } else if (a.duration > 0 && a.distance > 0) {
>                             effortMetric = `${((a.distance / 1000) / (a.duration / 3600)).toFixed(1)} km/h`;
>                         }
>                     } else if (isSwim) {
>                         if (a.duration > 0 && a.distance > 0) {
>                             effortMetric = fmtPace(a.duration / (a.distance / 100), '100m');
>                         }
>                     } else if (isRun) {
>                         if (a.duration > 0 && a.distance > 0) {
>                             effortMetric = fmtPace(a.duration / (a.distance / 1000), 'km');
>                         }
>                     }
> ```
>
> #### Verify Agent-UI-2:
> Run:
> ```bash
> cd Web && npx tsc --noEmit && npm test -- src/app/api/ai/activity-feedback/__tests__/route.test.ts
> ```


---

### Agent-UI-3 Prompt (`mcp-connections-and-zones-settings`)

> **Role**: MCP Connections & Sport Zones Settings Agent `mcp-connections-and-zones-settings` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/MinimalistPillsMenu.tsx`
> * `Web/src/components/setup/HeartRateZonesSection.tsx`
> * `Web/src/app/api/settings/cycling/route.ts`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 4 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 3.1: Detect eFTP From Ride Titles (e.g. `"Mywhoosh FTP Test 305w"`) in `Web/src/app/api/settings/cycling/route.ts`
> Open `Web/src/app/api/settings/cycling/route.ts` (lines 12–46).
>
> **FIND:**
> ```ts
> async function getHighestEstimatedFtp(userId: string): Promise<number | null> {
>     const rides = await prisma.activity.findMany({
>         where: {
>             userId,
>             type: { in: ['RIDE', 'VIRTUAL_RIDE'] },
>         },
>         select: {
>             averageWatts: true,
>             weightedAverageWatts: true,
>             streams: true,
>         },
>         orderBy: { startDate: 'desc' },
>         take: 50,
>     });
> 
>     let highestEftp: number | null = null;
> 
>     for (const r of rides) {
>         let eftp: number | null = null;
>         const streams = r.streams as { watts?: number[]; time?: number[] } | null;
> 
>         if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
>             const curve = calculatePowerCurve(streams.watts, streams.time);
>             eftp = estimateFtpFromPowerCurve(curve, r.weightedAverageWatts ?? r.averageWatts);
>         } else if (r.weightedAverageWatts || r.averageWatts) {
>             eftp = estimateFtpFromPowerCurve([], r.weightedAverageWatts ?? r.averageWatts);
>         }
> 
>         if (eftp && (highestEftp === null || eftp > highestEftp)) {
>             highestEftp = eftp;
>         }
>     }
> 
>     return highestEftp;
> }
> ```
>
> **REPLACE WITH:**
> ```ts
> async function getHighestEstimatedFtp(userId: string): Promise<number | null> {
>     const rides = await prisma.activity.findMany({
>         where: {
>             userId,
>             type: { in: ['RIDE', 'VIRTUAL_RIDE'] },
>         },
>         select: {
>             name: true,
>             averageWatts: true,
>             weightedAverageWatts: true,
>             streams: true,
>         },
>         orderBy: { startDate: 'desc' },
>         take: 50,
>     });
> 
>     let highestEftp: number | null = null;
> 
>     for (const r of rides) {
>         let eftp: number | null = null;
>         const streams = r.streams as { watts?: number[]; time?: number[] } | null;
>         const titleMatch = (r.name || '').match(/\b(\d{2,4})\s*w(?:atts)?\b/i);
>         const titleWatts = titleMatch ? parseInt(titleMatch[1], 10) : null;
>         const validTitleWatts = titleWatts && titleWatts >= 40 && titleWatts <= 1500 ? titleWatts : null;
> 
>         if (/\bftp\s*test\b/i.test(r.name || '') && validTitleWatts) {
>             eftp = validTitleWatts;
>         } else if (streams?.watts && Array.isArray(streams.watts) && streams.watts.length > 0) {
>             const curve = calculatePowerCurve(streams.watts, streams.time);
>             eftp = estimateFtpFromPowerCurve(curve, r.weightedAverageWatts ?? r.averageWatts ?? validTitleWatts);
>         } else if (r.weightedAverageWatts || r.averageWatts || validTitleWatts) {
>             eftp = estimateFtpFromPowerCurve([], r.weightedAverageWatts ?? r.averageWatts ?? validTitleWatts);
>         }
> 
>         if (eftp && (highestEftp === null || eftp > highestEftp)) {
>             highestEftp = eftp;
>         }
>     }
> 
>     return highestEftp;
> }
> ```
>
> #### Edit 3.2: Separate Running vs. Cycling Power & Heart Rate Zones in `HrZonesSubPage` (`Web/src/components/MinimalistPillsMenu.tsx`)
> Open `Web/src/components/MinimalistPillsMenu.tsx` (lines 563–685).
>
> **FIND:**
> ```tsx
> // ─── Heart Rate Zones ───────────────────────────────────────
> 
> function HrZonesSubPage({ onBack: _onBack }: { onBack: () => void }) {
>     const queryClient = useQueryClient();
>     const { data: settingsData } = useQuery({
>         queryKey: ['user-settings'],
>         queryFn: async () => {
>             const res = await fetch('/api/settings/update-vdot');
>             if (!res.ok) throw new Error('Failed to fetch settings');
>             return res.json();
>         },
>         refetchOnWindowFocus: false,
>     });
> 
>     const [thresholdHr, setThresholdHr] = useState<number | undefined>(undefined);
>     const [hrZone1Max, setHrZone1Max] = useState(130);
>     const [hrZone2Max, setHrZone2Max] = useState(148);
>     const [hrZone3Max, setHrZone3Max] = useState(160);
>     const [hrZone4Max, setHrZone4Max] = useState(170);
>     const [hrZone5Max, setHrZone5Max] = useState(178);
>     const [hrZone6Max, setHrZone6Max] = useState(187);
>     const [message, setMessage] = useState('');
> 
>     useEffect(() => {
>         if (settingsData) {
>             if (settingsData.thresholdHeartRate) setThresholdHr(settingsData.thresholdHeartRate);
>             if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
>             if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
>             if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
>             if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
>             if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
>             if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
>         }
>     }, [settingsData]);
> 
>     const handleThresholdChange = (val: number) => {
>         setThresholdHr(val);
>         if (val > 0) {
>             setHrZone1Max(Math.round(val * 0.75));
>             setHrZone2Max(Math.round(val * 0.87));
>             setHrZone3Max(Math.round(val * 0.94));
>             setHrZone4Max(Math.round(val * 1.00));
>             setHrZone5Max(Math.round(val * 1.05));
>             setHrZone6Max(Math.round(val * 1.10));
>         }
>     };
> 
>     const saveMutation = useMutation({
>         mutationFn: async () => {
>             const res = await fetch('/api/settings/profile', {
>                 method: 'POST',
>                 body: JSON.stringify({ thresholdHeartRate: thresholdHr, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max }),
>                 headers: { 'Content-Type': 'application/json' },
>             });
>             if (!res.ok) throw new Error('Failed to update');
>             return res.json();
>         },
>         onSuccess: () => {
>             setMessage('HR zones saved!');
>             queryClient.invalidateQueries({ queryKey: ['user-settings'] });
>             setTimeout(() => setMessage(''), 2000);
>         },
>         onError: () => setMessage('Error saving. Try again.'),
>     });
> 
>     const zones = [
>         { label: 'Zone 1 (Recovery)', desc: '<75% LTHR', value: hrZone1Max, setter: setHrZone1Max, color: 'text-zone-1' },
>         { label: 'Zone 2 (Aerobic)', desc: '76-87% LTHR', value: hrZone2Max, setter: setHrZone2Max, color: 'text-zone-2' },
>         { label: 'Zone 3 (Tempo)', desc: '88-94% LTHR', value: hrZone3Max, setter: setHrZone3Max, color: 'text-zone-3' },
>         { label: 'Zone 4 (Threshold)', desc: '95-100% LTHR', value: hrZone4Max, setter: setHrZone4Max, color: 'text-zone-4' },
>         { label: 'Zone 5 (VO2max)', desc: '101-105% LTHR', value: hrZone5Max, setter: setHrZone5Max, color: 'text-zone-5' },
>         { label: 'Zone 6 (Anaerobic)', desc: '106-110% LTHR', value: hrZone6Max, setter: setHrZone6Max, color: 'text-accent-pink' },
>     ];
> 
>     return (
>         <div className="p-5 space-y-5">
>             <h3 className="text-lg font-bold text-foreground">Heart Rate Zones</h3>
> 
>             <div className="space-y-4">
>                 <Input
>                     label="Threshold Heart Rate (LTHR)"
>                     id="thresholdHr"
>                     type="number"
>                     value={thresholdHr || ''}
>                     onChange={e => handleThresholdChange(parseInt(e.target.value) || 0)}
>                     placeholder="e.g. 170"
>                     helperText="Enter LTHR to auto-calculate zones"
>                 />
> 
>                 <div className="space-y-3">
>                     {zones.map((zone) => (
>                         <div key={zone.label} className="flex items-center gap-3">
>                             <div className={`text-sm font-medium w-32 ${zone.color}`}>{zone.label}</div>
>                             <input
>                                 type="number"
>                                 value={zone.value}
>                                 onChange={e => zone.setter(parseInt(e.target.value) || 0)}
>                                 className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-orange/50"
>                             />
>                             <span className="text-[10px] text-foreground-muted w-20 text-right">{zone.desc}</span>
>                         </div>
>                     ))}
>                 </div>
>             </div>
> 
>             {message && (
>                 <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
>                     {message}
>                 </div>
>             )}
> 
>             <button
>                 onClick={() => saveMutation.mutate()}
>                 disabled={saveMutation.isPending}
>                 className="btn-primary w-full flex items-center justify-center gap-2 py-3"
>             >
>                 {saveMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
>                 Save Zones
>             </button>
>         </div>
>     );
> }
> ```
>
> **REPLACE WITH:**
> ```tsx
> // ─── Heart Rate & Cycling Power Zones ────────────────────────
> 
> function HrZonesSubPage({ onBack: _onBack }: { onBack: () => void }) {
>     const queryClient = useQueryClient();
>     const [activeTab, setActiveTab] = useState<'running' | 'cycling'>('running');
> 
>     const { data: settingsData } = useQuery({
>         queryKey: ['user-settings'],
>         queryFn: async () => {
>             const res = await fetch('/api/settings/update-vdot');
>             if (!res.ok) throw new Error('Failed to fetch settings');
>             return res.json();
>         },
>         refetchOnWindowFocus: false,
>     });
> 
>     const { data: cyclingData } = useQuery({
>         queryKey: ['cycling-settings'],
>         queryFn: async () => {
>             const res = await fetch('/api/settings/cycling');
>             if (!res.ok) throw new Error('Failed to fetch cycling settings');
>             return res.json();
>         },
>         refetchOnWindowFocus: false,
>     });
> 
>     const [thresholdHr, setThresholdHr] = useState<number | undefined>(undefined);
>     const [cyclingLthr, setCyclingLthr] = useState<number>(162);
>     const [ftpWatts, setFtpWatts] = useState<number>(250);
>     const [hrZone1Max, setHrZone1Max] = useState(130);
>     const [hrZone2Max, setHrZone2Max] = useState(148);
>     const [hrZone3Max, setHrZone3Max] = useState(160);
>     const [hrZone4Max, setHrZone4Max] = useState(170);
>     const [hrZone5Max, setHrZone5Max] = useState(178);
>     const [hrZone6Max, setHrZone6Max] = useState(187);
>     const [message, setMessage] = useState('');
> 
>     useEffect(() => {
>         if (settingsData) {
>             if (settingsData.thresholdHeartRate) {
>                 setThresholdHr(settingsData.thresholdHeartRate);
>                 setCyclingLthr(Math.max(110, settingsData.thresholdHeartRate - 8));
>             }
>             if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
>             if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
>             if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
>             if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
>             if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
>             if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
>         }
>     }, [settingsData]);
> 
>     useEffect(() => {
>         if (cyclingData) {
>             const resolved = cyclingData.ftpWatts ?? cyclingData.eFtpWatts;
>             if (resolved && resolved > 0) setFtpWatts(resolved);
>         }
>     }, [cyclingData]);
> 
>     const handleThresholdChange = (val: number) => {
>         setThresholdHr(val);
>         if (val > 0) {
>             setHrZone1Max(Math.round(val * 0.75));
>             setHrZone2Max(Math.round(val * 0.87));
>             setHrZone3Max(Math.round(val * 0.94));
>             setHrZone4Max(Math.round(val * 1.00));
>             setHrZone5Max(Math.round(val * 1.05));
>             setHrZone6Max(Math.round(val * 1.10));
>             setCyclingLthr(Math.max(110, val - 8));
>         }
>     };
> 
>     const saveMutation = useMutation({
>         mutationFn: async () => {
>             const [hrRes, bikeRes] = await Promise.all([
>                 fetch('/api/settings/profile', {
>                     method: 'POST',
>                     body: JSON.stringify({ thresholdHeartRate: thresholdHr, hrZone1Max, hrZone2Max, hrZone3Max, hrZone4Max, hrZone5Max, hrZone6Max }),
>                     headers: { 'Content-Type': 'application/json' },
>                 }),
>                 fetch('/api/settings/cycling', {
>                     method: 'PUT',
>                     body: JSON.stringify({ ftpWatts }),
>                     headers: { 'Content-Type': 'application/json' },
>                 }),
>             ]);
>             if (!hrRes.ok || !bikeRes.ok) throw new Error('Failed to update');
>             return hrRes.json();
>         },
>         onSuccess: () => {
>             setMessage('Running & Cycling zones saved!');
>             queryClient.invalidateQueries({ queryKey: ['user-settings'] });
>             queryClient.invalidateQueries({ queryKey: ['cycling-settings'] });
>             setTimeout(() => setMessage(''), 2000);
>         },
>         onError: () => setMessage('Error saving. Try again.'),
>     });
> 
>     const zones = [
>         { label: 'Zone 1 (Recovery)', desc: '<75% LTHR', value: hrZone1Max, setter: setHrZone1Max, color: 'text-zone-1' },
>         { label: 'Zone 2 (Aerobic)', desc: '76-87% LTHR', value: hrZone2Max, setter: setHrZone2Max, color: 'text-zone-2' },
>         { label: 'Zone 3 (Tempo)', desc: '88-94% LTHR', value: hrZone3Max, setter: setHrZone3Max, color: 'text-zone-3' },
>         { label: 'Zone 4 (Threshold)', desc: '95-100% LTHR', value: hrZone4Max, setter: setHrZone4Max, color: 'text-zone-4' },
>         { label: 'Zone 5 (VO2max)', desc: '101-105% LTHR', value: hrZone5Max, setter: setHrZone5Max, color: 'text-zone-5' },
>         { label: 'Zone 6 (Anaerobic)', desc: '106-110% LTHR', value: hrZone6Max, setter: setHrZone6Max, color: 'text-accent-pink' },
>     ];
> 
>     const cogganPowerZones = [
>         { name: 'Z1 Active Recovery', pct: '<55% FTP', min: 0, max: Math.round(ftpWatts * 0.55), color: 'text-emerald-400' },
>         { name: 'Z2 Endurance', pct: '56–75% FTP', min: Math.round(ftpWatts * 0.56), max: Math.round(ftpWatts * 0.75), color: 'text-blue-400' },
>         { name: 'Z3 Tempo', pct: '76–90% FTP', min: Math.round(ftpWatts * 0.76), max: Math.round(ftpWatts * 0.90), color: 'text-cyan-400' },
>         { name: 'Z4 Threshold', pct: '91–105% FTP', min: Math.round(ftpWatts * 0.91), max: Math.round(ftpWatts * 1.05), color: 'text-amber-400' },
>         { name: 'Z5 VO2max', pct: '106–120% FTP', min: Math.round(ftpWatts * 1.06), max: Math.round(ftpWatts * 1.20), color: 'text-orange-400' },
>         { name: 'Z6 Anaerobic', pct: '121–150% FTP', min: Math.round(ftpWatts * 1.21), max: Math.round(ftpWatts * 1.50), color: 'text-purple-400' },
>         { name: 'Z7 Neuromuscular', pct: '>150% FTP', min: Math.round(ftpWatts * 1.51), max: null, color: 'text-rose-400' },
>     ];
> 
>     const cyclingHrZones = [
>         { name: 'Z1 Recovery', min: 0, max: Math.round(cyclingLthr * 0.75), color: 'text-zone-1' },
>         { name: 'Z2 Endurance', min: Math.round(cyclingLthr * 0.75) + 1, max: Math.round(cyclingLthr * 0.87), color: 'text-zone-2' },
>         { name: 'Z3 Tempo / Sweet Spot', min: Math.round(cyclingLthr * 0.87) + 1, max: Math.round(cyclingLthr * 0.94), color: 'text-zone-3' },
>         { name: 'Z4 Threshold', min: Math.round(cyclingLthr * 0.94) + 1, max: cyclingLthr, color: 'text-zone-4' },
>         { name: 'Z5 VO2max', min: cyclingLthr + 1, max: Math.round(cyclingLthr * 1.05), color: 'text-zone-5' },
>         { name: 'Z6 Anaerobic', min: Math.round(cyclingLthr * 1.05) + 1, max: Math.round(cyclingLthr * 1.10), color: 'text-accent-pink' },
>         { name: 'Z7 Neuromuscular', min: Math.round(cyclingLthr * 1.10) + 1, max: null, color: 'text-workout-long-run' },
>     ];
> 
>     return (
>         <div className="p-5 space-y-5">
>             <div className="flex items-center justify-between">
>                 <h3 className="text-lg font-bold text-foreground">Heart Rate & Power Zones</h3>
>             </div>
> 
>             <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-lg border border-line">
>                 <button
>                     type="button"
>                     onClick={() => setActiveTab('running')}
>                     className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
>                         activeTab === 'running'
>                             ? 'bg-accent-orange text-white'
>                             : 'text-foreground-muted hover:text-foreground'
>                     }`}
>                 >
>                     Running HR Zones
>                 </button>
>                 <button
>                     type="button"
>                     onClick={() => setActiveTab('cycling')}
>                     className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
>                         activeTab === 'cycling'
>                             ? 'bg-accent-cyan text-white'
>                             : 'text-foreground-muted hover:text-foreground'
>                     }`}
>                 >
>                     Cycling Power & HR
>                 </button>
>             </div>
> 
>             {activeTab === 'running' ? (
>                 <div className="space-y-4">
>                     <Input
>                         label="Running Threshold Heart Rate (LTHR)"
>                         id="thresholdHr"
>                         type="number"
>                         value={thresholdHr || ''}
>                         onChange={e => handleThresholdChange(parseInt(e.target.value) || 0)}
>                         placeholder="e.g. 170"
>                         helperText="Enter Running LTHR to auto-calculate 7-zone running HR thresholds"
>                     />
> 
>                     <div className="space-y-3">
>                         {zones.map((zone) => (
>                             <div key={zone.label} className="flex items-center gap-3">
>                                 <div className={`text-sm font-medium w-32 ${zone.color}`}>{zone.label}</div>
>                                 <input
>                                     type="number"
>                                     value={zone.value}
>                                     onChange={e => zone.setter(parseInt(e.target.value) || 0)}
>                                     className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-orange/50"
>                                 />
>                                 <span className="text-[10px] text-foreground-muted w-20 text-right">{zone.desc}</span>
>                             </div>
>                         ))}
>                     </div>
>                 </div>
>             ) : (
>                 <div className="space-y-4">
>                     <div className="grid grid-cols-2 gap-3">
>                         <div>
>                             <label className="block text-xs text-foreground-muted mb-1">Cycling FTP (Watts)</label>
>                             <input
>                                 type="number"
>                                 min={50}
>                                 max={600}
>                                 value={ftpWatts}
>                                 onChange={e => setFtpWatts(parseInt(e.target.value, 10) || 200)}
>                                 className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
>                             />
>                             {cyclingData?.eFtpWatts && (
>                                 <button
>                                     type="button"
>                                     onClick={() => setFtpWatts(cyclingData.eFtpWatts)}
>                                     className="text-[11px] text-accent-cyan hover:underline mt-1 block"
>                                 >
>                                     Detected from rides/FTP test: {cyclingData.eFtpWatts}W (click to apply)
>                                 </button>
>                             )}
>                         </div>
>                         <div>
>                             <label className="block text-xs text-foreground-muted mb-1">Cycling LTHR (bpm)</label>
>                             <input
>                                 type="number"
>                                 min={100}
>                                 max={220}
>                                 value={cyclingLthr}
>                                 onChange={e => setCyclingLthr(parseInt(e.target.value, 10) || 160)}
>                                 className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
>                             />
>                             <span className="text-[10px] text-foreground-muted mt-1 block">
>                                 Typically ~5–10 bpm lower than Running LTHR
>                             </span>
>                         </div>
>                     </div>
> 
>                     <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
>                         <div className="flex items-center justify-between border-b border-line pb-1.5">
>                             <span className="text-xs font-semibold text-accent-cyan">Coggan Power Zones (Biking Watts)</span>
>                             {cyclingData?.weightKg && ftpWatts > 0 && (
>                                 <span className="text-[11px] font-mono text-foreground-muted">
>                                     {(ftpWatts / cyclingData.weightKg).toFixed(2)} W/kg
>                                 </span>
>                             )}
>                         </div>
>                         <div className="space-y-1.5">
>                             {cogganPowerZones.map((z) => (
>                                 <div key={z.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background-secondary/60">
>                                     <span className={`font-medium ${z.color}`}>{z.name}</span>
>                                     <div className="flex items-center gap-3 font-mono">
>                                         <span className="text-foreground-muted text-[10px]">{z.pct}</span>
>                                         <span className="text-foreground font-semibold">{z.min}–{z.max ?? '∞'} W</span>
>                                     </div>
>                                 </div>
>                             ))}
>                         </div>
>                     </div>
> 
>                     <div className="bg-surface border border-line rounded-lg p-3 space-y-2">
>                         <span className="text-xs font-semibold text-accent-orange block border-b border-line pb-1.5">
>                             Cycling Heart Rate Zones (7-Zone Model)
>                         </span>
>                         <div className="space-y-1.5">
>                             {cyclingHrZones.map((z) => (
>                                 <div key={z.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background-secondary/60">
>                                     <span className={`font-medium ${z.color}`}>{z.name}</span>
>                                     <span className="font-mono text-foreground font-semibold">
>                                         {z.min}–{z.max ?? '∞'} bpm
>                                     </span>
>                                 </div>
>                             ))}
>                         </div>
>                     </div>
>                 </div>
>             )}
> 
>             {message && (
>                 <div className={`p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
>                     {message}
>                 </div>
>             )}
> 
>             <button
>                 onClick={() => saveMutation.mutate()}
>                 disabled={saveMutation.isPending}
>                 className="btn-primary w-full flex items-center justify-center gap-2 py-3"
>             >
>                 {saveMutation.isPending ? <Save className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
>                 Save Running & Cycling Zones
>             </button>
>         </div>
>     );
> }
> ```
>
> #### Edit 3.3: Add MCP Server Documentation & Connected AI Client Organization to `ConnectionsSubPage` (`Web/src/components/MinimalistPillsMenu.tsx`)
> Open `Web/src/components/MinimalistPillsMenu.tsx` (lines 1040–1180 of the original file, right after `AiCoachSubPage`).
>
> **FIND:**
> ```tsx
> // ─── Connections ────────────────────────────────────────────
> 
> function ConnectionsSubPage({ onBack: _onBack }: { onBack: () => void }) {
>     const queryClient = useQueryClient();
>     const [message, setMessage] = useState('');
>     const [showReauthPrompt, setShowReauthPrompt] = useState(false);
> 
>     const [hrZone1Max, setHrZone1Max] = useState(130);
>     const [hrZone2Max, setHrZone2Max] = useState(148);
>     const [hrZone3Max, setHrZone3Max] = useState(160);
>     const [hrZone4Max, setHrZone4Max] = useState(170);
>     const [hrZone5Max, setHrZone5Max] = useState(178);
>     const [hrZone6Max, setHrZone6Max] = useState(187);
> 
>     const { data: settingsData } = useQuery({
>         queryKey: ['user-settings'],
>         queryFn: async () => {
>             const res = await fetch('/api/settings/update-vdot');
>             if (!res.ok) throw new Error('Failed');
>             return res.json();
>         },
>         refetchOnWindowFocus: false,
>     });
> 
>     useEffect(() => {
>         if (settingsData) {
>             if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
>             if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
>             if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
>             if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
>             if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
>             if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
>         }
>     }, [settingsData]);
> 
>     const resyncMutation = useMutation({
>         mutationFn: async () => {
>             const res = await fetch('/api/sync', {
>                 method: 'POST',
>                 body: JSON.stringify({ range: 'ALL' }),
>                 headers: { 'Content-Type': 'application/json' },
>             });
>             if (!res.ok) {
>                 const errorData = await res.json().catch(() => ({}));
>                 throw new Error(errorData.error || 'Failed to resync');
>             }
>             return res.json();
>         },
>         onSuccess: () => {
>             setMessage('Full resync started! May take a few minutes.');
>             setShowReauthPrompt(false);
>             queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
>             queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
>         },
>         onError: (err) => {
>             const isAuthError = err.message.toLowerCase().includes('authenticate') ||
>                 err.message.toLowerCase().includes('token') ||
>                 err.message.includes('400') || err.message.includes('401');
>             if (isAuthError) {
>                 setMessage('Connection lost. Reconnect Strava.');
>                 setShowReauthPrompt(true);
>             } else {
>                 setMessage(`Resync failed: ${err.message}`);
>                 setShowReauthPrompt(false);
>             }
>         },
>     });
> 
>     const healthConnectSyncMutation = useMutation({
>         mutationFn: async () => {
>             const permitted = await requestHealthPermissions();
>             if (!permitted) throw new Error('Health Connect permissions not granted');
>             const result = await syncHealthData(90, {
>                 z1: hrZone1Max, z2: hrZone2Max, z3: hrZone3Max,
>                 z4: hrZone4Max, z5: hrZone5Max, z6: hrZone6Max,
>             });
>             return result;
>         },
>         onSuccess: (result) => {
>             setMessage(result.synced > 0 ? `Synced ${result.synced} activities!` : 'No new activities found.');
>             queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
>             queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
>             queryClient.invalidateQueries({ queryKey: ['activities'] });
>         },
>         onError: (err) => setMessage(`Health Connect failed: ${err.message}`),
>     });
> 
>     return (
>         <div className="p-5 space-y-5">
>             <h3 className="text-lg font-bold text-foreground">Connections</h3>
> 
>             <div className="space-y-3">
>                 <h4 className="text-xs text-accent-orange font-semibold">Strava</h4>
>                 <button
>                     onClick={() => resyncMutation.mutate()}
>                     disabled={resyncMutation.isPending}
>                     className="w-full py-3 border border-line text-foreground rounded-md hover:bg-surface-hover transition-colors text-sm flex items-center justify-center gap-2"
>                 >
>                     <RefreshCw className={`w-4 h-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
>                     {resyncMutation.isPending ? 'Syncing...' : 'Sync from Strava'}
>                 </button>
>                 <button
>                     onClick={() => signIn('strava', { callbackUrl: window.location.href })}
>                     className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 transition-colors text-sm flex items-center justify-center gap-2"
>                 >
>                     <Link2 className="w-4 h-4" />
>                     Reconnect Strava
>                 </button>
>                 <p className="text-[10px] text-foreground-muted">Re-authenticate if sync is failing</p>
>             </div>
> 
>             <div className="space-y-3 pt-2 border-t border-line">
>                 <h4 className="text-xs text-positive font-semibold">Health Connect</h4>
>                 <button
>                     onClick={() => healthConnectSyncMutation.mutate()}
>                     disabled={healthConnectSyncMutation.isPending}
>                     className="w-full py-3 border border-positive/30 text-positive rounded-md hover:bg-positive/10 transition-colors text-sm flex items-center justify-center gap-2"
>                 >
>                     <RefreshCw className={`w-4 h-4 ${healthConnectSyncMutation.isPending ? 'animate-spin' : ''}`} />
>                     {healthConnectSyncMutation.isPending ? 'Syncing...' : 'Sync from Health Connect'}
>                 </button>
>             </div>
> 
>             {message && (
>                 <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${message.includes('Error') || message.includes('failed') || message.includes('lost') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
>                     <div className="flex items-center gap-2">
>                         <AlertCircle className="w-4 h-4" />
>                         {message}
>                     </div>
>                     {showReauthPrompt && (
>                         <button
>                             onClick={() => signIn('strava', { callbackUrl: window.location.href })}
>                             className="mt-1 w-full py-2 bg-negative/15 hover:bg-negative/25 text-negative rounded-md text-xs flex items-center justify-center gap-2 transition-colors font-semibold"
>                         >
>                             <Link2 className="w-3 h-3" />
>                             Reconnect Now
>                         </button>
>                     )}
>                 </div>
>             )}
>         </div>
>     );
> }
> ```
>
> **REPLACE WITH:**
> ```tsx
> // ─── Connections ────────────────────────────────────────────
> 
> function ConnectionsSubPage({ onBack: _onBack }: { onBack: () => void }) {
>     const queryClient = useQueryClient();
>     const [message, setMessage] = useState('');
>     const [showReauthPrompt, setShowReauthPrompt] = useState(false);
>     const [copiedMcpUrl, setCopiedMcpUrl] = useState(false);
>     const [showMcpDocs, setShowMcpDocs] = useState(false);
> 
>     const [hrZone1Max, setHrZone1Max] = useState(130);
>     const [hrZone2Max, setHrZone2Max] = useState(148);
>     const [hrZone3Max, setHrZone3Max] = useState(160);
>     const [hrZone4Max, setHrZone4Max] = useState(170);
>     const [hrZone5Max, setHrZone5Max] = useState(178);
>     const [hrZone6Max, setHrZone6Max] = useState(187);
> 
>     const mcpEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}/mcp` : 'https://runflow.schuelken.uk/mcp';
> 
>     const { data: settingsData } = useQuery({
>         queryKey: ['user-settings'],
>         queryFn: async () => {
>             const res = await fetch('/api/settings/update-vdot');
>             if (!res.ok) throw new Error('Failed');
>             return res.json();
>         },
>         refetchOnWindowFocus: false,
>     });
> 
>     const { data: mcpTokensData, refetch: refetchMcpTokens, isLoading: isLoadingMcpTokens } = useQuery({
>         queryKey: ['mcp-tokens'],
>         queryFn: async () => {
>             const res = await fetch('/api/settings/mcp-tokens');
>             if (!res.ok) throw new Error('Failed to load MCP tokens');
>             return res.json();
>         },
>         refetchOnWindowFocus: false,
>     });
> 
>     const revokeMcpTokenMutation = useMutation({
>         mutationFn: async (tokenId?: string) => {
>             const url = tokenId ? `/api/settings/mcp-tokens?tokenId=${encodeURIComponent(tokenId)}` : '/api/settings/mcp-tokens';
>             const res = await fetch(url, { method: 'DELETE' });
>             if (!res.ok) throw new Error('Failed to revoke MCP client');
>             return res.json();
>         },
>         onSuccess: (_data, tokenId) => {
>             setMessage(tokenId ? 'Disconnected MCP client.' : 'Revoked all connected MCP clients.');
>             refetchMcpTokens();
>         },
>         onError: () => setMessage('Error revoking MCP client token.'),
>     });
> 
>     useEffect(() => {
>         if (settingsData) {
>             if (settingsData.hrZone1Max) setHrZone1Max(settingsData.hrZone1Max);
>             if (settingsData.hrZone2Max) setHrZone2Max(settingsData.hrZone2Max);
>             if (settingsData.hrZone3Max) setHrZone3Max(settingsData.hrZone3Max);
>             if (settingsData.hrZone4Max) setHrZone4Max(settingsData.hrZone4Max);
>             if (settingsData.hrZone5Max) setHrZone5Max(settingsData.hrZone5Max);
>             if (settingsData.hrZone6Max) setHrZone6Max(settingsData.hrZone6Max);
>         }
>     }, [settingsData]);
> 
>     const resyncMutation = useMutation({
>         mutationFn: async () => {
>             const res = await fetch('/api/sync', {
>                 method: 'POST',
>                 body: JSON.stringify({ range: 'ALL' }),
>                 headers: { 'Content-Type': 'application/json' },
>             });
>             if (!res.ok) {
>                 const errorData = await res.json().catch(() => ({}));
>                 throw new Error(errorData.error || 'Failed to resync');
>             }
>             return res.json();
>         },
>         onSuccess: () => {
>             setMessage('Full resync started! May take a few minutes.');
>             setShowReauthPrompt(false);
>             queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
>             queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
>         },
>         onError: (err) => {
>             const isAuthError = err.message.toLowerCase().includes('authenticate') ||
>                 err.message.toLowerCase().includes('token') ||
>                 err.message.includes('400') || err.message.includes('401');
>             if (isAuthError) {
>                 setMessage('Connection lost. Reconnect Strava.');
>                 setShowReauthPrompt(true);
>             } else {
>                 setMessage(`Resync failed: ${err.message}`);
>                 setShowReauthPrompt(false);
>             }
>         },
>     });
> 
>     const healthConnectSyncMutation = useMutation({
>         mutationFn: async () => {
>             const permitted = await requestHealthPermissions();
>             if (!permitted) throw new Error('Health Connect permissions not granted');
>             const result = await syncHealthData(90, {
>                 z1: hrZone1Max, z2: hrZone2Max, z3: hrZone3Max,
>                 z4: hrZone4Max, z5: hrZone5Max, z6: hrZone6Max,
>             });
>             return result;
>         },
>         onSuccess: (result) => {
>             setMessage(result.synced > 0 ? `Synced ${result.synced} activities!` : 'No new activities found.');
>             queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
>             queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
>             queryClient.invalidateQueries({ queryKey: ['activities'] });
>         },
>         onError: (err) => setMessage(`Health Connect failed: ${err.message}`),
>     });
> 
>     const activeMcpTokens: Array<{
>         id: string;
>         clientId: string;
>         clientName?: string;
>         scope: string;
>         createdAt: string;
>         lastUsedAt?: string | null;
>         expiresAt: string;
>     }> = mcpTokensData?.tokens || [];
> 
>     return (
>         <div className="p-5 space-y-5">
>             <h3 className="text-lg font-bold text-foreground">Connections</h3>
> 
>             <div className="space-y-3">
>                 <h4 className="text-xs text-accent-orange font-semibold">Strava</h4>
>                 <button
>                     onClick={() => resyncMutation.mutate()}
>                     disabled={resyncMutation.isPending}
>                     className="w-full py-3 border border-line text-foreground rounded-md hover:bg-surface-hover transition-colors text-sm flex items-center justify-center gap-2"
>                 >
>                     <RefreshCw className={`w-4 h-4 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
>                     {resyncMutation.isPending ? 'Syncing...' : 'Sync from Strava'}
>                 </button>
>                 <button
>                     onClick={() => signIn('strava', { callbackUrl: window.location.href })}
>                     className="w-full py-3 border border-accent-orange/30 text-accent-orange rounded-md hover:bg-accent-orange/10 transition-colors text-sm flex items-center justify-center gap-2"
>                 >
>                     <Link2 className="w-4 h-4" />
>                     Reconnect Strava
>                 </button>
>                 <p className="text-[10px] text-foreground-muted">Re-authenticate if sync is failing</p>
>             </div>
> 
>             <div className="space-y-3 pt-2 border-t border-line">
>                 <h4 className="text-xs text-positive font-semibold">Health Connect</h4>
>                 <button
>                     onClick={() => healthConnectSyncMutation.mutate()}
>                     disabled={healthConnectSyncMutation.isPending}
>                     className="w-full py-3 border border-positive/30 text-positive rounded-md hover:bg-positive/10 transition-colors text-sm flex items-center justify-center gap-2"
>                 >
>                     <RefreshCw className={`w-4 h-4 ${healthConnectSyncMutation.isPending ? 'animate-spin' : ''}`} />
>                     {healthConnectSyncMutation.isPending ? 'Syncing...' : 'Sync from Health Connect'}
>                 </button>
>             </div>
> 
>             {/* MCP Server Documentation & Connected AI Clients Organization */}
>             <div className="space-y-3 pt-3 border-t border-line">
>                 <div className="flex items-center justify-between">
>                     <h4 className="text-xs text-accent-cyan font-semibold flex items-center gap-1.5">
>                         <Bot className="w-3.5 h-3.5" />
>                         MCP Server & AI Clients
>                     </h4>
>                     <button
>                         type="button"
>                         onClick={() => setShowMcpDocs(!showMcpDocs)}
>                         className="text-[11px] text-accent-cyan hover:underline font-medium"
>                     >
>                         {showMcpDocs ? 'Hide Setup Guide' : 'MCP Setup Guide'}
>                     </button>
>                 </div>
> 
>                 <div className="p-3 bg-surface border border-line rounded-md space-y-2">
>                     <label className="block text-[10px] uppercase tracking-wider text-foreground-muted font-semibold">
>                         Remote MCP Endpoint URL
>                     </label>
>                     <div className="flex items-center gap-2">
>                         <code className="flex-1 bg-background-secondary border border-line rounded px-2.5 py-1.5 text-xs font-mono text-foreground truncate">
>                             {mcpEndpointUrl}
>                         </code>
>                         <button
>                             type="button"
>                             onClick={() => {
>                                 navigator.clipboard.writeText(mcpEndpointUrl);
>                                 setCopiedMcpUrl(true);
>                                 setTimeout(() => setCopiedMcpUrl(false), 2000);
>                             }}
>                             className="px-2.5 py-1.5 bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 rounded text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
>                         >
>                             {copiedMcpUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
>                             {copiedMcpUrl ? 'Copied' : 'Copy'}
>                         </button>
>                     </div>
>                     <p className="text-[10px] text-foreground-muted leading-relaxed">
>                         Connect Claude, Cursor, Windsurf, ChatGPT, or Gemini to inspect your training readiness, activities, and manage workouts.
>                     </p>
>                 </div>
> 
>                 {showMcpDocs && (
>                     <div className="p-3.5 bg-background-tertiary border border-line rounded-md space-y-3 text-xs">
>                         <div>
>                             <p className="font-semibold text-foreground mb-1">1. OAuth 2.1 Interactive Login (Full Read + Write)</p>
>                             <p className="text-[11px] text-foreground-muted leading-relaxed">
>                                 In Claude Desktop/Web, Cursor, or ChatGPT Connectors, add a Remote MCP Server with URL <code className="text-accent-cyan font-mono">{mcpEndpointUrl}</code>. RunFlow supports OAuth 2.1 Dynamic Client Registration + PKCE—your browser will open a consent screen to authorize full plan and workout tools (<code className="font-mono">create_planned_workout</code>, <code className="font-mono">update_planned_workout</code>, <code className="font-mono">complete_workout</code>, <code className="font-mono">swap_workout_days</code>, <code className="font-mono">log_daily_nutrition</code>).
>                             </p>
>                         </div>
>                         <div className="border-t border-line pt-2.5">
>                             <p className="font-semibold text-foreground mb-1">2. Headless API Key (Read-Only)</p>
>                             <p className="text-[11px] text-foreground-muted leading-relaxed mb-1.5">
>                                 For scripts or CLI MCP hosts, generate a personal <code className="font-mono">rf_...</code> key in <strong>App Settings → API Access</strong> and pass it as a Bearer token:
>                             </p>
>                             <pre className="p-2 bg-background border border-line rounded text-[10px] font-mono text-foreground-secondary overflow-x-auto">
> {`{
>   "mcpServers": {
>     "runflow": {
>       "url": "${mcpEndpointUrl}",
>       "headers": {
>         "Authorization": "Bearer rf_YOUR_API_KEY"
>       }
>     }
>   }
> }`}
>                             </pre>
>                         </div>
>                     </div>
>                 )}
> 
>                 {/* Connected MCP OAuth Clients Organization */}
>                 <div className="p-3 bg-surface border border-line rounded-md space-y-2.5">
>                     <div className="flex items-center justify-between">
>                         <span className="text-xs font-semibold text-foreground">
>                             Connected MCP Clients ({activeMcpTokens.length})
>                         </span>
>                         {activeMcpTokens.length > 1 && (
>                             <button
>                                 type="button"
>                                 onClick={() => revokeMcpTokenMutation.mutate(undefined)}
>                                 disabled={revokeMcpTokenMutation.isPending}
>                                 className="text-[11px] text-negative hover:underline font-medium"
>                             >
>                                 Revoke All
>                             </button>
>                         )}
>                     </div>
> 
>                     {isLoadingMcpTokens ? (
>                         <p className="text-[11px] text-foreground-muted">Loading connected clients...</p>
>                     ) : activeMcpTokens.length === 0 ? (
>                         <p className="text-[11px] text-foreground-muted">
>                             No active OAuth MCP clients connected. Connect an AI client to <code className="font-mono">{mcpEndpointUrl}</code> to see it here.
>                         </p>
>                     ) : (
>                         <div className="space-y-2">
>                             {activeMcpTokens.map((tok) => (
>                                 <div
>                                     key={tok.id}
>                                     className="flex items-center justify-between gap-2 p-2 rounded bg-background-secondary border border-line"
>                                 >
>                                     <div className="min-w-0">
>                                         <div className="flex items-center gap-1.5">
>                                             <span className="text-xs font-semibold text-foreground truncate">
>                                                 {tok.clientName || tok.clientId}
>                                             </span>
>                                             <span className="px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan text-[9px] font-mono">
>                                                 {tok.scope}
>                                             </span>
>                                         </div>
>                                         <div className="text-[10px] text-foreground-muted">
>                                             Connected {new Date(tok.createdAt).toLocaleDateString()}
>                                             {tok.lastUsedAt ? ` • Last used ${new Date(tok.lastUsedAt).toLocaleDateString()}` : ''}
>                                         </div>
>                                     </div>
>                                     <button
>                                         type="button"
>                                         onClick={() => revokeMcpTokenMutation.mutate(tok.id)}
>                                         disabled={revokeMcpTokenMutation.isPending}
>                                         className="px-2 py-1 rounded border border-negative/30 text-negative hover:bg-negative/10 text-[11px] font-medium shrink-0 transition-colors"
>                                     >
>                                         Revoke
>                                     </button>
>                                 </div>
>                             ))}
>                         </div>
>                     )}
>                 </div>
>             </div>
> 
>             {message && (
>                 <div className={`p-3 rounded-lg text-sm flex flex-col gap-2 ${message.includes('Error') || message.includes('failed') || message.includes('lost') ? 'bg-negative/10 text-negative' : 'bg-positive/10 text-positive'}`}>
>                     <div className="flex items-center gap-2">
>                         <AlertCircle className="w-4 h-4" />
>                         {message}
>                     </div>
>                     {showReauthPrompt && (
>                         <button
>                             onClick={() => signIn('strava', { callbackUrl: window.location.href })}
>                             className="mt-1 w-full py-2 bg-negative/15 hover:bg-negative/25 text-negative rounded-md text-xs flex items-center justify-center gap-2 transition-colors font-semibold"
>                         >
>                             <Link2 className="w-3 h-3" />
>                             Reconnect Now
>                         </button>
>                     )}
>                 </div>
>             )}
>         </div>
>     );
> }
> ```
>
> #### Edit 3.4: Add Cycling FTP, Coggan Power Zones & Cycling HR Zones Preview to `Web/src/components/setup/HeartRateZonesSection.tsx`
> Open `Web/src/components/setup/HeartRateZonesSection.tsx` (lines 1–75 and lines 173–264).
>
> **FIND:**
> ```tsx
> import { ChevronDown, ChevronUp } from 'lucide-react';
> 
> interface Zone {
>     label: string;
>     min: number;
>     max: number;
> }
> 
> interface HeartRateZonesSectionProps {
>     showHeartRate: boolean;
>     setShowHeartRate: (_val: boolean) => void;
>     maxHeartRate: number;
>     setMaxHeartRate: (_val: number) => void;
>     restingHeartRate: number;
>     setRestingHeartRate: (_val: number) => void;
>     weight: number;
>     setWeight: (_val: number) => void;
>     thresholdHR: string;
>     setThresholdHR: (_val: string) => void;
>     thresholdPaceMin: string;
>     setThresholdPaceMin: (_val: string) => void;
>     thresholdPaceSec: string;
>     setThresholdPaceSec: (_val: string) => void;
>     calculatedZones: Zone[];
>     zone1Max: number;
>     setZone1Max: (_val: number) => void;
>     zone2Max: number;
>     setZone2Max: (_val: number) => void;
>     zone3Max: number;
>     setZone3Max: (_val: number) => void;
>     zone4Max: number;
>     setZone4Max: (_val: number) => void;
>     zone5Max: number;
>     setZone5Max: (_val: number) => void;
>     zone6Max: number;
>     setZone6Max: (_val: number) => void;
> }
> 
> export default function HeartRateZonesSection({
>     showHeartRate,
>     setShowHeartRate,
>     maxHeartRate,
>     setMaxHeartRate,
>     restingHeartRate,
>     setRestingHeartRate,
>     weight,
>     setWeight,
>     thresholdHR,
>     setThresholdHR,
>     thresholdPaceMin,
>     setThresholdPaceMin,
>     thresholdPaceSec,
>     setThresholdPaceSec,
>     calculatedZones,
>     zone1Max,
>     setZone1Max,
>     zone2Max,
>     setZone2Max,
>     zone3Max,
>     setZone3Max,
>     zone4Max,
>     setZone4Max,
>     zone5Max,
>     setZone5Max,
>     zone6Max,
>     setZone6Max
> }: HeartRateZonesSectionProps) {
>     const inputClass = "bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";
> ```
>
> **REPLACE WITH:**
> ```tsx
> import { useState } from 'react';
> import { ChevronDown, ChevronUp } from 'lucide-react';
> 
> interface Zone {
>     label: string;
>     min: number;
>     max: number;
> }
> 
> interface HeartRateZonesSectionProps {
>     showHeartRate: boolean;
>     setShowHeartRate: (_val: boolean) => void;
>     maxHeartRate: number;
>     setMaxHeartRate: (_val: number) => void;
>     restingHeartRate: number;
>     setRestingHeartRate: (_val: number) => void;
>     weight: number;
>     setWeight: (_val: number) => void;
>     thresholdHR: string;
>     setThresholdHR: (_val: string) => void;
>     thresholdPaceMin: string;
>     setThresholdPaceMin: (_val: string) => void;
>     thresholdPaceSec: string;
>     setThresholdPaceSec: (_val: string) => void;
>     calculatedZones: Zone[];
>     zone1Max: number;
>     setZone1Max: (_val: number) => void;
>     zone2Max: number;
>     setZone2Max: (_val: number) => void;
>     zone3Max: number;
>     setZone3Max: (_val: number) => void;
>     zone4Max: number;
>     setZone4Max: (_val: number) => void;
>     zone5Max: number;
>     setZone5Max: (_val: number) => void;
>     zone6Max: number;
>     setZone6Max: (_val: number) => void;
>     ftpWatts?: number;
>     setFtpWatts?: (_val: number) => void;
> }
> 
> export default function HeartRateZonesSection({
>     showHeartRate,
>     setShowHeartRate,
>     maxHeartRate,
>     setMaxHeartRate,
>     restingHeartRate,
>     setRestingHeartRate,
>     weight,
>     setWeight,
>     thresholdHR,
>     setThresholdHR,
>     thresholdPaceMin,
>     setThresholdPaceMin,
>     thresholdPaceSec,
>     setThresholdPaceSec,
>     calculatedZones,
>     zone1Max,
>     setZone1Max,
>     zone2Max,
>     setZone2Max,
>     zone3Max,
>     setZone3Max,
>     zone4Max,
>     setZone4Max,
>     zone5Max,
>     setZone5Max,
>     zone6Max,
>     setZone6Max,
>     ftpWatts = 250,
>     setFtpWatts,
> }: HeartRateZonesSectionProps) {
>     const [zoneSportTab, setZoneSportTab] = useState<'running' | 'cycling'>('running');
>     const [localFtp, setLocalFtp] = useState<number>(ftpWatts || 250);
>     const activeFtp = setFtpWatts ? ftpWatts : localFtp;
>     const updateFtp = (val: number) => {
>         setLocalFtp(val);
>         setFtpWatts?.(val);
>     };
>     const runLthr = parseInt(thresholdHR, 10) || Math.round(maxHeartRate * 0.9);
>     const bikeLthr = Math.max(100, runLthr - 8);
>     const cogganZones = [
>         { label: 'Z1 Active Recovery (<55%)', min: 0, max: Math.round(activeFtp * 0.55), color: 'text-emerald-400' },
>         { label: 'Z2 Endurance (56–75%)', min: Math.round(activeFtp * 0.56), max: Math.round(activeFtp * 0.75), color: 'text-blue-400' },
>         { label: 'Z3 Tempo (76–90%)', min: Math.round(activeFtp * 0.76), max: Math.round(activeFtp * 0.90), color: 'text-cyan-400' },
>         { label: 'Z4 Threshold (91–105%)', min: Math.round(activeFtp * 0.91), max: Math.round(activeFtp * 1.05), color: 'text-amber-400' },
>         { label: 'Z5 VO2max (106–120%)', min: Math.round(activeFtp * 1.06), max: Math.round(activeFtp * 1.20), color: 'text-orange-400' },
>         { label: 'Z6 Anaerobic (121–150%)', min: Math.round(activeFtp * 1.21), max: Math.round(activeFtp * 1.50), color: 'text-purple-400' },
>         { label: 'Z7 Neuromuscular (>150%)', min: Math.round(activeFtp * 1.51), max: 9999, color: 'text-rose-400' },
>     ];
>     const bikeHrZones = [
>         { label: 'Z1 Recovery', min: 0, max: Math.round(bikeLthr * 0.75) },
>         { label: 'Z2 Endurance', min: Math.round(bikeLthr * 0.75) + 1, max: Math.round(bikeLthr * 0.87) },
>         { label: 'Z3 Tempo', min: Math.round(bikeLthr * 0.87) + 1, max: Math.round(bikeLthr * 0.94) },
>         { label: 'Z4 Threshold', min: Math.round(bikeLthr * 0.94) + 1, max: bikeLthr },
>         { label: 'Z5 VO2max', min: bikeLthr + 1, max: Math.round(bikeLthr * 1.05) },
>         { label: 'Z6 Anaerobic', min: Math.round(bikeLthr * 1.05) + 1, max: Math.round(bikeLthr * 1.10) },
>         { label: 'Z7 Neuromuscular', min: Math.round(bikeLthr * 1.10) + 1, max: 999 },
>     ];
>     const inputClass = "bg-surface border border-glass-border rounded-md p-3 text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-orange transition-all";
> ```
>
> Second, in `Web/src/components/setup/HeartRateZonesSection.tsx` (lines 173–192 of the original file):
>
> **FIND:**
> ```tsx
>                     {/* Calculated 7 Zones Display */}
>                     {calculatedZones.length > 0 && (
>                         <div className="bg-background-tertiary rounded-md p-4 border border-line">
>                             <h4 className="text-xs font-semibold text-foreground-muted mb-3">Calculated HR Zones (7-Zone Model)</h4>
>                             <div className="space-y-1">
>                                 {calculatedZones.map((zone, i) => {
>                                     const colors = ['text-zone-1', 'text-zone-2', 'text-zone-3', 'text-zone-4', 'text-zone-5', 'text-workout-strength', 'text-workout-long-run'];
>                                     return (
>                                         <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-surface-hover rounded">
>                                             <span className={`${colors[i]} font-medium`}>{zone.label}</span>
>                                             <span className="text-foreground font-mono tabular-nums">
>                                                 {zone.min} - {zone.max === 999 ? '∞' : zone.max} <span className="text-foreground-muted text-xs">bpm</span>
>                                             </span>
>                                         </div>
>                                     );
>                                 })}
>                             </div>
>                         </div>
>                     )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>                     {/* Sport Switcher for Running vs Cycling Zones */}
>                     <div className="bg-background-tertiary rounded-md p-4 border border-line space-y-4">
>                         <div className="flex items-center justify-between gap-2">
>                             <h4 className="text-xs font-semibold text-foreground-muted">Sport-Specific Zones (Running vs Cycling)</h4>
>                             <div className="flex gap-1 bg-surface p-1 rounded border border-glass-border">
>                                 <button
>                                     type="button"
>                                     onClick={() => setZoneSportTab('running')}
>                                     className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
>                                         zoneSportTab === 'running' ? 'bg-accent-orange text-white' : 'text-foreground-muted hover:text-foreground'
>                                     }`}
>                                 >
>                                     Running HR
>                                 </button>
>                                 <button
>                                     type="button"
>                                     onClick={() => setZoneSportTab('cycling')}
>                                     className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
>                                         zoneSportTab === 'cycling' ? 'bg-accent-cyan text-white' : 'text-foreground-muted hover:text-foreground'
>                                     }`}
>                                 >
>                                     Cycling Power & HR
>                                 </button>
>                             </div>
>                         </div>
> 
>                         {zoneSportTab === 'running' ? (
>                             calculatedZones.length > 0 && (
>                                 <div className="space-y-1">
>                                     {calculatedZones.map((zone, i) => {
>                                         const colors = ['text-zone-1', 'text-zone-2', 'text-zone-3', 'text-zone-4', 'text-zone-5', 'text-workout-strength', 'text-workout-long-run'];
>                                         return (
>                                             <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-surface-hover rounded">
>                                                 <span className={`${colors[i]} font-medium`}>{zone.label}</span>
>                                                 <span className="text-foreground font-mono tabular-nums">
>                                                     {zone.min} - {zone.max === 999 ? '∞' : zone.max} <span className="text-foreground-muted text-xs">bpm</span>
>                                                 </span>
>                                             </div>
>                                         );
>                                     })}
>                                 </div>
>                             )
>                         ) : (
>                             <div className="space-y-4">
>                                 <div>
>                                     <label className="block text-xs text-foreground-muted mb-1">Cycling FTP (Watts)</label>
>                                     <input
>                                         type="number"
>                                         min={50}
>                                         max={600}
>                                         value={activeFtp}
>                                         onChange={e => updateFtp(parseInt(e.target.value, 10) || 200)}
>                                         className={inputClass}
>                                     />
>                                 </div>
>                                 <div>
>                                     <p className="text-xs font-semibold text-accent-cyan mb-2">Cycling Power Zones (Coggan 7-Zone)</p>
>                                     <div className="space-y-1">
>                                         {cogganZones.map((z, i) => (
>                                             <div key={i} className="flex justify-between items-center text-xs p-1.5 hover:bg-surface-hover rounded">
>                                                 <span className={`${z.color} font-medium`}>{z.label}</span>
>                                                 <span className="text-foreground font-mono tabular-nums">
>                                                     {z.min} - {z.max === 9999 ? '∞' : z.max} <span className="text-foreground-muted">W</span>
>                                                 </span>
>                                             </div>
>                                         ))}
>                                     </div>
>                                 </div>
>                                 <div>
>                                     <p className="text-xs font-semibold text-accent-orange mb-2">Cycling Heart Rate Zones (Cycling LTHR ~{bikeLthr} bpm)</p>
>                                     <div className="space-y-1">
>                                         {bikeHrZones.map((zone, i) => {
>                                             const colors = ['text-zone-1', 'text-zone-2', 'text-zone-3', 'text-zone-4', 'text-zone-5', 'text-workout-strength', 'text-workout-long-run'];
>                                             return (
>                                                 <div key={i} className="flex justify-between items-center text-xs p-1.5 hover:bg-surface-hover rounded">
>                                                     <span className={`${colors[i]} font-medium`}>{zone.label}</span>
>                                                     <span className="text-foreground font-mono tabular-nums">
>                                                         {zone.min} - {zone.max === 999 ? '∞' : zone.max} <span className="text-foreground-muted">bpm</span>
>                                                     </span>
>                                                 </div>
>                                             );
>                                         })}
>                                     </div>
>                                 </div>
>                             </div>
>                         )}
>                     </div>
> ```
>
> #### Verify Agent-UI-3:
> Run:
> ```bash
> cd Web && npx tsc --noEmit
> ```


---

### Agent-UI-4 Prompt (`cycling-mywhoosh-plan-builder`)

> **Role**: Cycling-Only & MyWhoosh Plan Builder Agent `cycling-mywhoosh-plan-builder` (Model: Gemini 3.8 Flash Medium)
> **Exclusive Write Scope**:
> * `Web/src/components/setup/TargetRaceSection.tsx`
> * `Web/src/components/setup/PlanVolumeSection.tsx`
> * `Web/src/components/PlanSetupForm.tsx`
> * `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
> * `Web/src/lib/plans/index.ts`
> * `Web/src/lib/plans/generators/no-race.ts`
> * `Web/src/lib/plans/generators/triathlon.ts`
> * `Web/src/lib/services/plan-creation.ts`
>
> **Do NOT edit any files outside your Exclusive Write Scope.**
>
> Apply the following 8 exact `FIND` / `REPLACE WITH` edits in order:
>
> #### Edit 4.1: Add `Cycling (MyWhoosh)` Option (`CYCLING`) to `Web/src/components/setup/TargetRaceSection.tsx`
> Open `Web/src/components/setup/TargetRaceSection.tsx` (lines 1–27, lines 69–94, and lines 118–191).
>
> First, in `Web/src/components/setup/TargetRaceSection.tsx` (lines 1–27):
>
> **FIND:**
> ```tsx
> import { Target, Zap, Waves, Clock } from 'lucide-react';
> 
> interface TargetRaceSectionProps {
>     mode: 'onboarding' | 'advanced' | 'modal' | 'settings';
>     goalName: string;
>     setGoalName: (_val: string) => void;
>     raceType: string;
>     setRaceType: (_val: string) => void;
>     raceDate: string;
>     setRaceDate: (_val: string) => void;
>     planStartDate: string;
>     setPlanStartDate: (_val: string) => void;
>     formErrors: Record<string, string>;
>     sport?: string;
>     setSport?: (_val: string) => void;
>     durationWeeks?: string;
>     setDurationWeeks?: (_val: string) => void;
>     experienceLevel?: string;
>     setExperienceLevel?: (_val: string) => void;
> }
> 
> const SPORT_OPTIONS = [
>     { value: 'RUN', label: 'Running', Icon: Zap },
>     { value: 'TRIATHLON', label: 'Triathlon', Icon: Waves },
>     { value: 'NO_RACE', label: 'No Race', Icon: Clock },
> ];
> ```
>
> **REPLACE WITH:**
> ```tsx
> import { Target, Zap, Waves, Clock, Bike } from 'lucide-react';
> 
> interface TargetRaceSectionProps {
>     mode: 'onboarding' | 'advanced' | 'modal' | 'settings';
>     goalName: string;
>     setGoalName: (_val: string) => void;
>     raceType: string;
>     setRaceType: (_val: string) => void;
>     raceDate: string;
>     setRaceDate: (_val: string) => void;
>     planStartDate: string;
>     setPlanStartDate: (_val: string) => void;
>     formErrors: Record<string, string>;
>     sport?: string;
>     setSport?: (_val: string) => void;
>     durationWeeks?: string;
>     setDurationWeeks?: (_val: string) => void;
>     experienceLevel?: string;
>     setExperienceLevel?: (_val: string) => void;
> }
> 
> const SPORT_OPTIONS = [
>     { value: 'RUN', label: 'Running', Icon: Zap },
>     { value: 'CYCLING', label: 'Cycling (MyWhoosh)', Icon: Bike },
>     { value: 'TRIATHLON', label: 'Triathlon', Icon: Waves },
>     { value: 'NO_RACE', label: 'No Race', Icon: Clock },
> ];
> ```
>
> Second, in `Web/src/components/setup/TargetRaceSection.tsx` (lines 69–94):
>
> **FIND:**
> ```tsx
>             {setSport && (
>                 <div>
>                     <label className="block text-xs text-foreground-muted mb-2">Sport</label>
>                     <div className="grid grid-cols-3 gap-2">
>                         {SPORT_OPTIONS.map(({ value, label, Icon }) => (
>                             <button
>                                 key={value}
>                                 type="button"
>                                 onClick={() => {
>                                     setSport(value);
>                                     if (value === 'RUN') setRaceType('FIVE_K');
>                                     else if (value === 'TRIATHLON') setRaceType('SPRINT_TRI');
>                                 }}
>                                 className={`p-3 rounded-md border text-left transition-colors ${
>                                     sport === value
>                                         ? 'border-accent-orange bg-accent-orange/10 text-foreground'
>                                         : 'border-glass-border bg-surface hover:border-foreground-muted text-foreground-muted'
>                                 }`}
>                             >
>                                 <Icon className="w-4 h-4 mb-1" />
>                                 <span className="text-xs font-medium block">{label}</span>
>                             </button>
>                         ))}
>                     </div>
>                 </div>
>             )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>             {setSport && (
>                 <div>
>                     <label className="block text-xs text-foreground-muted mb-2">Sport</label>
>                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
>                         {SPORT_OPTIONS.map(({ value, label, Icon }) => (
>                             <button
>                                 key={value}
>                                 type="button"
>                                 onClick={() => {
>                                     setSport(value);
>                                     if (value === 'RUN') setRaceType('FIVE_K');
>                                     else if (value === 'TRIATHLON') setRaceType('SPRINT_TRI');
>                                 }}
>                                 className={`p-3 rounded-md border text-left transition-colors ${
>                                     sport === value
>                                         ? 'border-accent-orange bg-accent-orange/10 text-foreground'
>                                         : 'border-glass-border bg-surface hover:border-foreground-muted text-foreground-muted'
>                                 }`}
>                             >
>                                 <Icon className="w-4 h-4 mb-1" />
>                                 <span className="text-xs font-medium block">{label}</span>
>                             </button>
>                         ))}
>                     </div>
>                 </div>
>             )}
> ```
>
> Third, in `Web/src/components/setup/TargetRaceSection.tsx` (lines 118–191):
>
> **FIND:**
> ```tsx
>             {sport !== 'NO_RACE' && (
>                 <div className="grid grid-cols-2 gap-4">
>                     <div>
>                         <label className="block text-xs text-foreground-muted mb-1">Distance</label>
>                         <select
>                             value={raceType}
>                             onChange={(e) => {
>                                 const val = e.target.value;
>                                 setRaceType(val);
>                                 if (setSport) {
>                                     if (['SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI'].includes(val)) {
>                                         setSport('TRIATHLON');
>                                     } else {
>                                         setSport('RUN');
>                                     }
>                                 }
>                             }}
>                             className={inputClass}
>                         >
>                             <optgroup label="Running">
>                                 <option value="FIVE_K">5K</option>
>                                 <option value="TEN_K">10K</option>
>                                 <option value="HALF_MARATHON">Half Marathon</option>
>                                 <option value="MARATHON">Marathon</option>
>                             </optgroup>
>                             <optgroup label="Ultra">
>                                 <option value="FIFTY_K">50K</option>
>                                 <option value="FIFTY_MILE">50 Mile</option>
>                                 <option value="HUNDRED_K">100K</option>
>                                 <option value="HUNDRED_MILE">100 Mile</option>
>                                 <option value="TWELVE_HOUR">12 Hour</option>
>                                 <option value="TWENTY_FOUR_HOUR">24 Hour</option>
>                                 <option value="BACKYARD_ULTRA">Backyard Ultra</option>
>                             </optgroup>
>                             <optgroup label="Triathlon">
>                                 <option value="SPRINT_TRI">Sprint Triathlon</option>
>                                 <option value="OLYMPIC_TRI">Olympic Triathlon</option>
>                                 <option value="HALF_IRONMAN">Middle Distance (70.3)</option>
>                                 <option value="FULL_IRONMAN">Long Distance</option>
>                                 <option value="CUSTOM_TRI">Custom Triathlon</option>
>                             </optgroup>
>                             <optgroup label="Other">
>                                 <option value="CUSTOM_DISTANCE">Custom Distance</option>
>                             </optgroup>
>                         </select>
>                     </div>
>                     <div>
>                         <label className="block text-xs text-foreground-muted mb-1">Race Date</label>
>                         <input
>                             type="date"
>                             value={raceDate}
>                             onChange={(e) => setRaceDate(e.target.value)}
>                             className={`${inputClass} ${formErrors.raceDate ? 'border-negative focus:ring-negative' : ''}`}
>                         />
>                         {formErrors.raceDate && <p className="text-negative text-xs mt-1">{formErrors.raceDate}</p>}
>                     </div>
>                 </div>
>             )}
> 
>             {sport === 'NO_RACE' && setDurationWeeks && (
>                 <div>
>                     <label className="block text-xs text-foreground-muted mb-1">Plan Duration (weeks)</label>
>                     <input
>                         type="number"
>                         value={durationWeeks}
>                         onChange={(e) => setDurationWeeks(e.target.value)}
>                         min={4}
>                         max={52}
>                         placeholder="12"
>                         className={inputClass}
>                     />
>                 </div>
>             )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>             {sport !== 'NO_RACE' && sport !== 'CYCLING' && (
>                 <div className="grid grid-cols-2 gap-4">
>                     <div>
>                         <label className="block text-xs text-foreground-muted mb-1">Distance</label>
>                         <select
>                             value={raceType}
>                             onChange={(e) => {
>                                 const val = e.target.value;
>                                 setRaceType(val);
>                                 if (setSport) {
>                                     if (['SPRINT_TRI', 'OLYMPIC_TRI', 'HALF_IRONMAN', 'FULL_IRONMAN', 'CUSTOM_TRI'].includes(val)) {
>                                         setSport('TRIATHLON');
>                                     } else {
>                                         setSport('RUN');
>                                     }
>                                 }
>                             }}
>                             className={inputClass}
>                         >
>                             <optgroup label="Running">
>                                 <option value="FIVE_K">5K</option>
>                                 <option value="TEN_K">10K</option>
>                                 <option value="HALF_MARATHON">Half Marathon</option>
>                                 <option value="MARATHON">Marathon</option>
>                             </optgroup>
>                             <optgroup label="Ultra">
>                                 <option value="FIFTY_K">50K</option>
>                                 <option value="FIFTY_MILE">50 Mile</option>
>                                 <option value="HUNDRED_K">100K</option>
>                                 <option value="HUNDRED_MILE">100 Mile</option>
>                                 <option value="TWELVE_HOUR">12 Hour</option>
>                                 <option value="TWENTY_FOUR_HOUR">24 Hour</option>
>                                 <option value="BACKYARD_ULTRA">Backyard Ultra</option>
>                             </optgroup>
>                             <optgroup label="Triathlon">
>                                 <option value="SPRINT_TRI">Sprint Triathlon</option>
>                                 <option value="OLYMPIC_TRI">Olympic Triathlon</option>
>                                 <option value="HALF_IRONMAN">Middle Distance (70.3)</option>
>                                 <option value="FULL_IRONMAN">Long Distance</option>
>                                 <option value="CUSTOM_TRI">Custom Triathlon</option>
>                             </optgroup>
>                             <optgroup label="Other">
>                                 <option value="CUSTOM_DISTANCE">Custom Distance</option>
>                             </optgroup>
>                         </select>
>                     </div>
>                     <div>
>                         <label className="block text-xs text-foreground-muted mb-1">Race Date</label>
>                         <input
>                             type="date"
>                             value={raceDate}
>                             onChange={(e) => setRaceDate(e.target.value)}
>                             className={`${inputClass} ${formErrors.raceDate ? 'border-negative focus:ring-negative' : ''}`}
>                         />
>                         {formErrors.raceDate && <p className="text-negative text-xs mt-1">{formErrors.raceDate}</p>}
>                     </div>
>                 </div>
>             )}
> 
>             {(sport === 'NO_RACE' || sport === 'CYCLING') && setDurationWeeks && (
>                 <div>
>                     <label className="block text-xs text-foreground-muted mb-1">Plan Duration (weeks)</label>
>                     <input
>                         type="number"
>                         value={durationWeeks}
>                         onChange={(e) => setDurationWeeks(e.target.value)}
>                         min={4}
>                         max={52}
>                         placeholder="8"
>                         className={inputClass}
>                     />
>                     {sport === 'CYCLING' && (
>                         <p className="text-[11px] text-accent-cyan mt-1">
>                             Automatically matched to your selected MyWhoosh Training Plan duration (adjustable).
>                         </p>
>                     )}
>                 </div>
>             )}
> ```
>
> #### Edit 4.2: Unlock `0` Runs/Week, Up to `6` Rides/Week & Optional Swims/Gym Workouts in `Web/src/components/setup/PlanVolumeSection.tsx`
> Open `Web/src/components/setup/PlanVolumeSection.tsx` (lines 83–244).
>
> **FIND:**
> ```tsx
>                 {/* Runs Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Activity className="w-3 h-3" /> Runs / Week
>                         </label>
>                         <span className="text-accent-orange font-bold font-mono tabular-nums">{runsPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="2"
>                         max="6"
>                         value={runsPerWeek}
>                         onChange={(e) => setRunsPerWeek(parseInt(e.target.value))}
>                         aria-label="Runs per week"
>                         aria-valuenow={runsPerWeek}
>                         aria-valuemin={2}
>                         aria-valuemax={6}
>                         className="w-full h-2 bg-background-tertiary rounded-md appearance-none cursor-pointer accent-accent-orange"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>2</span>
>                         <span>4</span>
>                         <span>6</span>
>                     </div>
>                 </div>
> 
>                 {/* Rides Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Bike className="w-3 h-3" /> Rides / Week
>                         </label>
>                         <span className="text-accent-cyan font-bold font-mono tabular-nums">{ridesPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="3"
>                         value={ridesPerWeek}
>                         onChange={(e) => setRidesPerWeek(parseInt(e.target.value))}
>                         aria-label="Rides per week"
>                         aria-valuenow={ridesPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={3}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-cyan"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>1</span>
>                         <span>2</span>
>                         <span>3</span>
>                     </div>
>                 </div>
> 
>                 {/* Swims Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Waves className="w-4 h-4" /> Swims / Week
>                         </label>
>                         <span className="text-accent-blue font-bold font-mono tabular-nums">{swimsPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="3"
>                         value={swimsPerWeek}
>                         onChange={(e) => setSwimsPerWeek(parseInt(e.target.value))}
>                         aria-label="Swims per week"
>                         aria-valuenow={swimsPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={3}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-blue"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>1</span>
>                         <span>2</span>
>                         <span>3</span>
>                     </div>
>                 </div>
> 
>                 {/* Strength Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Dumbbell className="w-4 h-4" /> Strength / Week
>                         </label>
>                         <span className="text-workout-strength font-bold font-mono tabular-nums">{strengthPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="4"
>                         value={strengthPerWeek}
>                         onChange={(e) => setStrengthPerWeek(parseInt(e.target.value))}
>                         aria-label="Strength sessions per week"
>                         aria-valuenow={strengthPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={4}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-workout-strength"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>2</span>
>                         <span>4</span>
>                     </div>
>                 </div>
> 
>                 {/* Peak Mileage */}
>                 <div className="mb-4">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Move className="w-3 h-3" /> Peak Mileage Goal
>                         </label>
>                         <span className="text-positive font-bold font-mono tabular-nums">{weeklyMileage} km</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="20"
>                         max="100"
>                         step="5"
>                         value={weeklyMileage}
>                         onChange={(e) => setWeeklyMileage(parseInt(e.target.value))}
>                         aria-label="Peak weekly mileage goal in kilometers"
>                         aria-valuenow={weeklyMileage}
>                         aria-valuemin={20}
>                         aria-valuemax={100}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-positive"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>20km</span>
>                         <span>60km</span>
>                         <span>100km</span>
>                     </div>
>                 </div>
> 
>                 <div className="mb-4">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Move className="w-3 h-3" /> Longest Long Run
>                         </label>
>                         <span className="text-positive font-bold font-mono tabular-nums">{maxLongRunKm} km</span>
>                     </div>
>                     <input
>                         type="number"
>                         min="6"
>                         max={maxLongRunKmCap}
>                         value={maxLongRunKm}
>                         onChange={(e) => {
>                             const parsed = parseInt(e.target.value, 10);
>                             if (Number.isNaN(parsed)) return;
>                             setMaxLongRunKm(Math.max(6, Math.min(parsed, maxLongRunKmCap)));
>                         }}
>                         className="w-full bg-surface border border-glass-border rounded-md p-2.5 text-foreground text-sm focus:ring-2 focus:ring-positive outline-hidden"
>                     />
>                     <p className="text-xs text-foreground-muted mt-1">
>                         Peak long run before taper. Default is calculated from your weekly distance goal.
>                     </p>
>                 </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
>                 {/* Runs Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Activity className="w-3 h-3" /> Runs / Week
>                         </label>
>                         <span className="text-accent-orange font-bold font-mono tabular-nums">{runsPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="6"
>                         value={runsPerWeek}
>                         onChange={(e) => setRunsPerWeek(parseInt(e.target.value))}
>                         aria-label="Runs per week"
>                         aria-valuenow={runsPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={6}
>                         className="w-full h-2 bg-background-tertiary rounded-md appearance-none cursor-pointer accent-accent-orange"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>2</span>
>                         <span>4</span>
>                         <span>6</span>
>                     </div>
>                 </div>
> 
>                 {/* Rides Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Bike className="w-3 h-3" /> Rides / Week
>                         </label>
>                         <span className="text-accent-cyan font-bold font-mono tabular-nums">{ridesPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="6"
>                         value={ridesPerWeek}
>                         onChange={(e) => setRidesPerWeek(parseInt(e.target.value))}
>                         aria-label="Rides per week"
>                         aria-valuenow={ridesPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={6}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-cyan"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>2</span>
>                         <span>4</span>
>                         <span>6</span>
>                     </div>
>                 </div>
> 
>                 {/* Swims Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Waves className="w-4 h-4" /> Swims / Week
>                         </label>
>                         <span className="text-accent-blue font-bold font-mono tabular-nums">{swimsPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="3"
>                         value={swimsPerWeek}
>                         onChange={(e) => setSwimsPerWeek(parseInt(e.target.value))}
>                         aria-label="Swims per week"
>                         aria-valuenow={swimsPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={3}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-accent-blue"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>1</span>
>                         <span>2</span>
>                         <span>3</span>
>                     </div>
>                 </div>
> 
>                 {/* Strength / Gym Per Week */}
>                 <div className="mb-6">
>                     <div className="flex justify-between mb-2">
>                         <label className="text-xs text-foreground-muted flex items-center gap-1">
>                             <Dumbbell className="w-4 h-4" /> Strength &amp; Gym / Week
>                         </label>
>                         <span className="text-workout-strength font-bold font-mono tabular-nums">{strengthPerWeek}</span>
>                     </div>
>                     <input
>                         type="range"
>                         min="0"
>                         max="4"
>                         value={strengthPerWeek}
>                         onChange={(e) => setStrengthPerWeek(parseInt(e.target.value))}
>                         aria-label="Strength sessions per week"
>                         aria-valuenow={strengthPerWeek}
>                         aria-valuemin={0}
>                         aria-valuemax={4}
>                         className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-workout-strength"
>                     />
>                     <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                         <span>0</span>
>                         <span>2</span>
>                         <span>4</span>
>                     </div>
>                 </div>
> 
>                 {/* Peak Mileage & Longest Long Run (only when runsPerWeek > 0) */}
>                 {runsPerWeek > 0 && (
>                     <>
>                         <div className="mb-4">
>                             <div className="flex justify-between mb-2">
>                                 <label className="text-xs text-foreground-muted flex items-center gap-1">
>                                     <Move className="w-3 h-3" /> Peak Mileage Goal
>                                 </label>
>                                 <span className="text-positive font-bold font-mono tabular-nums">{weeklyMileage} km</span>
>                             </div>
>                             <input
>                                 type="range"
>                                 min="20"
>                                 max="100"
>                                 step="5"
>                                 value={weeklyMileage}
>                                 onChange={(e) => setWeeklyMileage(parseInt(e.target.value))}
>                                 aria-label="Peak weekly mileage goal in kilometers"
>                                 aria-valuenow={weeklyMileage}
>                                 aria-valuemin={20}
>                                 aria-valuemax={100}
>                                 className="w-full h-2 bg-glass-border rounded-md appearance-none cursor-pointer accent-positive"
>                             />
>                             <div className="flex justify-between text-xs text-foreground-muted mt-1">
>                                 <span>20km</span>
>                                 <span>60km</span>
>                                 <span>100km</span>
>                             </div>
>                         </div>
> 
>                         <div className="mb-4">
>                             <div className="flex justify-between mb-2">
>                                 <label className="text-xs text-foreground-muted flex items-center gap-1">
>                                     <Move className="w-3 h-3" /> Longest Long Run
>                                 </label>
>                                 <span className="text-positive font-bold font-mono tabular-nums">{maxLongRunKm} km</span>
>                             </div>
>                             <input
>                                 type="number"
>                                 min="6"
>                                 max={maxLongRunKmCap}
>                                 value={maxLongRunKm}
>                                 onChange={(e) => {
>                                     const parsed = parseInt(e.target.value, 10);
>                                     if (Number.isNaN(parsed)) return;
>                                     setMaxLongRunKm(Math.max(6, Math.min(parsed, maxLongRunKmCap)));
>                                 }}
>                                 className="w-full bg-surface border border-glass-border rounded-md p-2.5 text-foreground text-sm focus:ring-2 focus:ring-positive outline-hidden"
>                             />
>                             <p className="text-xs text-foreground-muted mt-1">
>                                 Peak long run before taper. Default is calculated from your weekly distance goal.
>                             </p>
>                         </div>
>                     </>
>                 )}
> ```
>
> #### Edit 4.3: Preselect From All MyWhoosh Plans When `sport === 'CYCLING'` & Support Optional Runs/Swims/Gym in `Web/src/components/PlanSetupForm.tsx`
> Open `Web/src/components/PlanSetupForm.tsx` (lines 406–411, lines 515–537, lines 650–710, lines 776–826, lines 842–850, lines 920–930, and lines 1009–1122).
>
> First, in `Web/src/components/PlanSetupForm.tsx` (lines 406–411):
>
> **FIND:**
> ```tsx
>     const msPerWeek: number = 1000 * 60 * 60 * 24 * 7;
>     const computedPlanWeeks: number = sport === 'NO_RACE'
>         ? (parseInt(durationWeeks) || 12)
>         : Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / msPerWeek));
> ```
>
> **REPLACE WITH:**
> ```tsx
>     const msPerWeek: number = 1000 * 60 * 60 * 24 * 7;
>     const computedPlanWeeks: number = (sport === 'NO_RACE' || sport === 'CYCLING')
>         ? (parseInt(durationWeeks) || 8)
>         : Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / msPerWeek));
> ```
>
> Second, in `Web/src/components/PlanSetupForm.tsx` (lines 515–537):
>
> **FIND:**
> ```tsx
>     // Populate goal data for settings mode
>     useEffect(() => {
>         if (goalsData?.goals?.length > 0) {
>             const activeGoal = goalsData.goals.find((g: any) => g.isActive);
>             if (activeGoal) {
> 
>                 setGoalName(activeGoal.name || 'My Race');
>                 setRaceType(activeGoal.raceType || 'MARATHON');
>                 setSport(activeGoal.sport || (TRIATHLON_RACE_TYPES.has(activeGoal.raceType) ? 'TRIATHLON' : 'RUN'));
> ```
>
> **REPLACE WITH:**
> ```tsx
>     // Populate goal data for settings mode
>     useEffect(() => {
>         if (goalsData?.goals?.length > 0) {
>             const activeGoal = goalsData.goals.find((g: any) => g.isActive);
>             if (activeGoal) {
>                 const isCyclingGoal = !activeGoal.raceType && activeGoal.ridesPerWeek > 0 && activeGoal.runsPerWeek === 0;
>                 setGoalName(activeGoal.name || 'My Race');
>                 setRaceType(activeGoal.raceType || 'MARATHON');
>                 setSport(isCyclingGoal ? 'CYCLING' : (activeGoal.sport || (TRIATHLON_RACE_TYPES.has(activeGoal.raceType) ? 'TRIATHLON' : 'RUN')));
>                 if (activeGoal.planWeeks) {
>                     setDurationWeeks(String(activeGoal.planWeeks));
>                 }
> ```
>
> Third, in `Web/src/components/PlanSetupForm.tsx` (lines 650–710):
>
> **FIND:**
> ```tsx
>     // Onboarding mutation (create goal)
>     const createGoalMutation = useMutation({
>         mutationFn: async () => {
>             const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
> 
>             const isTriathlon = TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON';
>             const effectiveSport = sport === 'NO_RACE' ? 'NO_RACE' : (isTriathlon ? 'TRIATHLON' : 'RUN');
> 
>             let computedTargetTime: number | null = goalTimeSeconds;
>             if (isTriathlon) {
>                 computedTargetTime = triGoalTimeSeconds;
>             }
> 
>             if (!computedTargetTime && currentVdot > 0) {
>                 const raceDistanceMap: Record<string, RaceDistance> = {
>                     'FIVE_K': '5K',
>                     'TEN_K': '10K',
>                     'HALF_MARATHON': 'HALF',
>                     'MARATHON': 'MARATHON',
>                 };
>                 const mappedDistance = raceDistanceMap[raceType] || 'MARATHON';
>                 const calibratedVO2max = currentVdot * calibrationFactor;
>                 const planSettings: PlanSettings = {
>                     durationWeeks: computedPlanWeeks,
>                     runsPerWeek: runsPerWeek,
>                     weeklyMileageGoal: weeklyMileage,
>                     raceDistance: mappedDistance,
>                     taperWeeks: taperWeeks,
>                     peakWeeks: peakWeeks,
>                     buildWeeks: buildWeeks,
>                 };
>                 const projection = calculateProjectedGoalTime(calibratedVO2max, planSettings, shapePercent);
>                 computedTargetTime = projection.projectedTime;
>             }
> 
>             const body: Record<string, unknown> = {
>                 name: goalName,
>                 raceType: effectiveSport === 'NO_RACE' ? null : raceType,
>                 raceDate: effectiveSport === 'NO_RACE' ? null : new Date(raceDate).toISOString(),
>                 planStartDate: new Date(planStartDate).toISOString(),
>                 planWeeks: effectiveSport === 'NO_RACE'
>                     ? (parseInt(durationWeeks) || 12)
>                     : Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7))),
>                 runsPerWeek,
>                 ridesPerWeek,
>                 swimsPerWeek,
>                 strengthPerWeek,
>                 taperWeeks,
>                 peakWeeks,
>                 buildWeeks,
>                 weeklyMileageGoal: weeklyMileage * 1000,
>                 startWeeklyMileage: startWeeklyMileage > 0 ? startWeeklyMileage * 1000 : undefined,
>                 maxLongRunKm,
>                 longRunDay,
>                 workoutDay: qualityDay,
>                 swimDay,
>                 restDays,
>                 sport: effectiveSport,
>                 matchToMyWhoosh,
>                 mywhooshPlanId: matchToMyWhoosh && mywhooshPlanId ? mywhooshPlanId : undefined,
> ```
>
> **REPLACE WITH:**
> ```tsx
>     // Onboarding mutation (create goal)
>     const createGoalMutation = useMutation({
>         mutationFn: async () => {
>             const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
> 
>             const isCycling = sport === 'CYCLING';
>             const isTriathlon = TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON';
>             const effectiveSport = isCycling ? 'CYCLING' : sport === 'NO_RACE' ? 'NO_RACE' : (isTriathlon ? 'TRIATHLON' : 'RUN');
>             const isDurationBased = effectiveSport === 'NO_RACE' || effectiveSport === 'CYCLING';
> 
>             let computedTargetTime: number | null = goalTimeSeconds;
>             if (isTriathlon) {
>                 computedTargetTime = triGoalTimeSeconds;
>             } else if (isDurationBased) {
>                 computedTargetTime = null;
>             }
> 
>             if (!computedTargetTime && !isDurationBased && currentVdot > 0) {
>                 const raceDistanceMap: Record<string, RaceDistance> = {
>                     'FIVE_K': '5K',
>                     'TEN_K': '10K',
>                     'HALF_MARATHON': 'HALF',
>                     'MARATHON': 'MARATHON',
>                 };
>                 const mappedDistance = raceDistanceMap[raceType] || 'MARATHON';
>                 const calibratedVO2max = currentVdot * calibrationFactor;
>                 const planSettings: PlanSettings = {
>                     durationWeeks: computedPlanWeeks,
>                     runsPerWeek: Math.max(1, runsPerWeek),
>                     weeklyMileageGoal: weeklyMileage,
>                     raceDistance: mappedDistance,
>                     taperWeeks: taperWeeks,
>                     peakWeeks: peakWeeks,
>                     buildWeeks: buildWeeks,
>                 };
>                 const projection = calculateProjectedGoalTime(calibratedVO2max, planSettings, shapePercent);
>                 computedTargetTime = projection.projectedTime;
>             }
> 
>             const resolvedMyWhooshPlanId = (isCycling || matchToMyWhoosh)
>                 ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
>                 : undefined;
> 
>             const body: Record<string, unknown> = {
>                 name: goalName,
>                 raceType: isDurationBased ? null : raceType,
>                 raceDate: isDurationBased ? null : new Date(raceDate).toISOString(),
>                 planStartDate: new Date(planStartDate).toISOString(),
>                 planWeeks: isDurationBased
>                     ? (parseInt(durationWeeks) || 8)
>                     : Math.max(4, Math.floor((new Date(raceDate).getTime() - new Date(planStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7))),
>                 runsPerWeek,
>                 ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
>                 swimsPerWeek,
>                 strengthPerWeek,
>                 taperWeeks,
>                 peakWeeks,
>                 buildWeeks,
>                 weeklyMileageGoal: weeklyMileage * 1000,
>                 startWeeklyMileage: startWeeklyMileage > 0 ? startWeeklyMileage * 1000 : undefined,
>                 maxLongRunKm,
>                 longRunDay,
>                 workoutDay: qualityDay,
>                 swimDay,
>                 restDays,
>                 sport: effectiveSport,
>                 matchToMyWhoosh: isCycling ? true : matchToMyWhoosh,
>                 mywhooshPlanId: resolvedMyWhooshPlanId,
> ```
>
> Fourth, in `Web/src/components/PlanSetupForm.tsx` (lines 776–850 of the original file):
>
> **FIND:**
> ```tsx
>     // Settings mutation (update settings)
>     const updateSettingsMutation = useMutation({
>         mutationFn: async () => {
>             const timeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
> 
>             if (timeSeconds === 0) throw new Error('Time cannot be zero');
> 
>             const res = await fetch('/api/settings/update-vdot', {
>                 method: 'POST',
>                 body: JSON.stringify({
>                     timeSeconds,
>                     raceDistance: calibrationDistance,
>                     runsPerWeek,
>                     ridesPerWeek,
>                     swimsPerWeek,
>                     strengthPerWeek,
>                     weeklyMileageGoal: weeklyMileage * 1000,
>                     maxHeartRate,
>                     restingHeartRate,
>                     weight,
>                     hrZone1Max: zone1Max,
>                     hrZone2Max: zone2Max,
>                     hrZone3Max: zone3Max,
>                     hrZone4Max: zone4Max,
>                     hrZone5Max: zone5Max,
>                     hrZone6Max: zone6Max,
>                     thresholdHeartRate: parseInt(thresholdHR) || undefined,
>                     thresholdPace: thresholdPaceMin || thresholdPaceSec
>                         ? (parseInt(thresholdPaceMin) || 0) * 60 + (parseInt(thresholdPaceSec) || 0)
>                         : undefined,
>                     taperWeeks,
>                     peakWeeks,
>                     buildWeeks,
>                     maxLongRunKm,
>                     calibrationFactor,
>                     matchToMyWhoosh,
>                     mywhooshPlanId: matchToMyWhoosh && mywhooshPlanId ? mywhooshPlanId : undefined,
>                     raceType,
>                     raceDate,
>                     planStartDate,
>                     sport: TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport,
>                     longRunDay,
>                     qualityDay,
>                     restDays,
>                 }),
>                 headers: { 'Content-Type': 'application/json' }
>             });
> 
>             if (!res.ok) throw new Error('Failed to update');
>             return res.json();
>         },
>         onSuccess: (data) => {
>             setMessage(`VDOT updated to ${data.vdot.toFixed(1)}! Plan regenerated.`);
>             queryClient.invalidateQueries({ queryKey: ['goals'] });
>             queryClient.invalidateQueries({ queryKey: ['plan'] });
>             queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
>             setTimeout(() => {
>                 setMessage('');
>                 onSuccess?.();
>             }, 2000);
>         },
>         onError: () => {
>             setMessage('Error updating settings. Please try again.');
>         }
>     });
> 
>     const handleSubmit = () => {
>         const errors: Record<string, string> = {};
>         if (mode === 'onboarding' || mode === 'advanced' || mode === 'modal') {
>             if (!goalName.trim()) errors.goalName = "Goal name is required";
>             if (sport !== 'NO_RACE' && !raceDate) errors.raceDate = "Race date is required";
>             if (!planStartDate) errors.planStartDate = "Plan start date is required";
>         }
> ```
>
> **REPLACE WITH:**
> ```tsx
>     // Settings mutation (update settings)
>     const updateSettingsMutation = useMutation({
>         mutationFn: async () => {
>             const rawTimeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
>             const timeSeconds = rawTimeSeconds > 0 ? rawTimeSeconds : (sport === 'CYCLING' ? 1500 : 0);
> 
>             if (timeSeconds === 0) throw new Error('Time cannot be zero');
> 
>             const isCycling = sport === 'CYCLING';
>             const effectiveMyWhooshPlanId = (isCycling || matchToMyWhoosh)
>                 ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
>                 : undefined;
> 
>             const res = await fetch('/api/settings/update-vdot', {
>                 method: 'POST',
>                 body: JSON.stringify({
>                     timeSeconds,
>                     raceDistance: calibrationDistance,
>                     runsPerWeek,
>                     ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
>                     swimsPerWeek,
>                     strengthPerWeek,
>                     weeklyMileageGoal: weeklyMileage * 1000,
>                     maxHeartRate,
>                     restingHeartRate,
>                     weight,
>                     hrZone1Max: zone1Max,
>                     hrZone2Max: zone2Max,
>                     hrZone3Max: zone3Max,
>                     hrZone4Max: zone4Max,
>                     hrZone5Max: zone5Max,
>                     hrZone6Max: zone6Max,
>                     thresholdHeartRate: parseInt(thresholdHR) || undefined,
>                     thresholdPace: thresholdPaceMin || thresholdPaceSec
>                         ? (parseInt(thresholdPaceMin) || 0) * 60 + (parseInt(thresholdPaceSec) || 0)
>                         : undefined,
>                     taperWeeks,
>                     peakWeeks,
>                     buildWeeks,
>                     maxLongRunKm,
>                     calibrationFactor,
>                     matchToMyWhoosh: isCycling ? true : matchToMyWhoosh,
>                     mywhooshPlanId: effectiveMyWhooshPlanId,
>                     raceType: isCycling ? null : raceType,
>                     raceDate,
>                     planStartDate,
>                     sport: isCycling ? 'TRIATHLON' : (TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : sport),
>                     longRunDay,
>                     qualityDay,
>                     restDays,
>                 }),
>                 headers: { 'Content-Type': 'application/json' }
>             });
> 
>             if (!res.ok) throw new Error('Failed to update');
>             return res.json();
>         },
>         onSuccess: (data) => {
>             setMessage(`VDOT updated to ${data.vdot.toFixed(1)}! Plan regenerated.`);
>             queryClient.invalidateQueries({ queryKey: ['goals'] });
>             queryClient.invalidateQueries({ queryKey: ['plan'] });
>             queryClient.invalidateQueries({ queryKey: ['analytics-stats'] });
>             setTimeout(() => {
>                 setMessage('');
>                 onSuccess?.();
>             }, 2000);
>         },
>         onError: () => {
>             setMessage('Error updating settings. Please try again.');
>         }
>     });
> 
>     const handleSubmit = () => {
>         const errors: Record<string, string> = {};
>         if (mode === 'onboarding' || mode === 'advanced' || mode === 'modal') {
>             if (!goalName.trim()) errors.goalName = "Goal name is required";
>             if (sport !== 'NO_RACE' && sport !== 'CYCLING' && !raceDate) errors.raceDate = "Race date is required";
>             if (!planStartDate) errors.planStartDate = "Plan start date is required";
>         }
> ```
>
> Fifth, in `Web/src/components/PlanSetupForm.tsx` (lines 923–929 and lines 1009–1122 of the original file):
>
> **FIND:**
> ```tsx
>                 sport={sport}
>                 setSport={setSport}
>                 durationWeeks={durationWeeks}
>                 setDurationWeeks={setDurationWeeks}
>                 experienceLevel={experienceLevel}
>                 setExperienceLevel={adjustDefaultsForExperience}
>             />
> ```
>
> **REPLACE WITH:**
> ```tsx
>                 sport={sport}
>                 setSport={(nextSport: string) => {
>                     setSport(nextSport);
>                     if (nextSport === 'CYCLING') {
>                         setMatchToMyWhoosh(true);
>                         const defaultPlan = MYWHOOSH_PLANS.find((p) => p.id === mywhooshPlanId) || MYWHOOSH_PLANS[0];
>                         if (!mywhooshPlanId && defaultPlan) {
>                             setMywhooshPlanId(defaultPlan.id);
>                         }
>                         if (defaultPlan) {
>                             setDurationWeeks(String(defaultPlan.weeksCount));
>                             if (goalName === 'My First Race' || goalName === 'My Race') {
>                                 setGoalName(defaultPlan.name);
>                             }
>                         }
>                         setRunsPerWeek(0);
>                         setRidesPerWeek(4);
>                         setSwimsPerWeek(0);
>                         setStrengthPerWeek(1);
>                     } else if (nextSport === 'RUN' && runsPerWeek === 0) {
>                         setRunsPerWeek(4);
>                     }
>                 }}
>                 durationWeeks={durationWeeks}
>                 setDurationWeeks={setDurationWeeks}
>                 experienceLevel={experienceLevel}
>                 setExperienceLevel={adjustDefaultsForExperience}
>             />
> ```
>
> Sixth, in `Web/src/components/PlanSetupForm.tsx` (lines 1009–1122 of the original file):
>
> **FIND:**
> ```tsx
>             {!TRIATHLON_RACE_TYPES.has(raceType) && raceType !== 'BACKYARD_ULTRA' && !['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'].includes(raceType) && (
>                 <GoalTimeRenderer
>                     mode={mode}
>                     currentVdot={currentVdot}
>                     calibrationFactor={calibrationFactor}
>                     raceType={raceType}
>                     computedPlanWeeks={computedPlanWeeks}
>                     runsPerWeek={runsPerWeek}
>                     weeklyMileage={weeklyMileage}
>                     taperWeeks={taperWeeks}
>                     peakWeeks={peakWeeks}
>                     buildWeeks={buildWeeks}
>                     shapePercent={shapePercent}
>                     goalTimeSeconds={goalTimeSeconds}
>                     setGoalTimeSeconds={setGoalTimeSeconds}
>                     goalTimeHours={goalTimeHours}
>                     setGoalTimeHours={setGoalTimeHours}
>                     goalTimeMinutes={goalTimeMinutes}
>                     setGoalTimeMinutes={setGoalTimeMinutes}
>                     goalTimeSecs={goalTimeSecs}
>                     setGoalTimeSecs={setGoalTimeSecs}
>                     isEditingGoalTime={isEditingGoalTime}
>                     setIsEditingGoalTime={setIsEditingGoalTime}
>                     distanceOverrideM={ULTRA_DISTANCE_MAP[raceType]}
>                 />
>             )}
> 
>             <PlanVolumeSection
>                 runsPerWeek={runsPerWeek}
>                 setRunsPerWeek={setRunsPerWeek}
>                 ridesPerWeek={ridesPerWeek}
>                 setRidesPerWeek={setRidesPerWeek}
>                 swimsPerWeek={swimsPerWeek}
>                 setSwimsPerWeek={setSwimsPerWeek}
>                 strengthPerWeek={strengthPerWeek}
>                 setStrengthPerWeek={setStrengthPerWeek}
>                 weeklyMileage={weeklyMileage}
>                 setWeeklyMileage={(val: number) => {
>                     if (mode === 'settings' && settingsLoadedRef.current) {
>                         userChangedVolumeRef.current = true;
>                     }
>                     setWeeklyMileage(val);
>                 }}
>                 raceType={raceType}
>                 maxLongRunKm={maxLongRunKm}
>                 setMaxLongRunKm={(val: number) => {
>                     if (mode === 'settings' && settingsLoadedRef.current) {
>                         userChangedVolumeRef.current = true;
>                     }
>                     setMaxLongRunKm(val);
>                 }}
>                 taperWeeks={taperWeeks}
>                 setTaperWeeks={setTaperWeeks}
>                 peakWeeks={peakWeeks}
>                 setPeakWeeks={setPeakWeeks}
>                 buildWeeks={buildWeeks}
>                 setBuildWeeks={setBuildWeeks}
>                 showSchedulingSettings={showSchedulingSettings}
>                 setShowSchedulingSettings={setShowSchedulingSettings}
>                 longRunDay={longRunDay}
>                 setLongRunDay={setLongRunDay}
>                 qualityDay={qualityDay}
>                 setQualityDay={setQualityDay}
>                 swimDay={swimDay}
>                 setSwimDay={setSwimDay}
>                 restDays={restDays}
>                 setRestDays={setRestDays}
>                 computedPlanWeeks={computedPlanWeeks}
>             />
> 
>             {/* MyWhoosh (visible when cycling rides or triathlon are part of the plan) */}
>             {(ridesPerWeek > 0 || TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON') && (
>                 <div className="border-t border-glass-border pt-6 space-y-3">
>                     <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-glass-border">
>                         <div className="pr-3">
>                             <p className="text-sm text-foreground">Match Cycling Workouts to MyWhoosh</p>
>                             <p className="text-xs text-foreground-muted">Populate planned rides with official MyWhoosh workout steps (%FTP, intervals, cadence) and enable .zwo export</p>
>                         </div>
>                         <button
>                             type="button"
>                             onClick={() => setMatchToMyWhoosh(!matchToMyWhoosh)}
>                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${matchToMyWhoosh ? 'bg-accent-cyan' : 'bg-glass-border'}`}
>                         >
>                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${matchToMyWhoosh ? 'translate-x-6' : 'translate-x-1'}`} />
>                         </button>
>                     </div>
> 
>                     {matchToMyWhoosh && (
>                         <div className="p-3 rounded-md bg-surface border border-glass-border space-y-2">
>                             <label className="block text-xs font-semibold text-accent-cyan">
>                                 MyWhoosh Training Plan / Workout Selector
>                             </label>
>                             <select
>                                 value={mywhooshPlanId}
>                                 onChange={(e) => setMywhooshPlanId(e.target.value)}
>                                 className="bg-background-secondary border border-glass-border rounded-md p-2.5 text-xs text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-cyan"
>                             >
>                                 <option value="">Auto-Match Closest MyWhoosh Workout by Phase & Duration</option>
>                                 {MYWHOOSH_PLANS.map((plan) => (
>                                     <option key={plan.id} value={plan.id}>
>                                         {plan.name} ({plan.category} · {plan.level} · {plan.weeksCount}w)
>                                     </option>
>                                 ))}
>                             </select>
>                             {mywhooshPlanId && (
>                                 <p className="text-[11px] text-foreground-muted">
>                                     {MYWHOOSH_PLANS.find((p) => p.id === mywhooshPlanId)?.description}
>                                 </p>
>                             )}
>                         </div>
>                     )}
>                 </div>
>             )}
> ```
>
> **REPLACE WITH:**
> ```tsx
>             {sport !== 'CYCLING' && runsPerWeek > 0 && !TRIATHLON_RACE_TYPES.has(raceType) && raceType !== 'BACKYARD_ULTRA' && !['TWELVE_HOUR', 'TWENTY_FOUR_HOUR'].includes(raceType) && (
>                 <GoalTimeRenderer
>                     mode={mode}
>                     currentVdot={currentVdot}
>                     calibrationFactor={calibrationFactor}
>                     raceType={raceType}
>                     computedPlanWeeks={computedPlanWeeks}
>                     runsPerWeek={runsPerWeek}
>                     weeklyMileage={weeklyMileage}
>                     taperWeeks={taperWeeks}
>                     peakWeeks={peakWeeks}
>                     buildWeeks={buildWeeks}
>                     shapePercent={shapePercent}
>                     goalTimeSeconds={goalTimeSeconds}
>                     setGoalTimeSeconds={setGoalTimeSeconds}
>                     goalTimeHours={goalTimeHours}
>                     setGoalTimeHours={setGoalTimeHours}
>                     goalTimeMinutes={goalTimeMinutes}
>                     setGoalTimeMinutes={setGoalTimeMinutes}
>                     goalTimeSecs={goalTimeSecs}
>                     setGoalTimeSecs={setGoalTimeSecs}
>                     isEditingGoalTime={isEditingGoalTime}
>                     setIsEditingGoalTime={setIsEditingGoalTime}
>                     distanceOverrideM={ULTRA_DISTANCE_MAP[raceType]}
>                 />
>             )}
> 
>             {/* MyWhoosh Training Plan Selector (always visible and preselected when sport === 'CYCLING') */}
>             {(sport === 'CYCLING' || ridesPerWeek > 0 || TRIATHLON_RACE_TYPES.has(raceType) || sport === 'TRIATHLON') && (
>                 <div className="border-t border-glass-border pt-6 space-y-3">
>                     {sport !== 'CYCLING' && (
>                         <div className="flex items-center justify-between p-3 rounded-md bg-surface border border-glass-border">
>                             <div className="pr-3">
>                                 <p className="text-sm text-foreground">Match Cycling Workouts to MyWhoosh</p>
>                                 <p className="text-xs text-foreground-muted">Populate planned rides with official MyWhoosh workout steps (%FTP, intervals, cadence) and enable .zwo export</p>
>                             </div>
>                             <button
>                                 type="button"
>                                 onClick={() => setMatchToMyWhoosh(!matchToMyWhoosh)}
>                                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${matchToMyWhoosh ? 'bg-accent-cyan' : 'bg-glass-border'}`}
>                             >
>                                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${matchToMyWhoosh ? 'translate-x-6' : 'translate-x-1'}`} />
>                             </button>
>                         </div>
>                     )}
> 
>                     {(sport === 'CYCLING' || matchToMyWhoosh) && (
>                         <div className="p-3.5 rounded-md bg-surface border border-accent-cyan/40 space-y-2">
>                             <label className="block text-xs font-semibold text-accent-cyan">
>                                 {sport === 'CYCLING' ? 'Select MyWhoosh Cycling Training Plan' : 'MyWhoosh Training Plan / Workout Selector'}
>                             </label>
>                             <select
>                                 value={mywhooshPlanId || (sport === 'CYCLING' ? (MYWHOOSH_PLANS[0]?.id ?? '') : '')}
>                                 onChange={(e) => {
>                                     const val = e.target.value;
>                                     setMywhooshPlanId(val);
>                                     const selectedPlan = MYWHOOSH_PLANS.find((p) => p.id === val);
>                                     if (sport === 'CYCLING' && selectedPlan) {
>                                         setDurationWeeks(String(selectedPlan.weeksCount));
>                                         if (
>                                             goalName === 'My First Race' ||
>                                             goalName === 'My Race' ||
>                                             MYWHOOSH_PLANS.some((p) => p.name === goalName)
>                                         ) {
>                                             setGoalName(selectedPlan.name);
>                                         }
>                                     }
>                                 }}
>                                 className="bg-background-secondary border border-glass-border rounded-md p-2.5 text-xs text-foreground w-full outline-hidden focus:ring-2 focus:ring-accent-cyan"
>                             >
>                                 {sport !== 'CYCLING' && (
>                                     <option value="">Auto-Match Closest MyWhoosh Workout by Phase &amp; Duration</option>
>                                 )}
>                                 {MYWHOOSH_PLANS.map((plan) => (
>                                     <option key={plan.id} value={plan.id}>
>                                         {plan.name} ({plan.category} · {plan.level} · {plan.weeksCount}w)
>                                     </option>
>                                 ))}
>                             </select>
>                             {(mywhooshPlanId || sport === 'CYCLING') && (
>                                 <p className="text-[11px] text-foreground-muted">
>                                     {MYWHOOSH_PLANS.find((p) => p.id === (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id))?.description}
>                                 </p>
>                             )}
>                             {sport === 'CYCLING' && (
>                                 <p className="text-[11px] text-accent-cyan">
>                                     Pure cycling plan preselected from MyWhoosh. Use the sliders below to add optional Runs, Swims, or Strength/Gym sessions per week.
>                                 </p>
>                             )}
>                         </div>
>                     )}
>                 </div>
>             )}
> 
>             <PlanVolumeSection
>                 runsPerWeek={runsPerWeek}
>                 setRunsPerWeek={setRunsPerWeek}
>                 ridesPerWeek={ridesPerWeek}
>                 setRidesPerWeek={setRidesPerWeek}
>                 swimsPerWeek={swimsPerWeek}
>                 setSwimsPerWeek={setSwimsPerWeek}
>                 strengthPerWeek={strengthPerWeek}
>                 setStrengthPerWeek={setStrengthPerWeek}
>                 weeklyMileage={weeklyMileage}
>                 setWeeklyMileage={(val: number) => {
>                     if (mode === 'settings' && settingsLoadedRef.current) {
>                         userChangedVolumeRef.current = true;
>                     }
>                     setWeeklyMileage(val);
>                 }}
>                 raceType={raceType}
>                 maxLongRunKm={maxLongRunKm}
>                 setMaxLongRunKm={(val: number) => {
>                     if (mode === 'settings' && settingsLoadedRef.current) {
>                         userChangedVolumeRef.current = true;
>                     }
>                     setMaxLongRunKm(val);
>                 }}
>                 taperWeeks={taperWeeks}
>                 setTaperWeeks={setTaperWeeks}
>                 peakWeeks={peakWeeks}
>                 setPeakWeeks={setPeakWeeks}
>                 buildWeeks={buildWeeks}
>                 setBuildWeeks={setBuildWeeks}
>                 showSchedulingSettings={showSchedulingSettings}
>                 setShowSchedulingSettings={setShowSchedulingSettings}
>                 longRunDay={longRunDay}
>                 setLongRunDay={setLongRunDay}
>                 qualityDay={qualityDay}
>                 setQualityDay={setQualityDay}
>                 swimDay={swimDay}
>                 setSwimDay={setSwimDay}
>                 restDays={restDays}
>                 setRestDays={setRestDays}
>                 computedPlanWeeks={computedPlanWeeks}
>             />
> ```
>
> #### Edit 4.4: Add `Cycling (MyWhoosh)` Primary Sport & Unlock `0` Runs/Week in `Web/src/components/PlanEditor/EngineGenerateModal.tsx`
> Open `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (lines 49–153 and lines 221–471).
>
> First, in `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (lines 49–153):
>
> **FIND:**
> ```tsx
>     const [sport, setSport] = useState<'RUN' | 'TRIATHLON'>(
>         initialSport === 'TRIATHLON' ? 'TRIATHLON' : 'RUN'
>     );
>     const [raceType, setRaceType] = useState(initialRaceType || 'MARATHON');
>     const [raceDate, setRaceDate] = useState(
>         initialRaceDate
>             ? new Date(initialRaceDate).toISOString().split('T')[0]
>             : new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
>     );
>     const [currentVdot, setCurrentVdot] = useState(initialVdot || 45);
>     const [ftpWatts, setFtpWatts] = useState(220);
>     const [swimCssSecPer100m, setSwimCssSecPer100m] = useState(115); // 1:55 / 100m
>     const [runsPerWeek, setRunsPerWeek] = useState(4);
>     const [ridesPerWeek, setRidesPerWeek] = useState(sport === 'TRIATHLON' ? 3 : 0);
>     const [swimsPerWeek, setSwimsPerWeek] = useState(sport === 'TRIATHLON' ? 2 : 0);
>     const [strengthPerWeek, setStrengthPerWeek] = useState(1);
>     const [weeklyMileageGoal, setWeeklyMileageGoal] = useState(50);
> 
>     // Phase weeks
>     const [buildWeeks, setBuildWeeks] = useState(4);
>     const [peakWeeks, setPeakWeeks] = useState(3);
>     const [taperWeeks, setTaperWeeks] = useState(3);
> 
>     // MyWhoosh
>     const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(true);
>     const [mywhooshPlanId, setMywhooshPlanId] = useState<string>('mw-plan-triathlon-base');
> 
>     const [isGenerating, setIsGenerating] = useState(false);
>     const [error, setError] = useState<string | null>(null);
> 
>     if (!isOpen) return null;
> 
>     const handleSportChange = (s: 'RUN' | 'TRIATHLON') => {
>         setSport(s);
>         if (s === 'TRIATHLON') {
>             if (!raceType.includes('TRI') && !raceType.includes('IRONMAN')) {
>                 setRaceType('HALF_IRONMAN');
>             }
>             if (ridesPerWeek === 0) setRidesPerWeek(3);
>             if (swimsPerWeek === 0) setSwimsPerWeek(2);
>         } else {
>             if (raceType.includes('TRI') || raceType.includes('IRONMAN')) {
>                 setRaceType('MARATHON');
>             }
>         }
>     };
> 
>     const handleGenerate = async () => {
>         setIsGenerating(true);
>         setError(null);
>         try {
>             if (goalId) {
>                 // 1. Snapshot first
>                 await fetch(`/api/plan-advanced/${goalId}/snapshot`, {
>                     method: 'POST',
>                     headers: { 'Content-Type': 'application/json' },
>                     body: JSON.stringify({
>                         description: 'Auto-snapshot before Engine generation',
>                         operation: 'engine_generate',
>                     }),
>                 });
> 
>                 // 2. Call regenerate
>                 const res = await fetch(`/api/plan-advanced/${goalId}/regenerate`, {
>                     method: 'POST',
>                     headers: { 'Content-Type': 'application/json' },
>                     body: JSON.stringify({
>                         sport,
>                         raceType,
>                         raceDate,
>                         currentVdot,
>                         ftpWatts,
>                         swimCssSecPer100m,
>                         runsPerWeek,
>                         ridesPerWeek,
>                         swimsPerWeek,
>                         strengthPerWeek,
>                         weeklyMileageGoal,
>                         buildWeeks,
>                         peakWeeks,
>                         taperWeeks,
>                         matchToMyWhoosh,
>                         mywhooshPlanId: matchToMyWhoosh ? mywhooshPlanId : null,
>                     }),
>                 });
> 
>                 if (!res.ok) {
>                     const data = await res.json().catch(() => ({}));
>                     throw new Error(data.error || 'Failed to generate plan');
>                 }
> 
>                 toast.success('Plan adapted and phases regenerated with web engine');
>             } else {
>                 // Create brand new plan via /api/plans
>                 const res = await fetch('/api/plans', {
>                     method: 'POST',
>                     headers: { 'Content-Type': 'application/json' },
>                     body: JSON.stringify({
>                         name: `${raceType.replace(/_/g, ' ')} Plan`,
>                         sport,
>                         raceType,
>                         raceDate: new Date(raceDate).toISOString(),
> ```
>
> **REPLACE WITH:**
> ```tsx
>     const [sport, setSport] = useState<'RUN' | 'CYCLING' | 'TRIATHLON'>(
>         initialSport === 'TRIATHLON' ? 'TRIATHLON' : initialSport === 'CYCLING' ? 'CYCLING' : 'RUN'
>     );
>     const [raceType, setRaceType] = useState(initialRaceType || 'MARATHON');
>     const [raceDate, setRaceDate] = useState(
>         initialRaceDate
>             ? new Date(initialRaceDate).toISOString().split('T')[0]
>             : new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
>     );
>     const [currentVdot, setCurrentVdot] = useState(initialVdot || 45);
>     const [ftpWatts, setFtpWatts] = useState(220);
>     const [swimCssSecPer100m, setSwimCssSecPer100m] = useState(115); // 1:55 / 100m
>     const [runsPerWeek, setRunsPerWeek] = useState(initialSport === 'CYCLING' ? 0 : 4);
>     const [ridesPerWeek, setRidesPerWeek] = useState(sport === 'TRIATHLON' ? 3 : sport === 'CYCLING' ? 4 : 0);
>     const [swimsPerWeek, setSwimsPerWeek] = useState(sport === 'TRIATHLON' ? 2 : 0);
>     const [strengthPerWeek, setStrengthPerWeek] = useState(1);
>     const [weeklyMileageGoal, setWeeklyMileageGoal] = useState(50);
> 
>     // Phase weeks
>     const [buildWeeks, setBuildWeeks] = useState(4);
>     const [peakWeeks, setPeakWeeks] = useState(3);
>     const [taperWeeks, setTaperWeeks] = useState(3);
> 
>     // MyWhoosh
>     const [matchToMyWhoosh, setMatchToMyWhoosh] = useState(true);
>     const [mywhooshPlanId, setMywhooshPlanId] = useState<string>('mw-plan-ftp-builder');
> 
>     const [isGenerating, setIsGenerating] = useState(false);
>     const [error, setError] = useState<string | null>(null);
> 
>     if (!isOpen) return null;
> 
>     const handleSportChange = (s: 'RUN' | 'CYCLING' | 'TRIATHLON') => {
>         setSport(s);
>         if (s === 'CYCLING') {
>             setMatchToMyWhoosh(true);
>             if (!mywhooshPlanId) setMywhooshPlanId(MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder');
>             setRunsPerWeek(0);
>             setRidesPerWeek(4);
>             setSwimsPerWeek(0);
>             setStrengthPerWeek(1);
>         } else if (s === 'TRIATHLON') {
>             if (!raceType.includes('TRI') && !raceType.includes('IRONMAN')) {
>                 setRaceType('HALF_IRONMAN');
>             }
>             if (runsPerWeek === 0) setRunsPerWeek(3);
>             if (ridesPerWeek === 0) setRidesPerWeek(3);
>             if (swimsPerWeek === 0) setSwimsPerWeek(2);
>         } else {
>             if (raceType.includes('TRI') || raceType.includes('IRONMAN')) {
>                 setRaceType('MARATHON');
>             }
>             if (runsPerWeek === 0) setRunsPerWeek(4);
>         }
>     };
> 
>     const handleGenerate = async () => {
>         setIsGenerating(true);
>         setError(null);
>         const isCycling = sport === 'CYCLING';
>         const effectiveMyWhooshPlanId = (isCycling || matchToMyWhoosh)
>             ? (mywhooshPlanId || MYWHOOSH_PLANS[0]?.id || 'mw-plan-ftp-builder')
>             : null;
>         const selectedMwPlan = MYWHOOSH_PLANS.find((p) => p.id === effectiveMyWhooshPlanId);
> 
>         try {
>             if (goalId) {
>                 // 1. Snapshot first
>                 await fetch(`/api/plan-advanced/${goalId}/snapshot`, {
>                     method: 'POST',
>                     headers: { 'Content-Type': 'application/json' },
>                     body: JSON.stringify({
>                         description: 'Auto-snapshot before Engine generation',
>                         operation: 'engine_generate',
>                     }),
>                 });
> 
>                 // 2. Call regenerate
>                 const res = await fetch(`/api/plan-advanced/${goalId}/regenerate`, {
>                     method: 'POST',
>                     headers: { 'Content-Type': 'application/json' },
>                     body: JSON.stringify({
>                         sport: isCycling ? 'TRIATHLON' : sport,
>                         raceType: isCycling ? 'OLYMPIC_TRI' : raceType,
>                         raceDate,
>                         currentVdot,
>                         ftpWatts,
>                         swimCssSecPer100m,
>                         runsPerWeek,
>                         ridesPerWeek: isCycling ? Math.max(1, ridesPerWeek) : ridesPerWeek,
>                         swimsPerWeek,
>                         strengthPerWeek,
>                         weeklyMileageGoal,
>                         buildWeeks,
>                         peakWeeks,
>                         taperWeeks,
>                         matchToMyWhoosh: isCycling ? true : matchToMyWhoosh,
>                         mywhooshPlanId: effectiveMyWhooshPlanId,
>                     }),
>                 });
> 
>                 if (!res.ok) {
>                     const data = await res.json().catch(() => ({}));
>                     throw new Error(data.error || 'Failed to generate plan');
>                 }
> 
>                 toast.success('Plan adapted and phases regenerated with web engine');
>             } else {
>                 // Create brand new plan via /api/plans
>                 const res = await fetch('/api/plans', {
>                     method: 'POST',
>                     headers: { 'Content-Type': 'application/json' },
>                     body: JSON.stringify({
>                         name: isCycling
>                             ? (selectedMwPlan?.name || 'MyWhoosh Cycling Plan')
>                             : `${raceType.replace(/_/g, ' ')} Plan`,
>                         sport: isCycling ? 'CYCLING' : sport,
>                         raceType: isCycling ? null : raceType,
>                         raceDate: isCycling ? null : new Date(raceDate).toISOString(),
>                         durationWeeks: isCycling ? (selectedMwPlan?.weeksCount || 8) : undefined,
> ```
>
> Second, in `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (lines 221–471 of the original file):
>
> **FIND:**
> ```tsx
>                     {/* Sport Selection */}
>                     <div>
>                         <label className="block text-[11px] font-semibold text-foreground mb-1.5 uppercase tracking-wider">
>                             Primary Sport
>                         </label>
>                         <div className="grid grid-cols-2 gap-2">
>                             <button
>                                 type="button"
>                                 onClick={() => handleSportChange('RUN')}
>                                 className={`py-2 px-3 rounded-md border text-xs font-medium transition-all ${
>                                     sport === 'RUN'
>                                         ? 'bg-accent-blue/15 border-accent-blue text-accent-blue font-semibold'
>                                         : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
>                                 }`}
>                             >
>                                 Running (Road / Trail / Ultra)
>                             </button>
>                             <button
>                                 type="button"
>                                 onClick={() => handleSportChange('TRIATHLON')}
>                                 className={`py-2 px-3 rounded-md border text-xs font-medium transition-all ${
>                                     sport === 'TRIATHLON'
>                                         ? 'bg-workout-tempo/15 border-workout-tempo text-workout-tempo font-semibold'
>                                         : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
>                                 }`}
>                             >
>                                 Triathlon (Swim / Bike / Run)
>                             </button>
>                         </div>
>                     </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
>                     {/* Sport Selection */}
>                     <div>
>                         <label className="block text-[11px] font-semibold text-foreground mb-1.5 uppercase tracking-wider">
>                             Primary Sport
>                         </label>
>                         <div className="grid grid-cols-3 gap-2">
>                             <button
>                                 type="button"
>                                 onClick={() => handleSportChange('RUN')}
>                                 className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-all ${
>                                     sport === 'RUN'
>                                         ? 'bg-accent-blue/15 border-accent-blue text-accent-blue font-semibold'
>                                         : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
>                                 }`}
>                             >
>                                 Running
>                             </button>
>                             <button
>                                 type="button"
>                                 onClick={() => handleSportChange('CYCLING')}
>                                 className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-all ${
>                                     sport === 'CYCLING'
>                                         ? 'bg-accent-cyan/15 border-accent-cyan text-accent-cyan font-semibold'
>                                         : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
>                                 }`}
>                             >
>                                 Cycling (MyWhoosh)
>                             </button>
>                             <button
>                                 type="button"
>                                 onClick={() => handleSportChange('TRIATHLON')}
>                                 className={`py-2 px-2.5 rounded-md border text-xs font-medium transition-all ${
>                                     sport === 'TRIATHLON'
>                                         ? 'bg-workout-tempo/15 border-workout-tempo text-workout-tempo font-semibold'
>                                         : 'bg-background-tertiary border-glass-border text-foreground-secondary hover:text-foreground'
>                                 }`}
>                             >
>                                 Triathlon
>                             </button>
>                         </div>
>                     </div>
> ```
>
> Third, in `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (lines 330–375 and lines 425–471 of the original file):
>
> **FIND:**
> ```tsx
>                     {/* Weekly Frequency */}
>                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
>                         <div>
>                             <label className="block text-[10px] text-foreground-muted mb-1">Runs / week</label>
>                             <input
>                                 type="number"
>                                 min={1}
>                                 max={7}
>                                 value={runsPerWeek}
>                                 onChange={(e) => setRunsPerWeek(parseInt(e.target.value, 10) || 3)}
>                                 className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
>                             />
>                         </div>
> ```
>
> **REPLACE WITH:**
> ```tsx
>                     {/* Weekly Frequency */}
>                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
>                         <div>
>                             <label className="block text-[10px] text-foreground-muted mb-1">Runs / week</label>
>                             <input
>                                 type="number"
>                                 min={0}
>                                 max={7}
>                                 value={runsPerWeek}
>                                 onChange={(e) => {
>                                     const parsed = parseInt(e.target.value, 10);
>                                     setRunsPerWeek(Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(7, parsed)));
>                                 }}
>                                 className="w-full bg-background-tertiary border border-glass-border rounded px-2 py-1 font-mono text-xs text-foreground focus:outline-none"
>                             />
>                         </div>
> ```
>
> Fourth, in `Web/src/components/PlanEditor/EngineGenerateModal.tsx` (lines 425–471 of the original file):
>
> **FIND:**
> ```tsx
>                     {/* MyWhoosh Training Plan Selector */}
>                     {(sport === 'TRIATHLON' || ridesPerWeek > 0) && (
>                         <div className="p-3 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2">
> ```
>
> **REPLACE WITH:**
> ```tsx
>                     {/* MyWhoosh Training Plan Selector */}
>                     {(sport === 'CYCLING' || sport === 'TRIATHLON' || ridesPerWeek > 0) && (
>                         <div className="p-3 bg-background-tertiary/30 rounded-md border border-glass-border space-y-2">
> ```
>
> #### Edit 4.5: Route `raceType === null` (Including `CYCLING` Plans) Before `TRIATHLON` in `Web/src/lib/plans/index.ts`
> Open `Web/src/lib/plans/index.ts` (lines 386–395).
>
> **FIND:**
> ```ts
>     if (config.sport === 'TRIATHLON' || (config.raceType && TRIATHLON_RACE_TYPES.includes(config.raceType))) {
>         return enrichTargets(generateTriathlonPlan({ ...config, raceType: config.raceType as RaceType }));
>     }
> 
>     if (config.raceType === null) {
>         return enrichTargets(generateNoRacePlan(config));
>     }
> ```
>
> **REPLACE WITH:**
> ```ts
>     if (config.raceType === null) {
>         return enrichTargets(generateNoRacePlan(config));
>     }
> 
>     if (config.sport === 'TRIATHLON' || (config.raceType && TRIATHLON_RACE_TYPES.includes(config.raceType))) {
>         return enrichTargets(generateTriathlonPlan({ ...config, raceType: config.raceType as RaceType }));
>     }
> ```
>
> #### Edit 4.6: Support `runsPerWeek = 0` & MyWhoosh Plan Workout Matching in `Web/src/lib/plans/generators/no-race.ts`
> Open `Web/src/lib/plans/generators/no-race.ts` (lines 1–21, lines 120–124, lines 198–215, and lines 317–426).
>
> First, in `Web/src/lib/plans/generators/no-race.ts` (lines 1–21):
>
> **FIND:**
> ```ts
> import { WorkoutType, PlanPhase } from '@/generated/prisma/browser';
> import { calculateTrainingPaces } from '@/lib/metrics/vdot';
> import { PlanConfig, GeneratedWorkout, PLAN_CONSTANTS, getMinStartVolume } from '../index';
> import { fixBackToBackSameType } from '../schedule-utils';
> import { enrichWorkoutsWithDescriptions } from '../descriptions';
> 
> type NoRacePhase = 'BASE' | 'BUILD' | 'MAINTAIN';
> 
> type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };
> 
> export function generateNoRacePlan(config: PlanConfig): GeneratedWorkout[] {
>     const { vdot } = config;
>     const requestedStartDate = config.startDate || new Date();
>     const startDate = requestedStartDate;
>     const runsPerWeek = Math.max(1, config.runsPerWeek ?? 4);
> ```
>
> **REPLACE WITH:**
> ```ts
> import { WorkoutType, PlanPhase } from '@/generated/prisma/browser';
> import { calculateTrainingPaces } from '@/lib/metrics/vdot';
> import { PlanConfig, GeneratedWorkout, PLAN_CONSTANTS, getMinStartVolume } from '../index';
> import { fixBackToBackSameType } from '../schedule-utils';
> import { enrichWorkoutsWithDescriptions } from '../descriptions';
> import { estimateBikeFtpFromVdot } from '../bike-zones';
> import { findClosestMyWhooshWorkout, mywhooshWorkoutToStructuredV2 } from '../mywhooshMatcher';
> 
> type NoRacePhase = 'BASE' | 'BUILD' | 'MAINTAIN';
> 
> type ScheduledWorkout = Omit<GeneratedWorkout, 'date'> & { dayOffset: number };
> 
> export function generateNoRacePlan(config: PlanConfig): GeneratedWorkout[] {
>     const { vdot } = config;
>     const requestedStartDate = config.startDate || new Date();
>     const startDate = requestedStartDate;
>     const runsPerWeek = Math.max(0, config.runsPerWeek ?? 4);
> ```
>
> Second, in `Web/src/lib/plans/generators/no-race.ts` (lines 120–124):
>
> **FIND:**
> ```ts
>     const result = fixBackToBackSameType(workouts, { restDays: config.restDays });
>     enrichWorkoutsWithDescriptions(result);
>     return result;
> }
> ```
>
> **REPLACE WITH:**
> ```ts
>     const result = fixBackToBackSameType(workouts, { restDays: config.restDays });
>     enrichWorkoutsWithDescriptions(result);
> 
>     if (config.matchToMyWhoosh || config.mywhooshPlanId) {
>         const bikeFtp = config.ftpWatts && config.ftpWatts > 0 ? config.ftpWatts : estimateBikeFtpFromVdot(vdot);
>         let rideCounter = 0;
>         for (const w of result) {
>             if (
>                 w.type === WorkoutType.RIDE ||
>                 w.type === WorkoutType.LONG_RIDE ||
>                 w.type === WorkoutType.RIDE_INTERVALS
>             ) {
>                 const match = findClosestMyWhooshWorkout({
>                     workoutType: w.type,
>                     targetDurationSeconds: w.targetDuration || 3600,
>                     description: w.description,
>                     phase: w.phase,
>                     mywhooshPlanId: config.mywhooshPlanId,
>                     rideIndexInWeek: rideCounter % Math.max(1, ridesPerWeek),
>                 });
>                 rideCounter++;
>                 if (match) {
>                     w.displayDescription = `MyWhoosh: ${match.name}`;
>                     w.description = `${w.description} | MyWhoosh: ${match.name} (${Math.round(match.durationSeconds / 60)}m · TSS ${match.tss} · ${match.stepsSummary})`;
>                     w.targetDuration = match.durationSeconds;
>                     w.plannedTss = match.tss;
>                     w.targetFtpPercent = Math.round(match.intensityFactor * 100);
>                     w.targetPowerWatts = Math.round(bikeFtp * match.intensityFactor);
>                     w.structuredSteps = mywhooshWorkoutToStructuredV2(match, bikeFtp);
>                 }
>             }
>         }
>     }
> 
>     return result;
> }
> ```
>
> Third, in `Web/src/lib/plans/generators/no-race.ts` (lines 198–215 of the original file):
>
> **FIND:**
> ```ts
>     const longRunDay = getAvailableDay(preferredLongRunDay, []);
>     usedDays.add(longRunDay);
>     hardSessionDays.push(longRunDay);
> 
>     workouts.push({
>         dayOffset: longRunDay,
>         type: WorkoutType.LONG_RUN,
>         description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
>         totalDistance: longRunDist,
>         targetPace: easyPace,
>         targetDuration: 0,
>     });
> ```
>
> **REPLACE WITH:**
> ```ts
>     if (runsPerWeek >= 1) {
>         const longRunDay = getAvailableDay(preferredLongRunDay, []);
>         usedDays.add(longRunDay);
>         hardSessionDays.push(longRunDay);
> 
>         workouts.push({
>             dayOffset: longRunDay,
>             type: WorkoutType.LONG_RUN,
>             description: `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`,
>             totalDistance: longRunDist,
>             targetPace: easyPace,
>             targetDuration: 0,
>         });
>     }
> ```
>
> Fourth, in `Web/src/lib/plans/generators/no-race.ts` (lines 317–426 of the original file):
>
> **FIND:**
> ```ts
>     const qualityDistance = workouts
>         .filter(w => w.type !== WorkoutType.LONG_RUN && isRunType(w.type))
>         .reduce((sum, w) => sum + w.totalDistance, 0);
>     const keyRunCount = hasQuality ? 2 : 1;
>     const easyRunsCount = Math.max(0, runsPerWeek - keyRunCount);
>     const remainingVol = Math.max(0, weeklyVolume - longRunDist - qualityDistance);
>     const easyDist = easyRunsCount > 0
>         ? Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.min(PLAN_CONSTANTS.EASY_RUN_MAX, Math.round(remainingVol / easyRunsCount / 100) * 100))
>         : 0;
> 
>     for (let i = 0; i < easyRunsCount; i++) {
>         const day = getAvailableDay((preferredLongRunDay + 2 + i * 2) % 7, hardSessionDays);
>         if (usedDays.has(day)) break;
>         usedDays.add(day);
> 
>         const dayAfterHard = hardSessionDays.some(hd => {
>             const diff = (day - hd + 7) % 7;
>             return diff === 1;
>         });
> 
>         if (dayAfterHard) {
>             workouts.push({
>                 dayOffset: day,
>                 type: WorkoutType.RECOVERY,
>                 description: `Recovery: ${(easyDist / 1000).toFixed(1)}km`,
>                 totalDistance: easyDist,
>                 targetPace: recoveryPace,
>                 targetDuration: 0,
>             });
>         } else {
>             workouts.push({
>                 dayOffset: day,
>                 type: WorkoutType.EASY,
>                 description: `Easy: ${(easyDist / 1000).toFixed(1)}km`,
>                 totalDistance: easyDist,
>                 targetPace: easyPace,
>                 targetDuration: 0,
>             });
>         }
>     }
> 
>     let remainingRides = ridesPerWeek;
>     let remainingSwims = swimsPerWeek;
> 
>     if (preferredSwimDay !== undefined && remainingSwims > 0 && !usedDays.has(preferredSwimDay)) {
>         usedDays.add(preferredSwimDay);
>         remainingSwims--;
>         workouts.push({
>             dayOffset: preferredSwimDay,
>             type: WorkoutType.SWIM,
>             description: 'Swim: 1500m @ Easy',
>             totalDistance: 1500,
>             targetPace: 120,
>             targetDuration: 2700,
>         });
>     }
> 
>     const totalCardio = remainingRides + remainingSwims;
>     const freeDaysForCT: number[] = [];
>     for (let d = 0; d < 7; d++) {
>         if (!usedDays.has(d)) freeDaysForCT.push(d);
>     }
> 
>     for (const d of freeDaysForCT) {
>         if (remainingRides <= 0 && remainingSwims <= 0) break;
>         usedDays.add(d);
>         if (remainingRides > 0) {
>             remainingRides--;
>             workouts.push({
>                 dayOffset: d,
>                 type: WorkoutType.RIDE,
>                 description: 'Bike: 60min (Zone 1-2)',
>                 totalDistance: 0,
>                 targetPace: 0,
>                 targetDuration: 3600,
>             });
>         } else if (remainingSwims > 0) {
>             remainingSwims--;
>             workouts.push({
>                 dayOffset: d,
>                 type: WorkoutType.SWIM,
>                 description: 'Swim: 1500m @ Easy',
>                 totalDistance: 1500,
>                 targetPace: 120,
>                 targetDuration: 2700,
>             });
>         }
>     }
> 
>     let remainingStrength = strengthPerWeek;
>     const strengthFreeDays: number[] = [];
>     for (let d = 0; d < 7; d++) {
>         if (!usedDays.has(d)) strengthFreeDays.push(d);
>     }
>     for (const d of strengthFreeDays) {
>         if (remainingStrength <= 0) break;
>         usedDays.add(d);
>         workouts.push({
>             dayOffset: d,
>             type: WorkoutType.STRENGTH,
>             description: 'Strength: 45min',
>             totalDistance: 0,
>             targetPace: 0,
>             targetDuration: 2700,
>         });
>         remainingStrength--;
>     }
> 
>     return workouts;
> ```
>
> **REPLACE WITH:**
> ```ts
>     const qualityDistance = workouts
>         .filter(w => w.type !== WorkoutType.LONG_RUN && isRunType(w.type))
>         .reduce((sum, w) => sum + w.totalDistance, 0);
>     const keyRunCount = runsPerWeek >= 1 ? (hasQuality ? 2 : 1) : 0;
>     const easyRunsCount = Math.max(0, runsPerWeek - keyRunCount);
>     const remainingVol = Math.max(0, weeklyVolume - (runsPerWeek >= 1 ? longRunDist : 0) - qualityDistance);
>     const easyDist = easyRunsCount > 0
>         ? Math.max(PLAN_CONSTANTS.EASY_RUN_MIN, Math.min(PLAN_CONSTANTS.EASY_RUN_MAX, Math.round(remainingVol / easyRunsCount / 100) * 100))
>         : 0;
> 
>     for (let i = 0; i < easyRunsCount; i++) {
>         const day = getAvailableDay((preferredLongRunDay + 2 + i * 2) % 7, hardSessionDays);
>         if (usedDays.has(day)) break;
>         usedDays.add(day);
> 
>         const dayAfterHard = hardSessionDays.some(hd => {
>             const diff = (day - hd + 7) % 7;
>             return diff === 1;
>         });
> 
>         if (dayAfterHard) {
>             workouts.push({
>                 dayOffset: day,
>                 type: WorkoutType.RECOVERY,
>                 description: `Recovery: ${(easyDist / 1000).toFixed(1)}km`,
>                 totalDistance: easyDist,
>                 targetPace: recoveryPace,
>                 targetDuration: 0,
>             });
>         } else {
>             workouts.push({
>                 dayOffset: day,
>                 type: WorkoutType.EASY,
>                 description: `Easy: ${(easyDist / 1000).toFixed(1)}km`,
>                 totalDistance: easyDist,
>                 targetPace: easyPace,
>                 targetDuration: 0,
>             });
>         }
>     }
> 
>     let remainingRides = ridesPerWeek;
>     let remainingSwims = swimsPerWeek;
>     let ridesPlaced = 0;
> 
>     if (preferredSwimDay !== undefined && remainingSwims > 0 && !usedDays.has(preferredSwimDay)) {
>         usedDays.add(preferredSwimDay);
>         remainingSwims--;
>         workouts.push({
>             dayOffset: preferredSwimDay,
>             type: WorkoutType.SWIM,
>             description: 'Swim: 1500m @ Easy',
>             totalDistance: 1500,
>             targetPace: 120,
>             targetDuration: 2700,
>         });
>     }
> 
>     const candidateDays: number[] = [];
>     for (let d = 0; d < 7; d++) {
>         if (!usedDays.has(d)) candidateDays.push(d);
>     }
>     // Allow double-day placement if the athlete requested more total sessions than free days
>     for (let d = 0; d < 7; d++) {
>         if (!(restDays ?? []).includes(d) && !candidateDays.includes(d)) {
>             candidateDays.push(d);
>         }
>     }
> 
>     for (const d of candidateDays) {
>         if (remainingRides <= 0 && remainingSwims <= 0) break;
>         usedDays.add(d);
>         if (remainingRides > 0) {
>             remainingRides--;
>             ridesPlaced++;
>             if (ridesPlaced === 1 && ridesPerWeek >= 2 && !isRecoveryWeek) {
>                 workouts.push({
>                     dayOffset: d,
>                     type: WorkoutType.LONG_RIDE,
>                     description: 'Long Ride: 90min (Zone 2)',
>                     totalDistance: 0,
>                     targetPace: 0,
>                     targetDuration: 5400,
>                 });
>             } else if (ridesPlaced === 2 && !isRecoveryWeek) {
>                 workouts.push({
>                     dayOffset: d,
>                     type: WorkoutType.RIDE_INTERVALS,
>                     description: 'Bike Intervals: 60min (Threshold / Vo2max)',
>                     totalDistance: 0,
>                     targetPace: 0,
>                     targetDuration: 3600,
>                 });
>             } else {
>                 workouts.push({
>                     dayOffset: d,
>                     type: WorkoutType.RIDE,
>                     description: 'Bike: 60min (Zone 1-2)',
>                     totalDistance: 0,
>                     targetPace: 0,
>                     targetDuration: 3600,
>                 });
>             }
>         } else if (remainingSwims > 0) {
>             remainingSwims--;
>             workouts.push({
>                 dayOffset: d,
>                 type: WorkoutType.SWIM,
>                 description: 'Swim: 1500m @ Easy',
>                 totalDistance: 1500,
>                 targetPace: 120,
>                 targetDuration: 2700,
>             });
>         }
>     }
> 
>     let remainingStrength = strengthPerWeek;
>     const strengthCandidateDays: number[] = [];
>     for (let d = 0; d < 7; d++) {
>         if (!usedDays.has(d)) strengthCandidateDays.push(d);
>     }
>     for (let d = 0; d < 7; d++) {
>         if (!(restDays ?? []).includes(d) && !strengthCandidateDays.includes(d)) {
>             strengthCandidateDays.push(d);
>         }
>     }
>     for (const d of strengthCandidateDays) {
>         if (remainingStrength <= 0) break;
>         usedDays.add(d);
>         workouts.push({
>             dayOffset: d,
>             type: WorkoutType.STRENGTH,
>             description: 'Strength & Gym: 45min',
>             totalDistance: 0,
>             targetPace: 0,
>             targetDuration: 2700,
>         });
>         remainingStrength--;
>     }
> 
>     return workouts;
> ```
>
> #### Edit 4.7: Allow `runsPerWeek = 0` & `swimsPerWeek = 0` in `Web/src/lib/plans/generators/triathlon.ts`
> Open `Web/src/lib/plans/generators/triathlon.ts` (lines 116–120, lines 424–427, lines 453–520, and lines 559–574).
>
> First, in `Web/src/lib/plans/generators/triathlon.ts` (lines 116–120):
>
> **FIND:**
> ```ts
>     const runsPerWeek = Math.max(2, config.runsPerWeek ?? 3);
>     const ridesPerWeek = Math.max(2, config.ridesPerWeek ?? 3);
>     const swimsPerWeek = Math.max(2, config.swimsPerWeek ?? 3);
>     const strengthPerWeek = Math.max(0, config.strengthPerWeek ?? 1);
> ```
>
> **REPLACE WITH:**
> ```ts
>     const runsPerWeek = Math.max(0, config.runsPerWeek ?? 3);
>     const ridesPerWeek = Math.max(1, config.ridesPerWeek ?? 3);
>     const swimsPerWeek = Math.max(0, config.swimsPerWeek ?? 3);
>     const strengthPerWeek = Math.max(0, config.strengthPerWeek ?? 1);
> ```
>
> Second, in `Web/src/lib/plans/generators/triathlon.ts` (lines 424–427 and lines 453–520):
>
> **FIND:**
> ```ts
>     const hasBrick = phase === 'BUILD' || phase === 'PEAK' || (isTaper && taperIdx === 0);
>     const hasOpenWater = phase === 'PEAK' || (isTaper && taperIdx <= 1);
>     const hasTransition = phase === 'PEAK' || (isTaper && taperIdx === 0);
> ```
>
> **REPLACE WITH:**
> ```ts
>     const hasBrick = runsPerWeek >= 1 && (phase === 'BUILD' || phase === 'PEAK' || (isTaper && taperIdx === 0));
>     const hasOpenWater = swimsPerWeek >= 2 && (phase === 'PEAK' || (isTaper && taperIdx <= 1));
>     const hasTransition = runsPerWeek >= 1 && swimsPerWeek >= 1 && (phase === 'PEAK' || (isTaper && taperIdx === 0));
> ```
>
> Third, in `Web/src/lib/plans/generators/triathlon.ts` (lines 453–520 and lines 559–574):
>
> **FIND:**
> ```ts
>     const longRunDay = getAvailableDay(preferredLongRunDay, []);
>     usedDays.add(longRunDay);
>     hardSessionDays.push(longRunDay);
> 
>     if (isTaper) {
>         const taperFactor = taperIdx === 0 ? 0.5 : taperIdx === 1 ? 0.65 : 0.80;
>         const taperedDist = Math.round(longRunDist * taperFactor);
>         workouts.push({
>             dayOffset: longRunDay,
>             type: WorkoutType.LONG_RUN,
>             description: `Long Run: ${(taperedDist / 1000).toFixed(1)}km @ Easy`,
>             totalDistance: taperedDist,
>             targetPace: easyPace,
>             targetDuration: 0,
>         });
>     } else {
>         let longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`;
>         if (phase === 'PEAK') {
>             const raceRunDist = customRunDist ?? TRI_RACE_RUN_DIST[raceType] ?? 10000;
>             const mpDist = Math.min(Math.round(longRunDist * 0.3 / 100) * 100, raceRunDist * 0.3);
>             const easyPart = longRunDist - mpDist;
>             longRunDesc = `Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ Race Pace`;
>         }
>         workouts.push({
>             dayOffset: longRunDay,
>             type: WorkoutType.LONG_RUN,
>             description: longRunDesc,
>             totalDistance: longRunDist,
>             targetPace: easyPace,
>             targetDuration: 0,
>         });
>     }
> 
>     if (!isRecoveryWeek && phase !== 'TAPER') {
>         const qualityDay = getAvailableDay(preferredWorkoutDay, hardSessionDays);
>         usedDays.add(qualityDay);
>         hardSessionDays.push(qualityDay);
> 
>         if (phase === 'PEAK' && raceType === 'FULL_IRONMAN') {
>             workouts.push({
>                 dayOffset: qualityDay,
>                 type: WorkoutType.TEMPO,
>                 description: `Run Threshold: 3x3km @ ${formatPace(paces.threshold)}`,
>                 totalDistance: 13000,
>                 targetPace: paces.threshold,
>                 targetDuration: 0,
>             });
>         } else if (phase === 'PEAK') {
>             workouts.push({
>                 dayOffset: qualityDay,
>                 type: WorkoutType.INTERVALS,
>                 description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
>                 totalDistance: 10000,
>                 targetPace: paces.interval,
>                 targetDuration: 0,
>             });
>         } else {
>             workouts.push({
>                 dayOffset: qualityDay,
>                 type: WorkoutType.TEMPO,
>                 description: `Threshold: 6km @ ${formatPace(paces.threshold)}`,
>                 totalDistance: 8000,
>                 targetPace: paces.threshold,
>                 targetDuration: 0,
>             });
>         }
>     }
> ```
>
> **REPLACE WITH:**
> ```ts
>     const longRunDay = getAvailableDay(preferredLongRunDay, []);
>     if (runsPerWeek >= 1) {
>         usedDays.add(longRunDay);
>         hardSessionDays.push(longRunDay);
> 
>         if (isTaper) {
>             const taperFactor = taperIdx === 0 ? 0.5 : taperIdx === 1 ? 0.65 : 0.80;
>             const taperedDist = Math.round(longRunDist * taperFactor);
>             workouts.push({
>                 dayOffset: longRunDay,
>                 type: WorkoutType.LONG_RUN,
>                 description: `Long Run: ${(taperedDist / 1000).toFixed(1)}km @ Easy`,
>                 totalDistance: taperedDist,
>                 targetPace: easyPace,
>                 targetDuration: 0,
>             });
>         } else {
>             let longRunDesc = `Long Run: ${(longRunDist / 1000).toFixed(1)}km @ Easy`;
>             if (phase === 'PEAK') {
>                 const raceRunDist = customRunDist ?? TRI_RACE_RUN_DIST[raceType] ?? 10000;
>                 const mpDist = Math.min(Math.round(longRunDist * 0.3 / 100) * 100, raceRunDist * 0.3);
>                 const easyPart = longRunDist - mpDist;
>                 longRunDesc = `Long Run: ${(easyPart / 1000).toFixed(1)}km Easy + ${(mpDist / 1000).toFixed(1)}km @ Race Pace`;
>             }
>             workouts.push({
>                 dayOffset: longRunDay,
>                 type: WorkoutType.LONG_RUN,
>                 description: longRunDesc,
>                 totalDistance: longRunDist,
>                 targetPace: easyPace,
>                 targetDuration: 0,
>             });
>         }
>     }
> 
>     if (runsPerWeek >= 2 && !isRecoveryWeek && phase !== 'TAPER') {
>         const qualityDay = getAvailableDay(preferredWorkoutDay, hardSessionDays);
>         usedDays.add(qualityDay);
>         hardSessionDays.push(qualityDay);
> 
>         if (phase === 'PEAK' && raceType === 'FULL_IRONMAN') {
>             workouts.push({
>                 dayOffset: qualityDay,
>                 type: WorkoutType.TEMPO,
>                 description: `Run Threshold: 3x3km @ ${formatPace(paces.threshold)}`,
>                 totalDistance: 13000,
>                 targetPace: paces.threshold,
>                 targetDuration: 0,
>             });
>         } else if (phase === 'PEAK') {
>             workouts.push({
>                 dayOffset: qualityDay,
>                 type: WorkoutType.INTERVALS,
>                 description: `Intervals: 5x1km @ ${formatPace(paces.interval)}`,
>                 totalDistance: 10000,
>                 targetPace: paces.interval,
>                 targetDuration: 0,
>             });
>         } else {
>             workouts.push({
>                 dayOffset: qualityDay,
>                 type: WorkoutType.TEMPO,
>                 description: `Threshold: 6km @ ${formatPace(paces.threshold)}`,
>                 totalDistance: 8000,
>                 targetPace: paces.threshold,
>                 targetDuration: 0,
>             });
>         }
>     }
> ```
>
> Fourth, in `Web/src/lib/plans/generators/triathlon.ts` (lines 559–574 of the original file):
>
> **FIND:**
> ```ts
>     } else if (phase === 'BASE') {
>         const drillDay = getAvailableDay(preferredSwimDay, hardSessionDays);
>         if (!usedDays.has(drillDay)) {
>             usedDays.add(drillDay);
>             workouts.push({
>                 dayOffset: drillDay,
>                 type: WorkoutType.SWIM_DRILL,
>                 description: `Swim Drill: ${(Math.round(swimDistPerSession * 0.8) / 100).toFixed(0)}00m (technique focus)`,
>                 totalDistance: Math.round(swimDistPerSession * 0.8),
>                 targetPace: css,
>                 targetDuration: 0,
>             });
>         }
>     }
> ```
>
> **REPLACE WITH:**
> ```ts
>     } else if (phase === 'BASE' && swimsPerWeek >= 1) {
>         const drillDay = getAvailableDay(preferredSwimDay, hardSessionDays);
>         if (!usedDays.has(drillDay)) {
>             usedDays.add(drillDay);
>             workouts.push({
>                 dayOffset: drillDay,
>                 type: WorkoutType.SWIM_DRILL,
>                 description: `Swim Drill: ${(Math.round(swimDistPerSession * 0.8) / 100).toFixed(0)}00m (technique focus)`,
>                 totalDistance: Math.round(swimDistPerSession * 0.8),
>                 targetPace: css,
>                 targetDuration: 0,
>             });
>         }
>     }
> ```
>
> #### Edit 4.8: Accept `sport: 'CYCLING'` in `PlanCreateInputSchema` & Default MyWhoosh Plan Matching in `Web/src/lib/services/plan-creation.ts`
> Open `Web/src/lib/services/plan-creation.ts` (lines 42–60, lines 153–240, and lines 778–791).
>
> First, in `Web/src/lib/services/plan-creation.ts` (lines 42–60):
>
> **FIND:**
> ```ts
> export const SubGoalSchema = z.object({
>     name: z.string().min(1).max(255),
>     sport: z.enum(['RUN', 'TRIATHLON', 'NO_RACE']).optional(),
>     raceType: z.nativeEnum(RaceType).nullable().optional(),
>     raceDate: boundedRaceDateSchema.nullable().optional(),
>     priority: z.enum(['SECONDARY', 'TUNE_UP', 'MILESTONE']).optional(),
>     targetTime: z.number().int().positive().optional(),
> });
> 
> export const PlanCreateInputSchema = z.object({
>     // Required
>     name: z.string().min(1).max(255),
> 
>     // Sport / race configuration
>     sport: z.enum(['RUN', 'TRIATHLON', 'NO_RACE']).optional(),
> ```
>
> **REPLACE WITH:**
> ```ts
> export const SubGoalSchema = z.object({
>     name: z.string().min(1).max(255),
>     sport: z.enum(['RUN', 'TRIATHLON', 'CYCLING', 'NO_RACE']).optional(),
>     raceType: z.nativeEnum(RaceType).nullable().optional(),
>     raceDate: boundedRaceDateSchema.nullable().optional(),
>     priority: z.enum(['SECONDARY', 'TUNE_UP', 'MILESTONE']).optional(),
>     targetTime: z.number().int().positive().optional(),
> });
> 
> export const PlanCreateInputSchema = z.object({
>     // Required
>     name: z.string().min(1).max(255),
> 
>     // Sport / race configuration
>     sport: z.enum(['RUN', 'TRIATHLON', 'CYCLING', 'NO_RACE']).optional(),
> ```
>
> Second, in `Web/src/lib/services/plan-creation.ts` (lines 153–240):
>
> **FIND:**
> ```ts
>     // Resolve sport: default to RUN
>     const resolvedSport: 'RUN' | 'TRIATHLON' | 'NO_RACE' = sport ?? 'RUN';
>     const isNoRace = resolvedSport === 'NO_RACE';
> 
>     // Resolve race type / date for NO_RACE
>     const resolvedRaceType: RaceType | null = isNoRace ? null : (raceType ?? null);
>     const resolvedRaceDate: string | null = isNoRace ? null : (raceDate ?? null);
> 
>     // Resolve plan weeks. Every source is ceiling-capped at MAX_PLAN_WEEKS so
>     // no caller input (explicit planWeeks or a raceDate horizon) can drive an
>     // unbounded generation loop; schemas reject over-limit values early, this
>     // clamp is the backstop for any caller that bypasses them.
>     let resolvedPlanWeeks: number | null = planWeeks != null
>         ? Math.min(MAX_PLAN_WEEKS, planWeeks)
>         : null;
>     if (!resolvedPlanWeeks && isNoRace && durationWeeks) {
>         resolvedPlanWeeks = durationWeeks;
>     }
>     if (!resolvedPlanWeeks && resolvedRaceDate && planStartDate) {
>         const weeks = Math.min(MAX_PLAN_WEEKS, Math.max(4, Math.ceil(
>             (new Date(resolvedRaceDate).getTime() - new Date(planStartDate).getTime()) / MS_PER_WEEK,
>         )));
>         resolvedPlanWeeks = weeks;
>     }
>     if (!resolvedPlanWeeks) {
>         resolvedPlanWeeks = 12;
>     }
> 
>     // Unit guard: weeklyMileageGoal < 200 → likely km, convert to meters
>     let resolvedWeeklyMileage = weeklyMileageGoal ?? null;
>     if (resolvedWeeklyMileage && resolvedWeeklyMileage > 0 && resolvedWeeklyMileage < 200) {
>         resolvedWeeklyMileage = resolvedWeeklyMileage * 1000;
>     }
> 
>     let resolvedStartMileage = startWeeklyMileage ?? null;
>     if (resolvedStartMileage && resolvedStartMileage > 0 && resolvedStartMileage < 200) {
>         resolvedStartMileage = resolvedStartMileage * 1000;
>     }
> 
>     // Defaults from race defaults when missing
>     const raceTypeKey = resolvedRaceType ?? 'MARATHON';
>     const defaults = getRaceDefaults(raceTypeKey);
> 
>     const resolvedRunsPerWeek = runsPerWeek ?? defaults.runsPerWeek;
>     const resolvedRidesPerWeek = ridesPerWeek ?? defaults.ridesPerWeek;
>     const resolvedSwimsPerWeek = swimsPerWeek ?? defaults.swimsPerWeek;
>     const resolvedStrengthPerWeek = strengthPerWeek ?? defaults.strengthPerWeek;
> 
>     // Clean sub-goals
>     const resolvedSubGoals = (subGoals ?? [])
>         .filter(sg => sg.name?.trim())
>         .map(sg => ({
>             ...sg,
>             name: sg.name.trim(),
>         }));
> 
>     return {
>         userId,
>         name: name.trim(),
>         raceType: resolvedRaceType,
>         raceDate: resolvedRaceDate,
>         planStartDate: planStartDate ?? null,
>         targetTime: targetTime ?? null,
>         weeklyMileageGoal: resolvedWeeklyMileage,
>         startWeeklyMileage: resolvedStartMileage,
>         planWeeks: resolvedPlanWeeks,
>         runsPerWeek: resolvedRunsPerWeek,
>         ridesPerWeek: resolvedRidesPerWeek,
>         swimsPerWeek: resolvedSwimsPerWeek,
>         strengthPerWeek: resolvedStrengthPerWeek,
>         taperWeeks: taperWeeks ?? null,
>         peakWeeks: peakWeeks ?? null,
>         buildWeeks: buildWeeks ?? null,
>         maxLongRunKm: maxLongRunKm ?? null,
>         longRunDay: longRunDay ?? 0,
>         workoutDay: workoutDay ?? 3,
>         swimDay: swimDay ?? null,
>         restDays: restDays ?? null,
>         calibrationTime: calibrationTime ?? null,
>         calibrationDistance: calibrationDistance ?? null,
>         calibrationFactor: calibrationFactor ?? null,
>         matchToMyWhoosh: matchToMyWhoosh ?? false,
>         mywhooshPlanId: mywhooshPlanId ?? null,
>         deactivateExisting: planSource !== 'advanced',
>         sport: resolvedSport === 'NO_RACE' ? 'RUN' : resolvedSport,
> ```
>
> **REPLACE WITH:**
> ```ts
>     // Resolve sport: default to RUN
>     const resolvedSport: 'RUN' | 'TRIATHLON' | 'CYCLING' | 'NO_RACE' = sport ?? 'RUN';
>     const isCyclingOnly = resolvedSport === 'CYCLING';
>     const isNoRace = resolvedSport === 'NO_RACE' || (isCyclingOnly && !raceType);
> 
>     // Resolve race type / date for NO_RACE or CYCLING
>     const resolvedRaceType: RaceType | null = isNoRace ? null : (raceType ?? null);
>     const resolvedRaceDate: string | null = isNoRace ? null : (raceDate ?? null);
> 
>     // Resolve plan weeks. Every source is ceiling-capped at MAX_PLAN_WEEKS so
>     // no caller input (explicit planWeeks or a raceDate horizon) can drive an
>     // unbounded generation loop; schemas reject over-limit values early, this
>     // clamp is the backstop for any caller that bypasses them.
>     let resolvedPlanWeeks: number | null = planWeeks != null
>         ? Math.min(MAX_PLAN_WEEKS, planWeeks)
>         : null;
>     if (!resolvedPlanWeeks && isNoRace && durationWeeks) {
>         resolvedPlanWeeks = durationWeeks;
>     }
>     if (!resolvedPlanWeeks && resolvedRaceDate && planStartDate) {
>         const weeks = Math.min(MAX_PLAN_WEEKS, Math.max(4, Math.ceil(
>             (new Date(resolvedRaceDate).getTime() - new Date(planStartDate).getTime()) / MS_PER_WEEK,
>         )));
>         resolvedPlanWeeks = weeks;
>     }
>     if (!resolvedPlanWeeks) {
>         resolvedPlanWeeks = isCyclingOnly ? 8 : 12;
>     }
> 
>     // Unit guard: weeklyMileageGoal < 200 → likely km, convert to meters
>     let resolvedWeeklyMileage = weeklyMileageGoal ?? null;
>     if (resolvedWeeklyMileage && resolvedWeeklyMileage > 0 && resolvedWeeklyMileage < 200) {
>         resolvedWeeklyMileage = resolvedWeeklyMileage * 1000;
>     }
> 
>     let resolvedStartMileage = startWeeklyMileage ?? null;
>     if (resolvedStartMileage && resolvedStartMileage > 0 && resolvedStartMileage < 200) {
>         resolvedStartMileage = resolvedStartMileage * 1000;
>     }
> 
>     // Defaults from race defaults when missing
>     const raceTypeKey = resolvedRaceType ?? 'MARATHON';
>     const defaults = getRaceDefaults(raceTypeKey);
> 
>     const resolvedRunsPerWeek = runsPerWeek ?? (isCyclingOnly ? 0 : defaults.runsPerWeek);
>     const resolvedRidesPerWeek = ridesPerWeek ?? (isCyclingOnly ? 4 : defaults.ridesPerWeek);
>     const resolvedSwimsPerWeek = swimsPerWeek ?? (isCyclingOnly ? 0 : defaults.swimsPerWeek);
>     const resolvedStrengthPerWeek = strengthPerWeek ?? defaults.strengthPerWeek;
> 
>     // Clean sub-goals
>     const resolvedSubGoals = (subGoals ?? [])
>         .filter(sg => sg.name?.trim())
>         .map(sg => ({
>             ...sg,
>             name: sg.name.trim(),
>         }));
> 
>     return {
>         userId,
>         name: name.trim(),
>         raceType: resolvedRaceType,
>         raceDate: resolvedRaceDate,
>         planStartDate: planStartDate ?? null,
>         targetTime: targetTime ?? null,
>         weeklyMileageGoal: resolvedWeeklyMileage,
>         startWeeklyMileage: resolvedStartMileage,
>         planWeeks: resolvedPlanWeeks,
>         runsPerWeek: resolvedRunsPerWeek,
>         ridesPerWeek: resolvedRidesPerWeek,
>         swimsPerWeek: resolvedSwimsPerWeek,
>         strengthPerWeek: resolvedStrengthPerWeek,
>         taperWeeks: taperWeeks ?? null,
>         peakWeeks: peakWeeks ?? null,
>         buildWeeks: buildWeeks ?? null,
>         maxLongRunKm: maxLongRunKm ?? null,
>         longRunDay: longRunDay ?? 0,
>         workoutDay: workoutDay ?? 3,
>         swimDay: swimDay ?? null,
>         restDays: restDays ?? null,
>         calibrationTime: calibrationTime ?? null,
>         calibrationDistance: calibrationDistance ?? null,
>         calibrationFactor: calibrationFactor ?? null,
>         matchToMyWhoosh: isCyclingOnly ? true : (matchToMyWhoosh ?? false),
>         mywhooshPlanId: mywhooshPlanId ?? (isCyclingOnly ? 'mw-plan-ftp-builder' : null),
>         deactivateExisting: planSource !== 'advanced',
>         sport: resolvedSport === 'NO_RACE' ? 'RUN' : (resolvedSport === 'CYCLING' ? 'TRIATHLON' : resolvedSport),
> ```
>
> Third, in `Web/src/lib/services/plan-creation.ts` (lines 705–713 and lines 778–791 of the original file):
>
> **FIND:**
> ```ts
> export interface SubGoalInput {
>     name: string;
>     sport?: 'RUN' | 'TRIATHLON' | 'NO_RACE';
>     raceType?: RaceType | null;
>     raceDate?: string | null;
>     priority?: 'SECONDARY' | 'TUNE_UP' | 'MILESTONE';
>     targetTime?: number | null;
> }
> ```
>
> **REPLACE WITH:**
> ```ts
> export interface SubGoalInput {
>     name: string;
>     sport?: 'RUN' | 'TRIATHLON' | 'CYCLING' | 'NO_RACE';
>     raceType?: RaceType | null;
>     raceDate?: string | null;
>     priority?: 'SECONDARY' | 'TUNE_UP' | 'MILESTONE';
>     targetTime?: number | null;
> }
> ```
>
> Fourth, in `Web/src/lib/services/plan-creation.ts` (lines 778–791 of the original file):
>
> **FIND:**
> ```ts
> function resolveDbSport(sport: 'RUN' | 'TRIATHLON' | 'NO_RACE'): PlanSport {
>     return sport === 'NO_RACE' ? 'RUN' : sport;
> }
> 
> function resolveSubGoalSport(
>     parentSport: 'RUN' | 'TRIATHLON' | 'NO_RACE',
>     subGoalSport?: 'RUN' | 'TRIATHLON' | 'NO_RACE',
>     raceType?: RaceType | null,
> ): PlanSport {
>     if (subGoalSport) return resolveDbSport(subGoalSport);
>     if (raceType) return TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : 'RUN';
>     return resolveDbSport(parentSport);
> }
> ```
>
> **REPLACE WITH:**
> ```ts
> function resolveDbSport(sport: 'RUN' | 'TRIATHLON' | 'CYCLING' | 'NO_RACE'): PlanSport {
>     if (sport === 'NO_RACE') return 'RUN';
>     if (sport === 'CYCLING') return 'TRIATHLON';
>     return sport;
> }
> 
> function resolveSubGoalSport(
>     parentSport: 'RUN' | 'TRIATHLON' | 'CYCLING' | 'NO_RACE',
>     subGoalSport?: 'RUN' | 'TRIATHLON' | 'CYCLING' | 'NO_RACE',
>     raceType?: RaceType | null,
> ): PlanSport {
>     if (subGoalSport) return resolveDbSport(subGoalSport);
>     if (raceType) return TRIATHLON_RACE_TYPES.has(raceType) ? 'TRIATHLON' : 'RUN';
>     return resolveDbSport(parentSport);
> }
> ```
>
> #### Verify Agent-UI-4:
> Run:
> ```bash
> cd Web && npx tsc --noEmit && npm test -- src/lib/plans/__tests__/index.test.ts
> ```

---

## 3. Final Coordinator Verification Gate

After **Agent-UI-1**, **Agent-UI-2**, **Agent-UI-3**, and **Agent-UI-4** complete, run the full verification suite:

```bash
cd Web && npx tsc --noEmit && npm test
```
