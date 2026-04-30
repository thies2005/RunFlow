import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/data/repositories/consent_repository_impl.dart';
import 'package:runflow_flutter/domain/entities/consent_entities.dart';
import 'package:runflow_flutter/domain/repositories/consent_repository.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

final consentRepositoryProvider = Provider<ConsentRepository>((ref) {
  final client = ref.watch(dioClientProvider);
  return ConsentRepositoryImpl(dio: client.dio);
});

final consentStatusProvider = FutureProvider<ConsentStatus>((ref) async {
  try {
    final repo = ref.read(consentRepositoryProvider);
    return repo.checkConsent();
  } catch (_) {
    return const ConsentStatus(needsReconsent: false);
  }
});

class ConsentNotifier extends Notifier<ConsentStatus> {
  static const _consentGivenKey = 'gdpr_consent_given';

  @override
  ConsentStatus build() {
    _checkStatus();
    return const ConsentStatus(needsReconsent: false);
  }

  Future<void> _checkStatus() async {
    try {
      final repo = ref.read(consentRepositoryProvider);
      final status = await repo.checkConsent();
      state = status;
    } catch (_) {}
  }

  Future<bool> acceptAll() async {
    try {
      const types = ['TERMS', 'PRIVACY', 'HEALTH_DATA', 'AGE_REQUIREMENT'];
      final repo = ref.read(consentRepositoryProvider);
      await repo.grantConsents(types);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_consentGivenKey, true);
      state = state.copyWith(needsReconsent: false);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> withdrawConsent(String consentType) async {
    try {
      final repo = ref.read(consentRepositoryProvider);
      await repo.withdrawConsent(consentType);
      await _checkStatus();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final consentNotifierProvider = NotifierProvider<ConsentNotifier, ConsentStatus>(
  ConsentNotifier.new,
);

final hasLocalConsentProvider = FutureProvider<bool>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('gdpr_consent_given') ?? false;
});
