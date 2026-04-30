import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _emailSent = false;
  String? _errorMessage;

  static final RegExp _emailRegex = RegExp(
    r'^[\w\-.]+@([\w-]+\.)+[\w-]{2,}$',
  );

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider.notifier).forgotPassword(
            _emailController.text.trim(),
          );
      if (mounted) {
        setState(() {
          _isLoading = false;
          _emailSent = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = S.of(context).authFailedToSendReset;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leading: IconButton(
          tooltip: S.of(context).authBackTooltip,
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: _emailSent
                ? _buildSuccessMessage(theme, colorScheme)
                : _buildForm(theme, colorScheme),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccessMessage(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          Icons.mark_email_read_outlined,
          size: 64,
          color: colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          S.of(context).authCheckYourEmail,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: colorScheme.primary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          S.of(context).authResetEmailSent(_emailController.text.trim()),
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        FilledButton(
          onPressed: () => context.go('/login'),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 32),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Text(S.of(context).authBackToSignIn),
        ),
      ],
    );
  }

  Widget _buildForm(ThemeData theme, ColorScheme colorScheme) {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(
            Icons.lock_reset_outlined,
            size: 64,
            color: colorScheme.primary,
          ),
          const SizedBox(height: 16),
          Text(
            S.of(context).authResetPassword,
            style: theme.textTheme.headlineLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: colorScheme.primary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            S.of(context).authResetInstructions,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            enabled: !_isLoading,
            decoration: InputDecoration(
              labelText: S.of(context).authEmailLabel,
              hintText: S.of(context).authEmailHint,
              prefixIcon: const Icon(Icons.email_outlined),
            ),
            validator: (String? value) {
              if (value == null || value.trim().isEmpty) {
                return S.of(context).authEmailRequired;
              }
              if (!_emailRegex.hasMatch(value.trim())) {
                return S.of(context).authInvalidEmail;
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _isLoading ? null : _submit,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(S.of(context).authSendResetLink),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colorScheme.error.withAlpha(26),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: colorScheme.error, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: colorScheme.error, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (_isLoading) ...[
            const SizedBox(height: 16),
            const Center(child: CircularProgressIndicator()),
          ],
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                S.of(context).authRememberPassword,
                style: TextStyle(color: colorScheme.onSurfaceVariant),
              ),
              Semantics(
                button: true,
                label: S.of(context).authSignInSemantic,
                child: GestureDetector(
                  onTap: _isLoading ? null : () => context.go('/login'),
                  child: Text(
                    S.of(context).authSignIn,
                    style: TextStyle(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
