import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class HrZoneDistributionChart extends StatelessWidget {
  const HrZoneDistributionChart({
    required this.zoneTimes,
    super.key,
  });

  final List<int> zoneTimes;

  static const _zoneColors = [
    Color(0xFF3B82F6),
    Color(0xFF22C55E),
    Color(0xFFEAB308),
    Color(0xFFF97316),
    Color(0xFFEF4444),
    Color(0xFF991B1B),
    Color(0xFF7C3AED),
  ];

  static const _zoneLabels = [
    'Z1 Recovery',
    'Z2 Aerobic',
    'Z3 Tempo',
    'Z4 Threshold',
    'Z5 VO2max',
    'Z6 Anaerobic',
    'Z7 Sprint',
  ];

  @override
  Widget build(BuildContext context) {
    final total = zoneTimes.fold<int>(0, (sum, t) => sum + t);
    if (total == 0) return const SizedBox.shrink();

    final theme = Theme.of(context);

    final sections = <PieChartSectionData>[];
    for (var i = 0; i < zoneTimes.length; i++) {
      if (zoneTimes[i] <= 0) continue;
      final percentage = zoneTimes[i] / total * 100;
      sections.add(
        PieChartSectionData(
          value: zoneTimes[i].toDouble(),
          color: _zoneColors[i],
          title: percentage >= 5 ? '${percentage.toStringAsFixed(0)}%' : '',
          radius: 50,
          titleStyle: TextStyle(
            color: Colors.white,
            fontSize: percentage >= 8 ? 12 : 9,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'HR Zone Distribution',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  centerSpaceRadius: 30,
                  sectionsSpace: 2,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: List.generate(zoneTimes.length, (i) {
                if (zoneTimes[i] <= 0) return const SizedBox.shrink();
                final pct = zoneTimes[i] / total * 100;
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: _zoneColors[i],
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${_zoneLabels[i]} ${pct.toStringAsFixed(0)}%',
                      style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                    ),
                  ],
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}
