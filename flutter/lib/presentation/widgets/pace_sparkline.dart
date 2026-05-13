import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';

class PaceSparkline extends StatelessWidget {
  const PaceSparkline({
    super.key,
    required this.paceHistory,
    this.width = 120,
    this.height = 40,
  });

  final List<double> paceHistory;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(
        painter: _PaceSparklinePainter(paceHistory: paceHistory),
      ),
    );
  }
}

class _PaceSparklinePainter extends CustomPainter {
  const _PaceSparklinePainter({required this.paceHistory});

  final List<double> paceHistory;

  @override
  void paint(Canvas canvas, Size size) {
    if (paceHistory.isEmpty) return;
    if (paceHistory.length == 1) {
      final paint = Paint()
        ..color = AppColors.primary
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 2;
      canvas.drawCircle(
        Offset(size.width / 2, size.height / 2),
        2,
        paint,
      );
      return;
    }

    double minPace = paceHistory[0];
    double maxPace = paceHistory[0];
    for (final p in paceHistory) {
      if (p < minPace) minPace = p;
      if (p > maxPace) maxPace = p;
    }
    final range = maxPace - minPace;

    final paint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    final stepX = size.width / (paceHistory.length - 1);

    for (int i = 0; i < paceHistory.length; i++) {
      final x = i * stepX;
      double y;
      if (range == 0) {
        y = size.height / 2;
      } else {
        y = ((paceHistory[i] - minPace) / range) * size.height;
      }
      y = size.height - y;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _PaceSparklinePainter oldDelegate) {
    return oldDelegate.paceHistory != paceHistory;
  }
}
