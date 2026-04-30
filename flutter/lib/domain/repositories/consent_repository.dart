import 'package:runflow_flutter/domain/entities/consent_entities.dart';

abstract class ConsentRepository {
  Future<ConsentStatus> checkConsent();

  Future<void> grantConsents(List<String> consentTypes);

  Future<void> withdrawConsent(String consentType);
}
