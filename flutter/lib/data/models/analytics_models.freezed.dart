// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'analytics_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$FitnessHistoryMetrics {

@JsonKey(fromJson: _parseDouble) double get ctl;@JsonKey(fromJson: _parseDouble) double get atl;@JsonKey(fromJson: _parseDouble) double get tsb;@JsonKey(fromJson: _parseDouble) double get ctlRunning;
/// Create a copy of FitnessHistoryMetrics
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FitnessHistoryMetricsCopyWith<FitnessHistoryMetrics> get copyWith => _$FitnessHistoryMetricsCopyWithImpl<FitnessHistoryMetrics>(this as FitnessHistoryMetrics, _$identity);

  /// Serializes this FitnessHistoryMetrics to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FitnessHistoryMetrics&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.ctlRunning, ctlRunning) || other.ctlRunning == ctlRunning));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ctl,atl,tsb,ctlRunning);

@override
String toString() {
  return 'FitnessHistoryMetrics(ctl: $ctl, atl: $atl, tsb: $tsb, ctlRunning: $ctlRunning)';
}


}

/// @nodoc
abstract mixin class $FitnessHistoryMetricsCopyWith<$Res>  {
  factory $FitnessHistoryMetricsCopyWith(FitnessHistoryMetrics value, $Res Function(FitnessHistoryMetrics) _then) = _$FitnessHistoryMetricsCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: _parseDouble) double ctl,@JsonKey(fromJson: _parseDouble) double atl,@JsonKey(fromJson: _parseDouble) double tsb,@JsonKey(fromJson: _parseDouble) double ctlRunning
});




}
/// @nodoc
class _$FitnessHistoryMetricsCopyWithImpl<$Res>
    implements $FitnessHistoryMetricsCopyWith<$Res> {
  _$FitnessHistoryMetricsCopyWithImpl(this._self, this._then);

  final FitnessHistoryMetrics _self;
  final $Res Function(FitnessHistoryMetrics) _then;

/// Create a copy of FitnessHistoryMetrics
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? ctl = null,Object? atl = null,Object? tsb = null,Object? ctlRunning = null,}) {
  return _then(_self.copyWith(
ctl: null == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double,atl: null == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double,tsb: null == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double,ctlRunning: null == ctlRunning ? _self.ctlRunning : ctlRunning // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [FitnessHistoryMetrics].
extension FitnessHistoryMetricsPatterns on FitnessHistoryMetrics {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FitnessHistoryMetrics value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FitnessHistoryMetrics() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FitnessHistoryMetrics value)  $default,){
final _that = this;
switch (_that) {
case _FitnessHistoryMetrics():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FitnessHistoryMetrics value)?  $default,){
final _that = this;
switch (_that) {
case _FitnessHistoryMetrics() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double ctlRunning)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FitnessHistoryMetrics() when $default != null:
return $default(_that.ctl,_that.atl,_that.tsb,_that.ctlRunning);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double ctlRunning)  $default,) {final _that = this;
switch (_that) {
case _FitnessHistoryMetrics():
return $default(_that.ctl,_that.atl,_that.tsb,_that.ctlRunning);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: _parseDouble)  double ctl, @JsonKey(fromJson: _parseDouble)  double atl, @JsonKey(fromJson: _parseDouble)  double tsb, @JsonKey(fromJson: _parseDouble)  double ctlRunning)?  $default,) {final _that = this;
switch (_that) {
case _FitnessHistoryMetrics() when $default != null:
return $default(_that.ctl,_that.atl,_that.tsb,_that.ctlRunning);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FitnessHistoryMetrics extends FitnessHistoryMetrics {
  const _FitnessHistoryMetrics({@JsonKey(fromJson: _parseDouble) required this.ctl, @JsonKey(fromJson: _parseDouble) required this.atl, @JsonKey(fromJson: _parseDouble) required this.tsb, @JsonKey(fromJson: _parseDouble) required this.ctlRunning}): super._();
  factory _FitnessHistoryMetrics.fromJson(Map<String, dynamic> json) => _$FitnessHistoryMetricsFromJson(json);

@override@JsonKey(fromJson: _parseDouble) final  double ctl;
@override@JsonKey(fromJson: _parseDouble) final  double atl;
@override@JsonKey(fromJson: _parseDouble) final  double tsb;
@override@JsonKey(fromJson: _parseDouble) final  double ctlRunning;

/// Create a copy of FitnessHistoryMetrics
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FitnessHistoryMetricsCopyWith<_FitnessHistoryMetrics> get copyWith => __$FitnessHistoryMetricsCopyWithImpl<_FitnessHistoryMetrics>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FitnessHistoryMetricsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FitnessHistoryMetrics&&(identical(other.ctl, ctl) || other.ctl == ctl)&&(identical(other.atl, atl) || other.atl == atl)&&(identical(other.tsb, tsb) || other.tsb == tsb)&&(identical(other.ctlRunning, ctlRunning) || other.ctlRunning == ctlRunning));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,ctl,atl,tsb,ctlRunning);

@override
String toString() {
  return 'FitnessHistoryMetrics(ctl: $ctl, atl: $atl, tsb: $tsb, ctlRunning: $ctlRunning)';
}


}

/// @nodoc
abstract mixin class _$FitnessHistoryMetricsCopyWith<$Res> implements $FitnessHistoryMetricsCopyWith<$Res> {
  factory _$FitnessHistoryMetricsCopyWith(_FitnessHistoryMetrics value, $Res Function(_FitnessHistoryMetrics) _then) = __$FitnessHistoryMetricsCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: _parseDouble) double ctl,@JsonKey(fromJson: _parseDouble) double atl,@JsonKey(fromJson: _parseDouble) double tsb,@JsonKey(fromJson: _parseDouble) double ctlRunning
});




}
/// @nodoc
class __$FitnessHistoryMetricsCopyWithImpl<$Res>
    implements _$FitnessHistoryMetricsCopyWith<$Res> {
  __$FitnessHistoryMetricsCopyWithImpl(this._self, this._then);

  final _FitnessHistoryMetrics _self;
  final $Res Function(_FitnessHistoryMetrics) _then;

/// Create a copy of FitnessHistoryMetrics
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? ctl = null,Object? atl = null,Object? tsb = null,Object? ctlRunning = null,}) {
  return _then(_FitnessHistoryMetrics(
ctl: null == ctl ? _self.ctl : ctl // ignore: cast_nullable_to_non_nullable
as double,atl: null == atl ? _self.atl : atl // ignore: cast_nullable_to_non_nullable
as double,tsb: null == tsb ? _self.tsb : tsb // ignore: cast_nullable_to_non_nullable
as double,ctlRunning: null == ctlRunning ? _self.ctlRunning : ctlRunning // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$FitnessHistory {

 DateTime get date; FitnessHistoryMetrics get metrics;
/// Create a copy of FitnessHistory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FitnessHistoryCopyWith<FitnessHistory> get copyWith => _$FitnessHistoryCopyWithImpl<FitnessHistory>(this as FitnessHistory, _$identity);

  /// Serializes this FitnessHistory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FitnessHistory&&(identical(other.date, date) || other.date == date)&&(identical(other.metrics, metrics) || other.metrics == metrics));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,metrics);

@override
String toString() {
  return 'FitnessHistory(date: $date, metrics: $metrics)';
}


}

/// @nodoc
abstract mixin class $FitnessHistoryCopyWith<$Res>  {
  factory $FitnessHistoryCopyWith(FitnessHistory value, $Res Function(FitnessHistory) _then) = _$FitnessHistoryCopyWithImpl;
@useResult
$Res call({
 DateTime date, FitnessHistoryMetrics metrics
});


$FitnessHistoryMetricsCopyWith<$Res> get metrics;

}
/// @nodoc
class _$FitnessHistoryCopyWithImpl<$Res>
    implements $FitnessHistoryCopyWith<$Res> {
  _$FitnessHistoryCopyWithImpl(this._self, this._then);

  final FitnessHistory _self;
  final $Res Function(FitnessHistory) _then;

/// Create a copy of FitnessHistory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? metrics = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,metrics: null == metrics ? _self.metrics : metrics // ignore: cast_nullable_to_non_nullable
as FitnessHistoryMetrics,
  ));
}
/// Create a copy of FitnessHistory
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$FitnessHistoryMetricsCopyWith<$Res> get metrics {
  
  return $FitnessHistoryMetricsCopyWith<$Res>(_self.metrics, (value) {
    return _then(_self.copyWith(metrics: value));
  });
}
}


/// Adds pattern-matching-related methods to [FitnessHistory].
extension FitnessHistoryPatterns on FitnessHistory {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FitnessHistory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FitnessHistory() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FitnessHistory value)  $default,){
final _that = this;
switch (_that) {
case _FitnessHistory():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FitnessHistory value)?  $default,){
final _that = this;
switch (_that) {
case _FitnessHistory() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( DateTime date,  FitnessHistoryMetrics metrics)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FitnessHistory() when $default != null:
return $default(_that.date,_that.metrics);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( DateTime date,  FitnessHistoryMetrics metrics)  $default,) {final _that = this;
switch (_that) {
case _FitnessHistory():
return $default(_that.date,_that.metrics);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( DateTime date,  FitnessHistoryMetrics metrics)?  $default,) {final _that = this;
switch (_that) {
case _FitnessHistory() when $default != null:
return $default(_that.date,_that.metrics);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FitnessHistory extends FitnessHistory {
  const _FitnessHistory({required this.date, required this.metrics}): super._();
  factory _FitnessHistory.fromJson(Map<String, dynamic> json) => _$FitnessHistoryFromJson(json);

@override final  DateTime date;
@override final  FitnessHistoryMetrics metrics;

/// Create a copy of FitnessHistory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FitnessHistoryCopyWith<_FitnessHistory> get copyWith => __$FitnessHistoryCopyWithImpl<_FitnessHistory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FitnessHistoryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _FitnessHistory&&(identical(other.date, date) || other.date == date)&&(identical(other.metrics, metrics) || other.metrics == metrics));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,metrics);

@override
String toString() {
  return 'FitnessHistory(date: $date, metrics: $metrics)';
}


}

/// @nodoc
abstract mixin class _$FitnessHistoryCopyWith<$Res> implements $FitnessHistoryCopyWith<$Res> {
  factory _$FitnessHistoryCopyWith(_FitnessHistory value, $Res Function(_FitnessHistory) _then) = __$FitnessHistoryCopyWithImpl;
@override @useResult
$Res call({
 DateTime date, FitnessHistoryMetrics metrics
});


@override $FitnessHistoryMetricsCopyWith<$Res> get metrics;

}
/// @nodoc
class __$FitnessHistoryCopyWithImpl<$Res>
    implements _$FitnessHistoryCopyWith<$Res> {
  __$FitnessHistoryCopyWithImpl(this._self, this._then);

  final _FitnessHistory _self;
  final $Res Function(_FitnessHistory) _then;

/// Create a copy of FitnessHistory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? metrics = null,}) {
  return _then(_FitnessHistory(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime,metrics: null == metrics ? _self.metrics : metrics // ignore: cast_nullable_to_non_nullable
as FitnessHistoryMetrics,
  ));
}

/// Create a copy of FitnessHistory
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$FitnessHistoryMetricsCopyWith<$Res> get metrics {
  
  return $FitnessHistoryMetricsCopyWith<$Res>(_self.metrics, (value) {
    return _then(_self.copyWith(metrics: value));
  });
}
}

// dart format on
