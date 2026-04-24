import 'package:flutter_test/flutter_test.dart';
import 'package:runflow_flutter/core/utils/formatters.dart';

void main() {
  group('formatPace', () {
    test('formats pace from seconds per km', () {
      expect(formatPace(300), '5:00 /km');
    });

    test('formats pace with seconds', () {
      expect(formatPace(325), '5:25 /km');
    });

    test('returns placeholder for null', () {
      expect(formatPace(null), '--:--');
    });

    test('returns placeholder for zero', () {
      expect(formatPace(0), '--:--');
    });

    test('returns placeholder for negative', () {
      expect(formatPace(-1), '--:--');
    });
  });

  group('formatDistance', () {
    test('formats meters to km when >= 1000', () {
      expect(formatDistance(5000), '5.00 km');
    });

    test('formats meters when < 1000', () {
      expect(formatDistance(500), '500 m');
    });

    test('formats exact km', () {
      expect(formatDistance(1000), '1.00 km');
    });

    test('formats partial km', () {
      expect(formatDistance(8500), '8.50 km');
    });
  });

  group('formatDuration', () {
    test('formats seconds only', () {
      expect(formatDuration(30), '30s');
    });

    test('formats minutes and seconds', () {
      expect(formatDuration(150), '2m 30s');
    });

    test('formats hours, minutes, seconds', () {
      expect(formatDuration(3661), '1h 1m 1s');
    });

    test('formats exact hour', () {
      expect(formatDuration(3600), '1h 0m 0s');
    });
  });

  group('formatRelativeDate', () {
    test('returns Today for today', () {
      final now = DateTime.now();
      expect(formatRelativeDate(now), 'Today');
    });

    test('returns Yesterday for yesterday', () {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      expect(formatRelativeDate(yesterday), 'Yesterday');
    });

    test('returns days ago for recent dates', () {
      final threeDaysAgo = DateTime.now().subtract(const Duration(days: 3));
      expect(formatRelativeDate(threeDaysAgo), '3 days ago');
    });
  });

  group('formatSyncTime', () {
    test('returns Never for null', () {
      expect(formatSyncTime(null), 'Never');
    });

    test('returns relative time for date', () {
      final now = DateTime.now();
      expect(formatSyncTime(now), 'Today');
    });
  });
}
