// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dashboard_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$AnalyticsStats {

@JsonKey(fromJson: _parseDouble) double get currentWeekMileage;@JsonKey(fromJson: _parseDouble) double get effectiveVO2max;@JsonKey(fromJson: _parseDouble) double get rawVO2max;@JsonKey(fromJson: _parseDouble) double get vdotCorrectionFactor;@JsonKey(fromJson: _parseDouble) double get marathonShape;@JsonKey(fromJson: _parseDoubleNullable) double? get currentVdot;@JsonKey(fromJson: _parseDouble) double get ctl;@JsonKey(fromJson: _parseDouble) double get atl;@JsonKey(fromJson: _parseDouble) double get tsb;@JsonKey(fromJson: _parseDouble) double get workloadRatio;@JsonKey(fromJson: _parseDouble) double get easyTrimp;@JsonKey(fromJson: _parseDoubleNullable) double? get avgWeeklyKmLast3Months;@JsonKey(fromJson: _parseIntSafe) int get hrMax;
/// Create a copy of AnalyticsStats
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AnalyticsStatsCopyWith<AnalyticsStats> get copyWith => _$AnalyticsStatsCopyWithImpl<AnalyticsStats>(this as AnalyticsStats, _$identity);

  /// Serializes this AnalyticsStats to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AnalyticsStats&&(identical(other.currentWeekMileage, currentWeekMileage) || other.currentWeekMileage == currentWeekMileage)&&(identical(other.effectiveVO2max, effectiveVO2max) || other.effectiveVO2max == effectiveVO2max)&&(identical(other.rawVO2max, rawVO2max) || other.rawVO2max == rawVO2max)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor)&&(identical(other.marathonShape, marathonShape) || other.marathonShape == marathonShape)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.easyTrimp, easyTrimp) || other.easyTrimp == easyTrimp)&&(identical(other.avgWeeklyKmLast3Months, avgWeeklyKmLast3Months) || other.avgWeeklyKmLast3Months == avgWeeklyKmLast3Months)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,currentWeekMileage,effectiveVO2max,rawVO2max,vdotCorrectionFactor,marathonShape,currentVdot,ctl,atl,tsb,workloadRatio,easyTrimp,avgWeeklyKmLast3Months,hrMax);

@override
String toString() {
  return 'AnalyticsStats(currentWeekMileage: $currentWeekMileage, effectiveVO2max: $effectiveVO2max, rawVO2max: $rawVO2max, vdotCorrectionFactor: $vdotCorrectionFactor, marathonShape: $marathonShape, currentVdot: $currentVdot, ctl: $ctl, atl: $atl, tsb: $tsb, workloadRatio: $workloadRatio, easyTrimp: $easyTrimp, avgWeeklyKmLast3Months: $avgWeeklyKmLast3Months, hrMax: $hrMax)';
}


}

/// @nodoc
abstract mixin class $AnalyticsStatsCopyWith<$Res>  {
  factory $AnalyticsStatsCopyWith(AnalyticsStats value, $Res Function(AnalyticsStats) _then) = _$AnalyticsStatsCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: _parseDouble) double currentWeekMileage,@JsonKey(fromJson: _parseDouble) double effectiveVO2max,@JsonKey(fromJson: _parseDouble) double rawVO2max,@JsonKey(fromJson: _parseDouble) double vdotCorrectionFactor,@JsonKey(fromJson: _parseDouble) double marathonShape,@JsonKey(fromJson: _parseDoubleNullable) double? currentVdot,@JsonKey(fromJson: _parseDouble) double ctl,@JsonKey(fromJson: _parseDouble) double atl,@JsonKey(fromJson: _parseDouble) double tsb,@JsonKey(fromJson: _parseDouble) double workloadRatio,@JsonKey(fromJson: _parseDouble) double easyTrimp,@JsonKey(fromJson: _parseDoubleNullable) double? avgWeeklyKmLast3Months,@JsonKey(fromJson: _parseIntSafe) int hrMax
});




}
/// @nodoc
class _$AnalyticsStatsCopyWithImpl<$Res>
    implements $AnalyticsStatsCopyWith<$Res> {
  _$AnalyticsStatsCopyWithImpl(this._self, this._then);

  final AnalyticsStats _self;
  final $Res Function(AnalyticsStats) _then;

/// Create a copy of AnalyticsStats
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? currentWeekMileage = null,Object? effectiveVO2max = null,Object? rawVO2max = null,Object? vdotCorrectionFactor = null,Object? marathonShape = null,Object? currentVdot = freezed,Object? ctl = null,Object? atl = null,Object? tsb = null,Object? workloadRatio = null,Object? easyTrimp = null,Object? avgWeeklyKmLast3Months = freezed,Object? hrMax = null,}) {
  return _then(_self.copyWith(
currentWeekMileage: null == currentWeekMileage ? _self.currentWeekMileage : currentWeekMileage // ignore: cast_nullable_to_non_nullable
as double,effectiveVO2max: null == effectiveVO2max ? _self.effectiveVO2max : effectiveVO2max // ignore: cast_nullable_to_non_nullable
as double,rawVO2max: null == rawVO2max ? _self.rawVO2max : rawVO2max // ignore: cast_nullable_to_non_nullable
as double,vdotCorrectionFactor: null == vdotCorrectionFactor ? _self.vdotCorrectionFactor : vdotCorrectionFactor // ignore: cast_nullable_to_non_nullable
as double,marathonShape: null == marathonShape ? _self.marathonShape : marathonShape // ignore: cast_nullable_to_non_nullable
as double,currentVdot: freezed == currentVdot ? _self.currentVdot : currentVdot // ignore: cast_nullable_to_non_nullable
as double?,ctl: null == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double,atl: null == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double,tsb: null == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double,workloadRatio: null == workloadRatio ? _self.workloadRatio : workloadRatio // ignore: cast_nullable_to_non_nullable
as double,easyTrimp: null == easyTrimp ? _self.easyTrimp : easyTrimp // ignore: cast_nullable_to_non_nullable
as double,avgWeeklyKmLast3Months: freezed == avgWeeklyKmLast3Months ? _self.avgWeeklyKmLast3Months : avgWeeklyKmLast3Months // ignore: cast_nullable_to_non_nullable
as double?,hrMax: null == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [AnalyticsStats].
extension AnalyticsStatsPatterns on AnalyticsStats {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AnalyticsStats value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AnalyticsStats() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AnalyticsStats value)  $default,){
final _that = this;
switch (_that) {
case _AnalyticsStats():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AnalyticsStats value)?  $default,){
final _that = this;
switch (_that) {
case _AnalyticsStats() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _parseDouble)  double currentWeekMileage, @JsonKey(fromJson: _parseDouble)  double effectiveVO2max, @JsonKey(fromJson: _parseDouble)  double rawVO2max, @JsonKey(fromJson: _parseDouble)  double vdotCorrectionFactor, @JsonKey(fromJson: _parseDouble)  double marathonShape, @JsonKey(fromJson: _parseDoubleNullable)  double? currentVdot, @JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double workloadRatio, @JsonKey(fromJson: _parseDouble)  double easyTrimp, @JsonKey(fromJson: _parseDoubleNullable)  double? avgWeeklyKmLast3Months, @JsonKey(fromJson: _parseIntSafe)  int hrMax)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AnalyticsStats() when $default != null:
return $default(_that.currentWeekMileage,_that.effectiveVO2max,_that.rawVO2max,_that.vdotCorrectionFactor,_that.marathonShape,_that.currentVdot,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.avgWeeklyKmLast3Months,_that.hrMax);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _parseDouble)  double currentWeekMileage, @JsonKey(fromJson: _parseDouble)  double effectiveVO2max, @JsonKey(fromJson: _parseDouble)  double rawVO2max, @JsonKey(fromJson: _parseDouble)  double vdotCorrectionFactor, @JsonKey(fromJson: _parseDouble)  double marathonShape, @JsonKey(fromJson: _parseDoubleNullable)  double? currentVdot, @JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double workloadRatio, @JsonKey(fromJson: _parseDouble)  double easyTrimp, @JsonKey(fromJson: _parseDoubleNullable)  double? avgWeeklyKmLast3Months, @JsonKey(fromJson: _parseIntSafe)  int hrMax)  $default,) {final _that = this;
switch (_that) {
case _AnalyticsStats():
return $default(_that.currentWeekMileage,_that.effectiveVO2max,_that.rawVO2max,_that.vdotCorrectionFactor,_that.marathonShape,_that.currentVdot,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.avgWeeklyKmLast3Months,_that.hrMax);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: _parseDouble)  double currentWeekMileage, @JsonKey(fromJson: _parseDouble)  double effectiveVO2max, @JsonKey(fromJson: _parseDouble)  double rawVO2max, @JsonKey(fromJson: _parseDouble)  double vdotCorrectionFactor, @JsonKey(fromJson: _parseDouble)  double marathonShape, @JsonKey(fromJson: _parseDoubleNullable)  double? currentVdot, @JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double workloadRatio, @JsonKey(fromJson: _parseDouble)  double easyTrimp, @JsonKey(fromJson: _parseDoubleNullable)  double? avgWeeklyKmLast3Months, @JsonKey(fromJson: _parseIntSafe)  int hrMax)?  $default,) {final _that = this;
switch (_that) {
case _AnalyticsStats() when $default != null:
return $default(_that.currentWeekMileage,_that.effectiveVO2max,_that.rawVO2max,_that.vdotCorrectionFactor,_that.marathonShape,_that.currentVdot,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.avgWeeklyKmLast3Months,_that.hrMax);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AnalyticsStats extends AnalyticsStats {
  const _AnalyticsStats({@JsonKey(fromJson: _parseDouble) required this.currentWeekMileage, @JsonKey(fromJson: _parseDouble) required this.effectiveVO2max, @JsonKey(fromJson: _parseDouble) required this.rawVO2max, @JsonKey(fromJson: _parseDouble) required this.vdotCorrectionFactor, @JsonKey(fromJson: _parseDouble) required this.marathonShape, @JsonKey(fromJson: _parseDoubleNullable) required this.currentVdot, @JsonKey(fromJson: _parseDouble) required this.ctl, @JsonKey(fromJson: _parseDouble) required this.atl, @JsonKey(fromJson: _parseDouble) required this.tsb, @JsonKey(fromJson: _parseDouble) required this.workloadRatio, @JsonKey(fromJson: _parseDouble) required this.easyTrimp, @JsonKey(fromJson: _parseDoubleNullable) this.avgWeeklyKmLast3Months = null, @JsonKey(fromJson: _parseIntSafe) this.hrMax = 0}): super._();
  factory _AnalyticsStats.fromJson(Map<String, dynamic> json) => _$AnalyticsStatsFromJson(json);

@override@JsonKey(fromJson: _parseDouble) final  double currentWeekMileage;
@override@JsonKey(fromJson: _parseDouble) final  double effectiveVO2max;
@override@JsonKey(fromJson: _parseDouble) final  double rawVO2max;
@override@JsonKey(fromJson: _parseDouble) final  double vdotCorrectionFactor;
@override@JsonKey(fromJson: _parseDouble) final  double marathonShape;
@override@JsonKey(fromJson: _parseDoubleNullable) final  double? currentVdot;
@override@JsonKey(fromJson: _parseDouble) final  double ctl;
@override@JsonKey(fromJson: _parseDouble) final  double atl;
@override@JsonKey(fromJson: _parseDouble) final  double tsb;
@override@JsonKey(fromJson: _parseDouble) final  double workloadRatio;
@override@JsonKey(fromJson: _parseDouble) final  double easyTrimp;
@override@JsonKey(fromJson: _parseDoubleNullable) final  double? avgWeeklyKmLast3Months;
@override@JsonKey(fromJson: _parseIntSafe) final  int hrMax;

/// Create a copy of AnalyticsStats
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AnalyticsStatsCopyWith<_AnalyticsStats> get copyWith => __$AnalyticsStatsCopyWithImpl<_AnalyticsStats>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AnalyticsStatsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AnalyticsStats&&(identical(other.currentWeekMileage, currentWeekMileage) || other.currentWeekMileage == currentWeekMileage)&&(identical(other.effectiveVO2max, effectiveVO2max) || other.effectiveVO2max == effectiveVO2max)&&(identical(other.rawVO2max, rawVO2max) || other.rawVO2max == rawVO2max)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor)&&(identical(other.marathonShape, marathonShape) || other.marathonShape == marathonShape)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.easyTrimp, easyTrimp) || other.easyTrimp == easyTrimp)&&(identical(other.avgWeeklyKmLast3Months, avgWeeklyKmLast3Months) || other.avgWeeklyKmLast3Months == avgWeeklyKmLast3Months)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,currentWeekMileage,effectiveVO2max,rawVO2max,vdotCorrectionFactor,marathonShape,currentVdot,ctl,atl,tsb,workloadRatio,easyTrimp,avgWeeklyKmLast3Months,hrMax);

@override
String toString() {
  return 'AnalyticsStats(currentWeekMileage: $currentWeekMileage, effectiveVO2max: $effectiveVO2max, rawVO2max: $rawVO2max, vdotCorrectionFactor: $vdotCorrectionFactor, marathonShape: $marathonShape, currentVdot: $currentVdot, ctl: $ctl, atl: $atl, tsb: $tsb, workloadRatio: $workloadRatio, easyTrimp: $easyTrimp, avgWeeklyKmLast3Months: $avgWeeklyKmLast3Months, hrMax: $hrMax)';
}


}

/// @nodoc
abstract mixin class _$AnalyticsStatsCopyWith<$Res> implements $AnalyticsStatsCopyWith<$Res> {
  factory _$AnalyticsStatsCopyWith(_AnalyticsStats value, $Res Function(_AnalyticsStats) _then) = __$AnalyticsStatsCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: _parseDouble) double currentWeekMileage,@JsonKey(fromJson: _parseDouble) double effectiveVO2max,@JsonKey(fromJson: _parseDouble) double rawVO2max,@JsonKey(fromJson: _parseDouble) double vdotCorrectionFactor,@JsonKey(fromJson: _parseDouble) double marathonShape,@JsonKey(fromJson: _parseDoubleNullable) double? currentVdot,@JsonKey(fromJson: _parseDouble) double ctl,@JsonKey(fromJson: _parseDouble) double atl,@JsonKey(fromJson: _parseDouble) double tsb,@JsonKey(fromJson: _parseDouble) double workloadRatio,@JsonKey(fromJson: _parseDouble) double easyTrimp,@JsonKey(fromJson: _parseDoubleNullable) double? avgWeeklyKmLast3Months,@JsonKey(fromJson: _parseIntSafe) int hrMax
});




}
/// @nodoc
class __$AnalyticsStatsCopyWithImpl<$Res>
    implements _$AnalyticsStatsCopyWith<$Res> {
  __$AnalyticsStatsCopyWithImpl(this._self, this._then);

  final _AnalyticsStats _self;
  final $Res Function(_AnalyticsStats) _then;

/// Create a copy of AnalyticsStats
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? currentWeekMileage = null,Object? effectiveVO2max = null,Object? rawVO2max = null,Object? vdotCorrectionFactor = null,Object? marathonShape = null,Object? currentVdot = freezed,Object? ctl = null,Object? atl = null,Object? tsb = null,Object? workloadRatio = null,Object? easyTrimp = null,Object? avgWeeklyKmLast3Months = freezed,Object? hrMax = null,}) {
  return _then(_AnalyticsStats(
currentWeekMileage: null == currentWeekMileage ? _self.currentWeekMileage : currentWeekMileage // ignore: cast_nullable_to_non_nullable
as double,effectiveVO2max: null == effectiveVO2max ? _self.effectiveVO2max : effectiveVO2max // ignore: cast_nullable_to_non_nullable
as double,rawVO2max: null == rawVO2max ? _self.rawVO2max : rawVO2max // ignore: cast_nullable_to_non_nullable
as double,vdotCorrectionFactor: null == vdotCorrectionFactor ? _self.vdotCorrectionFactor : vdotCorrectionFactor // ignore: cast_nullable_to_non_nullable
as double,marathonShape: null == marathonShape ? _self.marathonShape : marathonShape // ignore: cast_nullable_to_non_nullable
as double,currentVdot: freezed == currentVdot ? _self.currentVdot : currentVdot // ignore: cast_nullable_to_non_nullable
as double?,ctl: null == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double,atl: null == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double,tsb: null == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double,workloadRatio: null == workloadRatio ? _self.workloadRatio : workloadRatio // ignore: cast_nullable_to_non_nullable
as double,easyTrimp: null == easyTrimp ? _self.easyTrimp : easyTrimp // ignore: cast_nullable_to_non_nullable
as double,avgWeeklyKmLast3Months: freezed == avgWeeklyKmLast3Months ? _self.avgWeeklyKmLast3Months : avgWeeklyKmLast3Months // ignore: cast_nullable_to_non_nullable
as double?,hrMax: null == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SyncStatus {

 bool get syncInProgress; DateTime? get lastSyncAt; int get totalActivities;
/// Create a copy of SyncStatus
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncStatusCopyWith<SyncStatus> get copyWith => _$SyncStatusCopyWithImpl<SyncStatus>(this as SyncStatus, _$identity);

  /// Serializes this SyncStatus to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncStatus&&(identical(other.syncInProgress, syncInProgress) || other.syncInProgress == syncInProgress)&&(identical(other.lastSyncAt, lastSyncAt) || other.lastSyncAt == lastSyncAt)&&(identical(other.totalActivities, totalActivities) || other.totalActivities == totalActivities));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,syncInProgress,lastSyncAt,totalActivities);

@override
String toString() {
  return 'SyncStatus(syncInProgress: $syncInProgress, lastSyncAt: $lastSyncAt, totalActivities: $totalActivities)';
}


}

/// @nodoc
abstract mixin class $SyncStatusCopyWith<$Res>  {
  factory $SyncStatusCopyWith(SyncStatus value, $Res Function(SyncStatus) _then) = _$SyncStatusCopyWithImpl;
@useResult
$Res call({
 bool syncInProgress, DateTime? lastSyncAt, int totalActivities
});




}
/// @nodoc
class _$SyncStatusCopyWithImpl<$Res>
    implements $SyncStatusCopyWith<$Res> {
  _$SyncStatusCopyWithImpl(this._self, this._then);

  final SyncStatus _self;
  final $Res Function(SyncStatus) _then;

/// Create a copy of SyncStatus
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? syncInProgress = null,Object? lastSyncAt = freezed,Object? totalActivities = null,}) {
  return _then(_self.copyWith(
syncInProgress: null == syncInProgress ? _self.syncInProgress : syncInProgress // ignore: cast_nullable_to_non_nullable
as bool,lastSyncAt: freezed == lastSyncAt ? _self.lastSyncAt : lastSyncAt // ignore: cast_nullable_to_non_nullable
as DateTime?,totalActivities: null == totalActivities ? _self.totalActivities : totalActivities // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncStatus].
extension SyncStatusPatterns on SyncStatus {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncStatus value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncStatus() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncStatus value)  $default,){
final _that = this;
switch (_that) {
case _SyncStatus():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncStatus value)?  $default,){
final _that = this;
switch (_that) {
case _SyncStatus() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool syncInProgress,  DateTime? lastSyncAt,  int totalActivities)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncStatus() when $default != null:
return $default(_that.syncInProgress,_that.lastSyncAt,_that.totalActivities);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool syncInProgress,  DateTime? lastSyncAt,  int totalActivities)  $default,) {final _that = this;
switch (_that) {
case _SyncStatus():
return $default(_that.syncInProgress,_that.lastSyncAt,_that.totalActivities);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool syncInProgress,  DateTime? lastSyncAt,  int totalActivities)?  $default,) {final _that = this;
switch (_that) {
case _SyncStatus() when $default != null:
return $default(_that.syncInProgress,_that.lastSyncAt,_that.totalActivities);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncStatus extends SyncStatus {
  const _SyncStatus({required this.syncInProgress, required this.lastSyncAt, required this.totalActivities}): super._();
  factory _SyncStatus.fromJson(Map<String, dynamic> json) => _$SyncStatusFromJson(json);

@override final  bool syncInProgress;
@override final  DateTime? lastSyncAt;
@override final  int totalActivities;

/// Create a copy of SyncStatus
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncStatusCopyWith<_SyncStatus> get copyWith => __$SyncStatusCopyWithImpl<_SyncStatus>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncStatusToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncStatus&&(identical(other.syncInProgress, syncInProgress) || other.syncInProgress == syncInProgress)&&(identical(other.lastSyncAt, lastSyncAt) || other.lastSyncAt == lastSyncAt)&&(identical(other.totalActivities, totalActivities) || other.totalActivities == totalActivities));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,syncInProgress,lastSyncAt,totalActivities);

@override
String toString() {
  return 'SyncStatus(syncInProgress: $syncInProgress, lastSyncAt: $lastSyncAt, totalActivities: $totalActivities)';
}


}

/// @nodoc
abstract mixin class _$SyncStatusCopyWith<$Res> implements $SyncStatusCopyWith<$Res> {
  factory _$SyncStatusCopyWith(_SyncStatus value, $Res Function(_SyncStatus) _then) = __$SyncStatusCopyWithImpl;
@override @useResult
$Res call({
 bool syncInProgress, DateTime? lastSyncAt, int totalActivities
});




}
/// @nodoc
class __$SyncStatusCopyWithImpl<$Res>
    implements _$SyncStatusCopyWith<$Res> {
  __$SyncStatusCopyWithImpl(this._self, this._then);

  final _SyncStatus _self;
  final $Res Function(_SyncStatus) _then;

/// Create a copy of SyncStatus
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? syncInProgress = null,Object? lastSyncAt = freezed,Object? totalActivities = null,}) {
  return _then(_SyncStatus(
syncInProgress: null == syncInProgress ? _self.syncInProgress : syncInProgress // ignore: cast_nullable_to_non_nullable
as bool,lastSyncAt: freezed == lastSyncAt ? _self.lastSyncAt : lastSyncAt // ignore: cast_nullable_to_non_nullable
as DateTime?,totalActivities: null == totalActivities ? _self.totalActivities : totalActivities // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SyncResult {

 bool get success; int get activitiesSynced; DateTime? get lastSyncAt;
/// Create a copy of SyncResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncResultCopyWith<SyncResult> get copyWith => _$SyncResultCopyWithImpl<SyncResult>(this as SyncResult, _$identity);

  /// Serializes this SyncResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncResult&&(identical(other.success, success) || other.success == success)&&(identical(other.activitiesSynced, activitiesSynced) || other.activitiesSynced == activitiesSynced)&&(identical(other.lastSyncAt, lastSyncAt) || other.lastSyncAt == lastSyncAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,success,activitiesSynced,lastSyncAt);

@override
String toString() {
  return 'SyncResult(success: $success, activitiesSynced: $activitiesSynced, lastSyncAt: $lastSyncAt)';
}


}

/// @nodoc
abstract mixin class $SyncResultCopyWith<$Res>  {
  factory $SyncResultCopyWith(SyncResult value, $Res Function(SyncResult) _then) = _$SyncResultCopyWithImpl;
@useResult
$Res call({
 bool success, int activitiesSynced, DateTime? lastSyncAt
});




}
/// @nodoc
class _$SyncResultCopyWithImpl<$Res>
    implements $SyncResultCopyWith<$Res> {
  _$SyncResultCopyWithImpl(this._self, this._then);

  final SyncResult _self;
  final $Res Function(SyncResult) _then;

/// Create a copy of SyncResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? success = null,Object? activitiesSynced = null,Object? lastSyncAt = freezed,}) {
  return _then(_self.copyWith(
success: null == success ? _self.success : success // ignore: cast_nullable_to_non_nullable
as bool,activitiesSynced: null == activitiesSynced ? _self.activitiesSynced : activitiesSynced // ignore: cast_nullable_to_non_nullable
as int,lastSyncAt: freezed == lastSyncAt ? _self.lastSyncAt : lastSyncAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncResult].
extension SyncResultPatterns on SyncResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncResult value)  $default,){
final _that = this;
switch (_that) {
case _SyncResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncResult value)?  $default,){
final _that = this;
switch (_that) {
case _SyncResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool success,  int activitiesSynced,  DateTime? lastSyncAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncResult() when $default != null:
return $default(_that.success,_that.activitiesSynced,_that.lastSyncAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool success,  int activitiesSynced,  DateTime? lastSyncAt)  $default,) {final _that = this;
switch (_that) {
case _SyncResult():
return $default(_that.success,_that.activitiesSynced,_that.lastSyncAt);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool success,  int activitiesSynced,  DateTime? lastSyncAt)?  $default,) {final _that = this;
switch (_that) {
case _SyncResult() when $default != null:
return $default(_that.success,_that.activitiesSynced,_that.lastSyncAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncResult extends SyncResult {
  const _SyncResult({required this.success, required this.activitiesSynced, required this.lastSyncAt}): super._();
  factory _SyncResult.fromJson(Map<String, dynamic> json) => _$SyncResultFromJson(json);

@override final  bool success;
@override final  int activitiesSynced;
@override final  DateTime? lastSyncAt;

/// Create a copy of SyncResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncResultCopyWith<_SyncResult> get copyWith => __$SyncResultCopyWithImpl<_SyncResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncResult&&(identical(other.success, success) || other.success == success)&&(identical(other.activitiesSynced, activitiesSynced) || other.activitiesSynced == activitiesSynced)&&(identical(other.lastSyncAt, lastSyncAt) || other.lastSyncAt == lastSyncAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,success,activitiesSynced,lastSyncAt);

@override
String toString() {
  return 'SyncResult(success: $success, activitiesSynced: $activitiesSynced, lastSyncAt: $lastSyncAt)';
}


}

/// @nodoc
abstract mixin class _$SyncResultCopyWith<$Res> implements $SyncResultCopyWith<$Res> {
  factory _$SyncResultCopyWith(_SyncResult value, $Res Function(_SyncResult) _then) = __$SyncResultCopyWithImpl;
@override @useResult
$Res call({
 bool success, int activitiesSynced, DateTime? lastSyncAt
});




}
/// @nodoc
class __$SyncResultCopyWithImpl<$Res>
    implements _$SyncResultCopyWith<$Res> {
  __$SyncResultCopyWithImpl(this._self, this._then);

  final _SyncResult _self;
  final $Res Function(_SyncResult) _then;

/// Create a copy of SyncResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? success = null,Object? activitiesSynced = null,Object? lastSyncAt = freezed,}) {
  return _then(_SyncResult(
success: null == success ? _self.success : success // ignore: cast_nullable_to_non_nullable
as bool,activitiesSynced: null == activitiesSynced ? _self.activitiesSynced : activitiesSynced // ignore: cast_nullable_to_non_nullable
as int,lastSyncAt: freezed == lastSyncAt ? _self.lastSyncAt : lastSyncAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}


/// @nodoc
mixin _$Activity {

 String get id; String get stravaId; ActivityType get type; String get name; DateTime get startDate; double get distance; int get movingTime; double? get averageSpeed; double? get averageHr; int? get maxHr; double? get averageCadence; bool get hasHeartrate; double get totalElevation; double? get trimp; double? get runningTss; double? get estimatedVdot; String? get trainingType;@JsonKey(name: 'hrZone1Time') int get hrZone1Time;@JsonKey(name: 'hrZone2Time') int get hrZone2Time;@JsonKey(name: 'hrZone3Time') int get hrZone3Time;@JsonKey(name: 'hrZone4Time') int get hrZone4Time;@JsonKey(name: 'hrZone5Time') int get hrZone5Time;@JsonKey(name: 'hrZone6Time') int get hrZone6Time;@JsonKey(name: 'hrZone7Time') int get hrZone7Time;@JsonKey(name: 'streams') Map<String, dynamic>? get streams;@JsonKey(name: 'calories') double? get calories;@JsonKey(name: 'averageWatts') double? get averageWatts;@JsonKey(name: 'weightedAverageWatts') double? get weightedAverageWatts;@JsonKey(name: 'deviceWatts') bool get deviceWatts;
/// Create a copy of Activity
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivityCopyWith<Activity> get copyWith => _$ActivityCopyWithImpl<Activity>(this as Activity, _$identity);

  /// Serializes this Activity to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Activity&&(identical(other.id, id) || other.id == id)&&(identical(other.stravaId, stravaId) || other.stravaId == stravaId)&&(identical(other.type, type) || other.type == type)&&(identical(other.name, name) || other.name == name)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.movingTime, movingTime) || other.movingTime == movingTime)&&(identical(other.averageSpeed, averageSpeed) || other.averageSpeed == averageSpeed)&&(identical(other.averageHr, averageHr) || other.averageHr == averageHr)&&(identical(other.maxHr, maxHr) || other.maxHr == maxHr)&&(identical(other.averageCadence, averageCadence) || other.averageCadence == averageCadence)&&(identical(other.hasHeartrate, hasHeartrate) || other.hasHeartrate == hasHeartrate)&&(identical(other.totalElevation, totalElevation) || other.totalElevation == totalElevation)&&(identical(other.trimp, trimp) || other.trimp == trimp)&&(identical(other.runningTss, runningTss) || other.runningTss == runningTss)&&(identical(other.estimatedVdot, estimatedVdot) || other.estimatedVdot == estimatedVdot)&&(identical(other.trainingType, trainingType) || other.trainingType == trainingType)&&(identical(other.hrZone1Time, hrZone1Time) || other.hrZone1Time == hrZone1Time)&&(identical(other.hrZone2Time, hrZone2Time) || other.hrZone2Time == hrZone2Time)&&(identical(other.hrZone3Time, hrZone3Time) || other.hrZone3Time == hrZone3Time)&&(identical(other.hrZone4Time, hrZone4Time) || other.hrZone4Time == hrZone4Time)&&(identical(other.hrZone5Time, hrZone5Time) || other.hrZone5Time == hrZone5Time)&&(identical(other.hrZone6Time, hrZone6Time) || other.hrZone6Time == hrZone6Time)&&(identical(other.hrZone7Time, hrZone7Time) || other.hrZone7Time == hrZone7Time)&&const DeepCollectionEquality().equals(other.streams, streams)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.averageWatts, averageWatts) || other.averageWatts == averageWatts)&&(identical(other.weightedAverageWatts, weightedAverageWatts) || other.weightedAverageWatts == weightedAverageWatts)&&(identical(other.deviceWatts, deviceWatts) || other.deviceWatts == deviceWatts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,stravaId,type,name,startDate,distance,movingTime,averageSpeed,averageHr,maxHr,averageCadence,hasHeartrate,totalElevation,trimp,runningTss,estimatedVdot,trainingType,hrZone1Time,hrZone2Time,hrZone3Time,hrZone4Time,hrZone5Time,hrZone6Time,hrZone7Time,const DeepCollectionEquality().hash(streams),calories,averageWatts,weightedAverageWatts,deviceWatts]);

@override
String toString() {
  return 'Activity(id: $id, stravaId: $stravaId, type: $type, name: $name, startDate: $startDate, distance: $distance, movingTime: $movingTime, averageSpeed: $averageSpeed, averageHr: $averageHr, maxHr: $maxHr, averageCadence: $averageCadence, hasHeartrate: $hasHeartrate, totalElevation: $totalElevation, trimp: $trimp, runningTss: $runningTss, estimatedVdot: $estimatedVdot, trainingType: $trainingType, hrZone1Time: $hrZone1Time, hrZone2Time: $hrZone2Time, hrZone3Time: $hrZone3Time, hrZone4Time: $hrZone4Time, hrZone5Time: $hrZone5Time, hrZone6Time: $hrZone6Time, hrZone7Time: $hrZone7Time, streams: $streams, calories: $calories, averageWatts: $averageWatts, weightedAverageWatts: $weightedAverageWatts, deviceWatts: $deviceWatts)';
}


}

/// @nodoc
abstract mixin class $ActivityCopyWith<$Res>  {
  factory $ActivityCopyWith(Activity value, $Res Function(Activity) _then) = _$ActivityCopyWithImpl;
@useResult
$Res call({
 String id, String stravaId, ActivityType type, String name, DateTime startDate, double distance, int movingTime, double? averageSpeed, double? averageHr, int? maxHr, double? averageCadence, bool hasHeartrate, double totalElevation, double? trimp, double? runningTss, double? estimatedVdot, String? trainingType,@JsonKey(name: 'hrZone1Time') int hrZone1Time,@JsonKey(name: 'hrZone2Time') int hrZone2Time,@JsonKey(name: 'hrZone3Time') int hrZone3Time,@JsonKey(name: 'hrZone4Time') int hrZone4Time,@JsonKey(name: 'hrZone5Time') int hrZone5Time,@JsonKey(name: 'hrZone6Time') int hrZone6Time,@JsonKey(name: 'hrZone7Time') int hrZone7Time,@JsonKey(name: 'streams') Map<String, dynamic>? streams,@JsonKey(name: 'calories') double? calories,@JsonKey(name: 'averageWatts') double? averageWatts,@JsonKey(name: 'weightedAverageWatts') double? weightedAverageWatts,@JsonKey(name: 'deviceWatts') bool deviceWatts
});




}
/// @nodoc
class _$ActivityCopyWithImpl<$Res>
    implements $ActivityCopyWith<$Res> {
  _$ActivityCopyWithImpl(this._self, this._then);

  final Activity _self;
  final $Res Function(Activity) _then;

/// Create a copy of Activity
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? stravaId = null,Object? type = null,Object? name = null,Object? startDate = null,Object? distance = null,Object? movingTime = null,Object? averageSpeed = freezed,Object? averageHr = freezed,Object? maxHr = freezed,Object? averageCadence = freezed,Object? hasHeartrate = null,Object? totalElevation = null,Object? trimp = freezed,Object? runningTss = freezed,Object? estimatedVdot = freezed,Object? trainingType = freezed,Object? hrZone1Time = null,Object? hrZone2Time = null,Object? hrZone3Time = null,Object? hrZone4Time = null,Object? hrZone5Time = null,Object? hrZone6Time = null,Object? hrZone7Time = null,Object? streams = freezed,Object? calories = freezed,Object? averageWatts = freezed,Object? weightedAverageWatts = freezed,Object? deviceWatts = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,stravaId: null == stravaId ? _self.stravaId : stravaId // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as ActivityType,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime,distance: null == distance ? _self.distance : distance // ignore: cast_nullable_to_non_nullable
as double,movingTime: null == movingTime ? _self.movingTime : movingTime // ignore: cast_nullable_to_non_nullable
as int,averageSpeed: freezed == averageSpeed ? _self.averageSpeed : averageSpeed // ignore: cast_nullable_to_non_nullable
as double?,averageHr: freezed == averageHr ? _self.averageHr : averageHr // ignore: cast_nullable_to_non_nullable
as double?,maxHr: freezed == maxHr ? _self.maxHr : maxHr // ignore: cast_nullable_to_non_nullable
as int?,averageCadence: freezed == averageCadence ? _self.averageCadence : averageCadence // ignore: cast_nullable_to_non_nullable
as double?,hasHeartrate: null == hasHeartrate ? _self.hasHeartrate : hasHeartrate // ignore: cast_nullable_to_non_nullable
as bool,totalElevation: null == totalElevation ? _self.totalElevation : totalElevation // ignore: cast_nullable_to_non_nullable
as double,trimp: freezed == trimp ? _self.trimp : trimp // ignore: cast_nullable_to_non_nullable
as double?,runningTss: freezed == runningTss ? _self.runningTss : runningTss // ignore: cast_nullable_to_non_nullable
as double?,estimatedVdot: freezed == estimatedVdot ? _self.estimatedVdot : estimatedVdot // ignore: cast_nullable_to_non_nullable
as double?,trainingType: freezed == trainingType ? _self.trainingType : trainingType // ignore: cast_nullable_to_non_nullable
as String?,hrZone1Time: null == hrZone1Time ? _self.hrZone1Time : hrZone1Time // ignore: cast_nullable_to_non_nullable
as int,hrZone2Time: null == hrZone2Time ? _self.hrZone2Time : hrZone2Time // ignore: cast_nullable_to_non_nullable
as int,hrZone3Time: null == hrZone3Time ? _self.hrZone3Time : hrZone3Time // ignore: cast_nullable_to_non_nullable
as int,hrZone4Time: null == hrZone4Time ? _self.hrZone4Time : hrZone4Time // ignore: cast_nullable_to_non_nullable
as int,hrZone5Time: null == hrZone5Time ? _self.hrZone5Time : hrZone5Time // ignore: cast_nullable_to_non_nullable
as int,hrZone6Time: null == hrZone6Time ? _self.hrZone6Time : hrZone6Time // ignore: cast_nullable_to_non_nullable
as int,hrZone7Time: null == hrZone7Time ? _self.hrZone7Time : hrZone7Time // ignore: cast_nullable_to_non_nullable
as int,streams: freezed == streams ? _self.streams : streams // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,calories: freezed == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double?,averageWatts: freezed == averageWatts ? _self.averageWatts : averageWatts // ignore: cast_nullable_to_non_nullable
as double?,weightedAverageWatts: freezed == weightedAverageWatts ? _self.weightedAverageWatts : weightedAverageWatts // ignore: cast_nullable_to_non_nullable
as double?,deviceWatts: null == deviceWatts ? _self.deviceWatts : deviceWatts // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Activity].
extension ActivityPatterns on Activity {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Activity value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Activity() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Activity value)  $default,){
final _that = this;
switch (_that) {
case _Activity():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Activity value)?  $default,){
final _that = this;
switch (_that) {
case _Activity() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String stravaId,  ActivityType type,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed,  double? averageHr,  int? maxHr,  double? averageCadence,  bool hasHeartrate,  double totalElevation,  double? trimp,  double? runningTss,  double? estimatedVdot,  String? trainingType, @JsonKey(name: 'hrZone1Time')  int hrZone1Time, @JsonKey(name: 'hrZone2Time')  int hrZone2Time, @JsonKey(name: 'hrZone3Time')  int hrZone3Time, @JsonKey(name: 'hrZone4Time')  int hrZone4Time, @JsonKey(name: 'hrZone5Time')  int hrZone5Time, @JsonKey(name: 'hrZone6Time')  int hrZone6Time, @JsonKey(name: 'hrZone7Time')  int hrZone7Time, @JsonKey(name: 'streams')  Map<String, dynamic>? streams, @JsonKey(name: 'calories')  double? calories, @JsonKey(name: 'averageWatts')  double? averageWatts, @JsonKey(name: 'weightedAverageWatts')  double? weightedAverageWatts, @JsonKey(name: 'deviceWatts')  bool deviceWatts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Activity() when $default != null:
return $default(_that.id,_that.stravaId,_that.type,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed,_that.averageHr,_that.maxHr,_that.averageCadence,_that.hasHeartrate,_that.totalElevation,_that.trimp,_that.runningTss,_that.estimatedVdot,_that.trainingType,_that.hrZone1Time,_that.hrZone2Time,_that.hrZone3Time,_that.hrZone4Time,_that.hrZone5Time,_that.hrZone6Time,_that.hrZone7Time,_that.streams,_that.calories,_that.averageWatts,_that.weightedAverageWatts,_that.deviceWatts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String stravaId,  ActivityType type,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed,  double? averageHr,  int? maxHr,  double? averageCadence,  bool hasHeartrate,  double totalElevation,  double? trimp,  double? runningTss,  double? estimatedVdot,  String? trainingType, @JsonKey(name: 'hrZone1Time')  int hrZone1Time, @JsonKey(name: 'hrZone2Time')  int hrZone2Time, @JsonKey(name: 'hrZone3Time')  int hrZone3Time, @JsonKey(name: 'hrZone4Time')  int hrZone4Time, @JsonKey(name: 'hrZone5Time')  int hrZone5Time, @JsonKey(name: 'hrZone6Time')  int hrZone6Time, @JsonKey(name: 'hrZone7Time')  int hrZone7Time, @JsonKey(name: 'streams')  Map<String, dynamic>? streams, @JsonKey(name: 'calories')  double? calories, @JsonKey(name: 'averageWatts')  double? averageWatts, @JsonKey(name: 'weightedAverageWatts')  double? weightedAverageWatts, @JsonKey(name: 'deviceWatts')  bool deviceWatts)  $default,) {final _that = this;
switch (_that) {
case _Activity():
return $default(_that.id,_that.stravaId,_that.type,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed,_that.averageHr,_that.maxHr,_that.averageCadence,_that.hasHeartrate,_that.totalElevation,_that.trimp,_that.runningTss,_that.estimatedVdot,_that.trainingType,_that.hrZone1Time,_that.hrZone2Time,_that.hrZone3Time,_that.hrZone4Time,_that.hrZone5Time,_that.hrZone6Time,_that.hrZone7Time,_that.streams,_that.calories,_that.averageWatts,_that.weightedAverageWatts,_that.deviceWatts);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String stravaId,  ActivityType type,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed,  double? averageHr,  int? maxHr,  double? averageCadence,  bool hasHeartrate,  double totalElevation,  double? trimp,  double? runningTss,  double? estimatedVdot,  String? trainingType, @JsonKey(name: 'hrZone1Time')  int hrZone1Time, @JsonKey(name: 'hrZone2Time')  int hrZone2Time, @JsonKey(name: 'hrZone3Time')  int hrZone3Time, @JsonKey(name: 'hrZone4Time')  int hrZone4Time, @JsonKey(name: 'hrZone5Time')  int hrZone5Time, @JsonKey(name: 'hrZone6Time')  int hrZone6Time, @JsonKey(name: 'hrZone7Time')  int hrZone7Time, @JsonKey(name: 'streams')  Map<String, dynamic>? streams, @JsonKey(name: 'calories')  double? calories, @JsonKey(name: 'averageWatts')  double? averageWatts, @JsonKey(name: 'weightedAverageWatts')  double? weightedAverageWatts, @JsonKey(name: 'deviceWatts')  bool deviceWatts)?  $default,) {final _that = this;
switch (_that) {
case _Activity() when $default != null:
return $default(_that.id,_that.stravaId,_that.type,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed,_that.averageHr,_that.maxHr,_that.averageCadence,_that.hasHeartrate,_that.totalElevation,_that.trimp,_that.runningTss,_that.estimatedVdot,_that.trainingType,_that.hrZone1Time,_that.hrZone2Time,_that.hrZone3Time,_that.hrZone4Time,_that.hrZone5Time,_that.hrZone6Time,_that.hrZone7Time,_that.streams,_that.calories,_that.averageWatts,_that.weightedAverageWatts,_that.deviceWatts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Activity extends Activity {
  const _Activity({required this.id, required this.stravaId, required this.type, required this.name, required this.startDate, required this.distance, required this.movingTime, required this.averageSpeed, required this.averageHr, required this.maxHr, required this.averageCadence, required this.hasHeartrate, required this.totalElevation, required this.trimp, required this.runningTss, required this.estimatedVdot, required this.trainingType, @JsonKey(name: 'hrZone1Time') this.hrZone1Time = 0, @JsonKey(name: 'hrZone2Time') this.hrZone2Time = 0, @JsonKey(name: 'hrZone3Time') this.hrZone3Time = 0, @JsonKey(name: 'hrZone4Time') this.hrZone4Time = 0, @JsonKey(name: 'hrZone5Time') this.hrZone5Time = 0, @JsonKey(name: 'hrZone6Time') this.hrZone6Time = 0, @JsonKey(name: 'hrZone7Time') this.hrZone7Time = 0, @JsonKey(name: 'streams') final  Map<String, dynamic>? streams, @JsonKey(name: 'calories') this.calories, @JsonKey(name: 'averageWatts') this.averageWatts, @JsonKey(name: 'weightedAverageWatts') this.weightedAverageWatts, @JsonKey(name: 'deviceWatts') this.deviceWatts = false}): _streams = streams,super._();
  factory _Activity.fromJson(Map<String, dynamic> json) => _$ActivityFromJson(json);

@override final  String id;
@override final  String stravaId;
@override final  ActivityType type;
@override final  String name;
@override final  DateTime startDate;
@override final  double distance;
@override final  int movingTime;
@override final  double? averageSpeed;
@override final  double? averageHr;
@override final  int? maxHr;
@override final  double? averageCadence;
@override final  bool hasHeartrate;
@override final  double totalElevation;
@override final  double? trimp;
@override final  double? runningTss;
@override final  double? estimatedVdot;
@override final  String? trainingType;
@override@JsonKey(name: 'hrZone1Time') final  int hrZone1Time;
@override@JsonKey(name: 'hrZone2Time') final  int hrZone2Time;
@override@JsonKey(name: 'hrZone3Time') final  int hrZone3Time;
@override@JsonKey(name: 'hrZone4Time') final  int hrZone4Time;
@override@JsonKey(name: 'hrZone5Time') final  int hrZone5Time;
@override@JsonKey(name: 'hrZone6Time') final  int hrZone6Time;
@override@JsonKey(name: 'hrZone7Time') final  int hrZone7Time;
 final  Map<String, dynamic>? _streams;
@override@JsonKey(name: 'streams') Map<String, dynamic>? get streams {
  final value = _streams;
  if (value == null) return null;
  if (_streams is EqualUnmodifiableMapView) return _streams;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

@override@JsonKey(name: 'calories') final  double? calories;
@override@JsonKey(name: 'averageWatts') final  double? averageWatts;
@override@JsonKey(name: 'weightedAverageWatts') final  double? weightedAverageWatts;
@override@JsonKey(name: 'deviceWatts') final  bool deviceWatts;

/// Create a copy of Activity
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActivityCopyWith<_Activity> get copyWith => __$ActivityCopyWithImpl<_Activity>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ActivityToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Activity&&(identical(other.id, id) || other.id == id)&&(identical(other.stravaId, stravaId) || other.stravaId == stravaId)&&(identical(other.type, type) || other.type == type)&&(identical(other.name, name) || other.name == name)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.movingTime, movingTime) || other.movingTime == movingTime)&&(identical(other.averageSpeed, averageSpeed) || other.averageSpeed == averageSpeed)&&(identical(other.averageHr, averageHr) || other.averageHr == averageHr)&&(identical(other.maxHr, maxHr) || other.maxHr == maxHr)&&(identical(other.averageCadence, averageCadence) || other.averageCadence == averageCadence)&&(identical(other.hasHeartrate, hasHeartrate) || other.hasHeartrate == hasHeartrate)&&(identical(other.totalElevation, totalElevation) || other.totalElevation == totalElevation)&&(identical(other.trimp, trimp) || other.trimp == trimp)&&(identical(other.runningTss, runningTss) || other.runningTss == runningTss)&&(identical(other.estimatedVdot, estimatedVdot) || other.estimatedVdot == estimatedVdot)&&(identical(other.trainingType, trainingType) || other.trainingType == trainingType)&&(identical(other.hrZone1Time, hrZone1Time) || other.hrZone1Time == hrZone1Time)&&(identical(other.hrZone2Time, hrZone2Time) || other.hrZone2Time == hrZone2Time)&&(identical(other.hrZone3Time, hrZone3Time) || other.hrZone3Time == hrZone3Time)&&(identical(other.hrZone4Time, hrZone4Time) || other.hrZone4Time == hrZone4Time)&&(identical(other.hrZone5Time, hrZone5Time) || other.hrZone5Time == hrZone5Time)&&(identical(other.hrZone6Time, hrZone6Time) || other.hrZone6Time == hrZone6Time)&&(identical(other.hrZone7Time, hrZone7Time) || other.hrZone7Time == hrZone7Time)&&const DeepCollectionEquality().equals(other._streams, _streams)&&(identical(other.calories, calories) || other.calories == calories)&&(identical(other.averageWatts, averageWatts) || other.averageWatts == averageWatts)&&(identical(other.weightedAverageWatts, weightedAverageWatts) || other.weightedAverageWatts == weightedAverageWatts)&&(identical(other.deviceWatts, deviceWatts) || other.deviceWatts == deviceWatts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,stravaId,type,name,startDate,distance,movingTime,averageSpeed,averageHr,maxHr,averageCadence,hasHeartrate,totalElevation,trimp,runningTss,estimatedVdot,trainingType,hrZone1Time,hrZone2Time,hrZone3Time,hrZone4Time,hrZone5Time,hrZone6Time,hrZone7Time,const DeepCollectionEquality().hash(_streams),calories,averageWatts,weightedAverageWatts,deviceWatts]);

@override
String toString() {
  return 'Activity(id: $id, stravaId: $stravaId, type: $type, name: $name, startDate: $startDate, distance: $distance, movingTime: $movingTime, averageSpeed: $averageSpeed, averageHr: $averageHr, maxHr: $maxHr, averageCadence: $averageCadence, hasHeartrate: $hasHeartrate, totalElevation: $totalElevation, trimp: $trimp, runningTss: $runningTss, estimatedVdot: $estimatedVdot, trainingType: $trainingType, hrZone1Time: $hrZone1Time, hrZone2Time: $hrZone2Time, hrZone3Time: $hrZone3Time, hrZone4Time: $hrZone4Time, hrZone5Time: $hrZone5Time, hrZone6Time: $hrZone6Time, hrZone7Time: $hrZone7Time, streams: $streams, calories: $calories, averageWatts: $averageWatts, weightedAverageWatts: $weightedAverageWatts, deviceWatts: $deviceWatts)';
}


}

/// @nodoc
abstract mixin class _$ActivityCopyWith<$Res> implements $ActivityCopyWith<$Res> {
  factory _$ActivityCopyWith(_Activity value, $Res Function(_Activity) _then) = __$ActivityCopyWithImpl;
@override @useResult
$Res call({
 String id, String stravaId, ActivityType type, String name, DateTime startDate, double distance, int movingTime, double? averageSpeed, double? averageHr, int? maxHr, double? averageCadence, bool hasHeartrate, double totalElevation, double? trimp, double? runningTss, double? estimatedVdot, String? trainingType,@JsonKey(name: 'hrZone1Time') int hrZone1Time,@JsonKey(name: 'hrZone2Time') int hrZone2Time,@JsonKey(name: 'hrZone3Time') int hrZone3Time,@JsonKey(name: 'hrZone4Time') int hrZone4Time,@JsonKey(name: 'hrZone5Time') int hrZone5Time,@JsonKey(name: 'hrZone6Time') int hrZone6Time,@JsonKey(name: 'hrZone7Time') int hrZone7Time,@JsonKey(name: 'streams') Map<String, dynamic>? streams,@JsonKey(name: 'calories') double? calories,@JsonKey(name: 'averageWatts') double? averageWatts,@JsonKey(name: 'weightedAverageWatts') double? weightedAverageWatts,@JsonKey(name: 'deviceWatts') bool deviceWatts
});




}
/// @nodoc
class __$ActivityCopyWithImpl<$Res>
    implements _$ActivityCopyWith<$Res> {
  __$ActivityCopyWithImpl(this._self, this._then);

  final _Activity _self;
  final $Res Function(_Activity) _then;

/// Create a copy of Activity
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? stravaId = null,Object? type = null,Object? name = null,Object? startDate = null,Object? distance = null,Object? movingTime = null,Object? averageSpeed = freezed,Object? averageHr = freezed,Object? maxHr = freezed,Object? averageCadence = freezed,Object? hasHeartrate = null,Object? totalElevation = null,Object? trimp = freezed,Object? runningTss = freezed,Object? estimatedVdot = freezed,Object? trainingType = freezed,Object? hrZone1Time = null,Object? hrZone2Time = null,Object? hrZone3Time = null,Object? hrZone4Time = null,Object? hrZone5Time = null,Object? hrZone6Time = null,Object? hrZone7Time = null,Object? streams = freezed,Object? calories = freezed,Object? averageWatts = freezed,Object? weightedAverageWatts = freezed,Object? deviceWatts = null,}) {
  return _then(_Activity(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,stravaId: null == stravaId ? _self.stravaId : stravaId // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as ActivityType,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,startDate: null == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime,distance: null == distance ? _self.distance : distance // ignore: cast_nullable_to_non_nullable
as double,movingTime: null == movingTime ? _self.movingTime : movingTime // ignore: cast_nullable_to_non_nullable
as int,averageSpeed: freezed == averageSpeed ? _self.averageSpeed : averageSpeed // ignore: cast_nullable_to_non_nullable
as double?,averageHr: freezed == averageHr ? _self.averageHr : averageHr // ignore: cast_nullable_to_non_nullable
as double?,maxHr: freezed == maxHr ? _self.maxHr : maxHr // ignore: cast_nullable_to_non_nullable
as int?,averageCadence: freezed == averageCadence ? _self.averageCadence : averageCadence // ignore: cast_nullable_to_non_nullable
as double?,hasHeartrate: null == hasHeartrate ? _self.hasHeartrate : hasHeartrate // ignore: cast_nullable_to_non_nullable
as bool,totalElevation: null == totalElevation ? _self.totalElevation : totalElevation // ignore: cast_nullable_to_non_nullable
as double,trimp: freezed == trimp ? _self.trimp : trimp // ignore: cast_nullable_to_non_nullable
as double?,runningTss: freezed == runningTss ? _self.runningTss : runningTss // ignore: cast_nullable_to_non_nullable
as double?,estimatedVdot: freezed == estimatedVdot ? _self.estimatedVdot : estimatedVdot // ignore: cast_nullable_to_non_nullable
as double?,trainingType: freezed == trainingType ? _self.trainingType : trainingType // ignore: cast_nullable_to_non_nullable
as String?,hrZone1Time: null == hrZone1Time ? _self.hrZone1Time : hrZone1Time // ignore: cast_nullable_to_non_nullable
as int,hrZone2Time: null == hrZone2Time ? _self.hrZone2Time : hrZone2Time // ignore: cast_nullable_to_non_nullable
as int,hrZone3Time: null == hrZone3Time ? _self.hrZone3Time : hrZone3Time // ignore: cast_nullable_to_non_nullable
as int,hrZone4Time: null == hrZone4Time ? _self.hrZone4Time : hrZone4Time // ignore: cast_nullable_to_non_nullable
as int,hrZone5Time: null == hrZone5Time ? _self.hrZone5Time : hrZone5Time // ignore: cast_nullable_to_non_nullable
as int,hrZone6Time: null == hrZone6Time ? _self.hrZone6Time : hrZone6Time // ignore: cast_nullable_to_non_nullable
as int,hrZone7Time: null == hrZone7Time ? _self.hrZone7Time : hrZone7Time // ignore: cast_nullable_to_non_nullable
as int,streams: freezed == streams ? _self._streams : streams // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,calories: freezed == calories ? _self.calories : calories // ignore: cast_nullable_to_non_nullable
as double?,averageWatts: freezed == averageWatts ? _self.averageWatts : averageWatts // ignore: cast_nullable_to_non_nullable
as double?,weightedAverageWatts: freezed == weightedAverageWatts ? _self.weightedAverageWatts : weightedAverageWatts // ignore: cast_nullable_to_non_nullable
as double?,deviceWatts: null == deviceWatts ? _self.deviceWatts : deviceWatts // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Workout {

 String get id; String get goalId; DateTime get scheduledDate;@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) WorkoutType get workoutType; String get description; double get targetDistance; double get targetPace; int get targetDuration; bool get isCompleted; DateTime? get completedAt; String? get activityId; String get sport;@JsonKey(name: 'displayDesc') String? get displayDescription;@JsonKey(name: 'intensityZone') String? get intensityZone;@JsonKey(name: 'phase') String? get phase;@JsonKey(name: 'targetHrZone') int? get targetHrZone;@JsonKey(name: 'targetHrZoneLabel') String? get targetHrZoneLabel;@JsonKey(name: 'targetHrMinBpm') int? get targetHrMinBpm;@JsonKey(name: 'targetHrMaxBpm') int? get targetHrMaxBpm;@JsonKey(name: 'targetPaceZoneLabel') String? get targetPaceZoneLabel;@JsonKey(name: 'targetPaceMinSecondsPerKm') double? get targetPaceMinSecondsPerKm;@JsonKey(name: 'targetPaceMaxSecondsPerKm') double? get targetPaceMaxSecondsPerKm;@JsonKey(name: 'structuredSteps') Map<String, dynamic>? get structuredSteps;
/// Create a copy of Workout
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WorkoutCopyWith<Workout> get copyWith => _$WorkoutCopyWithImpl<Workout>(this as Workout, _$identity);

  /// Serializes this Workout to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Workout&&(identical(other.id, id) || other.id == id)&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.scheduledDate, scheduledDate) || other.scheduledDate == scheduledDate)&&(identical(other.workoutType, workoutType) || other.workoutType == workoutType)&&(identical(other.description, description) || other.description == description)&&(identical(other.targetDistance, targetDistance) || other.targetDistance == targetDistance)&&(identical(other.targetPace, targetPace) || other.targetPace == targetPace)&&(identical(other.targetDuration, targetDuration) || other.targetDuration == targetDuration)&&(identical(other.isCompleted, isCompleted) || other.isCompleted == isCompleted)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.activityId, activityId) || other.activityId == activityId)&&(identical(other.sport, sport) || other.sport == sport)&&(identical(other.displayDescription, displayDescription) || other.displayDescription == displayDescription)&&(identical(other.intensityZone, intensityZone) || other.intensityZone == intensityZone)&&(identical(other.phase, phase) || other.phase == phase)&&(identical(other.targetHrZone, targetHrZone) || other.targetHrZone == targetHrZone)&&(identical(other.targetHrZoneLabel, targetHrZoneLabel) || other.targetHrZoneLabel == targetHrZoneLabel)&&(identical(other.targetHrMinBpm, targetHrMinBpm) || other.targetHrMinBpm == targetHrMinBpm)&&(identical(other.targetHrMaxBpm, targetHrMaxBpm) || other.targetHrMaxBpm == targetHrMaxBpm)&&(identical(other.targetPaceZoneLabel, targetPaceZoneLabel) || other.targetPaceZoneLabel == targetPaceZoneLabel)&&(identical(other.targetPaceMinSecondsPerKm, targetPaceMinSecondsPerKm) || other.targetPaceMinSecondsPerKm == targetPaceMinSecondsPerKm)&&(identical(other.targetPaceMaxSecondsPerKm, targetPaceMaxSecondsPerKm) || other.targetPaceMaxSecondsPerKm == targetPaceMaxSecondsPerKm)&&const DeepCollectionEquality().equals(other.structuredSteps, structuredSteps));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,goalId,scheduledDate,workoutType,description,targetDistance,targetPace,targetDuration,isCompleted,completedAt,activityId,sport,displayDescription,intensityZone,phase,targetHrZone,targetHrZoneLabel,targetHrMinBpm,targetHrMaxBpm,targetPaceZoneLabel,targetPaceMinSecondsPerKm,targetPaceMaxSecondsPerKm,const DeepCollectionEquality().hash(structuredSteps)]);

@override
String toString() {
  return 'Workout(id: $id, goalId: $goalId, scheduledDate: $scheduledDate, workoutType: $workoutType, description: $description, targetDistance: $targetDistance, targetPace: $targetPace, targetDuration: $targetDuration, isCompleted: $isCompleted, completedAt: $completedAt, activityId: $activityId, sport: $sport, displayDescription: $displayDescription, intensityZone: $intensityZone, phase: $phase, targetHrZone: $targetHrZone, targetHrZoneLabel: $targetHrZoneLabel, targetHrMinBpm: $targetHrMinBpm, targetHrMaxBpm: $targetHrMaxBpm, targetPaceZoneLabel: $targetPaceZoneLabel, targetPaceMinSecondsPerKm: $targetPaceMinSecondsPerKm, targetPaceMaxSecondsPerKm: $targetPaceMaxSecondsPerKm, structuredSteps: $structuredSteps)';
}


}

/// @nodoc
abstract mixin class $WorkoutCopyWith<$Res>  {
  factory $WorkoutCopyWith(Workout value, $Res Function(Workout) _then) = _$WorkoutCopyWithImpl;
@useResult
$Res call({
 String id, String goalId, DateTime scheduledDate,@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) WorkoutType workoutType, String description, double targetDistance, double targetPace, int targetDuration, bool isCompleted, DateTime? completedAt, String? activityId, String sport,@JsonKey(name: 'displayDesc') String? displayDescription,@JsonKey(name: 'intensityZone') String? intensityZone,@JsonKey(name: 'phase') String? phase,@JsonKey(name: 'targetHrZone') int? targetHrZone,@JsonKey(name: 'targetHrZoneLabel') String? targetHrZoneLabel,@JsonKey(name: 'targetHrMinBpm') int? targetHrMinBpm,@JsonKey(name: 'targetHrMaxBpm') int? targetHrMaxBpm,@JsonKey(name: 'targetPaceZoneLabel') String? targetPaceZoneLabel,@JsonKey(name: 'targetPaceMinSecondsPerKm') double? targetPaceMinSecondsPerKm,@JsonKey(name: 'targetPaceMaxSecondsPerKm') double? targetPaceMaxSecondsPerKm,@JsonKey(name: 'structuredSteps') Map<String, dynamic>? structuredSteps
});




}
/// @nodoc
class _$WorkoutCopyWithImpl<$Res>
    implements $WorkoutCopyWith<$Res> {
  _$WorkoutCopyWithImpl(this._self, this._then);

  final Workout _self;
  final $Res Function(Workout) _then;

/// Create a copy of Workout
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? goalId = null,Object? scheduledDate = null,Object? workoutType = null,Object? description = null,Object? targetDistance = null,Object? targetPace = null,Object? targetDuration = null,Object? isCompleted = null,Object? completedAt = freezed,Object? activityId = freezed,Object? sport = null,Object? displayDescription = freezed,Object? intensityZone = freezed,Object? phase = freezed,Object? targetHrZone = freezed,Object? targetHrZoneLabel = freezed,Object? targetHrMinBpm = freezed,Object? targetHrMaxBpm = freezed,Object? targetPaceZoneLabel = freezed,Object? targetPaceMinSecondsPerKm = freezed,Object? targetPaceMaxSecondsPerKm = freezed,Object? structuredSteps = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,goalId: null == goalId ? _self.goalId : goalId // ignore: cast_nullable_to_non_nullable
as String,scheduledDate: null == scheduledDate ? _self.scheduledDate : scheduledDate // ignore: cast_nullable_to_non_nullable
as DateTime,workoutType: null == workoutType ? _self.workoutType : workoutType // ignore: cast_nullable_to_non_nullable
as WorkoutType,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,targetDistance: null == targetDistance ? _self.targetDistance : targetDistance // ignore: cast_nullable_to_non_nullable
as double,targetPace: null == targetPace ? _self.targetPace : targetPace // ignore: cast_nullable_to_non_nullable
as double,targetDuration: null == targetDuration ? _self.targetDuration : targetDuration // ignore: cast_nullable_to_non_nullable
as int,isCompleted: null == isCompleted ? _self.isCompleted : isCompleted // ignore: cast_nullable_to_non_nullable
as bool,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,activityId: freezed == activityId ? _self.activityId : activityId // ignore: cast_nullable_to_non_nullable
as String?,sport: null == sport ? _self.sport : sport // ignore: cast_nullable_to_non_nullable
as String,displayDescription: freezed == displayDescription ? _self.displayDescription : displayDescription // ignore: cast_nullable_to_non_nullable
as String?,intensityZone: freezed == intensityZone ? _self.intensityZone : intensityZone // ignore: cast_nullable_to_non_nullable
as String?,phase: freezed == phase ? _self.phase : phase // ignore: cast_nullable_to_non_nullable
as String?,targetHrZone: freezed == targetHrZone ? _self.targetHrZone : targetHrZone // ignore: cast_nullable_to_non_nullable
as int?,targetHrZoneLabel: freezed == targetHrZoneLabel ? _self.targetHrZoneLabel : targetHrZoneLabel // ignore: cast_nullable_to_non_nullable
as String?,targetHrMinBpm: freezed == targetHrMinBpm ? _self.targetHrMinBpm : targetHrMinBpm // ignore: cast_nullable_to_non_nullable
as int?,targetHrMaxBpm: freezed == targetHrMaxBpm ? _self.targetHrMaxBpm : targetHrMaxBpm // ignore: cast_nullable_to_non_nullable
as int?,targetPaceZoneLabel: freezed == targetPaceZoneLabel ? _self.targetPaceZoneLabel : targetPaceZoneLabel // ignore: cast_nullable_to_non_nullable
as String?,targetPaceMinSecondsPerKm: freezed == targetPaceMinSecondsPerKm ? _self.targetPaceMinSecondsPerKm : targetPaceMinSecondsPerKm // ignore: cast_nullable_to_non_nullable
as double?,targetPaceMaxSecondsPerKm: freezed == targetPaceMaxSecondsPerKm ? _self.targetPaceMaxSecondsPerKm : targetPaceMaxSecondsPerKm // ignore: cast_nullable_to_non_nullable
as double?,structuredSteps: freezed == structuredSteps ? _self.structuredSteps : structuredSteps // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,
  ));
}

}


/// Adds pattern-matching-related methods to [Workout].
extension WorkoutPatterns on Workout {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Workout value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Workout() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Workout value)  $default,){
final _that = this;
switch (_that) {
case _Workout():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Workout value)?  $default,){
final _that = this;
switch (_that) {
case _Workout() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String goalId,  DateTime scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)  WorkoutType workoutType,  String description,  double targetDistance,  double targetPace,  int targetDuration,  bool isCompleted,  DateTime? completedAt,  String? activityId,  String sport, @JsonKey(name: 'displayDesc')  String? displayDescription, @JsonKey(name: 'intensityZone')  String? intensityZone, @JsonKey(name: 'phase')  String? phase, @JsonKey(name: 'targetHrZone')  int? targetHrZone, @JsonKey(name: 'targetHrZoneLabel')  String? targetHrZoneLabel, @JsonKey(name: 'targetHrMinBpm')  int? targetHrMinBpm, @JsonKey(name: 'targetHrMaxBpm')  int? targetHrMaxBpm, @JsonKey(name: 'targetPaceZoneLabel')  String? targetPaceZoneLabel, @JsonKey(name: 'targetPaceMinSecondsPerKm')  double? targetPaceMinSecondsPerKm, @JsonKey(name: 'targetPaceMaxSecondsPerKm')  double? targetPaceMaxSecondsPerKm, @JsonKey(name: 'structuredSteps')  Map<String, dynamic>? structuredSteps)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Workout() when $default != null:
return $default(_that.id,_that.goalId,_that.scheduledDate,_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted,_that.completedAt,_that.activityId,_that.sport,_that.displayDescription,_that.intensityZone,_that.phase,_that.targetHrZone,_that.targetHrZoneLabel,_that.targetHrMinBpm,_that.targetHrMaxBpm,_that.targetPaceZoneLabel,_that.targetPaceMinSecondsPerKm,_that.targetPaceMaxSecondsPerKm,_that.structuredSteps);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String goalId,  DateTime scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)  WorkoutType workoutType,  String description,  double targetDistance,  double targetPace,  int targetDuration,  bool isCompleted,  DateTime? completedAt,  String? activityId,  String sport, @JsonKey(name: 'displayDesc')  String? displayDescription, @JsonKey(name: 'intensityZone')  String? intensityZone, @JsonKey(name: 'phase')  String? phase, @JsonKey(name: 'targetHrZone')  int? targetHrZone, @JsonKey(name: 'targetHrZoneLabel')  String? targetHrZoneLabel, @JsonKey(name: 'targetHrMinBpm')  int? targetHrMinBpm, @JsonKey(name: 'targetHrMaxBpm')  int? targetHrMaxBpm, @JsonKey(name: 'targetPaceZoneLabel')  String? targetPaceZoneLabel, @JsonKey(name: 'targetPaceMinSecondsPerKm')  double? targetPaceMinSecondsPerKm, @JsonKey(name: 'targetPaceMaxSecondsPerKm')  double? targetPaceMaxSecondsPerKm, @JsonKey(name: 'structuredSteps')  Map<String, dynamic>? structuredSteps)  $default,) {final _that = this;
switch (_that) {
case _Workout():
return $default(_that.id,_that.goalId,_that.scheduledDate,_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted,_that.completedAt,_that.activityId,_that.sport,_that.displayDescription,_that.intensityZone,_that.phase,_that.targetHrZone,_that.targetHrZoneLabel,_that.targetHrMinBpm,_that.targetHrMaxBpm,_that.targetPaceZoneLabel,_that.targetPaceMinSecondsPerKm,_that.targetPaceMaxSecondsPerKm,_that.structuredSteps);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String goalId,  DateTime scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)  WorkoutType workoutType,  String description,  double targetDistance,  double targetPace,  int targetDuration,  bool isCompleted,  DateTime? completedAt,  String? activityId,  String sport, @JsonKey(name: 'displayDesc')  String? displayDescription, @JsonKey(name: 'intensityZone')  String? intensityZone, @JsonKey(name: 'phase')  String? phase, @JsonKey(name: 'targetHrZone')  int? targetHrZone, @JsonKey(name: 'targetHrZoneLabel')  String? targetHrZoneLabel, @JsonKey(name: 'targetHrMinBpm')  int? targetHrMinBpm, @JsonKey(name: 'targetHrMaxBpm')  int? targetHrMaxBpm, @JsonKey(name: 'targetPaceZoneLabel')  String? targetPaceZoneLabel, @JsonKey(name: 'targetPaceMinSecondsPerKm')  double? targetPaceMinSecondsPerKm, @JsonKey(name: 'targetPaceMaxSecondsPerKm')  double? targetPaceMaxSecondsPerKm, @JsonKey(name: 'structuredSteps')  Map<String, dynamic>? structuredSteps)?  $default,) {final _that = this;
switch (_that) {
case _Workout() when $default != null:
return $default(_that.id,_that.goalId,_that.scheduledDate,_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted,_that.completedAt,_that.activityId,_that.sport,_that.displayDescription,_that.intensityZone,_that.phase,_that.targetHrZone,_that.targetHrZoneLabel,_that.targetHrMinBpm,_that.targetHrMaxBpm,_that.targetPaceZoneLabel,_that.targetPaceMinSecondsPerKm,_that.targetPaceMaxSecondsPerKm,_that.structuredSteps);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Workout extends Workout {
  const _Workout({required this.id, required this.goalId, required this.scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) required this.workoutType, this.description = '', this.targetDistance = 0.0, this.targetPace = 0.0, this.targetDuration = 0, this.isCompleted = false, required this.completedAt, required this.activityId, this.sport = 'RUN', @JsonKey(name: 'displayDesc') this.displayDescription, @JsonKey(name: 'intensityZone') this.intensityZone, @JsonKey(name: 'phase') this.phase, @JsonKey(name: 'targetHrZone') this.targetHrZone, @JsonKey(name: 'targetHrZoneLabel') this.targetHrZoneLabel, @JsonKey(name: 'targetHrMinBpm') this.targetHrMinBpm, @JsonKey(name: 'targetHrMaxBpm') this.targetHrMaxBpm, @JsonKey(name: 'targetPaceZoneLabel') this.targetPaceZoneLabel, @JsonKey(name: 'targetPaceMinSecondsPerKm') this.targetPaceMinSecondsPerKm, @JsonKey(name: 'targetPaceMaxSecondsPerKm') this.targetPaceMaxSecondsPerKm, @JsonKey(name: 'structuredSteps') final  Map<String, dynamic>? structuredSteps}): _structuredSteps = structuredSteps,super._();
  factory _Workout.fromJson(Map<String, dynamic> json) => _$WorkoutFromJson(json);

@override final  String id;
@override final  String goalId;
@override final  DateTime scheduledDate;
@override@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) final  WorkoutType workoutType;
@override@JsonKey() final  String description;
@override@JsonKey() final  double targetDistance;
@override@JsonKey() final  double targetPace;
@override@JsonKey() final  int targetDuration;
@override@JsonKey() final  bool isCompleted;
@override final  DateTime? completedAt;
@override final  String? activityId;
@override@JsonKey() final  String sport;
@override@JsonKey(name: 'displayDesc') final  String? displayDescription;
@override@JsonKey(name: 'intensityZone') final  String? intensityZone;
@override@JsonKey(name: 'phase') final  String? phase;
@override@JsonKey(name: 'targetHrZone') final  int? targetHrZone;
@override@JsonKey(name: 'targetHrZoneLabel') final  String? targetHrZoneLabel;
@override@JsonKey(name: 'targetHrMinBpm') final  int? targetHrMinBpm;
@override@JsonKey(name: 'targetHrMaxBpm') final  int? targetHrMaxBpm;
@override@JsonKey(name: 'targetPaceZoneLabel') final  String? targetPaceZoneLabel;
@override@JsonKey(name: 'targetPaceMinSecondsPerKm') final  double? targetPaceMinSecondsPerKm;
@override@JsonKey(name: 'targetPaceMaxSecondsPerKm') final  double? targetPaceMaxSecondsPerKm;
 final  Map<String, dynamic>? _structuredSteps;
@override@JsonKey(name: 'structuredSteps') Map<String, dynamic>? get structuredSteps {
  final value = _structuredSteps;
  if (value == null) return null;
  if (_structuredSteps is EqualUnmodifiableMapView) return _structuredSteps;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}


/// Create a copy of Workout
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WorkoutCopyWith<_Workout> get copyWith => __$WorkoutCopyWithImpl<_Workout>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WorkoutToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Workout&&(identical(other.id, id) || other.id == id)&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.scheduledDate, scheduledDate) || other.scheduledDate == scheduledDate)&&(identical(other.workoutType, workoutType) || other.workoutType == workoutType)&&(identical(other.description, description) || other.description == description)&&(identical(other.targetDistance, targetDistance) || other.targetDistance == targetDistance)&&(identical(other.targetPace, targetPace) || other.targetPace == targetPace)&&(identical(other.targetDuration, targetDuration) || other.targetDuration == targetDuration)&&(identical(other.isCompleted, isCompleted) || other.isCompleted == isCompleted)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.activityId, activityId) || other.activityId == activityId)&&(identical(other.sport, sport) || other.sport == sport)&&(identical(other.displayDescription, displayDescription) || other.displayDescription == displayDescription)&&(identical(other.intensityZone, intensityZone) || other.intensityZone == intensityZone)&&(identical(other.phase, phase) || other.phase == phase)&&(identical(other.targetHrZone, targetHrZone) || other.targetHrZone == targetHrZone)&&(identical(other.targetHrZoneLabel, targetHrZoneLabel) || other.targetHrZoneLabel == targetHrZoneLabel)&&(identical(other.targetHrMinBpm, targetHrMinBpm) || other.targetHrMinBpm == targetHrMinBpm)&&(identical(other.targetHrMaxBpm, targetHrMaxBpm) || other.targetHrMaxBpm == targetHrMaxBpm)&&(identical(other.targetPaceZoneLabel, targetPaceZoneLabel) || other.targetPaceZoneLabel == targetPaceZoneLabel)&&(identical(other.targetPaceMinSecondsPerKm, targetPaceMinSecondsPerKm) || other.targetPaceMinSecondsPerKm == targetPaceMinSecondsPerKm)&&(identical(other.targetPaceMaxSecondsPerKm, targetPaceMaxSecondsPerKm) || other.targetPaceMaxSecondsPerKm == targetPaceMaxSecondsPerKm)&&const DeepCollectionEquality().equals(other._structuredSteps, _structuredSteps));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,goalId,scheduledDate,workoutType,description,targetDistance,targetPace,targetDuration,isCompleted,completedAt,activityId,sport,displayDescription,intensityZone,phase,targetHrZone,targetHrZoneLabel,targetHrMinBpm,targetHrMaxBpm,targetPaceZoneLabel,targetPaceMinSecondsPerKm,targetPaceMaxSecondsPerKm,const DeepCollectionEquality().hash(_structuredSteps)]);

@override
String toString() {
  return 'Workout(id: $id, goalId: $goalId, scheduledDate: $scheduledDate, workoutType: $workoutType, description: $description, targetDistance: $targetDistance, targetPace: $targetPace, targetDuration: $targetDuration, isCompleted: $isCompleted, completedAt: $completedAt, activityId: $activityId, sport: $sport, displayDescription: $displayDescription, intensityZone: $intensityZone, phase: $phase, targetHrZone: $targetHrZone, targetHrZoneLabel: $targetHrZoneLabel, targetHrMinBpm: $targetHrMinBpm, targetHrMaxBpm: $targetHrMaxBpm, targetPaceZoneLabel: $targetPaceZoneLabel, targetPaceMinSecondsPerKm: $targetPaceMinSecondsPerKm, targetPaceMaxSecondsPerKm: $targetPaceMaxSecondsPerKm, structuredSteps: $structuredSteps)';
}


}

/// @nodoc
abstract mixin class _$WorkoutCopyWith<$Res> implements $WorkoutCopyWith<$Res> {
  factory _$WorkoutCopyWith(_Workout value, $Res Function(_Workout) _then) = __$WorkoutCopyWithImpl;
@override @useResult
$Res call({
 String id, String goalId, DateTime scheduledDate,@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) WorkoutType workoutType, String description, double targetDistance, double targetPace, int targetDuration, bool isCompleted, DateTime? completedAt, String? activityId, String sport,@JsonKey(name: 'displayDesc') String? displayDescription,@JsonKey(name: 'intensityZone') String? intensityZone,@JsonKey(name: 'phase') String? phase,@JsonKey(name: 'targetHrZone') int? targetHrZone,@JsonKey(name: 'targetHrZoneLabel') String? targetHrZoneLabel,@JsonKey(name: 'targetHrMinBpm') int? targetHrMinBpm,@JsonKey(name: 'targetHrMaxBpm') int? targetHrMaxBpm,@JsonKey(name: 'targetPaceZoneLabel') String? targetPaceZoneLabel,@JsonKey(name: 'targetPaceMinSecondsPerKm') double? targetPaceMinSecondsPerKm,@JsonKey(name: 'targetPaceMaxSecondsPerKm') double? targetPaceMaxSecondsPerKm,@JsonKey(name: 'structuredSteps') Map<String, dynamic>? structuredSteps
});




}
/// @nodoc
class __$WorkoutCopyWithImpl<$Res>
    implements _$WorkoutCopyWith<$Res> {
  __$WorkoutCopyWithImpl(this._self, this._then);

  final _Workout _self;
  final $Res Function(_Workout) _then;

/// Create a copy of Workout
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? goalId = null,Object? scheduledDate = null,Object? workoutType = null,Object? description = null,Object? targetDistance = null,Object? targetPace = null,Object? targetDuration = null,Object? isCompleted = null,Object? completedAt = freezed,Object? activityId = freezed,Object? sport = null,Object? displayDescription = freezed,Object? intensityZone = freezed,Object? phase = freezed,Object? targetHrZone = freezed,Object? targetHrZoneLabel = freezed,Object? targetHrMinBpm = freezed,Object? targetHrMaxBpm = freezed,Object? targetPaceZoneLabel = freezed,Object? targetPaceMinSecondsPerKm = freezed,Object? targetPaceMaxSecondsPerKm = freezed,Object? structuredSteps = freezed,}) {
  return _then(_Workout(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,goalId: null == goalId ? _self.goalId : goalId // ignore: cast_nullable_to_non_nullable
as String,scheduledDate: null == scheduledDate ? _self.scheduledDate : scheduledDate // ignore: cast_nullable_to_non_nullable
as DateTime,workoutType: null == workoutType ? _self.workoutType : workoutType // ignore: cast_nullable_to_non_nullable
as WorkoutType,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,targetDistance: null == targetDistance ? _self.targetDistance : targetDistance // ignore: cast_nullable_to_non_nullable
as double,targetPace: null == targetPace ? _self.targetPace : targetPace // ignore: cast_nullable_to_non_nullable
as double,targetDuration: null == targetDuration ? _self.targetDuration : targetDuration // ignore: cast_nullable_to_non_nullable
as int,isCompleted: null == isCompleted ? _self.isCompleted : isCompleted // ignore: cast_nullable_to_non_nullable
as bool,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,activityId: freezed == activityId ? _self.activityId : activityId // ignore: cast_nullable_to_non_nullable
as String?,sport: null == sport ? _self.sport : sport // ignore: cast_nullable_to_non_nullable
as String,displayDescription: freezed == displayDescription ? _self.displayDescription : displayDescription // ignore: cast_nullable_to_non_nullable
as String?,intensityZone: freezed == intensityZone ? _self.intensityZone : intensityZone // ignore: cast_nullable_to_non_nullable
as String?,phase: freezed == phase ? _self.phase : phase // ignore: cast_nullable_to_non_nullable
as String?,targetHrZone: freezed == targetHrZone ? _self.targetHrZone : targetHrZone // ignore: cast_nullable_to_non_nullable
as int?,targetHrZoneLabel: freezed == targetHrZoneLabel ? _self.targetHrZoneLabel : targetHrZoneLabel // ignore: cast_nullable_to_non_nullable
as String?,targetHrMinBpm: freezed == targetHrMinBpm ? _self.targetHrMinBpm : targetHrMinBpm // ignore: cast_nullable_to_non_nullable
as int?,targetHrMaxBpm: freezed == targetHrMaxBpm ? _self.targetHrMaxBpm : targetHrMaxBpm // ignore: cast_nullable_to_non_nullable
as int?,targetPaceZoneLabel: freezed == targetPaceZoneLabel ? _self.targetPaceZoneLabel : targetPaceZoneLabel // ignore: cast_nullable_to_non_nullable
as String?,targetPaceMinSecondsPerKm: freezed == targetPaceMinSecondsPerKm ? _self.targetPaceMinSecondsPerKm : targetPaceMinSecondsPerKm // ignore: cast_nullable_to_non_nullable
as double?,targetPaceMaxSecondsPerKm: freezed == targetPaceMaxSecondsPerKm ? _self.targetPaceMaxSecondsPerKm : targetPaceMaxSecondsPerKm // ignore: cast_nullable_to_non_nullable
as double?,structuredSteps: freezed == structuredSteps ? _self._structuredSteps : structuredSteps // ignore: cast_nullable_to_non_nullable
as Map<String, dynamic>?,
  ));
}


}


/// @nodoc
mixin _$SubGoal {

 String get id; String get userId; String get name; RaceType? get raceType; DateTime? get raceDate; int? get targetTime; String get sport; String get priority; DateTime get createdAt; DateTime get updatedAt; DateTime? get completedAt; bool get isActive;
/// Create a copy of SubGoal
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SubGoalCopyWith<SubGoal> get copyWith => _$SubGoalCopyWithImpl<SubGoal>(this as SubGoal, _$identity);

  /// Serializes this SubGoal to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SubGoal&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.sport, sport) || other.sport == sport)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,name,raceType,raceDate,targetTime,sport,priority,createdAt,updatedAt,completedAt,isActive);

@override
String toString() {
  return 'SubGoal(id: $id, userId: $userId, name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, sport: $sport, priority: $priority, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class $SubGoalCopyWith<$Res>  {
  factory $SubGoalCopyWith(SubGoal value, $Res Function(SubGoal) _then) = _$SubGoalCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String name, RaceType? raceType, DateTime? raceDate, int? targetTime, String sport, String priority, DateTime createdAt, DateTime updatedAt, DateTime? completedAt, bool isActive
});




}
/// @nodoc
class _$SubGoalCopyWithImpl<$Res>
    implements $SubGoalCopyWith<$Res> {
  _$SubGoalCopyWithImpl(this._self, this._then);

  final SubGoal _self;
  final $Res Function(SubGoal) _then;

/// Create a copy of SubGoal
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? name = null,Object? raceType = freezed,Object? raceDate = freezed,Object? targetTime = freezed,Object? sport = null,Object? priority = null,Object? createdAt = null,Object? updatedAt = null,Object? completedAt = freezed,Object? isActive = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: freezed == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType?,raceDate: freezed == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime?,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,sport: null == sport ? _self.sport : sport // ignore: cast_nullable_to_non_nullable
as String,priority: null == priority ? _self.priority : priority // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [SubGoal].
extension SubGoalPatterns on SubGoal {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SubGoal value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SubGoal() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SubGoal value)  $default,){
final _that = this;
switch (_that) {
case _SubGoal():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SubGoal value)?  $default,){
final _that = this;
switch (_that) {
case _SubGoal() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String name,  RaceType? raceType,  DateTime? raceDate,  int? targetTime,  String sport,  String priority,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SubGoal() when $default != null:
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.sport,_that.priority,_that.createdAt,_that.updatedAt,_that.completedAt,_that.isActive);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String name,  RaceType? raceType,  DateTime? raceDate,  int? targetTime,  String sport,  String priority,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _SubGoal():
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.sport,_that.priority,_that.createdAt,_that.updatedAt,_that.completedAt,_that.isActive);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String name,  RaceType? raceType,  DateTime? raceDate,  int? targetTime,  String sport,  String priority,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _SubGoal() when $default != null:
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.sport,_that.priority,_that.createdAt,_that.updatedAt,_that.completedAt,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SubGoal extends SubGoal {
  const _SubGoal({required this.id, this.userId = '', required this.name, this.raceType, this.raceDate, this.targetTime, this.sport = 'RUN', this.priority = 'SECONDARY', required this.createdAt, required this.updatedAt, this.completedAt, this.isActive = true}): super._();
  factory _SubGoal.fromJson(Map<String, dynamic> json) => _$SubGoalFromJson(json);

@override final  String id;
@override@JsonKey() final  String userId;
@override final  String name;
@override final  RaceType? raceType;
@override final  DateTime? raceDate;
@override final  int? targetTime;
@override@JsonKey() final  String sport;
@override@JsonKey() final  String priority;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override final  DateTime? completedAt;
@override@JsonKey() final  bool isActive;

/// Create a copy of SubGoal
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SubGoalCopyWith<_SubGoal> get copyWith => __$SubGoalCopyWithImpl<_SubGoal>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SubGoalToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SubGoal&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.sport, sport) || other.sport == sport)&&(identical(other.priority, priority) || other.priority == priority)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,name,raceType,raceDate,targetTime,sport,priority,createdAt,updatedAt,completedAt,isActive);

@override
String toString() {
  return 'SubGoal(id: $id, userId: $userId, name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, sport: $sport, priority: $priority, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$SubGoalCopyWith<$Res> implements $SubGoalCopyWith<$Res> {
  factory _$SubGoalCopyWith(_SubGoal value, $Res Function(_SubGoal) _then) = __$SubGoalCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String name, RaceType? raceType, DateTime? raceDate, int? targetTime, String sport, String priority, DateTime createdAt, DateTime updatedAt, DateTime? completedAt, bool isActive
});




}
/// @nodoc
class __$SubGoalCopyWithImpl<$Res>
    implements _$SubGoalCopyWith<$Res> {
  __$SubGoalCopyWithImpl(this._self, this._then);

  final _SubGoal _self;
  final $Res Function(_SubGoal) _then;

/// Create a copy of SubGoal
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? name = null,Object? raceType = freezed,Object? raceDate = freezed,Object? targetTime = freezed,Object? sport = null,Object? priority = null,Object? createdAt = null,Object? updatedAt = null,Object? completedAt = freezed,Object? isActive = null,}) {
  return _then(_SubGoal(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: freezed == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType?,raceDate: freezed == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime?,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,sport: null == sport ? _self.sport : sport // ignore: cast_nullable_to_non_nullable
as String,priority: null == priority ? _self.priority : priority // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Goal {

 String get id; String get userId; String get name; RaceType? get raceType; DateTime? get raceDate; int? get targetTime; double? get weeklyMileageGoal; int get planWeeks; int get runsPerWeek; int get longRunDay; int get workoutDay; double? get currentVdot; int? get predictedTime; bool get isActive; DateTime get createdAt; DateTime get updatedAt; DateTime? get completedAt; List<Workout> get workouts; double? get backyardLoopDistM; int? get targetLaps; String get sport; String get planSource; int get ridesPerWeek; int get swimsPerWeek; int get strengthPerWeek; int get taperWeeks; int get peakWeeks; int get buildWeeks; List<int> get restDays; String? get parentGoalId; List<SubGoal> get subGoals;
/// Create a copy of Goal
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GoalCopyWith<Goal> get copyWith => _$GoalCopyWithImpl<Goal>(this as Goal, _$identity);

  /// Serializes this Goal to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Goal&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.weeklyMileageGoal, weeklyMileageGoal) || other.weeklyMileageGoal == weeklyMileageGoal)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek)&&(identical(other.longRunDay, longRunDay) || other.longRunDay == longRunDay)&&(identical(other.workoutDay, workoutDay) || other.workoutDay == workoutDay)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.predictedTime, predictedTime) || other.predictedTime == predictedTime)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&const DeepCollectionEquality().equals(other.workouts, workouts)&&(identical(other.backyardLoopDistM, backyardLoopDistM) || other.backyardLoopDistM == backyardLoopDistM)&&(identical(other.targetLaps, targetLaps) || other.targetLaps == targetLaps)&&(identical(other.sport, sport) || other.sport == sport)&&(identical(other.planSource, planSource) || other.planSource == planSource)&&(identical(other.ridesPerWeek, ridesPerWeek) || other.ridesPerWeek == ridesPerWeek)&&(identical(other.swimsPerWeek, swimsPerWeek) || other.swimsPerWeek == swimsPerWeek)&&(identical(other.strengthPerWeek, strengthPerWeek) || other.strengthPerWeek == strengthPerWeek)&&(identical(other.taperWeeks, taperWeeks) || other.taperWeeks == taperWeeks)&&(identical(other.peakWeeks, peakWeeks) || other.peakWeeks == peakWeeks)&&(identical(other.buildWeeks, buildWeeks) || other.buildWeeks == buildWeeks)&&const DeepCollectionEquality().equals(other.restDays, restDays)&&(identical(other.parentGoalId, parentGoalId) || other.parentGoalId == parentGoalId)&&const DeepCollectionEquality().equals(other.subGoals, subGoals));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,userId,name,raceType,raceDate,targetTime,weeklyMileageGoal,planWeeks,runsPerWeek,longRunDay,workoutDay,currentVdot,predictedTime,isActive,createdAt,updatedAt,completedAt,const DeepCollectionEquality().hash(workouts),backyardLoopDistM,targetLaps,sport,planSource,ridesPerWeek,swimsPerWeek,strengthPerWeek,taperWeeks,peakWeeks,buildWeeks,const DeepCollectionEquality().hash(restDays),parentGoalId,const DeepCollectionEquality().hash(subGoals)]);

@override
String toString() {
  return 'Goal(id: $id, userId: $userId, name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, weeklyMileageGoal: $weeklyMileageGoal, planWeeks: $planWeeks, runsPerWeek: $runsPerWeek, longRunDay: $longRunDay, workoutDay: $workoutDay, currentVdot: $currentVdot, predictedTime: $predictedTime, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt, workouts: $workouts, backyardLoopDistM: $backyardLoopDistM, targetLaps: $targetLaps, sport: $sport, planSource: $planSource, ridesPerWeek: $ridesPerWeek, swimsPerWeek: $swimsPerWeek, strengthPerWeek: $strengthPerWeek, taperWeeks: $taperWeeks, peakWeeks: $peakWeeks, buildWeeks: $buildWeeks, restDays: $restDays, parentGoalId: $parentGoalId, subGoals: $subGoals)';
}


}

/// @nodoc
abstract mixin class $GoalCopyWith<$Res>  {
  factory $GoalCopyWith(Goal value, $Res Function(Goal) _then) = _$GoalCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String name, RaceType? raceType, DateTime? raceDate, int? targetTime, double? weeklyMileageGoal, int planWeeks, int runsPerWeek, int longRunDay, int workoutDay, double? currentVdot, int? predictedTime, bool isActive, DateTime createdAt, DateTime updatedAt, DateTime? completedAt, List<Workout> workouts, double? backyardLoopDistM, int? targetLaps, String sport, String planSource, int ridesPerWeek, int swimsPerWeek, int strengthPerWeek, int taperWeeks, int peakWeeks, int buildWeeks, List<int> restDays, String? parentGoalId, List<SubGoal> subGoals
});




}
/// @nodoc
class _$GoalCopyWithImpl<$Res>
    implements $GoalCopyWith<$Res> {
  _$GoalCopyWithImpl(this._self, this._then);

  final Goal _self;
  final $Res Function(Goal) _then;

/// Create a copy of Goal
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? name = null,Object? raceType = freezed,Object? raceDate = freezed,Object? targetTime = freezed,Object? weeklyMileageGoal = freezed,Object? planWeeks = null,Object? runsPerWeek = null,Object? longRunDay = null,Object? workoutDay = null,Object? currentVdot = freezed,Object? predictedTime = freezed,Object? isActive = null,Object? createdAt = null,Object? updatedAt = null,Object? completedAt = freezed,Object? workouts = null,Object? backyardLoopDistM = freezed,Object? targetLaps = freezed,Object? sport = null,Object? planSource = null,Object? ridesPerWeek = null,Object? swimsPerWeek = null,Object? strengthPerWeek = null,Object? taperWeeks = null,Object? peakWeeks = null,Object? buildWeeks = null,Object? restDays = null,Object? parentGoalId = freezed,Object? subGoals = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: freezed == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType?,raceDate: freezed == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime?,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,weeklyMileageGoal: freezed == weeklyMileageGoal ? _self.weeklyMileageGoal : weeklyMileageGoal // ignore: cast_nullable_to_non_nullable
as double?,planWeeks: null == planWeeks ? _self.planWeeks : planWeeks // ignore: cast_nullable_to_non_nullable
as int,runsPerWeek: null == runsPerWeek ? _self.runsPerWeek : runsPerWeek // ignore: cast_nullable_to_non_nullable
as int,longRunDay: null == longRunDay ? _self.longRunDay : longRunDay // ignore: cast_nullable_to_non_nullable
as int,workoutDay: null == workoutDay ? _self.workoutDay : workoutDay // ignore: cast_nullable_to_non_nullable
as int,currentVdot: freezed == currentVdot ? _self.currentVdot : currentVdot // ignore: cast_nullable_to_non_nullable
as double?,predictedTime: freezed == predictedTime ? _self.predictedTime : predictedTime // ignore: cast_nullable_to_non_nullable
as int?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,workouts: null == workouts ? _self.workouts : workouts // ignore: cast_nullable_to_non_nullable
as List<Workout>,backyardLoopDistM: freezed == backyardLoopDistM ? _self.backyardLoopDistM : backyardLoopDistM // ignore: cast_nullable_to_non_nullable
as double?,targetLaps: freezed == targetLaps ? _self.targetLaps : targetLaps // ignore: cast_nullable_to_non_nullable
as int?,sport: null == sport ? _self.sport : sport // ignore: cast_nullable_to_non_nullable
as String,planSource: null == planSource ? _self.planSource : planSource // ignore: cast_nullable_to_non_nullable
as String,ridesPerWeek: null == ridesPerWeek ? _self.ridesPerWeek : ridesPerWeek // ignore: cast_nullable_to_non_nullable
as int,swimsPerWeek: null == swimsPerWeek ? _self.swimsPerWeek : swimsPerWeek // ignore: cast_nullable_to_non_nullable
as int,strengthPerWeek: null == strengthPerWeek ? _self.strengthPerWeek : strengthPerWeek // ignore: cast_nullable_to_non_nullable
as int,taperWeeks: null == taperWeeks ? _self.taperWeeks : taperWeeks // ignore: cast_nullable_to_non_nullable
as int,peakWeeks: null == peakWeeks ? _self.peakWeeks : peakWeeks // ignore: cast_nullable_to_non_nullable
as int,buildWeeks: null == buildWeeks ? _self.buildWeeks : buildWeeks // ignore: cast_nullable_to_non_nullable
as int,restDays: null == restDays ? _self.restDays : restDays // ignore: cast_nullable_to_non_nullable
as List<int>,parentGoalId: freezed == parentGoalId ? _self.parentGoalId : parentGoalId // ignore: cast_nullable_to_non_nullable
as String?,subGoals: null == subGoals ? _self.subGoals : subGoals // ignore: cast_nullable_to_non_nullable
as List<SubGoal>,
  ));
}

}


/// Adds pattern-matching-related methods to [Goal].
extension GoalPatterns on Goal {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Goal value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Goal() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Goal value)  $default,){
final _that = this;
switch (_that) {
case _Goal():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Goal value)?  $default,){
final _that = this;
switch (_that) {
case _Goal() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String name,  RaceType? raceType,  DateTime? raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek,  int longRunDay,  int workoutDay,  double? currentVdot,  int? predictedTime,  bool isActive,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  List<Workout> workouts,  double? backyardLoopDistM,  int? targetLaps,  String sport,  String planSource,  int ridesPerWeek,  int swimsPerWeek,  int strengthPerWeek,  int taperWeeks,  int peakWeeks,  int buildWeeks,  List<int> restDays,  String? parentGoalId,  List<SubGoal> subGoals)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Goal() when $default != null:
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek,_that.longRunDay,_that.workoutDay,_that.currentVdot,_that.predictedTime,_that.isActive,_that.createdAt,_that.updatedAt,_that.completedAt,_that.workouts,_that.backyardLoopDistM,_that.targetLaps,_that.sport,_that.planSource,_that.ridesPerWeek,_that.swimsPerWeek,_that.strengthPerWeek,_that.taperWeeks,_that.peakWeeks,_that.buildWeeks,_that.restDays,_that.parentGoalId,_that.subGoals);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String name,  RaceType? raceType,  DateTime? raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek,  int longRunDay,  int workoutDay,  double? currentVdot,  int? predictedTime,  bool isActive,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  List<Workout> workouts,  double? backyardLoopDistM,  int? targetLaps,  String sport,  String planSource,  int ridesPerWeek,  int swimsPerWeek,  int strengthPerWeek,  int taperWeeks,  int peakWeeks,  int buildWeeks,  List<int> restDays,  String? parentGoalId,  List<SubGoal> subGoals)  $default,) {final _that = this;
switch (_that) {
case _Goal():
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek,_that.longRunDay,_that.workoutDay,_that.currentVdot,_that.predictedTime,_that.isActive,_that.createdAt,_that.updatedAt,_that.completedAt,_that.workouts,_that.backyardLoopDistM,_that.targetLaps,_that.sport,_that.planSource,_that.ridesPerWeek,_that.swimsPerWeek,_that.strengthPerWeek,_that.taperWeeks,_that.peakWeeks,_that.buildWeeks,_that.restDays,_that.parentGoalId,_that.subGoals);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String name,  RaceType? raceType,  DateTime? raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek,  int longRunDay,  int workoutDay,  double? currentVdot,  int? predictedTime,  bool isActive,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  List<Workout> workouts,  double? backyardLoopDistM,  int? targetLaps,  String sport,  String planSource,  int ridesPerWeek,  int swimsPerWeek,  int strengthPerWeek,  int taperWeeks,  int peakWeeks,  int buildWeeks,  List<int> restDays,  String? parentGoalId,  List<SubGoal> subGoals)?  $default,) {final _that = this;
switch (_that) {
case _Goal() when $default != null:
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek,_that.longRunDay,_that.workoutDay,_that.currentVdot,_that.predictedTime,_that.isActive,_that.createdAt,_that.updatedAt,_that.completedAt,_that.workouts,_that.backyardLoopDistM,_that.targetLaps,_that.sport,_that.planSource,_that.ridesPerWeek,_that.swimsPerWeek,_that.strengthPerWeek,_that.taperWeeks,_that.peakWeeks,_that.buildWeeks,_that.restDays,_that.parentGoalId,_that.subGoals);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Goal extends Goal {
  const _Goal({required this.id, this.userId = '', required this.name, this.raceType, this.raceDate, required this.targetTime, required this.weeklyMileageGoal, this.planWeeks = 12, this.runsPerWeek = 4, this.longRunDay = 0, this.workoutDay = 3, required this.currentVdot, required this.predictedTime, this.isActive = true, required this.createdAt, required this.updatedAt, required this.completedAt, final  List<Workout> workouts = const [], this.backyardLoopDistM, this.targetLaps, this.sport = 'RUN', this.planSource = 'standard', this.ridesPerWeek = 0, this.swimsPerWeek = 0, this.strengthPerWeek = 0, this.taperWeeks = 2, this.peakWeeks = 4, this.buildWeeks = 4, final  List<int> restDays = const [], this.parentGoalId, final  List<SubGoal> subGoals = const []}): _workouts = workouts,_restDays = restDays,_subGoals = subGoals,super._();
  factory _Goal.fromJson(Map<String, dynamic> json) => _$GoalFromJson(json);

@override final  String id;
@override@JsonKey() final  String userId;
@override final  String name;
@override final  RaceType? raceType;
@override final  DateTime? raceDate;
@override final  int? targetTime;
@override final  double? weeklyMileageGoal;
@override@JsonKey() final  int planWeeks;
@override@JsonKey() final  int runsPerWeek;
@override@JsonKey() final  int longRunDay;
@override@JsonKey() final  int workoutDay;
@override final  double? currentVdot;
@override final  int? predictedTime;
@override@JsonKey() final  bool isActive;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override final  DateTime? completedAt;
 final  List<Workout> _workouts;
@override@JsonKey() List<Workout> get workouts {
  if (_workouts is EqualUnmodifiableListView) return _workouts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_workouts);
}

@override final  double? backyardLoopDistM;
@override final  int? targetLaps;
@override@JsonKey() final  String sport;
@override@JsonKey() final  String planSource;
@override@JsonKey() final  int ridesPerWeek;
@override@JsonKey() final  int swimsPerWeek;
@override@JsonKey() final  int strengthPerWeek;
@override@JsonKey() final  int taperWeeks;
@override@JsonKey() final  int peakWeeks;
@override@JsonKey() final  int buildWeeks;
 final  List<int> _restDays;
@override@JsonKey() List<int> get restDays {
  if (_restDays is EqualUnmodifiableListView) return _restDays;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_restDays);
}

@override final  String? parentGoalId;
 final  List<SubGoal> _subGoals;
@override@JsonKey() List<SubGoal> get subGoals {
  if (_subGoals is EqualUnmodifiableListView) return _subGoals;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_subGoals);
}


/// Create a copy of Goal
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$GoalCopyWith<_Goal> get copyWith => __$GoalCopyWithImpl<_Goal>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$GoalToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Goal&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.weeklyMileageGoal, weeklyMileageGoal) || other.weeklyMileageGoal == weeklyMileageGoal)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek)&&(identical(other.longRunDay, longRunDay) || other.longRunDay == longRunDay)&&(identical(other.workoutDay, workoutDay) || other.workoutDay == workoutDay)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.predictedTime, predictedTime) || other.predictedTime == predictedTime)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&const DeepCollectionEquality().equals(other._workouts, _workouts)&&(identical(other.backyardLoopDistM, backyardLoopDistM) || other.backyardLoopDistM == backyardLoopDistM)&&(identical(other.targetLaps, targetLaps) || other.targetLaps == targetLaps)&&(identical(other.sport, sport) || other.sport == sport)&&(identical(other.planSource, planSource) || other.planSource == planSource)&&(identical(other.ridesPerWeek, ridesPerWeek) || other.ridesPerWeek == ridesPerWeek)&&(identical(other.swimsPerWeek, swimsPerWeek) || other.swimsPerWeek == swimsPerWeek)&&(identical(other.strengthPerWeek, strengthPerWeek) || other.strengthPerWeek == strengthPerWeek)&&(identical(other.taperWeeks, taperWeeks) || other.taperWeeks == taperWeeks)&&(identical(other.peakWeeks, peakWeeks) || other.peakWeeks == peakWeeks)&&(identical(other.buildWeeks, buildWeeks) || other.buildWeeks == buildWeeks)&&const DeepCollectionEquality().equals(other._restDays, _restDays)&&(identical(other.parentGoalId, parentGoalId) || other.parentGoalId == parentGoalId)&&const DeepCollectionEquality().equals(other._subGoals, _subGoals));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,userId,name,raceType,raceDate,targetTime,weeklyMileageGoal,planWeeks,runsPerWeek,longRunDay,workoutDay,currentVdot,predictedTime,isActive,createdAt,updatedAt,completedAt,const DeepCollectionEquality().hash(_workouts),backyardLoopDistM,targetLaps,sport,planSource,ridesPerWeek,swimsPerWeek,strengthPerWeek,taperWeeks,peakWeeks,buildWeeks,const DeepCollectionEquality().hash(_restDays),parentGoalId,const DeepCollectionEquality().hash(_subGoals)]);

@override
String toString() {
  return 'Goal(id: $id, userId: $userId, name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, weeklyMileageGoal: $weeklyMileageGoal, planWeeks: $planWeeks, runsPerWeek: $runsPerWeek, longRunDay: $longRunDay, workoutDay: $workoutDay, currentVdot: $currentVdot, predictedTime: $predictedTime, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt, workouts: $workouts, backyardLoopDistM: $backyardLoopDistM, targetLaps: $targetLaps, sport: $sport, planSource: $planSource, ridesPerWeek: $ridesPerWeek, swimsPerWeek: $swimsPerWeek, strengthPerWeek: $strengthPerWeek, taperWeeks: $taperWeeks, peakWeeks: $peakWeeks, buildWeeks: $buildWeeks, restDays: $restDays, parentGoalId: $parentGoalId, subGoals: $subGoals)';
}


}

/// @nodoc
abstract mixin class _$GoalCopyWith<$Res> implements $GoalCopyWith<$Res> {
  factory _$GoalCopyWith(_Goal value, $Res Function(_Goal) _then) = __$GoalCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String name, RaceType? raceType, DateTime? raceDate, int? targetTime, double? weeklyMileageGoal, int planWeeks, int runsPerWeek, int longRunDay, int workoutDay, double? currentVdot, int? predictedTime, bool isActive, DateTime createdAt, DateTime updatedAt, DateTime? completedAt, List<Workout> workouts, double? backyardLoopDistM, int? targetLaps, String sport, String planSource, int ridesPerWeek, int swimsPerWeek, int strengthPerWeek, int taperWeeks, int peakWeeks, int buildWeeks, List<int> restDays, String? parentGoalId, List<SubGoal> subGoals
});




}
/// @nodoc
class __$GoalCopyWithImpl<$Res>
    implements _$GoalCopyWith<$Res> {
  __$GoalCopyWithImpl(this._self, this._then);

  final _Goal _self;
  final $Res Function(_Goal) _then;

/// Create a copy of Goal
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? name = null,Object? raceType = freezed,Object? raceDate = freezed,Object? targetTime = freezed,Object? weeklyMileageGoal = freezed,Object? planWeeks = null,Object? runsPerWeek = null,Object? longRunDay = null,Object? workoutDay = null,Object? currentVdot = freezed,Object? predictedTime = freezed,Object? isActive = null,Object? createdAt = null,Object? updatedAt = null,Object? completedAt = freezed,Object? workouts = null,Object? backyardLoopDistM = freezed,Object? targetLaps = freezed,Object? sport = null,Object? planSource = null,Object? ridesPerWeek = null,Object? swimsPerWeek = null,Object? strengthPerWeek = null,Object? taperWeeks = null,Object? peakWeeks = null,Object? buildWeeks = null,Object? restDays = null,Object? parentGoalId = freezed,Object? subGoals = null,}) {
  return _then(_Goal(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: freezed == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType?,raceDate: freezed == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime?,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
as int?,weeklyMileageGoal: freezed == weeklyMileageGoal ? _self.weeklyMileageGoal : weeklyMileageGoal // ignore: cast_nullable_to_non_nullable
as double?,planWeeks: null == planWeeks ? _self.planWeeks : planWeeks // ignore: cast_nullable_to_non_nullable
as int,runsPerWeek: null == runsPerWeek ? _self.runsPerWeek : runsPerWeek // ignore: cast_nullable_to_non_nullable
as int,longRunDay: null == longRunDay ? _self.longRunDay : longRunDay // ignore: cast_nullable_to_non_nullable
as int,workoutDay: null == workoutDay ? _self.workoutDay : workoutDay // ignore: cast_nullable_to_non_nullable
as int,currentVdot: freezed == currentVdot ? _self.currentVdot : currentVdot // ignore: cast_nullable_to_non_nullable
as double?,predictedTime: freezed == predictedTime ? _self.predictedTime : predictedTime // ignore: cast_nullable_to_non_nullable
as int?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,workouts: null == workouts ? _self._workouts : workouts // ignore: cast_nullable_to_non_nullable
as List<Workout>,backyardLoopDistM: freezed == backyardLoopDistM ? _self.backyardLoopDistM : backyardLoopDistM // ignore: cast_nullable_to_non_nullable
as double?,targetLaps: freezed == targetLaps ? _self.targetLaps : targetLaps // ignore: cast_nullable_to_non_nullable
as int?,sport: null == sport ? _self.sport : sport // ignore: cast_nullable_to_non_nullable
as String,planSource: null == planSource ? _self.planSource : planSource // ignore: cast_nullable_to_non_nullable
as String,ridesPerWeek: null == ridesPerWeek ? _self.ridesPerWeek : ridesPerWeek // ignore: cast_nullable_to_non_nullable
as int,swimsPerWeek: null == swimsPerWeek ? _self.swimsPerWeek : swimsPerWeek // ignore: cast_nullable_to_non_nullable
as int,strengthPerWeek: null == strengthPerWeek ? _self.strengthPerWeek : strengthPerWeek // ignore: cast_nullable_to_non_nullable
as int,taperWeeks: null == taperWeeks ? _self.taperWeeks : taperWeeks // ignore: cast_nullable_to_non_nullable
as int,peakWeeks: null == peakWeeks ? _self.peakWeeks : peakWeeks // ignore: cast_nullable_to_non_nullable
as int,buildWeeks: null == buildWeeks ? _self.buildWeeks : buildWeeks // ignore: cast_nullable_to_non_nullable
as int,restDays: null == restDays ? _self._restDays : restDays // ignore: cast_nullable_to_non_nullable
as List<int>,parentGoalId: freezed == parentGoalId ? _self.parentGoalId : parentGoalId // ignore: cast_nullable_to_non_nullable
as String?,subGoals: null == subGoals ? _self._subGoals : subGoals // ignore: cast_nullable_to_non_nullable
as List<SubGoal>,
  ));
}


}


/// @nodoc
mixin _$DashboardResponse {

 AnalyticsStats get stats; List<Activity> get recentActivities; List<Goal> get goals; SyncStatus get syncStatus; User get user;@JsonKey(name: 'todayWorkout') Workout? get todayWorkout;
/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DashboardResponseCopyWith<DashboardResponse> get copyWith => _$DashboardResponseCopyWithImpl<DashboardResponse>(this as DashboardResponse, _$identity);

  /// Serializes this DashboardResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DashboardResponse&&(identical(other.stats, stats) || other.stats == stats)&&const DeepCollectionEquality().equals(other.recentActivities, recentActivities)&&const DeepCollectionEquality().equals(other.goals, goals)&&(identical(other.syncStatus, syncStatus) || other.syncStatus == syncStatus)&&(identical(other.user, user) || other.user == user)&&(identical(other.todayWorkout, todayWorkout) || other.todayWorkout == todayWorkout));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stats,const DeepCollectionEquality().hash(recentActivities),const DeepCollectionEquality().hash(goals),syncStatus,user,todayWorkout);

@override
String toString() {
  return 'DashboardResponse(stats: $stats, recentActivities: $recentActivities, goals: $goals, syncStatus: $syncStatus, user: $user, todayWorkout: $todayWorkout)';
}


}

/// @nodoc
abstract mixin class $DashboardResponseCopyWith<$Res>  {
  factory $DashboardResponseCopyWith(DashboardResponse value, $Res Function(DashboardResponse) _then) = _$DashboardResponseCopyWithImpl;
@useResult
$Res call({
 AnalyticsStats stats, List<Activity> recentActivities, List<Goal> goals, SyncStatus syncStatus, User user,@JsonKey(name: 'todayWorkout') Workout? todayWorkout
});


$AnalyticsStatsCopyWith<$Res> get stats;$SyncStatusCopyWith<$Res> get syncStatus;$UserCopyWith<$Res> get user;$WorkoutCopyWith<$Res>? get todayWorkout;

}
/// @nodoc
class _$DashboardResponseCopyWithImpl<$Res>
    implements $DashboardResponseCopyWith<$Res> {
  _$DashboardResponseCopyWithImpl(this._self, this._then);

  final DashboardResponse _self;
  final $Res Function(DashboardResponse) _then;

/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? stats = null,Object? recentActivities = null,Object? goals = null,Object? syncStatus = null,Object? user = null,Object? todayWorkout = freezed,}) {
  return _then(_self.copyWith(
stats: null == stats ? _self.stats : stats // ignore: cast_nullable_to_non_nullable
as AnalyticsStats,recentActivities: null == recentActivities ? _self.recentActivities : recentActivities // ignore: cast_nullable_to_non_nullable
as List<Activity>,goals: null == goals ? _self.goals : goals // ignore: cast_nullable_to_non_nullable
as List<Goal>,syncStatus: null == syncStatus ? _self.syncStatus : syncStatus // ignore: cast_nullable_to_non_nullable
as SyncStatus,user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as User,todayWorkout: freezed == todayWorkout ? _self.todayWorkout : todayWorkout // ignore: cast_nullable_to_non_nullable
as Workout?,
  ));
}
/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AnalyticsStatsCopyWith<$Res> get stats {
  
  return $AnalyticsStatsCopyWith<$Res>(_self.stats, (value) {
    return _then(_self.copyWith(stats: value));
  });
}/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncStatusCopyWith<$Res> get syncStatus {
  
  return $SyncStatusCopyWith<$Res>(_self.syncStatus, (value) {
    return _then(_self.copyWith(syncStatus: value));
  });
}/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserCopyWith<$Res> get user {
  
  return $UserCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$WorkoutCopyWith<$Res>? get todayWorkout {
    if (_self.todayWorkout == null) {
    return null;
  }

  return $WorkoutCopyWith<$Res>(_self.todayWorkout!, (value) {
    return _then(_self.copyWith(todayWorkout: value));
  });
}
}


/// Adds pattern-matching-related methods to [DashboardResponse].
extension DashboardResponsePatterns on DashboardResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DashboardResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DashboardResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DashboardResponse value)  $default,){
final _that = this;
switch (_that) {
case _DashboardResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DashboardResponse value)?  $default,){
final _that = this;
switch (_that) {
case _DashboardResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( AnalyticsStats stats,  List<Activity> recentActivities,  List<Goal> goals,  SyncStatus syncStatus,  User user, @JsonKey(name: 'todayWorkout')  Workout? todayWorkout)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DashboardResponse() when $default != null:
return $default(_that.stats,_that.recentActivities,_that.goals,_that.syncStatus,_that.user,_that.todayWorkout);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( AnalyticsStats stats,  List<Activity> recentActivities,  List<Goal> goals,  SyncStatus syncStatus,  User user, @JsonKey(name: 'todayWorkout')  Workout? todayWorkout)  $default,) {final _that = this;
switch (_that) {
case _DashboardResponse():
return $default(_that.stats,_that.recentActivities,_that.goals,_that.syncStatus,_that.user,_that.todayWorkout);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( AnalyticsStats stats,  List<Activity> recentActivities,  List<Goal> goals,  SyncStatus syncStatus,  User user, @JsonKey(name: 'todayWorkout')  Workout? todayWorkout)?  $default,) {final _that = this;
switch (_that) {
case _DashboardResponse() when $default != null:
return $default(_that.stats,_that.recentActivities,_that.goals,_that.syncStatus,_that.user,_that.todayWorkout);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DashboardResponse extends DashboardResponse {
  const _DashboardResponse({required this.stats, required final  List<Activity> recentActivities, required final  List<Goal> goals, required this.syncStatus, required this.user, @JsonKey(name: 'todayWorkout') this.todayWorkout = null}): _recentActivities = recentActivities,_goals = goals,super._();
  factory _DashboardResponse.fromJson(Map<String, dynamic> json) => _$DashboardResponseFromJson(json);

@override final  AnalyticsStats stats;
 final  List<Activity> _recentActivities;
@override List<Activity> get recentActivities {
  if (_recentActivities is EqualUnmodifiableListView) return _recentActivities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_recentActivities);
}

 final  List<Goal> _goals;
@override List<Goal> get goals {
  if (_goals is EqualUnmodifiableListView) return _goals;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_goals);
}

@override final  SyncStatus syncStatus;
@override final  User user;
@override@JsonKey(name: 'todayWorkout') final  Workout? todayWorkout;

/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DashboardResponseCopyWith<_DashboardResponse> get copyWith => __$DashboardResponseCopyWithImpl<_DashboardResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DashboardResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DashboardResponse&&(identical(other.stats, stats) || other.stats == stats)&&const DeepCollectionEquality().equals(other._recentActivities, _recentActivities)&&const DeepCollectionEquality().equals(other._goals, _goals)&&(identical(other.syncStatus, syncStatus) || other.syncStatus == syncStatus)&&(identical(other.user, user) || other.user == user)&&(identical(other.todayWorkout, todayWorkout) || other.todayWorkout == todayWorkout));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stats,const DeepCollectionEquality().hash(_recentActivities),const DeepCollectionEquality().hash(_goals),syncStatus,user,todayWorkout);

@override
String toString() {
  return 'DashboardResponse(stats: $stats, recentActivities: $recentActivities, goals: $goals, syncStatus: $syncStatus, user: $user, todayWorkout: $todayWorkout)';
}


}

/// @nodoc
abstract mixin class _$DashboardResponseCopyWith<$Res> implements $DashboardResponseCopyWith<$Res> {
  factory _$DashboardResponseCopyWith(_DashboardResponse value, $Res Function(_DashboardResponse) _then) = __$DashboardResponseCopyWithImpl;
@override @useResult
$Res call({
 AnalyticsStats stats, List<Activity> recentActivities, List<Goal> goals, SyncStatus syncStatus, User user,@JsonKey(name: 'todayWorkout') Workout? todayWorkout
});


@override $AnalyticsStatsCopyWith<$Res> get stats;@override $SyncStatusCopyWith<$Res> get syncStatus;@override $UserCopyWith<$Res> get user;@override $WorkoutCopyWith<$Res>? get todayWorkout;

}
/// @nodoc
class __$DashboardResponseCopyWithImpl<$Res>
    implements _$DashboardResponseCopyWith<$Res> {
  __$DashboardResponseCopyWithImpl(this._self, this._then);

  final _DashboardResponse _self;
  final $Res Function(_DashboardResponse) _then;

/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? stats = null,Object? recentActivities = null,Object? goals = null,Object? syncStatus = null,Object? user = null,Object? todayWorkout = freezed,}) {
  return _then(_DashboardResponse(
stats: null == stats ? _self.stats : stats // ignore: cast_nullable_to_non_nullable
as AnalyticsStats,recentActivities: null == recentActivities ? _self._recentActivities : recentActivities // ignore: cast_nullable_to_non_nullable
as List<Activity>,goals: null == goals ? _self._goals : goals // ignore: cast_nullable_to_non_nullable
as List<Goal>,syncStatus: null == syncStatus ? _self.syncStatus : syncStatus // ignore: cast_nullable_to_non_nullable
as SyncStatus,user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as User,todayWorkout: freezed == todayWorkout ? _self.todayWorkout : todayWorkout // ignore: cast_nullable_to_non_nullable
as Workout?,
  ));
}

/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AnalyticsStatsCopyWith<$Res> get stats {
  
  return $AnalyticsStatsCopyWith<$Res>(_self.stats, (value) {
    return _then(_self.copyWith(stats: value));
  });
}/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncStatusCopyWith<$Res> get syncStatus {
  
  return $SyncStatusCopyWith<$Res>(_self.syncStatus, (value) {
    return _then(_self.copyWith(syncStatus: value));
  });
}/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$UserCopyWith<$Res> get user {
  
  return $UserCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$WorkoutCopyWith<$Res>? get todayWorkout {
    if (_self.todayWorkout == null) {
    return null;
  }

  return $WorkoutCopyWith<$Res>(_self.todayWorkout!, (value) {
    return _then(_self.copyWith(todayWorkout: value));
  });
}
}

// dart format on
