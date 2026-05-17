import 'package:flutter/material.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';

class WorkoutTheme {
  WorkoutTheme._();

  static Color color(WorkoutType type) {
    return switch (type) {
      WorkoutType.easy => AppColors.success,
      WorkoutType.longRun => const Color(0xFF2196F3),
      WorkoutType.tempo => const Color(0xFFFF9800),
      WorkoutType.intervals => const Color(0xFFF44336),
      WorkoutType.fartlek => const Color(0xFFFF5722),
      WorkoutType.repetitions => const Color(0xFFE91E63),
      WorkoutType.recovery => const Color(0xFF009688),
      WorkoutType.race => const Color(0xFF9C27B0),
      WorkoutType.rest => const Color(0xFF607D8B),
      WorkoutType.crossTrain => const Color(0xFF00BCD4),
      WorkoutType.ride => const Color(0xFF3F51B5),
      WorkoutType.swim => const Color(0xFF0288D1),
      WorkoutType.strength => const Color(0xFF795548),
      WorkoutType.brick => const Color(0xFF673AB7),
      WorkoutType.openWaterSwim => const Color(0xFF0097A7),
      WorkoutType.longRide => const Color(0xFF1565C0),
      WorkoutType.rideIntervals => const Color(0xFF283593),
      WorkoutType.swimDrill => const Color(0xFF00838F),
      WorkoutType.transitionPractice => const Color(0xFF546E7A),
      WorkoutType.doubleDay => const Color(0xFF6D4C41),
      WorkoutType.other => AppColors.onSurfaceVariant,
    };
  }

  static IconData icon(WorkoutType type) {
    return switch (type) {
      WorkoutType.easy => Icons.directions_run,
      WorkoutType.longRun => Icons.route,
      WorkoutType.tempo => Icons.speed,
      WorkoutType.intervals => Icons.flash_on,
      WorkoutType.fartlek => Icons.shuffle,
      WorkoutType.repetitions => Icons.repeat,
      WorkoutType.recovery => Icons.self_improvement,
      WorkoutType.race => Icons.emoji_events,
      WorkoutType.rest => Icons.bedtime,
      WorkoutType.crossTrain => Icons.directions_bike,
      WorkoutType.ride => Icons.directions_bike,
      WorkoutType.swim => Icons.pool,
      WorkoutType.strength => Icons.fitness_center,
      WorkoutType.brick => Icons.add_circle,
      WorkoutType.openWaterSwim => Icons.waves,
      WorkoutType.longRide => Icons.directions_bike,
      WorkoutType.rideIntervals => Icons.flash_on,
      WorkoutType.swimDrill => Icons.pool,
      WorkoutType.transitionPractice => Icons.swap_horiz,
      WorkoutType.doubleDay => Icons.calendar_today,
      WorkoutType.other => Icons.fitness_center,
    };
  }

  static String label(BuildContext context, WorkoutType type) {
    final s = S.of(context);
    return switch (type) {
      WorkoutType.easy => s.workoutTypeEasy,
      WorkoutType.longRun => s.workoutTypeLong,
      WorkoutType.tempo => s.workoutTypeTempo,
      WorkoutType.intervals => s.workoutTypeInterval,
      WorkoutType.recovery => s.workoutTypeRecovery,
      WorkoutType.race => s.workoutTypeRace,
      WorkoutType.other => s.workoutTypeOther,
      WorkoutType.fartlek => 'Fartlek',
      WorkoutType.repetitions => 'Reps',
      WorkoutType.rest => 'Rest',
      WorkoutType.crossTrain => 'Cross Train',
      WorkoutType.ride => 'Ride',
      WorkoutType.swim => 'Swim',
      WorkoutType.strength => 'Strength',
      WorkoutType.brick => 'Brick',
      WorkoutType.openWaterSwim => 'OWS',
      WorkoutType.longRide => 'Long Ride',
      WorkoutType.rideIntervals => 'Ride Intervals',
      WorkoutType.swimDrill => 'Swim Drill',
      WorkoutType.transitionPractice => 'Transition',
      WorkoutType.doubleDay => 'Double',
    };
  }
}
