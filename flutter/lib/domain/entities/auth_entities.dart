enum Sex { male, female, other }

class LoginResponse {
  const LoginResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    required this.tokenType,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final String tokenType;
  final User user;

  LoginResponse copyWith({
    String? accessToken,
    String? refreshToken,
    int? expiresIn,
    String? tokenType,
    User? user,
  }) {
    return LoginResponse(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      expiresIn: expiresIn ?? this.expiresIn,
      tokenType: tokenType ?? this.tokenType,
      user: user ?? this.user,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoginResponse &&
          runtimeType == other.runtimeType &&
          accessToken == other.accessToken &&
          refreshToken == other.refreshToken &&
          expiresIn == other.expiresIn &&
          tokenType == other.tokenType &&
          user == other.user;

  @override
  int get hashCode => Object.hash(
        accessToken,
        refreshToken,
        expiresIn,
        tokenType,
        user,
      );
}

class User {
  const User({
    required this.id,
    this.email,
    this.name,
    this.image,
    this.sex,
    this.birthDate,
    this.hrMax,
    this.hrRest,
    this.weight,
    this.height,
    this.vdotCorrectionFactor,
    this.lastSyncAt,
    this.emailVerified,
  });

  final String id;
  final String? email;
  final String? name;
  final String? image;
  final Sex? sex;
  final DateTime? birthDate;
  final int? hrMax;
  final int? hrRest;
  final double? weight;
  final double? height;
  final double? vdotCorrectionFactor;
  final DateTime? lastSyncAt;
  final bool? emailVerified;

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? image,
    Sex? sex,
    DateTime? birthDate,
    int? hrMax,
    int? hrRest,
    double? weight,
    double? height,
    double? vdotCorrectionFactor,
    DateTime? lastSyncAt,
    bool? emailVerified,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      image: image ?? this.image,
      sex: sex ?? this.sex,
      birthDate: birthDate ?? this.birthDate,
      hrMax: hrMax ?? this.hrMax,
      hrRest: hrRest ?? this.hrRest,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      vdotCorrectionFactor: vdotCorrectionFactor ?? this.vdotCorrectionFactor,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      emailVerified: emailVerified ?? this.emailVerified,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is User &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          email == other.email &&
          name == other.name &&
          image == other.image &&
          sex == other.sex &&
          birthDate == other.birthDate &&
          hrMax == other.hrMax &&
          hrRest == other.hrRest &&
          weight == other.weight &&
          height == other.height &&
          vdotCorrectionFactor == other.vdotCorrectionFactor &&
          lastSyncAt == other.lastSyncAt &&
          emailVerified == other.emailVerified;

  @override
  int get hashCode => Object.hash(
        id,
        email,
        name,
        image,
        sex,
        birthDate,
        hrMax,
        hrRest,
        weight,
        height,
        vdotCorrectionFactor,
        lastSyncAt,
        emailVerified,
      );
}

class ApiError {
  const ApiError({
    required this.error,
    required this.timestamp,
    this.code,
    this.details,
    this.path,
  });

  final String error;
  final DateTime timestamp;
  final String? code;
  final Map<String, dynamic>? details;
  final String? path;

  ApiError copyWith({
    String? error,
    DateTime? timestamp,
    String? code,
    Map<String, dynamic>? details,
    String? path,
  }) {
    return ApiError(
      error: error ?? this.error,
      timestamp: timestamp ?? this.timestamp,
      code: code ?? this.code,
      details: details ?? this.details,
      path: path ?? this.path,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ApiError &&
          runtimeType == other.runtimeType &&
          error == other.error &&
          timestamp == other.timestamp &&
          code == other.code &&
          details == other.details &&
          path == other.path;

  @override
  int get hashCode => Object.hash(
        error,
        timestamp,
        code,
        details,
        path,
      );
}
