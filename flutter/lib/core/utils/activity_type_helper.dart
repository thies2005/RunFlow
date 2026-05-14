import 'package:flutter/material.dart';
import 'package:runflow_flutter/domain/entities/dashboard_entities.dart';

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
    case RaceType.fiftyK:
      return '50K';
    case RaceType.fiftyMile:
      return '50 Mile';
    case RaceType.hundredK:
      return '100K';
    case RaceType.hundredMile:
      return '100 Mile';
    case RaceType.twelveHour:
      return '12 Hour';
    case RaceType.twentyFourHour:
      return '24 Hour';
    case RaceType.backyardUltra:
      return 'Backyard Ultra';
    case RaceType.customDistance:
      return 'Custom';
    case RaceType.sprintTri:
      return 'Sprint Tri';
    case RaceType.olympicTri:
      return 'Olympic Tri';
    case RaceType.halfIronman:
      return 'Half Ironman';
    case RaceType.fullIronman:
      return 'Full Ironman';
    case RaceType.customTri:
      return 'Custom Tri';
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
    case RaceType.fiftyK:
      return 50000;
    case RaceType.fiftyMile:
      return 80467;
    case RaceType.hundredK:
      return 100000;
    case RaceType.hundredMile:
      return 160934;
    case RaceType.twelveHour:
      return 0;
    case RaceType.twentyFourHour:
      return 0;
    case RaceType.backyardUltra:
      return 0;
    case RaceType.customDistance:
      return 0;
    case RaceType.sprintTri:
      return 0;
    case RaceType.olympicTri:
      return 0;
    case RaceType.halfIronman:
      return 0;
    case RaceType.fullIronman:
      return 0;
    case RaceType.customTri:
      return 0;
  }
}

String triRaceTypeKey(RaceType type) {
  switch (type) {
    case RaceType.sprintTri:
      return 'SPRINT_TRI';
    case RaceType.olympicTri:
      return 'OLYMPIC_TRI';
    case RaceType.halfIronman:
      return 'HALF_IRONMAN';
    case RaceType.fullIronman:
      return 'FULL_IRONMAN';
    default:
      return 'SPRINT_TRI';
  }
}
