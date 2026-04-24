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

 double get currentWeekMileage; double get effectiveVO2max; double get rawVO2max; double get vdotCorrectionFactor; double get marathonShape; double? get currentVdot; double get ctl; double get atl; double get tsb; double get workloadRatio; double get easyTrimp; int get hrMax;
/// Create a copy of AnalyticsStats
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AnalyticsStatsCopyWith<AnalyticsStats> get copyWith => _$AnalyticsStatsCopyWithImpl<AnalyticsStats>(this as AnalyticsStats, _$identity);

  /// Serializes this AnalyticsStats to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AnalyticsStats&&(identical(other.currentWeekMileage, currentWeekMileage) || other.currentWeekMileage == currentWeekMileage)&&(identical(other.effectiveVO2max, effectiveVO2max) || other.effectiveVO2max == effectiveVO2max)&&(identical(other.rawVO2max, rawVO2max) || other.rawVO2max == rawVO2max)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor)&&(identical(other.marathonShape, marathonShape) || other.marathonShape == marathonShape)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.easyTrimp, easyTrimp) || other.easyTrimp == easyTrimp)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,currentWeekMileage,effectiveVO2max,rawVO2max,vdotCorrectionFactor,marathonShape,currentVdot,ctl,atl,tsb,workloadRatio,easyTrimp,hrMax);

@override
String toString() {
  return 'AnalyticsStats(currentWeekMileage: $currentWeekMileage, effectiveVO2max: $effectiveVO2max, rawVO2max: $rawVO2max, vdotCorrectionFactor: $vdotCorrectionFactor, marathonShape: $marathonShape, currentVdot: $currentVdot, ctl: $ctl, atl: $atl, tsb: $tsb, workloadRatio: $workloadRatio, easyTrimp: $easyTrimp, hrMax: $hrMax)';
}


}

/// @nodoc
abstract mixin class $AnalyticsStatsCopyWith<$Res>  {
  factory $AnalyticsStatsCopyWith(AnalyticsStats value, $Res Function(AnalyticsStats) _then) = _$AnalyticsStatsCopyWithImpl;
@useResult
$Res call({
 double currentWeekMileage, double effectiveVO2max, double rawVO2max, double vdotCorrectionFactor, double marathonShape, double? currentVdot, double ctl, double atl, double tsb, double workloadRatio, double easyTrimp, int hrMax
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
@pragma('vm:prefer-inline') @override $Res call({Object? currentWeekMileage = null,Object? effectiveVO2max = null,Object? rawVO2max = null,Object? vdotCorrectionFactor = null,Object? marathonShape = null,Object? currentVdot = freezed,Object? ctl = null,Object? atl = null,Object? tsb = null,Object? workloadRatio = null,Object? easyTrimp = null,Object? hrMax = null,}) {
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
as double,hrMax: null == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double currentWeekMileage,  double effectiveVO2max,  double rawVO2max,  double vdotCorrectionFactor,  double marathonShape,  double? currentVdot,  double ctl,  double atl,  double tsb,  double workloadRatio,  double easyTrimp,  int hrMax)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AnalyticsStats() when $default != null:
return $default(_that.currentWeekMileage,_that.effectiveVO2max,_that.rawVO2max,_that.vdotCorrectionFactor,_that.marathonShape,_that.currentVdot,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.hrMax);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double currentWeekMileage,  double effectiveVO2max,  double rawVO2max,  double vdotCorrectionFactor,  double marathonShape,  double? currentVdot,  double ctl,  double atl,  double tsb,  double workloadRatio,  double easyTrimp,  int hrMax)  $default,) {final _that = this;
switch (_that) {
case _AnalyticsStats():
return $default(_that.currentWeekMileage,_that.effectiveVO2max,_that.rawVO2max,_that.vdotCorrectionFactor,_that.marathonShape,_that.currentVdot,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.hrMax);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double currentWeekMileage,  double effectiveVO2max,  double rawVO2max,  double vdotCorrectionFactor,  double marathonShape,  double? currentVdot,  double ctl,  double atl,  double tsb,  double workloadRatio,  double easyTrimp,  int hrMax)?  $default,) {final _that = this;
switch (_that) {
case _AnalyticsStats() when $default != null:
return $default(_that.currentWeekMileage,_that.effectiveVO2max,_that.rawVO2max,_that.vdotCorrectionFactor,_that.marathonShape,_that.currentVdot,_that.ctl,_that.atl,_that.tsb,_that.workloadRatio,_that.easyTrimp,_that.hrMax);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AnalyticsStats extends AnalyticsStats {
  const _AnalyticsStats({required this.currentWeekMileage, required this.effectiveVO2max, required this.rawVO2max, required this.vdotCorrectionFactor, required this.marathonShape, required this.currentVdot, required this.ctl, required this.atl, required this.tsb, required this.workloadRatio, required this.easyTrimp, required this.hrMax}): super._();
  factory _AnalyticsStats.fromJson(Map<String, dynamic> json) => _$AnalyticsStatsFromJson(json);

@override final  double currentWeekMileage;
@override final  double effectiveVO2max;
@override final  double rawVO2max;
@override final  double vdotCorrectionFactor;
@override final  double marathonShape;
@override final  double? currentVdot;
@override final  double ctl;
@override final  double atl;
@override final  double tsb;
@override final  double workloadRatio;
@override final  double easyTrimp;
@override final  int hrMax;

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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AnalyticsStats&&(identical(other.currentWeekMileage, currentWeekMileage) || other.currentWeekMileage == currentWeekMileage)&&(identical(other.effectiveVO2max, effectiveVO2max) || other.effectiveVO2max == effectiveVO2max)&&(identical(other.rawVO2max, rawVO2max) || other.rawVO2max == rawVO2max)&&(identical(other.vdotCorrectionFactor, vdotCorrectionFactor) || other.vdotCorrectionFactor == vdotCorrectionFactor)&&(identical(other.marathonShape, marathonShape) || other.marathonShape == marathonShape)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.easyTrimp, easyTrimp) || other.easyTrimp == easyTrimp)&&(identical(other.hrMax, hrMax) || other.hrMax == hrMax));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,currentWeekMileage,effectiveVO2max,rawVO2max,vdotCorrectionFactor,marathonShape,currentVdot,ctl,atl,tsb,workloadRatio,easyTrimp,hrMax);

@override
String toString() {
  return 'AnalyticsStats(currentWeekMileage: $currentWeekMileage, effectiveVO2max: $effectiveVO2max, rawVO2max: $rawVO2max, vdotCorrectionFactor: $vdotCorrectionFactor, marathonShape: $marathonShape, currentVdot: $currentVdot, ctl: $ctl, atl: $atl, tsb: $tsb, workloadRatio: $workloadRatio, easyTrimp: $easyTrimp, hrMax: $hrMax)';
}


}

/// @nodoc
abstract mixin class _$AnalyticsStatsCopyWith<$Res> implements $AnalyticsStatsCopyWith<$Res> {
  factory _$AnalyticsStatsCopyWith(_AnalyticsStats value, $Res Function(_AnalyticsStats) _then) = __$AnalyticsStatsCopyWithImpl;
@override @useResult
$Res call({
 double currentWeekMileage, double effectiveVO2max, double rawVO2max, double vdotCorrectionFactor, double marathonShape, double? currentVdot, double ctl, double atl, double tsb, double workloadRatio, double easyTrimp, int hrMax
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
@override @pragma('vm:prefer-inline') $Res call({Object? currentWeekMileage = null,Object? effectiveVO2max = null,Object? rawVO2max = null,Object? vdotCorrectionFactor = null,Object? marathonShape = null,Object? currentVdot = freezed,Object? ctl = null,Object? atl = null,Object? tsb = null,Object? workloadRatio = null,Object? easyTrimp = null,Object? hrMax = null,}) {
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
as double,hrMax: null == hrMax ? _self.hrMax : hrMax // ignore: cast_nullable_to_non_nullable
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

 String get id; String get stravaId; ActivityType get type; String get name; DateTime get startDate; double get distance; int get movingTime; double? get averageSpeed; double? get averageHr; int? get maxHr; double? get averageCadence; bool get hasHeartrate; double get totalElevation; double? get trimp; double? get runningTss; double? get estimatedVdot; String? get trainingType;
/// Create a copy of Activity
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivityCopyWith<Activity> get copyWith => _$ActivityCopyWithImpl<Activity>(this as Activity, _$identity);

  /// Serializes this Activity to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Activity&&(identical(other.id, id) || other.id == id)&&(identical(other.stravaId, stravaId) || other.stravaId == stravaId)&&(identical(other.type, type) || other.type == type)&&(identical(other.name, name) || other.name == name)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.movingTime, movingTime) || other.movingTime == movingTime)&&(identical(other.averageSpeed, averageSpeed) || other.averageSpeed == averageSpeed)&&(identical(other.averageHr, averageHr) || other.averageHr == averageHr)&&(identical(other.maxHr, maxHr) || other.maxHr == maxHr)&&(identical(other.averageCadence, averageCadence) || other.averageCadence == averageCadence)&&(identical(other.hasHeartrate, hasHeartrate) || other.hasHeartrate == hasHeartrate)&&(identical(other.totalElevation, totalElevation) || other.totalElevation == totalElevation)&&(identical(other.trimp, trimp) || other.trimp == trimp)&&(identical(other.runningTss, runningTss) || other.runningTss == runningTss)&&(identical(other.estimatedVdot, estimatedVdot) || other.estimatedVdot == estimatedVdot)&&(identical(other.trainingType, trainingType) || other.trainingType == trainingType));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,stravaId,type,name,startDate,distance,movingTime,averageSpeed,averageHr,maxHr,averageCadence,hasHeartrate,totalElevation,trimp,runningTss,estimatedVdot,trainingType);

@override
String toString() {
  return 'Activity(id: $id, stravaId: $stravaId, type: $type, name: $name, startDate: $startDate, distance: $distance, movingTime: $movingTime, averageSpeed: $averageSpeed, averageHr: $averageHr, maxHr: $maxHr, averageCadence: $averageCadence, hasHeartrate: $hasHeartrate, totalElevation: $totalElevation, trimp: $trimp, runningTss: $runningTss, estimatedVdot: $estimatedVdot, trainingType: $trainingType)';
}


}

/// @nodoc
abstract mixin class $ActivityCopyWith<$Res>  {
  factory $ActivityCopyWith(Activity value, $Res Function(Activity) _then) = _$ActivityCopyWithImpl;
@useResult
$Res call({
 String id, String stravaId, ActivityType type, String name, DateTime startDate, double distance, int movingTime, double? averageSpeed, double? averageHr, int? maxHr, double? averageCadence, bool hasHeartrate, double totalElevation, double? trimp, double? runningTss, double? estimatedVdot, String? trainingType
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
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? stravaId = null,Object? type = null,Object? name = null,Object? startDate = null,Object? distance = null,Object? movingTime = null,Object? averageSpeed = freezed,Object? averageHr = freezed,Object? maxHr = freezed,Object? averageCadence = freezed,Object? hasHeartrate = null,Object? totalElevation = null,Object? trimp = freezed,Object? runningTss = freezed,Object? estimatedVdot = freezed,Object? trainingType = freezed,}) {
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
as String?,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String stravaId,  ActivityType type,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed,  double? averageHr,  int? maxHr,  double? averageCadence,  bool hasHeartrate,  double totalElevation,  double? trimp,  double? runningTss,  double? estimatedVdot,  String? trainingType)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Activity() when $default != null:
return $default(_that.id,_that.stravaId,_that.type,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed,_that.averageHr,_that.maxHr,_that.averageCadence,_that.hasHeartrate,_that.totalElevation,_that.trimp,_that.runningTss,_that.estimatedVdot,_that.trainingType);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String stravaId,  ActivityType type,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed,  double? averageHr,  int? maxHr,  double? averageCadence,  bool hasHeartrate,  double totalElevation,  double? trimp,  double? runningTss,  double? estimatedVdot,  String? trainingType)  $default,) {final _that = this;
switch (_that) {
case _Activity():
return $default(_that.id,_that.stravaId,_that.type,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed,_that.averageHr,_that.maxHr,_that.averageCadence,_that.hasHeartrate,_that.totalElevation,_that.trimp,_that.runningTss,_that.estimatedVdot,_that.trainingType);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String stravaId,  ActivityType type,  String name,  DateTime startDate,  double distance,  int movingTime,  double? averageSpeed,  double? averageHr,  int? maxHr,  double? averageCadence,  bool hasHeartrate,  double totalElevation,  double? trimp,  double? runningTss,  double? estimatedVdot,  String? trainingType)?  $default,) {final _that = this;
switch (_that) {
case _Activity() when $default != null:
return $default(_that.id,_that.stravaId,_that.type,_that.name,_that.startDate,_that.distance,_that.movingTime,_that.averageSpeed,_that.averageHr,_that.maxHr,_that.averageCadence,_that.hasHeartrate,_that.totalElevation,_that.trimp,_that.runningTss,_that.estimatedVdot,_that.trainingType);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Activity extends Activity {
  const _Activity({required this.id, required this.stravaId, required this.type, required this.name, required this.startDate, required this.distance, required this.movingTime, required this.averageSpeed, required this.averageHr, required this.maxHr, required this.averageCadence, required this.hasHeartrate, required this.totalElevation, required this.trimp, required this.runningTss, required this.estimatedVdot, required this.trainingType}): super._();
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Activity&&(identical(other.id, id) || other.id == id)&&(identical(other.stravaId, stravaId) || other.stravaId == stravaId)&&(identical(other.type, type) || other.type == type)&&(identical(other.name, name) || other.name == name)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.distance, distance) || other.distance == distance)&&(identical(other.movingTime, movingTime) || other.movingTime == movingTime)&&(identical(other.averageSpeed, averageSpeed) || other.averageSpeed == averageSpeed)&&(identical(other.averageHr, averageHr) || other.averageHr == averageHr)&&(identical(other.maxHr, maxHr) || other.maxHr == maxHr)&&(identical(other.averageCadence, averageCadence) || other.averageCadence == averageCadence)&&(identical(other.hasHeartrate, hasHeartrate) || other.hasHeartrate == hasHeartrate)&&(identical(other.totalElevation, totalElevation) || other.totalElevation == totalElevation)&&(identical(other.trimp, trimp) || other.trimp == trimp)&&(identical(other.runningTss, runningTss) || other.runningTss == runningTss)&&(identical(other.estimatedVdot, estimatedVdot) || other.estimatedVdot == estimatedVdot)&&(identical(other.trainingType, trainingType) || other.trainingType == trainingType));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,stravaId,type,name,startDate,distance,movingTime,averageSpeed,averageHr,maxHr,averageCadence,hasHeartrate,totalElevation,trimp,runningTss,estimatedVdot,trainingType);

@override
String toString() {
  return 'Activity(id: $id, stravaId: $stravaId, type: $type, name: $name, startDate: $startDate, distance: $distance, movingTime: $movingTime, averageSpeed: $averageSpeed, averageHr: $averageHr, maxHr: $maxHr, averageCadence: $averageCadence, hasHeartrate: $hasHeartrate, totalElevation: $totalElevation, trimp: $trimp, runningTss: $runningTss, estimatedVdot: $estimatedVdot, trainingType: $trainingType)';
}


}

/// @nodoc
abstract mixin class _$ActivityCopyWith<$Res> implements $ActivityCopyWith<$Res> {
  factory _$ActivityCopyWith(_Activity value, $Res Function(_Activity) _then) = __$ActivityCopyWithImpl;
@override @useResult
$Res call({
 String id, String stravaId, ActivityType type, String name, DateTime startDate, double distance, int movingTime, double? averageSpeed, double? averageHr, int? maxHr, double? averageCadence, bool hasHeartrate, double totalElevation, double? trimp, double? runningTss, double? estimatedVdot, String? trainingType
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
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? stravaId = null,Object? type = null,Object? name = null,Object? startDate = null,Object? distance = null,Object? movingTime = null,Object? averageSpeed = freezed,Object? averageHr = freezed,Object? maxHr = freezed,Object? averageCadence = freezed,Object? hasHeartrate = null,Object? totalElevation = null,Object? trimp = freezed,Object? runningTss = freezed,Object? estimatedVdot = freezed,Object? trainingType = freezed,}) {
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
as String?,
  ));
}


}


/// @nodoc
mixin _$Workout {

 String get id; String get goalId; DateTime get scheduledDate;@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) WorkoutType get workoutType; String get description; double get targetDistance; double get targetPace; int get targetDuration; bool get isCompleted; DateTime? get completedAt; String? get activityId;
/// Create a copy of Workout
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WorkoutCopyWith<Workout> get copyWith => _$WorkoutCopyWithImpl<Workout>(this as Workout, _$identity);

  /// Serializes this Workout to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Workout&&(identical(other.id, id) || other.id == id)&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.scheduledDate, scheduledDate) || other.scheduledDate == scheduledDate)&&(identical(other.workoutType, workoutType) || other.workoutType == workoutType)&&(identical(other.description, description) || other.description == description)&&(identical(other.targetDistance, targetDistance) || other.targetDistance == targetDistance)&&(identical(other.targetPace, targetPace) || other.targetPace == targetPace)&&(identical(other.targetDuration, targetDuration) || other.targetDuration == targetDuration)&&(identical(other.isCompleted, isCompleted) || other.isCompleted == isCompleted)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.activityId, activityId) || other.activityId == activityId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,goalId,scheduledDate,workoutType,description,targetDistance,targetPace,targetDuration,isCompleted,completedAt,activityId);

@override
String toString() {
  return 'Workout(id: $id, goalId: $goalId, scheduledDate: $scheduledDate, workoutType: $workoutType, description: $description, targetDistance: $targetDistance, targetPace: $targetPace, targetDuration: $targetDuration, isCompleted: $isCompleted, completedAt: $completedAt, activityId: $activityId)';
}


}

/// @nodoc
abstract mixin class $WorkoutCopyWith<$Res>  {
  factory $WorkoutCopyWith(Workout value, $Res Function(Workout) _then) = _$WorkoutCopyWithImpl;
@useResult
$Res call({
 String id, String goalId, DateTime scheduledDate,@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) WorkoutType workoutType, String description, double targetDistance, double targetPace, int targetDuration, bool isCompleted, DateTime? completedAt, String? activityId
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
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? goalId = null,Object? scheduledDate = null,Object? workoutType = null,Object? description = null,Object? targetDistance = null,Object? targetPace = null,Object? targetDuration = null,Object? isCompleted = null,Object? completedAt = freezed,Object? activityId = freezed,}) {
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
as String?,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String goalId,  DateTime scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)  WorkoutType workoutType,  String description,  double targetDistance,  double targetPace,  int targetDuration,  bool isCompleted,  DateTime? completedAt,  String? activityId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Workout() when $default != null:
return $default(_that.id,_that.goalId,_that.scheduledDate,_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted,_that.completedAt,_that.activityId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String goalId,  DateTime scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)  WorkoutType workoutType,  String description,  double targetDistance,  double targetPace,  int targetDuration,  bool isCompleted,  DateTime? completedAt,  String? activityId)  $default,) {final _that = this;
switch (_that) {
case _Workout():
return $default(_that.id,_that.goalId,_that.scheduledDate,_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted,_that.completedAt,_that.activityId);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String goalId,  DateTime scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson)  WorkoutType workoutType,  String description,  double targetDistance,  double targetPace,  int targetDuration,  bool isCompleted,  DateTime? completedAt,  String? activityId)?  $default,) {final _that = this;
switch (_that) {
case _Workout() when $default != null:
return $default(_that.id,_that.goalId,_that.scheduledDate,_that.workoutType,_that.description,_that.targetDistance,_that.targetPace,_that.targetDuration,_that.isCompleted,_that.completedAt,_that.activityId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Workout extends Workout {
  const _Workout({required this.id, required this.goalId, required this.scheduledDate, @JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) required this.workoutType, required this.description, required this.targetDistance, required this.targetPace, required this.targetDuration, required this.isCompleted, required this.completedAt, required this.activityId}): super._();
  factory _Workout.fromJson(Map<String, dynamic> json) => _$WorkoutFromJson(json);

@override final  String id;
@override final  String goalId;
@override final  DateTime scheduledDate;
@override@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) final  WorkoutType workoutType;
@override final  String description;
@override final  double targetDistance;
@override final  double targetPace;
@override final  int targetDuration;
@override final  bool isCompleted;
@override final  DateTime? completedAt;
@override final  String? activityId;

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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Workout&&(identical(other.id, id) || other.id == id)&&(identical(other.goalId, goalId) || other.goalId == goalId)&&(identical(other.scheduledDate, scheduledDate) || other.scheduledDate == scheduledDate)&&(identical(other.workoutType, workoutType) || other.workoutType == workoutType)&&(identical(other.description, description) || other.description == description)&&(identical(other.targetDistance, targetDistance) || other.targetDistance == targetDistance)&&(identical(other.targetPace, targetPace) || other.targetPace == targetPace)&&(identical(other.targetDuration, targetDuration) || other.targetDuration == targetDuration)&&(identical(other.isCompleted, isCompleted) || other.isCompleted == isCompleted)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&(identical(other.activityId, activityId) || other.activityId == activityId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,goalId,scheduledDate,workoutType,description,targetDistance,targetPace,targetDuration,isCompleted,completedAt,activityId);

@override
String toString() {
  return 'Workout(id: $id, goalId: $goalId, scheduledDate: $scheduledDate, workoutType: $workoutType, description: $description, targetDistance: $targetDistance, targetPace: $targetPace, targetDuration: $targetDuration, isCompleted: $isCompleted, completedAt: $completedAt, activityId: $activityId)';
}


}

/// @nodoc
abstract mixin class _$WorkoutCopyWith<$Res> implements $WorkoutCopyWith<$Res> {
  factory _$WorkoutCopyWith(_Workout value, $Res Function(_Workout) _then) = __$WorkoutCopyWithImpl;
@override @useResult
$Res call({
 String id, String goalId, DateTime scheduledDate,@JsonKey(fromJson: workoutTypeFromJson, toJson: workoutTypeToJson) WorkoutType workoutType, String description, double targetDistance, double targetPace, int targetDuration, bool isCompleted, DateTime? completedAt, String? activityId
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
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? goalId = null,Object? scheduledDate = null,Object? workoutType = null,Object? description = null,Object? targetDistance = null,Object? targetPace = null,Object? targetDuration = null,Object? isCompleted = null,Object? completedAt = freezed,Object? activityId = freezed,}) {
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
as String?,
  ));
}


}


/// @nodoc
mixin _$Goal {

 String get id; String get userId; String get name; RaceType get raceType; DateTime get raceDate; int? get targetTime; double? get weeklyMileageGoal; int get planWeeks; int get runsPerWeek; int get longRunDay; int get workoutDay; double? get currentVdot; int? get predictedTime; bool get isActive; DateTime get createdAt; DateTime get updatedAt; DateTime? get completedAt; List<Workout> get workouts;
/// Create a copy of Goal
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$GoalCopyWith<Goal> get copyWith => _$GoalCopyWithImpl<Goal>(this as Goal, _$identity);

  /// Serializes this Goal to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Goal&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.weeklyMileageGoal, weeklyMileageGoal) || other.weeklyMileageGoal == weeklyMileageGoal)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek)&&(identical(other.longRunDay, longRunDay) || other.longRunDay == longRunDay)&&(identical(other.workoutDay, workoutDay) || other.workoutDay == workoutDay)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.predictedTime, predictedTime) || other.predictedTime == predictedTime)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&const DeepCollectionEquality().equals(other.workouts, workouts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,name,raceType,raceDate,targetTime,weeklyMileageGoal,planWeeks,runsPerWeek,longRunDay,workoutDay,currentVdot,predictedTime,isActive,createdAt,updatedAt,completedAt,const DeepCollectionEquality().hash(workouts));

@override
String toString() {
  return 'Goal(id: $id, userId: $userId, name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, weeklyMileageGoal: $weeklyMileageGoal, planWeeks: $planWeeks, runsPerWeek: $runsPerWeek, longRunDay: $longRunDay, workoutDay: $workoutDay, currentVdot: $currentVdot, predictedTime: $predictedTime, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt, workouts: $workouts)';
}


}

/// @nodoc
abstract mixin class $GoalCopyWith<$Res>  {
  factory $GoalCopyWith(Goal value, $Res Function(Goal) _then) = _$GoalCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String name, RaceType raceType, DateTime raceDate, int? targetTime, double? weeklyMileageGoal, int planWeeks, int runsPerWeek, int longRunDay, int workoutDay, double? currentVdot, int? predictedTime, bool isActive, DateTime createdAt, DateTime updatedAt, DateTime? completedAt, List<Workout> workouts
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
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? name = null,Object? raceType = null,Object? raceDate = null,Object? targetTime = freezed,Object? weeklyMileageGoal = freezed,Object? planWeeks = null,Object? runsPerWeek = null,Object? longRunDay = null,Object? workoutDay = null,Object? currentVdot = freezed,Object? predictedTime = freezed,Object? isActive = null,Object? createdAt = null,Object? updatedAt = null,Object? completedAt = freezed,Object? workouts = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType,raceDate: null == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
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
as List<Workout>,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String name,  RaceType raceType,  DateTime raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek,  int longRunDay,  int workoutDay,  double? currentVdot,  int? predictedTime,  bool isActive,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  List<Workout> workouts)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Goal() when $default != null:
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek,_that.longRunDay,_that.workoutDay,_that.currentVdot,_that.predictedTime,_that.isActive,_that.createdAt,_that.updatedAt,_that.completedAt,_that.workouts);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String name,  RaceType raceType,  DateTime raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek,  int longRunDay,  int workoutDay,  double? currentVdot,  int? predictedTime,  bool isActive,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  List<Workout> workouts)  $default,) {final _that = this;
switch (_that) {
case _Goal():
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek,_that.longRunDay,_that.workoutDay,_that.currentVdot,_that.predictedTime,_that.isActive,_that.createdAt,_that.updatedAt,_that.completedAt,_that.workouts);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String name,  RaceType raceType,  DateTime raceDate,  int? targetTime,  double? weeklyMileageGoal,  int planWeeks,  int runsPerWeek,  int longRunDay,  int workoutDay,  double? currentVdot,  int? predictedTime,  bool isActive,  DateTime createdAt,  DateTime updatedAt,  DateTime? completedAt,  List<Workout> workouts)?  $default,) {final _that = this;
switch (_that) {
case _Goal() when $default != null:
return $default(_that.id,_that.userId,_that.name,_that.raceType,_that.raceDate,_that.targetTime,_that.weeklyMileageGoal,_that.planWeeks,_that.runsPerWeek,_that.longRunDay,_that.workoutDay,_that.currentVdot,_that.predictedTime,_that.isActive,_that.createdAt,_that.updatedAt,_that.completedAt,_that.workouts);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Goal extends Goal {
  const _Goal({required this.id, required this.userId, required this.name, required this.raceType, required this.raceDate, required this.targetTime, required this.weeklyMileageGoal, required this.planWeeks, required this.runsPerWeek, required this.longRunDay, required this.workoutDay, required this.currentVdot, required this.predictedTime, required this.isActive, required this.createdAt, required this.updatedAt, required this.completedAt, required final  List<Workout> workouts}): _workouts = workouts,super._();
  factory _Goal.fromJson(Map<String, dynamic> json) => _$GoalFromJson(json);

@override final  String id;
@override final  String userId;
@override final  String name;
@override final  RaceType raceType;
@override final  DateTime raceDate;
@override final  int? targetTime;
@override final  double? weeklyMileageGoal;
@override final  int planWeeks;
@override final  int runsPerWeek;
@override final  int longRunDay;
@override final  int workoutDay;
@override final  double? currentVdot;
@override final  int? predictedTime;
@override final  bool isActive;
@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override final  DateTime? completedAt;
 final  List<Workout> _workouts;
@override List<Workout> get workouts {
  if (_workouts is EqualUnmodifiableListView) return _workouts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_workouts);
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Goal&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.name, name) || other.name == name)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.raceDate, raceDate) || other.raceDate == raceDate)&&(identical(other.targetTime, targetTime) || other.targetTime == targetTime)&&(identical(other.weeklyMileageGoal, weeklyMileageGoal) || other.weeklyMileageGoal == weeklyMileageGoal)&&(identical(other.planWeeks, planWeeks) || other.planWeeks == planWeeks)&&(identical(other.runsPerWeek, runsPerWeek) || other.runsPerWeek == runsPerWeek)&&(identical(other.longRunDay, longRunDay) || other.longRunDay == longRunDay)&&(identical(other.workoutDay, workoutDay) || other.workoutDay == workoutDay)&&(identical(other.currentVdot, currentVdot) || other.currentVdot == currentVdot)&&(identical(other.predictedTime, predictedTime) || other.predictedTime == predictedTime)&&(identical(other.isActive, isActive) || other.isActive == isActive)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt)&&const DeepCollectionEquality().equals(other._workouts, _workouts));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,name,raceType,raceDate,targetTime,weeklyMileageGoal,planWeeks,runsPerWeek,longRunDay,workoutDay,currentVdot,predictedTime,isActive,createdAt,updatedAt,completedAt,const DeepCollectionEquality().hash(_workouts));

@override
String toString() {
  return 'Goal(id: $id, userId: $userId, name: $name, raceType: $raceType, raceDate: $raceDate, targetTime: $targetTime, weeklyMileageGoal: $weeklyMileageGoal, planWeeks: $planWeeks, runsPerWeek: $runsPerWeek, longRunDay: $longRunDay, workoutDay: $workoutDay, currentVdot: $currentVdot, predictedTime: $predictedTime, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt, completedAt: $completedAt, workouts: $workouts)';
}


}

/// @nodoc
abstract mixin class _$GoalCopyWith<$Res> implements $GoalCopyWith<$Res> {
  factory _$GoalCopyWith(_Goal value, $Res Function(_Goal) _then) = __$GoalCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String name, RaceType raceType, DateTime raceDate, int? targetTime, double? weeklyMileageGoal, int planWeeks, int runsPerWeek, int longRunDay, int workoutDay, double? currentVdot, int? predictedTime, bool isActive, DateTime createdAt, DateTime updatedAt, DateTime? completedAt, List<Workout> workouts
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
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? name = null,Object? raceType = null,Object? raceDate = null,Object? targetTime = freezed,Object? weeklyMileageGoal = freezed,Object? planWeeks = null,Object? runsPerWeek = null,Object? longRunDay = null,Object? workoutDay = null,Object? currentVdot = freezed,Object? predictedTime = freezed,Object? isActive = null,Object? createdAt = null,Object? updatedAt = null,Object? completedAt = freezed,Object? workouts = null,}) {
  return _then(_Goal(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as RaceType,raceDate: null == raceDate ? _self.raceDate : raceDate // ignore: cast_nullable_to_non_nullable
as DateTime,targetTime: freezed == targetTime ? _self.targetTime : targetTime // ignore: cast_nullable_to_non_nullable
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
as List<Workout>,
  ));
}


}


/// @nodoc
mixin _$DashboardResponse {

 AnalyticsStats get stats; List<Activity> get recentActivities; List<Goal> get goals; SyncStatus get syncStatus; User get user;
/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DashboardResponseCopyWith<DashboardResponse> get copyWith => _$DashboardResponseCopyWithImpl<DashboardResponse>(this as DashboardResponse, _$identity);

  /// Serializes this DashboardResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DashboardResponse&&(identical(other.stats, stats) || other.stats == stats)&&const DeepCollectionEquality().equals(other.recentActivities, recentActivities)&&const DeepCollectionEquality().equals(other.goals, goals)&&(identical(other.syncStatus, syncStatus) || other.syncStatus == syncStatus)&&(identical(other.user, user) || other.user == user));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stats,const DeepCollectionEquality().hash(recentActivities),const DeepCollectionEquality().hash(goals),syncStatus,user);

@override
String toString() {
  return 'DashboardResponse(stats: $stats, recentActivities: $recentActivities, goals: $goals, syncStatus: $syncStatus, user: $user)';
}


}

/// @nodoc
abstract mixin class $DashboardResponseCopyWith<$Res>  {
  factory $DashboardResponseCopyWith(DashboardResponse value, $Res Function(DashboardResponse) _then) = _$DashboardResponseCopyWithImpl;
@useResult
$Res call({
 AnalyticsStats stats, List<Activity> recentActivities, List<Goal> goals, SyncStatus syncStatus, User user
});


$AnalyticsStatsCopyWith<$Res> get stats;$SyncStatusCopyWith<$Res> get syncStatus;$UserCopyWith<$Res> get user;

}
/// @nodoc
class _$DashboardResponseCopyWithImpl<$Res>
    implements $DashboardResponseCopyWith<$Res> {
  _$DashboardResponseCopyWithImpl(this._self, this._then);

  final DashboardResponse _self;
  final $Res Function(DashboardResponse) _then;

/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? stats = null,Object? recentActivities = null,Object? goals = null,Object? syncStatus = null,Object? user = null,}) {
  return _then(_self.copyWith(
stats: null == stats ? _self.stats : stats // ignore: cast_nullable_to_non_nullable
as AnalyticsStats,recentActivities: null == recentActivities ? _self.recentActivities : recentActivities // ignore: cast_nullable_to_non_nullable
as List<Activity>,goals: null == goals ? _self.goals : goals // ignore: cast_nullable_to_non_nullable
as List<Goal>,syncStatus: null == syncStatus ? _self.syncStatus : syncStatus // ignore: cast_nullable_to_non_nullable
as SyncStatus,user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as User,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( AnalyticsStats stats,  List<Activity> recentActivities,  List<Goal> goals,  SyncStatus syncStatus,  User user)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DashboardResponse() when $default != null:
return $default(_that.stats,_that.recentActivities,_that.goals,_that.syncStatus,_that.user);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( AnalyticsStats stats,  List<Activity> recentActivities,  List<Goal> goals,  SyncStatus syncStatus,  User user)  $default,) {final _that = this;
switch (_that) {
case _DashboardResponse():
return $default(_that.stats,_that.recentActivities,_that.goals,_that.syncStatus,_that.user);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( AnalyticsStats stats,  List<Activity> recentActivities,  List<Goal> goals,  SyncStatus syncStatus,  User user)?  $default,) {final _that = this;
switch (_that) {
case _DashboardResponse() when $default != null:
return $default(_that.stats,_that.recentActivities,_that.goals,_that.syncStatus,_that.user);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DashboardResponse extends DashboardResponse {
  const _DashboardResponse({required this.stats, required final  List<Activity> recentActivities, required final  List<Goal> goals, required this.syncStatus, required this.user}): _recentActivities = recentActivities,_goals = goals,super._();
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DashboardResponse&&(identical(other.stats, stats) || other.stats == stats)&&const DeepCollectionEquality().equals(other._recentActivities, _recentActivities)&&const DeepCollectionEquality().equals(other._goals, _goals)&&(identical(other.syncStatus, syncStatus) || other.syncStatus == syncStatus)&&(identical(other.user, user) || other.user == user));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stats,const DeepCollectionEquality().hash(_recentActivities),const DeepCollectionEquality().hash(_goals),syncStatus,user);

@override
String toString() {
  return 'DashboardResponse(stats: $stats, recentActivities: $recentActivities, goals: $goals, syncStatus: $syncStatus, user: $user)';
}


}

/// @nodoc
abstract mixin class _$DashboardResponseCopyWith<$Res> implements $DashboardResponseCopyWith<$Res> {
  factory _$DashboardResponseCopyWith(_DashboardResponse value, $Res Function(_DashboardResponse) _then) = __$DashboardResponseCopyWithImpl;
@override @useResult
$Res call({
 AnalyticsStats stats, List<Activity> recentActivities, List<Goal> goals, SyncStatus syncStatus, User user
});


@override $AnalyticsStatsCopyWith<$Res> get stats;@override $SyncStatusCopyWith<$Res> get syncStatus;@override $UserCopyWith<$Res> get user;

}
/// @nodoc
class __$DashboardResponseCopyWithImpl<$Res>
    implements _$DashboardResponseCopyWith<$Res> {
  __$DashboardResponseCopyWithImpl(this._self, this._then);

  final _DashboardResponse _self;
  final $Res Function(_DashboardResponse) _then;

/// Create a copy of DashboardResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? stats = null,Object? recentActivities = null,Object? goals = null,Object? syncStatus = null,Object? user = null,}) {
  return _then(_DashboardResponse(
stats: null == stats ? _self.stats : stats // ignore: cast_nullable_to_non_nullable
as AnalyticsStats,recentActivities: null == recentActivities ? _self._recentActivities : recentActivities // ignore: cast_nullable_to_non_nullable
as List<Activity>,goals: null == goals ? _self._goals : goals // ignore: cast_nullable_to_non_nullable
as List<Goal>,syncStatus: null == syncStatus ? _self.syncStatus : syncStatus // ignore: cast_nullable_to_non_nullable
as SyncStatus,user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as User,
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
}
}

// dart format on
