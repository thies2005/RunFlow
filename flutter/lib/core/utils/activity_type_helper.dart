import 'package:flutter/material.dart';
import 'package:runflow_flutter/data/models/dashboard_models.dart';

IconData activityTypeIcon(ActivityType type) {
  switch (type) {
    case ActivityType.run:
      return Icons.directions_run;
    case ActivityType.ride:
      return Icons.directions_bike;
    case ActivityType.virtualRide:
      return Icons.directions_bike;
    case ActivityType.walk:
      return Icons.directions_walk;
    case ActivityType.hike:
      return Icons.terrain;
    case ActivityType.swim:
      return Icons.pool;
    case ActivityType.workout:
      return Icons.fitness_center;
    case ActivityType.other:
      return Icons.sports;
  }
}

String activityTypeLabel(ActivityType type) {
  switch (type) {
    case ActivityType.run:
      return 'Run';
    case ActivityType.ride:
      return 'Ride';
    case ActivityType.virtualRide:
      return 'Virtual Ride';
    case ActivityType.walk:
      return 'Walk';
    case ActivityType.hike:
      return 'Hike';
    case ActivityType.swim:
      return 'Swim';
    case ActivityType.workout:
      return 'Workout';
    case ActivityType.other:
      return 'Other';
  }
}

String raceTypeLabel(RaceType type) {
  switch (type) {
    case RaceType.fiveK:
      return '5K';
    case RaceType.tenK:
      return '10K';
    case RaceType.halfMarathon:
      return 'Half Marathon';
    case RaceType.marathon:
      return 'Marathon';
  }
}

double raceTypeDistance(RaceType type) {
  switch (type) {
    case RaceType.fiveK:
      return 5000;
    case RaceType.tenK:
      return 10000;
    case RaceType.halfMarathon:
      return 21097.5;
    case RaceType.marathon:
      return 42195;
  }
}
