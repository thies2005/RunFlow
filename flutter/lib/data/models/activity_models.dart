import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

part 'activity_models.freezed.dart';
part 'activity_models.g.dart';

@Freezed(copyWith: true)
sealed class ActivitiesResponse with _$ActivitiesResponse {
  const factory ActivitiesResponse({
    required List<Activity> activities,
    required int total,
    required int limit,
    required int offset,
    required bool hasMore,
  }) = _ActivitiesResponse;
  const ActivitiesResponse._();

  factory ActivitiesResponse.fromJson(Map<String, dynamic> json) =>
      _$ActivitiesResponseFromJson(json);
}
