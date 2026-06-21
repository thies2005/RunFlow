import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/consent_providers.dart';
import 'package:runflow_flutter/presentation/screens/auth/verification_sheet.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  static final RegExp _emailRegex = RegExp(
    r'^[\w\-.]+@([\w-]+\.)+[\w-]{2,}$',
  );

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider.notifier).register(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            name: _nameController.text.trim(),
          );

      // Record the standard GDPR consents (parity with the web register flow,
      // which logs TERMS/PRIVACY/HEALTH_DATA/AGE_REQUIREMENT on signup).
      // Best-effort: must not block registration.
      unawaited(
        ref.read(consentNotifierProvider.notifier).acceptAll(),
      );

      if (mounted) {
        final email = _emailController.text.trim();
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          builder: (_) => VerificationSheet(email: email),
        ).then((verified) {
          if (mounted) {
            context.go('/dashboard');
          }
        }).ignore();
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString();
        final userMessage = msg.contains('409') || msg.contains('already exists')
            ? S.of(context).authAccountExists
            : S.of(context).authRegistrationFailedMsg;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(userMessage)),
        );
        setState(() {
          _errorMessage = userMessage;
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
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(
                    Icons.directions_run,
                    size: 64,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    S.of(context).authCreateAccount,
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    S.of(context).authSignUpSubtitle,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  _buildNameField(),
                  const SizedBox(height: 12),
                  _buildEmailField(),
                  const SizedBox(height: 12),
                  _buildPasswordField(),
                  const SizedBox(height: 12),
                  _buildConfirmPasswordField(),
                  const SizedBox(height: 24),
                  _buildRegisterButton(colorScheme),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 16),
                    _buildErrorMessage(colorScheme),
                  ],
                  if (_isLoading) ...[
                    const SizedBox(height: 16),
                    const Center(child: CircularProgressIndicator()),
                  ],
                  const SizedBox(height: 24),
                  _buildLoginLink(colorScheme),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNameField() {
    return TextFormField(
      controller: _nameController,
      enabled: !_isLoading,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: S.of(context).authName,
        hintText: S.of(context).authNameHint,
        prefixIcon: const Icon(Icons.person_outlined),
      ),
      validator: (String? value) {
        if (value == null || value.trim().isEmpty) {
          return S.of(context).authNameRequired;
        }
        return null;
      },
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      autocorrect: false,
      enabled: !_isLoading,
      decoration: InputDecoration(
        labelText: S.of(context).authEmail,
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
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      enabled: !_isLoading,
      decoration: InputDecoration(
        labelText: S.of(context).authPassword,
        prefixIcon: const Icon(Icons.lock_outlined),
        suffixIcon: IconButton(
          tooltip: _obscurePassword ? S.of(context).authShowPassword : S.of(context).authHidePassword,
          icon: Icon(
            _obscurePassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: () {
            setState(() => _obscurePassword = !_obscurePassword);
          },
        ),
      ),
      validator: (String? value) {
        if (value == null || value.isEmpty) {
          return S.of(context).authPasswordRequired;
        }
        if (value.length < 8) {
          return S.of(context).authPasswordMinChars;
        }
        return null;
      },
    );
  }

  Widget _buildConfirmPasswordField() {
    return TextFormField(
      controller: _confirmPasswordController,
      obscureText: _obscureConfirmPassword,
      enabled: !_isLoading,
      decoration: InputDecoration(
        labelText: S.of(context).authConfirmPassword,
        prefixIcon: const Icon(Icons.lock_outlined),
        suffixIcon: IconButton(
          tooltip: _obscureConfirmPassword ? S.of(context).authShowPassword : S.of(context).authHidePassword,
          icon: Icon(
            _obscureConfirmPassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: () {
            setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
          },
        ),
      ),
      validator: (String? value) {
        if (value == null || value.isEmpty) {
          return S.of(context).authConfirmPasswordRequired;
        }
        if (value != _passwordController.text) {
          return S.of(context).authPasswordsNoMatch;
        }
        return null;
      },
    );
  }

  Widget _buildRegisterButton(ColorScheme colorScheme) {
    return FilledButton(
      onPressed: _isLoading ? null : _submit,
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Text(S.of(context).authCreateAccount),
    );
  }

  Widget _buildErrorMessage(ColorScheme colorScheme) {
    return Container(
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
    );
  }

  Widget _buildLoginLink(ColorScheme colorScheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          S.of(context).authAlreadyHaveAccount,
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
    );
  }
}
