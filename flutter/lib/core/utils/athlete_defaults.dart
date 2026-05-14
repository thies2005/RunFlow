import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/core/utils/triathlon_estimator.dart';

enum AthleteDefaultsSource { fromActivities, fromVdot, noData }

class AthleteDefaults {
  const AthleteDefaults({
    this.estimatedCssSecPer100m,
    this.estimatedFlatBikeSpeedMs,
    required this.cssSource,
    required this.bikeSource,
    this.qualifyingSwimCount = 0,
    this.qualifyingRideCount = 0,
  });

  final double? estimatedCssSecPer100m;
  final double? estimatedFlatBikeSpeedMs;
  final AthleteDefaultsSource cssSource;
  final AthleteDefaultsSource bikeSource;
  final int qualifyingSwimCount;
  final int qualifyingRideCount;
}

const _minSwimDistanceM = 50.0;
const _minRideDurationSec = 2400;
const _topSwimCount = 3;
const _topRideCount = 5;

/// Each meter of elevation gain per km reduces average speed by ~0.3 km/h.
/// Converted to m/s: 0.3 / 3.6 ≈ 0.083 m/s per m/km.
const _elevationCorrectionPerMKm = 0.083;

AthleteDefaults computeAthleteDefaults(
  List<Activity> activities, {
  double? fallbackVdot,
}) {
  final swimActivities = activities
      .where((a) =>
          a.type == ActivityType.swim &&
          a.distance > _minSwimDistanceM &&
          a.averageSpeed != null &&
          a.averageSpeed! > 0)
      .toList();

  final rideActivities = activities
      .where((a) =>
          (a.type == ActivityType.ride ||
              a.type == ActivityType.virtualRide) &&
          a.movingTime >= _minRideDurationSec &&
          a.averageSpeed != null &&
          a.averageSpeed! > 0 &&
          a.distance > 1000)
      .toList();

  double? css;
  AthleteDefaultsSource cssSource = AthleteDefaultsSource.noData;

  if (swimActivities.length >= 3) {
    swimActivities
        .sort((a, b) => (b.averageSpeed!).compareTo(a.averageSpeed!));
    final top = swimActivities.take(_topSwimCount).toList();
    final paces = top
        .map((a) => (100.0 / a.averageSpeed!).clamp(60.0, 180.0))
        .toList()
      ..sort();
    css = paces[paces.length ~/ 2];
    cssSource = AthleteDefaultsSource.fromActivities;
  } else if (fallbackVdot != null && fallbackVdot > 0) {
    css = estimateSwimPaceFromVdot(fallbackVdot);
    cssSource = AthleteDefaultsSource.fromVdot;
  }

  double? flatBikeSpeed;
  AthleteDefaultsSource bikeSource = AthleteDefaultsSource.noData;

  if (rideActivities.length >= 3) {
    final correctedSpeeds = <double>[];
    for (final ride in rideActivities) {
      final rawSpeedMs = ride.averageSpeed!;
      final distKm = ride.distance / 1000;
      final elevPerKm = ride.totalElevation / distKm;
      final corrected = rawSpeedMs + _elevationCorrectionPerMKm * elevPerKm;
      correctedSpeeds.add(corrected.clamp(rawSpeedMs * 0.8, rawSpeedMs * 1.5));
    }

    correctedSpeeds.sort((a, b) => b.compareTo(a));
    final top = correctedSpeeds.take(_topRideCount).toList()..sort();
    flatBikeSpeed = top[top.length ~/ 2].clamp(5.0, 20.0);
    bikeSource = AthleteDefaultsSource.fromActivities;
  } else if (fallbackVdot != null && fallbackVdot > 0) {
    flatBikeSpeed = bikePowerToSpeed(estimateBikeFtpFromVdot(fallbackVdot) * 0.75);
    bikeSource = AthleteDefaultsSource.fromVdot;
  }

  return AthleteDefaults(
    estimatedCssSecPer100m: css,
    estimatedFlatBikeSpeedMs: flatBikeSpeed,
    cssSource: cssSource,
    bikeSource: bikeSource,
    qualifyingSwimCount: swimActivities.length,
    qualifyingRideCount: rideActivities.length,
  );
}
