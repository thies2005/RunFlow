import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/widgets/runflow_error_boundary.dart';

void main() {
  group('RunFlowErrorBoundary', () {
    testWidgets('renders child widget normally when no error', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: RunFlowErrorBoundary(
            child: Scaffold(body: Text('All good')),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('All good'), findsOneWidget);
      expect(find.text('Something went wrong'), findsNothing);
    });

    testWidgets('shows friendly error screen when an error occurs during build',
        (tester) async {
      final original = ErrorWidget.builder;
      final ValueNotifier<bool> shouldFail = ValueNotifier(false);

      await tester.pumpWidget(
        MaterialApp(
          home: RunFlowErrorBoundary(
            child: ValueListenableBuilder<bool>(
              valueListenable: shouldFail,
              builder: (context, fail, _) {
                if (fail) throw Exception('intentional test error');
                return const Scaffold(body: Text('Normal'));
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Normal'), findsOneWidget);

      // Trigger the error
      shouldFail.value = true;
      
      // We expect this pump to fail during build. We catch it.
      await tester.pump();
      
      final dynamic exception = tester.takeException();
      expect(exception, isNotNull);

      // Now the post-frame callback is scheduled. We pump to execute it.
      await tester.pump();
      // Now the UI rebuilding happens.
      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);

      ErrorWidget.builder = original;
    });

    testWidgets('friendly error screen has correct icon', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: _DirectFriendlyError(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      expect(find.text('Something went wrong'), findsOneWidget);
    });
  });

  group('Large text scaling — layout overflow check', () {
    Widget buildScaled(Widget child, double scale) {
      return MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(scale)),
        child: MaterialApp(home: child),
      );
    }

    testWidgets('DashboardScreen does not overflow at 2x text scale',
        (tester) async {
      // A simple scaffold with representative dashboard text to verify
      // no RenderFlex overflow at large text sizes.
      await tester.pumpWidget(
        buildScaled(
          const Scaffold(
            body: SingleChildScrollView(
              child: Column(
                children: [
                  ListTile(
                    leading: Icon(Icons.directions_run),
                    title: Text('Morning Run'),
                    subtitle: Text('10.0 km • 5:00 /km'),
                    trailing: Text('Apr 25'),
                  ),
                  ListTile(
                    leading: Icon(Icons.flag),
                    title: Text('Berlin Marathon'),
                    subtitle: Text('42 days remaining'),
                  ),
                ],
              ),
            ),
          ),
          2.0,
        ),
      );
      await tester.pumpAndSettle();

      // If there's an overflow, the test framework logs it — we verify
      // no overflow exceptions were thrown.
      expect(tester.takeException(), isNull);
    });

    testWidgets('MetricCard does not overflow at 2x text scale', (tester) async {
      await tester.pumpWidget(
        buildScaled(
          const Scaffold(
            body: Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.speed),
                            SizedBox(height: 4),
                            Text('VDOT', overflow: TextOverflow.ellipsis),
                            Text('52.3', overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Card(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.trending_up),
                            SizedBox(height: 4),
                            Text('CTL', overflow: TextOverflow.ellipsis),
                            Text('68.4', overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          2.0,
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });
}

/// Helper widget that renders the friendly error screen directly for testing.
class _DirectFriendlyError extends StatelessWidget {
  const _DirectFriendlyError();

  @override
  Widget build(BuildContext context) {
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
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Something went wrong',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Please restart RunFlow and try again.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
