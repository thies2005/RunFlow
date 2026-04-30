import 'package:runflow_flutter/core/utils/activity_type_helper.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

String formatShareText(Activity activity) {
  final typeLabel = activityTypeLabel(activity.type);
  final distance = formatDistance(activity.distance);
  final duration = formatDuration(activity.movingTime);

  return 'Check out my $typeLabel - $distance in $duration via RunFlow';
}
