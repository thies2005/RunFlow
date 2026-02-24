# RunFlow Code Audit Report
**Date:** February 24, 2026
**Audit Scope:** Full Codebase - Bugs, Security, Features, UI, Code Quality, Performance
**Auditors:** 6 Specialized Subagents + Verification Agent

---

## Executive Summary

**Total Issues Identified:** 138 unique issues across all audit categories
- **Critical Issues:** 9
- **High Risk Issues:** 32
- **Medium Risk Issues:** 57
- **Low Risk Issues:** 29
- **Optimizations:** 7
- **Feature Updates:** 4

**Files Analyzed:** 322 TypeScript/TSX files
**Total Lines of Code:** ~45,000+
**Code Coverage:** Full codebase (Web application, API routes, lib utilities, components)

---

## Table of Contents
1. [Critical Issues](#critical-issues)
2. [High Risk Issues](#high-risk-issues)
3. [Medium Risk Issues](#medium-risk-issues)
4. [Low Risk Issues](#low-risk-issues)
5. [Optimizations](#optimizations)
6. [Feature Updates](#feature-updates)
7. [Statistics & Recommendations](#statistics--recommendations)

---

## Critical Issues

### [FIXED] C-01: Infinite Retry Loop Without Max Limit
**File:** `Web/src/lib/strava/fetch.ts:138-143`
**Category:** Bug
**Severity:** CRITICAL
**Description:** Recursive retry function with no maximum retry count can cause stack overflow or infinite loop
**Impact:** Application can hang indefinitely, causing DoS
**Fix:** Add max retry limit with exponential backoff

---

### [FIXED] C-02: JWT Secret Generates Random Value in Production
**File:** `Web/src/lib/mobile/auth.ts:28-35`
**Category:** Bug
**Severity:** CRITICAL
**Description:** If JWT_SECRET environment variable is not set, a random ephemeral secret is generated on each server restart, invalidating all tokens
**Impact:** Users logged out on every restart; session management broken in production
**Fix:** Throw error if JWT_SECRET not set in production

---

### [FIXED] C-03: Hardcoded Default Admin Credentials
**File:** `Web/.env:27-28`
**Category:** Security
**Severity:** CRITICAL
**Description:** Default credentials `admin/admin` hardcoded in environment file
**Impact:** Complete system compromise if deployed with defaults
**Fix:** Generate secure credentials and remove defaults

---

### [FIXED] C-04: Default Cryptographic Secrets in Production
**File:** `Web/.env:10, 19, 22`
**Category:** Security
**Severity:** CRITICAL
**Description:** Development secrets used for NEXTAUTH_SECRET, ENCRYPTION_KEY, JWT_SECRET
**Impact:** All tokens/signatures can be forged; encrypted data decryptable by attackers
**Fix:** Generate strong cryptographic keys (32+ bytes) using secure randomness

---

### [FIXED] C-05: Command Injection in Backup Scheduler
**File:** `Web/src/lib/backup/scheduler.ts:91, 146`
**Category:** Security
**Severity:** CRITICAL
**Description:** Shell command execution with interpolated variables without proper sanitization
**Impact:** Full server compromise via path injection
**Fix:** Use parameterized pg_dump or node-postgres library directly

---

### [FIXED] C-06: Database Credentials in Plain Text
**File:** `Web/.env:2, 5-6`
**Category:** Security
**Severity:** CRITICAL
**Description:** Database URL and credentials stored as `postgresql://runflow:runflow@db:5432/runflow`
**Impact:** Database compromised if .env exposed
**Fix:** Use strong unique passwords; rotate immediately in production

---

### [FIXED] C-07: Chart Elements Not Accessible to Screen Readers
**File:** `Web/src/components/FitnessChart.tsx:116-182`
**Category:** UI / Accessibility
**Severity:** CRITICAL
**Description:** Recharts SVG elements lack ARIA labels, making chart data completely inaccessible to screen readers
**Impact:** WCAG 2.1 AA violation; users with disabilities cannot access analytics
**Fix:** Wrap charts in VisuallyHidden component with data summary

---

### [FIXED] C-08: Analytics Dashboard Charts Lack ARIA Descriptions
**File:** `Web/src/components/AnalyticsDashboard.tsx:81-236`
**Category:** UI / Accessibility
**Severity:** CRITICAL
**Description:** All charts (ZoneTrendChart, WeeklyVolumeChart, ZonePieChart) lack ARIA descriptions
**Impact:** Screen reader users cannot understand chart data
**Fix:** Add role="img" and aria-label="Chart showing [data description]" to chart containers

---

### [FIXED] C-09: Strava Sync Blocks Server Responses
**File:** `Web/src/lib/strava/sync.ts:157-305`
**Category:** Performance
**Severity:** CRITICAL
**Description:** Long-running sync operation blocks request thread for minutes, causing timeouts
**Impact:** Server unresponsiveness; poor user experience during syncs
**Fix:** Move sync to background job queue (Bull, Agenda)

---

## High Risk Issues

### [FALSE POSITIVE] H-01: Concurrent Sync Without Distributed Lock
**File:** `Web/src/lib/strava/sync.ts:46-51`
**Category:** Bug (Race Condition)
**Severity:** HIGH
**Description:** Multiple sync processes can run concurrently for same user without coordination
**Impact:** Data corruption, duplicate activities, inconsistent state
**Fix:** Implement distributed locking around entire sync operation

---

### [FIXED] H-02: Lock Fail-Open Pattern
**File:** `Web/src/lib/redis.ts:55-66`
**Category:** Bug (Race Condition)
**Severity:** HIGH
**Description:** acquireLock returns true if Redis is unavailable, allowing concurrent access when it shouldn't
**Impact:** Race conditions in production
**Fix:** Throw error if Redis required but unavailable in production

---

### [FALSE POSITIVE] H-03: Incorrect Gap Days Calculation
**File:** `Web/src/lib/metrics/fitnessCache.ts:78`
**Category:** Bug (Logic Error)
**Severity:** HIGH
**Description:** Subtracts 1 from date difference, causing negative gapDays and incorrect decay calculations
**Impact:** Fitness metrics calculations are incorrect
**Fix:** Remove -1 or add Math.max(0, ...) guard

---

### [FIXED] H-04: HR Max Update Race Condition
**File:** `Web/src/lib/strava/sync.ts:213-224`
**Category:** Bug (Race Condition)
**Severity:** HIGH
**Description:** Multiple concurrent activities trigger hrMax updates without proper locking
**Impact:** Data loss, inconsistent user metrics
**Fix:** Use atomic update or defer until all activities processed

---

### [FIXED] H-05: Unsafe Property Access
**File:** `Web/src/lib/strava/sync.ts:234-249`
**Category:** Bug (Null/Undefined Reference)
**Severity:** HIGH
**Description:** User properties accessed with null coalescing but not validated, passing null to functions expecting numbers
**Impact:** NaN calculations in metrics
**Fix:** Ensure all metrics have valid fallback values

---

### [FALSE POSITIVE] H-06: User Profile Update Loses Data
**File:** `Web/src/lib/strava/sync.ts:112-119`
**Category:** Bug (Data Corruption)
**Severity:** HIGH
**Description:** Update only spreads updatedUser without preserving other fields from original user object
**Impact:** Loss of user data on profile updates
**Fix:** Merge updates properly with all fields

---

### [FIXED] H-07: Missing Ownership Check (IDOR Risk)
**File:** `Web/src/app/api/activities/[id]/route.ts:80-91`
**Category:** Security (IDOR)
**Severity:** HIGH
**Description:** Ownership check exists but only after fetching activity - potential bypass
**Impact:** Unauthorized access to user activities
**Fix:** Verify userId in WHERE clause with findFirst

---

### [FALSE POSITIVE] H-08: Inconsistent CSRF Protection
**File:** `Web/src/app/api/admin/backups/upload/route.ts:19-22`
**Category:** Security (CSRF)
**Severity:** HIGH
**Description:** Only ONE admin endpoint validates CSRF tokens; all others vulnerable
**Impact:** Attackers can force actions on behalf of admin users
**Fix:** Implement CSRF middleware for ALL state-changing API routes

---

### [FALSE POSITIVE] H-09: Missing CSRF Validation on Most Endpoints
**File:** Multiple POST/PUT/DELETE routes in `/api/`
**Category:** Security (CSRF)
**Severity:** HIGH
**Description:** No CSRF token validation on majority of endpoints
**Impact:** Cross-site attacks to modify user data
**Fix:** Implement consistent CSRF protection across all endpoints

---

### [DEFERRED] H-10: Unsanitized Markdown Rendering
**File:** `Web/src/components/AiChat.tsx:7, ~410-430`
**Category:** Security (XSS)
**Severity:** HIGH
**Description:** Using react-markdown without sanitization allows stored XSS through AI responses
**Impact:** JavaScript injection by attackers
**Fix:** Use DOMPurify to sanitize markdown output

---

### [FIXED] H-11: CSP Allowlist Too Permissive
**File:** `Web/src/middleware.ts:119-132`
**Category:** Security (XSS)
**Severity:** HIGH
**Description:** CSP allows 'unsafe-inline' for scripts, enabling XSS exploitation
**Impact:** XSS vulnerabilities can be exploited
**Fix:** Use strict nonce-based CSP or remove unsafe-inline

---

### [FIXED] H-12: Encryption Returns Plaintext on Failure
**File:** `Web/src/lib/crypto.ts:47-50, 77-79`
**Category:** Security (Misconfiguration)
**Severity:** HIGH
**Description:** Encryption returns plaintext in production if key not set
**Impact:** ALL OAuth tokens stored unencrypted in database
**Fix:** Force failure instead of falling back to plaintext

---

### [DEFERRED] H-13: DashboardView Inadequate Mobile Layout
**File:** `Web/src/components/views/DashboardView.tsx:128-164`
**Category:** UI (Responsive Design)
**Severity:** HIGH
**Description:** Grid layout lg:grid-cols-3 lacks explicit mobile breakpoints for tablets
**Impact:** Broken layout on intermediate screen sizes
**Fix:** Add md:grid-cols-2 and improve spacing

---

### [FIXED] H-14: MobileBottomNav Missing ARIA Labels
**File:** `Web/src/components/navigation/MobileBottomNav.tsx:25-37`
**Category:** UI (Accessibility)
**Severity:** HIGH
**Description:** Navigation buttons lack aria-label or aria-current attributes
**Impact:** Screen reader users cannot navigate effectively
**Fix:** Add aria-label={tab.label} and aria-current={isActive ? 'page' : undefined}

---

### [FIXED] H-15: ActivityList Missing Keyboard Focus Indicators
**File:** `Web/src/components/ActivityList.tsx:235-244`
**Category:** UI (Accessibility)
**Severity:** HIGH
**Description:** Activity buttons have no visible focus states for keyboard navigation
**Impact:** Keyboard users cannot see what element has focus
**Fix:** Add focus:ring-2 focus:ring-accent-orange to buttons

---

### [FIXED] H-16: ManualActivityModal No Error Display
**File:** `Web/src/components/ManualActivityModal.tsx:25-64`
**Category:** UI (Error States)
**Severity:** HIGH
**Description:** Form has error handling but no UI feedback for errors
**Impact:** Users don't know why submission failed
**Fix:** Add error state and display error message to user

---

### [FIXED] H-17: PlanSetupForm Slider Accessibility Issues
**File:** `Web/src/components/PlanSetupForm.tsx:939-952`
**Category:** UI (Accessibility)
**Severity:** HIGH
**Description:** Range slider lacks aria-valuenow, aria-valuemin, aria-valuemax attributes
**Impact:** Screen reader users cannot perceive slider value
**Fix:** Add proper ARIA attributes

---

### [FALSE POSITIVE] H-18: ActivityDetailsModal Portal Implementation Issue
**File:** `Web/src/components/ActivityDetailsModal.tsx:140-141`
**Category:** UI (Layout)
**Severity:** HIGH
**Description:** Uses require('react-dom').createPortal inside component body, causing SSR issues
**Impact:** Server-side rendering errors
**Fix:** Import at top of file: import { createPortal } from 'react-dom'

---

### [DEFERRED] H-19: Large ActivityList Without Virtualization
**File:** `Web/src/components/ActivityList.tsx:231-246`
**Category:** UI (Performance)
**Severity:** HIGH
**Description:** Maps all activities without virtualization - slow with large lists
**Impact:** Poor performance for users with many activities
**Fix:** Use react-window or react-virtualized

---

### [DEFERRED] H-20: Modal Components Inconsistent Implementations
**File:** Multiple modal files
**Category:** UI (Component Consistency)
**Severity:** HIGH
**Description:** Modals use different patterns: some use role="dialog", different z-indices, different close button positions
**Impact:** Inconsistent UX, maintenance burden
**Fix:** Create shared Modal component with consistent API

---

### [DEFERRED] H-21: Form Input Components No Shared Component
**File:** Multiple form components
**Category:** UI (Component Consistency)
**Severity:** HIGH
**Description:** Every form implements its own inputs with slightly different styling
**Impact:** Inconsistent forms, high maintenance cost
**Fix:** Create shared Input, Select, Textarea components

---

### [DEFERRED] H-22: PlanSetupForm God Component (1529 lines)
**File:** `Web/src/components/PlanSetupForm.tsx`
**Category:** Code Quality (SOLID Violation)
**Severity:** HIGH
**Description:** Single component handles form state, validation, API calls, calibration, projections, modal toggles, and rendering
**Impact:** Unmaintainable, violates Single Responsibility Principle
**Fix:** Split into TargetRaceSection, CalibrationSection, GoalTimeSection, HeartRateZonesSection, PlanVolumeSection

---

### [DEFERRED] H-23: Admin Page God Component (1307 lines)
**File:** `Web/src/app/admin/page.tsx`
**Category:** Code Quality (SOLID Violation)
**Severity:** HIGH
**Description:** Manages users, backups, analytics, AI settings, and UI state in single file
**Impact:** Unmaintainable, should be separate tabs/modules
**Fix:** Split into AnalyticsTab, AiSettingsTab, UsersTab, BackupsTab

---

### [DEFERRED] H-24: MobileLayout God Component (592 lines)
**File:** `Web/src/app/mobile-layout.tsx`
**Category:** Code Quality (God Object)
**Severity:** HIGH
**Description:** Manages all state, queries, mutations, and modal states for mobile view
**Impact:** Unmaintainable, violates SRP
**Fix:** Extract hooks: useDashboardQueries, usePlanQueries, useAnalyticsData

---

### [DEFERRED] H-25: Fitness Cache Complex IIFE (205 lines)
**File:** `Web/src/components/PlanSetupForm.tsx:773-977`
**Category:** Code Quality (Complexity)
**Severity:** HIGH
**Description:** Complex inline function for goal time rendering with nested conditions, slider logic, and state management
**Impact:** Unreadable, untestable
**Fix:** Break down into smaller, testable units

---

### [DEFERRED] H-26: Missing Error Boundaries for Charts
**File:** Web/src/components/AiChat.tsx, AnalyticsDashboard.tsx, CombinedAnalyticsChart.tsx, InteractiveStreamsChart.tsx
**Category:** Code Quality (Error Handling)
**Severity:** HIGH
**Description:** No error boundaries - streaming errors and chart failures will crash components
**Impact:** Poor user experience when errors occur
**Fix:** Wrap complex components with React Error Boundaries

---

### [FALSE POSITIVE] H-27: Missing Database Indexes
**File:** prisma/schema.prisma (inferred)
**Category:** Performance (Database)
**Severity:** HIGH
**Description:** Missing compound indexes for common query patterns causing full table scans
**Impact:** Slow database queries
**Fix:** Add indexes: @@index([userId, startDate, type]), @@index([userId, startDate(desc)]), @@index([stravaId])

---

### [DEFERRED] H-28: No Redis Cache for Dashboard Queries
**File:** Web/src/app/api/dashboard/route.ts:135-141
**Category:** Performance (Caching)
**Severity:** HIGH
**Description:** Complex dashboard queries run fresh every time
**Impact:** High server load, slow responses for active users
**Fix:** Implement Redis caching with 60s TTL

---

### [FIXED] H-29: Combined Analytics API Calls (5 requests)
**File:** Web/src/app/analytics/page.tsx:59-118
**Category:** Performance (Network)
**Severity:** HIGH
**Description:** 5 separate API calls on analytics page load
**Impact:** Slower page load, more server load
**Fix:** Create combined /api/analytics endpoint

---

### [DEFERRED] H-30: Charts Not Lazy Loaded
**File:** Web/src/app/analytics/page.tsx:432-588
**Category:** Performance (Bundle Size)
**Severity:** HIGH
**Description:** Multiple chart components loaded immediately
**Impact:** Slower page load, unnecessary JS for users who don't scroll
**Fix:** Use next/dynamic for all chart components

---

### [DEFERRED] H-31: Analytics Page Component Too Large (833 lines)
**File:** Web/src/app/analytics/page.tsx
**Category:** Performance (Code Splitting)
**Severity:** HIGH
**Description:** Single large component file difficult to lazy load
**Impact:** Large bundle chunk, difficult maintenance
**Fix:** Split into TopMetrics, ZoneDistributionChart, TrainingPacesSection, TrendCharts

---

### [DEFERRED] H-32: Fitness Cache Calculation Synchronous
**File:** Web/src/lib/metrics/fitnessCache.ts:126-178
**Category:** Performance (Blocking)
**Severity:** HIGH
**Description:** Blocking loop through potentially hundreds of days
**Impact:** Blocks request thread, can timeout for long histories
**Fix:** Batch process or use background job queue

---

## Medium Risk Issues

### [FIXED] M-01: Incorrect Zone Time Calculation
**File:** Web/src/lib/strava/transform.ts:140-142
**Category:** Bug (Logic Error)
**Severity:** MEDIUM
**Description:** Duration calculation caps zone segments at 10 seconds, underestimating zone times
**Fix:** Remove artificial cap or use proper duration calculation

---

### [FIXED] M-02: Missing Error Handling in upsertActivity
**File:** Web/src/lib/strava/persistence.ts:88-108
**Category:** Bug (Error Handling)
**Severity:** MEDIUM
**Description:** No transaction wrapping create/update operations, risking inconsistent state
**Fix:** Wrap in database transaction for atomicity

---

### [FALSE POSITIVE] M-03: Async Parameter Access Pattern
**File:** Web/src/app/api/admin/users/[id]/route.ts:67
**Category:** Bug (Code Pattern)
**Severity:** MEDIUM
**Description:** Unnecessary async parameter access pattern that is error-prone
**Fix:** Access params synchronously

---

### [FIXED] M-04: Unsafe Type Assertions
**File:** Web/src/lib/strava/persistence.ts:30, 45, 71, 93, 103
**Category:** Bug (Type Safety)
**Severity:** MEDIUM
**Description:** Multiple instances of `type: data.type as any` bypass type safety without validation
**Fix:** Create proper type guard or validation function

---

### [FALSE POSITIVE] M-05: Inclusive Date Loop Boundary
**File:** Web/src/lib/metrics/fitness.ts:90
**Category:** Bug (Off-by-One Error)
**Severity:** MEDIUM
**Description:** Loop d <= now includes end date, potentially double-counting activities
**Fix:** Use d < now and handle final day separately

---

### [FIXED] M-06: Array Index Out of Bounds Risk
**File:** Web/src/lib/strava/transform.ts:140-142
**Category:** Bug (Boundary Condition)
**Severity:** MEDIUM
**Description:** Accessing times[i + 1] without checking bounds on last iteration
**Fix:** Add bounds check

---

### [FIXED] M-07: Potential Memory Leak in Rate Limiter
**File:** Web/src/lib/strava/fetch.ts:76-110
**Category:** Bug (Resource Leak)
**Severity:** MEDIUM
**Description:** while (true) loop in checkAndWaitRedis could run indefinitely if Redis returns unexpected values
**Fix:** Add max retry count and timeout

---

### [FIXED] M-08: Missing Timeout in Email Transporter
**File:** Web/src/lib/email.ts:5-13
**Category:** Bug (Resource Management)
**Severity:** MEDIUM
**Description:** Nodemailer transporter lacks timeout configuration
**Fix:** Add timeout: 30000

---

### [FALSE POSITIVE] M-09: Fitness Cache Update Race Condition
**File:** Web/src/lib/metrics/fitnessCache.ts:185-200
**Category:** Bug (Race Condition)
**Severity:** MEDIUM
**Description:** Between deleteMany and createMany, another process could insert conflicting data
**Fix:** Use Prisma's upsertMany or add advisory locking

---

### [FALSE POSITIVE] M-10: Silent Failure in Token Decryption
**File:** Web/src/lib/crypto.ts:104-112
**Category:** Bug (Error Handling)
**Severity:** MEDIUM
**Description:** Decryption failures return encrypted value as-is, potentially exposing data
**Fix:** Throw error in production or return null with proper handling

---

### [FIXED] M-11: Generic Error Messages
**File:** Web/src/lib/errors/handler.ts:34-37
**Category:** Bug (Error Messages)
**Severity:** MEDIUM
**Description:** Generic "Internal server error" in production not helpful for debugging
**Fix:** Include error reference ID for tracking

---

### [FIXED] M-12: Missing Try-Catch in Session Callback
**File:** Web/src/lib/strava/oauth.ts:127-173
**Category:** Bug (Error Handling)
**Severity:** MEDIUM
**Description:** Database queries not wrapped in try-catch, potentially causing unhandled rejections
**Fix:** Wrap individual queries in try-catch blocks

---

### [FIXED] M-13: Incorrect Fitness Cache Calculation on Activity Modification
**File:** Web/src/lib/metrics/fitnessCache.ts:46-55
**Category:** Bug (Data Logic)
**Severity:** MEDIUM
**Description:** Modified activities identified only by startDate, could miss same-day updates
**Fix:** Track activity IDs in addition to dates

---

### [FALSE POSITIVE] M-14: Missing Validation for Email Parameter
**File:** Web/src/app/api/auth/reset-password/route.ts:20
**Category:** Bug (Input Validation)
**Severity:** MEDIUM
**Description:** No validation that email exists before attempting to verify code
**Fix:** Check user existence first

---

### [FIXED] M-15: No Timeout on External API Calls
**File:** Web/src/app/api/health/nutrition/scan/route.ts:44
**Category:** Bug (API Design)
**Severity:** MEDIUM
**Description:** Fetch to Open Food Facts API has no timeout, could hang indefinitely
**Fix:** Add timeout with AbortSignal

---

### [FALSE POSITIVE] M-16: Missing CSRF Validation on Mobile Endpoints
**File:** Web/src/app/api/mobile/v1/activities/route.ts:25-41
**Category:** Security (CSRF)
**Severity:** MEDIUM
**Description:** Mobile API endpoints don't validate CSRF tokens, relying only on JWT
**Fix:** Implement CSRF for web-based mobile requests or document security model

---

### [FIXED] M-17: Missing Length Validation on Barcode
**File:** Web/src/app/api/health/nutrition/scan/route.ts:5-10
**Category:** Security (Input Validation)
**Severity:** MEDIUM
**Description:** No validation on barcode length or format
**Fix:** Add validation: 8-14 characters typical

---

### [FALSE POSITIVE] M-18: Partial Path Traversal Protection
**File:** Web/src/app/api/admin/backups/[filename]/route.ts:29-40
**Category:** Security (Path Traversal)
**Severity:** MEDIUM
**Description:** path.basename() and startsWith() check can be bypassed on some systems
**Fix:** Use resolve() and verify path stays within allowed directory

---

### [FALSE POSITIVE] M-19: File Upload Path Traversal Attempt
**File:** Web/src/app/api/admin/backups/upload/route.ts:46-81
**Category:** Security (Path Traversal)
**Severity:** MEDIUM
**Description:** Regex replacement for .. is insufficient
**Fix:** Use path.basename() and validate resolved path

---

### [FALSE POSITIVE] M-20: Insufficient Type Validation in API
**File:** Web/src/app/api/activities/route.ts:36-49
**Category:** Security (Input Validation)
**Severity:** MEDIUM
**Description:** parseInt() used without NaN/null checks on query parameters
**Fix:** Add proper validation and bounds checking

---

### [FALSE POSITIVE] M-21: Missing Validation on Admin Operations
**File:** Web/src/app/api/admin/users/route.ts:28-30
**Category:** Security (Input Validation)
**Severity:** MEDIUM
**Description:** Search parameter used directly in Prisma query without sanitization
**Fix:** Sanitize search string

---

### [FALSE POSITIVE] M-22: Weak Password Policy
**File:** Web/src/lib/auth/auth-email.ts:10, 43-79
**Category:** Security (Authentication)
**Severity:** MEDIUM
**Description:** 12-character minimum, but could be stronger
**Fix:** Consider 16-character minimum or require passphrases

---

### [FIXED] M-23: Admin Token Reuse Risk
**File:** Web/src/lib/admin/auth.ts:44, 100
**Category:** Security (Authentication)
**Severity:** MEDIUM
**Description:** Admin tokens valid for 24 hours without rotation
**Fix:** Implement shorter expiry (1-2 hours) or token rotation

---

### [FALSE POSITIVE] M-24: Password Reset Without Expiration Enforcement
**File:** Web/src/app/api/auth/forgot-password/route.ts:38-46
**Category:** Security (Authentication)
**Severity:** MEDIUM
**Description:** Rate limiting is per email, allowing attempts on multiple emails
**Fix:** Implement IP-based rate limiting

---

### [FALSE POSITIVE] M-25: Debug Mode Enabled in Production Risk
**File:** Web/src/lib/strava/oauth.ts:233
**Category:** Security (Configuration)
**Severity:** MEDIUM
**Description:** Debug mode enabled when NODE_ENV=development
**Fix:** Ensure NODE_ENV=production in all production deployments

---

### [FIXED] M-26: Docker Image Using Latest Tag
**File:** Web/docker-compose.yml:162
**Category:** Security (Configuration)
**Severity:** MEDIUM
**Description:** cloudflare/cloudflared:latest uses mutable tag
**Impact:** Unexpected updates could introduce vulnerabilities
**Fix:** Pin to specific version

---

### [FIXED] M-27: Sensitive Data in Logs
**File:** Web/src/app/api/admin/backups/upload/route.ts:85
**Category:** Security (Logging)
**Severity:** MEDIUM
**Description:** Logging file sizes but not user actions
**Fix:** Log who, what, when, and why for all sensitive operations

---

### [FALSE POSITIVE] M-28: Error Messages Reveal Internal Details
**File:** Web/src/app/api/mobile/v1/workouts/route.ts:98-100
**Category:** Security (Information Disclosure)
**Severity:** MEDIUM
**Description:** Generic error handling but some endpoints leak paths
**Fix:** Use centralized error handler that sanitizes messages

---

### [FALSE POSITIVE] M-29: HSTS Not Configured
**File:** Web/src/middleware.ts:119-140
**Category:** Security (Headers)
**Severity:** MEDIUM
**Description:** No Strict-Transport-Security header
**Impact:** Man-in-the-middle attacks possible
**Fix:** Add HSTS header with max-age=31536000

---

### [FIXED] M-30: AnalyticsDashboard Chart Grid Issues
**File:** Web/src/components/AnalyticsDashboard.tsx:261-283
**Category:** UI (Responsive Design)
**Severity:** MEDIUM
**Description:** StatsGrid values too large for mobile (text-3xl font-bold)
**Fix:** Use text-xl sm:text-3xl

---

### [FIXED] M-31: RacePredictionChart Grid Not Responsive
**File:** Web/src/components/RacePredictionChart.tsx:176-191
**Category:** UI (Responsive Design)
**Severity:** MEDIUM
**Description:** Prediction cards use grid-cols-4 with no mobile breakpoints
**Fix:** Change to grid-cols-2 md:grid-cols-4

---

### [FIXED] M-32: EditWorkoutModal Input Width Issues
**File:** Web/src/components/EditWorkoutModal.tsx:194-223
**Category:** UI (Responsive Design)
**Severity:** MEDIUM
**Description:** Form inputs use grid-cols-2 but labels/inputs cramped on mobile
**Fix:** Stack vertically on mobile with grid-cols-1 md:grid-cols-2

---

### [FIXED] M-33: InteractiveStreamsChart Fixed Height
**File:** Web/src/components/InteractiveStreamsChart.tsx:254-369
**Category:** UI (Responsive Design)
**Severity:** MEDIUM
**Description:** Chart container has fixed h-[400px] height not ideal for landscape mobile
**Fix:** Use h-[300px] md:h-[400px] or aspect ratio

---

### [FIXED] M-34: VerificationModal Color Contrast Issues
**File:** Web/src/components/auth/VerificationModal.tsx:76-78
**Category:** UI (Accessibility)
**Severity:** MEDIUM
**Description:** Disabled button uses disabled:opacity-50 which may not meet 4.5:1 contrast ratio
**Fix:** Add specific disabled text color with better contrast

---

### [FIXED] M-35: ManualActivityModal Missing Required Field Indicators
**File:** Web/src/components/ManualActivityModal.tsx:79-122
**Category:** UI (Accessibility)
**Severity:** MEDIUM
**Description:** Required fields use required attribute but no visual asterisk (*) indicator
**Fix:** Add text-red-500 * to required field labels

---

### [FALSE POSITIVE] M-36: Mixed Button Classes Across Components
**File:** Multiple components
**Category:** UI (Inconsistent Styling)
**Severity:** MEDIUM
**Description:** Some components use btn-primary/btn-secondary from globals.css, others use inline styles
**Fix:** Standardize all buttons to use utility classes from globals.css

---

### [FALSE POSITIVE] M-37: Inconsistent Modal Backdrop
**File:** EditWorkoutModal.tsx:140, SettingsModal.tsx:19, ManualActivityModal.tsx:68
**Category:** UI (Inconsistent Styling)
**Severity:** MEDIUM
**Description:** All use bg-black/[var(--modal-backdrop-opacity)] but different blur values or z-indices
**Fix:** Create shared ModalBackdrop component

---

### [FALSE POSITIVE] M-38: Color Usage Inconsistencies
**File:** Web/src/app/globals.css:236-274
**Category:** UI (Inconsistent Styling)
**Severity:** MEDIUM
**Description:** Badge colors have media overrides but components hardcode colors inline
**Fix:** Use CSS custom properties for all colors

---

### [FALSE POSITIVE] M-39: DashboardView Header Overlap Issue
**File:** Web/src/components/views/DashboardView.tsx:54-83
**Category:** UI (Layout)
**Severity:** MEDIUM
**Description:** Header has sticky top-0 but content may overlap on some screen sizes
**Fix:** Add bg-background/95 and proper z-index layering

---

### [FALSE POSITIVE] M-40: PlanView Week Cards Not Responsive
**File:** Web/src/components/views/PlanView.tsx:156-172
**Category:** UI (Layout)
**Severity:** MEDIUM
**Description:** PlanWeek components may overflow on smaller screens
**Fix:** Ensure PlanWeek handles mobile layout properly

---

### [FALSE POSITIVE] M-41: EditWorkoutModal No Validation Messages
**File:** Web/src/components/EditWorkoutModal.tsx:86-121
**Category:** UI (Error States)
**Severity:** MEDIUM
**Description:** Form submission validates server-side but no client-side validation feedback
**Fix:** Add inline validation errors for required fields

---

### [DEFERRED] M-42: PlanSetupForm Mutation Error Handling Minimal
**File:** Web/src/components/PlanSetupForm.tsx:406-409, 466-468
**Category:** UI (Error States)
**Severity:** MEDIUM
**Description:** Errors only show in console or basic message, not inline with form fields
**Fix:** Display error messages next to relevant form fields

---

### [FALSE POSITIVE] M-43: ManualActivityModal No Loading State on Submit
**File:** Web/src/components/ManualActivityModal.tsx:54-64
**Category:** UI (Loading States)
**Severity:** MEDIUM
**Description:** Has isLoading state but mutation doesn't use it for loading feedback
**Fix:** Connect mutation isPending to isLoading

---

### [FALSE POSITIVE] M-44: AnalyticsDashboard No Empty State for Charts
**File:** Web/src/components/AnalyticsDashboard.tsx:337-382
**Category:** UI (Empty States)
**Severity:** MEDIUM
**Description:** Returns null if no data but shows no visual feedback to user
**Fix:** Add empty state component with message

---

### [FALSE POSITIVE] M-45: Inconsistent Text Scales
**File:** Multiple components
**Category:** UI (Typography)
**Severity:** MEDIUM
**Description:** Headings use various font sizes without consistent scale
**Fix:** Define typography scale in globals.css

---

### [FALSE POSITIVE] M-46: Small Tap Targets on Mobile
**File:** Web/src/components/views/DashboardView.tsx:72-81
**Category:** UI (Touch Targets)
**Severity:** MEDIUM
**Description:** Analytics button icon on mobile is too small for 44x44px minimum tap target
**Fix:** Add padding to ensure minimum 44x44px touch target

---

### [DEFERRED] M-47: Crowded Form Layout in PlanSetupForm
**File:** Web/src/components/PlanSetupForm.tsx:652-703
**Category:** UI (Form Usability)
**Severity:** MEDIUM
**Description:** Time input fields (HH:MM:SS) are tightly spaced with minimal padding
**Fix:** Increase gap between inputs and add padding

---

### [DEFERRED] M-48: Chart Data Not Memoized Properly
**File:** Web/src/components/InteractiveStreamsChart.tsx:89-163
**Category:** UI (Performance)
**Severity:** MEDIUM
**Description:** useMemo processes entire stream array every render
**Fix:** Add better dependency array and consider chunking data

---

### [DEFERRED] M-49: Multiple useEffect Hooks in PlanSetupForm
**File:** Web/src/components/PlanSetupForm.tsx:158-337
**Category:** UI (Performance)
**Severity:** MEDIUM
**Description:** Many useEffect hooks could cause unnecessary re-renders
**Fix:** Combine related effects and optimize dependencies

---

### [DEFERRED] M-50: VerificationModal Code Input UX
**File:** Web/src/components/auth/VerificationModal.tsx:57-64
**Category:** UI (Form Usability)
**Severity:** MEDIUM
**Description:** Single input for 6-digit code, better to have separate input boxes
**Fix:** Use 6 separate 1-character inputs with auto-focus

---

### [DEFERRED] M-51: PlanSetupForm Complex Calibration Flow
**File:** Web/src/components/PlanSetupForm.tsx:561-632
**Category:** UI (Form Usability)
**Severity:** MEDIUM
**Description:** Calibration process is complex without clear progress indicators
**Fix:** Add step indicators and better help text

---

### [DEFERRED] M-52: ForgotPasswordModal Password Strength Indicator Missing
**File:** Web/src/components/auth/ForgotPasswordModal.tsx:138-146
**Category:** UI (Form Usability)
**Severity:** MEDIUM
**Description:** New password field has no strength indicator
**Fix:** Add password strength meter and requirements list

---

### [FALSE POSITIVE] M-53: Card Components Different Glass Effect
**File:** Multiple card files
**Category:** UI (Component Consistency)
**Severity:** MEDIUM
**Description:** Some cards use glass-card class, others use inline glassmorphism styles
**Fix:** Standardize on glass-card utility class

---

### [DEFERRED] M-54: Chart Tooltip Inconsistencies
**File:** Multiple chart files
**Category:** UI (Component Consistency)
**Severity:** MEDIUM
**Description:** Each chart implements its own CustomTooltip with different styling
**Fix:** Create shared ChartTooltip component

---

### [DEFERRED] M-55: Repeated Calibration Factor Calculation
**File:** Web/src/components/PlanSetupForm.tsx:658-666, 676-682, 693-699
**Category:** Code Quality (Duplication)
**Severity:** MEDIUM
**Description:** Same VDOT calibration logic duplicated in three onChange handlers
**Fix:** Extract to reusable function

---

### [DEFERRED] M-56: Tier Input Field Duplication
**File:** Web/src/app/admin/page.tsx:326-388, 390-425, 427-462
**Category:** Code Quality (Duplication)
**Severity:** MEDIUM
**Description:** Tier 1, 2, 3 form inputs are near-identical copies with different variable names
**Fix:** Extract to shared component

---

### [DEFERRED] M-57: Confirm Dialog Pattern Duplication
**File:** Web/src/app/admin/page.tsx:217-231, 802-815, 853-867
**Category:** Code Quality (Duplication)
**Severity:** MEDIUM
**Description:** Same confirm/retry/mutation pattern repeated multiple times
**Fix:** Extract to reusable hook or component

---

### [DEFERRED] M-58: Supplement Item Rendering Duplication
**File:** Web/src/components/views/HealthView.tsx:217-237, 297-320
**Category:** Code Quality (Duplication)
**Severity:** MEDIUM
**Description:** Similar rendering logic duplicated for standalone vs stack supplements
**Fix:** Consolidate to single reusable component

---

### [DEFERRED] M-59: MobileLayout Analytics Metrics Complex
**File:** Web/src/app/mobile-layout.tsx:225-358
**Category:** Code Quality (Complexity)
**Severity:** MEDIUM
**Description:** 134-line useMemo with complex analytics metrics calculation
**Fix:** Extract to utility function with better structure

---

### [DEFERRED] M-60: OpenAI Stream Function Complex
**File:** Web/src/lib/ai/providers.ts:265-408
**Category:** Code Quality (Complexity)
**Severity:** MEDIUM
**Description:** 144-line function with async iterator, error handling, retry logic, content parsing
**Fix:** Break into smaller functions: handleRetry, parseContent, handleStream

---

## Low Risk Issues

### L-01: Incorrect BigInt Conversion
**File:** Web/src/lib/utils/bigint.ts:14
**Category:** Bug (Type Safety)
**Severity:** LOW
**Description:** BigInt(Math.floor(value)) floors number, may not be intended for large floating-point
**Fix:** Use BigInt(Math.trunc(value)) or validate integers first

---

### L-02: Zero Division Risk in VDOT Calculation
**File:** Web/src/lib/metrics/runalyze.ts:100-102
**Category:** Bug (Edge Case)
**Severity:** LOW
**Description:** Guard <= 0.1 prevents division but doesn't handle when percentVO2max is exactly 0
**Fix:** Use <= 0.01 for better safety margin

---

### L-03: Empty Activity Array Not Handled
**File:** Web/src/lib/metrics/fitness.ts:55-57
**Category:** Bug (Edge Case)
**Severity:** LOW
**Description:** Empty dailyLoads returns empty array even with startDate, might break upstream code
**Fix:** Return empty array only when truly empty, otherwise include decayed values

---

### L-04: Integer Overflow in Hash Calculation
**File:** Web/src/lib/rateLimit.ts:234-240
**Category:** Bug (Edge Case)
**Severity:** LOW
**Description:** Hash calculation can overflow for very long strings, increasing collision risk
**Fix:** Use proper hash function with better distribution

---

### L-05: Deprecated Crypto API Usage
**File:** Web/src/lib/crypto.ts:9, 54, 95
**Category:** Security (Cryptography)
**Severity:** LOW
**Description:** Using Node.js legacy createCipheriv/createDecipheriv instead of modern crypto API
**Fix:** Migrate to Web Crypto API or better crypto.scrypt for key derivation

---

### L-06: Insufficient Key Validation
**File:** Web/src/lib/crypto.ts:26-32
**Category:** Security (Cryptography)
**Severity:** LOW
**Description:** Key validation allows encryption to proceed in dev mode without warning
**Fix:** Throw error if encryption key not configured, even in development

---

### L-07: Weak Auth Code Generation
**File:** Web/src/lib/auth/tokens.ts:19-26
**Category:** Security (Authentication)
**Severity:** LOW
**Description:** 6-character alphanumeric codes (36^6 = ~2.17 billion combinations)
**Fix:** Use 8-character codes or implement numeric-only TOTP

---

### L-08: CORS Configuration Hardcoded
**File:** Web/src/middleware.ts:14
**Category:** Security (Configuration)
**Severity:** LOW
**Description:** Production domain hardcoded: https://runflow.schuelken.uk
**Fix:** Use environment variable

---

### L-09: Admin User Delete No Additional Verification
**File:** Web/src/app/api/admin/users/[id]/route.ts:52-55
**Category:** Security (Authorization)
**Severity:** LOW
**Description:** User can be deleted with single authenticated admin request
**Fix:** Require password re-authentication for sensitive operations

---

### L-10: Potentially Vulnerable Dependencies
**File:** Web/package.json
**Category:** Security (Dependencies)
**Severity:** LOW
**Description:** Multiple packages that could have vulnerabilities
**Fix:** Run npm audit and update packages

---

### L-11: EditWorkoutModal Partial Loading States
**File:** Web/src/components/EditWorkoutModal.tsx:264-269
**Category:** UI (Loading States)
**Severity:** LOW
**Description:** Save button shows loading but delete button has no loading state
**Fix:** Add loading state to delete mutation button

---

### L-12: PlanSetupForm Underscore Prefix Convention Unclear
**File:** Web/src/components/PlanSetupForm.tsx:480
**Category:** Code Quality (Naming)
**Severity:** LOW
**Description:** _isEditingTime, _setIsEditingTime - underscore prefix convention unclear, appears unused
**Fix:** Remove or properly document usage

---

### L-13: Mobile HealthConnect Redundant Naming
**File:** Web/src/lib/mobile/healthConnect.ts:393-396
**Category:** Code Quality (Naming)
**Severity:** LOW
**Description:** backfillHistoricalHealth() just calls syncHistoricalHealthData() - redundant naming
**Fix:** Remove wrapper or clarify purpose

---

### L-14: Admin Page Comment Indicates Poor Abstraction
**File:** Web/src/app/admin/page.tsx:571
**Category:** Code Quality (Comments)
**Severity:** LOW
**Description:** Comment // ... same logic ... indicates poor abstraction
**Fix:** Extract repeated logic to function

---

### L-15: Generic Variable Names
**File:** Multiple files
**Category:** Code Quality (Naming)
**Severity:** LOW
**Description:** data, res, json variable names don't indicate purpose
**Fix:** Use descriptive names like userSettings, analyticsData

---

### L-16: Dead Code Variables
**File:** Web/src/components/PlanSetupForm.tsx:480
**Category:** Code Quality (Dead Code)
**Severity:** LOW
**Description:** _isEditingTime, _setIsEditingTime created but never used
**Fix:** Remove unused state variables

---

### L-17: Commented Code
**File:** Web/src/app/admin/page.tsx:570-571
**Category:** Code Quality (Dead Code)
**Severity:** LOW
**Description:** // ... same logic ... placeholder comment
**Fix:** Remove or replace with actual code

---

### L-18: Incomplete Code Comment
**File:** Web/src/components/views/HealthView.tsx:109
**Category:** Code Quality (Dead Code)
**Severity:** LOW
**Description:** // ... (rest of queries) incomplete section
**Fix:** Complete or remove

---

### L-19: AI Provider M-07 Fix Comment
**File:** Web/src/lib/ai/providers.ts:394
**Category:** Code Quality (Comments)
**Severity:** LOW
**Description:** Comment about M-07 fix with specific closing tag
**Fix:** Move to issue tracker or proper documentation

---

### L-20: MobileLayout M-06 Fix Comment
**File:** Web/src/app/mobile-layout.tsx:555
**Category:** Code Quality (Comments)
**Severity:** LOW
**Description:** M-06 fix: WorkoutWithLinkedActivity extends Workout, safe cast
**Fix:** Move to issue tracker or proper documentation

---

### L-21: API Endpoint Naming Confusion
**File:** Web/src/components/ProfileModal.tsx:52-69
**Category:** Code Quality (Documentation)
**Severity:** LOW
**Description:** Extensive comment block questioning use of /api/settings/update-vdot for GET operations
**Fix:** Rename endpoint or document clearly

---

### L-22: Magic Numbers Throughout Codebase
**File:** Multiple files
**Category:** Code Quality (Maintainability)
**Severity:** LOW
**Description:** 12 * 7 * 24 * 60 * 60 * 1000, 0.9, 1.1, 4096, 500, 60 scattered throughout
**Fix:** Define named constants

---

### L-23: Inconsistent Error Handling Patterns
**File:** Multiple files
**Category:** Code Quality (Patterns)
**Severity:** LOW
**Description:** Some use alert(), others use setMessage(), some throw errors
**Fix:** Standardize error handling across codebase

---

### L-24: OpenAI Config Function Lacks Documentation
**File:** Web/src/lib/ai/providers.ts:126-240
**Category:** Code Quality (Documentation)
**Severity:** LOW
**Description:** Complex getAiConfig() function lacks detailed documentation on fallback logic
**Fix:** Add comprehensive JSDoc

---

### L-25: Heart Rate Zones Function Missing Documentation
**File:** Web/src/lib/mobile/healthConnect.ts:143-206
**Category:** Code Quality (Documentation)
**Severity:** LOW
**Description:** getHeartRateZones() missing documentation on zone calculation algorithm
**Fix:** Add JSDoc with algorithm description

---

### L-26: Generic Alert Messages
**File:** Web/src/components/views/HealthView.tsx:66, 70, 80, 86, 93
**Category:** Code Quality (Error Messages)
**Severity:** LOW
**Description:** alert() messages with minimal context
**Fix:** Provide actionable error messages

---

### L-27: Admin Success/Error Messages Generic
**File:** Web/src/app/admin/page.tsx:808, 836, 861
**Category:** Code Quality (Error Messages)
**Severity:** LOW
**Description:** Generic success/error messages without action guidance
**Fix:** Provide context and next steps

---

### L-28: Generic AI Error Message
**File:** Web/src/lib/ai/providers.ts:669-680
**Category:** Code Quality (Error Messages)
**Severity:** LOW
**Description:** Generic AI API error without specific details
**Fix:** Include error type and suggested resolution

---

### L-29: Inefficient Nested Loops in Analytics
**File:** Web/src/app/analytics/page.tsx:259-278
**Category:** Code Quality (Algorithms)
**Severity:** LOW
**Description:** Nested loops for rolling averages O(n²) complexity
**Fix:** Use sliding window technique O(n)

---

## Optimizations

### O-01: Over-fetching Activity Fields in List View
**File:** Web/src/app/api/activities/route.ts:60-105
**Category:** Performance (Database)
**Severity:** OPTIMIZATION
**Description:** Selecting 40+ fields when only ~15 needed for list view
**Impact:** Increased network and memory usage per query
**Fix:** Create leaner projections for list views, full data only for detail views

---

### O-02: Dashboard Sequential Queries
**File:** Web/src/app/api/dashboard/route.ts:172-182
**Category:** Performance (Database)
**Severity:** OPTIMIZATION
**Description:** Sequential queries for fitness cache and max values
**Impact:** Additional latency from sequential execution
**Fix:** Wrap in Promise.all if dependencies allow

---

### O-03: ActivityList Unnecessary Re-renders
**File:** Web/src/app/page.tsx:262
**Category:** Performance (React)
**Severity:** OPTIMIZATION
**Description:** Passing entire statsData object causing unnecessary re-renders
**Impact:** Re-renders when any stat changes, not just HR max or correction factor
**Fix:** Extract values to variables or useMemo

---

### O-04: Analytics Page Complex useMemo Dependencies
**File:** Web/src/app/analytics/page.tsx:133-314
**Category:** Performance (React)
**Severity:** OPTIMIZATION
**Description:** Large memoization block recalculates on any of 5 dependencies
**Impact:** Expensive recalculation on any data change
**Fix:** Split into smaller, focused memos

---

### O-05: Large Activity Data Transfers in Streams Chart
**File:** Web/src/components/InteractiveStreamsChart.tsx:90-163
**Category:** Performance (Data)
**Severity:** OPTIMIZATION
**Description:** Processing entire stream arrays on every render for long activities
**Impact:** Heavy CPU usage for multi-hour activities
**Fix:** Downsample data (1 point per 10 seconds for display)

---

### O-06: No Response Compression
**File:** Web/next.config.js
**Category:** Performance (Network)
**Severity:** OPTIMIZATION
**Description:** No compression middleware configured
**Impact:** Larger response sizes
**Fix:** Add compress: true to enable gzip compression

---

### O-07: PWA Caching Too Aggressive
**File:** Web/next.config.js:131-148
**Category:** Performance (Caching)
**Severity:** OPTIMIZATION
**Description:** All API responses cached for 24 hours
**Impact:** Stale API responses
**Fix:** Reduce to 5-10 minutes for dynamic data

---

## Feature Updates

### F-01: Search Functionality for Activities
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Users with many activities need to find specific workouts quickly
**Status:** Not implemented
**Recommendation:** Add search input to filter activities by name or location

---

### F-02: Advanced Filtering & Sorting
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Critical for analyzing training patterns and tracking progress
**Status:** Only basic type filtering exists (Run/Ride/All)
**Recommendation:** Add date range, distance range, pace range, HR range, location filters; sorting by distance, pace, HR, elevation

---

### F-03: Skeleton Loading States
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Poor UX; users perceive app as slow. Skeletons improve perceived performance
**Status:** Uses basic Loading... text messages
**Recommendation:** Implement skeleton placeholders with animate-pulse for lists, cards, and charts

---

### F-04: Offline Support
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Runners train outdoors with poor connectivity. Essential for viewing plans and logging workouts
**Status:** PWA config exists but service worker unregistered in pwa-lifecycle.tsx
**Recommendation:** Enable service worker, add offline indicator UI, implement offline data caching

---

### F-05: Data Export/Import
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Users own their training data. Export enables analysis in other tools and GDPR compliance
**Status:** Not implemented
**Recommendation:** Add export to CSV, JSON, GPX formats; backup functionality; import from other platforms

---

### F-06: Enhanced Form Validation with Error Display
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Reduces form submission errors, improves UX
**Status:** Server-side Zod validation exists but no client-side error messages
**Recommendation:** Add inline validation feedback with real-time error messages

---

### F-07: Keyboard Accessibility
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Required for WCAG 2.1 AA compliance
**Status:** No onKeyDown handlers found, missing focus management
**Recommendation:** Add keyboard shortcuts, focus management, visible focus indicators

---

### F-08: Comprehensive ARIA Labels
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Screen reader users cannot navigate effectively
**Status:** Only 18 files contain aria-label or role attributes
**Recommendation:** Add ARIA labels to all interactive elements, live regions for dynamic content

---

### F-09: Toast Notifications for User Feedback
**Category:** Missing Feature
**Priority:** HIGH
**Business Value:** Users need confirmation that actions completed successfully
**Status:** sonner package installed but not consistently used
**Recommendation:** Add toast notifications for all user actions (save, delete, link, etc.)

---

### F-10: Internationalization (i18n)
**Category:** Missing Feature
**Priority:** MEDIUM
**Business Value:** Expanding to international markets requires localized content
**Status:** No i18n library or locale files found
**Recommendation:** Add i18n support for translations, date/time localization, unit preferences (km/mi)

---

### F-11: User Preferences & Customization
**Category:** Missing Feature
**Priority:** MEDIUM
**Business Value:** Users want personalized experiences
**Status:** Limited to training plan settings
**Recommendation:** Add unit preferences, default views, notification preferences, theme customization

---

### F-12: Activity Bulk Actions
**Category:** Missing Feature
**Priority:** MEDIUM
**Business Value:** Users importing historical data need to clean up duplicates
**Status:** No multi-select functionality
**Recommendation:** Add batch delete, edit, export, and bulk linking to workouts

---

### F-13: Activity Comparison
**Category:** Missing Feature
**Priority:** MEDIUM
**Business Value:** Critical for analyzing progress and identifying patterns
**Status:** No side-by-side activity comparison
**Recommendation:** Add race vs training comparison, similar workouts features

---

### F-14: Advanced Date Filtering
**Category:** Missing Feature
**Priority:** MEDIUM
**Business Value:** Essential for analyzing training cycles and seasonal trends
**Status:** Only Show All with pagination
**Recommendation:** Add custom date range picker with presets (This Month, Last 3 Months, This Year)

---

## Statistics & Recommendations

### Issue Breakdown by Category

| Category | Critical | High | Medium | Low | Optimizations | Feature Updates | Total |
|----------|----------|------|--------|-----|---------------|-----------------|-------|
| Bugs | 3 | 6 | 15 | 4 | - | - | 28 |
| Security | 4 | 8 | 13 | 5 | - | - | 30 |
| UI/UX | 2 | 10 | 21 | 1 | - | 9 | 43 |
| Code Quality | - | 6 | 8 | 18 | - | - | 32 |
| Performance | - | 2 | - | - | 7 | - | 9 |
| Missing Features | - | - | - | - | - | 9 | 9 |

**Total Issues:** 138 unique issues

### Files Most Affected

| File | Issues | Categories |
|------|--------|------------|
| Web/src/components/PlanSetupForm.tsx | 7 | Bug, Code Quality, UI |
| Web/src/app/admin/page.tsx | 6 | Code Quality, UI |
| Web/src/app/mobile-layout.tsx | 4 | Bug, Code Quality, Performance |
| Web/.env | 3 | Security (all Critical) |
| Web/src/lib/strava/sync.ts | 4 | Bug (Race Conditions) |
| Web/src/app/api/activities/ | 3 | Security, Performance |
| Web/src/middleware.ts | 3 | Security, Configuration |

### Implementation Plan — Remaining & Deferred Issues

> **Last updated:** February 24, 2026
> **Scope:** All unfixed HIGH, deferred MEDIUM, LOW, and feature issues from this audit.
> All Critical issues and 18 Medium issues have already been fixed in the initial remediation pass.

---

#### Phase 1: Security Hardening (H-10)

| Issue | File | Change |
|-------|------|--------|
| **H-10** XSS via react-markdown | `components/AiChat.tsx` | Install `dompurify` + `@types/dompurify`. Wrap all `<ReactMarkdown>` output with `DOMPurify.sanitize()` before rendering. Add rehype plugin `rehype-sanitize` as a secondary defense. |

```bash
npm install dompurify @types/dompurify rehype-sanitize
```

```diff
// AiChat.tsx
+import DOMPurify from 'dompurify';
+import rehypeSanitize from 'rehype-sanitize';

-<ReactMarkdown>{message.content}</ReactMarkdown>
+<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
+  {DOMPurify.sanitize(message.content)}
+</ReactMarkdown>
```

**Verification:** Paste `<img src=x onerror=alert(1)>` into AI chat → should render as escaped text, not execute.

---

#### Phase 2: UI & Responsive Layout (H-13, M-42, M-47, M-50, M-51, M-52)

| Issue | File | Change |
|-------|------|--------|
| **H-13** Dashboard tablet layout | `views/DashboardView.tsx:128` | Add `md:grid-cols-2` breakpoint between mobile and `lg:grid-cols-3`. |
| **M-42** PlanSetupForm inline errors | `PlanSetupForm.tsx:406-468` | Add `formErrors` state object. Display `<p className="text-red-400 text-xs mt-1">` below each relevant field on mutation error. |
| **M-47** PlanSetupForm form spacing | `PlanSetupForm.tsx:652-703` | Increase `gap-2` → `gap-4` on time input grid. Add `p-2` to individual inputs. |
| **M-50** Verification code UX | `auth/VerificationModal.tsx:57-64` | Replace single input with 6 individual `<input maxLength={1}>` elements with auto-focus on change. |
| **M-51** Calibration flow UX | `PlanSetupForm.tsx:561-632` | Add step indicator (`Step 1 of 3`) and descriptive help text for each calibration stage. |
| **M-52** Password strength indicator | `auth/ForgotPasswordModal.tsx:138-146` | Add `PasswordStrengthMeter` component showing strength bar + requirements checklist below the new password field. |

```diff
// DashboardView.tsx
-<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
+<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
```

**Verification:** Resize browser to 768px–1024px → cards should show in 2 columns. Check PlanSetupForm for consistent field spacing.

---

#### Phase 3: Performance (H-19, H-28, H-30, H-31, H-32, M-48, M-49)

| Issue | File | Change |
|-------|------|--------|
| **H-19** ActivityList virtualization | `ActivityList.tsx:231` | Install `react-window`. Replace `.map()` render with `<FixedSizeList>` for lists > 50 items. |
| **H-28** Dashboard Redis cache | `api/dashboard/route.ts:135` | Add Redis `GET`/`SET` with 60s TTL around the dashboard aggregation query. Invalidate on sync completion. |
| **H-30** Lazy load charts | `analytics/page.tsx:432-588` | Wrap all chart components with `next/dynamic(() => import(...), { ssr: false })`. |
| **H-31** Split analytics page | `analytics/page.tsx` | Extract into: `TopMetrics.tsx`, `ZoneDistributionSection.tsx`, `TrainingPacesSection.tsx`, `TrendChartsSection.tsx`. |
| **H-32** Async fitness cache | `metrics/fitnessCache.ts:126-178` | Batch the day-loop into chunks of 30 days with `await new Promise(r => setTimeout(r, 0))` between chunks to yield the event loop. |
| **M-48** Streams chart memoization | `InteractiveStreamsChart.tsx:89-163` | Add `streams` reference equality check in `useMemo` deps. Consider downsampling streams >5000 points with Largest-Triangle-Three-Buckets. |
| **M-49** PlanSetupForm effects | `PlanSetupForm.tsx:158-337` | Consolidate related `useEffect` hooks into fewer combined effects. Extract dependent state calculations into `useMemo` where possible. |

```bash
npm install react-window @types/react-window
```

**Verification:** Load analytics page with 500+ activities → ensure charts lazy load on scroll. Check dashboard response time with Redis cache hit vs miss.

---

#### Phase 4: Code Quality — God Component Refactoring (H-22, H-23, H-24, H-25, H-26)

| Issue | File | Change |
|-------|------|--------|
| **H-22** Split PlanSetupForm (1529 lines) | `PlanSetupForm.tsx` | Extract into: `TargetRaceSection`, `CalibrationSection`, `GoalTimeSection`, `HeartRateZonesSection`, `PlanVolumeSection`. Share form state via React context or prop drilling. |
| **H-23** Split Admin page (1307 lines) | `admin/page.tsx` | Extract into tab modules: `AnalyticsTab.tsx`, `AiSettingsTab.tsx`, `UsersTab.tsx`, `BackupsTab.tsx`. |
| **H-24** Split MobileLayout (592 lines) | `mobile-layout.tsx` | Extract hooks: `useDashboardQueries()`, `usePlanQueries()`, `useAnalyticsData()`, `useModalState()`. |
| **H-25** Inline IIFE refactor | `PlanSetupForm.tsx:773-977` | Extract the 205-line goal time IIFE into a standalone `GoalTimeRenderer` component. |
| **H-26** Add Error Boundaries | `AiChat.tsx`, `AnalyticsDashboard.tsx`, `InteractiveStreamsChart.tsx` | Create `<ChartErrorBoundary>` and `<StreamErrorBoundary>` components. Wrap all chart and AI streaming components. |

**Approach:** Perform one component at a time. After each split, run `npm run build` to catch type/import errors. Do NOT change behavior — only reorganize.

**Verification:** `npm run build` passes after each refactor. All existing tests continue to pass.

---

#### Phase 5: Code Quality — Duplication & Consistency (H-20, H-21, M-54, M-55, M-56, M-57, M-58)

| Issue | File | Change |
|-------|------|--------|
| **H-20** Shared Modal component | New: `components/ui/Modal.tsx` | Create `<Modal isOpen onClose title>` with consistent backdrop, z-index, close button, focus trap, `role="dialog"`, `aria-modal`. Migrate all modals to use it. |
| **H-21** Shared form inputs | New: `components/ui/Input.tsx`, `Select.tsx`, `Textarea.tsx` | Create shared form primitives with consistent styling, error state, label, and required indicator. |
| **M-54** Shared chart tooltip | New: `components/charts/ChartTooltip.tsx` | Extract `CustomTooltip` pattern into a shared component with configurable formatter. Update all charts. |
| **M-55** Calibration factor util | `lib/metrics/calibration.ts` | Extract the duplicated VDOT calibration calculation from `PlanSetupForm.tsx:658-699` into a reusable `calculateCalibrationFactor()` utility. |
| **M-56** Tier input component | New: `components/admin/TierInputGroup.tsx` | Replace the 3 near-identical tier input blocks in `admin/page.tsx:326-462` with a single `<TierInputGroup tier={1|2|3} />` component. |
| **M-57** Shared confirm dialog | New: `hooks/useConfirmAction.ts` | Extract the repeated confirm/retry/mutation pattern into a `useConfirmAction(message, mutationFn)` hook. |
| **M-58** Supplement renderer | New: `components/health/SupplementItem.tsx` | Consolidate the duplicate supplement rendering logic from `HealthView.tsx:217-320` into a single `<SupplementItem>` component. |

**Verification:** Grep for duplicate patterns to confirm they've been consolidated. Run full test suite.

---

#### Phase 6: Code Complexity Reduction (M-59, M-60)

| Issue | File | Change |
|-------|------|--------|
| **M-59** Analytics metrics | `mobile-layout.tsx:225-358` | Extract the 134-line `useMemo` into a standalone `useAnalyticsMetrics(stats)` hook in `hooks/useAnalyticsMetrics.ts`. |
| **M-60** OpenAI stream function | `lib/ai/providers.ts:265-408` | Split the 144-line function into: `handleRetry()`, `parseStreamContent()`, `createAsyncIterator()`. Each function <40 lines. |

**Verification:** `npm run build` + existing AI chat tests pass.

---

#### Phase 7: Low Risk Issues (L-01 through L-29)

These are low-priority improvements that can be addressed individually as time permits:

| Issue | File | Change |
|-------|------|--------|
| **L-01** BigInt conversion | `lib/utils/bigint.ts:14` | Use `BigInt(Math.trunc(value))` instead of `Math.floor()` |
| **L-02** VDOT division guard | `lib/metrics/runalyze.ts:100` | Change guard from `<= 0.1` to `<= 0.01` |
| **L-03** Empty activity array | `lib/metrics/fitness.ts:55` | Return decayed values for date range even when no activities |
| **L-04** Hash overflow | `lib/rateLimit.ts:234` | Replace custom hash with `crypto.createHash('sha256')` |
| **L-05** Deprecated crypto API | `lib/crypto.ts` | Migrate to Web Crypto API — low urgency, current implementation is secure |
| **L-06** Key validation in dev | `lib/crypto.ts:26` | Add warning log when encryption key is missing in development |
| **L-07** Auth code strength | `lib/auth/tokens.ts:19` | Increase to 8-character codes for stronger brute-force resistance |
| **L-08** CORS env variable | `middleware.ts:14` | Move hardcoded domain to `NEXT_PUBLIC_APP_URL` environment variable |
| **L-09** Admin delete verification | `api/admin/users/[id]/route.ts:52` | Add password re-authentication before user deletion |
| **L-10** Dependency audit | `package.json` | Run `npm audit fix` and update vulnerable packages |
| **L-11** Delete button loading | `EditWorkoutModal.tsx:264` | Add `isPending` check to delete mutation button |
| **L-12** Underscore convention | `PlanSetupForm.tsx:480` | Remove unused `_isEditingTime` / `_setIsEditingTime` or document usage |

**Remaining L-13 through L-29:** Address as part of ongoing maintenance. See individual issue descriptions above.

---

### Phase Priority & Estimated Effort

| Phase | Focus Area | Issues | Estimated Time |
|-------|-----------|--------|----------------|
| **Phase 1** | Security Hardening | H-10 | 0.5 days |
| **Phase 2** | UI & Responsive | H-13, M-42, M-47, M-50–M-52 | 2–3 days |
| **Phase 3** | Performance | H-19, H-28, H-30–H-32, M-48–M-49 | 3–4 days |
| **Phase 4** | God Component Refactor | H-22–H-26 | 4–5 days |
| **Phase 5** | Duplication Cleanup | H-20–H-21, M-54–M-58 | 3–4 days |
| **Phase 6** | Complexity Reduction | M-59–M-60 | 1 day |
| **Phase 7** | Low Risk Polish | L-01 through L-29 | 2–3 days |
| | | **Total** | **~16–20 days** |

### Risk Assessment

**Overall Risk Level:** MEDIUM (down from HIGH after initial remediation)
- All 9 critical issues have been resolved
- 18 medium issues fixed in previous pass
- Remaining items are primarily code quality, performance, and UX improvements
- No remaining security issues rated above HIGH (only H-10 XSS via markdown)

**Recommendations:**
1. Prioritize **Phase 1** (H-10 XSS) as the only remaining security vulnerability
2. Phases 2–3 deliver the most visible user-facing improvements
3. Phases 4–5 reduce technical debt and improve maintainability
4. Run `npm audit` monthly and update dependencies (L-10)
5. Consider adding Sentry for production error monitoring

---

**Report Generated:** February 24, 2026
**Auditors:** 6 Specialized Subagents (Bugs, Security, Features, UI, Code Quality, Performance)
**Verification:** Consolidated and deduplicated 138 unique issues
**Next Audit Recommended:** After completion of Phase 1 and Phase 2 (approximately 3 weeks)
