import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/presentation/providers/consent_providers.dart';

class ConsentBanner extends ConsumerStatefulWidget {
  const ConsentBanner({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ConsentBanner> createState() => _ConsentBannerState();
}

class _ConsentBannerState extends ConsumerState<ConsentBanner> {
  bool _termsAccepted = false;
  bool _privacyAccepted = false;
  bool _healthAccepted = false;
  bool _ageAccepted = false;
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final consentStatus = ref.watch(consentNotifierProvider);
    final theme = Theme.of(context);

    if (!consentStatus.needsReconsent) {
      return widget.child;
    }

    final allAccepted =
        _termsAccepted && _privacyAccepted && _healthAccepted && _ageAccepted;

    return Stack(
      children: [
        widget.child,
        Container(
          color: Colors.black.withValues(alpha: 0.4),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              border: Border(
                top: BorderSide(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.shield, color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Important Legal Update (GDPR Compliance)',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'To continue using RunFlow, we require your explicit consent to our updated policies.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _CheckboxTile(
                    label: 'I accept the updated Terms of Service.',
                    value: _termsAccepted,
                    onChanged: (v) => setState(() => _termsAccepted = v),
                  ),
                  _CheckboxTile(
                    label: 'I accept the updated Privacy Policy.',
                    value: _privacyAccepted,
                    onChanged: (v) => setState(() => _privacyAccepted = v),
                  ),
                  _CheckboxTile(
                    label:
                        'I consent to the processing of my health and fitness data (GDPR Art. 9) for analytics.',
                    value: _healthAccepted,
                    onChanged: (v) => setState(() => _healthAccepted = v),
                  ),
                  _CheckboxTile(
                    label: 'I confirm I am at least 16 years old.',
                    value: _ageAccepted,
                    onChanged: (v) => setState(() => _ageAccepted = v),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed:
                          allAccepted && !_isSubmitting ? _acceptAll : null,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Accept & Continue'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _acceptAll() async {
    setState(() => _isSubmitting = true);
    await ref.read(consentNotifierProvider.notifier).acceptAll();
    if (mounted) {
      setState(() => _isSubmitting = false);
    }
  }
}

class _CheckboxTile extends StatelessWidget {
  const _CheckboxTile({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: value,
                onChanged: (v) => onChanged(v ?? false),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
