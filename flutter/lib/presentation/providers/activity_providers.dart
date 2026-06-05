import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/data/datasources/local/local_activity_datasource.dart';
import 'package:runflow_flutter/data/repositories/activity_repository_impl.dart';
import 'package:runflow_flutter/domain/repositories/activity_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/data/datasources/local/cache_datasource.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/data/services/activity_cache_sync_service.dart';
import 'package:runflow_flutter/data/services/offline_sync_service.dart';
import 'package:runflow_flutter/data/datasources/local/strength_local_datasource.dart';
import 'package:runflow_flutter/domain/services/workout_merge_service.dart';

part 'activity_providers.g.dart';

@Riverpod(keepAlive: true)
LocalActivityDatasource localActivityDatasource(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  return LocalActivityDatasource(database: db);
}

@Riverpod(keepAlive: true)
CacheDatasource cacheDatasource(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  return CacheDatasource(database: db);
}

@Riverpod(keepAlive: true)
ActivityRepository activityRepository(Ref ref) {
  final client = ref.watch(dioClientProvider);
  final localDs = ref.watch(localActivityDatasourceProvider);
  final db = ref.watch(appDatabaseProvider);
  final mergeService = WorkoutMergeService(
    strengthDatasource: StrengthLocalDatasource(database: db),
    activityDatasource: localDs,
  );
  return ActivityRepositoryImpl(
    dio: client.dio,
    localDatasource: localDs,
    cacheDatasource: ref.read(cacheDatasourceProvider),
    mergeService: mergeService,
  );
}

@Riverpod(keepAlive: true)
OfflineSyncService offlineSyncService(Ref ref) {
  final client = ref.watch(dioClientProvider);
  final localDs = ref.watch(localActivityDatasourceProvider);
  return OfflineSyncService(localDatasource: localDs, dio: client.dio);
}

@Riverpod(keepAlive: true)
ActivityCacheSyncService activityCacheSyncService(Ref ref) {
  final client = ref.watch(dioClientProvider);
  final localDs = ref.watch(localActivityDatasourceProvider);
  final cache = ref.watch(cacheDatasourceProvider);
  final db = ref.watch(appDatabaseProvider);
  final mergeService = WorkoutMergeService(
    strengthDatasource: StrengthLocalDatasource(database: db),
    activityDatasource: localDs,
  );
  return ActivityCacheSyncService(
    dio: client.dio,
    localDatasource: localDs,
    cacheDatasource: cache,
    mergeService: mergeService,
  );
}

@riverpod
Future<int> pendingSyncCount(Ref ref) async {
  final localDs = ref.watch(localActivityDatasourceProvider);
  return localDs.getPendingSyncCount();
}

@riverpod
class Activities extends _$Activities {
  int _currentOffset = 0;
  ActivityType? _filterType;
  bool _hasMore = true;
  bool _isLoadingMore = false;

  @override
  Future<ActivitiesState> build() async {
    _currentOffset = 0;
    _hasMore = true;
    _filterType = null;
    final repo = ref.read(activityRepositoryProvider);
    final response = await repo.listActivities(
      limit: 50,
      offset: 0,
      type: _filterType,
    );
    _currentOffset = response.activities.length;
    _hasMore = response.hasMore;
    return ActivitiesState(
      activities: response.activities,
      hasMore: _hasMore,
      isLoadingMore: false,
      filterType: _filterType,
    );
  }

  Future<void> loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    _isLoadingMore = true;
    final current = state.value;
    if (current == null) return;

    state = AsyncValue.data(current.copyWith(isLoadingMore: true));

    try {
      final repo = ref.read(activityRepositoryProvider);
      final response = await repo.listActivities(
        limit: 50,
        offset: _currentOffset,
        type: _filterType,
      );
      _currentOffset += response.activities.length;
      _hasMore = response.hasMore;
      _isLoadingMore = false;
      state = AsyncValue.data(
        ActivitiesState(
          activities: [...current.activities, ...response.activities],
          hasMore: _hasMore,
          isLoadingMore: false,
          filterType: _filterType,
        ),
      );
    } catch (e) {
      _isLoadingMore = false;
      state = AsyncValue.data(current.copyWith(isLoadingMore: false));
    }
  }

  Future<void> filterByType(ActivityType? type) async {
    _filterType = type;
    _currentOffset = 0;
    _hasMore = true;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(activityRepositoryProvider);
      final response = await repo.listActivities(
        limit: 50,
        offset: 0,
        type: _filterType,
      );
      _currentOffset = response.activities.length;
      _hasMore = response.hasMore;
      return ActivitiesState(
        activities: response.activities,
        hasMore: _hasMore,
        isLoadingMore: false,
        filterType: _filterType,
      );
    });
  }

  Future<void> refresh() async {
    _currentOffset = 0;
    _hasMore = true;
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(activityRepositoryProvider);
      final response = await repo.listActivities(
        limit: 50,
        offset: 0,
        type: _filterType,
      );
      _currentOffset = response.activities.length;
      _hasMore = response.hasMore;
      return ActivitiesState(
        activities: response.activities,
        hasMore: _hasMore,
        isLoadingMore: false,
        filterType: _filterType,
      );
    });
  }

  Future<void> addManualActivity({
    required String name,
    required DateTime date,
    required String type,
    required double distance,
    required int duration,
    double? hr,
  }) async {
    final repo = ref.read(activityRepositoryProvider);
    await repo.createManualActivity(
      name: name,
      date: date,
      type: type,
      distance: distance,
      duration: duration,
      hr: hr,
    );
    await refresh();
  }

  Future<void> updateActivity(
    String id, {
    String? name,
    ActivityType? type,
    String? trainingType,
  }) async {
    final repo = ref.read(activityRepositoryProvider);
    await repo.updateActivity(
      id,
      name: name,
      type: type,
      trainingType: trainingType,
    );
    await refresh();
  }
}

class ActivitiesState {
  const ActivitiesState({
    required this.activities,
    required this.hasMore,
    required this.isLoadingMore,
    required this.filterType,
  });

  final List<Activity> activities;
  final bool hasMore;
  final bool isLoadingMore;
  final ActivityType? filterType;

  ActivitiesState copyWith({
    List<Activity>? activities,
    bool? hasMore,
    bool? isLoadingMore,
    ActivityType? filterType,
  }) {
    return ActivitiesState(
      activities: activities ?? this.activities,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      filterType: filterType ?? this.filterType,
    );
  }
}

@riverpod
Future<Activity> activityDetail(Ref ref, String id) async {
  final repo = ref.read(activityRepositoryProvider);
  return repo.getActivity(id);
}
