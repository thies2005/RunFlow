# Android App Migration & Compatibility Report

**Date:** 2026-01-13
**Status:** REQUIRED ACTIONS
**Priority:** CRITICAL

## Executive Summary

Audit of the Web API implementation against the Android compatibility requirements has revealed a **Critical Data Type Mismatch** regarding Object IDs. The Web API uses alphanumeric strings (CUIDs), while the Android app expects Long integers. **This will cause the Android app to crash upon parsing most API responses.**

Immediate migration of the Android data layer is required before full integration.

---

## 1. CRITICAL: Migrate ID Types to String

**Problem:**
The Web API uses CUIDs (Collision-resistant Unique Identifiers) which are alphanumeric strings (e.g., `clq2p4x...`).
The Android `User`, `Activity`, `Goal`, and `Workout` models currently use `Long`.

**Impact:**
JSON parsing exception (`NumberFormatException`) whenever the API returns an ID.

**Action Required:**
Update all Data Classes and Room Entities in the Android project.

### 1.1 User Model
**File:** `data/model/UserModels.kt` / `data/local/entity/UserEntity.kt`
```kotlin
// BEFORE
data class User(
    val id: Long, // ❌ Incompatible
    // ...
)

// AFTER
data class User(
    val id: String, // ✅ Correct
    // ...
)
```

### 1.2 Activity Model
**File:** `data/model/ActivityModels.kt` / `data/local/entity/ActivityEntity.kt`
```kotlin
// BEFORE
data class Activity(
    val id: Long, // ❌ Incompatible
    val stravaId: Long, // ✅ Compatible (BigInt sent as String, parsable to Long)
    // ...
)

// AFTER
data class Activity(
    val id: String, // ✅ Correct
    val stravaId: Long, // Keep as Long
    // ...
)
```

### 1.3 Goal & Workout Models
**File:** `data/model/GoalModels.kt`
- Ensure `Goal.id`, `Goal.userId`, `Workout.id`, and `Workout.goalId` are all `String`.

---

## 2. Implement Standardized Error Handling

**Problem:**
The Web API now returns a consistent error format for all 4xx/5xx responses. The Android app needs to handle this to show meaningful error messages to users.

**New Error JSON Structure:**
```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE_ENUM", // e.g. "UNAUTHORIZED", "RATE_LIMITED"
  "timestamp": "ISO-8601-String",
  "details": { ... } // Optional object
}
```

**Action Required:**
Update `ApiErrorHandler.kt` to parse this structure.

```kotlin
data class ApiErrorResponse(
    val error: String,
    val code: String,
    val timestamp: String,
    val details: Map<String, Any>?
)
```

---

## 3. Support Pagination (hasMore)

**Problem:**
The `/activities` endpoint now provides a `hasMore` boolean to indicate if more pages exist. This replaces relies on checking if `returned_count < limit`.

**Action Required:**
Update `ActivitiesResponse` data class and pagination logic.

**File:** `data/model/ActivityModels.kt`
```kotlin
data class ActivitiesResponse(
    val activities: List<Activity>,
    val total: Int,
    val limit: Int,
    val offset: Int,
    val hasMore: Boolean // ✅ NEW: Use this for "Load More" logic
)
```

---

## 4. Enum Alignment

Ensure `RaceType` enum matches the server exactly.

**File:** `data/model/GoalModels.kt`
```kotlin
enum class RaceType {
    FIVE_K,
    TEN_K,
    HALF_MARATHON,
    MARATHON
}
```

---

## 5. Strava OAuth Multi-Platform Callback (IMPLEMENTED ✅)

The server now has a multi-platform OAuth callback at `/api/auth/strava/callback` that supports **both** the web app and Android app using a single Strava callback domain.

### How it Works

1. **Android App** sends `state=android_<timestamp>` when initiating OAuth
2. **Server** detects the platform via the `state` parameter prefix
3. **Android requests**: Server redirects to `runflow://auth?code=...&state=...`
4. **Web requests**: Server redirects to NextAuth callback

### Android App Requirements

The Android `StravaOAuthManager` should:
1. Use redirect URI: `https://runflow.schuelken.uk/api/auth/strava/callback`
2. Include `state=android_<timestamp>` in the OAuth request
3. Handle the `runflow://auth` deep link callback
4. Exchange the code for tokens via `POST /api/mobile/auth/login`

**Important:** The server only passes the authorization `code` to the app. The app must exchange it for tokens using the mobile auth endpoint.

---

## 6. Verification Checklist

After applying changes, verify:
- [ ] Login flow (User ID parsing)
- [ ] Dashboard loading (User & Activity ID parsing)
- [ ] Pagination works using `hasMore`
- [ ] Error dialogs show server-provided messages
- [ ] OAuth flow opens in browser, returns to app, and logs in successfully
