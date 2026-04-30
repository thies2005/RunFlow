import 'package:flutter/foundation.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

class ActivitiesResponse {
  const ActivitiesResponse({
    required this.activities,
    required this.total,
    required this.limit,
    required this.offset,
    required this.hasMore,
  });

  final List<Activity> activities;
  final int total;
  final int limit;
  final int offset;
  final bool hasMore;

  ActivitiesResponse copyWith({
    List<Activity>? activities,
    int? total,
    int? limit,
    int? offset,
    bool? hasMore,
  }) {
    return ActivitiesResponse(
      activities: activities ?? this.activities,
      total: total ?? this.total,
      limit: limit ?? this.limit,
      offset: offset ?? this.offset,
      hasMore: hasMore ?? this.hasMore,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ActivitiesResponse &&
          runtimeType == other.runtimeType &&
          listEquals(activities, other.activities) &&
          total == other.total &&
          limit == other.limit &&
          offset == other.offset &&
          hasMore == other.hasMore;

  @override
  int get hashCode => Object.hash(
        Object.hashAll(activities),
        total,
        limit,
        offset,
        hasMore,
      );
}
