import 'dart:async';
import 'dart:math';

import 'package:flutter_tts/flutter_tts.dart';

enum CoachMessageType { pace, hr, distance, motivation, phase }

class VoiceCoachService {
  final FlutterTts _tts = FlutterTts();
  bool _isEnabled = false;
  String _lastPhase = '';
  double _lastMilestone = 0;

  final Map<CoachMessageType, DateTime?> _lastSpokenByType = {};
  final Map<CoachMessageType, Duration> _cooldownByType = {
    CoachMessageType.pace: const Duration(seconds: 45),
    CoachMessageType.hr: const Duration(seconds: 60),
    CoachMessageType.distance: const Duration(seconds: 30),
    CoachMessageType.motivation: const Duration(minutes: 5),
    CoachMessageType.phase: const Duration(seconds: 15),
  };

  int? _lastHrZone;
  int? _currentMaxHr;

  static const _paceDeviationThreshold = 0.15;

  Future<void> init() async {
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.9);
    await _tts.setVolume(1.0);
    await _tts.awaitSpeakCompletion(true);
  }

  void enable() => _isEnabled = true;
  void disable() => _isEnabled = false;
  bool get isEnabled => _isEnabled;

  void setMaxHr(int maxHr) {
    _currentMaxHr = maxHr;
  }

  Future<void> speak(
    String message,
    CoachMessageType type, {
    bool overrideCooldown = false,
  }) async {
    if (!_isEnabled) return;
    final now = DateTime.now();

    if (!overrideCooldown) {
      final lastSpoken = _lastSpokenByType[type];
      final cooldown = _cooldownByType[type] ?? const Duration(seconds: 30);
      if (lastSpoken != null && now.difference(lastSpoken) < cooldown) return;
    }

    _lastSpokenByType[type] = now;
    await _requestAudioFocus();
    await _tts.speak(message);
    await _releaseAudioFocus();
  }

  Future<void> _requestAudioFocus() async {
    try {
      await _tts.setVolume(1.0);
    } catch (_) {}
  }

  Future<void> _releaseAudioFocus() async {}

  int _hrToZone(int hr) {
    final maxHr = _currentMaxHr;
    if (maxHr == null || maxHr <= 0) return 0;
    final pct = hr / maxHr;
    if (pct < 0.60) return 1;
    if (pct < 0.70) return 2;
    if (pct < 0.80) return 3;
    if (pct < 0.90) return 4;
    return 5;
  }

  String _hrZoneName(int zone) {
    switch (zone) {
      case 1:
        return 'zone 1, recovery';
      case 2:
        return 'zone 2, easy';
      case 3:
        return 'zone 3, tempo';
      case 4:
        return 'zone 4, threshold';
      case 5:
        return 'zone 5, maximum';
      default:
        return 'unknown zone';
    }
  }

  Future<void> evaluate({
    required double currentPaceSecondsPerKm,
    required double targetPaceSecondsPerKm,
    required int currentHr,
    required double distanceMeters,
    required double targetDistanceMeters,
    required String workoutType,
    required int durationSeconds,
    int? maxHr,
  }) async {
    if (!_isEnabled) return;

    if (maxHr != null && maxHr > 0) {
      _currentMaxHr = maxHr;
    }

    final phase = _detectPhase(distanceMeters, targetDistanceMeters);
    if (phase != _lastPhase) {
      _lastPhase = phase;
      await speak(
        _phaseAnnouncement(phase),
        CoachMessageType.phase,
        overrideCooldown: true,
      );
      return;
    }

    if (targetDistanceMeters > 0) {
      final progress = distanceMeters / targetDistanceMeters;
      final milestone = (progress * 4).floor() / 4;
      if (milestone > _lastMilestone && milestone > 0) {
        _lastMilestone = milestone;
        await speak(
          _milestoneAnnouncement(milestone),
          CoachMessageType.distance,
          overrideCooldown: true,
        );
        return;
      }
    }

    if (currentHr > 0 && _currentMaxHr != null && _currentMaxHr! > 0) {
      final zone = _hrToZone(currentHr);
      final hrPct = currentHr / _currentMaxHr!;

      if (zone != _lastHrZone && _lastHrZone != null) {
        _lastHrZone = zone;
        await speak(
          'Heart rate now in ${_hrZoneName(zone)}',
          CoachMessageType.hr,
        );
        return;
      }
      _lastHrZone = zone;

      if (hrPct > 0.95) {
        await speak(
          'Heart rate very high, $currentHr BPM. Slow down.',
          CoachMessageType.hr,
        );
        return;
      }

      if (phase == 'cooldown' && hrPct > 0.75) {
        await speak(
          'Slow down more for cooldown, heart rate still high at $currentHr BPM.',
          CoachMessageType.hr,
        );
        return;
      }

      if (phase == 'warmup' && hrPct > 0.80) {
        await speak(
          'Take it easy, heart rate rising too fast during warmup.',
          CoachMessageType.hr,
        );
        return;
      }
    }

    if (targetPaceSecondsPerKm > 0 && currentPaceSecondsPerKm > 0) {
      final deviation =
          (currentPaceSecondsPerKm - targetPaceSecondsPerKm) /
              targetPaceSecondsPerKm;
      if (deviation < -_paceDeviationThreshold) {
        await speak(
          'Slow down, you\'re running too fast',
          CoachMessageType.pace,
        );
        return;
      }
      if (deviation > _paceDeviationThreshold) {
        await speak(
          'Pick it up, you\'re behind target pace',
          CoachMessageType.pace,
        );
        return;
      }
    }

    if (durationSeconds > 0 && durationSeconds % 300 == 0 && durationSeconds > 0) {
      final motivationMessages = [
        'You\'re doing great, keep pushing!',
        'Stay strong, you\'ve got this!',
        'Fantastic effort, keep it going!',
        'Almost there, don\'t give up!',
      ];
      final msg = motivationMessages[Random().nextInt(motivationMessages.length)];
      await speak(msg, CoachMessageType.motivation);
    }
  }

  String _detectPhase(double distance, double target) {
    if (target <= 0) return 'main';
    final progress = distance / target;
    if (progress < 0.10) return 'warmup';
    if (progress < 0.85) return 'main';
    return 'cooldown';
  }

  String _phaseAnnouncement(String phase) {
    switch (phase) {
      case 'warmup':
        return 'Warmup phase. Ease into your pace.';
      case 'main':
        return 'Main phase. Hit your target pace.';
      case 'cooldown':
        return 'Cooldown phase. Great job!';
      default:
        return '';
    }
  }

  String _milestoneAnnouncement(double milestone) {
    switch (milestone) {
      case 0.25:
        return 'Quarter done. Keep it up!';
      case 0.50:
        return 'Halfway there!';
      case 0.75:
        return 'Three quarters done. Almost there!';
      default:
        return '${(milestone * 100).toInt()} percent complete';
    }
  }

  void reset() {
    _lastSpokenByType.clear();
    _lastPhase = '';
    _lastMilestone = 0;
    _lastHrZone = null;
  }

  Future<void> stop() async {
    await _tts.stop();
  }

  Future<void> dispose() async {
    await _tts.stop();
  }
}
