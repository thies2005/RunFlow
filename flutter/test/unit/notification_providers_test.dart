import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/presentation/providers/notification_providers.dart';
import 'package:runflow_flutter/presentation/providers/profile_providers.dart';
import 'package:runflow_flutter/data/services/notification_service.dart';

void main() {
  group('NotificationServiceProvider', () {
    test('provides NotificationService instance', () {
      final container = ProviderContainer();
      final service = container.read(notificationServiceProvider);
      expect(service, isA<NotificationService>());
      container.dispose();
    });
  });

  group('AppSettings notification defaults', () {
    test('workoutReminders defaults to true', () {
      const settings = AppSettings();
      expect(settings.workoutReminders, true);
    });

    test('supplementReminders defaults to true', () {
      const settings = AppSettings();
      expect(settings.supplementReminders, true);
    });

    test('chatNotifications defaults to true', () {
      const settings = AppSettings();
      expect(settings.chatNotifications, true);
    });

    test('syncNotifications defaults to true', () {
      const settings = AppSettings();
      expect(settings.syncNotifications, true);
    });
  });

  group('AppSettings copyWith', () {
    test('copyWith toggles workoutReminders', () {
      const settings = AppSettings();
      final toggled = settings.copyWith(workoutReminders: false);
      expect(toggled.workoutReminders, false);
      expect(toggled.supplementReminders, true);
    });

    test('copyWith toggles supplementReminders', () {
      const settings = AppSettings();
      final toggled = settings.copyWith(supplementReminders: false);
      expect(toggled.supplementReminders, false);
      expect(toggled.workoutReminders, true);
    });

    test('copyWith toggles chatNotifications', () {
      const settings = AppSettings();
      final toggled = settings.copyWith(chatNotifications: false);
      expect(toggled.chatNotifications, false);
    });

    test('copyWith toggles syncNotifications', () {
      const settings = AppSettings();
      final toggled = settings.copyWith(syncNotifications: false);
      expect(toggled.syncNotifications, false);
    });

    test('copyWith preserves unmodified fields', () {
      const settings = AppSettings(
        workoutReminders: false,
        supplementReminders: false,
        chatNotifications: true,
        syncNotifications: true,
      );
      final updated = settings.copyWith(chatNotifications: false);
      expect(updated.workoutReminders, false);
      expect(updated.supplementReminders, false);
      expect(updated.chatNotifications, false);
      expect(updated.syncNotifications, true);
    });

    test('multiple copyWith calls produce correct state', () {
      const settings = AppSettings();
      final step1 = settings.copyWith(workoutReminders: false);
      final step2 = step1.copyWith(supplementReminders: false);
      final step3 = step2.copyWith(chatNotifications: false);
      final step4 = step3.copyWith(syncNotifications: false);
      expect(step4.workoutReminders, false);
      expect(step4.supplementReminders, false);
      expect(step4.chatNotifications, false);
      expect(step4.syncNotifications, false);
    });
  });

  group('AppSettings re-enable toggles', () {
    test('can re-enable workoutReminders', () {
      const settings = AppSettings();
      final disabled = settings.copyWith(workoutReminders: false);
      final enabled = disabled.copyWith(workoutReminders: true);
      expect(enabled.workoutReminders, true);
    });

    test('can re-enable all notification types', () {
      const settings = AppSettings();
      final allOff = settings.copyWith(
        workoutReminders: false,
        supplementReminders: false,
        chatNotifications: false,
        syncNotifications: false,
      );
      final allOn = allOff.copyWith(
        workoutReminders: true,
        supplementReminders: true,
        chatNotifications: true,
        syncNotifications: true,
      );
      expect(allOn.workoutReminders, true);
      expect(allOn.supplementReminders, true);
      expect(allOn.chatNotifications, true);
      expect(allOn.syncNotifications, true);
    });
  });
}
