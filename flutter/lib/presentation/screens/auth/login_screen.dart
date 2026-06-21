import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;
  static const String _stravaRedirectUri = AppConstants.stravaRedirectUri;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loginWithStrava() async {
    if (!AppConstants.isStravaConfigured) {
      setState(() {
        _errorMessage = S.of(context).authStravaNotConfigured;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authUrl = Uri.https('www.strava.com', '/oauth/authorize', {
        'client_id': AppConstants.stravaClientId,
        'redirect_uri': _stravaRedirectUri,
        'response_type': 'code',
        'scope': 'read,activity:read_all',
        'state': 'flutter_${DateTime.now().millisecondsSinceEpoch}',
      });

      final result = await FlutterWebAuth2.authenticate(
        url: authUrl.toString(),
        callbackUrlScheme: 'runflow2',
      );

      final code = Uri.parse(result).queryParameters['code'];
      if (code == null) {
        throw Exception('No authorization code received from Strava.');
      }

      await ref.read(authStateProvider.notifier).loginWithStravaCode(
            code,
            redirectUri: _stravaRedirectUri,
          );

      if (mounted) {
        context.go('/dashboard');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = _userFriendlyMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loginWithEmail() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = S.of(context).authEnterEmailPassword);
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ref.read(authStateProvider.notifier).loginWithEmail(
            email: email,
            password: password,
          );

      if (mounted) {
        context.go('/dashboard');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = _userFriendlyMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  String _userFriendlyMessage(Object error) {
    final msg = error.toString();
    if (msg.contains('401') || msg.contains('Unauthorized')) {
      return S.of(context).authInvalidCredentials;
    }
    if (msg.contains('network') || msg.contains('connection')) {
      return S.of(context).authNetworkError;
    }
    if (msg.contains('cancelled')) {
      return S.of(context).authLoginCancelled;
    }
    return S.of(context).authLoginFailed;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 48),
                Icon(
                  Icons.directions_run,
                  size: 64,
                  color: colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  S.of(context).appTitle,
                  style: theme.textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: colorScheme.primary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  S.of(context).authYourRunningDashboard,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                _buildStravaButton(colorScheme),
                const SizedBox(height: 24),
                _buildDivider(colorScheme),
                const SizedBox(height: 24),
                _buildEmailField(colorScheme),
                const SizedBox(height: 12),
                _buildPasswordField(colorScheme),
                const SizedBox(height: 24),
                _buildLoginButton(colorScheme),
                const SizedBox(height: 12),
                _buildForgotPasswordLink(colorScheme),
                const SizedBox(height: 16),
                _buildRegisterLink(colorScheme),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  _buildErrorMessage(colorScheme),
                ],
                if (_isLoading) ...[
                  const SizedBox(height: 16),
                  const Center(
                    child: CircularProgressIndicator(),
                  ),
                ],
                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStravaButton(ColorScheme colorScheme) {
    final isAvailable = AppConstants.isStravaConfigured;

    return FilledButton.icon(
      onPressed: _isLoading || !isAvailable ? null : _loginWithStrava,
      icon: const Icon(Icons.link),
      label: Text(isAvailable ? S.of(context).authContinueWithStrava : S.of(context).authStravaUnavailable),
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFFFC4C02),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  Widget _buildDivider(ColorScheme colorScheme) {
    return Row(
      children: [
        Expanded(
          child: Divider(color: colorScheme.onSurfaceVariant.withAlpha(51)),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            S.of(context).authOr,
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
        ),
        Expanded(
          child: Divider(color: colorScheme.onSurfaceVariant.withAlpha(51)),
        ),
      ],
    );
  }

  Widget _buildEmailField(ColorScheme colorScheme) {
    return TextField(
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      autocorrect: false,
      enabled: !_isLoading,
      decoration: InputDecoration(
        labelText: S.of(context).authEmail,
        hintText: S.of(context).authEmailHint,
        prefixIcon: const Icon(Icons.email_outlined),
      ),
    );
  }

  Widget _buildPasswordField(ColorScheme colorScheme) {
    return TextField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      enabled: !_isLoading,
      decoration: InputDecoration(
        labelText: S.of(context).authPassword,
        prefixIcon: const Icon(Icons.lock_outlined),
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: () {
            setState(() => _obscurePassword = !_obscurePassword);
          },
        ),
      ),
      onSubmitted: (_) => _loginWithEmail(),
    );
  }

  Widget _buildLoginButton(ColorScheme colorScheme) {
    return FilledButton(
      onPressed: _isLoading ? null : _loginWithEmail,
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Text(S.of(context).authSignIn),
    );
  }

  Widget _buildForgotPasswordLink(ColorScheme colorScheme) {
    return Align(
      alignment: Alignment.centerRight,
      child: GestureDetector(
        onTap: _isLoading ? null : () => context.push('/forgot-password'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Text(
            S.of(context).authForgotPassword,
            style: TextStyle(
              color: colorScheme.primary,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRegisterLink(ColorScheme colorScheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          S.of(context).authNoAccountYet,
          style: TextStyle(color: colorScheme.onSurfaceVariant),
        ),
        GestureDetector(
          onTap: _isLoading ? null : () => context.go('/register'),
          child: Text(
            S.of(context).authSignUp,
            style: TextStyle(
              color: colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
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
}
