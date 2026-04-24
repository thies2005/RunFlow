import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/api_payload.dart';
import 'package:runflow_flutter/data/models/activity_models.dart';
import 'package:runflow_flutter/data/models/auth_models.dart';
import 'package:runflow_flutter/data/models/chat_models.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';
import 'package:runflow_flutter/data/models/profile_models.dart';

void main() {
  group('Server response parsing integration', () {
    group('Activity responses', () {
      test('parses wrapped single activity response', () {
        const json = '''
        {
          "activity": {
            "id": "123",
            "stravaId": "456",
            "type": "RUN",
            "name": "Morning Run",
            "startDate": "2024-06-15T07:30:00Z",
            "distance": 5000.0,
            "movingTime": 1800,
            "averageSpeed": 2.78,
            "averageHr": 150.0,
            "maxHr": 175,
            "averageCadence": 170.0,
            "hasHeartrate": true,
            "totalElevation": 50.0,
            "trimp": 45.5,
            "runningTss": 42.0,
            "estimatedVdot": 48.5,
            "trainingType": "easy"
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final payload = unwrapPayload(data, const ['activity']);
        final activity = Activity.fromJson(payload);
        expect(activity.id, '123');
        expect(activity.type, ActivityType.run);
        expect(activity.distance, 5000.0);
        expect(activity.trainingType, 'easy');
      });

      test('parses activity list response', () {
        const json = '''
        {
          "activities": [
            {
              "id": "123",
              "stravaId": "456",
              "type": "RUN",
              "name": "Morning Run",
              "startDate": "2024-06-15T07:30:00Z",
              "distance": 5000.0,
              "movingTime": 1800,
              "hasHeartrate": false,
              "totalElevation": 0.0
            }
          ],
          "total": 1,
          "limit": 50,
          "offset": 0,
          "hasMore": false
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final response = ActivitiesResponse.fromJson(data);
        expect(response.total, 1);
        expect(response.hasMore, false);
        expect(response.activities.first.id, '123');
        expect(response.activities.first.type, ActivityType.run);
      });
    });

    group('Profile responses', () {
      test('parses wrapped user profile response', () {
        const json = '''
        {
          "user": {
            "id": "user-1",
            "email": "test@example.com",
            "name": "Test User",
            "sex": "MALE",
            "birthDate": "1990-01-15",
            "hrMax": 185,
            "hrRest": 55,
            "weight": 75.0,
            "height": 180.0,
            "hrZone1Max": 120,
            "hrZone2Max": 140,
            "hrZone3Max": 160,
            "hrZone4Max": 175,
            "hrZone5Max": 185,
            "hrZone6Max": 200,
            "thresholdHeartRate": 165,
            "thresholdPace": 300,
            "vdotCorrectionFactor": 1.0,
            "createdAt": "2024-01-01T00:00:00Z"
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final payload = unwrapPayload(data, const ['user']);
        final profile = UserProfile.fromJson(payload);
        expect(profile.id, 'user-1');
        expect(profile.sex, Sex.male);
        expect(profile.hrZone5Max, 185);
        expect(profile.hrZone6Max, 200);
        expect(profile.thresholdHeartRate, 165);
      });
    });

    group('Goal responses', () {
      test('parses wrapped goal response', () {
        const json = '''
        {
          "goal": {
            "id": "goal-1",
            "userId": "user-1",
            "name": "Marathon PR",
            "raceType": "MARATHON",
            "raceDate": "2024-10-15T00:00:00Z",
            "targetTime": 10800,
            "weeklyMileageGoal": 60.0,
            "planWeeks": 16,
            "runsPerWeek": 5,
            "longRunDay": 6,
            "workoutDay": 3,
            "currentVdot": 48.5,
            "predictedTime": 10500,
            "isActive": true,
            "createdAt": "2024-06-15T00:00:00Z",
            "updatedAt": "2024-06-15T00:00:00Z",
            "completedAt": null,
            "workouts": []
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final payload = unwrapPayload(data, const ['goal']);
        final goal = Goal.fromJson(payload);
        expect(goal.id, 'goal-1');
        expect(goal.raceType, RaceType.marathon);
        expect(goal.targetTime, 10800);
        expect(goal.workouts, isEmpty);
        expect(goal.completedAt, isNull);
      });
    });

    group('Dashboard responses', () {
      test('parses flat dashboard response (no envelope)', () {
        const json = '''
        {
          "stats": {
            "currentWeekMileage": 42.5,
            "effectiveVO2max": 48.0,
            "rawVO2max": 47.0,
            "vdotCorrectionFactor": 1.02,
            "marathonShape": 78.5,
            "currentVdot": 48.0,
            "ctl": 45.0,
            "atl": 35.0,
            "tsb": 10.0,
            "workloadRatio": 1.28,
            "easyTrimp": 120.0,
            "hrMax": 185
          },
          "recentActivities": [],
          "goals": [],
          "syncStatus": {
            "syncInProgress": false,
            "lastSyncAt": null,
            "totalActivities": 42
          },
          "user": {
            "id": "user-1",
            "email": "test@example.com",
            "name": "Test User"
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final unwrapped = unwrapPayload(data, const ['dashboard']);
        final dashboard = DashboardResponse.fromJson(unwrapped);
        expect(dashboard.stats.marathonShape, 78.5);
        expect(dashboard.stats.rawVO2max, 47.0);
        expect(dashboard.stats.vdotCorrectionFactor, 1.02);
        expect(dashboard.syncStatus.lastSyncAt, isNull);
        expect(dashboard.user.id, 'user-1');
      });

      test('parses dashboard response with future envelope without breaking', () {
        const json = '''
        {
          "dashboard": {
            "stats": {
              "currentWeekMileage": 42.5,
              "effectiveVO2max": 48.0,
              "rawVO2max": 47.0,
              "vdotCorrectionFactor": 1.02,
              "marathonShape": 78.5,
              "currentVdot": 48.0,
              "ctl": 45.0,
              "atl": 35.0,
              "tsb": 10.0,
              "workloadRatio": 1.28,
              "easyTrimp": 120.0,
              "hrMax": 185
            },
            "recentActivities": [],
            "goals": [],
            "syncStatus": {
              "syncInProgress": false,
              "lastSyncAt": "2024-06-15T12:00:00Z",
              "totalActivities": 42
            },
            "user": {
              "id": "user-1",
              "email": "test@example.com",
              "name": "Test User"
            }
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final unwrapped = unwrapPayload(data, const ['dashboard']);
        final dashboard = DashboardResponse.fromJson(unwrapped);
        expect(dashboard.stats.marathonShape, 78.5);
        expect(dashboard.syncStatus.lastSyncAt, isNotNull);
        expect(dashboard.user.id, 'user-1');
      });
    });

    group('Chat responses', () {
      test('parses create session response with envelope', () {
        const json = '''
        {
          "session": {
            "id": "session-1",
            "title": "New Chat",
            "createdAt": "2024-06-15T12:00:00Z",
            "updatedAt": "2024-06-15T12:00:00Z"
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final payload = unwrapPayload(data, const ['session']);
        final session = ChatSession.fromJson(payload);
        expect(session.id, 'session-1');
      });

      test('parses session list response', () {
        const json = '''
        {
          "sessions": [
            {
              "id": "session-1",
              "title": "Chat 1",
              "createdAt": "2024-06-15T12:00:00Z",
              "updatedAt": "2024-06-15T12:00:00Z"
            }
          ]
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final sessions = (data['sessions'] as List<dynamic>)
            .map((e) => ChatSession.fromJson(e as Map<String, dynamic>))
            .toList();
        expect(sessions.length, 1);
        expect(sessions.first.id, 'session-1');
      });

      test('parses message history response', () {
        const json = '''
        {
          "messages": [
            {
              "id": "msg-1",
              "sessionId": "session-1",
              "role": "user",
              "content": "Hello",
              "createdAt": "2024-06-15T12:00:00Z"
            },
            {
              "id": "msg-2",
              "sessionId": null,
              "role": "assistant",
              "content": "Hi there!",
              "createdAt": "2024-06-15T12:00:01Z"
            }
          ]
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final messages = (data['messages'] as List<dynamic>)
            .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
        expect(messages.length, 2);
        expect(messages[0].role, ChatMessageRole.user);
        expect(messages[1].role, ChatMessageRole.assistant);
        expect(messages[1].sessionId, isNull);
      });
    });

    group('Sync responses', () {
      test('parses sync result with nullable lastSyncAt', () {
        const json = '''
        {
          "success": true,
          "activitiesSynced": 5,
          "lastSyncAt": null
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final unwrapped = unwrapPayload(data, const ['syncResult', 'sync']);
        final result = SyncResult.fromJson(unwrapped);
        expect(result.success, true);
        expect(result.activitiesSynced, 5);
        expect(result.lastSyncAt, isNull);
      });

      test('parses sync result with populated lastSyncAt', () {
        const json = '''
        {
          "success": true,
          "activitiesSynced": 3,
          "lastSyncAt": "2024-06-15T12:00:00Z"
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final unwrapped = unwrapPayload(data, const ['syncResult', 'sync']);
        final result = SyncResult.fromJson(unwrapped);
        expect(result.lastSyncAt, isNotNull);
      });
    });

    group('Auth responses', () {
      test('parses login response', () {
        const json = '''
        {
          "accessToken": "eyJ...",
          "refreshToken": "ref...",
          "expiresIn": 3600,
          "tokenType": "Bearer",
          "user": {
            "id": "user-1",
            "email": "test@example.com",
            "name": "Test User"
          }
        }
        ''';
        final data = jsonDecode(json) as Map<String, dynamic>;
        final response = LoginResponse.fromJson(data);
        expect(response.accessToken, 'eyJ...');
        expect(response.user.id, 'user-1');
        expect(response.user.name, 'Test User');
      });
    });
  });
}
