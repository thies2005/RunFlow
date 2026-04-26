import 'package:flutter/material.dart';

class RunFlowErrorBoundary extends StatefulWidget {
  const RunFlowErrorBoundary({required this.child, super.key});

  final Widget child;

  @override
  State<RunFlowErrorBoundary> createState() => _RunFlowErrorBoundaryState();
}

class _RunFlowErrorBoundaryState extends State<RunFlowErrorBoundary> {
  FlutterErrorDetails? _errorDetails;
  late final ErrorWidgetBuilder _previousErrorWidgetBuilder;

  @override
  void initState() {
    super.initState();
    _previousErrorWidgetBuilder = ErrorWidget.builder;
    ErrorWidget.builder = (FlutterErrorDetails details) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((Duration _) {
          if (mounted) {
            setState(() {
              _errorDetails = details;
            });
          }
        });
      }
      return const SizedBox.shrink();
    };
  }

  @override
  void dispose() {
    ErrorWidget.builder = _previousErrorWidgetBuilder;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_errorDetails != null) {
      return const MaterialApp(
        home: _FriendlyErrorScreen(),
      );
    }

    return widget.child;
  }
}

class _FriendlyErrorScreen extends StatelessWidget {
  const _FriendlyErrorScreen();

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  size: 56,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Something went wrong',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Please restart RunFlow and try again.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
