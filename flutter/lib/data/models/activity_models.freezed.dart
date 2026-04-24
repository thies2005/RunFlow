// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'activity_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ActivitiesResponse {

 List<Activity> get activities; int get total; int get limit; int get offset; bool get hasMore;
/// Create a copy of ActivitiesResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivitiesResponseCopyWith<ActivitiesResponse> get copyWith => _$ActivitiesResponseCopyWithImpl<ActivitiesResponse>(this as ActivitiesResponse, _$identity);

  /// Serializes this ActivitiesResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActivitiesResponse&&const DeepCollectionEquality().equals(other.activities, activities)&&(identical(other.total, total) || other.total == total)&&(identical(other.limit, limit) || other.limit == limit)&&(identical(other.offset, offset) || other.offset == offset)&&(identical(other.hasMore, hasMore) || other.hasMore == hasMore));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(activities),total,limit,offset,hasMore);

@override
String toString() {
  return 'ActivitiesResponse(activities: $activities, total: $total, limit: $limit, offset: $offset, hasMore: $hasMore)';
}


}

/// @nodoc
abstract mixin class $ActivitiesResponseCopyWith<$Res>  {
  factory $ActivitiesResponseCopyWith(ActivitiesResponse value, $Res Function(ActivitiesResponse) _then) = _$ActivitiesResponseCopyWithImpl;
@useResult
$Res call({
 List<Activity> activities, int total, int limit, int offset, bool hasMore
});




}
/// @nodoc
class _$ActivitiesResponseCopyWithImpl<$Res>
    implements $ActivitiesResponseCopyWith<$Res> {
  _$ActivitiesResponseCopyWithImpl(this._self, this._then);

  final ActivitiesResponse _self;
  final $Res Function(ActivitiesResponse) _then;

/// Create a copy of ActivitiesResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? activities = null,Object? total = null,Object? limit = null,Object? offset = null,Object? hasMore = null,}) {
  return _then(_self.copyWith(
activities: null == activities ? _self.activities : activities // ignore: cast_nullable_to_non_nullable
as List<Activity>,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,limit: null == limit ? _self.limit : limit // ignore: cast_nullable_to_non_nullable
as int,offset: null == offset ? _self.offset : offset // ignore: cast_nullable_to_non_nullable
as int,hasMore: null == hasMore ? _self.hasMore : hasMore // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [ActivitiesResponse].
extension ActivitiesResponsePatterns on ActivitiesResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActivitiesResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActivitiesResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActivitiesResponse value)  $default,){
final _that = this;
switch (_that) {
case _ActivitiesResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActivitiesResponse value)?  $default,){
final _that = this;
switch (_that) {
case _ActivitiesResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Activity> activities,  int total,  int limit,  int offset,  bool hasMore)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActivitiesResponse() when $default != null:
return $default(_that.activities,_that.total,_that.limit,_that.offset,_that.hasMore);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Activity> activities,  int total,  int limit,  int offset,  bool hasMore)  $default,) {final _that = this;
switch (_that) {
case _ActivitiesResponse():
return $default(_that.activities,_that.total,_that.limit,_that.offset,_that.hasMore);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Activity> activities,  int total,  int limit,  int offset,  bool hasMore)?  $default,) {final _that = this;
switch (_that) {
case _ActivitiesResponse() when $default != null:
return $default(_that.activities,_that.total,_that.limit,_that.offset,_that.hasMore);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ActivitiesResponse extends ActivitiesResponse {
  const _ActivitiesResponse({required final  List<Activity> activities, required this.total, required this.limit, required this.offset, required this.hasMore}): _activities = activities,super._();
  factory _ActivitiesResponse.fromJson(Map<String, dynamic> json) => _$ActivitiesResponseFromJson(json);

 final  List<Activity> _activities;
@override List<Activity> get activities {
  if (_activities is EqualUnmodifiableListView) return _activities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_activities);
}

@override final  int total;
@override final  int limit;
@override final  int offset;
@override final  bool hasMore;

/// Create a copy of ActivitiesResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActivitiesResponseCopyWith<_ActivitiesResponse> get copyWith => __$ActivitiesResponseCopyWithImpl<_ActivitiesResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ActivitiesResponseToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActivitiesResponse&&const DeepCollectionEquality().equals(other._activities, _activities)&&(identical(other.total, total) || other.total == total)&&(identical(other.limit, limit) || other.limit == limit)&&(identical(other.offset, offset) || other.offset == offset)&&(identical(other.hasMore, hasMore) || other.hasMore == hasMore));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_activities),total,limit,offset,hasMore);

@override
String toString() {
  return 'ActivitiesResponse(activities: $activities, total: $total, limit: $limit, offset: $offset, hasMore: $hasMore)';
}


}

/// @nodoc
abstract mixin class _$ActivitiesResponseCopyWith<$Res> implements $ActivitiesResponseCopyWith<$Res> {
  factory _$ActivitiesResponseCopyWith(_ActivitiesResponse value, $Res Function(_ActivitiesResponse) _then) = __$ActivitiesResponseCopyWithImpl;
@override @useResult
$Res call({
 List<Activity> activities, int total, int limit, int offset, bool hasMore
});




}
/// @nodoc
class __$ActivitiesResponseCopyWithImpl<$Res>
    implements _$ActivitiesResponseCopyWith<$Res> {
  __$ActivitiesResponseCopyWithImpl(this._self, this._then);

  final _ActivitiesResponse _self;
  final $Res Function(_ActivitiesResponse) _then;

/// Create a copy of ActivitiesResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? activities = null,Object? total = null,Object? limit = null,Object? offset = null,Object? hasMore = null,}) {
  return _then(_ActivitiesResponse(
activities: null == activities ? _self._activities : activities // ignore: cast_nullable_to_non_nullable
as List<Activity>,total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,limit: null == limit ? _self.limit : limit // ignore: cast_nullable_to_non_nullable
as int,offset: null == offset ? _self.offset : offset // ignore: cast_nullable_to_non_nullable
as int,hasMore: null == hasMore ? _self.hasMore : hasMore // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
