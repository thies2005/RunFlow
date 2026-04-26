// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ai_feedback_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$AiActivityFeedback {

 String? get plannedComparison; String? get progressAnalysis; String? get goalTrajectory;
/// Create a copy of AiActivityFeedback
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AiActivityFeedbackCopyWith<AiActivityFeedback> get copyWith => _$AiActivityFeedbackCopyWithImpl<AiActivityFeedback>(this as AiActivityFeedback, _$identity);

  /// Serializes this AiActivityFeedback to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AiActivityFeedback&&(identical(other.plannedComparison, plannedComparison) || other.plannedComparison == plannedComparison)&&(identical(other.progressAnalysis, progressAnalysis) || other.progressAnalysis == progressAnalysis)&&(identical(other.goalTrajectory, goalTrajectory) || other.goalTrajectory == goalTrajectory));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,plannedComparison,progressAnalysis,goalTrajectory);

@override
String toString() {
  return 'AiActivityFeedback(plannedComparison: $plannedComparison, progressAnalysis: $progressAnalysis, goalTrajectory: $goalTrajectory)';
}


}

/// @nodoc
abstract mixin class $AiActivityFeedbackCopyWith<$Res>  {
  factory $AiActivityFeedbackCopyWith(AiActivityFeedback value, $Res Function(AiActivityFeedback) _then) = _$AiActivityFeedbackCopyWithImpl;
@useResult
$Res call({
 String? plannedComparison, String? progressAnalysis, String? goalTrajectory
});




}
/// @nodoc
class _$AiActivityFeedbackCopyWithImpl<$Res>
    implements $AiActivityFeedbackCopyWith<$Res> {
  _$AiActivityFeedbackCopyWithImpl(this._self, this._then);

  final AiActivityFeedback _self;
  final $Res Function(AiActivityFeedback) _then;

/// Create a copy of AiActivityFeedback
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? plannedComparison = freezed,Object? progressAnalysis = freezed,Object? goalTrajectory = freezed,}) {
  return _then(_self.copyWith(
plannedComparison: freezed == plannedComparison ? _self.plannedComparison : plannedComparison // ignore: cast_nullable_to_non_nullable
as String?,progressAnalysis: freezed == progressAnalysis ? _self.progressAnalysis : progressAnalysis // ignore: cast_nullable_to_non_nullable
as String?,goalTrajectory: freezed == goalTrajectory ? _self.goalTrajectory : goalTrajectory // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AiActivityFeedback].
extension AiActivityFeedbackPatterns on AiActivityFeedback {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AiActivityFeedback value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AiActivityFeedback() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AiActivityFeedback value)  $default,){
final _that = this;
switch (_that) {
case _AiActivityFeedback():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AiActivityFeedback value)?  $default,){
final _that = this;
switch (_that) {
case _AiActivityFeedback() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? plannedComparison,  String? progressAnalysis,  String? goalTrajectory)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AiActivityFeedback() when $default != null:
return $default(_that.plannedComparison,_that.progressAnalysis,_that.goalTrajectory);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? plannedComparison,  String? progressAnalysis,  String? goalTrajectory)  $default,) {final _that = this;
switch (_that) {
case _AiActivityFeedback():
return $default(_that.plannedComparison,_that.progressAnalysis,_that.goalTrajectory);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? plannedComparison,  String? progressAnalysis,  String? goalTrajectory)?  $default,) {final _that = this;
switch (_that) {
case _AiActivityFeedback() when $default != null:
return $default(_that.plannedComparison,_that.progressAnalysis,_that.goalTrajectory);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AiActivityFeedback extends AiActivityFeedback {
  const _AiActivityFeedback({this.plannedComparison, this.progressAnalysis, this.goalTrajectory}): super._();
  factory _AiActivityFeedback.fromJson(Map<String, dynamic> json) => _$AiActivityFeedbackFromJson(json);

@override final  String? plannedComparison;
@override final  String? progressAnalysis;
@override final  String? goalTrajectory;

/// Create a copy of AiActivityFeedback
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AiActivityFeedbackCopyWith<_AiActivityFeedback> get copyWith => __$AiActivityFeedbackCopyWithImpl<_AiActivityFeedback>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AiActivityFeedbackToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AiActivityFeedback&&(identical(other.plannedComparison, plannedComparison) || other.plannedComparison == plannedComparison)&&(identical(other.progressAnalysis, progressAnalysis) || other.progressAnalysis == progressAnalysis)&&(identical(other.goalTrajectory, goalTrajectory) || other.goalTrajectory == goalTrajectory));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,plannedComparison,progressAnalysis,goalTrajectory);

@override
String toString() {
  return 'AiActivityFeedback(plannedComparison: $plannedComparison, progressAnalysis: $progressAnalysis, goalTrajectory: $goalTrajectory)';
}


}

/// @nodoc
abstract mixin class _$AiActivityFeedbackCopyWith<$Res> implements $AiActivityFeedbackCopyWith<$Res> {
  factory _$AiActivityFeedbackCopyWith(_AiActivityFeedback value, $Res Function(_AiActivityFeedback) _then) = __$AiActivityFeedbackCopyWithImpl;
@override @useResult
$Res call({
 String? plannedComparison, String? progressAnalysis, String? goalTrajectory
});




}
/// @nodoc
class __$AiActivityFeedbackCopyWithImpl<$Res>
    implements _$AiActivityFeedbackCopyWith<$Res> {
  __$AiActivityFeedbackCopyWithImpl(this._self, this._then);

  final _AiActivityFeedback _self;
  final $Res Function(_AiActivityFeedback) _then;

/// Create a copy of AiActivityFeedback
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? plannedComparison = freezed,Object? progressAnalysis = freezed,Object? goalTrajectory = freezed,}) {
  return _then(_AiActivityFeedback(
plannedComparison: freezed == plannedComparison ? _self.plannedComparison : plannedComparison // ignore: cast_nullable_to_non_nullable
as String?,progressAnalysis: freezed == progressAnalysis ? _self.progressAnalysis : progressAnalysis // ignore: cast_nullable_to_non_nullable
as String?,goalTrajectory: freezed == goalTrajectory ? _self.goalTrajectory : goalTrajectory // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
