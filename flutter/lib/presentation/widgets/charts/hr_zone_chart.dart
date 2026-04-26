import 'package:flutter/material.dart';

class HrZoneChart extends StatelessWidget {
  const HrZoneChart({
    required this.zone1,
    required this.zone2,
    required this.zone3,
    required this.zone4,
    required this.zone5,
    super.key,
  });

  final int zone1;
  final int zone2;
  final int zone3;
  final int zone4;
  final int zone5;

  @override
  Widget build(BuildContext context) {
    final total = zone1 + zone2 + zone3 + zone4 + zone5;
    if (total == 0) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final zones = [
      (time: zone1, color: Colors.grey, label: 'Z1'),
      (time: zone2, color: Colors.blue, label: 'Z2'),
      (time: zone3, color: Colors.green, label: 'Z3'),
      (time: zone4, color: Colors.orange, label: 'Z4'),
      (time: zone5, color: Colors.red, label: 'Z5'),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'HR Zone Distribution',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: SizedBox(
                height: 32,
                child: Row(
                  children: zones
                      .where((z) => z.time > 0)
                      .map((z) => Expanded(
                            flex: z.time,
                            child: Container(
                              color: z.color,
                              alignment: Alignment.center,
                              child: Text(
                                _formatTime(z.time),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: zones
                  .where((z) => z.time > 0)
                  .map((z) => Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: z.color,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${z.label}: ${_formatTime(z.time)}',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m}m ${s}s';
  }
}
