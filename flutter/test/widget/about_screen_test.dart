import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/screens/settings/about_screen.dart';

void main() {
  group('AboutScreen', () {
    Widget createTestWidget() {
      return const MaterialApp(
        home: AboutScreen(),
      );
    }

    testWidgets('renders app name', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('RunFlow'), findsOneWidget);
    });

    testWidgets('renders version info', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Version 1.0.0 (1)'), findsOneWidget);
    });

    testWidgets('renders privacy policy link', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Privacy Policy'), findsOneWidget);
    });

    testWidgets('renders terms of service link', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Terms of Service'), findsOneWidget);
    });

    testWidgets('renders open source licenses link', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Open Source Licenses'), findsOneWidget);
    });

    testWidgets('renders app description', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(
        find.textContaining('Your personal running performance dashboard'),
        findsOneWidget,
      );
    });
  });
}
