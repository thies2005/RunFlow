import 'package:freezed_annotation/freezed_annotation.dart';

part 'running_profile_models.freezed.dart';
part 'running_profile_models.g.dart';

enum ExperienceLevel {
  @JsonValue('BEGINNER')
  beginner,
  @JsonValue('INTERMEDIATE')
  intermediate,
  @JsonValue('ADVANCED')
  advanced,
}

enum PreferredDistance {
  @JsonValue('FIVE_K')
  fiveK,
  @JsonValue('TEN_K')
  tenK,
  @JsonValue('HALF_MARATHON')
  halfMarathon,
  @JsonValue('MARATHON')
  marathon,
  @JsonValue('ULTRA')
  ultra,
}

@Freezed(copyWith: true)
sealed class RunningProfile with _$RunningProfile {
  const factory RunningProfile({
    @Default(0.0) double weeklyMileage,
    @Default(ExperienceLevel.intermediate) ExperienceLevel experienceLevel,
    @Default([]) List<PreferredDistance> preferredDistances,
    @Default(4) int runsPerWeek,
    @Default(true) bool hasRaceExperience,
    @Default(false) bool isInjured,
  }) = _RunningProfile;
  const RunningProfile._();

  factory RunningProfile.fromJson(Map<String, dynamic> json) =>
      _$RunningProfileFromJson(json);
}
