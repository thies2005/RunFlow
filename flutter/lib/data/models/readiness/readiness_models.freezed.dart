// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'readiness_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RhrMetricsModel implements DiagnosticableTreeMixin {

 double? get todayRhr; double? get baselineRhr; double? get rhrDelta; int? get trendDirection;
/// Create a copy of RhrMetricsModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RhrMetricsModelCopyWith<RhrMetricsModel> get copyWith => _$RhrMetricsModelCopyWithImpl<RhrMetricsModel>(this as RhrMetricsModel, _$identity);

  /// Serializes this RhrMetricsModel to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'RhrMetricsModel'))
    ..add(DiagnosticsProperty('todayRhr', todayRhr))..add(DiagnosticsProperty('baselineRhr', baselineRhr))..add(DiagnosticsProperty('rhrDelta', rhrDelta))..add(DiagnosticsProperty('trendDirection', trendDirection));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RhrMetricsModel&&(identical(other.todayRhr, todayRhr) || other.todayRhr == todayRhr)&&(identical(other.baselineRhr, baselineRhr) || other.baselineRhr == baselineRhr)&&(identical(other.rhrDelta, rhrDelta) || other.rhrDelta == rhrDelta)&&(identical(other.trendDirection, trendDirection) || other.trendDirection == trendDirection));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,todayRhr,baselineRhr,rhrDelta,trendDirection);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'RhrMetricsModel(todayRhr: $todayRhr, baselineRhr: $baselineRhr, rhrDelta: $rhrDelta, trendDirection: $trendDirection)';
}


}

/// @nodoc
abstract mixin class $RhrMetricsModelCopyWith<$Res>  {
  factory $RhrMetricsModelCopyWith(RhrMetricsModel value, $Res Function(RhrMetricsModel) _then) = _$RhrMetricsModelCopyWithImpl;
@useResult
$Res call({
 double? todayRhr, double? baselineRhr, double? rhrDelta, int? trendDirection
});




}
/// @nodoc
class _$RhrMetricsModelCopyWithImpl<$Res>
    implements $RhrMetricsModelCopyWith<$Res> {
  _$RhrMetricsModelCopyWithImpl(this._self, this._then);

  final RhrMetricsModel _self;
  final $Res Function(RhrMetricsModel) _then;

/// Create a copy of RhrMetricsModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? todayRhr = freezed,Object? baselineRhr = freezed,Object? rhrDelta = freezed,Object? trendDirection = freezed,}) {
  return _then(_self.copyWith(
todayRhr: freezed == todayRhr ? _self.todayRhr : todayRhr // ignore: cast_nullable_to_non_nullable
as double?,baselineRhr: freezed == baselineRhr ? _self.baselineRhr : baselineRhr // ignore: cast_nullable_to_non_nullable
as double?,rhrDelta: freezed == rhrDelta ? _self.rhrDelta : rhrDelta // ignore: cast_nullable_to_non_nullable
as double?,trendDirection: freezed == trendDirection ? _self.trendDirection : trendDirection // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [RhrMetricsModel].
extension RhrMetricsModelPatterns on RhrMetricsModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RhrMetricsModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RhrMetricsModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RhrMetricsModel value)  $default,){
final _that = this;
switch (_that) {
case _RhrMetricsModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RhrMetricsModel value)?  $default,){
final _that = this;
switch (_that) {
case _RhrMetricsModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double? todayRhr,  double? baselineRhr,  double? rhrDelta,  int? trendDirection)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RhrMetricsModel() when $default != null:
return $default(_that.todayRhr,_that.baselineRhr,_that.rhrDelta,_that.trendDirection);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double? todayRhr,  double? baselineRhr,  double? rhrDelta,  int? trendDirection)  $default,) {final _that = this;
switch (_that) {
case _RhrMetricsModel():
return $default(_that.todayRhr,_that.baselineRhr,_that.rhrDelta,_that.trendDirection);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double? todayRhr,  double? baselineRhr,  double? rhrDelta,  int? trendDirection)?  $default,) {final _that = this;
switch (_that) {
case _RhrMetricsModel() when $default != null:
return $default(_that.todayRhr,_that.baselineRhr,_that.rhrDelta,_that.trendDirection);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RhrMetricsModel extends RhrMetricsModel with DiagnosticableTreeMixin {
  const _RhrMetricsModel({this.todayRhr, this.baselineRhr, this.rhrDelta, this.trendDirection}): super._();
  factory _RhrMetricsModel.fromJson(Map<String, dynamic> json) => _$RhrMetricsModelFromJson(json);

@override final  double? todayRhr;
@override final  double? baselineRhr;
@override final  double? rhrDelta;
@override final  int? trendDirection;

/// Create a copy of RhrMetricsModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RhrMetricsModelCopyWith<_RhrMetricsModel> get copyWith => __$RhrMetricsModelCopyWithImpl<_RhrMetricsModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RhrMetricsModelToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'RhrMetricsModel'))
    ..add(DiagnosticsProperty('todayRhr', todayRhr))..add(DiagnosticsProperty('baselineRhr', baselineRhr))..add(DiagnosticsProperty('rhrDelta', rhrDelta))..add(DiagnosticsProperty('trendDirection', trendDirection));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RhrMetricsModel&&(identical(other.todayRhr, todayRhr) || other.todayRhr == todayRhr)&&(identical(other.baselineRhr, baselineRhr) || other.baselineRhr == baselineRhr)&&(identical(other.rhrDelta, rhrDelta) || other.rhrDelta == rhrDelta)&&(identical(other.trendDirection, trendDirection) || other.trendDirection == trendDirection));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,todayRhr,baselineRhr,rhrDelta,trendDirection);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'RhrMetricsModel(todayRhr: $todayRhr, baselineRhr: $baselineRhr, rhrDelta: $rhrDelta, trendDirection: $trendDirection)';
}


}

/// @nodoc
abstract mixin class _$RhrMetricsModelCopyWith<$Res> implements $RhrMetricsModelCopyWith<$Res> {
  factory _$RhrMetricsModelCopyWith(_RhrMetricsModel value, $Res Function(_RhrMetricsModel) _then) = __$RhrMetricsModelCopyWithImpl;
@override @useResult
$Res call({
 double? todayRhr, double? baselineRhr, double? rhrDelta, int? trendDirection
});




}
/// @nodoc
class __$RhrMetricsModelCopyWithImpl<$Res>
    implements _$RhrMetricsModelCopyWith<$Res> {
  __$RhrMetricsModelCopyWithImpl(this._self, this._then);

  final _RhrMetricsModel _self;
  final $Res Function(_RhrMetricsModel) _then;

/// Create a copy of RhrMetricsModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? todayRhr = freezed,Object? baselineRhr = freezed,Object? rhrDelta = freezed,Object? trendDirection = freezed,}) {
  return _then(_RhrMetricsModel(
todayRhr: freezed == todayRhr ? _self.todayRhr : todayRhr // ignore: cast_nullable_to_non_nullable
as double?,baselineRhr: freezed == baselineRhr ? _self.baselineRhr : baselineRhr // ignore: cast_nullable_to_non_nullable
as double?,rhrDelta: freezed == rhrDelta ? _self.rhrDelta : rhrDelta // ignore: cast_nullable_to_non_nullable
as double?,trendDirection: freezed == trendDirection ? _self.trendDirection : trendDirection // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$SleepMetricsModel implements DiagnosticableTreeMixin {

 double? get totalDurationMinutes; double? get deepMinutes; double? get remMinutes; double? get lightMinutes; double? get deepPercent; double? get remPercent; double? get sleepEfficiency;
/// Create a copy of SleepMetricsModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SleepMetricsModelCopyWith<SleepMetricsModel> get copyWith => _$SleepMetricsModelCopyWithImpl<SleepMetricsModel>(this as SleepMetricsModel, _$identity);

  /// Serializes this SleepMetricsModel to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'SleepMetricsModel'))
    ..add(DiagnosticsProperty('totalDurationMinutes', totalDurationMinutes))..add(DiagnosticsProperty('deepMinutes', deepMinutes))..add(DiagnosticsProperty('remMinutes', remMinutes))..add(DiagnosticsProperty('lightMinutes', lightMinutes))..add(DiagnosticsProperty('deepPercent', deepPercent))..add(DiagnosticsProperty('remPercent', remPercent))..add(DiagnosticsProperty('sleepEfficiency', sleepEfficiency));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SleepMetricsModel&&(identical(other.totalDurationMinutes, totalDurationMinutes) || other.totalDurationMinutes == totalDurationMinutes)&&(identical(other.deepMinutes, deepMinutes) || other.deepMinutes == deepMinutes)&&(identical(other.remMinutes, remMinutes) || other.remMinutes == remMinutes)&&(identical(other.lightMinutes, lightMinutes) || other.lightMinutes == lightMinutes)&&(identical(other.deepPercent, deepPercent) || other.deepPercent == deepPercent)&&(identical(other.remPercent, remPercent) || other.remPercent == remPercent)&&(identical(other.sleepEfficiency, sleepEfficiency) || other.sleepEfficiency == sleepEfficiency));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,totalDurationMinutes,deepMinutes,remMinutes,lightMinutes,deepPercent,remPercent,sleepEfficiency);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'SleepMetricsModel(totalDurationMinutes: $totalDurationMinutes, deepMinutes: $deepMinutes, remMinutes: $remMinutes, lightMinutes: $lightMinutes, deepPercent: $deepPercent, remPercent: $remPercent, sleepEfficiency: $sleepEfficiency)';
}


}

/// @nodoc
abstract mixin class $SleepMetricsModelCopyWith<$Res>  {
  factory $SleepMetricsModelCopyWith(SleepMetricsModel value, $Res Function(SleepMetricsModel) _then) = _$SleepMetricsModelCopyWithImpl;
@useResult
$Res call({
 double? totalDurationMinutes, double? deepMinutes, double? remMinutes, double? lightMinutes, double? deepPercent, double? remPercent, double? sleepEfficiency
});




}
/// @nodoc
class _$SleepMetricsModelCopyWithImpl<$Res>
    implements $SleepMetricsModelCopyWith<$Res> {
  _$SleepMetricsModelCopyWithImpl(this._self, this._then);

  final SleepMetricsModel _self;
  final $Res Function(SleepMetricsModel) _then;

/// Create a copy of SleepMetricsModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? totalDurationMinutes = freezed,Object? deepMinutes = freezed,Object? remMinutes = freezed,Object? lightMinutes = freezed,Object? deepPercent = freezed,Object? remPercent = freezed,Object? sleepEfficiency = freezed,}) {
  return _then(_self.copyWith(
totalDurationMinutes: freezed == totalDurationMinutes ? _self.totalDurationMinutes : totalDurationMinutes // ignore: cast_nullable_to_non_nullable
as double?,deepMinutes: freezed == deepMinutes ? _self.deepMinutes : deepMinutes // ignore: cast_nullable_to_non_nullable
as double?,remMinutes: freezed == remMinutes ? _self.remMinutes : remMinutes // ignore: cast_nullable_to_non_nullable
as double?,lightMinutes: freezed == lightMinutes ? _self.lightMinutes : lightMinutes // ignore: cast_nullable_to_non_nullable
as double?,deepPercent: freezed == deepPercent ? _self.deepPercent : deepPercent // ignore: cast_nullable_to_non_nullable
as double?,remPercent: freezed == remPercent ? _self.remPercent : remPercent // ignore: cast_nullable_to_non_nullable
as double?,sleepEfficiency: freezed == sleepEfficiency ? _self.sleepEfficiency : sleepEfficiency // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [SleepMetricsModel].
extension SleepMetricsModelPatterns on SleepMetricsModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SleepMetricsModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SleepMetricsModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SleepMetricsModel value)  $default,){
final _that = this;
switch (_that) {
case _SleepMetricsModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SleepMetricsModel value)?  $default,){
final _that = this;
switch (_that) {
case _SleepMetricsModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double? totalDurationMinutes,  double? deepMinutes,  double? remMinutes,  double? lightMinutes,  double? deepPercent,  double? remPercent,  double? sleepEfficiency)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SleepMetricsModel() when $default != null:
return $default(_that.totalDurationMinutes,_that.deepMinutes,_that.remMinutes,_that.lightMinutes,_that.deepPercent,_that.remPercent,_that.sleepEfficiency);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double? totalDurationMinutes,  double? deepMinutes,  double? remMinutes,  double? lightMinutes,  double? deepPercent,  double? remPercent,  double? sleepEfficiency)  $default,) {final _that = this;
switch (_that) {
case _SleepMetricsModel():
return $default(_that.totalDurationMinutes,_that.deepMinutes,_that.remMinutes,_that.lightMinutes,_that.deepPercent,_that.remPercent,_that.sleepEfficiency);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double? totalDurationMinutes,  double? deepMinutes,  double? remMinutes,  double? lightMinutes,  double? deepPercent,  double? remPercent,  double? sleepEfficiency)?  $default,) {final _that = this;
switch (_that) {
case _SleepMetricsModel() when $default != null:
return $default(_that.totalDurationMinutes,_that.deepMinutes,_that.remMinutes,_that.lightMinutes,_that.deepPercent,_that.remPercent,_that.sleepEfficiency);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SleepMetricsModel extends SleepMetricsModel with DiagnosticableTreeMixin {
  const _SleepMetricsModel({this.totalDurationMinutes, this.deepMinutes, this.remMinutes, this.lightMinutes, this.deepPercent, this.remPercent, this.sleepEfficiency}): super._();
  factory _SleepMetricsModel.fromJson(Map<String, dynamic> json) => _$SleepMetricsModelFromJson(json);

@override final  double? totalDurationMinutes;
@override final  double? deepMinutes;
@override final  double? remMinutes;
@override final  double? lightMinutes;
@override final  double? deepPercent;
@override final  double? remPercent;
@override final  double? sleepEfficiency;

/// Create a copy of SleepMetricsModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SleepMetricsModelCopyWith<_SleepMetricsModel> get copyWith => __$SleepMetricsModelCopyWithImpl<_SleepMetricsModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SleepMetricsModelToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'SleepMetricsModel'))
    ..add(DiagnosticsProperty('totalDurationMinutes', totalDurationMinutes))..add(DiagnosticsProperty('deepMinutes', deepMinutes))..add(DiagnosticsProperty('remMinutes', remMinutes))..add(DiagnosticsProperty('lightMinutes', lightMinutes))..add(DiagnosticsProperty('deepPercent', deepPercent))..add(DiagnosticsProperty('remPercent', remPercent))..add(DiagnosticsProperty('sleepEfficiency', sleepEfficiency));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SleepMetricsModel&&(identical(other.totalDurationMinutes, totalDurationMinutes) || other.totalDurationMinutes == totalDurationMinutes)&&(identical(other.deepMinutes, deepMinutes) || other.deepMinutes == deepMinutes)&&(identical(other.remMinutes, remMinutes) || other.remMinutes == remMinutes)&&(identical(other.lightMinutes, lightMinutes) || other.lightMinutes == lightMinutes)&&(identical(other.deepPercent, deepPercent) || other.deepPercent == deepPercent)&&(identical(other.remPercent, remPercent) || other.remPercent == remPercent)&&(identical(other.sleepEfficiency, sleepEfficiency) || other.sleepEfficiency == sleepEfficiency));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,totalDurationMinutes,deepMinutes,remMinutes,lightMinutes,deepPercent,remPercent,sleepEfficiency);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'SleepMetricsModel(totalDurationMinutes: $totalDurationMinutes, deepMinutes: $deepMinutes, remMinutes: $remMinutes, lightMinutes: $lightMinutes, deepPercent: $deepPercent, remPercent: $remPercent, sleepEfficiency: $sleepEfficiency)';
}


}

/// @nodoc
abstract mixin class _$SleepMetricsModelCopyWith<$Res> implements $SleepMetricsModelCopyWith<$Res> {
  factory _$SleepMetricsModelCopyWith(_SleepMetricsModel value, $Res Function(_SleepMetricsModel) _then) = __$SleepMetricsModelCopyWithImpl;
@override @useResult
$Res call({
 double? totalDurationMinutes, double? deepMinutes, double? remMinutes, double? lightMinutes, double? deepPercent, double? remPercent, double? sleepEfficiency
});




}
/// @nodoc
class __$SleepMetricsModelCopyWithImpl<$Res>
    implements _$SleepMetricsModelCopyWith<$Res> {
  __$SleepMetricsModelCopyWithImpl(this._self, this._then);

  final _SleepMetricsModel _self;
  final $Res Function(_SleepMetricsModel) _then;

/// Create a copy of SleepMetricsModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? totalDurationMinutes = freezed,Object? deepMinutes = freezed,Object? remMinutes = freezed,Object? lightMinutes = freezed,Object? deepPercent = freezed,Object? remPercent = freezed,Object? sleepEfficiency = freezed,}) {
  return _then(_SleepMetricsModel(
totalDurationMinutes: freezed == totalDurationMinutes ? _self.totalDurationMinutes : totalDurationMinutes // ignore: cast_nullable_to_non_nullable
as double?,deepMinutes: freezed == deepMinutes ? _self.deepMinutes : deepMinutes // ignore: cast_nullable_to_non_nullable
as double?,remMinutes: freezed == remMinutes ? _self.remMinutes : remMinutes // ignore: cast_nullable_to_non_nullable
as double?,lightMinutes: freezed == lightMinutes ? _self.lightMinutes : lightMinutes // ignore: cast_nullable_to_non_nullable
as double?,deepPercent: freezed == deepPercent ? _self.deepPercent : deepPercent // ignore: cast_nullable_to_non_nullable
as double?,remPercent: freezed == remPercent ? _self.remPercent : remPercent // ignore: cast_nullable_to_non_nullable
as double?,sleepEfficiency: freezed == sleepEfficiency ? _self.sleepEfficiency : sleepEfficiency // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$LoadMetricsModel implements DiagnosticableTreeMixin {

 double? get todayTrimp; double? get atl; double? get ctl; double? get tsb; double? get workloadRatio; String? get trimpStrategy; double? get sevenDayTrimpTotal;
/// Create a copy of LoadMetricsModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LoadMetricsModelCopyWith<LoadMetricsModel> get copyWith => _$LoadMetricsModelCopyWithImpl<LoadMetricsModel>(this as LoadMetricsModel, _$identity);

  /// Serializes this LoadMetricsModel to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'LoadMetricsModel'))
    ..add(DiagnosticsProperty('todayTrimp', todayTrimp))..add(DiagnosticsProperty('atl', atl))..add(DiagnosticsProperty('ctl', ctl))..add(DiagnosticsProperty('tsb', tsb))..add(DiagnosticsProperty('workloadRatio', workloadRatio))..add(DiagnosticsProperty('trimpStrategy', trimpStrategy))..add(DiagnosticsProperty('sevenDayTrimpTotal', sevenDayTrimpTotal));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LoadMetricsModel&&(identical(other.todayTrimp, todayTrimp) || other.todayTrimp == todayTrimp)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.trimpStrategy, trimpStrategy) || other.trimpStrategy == trimpStrategy)&&(identical(other.sevenDayTrimpTotal, sevenDayTrimpTotal) || other.sevenDayTrimpTotal == sevenDayTrimpTotal));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,todayTrimp,atl,ctl,tsb,workloadRatio,trimpStrategy,sevenDayTrimpTotal);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'LoadMetricsModel(todayTrimp: $todayTrimp, atl: $atl, ctl: $ctl, tsb: $tsb, workloadRatio: $workloadRatio, trimpStrategy: $trimpStrategy, sevenDayTrimpTotal: $sevenDayTrimpTotal)';
}


}

/// @nodoc
abstract mixin class $LoadMetricsModelCopyWith<$Res>  {
  factory $LoadMetricsModelCopyWith(LoadMetricsModel value, $Res Function(LoadMetricsModel) _then) = _$LoadMetricsModelCopyWithImpl;
@useResult
$Res call({
 double? todayTrimp, double? atl, double? ctl, double? tsb, double? workloadRatio, String? trimpStrategy, double? sevenDayTrimpTotal
});




}
/// @nodoc
class _$LoadMetricsModelCopyWithImpl<$Res>
    implements $LoadMetricsModelCopyWith<$Res> {
  _$LoadMetricsModelCopyWithImpl(this._self, this._then);

  final LoadMetricsModel _self;
  final $Res Function(LoadMetricsModel) _then;

/// Create a copy of LoadMetricsModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? todayTrimp = freezed,Object? atl = freezed,Object? ctl = freezed,Object? tsb = freezed,Object? workloadRatio = freezed,Object? trimpStrategy = freezed,Object? sevenDayTrimpTotal = freezed,}) {
  return _then(_self.copyWith(
todayTrimp: freezed == todayTrimp ? _self.todayTrimp : todayTrimp // ignore: cast_nullable_to_non_nullable
as double?,atl: freezed == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double?,ctl: freezed == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double?,tsb: freezed == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double?,workloadRatio: freezed == workloadRatio ? _self.workloadRatio : workloadRatio // ignore: cast_nullable_to_non_nullable
as double?,trimpStrategy: freezed == trimpStrategy ? _self.trimpStrategy : trimpStrategy // ignore: cast_nullable_to_non_nullable
as String?,sevenDayTrimpTotal: freezed == sevenDayTrimpTotal ? _self.sevenDayTrimpTotal : sevenDayTrimpTotal // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [LoadMetricsModel].
extension LoadMetricsModelPatterns on LoadMetricsModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LoadMetricsModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LoadMetricsModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LoadMetricsModel value)  $default,){
final _that = this;
switch (_that) {
case _LoadMetricsModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LoadMetricsModel value)?  $default,){
final _that = this;
switch (_that) {
case _LoadMetricsModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double? todayTrimp,  double? atl,  double? ctl,  double? tsb,  double? workloadRatio,  String? trimpStrategy,  double? sevenDayTrimpTotal)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LoadMetricsModel() when $default != null:
return $default(_that.todayTrimp,_that.atl,_that.ctl,_that.tsb,_that.workloadRatio,_that.trimpStrategy,_that.sevenDayTrimpTotal);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double? todayTrimp,  double? atl,  double? ctl,  double? tsb,  double? workloadRatio,  String? trimpStrategy,  double? sevenDayTrimpTotal)  $default,) {final _that = this;
switch (_that) {
case _LoadMetricsModel():
return $default(_that.todayTrimp,_that.atl,_that.ctl,_that.tsb,_that.workloadRatio,_that.trimpStrategy,_that.sevenDayTrimpTotal);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double? todayTrimp,  double? atl,  double? ctl,  double? tsb,  double? workloadRatio,  String? trimpStrategy,  double? sevenDayTrimpTotal)?  $default,) {final _that = this;
switch (_that) {
case _LoadMetricsModel() when $default != null:
return $default(_that.todayTrimp,_that.atl,_that.ctl,_that.tsb,_that.workloadRatio,_that.trimpStrategy,_that.sevenDayTrimpTotal);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LoadMetricsModel extends LoadMetricsModel with DiagnosticableTreeMixin {
  const _LoadMetricsModel({this.todayTrimp, this.atl, this.ctl, this.tsb, this.workloadRatio, this.trimpStrategy, this.sevenDayTrimpTotal}): super._();
  factory _LoadMetricsModel.fromJson(Map<String, dynamic> json) => _$LoadMetricsModelFromJson(json);

@override final  double? todayTrimp;
@override final  double? atl;
@override final  double? ctl;
@override final  double? tsb;
@override final  double? workloadRatio;
@override final  String? trimpStrategy;
@override final  double? sevenDayTrimpTotal;

/// Create a copy of LoadMetricsModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LoadMetricsModelCopyWith<_LoadMetricsModel> get copyWith => __$LoadMetricsModelCopyWithImpl<_LoadMetricsModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LoadMetricsModelToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'LoadMetricsModel'))
    ..add(DiagnosticsProperty('todayTrimp', todayTrimp))..add(DiagnosticsProperty('atl', atl))..add(DiagnosticsProperty('ctl', ctl))..add(DiagnosticsProperty('tsb', tsb))..add(DiagnosticsProperty('workloadRatio', workloadRatio))..add(DiagnosticsProperty('trimpStrategy', trimpStrategy))..add(DiagnosticsProperty('sevenDayTrimpTotal', sevenDayTrimpTotal));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _LoadMetricsModel&&(identical(other.todayTrimp, todayTrimp) || other.todayTrimp == todayTrimp)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.workloadRatio, workloadRatio) || other.workloadRatio == workloadRatio)&&(identical(other.trimpStrategy, trimpStrategy) || other.trimpStrategy == trimpStrategy)&&(identical(other.sevenDayTrimpTotal, sevenDayTrimpTotal) || other.sevenDayTrimpTotal == sevenDayTrimpTotal));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,todayTrimp,atl,ctl,tsb,workloadRatio,trimpStrategy,sevenDayTrimpTotal);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'LoadMetricsModel(todayTrimp: $todayTrimp, atl: $atl, ctl: $ctl, tsb: $tsb, workloadRatio: $workloadRatio, trimpStrategy: $trimpStrategy, sevenDayTrimpTotal: $sevenDayTrimpTotal)';
}


}

/// @nodoc
abstract mixin class _$LoadMetricsModelCopyWith<$Res> implements $LoadMetricsModelCopyWith<$Res> {
  factory _$LoadMetricsModelCopyWith(_LoadMetricsModel value, $Res Function(_LoadMetricsModel) _then) = __$LoadMetricsModelCopyWithImpl;
@override @useResult
$Res call({
 double? todayTrimp, double? atl, double? ctl, double? tsb, double? workloadRatio, String? trimpStrategy, double? sevenDayTrimpTotal
});




}
/// @nodoc
class __$LoadMetricsModelCopyWithImpl<$Res>
    implements _$LoadMetricsModelCopyWith<$Res> {
  __$LoadMetricsModelCopyWithImpl(this._self, this._then);

  final _LoadMetricsModel _self;
  final $Res Function(_LoadMetricsModel) _then;

/// Create a copy of LoadMetricsModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? todayTrimp = freezed,Object? atl = freezed,Object? ctl = freezed,Object? tsb = freezed,Object? workloadRatio = freezed,Object? trimpStrategy = freezed,Object? sevenDayTrimpTotal = freezed,}) {
  return _then(_LoadMetricsModel(
todayTrimp: freezed == todayTrimp ? _self.todayTrimp : todayTrimp // ignore: cast_nullable_to_non_nullable
as double?,atl: freezed == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double?,ctl: freezed == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double?,tsb: freezed == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double?,workloadRatio: freezed == workloadRatio ? _self.workloadRatio : workloadRatio // ignore: cast_nullable_to_non_nullable
as double?,trimpStrategy: freezed == trimpStrategy ? _self.trimpStrategy : trimpStrategy // ignore: cast_nullable_to_non_nullable
as String?,sevenDayTrimpTotal: freezed == sevenDayTrimpTotal ? _self.sevenDayTrimpTotal : sevenDayTrimpTotal // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$SubjectiveInputModel implements DiagnosticableTreeMixin {

 int? get exhaustionLevel; int? get muscleSoreness; int? get stressLevel; String? get note; String? get enteredAt;
/// Create a copy of SubjectiveInputModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SubjectiveInputModelCopyWith<SubjectiveInputModel> get copyWith => _$SubjectiveInputModelCopyWithImpl<SubjectiveInputModel>(this as SubjectiveInputModel, _$identity);

  /// Serializes this SubjectiveInputModel to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'SubjectiveInputModel'))
    ..add(DiagnosticsProperty('exhaustionLevel', exhaustionLevel))..add(DiagnosticsProperty('muscleSoreness', muscleSoreness))..add(DiagnosticsProperty('stressLevel', stressLevel))..add(DiagnosticsProperty('note', note))..add(DiagnosticsProperty('enteredAt', enteredAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SubjectiveInputModel&&(identical(other.exhaustionLevel, exhaustionLevel) || other.exhaustionLevel == exhaustionLevel)&&(identical(other.muscleSoreness, muscleSoreness) || other.muscleSoreness == muscleSoreness)&&(identical(other.stressLevel, stressLevel) || other.stressLevel == stressLevel)&&(identical(other.note, note) || other.note == note)&&(identical(other.enteredAt, enteredAt) || other.enteredAt == enteredAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,exhaustionLevel,muscleSoreness,stressLevel,note,enteredAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'SubjectiveInputModel(exhaustionLevel: $exhaustionLevel, muscleSoreness: $muscleSoreness, stressLevel: $stressLevel, note: $note, enteredAt: $enteredAt)';
}


}

/// @nodoc
abstract mixin class $SubjectiveInputModelCopyWith<$Res>  {
  factory $SubjectiveInputModelCopyWith(SubjectiveInputModel value, $Res Function(SubjectiveInputModel) _then) = _$SubjectiveInputModelCopyWithImpl;
@useResult
$Res call({
 int? exhaustionLevel, int? muscleSoreness, int? stressLevel, String? note, String? enteredAt
});




}
/// @nodoc
class _$SubjectiveInputModelCopyWithImpl<$Res>
    implements $SubjectiveInputModelCopyWith<$Res> {
  _$SubjectiveInputModelCopyWithImpl(this._self, this._then);

  final SubjectiveInputModel _self;
  final $Res Function(SubjectiveInputModel) _then;

/// Create a copy of SubjectiveInputModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? exhaustionLevel = freezed,Object? muscleSoreness = freezed,Object? stressLevel = freezed,Object? note = freezed,Object? enteredAt = freezed,}) {
  return _then(_self.copyWith(
exhaustionLevel: freezed == exhaustionLevel ? _self.exhaustionLevel : exhaustionLevel // ignore: cast_nullable_to_non_nullable
as int?,muscleSoreness: freezed == muscleSoreness ? _self.muscleSoreness : muscleSoreness // ignore: cast_nullable_to_non_nullable
as int?,stressLevel: freezed == stressLevel ? _self.stressLevel : stressLevel // ignore: cast_nullable_to_non_nullable
as int?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,enteredAt: freezed == enteredAt ? _self.enteredAt : enteredAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SubjectiveInputModel].
extension SubjectiveInputModelPatterns on SubjectiveInputModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SubjectiveInputModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SubjectiveInputModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SubjectiveInputModel value)  $default,){
final _that = this;
switch (_that) {
case _SubjectiveInputModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SubjectiveInputModel value)?  $default,){
final _that = this;
switch (_that) {
case _SubjectiveInputModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int? exhaustionLevel,  int? muscleSoreness,  int? stressLevel,  String? note,  String? enteredAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SubjectiveInputModel() when $default != null:
return $default(_that.exhaustionLevel,_that.muscleSoreness,_that.stressLevel,_that.note,_that.enteredAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int? exhaustionLevel,  int? muscleSoreness,  int? stressLevel,  String? note,  String? enteredAt)  $default,) {final _that = this;
switch (_that) {
case _SubjectiveInputModel():
return $default(_that.exhaustionLevel,_that.muscleSoreness,_that.stressLevel,_that.note,_that.enteredAt);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int? exhaustionLevel,  int? muscleSoreness,  int? stressLevel,  String? note,  String? enteredAt)?  $default,) {final _that = this;
switch (_that) {
case _SubjectiveInputModel() when $default != null:
return $default(_that.exhaustionLevel,_that.muscleSoreness,_that.stressLevel,_that.note,_that.enteredAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SubjectiveInputModel extends SubjectiveInputModel with DiagnosticableTreeMixin {
  const _SubjectiveInputModel({this.exhaustionLevel, this.muscleSoreness, this.stressLevel, this.note, this.enteredAt}): super._();
  factory _SubjectiveInputModel.fromJson(Map<String, dynamic> json) => _$SubjectiveInputModelFromJson(json);

@override final  int? exhaustionLevel;
@override final  int? muscleSoreness;
@override final  int? stressLevel;
@override final  String? note;
@override final  String? enteredAt;

/// Create a copy of SubjectiveInputModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SubjectiveInputModelCopyWith<_SubjectiveInputModel> get copyWith => __$SubjectiveInputModelCopyWithImpl<_SubjectiveInputModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SubjectiveInputModelToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'SubjectiveInputModel'))
    ..add(DiagnosticsProperty('exhaustionLevel', exhaustionLevel))..add(DiagnosticsProperty('muscleSoreness', muscleSoreness))..add(DiagnosticsProperty('stressLevel', stressLevel))..add(DiagnosticsProperty('note', note))..add(DiagnosticsProperty('enteredAt', enteredAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SubjectiveInputModel&&(identical(other.exhaustionLevel, exhaustionLevel) || other.exhaustionLevel == exhaustionLevel)&&(identical(other.muscleSoreness, muscleSoreness) || other.muscleSoreness == muscleSoreness)&&(identical(other.stressLevel, stressLevel) || other.stressLevel == stressLevel)&&(identical(other.note, note) || other.note == note)&&(identical(other.enteredAt, enteredAt) || other.enteredAt == enteredAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,exhaustionLevel,muscleSoreness,stressLevel,note,enteredAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'SubjectiveInputModel(exhaustionLevel: $exhaustionLevel, muscleSoreness: $muscleSoreness, stressLevel: $stressLevel, note: $note, enteredAt: $enteredAt)';
}


}

/// @nodoc
abstract mixin class _$SubjectiveInputModelCopyWith<$Res> implements $SubjectiveInputModelCopyWith<$Res> {
  factory _$SubjectiveInputModelCopyWith(_SubjectiveInputModel value, $Res Function(_SubjectiveInputModel) _then) = __$SubjectiveInputModelCopyWithImpl;
@override @useResult
$Res call({
 int? exhaustionLevel, int? muscleSoreness, int? stressLevel, String? note, String? enteredAt
});




}
/// @nodoc
class __$SubjectiveInputModelCopyWithImpl<$Res>
    implements _$SubjectiveInputModelCopyWith<$Res> {
  __$SubjectiveInputModelCopyWithImpl(this._self, this._then);

  final _SubjectiveInputModel _self;
  final $Res Function(_SubjectiveInputModel) _then;

/// Create a copy of SubjectiveInputModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? exhaustionLevel = freezed,Object? muscleSoreness = freezed,Object? stressLevel = freezed,Object? note = freezed,Object? enteredAt = freezed,}) {
  return _then(_SubjectiveInputModel(
exhaustionLevel: freezed == exhaustionLevel ? _self.exhaustionLevel : exhaustionLevel // ignore: cast_nullable_to_non_nullable
as int?,muscleSoreness: freezed == muscleSoreness ? _self.muscleSoreness : muscleSoreness // ignore: cast_nullable_to_non_nullable
as int?,stressLevel: freezed == stressLevel ? _self.stressLevel : stressLevel // ignore: cast_nullable_to_non_nullable
as int?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,enteredAt: freezed == enteredAt ? _self.enteredAt : enteredAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ComponentScoreModel implements DiagnosticableTreeMixin {

 String get component; double get score; bool get isAvailable; String? get reason;
/// Create a copy of ComponentScoreModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ComponentScoreModelCopyWith<ComponentScoreModel> get copyWith => _$ComponentScoreModelCopyWithImpl<ComponentScoreModel>(this as ComponentScoreModel, _$identity);

  /// Serializes this ComponentScoreModel to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ComponentScoreModel'))
    ..add(DiagnosticsProperty('component', component))..add(DiagnosticsProperty('score', score))..add(DiagnosticsProperty('isAvailable', isAvailable))..add(DiagnosticsProperty('reason', reason));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ComponentScoreModel&&(identical(other.component, component) || other.component == component)&&(identical(other.score, score) || other.score == score)&&(identical(other.isAvailable, isAvailable) || other.isAvailable == isAvailable)&&(identical(other.reason, reason) || other.reason == reason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,component,score,isAvailable,reason);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ComponentScoreModel(component: $component, score: $score, isAvailable: $isAvailable, reason: $reason)';
}


}

/// @nodoc
abstract mixin class $ComponentScoreModelCopyWith<$Res>  {
  factory $ComponentScoreModelCopyWith(ComponentScoreModel value, $Res Function(ComponentScoreModel) _then) = _$ComponentScoreModelCopyWithImpl;
@useResult
$Res call({
 String component, double score, bool isAvailable, String? reason
});




}
/// @nodoc
class _$ComponentScoreModelCopyWithImpl<$Res>
    implements $ComponentScoreModelCopyWith<$Res> {
  _$ComponentScoreModelCopyWithImpl(this._self, this._then);

  final ComponentScoreModel _self;
  final $Res Function(ComponentScoreModel) _then;

/// Create a copy of ComponentScoreModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? component = null,Object? score = null,Object? isAvailable = null,Object? reason = freezed,}) {
  return _then(_self.copyWith(
component: null == component ? _self.component : component // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as double,isAvailable: null == isAvailable ? _self.isAvailable : isAvailable // ignore: cast_nullable_to_non_nullable
as bool,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ComponentScoreModel].
extension ComponentScoreModelPatterns on ComponentScoreModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ComponentScoreModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ComponentScoreModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ComponentScoreModel value)  $default,){
final _that = this;
switch (_that) {
case _ComponentScoreModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ComponentScoreModel value)?  $default,){
final _that = this;
switch (_that) {
case _ComponentScoreModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String component,  double score,  bool isAvailable,  String? reason)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ComponentScoreModel() when $default != null:
return $default(_that.component,_that.score,_that.isAvailable,_that.reason);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String component,  double score,  bool isAvailable,  String? reason)  $default,) {final _that = this;
switch (_that) {
case _ComponentScoreModel():
return $default(_that.component,_that.score,_that.isAvailable,_that.reason);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String component,  double score,  bool isAvailable,  String? reason)?  $default,) {final _that = this;
switch (_that) {
case _ComponentScoreModel() when $default != null:
return $default(_that.component,_that.score,_that.isAvailable,_that.reason);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ComponentScoreModel extends ComponentScoreModel with DiagnosticableTreeMixin {
  const _ComponentScoreModel({required this.component, required this.score, required this.isAvailable, this.reason}): super._();
  factory _ComponentScoreModel.fromJson(Map<String, dynamic> json) => _$ComponentScoreModelFromJson(json);

@override final  String component;
@override final  double score;
@override final  bool isAvailable;
@override final  String? reason;

/// Create a copy of ComponentScoreModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ComponentScoreModelCopyWith<_ComponentScoreModel> get copyWith => __$ComponentScoreModelCopyWithImpl<_ComponentScoreModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ComponentScoreModelToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ComponentScoreModel'))
    ..add(DiagnosticsProperty('component', component))..add(DiagnosticsProperty('score', score))..add(DiagnosticsProperty('isAvailable', isAvailable))..add(DiagnosticsProperty('reason', reason));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ComponentScoreModel&&(identical(other.component, component) || other.component == component)&&(identical(other.score, score) || other.score == score)&&(identical(other.isAvailable, isAvailable) || other.isAvailable == isAvailable)&&(identical(other.reason, reason) || other.reason == reason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,component,score,isAvailable,reason);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ComponentScoreModel(component: $component, score: $score, isAvailable: $isAvailable, reason: $reason)';
}


}

/// @nodoc
abstract mixin class _$ComponentScoreModelCopyWith<$Res> implements $ComponentScoreModelCopyWith<$Res> {
  factory _$ComponentScoreModelCopyWith(_ComponentScoreModel value, $Res Function(_ComponentScoreModel) _then) = __$ComponentScoreModelCopyWithImpl;
@override @useResult
$Res call({
 String component, double score, bool isAvailable, String? reason
});




}
/// @nodoc
class __$ComponentScoreModelCopyWithImpl<$Res>
    implements _$ComponentScoreModelCopyWith<$Res> {
  __$ComponentScoreModelCopyWithImpl(this._self, this._then);

  final _ComponentScoreModel _self;
  final $Res Function(_ComponentScoreModel) _then;

/// Create a copy of ComponentScoreModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? component = null,Object? score = null,Object? isAvailable = null,Object? reason = freezed,}) {
  return _then(_ComponentScoreModel(
component: null == component ? _self.component : component // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as double,isAvailable: null == isAvailable ? _self.isAvailable : isAvailable // ignore: cast_nullable_to_non_nullable
as bool,reason: freezed == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ReadinessOverrideModel implements DiagnosticableTreeMixin {

 String get state; String? get note; String? get overriddenAt;
/// Create a copy of ReadinessOverrideModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReadinessOverrideModelCopyWith<ReadinessOverrideModel> get copyWith => _$ReadinessOverrideModelCopyWithImpl<ReadinessOverrideModel>(this as ReadinessOverrideModel, _$identity);

  /// Serializes this ReadinessOverrideModel to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ReadinessOverrideModel'))
    ..add(DiagnosticsProperty('state', state))..add(DiagnosticsProperty('note', note))..add(DiagnosticsProperty('overriddenAt', overriddenAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReadinessOverrideModel&&(identical(other.state, state) || other.state == state)&&(identical(other.note, note) || other.note == note)&&(identical(other.overriddenAt, overriddenAt) || other.overriddenAt == overriddenAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,state,note,overriddenAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ReadinessOverrideModel(state: $state, note: $note, overriddenAt: $overriddenAt)';
}


}

/// @nodoc
abstract mixin class $ReadinessOverrideModelCopyWith<$Res>  {
  factory $ReadinessOverrideModelCopyWith(ReadinessOverrideModel value, $Res Function(ReadinessOverrideModel) _then) = _$ReadinessOverrideModelCopyWithImpl;
@useResult
$Res call({
 String state, String? note, String? overriddenAt
});




}
/// @nodoc
class _$ReadinessOverrideModelCopyWithImpl<$Res>
    implements $ReadinessOverrideModelCopyWith<$Res> {
  _$ReadinessOverrideModelCopyWithImpl(this._self, this._then);

  final ReadinessOverrideModel _self;
  final $Res Function(ReadinessOverrideModel) _then;

/// Create a copy of ReadinessOverrideModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? state = null,Object? note = freezed,Object? overriddenAt = freezed,}) {
  return _then(_self.copyWith(
state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,overriddenAt: freezed == overriddenAt ? _self.overriddenAt : overriddenAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ReadinessOverrideModel].
extension ReadinessOverrideModelPatterns on ReadinessOverrideModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReadinessOverrideModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReadinessOverrideModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReadinessOverrideModel value)  $default,){
final _that = this;
switch (_that) {
case _ReadinessOverrideModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReadinessOverrideModel value)?  $default,){
final _that = this;
switch (_that) {
case _ReadinessOverrideModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String state,  String? note,  String? overriddenAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReadinessOverrideModel() when $default != null:
return $default(_that.state,_that.note,_that.overriddenAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String state,  String? note,  String? overriddenAt)  $default,) {final _that = this;
switch (_that) {
case _ReadinessOverrideModel():
return $default(_that.state,_that.note,_that.overriddenAt);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String state,  String? note,  String? overriddenAt)?  $default,) {final _that = this;
switch (_that) {
case _ReadinessOverrideModel() when $default != null:
return $default(_that.state,_that.note,_that.overriddenAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReadinessOverrideModel extends ReadinessOverrideModel with DiagnosticableTreeMixin {
  const _ReadinessOverrideModel({required this.state, this.note, this.overriddenAt}): super._();
  factory _ReadinessOverrideModel.fromJson(Map<String, dynamic> json) => _$ReadinessOverrideModelFromJson(json);

@override final  String state;
@override final  String? note;
@override final  String? overriddenAt;

/// Create a copy of ReadinessOverrideModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReadinessOverrideModelCopyWith<_ReadinessOverrideModel> get copyWith => __$ReadinessOverrideModelCopyWithImpl<_ReadinessOverrideModel>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReadinessOverrideModelToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ReadinessOverrideModel'))
    ..add(DiagnosticsProperty('state', state))..add(DiagnosticsProperty('note', note))..add(DiagnosticsProperty('overriddenAt', overriddenAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReadinessOverrideModel&&(identical(other.state, state) || other.state == state)&&(identical(other.note, note) || other.note == note)&&(identical(other.overriddenAt, overriddenAt) || other.overriddenAt == overriddenAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,state,note,overriddenAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ReadinessOverrideModel(state: $state, note: $note, overriddenAt: $overriddenAt)';
}


}

/// @nodoc
abstract mixin class _$ReadinessOverrideModelCopyWith<$Res> implements $ReadinessOverrideModelCopyWith<$Res> {
  factory _$ReadinessOverrideModelCopyWith(_ReadinessOverrideModel value, $Res Function(_ReadinessOverrideModel) _then) = __$ReadinessOverrideModelCopyWithImpl;
@override @useResult
$Res call({
 String state, String? note, String? overriddenAt
});




}
/// @nodoc
class __$ReadinessOverrideModelCopyWithImpl<$Res>
    implements _$ReadinessOverrideModelCopyWith<$Res> {
  __$ReadinessOverrideModelCopyWithImpl(this._self, this._then);

  final _ReadinessOverrideModel _self;
  final $Res Function(_ReadinessOverrideModel) _then;

/// Create a copy of ReadinessOverrideModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? state = null,Object? note = freezed,Object? overriddenAt = freezed,}) {
  return _then(_ReadinessOverrideModel(
state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,overriddenAt: freezed == overriddenAt ? _self.overriddenAt : overriddenAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

/// @nodoc
mixin _$DailyReadinessRecordModel implements DiagnosticableTreeMixin {

 String get date; RhrMetricsModel? get rhr; SleepMetricsModel? get sleep; LoadMetricsModel? get load; SubjectiveInputModel? get subjective; List<ComponentScoreModel> get componentScores; double get compositeScore; String get state; String get confidence; List<String> get reasons; ReadinessOverrideModel? get readinessOverride; String? get computedAt; String? get syncedAt; int? get maxHr; int? get restingHr;
/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DailyReadinessRecordModelCopyWith<DailyReadinessRecordModel> get copyWith => _$DailyReadinessRecordModelCopyWithImpl<DailyReadinessRecordModel>(this as DailyReadinessRecordModel, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'DailyReadinessRecordModel'))
    ..add(DiagnosticsProperty('date', date))..add(DiagnosticsProperty('rhr', rhr))..add(DiagnosticsProperty('sleep', sleep))..add(DiagnosticsProperty('load', load))..add(DiagnosticsProperty('subjective', subjective))..add(DiagnosticsProperty('componentScores', componentScores))..add(DiagnosticsProperty('compositeScore', compositeScore))..add(DiagnosticsProperty('state', state))..add(DiagnosticsProperty('confidence', confidence))..add(DiagnosticsProperty('reasons', reasons))..add(DiagnosticsProperty('readinessOverride', readinessOverride))..add(DiagnosticsProperty('computedAt', computedAt))..add(DiagnosticsProperty('syncedAt', syncedAt))..add(DiagnosticsProperty('maxHr', maxHr))..add(DiagnosticsProperty('restingHr', restingHr));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DailyReadinessRecordModel&&(identical(other.date, date) || other.date == date)&&(identical(other.rhr, rhr) || other.rhr == rhr)&&(identical(other.sleep, sleep) || other.sleep == sleep)&&(identical(other.load, load) || other.load == load)&&(identical(other.subjective, subjective) || other.subjective == subjective)&&const DeepCollectionEquality().equals(other.componentScores, componentScores)&&(identical(other.compositeScore, compositeScore) || other.compositeScore == compositeScore)&&(identical(other.state, state) || other.state == state)&&(identical(other.confidence, confidence) || other.confidence == confidence)&&const DeepCollectionEquality().equals(other.reasons, reasons)&&(identical(other.readinessOverride, readinessOverride) || other.readinessOverride == readinessOverride)&&(identical(other.computedAt, computedAt) || other.computedAt == computedAt)&&(identical(other.syncedAt, syncedAt) || other.syncedAt == syncedAt)&&(identical(other.maxHr, maxHr) || other.maxHr == maxHr)&&(identical(other.restingHr, restingHr) || other.restingHr == restingHr));
}


@override
int get hashCode => Object.hash(runtimeType,date,rhr,sleep,load,subjective,const DeepCollectionEquality().hash(componentScores),compositeScore,state,confidence,const DeepCollectionEquality().hash(reasons),readinessOverride,computedAt,syncedAt,maxHr,restingHr);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'DailyReadinessRecordModel(date: $date, rhr: $rhr, sleep: $sleep, load: $load, subjective: $subjective, componentScores: $componentScores, compositeScore: $compositeScore, state: $state, confidence: $confidence, reasons: $reasons, readinessOverride: $readinessOverride, computedAt: $computedAt, syncedAt: $syncedAt, maxHr: $maxHr, restingHr: $restingHr)';
}


}

/// @nodoc
abstract mixin class $DailyReadinessRecordModelCopyWith<$Res>  {
  factory $DailyReadinessRecordModelCopyWith(DailyReadinessRecordModel value, $Res Function(DailyReadinessRecordModel) _then) = _$DailyReadinessRecordModelCopyWithImpl;
@useResult
$Res call({
 String date, RhrMetricsModel? rhr, SleepMetricsModel? sleep, LoadMetricsModel? load, SubjectiveInputModel? subjective, List<ComponentScoreModel> componentScores, double compositeScore, String state, String confidence, List<String> reasons, ReadinessOverrideModel? readinessOverride, String? computedAt, String? syncedAt, int? maxHr, int? restingHr
});


$RhrMetricsModelCopyWith<$Res>? get rhr;$SleepMetricsModelCopyWith<$Res>? get sleep;$LoadMetricsModelCopyWith<$Res>? get load;$SubjectiveInputModelCopyWith<$Res>? get subjective;$ReadinessOverrideModelCopyWith<$Res>? get readinessOverride;

}
/// @nodoc
class _$DailyReadinessRecordModelCopyWithImpl<$Res>
    implements $DailyReadinessRecordModelCopyWith<$Res> {
  _$DailyReadinessRecordModelCopyWithImpl(this._self, this._then);

  final DailyReadinessRecordModel _self;
  final $Res Function(DailyReadinessRecordModel) _then;

/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? rhr = freezed,Object? sleep = freezed,Object? load = freezed,Object? subjective = freezed,Object? componentScores = null,Object? compositeScore = null,Object? state = null,Object? confidence = null,Object? reasons = null,Object? readinessOverride = freezed,Object? computedAt = freezed,Object? syncedAt = freezed,Object? maxHr = freezed,Object? restingHr = freezed,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,rhr: freezed == rhr ? _self.rhr : rhr // ignore: cast_nullable_to_non_nullable
as RhrMetricsModel?,sleep: freezed == sleep ? _self.sleep : sleep // ignore: cast_nullable_to_non_nullable
as SleepMetricsModel?,load: freezed == load ? _self.load : load // ignore: cast_nullable_to_non_nullable
as LoadMetricsModel?,subjective: freezed == subjective ? _self.subjective : subjective // ignore: cast_nullable_to_non_nullable
as SubjectiveInputModel?,componentScores: null == componentScores ? _self.componentScores : componentScores // ignore: cast_nullable_to_non_nullable
as List<ComponentScoreModel>,compositeScore: null == compositeScore ? _self.compositeScore : compositeScore // ignore: cast_nullable_to_non_nullable
as double,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,confidence: null == confidence ? _self.confidence : confidence // ignore: cast_nullable_to_non_nullable
as String,reasons: null == reasons ? _self.reasons : reasons // ignore: cast_nullable_to_non_nullable
as List<String>,readinessOverride: freezed == readinessOverride ? _self.readinessOverride : readinessOverride // ignore: cast_nullable_to_non_nullable
as ReadinessOverrideModel?,computedAt: freezed == computedAt ? _self.computedAt : computedAt // ignore: cast_nullable_to_non_nullable
as String?,syncedAt: freezed == syncedAt ? _self.syncedAt : syncedAt // ignore: cast_nullable_to_non_nullable
as String?,maxHr: freezed == maxHr ? _self.maxHr : maxHr // ignore: cast_nullable_to_non_nullable
as int?,restingHr: freezed == restingHr ? _self.restingHr : restingHr // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}
/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RhrMetricsModelCopyWith<$Res>? get rhr {
    if (_self.rhr == null) {
    return null;
  }

  return $RhrMetricsModelCopyWith<$Res>(_self.rhr!, (value) {
    return _then(_self.copyWith(rhr: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SleepMetricsModelCopyWith<$Res>? get sleep {
    if (_self.sleep == null) {
    return null;
  }

  return $SleepMetricsModelCopyWith<$Res>(_self.sleep!, (value) {
    return _then(_self.copyWith(sleep: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LoadMetricsModelCopyWith<$Res>? get load {
    if (_self.load == null) {
    return null;
  }

  return $LoadMetricsModelCopyWith<$Res>(_self.load!, (value) {
    return _then(_self.copyWith(load: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SubjectiveInputModelCopyWith<$Res>? get subjective {
    if (_self.subjective == null) {
    return null;
  }

  return $SubjectiveInputModelCopyWith<$Res>(_self.subjective!, (value) {
    return _then(_self.copyWith(subjective: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReadinessOverrideModelCopyWith<$Res>? get readinessOverride {
    if (_self.readinessOverride == null) {
    return null;
  }

  return $ReadinessOverrideModelCopyWith<$Res>(_self.readinessOverride!, (value) {
    return _then(_self.copyWith(readinessOverride: value));
  });
}
}


/// Adds pattern-matching-related methods to [DailyReadinessRecordModel].
extension DailyReadinessRecordModelPatterns on DailyReadinessRecordModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DailyReadinessRecordModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DailyReadinessRecordModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DailyReadinessRecordModel value)  $default,){
final _that = this;
switch (_that) {
case _DailyReadinessRecordModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DailyReadinessRecordModel value)?  $default,){
final _that = this;
switch (_that) {
case _DailyReadinessRecordModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  RhrMetricsModel? rhr,  SleepMetricsModel? sleep,  LoadMetricsModel? load,  SubjectiveInputModel? subjective,  List<ComponentScoreModel> componentScores,  double compositeScore,  String state,  String confidence,  List<String> reasons,  ReadinessOverrideModel? readinessOverride,  String? computedAt,  String? syncedAt,  int? maxHr,  int? restingHr)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DailyReadinessRecordModel() when $default != null:
return $default(_that.date,_that.rhr,_that.sleep,_that.load,_that.subjective,_that.componentScores,_that.compositeScore,_that.state,_that.confidence,_that.reasons,_that.readinessOverride,_that.computedAt,_that.syncedAt,_that.maxHr,_that.restingHr);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  RhrMetricsModel? rhr,  SleepMetricsModel? sleep,  LoadMetricsModel? load,  SubjectiveInputModel? subjective,  List<ComponentScoreModel> componentScores,  double compositeScore,  String state,  String confidence,  List<String> reasons,  ReadinessOverrideModel? readinessOverride,  String? computedAt,  String? syncedAt,  int? maxHr,  int? restingHr)  $default,) {final _that = this;
switch (_that) {
case _DailyReadinessRecordModel():
return $default(_that.date,_that.rhr,_that.sleep,_that.load,_that.subjective,_that.componentScores,_that.compositeScore,_that.state,_that.confidence,_that.reasons,_that.readinessOverride,_that.computedAt,_that.syncedAt,_that.maxHr,_that.restingHr);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  RhrMetricsModel? rhr,  SleepMetricsModel? sleep,  LoadMetricsModel? load,  SubjectiveInputModel? subjective,  List<ComponentScoreModel> componentScores,  double compositeScore,  String state,  String confidence,  List<String> reasons,  ReadinessOverrideModel? readinessOverride,  String? computedAt,  String? syncedAt,  int? maxHr,  int? restingHr)?  $default,) {final _that = this;
switch (_that) {
case _DailyReadinessRecordModel() when $default != null:
return $default(_that.date,_that.rhr,_that.sleep,_that.load,_that.subjective,_that.componentScores,_that.compositeScore,_that.state,_that.confidence,_that.reasons,_that.readinessOverride,_that.computedAt,_that.syncedAt,_that.maxHr,_that.restingHr);case _:
  return null;

}
}

}

/// @nodoc


class _DailyReadinessRecordModel extends DailyReadinessRecordModel with DiagnosticableTreeMixin {
  const _DailyReadinessRecordModel({required this.date, this.rhr, this.sleep, this.load, this.subjective, final  List<ComponentScoreModel> componentScores = const [], this.compositeScore = 0, this.state = 'unavailable', this.confidence = 'unavailable', final  List<String> reasons = const [], this.readinessOverride, this.computedAt, this.syncedAt, this.maxHr, this.restingHr}): _componentScores = componentScores,_reasons = reasons,super._();
  

@override final  String date;
@override final  RhrMetricsModel? rhr;
@override final  SleepMetricsModel? sleep;
@override final  LoadMetricsModel? load;
@override final  SubjectiveInputModel? subjective;
 final  List<ComponentScoreModel> _componentScores;
@override@JsonKey() List<ComponentScoreModel> get componentScores {
  if (_componentScores is EqualUnmodifiableListView) return _componentScores;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_componentScores);
}

@override@JsonKey() final  double compositeScore;
@override@JsonKey() final  String state;
@override@JsonKey() final  String confidence;
 final  List<String> _reasons;
@override@JsonKey() List<String> get reasons {
  if (_reasons is EqualUnmodifiableListView) return _reasons;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_reasons);
}

@override final  ReadinessOverrideModel? readinessOverride;
@override final  String? computedAt;
@override final  String? syncedAt;
@override final  int? maxHr;
@override final  int? restingHr;

/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DailyReadinessRecordModelCopyWith<_DailyReadinessRecordModel> get copyWith => __$DailyReadinessRecordModelCopyWithImpl<_DailyReadinessRecordModel>(this, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'DailyReadinessRecordModel'))
    ..add(DiagnosticsProperty('date', date))..add(DiagnosticsProperty('rhr', rhr))..add(DiagnosticsProperty('sleep', sleep))..add(DiagnosticsProperty('load', load))..add(DiagnosticsProperty('subjective', subjective))..add(DiagnosticsProperty('componentScores', componentScores))..add(DiagnosticsProperty('compositeScore', compositeScore))..add(DiagnosticsProperty('state', state))..add(DiagnosticsProperty('confidence', confidence))..add(DiagnosticsProperty('reasons', reasons))..add(DiagnosticsProperty('readinessOverride', readinessOverride))..add(DiagnosticsProperty('computedAt', computedAt))..add(DiagnosticsProperty('syncedAt', syncedAt))..add(DiagnosticsProperty('maxHr', maxHr))..add(DiagnosticsProperty('restingHr', restingHr));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DailyReadinessRecordModel&&(identical(other.date, date) || other.date == date)&&(identical(other.rhr, rhr) || other.rhr == rhr)&&(identical(other.sleep, sleep) || other.sleep == sleep)&&(identical(other.load, load) || other.load == load)&&(identical(other.subjective, subjective) || other.subjective == subjective)&&const DeepCollectionEquality().equals(other._componentScores, _componentScores)&&(identical(other.compositeScore, compositeScore) || other.compositeScore == compositeScore)&&(identical(other.state, state) || other.state == state)&&(identical(other.confidence, confidence) || other.confidence == confidence)&&const DeepCollectionEquality().equals(other._reasons, _reasons)&&(identical(other.readinessOverride, readinessOverride) || other.readinessOverride == readinessOverride)&&(identical(other.computedAt, computedAt) || other.computedAt == computedAt)&&(identical(other.syncedAt, syncedAt) || other.syncedAt == syncedAt)&&(identical(other.maxHr, maxHr) || other.maxHr == maxHr)&&(identical(other.restingHr, restingHr) || other.restingHr == restingHr));
}


@override
int get hashCode => Object.hash(runtimeType,date,rhr,sleep,load,subjective,const DeepCollectionEquality().hash(_componentScores),compositeScore,state,confidence,const DeepCollectionEquality().hash(_reasons),readinessOverride,computedAt,syncedAt,maxHr,restingHr);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'DailyReadinessRecordModel(date: $date, rhr: $rhr, sleep: $sleep, load: $load, subjective: $subjective, componentScores: $componentScores, compositeScore: $compositeScore, state: $state, confidence: $confidence, reasons: $reasons, readinessOverride: $readinessOverride, computedAt: $computedAt, syncedAt: $syncedAt, maxHr: $maxHr, restingHr: $restingHr)';
}


}

/// @nodoc
abstract mixin class _$DailyReadinessRecordModelCopyWith<$Res> implements $DailyReadinessRecordModelCopyWith<$Res> {
  factory _$DailyReadinessRecordModelCopyWith(_DailyReadinessRecordModel value, $Res Function(_DailyReadinessRecordModel) _then) = __$DailyReadinessRecordModelCopyWithImpl;
@override @useResult
$Res call({
 String date, RhrMetricsModel? rhr, SleepMetricsModel? sleep, LoadMetricsModel? load, SubjectiveInputModel? subjective, List<ComponentScoreModel> componentScores, double compositeScore, String state, String confidence, List<String> reasons, ReadinessOverrideModel? readinessOverride, String? computedAt, String? syncedAt, int? maxHr, int? restingHr
});


@override $RhrMetricsModelCopyWith<$Res>? get rhr;@override $SleepMetricsModelCopyWith<$Res>? get sleep;@override $LoadMetricsModelCopyWith<$Res>? get load;@override $SubjectiveInputModelCopyWith<$Res>? get subjective;@override $ReadinessOverrideModelCopyWith<$Res>? get readinessOverride;

}
/// @nodoc
class __$DailyReadinessRecordModelCopyWithImpl<$Res>
    implements _$DailyReadinessRecordModelCopyWith<$Res> {
  __$DailyReadinessRecordModelCopyWithImpl(this._self, this._then);

  final _DailyReadinessRecordModel _self;
  final $Res Function(_DailyReadinessRecordModel) _then;

/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? rhr = freezed,Object? sleep = freezed,Object? load = freezed,Object? subjective = freezed,Object? componentScores = null,Object? compositeScore = null,Object? state = null,Object? confidence = null,Object? reasons = null,Object? readinessOverride = freezed,Object? computedAt = freezed,Object? syncedAt = freezed,Object? maxHr = freezed,Object? restingHr = freezed,}) {
  return _then(_DailyReadinessRecordModel(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,rhr: freezed == rhr ? _self.rhr : rhr // ignore: cast_nullable_to_non_nullable
as RhrMetricsModel?,sleep: freezed == sleep ? _self.sleep : sleep // ignore: cast_nullable_to_non_nullable
as SleepMetricsModel?,load: freezed == load ? _self.load : load // ignore: cast_nullable_to_non_nullable
as LoadMetricsModel?,subjective: freezed == subjective ? _self.subjective : subjective // ignore: cast_nullable_to_non_nullable
as SubjectiveInputModel?,componentScores: null == componentScores ? _self._componentScores : componentScores // ignore: cast_nullable_to_non_nullable
as List<ComponentScoreModel>,compositeScore: null == compositeScore ? _self.compositeScore : compositeScore // ignore: cast_nullable_to_non_nullable
as double,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,confidence: null == confidence ? _self.confidence : confidence // ignore: cast_nullable_to_non_nullable
as String,reasons: null == reasons ? _self._reasons : reasons // ignore: cast_nullable_to_non_nullable
as List<String>,readinessOverride: freezed == readinessOverride ? _self.readinessOverride : readinessOverride // ignore: cast_nullable_to_non_nullable
as ReadinessOverrideModel?,computedAt: freezed == computedAt ? _self.computedAt : computedAt // ignore: cast_nullable_to_non_nullable
as String?,syncedAt: freezed == syncedAt ? _self.syncedAt : syncedAt // ignore: cast_nullable_to_non_nullable
as String?,maxHr: freezed == maxHr ? _self.maxHr : maxHr // ignore: cast_nullable_to_non_nullable
as int?,restingHr: freezed == restingHr ? _self.restingHr : restingHr // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RhrMetricsModelCopyWith<$Res>? get rhr {
    if (_self.rhr == null) {
    return null;
  }

  return $RhrMetricsModelCopyWith<$Res>(_self.rhr!, (value) {
    return _then(_self.copyWith(rhr: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SleepMetricsModelCopyWith<$Res>? get sleep {
    if (_self.sleep == null) {
    return null;
  }

  return $SleepMetricsModelCopyWith<$Res>(_self.sleep!, (value) {
    return _then(_self.copyWith(sleep: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LoadMetricsModelCopyWith<$Res>? get load {
    if (_self.load == null) {
    return null;
  }

  return $LoadMetricsModelCopyWith<$Res>(_self.load!, (value) {
    return _then(_self.copyWith(load: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SubjectiveInputModelCopyWith<$Res>? get subjective {
    if (_self.subjective == null) {
    return null;
  }

  return $SubjectiveInputModelCopyWith<$Res>(_self.subjective!, (value) {
    return _then(_self.copyWith(subjective: value));
  });
}/// Create a copy of DailyReadinessRecordModel
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReadinessOverrideModelCopyWith<$Res>? get readinessOverride {
    if (_self.readinessOverride == null) {
    return null;
  }

  return $ReadinessOverrideModelCopyWith<$Res>(_self.readinessOverride!, (value) {
    return _then(_self.copyWith(readinessOverride: value));
  });
}
}

/// @nodoc
mixin _$ReadinessBaselineModel implements DiagnosticableTreeMixin {

 double? get rhrMedian30Day; double? get sleepAverage28Day; String get lastUpdated;
/// Create a copy of ReadinessBaselineModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReadinessBaselineModelCopyWith<ReadinessBaselineModel> get copyWith => _$ReadinessBaselineModelCopyWithImpl<ReadinessBaselineModel>(this as ReadinessBaselineModel, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ReadinessBaselineModel'))
    ..add(DiagnosticsProperty('rhrMedian30Day', rhrMedian30Day))..add(DiagnosticsProperty('sleepAverage28Day', sleepAverage28Day))..add(DiagnosticsProperty('lastUpdated', lastUpdated));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReadinessBaselineModel&&(identical(other.rhrMedian30Day, rhrMedian30Day) || other.rhrMedian30Day == rhrMedian30Day)&&(identical(other.sleepAverage28Day, sleepAverage28Day) || other.sleepAverage28Day == sleepAverage28Day)&&(identical(other.lastUpdated, lastUpdated) || other.lastUpdated == lastUpdated));
}


@override
int get hashCode => Object.hash(runtimeType,rhrMedian30Day,sleepAverage28Day,lastUpdated);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ReadinessBaselineModel(rhrMedian30Day: $rhrMedian30Day, sleepAverage28Day: $sleepAverage28Day, lastUpdated: $lastUpdated)';
}


}

/// @nodoc
abstract mixin class $ReadinessBaselineModelCopyWith<$Res>  {
  factory $ReadinessBaselineModelCopyWith(ReadinessBaselineModel value, $Res Function(ReadinessBaselineModel) _then) = _$ReadinessBaselineModelCopyWithImpl;
@useResult
$Res call({
 double? rhrMedian30Day, double? sleepAverage28Day, String lastUpdated
});




}
/// @nodoc
class _$ReadinessBaselineModelCopyWithImpl<$Res>
    implements $ReadinessBaselineModelCopyWith<$Res> {
  _$ReadinessBaselineModelCopyWithImpl(this._self, this._then);

  final ReadinessBaselineModel _self;
  final $Res Function(ReadinessBaselineModel) _then;

/// Create a copy of ReadinessBaselineModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? rhrMedian30Day = freezed,Object? sleepAverage28Day = freezed,Object? lastUpdated = null,}) {
  return _then(_self.copyWith(
rhrMedian30Day: freezed == rhrMedian30Day ? _self.rhrMedian30Day : rhrMedian30Day // ignore: cast_nullable_to_non_nullable
as double?,sleepAverage28Day: freezed == sleepAverage28Day ? _self.sleepAverage28Day : sleepAverage28Day // ignore: cast_nullable_to_non_nullable
as double?,lastUpdated: null == lastUpdated ? _self.lastUpdated : lastUpdated // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReadinessBaselineModel].
extension ReadinessBaselineModelPatterns on ReadinessBaselineModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReadinessBaselineModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReadinessBaselineModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReadinessBaselineModel value)  $default,){
final _that = this;
switch (_that) {
case _ReadinessBaselineModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReadinessBaselineModel value)?  $default,){
final _that = this;
switch (_that) {
case _ReadinessBaselineModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double? rhrMedian30Day,  double? sleepAverage28Day,  String lastUpdated)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReadinessBaselineModel() when $default != null:
return $default(_that.rhrMedian30Day,_that.sleepAverage28Day,_that.lastUpdated);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double? rhrMedian30Day,  double? sleepAverage28Day,  String lastUpdated)  $default,) {final _that = this;
switch (_that) {
case _ReadinessBaselineModel():
return $default(_that.rhrMedian30Day,_that.sleepAverage28Day,_that.lastUpdated);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double? rhrMedian30Day,  double? sleepAverage28Day,  String lastUpdated)?  $default,) {final _that = this;
switch (_that) {
case _ReadinessBaselineModel() when $default != null:
return $default(_that.rhrMedian30Day,_that.sleepAverage28Day,_that.lastUpdated);case _:
  return null;

}
}

}

/// @nodoc


class _ReadinessBaselineModel extends ReadinessBaselineModel with DiagnosticableTreeMixin {
  const _ReadinessBaselineModel({this.rhrMedian30Day, this.sleepAverage28Day, required this.lastUpdated}): super._();
  

@override final  double? rhrMedian30Day;
@override final  double? sleepAverage28Day;
@override final  String lastUpdated;

/// Create a copy of ReadinessBaselineModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReadinessBaselineModelCopyWith<_ReadinessBaselineModel> get copyWith => __$ReadinessBaselineModelCopyWithImpl<_ReadinessBaselineModel>(this, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ReadinessBaselineModel'))
    ..add(DiagnosticsProperty('rhrMedian30Day', rhrMedian30Day))..add(DiagnosticsProperty('sleepAverage28Day', sleepAverage28Day))..add(DiagnosticsProperty('lastUpdated', lastUpdated));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReadinessBaselineModel&&(identical(other.rhrMedian30Day, rhrMedian30Day) || other.rhrMedian30Day == rhrMedian30Day)&&(identical(other.sleepAverage28Day, sleepAverage28Day) || other.sleepAverage28Day == sleepAverage28Day)&&(identical(other.lastUpdated, lastUpdated) || other.lastUpdated == lastUpdated));
}


@override
int get hashCode => Object.hash(runtimeType,rhrMedian30Day,sleepAverage28Day,lastUpdated);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ReadinessBaselineModel(rhrMedian30Day: $rhrMedian30Day, sleepAverage28Day: $sleepAverage28Day, lastUpdated: $lastUpdated)';
}


}

/// @nodoc
abstract mixin class _$ReadinessBaselineModelCopyWith<$Res> implements $ReadinessBaselineModelCopyWith<$Res> {
  factory _$ReadinessBaselineModelCopyWith(_ReadinessBaselineModel value, $Res Function(_ReadinessBaselineModel) _then) = __$ReadinessBaselineModelCopyWithImpl;
@override @useResult
$Res call({
 double? rhrMedian30Day, double? sleepAverage28Day, String lastUpdated
});




}
/// @nodoc
class __$ReadinessBaselineModelCopyWithImpl<$Res>
    implements _$ReadinessBaselineModelCopyWith<$Res> {
  __$ReadinessBaselineModelCopyWithImpl(this._self, this._then);

  final _ReadinessBaselineModel _self;
  final $Res Function(_ReadinessBaselineModel) _then;

/// Create a copy of ReadinessBaselineModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? rhrMedian30Day = freezed,Object? sleepAverage28Day = freezed,Object? lastUpdated = null,}) {
  return _then(_ReadinessBaselineModel(
rhrMedian30Day: freezed == rhrMedian30Day ? _self.rhrMedian30Day : rhrMedian30Day // ignore: cast_nullable_to_non_nullable
as double?,sleepAverage28Day: freezed == sleepAverage28Day ? _self.sleepAverage28Day : sleepAverage28Day // ignore: cast_nullable_to_non_nullable
as double?,lastUpdated: null == lastUpdated ? _self.lastUpdated : lastUpdated // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc
mixin _$AdaptedWorkoutModel implements DiagnosticableTreeMixin {

 String get id; String get originalWorkoutId; String get date; String get originalType; String get adaptedType; String get adaptationType; double get originalTargetDistance; double? get adaptedTargetDistance; int get originalTargetDuration; int? get adaptedTargetDuration; double get originalTargetPace; double? get adaptedTargetPace; String get reason; double get readinessScore; String get readinessState; bool get isAccepted; String get createdAt; String? get syncedAt;
/// Create a copy of AdaptedWorkoutModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AdaptedWorkoutModelCopyWith<AdaptedWorkoutModel> get copyWith => _$AdaptedWorkoutModelCopyWithImpl<AdaptedWorkoutModel>(this as AdaptedWorkoutModel, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'AdaptedWorkoutModel'))
    ..add(DiagnosticsProperty('id', id))..add(DiagnosticsProperty('originalWorkoutId', originalWorkoutId))..add(DiagnosticsProperty('date', date))..add(DiagnosticsProperty('originalType', originalType))..add(DiagnosticsProperty('adaptedType', adaptedType))..add(DiagnosticsProperty('adaptationType', adaptationType))..add(DiagnosticsProperty('originalTargetDistance', originalTargetDistance))..add(DiagnosticsProperty('adaptedTargetDistance', adaptedTargetDistance))..add(DiagnosticsProperty('originalTargetDuration', originalTargetDuration))..add(DiagnosticsProperty('adaptedTargetDuration', adaptedTargetDuration))..add(DiagnosticsProperty('originalTargetPace', originalTargetPace))..add(DiagnosticsProperty('adaptedTargetPace', adaptedTargetPace))..add(DiagnosticsProperty('reason', reason))..add(DiagnosticsProperty('readinessScore', readinessScore))..add(DiagnosticsProperty('readinessState', readinessState))..add(DiagnosticsProperty('isAccepted', isAccepted))..add(DiagnosticsProperty('createdAt', createdAt))..add(DiagnosticsProperty('syncedAt', syncedAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AdaptedWorkoutModel&&(identical(other.id, id) || other.id == id)&&(identical(other.originalWorkoutId, originalWorkoutId) || other.originalWorkoutId == originalWorkoutId)&&(identical(other.date, date) || other.date == date)&&(identical(other.originalType, originalType) || other.originalType == originalType)&&(identical(other.adaptedType, adaptedType) || other.adaptedType == adaptedType)&&(identical(other.adaptationType, adaptationType) || other.adaptationType == adaptationType)&&(identical(other.originalTargetDistance, originalTargetDistance) || other.originalTargetDistance == originalTargetDistance)&&(identical(other.adaptedTargetDistance, adaptedTargetDistance) || other.adaptedTargetDistance == adaptedTargetDistance)&&(identical(other.originalTargetDuration, originalTargetDuration) || other.originalTargetDuration == originalTargetDuration)&&(identical(other.adaptedTargetDuration, adaptedTargetDuration) || other.adaptedTargetDuration == adaptedTargetDuration)&&(identical(other.originalTargetPace, originalTargetPace) || other.originalTargetPace == originalTargetPace)&&(identical(other.adaptedTargetPace, adaptedTargetPace) || other.adaptedTargetPace == adaptedTargetPace)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.readinessScore, readinessScore) || other.readinessScore == readinessScore)&&(identical(other.readinessState, readinessState) || other.readinessState == readinessState)&&(identical(other.isAccepted, isAccepted) || other.isAccepted == isAccepted)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.syncedAt, syncedAt) || other.syncedAt == syncedAt));
}


@override
int get hashCode => Object.hash(runtimeType,id,originalWorkoutId,date,originalType,adaptedType,adaptationType,originalTargetDistance,adaptedTargetDistance,originalTargetDuration,adaptedTargetDuration,originalTargetPace,adaptedTargetPace,reason,readinessScore,readinessState,isAccepted,createdAt,syncedAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'AdaptedWorkoutModel(id: $id, originalWorkoutId: $originalWorkoutId, date: $date, originalType: $originalType, adaptedType: $adaptedType, adaptationType: $adaptationType, originalTargetDistance: $originalTargetDistance, adaptedTargetDistance: $adaptedTargetDistance, originalTargetDuration: $originalTargetDuration, adaptedTargetDuration: $adaptedTargetDuration, originalTargetPace: $originalTargetPace, adaptedTargetPace: $adaptedTargetPace, reason: $reason, readinessScore: $readinessScore, readinessState: $readinessState, isAccepted: $isAccepted, createdAt: $createdAt, syncedAt: $syncedAt)';
}


}

/// @nodoc
abstract mixin class $AdaptedWorkoutModelCopyWith<$Res>  {
  factory $AdaptedWorkoutModelCopyWith(AdaptedWorkoutModel value, $Res Function(AdaptedWorkoutModel) _then) = _$AdaptedWorkoutModelCopyWithImpl;
@useResult
$Res call({
 String id, String originalWorkoutId, String date, String originalType, String adaptedType, String adaptationType, double originalTargetDistance, double? adaptedTargetDistance, int originalTargetDuration, int? adaptedTargetDuration, double originalTargetPace, double? adaptedTargetPace, String reason, double readinessScore, String readinessState, bool isAccepted, String createdAt, String? syncedAt
});




}
/// @nodoc
class _$AdaptedWorkoutModelCopyWithImpl<$Res>
    implements $AdaptedWorkoutModelCopyWith<$Res> {
  _$AdaptedWorkoutModelCopyWithImpl(this._self, this._then);

  final AdaptedWorkoutModel _self;
  final $Res Function(AdaptedWorkoutModel) _then;

/// Create a copy of AdaptedWorkoutModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? originalWorkoutId = null,Object? date = null,Object? originalType = null,Object? adaptedType = null,Object? adaptationType = null,Object? originalTargetDistance = null,Object? adaptedTargetDistance = freezed,Object? originalTargetDuration = null,Object? adaptedTargetDuration = freezed,Object? originalTargetPace = null,Object? adaptedTargetPace = freezed,Object? reason = null,Object? readinessScore = null,Object? readinessState = null,Object? isAccepted = null,Object? createdAt = null,Object? syncedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,originalWorkoutId: null == originalWorkoutId ? _self.originalWorkoutId : originalWorkoutId // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,originalType: null == originalType ? _self.originalType : originalType // ignore: cast_nullable_to_non_nullable
as String,adaptedType: null == adaptedType ? _self.adaptedType : adaptedType // ignore: cast_nullable_to_non_nullable
as String,adaptationType: null == adaptationType ? _self.adaptationType : adaptationType // ignore: cast_nullable_to_non_nullable
as String,originalTargetDistance: null == originalTargetDistance ? _self.originalTargetDistance : originalTargetDistance // ignore: cast_nullable_to_non_nullable
as double,adaptedTargetDistance: freezed == adaptedTargetDistance ? _self.adaptedTargetDistance : adaptedTargetDistance // ignore: cast_nullable_to_non_nullable
as double?,originalTargetDuration: null == originalTargetDuration ? _self.originalTargetDuration : originalTargetDuration // ignore: cast_nullable_to_non_nullable
as int,adaptedTargetDuration: freezed == adaptedTargetDuration ? _self.adaptedTargetDuration : adaptedTargetDuration // ignore: cast_nullable_to_non_nullable
as int?,originalTargetPace: null == originalTargetPace ? _self.originalTargetPace : originalTargetPace // ignore: cast_nullable_to_non_nullable
as double,adaptedTargetPace: freezed == adaptedTargetPace ? _self.adaptedTargetPace : adaptedTargetPace // ignore: cast_nullable_to_non_nullable
as double?,reason: null == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String,readinessScore: null == readinessScore ? _self.readinessScore : readinessScore // ignore: cast_nullable_to_non_nullable
as double,readinessState: null == readinessState ? _self.readinessState : readinessState // ignore: cast_nullable_to_non_nullable
as String,isAccepted: null == isAccepted ? _self.isAccepted : isAccepted // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,syncedAt: freezed == syncedAt ? _self.syncedAt : syncedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AdaptedWorkoutModel].
extension AdaptedWorkoutModelPatterns on AdaptedWorkoutModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AdaptedWorkoutModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AdaptedWorkoutModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AdaptedWorkoutModel value)  $default,){
final _that = this;
switch (_that) {
case _AdaptedWorkoutModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AdaptedWorkoutModel value)?  $default,){
final _that = this;
switch (_that) {
case _AdaptedWorkoutModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String originalWorkoutId,  String date,  String originalType,  String adaptedType,  String adaptationType,  double originalTargetDistance,  double? adaptedTargetDistance,  int originalTargetDuration,  int? adaptedTargetDuration,  double originalTargetPace,  double? adaptedTargetPace,  String reason,  double readinessScore,  String readinessState,  bool isAccepted,  String createdAt,  String? syncedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AdaptedWorkoutModel() when $default != null:
return $default(_that.id,_that.originalWorkoutId,_that.date,_that.originalType,_that.adaptedType,_that.adaptationType,_that.originalTargetDistance,_that.adaptedTargetDistance,_that.originalTargetDuration,_that.adaptedTargetDuration,_that.originalTargetPace,_that.adaptedTargetPace,_that.reason,_that.readinessScore,_that.readinessState,_that.isAccepted,_that.createdAt,_that.syncedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String originalWorkoutId,  String date,  String originalType,  String adaptedType,  String adaptationType,  double originalTargetDistance,  double? adaptedTargetDistance,  int originalTargetDuration,  int? adaptedTargetDuration,  double originalTargetPace,  double? adaptedTargetPace,  String reason,  double readinessScore,  String readinessState,  bool isAccepted,  String createdAt,  String? syncedAt)  $default,) {final _that = this;
switch (_that) {
case _AdaptedWorkoutModel():
return $default(_that.id,_that.originalWorkoutId,_that.date,_that.originalType,_that.adaptedType,_that.adaptationType,_that.originalTargetDistance,_that.adaptedTargetDistance,_that.originalTargetDuration,_that.adaptedTargetDuration,_that.originalTargetPace,_that.adaptedTargetPace,_that.reason,_that.readinessScore,_that.readinessState,_that.isAccepted,_that.createdAt,_that.syncedAt);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String originalWorkoutId,  String date,  String originalType,  String adaptedType,  String adaptationType,  double originalTargetDistance,  double? adaptedTargetDistance,  int originalTargetDuration,  int? adaptedTargetDuration,  double originalTargetPace,  double? adaptedTargetPace,  String reason,  double readinessScore,  String readinessState,  bool isAccepted,  String createdAt,  String? syncedAt)?  $default,) {final _that = this;
switch (_that) {
case _AdaptedWorkoutModel() when $default != null:
return $default(_that.id,_that.originalWorkoutId,_that.date,_that.originalType,_that.adaptedType,_that.adaptationType,_that.originalTargetDistance,_that.adaptedTargetDistance,_that.originalTargetDuration,_that.adaptedTargetDuration,_that.originalTargetPace,_that.adaptedTargetPace,_that.reason,_that.readinessScore,_that.readinessState,_that.isAccepted,_that.createdAt,_that.syncedAt);case _:
  return null;

}
}

}

/// @nodoc


class _AdaptedWorkoutModel extends AdaptedWorkoutModel with DiagnosticableTreeMixin {
  const _AdaptedWorkoutModel({required this.id, required this.originalWorkoutId, required this.date, required this.originalType, required this.adaptedType, required this.adaptationType, required this.originalTargetDistance, this.adaptedTargetDistance, required this.originalTargetDuration, this.adaptedTargetDuration, required this.originalTargetPace, this.adaptedTargetPace, required this.reason, required this.readinessScore, required this.readinessState, required this.isAccepted, required this.createdAt, this.syncedAt}): super._();
  

@override final  String id;
@override final  String originalWorkoutId;
@override final  String date;
@override final  String originalType;
@override final  String adaptedType;
@override final  String adaptationType;
@override final  double originalTargetDistance;
@override final  double? adaptedTargetDistance;
@override final  int originalTargetDuration;
@override final  int? adaptedTargetDuration;
@override final  double originalTargetPace;
@override final  double? adaptedTargetPace;
@override final  String reason;
@override final  double readinessScore;
@override final  String readinessState;
@override final  bool isAccepted;
@override final  String createdAt;
@override final  String? syncedAt;

/// Create a copy of AdaptedWorkoutModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AdaptedWorkoutModelCopyWith<_AdaptedWorkoutModel> get copyWith => __$AdaptedWorkoutModelCopyWithImpl<_AdaptedWorkoutModel>(this, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'AdaptedWorkoutModel'))
    ..add(DiagnosticsProperty('id', id))..add(DiagnosticsProperty('originalWorkoutId', originalWorkoutId))..add(DiagnosticsProperty('date', date))..add(DiagnosticsProperty('originalType', originalType))..add(DiagnosticsProperty('adaptedType', adaptedType))..add(DiagnosticsProperty('adaptationType', adaptationType))..add(DiagnosticsProperty('originalTargetDistance', originalTargetDistance))..add(DiagnosticsProperty('adaptedTargetDistance', adaptedTargetDistance))..add(DiagnosticsProperty('originalTargetDuration', originalTargetDuration))..add(DiagnosticsProperty('adaptedTargetDuration', adaptedTargetDuration))..add(DiagnosticsProperty('originalTargetPace', originalTargetPace))..add(DiagnosticsProperty('adaptedTargetPace', adaptedTargetPace))..add(DiagnosticsProperty('reason', reason))..add(DiagnosticsProperty('readinessScore', readinessScore))..add(DiagnosticsProperty('readinessState', readinessState))..add(DiagnosticsProperty('isAccepted', isAccepted))..add(DiagnosticsProperty('createdAt', createdAt))..add(DiagnosticsProperty('syncedAt', syncedAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AdaptedWorkoutModel&&(identical(other.id, id) || other.id == id)&&(identical(other.originalWorkoutId, originalWorkoutId) || other.originalWorkoutId == originalWorkoutId)&&(identical(other.date, date) || other.date == date)&&(identical(other.originalType, originalType) || other.originalType == originalType)&&(identical(other.adaptedType, adaptedType) || other.adaptedType == adaptedType)&&(identical(other.adaptationType, adaptationType) || other.adaptationType == adaptationType)&&(identical(other.originalTargetDistance, originalTargetDistance) || other.originalTargetDistance == originalTargetDistance)&&(identical(other.adaptedTargetDistance, adaptedTargetDistance) || other.adaptedTargetDistance == adaptedTargetDistance)&&(identical(other.originalTargetDuration, originalTargetDuration) || other.originalTargetDuration == originalTargetDuration)&&(identical(other.adaptedTargetDuration, adaptedTargetDuration) || other.adaptedTargetDuration == adaptedTargetDuration)&&(identical(other.originalTargetPace, originalTargetPace) || other.originalTargetPace == originalTargetPace)&&(identical(other.adaptedTargetPace, adaptedTargetPace) || other.adaptedTargetPace == adaptedTargetPace)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.readinessScore, readinessScore) || other.readinessScore == readinessScore)&&(identical(other.readinessState, readinessState) || other.readinessState == readinessState)&&(identical(other.isAccepted, isAccepted) || other.isAccepted == isAccepted)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.syncedAt, syncedAt) || other.syncedAt == syncedAt));
}


@override
int get hashCode => Object.hash(runtimeType,id,originalWorkoutId,date,originalType,adaptedType,adaptationType,originalTargetDistance,adaptedTargetDistance,originalTargetDuration,adaptedTargetDuration,originalTargetPace,adaptedTargetPace,reason,readinessScore,readinessState,isAccepted,createdAt,syncedAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'AdaptedWorkoutModel(id: $id, originalWorkoutId: $originalWorkoutId, date: $date, originalType: $originalType, adaptedType: $adaptedType, adaptationType: $adaptationType, originalTargetDistance: $originalTargetDistance, adaptedTargetDistance: $adaptedTargetDistance, originalTargetDuration: $originalTargetDuration, adaptedTargetDuration: $adaptedTargetDuration, originalTargetPace: $originalTargetPace, adaptedTargetPace: $adaptedTargetPace, reason: $reason, readinessScore: $readinessScore, readinessState: $readinessState, isAccepted: $isAccepted, createdAt: $createdAt, syncedAt: $syncedAt)';
}


}

/// @nodoc
abstract mixin class _$AdaptedWorkoutModelCopyWith<$Res> implements $AdaptedWorkoutModelCopyWith<$Res> {
  factory _$AdaptedWorkoutModelCopyWith(_AdaptedWorkoutModel value, $Res Function(_AdaptedWorkoutModel) _then) = __$AdaptedWorkoutModelCopyWithImpl;
@override @useResult
$Res call({
 String id, String originalWorkoutId, String date, String originalType, String adaptedType, String adaptationType, double originalTargetDistance, double? adaptedTargetDistance, int originalTargetDuration, int? adaptedTargetDuration, double originalTargetPace, double? adaptedTargetPace, String reason, double readinessScore, String readinessState, bool isAccepted, String createdAt, String? syncedAt
});




}
/// @nodoc
class __$AdaptedWorkoutModelCopyWithImpl<$Res>
    implements _$AdaptedWorkoutModelCopyWith<$Res> {
  __$AdaptedWorkoutModelCopyWithImpl(this._self, this._then);

  final _AdaptedWorkoutModel _self;
  final $Res Function(_AdaptedWorkoutModel) _then;

/// Create a copy of AdaptedWorkoutModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? originalWorkoutId = null,Object? date = null,Object? originalType = null,Object? adaptedType = null,Object? adaptationType = null,Object? originalTargetDistance = null,Object? adaptedTargetDistance = freezed,Object? originalTargetDuration = null,Object? adaptedTargetDuration = freezed,Object? originalTargetPace = null,Object? adaptedTargetPace = freezed,Object? reason = null,Object? readinessScore = null,Object? readinessState = null,Object? isAccepted = null,Object? createdAt = null,Object? syncedAt = freezed,}) {
  return _then(_AdaptedWorkoutModel(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,originalWorkoutId: null == originalWorkoutId ? _self.originalWorkoutId : originalWorkoutId // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,originalType: null == originalType ? _self.originalType : originalType // ignore: cast_nullable_to_non_nullable
as String,adaptedType: null == adaptedType ? _self.adaptedType : adaptedType // ignore: cast_nullable_to_non_nullable
as String,adaptationType: null == adaptationType ? _self.adaptationType : adaptationType // ignore: cast_nullable_to_non_nullable
as String,originalTargetDistance: null == originalTargetDistance ? _self.originalTargetDistance : originalTargetDistance // ignore: cast_nullable_to_non_nullable
as double,adaptedTargetDistance: freezed == adaptedTargetDistance ? _self.adaptedTargetDistance : adaptedTargetDistance // ignore: cast_nullable_to_non_nullable
as double?,originalTargetDuration: null == originalTargetDuration ? _self.originalTargetDuration : originalTargetDuration // ignore: cast_nullable_to_non_nullable
as int,adaptedTargetDuration: freezed == adaptedTargetDuration ? _self.adaptedTargetDuration : adaptedTargetDuration // ignore: cast_nullable_to_non_nullable
as int?,originalTargetPace: null == originalTargetPace ? _self.originalTargetPace : originalTargetPace // ignore: cast_nullable_to_non_nullable
as double,adaptedTargetPace: freezed == adaptedTargetPace ? _self.adaptedTargetPace : adaptedTargetPace // ignore: cast_nullable_to_non_nullable
as double?,reason: null == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as String,readinessScore: null == readinessScore ? _self.readinessScore : readinessScore // ignore: cast_nullable_to_non_nullable
as double,readinessState: null == readinessState ? _self.readinessState : readinessState // ignore: cast_nullable_to_non_nullable
as String,isAccepted: null == isAccepted ? _self.isAccepted : isAccepted // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,syncedAt: freezed == syncedAt ? _self.syncedAt : syncedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

/// @nodoc
mixin _$WeeklyReconciliationRecordModel implements DiagnosticableTreeMixin {

 String get weekStartDate; double get plannedLoad; double get actualLoad; double get adaptedLoad; double get deficitPercent; double get surplusPercent; String? get adjustmentDescription; bool get isApplied; int? get raceWeeksRemaining; bool get requiresReview; String get createdAt; String? get syncedAt;
/// Create a copy of WeeklyReconciliationRecordModel
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeeklyReconciliationRecordModelCopyWith<WeeklyReconciliationRecordModel> get copyWith => _$WeeklyReconciliationRecordModelCopyWithImpl<WeeklyReconciliationRecordModel>(this as WeeklyReconciliationRecordModel, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'WeeklyReconciliationRecordModel'))
    ..add(DiagnosticsProperty('weekStartDate', weekStartDate))..add(DiagnosticsProperty('plannedLoad', plannedLoad))..add(DiagnosticsProperty('actualLoad', actualLoad))..add(DiagnosticsProperty('adaptedLoad', adaptedLoad))..add(DiagnosticsProperty('deficitPercent', deficitPercent))..add(DiagnosticsProperty('surplusPercent', surplusPercent))..add(DiagnosticsProperty('adjustmentDescription', adjustmentDescription))..add(DiagnosticsProperty('isApplied', isApplied))..add(DiagnosticsProperty('raceWeeksRemaining', raceWeeksRemaining))..add(DiagnosticsProperty('requiresReview', requiresReview))..add(DiagnosticsProperty('createdAt', createdAt))..add(DiagnosticsProperty('syncedAt', syncedAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeeklyReconciliationRecordModel&&(identical(other.weekStartDate, weekStartDate) || other.weekStartDate == weekStartDate)&&(identical(other.plannedLoad, plannedLoad) || other.plannedLoad == plannedLoad)&&(identical(other.actualLoad, actualLoad) || other.actualLoad == actualLoad)&&(identical(other.adaptedLoad, adaptedLoad) || other.adaptedLoad == adaptedLoad)&&(identical(other.deficitPercent, deficitPercent) || other.deficitPercent == deficitPercent)&&(identical(other.surplusPercent, surplusPercent) || other.surplusPercent == surplusPercent)&&(identical(other.adjustmentDescription, adjustmentDescription) || other.adjustmentDescription == adjustmentDescription)&&(identical(other.isApplied, isApplied) || other.isApplied == isApplied)&&(identical(other.raceWeeksRemaining, raceWeeksRemaining) || other.raceWeeksRemaining == raceWeeksRemaining)&&(identical(other.requiresReview, requiresReview) || other.requiresReview == requiresReview)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.syncedAt, syncedAt) || other.syncedAt == syncedAt));
}


@override
int get hashCode => Object.hash(runtimeType,weekStartDate,plannedLoad,actualLoad,adaptedLoad,deficitPercent,surplusPercent,adjustmentDescription,isApplied,raceWeeksRemaining,requiresReview,createdAt,syncedAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'WeeklyReconciliationRecordModel(weekStartDate: $weekStartDate, plannedLoad: $plannedLoad, actualLoad: $actualLoad, adaptedLoad: $adaptedLoad, deficitPercent: $deficitPercent, surplusPercent: $surplusPercent, adjustmentDescription: $adjustmentDescription, isApplied: $isApplied, raceWeeksRemaining: $raceWeeksRemaining, requiresReview: $requiresReview, createdAt: $createdAt, syncedAt: $syncedAt)';
}


}

/// @nodoc
abstract mixin class $WeeklyReconciliationRecordModelCopyWith<$Res>  {
  factory $WeeklyReconciliationRecordModelCopyWith(WeeklyReconciliationRecordModel value, $Res Function(WeeklyReconciliationRecordModel) _then) = _$WeeklyReconciliationRecordModelCopyWithImpl;
@useResult
$Res call({
 String weekStartDate, double plannedLoad, double actualLoad, double adaptedLoad, double deficitPercent, double surplusPercent, String? adjustmentDescription, bool isApplied, int? raceWeeksRemaining, bool requiresReview, String createdAt, String? syncedAt
});




}
/// @nodoc
class _$WeeklyReconciliationRecordModelCopyWithImpl<$Res>
    implements $WeeklyReconciliationRecordModelCopyWith<$Res> {
  _$WeeklyReconciliationRecordModelCopyWithImpl(this._self, this._then);

  final WeeklyReconciliationRecordModel _self;
  final $Res Function(WeeklyReconciliationRecordModel) _then;

/// Create a copy of WeeklyReconciliationRecordModel
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? weekStartDate = null,Object? plannedLoad = null,Object? actualLoad = null,Object? adaptedLoad = null,Object? deficitPercent = null,Object? surplusPercent = null,Object? adjustmentDescription = freezed,Object? isApplied = null,Object? raceWeeksRemaining = freezed,Object? requiresReview = null,Object? createdAt = null,Object? syncedAt = freezed,}) {
  return _then(_self.copyWith(
weekStartDate: null == weekStartDate ? _self.weekStartDate : weekStartDate // ignore: cast_nullable_to_non_nullable
as String,plannedLoad: null == plannedLoad ? _self.plannedLoad : plannedLoad // ignore: cast_nullable_to_non_nullable
as double,actualLoad: null == actualLoad ? _self.actualLoad : actualLoad // ignore: cast_nullable_to_non_nullable
as double,adaptedLoad: null == adaptedLoad ? _self.adaptedLoad : adaptedLoad // ignore: cast_nullable_to_non_nullable
as double,deficitPercent: null == deficitPercent ? _self.deficitPercent : deficitPercent // ignore: cast_nullable_to_non_nullable
as double,surplusPercent: null == surplusPercent ? _self.surplusPercent : surplusPercent // ignore: cast_nullable_to_non_nullable
as double,adjustmentDescription: freezed == adjustmentDescription ? _self.adjustmentDescription : adjustmentDescription // ignore: cast_nullable_to_non_nullable
as String?,isApplied: null == isApplied ? _self.isApplied : isApplied // ignore: cast_nullable_to_non_nullable
as bool,raceWeeksRemaining: freezed == raceWeeksRemaining ? _self.raceWeeksRemaining : raceWeeksRemaining // ignore: cast_nullable_to_non_nullable
as int?,requiresReview: null == requiresReview ? _self.requiresReview : requiresReview // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,syncedAt: freezed == syncedAt ? _self.syncedAt : syncedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [WeeklyReconciliationRecordModel].
extension WeeklyReconciliationRecordModelPatterns on WeeklyReconciliationRecordModel {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeeklyReconciliationRecordModel value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeeklyReconciliationRecordModel() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeeklyReconciliationRecordModel value)  $default,){
final _that = this;
switch (_that) {
case _WeeklyReconciliationRecordModel():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeeklyReconciliationRecordModel value)?  $default,){
final _that = this;
switch (_that) {
case _WeeklyReconciliationRecordModel() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String weekStartDate,  double plannedLoad,  double actualLoad,  double adaptedLoad,  double deficitPercent,  double surplusPercent,  String? adjustmentDescription,  bool isApplied,  int? raceWeeksRemaining,  bool requiresReview,  String createdAt,  String? syncedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeeklyReconciliationRecordModel() when $default != null:
return $default(_that.weekStartDate,_that.plannedLoad,_that.actualLoad,_that.adaptedLoad,_that.deficitPercent,_that.surplusPercent,_that.adjustmentDescription,_that.isApplied,_that.raceWeeksRemaining,_that.requiresReview,_that.createdAt,_that.syncedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String weekStartDate,  double plannedLoad,  double actualLoad,  double adaptedLoad,  double deficitPercent,  double surplusPercent,  String? adjustmentDescription,  bool isApplied,  int? raceWeeksRemaining,  bool requiresReview,  String createdAt,  String? syncedAt)  $default,) {final _that = this;
switch (_that) {
case _WeeklyReconciliationRecordModel():
return $default(_that.weekStartDate,_that.plannedLoad,_that.actualLoad,_that.adaptedLoad,_that.deficitPercent,_that.surplusPercent,_that.adjustmentDescription,_that.isApplied,_that.raceWeeksRemaining,_that.requiresReview,_that.createdAt,_that.syncedAt);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String weekStartDate,  double plannedLoad,  double actualLoad,  double adaptedLoad,  double deficitPercent,  double surplusPercent,  String? adjustmentDescription,  bool isApplied,  int? raceWeeksRemaining,  bool requiresReview,  String createdAt,  String? syncedAt)?  $default,) {final _that = this;
switch (_that) {
case _WeeklyReconciliationRecordModel() when $default != null:
return $default(_that.weekStartDate,_that.plannedLoad,_that.actualLoad,_that.adaptedLoad,_that.deficitPercent,_that.surplusPercent,_that.adjustmentDescription,_that.isApplied,_that.raceWeeksRemaining,_that.requiresReview,_that.createdAt,_that.syncedAt);case _:
  return null;

}
}

}

/// @nodoc


class _WeeklyReconciliationRecordModel extends WeeklyReconciliationRecordModel with DiagnosticableTreeMixin {
  const _WeeklyReconciliationRecordModel({required this.weekStartDate, this.plannedLoad = 0, this.actualLoad = 0, this.adaptedLoad = 0, this.deficitPercent = 0, this.surplusPercent = 0, this.adjustmentDescription, this.isApplied = false, this.raceWeeksRemaining, this.requiresReview = false, required this.createdAt, this.syncedAt}): super._();
  

@override final  String weekStartDate;
@override@JsonKey() final  double plannedLoad;
@override@JsonKey() final  double actualLoad;
@override@JsonKey() final  double adaptedLoad;
@override@JsonKey() final  double deficitPercent;
@override@JsonKey() final  double surplusPercent;
@override final  String? adjustmentDescription;
@override@JsonKey() final  bool isApplied;
@override final  int? raceWeeksRemaining;
@override@JsonKey() final  bool requiresReview;
@override final  String createdAt;
@override final  String? syncedAt;

/// Create a copy of WeeklyReconciliationRecordModel
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeeklyReconciliationRecordModelCopyWith<_WeeklyReconciliationRecordModel> get copyWith => __$WeeklyReconciliationRecordModelCopyWithImpl<_WeeklyReconciliationRecordModel>(this, _$identity);


@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'WeeklyReconciliationRecordModel'))
    ..add(DiagnosticsProperty('weekStartDate', weekStartDate))..add(DiagnosticsProperty('plannedLoad', plannedLoad))..add(DiagnosticsProperty('actualLoad', actualLoad))..add(DiagnosticsProperty('adaptedLoad', adaptedLoad))..add(DiagnosticsProperty('deficitPercent', deficitPercent))..add(DiagnosticsProperty('surplusPercent', surplusPercent))..add(DiagnosticsProperty('adjustmentDescription', adjustmentDescription))..add(DiagnosticsProperty('isApplied', isApplied))..add(DiagnosticsProperty('raceWeeksRemaining', raceWeeksRemaining))..add(DiagnosticsProperty('requiresReview', requiresReview))..add(DiagnosticsProperty('createdAt', createdAt))..add(DiagnosticsProperty('syncedAt', syncedAt));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeeklyReconciliationRecordModel&&(identical(other.weekStartDate, weekStartDate) || other.weekStartDate == weekStartDate)&&(identical(other.plannedLoad, plannedLoad) || other.plannedLoad == plannedLoad)&&(identical(other.actualLoad, actualLoad) || other.actualLoad == actualLoad)&&(identical(other.adaptedLoad, adaptedLoad) || other.adaptedLoad == adaptedLoad)&&(identical(other.deficitPercent, deficitPercent) || other.deficitPercent == deficitPercent)&&(identical(other.surplusPercent, surplusPercent) || other.surplusPercent == surplusPercent)&&(identical(other.adjustmentDescription, adjustmentDescription) || other.adjustmentDescription == adjustmentDescription)&&(identical(other.isApplied, isApplied) || other.isApplied == isApplied)&&(identical(other.raceWeeksRemaining, raceWeeksRemaining) || other.raceWeeksRemaining == raceWeeksRemaining)&&(identical(other.requiresReview, requiresReview) || other.requiresReview == requiresReview)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.syncedAt, syncedAt) || other.syncedAt == syncedAt));
}


@override
int get hashCode => Object.hash(runtimeType,weekStartDate,plannedLoad,actualLoad,adaptedLoad,deficitPercent,surplusPercent,adjustmentDescription,isApplied,raceWeeksRemaining,requiresReview,createdAt,syncedAt);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'WeeklyReconciliationRecordModel(weekStartDate: $weekStartDate, plannedLoad: $plannedLoad, actualLoad: $actualLoad, adaptedLoad: $adaptedLoad, deficitPercent: $deficitPercent, surplusPercent: $surplusPercent, adjustmentDescription: $adjustmentDescription, isApplied: $isApplied, raceWeeksRemaining: $raceWeeksRemaining, requiresReview: $requiresReview, createdAt: $createdAt, syncedAt: $syncedAt)';
}


}

/// @nodoc
abstract mixin class _$WeeklyReconciliationRecordModelCopyWith<$Res> implements $WeeklyReconciliationRecordModelCopyWith<$Res> {
  factory _$WeeklyReconciliationRecordModelCopyWith(_WeeklyReconciliationRecordModel value, $Res Function(_WeeklyReconciliationRecordModel) _then) = __$WeeklyReconciliationRecordModelCopyWithImpl;
@override @useResult
$Res call({
 String weekStartDate, double plannedLoad, double actualLoad, double adaptedLoad, double deficitPercent, double surplusPercent, String? adjustmentDescription, bool isApplied, int? raceWeeksRemaining, bool requiresReview, String createdAt, String? syncedAt
});




}
/// @nodoc
class __$WeeklyReconciliationRecordModelCopyWithImpl<$Res>
    implements _$WeeklyReconciliationRecordModelCopyWith<$Res> {
  __$WeeklyReconciliationRecordModelCopyWithImpl(this._self, this._then);

  final _WeeklyReconciliationRecordModel _self;
  final $Res Function(_WeeklyReconciliationRecordModel) _then;

/// Create a copy of WeeklyReconciliationRecordModel
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? weekStartDate = null,Object? plannedLoad = null,Object? actualLoad = null,Object? adaptedLoad = null,Object? deficitPercent = null,Object? surplusPercent = null,Object? adjustmentDescription = freezed,Object? isApplied = null,Object? raceWeeksRemaining = freezed,Object? requiresReview = null,Object? createdAt = null,Object? syncedAt = freezed,}) {
  return _then(_WeeklyReconciliationRecordModel(
weekStartDate: null == weekStartDate ? _self.weekStartDate : weekStartDate // ignore: cast_nullable_to_non_nullable
as String,plannedLoad: null == plannedLoad ? _self.plannedLoad : plannedLoad // ignore: cast_nullable_to_non_nullable
as double,actualLoad: null == actualLoad ? _self.actualLoad : actualLoad // ignore: cast_nullable_to_non_nullable
as double,adaptedLoad: null == adaptedLoad ? _self.adaptedLoad : adaptedLoad // ignore: cast_nullable_to_non_nullable
as double,deficitPercent: null == deficitPercent ? _self.deficitPercent : deficitPercent // ignore: cast_nullable_to_non_nullable
as double,surplusPercent: null == surplusPercent ? _self.surplusPercent : surplusPercent // ignore: cast_nullable_to_non_nullable
as double,adjustmentDescription: freezed == adjustmentDescription ? _self.adjustmentDescription : adjustmentDescription // ignore: cast_nullable_to_non_nullable
as String?,isApplied: null == isApplied ? _self.isApplied : isApplied // ignore: cast_nullable_to_non_nullable
as bool,raceWeeksRemaining: freezed == raceWeeksRemaining ? _self.raceWeeksRemaining : raceWeeksRemaining // ignore: cast_nullable_to_non_nullable
as int?,requiresReview: null == requiresReview ? _self.requiresReview : requiresReview // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,syncedAt: freezed == syncedAt ? _self.syncedAt : syncedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
