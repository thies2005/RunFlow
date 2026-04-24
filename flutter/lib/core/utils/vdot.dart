import 'dart:math';

double calculateVdot(double distanceMeters, double timeMinutes) {
  if (timeMinutes <= 0 || distanceMeters <= 0) return 0;

  final velocity = distanceMeters / timeMinutes;
  final vo2 = -4.60 + 0.182258 * velocity + 0.000104 * pow(velocity, 2);
  final pctVo2max = 0.8 +
      0.1894393 * exp(-0.012778 * timeMinutes) +
      0.2989558 * exp(-0.1932605 * timeMinutes);
  return vo2 / pctVo2max;
}

String tsbStatus(double tsb) {
  if (tsb >= 25) return 'Peaked';
  if (tsb >= 5) return 'Fresh';
  if (tsb >= -10) return 'Neutral';
  if (tsb >= -30) return 'Fatigued';
  return 'Very Fatigued';
}

double racePrediction(double vdot, double distanceMeters) {
  if (vdot <= 0) return 0;

  final velocity = (-4.60 +
          0.182258 * (distanceMeters / estimateTime(vdot, distanceMeters)) +
          0.000104 *
              pow(distanceMeters / estimateTime(vdot, distanceMeters), 2)) /
      (0.8 +
          0.1894393 *
              exp(-0.012778 * estimateTime(vdot, distanceMeters)) +
          0.2989558 *
              exp(-0.1932605 * estimateTime(vdot, distanceMeters)));

  return distanceMeters / velocity;
}

double estimateTime(double vdot, double distanceMeters) {
  final vo2 = vdot *
      (0.8 +
          0.1894393 * exp(-0.012778 * 30) +
          0.2989558 * exp(-0.1932605 * 30));

  final velocity = (-0.182258 +
          sqrt(0.182258 * 0.182258 - 4 * 0.000104 * (-4.60 - vo2))) /
      (2 * 0.000104);

  return distanceMeters / velocity;
}
