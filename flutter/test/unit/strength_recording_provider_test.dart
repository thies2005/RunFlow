import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/datasources/local/app_database.dart';
import 'package:runflow_flutter/domain/entities/strength_entities.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/strength_providers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase database;
  late ProviderContainer container;

  setUp(() {
    database = AppDatabase.forTesting();
    container = ProviderContainer(
      overrides: [
        appDatabaseProvider.overrideWithValue(database),
      ],
    );
  });

  tearDown(() {
    database.close();
    container.dispose();
  });

  group('StrengthRecordingNotifier tests', () {
    const benchPress = Exercise(
      id: 'ex_bench',
      name: 'Bench Press',
      primaryMuscle: MuscleGroup.chest,
      restSeconds: 90,
      isBodyweight: false,
    );

    test('initial state has no active workout', () {
      final state = container.read(strengthRecordingProvider);
      expect(state.isActive, false);
      expect(state.startTime, isNull);
      expect(state.exercises, isEmpty);
    });

    test('startEmptyWorkout sets up active session', () {
      container.read(strengthRecordingProvider.notifier).startEmptyWorkout(defaultName: 'Hypertrophy Day');
      final state = container.read(strengthRecordingProvider);

      expect(state.isActive, true);
      expect(state.startTime, isNotNull);
      expect(state.workoutName, 'Hypertrophy Day');
      expect(state.exercises, isEmpty);
    });

    test('addExercise inserts first exercise and default set', () async {
      final notifier = container.read(strengthRecordingProvider.notifier);
      notifier.startEmptyWorkout();
      
      await notifier.addExercise(benchPress);
      // Wait for async prefill logic to execute
      await Future.delayed(Duration.zero);

      final state = container.read(strengthRecordingProvider);
      expect(state.exercises.length, 1);
      expect(state.exercises.first.exerciseName, 'Bench Press');
      expect(state.exercises.first.restSeconds, 90);
      expect(state.exercises.first.sets.length, 1);
      expect(state.exercises.first.sets.first.setNumber, 1);
      expect(state.exercises.first.sets.first.isCompleted, false);
    });

    test('addSet and removeSet modify exercise sets list', () async {
      final notifier = container.read(strengthRecordingProvider.notifier);
      notifier.startEmptyWorkout();
      await notifier.addExercise(benchPress);
      await Future.delayed(Duration.zero);

      final weId = container.read(strengthRecordingProvider).exercises.first.id;

      // Add a set
      notifier.addSet(weId);
      var state = container.read(strengthRecordingProvider);
      expect(state.exercises.first.sets.length, 2);
      expect(state.exercises.first.sets[1].setNumber, 2);

      // Remove the first set
      final setId = state.exercises.first.sets.first.id;
      notifier.removeSet(weId, setId);

      state = container.read(strengthRecordingProvider);
      expect(state.exercises.first.sets.length, 1);
      expect(state.exercises.first.sets.first.setNumber, 1); // Renumbered
    });

    test('updateSet and toggle completion starts rest timer', () async {
      final notifier = container.read(strengthRecordingProvider.notifier);
      notifier.startEmptyWorkout();
      await notifier.addExercise(benchPress);
      await Future.delayed(Duration.zero);

      final we = container.read(strengthRecordingProvider).exercises.first;
      final setId = we.sets.first.id;

      // Check rest timer is inactive
      expect(container.read(restTimerProvider).isActive, false);

      // Complete set
      notifier.updateSet(
        we.id,
        setId,
        weight: 100.0,
        reps: 8,
        isCompleted: true,
      );

      final state = container.read(strengthRecordingProvider);
      final updatedSet = state.exercises.first.sets.first;
      expect(updatedSet.weight, 100.0);
      expect(updatedSet.reps, 8);
      expect(updatedSet.isCompleted, true);

      // Check that rest timer started automatically with 90 seconds
      final timerState = container.read(restTimerProvider);
      expect(timerState.isActive, true);
      expect(timerState.durationSeconds, 90);
      expect(timerState.secondsRemaining, 90);
    });

    test('finishWorkout compiles statistics and saves session', () async {
      final notifier = container.read(strengthRecordingProvider.notifier);
      notifier.startEmptyWorkout(defaultName: 'Powerlifting');
      await notifier.addExercise(benchPress);
      await Future.delayed(Duration.zero);

      final we = container.read(strengthRecordingProvider).exercises.first;
      
      // Add and complete 2 sets
      notifier.updateSet(we.id, we.sets[0].id, weight: 80.0, reps: 5, isCompleted: true);
      notifier.addSet(we.id);
      final weUpdated = container.read(strengthRecordingProvider).exercises.first;
      notifier.updateSet(we.id, weUpdated.sets[1].id, weight: 90.0, reps: 3, isCompleted: true);

      // Save workout
      final session = await notifier.finishWorkout(notes: 'Felt heavy');
      
      expect(session, isNotNull);
      expect(session!.workoutName, 'Powerlifting');
      expect(session.notes, 'Felt heavy');
      expect(session.totalSets, 2);
      expect(session.totalVolume, 80 * 5 + 90 * 3); // 400 + 270 = 670
      
      // State should be reset
      final state = container.read(strengthRecordingProvider);
      expect(state.isActive, false);
      expect(state.exercises, isEmpty);

      // Verify session exists in history provider
      final history = await container.read(strengthHistoryProvider.future);
      expect(history.length, 1);
      expect(history.first.id, session.id);
    });

    test('cancelWorkout discards session state', () async {
      final notifier = container.read(strengthRecordingProvider.notifier);
      notifier.startEmptyWorkout();
      await notifier.addExercise(benchPress);
      await Future.delayed(Duration.zero);

      notifier.cancelWorkout();
      final state = container.read(strengthRecordingProvider);
      
      expect(state.isActive, false);
      expect(state.exercises, isEmpty);
    });
  });

  group('RestTimerNotifier tests', () {
    test('start initiates countdown and adjust updates time', () {
      final timer = container.read(restTimerProvider.notifier);
      
      timer.start(60);
      var state = container.read(restTimerProvider);
      expect(state.isActive, true);
      expect(state.secondsRemaining, 60);

      // Adjust +30s
      timer.adjust(30);
      state = container.read(restTimerProvider);
      expect(state.secondsRemaining, 90);

      // Adjust -40s
      timer.adjust(-40);
      state = container.read(restTimerProvider);
      expect(state.secondsRemaining, 50);

      // Stop
      timer.stop();
      state = container.read(restTimerProvider);
      expect(state.isActive, false);
      expect(state.secondsRemaining, 0);
    });
  });
}
