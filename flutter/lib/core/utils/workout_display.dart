import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

String getWorkoutDisplayName(
  WorkoutType type, {
  double? distance,
  int? duration,
  String? displayDescription,
}) {
  if (displayDescription != null && displayDescription.isNotEmpty) {
    return displayDescription;
  }

  final parts = <String>[];

  parts.add(switch (type) {
    WorkoutType.easy => 'Easy Run',
    WorkoutType.longRun => 'Long Run',
    WorkoutType.tempo => 'Tempo Run',
    WorkoutType.intervals => 'Intervals',
    WorkoutType.fartlek => 'Fartlek',
    WorkoutType.repetitions => 'Repetitions',
    WorkoutType.recovery => 'Recovery',
    WorkoutType.race => 'Race',
    WorkoutType.rest => 'Rest Day',
    WorkoutType.crossTrain => 'Cross Train',
    WorkoutType.ride => 'Ride',
    WorkoutType.swim => 'Swim',
    WorkoutType.strength => 'Strength',
    WorkoutType.other => 'Workout',
    WorkoutType.brick => 'Brick',
    WorkoutType.openWaterSwim => 'Open Water Swim',
    WorkoutType.longRide => 'Long Ride',
    WorkoutType.rideIntervals => 'Ride Intervals',
    WorkoutType.swimDrill => 'Swim Drill',
    WorkoutType.transitionPractice => 'Transition Practice',
    WorkoutType.doubleDay => 'Double Day',
  });

  if (distance != null && distance > 0) {
    parts.add('${(distance / 1000).toStringAsFixed(1)} km');
  }
  if (duration != null && duration > 0) {
    final minutes = duration ~/ 60;
    parts.add('$minutes min');
  }

  return parts.join(' · ');
}

String getWorkoutIcon(WorkoutType type) {
  return switch (type) {
    WorkoutType.easy => 'directions_run',
    WorkoutType.longRun => 'route',
    WorkoutType.tempo => 'speed',
    WorkoutType.intervals => 'flash_on',
    WorkoutType.fartlek => 'shuffle',
    WorkoutType.repetitions => 'repeat',
    WorkoutType.recovery => 'self_improvement',
    WorkoutType.race => 'emoji_events',
    WorkoutType.rest => 'bedtime',
    WorkoutType.crossTrain => 'directions_bike',
    WorkoutType.ride => 'directions_bike',
    WorkoutType.swim => 'pool',
    WorkoutType.strength => 'fitness_center',
    WorkoutType.other => 'fitness_center',
    WorkoutType.brick => 'add_circle',
    WorkoutType.openWaterSwim => 'waves',
    WorkoutType.longRide => 'directions_bike',
    WorkoutType.rideIntervals => 'flash_on',
    WorkoutType.swimDrill => 'pool',
    WorkoutType.transitionPractice => 'swap_horiz',
    WorkoutType.doubleDay => 'calendar_today',
  };
}

bool shouldShowExactPace(Workout workout) {
  final isPaceType = workout.workoutType == WorkoutType.tempo ||
      workout.workoutType == WorkoutType.intervals;
  final isPeak = workout.phase == 'PEAK';
  final hasTargetPace = workout.targetPace > 0;
  return isPaceType && isPeak && hasTargetPace;
}
