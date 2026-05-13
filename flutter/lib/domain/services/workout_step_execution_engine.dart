import 'dart:async';
import 'package:runflow_flutter/domain/entities/workout_step.dart';

enum StepExecutionState { notStarted, active, completed }

class ActiveStep {
  const ActiveStep({
    required this.step,
    required this.groupRepeatIndex,
    required this.overallIndex,
    required this.totalSteps,
  });

  final WorkoutStep step;
  final int groupRepeatIndex;
  final int overallIndex;
  final int totalSteps;
}

class StepProgress {
  const StepProgress({
    required this.elapsedSeconds,
    required this.targetSeconds,
    required this.elapsedDistanceMeters,
    required this.targetDistanceMeters,
    required this.fraction,
  });

  final int elapsedSeconds;
  final int? targetSeconds;
  final double elapsedDistanceMeters;
  final double? targetDistanceMeters;
  final double fraction;
}

class StepTransitionEvent {
  const StepTransitionEvent({
    required this.type,
    required this.step,
    required this.overallIndex,
    required this.totalSteps,
  });

  final String type;
  final WorkoutStep step;
  final int overallIndex;
  final int totalSteps;
}

class WorkoutStepExecutionEngine {
  WorkoutStepExecutionEngine({required this.workout});

  final StructuredWorkout workout;

  final _eventController = StreamController<StepTransitionEvent>.broadcast();

  late List<ActiveStep> _flatSteps;
  int _currentStepIndex = -1;
  int _stepElapsedSeconds = 0;
  double _stepElapsedDistance = 0.0;
  int _prevTotalSeconds = 0;
  double _prevTotalDistance = 0.0;
  StepExecutionState _state = StepExecutionState.notStarted;

  Stream<StepTransitionEvent> get eventStream => _eventController.stream;
  StepExecutionState get state => _state;
  ActiveStep? get currentActiveStep =>
      _currentStepIndex >= 0 && _currentStepIndex < _flatSteps.length
          ? _flatSteps[_currentStepIndex]
          : null;
  bool get isCompleted => _state == StepExecutionState.completed;
  double get overallFraction {
    if (_flatSteps.isEmpty) return 0;
    if (_currentStepIndex < 0) return 0;
    if (_currentStepIndex >= _flatSteps.length) return 1;
    return (_currentStepIndex + currentStepProgress.fraction) / _flatSteps.length;
  }

  StepProgress get currentStepProgress {
    final active = currentActiveStep;
    if (active == null) {
      return const StepProgress(
        elapsedSeconds: 0,
        targetSeconds: null,
        elapsedDistanceMeters: 0,
        targetDistanceMeters: null,
        fraction: 0,
      );
    }
    final step = active.step;
    double fraction = 0;
    if (step.durationType == StepDurationType.time && step.durationSeconds != null && step.durationSeconds! > 0) {
      fraction = (_stepElapsedSeconds / step.durationSeconds!).clamp(0.0, 1.0);
    } else if (step.durationType == StepDurationType.distance && step.distanceMeters != null && step.distanceMeters! > 0) {
      fraction = (_stepElapsedDistance / step.distanceMeters!).clamp(0.0, 1.0);
    }
    return StepProgress(
      elapsedSeconds: _stepElapsedSeconds,
      targetSeconds: step.durationSeconds,
      elapsedDistanceMeters: _stepElapsedDistance,
      targetDistanceMeters: step.distanceMeters,
      fraction: fraction,
    );
  }

  ActiveStep? get nextStep {
    final nextIndex = _currentStepIndex + 1;
    return nextIndex < _flatSteps.length ? _flatSteps[nextIndex] : null;
  }

  void initialize() {
    _flatSteps = _flattenSteps(workout.steps);
    _currentStepIndex = -1;
    _state = StepExecutionState.notStarted;
  }

  void start() {
    if (_flatSteps.isEmpty) return;
    _currentStepIndex = 0;
    _state = StepExecutionState.active;
    _stepElapsedSeconds = 0;
    _stepElapsedDistance = 0.0;
    _emitEvent('stepStarted');
  }

  void updateMetrics({required int totalElapsedSeconds, required double totalDistanceMeters}) {
    if (_state != StepExecutionState.active || _currentStepIndex < 0) return;

    final deltaSeconds = totalElapsedSeconds - _prevTotalSeconds;
    final deltaDistance = totalDistanceMeters - _prevTotalDistance;

    if (deltaSeconds > 0) _stepElapsedSeconds += deltaSeconds;
    if (deltaDistance > 0) _stepElapsedDistance += deltaDistance;

    _prevTotalSeconds = totalElapsedSeconds;
    _prevTotalDistance = totalDistanceMeters;

    _checkStepCompletion();
  }

  void skipStep() {
    if (_state != StepExecutionState.active || _currentStepIndex < 0) return;
    _advanceStep();
  }

  void pause() {
  }

  void resume(int totalElapsedSeconds, double totalDistanceMeters) {
    _prevTotalSeconds = totalElapsedSeconds;
    _prevTotalDistance = totalDistanceMeters;
  }

  void dispose() {
    _eventController.close();
  }

  void _checkStepCompletion() {
    final active = currentActiveStep;
    if (active == null) return;
    final step = active.step;

    bool completed = false;
    if (step.durationType == StepDurationType.time && step.durationSeconds != null) {
      completed = _stepElapsedSeconds >= step.durationSeconds!;
    } else if (step.durationType == StepDurationType.distance && step.distanceMeters != null) {
      completed = _stepElapsedDistance >= step.distanceMeters!;
    }

    if (completed) {
      _advanceStep();
    }
  }

  void _advanceStep() {
    _emitEvent('stepCompleted');

    _currentStepIndex++;
    if (_currentStepIndex >= _flatSteps.length) {
      _state = StepExecutionState.completed;
      _emitEvent('workoutCompleted');
      return;
    }

    _stepElapsedSeconds = 0;
    _stepElapsedDistance = 0.0;
    _emitEvent('stepStarted');
  }

  void _emitEvent(String type) {
    final active = currentActiveStep;
    if (active == null && type != 'workoutCompleted') return;
    if (type == 'workoutCompleted') {
      _eventController.add(StepTransitionEvent(
        type: type,
        step: _flatSteps.last.step,
        overallIndex: _flatSteps.length,
        totalSteps: _flatSteps.length,
      ));
      return;
    }
    _eventController.add(StepTransitionEvent(
      type: type,
      step: active!.step,
      overallIndex: active.overallIndex,
      totalSteps: active.totalSteps,
    ));
  }

  List<ActiveStep> _flattenSteps(List<StepNode> nodes) {
    final result = <ActiveStep>[];
    _flattenNodes(nodes, result);
    final total = result.length;
    for (int i = 0; i < result.length; i++) {
      result[i] = ActiveStep(
        step: result[i].step,
        groupRepeatIndex: result[i].groupRepeatIndex,
        overallIndex: i,
        totalSteps: total,
      );
    }
    return result;
  }

  void _flattenNodes(List<StepNode> nodes, List<ActiveStep> result) {
    for (final node in nodes) {
      if (node.isStep && node.workoutStep != null) {
        result.add(ActiveStep(
          step: node.workoutStep!,
          groupRepeatIndex: 0,
          overallIndex: 0,
          totalSteps: 0,
        ));
      } else if (node.isGroup && node.group != null) {
        final group = node.group!;
        final reps = group.repeatCount > 0 ? group.repeatCount : 1;
        for (int r = 0; r < reps; r++) {
          _flattenNodes(group.children, result);
        }
      }
    }
  }
}
