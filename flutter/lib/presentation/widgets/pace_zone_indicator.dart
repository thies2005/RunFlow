import 'dart:math';

import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/pace_zone.dart';

class PaceZoneIndicator extends StatelessWidget {
  const PaceZoneIndicator({
    required this.zoneResult,
    this.width = double.infinity,
    super.key,
  });

  final PaceZoneResult zoneResult;
  final double width;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (zoneResult.status == PaceZoneStatus.noTarget) {
      return SizedBox(
        width: width,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'No target pace',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    final statusColor = _statusColor;
    final statusLabel = _statusLabel;
    final deltaText = _formatDelta(zoneResult.deltaSecondsPerKm);

    return SizedBox(
      width: width,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                statusLabel,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: statusColor,
                ),
              ),
              Text(
                deltaText,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: statusColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 24,
            child: CustomPaint(
              size: Size.infinite,
              painter: _PaceZoneBarPainter(
                zoneResult: zoneResult,
                fastColor: AppColors.error,
                zoneColor: AppColors.success,
                slowColor: AppColors.warning,
                trackColor: theme.colorScheme.surfaceContainerHighest,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                formatPace(zoneResult.targetPaceSecondsPerKm - zoneResult.toleranceSecondsPerKm),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              Text(
                formatPace(zoneResult.targetPaceSecondsPerKm),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              Text(
                formatPace(zoneResult.targetPaceSecondsPerKm + zoneResult.toleranceSecondsPerKm),
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color get _statusColor {
    switch (zoneResult.status) {
      case PaceZoneStatus.tooFast:
        return AppColors.error;
      case PaceZoneStatus.inZone:
        return AppColors.success;
      case PaceZoneStatus.tooSlow:
        return AppColors.warning;
      case PaceZoneStatus.noTarget:
        return AppColors.onSurfaceVariant;
    }
  }

  String get _statusLabel {
    switch (zoneResult.status) {
      case PaceZoneStatus.tooFast:
        return 'TOO FAST';
      case PaceZoneStatus.inZone:
        return 'IN ZONE';
      case PaceZoneStatus.tooSlow:
        return 'TOO SLOW';
      case PaceZoneStatus.noTarget:
        return 'NO TARGET';
    }
  }

  String _formatDelta(double deltaSeconds) {
    final absSeconds = deltaSeconds.abs().round();
    if (absSeconds == 0) return 'ON PACE';
    final sign = deltaSeconds < 0 ? '-' : '+';
    final minutes = absSeconds ~/ 60;
    final seconds = absSeconds % 60;
    if (minutes > 0) {
      return '$sign${minutes}m ${seconds}s/km';
    }
    return '$sign${seconds}s/km';
  }
}

class _PaceZoneBarPainter extends CustomPainter {
  const _PaceZoneBarPainter({
    required this.zoneResult,
    required this.fastColor,
    required this.zoneColor,
    required this.slowColor,
    required this.trackColor,
  });

  final PaceZoneResult zoneResult;
  final Color fastColor;
  final Color zoneColor;
  final Color slowColor;
  final Color trackColor;

  @override
  void paint(Canvas canvas, Size size) {
    final barHeight = size.height;
    final barWidth = size.width;

    final barRect = Offset.zero & size;
    final barPaint = Paint()..color = trackColor;
    canvas.drawRRect(
      RRect.fromRectAndRadius(barRect, const Radius.circular(4)),
      barPaint,
    );

    final tolerance = zoneResult.toleranceSecondsPerKm;
    final target = zoneResult.targetPaceSecondsPerKm;
    final range = target * 0.5;
    final minPace = max(0.0, target - tolerance - range);
    final maxPace = target + tolerance + range;
    final totalRange = maxPace - minPace;

    final zoneStart = ((target - tolerance) - minPace) / totalRange;
    final zoneEnd = ((target + tolerance) - minPace) / totalRange;

    final zonePaint = Paint()..color = zoneColor.withValues(alpha: 0.3);
    final zoneRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(zoneStart * barWidth, 0, (zoneEnd - zoneStart) * barWidth, barHeight),
      const Radius.circular(4),
    );
    canvas.drawRRect(zoneRect, zonePaint);

    final fastPaint = Paint()..color = fastColor.withValues(alpha: 0.2);
    final fastRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, zoneStart * barWidth, barHeight),
      const Radius.circular(4),
    );
    canvas.drawRRect(fastRect, fastPaint);

    final slowPaint = Paint()..color = slowColor.withValues(alpha: 0.2);
    final slowRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(zoneEnd * barWidth, 0, (1 - zoneEnd) * barWidth, barHeight),
      const Radius.circular(4),
    );
    canvas.drawRRect(slowRect, slowPaint);

    final currentPace = zoneResult.currentPaceSecondsPerKm;
    final markerT = ((currentPace - minPace) / totalRange).clamp(0.0, 1.0);
    final markerX = markerT * barWidth;

    final markerPaint = Paint()..color = _markerColor;
    final path = Path()
      ..moveTo(markerX, 0)
      ..lineTo(markerX - 6, -8)
      ..lineTo(markerX + 6, -8)
      ..close();
    canvas.drawPath(path, markerPaint);

    final markerLinePaint = Paint()
      ..color = _markerColor
      ..strokeWidth = 2;
    canvas.drawLine(
      Offset(markerX, 0),
      Offset(markerX, barHeight),
      markerLinePaint,
    );
  }

  Color get _markerColor {
    switch (zoneResult.status) {
      case PaceZoneStatus.tooFast:
        return fastColor;
      case PaceZoneStatus.inZone:
        return zoneColor;
      case PaceZoneStatus.tooSlow:
        return slowColor;
      case PaceZoneStatus.noTarget:
        return trackColor;
    }
  }

  @override
  bool shouldRepaint(covariant _PaceZoneBarPainter oldDelegate) {
    return oldDelegate.zoneResult != zoneResult;
  }
}
