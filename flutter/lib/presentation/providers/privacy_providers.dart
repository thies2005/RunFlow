import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'privacy_providers.g.dart';

@Riverpod(keepAlive: true)
class PrivacyConsent extends _$PrivacyConsent {
  static const _dataProcessingKey = 'privacy_data_processing';
  static const _analyticsKey = 'privacy_analytics';
  static const _marketingKey = 'privacy_marketing';
  static const _termsAcceptedKey = 'privacy_terms_accepted';
  static const _privacyPolicyAcceptedKey = 'privacy_privacy_policy_accepted';

  @override
  PrivacyConsentState build() {
    _loadState();
    return const PrivacyConsentState();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    state = PrivacyConsentState(
      dataProcessingConsent: prefs.getBool(_dataProcessingKey) ?? true,
      analyticsConsent: prefs.getBool(_analyticsKey) ?? false,
      marketingConsent: prefs.getBool(_marketingKey) ?? false,
      termsAccepted: prefs.getBool(_termsAcceptedKey) ?? false,
      privacyPolicyAccepted:
          prefs.getBool(_privacyPolicyAcceptedKey) ?? false,
    );
  }

  Future<void> setDataProcessingConsent(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_dataProcessingKey, value);
    state = state.copyWith(dataProcessingConsent: value);
  }

  Future<void> setAnalyticsConsent(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_analyticsKey, value);
    state = state.copyWith(analyticsConsent: value);
  }

  Future<void> setMarketingConsent(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_marketingKey, value);
    state = state.copyWith(marketingConsent: value);
  }

  Future<void> setTermsAccepted(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_termsAcceptedKey, value);
    state = state.copyWith(termsAccepted: value);
  }

  Future<void> setPrivacyPolicyAccepted(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_privacyPolicyAcceptedKey, value);
    state = state.copyWith(privacyPolicyAccepted: value);
  }

  bool get allRequiredAccepted =>
      state.dataProcessingConsent &&
      state.termsAccepted &&
      state.privacyPolicyAccepted;
}

class PrivacyConsentState {
  const PrivacyConsentState({
    this.dataProcessingConsent = true,
    this.analyticsConsent = false,
    this.marketingConsent = false,
    this.termsAccepted = false,
    this.privacyPolicyAccepted = false,
  });

  final bool dataProcessingConsent;
  final bool analyticsConsent;
  final bool marketingConsent;
  final bool termsAccepted;
  final bool privacyPolicyAccepted;

  PrivacyConsentState copyWith({
    bool? dataProcessingConsent,
    bool? analyticsConsent,
    bool? marketingConsent,
    bool? termsAccepted,
    bool? privacyPolicyAccepted,
  }) {
    return PrivacyConsentState(
      dataProcessingConsent:
          dataProcessingConsent ?? this.dataProcessingConsent,
      analyticsConsent: analyticsConsent ?? this.analyticsConsent,
      marketingConsent: marketingConsent ?? this.marketingConsent,
      termsAccepted: termsAccepted ?? this.termsAccepted,
      privacyPolicyAccepted:
          privacyPolicyAccepted ?? this.privacyPolicyAccepted,
    );
  }
}
