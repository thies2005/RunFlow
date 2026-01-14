# Mobile App - Authentication & Sync Fixes Report

**Date:** January 13, 2026
**Version:** 1.0
**Affected Component:** Android App - Authentication & Data Sync

---

## Executive Summary

This report details critical fixes applied to the RunFlow Android app addressing three major issues:
1. Automatic token refresh on 401 responses (login failure after 24 hours)
2. Initial sync trigger for new users (empty dashboard)
3. Full user profile data in login response (existing users losing settings)

All fixes have been implemented and are ready for testing.

---

## Issue Overview

### Issue #1: Authentication Fails After 24 Hours
**Severity:** Critical
**Impact:** Users completely unable to use the app after 24 hours

**Root Cause:**
The `AuthInterceptor` added Bearer tokens to requests but did not handle 401 Unauthorized responses. When the 24-hour access token expired, all API calls failed with no recovery mechanism.

**User Impact:**
- After 24 hours of login, all API requests fail
- User sees error messages or empty data
- No automatic recovery - requires full logout/login

---

### Issue #2: New Users See Empty Dashboard
**Severity:** Critical
**Impact:** Poor first-time user experience

**Root Cause:**
After successful Strava OAuth login, the app navigated directly to the Dashboard without triggering an initial Strava activity sync. The DashboardViewModel also had no logic to detect new users and trigger sync automatically.

**User Impact:**
- New users see empty dashboard with 0 activities
- Existing web users logging into app for the first time see no data
- User must manually tap sync button
- Periodic sync only runs every 15 minutes

---

### Issue #3: Existing Web Users Lose Settings
**Severity:** High
**Impact:** User data inconsistency between web and app

**Root Cause:**
Server's mobile login endpoint only returned basic user fields (id, name, email, image). Profile settings like HR zones, heart rate values, weight, etc. were not included in the response, causing them to appear as null/defaults in the app.

**User Impact:**
- Existing web users see default HR values instead of their configured values
- VO2max calculations use wrong HR data
- Training zones are incorrect
- Settings appear to be "reset"

---

## Changes Made

### 1. Token Refresh Manager

**New File:** `app/src/main/java/com/runflow/app/data/auth/TokenRefreshManager.kt`

**Purpose:** Handles token refresh operations via direct HTTP calls to avoid circular dependency with the API layer.

**Key Features:**
- Makes direct HTTP POST to `/mobile/v1/auth/refresh`
- Parses JSON response without additional dependencies
- Stores new tokens in `AuthTokenManager`
- Returns success/failure status

```kotlin
@Singleton
class TokenRefreshManager @Inject constructor(
    private val tokenManager: AuthTokenManager,
    @TokenRefreshClient private val okHttpClient: OkHttpClient
) {
    suspend fun refreshToken(): Boolean { ... }
}
```

---

### 2. Enhanced AuthInterceptor

**Modified File:** `app/src/main/java/com/runflow/app/data/auth/AuthInterceptor.kt`

**Changes:**
- Added dependency injection of `TokenRefreshManager`
- Implemented 401 response detection
- Added thread-safe token refresh logic
- Implemented automatic request retry with new token
- Added protection against concurrent refresh attempts
- Skip auth endpoints to prevent infinite loops

**Key Code Sections:**

```kotlin
// 401 Detection
if (response.code == 401 && token != null) {
    response.close()
    val newResponse = refreshTokenAndRetry(chain, originalRequest)
    if (newResponse != null) {
        return newResponse
    }
}
```

```kotlin
// Thread-safe refresh with AtomicBoolean
private val isRefreshing = AtomicBoolean(false)
private val refreshLock = Any()

// Synchronized wait for concurrent requests
synchronized(refreshLock) {
    while (isRefreshing.get()) {
        (refreshLock as Object).wait(100)
    }
}
```

---

### 3. Dependency Injection Updates

**Modified File:** `app/src/main/java/com/runflow/app/di/AppModule.kt`

**Changes:**
- Added `@TokenRefreshClient` qualifier annotation
- Added separate `provideTokenRefreshOkHttpClient()` function
- This client does NOT include the AuthInterceptor to avoid circular dependency

```kotlin
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class TokenRefreshClient

@Provides
@Singleton
@TokenRefreshClient
fun provideTokenRefreshOkHttpClient(
    loggingInterceptor: HttpLoggingInterceptor
): OkHttpClient {
    return OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()
}
```

---

### 4. Dashboard Auto-Sync

**Modified File:** `app/src/main/java/com/runflow/app/ui/screens/dashboard/DashboardViewModel.kt`

**Changes:**
- Added `hasTriggeredInitialSync` flag to prevent duplicate syncs
- Modified `loadDashboard()` to detect new users
- Automatically triggers sync in background when needed

```kotlin
private var hasTriggeredInitialSync = false

// In loadDashboard():
val needsInitialSync = result.data.syncStatus.lastSyncAt == null ||
        result.data.syncStatus.totalActivities == 0

if (needsInitialSync && !hasTriggeredInitialSync && !result.data.syncStatus.syncInProgress) {
    hasTriggeredInitialSync = true
    kotlinx.coroutines.launch {
        syncData()
    }
}
```

---

## File Changes Summary

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `TokenRefreshManager.kt` | NEW | +103 |
| `AuthInterceptor.kt` | MODIFIED | ~140 (rewritten) |
| `AppModule.kt` | MODIFIED | +25 |
| `DashboardViewModel.kt` | MODIFIED | +20 |

---

## Technical Details

### Circular Dependency Resolution

**Problem:**
```
OkHttpClient → AuthInterceptor → AuthRepository → RunFlowApiService → OkHttpClient ❌
```

**Solution:**
```
OkHttpClient (main) → AuthInterceptor → TokenRefreshManager →
OkHttpClient (refresh) - separate instance without AuthInterceptor ✅
```

The refresh client is qualified with `@TokenRefreshClient` and does not include the auth interceptor.

### Thread Safety

Token refresh uses multiple synchronization mechanisms:

1. **AtomicBoolean** - Lock-free check for refresh status
2. **synchronized block** - Ensures only one thread performs refresh
3. **wait/notifyAll** - Threads waiting for refresh completion

This prevents:
- Multiple simultaneous refresh calls
- Race conditions when concurrent requests get 401
- Stale token usage

### Error Handling

**Token Refresh Failures:**
- Returns null from `refreshTokenAndRetry()`
- Original 401 response is returned to caller
- User sees appropriate error from UI layer
- Tokens are cleared by `AuthRepository` on refresh failure

**Network Errors:**
- Caught and logged
- Returns false from `refreshToken()`
- Original request fails with its original error

---

## Testing Checklist

### Unit Testing

- [ ] `TokenRefreshManager.refreshToken()` with valid token
- [ ] `TokenRefreshManager.refreshToken()` with invalid token
- [ ] `TokenRefreshManager.refreshToken()` with network error
- [ ] `AuthInterceptor` with valid token (should pass through)
- [ ] `AuthInterceptor` with 401 response (should refresh and retry)
- [ ] `AuthInterceptor` with 401 and refresh failure (should return error)
- [ ] `AuthInterceptor` with concurrent 401s (should only refresh once)
- [ ] `DashboardViewModel` triggers sync for new user
- [ ] `DashboardViewModel` doesn't sync for existing user with data

### Integration Testing

- [ ] Login with Strava → verify full user profile received
- [ ] Login → verify HR settings preserved for web users
- [ ] New user login → verify auto-sync triggers
- [ ] Wait 24+ hours → verify auto-refresh works (or mock token expiry)
- [ ] Concurrent API calls during token expiry → verify only one refresh
- [ ] Force 401 → verify seamless recovery

### Manual Testing

**Test Case 1: New User**
1. Clear app data
2. Login with Strava
3. Verify dashboard shows activities after sync

**Test Case 2: Existing Web User**
1. Create account via web with HR settings
2. Login to app with same account
3. Verify HR settings are preserved (not defaults)

**Test Case 3: Token Expiry**
1. Login to app
2. Wait for access token to expire (24 hours) OR manually delete token
3. Use app - should auto-refresh and continue working

**Test Case 4: Sync Retry**
1. Login and get dashboard
2. Verify sync triggered automatically if no activities
3. Verify sync doesn't trigger again on rotation

---

## Deployment Notes

### Build Configuration

No build configuration changes required. All changes are pure Kotlin/Java code.

### ProGuard/R8

No additional rules needed. All classes are used via Hilt dependency injection and will be automatically kept.

### Backward Compatibility

**Breaking Changes:** None

The changes are fully backward compatible:
- Existing token storage format unchanged
- API endpoints unchanged
- User data model unchanged (just more fields populated)

### Minimum App Version

These fixes are compatible with the current app version. No minimum version bump required.

---

## Monitoring Recommendations

### Metrics to Track

1. **Token Refresh Rate**
   - Monitor how often tokens are refreshed
   - High rate may indicate token expiry issues

2. **Token Refresh Success Rate**
   - Track success/failure ratio
   - Failures may indicate refresh endpoint issues

3. **Initial Sync Trigger Rate**
   - Track how often auto-sync triggers
   - Helps identify new user patterns

4. **Concurrent Refresh Attempts**
   - Should be near zero with synchronization
   - Non-zero may indicate race conditions

### Logging

Key log points added:
- Token refresh initiated
- Token refresh success/failure
- Concurrent refresh detection
- Initial sync trigger

---

## Known Limitations

1. **Token Refresh Blocking**
   - Uses `runBlocking` in interceptor
   - May cause slight UI delay on 401
   - Consider async interceptor pattern for future

2. **Refresh Endpoint Call**
   - Uses direct HTTP instead of Retrofit
   - Manual JSON parsing is basic
   - Could use Gson/Kotlinx Serialization

3. **Sync Detection**
   - Uses `lastSyncAt == null` and `totalActivities == 0`
   - May not catch all edge cases
   - Consider explicit `isFirstLogin` flag from server

---

## Next Steps

1. **Code Review**
   - Review all changes for potential issues
   - Verify dependency injection configuration

2. **Testing**
   - Run full test suite
   - Perform manual testing checklist
   - Consider beta testing with subset of users

3. **Deployment**
   - Deploy server changes first (required for profile data)
   - Deploy app changes after server is live
   - Monitor metrics after deployment

4. **Future Improvements**
   - Consider proactive token refresh (before expiry)
   - Implement proper async token refresh interceptor
   - Add more robust new user detection

---

## Contact

For questions or issues related to these changes, contact the development team.
