import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:runflow_flutter/data/models/recording_models.dart';
import 'package:universal_ble/universal_ble.dart' as ble;

enum RecordingStatus { idle, recording, paused }

class RecordingMetrics {
  const RecordingMetrics({
    this.distanceMeters = 0.0,
    this.durationSeconds = 0,
    this.currentPaceSecondsPerKm = 0.0,
    this.currentSpeedMps = 0.0,
    this.averageSpeedMps = 0.0,
    this.currentHr = 0,
    this.averageHr = 0.0,
    this.maxHr = 0,
    this.cadence = 0.0,
    this.averageCadence = 0.0,
    this.gpsAccuracy = 0.0,
    this.currentAltitude,
    this.totalElevation = 0.0,
    this.gpsPointCount = 0,
  });

  final double distanceMeters;
  final int durationSeconds;
  final double currentPaceSecondsPerKm;
  final double currentSpeedMps;
  final double averageSpeedMps;
  final int currentHr;
  final double averageHr;
  final int maxHr;
  final double cadence;
  final double averageCadence;
  final double gpsAccuracy;
  final double? currentAltitude;
  final double totalElevation;
  final int gpsPointCount;
}

class HrSensorInfo {
  const HrSensorInfo({required this.id, required this.name});

  final String id;
  final String name;
}

class WorkoutRecordingService {
  RecordingStatus _status = RecordingStatus.idle;
  DateTime? _startTime;
  int _elapsedMovingSeconds = 0;
  DateTime? _lastResumeTime;

  final List<GpsPoint> _gpsPoints = [];
  final List<HrSample> _hrSamples = [];
  double _totalDistance = 0.0;
  double _maxSpeed = 0.0;
  double _totalElevation = 0.0;
  double? _previousAltitude;
  int _maxHr = 0;
  int _movingPointCount = 0;
  double _totalCadence = 0.0;

  int _currentHr = 0;
  double _currentSpeed = 0.0;
  double _currentCadence = 0.0;
  double _gpsAccuracy = 0.0;
  double? _currentAltitude;

  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<ble.BleDevice>? _scanSubscription;
  StreamSubscription<List<int>>? _hrSubscription;
  Timer? _timer;
  Timer? _metricsTimer;

  HrSensorInfo? _connectedSensor;
  bool _isScanning = false;

  final _statusController = StreamController<RecordingStatus>.broadcast();
  final _metricsController = StreamController<RecordingMetrics>.broadcast();

  static const String _hrServiceUuid = '180D';
  static const String _hrMeasurementUuid = '2A37';

  RecordingStatus get status => _status;
  HrSensorInfo? get connectedSensor => _connectedSensor;
  bool get isScanning => _isScanning;
  bool get isBleConnected => _connectedSensor != null;

  Stream<RecordingStatus> get statusStream => _statusController.stream;
  Stream<RecordingMetrics> get metricsStream => _metricsController.stream;

  RecordingMetrics get currentMetrics => RecordingMetrics(
        distanceMeters: _totalDistance,
        durationSeconds: _elapsedMovingSeconds,
        currentPaceSecondsPerKm:
            _currentSpeed > 0.5 ? 1000 / _currentSpeed : 0,
        currentSpeedMps: _currentSpeed,
        averageSpeedMps: _elapsedMovingSeconds > 0
            ? _totalDistance / _elapsedMovingSeconds
            : 0,
        currentHr: _currentHr,
        averageHr: _hrSamples.isNotEmpty
            ? _hrSamples
                    .map((HrSample s) => s.heartRate)
                    .reduce((int a, int b) => a + b) /
                _hrSamples.length
            : 0,
        maxHr: _maxHr,
        cadence: _currentCadence,
        averageCadence: _movingPointCount > 0
            ? _totalCadence / _movingPointCount
            : 0,
        gpsAccuracy: _gpsAccuracy,
        currentAltitude: _currentAltitude,
        totalElevation: _totalElevation,
        gpsPointCount: _gpsPoints.length,
      );

  Future<bool> requestPermissions() async {
    final bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;

    return true;
  }

  Future<void> startRecording() async {
    if (_status == RecordingStatus.recording) return;

    _status = RecordingStatus.recording;
    _startTime = DateTime.now();
    _lastResumeTime = DateTime.now();
    _statusController.add(_status);

    _startGpsStream();
    _startTimer();
    _startMetricsEmitter();
  }

  void pauseRecording() {
    if (_status != RecordingStatus.recording) return;

    _status = RecordingStatus.paused;
    _updateElapsedTime();
    _lastResumeTime = null;
    _positionSubscription?.pause();
    _timer?.cancel();
    _statusController.add(_status);
  }

  void resumeRecording() {
    if (_status != RecordingStatus.paused) return;

    _status = RecordingStatus.recording;
    _lastResumeTime = DateTime.now();
    _positionSubscription?.resume();
    _startTimer();
    _statusController.add(_status);
  }

  RecordedWorkout? stopRecording() {
    if (_status == RecordingStatus.idle) return null;

    _updateElapsedTime();

    final RecordedWorkout workout = RecordedWorkout(
      name: 'Run',
      startTime: _startTime!,
      durationSeconds: _elapsedMovingSeconds,
      distanceMeters: _totalDistance,
      averageSpeed: _elapsedMovingSeconds > 0
          ? _totalDistance / _elapsedMovingSeconds
          : null,
      maxSpeed: _maxSpeed > 0 ? _maxSpeed : null,
      averageHr: _hrSamples.isNotEmpty
          ? _hrSamples
                  .map((HrSample s) => s.heartRate)
                  .reduce((int a, int b) => a + b) /
              _hrSamples.length
          : null,
      maxHr: _maxHr > 0 ? _maxHr : null,
      averageCadence: _movingPointCount > 0
          ? _totalCadence / _movingPointCount
          : null,
      hasHeartrate: _hrSamples.isNotEmpty,
      gpsPoints: List<GpsPoint>.from(_gpsPoints),
      hrSamples: List<HrSample>.from(_hrSamples),
      totalElevation: _totalElevation > 0 ? _totalElevation : null,
    );

    _reset();
    return workout;
  }

  void discardRecording() {
    _reset();
  }

  void _reset() {
    _status = RecordingStatus.idle;
    _startTime = null;
    _elapsedMovingSeconds = 0;
    _lastResumeTime = null;
    _totalDistance = 0.0;
    _maxSpeed = 0.0;
    _totalElevation = 0.0;
    _previousAltitude = null;
    _maxHr = 0;
    _currentHr = 0;
    _currentSpeed = 0.0;
    _currentCadence = 0.0;
    _gpsAccuracy = 0.0;
    _currentAltitude = null;
    _movingPointCount = 0;
    _totalCadence = 0.0;
    _gpsPoints.clear();
    _hrSamples.clear();

    _positionSubscription?.cancel();
    _positionSubscription = null;
    _timer?.cancel();
    _timer = null;
    _metricsTimer?.cancel();
    _metricsTimer = null;

    _statusController.add(_status);
    _metricsController.add(currentMetrics);
  }

  void _startGpsStream() {
    const LocationSettings locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );

    _positionSubscription =
        Geolocator.getPositionStream(locationSettings: locationSettings).listen(
      (Position position) {
        if (_status != RecordingStatus.recording) return;

        _gpsAccuracy = position.accuracy;
        _currentAltitude = position.altitude;
        _currentSpeed = position.speed > 0 ? position.speed : 0.0;

        final GpsPoint point = GpsPoint(
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude,
          speed: _currentSpeed,
          timestamp: DateTime.now(),
        );

        if (_gpsPoints.isNotEmpty) {
          final GpsPoint last = _gpsPoints.last;
          final double distance = Geolocator.distanceBetween(
            last.latitude,
            last.longitude,
            point.latitude,
            point.longitude,
          );

          if (distance > 0) {
            _totalDistance += distance;
            _movingPointCount++;

            if (point.speed > 0.5) {
              _currentCadence = _estimateCadence(point.speed);
              _totalCadence += _currentCadence;
            }

            if (_previousAltitude != null && point.altitude != null) {
              final double altDiff = point.altitude! - _previousAltitude!;
              if (altDiff > 0) {
                _totalElevation += altDiff;
              }
            }
          }
        }

        if (position.speed > _maxSpeed) {
          _maxSpeed = position.speed;
        }

        _previousAltitude = point.altitude;
        _gpsPoints.add(point);
      },
    );
  }

  double _estimateCadence(double speedMps) {
    final double speedKmh = speedMps * 3.6;
    if (speedKmh < 4) return 0;
    if (speedKmh < 8) return 140 + (speedKmh - 4) * 10;
    if (speedKmh < 14) return 160 + (speedKmh - 8) * 4;
    if (speedKmh < 20) return 170 + (speedKmh - 14) * 2;
    return 185;
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_status == RecordingStatus.recording) {
        _elapsedMovingSeconds++;
        _metricsController.add(currentMetrics);
      }
    });
  }

  void _startMetricsEmitter() {
    _metricsTimer?.cancel();
    _metricsTimer =
        Timer.periodic(const Duration(milliseconds: 500), (_) {
      _metricsController.add(currentMetrics);
    });
  }

  void _updateElapsedTime() {
    if (_lastResumeTime != null) {
      final int additionalSeconds =
          DateTime.now().difference(_lastResumeTime!).inSeconds;
      _elapsedMovingSeconds += additionalSeconds;
    }
  }

  Future<List<HrSensorInfo>> scanForHeartRateMonitors({
    Duration timeout = const Duration(seconds: 10),
  }) async {
    final List<HrSensorInfo> sensors = [];
    final Map<String, String> foundSensors = {};

    _isScanning = true;

    try {
      _scanSubscription =
          ble.UniversalBle.scanStream.listen((ble.BleDevice device) {
        final String name = device.name ?? 'Unknown Device';
        final String id = device.deviceId;
        if (!foundSensors.containsKey(id) && name.isNotEmpty) {
          foundSensors[id] = name;
          sensors.add(HrSensorInfo(id: id, name: name));
        }
      });

      await ble.UniversalBle.startScan(
        scanFilter: ble.ScanFilter(withServices: [_hrServiceUuid]),
      );

      await Future<void>.delayed(timeout);

      await ble.UniversalBle.stopScan();
      await _scanSubscription?.cancel();
      _scanSubscription = null;
    } catch (e) {
      debugPrint('BLE scan error: $e');
      try {
        await ble.UniversalBle.stopScan();
      } catch (_) {}
    }

    _isScanning = false;
    return sensors;
  }

  Future<bool> connectToHeartRateMonitor(
      String deviceId, String deviceName) async {
    if (_connectedSensor != null) {
      await disconnectHeartRateMonitor();
    }
    try {
      await ble.UniversalBle.connect(deviceId);
      await ble.UniversalBle.discoverServices(deviceId);

      _hrSubscription = ble.UniversalBle.characteristicValueStream(
        deviceId,
        _hrMeasurementUuid,
      ).listen((List<int> value) {
        if (value.isNotEmpty) {
          final int flags = value[0];
          final int hr;
          if (flags & 0x01 == 0) {
            hr = value.length > 1 ? value[1] : 0;
          } else {
            hr = value.length > 2
                ? (value[1] | (value[2] << 8))
                : (value.length > 1 ? value[1] : 0);
          }

          _currentHr = hr;
          if (hr > _maxHr) _maxHr = hr;
          _hrSamples.add(HrSample(
            heartRate: hr,
            timestamp: DateTime.now(),
          ));
        }
      });

      await ble.UniversalBle.subscribeNotifications(
        deviceId,
        _hrServiceUuid,
        _hrMeasurementUuid,
      );

      _connectedSensor = HrSensorInfo(id: deviceId, name: deviceName);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> disconnectHeartRateMonitor() async {
    if (_connectedSensor == null) return;

    try {
      await _hrSubscription?.cancel();
      _hrSubscription = null;
      await ble.UniversalBle.disconnect(_connectedSensor!.id);
    } catch (_) {}

    _connectedSensor = null;
    _currentHr = 0;
  }

  Future<void> dispose() async {
    _timer?.cancel();
    _metricsTimer?.cancel();
    await _hrSubscription?.cancel();
    _hrSubscription = null;
    await _scanSubscription?.cancel();
    _scanSubscription = null;
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    await disconnectHeartRateMonitor();
    await _statusController.close();
    await _metricsController.close();
  }
}
