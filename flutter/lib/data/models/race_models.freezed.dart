// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'race_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RaceCountdownData {

 String get goalId; String get goalName; String get raceType; DateTime get raceDate; int get daysToRace; int get weeksToRace; int get planWeeks; int get weeksCompleted; double get progressPercent; int? get targetTimeSeconds; int? get projectedTimeSeconds; double? get projectedVdot; double get currentWeekMileage; double get plannedWeekMileage; bool get isRaceDay; bool get isPostRace; bool get isOverdue; bool get hasRaceResult; int get totalWorkouts; int get completedWorkouts;
/// Create a copy of RaceCountdownData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RaceCountdownDataCopyWith<RaceCountdownData> get copyWith => _$RaceCountdownDataCopyWithImpl<RaceCountdownData>(this as RaceCountdownData, _$identity);

  /// Serializes this RaceCountdownData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RaceCountdownData&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.goalName, goalName) || other.goalName == goalName)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.daysToRace, daysToRace) || other.daysToRace == daysToRace)&&(identical(other.weeksToRace, weeksToRace) || other.weeksToRace == weeksToRace)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.weeksCompleted, weeksCompleted) || other.weeksCompleted == weeksCompleted)&&(identical(other.progressPercent, progressPercent) || other.progressPercent == progressPercent)&&(identical(other.targetTimeSeconds, targetTimeSeconds) || other.targetTimeSeconds == targetTimeSeconds)&&(identical(other.projectedTimeSeconds, projectedTimeSeconds) || other.projectedTimeSeconds == projectedTimeSeconds)&&(identical(other.projectedVdot, projectedVdot) || other.projectedVdot == projectedVdot)&&(identical(other.currentWeekMileage, currentWeekMileage) || other.currentWeekMileage == currentWeekMileage)&&(identical(other.plannedWeekMileage, plannedWeekMileage) || other.plannedWeekMileage == plannedWeekMileage)&&(identical(other.isRaceDay, isRaceDay) || other.isRaceDay == isRaceDay)&&(identical(other.isPostRace, isPostRace) || other.isPostRace == isPostRace)&&(identical(other.isOverdue, isOverdue) || other.isOverdue == isOverdue)&&(identical(other.hasRaceResult, hasRaceResult) || other.hasRaceResult == hasRaceResult)&&(identical(other.totalWorkouts, totalWorkouts) || other.totalWorkouts == totalWorkouts)&&(identical(other.completedWorkouts, completedWorkouts) || other.completedWorkouts == completedWorkouts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,goalId,goalName,raceType,raceDate,daysToRace,weeksToRace,planWeeks,weeksCompleted,progressPercent,targetTimeSeconds,projectedTimeSeconds,projectedVdot,currentWeekMileage,plannedWeekMileage,isRaceDay,isPostRace,isOverdue,hasRaceResult,totalWorkouts,completedWorkouts]);

@override
String toString() {
  return 'RaceCountdownData(goalId: $goalId, goalName: $goalName, raceType: $raceType, raceDate: $raceDate, daysToRace: $daysToRace, weeksToRace: $weeksToRace, planWeeks: $planWeeks, weeksCompleted: $weeksCompleted, progressPercent: $progressPercent, targetTimeSeconds: $targetTimeSeconds, projectedTimeSeconds: $projectedTimeSeconds, projectedVdot: $projectedVdot, currentWeekMileage: $currentWeekMileage, plannedWeekMileage: $plannedWeekMileage, isRaceDay: $isRaceDay, isPostRace: $isPostRace, isOverdue: $isOverdue, hasRaceResult: $hasRaceResult, totalWorkouts: $totalWorkouts, completedWorkouts: $completedWorkouts)';
}


}

/// @nodoc
abstract mixin class $RaceCountdownDataCopyWith<$Res>  {
  factory $RaceCountdownDataCopyWith(RaceCountdownData value, $Res Function(RaceCountdownData) _then) = _$RaceCountdownDataCopyWithImpl;
@useResult
$Res call({
 String goalId, String goalName, String raceType, DateTime raceDate, int daysToRace, int weeksToRace, int planWeeks, int weeksCompleted, double progressPercent, int? targetTimeSeconds, int? projectedTimeSeconds, double? projectedVdot, double currentWeekMileage, double plannedWeekMileage, bool isRaceDay, bool isPostRace, bool isOverdue, bool hasRaceResult, int totalWorkouts, int completedWorkouts
});




}
/// @nodoc
class _$RaceCountdownDataCopyWithImpl<$Res>
    implements $RaceCountdownDataCopyWith<$Res> {
  _$RaceCountdownDataCopyWithImpl(this._self, this._then);

  final RaceCountdownData _self;
  final $Res Function(RaceCountdownData) _then;

/// Create a copy of RaceCountdownData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? goalId = null,Object? goalName = null,Object? raceType = null,Object? raceDate = null,Object? daysToRace = null,Object? weeksToRace = null,Object? planWeeks = null,Object? weeksCompleted = null,Object? progressPercent = null,Object? targetTimeSeconds = freezed,Object? projectedTimeSeconds = freezed,Object? projectedVdot = freezed,Object? currentWeekMileage = null,Object? plannedWeekMileage = null,Object? isRaceDay = null,Object? isPostRace = null,Object? isOverdue = null,Object? hasRaceResult = null,Object? totalWorkouts = null,Object? completedWorkouts = null,}) {
  return _then(_self.copyWith(
goalId: null == goalId ? _self.goalId : goalId // ignore: cast_nullable_to_non_nullable
as String,goalName: null == goalName ? _self.goalName : goalName // ignore: cast_nullable_to_non_nullable
as String,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as String,raceDate: null == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime,daysToRace: null == daysToRace ? _self.daysToRace : daysToRace // ignore: cast_nullable_to_non_nullable
as int,weeksToRace: null == weeksToRace ? _self.weeksToRace : weeksToRace // ignore: cast_nullable_to_non_nullable
as int,planWeeks: null == planWeeks ? _self.planWeeks : planWeeks // ignore: cast_nullable_to_non_nullable
as int,weeksCompleted: null == weeksCompleted ? _self.weeksCompleted : weeksCompleted // ignore: cast_nullable_to_non_nullable
as int,progressPercent: null == progressPercent ? _self.progressPercent : progressPercent // ignore: cast_nullable_to_non_nullable
as double,targetTimeSeconds: freezed == targetTimeSeconds ? _self.targetTimeSeconds : targetTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,projectedTimeSeconds: freezed == projectedTimeSeconds ? _self.projectedTimeSeconds : projectedTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,projectedVdot: freezed == projectedVdot ? _self.projectedVdot : projectedVdot // ignore: cast_nullable_to_non_nullable
as double?,currentWeekMileage: null == currentWeekMileage ? _self.currentWeekMileage : currentWeekMileage // ignore: cast_nullable_to_non_nullable
as double,plannedWeekMileage: null == plannedWeekMileage ? _self.plannedWeekMileage : plannedWeekMileage // ignore: cast_nullable_to_non_nullable
as double,isRaceDay: null == isRaceDay ? _self.isRaceDay : isRaceDay // ignore: cast_nullable_to_non_nullable
as bool,isPostRace: null == isPostRace ? _self.isPostRace : isPostRace // ignore: cast_nullable_to_non_nullable
as bool,isOverdue: null == isOverdue ? _self.isOverdue : isOverdue // ignore: cast_nullable_to_non_nullable
as bool,hasRaceResult: null == hasRaceResult ? _self.hasRaceResult : hasRaceResult // ignore: cast_nullable_to_non_nullable
as bool,totalWorkouts: null == totalWorkouts ? _self.totalWorkouts : totalWorkouts // ignore: cast_nullable_to_non_nullable
as int,completedWorkouts: null == completedWorkouts ? _self.completedWorkouts : completedWorkouts // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [RaceCountdownData].
extension RaceCountdownDataPatterns on RaceCountdownData {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RaceCountdownData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RaceCountdownData() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RaceCountdownData value)  $default,){
final _that = this;
switch (_that) {
case _RaceCountdownData():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RaceCountdownData value)?  $default,){
final _that = this;
switch (_that) {
case _RaceCountdownData() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String goalId,  String goalName,  String raceType,  DateTime raceDate,  int daysToRace,  int weeksToRace,  int planWeeks,  int weeksCompleted,  double progressPercent,  int? targetTimeSeconds,  int? projectedTimeSeconds,  double? projectedVdot,  double currentWeekMileage,  double plannedWeekMileage,  bool isRaceDay,  bool isPostRace,  bool isOverdue,  bool hasRaceResult,  int totalWorkouts,  int completedWorkouts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RaceCountdownData() when $default != null:
return $default(_that.goalId,_that.goalName,_that.raceType,_that.raceDate,_that.daysToRace,_that.weeksToRace,_that.planWeeks,_that.weeksCompleted,_that.progressPercent,_that.targetTimeSeconds,_that.projectedTimeSeconds,_that.projectedVdot,_that.currentWeekMileage,_that.plannedWeekMileage,_that.isRaceDay,_that.isPostRace,_that.isOverdue,_that.hasRaceResult,_that.totalWorkouts,_that.completedWorkouts);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String goalId,  String goalName,  String raceType,  DateTime raceDate,  int daysToRace,  int weeksToRace,  int planWeeks,  int weeksCompleted,  double progressPercent,  int? targetTimeSeconds,  int? projectedTimeSeconds,  double? projectedVdot,  double currentWeekMileage,  double plannedWeekMileage,  bool isRaceDay,  bool isPostRace,  bool isOverdue,  bool hasRaceResult,  int totalWorkouts,  int completedWorkouts)  $default,) {final _that = this;
switch (_that) {
case _RaceCountdownData():
return $default(_that.goalId,_that.goalName,_that.raceType,_that.raceDate,_that.daysToRace,_that.weeksToRace,_that.planWeeks,_that.weeksCompleted,_that.progressPercent,_that.targetTimeSeconds,_that.projectedTimeSeconds,_that.projectedVdot,_that.currentWeekMileage,_that.plannedWeekMileage,_that.isRaceDay,_that.isPostRace,_that.isOverdue,_that.hasRaceResult,_that.totalWorkouts,_that.completedWorkouts);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String goalId,  String goalName,  String raceType,  DateTime raceDate,  int daysToRace,  int weeksToRace,  int planWeeks,  int weeksCompleted,  double progressPercent,  int? targetTimeSeconds,  int? projectedTimeSeconds,  double? projectedVdot,  double currentWeekMileage,  double plannedWeekMileage,  bool isRaceDay,  bool isPostRace,  bool isOverdue,  bool hasRaceResult,  int totalWorkouts,  int completedWorkouts)?  $default,) {final _that = this;
switch (_that) {
case _RaceCountdownData() when $default != null:
return $default(_that.goalId,_that.goalName,_that.raceType,_that.raceDate,_that.daysToRace,_that.weeksToRace,_that.planWeeks,_that.weeksCompleted,_that.progressPercent,_that.targetTimeSeconds,_that.projectedTimeSeconds,_that.projectedVdot,_that.currentWeekMileage,_that.plannedWeekMileage,_that.isRaceDay,_that.isPostRace,_that.isOverdue,_that.hasRaceResult,_that.totalWorkouts,_that.completedWorkouts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RaceCountdownData extends RaceCountdownData {
  const _RaceCountdownData({required this.goalId, required this.goalName, required this.raceType, required this.raceDate, required this.daysToRace, required this.weeksToRace, required this.planWeeks, required this.weeksCompleted, required this.progressPercent, required this.targetTimeSeconds, required this.projectedTimeSeconds, required this.projectedVdot, required this.currentWeekMileage, required this.plannedWeekMileage, required this.isRaceDay, required this.isPostRace, required this.isOverdue, required this.hasRaceResult, required this.totalWorkouts, required this.completedWorkouts}): super._();
  factory _RaceCountdownData.fromJson(Map<String, dynamic> json) => _$RaceCountdownDataFromJson(json);

@override final  String goalId;
@override final  String goalName;
@override final  String raceType;
@override final  DateTime raceDate;
@override final  int daysToRace;
@override final  int weeksToRace;
@override final  int planWeeks;
@override final  int weeksCompleted;
@override final  double progressPercent;
@override final  int? targetTimeSeconds;
@override final  int? projectedTimeSeconds;
@override final  double? projectedVdot;
@override final  double currentWeekMileage;
@override final  double plannedWeekMileage;
@override final  bool isRaceDay;
@override final  bool isPostRace;
@override final  bool isOverdue;
@override final  bool hasRaceResult;
@override final  int totalWorkouts;
@override final  int completedWorkouts;

/// Create a copy of RaceCountdownData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RaceCountdownDataCopyWith<_RaceCountdownData> get copyWith => __$RaceCountdownDataCopyWithImpl<_RaceCountdownData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RaceCountdownDataToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RaceCountdownData&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.goalName, goalName) || other.goalName == goalName)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.daysToRace, daysToRace) || other.daysToRace == daysToRace)&&(identical(other.weeksToRace, weeksToRace) || other.weeksToRace == weeksToRace)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.weeksCompleted, weeksCompleted) || other.weeksCompleted == weeksCompleted)&&(identical(other.progressPercent, progressPercent) || other.progressPercent == progressPercent)&&(identical(other.targetTimeSeconds, targetTimeSeconds) || other.targetTimeSeconds == targetTimeSeconds)&&(identical(other.projectedTimeSeconds, projectedTimeSeconds) || other.projectedTimeSeconds == projectedTimeSeconds)&&(identical(other.projectedVdot, projectedVdot) || other.projectedVdot == projectedVdot)&&(identical(other.currentWeekMileage, currentWeekMileage) || other.currentWeekMileage == currentWeekMileage)&&(identical(other.plannedWeekMileage, plannedWeekMileage) || other.plannedWeekMileage == plannedWeekMileage)&&(identical(other.isRaceDay, isRaceDay) || other.isRaceDay == isRaceDay)&&(identical(other.isPostRace, isPostRace) || other.isPostRace == isPostRace)&&(identical(other.isOverdue, isOverdue) || other.isOverdue == isOverdue)&&(identical(other.hasRaceResult, hasRaceResult) || other.hasRaceResult == hasRaceResult)&&(identical(other.totalWorkouts, totalWorkouts) || other.totalWorkouts == totalWorkouts)&&(identical(other.completedWorkouts, completedWorkouts) || other.completedWorkouts == completedWorkouts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,goalId,goalName,raceType,raceDate,daysToRace,weeksToRace,planWeeks,weeksCompleted,progressPercent,targetTimeSeconds,projectedTimeSeconds,projectedVdot,currentWeekMileage,plannedWeekMileage,isRaceDay,isPostRace,isOverdue,hasRaceResult,totalWorkouts,completedWorkouts]);

@override
String toString() {
  return 'RaceCountdownData(goalId: $goalId, goalName: $goalName, raceType: $raceType, raceDate: $raceDate, daysToRace: $daysToRace, weeksToRace: $weeksToRace, planWeeks: $planWeeks, weeksCompleted: $weeksCompleted, progressPercent: $progressPercent, targetTimeSeconds: $targetTimeSeconds, projectedTimeSeconds: $projectedTimeSeconds, projectedVdot: $projectedVdot, currentWeekMileage: $currentWeekMileage, plannedWeekMileage: $plannedWeekMileage, isRaceDay: $isRaceDay, isPostRace: $isPostRace, isOverdue: $isOverdue, hasRaceResult: $hasRaceResult, totalWorkouts: $totalWorkouts, completedWorkouts: $completedWorkouts)';
}


}

/// @nodoc
abstract mixin class _$RaceCountdownDataCopyWith<$Res> implements $RaceCountdownDataCopyWith<$Res> {
  factory _$RaceCountdownDataCopyWith(_RaceCountdownData value, $Res Function(_RaceCountdownData) _then) = __$RaceCountdownDataCopyWithImpl;
@override @useResult
$Res call({
 String goalId, String goalName, String raceType, DateTime raceDate, int daysToRace, int weeksToRace, int planWeeks, int weeksCompleted, double progressPercent, int? targetTimeSeconds, int? projectedTimeSeconds, double? projectedVdot, double currentWeekMileage, double plannedWeekMileage, bool isRaceDay, bool isPostRace, bool isOverdue, bool hasRaceResult, int totalWorkouts, int completedWorkouts
});




}
/// @nodoc
class __$RaceCountdownDataCopyWithImpl<$Res>
    implements _$RaceCountdownDataCopyWith<$Res> {
  __$RaceCountdownDataCopyWithImpl(this._self, this._then);

  final _RaceCountdownData _self;
  final $Res Function(_RaceCountdownData) _then;

/// Create a copy of RaceCountdownData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? goalId = null,Object? goalName = null,Object? raceType = null,Object? raceDate = null,Object? daysToRace = null,Object? weeksToRace = null,Object? planWeeks = null,Object? weeksCompleted = null,Object? progressPercent = null,Object? targetTimeSeconds = freezed,Object? projectedTimeSeconds = freezed,Object? projectedVdot = freezed,Object? currentWeekMileage = null,Object? plannedWeekMileage = null,Object? isRaceDay = null,Object? isPostRace = null,Object? isOverdue = null,Object? hasRaceResult = null,Object? totalWorkouts = null,Object? completedWorkouts = null,}) {
  return _then(_RaceCountdownData(
goalId: null == goalId ? _self.goalId : goalId // ignore: cast_nullable_to_non_nullable
as String,goalName: null == goalName ? _self.goalName : goalName // ignore: cast_nullable_to_non_nullable
as String,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as String,raceDate: null == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime,daysToRace: null == daysToRace ? _self.daysToRace : daysToRace // ignore: cast_nullable_to_non_nullable
as int,weeksToRace: null == weeksToRace ? _self.weeksToRace : weeksToRace // ignore: cast_nullable_to_non_nullable
as int,planWeeks: null == planWeeks ? _self.planWeeks : planWeeks // ignore: cast_nullable_to_non_nullable
as int,weeksCompleted: null == weeksCompleted ? _self.weeksCompleted : weeksCompleted // ignore: cast_nullable_to_non_nullable
as int,progressPercent: null == progressPercent ? _self.progressPercent : progressPercent // ignore: cast_nullable_to_non_nullable
as double,targetTimeSeconds: freezed == targetTimeSeconds ? _self.targetTimeSeconds : targetTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,projectedTimeSeconds: freezed == projectedTimeSeconds ? _self.projectedTimeSeconds : projectedTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,projectedVdot: freezed == projectedVdot ? _self.projectedVdot : projectedVdot // ignore: cast_nullable_to_non_nullable
as double?,currentWeekMileage: null == currentWeekMileage ? _self.currentWeekMileage : currentWeekMileage // ignore: cast_nullable_to_non_nullable
as double,plannedWeekMileage: null == plannedWeekMileage ? _self.plannedWeekMileage : plannedWeekMileage // ignore: cast_nullable_to_non_nullable
as double,isRaceDay: null == isRaceDay ? _self.isRaceDay : isRaceDay // ignore: cast_nullable_to_non_nullable
as bool,isPostRace: null == isPostRace ? _self.isPostRace : isPostRace // ignore: cast_nullable_to_non_nullable
as bool,isOverdue: null == isOverdue ? _self.isOverdue : isOverdue // ignore: cast_nullable_to_non_nullable
as bool,hasRaceResult: null == hasRaceResult ? _self.hasRaceResult : hasRaceResult // ignore: cast_nullable_to_non_nullable
as bool,totalWorkouts: null == totalWorkouts ? _self.totalWorkouts : totalWorkouts // ignore: cast_nullable_to_non_nullable
as int,completedWorkouts: null == completedWorkouts ? _self.completedWorkouts : completedWorkouts // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$TrainingStatusData {

@JsonKey(fromJson: _parseDouble) double get shapePercent;@JsonKey(fromJson: _parseDouble) double get effectiveVO2max;@JsonKey(fromJson: _parseDouble) double get correctionFactor;@JsonKey(fromJson: _parseDouble) double get ctl;@JsonKey(fromJson: _parseDouble) double get atl;@JsonKey(fromJson: _parseDouble) double get tsb;@JsonKey(fromJson: _parseDouble) double get workloadRatio;@JsonKey(fromJson: _parseDouble) double get easyTrimp;@JsonKey(fromJson: _parseDouble) double get maxCtl;@JsonKey(fromJson: _parseDouble) double get maxAtl;@JsonKey(fromJson: _parseDouble) double get ctlPercent;@JsonKey(fromJson: _parseDouble) double get atlPercent;
/// Create a copy of TrainingStatusData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TrainingStatusDataCopyWith<TrainingStatusData> get copyWith => _$TrainingStatusDataCopyWithImpl<TrainingStatusData>(this as TrainingStatusData, _$identity);

  /// Serializes this TrainingStatusData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TrainingStatusData&&(identical(other.shapePercent, shapePercent) || other.shapePercent == shapePercent)&&(identical(other.effectiveVO2max, effectiveVO2max) || other.effectiveVO2max == effectiveVO2max)&&(identical(other.correctionFactor, correctionFactor) || other.correctionFactor == correctionFactor)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.easyTrimp, easyTrimp) || other.easyTrimp == easyTrimp)&&(identical(other.maxCtl, maxCtl) || other.maxCtl == maxCtl)&&(identical(other.maxAtl, maxAtl) || other.maxAtl == maxAtl)&&(identical(other.ctlPercent, ctlPercent) || other.ctlPercent == ctlPercent)&&(identical(other.atlPercent, atlPercent) || other.atlPercent == atlPercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,shapePercent,effectiveVO2max,correctionFactor,ctl,atl,tsb,workloadRatio,easyTrimp,maxCtl,maxAtl,ctlPercent,atlPercent);

@override
String toString() {
  return 'TrainingStatusData(shapePercent: $shapePercent, effectiveVO2max: $effectiveVO2max, correctionFactor: $correctionFactor, ctl: $ctl, atl: $atl, tsb: $tsb, workloadRatio: $workloadRatio, easyTrimp: $easyTrimp, maxCtl: $maxCtl, maxAtl: $maxAtl, ctlPercent: $ctlPercent, atlPercent: $atlPercent)';
}


}

/// @nodoc
abstract mixin class $TrainingStatusDataCopyWith<$Res>  {
  factory $TrainingStatusDataCopyWith(TrainingStatusData value, $Res Function(TrainingStatusData) _then) = _$TrainingStatusDataCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: _parseDouble) double shapePercent,@JsonKey(fromJson: _parseDouble) double effectiveVO2max,@JsonKey(fromJson: _parseDouble) double correctionFactor,@JsonKey(fromJson: _parseDouble) double ctl,@JsonKey(fromJson: _parseDouble) double atl,@JsonKey(fromJson: _parseDouble) double tsb,@JsonKey(fromJson: _parseDouble) double workloadRatio,@JsonKey(fromJson: _parseDouble) double easyTrimp,@JsonKey(fromJson: _parseDouble) double maxCtl,@JsonKey(fromJson: _parseDouble) double maxAtl,@JsonKey(fromJson: _parseDouble) double ctlPercent,@JsonKey(fromJson: _parseDouble) double atlPercent
});




}
/// @nodoc
class _$TrainingStatusDataCopyWithImpl<$Res>
    implements $TrainingStatusDataCopyWith<$Res> {
  _$TrainingStatusDataCopyWithImpl(this._self, this._then);

  final TrainingStatusData _self;
  final $Res Function(TrainingStatusData) _then;

/// Create a copy of TrainingStatusData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? shapePercent = null,Object? effectiveVO2max = null,Object? correctionFactor = null,Object? ctl = null,Object? atl = null,Object? tsb = null,Object? workloadRatio = null,Object? easyTrimp = null,Object? maxCtl = null,Object? maxAtl = null,Object? ctlPercent = null,Object? atlPercent = null,}) {
  return _then(_self.copyWith(
shapePercent: null == shapePercent ? _self.shapePercent : shapePercent // ignore: cast_nullable_to_non_nullable
as double,effectiveVO2max: null == effectiveVO2max ? _self.effectiveVO2max : effectiveVO2max // ignore: cast_nullable_to_non_nullable
as double,correctionFactor: null == correctionFactor ? _self.correctionFactor : correctionFactor // ignore: cast_nullable_to_non_nullable
as double,ctl: null == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double,atl: null == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double,tsb: null == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double,workloadRatio: null == workloadRatio ? _self.workloadRatio : workloadRatio // ignore: cast_nullable_to_non_nullable
as double,easyTrimp: null == easyTrimp ? _self.easyTrimp : easyTrimp // ignore: cast_nullable_to_non_nullable
as double,maxCtl: null == maxCtl ? _self.maxCtl : maxCtl // ignore: cast_nullable_to_non_nullable
as double,maxAtl: null == maxAtl ? _self.maxAtl : maxAtl // ignore: cast_nullable_to_non_nullable
as double,ctlPercent: null == ctlPercent ? _self.ctlPercent : ctlPercent // ignore: cast_nullable_to_non_nullable
as double,atlPercent: null == atlPercent ? _self.atlPercent : atlPercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [TrainingStatusData].
extension TrainingStatusDataPatterns on TrainingStatusData {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TrainingStatusData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TrainingStatusData() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TrainingStatusData value)  $default,){
final _that = this;
switch (_that) {
case _TrainingStatusData():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TrainingStatusData value)?  $default,){
final _that = this;
switch (_that) {
case _TrainingStatusData() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _parseDouble)  double shapePercent, @JsonKey(fromJson: _parseDouble)  double effectiveVO2max, @JsonKey(fromJson: _parseDouble)  double correctionFactor, @JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double workloadRatio, @JsonKey(fromJson: _parseDouble)  double easyTrimp, @JsonKey(fromJson: _parseDouble)  double maxCtl, @JsonKey(fromJson: _parseDouble)  double maxAtl, @JsonKey(fromJson: _parseDouble)  double ctlPercent, @JsonKey(fromJson: _parseDouble)  double atlPercent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TrainingStatusData() when $default != null:
return $default(_that.shapePercent,_that.effectiveVO2max,_that.correctionFactor,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.maxCtl,_that.maxAtl,_that.ctlPercent,_that.atlPercent);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _parseDouble)  double shapePercent, @JsonKey(fromJson: _parseDouble)  double effectiveVO2max, @JsonKey(fromJson: _parseDouble)  double correctionFactor, @JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double workloadRatio, @JsonKey(fromJson: _parseDouble)  double easyTrimp, @JsonKey(fromJson: _parseDouble)  double maxCtl, @JsonKey(fromJson: _parseDouble)  double maxAtl, @JsonKey(fromJson: _parseDouble)  double ctlPercent, @JsonKey(fromJson: _parseDouble)  double atlPercent)  $default,) {final _that = this;
switch (_that) {
case _TrainingStatusData():
return $default(_that.shapePercent,_that.effectiveVO2max,_that.correctionFactor,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.maxCtl,_that.maxAtl,_that.ctlPercent,_that.atlPercent);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: _parseDouble)  double shapePercent, @JsonKey(fromJson: _parseDouble)  double effectiveVO2max, @JsonKey(fromJson: _parseDouble)  double correctionFactor, @JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double workloadRatio, @JsonKey(fromJson: _parseDouble)  double easyTrimp, @JsonKey(fromJson: _parseDouble)  double maxCtl, @JsonKey(fromJson: _parseDouble)  double maxAtl, @JsonKey(fromJson: _parseDouble)  double ctlPercent, @JsonKey(fromJson: _parseDouble)  double atlPercent)?  $default,) {final _that = this;
switch (_that) {
case _TrainingStatusData() when $default != null:
return $default(_that.shapePercent,_that.effectiveVO2max,_that.correctionFactor,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.maxCtl,_that.maxAtl,_that.ctlPercent,_that.atlPercent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TrainingStatusData extends TrainingStatusData {
  const _TrainingStatusData({@JsonKey(fromJson: _parseDouble) required this.shapePercent, @JsonKey(fromJson: _parseDouble) required this.effectiveVO2max, @JsonKey(fromJson: _parseDouble) required this.correctionFactor, @JsonKey(fromJson: _parseDouble) required this.ctl, @JsonKey(fromJson: _parseDouble) required this.atl, @JsonKey(fromJson: _parseDouble) required this.tsb, @JsonKey(fromJson: _parseDouble) required this.workloadRatio, @JsonKey(fromJson: _parseDouble) required this.easyTrimp, @JsonKey(fromJson: _parseDouble) required this.maxCtl, @JsonKey(fromJson: _parseDouble) required this.maxAtl, @JsonKey(fromJson: _parseDouble) required this.ctlPercent, @JsonKey(fromJson: _parseDouble) required this.atlPercent}): super._();
  factory _TrainingStatusData.fromJson(Map<String, dynamic> json) => _$TrainingStatusDataFromJson(json);

@override@JsonKey(fromJson: _parseDouble) final  double shapePercent;
@override@JsonKey(fromJson: _parseDouble) final  double effectiveVO2max;
@override@JsonKey(fromJson: _parseDouble) final  double correctionFactor;
@override@JsonKey(fromJson: _parseDouble) final  double ctl;
@override@JsonKey(fromJson: _parseDouble) final  double atl;
@override@JsonKey(fromJson: _parseDouble) final  double tsb;
@override@JsonKey(fromJson: _parseDouble) final  double workloadRatio;
@override@JsonKey(fromJson: _parseDouble) final  double easyTrimp;
@override@JsonKey(fromJson: _parseDouble) final  double maxCtl;
@override@JsonKey(fromJson: _parseDouble) final  double maxAtl;
@override@JsonKey(fromJson: _parseDouble) final  double ctlPercent;
@override@JsonKey(fromJson: _parseDouble) final  double atlPercent;

/// Create a copy of TrainingStatusData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TrainingStatusDataCopyWith<_TrainingStatusData> get copyWith => __$TrainingStatusDataCopyWithImpl<_TrainingStatusData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TrainingStatusDataToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TrainingStatusData&&(identical(other.shapePercent, shapePercent) || other.shapePercent == shapePercent)&&(identical(other.effectiveVO2max, effectiveVO2max) || other.effectiveVO2max == effectiveVO2max)&&(identical(other.correctionFactor, correctionFactor) || other.correctionFactor == correctionFactor)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.easyTrimp, easyTrimp) || other.easyTrimp == easyTrimp)&&(identical(other.maxCtl, maxCtl) || other.maxCtl == maxCtl)&&(identical(other.maxAtl, maxAtl) || other.maxAtl == maxAtl)&&(identical(other.ctlPercent, ctlPercent) || other.ctlPercent == ctlPercent)&&(identical(other.atlPercent, atlPercent) || other.atlPercent == atlPercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,shapePercent,effectiveVO2max,correctionFactor,ctl,atl,tsb,workloadRatio,easyTrimp,maxCtl,maxAtl,ctlPercent,atlPercent);

@override
String toString() {
  return 'TrainingStatusData(shapePercent: $shapePercent, effectiveVO2max: $effectiveVO2max, correctionFactor: $correctionFactor, ctl: $ctl, atl: $atl, tsb: $tsb, workloadRatio: $workloadRatio, easyTrimp: $easyTrimp, maxCtl: $maxCtl, maxAtl: $maxAtl, ctlPercent: $ctlPercent, atlPercent: $atlPercent)';
}


}

/// @nodoc
abstract mixin class _$TrainingStatusDataCopyWith<$Res> implements $TrainingStatusDataCopyWith<$Res> {
  factory _$TrainingStatusDataCopyWith(_TrainingStatusData value, $Res Function(_TrainingStatusData) _then) = __$TrainingStatusDataCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: _parseDouble) double shapePercent,@JsonKey(fromJson: _parseDouble) double effectiveVO2max,@JsonKey(fromJson: _parseDouble) double correctionFactor,@JsonKey(fromJson: _parseDouble) double ctl,@JsonKey(fromJson: _parseDouble) double atl,@JsonKey(fromJson: _parseDouble) double tsb,@JsonKey(fromJson: _parseDouble) double workloadRatio,@JsonKey(fromJson: _parseDouble) double easyTrimp,@JsonKey(fromJson: _parseDouble) double maxCtl,@JsonKey(fromJson: _parseDouble) double maxAtl,@JsonKey(fromJson: _parseDouble) double ctlPercent,@JsonKey(fromJson: _parseDouble) double atlPercent
});




}
/// @nodoc
class __$TrainingStatusDataCopyWithImpl<$Res>
    implements _$TrainingStatusDataCopyWith<$Res> {
  __$TrainingStatusDataCopyWithImpl(this._self, this._then);

  final _TrainingStatusData _self;
  final $Res Function(_TrainingStatusData) _then;

/// Create a copy of TrainingStatusData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? shapePercent = null,Object? effectiveVO2max = null,Object? correctionFactor = null,Object? ctl = null,Object? atl = null,Object? tsb = null,Object? workloadRatio = null,Object? easyTrimp = null,Object? maxCtl = null,Object? maxAtl = null,Object? ctlPercent = null,Object? atlPercent = null,}) {
  return _then(_TrainingStatusData(
shapePercent: null == shapePercent ? _self.shapePercent : shapePercent // ignore: cast_nullable_to_non_nullable
as double,effectiveVO2max: null == effectiveVO2max ? _self.effectiveVO2max : effectiveVO2max // ignore: cast_nullable_to_non_nullable
as double,correctionFactor: null == correctionFactor ? _self.correctionFactor : correctionFactor // ignore: cast_nullable_to_non_nullable
as double,ctl: null == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double,atl: null == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double,tsb: null == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double,workloadRatio: null == workloadRatio ? _self.workloadRatio : workloadRatio // ignore: cast_nullable_to_non_nullable
as double,easyTrimp: null == easyTrimp ? _self.easyTrimp : easyTrimp // ignore: cast_nullable_to_non_nullable
as double,maxCtl: null == maxCtl ? _self.maxCtl : maxCtl // ignore: cast_nullable_to_non_nullable
as double,maxAtl: null == maxAtl ? _self.maxAtl : maxAtl // ignore: cast_nullable_to_non_nullable
as double,ctlPercent: null == ctlPercent ? _self.ctlPercent : ctlPercent // ignore: cast_nullable_to_non_nullable
as double,atlPercent: null == atlPercent ? _self.atlPercent : atlPercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$SuggestedRaceActivity {

 String get id; String get name; DateTime get startDate; double get distance; int get movingTime; double? get averageSpeed;
/// Create a copy of SuggestedRaceActivity
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SuggestedRaceActivityCopyWith<SuggestedRaceActivity> get copyWith => _$SuggestedRaceActivityCopyWithImpl<SuggestedRaceActivity>(this as SuggestedRaceActivity, _$identity);

  /// Serializes this SuggestedRaceActivity to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SuggestedRaceActivity&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.movingTime, movingTime) || other.movingTime == movingTime)&&(identical(other.averageSpeed, averageSpeed) || other.averageSpeed == averageSpeed));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,startDate,distance,movingTime,averageSpeed);

@override
String toString() {
  return 'SuggestedRaceActivity(id: $id, name: $name, startDate: $startDate, distance: $distance, movingTime: $movingTime, averageSpeed: $averageSpeed)';
}


}

/// @nodoc
abstract mixin class $SuggestedRaceActivityCopyWith<$Res>  {
  factory $SuggestedRaceActivityCopyWith(SuggestedRaceActivity value, $Res Function(SuggestedRaceActivity) _then) = _$SuggestedRaceActivityCopyWithImpl;
@useResult
$Res call({
 String id, String name, DateTime startDate, double distance, int movingTime, double? averageSpeed
});




}
/// @nodoc
class _$SuggestedRaceActivityCopyWithImpl<$Res>
    implements $SuggestedRaceActivityCopyWith<$Res> {
  _$SuggestedRaceActivityCopyWithImpl(this._self, this._then);

  final SuggestedRaceActivity _self;
  final $Res Function(SuggestedRaceActivity) _then;

/// Create a copy of SuggestedRaceActivity
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? startDate = null,Object? distance = null,Object? movingTime = null,Object? averageSpeed = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime,distance: null == distance ? _self.distance : distance // ignore: cast_nullable_to_non_nullable
as double,movingTime: null == movingTime ? _self.movingTime : movingTime // ignore: cast_nullable_to_non_nullable
as int,averageSpeed: freezed == averageSpeed ? _self.averageSpeed : averageSpeed // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [SuggestedRaceActivity].
extension SuggestedRaceActivityPatterns on SuggestedRaceActivity {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SuggestedRaceActivity value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SuggestedRaceActivity() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SuggestedRaceActivity value)  $default,){
final _that = this;
switch (_that) {
case _SuggestedRaceActivity():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SuggestedRaceActivity value)?  $default,){
final _that = this;
switch (_that) {
case _SuggestedRaceActivity() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SuggestedRaceActivity() when $default != null:
return $default(_that.id,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed)  $default,) {final _that = this;
switch (_that) {
case _SuggestedRaceActivity():
return $default(_that.id,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed)?  $default,) {final _that = this;
switch (_that) {
case _SuggestedRaceActivity() when $default != null:
return $default(_that.id,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SuggestedRaceActivity extends SuggestedRaceActivity {
  const _SuggestedRaceActivity({required this.id, required this.name, required this.startDate, required this.distance, required this.movingTime, required this.averageSpeed}): super._();
  factory _SuggestedRaceActivity.fromJson(Map<String, dynamic> json) => _$SuggestedRaceActivityFromJson(json);

@override final  String id;
@override final  String name;
@override final  DateTime startDate;
@override final  double distance;
@override final  int movingTime;
@override final  double? averageSpeed;

/// Create a copy of SuggestedRaceActivity
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SuggestedRaceActivityCopyWith<_SuggestedRaceActivity> get copyWith => __$SuggestedRaceActivityCopyWithImpl<_SuggestedRaceActivity>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SuggestedRaceActivityToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SuggestedRaceActivity&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.movingTime, movingTime) || other.movingTime == movingTime)&&(identical(other.averageSpeed, averageSpeed) || other.averageSpeed == averageSpeed));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,startDate,distance,movingTime,averageSpeed);

@override
String toString() {
  return 'SuggestedRaceActivity(id: $id, name: $name, startDate: $startDate, distance: $distance, movingTime: $movingTime, averageSpeed: $averageSpeed)';
}


}

/// @nodoc
abstract mixin class _$SuggestedRaceActivityCopyWith<$Res> implements $SuggestedRaceActivityCopyWith<$Res> {
  factory _$SuggestedRaceActivityCopyWith(_SuggestedRaceActivity value, $Res Function(_SuggestedRaceActivity) _then) = __$SuggestedRaceActivityCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, DateTime startDate, double distance, int movingTime, double? averageSpeed
});




}
/// @nodoc
class __$SuggestedRaceActivityCopyWithImpl<$Res>
    implements _$SuggestedRaceActivityCopyWith<$Res> {
  __$SuggestedRaceActivityCopyWithImpl(this._self, this._then);

  final _SuggestedRaceActivity _self;
  final $Res Function(_SuggestedRaceActivity) _then;

/// Create a copy of SuggestedRaceActivity
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? startDate = null,Object? distance = null,Object? movingTime = null,Object? averageSpeed = freezed,}) {
  return _then(_SuggestedRaceActivity(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime,distance: null == distance ? _self.distance : distance // ignore: cast_nullable_to_non_nullable
as double,movingTime: null == movingTime ? _self.movingTime : movingTime // ignore: cast_nullable_to_non_nullable
as int,averageSpeed: freezed == averageSpeed ? _self.averageSpeed : averageSpeed // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$RaceResult {

 String get id; String get goalId; String? get activityId; int? get actualTime; int? get chipTime; int? get placementOverall; int? get placementGender; int? get placementAgeGroup; String? get ageGroup; int? get totalFinishers; String? get weatherConditions; int? get feltLike; String? get notes;
/// Create a copy of RaceResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RaceResultCopyWith<RaceResult> get copyWith => _$RaceResultCopyWithImpl<RaceResult>(this as RaceResult, _$identity);

  /// Serializes this RaceResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RaceResult&&(identical(other.id, id) || other.id == id)&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.activityId, activityId) || other.activityId == activityId)&&(identical(other.actualTime, actualTime) || other.actualTime == actualTime)&&(identical(other.chipTime, chipTime) || other.chipTime == chipTime)&&(identical(other.placementOverall, placementOverall) || other.placementOverall == placementOverall)&&(identical(other.placementGender, placementGender) || other.placementGender == placementGender)&&(identical(other.placementAgeGroup, placementAgeGroup) || other.placementAgeGroup == placementAgeGroup)&&(identical(other.ageGroup, ageGroup) || other.ageGroup == ageGroup)&&(identical(other.totalFinishers, totalFinishers) || other.totalFinishers == totalFinishers)&&(identical(other.weatherConditions, weatherConditions) || other.weatherConditions == weatherConditions)&&(identical(other.feltLike, feltLike) || other.feltLike == feltLike)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,goalId,activityId,actualTime,chipTime,placementOverall,placementGender,placementAgeGroup,ageGroup,totalFinishers,weatherConditions,feltLike,notes);

@override
String toString() {
  return 'RaceResult(id: $id, goalId: $goalId, activityId: $activityId, actualTime: $actualTime, chipTime: $chipTime, placementOverall: $placementOverall, placementGender: $placementGender, placementAgeGroup: $placementAgeGroup, ageGroup: $ageGroup, totalFinishers: $totalFinishers, weatherConditions: $weatherConditions, feltLike: $feltLike, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $RaceResultCopyWith<$Res>  {
  factory $RaceResultCopyWith(RaceResult value, $Res Function(RaceResult) _then) = _$RaceResultCopyWithImpl;
@useResult
$Res call({
 String id, String goalId, String? activityId, int? actualTime, int? chipTime, int? placementOverall, int? placementGender, int? placementAgeGroup, String? ageGroup, int? totalFinishers, String? weatherConditions, int? feltLike, String? notes
});




}
/// @nodoc
class _$RaceResultCopyWithImpl<$Res>
    implements $RaceResultCopyWith<$Res> {
  _$RaceResultCopyWithImpl(this._self, this._then);

  final RaceResult _self;
  final $Res Function(RaceResult) _then;

/// Create a copy of RaceResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? goalId = null,Object? activityId = freezed,Object? actualTime = freezed,Object? chipTime = freezed,Object? placementOverall = freezed,Object? placementGender = freezed,Object? placementAgeGroup = freezed,Object? ageGroup = freezed,Object? totalFinishers = freezed,Object? weatherConditions = freezed,Object? feltLike = freezed,Object? notes = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,goalId: null == goalId ? _self.goalId : goalId // ignore: cast_nullable_to_non_nullable
as String,activityId: freezed == activityId ? _self.activityId : activityId // ignore: cast_nullable_to_non_nullable
as String?,actualTime: freezed == actualTime ? _self.actualTime : actualTime // ignore: cast_nullable_to_non_nullable
as int?,chipTime: freezed == chipTime ? _self.chipTime : chipTime // ignore: cast_nullable_to_non_nullable
as int?,placementOverall: freezed == placementOverall ? _self.placementOverall : placementOverall // ignore: cast_nullable_to_non_nullable
as int?,placementGender: freezed == placementGender ? _self.placementGender : placementGender // ignore: cast_nullable_to_non_nullable
as int?,placementAgeGroup: freezed == placementAgeGroup ? _self.placementAgeGroup : placementAgeGroup // ignore: cast_nullable_to_non_nullable
as int?,ageGroup: freezed == ageGroup ? _self.ageGroup : ageGroup // ignore: cast_nullable_to_non_nullable
as String?,totalFinishers: freezed == totalFinishers ? _self.totalFinishers : totalFinishers // ignore: cast_nullable_to_non_nullable
as int?,weatherConditions: freezed == weatherConditions ? _self.weatherConditions : weatherConditions // ignore: cast_nullable_to_non_nullable
as String?,feltLike: freezed == feltLike ? _self.feltLike : feltLike // ignore: cast_nullable_to_non_nullable
as int?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RaceResult].
extension RaceResultPatterns on RaceResult {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RaceResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RaceResult() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RaceResult value)  $default,){
final _that = this;
switch (_that) {
case _RaceResult():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RaceResult value)?  $default,){
final _that = this;
switch (_that) {
case _RaceResult() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String goalId,  String? activityId,  int? actualTime,  int? chipTime,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RaceResult() when $default != null:
return $default(_that.id,_that.goalId,_that.activityId,_that.actualTime,_that.chipTime,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String goalId,  String? activityId,  int? actualTime,  int? chipTime,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _RaceResult():
return $default(_that.id,_that.goalId,_that.activityId,_that.actualTime,_that.chipTime,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String goalId,  String? activityId,  int? actualTime,  int? chipTime,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _RaceResult() when $default != null:
return $default(_that.id,_that.goalId,_that.activityId,_that.actualTime,_that.chipTime,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RaceResult extends RaceResult {
  const _RaceResult({required this.id, required this.goalId, required this.activityId, required this.actualTime, required this.chipTime, required this.placementOverall, required this.placementGender, required this.placementAgeGroup, required this.ageGroup, required this.totalFinishers, required this.weatherConditions, required this.feltLike, required this.notes}): super._();
  factory _RaceResult.fromJson(Map<String, dynamic> json) => _$RaceResultFromJson(json);

@override final  String id;
@override final  String goalId;
@override final  String? activityId;
@override final  int? actualTime;
@override final  int? chipTime;
@override final  int? placementOverall;
@override final  int? placementGender;
@override final  int? placementAgeGroup;
@override final  String? ageGroup;
@override final  int? totalFinishers;
@override final  String? weatherConditions;
@override final  int? feltLike;
@override final  String? notes;

/// Create a copy of RaceResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RaceResultCopyWith<_RaceResult> get copyWith => __$RaceResultCopyWithImpl<_RaceResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RaceResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RaceResult&&(identical(other.id, id) || other.id == id)&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.activityId, activityId) || other.activityId == activityId)&&(identical(other.actualTime, actualTime) || other.actualTime == actualTime)&&(identical(other.chipTime, chipTime) || other.chipTime == chipTime)&&(identical(other.placementOverall, placementOverall) || other.placementOverall == placementOverall)&&(identical(other.placementGender, placementGender) || other.placementGender == placementGender)&&(identical(other.placementAgeGroup, placementAgeGroup) || other.placementAgeGroup == placementAgeGroup)&&(identical(other.ageGroup, ageGroup) || other.ageGroup == ageGroup)&&(identical(other.totalFinishers, totalFinishers) || other.totalFinishers == totalFinishers)&&(identical(other.weatherConditions, weatherConditions) || other.weatherConditions == weatherConditions)&&(identical(other.feltLike, feltLike) || other.feltLike == feltLike)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,goalId,activityId,actualTime,chipTime,placementOverall,placementGender,placementAgeGroup,ageGroup,totalFinishers,weatherConditions,feltLike,notes);

@override
String toString() {
  return 'RaceResult(id: $id, goalId: $goalId, activityId: $activityId, actualTime: $actualTime, chipTime: $chipTime, placementOverall: $placementOverall, placementGender: $placementGender, placementAgeGroup: $placementAgeGroup, ageGroup: $ageGroup, totalFinishers: $totalFinishers, weatherConditions: $weatherConditions, feltLike: $feltLike, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$RaceResultCopyWith<$Res> implements $RaceResultCopyWith<$Res> {
  factory _$RaceResultCopyWith(_RaceResult value, $Res Function(_RaceResult) _then) = __$RaceResultCopyWithImpl;
@override @useResult
$Res call({
 String id, String goalId, String? activityId, int? actualTime, int? chipTime, int? placementOverall, int? placementGender, int? placementAgeGroup, String? ageGroup, int? totalFinishers, String? weatherConditions, int? feltLike, String? notes
});




}
/// @nodoc
class __$RaceResultCopyWithImpl<$Res>
    implements _$RaceResultCopyWith<$Res> {
  __$RaceResultCopyWithImpl(this._self, this._then);

  final _RaceResult _self;
  final $Res Function(_RaceResult) _then;

/// Create a copy of RaceResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? goalId = null,Object? activityId = freezed,Object? actualTime = freezed,Object? chipTime = freezed,Object? placementOverall = freezed,Object? placementGender = freezed,Object? placementAgeGroup = freezed,Object? ageGroup = freezed,Object? totalFinishers = freezed,Object? weatherConditions = freezed,Object? feltLike = freezed,Object? notes = freezed,}) {
  return _then(_RaceResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,goalId: null == goalId ? _self.goalId : goalId // ignore: cast_nullable_to_non_nullable
as String,activityId: freezed == activityId ? _self.activityId : activityId // ignore: cast_nullable_to_non_nullable
as String?,actualTime: freezed == actualTime ? _self.actualTime : actualTime // ignore: cast_nullable_to_non_nullable
as int?,chipTime: freezed == chipTime ? _self.chipTime : chipTime // ignore: cast_nullable_to_non_nullable
as int?,placementOverall: freezed == placementOverall ? _self.placementOverall : placementOverall // ignore: cast_nullable_to_non_nullable
as int?,placementGender: freezed == placementGender ? _self.placementGender : placementGender // ignore: cast_nullable_to_non_nullable
as int?,placementAgeGroup: freezed == placementAgeGroup ? _self.placementAgeGroup : placementAgeGroup // ignore: cast_nullable_to_non_nullable
as int?,ageGroup: freezed == ageGroup ? _self.ageGroup : ageGroup // ignore: cast_nullable_to_non_nullable
as String?,totalFinishers: freezed == totalFinishers ? _self.totalFinishers : totalFinishers // ignore: cast_nullable_to_non_nullable
as int?,weatherConditions: freezed == weatherConditions ? _self.weatherConditions : weatherConditions // ignore: cast_nullable_to_non_nullable
as String?,feltLike: freezed == feltLike ? _self.feltLike : feltLike // ignore: cast_nullable_to_non_nullable
as int?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$CompleteRaceRequest {

 String? get raceActivityId; int? get actualTime; int? get chipTime; int? get placementOverall; int? get placementGender; int? get placementAgeGroup; String? get ageGroup; int? get totalFinishers; String? get weatherConditions; int? get feltLike; String? get notes;
/// Create a copy of CompleteRaceRequest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CompleteRaceRequestCopyWith<CompleteRaceRequest> get copyWith => _$CompleteRaceRequestCopyWithImpl<CompleteRaceRequest>(this as CompleteRaceRequest, _$identity);

  /// Serializes this CompleteRaceRequest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CompleteRaceRequest&&(identical(other.raceActivityId, raceActivityId) || other.raceActivityId == raceActivityId)&&(identical(other.actualTime, actualTime) || other.actualTime == actualTime)&&(identical(other.chipTime, chipTime) || other.chipTime == chipTime)&&(identical(other.placementOverall, placementOverall) || other.placementOverall == placementOverall)&&(identical(other.placementGender, placementGender) || other.placementGender == placementGender)&&(identical(other.placementAgeGroup, placementAgeGroup) || other.placementAgeGroup == placementAgeGroup)&&(identical(other.ageGroup, ageGroup) || other.ageGroup == ageGroup)&&(identical(other.totalFinishers, totalFinishers) || other.totalFinishers == totalFinishers)&&(identical(other.weatherConditions, weatherConditions) || other.weatherConditions == weatherConditions)&&(identical(other.feltLike, feltLike) || other.feltLike == feltLike)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,raceActivityId,actualTime,chipTime,placementOverall,placementGender,placementAgeGroup,ageGroup,totalFinishers,weatherConditions,feltLike,notes);

@override
String toString() {
  return 'CompleteRaceRequest(raceActivityId: $raceActivityId, actualTime: $actualTime, chipTime: $chipTime, placementOverall: $placementOverall, placementGender: $placementGender, placementAgeGroup: $placementAgeGroup, ageGroup: $ageGroup, totalFinishers: $totalFinishers, weatherConditions: $weatherConditions, feltLike: $feltLike, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $CompleteRaceRequestCopyWith<$Res>  {
  factory $CompleteRaceRequestCopyWith(CompleteRaceRequest value, $Res Function(CompleteRaceRequest) _then) = _$CompleteRaceRequestCopyWithImpl;
@useResult
$Res call({
 String? raceActivityId, int? actualTime, int? chipTime, int? placementOverall, int? placementGender, int? placementAgeGroup, String? ageGroup, int? totalFinishers, String? weatherConditions, int? feltLike, String? notes
});




}
/// @nodoc
class _$CompleteRaceRequestCopyWithImpl<$Res>
    implements $CompleteRaceRequestCopyWith<$Res> {
  _$CompleteRaceRequestCopyWithImpl(this._self, this._then);

  final CompleteRaceRequest _self;
  final $Res Function(CompleteRaceRequest) _then;

/// Create a copy of CompleteRaceRequest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? raceActivityId = freezed,Object? actualTime = freezed,Object? chipTime = freezed,Object? placementOverall = freezed,Object? placementGender = freezed,Object? placementAgeGroup = freezed,Object? ageGroup = freezed,Object? totalFinishers = freezed,Object? weatherConditions = freezed,Object? feltLike = freezed,Object? notes = freezed,}) {
  return _then(_self.copyWith(
raceActivityId: freezed == raceActivityId ? _self.raceActivityId : raceActivityId // ignore: cast_nullable_to_non_nullable
as String?,actualTime: freezed == actualTime ? _self.actualTime : actualTime // ignore: cast_nullable_to_non_nullable
as int?,chipTime: freezed == chipTime ? _self.chipTime : chipTime // ignore: cast_nullable_to_non_nullable
as int?,placementOverall: freezed == placementOverall ? _self.placementOverall : placementOverall // ignore: cast_nullable_to_non_nullable
as int?,placementGender: freezed == placementGender ? _self.placementGender : placementGender // ignore: cast_nullable_to_non_nullable
as int?,placementAgeGroup: freezed == placementAgeGroup ? _self.placementAgeGroup : placementAgeGroup // ignore: cast_nullable_to_non_nullable
as int?,ageGroup: freezed == ageGroup ? _self.ageGroup : ageGroup // ignore: cast_nullable_to_non_nullable
as String?,totalFinishers: freezed == totalFinishers ? _self.totalFinishers : totalFinishers // ignore: cast_nullable_to_non_nullable
as int?,weatherConditions: freezed == weatherConditions ? _self.weatherConditions : weatherConditions // ignore: cast_nullable_to_non_nullable
as String?,feltLike: freezed == feltLike ? _self.feltLike : feltLike // ignore: cast_nullable_to_non_nullable
as int?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CompleteRaceRequest].
extension CompleteRaceRequestPatterns on CompleteRaceRequest {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CompleteRaceRequest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CompleteRaceRequest() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CompleteRaceRequest value)  $default,){
final _that = this;
switch (_that) {
case _CompleteRaceRequest():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CompleteRaceRequest value)?  $default,){
final _that = this;
switch (_that) {
case _CompleteRaceRequest() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? raceActivityId,  int? actualTime,  int? chipTime,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CompleteRaceRequest() when $default != null:
return $default(_that.raceActivityId,_that.actualTime,_that.chipTime,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? raceActivityId,  int? actualTime,  int? chipTime,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _CompleteRaceRequest():
return $default(_that.raceActivityId,_that.actualTime,_that.chipTime,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? raceActivityId,  int? actualTime,  int? chipTime,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _CompleteRaceRequest() when $default != null:
return $default(_that.raceActivityId,_that.actualTime,_that.chipTime,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CompleteRaceRequest extends CompleteRaceRequest {
  const _CompleteRaceRequest({required this.raceActivityId, required this.actualTime, required this.chipTime, required this.placementOverall, required this.placementGender, required this.placementAgeGroup, required this.ageGroup, required this.totalFinishers, required this.weatherConditions, required this.feltLike, required this.notes}): super._();
  factory _CompleteRaceRequest.fromJson(Map<String, dynamic> json) => _$CompleteRaceRequestFromJson(json);

@override final  String? raceActivityId;
@override final  int? actualTime;
@override final  int? chipTime;
@override final  int? placementOverall;
@override final  int? placementGender;
@override final  int? placementAgeGroup;
@override final  String? ageGroup;
@override final  int? totalFinishers;
@override final  String? weatherConditions;
@override final  int? feltLike;
@override final  String? notes;

/// Create a copy of CompleteRaceRequest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CompleteRaceRequestCopyWith<_CompleteRaceRequest> get copyWith => __$CompleteRaceRequestCopyWithImpl<_CompleteRaceRequest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CompleteRaceRequestToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CompleteRaceRequest&&(identical(other.raceActivityId, raceActivityId) || other.raceActivityId == raceActivityId)&&(identical(other.actualTime, actualTime) || other.actualTime == actualTime)&&(identical(other.chipTime, chipTime) || other.chipTime == chipTime)&&(identical(other.placementOverall, placementOverall) || other.placementOverall == placementOverall)&&(identical(other.placementGender, placementGender) || other.placementGender == placementGender)&&(identical(other.placementAgeGroup, placementAgeGroup) || other.placementAgeGroup == placementAgeGroup)&&(identical(other.ageGroup, ageGroup) || other.ageGroup == ageGroup)&&(identical(other.totalFinishers, totalFinishers) || other.totalFinishers == totalFinishers)&&(identical(other.weatherConditions, weatherConditions) || other.weatherConditions == weatherConditions)&&(identical(other.feltLike, feltLike) || other.feltLike == feltLike)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,raceActivityId,actualTime,chipTime,placementOverall,placementGender,placementAgeGroup,ageGroup,totalFinishers,weatherConditions,feltLike,notes);

@override
String toString() {
  return 'CompleteRaceRequest(raceActivityId: $raceActivityId, actualTime: $actualTime, chipTime: $chipTime, placementOverall: $placementOverall, placementGender: $placementGender, placementAgeGroup: $placementAgeGroup, ageGroup: $ageGroup, totalFinishers: $totalFinishers, weatherConditions: $weatherConditions, feltLike: $feltLike, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$CompleteRaceRequestCopyWith<$Res> implements $CompleteRaceRequestCopyWith<$Res> {
  factory _$CompleteRaceRequestCopyWith(_CompleteRaceRequest value, $Res Function(_CompleteRaceRequest) _then) = __$CompleteRaceRequestCopyWithImpl;
@override @useResult
$Res call({
 String? raceActivityId, int? actualTime, int? chipTime, int? placementOverall, int? placementGender, int? placementAgeGroup, String? ageGroup, int? totalFinishers, String? weatherConditions, int? feltLike, String? notes
});




}
/// @nodoc
class __$CompleteRaceRequestCopyWithImpl<$Res>
    implements _$CompleteRaceRequestCopyWith<$Res> {
  __$CompleteRaceRequestCopyWithImpl(this._self, this._then);

  final _CompleteRaceRequest _self;
  final $Res Function(_CompleteRaceRequest) _then;

/// Create a copy of CompleteRaceRequest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? raceActivityId = freezed,Object? actualTime = freezed,Object? chipTime = freezed,Object? placementOverall = freezed,Object? placementGender = freezed,Object? placementAgeGroup = freezed,Object? ageGroup = freezed,Object? totalFinishers = freezed,Object? weatherConditions = freezed,Object? feltLike = freezed,Object? notes = freezed,}) {
  return _then(_CompleteRaceRequest(
raceActivityId: freezed == raceActivityId ? _self.raceActivityId : raceActivityId // ignore: cast_nullable_to_non_nullable
as String?,actualTime: freezed == actualTime ? _self.actualTime : actualTime // ignore: cast_nullable_to_non_nullable
as int?,chipTime: freezed == chipTime ? _self.chipTime : chipTime // ignore: cast_nullable_to_non_nullable
as int?,placementOverall: freezed == placementOverall ? _self.placementOverall : placementOverall // ignore: cast_nullable_to_non_nullable
as int?,placementGender: freezed == placementGender ? _self.placementGender : placementGender // ignore: cast_nullable_to_non_nullable
as int?,placementAgeGroup: freezed == placementAgeGroup ? _self.placementAgeGroup : placementAgeGroup // ignore: cast_nullable_to_non_nullable
as int?,ageGroup: freezed == ageGroup ? _self.ageGroup : ageGroup // ignore: cast_nullable_to_non_nullable
as String?,totalFinishers: freezed == totalFinishers ? _self.totalFinishers : totalFinishers // ignore: cast_nullable_to_non_nullable
as int?,weatherConditions: freezed == weatherConditions ? _self.weatherConditions : weatherConditions // ignore: cast_nullable_to_non_nullable
as String?,feltLike: freezed == feltLike ? _self.feltLike : feltLike // ignore: cast_nullable_to_non_nullable
as int?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$RaceSuggestionResponse {

 List<SuggestedRaceActivity> get suggestions;
/// Create a copy of RaceSuggestionResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RaceSuggestionResponseCopyWith<RaceSuggestionResponse> get copyWith => _$RaceSuggestionResponseCopyWithImpl<RaceSuggestionResponse>(this as RaceSuggestionResponse, _$identity);

  /// Serializes this RaceSuggestionResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RaceSuggestionResponse&&const DeepCollectionEquality().equals(other.suggestions, suggestions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(suggestions));

@override
String toString() {
  return 'RaceSuggestionResponse(suggestions: $suggestions)';
}


}

/// @nodoc
abstract mixin class $RaceSuggestionResponseCopyWith<$Res>  {
  factory $RaceSuggestionResponseCopyWith(RaceSuggestionResponse value, $Res Function(RaceSuggestionResponse) _then) = _$RaceSuggestionResponseCopyWithImpl;
@useResult
$Res call({
 List<SuggestedRaceActivity> suggestions
});




}
/// @nodoc
class _$RaceSuggestionResponseCopyWithImpl<$Res>
    implements $RaceSuggestionResponseCopyWith<$Res> {
  _$RaceSuggestionResponseCopyWithImpl(this._self, this._then);

  final RaceSuggestionResponse _self;
  final $Res Function(RaceSuggestionResponse) _then;

/// Create a copy of RaceSuggestionResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? suggestions = null,}) {
  return _then(_self.copyWith(
suggestions: null == suggestions ? _self.suggestions : suggestions // ignore: cast_nullable_to_non_nullable
as List<SuggestedRaceActivity>,
  ));
}

}


/// Adds pattern-matching-related methods to [RaceSuggestionResponse].
extension RaceSuggestionResponsePatterns on RaceSuggestionResponse {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RaceSuggestionResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RaceSuggestionResponse() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RaceSuggestionResponse value)  $default,){
final _that = this;
switch (_that) {
case _RaceSuggestionResponse():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RaceSuggestionResponse value)?  $default,){
final _that = this;
switch (_that) {
case _RaceSuggestionResponse() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<SuggestedRaceActivity> suggestions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RaceSuggestionResponse() when $default != null:
return $default(_that.suggestions);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<SuggestedRaceActivity> suggestions)  $default,) {final _that = this;
switch (_that) {
case _RaceSuggestionResponse():
return $default(_that.suggestions);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<SuggestedRaceActivity> suggestions)?  $default,) {final _that = this;
switch (_that) {
case _RaceSuggestionResponse() when $default != null:
return $default(_that.suggestions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RaceSuggestionResponse extends RaceSuggestionResponse {
  const _RaceSuggestionResponse({required final  List<SuggestedRaceActivity> suggestions}): _suggestions = suggestions,super._();
  factory _RaceSuggestionResponse.fromJson(Map<String, dynamic> json) => _$RaceSuggestionResponseFromJson(json);

 final  List<SuggestedRaceActivity> _suggestions;
@override List<SuggestedRaceActivity> get suggestions {
  if (_suggestions is EqualUnmodifiableListView) return _suggestions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_suggestions);
}


/// Create a copy of RaceSuggestionResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RaceSuggestionResponseCopyWith<_RaceSuggestionResponse> get copyWith => __$RaceSuggestionResponseCopyWithImpl<_RaceSuggestionResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RaceSuggestionResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RaceSuggestionResponse&&const DeepCollectionEquality().equals(other._suggestions, _suggestions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_suggestions));

@override
String toString() {
  return 'RaceSuggestionResponse(suggestions: $suggestions)';
}


}

/// @nodoc
abstract mixin class _$RaceSuggestionResponseCopyWith<$Res> implements $RaceSuggestionResponseCopyWith<$Res> {
  factory _$RaceSuggestionResponseCopyWith(_RaceSuggestionResponse value, $Res Function(_RaceSuggestionResponse) _then) = __$RaceSuggestionResponseCopyWithImpl;
@override @useResult
$Res call({
 List<SuggestedRaceActivity> suggestions
});




}
/// @nodoc
class __$RaceSuggestionResponseCopyWithImpl<$Res>
    implements _$RaceSuggestionResponseCopyWith<$Res> {
  __$RaceSuggestionResponseCopyWithImpl(this._self, this._then);

  final _RaceSuggestionResponse _self;
  final $Res Function(_RaceSuggestionResponse) _then;

/// Create a copy of RaceSuggestionResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? suggestions = null,}) {
  return _then(_RaceSuggestionResponse(
suggestions: null == suggestions ? _self._suggestions : suggestions // ignore: cast_nullable_to_non_nullable
as List<SuggestedRaceActivity>,
  ));
}


}


/// @nodoc
mixin _$TrainingCompletionSummary {

 int get totalWorkouts; int get completedWorkouts; int get completionRate;
/// Create a copy of TrainingCompletionSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TrainingCompletionSummaryCopyWith<TrainingCompletionSummary> get copyWith => _$TrainingCompletionSummaryCopyWithImpl<TrainingCompletionSummary>(this as TrainingCompletionSummary, _$identity);

  /// Serializes this TrainingCompletionSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TrainingCompletionSummary&&(identical(other.totalWorkouts, totalWorkouts) || other.totalWorkouts == totalWorkouts)&&(identical(other.completedWorkouts, completedWorkouts) || other.completedWorkouts == completedWorkouts)&&(identical(other.completionRate, completionRate) || other.completionRate == completionRate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,totalWorkouts,completedWorkouts,completionRate);

@override
String toString() {
  return 'TrainingCompletionSummary(totalWorkouts: $totalWorkouts, completedWorkouts: $completedWorkouts, completionRate: $completionRate)';
}


}

/// @nodoc
abstract mixin class $TrainingCompletionSummaryCopyWith<$Res>  {
  factory $TrainingCompletionSummaryCopyWith(TrainingCompletionSummary value, $Res Function(TrainingCompletionSummary) _then) = _$TrainingCompletionSummaryCopyWithImpl;
@useResult
$Res call({
 int totalWorkouts, int completedWorkouts, int completionRate
});




}
/// @nodoc
class _$TrainingCompletionSummaryCopyWithImpl<$Res>
    implements $TrainingCompletionSummaryCopyWith<$Res> {
  _$TrainingCompletionSummaryCopyWithImpl(this._self, this._then);

  final TrainingCompletionSummary _self;
  final $Res Function(TrainingCompletionSummary) _then;

/// Create a copy of TrainingCompletionSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? totalWorkouts = null,Object? completedWorkouts = null,Object? completionRate = null,}) {
  return _then(_self.copyWith(
totalWorkouts: null == totalWorkouts ? _self.totalWorkouts : totalWorkouts // ignore: cast_nullable_to_non_nullable
as int,completedWorkouts: null == completedWorkouts ? _self.completedWorkouts : completedWorkouts // ignore: cast_nullable_to_non_nullable
as int,completionRate: null == completionRate ? _self.completionRate : completionRate // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [TrainingCompletionSummary].
extension TrainingCompletionSummaryPatterns on TrainingCompletionSummary {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TrainingCompletionSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TrainingCompletionSummary() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TrainingCompletionSummary value)  $default,){
final _that = this;
switch (_that) {
case _TrainingCompletionSummary():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TrainingCompletionSummary value)?  $default,){
final _that = this;
switch (_that) {
case _TrainingCompletionSummary() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int totalWorkouts,  int completedWorkouts,  int completionRate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TrainingCompletionSummary() when $default != null:
return $default(_that.totalWorkouts,_that.completedWorkouts,_that.completionRate);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int totalWorkouts,  int completedWorkouts,  int completionRate)  $default,) {final _that = this;
switch (_that) {
case _TrainingCompletionSummary():
return $default(_that.totalWorkouts,_that.completedWorkouts,_that.completionRate);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int totalWorkouts,  int completedWorkouts,  int completionRate)?  $default,) {final _that = this;
switch (_that) {
case _TrainingCompletionSummary() when $default != null:
return $default(_that.totalWorkouts,_that.completedWorkouts,_that.completionRate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TrainingCompletionSummary extends TrainingCompletionSummary {
  const _TrainingCompletionSummary({required this.totalWorkouts, required this.completedWorkouts, required this.completionRate}): super._();
  factory _TrainingCompletionSummary.fromJson(Map<String, dynamic> json) => _$TrainingCompletionSummaryFromJson(json);

@override final  int totalWorkouts;
@override final  int completedWorkouts;
@override final  int completionRate;

/// Create a copy of TrainingCompletionSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TrainingCompletionSummaryCopyWith<_TrainingCompletionSummary> get copyWith => __$TrainingCompletionSummaryCopyWithImpl<_TrainingCompletionSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TrainingCompletionSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TrainingCompletionSummary&&(identical(other.totalWorkouts, totalWorkouts) || other.totalWorkouts == totalWorkouts)&&(identical(other.completedWorkouts, completedWorkouts) || other.completedWorkouts == completedWorkouts)&&(identical(other.completionRate, completionRate) || other.completionRate == completionRate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,totalWorkouts,completedWorkouts,completionRate);

@override
String toString() {
  return 'TrainingCompletionSummary(totalWorkouts: $totalWorkouts, completedWorkouts: $completedWorkouts, completionRate: $completionRate)';
}


}

/// @nodoc
abstract mixin class _$TrainingCompletionSummaryCopyWith<$Res> implements $TrainingCompletionSummaryCopyWith<$Res> {
  factory _$TrainingCompletionSummaryCopyWith(_TrainingCompletionSummary value, $Res Function(_TrainingCompletionSummary) _then) = __$TrainingCompletionSummaryCopyWithImpl;
@override @useResult
$Res call({
 int totalWorkouts, int completedWorkouts, int completionRate
});




}
/// @nodoc
class __$TrainingCompletionSummaryCopyWithImpl<$Res>
    implements _$TrainingCompletionSummaryCopyWith<$Res> {
  __$TrainingCompletionSummaryCopyWithImpl(this._self, this._then);

  final _TrainingCompletionSummary _self;
  final $Res Function(_TrainingCompletionSummary) _then;

/// Create a copy of TrainingCompletionSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? totalWorkouts = null,Object? completedWorkouts = null,Object? completionRate = null,}) {
  return _then(_TrainingCompletionSummary(
totalWorkouts: null == totalWorkouts ? _self.totalWorkouts : totalWorkouts // ignore: cast_nullable_to_non_nullable
as int,completedWorkouts: null == completedWorkouts ? _self.completedWorkouts : completedWorkouts // ignore: cast_nullable_to_non_nullable
as int,completionRate: null == completionRate ? _self.completionRate : completionRate // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc
mixin _$RaceResultFlowState {

 RaceResultMode get mode; bool get isLoading; bool get isSaving; SuggestedRaceActivity? get suggestedActivity; String? get selectedActivityId; int? get actualTimeSeconds; int? get chipTimeSeconds; int? get placementOverall; int? get placementGender; int? get placementAgeGroup; String? get ageGroup; int? get totalFinishers; String? get weatherConditions; int? get feltLike; String? get notes;
/// Create a copy of RaceResultFlowState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RaceResultFlowStateCopyWith<RaceResultFlowState> get copyWith => _$RaceResultFlowStateCopyWithImpl<RaceResultFlowState>(this as RaceResultFlowState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RaceResultFlowState&&(identical(other.mode, mode) || other.mode == mode)&&(identical(other.isLoading, isLoading) || other.isLoading == isLoading)&&(identical(other.isSaving, isSaving) || other.isSaving == isSaving)&&(identical(other.suggestedActivity, suggestedActivity) || other.suggestedActivity == suggestedActivity)&&(identical(other.selectedActivityId, selectedActivityId) || other.selectedActivityId == selectedActivityId)&&(identical(other.actualTimeSeconds, actualTimeSeconds) || other.actualTimeSeconds == actualTimeSeconds)&&(identical(other.chipTimeSeconds, chipTimeSeconds) || other.chipTimeSeconds == chipTimeSeconds)&&(identical(other.placementOverall, placementOverall) || other.placementOverall == placementOverall)&&(identical(other.placementGender, placementGender) || other.placementGender == placementGender)&&(identical(other.placementAgeGroup, placementAgeGroup) || other.placementAgeGroup == placementAgeGroup)&&(identical(other.ageGroup, ageGroup) || other.ageGroup == ageGroup)&&(identical(other.totalFinishers, totalFinishers) || other.totalFinishers == totalFinishers)&&(identical(other.weatherConditions, weatherConditions) || other.weatherConditions == weatherConditions)&&(identical(other.feltLike, feltLike) || other.feltLike == feltLike)&&(identical(other.notes, notes) || other.notes == notes));
}


@override
int get hashCode => Object.hash(runtimeType,mode,isLoading,isSaving,suggestedActivity,selectedActivityId,actualTimeSeconds,chipTimeSeconds,placementOverall,placementGender,placementAgeGroup,ageGroup,totalFinishers,weatherConditions,feltLike,notes);

@override
String toString() {
  return 'RaceResultFlowState(mode: $mode, isLoading: $isLoading, isSaving: $isSaving, suggestedActivity: $suggestedActivity, selectedActivityId: $selectedActivityId, actualTimeSeconds: $actualTimeSeconds, chipTimeSeconds: $chipTimeSeconds, placementOverall: $placementOverall, placementGender: $placementGender, placementAgeGroup: $placementAgeGroup, ageGroup: $ageGroup, totalFinishers: $totalFinishers, weatherConditions: $weatherConditions, feltLike: $feltLike, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $RaceResultFlowStateCopyWith<$Res>  {
  factory $RaceResultFlowStateCopyWith(RaceResultFlowState value, $Res Function(RaceResultFlowState) _then) = _$RaceResultFlowStateCopyWithImpl;
@useResult
$Res call({
 RaceResultMode mode, bool isLoading, bool isSaving, SuggestedRaceActivity? suggestedActivity, String? selectedActivityId, int? actualTimeSeconds, int? chipTimeSeconds, int? placementOverall, int? placementGender, int? placementAgeGroup, String? ageGroup, int? totalFinishers, String? weatherConditions, int? feltLike, String? notes
});


$SuggestedRaceActivityCopyWith<$Res>? get suggestedActivity;

}
/// @nodoc
class _$RaceResultFlowStateCopyWithImpl<$Res>
    implements $RaceResultFlowStateCopyWith<$Res> {
  _$RaceResultFlowStateCopyWithImpl(this._self, this._then);

  final RaceResultFlowState _self;
  final $Res Function(RaceResultFlowState) _then;

/// Create a copy of RaceResultFlowState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? mode = null,Object? isLoading = null,Object? isSaving = null,Object? suggestedActivity = freezed,Object? selectedActivityId = freezed,Object? actualTimeSeconds = freezed,Object? chipTimeSeconds = freezed,Object? placementOverall = freezed,Object? placementGender = freezed,Object? placementAgeGroup = freezed,Object? ageGroup = freezed,Object? totalFinishers = freezed,Object? weatherConditions = freezed,Object? feltLike = freezed,Object? notes = freezed,}) {
  return _then(_self.copyWith(
mode: null == mode ? _self.mode : mode // ignore: cast_nullable_to_non_nullable
as RaceResultMode,isLoading: null == isLoading ? _self.isLoading : isLoading // ignore: cast_nullable_to_non_nullable
as bool,isSaving: null == isSaving ? _self.isSaving : isSaving // ignore: cast_nullable_to_non_nullable
as bool,suggestedActivity: freezed == suggestedActivity ? _self.suggestedActivity : suggestedActivity // ignore: cast_nullable_to_non_nullable
as SuggestedRaceActivity?,selectedActivityId: freezed == selectedActivityId ? _self.selectedActivityId : selectedActivityId // ignore: cast_nullable_to_non_nullable
as String?,actualTimeSeconds: freezed == actualTimeSeconds ? _self.actualTimeSeconds : actualTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,chipTimeSeconds: freezed == chipTimeSeconds ? _self.chipTimeSeconds : chipTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,placementOverall: freezed == placementOverall ? _self.placementOverall : placementOverall // ignore: cast_nullable_to_non_nullable
as int?,placementGender: freezed == placementGender ? _self.placementGender : placementGender // ignore: cast_nullable_to_non_nullable
as int?,placementAgeGroup: freezed == placementAgeGroup ? _self.placementAgeGroup : placementAgeGroup // ignore: cast_nullable_to_non_nullable
as int?,ageGroup: freezed == ageGroup ? _self.ageGroup : ageGroup // ignore: cast_nullable_to_non_nullable
as String?,totalFinishers: freezed == totalFinishers ? _self.totalFinishers : totalFinishers // ignore: cast_nullable_to_non_nullable
as int?,weatherConditions: freezed == weatherConditions ? _self.weatherConditions : weatherConditions // ignore: cast_nullable_to_non_nullable
as String?,feltLike: freezed == feltLike ? _self.feltLike : feltLike // ignore: cast_nullable_to_non_nullable
as int?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of RaceResultFlowState
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SuggestedRaceActivityCopyWith<$Res>? get suggestedActivity {
    if (_self.suggestedActivity == null) {
    return null;
  }

  return $SuggestedRaceActivityCopyWith<$Res>(_self.suggestedActivity!, (value) {
    return _then(_self.copyWith(suggestedActivity: value));
  });
}
}


/// Adds pattern-matching-related methods to [RaceResultFlowState].
extension RaceResultFlowStatePatterns on RaceResultFlowState {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RaceResultFlowState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RaceResultFlowState() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RaceResultFlowState value)  $default,){
final _that = this;
switch (_that) {
case _RaceResultFlowState():
return $default(_that);}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RaceResultFlowState value)?  $default,){
final _that = this;
switch (_that) {
case _RaceResultFlowState() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( RaceResultMode mode,  bool isLoading,  bool isSaving,  SuggestedRaceActivity? suggestedActivity,  String? selectedActivityId,  int? actualTimeSeconds,  int? chipTimeSeconds,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RaceResultFlowState() when $default != null:
return $default(_that.mode,_that.isLoading,_that.isSaving,_that.suggestedActivity,_that.selectedActivityId,_that.actualTimeSeconds,_that.chipTimeSeconds,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( RaceResultMode mode,  bool isLoading,  bool isSaving,  SuggestedRaceActivity? suggestedActivity,  String? selectedActivityId,  int? actualTimeSeconds,  int? chipTimeSeconds,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _RaceResultFlowState():
return $default(_that.mode,_that.isLoading,_that.isSaving,_that.suggestedActivity,_that.selectedActivityId,_that.actualTimeSeconds,_that.chipTimeSeconds,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( RaceResultMode mode,  bool isLoading,  bool isSaving,  SuggestedRaceActivity? suggestedActivity,  String? selectedActivityId,  int? actualTimeSeconds,  int? chipTimeSeconds,  int? placementOverall,  int? placementGender,  int? placementAgeGroup,  String? ageGroup,  int? totalFinishers,  String? weatherConditions,  int? feltLike,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _RaceResultFlowState() when $default != null:
return $default(_that.mode,_that.isLoading,_that.isSaving,_that.suggestedActivity,_that.selectedActivityId,_that.actualTimeSeconds,_that.chipTimeSeconds,_that.placementOverall,_that.placementGender,_that.placementAgeGroup,_that.ageGroup,_that.totalFinishers,_that.weatherConditions,_that.feltLike,_that.notes);case _:
  return null;

}
}

}

/// @nodoc


class _RaceResultFlowState extends RaceResultFlowState {
  const _RaceResultFlowState({required this.mode, required this.isLoading, this.isSaving = false, this.suggestedActivity, this.selectedActivityId, this.actualTimeSeconds, this.chipTimeSeconds, this.placementOverall, this.placementGender, this.placementAgeGroup, this.ageGroup, this.totalFinishers, this.weatherConditions, this.feltLike, this.notes}): super._();
  

@override final  RaceResultMode mode;
@override final  bool isLoading;
@override@JsonKey() final  bool isSaving;
@override final  SuggestedRaceActivity? suggestedActivity;
@override final  String? selectedActivityId;
@override final  int? actualTimeSeconds;
@override final  int? chipTimeSeconds;
@override final  int? placementOverall;
@override final  int? placementGender;
@override final  int? placementAgeGroup;
@override final  String? ageGroup;
@override final  int? totalFinishers;
@override final  String? weatherConditions;
@override final  int? feltLike;
@override final  String? notes;

/// Create a copy of RaceResultFlowState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RaceResultFlowStateCopyWith<_RaceResultFlowState> get copyWith => __$RaceResultFlowStateCopyWithImpl<_RaceResultFlowState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RaceResultFlowState&&(identical(other.mode, mode) || other.mode == mode)&&(identical(other.isLoading, isLoading) || other.isLoading == isLoading)&&(identical(other.isSaving, isSaving) || other.isSaving == isSaving)&&(identical(other.suggestedActivity, suggestedActivity) || other.suggestedActivity == suggestedActivity)&&(identical(other.selectedActivityId, selectedActivityId) || other.selectedActivityId == selectedActivityId)&&(identical(other.actualTimeSeconds, actualTimeSeconds) || other.actualTimeSeconds == actualTimeSeconds)&&(identical(other.chipTimeSeconds, chipTimeSeconds) || other.chipTimeSeconds == chipTimeSeconds)&&(identical(other.placementOverall, placementOverall) || other.placementOverall == placementOverall)&&(identical(other.placementGender, placementGender) || other.placementGender == placementGender)&&(identical(other.placementAgeGroup, placementAgeGroup) || other.placementAgeGroup == placementAgeGroup)&&(identical(other.ageGroup, ageGroup) || other.ageGroup == ageGroup)&&(identical(other.totalFinishers, totalFinishers) || other.totalFinishers == totalFinishers)&&(identical(other.weatherConditions, weatherConditions) || other.weatherConditions == weatherConditions)&&(identical(other.feltLike, feltLike) || other.feltLike == feltLike)&&(identical(other.notes, notes) || other.notes == notes));
}


@override
int get hashCode => Object.hash(runtimeType,mode,isLoading,isSaving,suggestedActivity,selectedActivityId,actualTimeSeconds,chipTimeSeconds,placementOverall,placementGender,placementAgeGroup,ageGroup,totalFinishers,weatherConditions,feltLike,notes);

@override
String toString() {
  return 'RaceResultFlowState(mode: $mode, isLoading: $isLoading, isSaving: $isSaving, suggestedActivity: $suggestedActivity, selectedActivityId: $selectedActivityId, actualTimeSeconds: $actualTimeSeconds, chipTimeSeconds: $chipTimeSeconds, placementOverall: $placementOverall, placementGender: $placementGender, placementAgeGroup: $placementAgeGroup, ageGroup: $ageGroup, totalFinishers: $totalFinishers, weatherConditions: $weatherConditions, feltLike: $feltLike, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$RaceResultFlowStateCopyWith<$Res> implements $RaceResultFlowStateCopyWith<$Res> {
  factory _$RaceResultFlowStateCopyWith(_RaceResultFlowState value, $Res Function(_RaceResultFlowState) _then) = __$RaceResultFlowStateCopyWithImpl;
@override @useResult
$Res call({
 RaceResultMode mode, bool isLoading, bool isSaving, SuggestedRaceActivity? suggestedActivity, String? selectedActivityId, int? actualTimeSeconds, int? chipTimeSeconds, int? placementOverall, int? placementGender, int? placementAgeGroup, String? ageGroup, int? totalFinishers, String? weatherConditions, int? feltLike, String? notes
});


@override $SuggestedRaceActivityCopyWith<$Res>? get suggestedActivity;

}
/// @nodoc
class __$RaceResultFlowStateCopyWithImpl<$Res>
    implements _$RaceResultFlowStateCopyWith<$Res> {
  __$RaceResultFlowStateCopyWithImpl(this._self, this._then);

  final _RaceResultFlowState _self;
  final $Res Function(_RaceResultFlowState) _then;

/// Create a copy of RaceResultFlowState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? mode = null,Object? isLoading = null,Object? isSaving = null,Object? suggestedActivity = freezed,Object? selectedActivityId = freezed,Object? actualTimeSeconds = freezed,Object? chipTimeSeconds = freezed,Object? placementOverall = freezed,Object? placementGender = freezed,Object? placementAgeGroup = freezed,Object? ageGroup = freezed,Object? totalFinishers = freezed,Object? weatherConditions = freezed,Object? feltLike = freezed,Object? notes = freezed,}) {
  return _then(_RaceResultFlowState(
mode: null == mode ? _self.mode : mode // ignore: cast_nullable_to_non_nullable
as RaceResultMode,isLoading: null == isLoading ? _self.isLoading : isLoading // ignore: cast_nullable_to_non_nullable
as bool,isSaving: null == isSaving ? _self.isSaving : isSaving // ignore: cast_nullable_to_non_nullable
as bool,suggestedActivity: freezed == suggestedActivity ? _self.suggestedActivity : suggestedActivity // ignore: cast_nullable_to_non_nullable
as SuggestedRaceActivity?,selectedActivityId: freezed == selectedActivityId ? _self.selectedActivityId : selectedActivityId // ignore: cast_nullable_to_non_nullable
as String?,actualTimeSeconds: freezed == actualTimeSeconds ? _self.actualTimeSeconds : actualTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,chipTimeSeconds: freezed == chipTimeSeconds ? _self.chipTimeSeconds : chipTimeSeconds // ignore: cast_nullable_to_non_nullable
as int?,placementOverall: freezed == placementOverall ? _self.placementOverall : placementOverall // ignore: cast_nullable_to_non_nullable
as int?,placementGender: freezed == placementGender ? _self.placementGender : placementGender // ignore: cast_nullable_to_non_nullable
as int?,placementAgeGroup: freezed == placementAgeGroup ? _self.placementAgeGroup : placementAgeGroup // ignore: cast_nullable_to_non_nullable
as int?,ageGroup: freezed == ageGroup ? _self.ageGroup : ageGroup // ignore: cast_nullable_to_non_nullable
as String?,totalFinishers: freezed == totalFinishers ? _self.totalFinishers : totalFinishers // ignore: cast_nullable_to_non_nullable
as int?,weatherConditions: freezed == weatherConditions ? _self.weatherConditions : weatherConditions // ignore: cast_nullable_to_non_nullable
as String?,feltLike: freezed == feltLike ? _self.feltLike : feltLike // ignore: cast_nullable_to_non_nullable
as int?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of RaceResultFlowState
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SuggestedRaceActivityCopyWith<$Res>? get suggestedActivity {
    if (_self.suggestedActivity == null) {
    return null;
  }

  return $SuggestedRaceActivityCopyWith<$Res>(_self.suggestedActivity!, (value) {
    return _then(_self.copyWith(suggestedActivity: value));
  });
}
}

// dart format on
