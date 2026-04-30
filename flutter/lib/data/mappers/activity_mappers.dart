import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/mappers/dashboard_mappers.dart';
import 'package:runflow_flutter/domain/entities/activity_entities.dart' as domain;

extension ActivitiesResponseMapper on ActivitiesResponse {
  domain.ActivitiesResponse toDomain() => domain.ActivitiesResponse(
        activities: activities.map((a) => a.toDomain()).toList(),
        total: total,
        limit: limit,
        offset: offset,
        hasMore: hasMore,
      );
}

extension DomainActivitiesResponseMapper on domain.ActivitiesResponse {
  ActivitiesResponse toData() => ActivitiesResponse(
        activities: activities.map((a) => a.toData()).toList(),
        total: total,
        limit: limit,
        offset: offset,
        hasMore: hasMore,
      );
}
