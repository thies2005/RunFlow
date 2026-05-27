import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/verification_providers.dart';

class VerificationSheet extends ConsumerStatefulWidget {
  const VerificationSheet({super.key, required this.email});

  final String email;

  @override
  ConsumerState<VerificationSheet> createState() => _VerificationSheetState();
}

class _VerificationSheetState extends ConsumerState<VerificationSheet> {
  final _controllers = List.generate(6, (_) => TextEditingController());
  final _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isResending = false;

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _code => _controllers.map((c) => c.text).join();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final verificationState = ref.watch(verificationNotifierProvider);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          Icon(Icons.mark_email_read_outlined,
              size: 48, color: theme.colorScheme.primary),
          const SizedBox(height: 16),
          Text(
            S.of(context).authVerifyYourEmail,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).authCodeSentTo(widget.email),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(6, (index) {
              return Container(
                width: 44,
                height: 52,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                child: TextField(
                  controller: _controllers[index],
                  focusNode: _focusNodes[index],
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.text,
                  textCapitalization: TextCapitalization.characters,
                  maxLength: 1,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  decoration: InputDecoration(
                    counterText: '',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onChanged: (value) {
                    if (value.isNotEmpty && index < 5) {
                      _focusNodes[index + 1].requestFocus();
                    }
                    if (_code.length == 6) {
                      _submit();
                    }
                  },
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          if (verificationState.isLoading)
            const CircularProgressIndicator()
          else ...[
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _code.length == 6 ? _submit : null,
                child: Text(S.of(context).authVerify),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _isResending ? null : _resend,
              child: Text(_isResending
                  ? S.of(context).authSending
                  : S.of(context).authResendCode),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final notifier =
        ref.read(verificationNotifierProvider.notifier);
    final success = await notifier.verify(widget.email, _code);
    if (success && mounted) {
      Navigator.pop(context, true);
    }
  }

  Future<void> _resend() async {
    setState(() => _isResending = true);
    final notifier =
        ref.read(verificationNotifierProvider.notifier);
    await notifier.resend(widget.email);
    if (mounted) {
      setState(() => _isResending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(S.of(context).authCodeResent)),
      );
    }
  }
}
