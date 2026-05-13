import 'package:runflow_flutter/domain/entities/dashboard_entities.dart' show WorkoutType;

enum StepType { warmup, cooldown, interval, recovery, rest }

enum StepDurationType { time, distance }

class PaceTarget {
  const PaceTarget({
    this.zone,
    this.minPaceSecondsPerKm,
    this.maxPaceSecondsPerKm,
  });

  final WorkoutType? zone;
  final double? minPaceSecondsPerKm;
  final double? maxPaceSecondsPerKm;

  PaceTarget copyWith({
    WorkoutType? zone,
    double? minPaceSecondsPerKm,
    double? maxPaceSecondsPerKm,
  }) {
    return PaceTarget(
      zone: zone ?? this.zone,
      minPaceSecondsPerKm: minPaceSecondsPerKm ?? this.minPaceSecondsPerKm,
      maxPaceSecondsPerKm: maxPaceSecondsPerKm ?? this.maxPaceSecondsPerKm,
    );
  }
}

class WorkoutStep {
  const WorkoutStep({
    required this.id,
    required this.type,
    required this.name,
    this.durationType,
    this.durationSeconds,
    this.distanceMeters,
    this.paceTarget,
  });

  final String id;
  final StepType type;
  final String name;
  final StepDurationType? durationType;
  final int? durationSeconds;
  final double? distanceMeters;
  final PaceTarget? paceTarget;

  WorkoutStep copyWith({
    String? id,
    StepType? type,
    String? name,
    StepDurationType? durationType,
    int? durationSeconds,
    double? distanceMeters,
    PaceTarget? paceTarget,
  }) {
    return WorkoutStep(
      id: id ?? this.id,
      type: type ?? this.type,
      name: name ?? this.name,
      durationType: durationType ?? this.durationType,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      paceTarget: paceTarget ?? this.paceTarget,
    );
  }
}

class StepGroup {
  const StepGroup({
    required this.id,
    required this.children,
    this.repeatCount = 1,
    this.name,
  });

  final String id;
  final List<StepNode> children;
  final int repeatCount;
  final String? name;
}

class StepNode {
  const StepNode.step(this.workoutStep) : group = null;
  const StepNode.group(this.group) : workoutStep = null;

  final WorkoutStep? workoutStep;
  final StepGroup? group;

  bool get isStep => workoutStep != null;
  bool get isGroup => group != null;
}

class StructuredWorkout {
  const StructuredWorkout({
    required this.id,
    required this.name,
    required this.steps,
    this.totalEstimatedDurationSeconds,
    this.totalEstimatedDistanceMeters,
  });

  final String id;
  final String name;
  final List<StepNode> steps;
  final int? totalEstimatedDurationSeconds;
  final double? totalEstimatedDistanceMeters;
}
