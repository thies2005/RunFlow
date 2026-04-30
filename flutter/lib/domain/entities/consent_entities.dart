class ConsentStatus {
  const ConsentStatus({
    required this.needsReconsent,
    this.missingPolicies = const [],
    this.active = const {},
  });

  final bool needsReconsent;
  final List<String> missingPolicies;
  final Map<String, bool> active;

  ConsentStatus copyWith({
    bool? needsReconsent,
    List<String>? missingPolicies,
    Map<String, bool>? active,
  }) {
    return ConsentStatus(
      needsReconsent: needsReconsent ?? this.needsReconsent,
      missingPolicies: missingPolicies ?? this.missingPolicies,
      active: active ?? this.active,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConsentStatus &&
          runtimeType == other.runtimeType &&
          needsReconsent == other.needsReconsent &&
          _listEquals(missingPolicies, other.missingPolicies) &&
          _mapEquals(active, other.active);

  @override
  int get hashCode => Object.hash(
        needsReconsent,
        Object.hashAll(missingPolicies),
        Object.hashAll(active.entries),
      );

  static bool _listEquals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static bool _mapEquals(Map<String, bool> a, Map<String, bool> b) {
    if (a.length != b.length) return false;
    for (final key in a.keys) {
      if (a[key] != b[key]) return false;
    }
    return true;
  }
}
