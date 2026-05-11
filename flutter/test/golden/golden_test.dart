import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/data/interceptors/connectivity_interceptor.dart';
import 'package:runflow_flutter/domain/entities/auth_entities.dart';
import 'package:runflow_flutter/domain/entities/chat_entities.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/domain/entities/recording_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';
import 'package:runflow_flutter/presentation/providers/analytics_providers.dart';
import 'package:runflow_flutter/presentation/providers/auth_providers.dart';
import 'package:runflow_flutter/presentation/providers/calibration_providers.dart';
import 'package:runflow_flutter/presentation/providers/chat_providers.dart';
import 'package:runflow_flutter/presentation/providers/dashboard_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/nutrition_targets_provider.dart';
import 'package:runflow_flutter/presentation/providers/recording_providers.dart';
import 'package:runflow_flutter/presentation/screens/chat/chat_screen.dart';
import 'package:runflow_flutter/presentation/screens/dashboard/dashboard_screen.dart';
import 'package:runflow_flutter/presentation/screens/health/nutrition_screen.dart';
import 'package:runflow_flutter/presentation/screens/record/record_screen.dart';
import 'package:runflow_flutter/presentation/widgets/charts/hr_zone_distribution_chart.dart';
import 'package:runflow_flutter/presentation/widgets/shape_calibration_sheet.dart';
import 'package:runflow_flutter/presentation/widgets/training_paces_card.dart';
import 'package:runflow_flutter/services/workout_recording_service.dart';
import '../helpers/test_dashboard_data.dart';

const testStats = AnalyticsStats(
  currentWeekMileage: 42.5,
  effectiveVO2max: 52.3,
  rawVO2max: 51.0,
  vdotCorrectionFactor: 1.0,
  marathonShape: 70,
  currentVdot: 52.1,
  ctl: 45.0,
  atl: 30.0,
  tsb: 15.0,
  workloadRatio: 1.2,
  easyTrimp: 100.0,
  hrMax: 190,
);

class _FakeChatSessions extends ChatSessions {
  _FakeChatSessions(this.data);
  final List<ChatSession> data;

  @override
  Future<List<ChatSession>> build() async => data;

  @override
  Future<void> refresh() async {}

  @override
  Future<ChatSession> createSession() async => data.first;

  @override
  Future<void> deleteSession(String sessionId) async {}
}

class _FakeSessionId extends CurrentSessionIdNotifier {
  _FakeSessionId(this._value);
  final String? _value;

  @override
  String? build() => _value;
}

class _FakeActivities extends Activities {
  @override
  Future<ActivitiesState> build() async {
    return const ActivitiesState(
      activities: [],
      hasMore: false,
      isLoadingMore: false,
      filterType: null,
    );
  }
}

class _FakeDashboard extends Dashboard {
  @override
  Future<DashboardResponse> build() async =>
      TestDashboardData.createResponse();

  @override
  Future<void> refresh() async {}

  @override
  Future<bool> triggerSync() async => true;
}

class _FakeRecordingService implements WorkoutRecordingService {
  @override
  RecordingStatus get status => RecordingStatus.idle;

  @override
  HrSensorInfo? get connectedSensor => null;

  @override
  bool get isScanning => false;

  @override
  bool get isBleConnected => false;

  @override
  List<GpsPoint> get gpsPoints => [];

  @override
  Stream<RecordingStatus> get statusStream =>
      Stream.value(RecordingStatus.idle);

  @override
  Stream<RecordingMetrics> get metricsStream =>
      Stream.value(const RecordingMetrics());

  @override
  RecordingMetrics get currentMetrics => const RecordingMetrics();

  @override
  Future<bool> requestPermissions() async => true;

  @override
  Future<void> startRecording() async {}

  @override
  void pauseRecording() {}

  @override
  void resumeRecording() {}

  @override
  RecordedWorkout? stopRecording() => null;

  @override
  void discardRecording() {}

  @override
  Future<void> dispose() async {}

  @override
  Future<List<HrSensorInfo>> scanForHeartRateMonitors({
    Duration timeout = const Duration(seconds: 10),
  }) async =>
      [];

  @override
  Future<bool> connectToHeartRateMonitor(String a, String b) async => false;

  @override
  Future<void> disconnectHeartRateMonitor() async {}
}

class _FakeNutritionNotifier extends NutritionNotifier {
  @override
  Future<NutritionLog> build(DateTime date) async => NutritionLog(
        id: 1,
        date: date,
        calories: 1350,
        protein: 95,
        carbs: 160,
        fat: 45,
        water: 1.75,
        createdAt: DateTime(2024, 6, 15),
      );

  @override
  Future<void> save(NutritionLog log) async {}
}

void main() {
  group('Golden Tests', () {
    testWidgets('ChatScreen golden - empty state', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatSessionsProvider.overrideWith(
              () => _FakeChatSessions([]),
            ),
            currentSessionIdProvider.overrideWith(
              () => _FakeSessionId(null),
            ),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: ChatScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(ChatScreen),
        matchesGoldenFile('goldens/chat_screen.png'),
      );
    });

    testWidgets('TrainingPacesCard golden', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            analyticsStatsProvider.overrideWith((ref) async => testStats),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(child: TrainingPacesCard()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(TrainingPacesCard),
        matchesGoldenFile('goldens/training_paces_card.png'),
      );
    });

    testWidgets('HrZoneDistributionChart golden', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: HrZoneDistributionChart(
                zoneTimes: [300, 600, 900, 400, 200, 100, 50],
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(HrZoneDistributionChart),
        matchesGoldenFile('goldens/hr_zone_distribution_chart.png'),
      );
    });

    testWidgets('ShapeCalibrationSheet golden', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderScope(
              overrides: [
                calibrationProvider.overrideWith(() => Calibration()),
                analyticsStatsProvider.overrideWith((ref) async => testStats),
                activitiesProvider.overrideWith(() => _FakeActivities()),
              ],
              child: const ShapeCalibrationSheet(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(ShapeCalibrationSheet),
        matchesGoldenFile('goldens/shape_calibration_sheet.png'),
      );
    });

    testWidgets('DashboardScreen golden', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            connectivityInterceptorProvider
                .overrideWithValue(NoOpConnectivityInterceptor()),
            dashboardProvider.overrideWith(() => _FakeDashboard()),
            analyticsStatsProvider.overrideWith((ref) async => testStats),
            currentUserProvider.overrideWithValue(
              const User(
                id: 'user1',
                email: 'test@example.com',
                name: 'Test User',
                emailVerified: true,
              ),
            ),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(DashboardScreen),
        matchesGoldenFile('goldens/dashboard_screen.png'),
      );
    });

    testWidgets('RecordScreen golden - idle state', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            recordingServiceProvider
                .overrideWith((ref) => _FakeRecordingService()),
            bleConnectionProvider.overrideWith(
              () => BleConnectionNotifier(),
            ),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: RecordScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(RecordScreen),
        matchesGoldenFile('goldens/record_screen.png'),
      );
    });

    testWidgets('NutritionScreen golden', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            nutritionProvider.overrideWith2((arg) => _FakeNutritionNotifier()),
            nutritionTargetsProvider
                .overrideWith((ref) async => NutritionTargets.defaults),
            nutritionAnalyticsProvider
                .overrideWith((ref) async => const NutritionAnalytics()),
          ],
          child: const MaterialApp(
            localizationsDelegates: [
              S.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: S.supportedLocales,
            home: NutritionScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byType(NutritionScreen),
        matchesGoldenFile('goldens/nutrition_screen.png'),
      );
    });
  });
}
