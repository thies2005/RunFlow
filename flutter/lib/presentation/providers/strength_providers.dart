import 'dart:async';
import 'dart:math';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/data/datasources/local/strength_local_datasource.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart'; // for appDatabaseProvider
import 'package:runflow_flutter/presentation/providers/activity_providers.dart'; // for localActivityDatasourceProvider
import 'package:runflow_flutter/domain/services/workout_merge_service.dart';

part 'strength_providers.g.dart';

@Riverpod(keepAlive: true)
StrengthLocalDatasource strengthDatasource(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  return StrengthLocalDatasource(database: db);
}

@Riverpod(keepAlive: true)
class ExerciseLibrary extends _$ExerciseLibrary {
  @override
  Future<List<Exercise>> build() async {
    final ds = ref.read(strengthDatasourceProvider);
    return ds.getAllExercises();
  }

  Future<void> addCustomExercise(Exercise exercise) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.insertExercise(exercise.copyWith(isCustom: true));
    ref.invalidateSelf();
  }

  Future<void> updateExercise(Exercise exercise) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.updateExercise(exercise);
    ref.invalidateSelf();
  }

  Future<void> deleteExercise(String id) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.deleteExercise(id);
    ref.invalidateSelf();
  }
}

@Riverpod(keepAlive: true)
class StrengthTemplates extends _$StrengthTemplates {
  @override
  Future<List<StrengthWorkoutTemplate>> build() async {
    final ds = ref.read(strengthDatasourceProvider);
    return ds.getAllTemplates();
  }

  Future<void> addTemplate(StrengthWorkoutTemplate template) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.insertTemplate(template);
    ref.invalidateSelf();
  }

  Future<void> updateTemplate(StrengthWorkoutTemplate template) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.updateTemplate(template);
    ref.invalidateSelf();
  }

  Future<void> deleteTemplate(String id) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.deleteTemplate(id);
    ref.invalidateSelf();
  }
}

@Riverpod(keepAlive: true)
class StrengthHistory extends _$StrengthHistory {
  @override
  Future<List<StrengthSession>> build() async {
    final ds = ref.read(strengthDatasourceProvider);
    return ds.getAllSessions();
  }

  Future<void> deleteSession(String id) async {
    final ds = ref.read(strengthDatasourceProvider);
    await ds.deleteSession(id);
    ref.invalidateSelf();
  }
}

class StrengthRecordingState {
  const StrengthRecordingState({
    required this.isActive,
    required this.startTime,
    required this.elapsedSeconds,
    required this.workoutName,
    required this.exercises,
    this.activeTemplateId,
  });

  final bool isActive;
  final DateTime? startTime;
  final int elapsedSeconds;
  final String workoutName;
  final List<WorkoutExercise> exercises;
  final String? activeTemplateId;

  StrengthRecordingState copyWith({
    bool? isActive,
    DateTime? startTime,
    int? elapsedSeconds,
    String? workoutName,
    List<WorkoutExercise>? exercises,
    String? activeTemplateId,
  }) {
    return StrengthRecordingState(
      isActive: isActive ?? this.isActive,
      startTime: startTime ?? this.startTime,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      workoutName: workoutName ?? this.workoutName,
      exercises: exercises ?? this.exercises,
      activeTemplateId: activeTemplateId ?? this.activeTemplateId,
    );
  }
}

@Riverpod(keepAlive: true)
class StrengthRecording extends _$StrengthRecording {
  Timer? _elapsedTimer;

  @override
  StrengthRecordingState build() {
    ref.onDispose(() => _elapsedTimer?.cancel());
    return const StrengthRecordingState(
      isActive: false,
      startTime: null,
      elapsedSeconds: 0,
      workoutName: '',
      exercises: [],
    );
  }

  void startEmptyWorkout({String? defaultName}) {
    _elapsedTimer?.cancel();
    final startTime = DateTime.now();
    state = StrengthRecordingState(
      isActive: true,
      startTime: startTime,
      elapsedSeconds: 0,
      workoutName: defaultName ?? 'Empty Workout',
      exercises: [],
    );
    _startElapsedTimer();
  }

  void startWorkoutFromTemplate(StrengthWorkoutTemplate template) {
    _elapsedTimer?.cancel();
    final startTime = DateTime.now();
    
    state = StrengthRecordingState(
      isActive: true,
      startTime: startTime,
      elapsedSeconds: 0,
      workoutName: template.name,
      exercises: template.exercises.map((e) => e.copyWith(
        id: '${DateTime.now().millisecondsSinceEpoch}_${e.exerciseId}_${weUniqueId()}',
        sets: e.sets.map((s) => s.copyWith(
          isCompleted: false,
        )).toList(),
      )).toList(),
      activeTemplateId: template.id,
    );
    
    _loadPreviousDataForActiveExercises();
    _startElapsedTimer();
  }

  static int _uniqueCounter = 0;
  static String weUniqueId() {
    _uniqueCounter++;
    return _uniqueCounter.toString();
  }

  void _startElapsedTimer() {
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.isActive) {
        state = state.copyWith(elapsedSeconds: state.elapsedSeconds + 1);
      }
    });
  }

  Future<void> _loadPreviousDataForActiveExercises() async {
    final ds = ref.read(strengthDatasourceProvider);
    final List<WorkoutExercise> updatedExercises = [];
    for (final we in state.exercises) {
      final prev = await ds.getLastSessionForExercise(we.exerciseId);
      if (prev != null && prev.sets.isNotEmpty) {
        final prevSets = prev.sets.where((s) => s.isCompleted).toList();
        final List<ExerciseSet> newSets = [];
        for (int i = 0; i < we.sets.length; i++) {
          final s = we.sets[i];
          final prevSet = i < prevSets.length ? prevSets[i] : prevSets.last;
          newSets.add(s.copyWith(
            previousWeight: prevSet.weight,
            previousReps: prevSet.reps,
          ));
        }
        updatedExercises.add(we.copyWith(sets: newSets));
      } else {
        updatedExercises.add(we);
      }
    }
    state = state.copyWith(exercises: updatedExercises);
  }

  void updateWorkoutName(String name) {
    state = state.copyWith(workoutName: name);
  }

  Future<void> addExercise(Exercise exercise) async {
    final ds = ref.read(strengthDatasourceProvider);
    final weId = '${DateTime.now().millisecondsSinceEpoch}_${exercise.id}_${weUniqueId()}';
    final prev = await ds.getLastSessionForExercise(exercise.id);
    
    List<ExerciseSet> initialSets = [];
    if (prev != null && prev.sets.isNotEmpty) {
      final prevSets = prev.sets.where((s) => s.isCompleted).toList();
      initialSets = List.generate(prevSets.isEmpty ? 1 : prevSets.length, (index) {
        final prevSet = index < prevSets.length ? prevSets[index] : prevSets.last;
        return ExerciseSet(
          id: '${weId}_$index',
          setNumber: index + 1,
          previousWeight: prevSet.weight,
          previousReps: prevSet.reps,
          weight: prevSet.weight,
          reps: prevSet.reps,
        );
      });
    } else {
      initialSets = [
        ExerciseSet(
          id: '${weId}_0',
          setNumber: 1,
        )
      ];
    }

    final newExercise = WorkoutExercise(
      id: weId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      sets: initialSets,
      restSeconds: exercise.restSeconds,
    );

    state = state.copyWith(exercises: [...state.exercises, newExercise]);
  }

  void removeExercise(String id) {
    state = state.copyWith(
      exercises: state.exercises.where((e) => e.id != id).toList(),
    );
  }

  void updateExerciseNotes(String id, String? notes) {
    state = state.copyWith(
      exercises: state.exercises.map((e) => e.id == id ? e.copyWith(notes: notes) : e).toList(),
    );
  }

  void addSet(String exerciseId) {
    state = state.copyWith(
      exercises: state.exercises.map((we) {
        if (we.id != exerciseId) return we;
        final nextNum = we.sets.length + 1;
        final lastSet = we.sets.isNotEmpty ? we.sets.last : null;
        final newSet = ExerciseSet(
          id: '${we.id}_${nextNum - 1}_${DateTime.now().microsecondsSinceEpoch}',
          setNumber: nextNum,
          weight: lastSet?.weight,
          reps: lastSet?.reps,
          isWarmup: lastSet?.isWarmup ?? false,
          isDropSet: lastSet?.isDropSet ?? false,
          previousWeight: lastSet?.previousWeight,
          previousReps: lastSet?.previousReps,
        );
        return we.copyWith(sets: [...we.sets, newSet]);
      }).toList(),
    );
  }

  void removeSet(String exerciseId, String setId) {
    state = state.copyWith(
      exercises: state.exercises.map((we) {
        if (we.id != exerciseId) return we;
        final updatedSets = we.sets.where((s) => s.id != setId).toList();
        final renumbered = List.generate(updatedSets.length, (i) {
          return updatedSets[i].copyWith(setNumber: i + 1);
        });
        return we.copyWith(sets: renumbered);
      }).toList(),
    );
  }

  void updateSet(String exerciseId, String setId, {
    double? weight,
    int? reps,
    bool? isWarmup,
    bool? isDropSet,
    bool? isCompleted,
    int? rpe,
  }) {
    state = state.copyWith(
      exercises: state.exercises.map((we) {
        if (we.id != exerciseId) return we;
        return we.copyWith(
          sets: we.sets.map((s) {
            if (s.id != setId) return s;
            
            final oldCompleted = s.isCompleted;
            final updated = s.copyWith(
              weight: weight,
              reps: reps,
              isWarmup: isWarmup,
              isDropSet: isDropSet,
              isCompleted: isCompleted,
              rpe: rpe,
            );
            
            if (isCompleted == true && !oldCompleted) {
              ref.read(restTimerProvider.notifier).start(we.restSeconds);
            }
            
            return updated;
          }).toList(),
        );
      }).toList(),
    );
  }

  void cancelWorkout() {
    _elapsedTimer?.cancel();
    ref.read(restTimerProvider.notifier).stop();
    state = const StrengthRecordingState(
      isActive: false,
      startTime: null,
      elapsedSeconds: 0,
      workoutName: '',
      exercises: [],
    );
  }

  Future<StrengthSession?> finishWorkout({String? notes}) async {
    if (!state.isActive || state.startTime == null) return null;

    final endTime = DateTime.now();
    final duration = endTime.difference(state.startTime!).inSeconds;

    double totalVolume = 0;
    int totalSets = 0;
    
    final finalExercises = state.exercises.map((we) {
      final completedSets = we.sets.where((s) => s.isCompleted).toList();
      for (final s in completedSets) {
        totalVolume += (s.weight ?? 0.0) * (s.reps ?? 0);
        totalSets++;
      }
      return we;
    }).toList();

    final session = StrengthSession(
      id: 'session_${DateTime.now().millisecondsSinceEpoch}',
      templateId: state.activeTemplateId,
      workoutName: state.workoutName,
      startTime: state.startTime!,
      endTime: endTime,
      durationSeconds: duration,
      exercises: finalExercises,
      totalVolume: totalVolume,
      totalSets: totalSets,
      notes: notes,
    );

    final ds = ref.read(strengthDatasourceProvider);
    await ds.insertSession(session);

    final mergeService = WorkoutMergeService(
      strengthDatasource: ds,
      activityDatasource: ref.read(localActivityDatasourceProvider),
    );
    await mergeService.mergeExistingActivitiesForSession(session);

    ref.invalidate(strengthHistoryProvider);

    cancelWorkout();
    return session;
  }
}

class RestTimerState {
  const RestTimerState({
    required this.durationSeconds,
    required this.secondsRemaining,
    required this.isActive,
  });

  final int durationSeconds;
  final int secondsRemaining;
  final bool isActive;

  RestTimerState copyWith({
    int? durationSeconds,
    int? secondsRemaining,
    bool? isActive,
  }) {
    return RestTimerState(
      durationSeconds: durationSeconds ?? this.durationSeconds,
      secondsRemaining: secondsRemaining ?? this.secondsRemaining,
      isActive: isActive ?? this.isActive,
    );
  }
}

@Riverpod(keepAlive: true)
class RestTimer extends _$RestTimer {
  Timer? _timer;

  @override
  RestTimerState build() {
    ref.onDispose(() => _timer?.cancel());
    return const RestTimerState(durationSeconds: 0, secondsRemaining: 0, isActive: false);
  }

  void start(int duration) {
    _timer?.cancel();
    state = RestTimerState(
      durationSeconds: duration,
      secondsRemaining: duration,
      isActive: true,
    );
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.secondsRemaining <= 1) {
        _timer?.cancel();
        state = state.copyWith(secondsRemaining: 0, isActive: false);
      } else {
        state = state.copyWith(secondsRemaining: state.secondsRemaining - 1);
      }
    });
  }

  void adjust(int seconds) {
    if (!state.isActive) return;
    final newRemaining = max(0, state.secondsRemaining + seconds);
    if (newRemaining == 0) {
      _timer?.cancel();
      state = state.copyWith(secondsRemaining: 0, isActive: false);
    } else {
      state = state.copyWith(secondsRemaining: newRemaining);
    }
  }

  void stop() {
    _timer?.cancel();
    state = const RestTimerState(durationSeconds: 0, secondsRemaining: 0, isActive: false);
  }
}

enum AnalyticsViewMode { endurance, strength }

@riverpod
class AnalyticsViewModeState extends _$AnalyticsViewModeState {
  @override
  AnalyticsViewMode build() {
    return AnalyticsViewMode.endurance;
  }

  void setMode(AnalyticsViewMode mode) {
    state = mode;
  }
}

@riverpod
Future<Map<String, dynamic>> strengthAnalytics(Ref ref) async {
  final history = await ref.watch(strengthHistoryProvider.future);
  
  final int totalWorkouts = history.length;
  double totalVolume = 0.0;
  int totalSets = 0;
  double totalDurationSeconds = 0.0;

  final Map<MuscleGroup, double> muscleVolume = {};
  final Map<String, List<Map<String, dynamic>>> exercise1RMHistory = {};

  for (final session in history) {
    totalVolume += session.totalVolume;
    totalSets += session.totalSets;
    totalDurationSeconds += session.durationSeconds;

    for (final we in session.exercises) {
      double weVolume = 0.0;
      double maxEst1RM = 0.0;
      for (final s in we.sets) {
        if (s.isCompleted && s.weight != null && s.reps != null) {
          final w = s.weight!;
          final r = s.reps!;
          weVolume += w * r;

          final double est1RM = w * (1 + r / 30.0);
          if (est1RM > maxEst1RM) {
            maxEst1RM = est1RM;
          }
        }
      }

      final muscle = we.primaryMuscle;
      muscleVolume[muscle] = (muscleVolume[muscle] ?? 0.0) + weVolume;

      if (maxEst1RM > 0) {
        final list = exercise1RMHistory[we.exerciseId] ?? [];
        list.add({
          'date': session.startTime,
          'oneRepMax': maxEst1RM,
        });
        exercise1RMHistory[we.exerciseId] = list;
      }
    }
  }

  exercise1RMHistory.forEach((key, list) {
    list.sort((a, b) => (a['date'] as DateTime).compareTo(b['date'] as DateTime));
  });

  return {
    'totalWorkouts': totalWorkouts,
    'totalVolume': totalVolume,
    'totalSets': totalSets,
    'avgDurationSeconds': totalWorkouts > 0 ? totalDurationSeconds / totalWorkouts : 0.0,
    'muscleVolume': muscleVolume,
    'exercise1RMHistory': exercise1RMHistory,
  };
}
