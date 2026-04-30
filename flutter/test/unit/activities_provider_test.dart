import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/domain/entities/activity_entities.dart';
import 'package:runflow_flutter/domain/entities/ai_feedback_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

import '../helpers/test_activity_data.dart';

class FakeActivityRepository implements ActivityRepository {
  FakeActivityRepository({
    ActivitiesResponse? response,
  }) : _response = response ?? TestActivityData.createResponse();

  ActivitiesResponse _response;
  final List<ListActivitiesCall> calls = [];
  Object? _error;

  void setResponse(ActivitiesResponse response) {
    _response = response;
    _error = null;
  }

  void setError(Object error) {
    _error = error;
  }

  @override
  Future<ActivitiesResponse> listActivities({
    int limit = 50,
    int offset = 0,
    ActivityType? type,
  }) async {
    calls.add(ListActivitiesCall(limit: limit, offset: offset, type: type));
    if (_error != null) {
      throw _error!;
    }
    return _response;
  }

  @override
  Future<Activity> getActivity(String id) => throw UnimplementedError();

  @override
  Future<Activity> createActivity(RecordedWorkout workout) =>
      throw UnimplementedError();

  @override
  Future<Activity> createManualActivity({
    required String name,
    required DateTime date,
    required String type,
    required double distance,
    required int duration,
    double? hr,
  }) =>
      throw UnimplementedError();

  @override
  Future<AiActivityFeedback> getAiFeedback(String activityId) =>
      throw UnimplementedError();

  @override
  Future<AiActivityFeedback> generateAiFeedback(String activityId) =>
      throw UnimplementedError();

  @override
  Future<Activity> updateActivity(String id,
          {String? name, ActivityType? type, String? trainingType}) =>
      throw UnimplementedError();
}

class ListActivitiesCall {
  ListActivitiesCall({required this.limit, required this.offset, this.type});

  final int limit;
  final int offset;
  final ActivityType? type;
}

void main() {
  group('ActivitiesState', () {
    test('copyWith preserves values when no arguments given', () {
      final state = ActivitiesState(
        activities: [TestActivityData.createActivity()],
        hasMore: true,
        isLoadingMore: false,
        filterType: ActivityType.run,
      );

      final copied = state.copyWith();

      expect(copied.activities.length, state.activities.length);
      expect(copied.hasMore, state.hasMore);
      expect(copied.isLoadingMore, state.isLoadingMore);
      expect(copied.filterType, state.filterType);
    });

    test('copyWith updates specified fields', () {
      const state = ActivitiesState(
        activities: [],
        hasMore: false,
        isLoadingMore: false,
        filterType: null,
      );

      final updated = state.copyWith(
        activities: [TestActivityData.createActivity()],
        hasMore: true,
        isLoadingMore: true,
        filterType: ActivityType.ride,
      );

      expect(updated.activities.length, 1);
      expect(updated.hasMore, true);
      expect(updated.isLoadingMore, true);
      expect(updated.filterType, ActivityType.ride);
    });

    test('copyWith preserves unspecified fields', () {
      final state = ActivitiesState(
        activities: [TestActivityData.createActivity(id: 'a1')],
        hasMore: true,
        isLoadingMore: false,
        filterType: ActivityType.run,
      );

      final updated = state.copyWith(isLoadingMore: true);

      expect(updated.activities.length, 1);
      expect(updated.activities.first.id, 'a1');
      expect(updated.hasMore, true);
      expect(updated.isLoadingMore, true);
      expect(updated.filterType, ActivityType.run);
    });
  });

  group('TestActivityData', () {
    test('createActivity returns valid activity with defaults', () {
      final activity = TestActivityData.createActivity();

      expect(activity.id, 'act1');
      expect(activity.type, ActivityType.run);
      expect(activity.name, 'Morning Run');
      expect(activity.distance, 8500.0);
      expect(activity.movingTime, 2700);
    });

    test('createActivity accepts custom values', () {
      final activity = TestActivityData.createActivity(
        id: 'custom',
        type: ActivityType.ride,
        name: 'Custom Ride',
        distance: 30000.0,
      );

      expect(activity.id, 'custom');
      expect(activity.type, ActivityType.ride);
      expect(activity.name, 'Custom Ride');
      expect(activity.distance, 30000.0);
    });

    test('createResponse returns valid response with defaults', () {
      final response = TestActivityData.createResponse();

      expect(response.activities.length, 1);
      expect(response.total, 1);
      expect(response.hasMore, false);
    });

    test('createResponse accepts custom activities', () {
      final activities = [
        TestActivityData.createActivity(id: 'a1'),
        TestActivityData.createActivity(id: 'a2'),
      ];

      final response = TestActivityData.createResponse(
        activities: activities,
        total: 100,
        hasMore: true,
      );

      expect(response.activities.length, 2);
      expect(response.total, 100);
      expect(response.hasMore, true);
    });
  });

  group('Activities notifier', () {
    late FakeActivityRepository fakeRepo;
    late ProviderContainer container;

    setUp(() {
      fakeRepo = FakeActivityRepository();
      container = ProviderContainer(
        overrides: [
          activityRepositoryProvider.overrideWithValue(fakeRepo),
        ],
      );
    });

    tearDown(() {
      container.dispose();
    });

    test('build loads initial activities from repository', () async {
      final activity = TestActivityData.createActivity(id: 'act1');
      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [activity],
          total: 1,
          hasMore: false,
        ),
      );

      final asyncValue = container.read(activitiesProvider);
      expect(asyncValue.isLoading, true);

      await container.read(activitiesProvider.future);

      final result = container.read(activitiesProvider);
      expect(result.value, isNotNull);
      expect(result.value!.activities.length, 1);
      expect(result.value!.activities.first.id, 'act1');
      expect(result.value!.hasMore, false);
      expect(result.value!.isLoadingMore, false);
      expect(result.value!.filterType, isNull);

      expect(fakeRepo.calls.length, 1);
      expect(fakeRepo.calls.first.limit, 50);
      expect(fakeRepo.calls.first.offset, 0);
      expect(fakeRepo.calls.first.type, isNull);
    });

    test('loadMore fetches next page and appends activities', () async {
      final firstPage = TestActivityData.createResponse(
        activities: List.generate(
          3,
          (i) => TestActivityData.createActivity(id: 'first_$i'),
        ),
        total: 6,
        hasMore: true,
      );
      fakeRepo.setResponse(firstPage);

      await container.read(activitiesProvider.future);
      expect(fakeRepo.calls.length, 1);

      final secondPage = TestActivityData.createResponse(
        activities: List.generate(
          3,
          (i) => TestActivityData.createActivity(id: 'second_$i'),
        ),
        total: 6,
        hasMore: false,
      );
      fakeRepo.setResponse(secondPage);

      final notifier = container.read(activitiesProvider.notifier);
      await notifier.loadMore();

      expect(fakeRepo.calls.length, 2);
      expect(fakeRepo.calls.last.offset, 3);
      expect(fakeRepo.calls.last.limit, 50);

      final result = container.read(activitiesProvider).value!;
      expect(result.activities.length, 6);
      expect(result.activities[0].id, 'first_0');
      expect(result.activities[3].id, 'second_0');
      expect(result.hasMore, false);
      expect(result.isLoadingMore, false);
    });

    test('loadMore does nothing when hasMore is false', () async {
      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'only')],
          hasMore: false,
        ),
      );

      await container.read(activitiesProvider.future);
      expect(fakeRepo.calls.length, 1);

      final notifier = container.read(activitiesProvider.notifier);
      await notifier.loadMore();

      expect(fakeRepo.calls.length, 1);

      final result = container.read(activitiesProvider).value!;
      expect(result.activities.length, 1);
    });

    test('loadMore does nothing when already loading more', () async {
      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'act1')],
          hasMore: true,
        ),
      );

      await container.read(activitiesProvider.future);

      final notifier = container.read(activitiesProvider.notifier);

      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'act2')],
          hasMore: true,
        ),
      );

      final firstLoad = notifier.loadMore();
      await notifier.loadMore();
      await firstLoad;

      expect(fakeRepo.calls.length, 2);
    });

    test('filterByType resets and loads filtered activities', () async {
      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'run1')],
          hasMore: false,
        ),
      );

      await container.read(activitiesProvider.future);

      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [
            TestActivityData.createActivity(
              id: 'ride1',
              type: ActivityType.ride,
            ),
          ],
          hasMore: false,
        ),
      );

      final notifier = container.read(activitiesProvider.notifier);
      await notifier.filterByType(ActivityType.ride);

      expect(fakeRepo.calls.length, 2);
      expect(fakeRepo.calls.last.type, ActivityType.ride);
      expect(fakeRepo.calls.last.offset, 0);

      final result = container.read(activitiesProvider).value!;
      expect(result.activities.length, 1);
      expect(result.activities.first.id, 'ride1');
      expect(result.filterType, ActivityType.ride);
    });

    test('refresh reloads activities from the beginning', () async {
      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'old')],
          hasMore: true,
        ),
      );

      await container.read(activitiesProvider.future);

      final notifier = container.read(activitiesProvider.notifier);

      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [
            TestActivityData.createActivity(id: 'new1'),
            TestActivityData.createActivity(id: 'new2'),
          ],
          hasMore: false,
        ),
      );

      await notifier.refresh();

      expect(fakeRepo.calls.length, 2);
      expect(fakeRepo.calls.last.offset, 0);

      final result = container.read(activitiesProvider).value!;
      expect(result.activities.length, 2);
      expect(result.activities[0].id, 'new1');
      expect(result.activities[1].id, 'new2');
      expect(result.hasMore, false);
    });

    test('refresh preserves filterType', () async {
      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'run1')],
          hasMore: false,
        ),
      );

      await container.read(activitiesProvider.future);

      final notifier = container.read(activitiesProvider.notifier);
      await notifier.filterByType(ActivityType.run);

      fakeRepo.setResponse(
        TestActivityData.createResponse(
          activities: [TestActivityData.createActivity(id: 'refreshed_run')],
          hasMore: false,
        ),
      );

      await notifier.refresh();

      expect(fakeRepo.calls.last.type, ActivityType.run);

      final result = container.read(activitiesProvider).value!;
      expect(result.filterType, ActivityType.run);
      expect(result.activities.first.id, 'refreshed_run');
    });
  });
}
