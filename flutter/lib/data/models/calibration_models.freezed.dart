// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'calibration_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$CalibrationState {

 CalibrationMode get mode; CalibrationRaceType get raceType; bool get isCustomDistance; String get customDistanceMeters; String get hours; String get minutes; String get seconds; String get manualFactor; String get selectedActivityId; bool get isSubmitting; String get error;
/// Create a copy of CalibrationState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CalibrationStateCopyWith<CalibrationState> get copyWith => _$CalibrationStateCopyWithImpl<CalibrationState>(this as CalibrationState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CalibrationState&&(identical(other.mode, mode) || other.mode == mode)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.isCustomDistance, isCustomDistance) || other.isCustomDistance == isCustomDistance)&&(identical(other.customDistanceMeters, customDistanceMeters) || other.customDistanceMeters == customDistanceMeters)&&(identical(other.hours, hours) || other.hours == hours)&&(identical(other.minutes, minutes) || other.minutes == minutes)&&(identical(other.seconds, seconds) || other.seconds == seconds)&&(identical(other.manualFactor, manualFactor) || other.manualFactor == manualFactor)&&(identical(other.selectedActivityId, selectedActivityId) || other.selectedActivityId == selectedActivityId)&&(identical(other.isSubmitting, isSubmitting) || other.isSubmitting == isSubmitting)&&(identical(other.error, error) || other.error == error));
}


@override
int get hashCode => Object.hash(runtimeType,mode,raceType,isCustomDistance,customDistanceMeters,hours,minutes,seconds,manualFactor,selectedActivityId,isSubmitting,error);

@override
String toString() {
  return 'CalibrationState(mode: $mode, raceType: $raceType, isCustomDistance: $isCustomDistance, customDistanceMeters: $customDistanceMeters, hours: $hours, minutes: $minutes, seconds: $seconds, manualFactor: $manualFactor, selectedActivityId: $selectedActivityId, isSubmitting: $isSubmitting, error: $error)';
}


}

/// @nodoc
abstract mixin class $CalibrationStateCopyWith<$Res>  {
  factory $CalibrationStateCopyWith(CalibrationState value, $Res Function(CalibrationState) _then) = _$CalibrationStateCopyWithImpl;
@useResult
$Res call({
 CalibrationMode mode, CalibrationRaceType raceType, bool isCustomDistance, String customDistanceMeters, String hours, String minutes, String seconds, String manualFactor, String selectedActivityId, bool isSubmitting, String error
});




}
/// @nodoc
class _$CalibrationStateCopyWithImpl<$Res>
    implements $CalibrationStateCopyWith<$Res> {
  _$CalibrationStateCopyWithImpl(this._self, this._then);

  final CalibrationState _self;
  final $Res Function(CalibrationState) _then;

/// Create a copy of CalibrationState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? mode = null,Object? raceType = null,Object? isCustomDistance = null,Object? customDistanceMeters = null,Object? hours = null,Object? minutes = null,Object? seconds = null,Object? manualFactor = null,Object? selectedActivityId = null,Object? isSubmitting = null,Object? error = null,}) {
  return _then(_self.copyWith(
mode: null == mode ? _self.mode : mode // ignore: cast_nullable_to_non_nullable
as CalibrationMode,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as CalibrationRaceType,isCustomDistance: null == isCustomDistance ? _self.isCustomDistance : isCustomDistance // ignore: cast_nullable_to_non_nullable
as bool,customDistanceMeters: null == customDistanceMeters ? _self.customDistanceMeters : customDistanceMeters // ignore: cast_nullable_to_non_nullable
as String,hours: null == hours ? _self.hours : hours // ignore: cast_nullable_to_non_nullable
as String,minutes: null == minutes ? _self.minutes : minutes // ignore: cast_nullable_to_non_nullable
as String,seconds: null == seconds ? _self.seconds : seconds // ignore: cast_nullable_to_non_nullable
as String,manualFactor: null == manualFactor ? _self.manualFactor : manualFactor // ignore: cast_nullable_to_non_nullable
as String,selectedActivityId: null == selectedActivityId ? _self.selectedActivityId : selectedActivityId // ignore: cast_nullable_to_non_nullable
as String,isSubmitting: null == isSubmitting ? _self.isSubmitting : isSubmitting // ignore: cast_nullable_to_non_nullable
as bool,error: null == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [CalibrationState].
extension CalibrationStatePatterns on CalibrationState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CalibrationState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CalibrationState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CalibrationState value)  $default,){
final _that = this;
switch (_that) {
case _CalibrationState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CalibrationState value)?  $default,){
final _that = this;
switch (_that) {
case _CalibrationState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( CalibrationMode mode,  CalibrationRaceType raceType,  bool isCustomDistance,  String customDistanceMeters,  String hours,  String minutes,  String seconds,  String manualFactor,  String selectedActivityId,  bool isSubmitting,  String error)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CalibrationState() when $default != null:
return $default(_that.mode,_that.raceType,_that.isCustomDistance,_that.customDistanceMeters,_that.hours,_that.minutes,_that.seconds,_that.manualFactor,_that.selectedActivityId,_that.isSubmitting,_that.error);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( CalibrationMode mode,  CalibrationRaceType raceType,  bool isCustomDistance,  String customDistanceMeters,  String hours,  String minutes,  String seconds,  String manualFactor,  String selectedActivityId,  bool isSubmitting,  String error)  $default,) {final _that = this;
switch (_that) {
case _CalibrationState():
return $default(_that.mode,_that.raceType,_that.isCustomDistance,_that.customDistanceMeters,_that.hours,_that.minutes,_that.seconds,_that.manualFactor,_that.selectedActivityId,_that.isSubmitting,_that.error);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( CalibrationMode mode,  CalibrationRaceType raceType,  bool isCustomDistance,  String customDistanceMeters,  String hours,  String minutes,  String seconds,  String manualFactor,  String selectedActivityId,  bool isSubmitting,  String error)?  $default,) {final _that = this;
switch (_that) {
case _CalibrationState() when $default != null:
return $default(_that.mode,_that.raceType,_that.isCustomDistance,_that.customDistanceMeters,_that.hours,_that.minutes,_that.seconds,_that.manualFactor,_that.selectedActivityId,_that.isSubmitting,_that.error);case _:
  return null;

}
}

}

/// @nodoc


class _CalibrationState extends CalibrationState {
  const _CalibrationState({this.mode = CalibrationMode.vdotCorrection, this.raceType = CalibrationRaceType.fiveK, this.isCustomDistance = false, this.customDistanceMeters = '', this.hours = '', this.minutes = '', this.seconds = '', this.manualFactor = '', this.selectedActivityId = '', this.isSubmitting = false, this.error = ''}): super._();
  

@override@JsonKey() final  CalibrationMode mode;
@override@JsonKey() final  CalibrationRaceType raceType;
@override@JsonKey() final  bool isCustomDistance;
@override@JsonKey() final  String customDistanceMeters;
@override@JsonKey() final  String hours;
@override@JsonKey() final  String minutes;
@override@JsonKey() final  String seconds;
@override@JsonKey() final  String manualFactor;
@override@JsonKey() final  String selectedActivityId;
@override@JsonKey() final  bool isSubmitting;
@override@JsonKey() final  String error;

/// Create a copy of CalibrationState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CalibrationStateCopyWith<_CalibrationState> get copyWith => __$CalibrationStateCopyWithImpl<_CalibrationState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CalibrationState&&(identical(other.mode, mode) || other.mode == mode)&&(identical(other.raceType, raceType) || other.raceType == raceType)&&(identical(other.isCustomDistance, isCustomDistance) || other.isCustomDistance == isCustomDistance)&&(identical(other.customDistanceMeters, customDistanceMeters) || other.customDistanceMeters == customDistanceMeters)&&(identical(other.hours, hours) || other.hours == hours)&&(identical(other.minutes, minutes) || other.minutes == minutes)&&(identical(other.seconds, seconds) || other.seconds == seconds)&&(identical(other.manualFactor, manualFactor) || other.manualFactor == manualFactor)&&(identical(other.selectedActivityId, selectedActivityId) || other.selectedActivityId == selectedActivityId)&&(identical(other.isSubmitting, isSubmitting) || other.isSubmitting == isSubmitting)&&(identical(other.error, error) || other.error == error));
}


@override
int get hashCode => Object.hash(runtimeType,mode,raceType,isCustomDistance,customDistanceMeters,hours,minutes,seconds,manualFactor,selectedActivityId,isSubmitting,error);

@override
String toString() {
  return 'CalibrationState(mode: $mode, raceType: $raceType, isCustomDistance: $isCustomDistance, customDistanceMeters: $customDistanceMeters, hours: $hours, minutes: $minutes, seconds: $seconds, manualFactor: $manualFactor, selectedActivityId: $selectedActivityId, isSubmitting: $isSubmitting, error: $error)';
}


}

/// @nodoc
abstract mixin class _$CalibrationStateCopyWith<$Res> implements $CalibrationStateCopyWith<$Res> {
  factory _$CalibrationStateCopyWith(_CalibrationState value, $Res Function(_CalibrationState) _then) = __$CalibrationStateCopyWithImpl;
@override @useResult
$Res call({
 CalibrationMode mode, CalibrationRaceType raceType, bool isCustomDistance, String customDistanceMeters, String hours, String minutes, String seconds, String manualFactor, String selectedActivityId, bool isSubmitting, String error
});




}
/// @nodoc
class __$CalibrationStateCopyWithImpl<$Res>
    implements _$CalibrationStateCopyWith<$Res> {
  __$CalibrationStateCopyWithImpl(this._self, this._then);

  final _CalibrationState _self;
  final $Res Function(_CalibrationState) _then;

/// Create a copy of CalibrationState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? mode = null,Object? raceType = null,Object? isCustomDistance = null,Object? customDistanceMeters = null,Object? hours = null,Object? minutes = null,Object? seconds = null,Object? manualFactor = null,Object? selectedActivityId = null,Object? isSubmitting = null,Object? error = null,}) {
  return _then(_CalibrationState(
mode: null == mode ? _self.mode : mode // ignore: cast_nullable_to_non_nullable
as CalibrationMode,raceType: null == raceType ? _self.raceType : raceType // ignore: cast_nullable_to_non_nullable
as CalibrationRaceType,isCustomDistance: null == isCustomDistance ? _self.isCustomDistance : isCustomDistance // ignore: cast_nullable_to_non_nullable
as bool,customDistanceMeters: null == customDistanceMeters ? _self.customDistanceMeters : customDistanceMeters // ignore: cast_nullable_to_non_nullable
as String,hours: null == hours ? _self.hours : hours // ignore: cast_nullable_to_non_nullable
as String,minutes: null == minutes ? _self.minutes : minutes // ignore: cast_nullable_to_non_nullable
as String,seconds: null == seconds ? _self.seconds : seconds // ignore: cast_nullable_to_non_nullable
as String,manualFactor: null == manualFactor ? _self.manualFactor : manualFactor // ignore: cast_nullable_to_non_nullable
as String,selectedActivityId: null == selectedActivityId ? _self.selectedActivityId : selectedActivityId // ignore: cast_nullable_to_non_nullable
as String,isSubmitting: null == isSubmitting ? _self.isSubmitting : isSubmitting // ignore: cast_nullable_to_non_nullable
as bool,error: null == error ? _self.error : error // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$CalibrationResult {

 double get impliedVdot; double get baseVdot; double get newFactor; bool get isValid;
/// Create a copy of CalibrationResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CalibrationResultCopyWith<CalibrationResult> get copyWith => _$CalibrationResultCopyWithImpl<CalibrationResult>(this as CalibrationResult, _$identity);

  /// Serializes this CalibrationResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CalibrationResult&&(identical(other.impliedVdot, impliedVdot) || other.impliedVdot == impliedVdot)&&(identical(other.baseVdot, baseVdot) || other.baseVdot == baseVdot)&&(identical(other.newFactor, newFactor) || other.newFactor == newFactor)&&(identical(other.isValid, isValid) || other.isValid == isValid));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,impliedVdot,baseVdot,newFactor,isValid);

@override
String toString() {
  return 'CalibrationResult(impliedVdot: $impliedVdot, baseVdot: $baseVdot, newFactor: $newFactor, isValid: $isValid)';
}


}

/// @nodoc
abstract mixin class $CalibrationResultCopyWith<$Res>  {
  factory $CalibrationResultCopyWith(CalibrationResult value, $Res Function(CalibrationResult) _then) = _$CalibrationResultCopyWithImpl;
@useResult
$Res call({
 double impliedVdot, double baseVdot, double newFactor, bool isValid
});




}
/// @nodoc
class _$CalibrationResultCopyWithImpl<$Res>
    implements $CalibrationResultCopyWith<$Res> {
  _$CalibrationResultCopyWithImpl(this._self, this._then);

  final CalibrationResult _self;
  final $Res Function(CalibrationResult) _then;

/// Create a copy of CalibrationResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? impliedVdot = null,Object? baseVdot = null,Object? newFactor = null,Object? isValid = null,}) {
  return _then(_self.copyWith(
impliedVdot: null == impliedVdot ? _self.impliedVdot : impliedVdot // ignore: cast_nullable_to_non_nullable
as double,baseVdot: null == baseVdot ? _self.baseVdot : baseVdot // ignore: cast_nullable_to_non_nullable
as double,newFactor: null == newFactor ? _self.newFactor : newFactor // ignore: cast_nullable_to_non_nullable
as double,isValid: null == isValid ? _self.isValid : isValid // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [CalibrationResult].
extension CalibrationResultPatterns on CalibrationResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CalibrationResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CalibrationResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CalibrationResult value)  $default,){
final _that = this;
switch (_that) {
case _CalibrationResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CalibrationResult value)?  $default,){
final _that = this;
switch (_that) {
case _CalibrationResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double impliedVdot,  double baseVdot,  double newFactor,  bool isValid)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CalibrationResult() when $default != null:
return $default(_that.impliedVdot,_that.baseVdot,_that.newFactor,_that.isValid);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double impliedVdot,  double baseVdot,  double newFactor,  bool isValid)  $default,) {final _that = this;
switch (_that) {
case _CalibrationResult():
return $default(_that.impliedVdot,_that.baseVdot,_that.newFactor,_that.isValid);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double impliedVdot,  double baseVdot,  double newFactor,  bool isValid)?  $default,) {final _that = this;
switch (_that) {
case _CalibrationResult() when $default != null:
return $default(_that.impliedVdot,_that.baseVdot,_that.newFactor,_that.isValid);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CalibrationResult extends CalibrationResult {
  const _CalibrationResult({required this.impliedVdot, required this.baseVdot, required this.newFactor, required this.isValid}): super._();
  factory _CalibrationResult.fromJson(Map<String, dynamic> json) => _$CalibrationResultFromJson(json);

@override final  double impliedVdot;
@override final  double baseVdot;
@override final  double newFactor;
@override final  bool isValid;

/// Create a copy of CalibrationResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CalibrationResultCopyWith<_CalibrationResult> get copyWith => __$CalibrationResultCopyWithImpl<_CalibrationResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CalibrationResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CalibrationResult&&(identical(other.impliedVdot, impliedVdot) || other.impliedVdot == impliedVdot)&&(identical(other.baseVdot, baseVdot) || other.baseVdot == baseVdot)&&(identical(other.newFactor, newFactor) || other.newFactor == newFactor)&&(identical(other.isValid, isValid) || other.isValid == isValid));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,impliedVdot,baseVdot,newFactor,isValid);

@override
String toString() {
  return 'CalibrationResult(impliedVdot: $impliedVdot, baseVdot: $baseVdot, newFactor: $newFactor, isValid: $isValid)';
}


}

/// @nodoc
abstract mixin class _$CalibrationResultCopyWith<$Res> implements $CalibrationResultCopyWith<$Res> {
  factory _$CalibrationResultCopyWith(_CalibrationResult value, $Res Function(_CalibrationResult) _then) = __$CalibrationResultCopyWithImpl;
@override @useResult
$Res call({
 double impliedVdot, double baseVdot, double newFactor, bool isValid
});




}
/// @nodoc
class __$CalibrationResultCopyWithImpl<$Res>
    implements _$CalibrationResultCopyWith<$Res> {
  __$CalibrationResultCopyWithImpl(this._self, this._then);

  final _CalibrationResult _self;
  final $Res Function(_CalibrationResult) _then;

/// Create a copy of CalibrationResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? impliedVdot = null,Object? baseVdot = null,Object? newFactor = null,Object? isValid = null,}) {
  return _then(_CalibrationResult(
impliedVdot: null == impliedVdot ? _self.impliedVdot : impliedVdot // ignore: cast_nullable_to_non_nullable
as double,baseVdot: null == baseVdot ? _self.baseVdot : baseVdot // ignore: cast_nullable_to_non_nullable
as double,newFactor: null == newFactor ? _self.newFactor : newFactor // ignore: cast_nullable_to_non_nullable
as double,isValid: null == isValid ? _self.isValid : isValid // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$ShapeCalibrationResult {

 double get factor; int get actualSeconds; int get optimalSeconds; int get basePredictedSeconds; bool get isValid;
/// Create a copy of ShapeCalibrationResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShapeCalibrationResultCopyWith<ShapeCalibrationResult> get copyWith => _$ShapeCalibrationResultCopyWithImpl<ShapeCalibrationResult>(this as ShapeCalibrationResult, _$identity);

  /// Serializes this ShapeCalibrationResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ShapeCalibrationResult&&(identical(other.factor, factor) || other.factor == factor)&&(identical(other.actualSeconds, actualSeconds) || other.actualSeconds == actualSeconds)&&(identical(other.optimalSeconds, optimalSeconds) || other.optimalSeconds == optimalSeconds)&&(identical(other.basePredictedSeconds, basePredictedSeconds) || other.basePredictedSeconds == basePredictedSeconds)&&(identical(other.isValid, isValid) || other.isValid == isValid));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,factor,actualSeconds,optimalSeconds,basePredictedSeconds,isValid);

@override
String toString() {
  return 'ShapeCalibrationResult(factor: $factor, actualSeconds: $actualSeconds, optimalSeconds: $optimalSeconds, basePredictedSeconds: $basePredictedSeconds, isValid: $isValid)';
}


}

/// @nodoc
abstract mixin class $ShapeCalibrationResultCopyWith<$Res>  {
  factory $ShapeCalibrationResultCopyWith(ShapeCalibrationResult value, $Res Function(ShapeCalibrationResult) _then) = _$ShapeCalibrationResultCopyWithImpl;
@useResult
$Res call({
 double factor, int actualSeconds, int optimalSeconds, int basePredictedSeconds, bool isValid
});




}
/// @nodoc
class _$ShapeCalibrationResultCopyWithImpl<$Res>
    implements $ShapeCalibrationResultCopyWith<$Res> {
  _$ShapeCalibrationResultCopyWithImpl(this._self, this._then);

  final ShapeCalibrationResult _self;
  final $Res Function(ShapeCalibrationResult) _then;

/// Create a copy of ShapeCalibrationResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? factor = null,Object? actualSeconds = null,Object? optimalSeconds = null,Object? basePredictedSeconds = null,Object? isValid = null,}) {
  return _then(_self.copyWith(
factor: null == factor ? _self.factor : factor // ignore: cast_nullable_to_non_nullable
as double,actualSeconds: null == actualSeconds ? _self.actualSeconds : actualSeconds // ignore: cast_nullable_to_non_nullable
as int,optimalSeconds: null == optimalSeconds ? _self.optimalSeconds : optimalSeconds // ignore: cast_nullable_to_non_nullable
as int,basePredictedSeconds: null == basePredictedSeconds ? _self.basePredictedSeconds : basePredictedSeconds // ignore: cast_nullable_to_non_nullable
as int,isValid: null == isValid ? _self.isValid : isValid // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [ShapeCalibrationResult].
extension ShapeCalibrationResultPatterns on ShapeCalibrationResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ShapeCalibrationResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ShapeCalibrationResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ShapeCalibrationResult value)  $default,){
final _that = this;
switch (_that) {
case _ShapeCalibrationResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ShapeCalibrationResult value)?  $default,){
final _that = this;
switch (_that) {
case _ShapeCalibrationResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double factor,  int actualSeconds,  int optimalSeconds,  int basePredictedSeconds,  bool isValid)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ShapeCalibrationResult() when $default != null:
return $default(_that.factor,_that.actualSeconds,_that.optimalSeconds,_that.basePredictedSeconds,_that.isValid);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double factor,  int actualSeconds,  int optimalSeconds,  int basePredictedSeconds,  bool isValid)  $default,) {final _that = this;
switch (_that) {
case _ShapeCalibrationResult():
return $default(_that.factor,_that.actualSeconds,_that.optimalSeconds,_that.basePredictedSeconds,_that.isValid);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double factor,  int actualSeconds,  int optimalSeconds,  int basePredictedSeconds,  bool isValid)?  $default,) {final _that = this;
switch (_that) {
case _ShapeCalibrationResult() when $default != null:
return $default(_that.factor,_that.actualSeconds,_that.optimalSeconds,_that.basePredictedSeconds,_that.isValid);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ShapeCalibrationResult extends ShapeCalibrationResult {
  const _ShapeCalibrationResult({required this.factor, required this.actualSeconds, required this.optimalSeconds, required this.basePredictedSeconds, required this.isValid}): super._();
  factory _ShapeCalibrationResult.fromJson(Map<String, dynamic> json) => _$ShapeCalibrationResultFromJson(json);

@override final  double factor;
@override final  int actualSeconds;
@override final  int optimalSeconds;
@override final  int basePredictedSeconds;
@override final  bool isValid;

/// Create a copy of ShapeCalibrationResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ShapeCalibrationResultCopyWith<_ShapeCalibrationResult> get copyWith => __$ShapeCalibrationResultCopyWithImpl<_ShapeCalibrationResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ShapeCalibrationResultToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ShapeCalibrationResult&&(identical(other.factor, factor) || other.factor == factor)&&(identical(other.actualSeconds, actualSeconds) || other.actualSeconds == actualSeconds)&&(identical(other.optimalSeconds, optimalSeconds) || other.optimalSeconds == optimalSeconds)&&(identical(other.basePredictedSeconds, basePredictedSeconds) || other.basePredictedSeconds == basePredictedSeconds)&&(identical(other.isValid, isValid) || other.isValid == isValid));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,factor,actualSeconds,optimalSeconds,basePredictedSeconds,isValid);

@override
String toString() {
  return 'ShapeCalibrationResult(factor: $factor, actualSeconds: $actualSeconds, optimalSeconds: $optimalSeconds, basePredictedSeconds: $basePredictedSeconds, isValid: $isValid)';
}


}

/// @nodoc
abstract mixin class _$ShapeCalibrationResultCopyWith<$Res> implements $ShapeCalibrationResultCopyWith<$Res> {
  factory _$ShapeCalibrationResultCopyWith(_ShapeCalibrationResult value, $Res Function(_ShapeCalibrationResult) _then) = __$ShapeCalibrationResultCopyWithImpl;
@override @useResult
$Res call({
 double factor, int actualSeconds, int optimalSeconds, int basePredictedSeconds, bool isValid
});




}
/// @nodoc
class __$ShapeCalibrationResultCopyWithImpl<$Res>
    implements _$ShapeCalibrationResultCopyWith<$Res> {
  __$ShapeCalibrationResultCopyWithImpl(this._self, this._then);

  final _ShapeCalibrationResult _self;
  final $Res Function(_ShapeCalibrationResult) _then;

/// Create a copy of ShapeCalibrationResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? factor = null,Object? actualSeconds = null,Object? optimalSeconds = null,Object? basePredictedSeconds = null,Object? isValid = null,}) {
  return _then(_ShapeCalibrationResult(
factor: null == factor ? _self.factor : factor // ignore: cast_nullable_to_non_nullable
as double,actualSeconds: null == actualSeconds ? _self.actualSeconds : actualSeconds // ignore: cast_nullable_to_non_nullable
as int,optimalSeconds: null == optimalSeconds ? _self.optimalSeconds : optimalSeconds // ignore: cast_nullable_to_non_nullable
as int,basePredictedSeconds: null == basePredictedSeconds ? _self.basePredictedSeconds : basePredictedSeconds // ignore: cast_nullable_to_non_nullable
as int,isValid: null == isValid ? _self.isValid : isValid // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
