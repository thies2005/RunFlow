class ApiKeyInfo {
  const ApiKeyInfo({
    this.hasKey = false,
    this.keyPrefix,
    this.name,
    this.createdAt,
    this.lastUsedAt,
    this.expiresAt,
  });

  final bool hasKey;
  final String? keyPrefix;
  final String? name;
  final DateTime? createdAt;
  final DateTime? lastUsedAt;
  final DateTime? expiresAt;

  ApiKeyInfo copyWith({
    bool? hasKey,
    String? keyPrefix,
    String? name,
    DateTime? createdAt,
    DateTime? lastUsedAt,
    DateTime? expiresAt,
  }) {
    return ApiKeyInfo(
      hasKey: hasKey ?? this.hasKey,
      keyPrefix: keyPrefix ?? this.keyPrefix,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      lastUsedAt: lastUsedAt ?? this.lastUsedAt,
      expiresAt: expiresAt ?? this.expiresAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiKeyInfo &&
          runtimeType == other.runtimeType &&
          hasKey == other.hasKey &&
          keyPrefix == other.keyPrefix &&
          name == other.name &&
          createdAt == other.createdAt &&
          lastUsedAt == other.lastUsedAt &&
          expiresAt == other.expiresAt;

  @override
  int get hashCode => Object.hash(
        hasKey,
        keyPrefix,
        name,
        createdAt,
        lastUsedAt,
        expiresAt,
      );
}

class GeneratedApiKey {
  const GeneratedApiKey({
    required this.apiKey,
    required this.keyPrefix,
    required this.name,
  });

  final String apiKey;
  final String keyPrefix;
  final String name;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GeneratedApiKey &&
          runtimeType == other.runtimeType &&
          apiKey == other.apiKey &&
          keyPrefix == other.keyPrefix &&
          name == other.name;

  @override
  int get hashCode => Object.hash(apiKey, keyPrefix, name);
}
