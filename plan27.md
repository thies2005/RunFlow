# Plan to Fix RunFlow Flutter App Issues (plan27.md)

This document outlines the detailed steps required to resolve the four main issues reported in the RunFlow Flutter application.

## 1. Health Tab Not Syncing from Server
**Problem:** The Health dashboard (supplements, nutrition, etc.) does not fetch fresh data from the server after the initial load. The user cannot pull-to-refresh, and tapping the "Sync Now" button only syncs Health Connect but does not refresh the UI's Riverpod providers.
**Action Plan:**
*   **File:** `lib/presentation/screens/health/health_screen.dart`
*   **Implementation Steps:**
    1.  Wrap the `CustomScrollView` inside the `HealthScreen`'s `build` method with a `RefreshIndicator`.
    2.  Set the `onRefresh` callback to an async function that invalidates the relevant providers and waits for them to reload:
        ```dart
        onRefresh: () async {
          final today = DateTime.now();
          ref.invalidate(nutritionProvider(today));
          ref.invalidate(supplementListProvider);
          ref.invalidate(bodyMeasurementsProvider);
          ref.invalidate(fastingProvider);
          await Future.wait([
            ref.read(nutritionProvider(today).future),
            ref.read(supplementListProvider.future),
            ref.read(bodyMeasurementsProvider.future),
            ref.read(fastingProvider.future),
          ]);
        }
        ```
    3.  Update the `_SyncBanner` widget's `onTap` function to also invalidate these same providers after `syncService.syncHistoricalHealth()` is invoked.

## 2. Location Permission Not Requested for Record Feature
**Problem:** The app only asks for location permissions when the user explicitly taps the large "START" button. If the user navigates to the Record screen, the map and GPS components remain uninitialized because permissions aren't requested upon opening the screen.
**Action Plan:**
*   **File:** `lib/presentation/screens/record/record_screen.dart`
*   **Implementation Steps:**
    1.  Inside the `_RecordScreenState.initState()` method, add a post-frame callback that automatically requests location permissions using the `WorkoutRecordingService`:
        ```dart
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref.read(recordingServiceProvider).requestPermissions();
          // existing code...
        });
        ```

## 3. Dashboard Target Distance Shows 2300km Instead of 2.3km
**Problem:** The backend API provides `workout.targetDistance` in meters (e.g., 2300.0). The `DashboardScreen` incorrectly displays this raw value as kilometers without converting it.
**Action Plan:**
*   **File:** `lib/presentation/screens/dashboard/dashboard_screen.dart`
*   **Implementation Steps:**
    1.  Locate the three instances where `targetDistance` is displayed (approximately lines 331, 425, and 525).
    2.  Modify the string interpolation to divide the distance by 1000 before formatting:
        *   *Change:* `'${workout.targetDistance.toStringAsFixed(1)} km'`
        *   *To:* `'${(workout.targetDistance / 1000).toStringAsFixed(1)} km'`

## 4. Race Prediction is Very Off (e.g., 1:58 min instead of 23:31)
**Problem:** The mathematical utility `racePrediction()` returns the predicted time in **minutes**. In the analytics provider, this value is mistakenly passed as **seconds** into the `Duration` constructor, causing a prediction of 23.51 minutes to be treated as 24 seconds.
**Action Plan:**
*   **File:** `lib/presentation/providers/analytics_providers.dart`
*   **Implementation Steps:**
    1.  In the `racePredictions` provider, multiply the return value of `racePrediction()` by 60 to convert the minutes into seconds before passing it to the `Duration` constructor.
    2.  Apply this to all distance calculations:
        ```dart
        return {
          '5K': Duration(seconds: (racePrediction(vdot, 5000) * 60).round()),
          '10K': Duration(seconds: (racePrediction(vdot, 10000) * 60).round()),
          'Half Marathon': Duration(seconds: (racePrediction(vdot, 21097.5) * 60).round()),
          'Marathon': Duration(seconds: (racePrediction(vdot, 42195) * 60).round()),
        };
        ```
