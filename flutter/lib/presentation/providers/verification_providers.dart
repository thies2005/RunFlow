import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/domain/repositories/auth_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';

class VerificationState {
  const VerificationState({
    this.isLoading = false,
    this.isVerified = false,
    this.error,
  });

  final bool isLoading;
  final bool isVerified;
  final String? error;

  VerificationState copyWith({
    bool? isLoading,
    bool? isVerified,
    String? error,
  }) {
    return VerificationState(
      isLoading: isLoading ?? this.isLoading,
      isVerified: isVerified ?? this.isVerified,
      error: error,
    );
  }
}

class VerificationNotifier extends Notifier<VerificationState> {
  @override
  VerificationState build() {
    return const VerificationState();
  }

  AuthRepository get _repo => ref.read(authRepositoryProvider);

  Future<bool> verify(String email, String code) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.verifyEmail(email, code.toUpperCase());
      state = state.copyWith(isLoading: false, isVerified: true);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return false;
    }
  }

  Future<bool> resend(String email) async {
    try {
      await _repo.resendVerification(email);
      return true;
    } catch (_) {
      return false;
    }
  }
}

final verificationNotifierProvider =
    NotifierProvider<VerificationNotifier, VerificationState>(
  VerificationNotifier.new,
);

final emailVerifiedProvider = FutureProvider<bool>((ref) async {
  try {
    final repo = ref.read(authRepositoryProvider);
    return repo.checkEmailVerified();
  } catch (_) {
    return false;
  }
});
