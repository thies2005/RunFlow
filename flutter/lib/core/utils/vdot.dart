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
  return estimateTime(vdot, distanceMeters);
}

double estimateTime(double vdot, double distanceMeters) {
  if (vdot <= 0 || distanceMeters <= 0) return 0;

  double t = _initialTimeEstimate(vdot, distanceMeters);

  for (int i = 0; i < 20; i++) {
    final v = distanceMeters / t;
    final pctVo2 = _pctVo2max(t);
    final vo2 = _vo2FromVelocity(v);
    final pctVo2Deriv = _pctVo2maxDerivative(t);
    final dVo2Dt = -(distanceMeters / (t * t)) *
        (0.182258 + 0.000208 * v);

    final f = vdot * pctVo2 - vo2;
    final fp = vdot * pctVo2Deriv - dVo2Dt;

    if (fp.abs() < 1e-12) break;

    final delta = f / fp;
    t = t - delta;

    if (t <= 0 || t.isNaN || t.isInfinite) {
      t = _initialTimeEstimate(vdot, distanceMeters);
      break;
    }

    if (delta.abs() < 0.1 / 60) break;
  }

  if (t <= 0 || t.isNaN || t.isInfinite) return 0;
  return t;
}

double _initialTimeEstimate(double vdot, double distanceMeters) {
  // Use a distance-dependent typical race time to estimate %VO2max.
  // Short races use higher %VO2max, marathons use lower.
  // Approximate typical race times for initial guess:
  // 5K ≈ 20min, 10K ≈ 42min, HM ≈ 95min, Marathon ≈ 200min
  double typicalTime;
  if (distanceMeters <= 5000) {
    typicalTime = 20.0;
  } else if (distanceMeters <= 10000) {
    typicalTime = 42.0;
  } else if (distanceMeters <= 21097.5) {
    typicalTime = 95.0;
  } else {
    typicalTime = 200.0;
  }

  final pctVo2 = _pctVo2max(typicalTime);
  final vo2 = vdot * pctVo2;

  final discriminant = 0.182258 * 0.182258 - 4 * 0.000104 * (-4.60 - vo2);
  if (discriminant < 0) return distanceMeters / 200; // fallback

  final velocity = (-0.182258 +
          sqrt(discriminant)) /
      (2 * 0.000104);

  if (velocity <= 0) return distanceMeters / 200; // fallback
  return distanceMeters / velocity;
}

double _pctVo2max(double t) {
  return 0.8 +
      0.1894393 * exp(-0.012778 * t) +
      0.2989558 * exp(-0.1932605 * t);
}

double _pctVo2maxDerivative(double t) {
  return -0.1894393 * 0.012778 * exp(-0.012778 * t) -
      0.2989558 * 0.1932605 * exp(-0.1932605 * t);
}

double _vo2FromVelocity(double v) {
  return -4.60 + 0.182258 * v + 0.000104 * v * v;
}
