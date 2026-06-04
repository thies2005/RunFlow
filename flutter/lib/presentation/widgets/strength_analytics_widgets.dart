import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';

class StrengthAnalyticsView extends ConsumerStatefulWidget {
  const StrengthAnalyticsView({super.key});

  @override
  ConsumerState<StrengthAnalyticsView> createState() => _StrengthAnalyticsViewState();
}

class _StrengthAnalyticsViewState extends ConsumerState<StrengthAnalyticsView> {
  String? _selectedExerciseId;

  @override
  Widget build(BuildContext context) {
    final analyticsAsync = ref.watch(strengthAnalyticsProvider);
    final historyAsync = ref.watch(strengthHistoryProvider);
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);
    final unitLabel = settings.unitSystem == UnitSystem.imperial ? 'lbs' : 'kg';

    return analyticsAsync.when(
      data: (data) {
        final totalWorkouts = data['totalWorkouts'] as int;
        final totalVolume = data['totalVolume'] as double;
        final avgDurationSeconds = data['avgDurationSeconds'] as double;
        final muscleVolume = data['muscleVolume'] as Map<MuscleGroup, double>;
        final exercise1RMHistory = data['exercise1RMHistory'] as Map<String, List<Map<String, dynamic>>>;

        if (totalWorkouts == 0) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.analytics_outlined, size: 64, color: AppColors.onSurfaceVariant.withValues(alpha: 0.5)),
                  const SizedBox(height: 16),
                  const Text(
                    'No strength history found',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Log a completed strength session in the Record tab to see your analytics here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          );
        }

        // Set default exercise in dropdown if not set
        if (_selectedExerciseId == null && exercise1RMHistory.isNotEmpty) {
          _selectedExerciseId = exercise1RMHistory.keys.first;
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 1. Summary Metrics
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    'Workouts',
                    totalWorkouts.toString(),
                    Icons.fitness_center,
                    theme,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    'Volume ($unitLabel)',
                    totalVolume.toStringAsFixed(0),
                    Icons.line_weight,
                    theme,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    'Avg duration',
                    '${(avgDurationSeconds / 60).round()}m',
                    Icons.timer,
                    theme,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 2. Weekly Volume Bar Chart
            _buildWeeklyVolumeCard(historyAsync.value ?? [], theme),
            const SizedBox(height: 24),

            // 3. Muscle Group Pie Chart & Legend
            _buildMuscleGroupCard(muscleVolume, theme),
            const SizedBox(height: 24),

            // 4. Exercise 1RM Trend Line Chart
            if (_selectedExerciseId != null)
              _build1RMTrendCard(exercise1RMHistory, unitLabel, theme),
            const SizedBox(height: 32),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(child: Text('Error loading analytics: $err')),
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeeklyVolumeCard(List<StrengthSession> history, ThemeData theme) {
    final Map<int, double> weeklyVolume = {};
    final now = DateTime.now();

    for (int i = 0; i < 6; i++) {
      weeklyVolume[i] = 0.0;
    }

    for (final session in history) {
      final difference = now.difference(session.startTime).inDays;
      final weekIndex = difference ~/ 7;
      if (weekIndex >= 0 && weekIndex < 6) {
        weeklyVolume[weekIndex] = (weeklyVolume[weekIndex] ?? 0.0) + session.totalVolume;
      }
    }

    final barGroups = List.generate(6, (index) {
      // 0 = this week, 5 = 5 weeks ago. We plot chronological left-to-right (5 weeks ago -> this week)
      final revIndex = 5 - index;
      final vol = weeklyVolume[revIndex] ?? 0.0;
      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: vol,
            color: AppColors.primary,
            width: 16,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(4),
            ),
          ),
        ],
      );
    });

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Weekly Volume Lifted',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  barGroups: barGroups,
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                  titlesData: FlTitlesData(
                    show: true,
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (val, meta) {
                          final weeksAgo = 5 - val.toInt();
                          if (weeksAgo == 0) return const Text('Now', style: TextStyle(fontSize: 10));
                          return Text('-${weeksAgo}w', style: const TextStyle(fontSize: 10));
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMuscleGroupCard(Map<MuscleGroup, double> muscleVolume, ThemeData theme) {
    final Map<Color, MuscleGroup> colorMapping = {};
    final List<PieChartSectionData> sections = [];
    final List<MapEntry<MuscleGroup, double>> sortedMuscleVolume = muscleVolume.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final totalVal = muscleVolume.values.isEmpty ? 1.0 : muscleVolume.values.reduce((a, b) => a + b);

    final colors = [
      AppColors.primary,
      const Color(0xFF2196F3),
      const Color(0xFF4CAF50),
      const Color(0xFFFFC107),
      const Color(0xFFE91E63),
      const Color(0xFF9C27B0),
      const Color(0xFF00BCD4),
      const Color(0xFFFF5722),
    ];

    for (int i = 0; i < sortedMuscleVolume.length; i++) {
      final entry = sortedMuscleVolume[i];
      if (entry.value == 0) continue;

      final color = colors[i % colors.length];
      colorMapping[color] = entry.key;

      final percent = (entry.value / totalVal) * 100;

      sections.add(
        PieChartSectionData(
          color: color,
          value: entry.value,
          title: '${percent.toStringAsFixed(0)}%',
          radius: 40,
          titleStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Muscle Group Distribution',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                if (sections.isNotEmpty)
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: PieChart(
                      PieChartData(
                        sections: sections,
                        sectionsSpace: 2,
                        centerSpaceRadius: 20,
                      ),
                    ),
                  )
                else
                  const SizedBox(
                    width: 120,
                    height: 120,
                    child: Center(child: Text('No data')),
                  ),
                const SizedBox(width: 24),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: colorMapping.entries.take(5).map((entry) {
                      final muscleName = entry.value.name[0].toUpperCase() + entry.value.name.substring(1);
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2.0),
                        child: Row(
                          children: [
                            Container(width: 12, height: 12, color: entry.key),
                            const SizedBox(width: 8),
                            Text(
                              muscleName,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _build1RMTrendCard(
    Map<String, List<Map<String, dynamic>>> exercise1RMHistory,
    String unitLabel,
    ThemeData theme,
  ) {
    // Get distinct exercise names for dropdown
    final List<DropdownMenuItem<String>> dropdownItems = [];
    final exercisesAsync = ref.read(exerciseLibraryProvider);
    final exercises = exercisesAsync.value ?? [];

    for (final entry in exercise1RMHistory.entries) {
      final name = exercises.firstWhere((e) => e.id == entry.key, orElse: () => Exercise(id: entry.key, name: 'Unknown', primaryMuscle: MuscleGroup.other, restSeconds: 90)).name;
      dropdownItems.add(DropdownMenuItem(
        value: entry.key,
        child: Text(name),
      ));
    }

    final history = exercise1RMHistory[_selectedExerciseId] ?? [];
    final List<FlSpot> spots = [];
    for (int i = 0; i < history.length; i++) {
      final oneRepMax = history[i]['oneRepMax'] as double;
      spots.add(FlSpot(i.toDouble(), oneRepMax));
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Estimated 1-Rep Max Progress',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _selectedExerciseId,
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(),
              ),
              items: dropdownItems,
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _selectedExerciseId = val;
                  });
                }
              },
            ),
            const SizedBox(height: 24),
            if (spots.length < 2)
              SizedBox(
                height: 180,
                child: Center(
                  child: Text(
                    spots.isEmpty
                        ? 'No 1RM data for this exercise'
                        : 'Log at least 2 sessions to see a progress trend chart',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
                  ),
                ),
              )
            else
              SizedBox(
                height: 180,
                child: LineChart(
                  LineChartData(
                    lineBarsData: [
                      LineChartBarData(
                        spots: spots,
                        isCurved: true,
                        color: AppColors.primary,
                        barWidth: 3,
                        dotData: const FlDotData(show: true),
                      ),
                    ],
                    borderData: FlBorderData(show: false),
                    gridData: const FlGridData(show: false),
                    titlesData: FlTitlesData(
                      show: true,
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (val, meta) {
                            final idx = val.toInt();
                            if (idx >= 0 && idx < history.length) {
                              final date = history[idx]['date'] as DateTime;
                              return Text('${date.day}/${date.month}', style: const TextStyle(fontSize: 9));
                            }
                            return const SizedBox();
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
