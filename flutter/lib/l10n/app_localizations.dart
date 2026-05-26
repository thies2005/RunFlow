import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of S
/// returned by `S.of(context)`.
///
/// Applications need to include `S.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: S.localizationsDelegates,
///   supportedLocales: S.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the S.supportedLocales
/// property.
abstract class S {
  S(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static S of(BuildContext context) {
    return Localizations.of<S>(context, S)!;
  }

  static const LocalizationsDelegate<S> delegate = _SDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
  ];

  /// Application title
  ///
  /// In en, this message translates to:
  /// **'RunFlow'**
  String get appTitle;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan'**
  String get navPlan;

  /// No description provided for @navRecord.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get navRecord;

  /// No description provided for @navHealth.
  ///
  /// In en, this message translates to:
  /// **'Health'**
  String get navHealth;

  /// No description provided for @navActivities.
  ///
  /// In en, this message translates to:
  /// **'Activities'**
  String get navActivities;

  /// No description provided for @navAthlete.
  ///
  /// In en, this message translates to:
  /// **'Athlete'**
  String get navAthlete;

  /// No description provided for @authLogin.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get authLogin;

  /// No description provided for @authRegister.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get authRegister;

  /// No description provided for @authEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmail;

  /// No description provided for @authPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPassword;

  /// No description provided for @authForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot Password'**
  String get authForgotPassword;

  /// No description provided for @authSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get authSignIn;

  /// No description provided for @authSignUp.
  ///
  /// In en, this message translates to:
  /// **'Sign Up'**
  String get authSignUp;

  /// No description provided for @authSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get authSignOut;

  /// No description provided for @authContinueWithStrava.
  ///
  /// In en, this message translates to:
  /// **'Continue with Strava'**
  String get authContinueWithStrava;

  /// No description provided for @authStravaUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Strava Unavailable'**
  String get authStravaUnavailable;

  /// No description provided for @authAlreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? '**
  String get authAlreadyHaveAccount;

  /// No description provided for @authNoAccountYet.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account? '**
  String get authNoAccountYet;

  /// No description provided for @authRememberPassword.
  ///
  /// In en, this message translates to:
  /// **'Remember your password? '**
  String get authRememberPassword;

  /// No description provided for @authOr.
  ///
  /// In en, this message translates to:
  /// **'OR'**
  String get authOr;

  /// No description provided for @authInvalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'Invalid credentials. Please try again.'**
  String get authInvalidCredentials;

  /// No description provided for @authNetworkError.
  ///
  /// In en, this message translates to:
  /// **'Network error. Please check your connection.'**
  String get authNetworkError;

  /// No description provided for @authLoginCancelled.
  ///
  /// In en, this message translates to:
  /// **'Login was cancelled.'**
  String get authLoginCancelled;

  /// No description provided for @authLoginFailed.
  ///
  /// In en, this message translates to:
  /// **'Login failed. Please try again.'**
  String get authLoginFailed;

  /// No description provided for @authYourRunningDashboard.
  ///
  /// In en, this message translates to:
  /// **'Your running performance dashboard'**
  String get authYourRunningDashboard;

  /// No description provided for @authEmailHint.
  ///
  /// In en, this message translates to:
  /// **'you@example.com'**
  String get authEmailHint;

  /// No description provided for @authResetPassword.
  ///
  /// In en, this message translates to:
  /// **'Reset Password'**
  String get authResetPassword;

  /// No description provided for @authSendResetLink.
  ///
  /// In en, this message translates to:
  /// **'Send Reset Link'**
  String get authSendResetLink;

  /// No description provided for @authResetInstructions.
  ///
  /// In en, this message translates to:
  /// **'Enter your email address and we\'ll send you a link to reset your password.'**
  String get authResetInstructions;

  /// No description provided for @authPasswordResetSent.
  ///
  /// In en, this message translates to:
  /// **'Password reset link sent!'**
  String get authPasswordResetSent;

  /// No description provided for @authCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get authCreateAccount;

  /// No description provided for @authConfirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm Password'**
  String get authConfirmPassword;

  /// No description provided for @authPasswordsDoNotMatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match'**
  String get authPasswordsDoNotMatch;

  /// No description provided for @authRegistrationFailed.
  ///
  /// In en, this message translates to:
  /// **'Registration failed. Please try again.'**
  String get authRegistrationFailed;

  /// No description provided for @authVerificationSent.
  ///
  /// In en, this message translates to:
  /// **'Verification email sent!'**
  String get authVerificationSent;

  /// No description provided for @authVerifyEmail.
  ///
  /// In en, this message translates to:
  /// **'Verify Email'**
  String get authVerifyEmail;

  /// No description provided for @actionSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get actionSave;

  /// No description provided for @actionCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get actionCancel;

  /// No description provided for @actionDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get actionDelete;

  /// No description provided for @actionConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get actionConfirm;

  /// No description provided for @actionRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get actionRetry;

  /// No description provided for @actionLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get actionLoading;

  /// No description provided for @actionError.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get actionError;

  /// No description provided for @actionReset.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get actionReset;

  /// No description provided for @actionDiscard.
  ///
  /// In en, this message translates to:
  /// **'Discard'**
  String get actionDiscard;

  /// No description provided for @actionDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get actionDone;

  /// No description provided for @actionClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get actionClose;

  /// No description provided for @actionEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get actionEdit;

  /// No description provided for @actionApply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get actionApply;

  /// No description provided for @actionSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get actionSearch;

  /// No description provided for @actionRefresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get actionRefresh;

  /// No description provided for @actionSync.
  ///
  /// In en, this message translates to:
  /// **'Sync'**
  String get actionSync;

  /// No description provided for @actionSyncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync Now'**
  String get actionSyncNow;

  /// No description provided for @actionNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get actionNext;

  /// No description provided for @actionBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get actionBack;

  /// No description provided for @actionSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get actionSkip;

  /// No description provided for @actionContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get actionContinue;

  /// No description provided for @actionSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit'**
  String get actionSubmit;

  /// No description provided for @actionSend.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get actionSend;

  /// No description provided for @actionCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get actionCreate;

  /// No description provided for @actionAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get actionAdd;

  /// No description provided for @actionRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get actionRemove;

  /// No description provided for @actionUpdate.
  ///
  /// In en, this message translates to:
  /// **'Update'**
  String get actionUpdate;

  /// No description provided for @actionViewAll.
  ///
  /// In en, this message translates to:
  /// **'View All'**
  String get actionViewAll;

  /// No description provided for @actionDownload.
  ///
  /// In en, this message translates to:
  /// **'Download'**
  String get actionDownload;

  /// No description provided for @actionShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get actionShare;

  /// No description provided for @actionCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get actionCopy;

  /// No description provided for @actionCopied.
  ///
  /// In en, this message translates to:
  /// **'Copied!'**
  String get actionCopied;

  /// No description provided for @statusLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get statusLoading;

  /// No description provided for @statusError.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get statusError;

  /// No description provided for @statusSyncing.
  ///
  /// In en, this message translates to:
  /// **'Syncing...'**
  String get statusSyncing;

  /// No description provided for @statusLastSynced.
  ///
  /// In en, this message translates to:
  /// **'Last synced'**
  String get statusLastSynced;

  /// No description provided for @statusConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get statusConnected;

  /// No description provided for @statusDisconnected.
  ///
  /// In en, this message translates to:
  /// **'Disconnected'**
  String get statusDisconnected;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get statusPending;

  /// No description provided for @statusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get statusActive;

  /// No description provided for @statusPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get statusPaused;

  /// No description provided for @statusNoData.
  ///
  /// In en, this message translates to:
  /// **'No data available'**
  String get statusNoData;

  /// No description provided for @dashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'RunFlow'**
  String get dashboardTitle;

  /// No description provided for @dashboardThisWeek.
  ///
  /// In en, this message translates to:
  /// **'This Week'**
  String get dashboardThisWeek;

  /// No description provided for @dashboardWeeklyMileage.
  ///
  /// In en, this message translates to:
  /// **'Weekly Mileage'**
  String get dashboardWeeklyMileage;

  /// No description provided for @dashboardActivities.
  ///
  /// In en, this message translates to:
  /// **'Activities'**
  String get dashboardActivities;

  /// No description provided for @dashboardVo2max.
  ///
  /// In en, this message translates to:
  /// **'VO2max'**
  String get dashboardVo2max;

  /// No description provided for @dashboardTsb.
  ///
  /// In en, this message translates to:
  /// **'TSB'**
  String get dashboardTsb;

  /// No description provided for @dashboardCtl.
  ///
  /// In en, this message translates to:
  /// **'CTL (Fitness)'**
  String get dashboardCtl;

  /// No description provided for @dashboardAtl.
  ///
  /// In en, this message translates to:
  /// **'ATL (Fatigue)'**
  String get dashboardAtl;

  /// No description provided for @dashboardTodayWorkout.
  ///
  /// In en, this message translates to:
  /// **'Today\'s Workout'**
  String get dashboardTodayWorkout;

  /// No description provided for @dashboardRecentActivities.
  ///
  /// In en, this message translates to:
  /// **'Recent Activities'**
  String get dashboardRecentActivities;

  /// No description provided for @dashboardNoActivities.
  ///
  /// In en, this message translates to:
  /// **'No activities yet'**
  String get dashboardNoActivities;

  /// No description provided for @dashboardSwitchWorkout.
  ///
  /// In en, this message translates to:
  /// **'Switch Workout'**
  String get dashboardSwitchWorkout;

  /// No description provided for @dashboardStartWorkout.
  ///
  /// In en, this message translates to:
  /// **'Start Workout'**
  String get dashboardStartWorkout;

  /// No description provided for @dashboardWorkoutUpdated.
  ///
  /// In en, this message translates to:
  /// **'Workout updated'**
  String get dashboardWorkoutUpdated;

  /// No description provided for @dashboardNoPendingWorkouts.
  ///
  /// In en, this message translates to:
  /// **'No pending workouts available'**
  String get dashboardNoPendingWorkouts;

  /// No description provided for @dashboardSyncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync Now'**
  String get dashboardSyncNow;

  /// No description provided for @recordReadyToRecord.
  ///
  /// In en, this message translates to:
  /// **'Ready to record'**
  String get recordReadyToRecord;

  /// No description provided for @recordTapToStart.
  ///
  /// In en, this message translates to:
  /// **'Tap the button to start your workout'**
  String get recordTapToStart;

  /// No description provided for @recordStart.
  ///
  /// In en, this message translates to:
  /// **'START'**
  String get recordStart;

  /// No description provided for @recordPause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get recordPause;

  /// No description provided for @recordResume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get recordResume;

  /// No description provided for @recordStop.
  ///
  /// In en, this message translates to:
  /// **'Stop'**
  String get recordStop;

  /// No description provided for @recordRecordingError.
  ///
  /// In en, this message translates to:
  /// **'Recording Error'**
  String get recordRecordingError;

  /// No description provided for @recordLocationPermissionRequired.
  ///
  /// In en, this message translates to:
  /// **'Location permission is required to record'**
  String get recordLocationPermissionRequired;

  /// No description provided for @recordWorkoutSaved.
  ///
  /// In en, this message translates to:
  /// **'Workout saved!'**
  String get recordWorkoutSaved;

  /// No description provided for @recordFailedToSave.
  ///
  /// In en, this message translates to:
  /// **'Failed to save'**
  String get recordFailedToSave;

  /// No description provided for @recordWorkoutComplete.
  ///
  /// In en, this message translates to:
  /// **'Workout Complete'**
  String get recordWorkoutComplete;

  /// No description provided for @recordNoHrSensor.
  ///
  /// In en, this message translates to:
  /// **'No HR sensor paired'**
  String get recordNoHrSensor;

  /// No description provided for @recordScan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get recordScan;

  /// No description provided for @recordDisconnect.
  ///
  /// In en, this message translates to:
  /// **'Disconnect'**
  String get recordDisconnect;

  /// No description provided for @recordFailedToConnect.
  ///
  /// In en, this message translates to:
  /// **'Failed to connect'**
  String get recordFailedToConnect;

  /// No description provided for @recordGpsSearching.
  ///
  /// In en, this message translates to:
  /// **'GPS searching...'**
  String get recordGpsSearching;

  /// No description provided for @recordMapComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Map coming soon'**
  String get recordMapComingSoon;

  /// No description provided for @recordVoiceCoach.
  ///
  /// In en, this message translates to:
  /// **'Voice Coach'**
  String get recordVoiceCoach;

  /// No description provided for @healthTitle.
  ///
  /// In en, this message translates to:
  /// **'Health'**
  String get healthTitle;

  /// No description provided for @healthNutrition.
  ///
  /// In en, this message translates to:
  /// **'Nutrition'**
  String get healthNutrition;

  /// No description provided for @healthBody.
  ///
  /// In en, this message translates to:
  /// **'Body'**
  String get healthBody;

  /// No description provided for @healthSupplements.
  ///
  /// In en, this message translates to:
  /// **'Supplements'**
  String get healthSupplements;

  /// No description provided for @healthSleep.
  ///
  /// In en, this message translates to:
  /// **'Sleep'**
  String get healthSleep;

  /// No description provided for @healthVitals.
  ///
  /// In en, this message translates to:
  /// **'Vitals'**
  String get healthVitals;

  /// No description provided for @healthFasting.
  ///
  /// In en, this message translates to:
  /// **'Fasting'**
  String get healthFasting;

  /// No description provided for @healthQuickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get healthQuickActions;

  /// No description provided for @healthScanFood.
  ///
  /// In en, this message translates to:
  /// **'Scan Food'**
  String get healthScanFood;

  /// No description provided for @healthAiScan.
  ///
  /// In en, this message translates to:
  /// **'AI Scan'**
  String get healthAiScan;

  /// No description provided for @healthLogFood.
  ///
  /// In en, this message translates to:
  /// **'Log Food'**
  String get healthLogFood;

  /// No description provided for @healthSyncedWithHealthConnect.
  ///
  /// In en, this message translates to:
  /// **'Synced with Health Connect'**
  String get healthSyncedWithHealthConnect;

  /// No description provided for @healthNoData.
  ///
  /// In en, this message translates to:
  /// **'No {label} data'**
  String healthNoData(String label);

  /// No description provided for @healthConnect.
  ///
  /// In en, this message translates to:
  /// **'Connect'**
  String get healthConnect;

  /// No description provided for @healthDismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get healthDismiss;

  /// No description provided for @healthKcalEaten.
  ///
  /// In en, this message translates to:
  /// **'kcal eaten'**
  String get healthKcalEaten;

  /// No description provided for @healthItemsTaken.
  ///
  /// In en, this message translates to:
  /// **'items taken'**
  String get healthItemsTaken;

  /// No description provided for @healthLastNight.
  ///
  /// In en, this message translates to:
  /// **'last night'**
  String get healthLastNight;

  /// No description provided for @healthNotFasting.
  ///
  /// In en, this message translates to:
  /// **'Not fasting'**
  String get healthNotFasting;

  /// No description provided for @healthStartFast.
  ///
  /// In en, this message translates to:
  /// **'Start Fast'**
  String get healthStartFast;

  /// No description provided for @healthActiveFast.
  ///
  /// In en, this message translates to:
  /// **'Active fast'**
  String get healthActiveFast;

  /// No description provided for @healthBodyFat.
  ///
  /// In en, this message translates to:
  /// **'body fat'**
  String get healthBodyFat;

  /// No description provided for @healthRestingHr.
  ///
  /// In en, this message translates to:
  /// **'resting HR'**
  String get healthRestingHr;

  /// No description provided for @healthHrv.
  ///
  /// In en, this message translates to:
  /// **'HRV'**
  String get healthHrv;

  /// No description provided for @healthVitalsLabel.
  ///
  /// In en, this message translates to:
  /// **'vitals'**
  String get healthVitalsLabel;

  /// No description provided for @settingsProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get settingsProfile;

  /// No description provided for @settingsTheme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get settingsTheme;

  /// No description provided for @settingsNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get settingsNotifications;

  /// No description provided for @settingsApiKey.
  ///
  /// In en, this message translates to:
  /// **'API Key'**
  String get settingsApiKey;

  /// No description provided for @settingsLogout.
  ///
  /// In en, this message translates to:
  /// **'Logout'**
  String get settingsLogout;

  /// No description provided for @settingsLightTheme.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get settingsLightTheme;

  /// No description provided for @settingsDarkTheme.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get settingsDarkTheme;

  /// No description provided for @settingsSystemTheme.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get settingsSystemTheme;

  /// No description provided for @settingsAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get settingsAbout;

  /// No description provided for @settingsLogs.
  ///
  /// In en, this message translates to:
  /// **'Logs'**
  String get settingsLogs;

  /// No description provided for @settingsAiSettings.
  ///
  /// In en, this message translates to:
  /// **'AI Settings'**
  String get settingsAiSettings;

  /// No description provided for @settingsPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy'**
  String get settingsPrivacy;

  /// No description provided for @settingsDataExport.
  ///
  /// In en, this message translates to:
  /// **'Data Export'**
  String get settingsDataExport;

  /// No description provided for @chatAiCoach.
  ///
  /// In en, this message translates to:
  /// **'AI Coach'**
  String get chatAiCoach;

  /// No description provided for @chatAskYourCoach.
  ///
  /// In en, this message translates to:
  /// **'Ask your AI Coach'**
  String get chatAskYourCoach;

  /// No description provided for @chatYourAiRunningCoach.
  ///
  /// In en, this message translates to:
  /// **'Your AI Running Coach'**
  String get chatYourAiRunningCoach;

  /// No description provided for @chatNewChat.
  ///
  /// In en, this message translates to:
  /// **'New Chat'**
  String get chatNewChat;

  /// No description provided for @chatChatHistory.
  ///
  /// In en, this message translates to:
  /// **'Chat History'**
  String get chatChatHistory;

  /// No description provided for @chatNoSessions.
  ///
  /// In en, this message translates to:
  /// **'No chat sessions yet'**
  String get chatNoSessions;

  /// No description provided for @chatDeleteChat.
  ///
  /// In en, this message translates to:
  /// **'Delete Chat'**
  String get chatDeleteChat;

  /// No description provided for @chatAskCoachHint.
  ///
  /// In en, this message translates to:
  /// **'Ask your AI coach...'**
  String get chatAskCoachHint;

  /// No description provided for @chatJustNow.
  ///
  /// In en, this message translates to:
  /// **'just now'**
  String get chatJustNow;

  /// No description provided for @chatMinutesAgo.
  ///
  /// In en, this message translates to:
  /// **'{minutes}m ago'**
  String chatMinutesAgo(int minutes);

  /// No description provided for @chatHoursAgo.
  ///
  /// In en, this message translates to:
  /// **'{hours}h ago'**
  String chatHoursAgo(int hours);

  /// No description provided for @chatDaysAgo.
  ///
  /// In en, this message translates to:
  /// **'{days}d ago'**
  String chatDaysAgo(int days);

  /// No description provided for @chatPromptFitnessLevel.
  ///
  /// In en, this message translates to:
  /// **'What\'s my current fitness level?'**
  String get chatPromptFitnessLevel;

  /// No description provided for @chatPromptWorkoutToday.
  ///
  /// In en, this message translates to:
  /// **'Suggest a workout for today'**
  String get chatPromptWorkoutToday;

  /// No description provided for @chatPromptTaper.
  ///
  /// In en, this message translates to:
  /// **'How should I taper for my race?'**
  String get chatPromptTaper;

  /// No description provided for @chatPromptAnalyzeTraining.
  ///
  /// In en, this message translates to:
  /// **'Analyze my recent training'**
  String get chatPromptAnalyzeTraining;

  /// No description provided for @chatIntroDescription.
  ///
  /// In en, this message translates to:
  /// **'Get personalized training advice, workout suggestions, and race strategy based on your data.'**
  String get chatIntroDescription;

  /// No description provided for @chatFailedToCreateSession.
  ///
  /// In en, this message translates to:
  /// **'Failed to create session: {error}'**
  String chatFailedToCreateSession(String error);

  /// No description provided for @chatFailedToStartSession.
  ///
  /// In en, this message translates to:
  /// **'Failed to start session: {error}'**
  String chatFailedToStartSession(String error);

  /// No description provided for @chatDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete \"{title}\"?'**
  String chatDeleteConfirm(String title);

  /// No description provided for @chatCalorieSnap.
  ///
  /// In en, this message translates to:
  /// **'Calorie Snap'**
  String get chatCalorieSnap;

  /// No description provided for @chatPromptLibrary.
  ///
  /// In en, this message translates to:
  /// **'Prompt Library'**
  String get chatPromptLibrary;

  /// No description provided for @chatMealLogged.
  ///
  /// In en, this message translates to:
  /// **'Meal Logged'**
  String get chatMealLogged;

  /// No description provided for @chatStreamingError.
  ///
  /// In en, this message translates to:
  /// **'Failed to get response. Please try again.'**
  String get chatStreamingError;

  /// No description provided for @chatRateLimited.
  ///
  /// In en, this message translates to:
  /// **'The AI is currently busy. Please try again in a moment.'**
  String get chatRateLimited;

  /// No description provided for @chatCategoryTraining.
  ///
  /// In en, this message translates to:
  /// **'Training'**
  String get chatCategoryTraining;

  /// No description provided for @chatCategoryRecovery.
  ///
  /// In en, this message translates to:
  /// **'Recovery'**
  String get chatCategoryRecovery;

  /// No description provided for @chatCategoryNutrition.
  ///
  /// In en, this message translates to:
  /// **'Nutrition'**
  String get chatCategoryNutrition;

  /// No description provided for @chatCategoryPacing.
  ///
  /// In en, this message translates to:
  /// **'Pacing'**
  String get chatCategoryPacing;

  /// No description provided for @chatPromptTaperRace.
  ///
  /// In en, this message translates to:
  /// **'How should I taper for my upcoming race?'**
  String get chatPromptTaperRace;

  /// No description provided for @chatPromptAnalyzeLoad.
  ///
  /// In en, this message translates to:
  /// **'Can you analyze my recent training load?'**
  String get chatPromptAnalyzeLoad;

  /// No description provided for @chatPromptPaceLongRun.
  ///
  /// In en, this message translates to:
  /// **'What pace should I run my next long run?'**
  String get chatPromptPaceLongRun;

  /// No description provided for @chatPromptSleepPeak.
  ///
  /// In en, this message translates to:
  /// **'How much sleep do I need during peak training?'**
  String get chatPromptSleepPeak;

  /// No description provided for @chatPromptOvertraining.
  ///
  /// In en, this message translates to:
  /// **'What are the signs of overtraining?'**
  String get chatPromptOvertraining;

  /// No description provided for @chatPromptRecoveryMarathon.
  ///
  /// In en, this message translates to:
  /// **'Best recovery methods after a marathon?'**
  String get chatPromptRecoveryMarathon;

  /// No description provided for @chatPromptEatBeforeLongRun.
  ///
  /// In en, this message translates to:
  /// **'What should I eat before a long run?'**
  String get chatPromptEatBeforeLongRun;

  /// No description provided for @chatPromptFuelHalfMarathon.
  ///
  /// In en, this message translates to:
  /// **'How to fuel during a half marathon?'**
  String get chatPromptFuelHalfMarathon;

  /// No description provided for @chatPromptPostRunProtein.
  ///
  /// In en, this message translates to:
  /// **'Post-run protein recommendations?'**
  String get chatPromptPostRunProtein;

  /// No description provided for @chatPromptPredicted5k.
  ///
  /// In en, this message translates to:
  /// **'What is my predicted 5K pace?'**
  String get chatPromptPredicted5k;

  /// No description provided for @chatPromptHillyMarathon.
  ///
  /// In en, this message translates to:
  /// **'How to pace a hilly marathon?'**
  String get chatPromptHillyMarathon;

  /// No description provided for @chatPromptNegativeSplits.
  ///
  /// In en, this message translates to:
  /// **'Should I use negative splits?'**
  String get chatPromptNegativeSplits;

  /// No description provided for @aiCoachFeedback.
  ///
  /// In en, this message translates to:
  /// **'AI Coach Feedback'**
  String get aiCoachFeedback;

  /// No description provided for @aiAnalysisFailed.
  ///
  /// In en, this message translates to:
  /// **'Analysis Failed'**
  String get aiAnalysisFailed;

  /// No description provided for @aiRateLimited.
  ///
  /// In en, this message translates to:
  /// **'The AI is currently busy analyzing other runs. Please try again in a moment.'**
  String get aiRateLimited;

  /// No description provided for @aiFeedbackError.
  ///
  /// In en, this message translates to:
  /// **'An error occurred while generating your feedback.'**
  String get aiFeedbackError;

  /// No description provided for @aiTryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try Again'**
  String get aiTryAgain;

  /// No description provided for @aiRetrying.
  ///
  /// In en, this message translates to:
  /// **'Retrying...'**
  String get aiRetrying;

  /// No description provided for @aiGetAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Get AI Analysis'**
  String get aiGetAnalysis;

  /// No description provided for @aiGenerating.
  ///
  /// In en, this message translates to:
  /// **'Generating...'**
  String get aiGenerating;

  /// No description provided for @aiFeedbackDescription.
  ///
  /// In en, this message translates to:
  /// **'Get personalized analysis comparing this run to your planned workout and goals.'**
  String get aiFeedbackDescription;

  /// No description provided for @aiRegenerate.
  ///
  /// In en, this message translates to:
  /// **'Regenerate'**
  String get aiRegenerate;

  /// No description provided for @aiRegenerating.
  ///
  /// In en, this message translates to:
  /// **'Regenerating...'**
  String get aiRegenerating;

  /// No description provided for @aiVsPlannedWorkout.
  ///
  /// In en, this message translates to:
  /// **'Vs Planned Workout'**
  String get aiVsPlannedWorkout;

  /// No description provided for @aiProgressExecution.
  ///
  /// In en, this message translates to:
  /// **'Progress & Execution'**
  String get aiProgressExecution;

  /// No description provided for @aiGoalTrajectory.
  ///
  /// In en, this message translates to:
  /// **'Goal Trajectory'**
  String get aiGoalTrajectory;

  /// No description provided for @activitiesTitle.
  ///
  /// In en, this message translates to:
  /// **'Activities'**
  String get activitiesTitle;

  /// No description provided for @activitiesAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get activitiesAll;

  /// No description provided for @activitiesNoActivities.
  ///
  /// In en, this message translates to:
  /// **'No activities yet'**
  String get activitiesNoActivities;

  /// No description provided for @activitiesSyncMessage.
  ///
  /// In en, this message translates to:
  /// **'Activities will appear here after you sync with Strava.'**
  String get activitiesSyncMessage;

  /// No description provided for @activityDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Activity Detail'**
  String get activityDetailTitle;

  /// No description provided for @activityTrainingType.
  ///
  /// In en, this message translates to:
  /// **'Training Type'**
  String get activityTrainingType;

  /// No description provided for @activityEstimatedVdot.
  ///
  /// In en, this message translates to:
  /// **'Estimated VDOT'**
  String get activityEstimatedVdot;

  /// No description provided for @athleteProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get athleteProfile;

  /// No description provided for @athleteEditProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get athleteEditProfile;

  /// No description provided for @athleteGoals.
  ///
  /// In en, this message translates to:
  /// **'Goals'**
  String get athleteGoals;

  /// No description provided for @profileHrZones.
  ///
  /// In en, this message translates to:
  /// **'HR Zones'**
  String get profileHrZones;

  /// No description provided for @profileSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get profileSettings;

  /// No description provided for @profileAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get profileAnalytics;

  /// No description provided for @profileDeleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get profileDeleteAccount;

  /// No description provided for @profileLogoutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to logout? All local data will be cleared.'**
  String get profileLogoutConfirm;

  /// No description provided for @profileDeleteAccountWarning.
  ///
  /// In en, this message translates to:
  /// **'This action is permanent and cannot be undone. All your data will be deleted.'**
  String get profileDeleteAccountWarning;

  /// No description provided for @profileDeleteAccountContactSupport.
  ///
  /// In en, this message translates to:
  /// **'To delete your account, please contact support at support@runflow.app'**
  String get profileDeleteAccountContactSupport;

  /// No description provided for @profileStravaConnected.
  ///
  /// In en, this message translates to:
  /// **'Strava Connected'**
  String get profileStravaConnected;

  /// No description provided for @profileStravaAuthExpired.
  ///
  /// In en, this message translates to:
  /// **'Strava Auth Expired'**
  String get profileStravaAuthExpired;

  /// No description provided for @profileStravaNotConnected.
  ///
  /// In en, this message translates to:
  /// **'Strava Not Connected'**
  String get profileStravaNotConnected;

  /// No description provided for @goalSetup.
  ///
  /// In en, this message translates to:
  /// **'Goal Setup'**
  String get goalSetup;

  /// No description provided for @goalDetail.
  ///
  /// In en, this message translates to:
  /// **'Goal Detail'**
  String get goalDetail;

  /// No description provided for @goalList.
  ///
  /// In en, this message translates to:
  /// **'Goals'**
  String get goalList;

  /// No description provided for @goalNoGoals.
  ///
  /// In en, this message translates to:
  /// **'No goals yet'**
  String get goalNoGoals;

  /// No description provided for @onboardingWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome to RunFlow'**
  String get onboardingWelcome;

  /// No description provided for @onboardingGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get onboardingGetStarted;

  /// No description provided for @onboardingImportHistory.
  ///
  /// In en, this message translates to:
  /// **'Import your history'**
  String get onboardingImportHistory;

  /// No description provided for @onboardingImportHistorySubtitle.
  ///
  /// In en, this message translates to:
  /// **'RunFlow needs your activity history to start your adaptive training plan.'**
  String get onboardingImportHistorySubtitle;

  /// No description provided for @onboardingActivitiesFound.
  ///
  /// In en, this message translates to:
  /// **'Activities found'**
  String get onboardingActivitiesFound;

  /// No description provided for @onboardingSyncingActive.
  ///
  /// In en, this message translates to:
  /// **'Syncing active... this might take a minute.'**
  String get onboardingSyncingActive;

  /// No description provided for @onboardingImportRange.
  ///
  /// In en, this message translates to:
  /// **'Import Range'**
  String get onboardingImportRange;

  /// No description provided for @onboardingLastMonth.
  ///
  /// In en, this message translates to:
  /// **'Last Month'**
  String get onboardingLastMonth;

  /// No description provided for @onboardingLastThreeMonths.
  ///
  /// In en, this message translates to:
  /// **'Last 3 Months'**
  String get onboardingLastThreeMonths;

  /// No description provided for @onboardingLastSixMonths.
  ///
  /// In en, this message translates to:
  /// **'Last 6 Months'**
  String get onboardingLastSixMonths;

  /// No description provided for @onboardingLastYear.
  ///
  /// In en, this message translates to:
  /// **'Last Year'**
  String get onboardingLastYear;

  /// No description provided for @onboardingAllHistory.
  ///
  /// In en, this message translates to:
  /// **'All History'**
  String get onboardingAllHistory;

  /// No description provided for @onboardingStartImport.
  ///
  /// In en, this message translates to:
  /// **'Start Import'**
  String get onboardingStartImport;

  /// No description provided for @onboardingAnalyzeData.
  ///
  /// In en, this message translates to:
  /// **'Analyze Data'**
  String get onboardingAnalyzeData;

  /// No description provided for @onboardingContinueWithoutData.
  ///
  /// In en, this message translates to:
  /// **'Continue without data'**
  String get onboardingContinueWithoutData;

  /// No description provided for @onboardingRunningProfile.
  ///
  /// In en, this message translates to:
  /// **'Your Running Profile'**
  String get onboardingRunningProfile;

  /// No description provided for @onboardingRunningProfileSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Based on your synced activity data'**
  String get onboardingRunningProfileSubtitle;

  /// No description provided for @onboardingNoActivityDataYet.
  ///
  /// In en, this message translates to:
  /// **'No activity data yet'**
  String get onboardingNoActivityDataYet;

  /// No description provided for @onboardingDefaultValuesMessage.
  ///
  /// In en, this message translates to:
  /// **'We\'ll use default values to get you started.'**
  String get onboardingDefaultValuesMessage;

  /// No description provided for @onboardingBuildMyPlan.
  ///
  /// In en, this message translates to:
  /// **'Build My Plan'**
  String get onboardingBuildMyPlan;

  /// No description provided for @onboardingReviewPlan.
  ///
  /// In en, this message translates to:
  /// **'Review Plan'**
  String get onboardingReviewPlan;

  /// No description provided for @onboardingGenerate.
  ///
  /// In en, this message translates to:
  /// **'Generate'**
  String get onboardingGenerate;

  /// No description provided for @onboardingRunningExperienceTitle.
  ///
  /// In en, this message translates to:
  /// **'What\'s your running experience?'**
  String get onboardingRunningExperienceTitle;

  /// No description provided for @onboardingRunningExperienceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'This helps us calibrate your training plan intensity.'**
  String get onboardingRunningExperienceSubtitle;

  /// No description provided for @onboardingExperienceBeginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get onboardingExperienceBeginner;

  /// No description provided for @onboardingExperienceIntermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get onboardingExperienceIntermediate;

  /// No description provided for @onboardingExperienceAdvanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get onboardingExperienceAdvanced;

  /// No description provided for @onboardingExperienceBeginnerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'New to running or less than 6 months'**
  String get onboardingExperienceBeginnerSubtitle;

  /// No description provided for @onboardingExperienceIntermediateSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Running regularly for 6+ months'**
  String get onboardingExperienceIntermediateSubtitle;

  /// No description provided for @onboardingExperienceAdvancedSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Experienced runner with race history'**
  String get onboardingExperienceAdvancedSubtitle;

  /// No description provided for @onboardingTargetRaceTitle.
  ///
  /// In en, this message translates to:
  /// **'What\'s your target race?'**
  String get onboardingTargetRaceTitle;

  /// No description provided for @onboardingTargetRaceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose your race distance and when you plan to compete.'**
  String get onboardingTargetRaceSubtitle;

  /// No description provided for @onboardingRaceName.
  ///
  /// In en, this message translates to:
  /// **'Race Name'**
  String get onboardingRaceName;

  /// No description provided for @onboardingRaceNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g., Berlin Marathon 2026'**
  String get onboardingRaceNameHint;

  /// No description provided for @onboardingRaceDistance.
  ///
  /// In en, this message translates to:
  /// **'Race Distance'**
  String get onboardingRaceDistance;

  /// No description provided for @onboardingRaceDate.
  ///
  /// In en, this message translates to:
  /// **'Race Date'**
  String get onboardingRaceDate;

  /// No description provided for @onboardingRaceType.
  ///
  /// In en, this message translates to:
  /// **'Race Type'**
  String get onboardingRaceType;

  /// No description provided for @onboardingPlanStartDate.
  ///
  /// In en, this message translates to:
  /// **'Plan Start Date'**
  String get onboardingPlanStartDate;

  /// No description provided for @onboardingPlanDuration.
  ///
  /// In en, this message translates to:
  /// **'Plan Duration'**
  String get onboardingPlanDuration;

  /// No description provided for @onboardingWeeksCount.
  ///
  /// In en, this message translates to:
  /// **'{weeks} weeks'**
  String onboardingWeeksCount(int weeks);

  /// No description provided for @onboardingCurrentFitnessTitle.
  ///
  /// In en, this message translates to:
  /// **'What\'s your current fitness?'**
  String get onboardingCurrentFitnessTitle;

  /// No description provided for @onboardingCurrentFitnessSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter a recent race time or let us estimate from your data.'**
  String get onboardingCurrentFitnessSubtitle;

  /// No description provided for @onboardingCalibrationDistance.
  ///
  /// In en, this message translates to:
  /// **'Calibration Distance'**
  String get onboardingCalibrationDistance;

  /// No description provided for @onboardingYourTime.
  ///
  /// In en, this message translates to:
  /// **'Your Time'**
  String get onboardingYourTime;

  /// No description provided for @onboardingHours.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get onboardingHours;

  /// No description provided for @onboardingMinutes.
  ///
  /// In en, this message translates to:
  /// **'Min'**
  String get onboardingMinutes;

  /// No description provided for @onboardingSeconds.
  ///
  /// In en, this message translates to:
  /// **'Sec'**
  String get onboardingSeconds;

  /// No description provided for @onboardingUsePredictedTime.
  ///
  /// In en, this message translates to:
  /// **'Use predicted time'**
  String get onboardingUsePredictedTime;

  /// No description provided for @onboardingGoalTimeTitle.
  ///
  /// In en, this message translates to:
  /// **'What\'s your goal time?'**
  String get onboardingGoalTimeTitle;

  /// No description provided for @onboardingGoalTimeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Set your target finish time for race day.'**
  String get onboardingGoalTimeSubtitle;

  /// No description provided for @onboardingProjectedGoalTime.
  ///
  /// In en, this message translates to:
  /// **'Your Projected Goal Time'**
  String get onboardingProjectedGoalTime;

  /// No description provided for @onboardingVdotImprovement.
  ///
  /// In en, this message translates to:
  /// **'VDOT improvement: +{percent}%'**
  String onboardingVdotImprovement(String percent);

  /// No description provided for @onboardingConservative.
  ///
  /// In en, this message translates to:
  /// **'Conservative'**
  String get onboardingConservative;

  /// No description provided for @onboardingOptimal.
  ///
  /// In en, this message translates to:
  /// **'Optimal'**
  String get onboardingOptimal;

  /// No description provided for @onboardingNoPrediction.
  ///
  /// In en, this message translates to:
  /// **'No prediction available yet'**
  String get onboardingNoPrediction;

  /// No description provided for @onboardingNoPredictionSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Complete the fitness calibration or sync activities to get a goal time prediction.'**
  String get onboardingNoPredictionSubtitle;

  /// No description provided for @onboardingTrainingVolumeTitle.
  ///
  /// In en, this message translates to:
  /// **'How much do you want to train?'**
  String get onboardingTrainingVolumeTitle;

  /// No description provided for @onboardingTrainingVolumeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Set your weekly training volume and frequency.'**
  String get onboardingTrainingVolumeSubtitle;

  /// No description provided for @onboardingRunsPerWeek.
  ///
  /// In en, this message translates to:
  /// **'Runs per week'**
  String get onboardingRunsPerWeek;

  /// No description provided for @onboardingStartWeeklyMileage.
  ///
  /// In en, this message translates to:
  /// **'Start weekly mileage'**
  String get onboardingStartWeeklyMileage;

  /// No description provided for @onboardingStartWeeklyMileageAuto.
  ///
  /// In en, this message translates to:
  /// **'Based on your last 3 months of running'**
  String get onboardingStartWeeklyMileageAuto;

  /// No description provided for @onboardingRunsPerWeekCount.
  ///
  /// In en, this message translates to:
  /// **'{count}'**
  String onboardingRunsPerWeekCount(int count);

  /// No description provided for @onboardingWeeklyMileage.
  ///
  /// In en, this message translates to:
  /// **'Weekly mileage'**
  String get onboardingWeeklyMileage;

  /// No description provided for @onboardingLongRunCap.
  ///
  /// In en, this message translates to:
  /// **'Long run cap'**
  String get onboardingLongRunCap;

  /// No description provided for @onboardingTrainingPhases.
  ///
  /// In en, this message translates to:
  /// **'Training phases'**
  String get onboardingTrainingPhases;

  /// No description provided for @onboardingTrainingPhasesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Customize your build, peak, and taper weeks.'**
  String get onboardingTrainingPhasesSubtitle;

  /// No description provided for @onboardingBuildWeeks.
  ///
  /// In en, this message translates to:
  /// **'Build Weeks'**
  String get onboardingBuildWeeks;

  /// No description provided for @onboardingPeakWeeks.
  ///
  /// In en, this message translates to:
  /// **'Peak Weeks'**
  String get onboardingPeakWeeks;

  /// No description provided for @onboardingTaperWeeks.
  ///
  /// In en, this message translates to:
  /// **'Taper Weeks'**
  String get onboardingTaperWeeks;

  /// No description provided for @onboardingPhasesTotal.
  ///
  /// In en, this message translates to:
  /// **'Total: {current} / {total} weeks'**
  String onboardingPhasesTotal(int current, int total);

  /// No description provided for @onboardingHideDayScheduling.
  ///
  /// In en, this message translates to:
  /// **'Hide day scheduling'**
  String get onboardingHideDayScheduling;

  /// No description provided for @onboardingCustomizeTrainingDays.
  ///
  /// In en, this message translates to:
  /// **'Customize training days'**
  String get onboardingCustomizeTrainingDays;

  /// No description provided for @onboardingLongRunDay.
  ///
  /// In en, this message translates to:
  /// **'Long Run Day'**
  String get onboardingLongRunDay;

  /// No description provided for @onboardingQualityWorkoutDay.
  ///
  /// In en, this message translates to:
  /// **'Quality Workout Day'**
  String get onboardingQualityWorkoutDay;

  /// No description provided for @daySunday.
  ///
  /// In en, this message translates to:
  /// **'Sunday'**
  String get daySunday;

  /// No description provided for @dayMonday.
  ///
  /// In en, this message translates to:
  /// **'Monday'**
  String get dayMonday;

  /// No description provided for @dayTuesday.
  ///
  /// In en, this message translates to:
  /// **'Tuesday'**
  String get dayTuesday;

  /// No description provided for @dayWednesday.
  ///
  /// In en, this message translates to:
  /// **'Wednesday'**
  String get dayWednesday;

  /// No description provided for @dayThursday.
  ///
  /// In en, this message translates to:
  /// **'Thursday'**
  String get dayThursday;

  /// No description provided for @dayFriday.
  ///
  /// In en, this message translates to:
  /// **'Friday'**
  String get dayFriday;

  /// No description provided for @daySaturday.
  ///
  /// In en, this message translates to:
  /// **'Saturday'**
  String get daySaturday;

  /// No description provided for @onboardingHeartRateProfile.
  ///
  /// In en, this message translates to:
  /// **'Heart rate profile'**
  String get onboardingHeartRateProfile;

  /// No description provided for @onboardingHeartRateProfileSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Optional: Set your HR zones for training guidance.'**
  String get onboardingHeartRateProfileSubtitle;

  /// No description provided for @onboardingMaxHr.
  ///
  /// In en, this message translates to:
  /// **'Max HR'**
  String get onboardingMaxHr;

  /// No description provided for @onboardingRestingHr.
  ///
  /// In en, this message translates to:
  /// **'Resting HR'**
  String get onboardingRestingHr;

  /// No description provided for @onboardingWeight.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get onboardingWeight;

  /// No description provided for @onboardingThresholdValues.
  ///
  /// In en, this message translates to:
  /// **'Threshold Values'**
  String get onboardingThresholdValues;

  /// No description provided for @onboardingLthr.
  ///
  /// In en, this message translates to:
  /// **'LTHR (bpm)'**
  String get onboardingLthr;

  /// No description provided for @onboardingAutoLthr.
  ///
  /// In en, this message translates to:
  /// **'Auto: {value}'**
  String onboardingAutoLthr(int value);

  /// No description provided for @onboardingThresholdHr.
  ///
  /// In en, this message translates to:
  /// **'Threshold HR'**
  String get onboardingThresholdHr;

  /// No description provided for @onboardingThresholdPaceMin.
  ///
  /// In en, this message translates to:
  /// **'Threshold Pace Min'**
  String get onboardingThresholdPaceMin;

  /// No description provided for @onboardingCalculatedZones.
  ///
  /// In en, this message translates to:
  /// **'Calculated Zones (from LTHR: {value})'**
  String onboardingCalculatedZones(int value);

  /// No description provided for @onboardingReviewPlanTitle.
  ///
  /// In en, this message translates to:
  /// **'Review your plan'**
  String get onboardingReviewPlanTitle;

  /// No description provided for @onboardingReviewPlanSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Everything looks good? Generate your training plan.'**
  String get onboardingReviewPlanSubtitle;

  /// No description provided for @onboardingExperience.
  ///
  /// In en, this message translates to:
  /// **'Experience'**
  String get onboardingExperience;

  /// No description provided for @onboardingPhases.
  ///
  /// In en, this message translates to:
  /// **'Phases'**
  String get onboardingPhases;

  /// No description provided for @onboardingGoalTime.
  ///
  /// In en, this message translates to:
  /// **'Goal Time'**
  String get onboardingGoalTime;

  /// No description provided for @onboardingGenerateTrainingPlan.
  ///
  /// In en, this message translates to:
  /// **'Generate Training Plan'**
  String get onboardingGenerateTrainingPlan;

  /// No description provided for @onboardingPlanCreateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to create plan. Please try again.'**
  String get onboardingPlanCreateFailed;

  /// No description provided for @healthScanBarcode.
  ///
  /// In en, this message translates to:
  /// **'Scan Barcode'**
  String get healthScanBarcode;

  /// No description provided for @healthAiFoodScan.
  ///
  /// In en, this message translates to:
  /// **'AI Food Scan'**
  String get healthAiFoodScan;

  /// No description provided for @healthAddedFood.
  ///
  /// In en, this message translates to:
  /// **'Added {name}'**
  String healthAddedFood(String name);

  /// No description provided for @healthConnectLabel.
  ///
  /// In en, this message translates to:
  /// **'Connect {label}'**
  String healthConnectLabel(String label);

  /// No description provided for @settingsUnits.
  ///
  /// In en, this message translates to:
  /// **'Units'**
  String get settingsUnits;

  /// No description provided for @settingsMetric.
  ///
  /// In en, this message translates to:
  /// **'Metric'**
  String get settingsMetric;

  /// No description provided for @settingsImperial.
  ///
  /// In en, this message translates to:
  /// **'Imperial'**
  String get settingsImperial;

  /// No description provided for @settingsWorkoutReminders.
  ///
  /// In en, this message translates to:
  /// **'Workout Reminders'**
  String get settingsWorkoutReminders;

  /// No description provided for @settingsWorkoutRemindersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Get notified about upcoming workouts'**
  String get settingsWorkoutRemindersSubtitle;

  /// No description provided for @settingsSupplementReminders.
  ///
  /// In en, this message translates to:
  /// **'Supplement Reminders'**
  String get settingsSupplementReminders;

  /// No description provided for @settingsSupplementRemindersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Reminders for nutrition and supplements'**
  String get settingsSupplementRemindersSubtitle;

  /// No description provided for @settingsSyncNotifications.
  ///
  /// In en, this message translates to:
  /// **'Sync Notifications'**
  String get settingsSyncNotifications;

  /// No description provided for @settingsSyncNotificationsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Notify when data sync completes'**
  String get settingsSyncNotificationsSubtitle;

  /// No description provided for @settingsChatNotifications.
  ///
  /// In en, this message translates to:
  /// **'Chat Notifications'**
  String get settingsChatNotifications;

  /// No description provided for @settingsChatNotificationsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'New messages from AI coach'**
  String get settingsChatNotificationsSubtitle;

  /// No description provided for @settingsApiAccess.
  ///
  /// In en, this message translates to:
  /// **'API Access'**
  String get settingsApiAccess;

  /// No description provided for @settingsApiKeySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage your external API key'**
  String get settingsApiKeySubtitle;

  /// No description provided for @settingsPrivacyConsent.
  ///
  /// In en, this message translates to:
  /// **'Privacy & Consent'**
  String get settingsPrivacyConsent;

  /// No description provided for @settingsGdprConsent.
  ///
  /// In en, this message translates to:
  /// **'GDPR Consent'**
  String get settingsGdprConsent;

  /// No description provided for @settingsGdprConsentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage your data processing consents'**
  String get settingsGdprConsentSubtitle;

  /// No description provided for @settingsDebug.
  ///
  /// In en, this message translates to:
  /// **'Debug'**
  String get settingsDebug;

  /// No description provided for @settingsViewLogs.
  ///
  /// In en, this message translates to:
  /// **'View Logs'**
  String get settingsViewLogs;

  /// No description provided for @distance.
  ///
  /// In en, this message translates to:
  /// **'distance'**
  String get distance;

  /// No description provided for @pace.
  ///
  /// In en, this message translates to:
  /// **'Pace'**
  String get pace;

  /// No description provided for @duration.
  ///
  /// In en, this message translates to:
  /// **'Duration'**
  String get duration;

  /// No description provided for @elevation.
  ///
  /// In en, this message translates to:
  /// **'Elevation'**
  String get elevation;

  /// No description provided for @heartRate.
  ///
  /// In en, this message translates to:
  /// **'HR'**
  String get heartRate;

  /// No description provided for @cadence.
  ///
  /// In en, this message translates to:
  /// **'Cadence'**
  String get cadence;

  /// No description provided for @avgPace.
  ///
  /// In en, this message translates to:
  /// **'Avg Pace'**
  String get avgPace;

  /// No description provided for @avgSpeed.
  ///
  /// In en, this message translates to:
  /// **'Avg Speed'**
  String get avgSpeed;

  /// No description provided for @maxSpeed.
  ///
  /// In en, this message translates to:
  /// **'Max Speed'**
  String get maxSpeed;

  /// No description provided for @avgHr.
  ///
  /// In en, this message translates to:
  /// **'Avg HR'**
  String get avgHr;

  /// No description provided for @maxHr.
  ///
  /// In en, this message translates to:
  /// **'Max HR'**
  String get maxHr;

  /// No description provided for @avgCadence.
  ///
  /// In en, this message translates to:
  /// **'Avg Cadence'**
  String get avgCadence;

  /// No description provided for @gpsPoints.
  ///
  /// In en, this message translates to:
  /// **'GPS Points'**
  String get gpsPoints;

  /// No description provided for @targetDistance.
  ///
  /// In en, this message translates to:
  /// **'Target Distance'**
  String get targetDistance;

  /// No description provided for @targetPace.
  ///
  /// In en, this message translates to:
  /// **'Target Pace'**
  String get targetPace;

  /// No description provided for @trainingPhaseTitle.
  ///
  /// In en, this message translates to:
  /// **'Training Phase'**
  String get trainingPhaseTitle;

  /// No description provided for @trainingPhaseBase.
  ///
  /// In en, this message translates to:
  /// **'Base Phase'**
  String get trainingPhaseBase;

  /// No description provided for @trainingPhaseBuild.
  ///
  /// In en, this message translates to:
  /// **'Build Phase'**
  String get trainingPhaseBuild;

  /// No description provided for @trainingPhasePeak.
  ///
  /// In en, this message translates to:
  /// **'Peak Phase'**
  String get trainingPhasePeak;

  /// No description provided for @trainingPhaseTaper.
  ///
  /// In en, this message translates to:
  /// **'Taper Phase'**
  String get trainingPhaseTaper;

  /// No description provided for @trainingPhaseRace.
  ///
  /// In en, this message translates to:
  /// **'Race Week'**
  String get trainingPhaseRace;

  /// No description provided for @trainingPhaseRecovery.
  ///
  /// In en, this message translates to:
  /// **'Recovery'**
  String get trainingPhaseRecovery;

  /// No description provided for @raceCountdown.
  ///
  /// In en, this message translates to:
  /// **'Race Countdown'**
  String get raceCountdown;

  /// No description provided for @raceResults.
  ///
  /// In en, this message translates to:
  /// **'Race Results'**
  String get raceResults;

  /// No description provided for @weekAbbrev.
  ///
  /// In en, this message translates to:
  /// **'wks'**
  String get weekAbbrev;

  /// No description provided for @kmUnit.
  ///
  /// In en, this message translates to:
  /// **'km'**
  String get kmUnit;

  /// No description provided for @bpmUnit.
  ///
  /// In en, this message translates to:
  /// **'bpm'**
  String get bpmUnit;

  /// No description provided for @spmUnit.
  ///
  /// In en, this message translates to:
  /// **'spm'**
  String get spmUnit;

  /// No description provided for @kcalUnit.
  ///
  /// In en, this message translates to:
  /// **'kcal'**
  String get kcalUnit;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @nutritionSetTargets.
  ///
  /// In en, this message translates to:
  /// **'Set Targets'**
  String get nutritionSetTargets;

  /// No description provided for @nutritionAiMealSuggestion.
  ///
  /// In en, this message translates to:
  /// **'AI Meal Suggestion'**
  String get nutritionAiMealSuggestion;

  /// No description provided for @nutritionAddFood.
  ///
  /// In en, this message translates to:
  /// **'Add Food'**
  String get nutritionAddFood;

  /// No description provided for @nutritionTargetsTitle.
  ///
  /// In en, this message translates to:
  /// **'Nutrition Targets'**
  String get nutritionTargetsTitle;

  /// No description provided for @nutritionCaloriesKcal.
  ///
  /// In en, this message translates to:
  /// **'Calories (kcal)'**
  String get nutritionCaloriesKcal;

  /// No description provided for @nutritionProteinG.
  ///
  /// In en, this message translates to:
  /// **'Protein (g)'**
  String get nutritionProteinG;

  /// No description provided for @nutritionCarbsG.
  ///
  /// In en, this message translates to:
  /// **'Carbs (g)'**
  String get nutritionCarbsG;

  /// No description provided for @nutritionFatG.
  ///
  /// In en, this message translates to:
  /// **'Fat (g)'**
  String get nutritionFatG;

  /// No description provided for @nutritionWaterL.
  ///
  /// In en, this message translates to:
  /// **'Water (L)'**
  String get nutritionWaterL;

  /// No description provided for @nutritionMealLogged.
  ///
  /// In en, this message translates to:
  /// **'Meal logged'**
  String get nutritionMealLogged;

  /// No description provided for @nutritionFoodName.
  ///
  /// In en, this message translates to:
  /// **'Food Name'**
  String get nutritionFoodName;

  /// No description provided for @nutritionScan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get nutritionScan;

  /// No description provided for @nutritionManual.
  ///
  /// In en, this message translates to:
  /// **'Manual'**
  String get nutritionManual;

  /// No description provided for @foodSearchTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Food'**
  String get foodSearchTitle;

  /// No description provided for @foodSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search for a food...'**
  String get foodSearchHint;

  /// No description provided for @foodSearchNoResults.
  ///
  /// In en, this message translates to:
  /// **'No results found'**
  String get foodSearchNoResults;

  /// No description provided for @foodSearchNoResultsMessage.
  ///
  /// In en, this message translates to:
  /// **'Try a different search term or add the food manually.'**
  String get foodSearchNoResultsMessage;

  /// No description provided for @foodAddManually.
  ///
  /// In en, this message translates to:
  /// **'Add Manually'**
  String get foodAddManually;

  /// No description provided for @nutritionPortion.
  ///
  /// In en, this message translates to:
  /// **'Portion'**
  String get nutritionPortion;

  /// No description provided for @nutritionKcalRemaining.
  ///
  /// In en, this message translates to:
  /// **'{kcal} kcal remaining'**
  String nutritionKcalRemaining(int kcal);

  /// No description provided for @nutritionMacroBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Macro Breakdown'**
  String get nutritionMacroBreakdown;

  /// No description provided for @nutritionWaterIntake.
  ///
  /// In en, this message translates to:
  /// **'Water Intake'**
  String get nutritionWaterIntake;

  /// No description provided for @nutrition7DayCalories.
  ///
  /// In en, this message translates to:
  /// **'7-Day Calories'**
  String get nutrition7DayCalories;

  /// No description provided for @nutritionAdherence.
  ///
  /// In en, this message translates to:
  /// **'{percent}% adherence'**
  String nutritionAdherence(String percent);

  /// No description provided for @nutritionCarbs.
  ///
  /// In en, this message translates to:
  /// **'Carbs'**
  String get nutritionCarbs;

  /// No description provided for @nutritionFatLabel.
  ///
  /// In en, this message translates to:
  /// **'Fat'**
  String get nutritionFatLabel;

  /// No description provided for @supplementsNoSupplements.
  ///
  /// In en, this message translates to:
  /// **'No supplements yet'**
  String get supplementsNoSupplements;

  /// No description provided for @supplementsAddFirst.
  ///
  /// In en, this message translates to:
  /// **'Add First Supplement'**
  String get supplementsAddFirst;

  /// No description provided for @supplementsAddTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Supplement'**
  String get supplementsAddTitle;

  /// No description provided for @supplementsName.
  ///
  /// In en, this message translates to:
  /// **'Supplement Name'**
  String get supplementsName;

  /// No description provided for @supplementsDosage.
  ///
  /// In en, this message translates to:
  /// **'Dosage (e.g. 500mg)'**
  String get supplementsDosage;

  /// No description provided for @supplementsFrequency.
  ///
  /// In en, this message translates to:
  /// **'Frequency'**
  String get supplementsFrequency;

  /// No description provided for @supplementsTimeOfDay.
  ///
  /// In en, this message translates to:
  /// **'Time of Day'**
  String get supplementsTimeOfDay;

  /// No description provided for @supplementsMorning.
  ///
  /// In en, this message translates to:
  /// **'Morning'**
  String get supplementsMorning;

  /// No description provided for @supplementsAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Afternoon'**
  String get supplementsAfternoon;

  /// No description provided for @supplementsEvening.
  ///
  /// In en, this message translates to:
  /// **'Evening'**
  String get supplementsEvening;

  /// No description provided for @supplementsNight.
  ///
  /// In en, this message translates to:
  /// **'Night'**
  String get supplementsNight;

  /// No description provided for @supplementsTakenToday.
  ///
  /// In en, this message translates to:
  /// **'{taken}/{total} taken today'**
  String supplementsTakenToday(int taken, int total);

  /// No description provided for @supplementsAllDone.
  ///
  /// In en, this message translates to:
  /// **'All done!'**
  String get supplementsAllDone;

  /// No description provided for @supplementsRemainingCount.
  ///
  /// In en, this message translates to:
  /// **'{count} remaining'**
  String supplementsRemainingCount(int count);

  /// No description provided for @supplementsWeeklyCalendar.
  ///
  /// In en, this message translates to:
  /// **'Weekly Calendar'**
  String get supplementsWeeklyCalendar;

  /// No description provided for @supplementsWeeklyAdherence.
  ///
  /// In en, this message translates to:
  /// **'Weekly Adherence'**
  String get supplementsWeeklyAdherence;

  /// No description provided for @fastingQuickStart.
  ///
  /// In en, this message translates to:
  /// **'Quick Start'**
  String get fastingQuickStart;

  /// No description provided for @fastingHistoryTitle.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get fastingHistoryTitle;

  /// No description provided for @fastingNoHistory.
  ///
  /// In en, this message translates to:
  /// **'No fasting history'**
  String get fastingNoHistory;

  /// No description provided for @fastingStopFasting.
  ///
  /// In en, this message translates to:
  /// **'Stop Fasting'**
  String get fastingStopFasting;

  /// No description provided for @fastingStartFasting.
  ///
  /// In en, this message translates to:
  /// **'Start Fasting'**
  String get fastingStartFasting;

  /// No description provided for @fastingTotalSessions.
  ///
  /// In en, this message translates to:
  /// **'Total Sessions'**
  String get fastingTotalSessions;

  /// No description provided for @fastingAverage.
  ///
  /// In en, this message translates to:
  /// **'Average'**
  String get fastingAverage;

  /// No description provided for @fastingLongest.
  ///
  /// In en, this message translates to:
  /// **'Longest'**
  String get fastingLongest;

  /// No description provided for @fastingStartedAt.
  ///
  /// In en, this message translates to:
  /// **'Started at {time}'**
  String fastingStartedAt(String time);

  /// No description provided for @fastingPresetHours.
  ///
  /// In en, this message translates to:
  /// **'{hours} hours'**
  String fastingPresetHours(int hours);

  /// No description provided for @fastingPctOfTarget.
  ///
  /// In en, this message translates to:
  /// **'{percent}% of {hours}h'**
  String fastingPctOfTarget(int percent, int hours);

  /// No description provided for @fastingActive.
  ///
  /// In en, this message translates to:
  /// **'active'**
  String get fastingActive;

  /// No description provided for @fastingGoalReached.
  ///
  /// In en, this message translates to:
  /// **'Goal reached!'**
  String get fastingGoalReached;

  /// No description provided for @fastingNextEatIn.
  ///
  /// In en, this message translates to:
  /// **'Eating in {time}'**
  String fastingNextEatIn(String time);

  /// No description provided for @fastingNextFastIn.
  ///
  /// In en, this message translates to:
  /// **'Next fast in {time}'**
  String fastingNextFastIn(String time);

  /// No description provided for @scanCameraRequired.
  ///
  /// In en, this message translates to:
  /// **'Camera Permission Required'**
  String get scanCameraRequired;

  /// No description provided for @scanCameraMessage.
  ///
  /// In en, this message translates to:
  /// **'Please grant camera permission to scan barcodes.'**
  String get scanCameraMessage;

  /// No description provided for @scanOpenSettings.
  ///
  /// In en, this message translates to:
  /// **'Open Settings'**
  String get scanOpenSettings;

  /// No description provided for @scanPointCamera.
  ///
  /// In en, this message translates to:
  /// **'Point camera at a barcode'**
  String get scanPointCamera;

  /// No description provided for @scanNotFound.
  ///
  /// In en, this message translates to:
  /// **'Barcode Not Found'**
  String get scanNotFound;

  /// No description provided for @scanNotFoundMessage.
  ///
  /// In en, this message translates to:
  /// **'This barcode is not in our database. Try adding the food manually.'**
  String get scanNotFoundMessage;

  /// No description provided for @scanAgain.
  ///
  /// In en, this message translates to:
  /// **'Scan Again'**
  String get scanAgain;

  /// No description provided for @scanAddManually.
  ///
  /// In en, this message translates to:
  /// **'Add Manually'**
  String get scanAddManually;

  /// No description provided for @scanBarcodeValue.
  ///
  /// In en, this message translates to:
  /// **'Barcode: {barcode}'**
  String scanBarcodeValue(String barcode);

  /// No description provided for @scanServing.
  ///
  /// In en, this message translates to:
  /// **'Serving: {grams}g'**
  String scanServing(String grams);

  /// No description provided for @scanCal.
  ///
  /// In en, this message translates to:
  /// **'Cal'**
  String get scanCal;

  /// No description provided for @scanAddToLog.
  ///
  /// In en, this message translates to:
  /// **'Add to Log'**
  String get scanAddToLog;

  /// No description provided for @scanNetworkError.
  ///
  /// In en, this message translates to:
  /// **'Network Error'**
  String get scanNetworkError;

  /// No description provided for @scanNetworkErrorMessage.
  ///
  /// In en, this message translates to:
  /// **'Could not look up this barcode. Check your connection and try again.'**
  String get scanNetworkErrorMessage;

  /// No description provided for @scanAddedToLog.
  ///
  /// In en, this message translates to:
  /// **'Added {name} to nutrition log'**
  String scanAddedToLog(String name);

  /// No description provided for @aiScanChooseImage.
  ///
  /// In en, this message translates to:
  /// **'Choose an image to scan with AI.'**
  String get aiScanChooseImage;

  /// No description provided for @aiScanFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to analyze image.'**
  String get aiScanFailed;

  /// No description provided for @aiScanAnalyzing.
  ///
  /// In en, this message translates to:
  /// **'AI is analyzing your meal...'**
  String get aiScanAnalyzing;

  /// No description provided for @aiScanNotFound.
  ///
  /// In en, this message translates to:
  /// **'Could not identify food'**
  String get aiScanNotFound;

  /// No description provided for @aiScanNotFoundMessage.
  ///
  /// In en, this message translates to:
  /// **'The AI could not confidently identify nutritional info. Please try another photo or add manually.'**
  String get aiScanNotFoundMessage;

  /// No description provided for @aiScanNutritionFacts.
  ///
  /// In en, this message translates to:
  /// **'Nutrition Facts'**
  String get aiScanNutritionFacts;

  /// No description provided for @aiScanServing.
  ///
  /// In en, this message translates to:
  /// **'Serving: {grams}g'**
  String aiScanServing(String grams);

  /// No description provided for @bodyNoMeasurements.
  ///
  /// In en, this message translates to:
  /// **'No measurements yet'**
  String get bodyNoMeasurements;

  /// No description provided for @bodyAddFirstMeasurement.
  ///
  /// In en, this message translates to:
  /// **'Add First Measurement'**
  String get bodyAddFirstMeasurement;

  /// No description provided for @bodyLogMeasurement.
  ///
  /// In en, this message translates to:
  /// **'Log Measurement'**
  String get bodyLogMeasurement;

  /// No description provided for @bodyWeightKg.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get bodyWeightKg;

  /// No description provided for @bodyFatPct.
  ///
  /// In en, this message translates to:
  /// **'Body Fat (%)'**
  String get bodyFatPct;

  /// No description provided for @bodyWaistCm.
  ///
  /// In en, this message translates to:
  /// **'Waist (cm)'**
  String get bodyWaistCm;

  /// No description provided for @bodyChestCm.
  ///
  /// In en, this message translates to:
  /// **'Chest (cm)'**
  String get bodyChestCm;

  /// No description provided for @bodyHipsCm.
  ///
  /// In en, this message translates to:
  /// **'Hips (cm)'**
  String get bodyHipsCm;

  /// No description provided for @bodyArmsCm.
  ///
  /// In en, this message translates to:
  /// **'Arms (cm)'**
  String get bodyArmsCm;

  /// No description provided for @bodyWeightLabel.
  ///
  /// In en, this message translates to:
  /// **'Weight'**
  String get bodyWeightLabel;

  /// No description provided for @bodyBmi.
  ///
  /// In en, this message translates to:
  /// **'BMI'**
  String get bodyBmi;

  /// No description provided for @bodyUnderweight.
  ///
  /// In en, this message translates to:
  /// **'Underweight'**
  String get bodyUnderweight;

  /// No description provided for @bodyNormal.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get bodyNormal;

  /// No description provided for @bodyOverweight.
  ///
  /// In en, this message translates to:
  /// **'Overweight'**
  String get bodyOverweight;

  /// No description provided for @bodyObese.
  ///
  /// In en, this message translates to:
  /// **'Obese'**
  String get bodyObese;

  /// No description provided for @bodyWeightTrend.
  ///
  /// In en, this message translates to:
  /// **'Weight Trend'**
  String get bodyWeightTrend;

  /// No description provided for @bodyFatTrend.
  ///
  /// In en, this message translates to:
  /// **'Body Fat Trend'**
  String get bodyFatTrend;

  /// No description provided for @bodyCircumferences.
  ///
  /// In en, this message translates to:
  /// **'Circumferences'**
  String get bodyCircumferences;

  /// No description provided for @bodyHistory.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get bodyHistory;

  /// No description provided for @vitalsSyncFromHc.
  ///
  /// In en, this message translates to:
  /// **'Sync from Health Connect'**
  String get vitalsSyncFromHc;

  /// No description provided for @vitalsRestingHr.
  ///
  /// In en, this message translates to:
  /// **'Resting HR'**
  String get vitalsRestingHr;

  /// No description provided for @vitalsBloodOxygen.
  ///
  /// In en, this message translates to:
  /// **'Blood Oxygen (SpO₂)'**
  String get vitalsBloodOxygen;

  /// No description provided for @vitalsNormal.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get vitalsNormal;

  /// No description provided for @vitalsLowSeeDoctor.
  ///
  /// In en, this message translates to:
  /// **'Low — see a doctor'**
  String get vitalsLowSeeDoctor;

  /// No description provided for @vitalsAthletic.
  ///
  /// In en, this message translates to:
  /// **'Athletic'**
  String get vitalsAthletic;

  /// No description provided for @vitalsExcellent.
  ///
  /// In en, this message translates to:
  /// **'Excellent'**
  String get vitalsExcellent;

  /// No description provided for @vitalsGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get vitalsGood;

  /// No description provided for @vitalsAverage.
  ///
  /// In en, this message translates to:
  /// **'Average'**
  String get vitalsAverage;

  /// No description provided for @vitalsAboveAverage.
  ///
  /// In en, this message translates to:
  /// **'Above average'**
  String get vitalsAboveAverage;

  /// No description provided for @vitalsExcellentRecovery.
  ///
  /// In en, this message translates to:
  /// **'Excellent recovery'**
  String get vitalsExcellentRecovery;

  /// No description provided for @vitalsGoodRecovery.
  ///
  /// In en, this message translates to:
  /// **'Good recovery'**
  String get vitalsGoodRecovery;

  /// No description provided for @vitalsModerate.
  ///
  /// In en, this message translates to:
  /// **'Moderate'**
  String get vitalsModerate;

  /// No description provided for @vitalsLowConsiderRest.
  ///
  /// In en, this message translates to:
  /// **'Low — consider rest'**
  String get vitalsLowConsiderRest;

  /// No description provided for @vitals7DayRestingHr.
  ///
  /// In en, this message translates to:
  /// **'7-Day Resting HR'**
  String get vitals7DayRestingHr;

  /// No description provided for @vitals7DayHrvTrend.
  ///
  /// In en, this message translates to:
  /// **'7-Day HRV Trend'**
  String get vitals7DayHrvTrend;

  /// No description provided for @vitalsSynced.
  ///
  /// In en, this message translates to:
  /// **'Synced from Health Connect · {time}'**
  String vitalsSynced(String time);

  /// No description provided for @vitalsConnectTitle.
  ///
  /// In en, this message translates to:
  /// **'Connect Health Data'**
  String get vitalsConnectTitle;

  /// No description provided for @vitalsConnectMessage.
  ///
  /// In en, this message translates to:
  /// **'Sync resting heart rate, HRV, and SpO₂ directly from Health Connect on your Android device.'**
  String get vitalsConnectMessage;

  /// No description provided for @vitalsConnectHc.
  ///
  /// In en, this message translates to:
  /// **'Connect Health Connect'**
  String get vitalsConnectHc;

  /// No description provided for @vitalsConnecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting…'**
  String get vitalsConnecting;

  /// No description provided for @sleepLastNight.
  ///
  /// In en, this message translates to:
  /// **'Last Night'**
  String get sleepLastNight;

  /// No description provided for @sleepExcellent.
  ///
  /// In en, this message translates to:
  /// **'Excellent'**
  String get sleepExcellent;

  /// No description provided for @sleepGoodQuality.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get sleepGoodQuality;

  /// No description provided for @sleepFair.
  ///
  /// In en, this message translates to:
  /// **'Fair'**
  String get sleepFair;

  /// No description provided for @sleepPoor.
  ///
  /// In en, this message translates to:
  /// **'Poor'**
  String get sleepPoor;

  /// No description provided for @sleepStages.
  ///
  /// In en, this message translates to:
  /// **'Sleep Stages'**
  String get sleepStages;

  /// No description provided for @sleepDeep.
  ///
  /// In en, this message translates to:
  /// **'Deep'**
  String get sleepDeep;

  /// No description provided for @sleepRem.
  ///
  /// In en, this message translates to:
  /// **'REM'**
  String get sleepRem;

  /// No description provided for @sleepLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get sleepLight;

  /// No description provided for @sleepRecentSessions.
  ///
  /// In en, this message translates to:
  /// **'Recent Sessions'**
  String get sleepRecentSessions;

  /// No description provided for @sleepGreatAdvice.
  ///
  /// In en, this message translates to:
  /// **'Great sleep! Keep it up.'**
  String get sleepGreatAdvice;

  /// No description provided for @sleepGoodAdvice.
  ///
  /// In en, this message translates to:
  /// **'Good sleep. Try for 8h for optimal recovery.'**
  String get sleepGoodAdvice;

  /// No description provided for @sleepPoorAdvice.
  ///
  /// In en, this message translates to:
  /// **'You\'re under-sleeping. Aim for 7–9 hours.'**
  String get sleepPoorAdvice;

  /// No description provided for @sleepNoDataTitle.
  ///
  /// In en, this message translates to:
  /// **'No Sleep Data'**
  String get sleepNoDataTitle;

  /// No description provided for @sleepNoDataMessage.
  ///
  /// In en, this message translates to:
  /// **'Connect Health Connect or a compatible wearable to automatically import your sleep data.'**
  String get sleepNoDataMessage;

  /// No description provided for @sleepSynced.
  ///
  /// In en, this message translates to:
  /// **'Synced from Health Connect · {time}'**
  String sleepSynced(String time);

  /// No description provided for @apikeyExternalAccess.
  ///
  /// In en, this message translates to:
  /// **'External API Access'**
  String get apikeyExternalAccess;

  /// No description provided for @apikeyExternalDesc.
  ///
  /// In en, this message translates to:
  /// **'Generate an API key to access RunFlow data from external tools and integrations.'**
  String get apikeyExternalDesc;

  /// No description provided for @apikeyRevokeKey.
  ///
  /// In en, this message translates to:
  /// **'Revoke API Key'**
  String get apikeyRevokeKey;

  /// No description provided for @apikeyNoKey.
  ///
  /// In en, this message translates to:
  /// **'No API key generated'**
  String get apikeyNoKey;

  /// No description provided for @apikeyNoKeyDesc.
  ///
  /// In en, this message translates to:
  /// **'Generate an API key to access your RunFlow data programmatically.'**
  String get apikeyNoKeyDesc;

  /// No description provided for @apikeyGenerating.
  ///
  /// In en, this message translates to:
  /// **'Generating...'**
  String get apikeyGenerating;

  /// No description provided for @apikeyGenerate.
  ///
  /// In en, this message translates to:
  /// **'Generate API Key'**
  String get apikeyGenerate;

  /// No description provided for @apikeyActiveKey.
  ///
  /// In en, this message translates to:
  /// **'Active API Key'**
  String get apikeyActiveKey;

  /// No description provided for @apikeyNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Name: {name}'**
  String apikeyNameLabel(String name);

  /// No description provided for @apikeyCreatedLabel.
  ///
  /// In en, this message translates to:
  /// **'Created: {date}'**
  String apikeyCreatedLabel(String date);

  /// No description provided for @apikeyLastUsedLabel.
  ///
  /// In en, this message translates to:
  /// **'Last used: {date}'**
  String apikeyLastUsedLabel(String date);

  /// No description provided for @apikeyGeneratedTitle.
  ///
  /// In en, this message translates to:
  /// **'API Key Generated'**
  String get apikeyGeneratedTitle;

  /// No description provided for @apikeyGeneratedMessage.
  ///
  /// In en, this message translates to:
  /// **'Copy this key now. You won\'t be able to see it again.'**
  String get apikeyGeneratedMessage;

  /// No description provided for @apikeyCopied.
  ///
  /// In en, this message translates to:
  /// **'API key copied to clipboard'**
  String get apikeyCopied;

  /// No description provided for @apikeyRevokeTitle.
  ///
  /// In en, this message translates to:
  /// **'Revoke API Key?'**
  String get apikeyRevokeTitle;

  /// No description provided for @apikeyRevokeMessage.
  ///
  /// In en, this message translates to:
  /// **'This will permanently delete your API key. Any integrations using it will stop working.'**
  String get apikeyRevokeMessage;

  /// No description provided for @apikeyRevokeAction.
  ///
  /// In en, this message translates to:
  /// **'Revoke'**
  String get apikeyRevokeAction;

  /// No description provided for @apikeyRevoked.
  ///
  /// In en, this message translates to:
  /// **'API key revoked'**
  String get apikeyRevoked;

  /// No description provided for @consentTitle.
  ///
  /// In en, this message translates to:
  /// **'GDPR Consent'**
  String get consentTitle;

  /// No description provided for @consentDataProcessing.
  ///
  /// In en, this message translates to:
  /// **'Data Processing Consent'**
  String get consentDataProcessing;

  /// No description provided for @consentDataProcessingDesc.
  ///
  /// In en, this message translates to:
  /// **'Manage how your data is processed. You can withdraw consent at any time.'**
  String get consentDataProcessingDesc;

  /// No description provided for @consentTerms.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get consentTerms;

  /// No description provided for @consentTermsDesc.
  ///
  /// In en, this message translates to:
  /// **'Acceptance of our terms and conditions'**
  String get consentTermsDesc;

  /// No description provided for @consentPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get consentPrivacy;

  /// No description provided for @consentPrivacyDesc.
  ///
  /// In en, this message translates to:
  /// **'How we collect and use your data'**
  String get consentPrivacyDesc;

  /// No description provided for @consentHealthData.
  ///
  /// In en, this message translates to:
  /// **'Health Data Processing'**
  String get consentHealthData;

  /// No description provided for @consentHealthDataDesc.
  ///
  /// In en, this message translates to:
  /// **'Processing of health and fitness data for analytics (GDPR Art. 9)'**
  String get consentHealthDataDesc;

  /// No description provided for @consentAge.
  ///
  /// In en, this message translates to:
  /// **'Age Requirement'**
  String get consentAge;

  /// No description provided for @consentAgeDesc.
  ///
  /// In en, this message translates to:
  /// **'Confirmation of being at least 16 years old'**
  String get consentAgeDesc;

  /// No description provided for @consentAcceptAll.
  ///
  /// In en, this message translates to:
  /// **'Accept All Updated Policies'**
  String get consentAcceptAll;

  /// No description provided for @consentUpdateNeeded.
  ///
  /// In en, this message translates to:
  /// **'Update needed'**
  String get consentUpdateNeeded;

  /// No description provided for @aiSettingsDesc.
  ///
  /// In en, this message translates to:
  /// **'Configure your AI coaching experience and control data access.'**
  String get aiSettingsDesc;

  /// No description provided for @aiFeatures.
  ///
  /// In en, this message translates to:
  /// **'AI Features'**
  String get aiFeatures;

  /// No description provided for @aiFeaturesDesc.
  ///
  /// In en, this message translates to:
  /// **'Toggle all AI coaching and analysis features'**
  String get aiFeaturesDesc;

  /// No description provided for @aiApiKeyOptional.
  ///
  /// In en, this message translates to:
  /// **'API Key (Optional)'**
  String get aiApiKeyOptional;

  /// No description provided for @aiApiKeyDesc.
  ///
  /// In en, this message translates to:
  /// **'Add your own OpenAI-compatible API key for unlimited usage'**
  String get aiApiKeyDesc;

  /// No description provided for @aiBaseUrl.
  ///
  /// In en, this message translates to:
  /// **'Base URL'**
  String get aiBaseUrl;

  /// No description provided for @aiEnterApiKey.
  ///
  /// In en, this message translates to:
  /// **'Enter API key'**
  String get aiEnterApiKey;

  /// No description provided for @aiModel.
  ///
  /// In en, this message translates to:
  /// **'Model'**
  String get aiModel;

  /// No description provided for @aiTesting.
  ///
  /// In en, this message translates to:
  /// **'Testing...'**
  String get aiTesting;

  /// No description provided for @aiTestApiKey.
  ///
  /// In en, this message translates to:
  /// **'Test API Key'**
  String get aiTestApiKey;

  /// No description provided for @aiKeyWorks.
  ///
  /// In en, this message translates to:
  /// **'API key works!'**
  String get aiKeyWorks;

  /// No description provided for @aiKeyTestFailed.
  ///
  /// In en, this message translates to:
  /// **'API key test failed'**
  String get aiKeyTestFailed;

  /// No description provided for @aiRemoveApiKey.
  ///
  /// In en, this message translates to:
  /// **'Remove API key'**
  String get aiRemoveApiKey;

  /// No description provided for @aiDataAccess.
  ///
  /// In en, this message translates to:
  /// **'Data Access'**
  String get aiDataAccess;

  /// No description provided for @aiEnableAll.
  ///
  /// In en, this message translates to:
  /// **'Enable All'**
  String get aiEnableAll;

  /// No description provided for @aiDisableAll.
  ///
  /// In en, this message translates to:
  /// **'Disable All'**
  String get aiDisableAll;

  /// No description provided for @aiDataAccessDesc.
  ///
  /// In en, this message translates to:
  /// **'Choose what data the AI coach can access'**
  String get aiDataAccessDesc;

  /// No description provided for @aiFitnessMetrics.
  ///
  /// In en, this message translates to:
  /// **'Fitness Metrics'**
  String get aiFitnessMetrics;

  /// No description provided for @aiFitnessMetricsDesc.
  ///
  /// In en, this message translates to:
  /// **'CTL, ATL, TSB (training load & form)'**
  String get aiFitnessMetricsDesc;

  /// No description provided for @aiRecentActivity.
  ///
  /// In en, this message translates to:
  /// **'Recent Activity'**
  String get aiRecentActivity;

  /// No description provided for @aiRecentActivityDesc.
  ///
  /// In en, this message translates to:
  /// **'Your recent runs, distances, and times (Last 20)'**
  String get aiRecentActivityDesc;

  /// No description provided for @aiHeartRateData.
  ///
  /// In en, this message translates to:
  /// **'Heart Rate Data'**
  String get aiHeartRateData;

  /// No description provided for @aiHeartRateDataDesc.
  ///
  /// In en, this message translates to:
  /// **'HR zones, average & max HR'**
  String get aiHeartRateDataDesc;

  /// No description provided for @aiGoalsRaces.
  ///
  /// In en, this message translates to:
  /// **'Goals & Races'**
  String get aiGoalsRaces;

  /// No description provided for @aiGoalsRacesDesc.
  ///
  /// In en, this message translates to:
  /// **'Your race goals and targets'**
  String get aiGoalsRacesDesc;

  /// No description provided for @aiTrainingPlan.
  ///
  /// In en, this message translates to:
  /// **'Training Plan'**
  String get aiTrainingPlan;

  /// No description provided for @aiTrainingPlanDesc.
  ///
  /// In en, this message translates to:
  /// **'Scheduled workouts and progress'**
  String get aiTrainingPlanDesc;

  /// No description provided for @aiPerformance.
  ///
  /// In en, this message translates to:
  /// **'Performance'**
  String get aiPerformance;

  /// No description provided for @aiPerformanceDesc.
  ///
  /// In en, this message translates to:
  /// **'VDOT and race predictions'**
  String get aiPerformanceDesc;

  /// No description provided for @aiBiometrics.
  ///
  /// In en, this message translates to:
  /// **'Biometrics'**
  String get aiBiometrics;

  /// No description provided for @aiBiometricsDesc.
  ///
  /// In en, this message translates to:
  /// **'Weight, height, age'**
  String get aiBiometricsDesc;

  /// No description provided for @aiAllActivityHistory.
  ///
  /// In en, this message translates to:
  /// **'All Activity History'**
  String get aiAllActivityHistory;

  /// No description provided for @aiAllActivityHistoryDesc.
  ///
  /// In en, this message translates to:
  /// **'Allow AI to search older activities when needed'**
  String get aiAllActivityHistoryDesc;

  /// No description provided for @aiActivityLogs.
  ///
  /// In en, this message translates to:
  /// **'Activity Logs'**
  String get aiActivityLogs;

  /// No description provided for @aiActivityLogsDesc.
  ///
  /// In en, this message translates to:
  /// **'Allows AI to see recent runs and workouts'**
  String get aiActivityLogsDesc;

  /// No description provided for @aiNutritionLogs.
  ///
  /// In en, this message translates to:
  /// **'Nutrition Logs'**
  String get aiNutritionLogs;

  /// No description provided for @aiNutritionLogsDesc.
  ///
  /// In en, this message translates to:
  /// **'Allows AI to see macros and log meals'**
  String get aiNutritionLogsDesc;

  /// No description provided for @aiActivityFeedback.
  ///
  /// In en, this message translates to:
  /// **'Activity Feedback'**
  String get aiActivityFeedback;

  /// No description provided for @aiActivityFeedbackDesc.
  ///
  /// In en, this message translates to:
  /// **'When should AI analyze your activities?'**
  String get aiActivityFeedbackDesc;

  /// No description provided for @aiVerbose.
  ///
  /// In en, this message translates to:
  /// **'Verbose'**
  String get aiVerbose;

  /// No description provided for @aiVerboseDesc.
  ///
  /// In en, this message translates to:
  /// **'Detailed analysis'**
  String get aiVerboseDesc;

  /// No description provided for @aiConcise.
  ///
  /// In en, this message translates to:
  /// **'Concise'**
  String get aiConcise;

  /// No description provided for @aiConciseDesc.
  ///
  /// In en, this message translates to:
  /// **'Brief feedback'**
  String get aiConciseDesc;

  /// No description provided for @aiOff.
  ///
  /// In en, this message translates to:
  /// **'Off'**
  String get aiOff;

  /// No description provided for @aiOffDesc.
  ///
  /// In en, this message translates to:
  /// **'No automatic feedback'**
  String get aiOffDesc;

  /// No description provided for @aiAutomatic.
  ///
  /// In en, this message translates to:
  /// **'Automatic'**
  String get aiAutomatic;

  /// No description provided for @aiAutomaticDesc.
  ///
  /// In en, this message translates to:
  /// **'After each sync'**
  String get aiAutomaticDesc;

  /// No description provided for @aiCustomInstructions.
  ///
  /// In en, this message translates to:
  /// **'Custom Instructions'**
  String get aiCustomInstructions;

  /// No description provided for @aiCustomInstructionsDesc.
  ///
  /// In en, this message translates to:
  /// **'Add context about your training (e.g., injuries, preferences)'**
  String get aiCustomInstructionsDesc;

  /// No description provided for @aiCustomInstructionsHint.
  ///
  /// In en, this message translates to:
  /// **'I\'m recovering from a knee injury and should avoid high-intensity work...'**
  String get aiCustomInstructionsHint;

  /// No description provided for @logsTitle.
  ///
  /// In en, this message translates to:
  /// **'Debug Logs'**
  String get logsTitle;

  /// No description provided for @logsFilter.
  ///
  /// In en, this message translates to:
  /// **'Filter logs'**
  String get logsFilter;

  /// No description provided for @logsAllLogs.
  ///
  /// In en, this message translates to:
  /// **'All logs'**
  String get logsAllLogs;

  /// No description provided for @logsInfoAbove.
  ///
  /// In en, this message translates to:
  /// **'Info & above'**
  String get logsInfoAbove;

  /// No description provided for @logsWarningAbove.
  ///
  /// In en, this message translates to:
  /// **'Warning & above'**
  String get logsWarningAbove;

  /// No description provided for @logsErrorsOnly.
  ///
  /// In en, this message translates to:
  /// **'Errors only'**
  String get logsErrorsOnly;

  /// No description provided for @logsCopied.
  ///
  /// In en, this message translates to:
  /// **'Logs copied to clipboard'**
  String get logsCopied;

  /// No description provided for @logsNoLogs.
  ///
  /// In en, this message translates to:
  /// **'No logs available'**
  String get logsNoLogs;

  /// No description provided for @aboutDescription.
  ///
  /// In en, this message translates to:
  /// **'Your personal running performance dashboard. Track activities, analyze training load, manage goals, and get AI-powered coaching insights.'**
  String get aboutDescription;

  /// No description provided for @aboutVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version} ({build})'**
  String aboutVersion(String version, String build);

  /// No description provided for @aboutPrivacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get aboutPrivacyPolicy;

  /// No description provided for @aboutTermsOfService.
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get aboutTermsOfService;

  /// No description provided for @aboutOpenSource.
  ///
  /// In en, this message translates to:
  /// **'Open Source Licenses'**
  String get aboutOpenSource;

  /// No description provided for @editProfileUpdated.
  ///
  /// In en, this message translates to:
  /// **'Profile updated'**
  String get editProfileUpdated;

  /// No description provided for @editProfileFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update: {error}'**
  String editProfileFailed(String error);

  /// No description provided for @editProfileName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get editProfileName;

  /// No description provided for @editProfileNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Name is required'**
  String get editProfileNameRequired;

  /// No description provided for @editProfileNameMinChars.
  ///
  /// In en, this message translates to:
  /// **'At least 2 characters'**
  String get editProfileNameMinChars;

  /// No description provided for @editProfileSex.
  ///
  /// In en, this message translates to:
  /// **'Sex'**
  String get editProfileSex;

  /// No description provided for @editProfileSelectBirthDate.
  ///
  /// In en, this message translates to:
  /// **'Select birth date'**
  String get editProfileSelectBirthDate;

  /// No description provided for @editProfileBodyMetrics.
  ///
  /// In en, this message translates to:
  /// **'Body Metrics'**
  String get editProfileBodyMetrics;

  /// No description provided for @editProfileWeightKg.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get editProfileWeightKg;

  /// No description provided for @editProfileHeightCm.
  ///
  /// In en, this message translates to:
  /// **'Height (cm)'**
  String get editProfileHeightCm;

  /// No description provided for @editProfileEnterValidNumber.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid number'**
  String get editProfileEnterValidNumber;

  /// No description provided for @editProfileEnterValidWeight.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid weight'**
  String get editProfileEnterValidWeight;

  /// No description provided for @editProfileEnterValidHeight.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid height (50-300 cm)'**
  String get editProfileEnterValidHeight;

  /// No description provided for @editProfileHeartRate.
  ///
  /// In en, this message translates to:
  /// **'Heart Rate'**
  String get editProfileHeartRate;

  /// No description provided for @editProfileMaxHr.
  ///
  /// In en, this message translates to:
  /// **'Max HR (bpm)'**
  String get editProfileMaxHr;

  /// No description provided for @editProfileRestingHr.
  ///
  /// In en, this message translates to:
  /// **'Resting HR (bpm)'**
  String get editProfileRestingHr;

  /// No description provided for @editProfileThresholdHr.
  ///
  /// In en, this message translates to:
  /// **'Threshold HR (bpm)'**
  String get editProfileThresholdHr;

  /// No description provided for @editProfileEnterValidHr.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid HR ({min}-{max})'**
  String editProfileEnterValidHr(int min, int max);

  /// No description provided for @hrZonesUpdated.
  ///
  /// In en, this message translates to:
  /// **'HR Zones updated'**
  String get hrZonesUpdated;

  /// No description provided for @hrZonesFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update: {error}'**
  String hrZonesFailed(String error);

  /// No description provided for @hrZonesDescription.
  ///
  /// In en, this message translates to:
  /// **'Define your heart rate zone boundaries. Each zone max must be greater than the previous zone.'**
  String get hrZonesDescription;

  /// No description provided for @hrZone7Note.
  ///
  /// In en, this message translates to:
  /// **'Zone 7 (Neuromuscular): Everything above Zone 6'**
  String get hrZone7Note;

  /// No description provided for @hrZone1.
  ///
  /// In en, this message translates to:
  /// **'Zone 1 (Recovery)'**
  String get hrZone1;

  /// No description provided for @hrZone2.
  ///
  /// In en, this message translates to:
  /// **'Zone 2 (Aerobic)'**
  String get hrZone2;

  /// No description provided for @hrZone3.
  ///
  /// In en, this message translates to:
  /// **'Zone 3 (Tempo)'**
  String get hrZone3;

  /// No description provided for @hrZone4.
  ///
  /// In en, this message translates to:
  /// **'Zone 4 (Threshold)'**
  String get hrZone4;

  /// No description provided for @hrZone5.
  ///
  /// In en, this message translates to:
  /// **'Zone 5 (VO2max)'**
  String get hrZone5;

  /// No description provided for @hrZone6.
  ///
  /// In en, this message translates to:
  /// **'Zone 6 (Anaerobic)'**
  String get hrZone6;

  /// No description provided for @hrZoneUpTo.
  ///
  /// In en, this message translates to:
  /// **'Up to {value} bpm'**
  String hrZoneUpTo(String value);

  /// No description provided for @hrZoneMustBePositive.
  ///
  /// In en, this message translates to:
  /// **'Zone {index} must be a positive value'**
  String hrZoneMustBePositive(int index);

  /// No description provided for @hrZoneMustBeGreater.
  ///
  /// In en, this message translates to:
  /// **'Zone {index} max must be greater than Zone {prev} max'**
  String hrZoneMustBeGreater(int index, int prev);

  /// No description provided for @bodyFatLabel.
  ///
  /// In en, this message translates to:
  /// **'Body Fat'**
  String get bodyFatLabel;

  /// No description provided for @bodyWaist.
  ///
  /// In en, this message translates to:
  /// **'Waist'**
  String get bodyWaist;

  /// No description provided for @bodyChest.
  ///
  /// In en, this message translates to:
  /// **'Chest'**
  String get bodyChest;

  /// No description provided for @bodyHips.
  ///
  /// In en, this message translates to:
  /// **'Hips'**
  String get bodyHips;

  /// No description provided for @bodyArms.
  ///
  /// In en, this message translates to:
  /// **'Arms'**
  String get bodyArms;

  /// No description provided for @bodyWaistShort.
  ///
  /// In en, this message translates to:
  /// **'W'**
  String get bodyWaistShort;

  /// No description provided for @bodyChestShort.
  ///
  /// In en, this message translates to:
  /// **'C'**
  String get bodyChestShort;

  /// No description provided for @bodyHipsShort.
  ///
  /// In en, this message translates to:
  /// **'H'**
  String get bodyHipsShort;

  /// No description provided for @bodyArmsShort.
  ///
  /// In en, this message translates to:
  /// **'A'**
  String get bodyArmsShort;

  /// No description provided for @bodyBfShort.
  ///
  /// In en, this message translates to:
  /// **'bf'**
  String get bodyBfShort;

  /// No description provided for @dashboardSwitchWorkoutTooltip.
  ///
  /// In en, this message translates to:
  /// **'Switch workout'**
  String get dashboardSwitchWorkoutTooltip;

  /// No description provided for @dashboardFailedToUpdate.
  ///
  /// In en, this message translates to:
  /// **'Failed to update: {error}'**
  String dashboardFailedToUpdate(String error);

  /// No description provided for @dashboardStartQuestion.
  ///
  /// In en, this message translates to:
  /// **'Start {workout}?'**
  String dashboardStartQuestion(String workout);

  /// No description provided for @dashboardGpsTrackingInfo.
  ///
  /// In en, this message translates to:
  /// **'This will start recording your workout with GPS tracking.'**
  String get dashboardGpsTrackingInfo;

  /// No description provided for @dashboardSelectWorkoutHint.
  ///
  /// In en, this message translates to:
  /// **'Select a different workout to replace today\'s workout'**
  String get dashboardSelectWorkoutHint;

  /// No description provided for @dashboardTargetPaceLabel.
  ///
  /// In en, this message translates to:
  /// **'Target Pace: {pace}'**
  String dashboardTargetPaceLabel(String pace);

  /// No description provided for @workoutTypeEasy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get workoutTypeEasy;

  /// No description provided for @workoutTypeLong.
  ///
  /// In en, this message translates to:
  /// **'Long'**
  String get workoutTypeLong;

  /// No description provided for @workoutTypeTempo.
  ///
  /// In en, this message translates to:
  /// **'Tempo'**
  String get workoutTypeTempo;

  /// No description provided for @workoutTypeInterval.
  ///
  /// In en, this message translates to:
  /// **'Interval'**
  String get workoutTypeInterval;

  /// No description provided for @workoutTypeRecovery.
  ///
  /// In en, this message translates to:
  /// **'Recovery'**
  String get workoutTypeRecovery;

  /// No description provided for @workoutTypeRace.
  ///
  /// In en, this message translates to:
  /// **'Race'**
  String get workoutTypeRace;

  /// No description provided for @workoutTypeOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get workoutTypeOther;

  /// No description provided for @planReorderWorkouts.
  ///
  /// In en, this message translates to:
  /// **'Reorder workouts'**
  String get planReorderWorkouts;

  /// No description provided for @planGoalDetailsTooltip.
  ///
  /// In en, this message translates to:
  /// **'Goal details'**
  String get planGoalDetailsTooltip;

  /// No description provided for @planDaysToGo.
  ///
  /// In en, this message translates to:
  /// **'{days} days to go'**
  String planDaysToGo(int days);

  /// No description provided for @planRaceDay.
  ///
  /// In en, this message translates to:
  /// **'Race day!'**
  String get planRaceDay;

  /// No description provided for @planWorkoutsDone.
  ///
  /// In en, this message translates to:
  /// **'workouts done'**
  String get planWorkoutsDone;

  /// No description provided for @planTrainingPlanTitle.
  ///
  /// In en, this message translates to:
  /// **'Training Plan'**
  String get planTrainingPlanTitle;

  /// No description provided for @planDragWorkoutsToReorder.
  ///
  /// In en, this message translates to:
  /// **'Drag workouts to reorder'**
  String get planDragWorkoutsToReorder;

  /// No description provided for @planNoWorkoutsScheduled.
  ///
  /// In en, this message translates to:
  /// **'No workouts scheduled yet'**
  String get planNoWorkoutsScheduled;

  /// No description provided for @planToday.
  ///
  /// In en, this message translates to:
  /// **'TODAY'**
  String get planToday;

  /// No description provided for @planEditWorkoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Workout'**
  String get planEditWorkoutTitle;

  /// No description provided for @planStartWorkoutAction.
  ///
  /// In en, this message translates to:
  /// **'Start Workout'**
  String get planStartWorkoutAction;

  /// No description provided for @planMarkComplete.
  ///
  /// In en, this message translates to:
  /// **'Mark Complete'**
  String get planMarkComplete;

  /// No description provided for @planWorkoutType.
  ///
  /// In en, this message translates to:
  /// **'Workout Type'**
  String get planWorkoutType;

  /// No description provided for @planDescription.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get planDescription;

  /// No description provided for @planTargetDistanceKm.
  ///
  /// In en, this message translates to:
  /// **'Target Distance (km)'**
  String get planTargetDistanceKm;

  /// No description provided for @planTargetPaceSecKm.
  ///
  /// In en, this message translates to:
  /// **'Target Pace (sec/km)'**
  String get planTargetPaceSecKm;

  /// No description provided for @planTargetDurationMin.
  ///
  /// In en, this message translates to:
  /// **'Target Duration (min)'**
  String get planTargetDurationMin;

  /// No description provided for @planSuggestedDurationMin.
  ///
  /// In en, this message translates to:
  /// **'Suggested: {value} min'**
  String planSuggestedDurationMin(String value);

  /// No description provided for @planSuggestedPaceSecKm.
  ///
  /// In en, this message translates to:
  /// **'Suggested: {value} sec/km'**
  String planSuggestedPaceSecKm(String value);

  /// No description provided for @planSuggestedDistanceKm.
  ///
  /// In en, this message translates to:
  /// **'Suggested: {value} km'**
  String planSuggestedDistanceKm(String value);

  /// No description provided for @planNoActivePlan.
  ///
  /// In en, this message translates to:
  /// **'No Active Plan'**
  String get planNoActivePlan;

  /// No description provided for @planCreateTrainingGoal.
  ///
  /// In en, this message translates to:
  /// **'Create a training goal to get your personalized plan.'**
  String get planCreateTrainingGoal;

  /// No description provided for @planCreateGoal.
  ///
  /// In en, this message translates to:
  /// **'Create Goal'**
  String get planCreateGoal;

  /// No description provided for @recordFailedToSaveError.
  ///
  /// In en, this message translates to:
  /// **'Failed to save: {error}'**
  String recordFailedToSaveError(String error);

  /// No description provided for @recordConnectedTo.
  ///
  /// In en, this message translates to:
  /// **'Connected to {name}'**
  String recordConnectedTo(String name);

  /// No description provided for @recordWaitingForGps.
  ///
  /// In en, this message translates to:
  /// **'Waiting for GPS...'**
  String get recordWaitingForGps;

  /// No description provided for @recordDisableVoiceCoach.
  ///
  /// In en, this message translates to:
  /// **'Disable voice coach'**
  String get recordDisableVoiceCoach;

  /// No description provided for @recordEnableVoiceCoach.
  ///
  /// In en, this message translates to:
  /// **'Enable voice coach'**
  String get recordEnableVoiceCoach;

  /// No description provided for @recordStopRecording.
  ///
  /// In en, this message translates to:
  /// **'Stop recording'**
  String get recordStopRecording;

  /// No description provided for @recordPauseRecording.
  ///
  /// In en, this message translates to:
  /// **'Pause recording'**
  String get recordPauseRecording;

  /// No description provided for @recordResumeRecording.
  ///
  /// In en, this message translates to:
  /// **'Resume recording'**
  String get recordResumeRecording;

  /// No description provided for @recordStartRecording.
  ///
  /// In en, this message translates to:
  /// **'Start recording'**
  String get recordStartRecording;

  /// No description provided for @recordGpsAccuracy.
  ///
  /// In en, this message translates to:
  /// **'GPS {meters}m'**
  String recordGpsAccuracy(int meters);

  /// No description provided for @goalDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Goal Details'**
  String get goalDetailsTitle;

  /// No description provided for @goalDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Goal'**
  String get goalDeleteTitle;

  /// No description provided for @goalDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this goal? This action cannot be undone.'**
  String get goalDeleteConfirm;

  /// No description provided for @goalDeleteFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to delete goal: {error}'**
  String goalDeleteFailed(String error);

  /// No description provided for @goalWorkouts.
  ///
  /// In en, this message translates to:
  /// **'Workouts'**
  String get goalWorkouts;

  /// No description provided for @goalVdotValue.
  ///
  /// In en, this message translates to:
  /// **'VDOT: {value}'**
  String goalVdotValue(String value);

  /// No description provided for @goalPredictedTime.
  ///
  /// In en, this message translates to:
  /// **'Predicted: {time}'**
  String goalPredictedTime(String time);

  /// No description provided for @goalDaysToRaceDay.
  ///
  /// In en, this message translates to:
  /// **'days to race day'**
  String get goalDaysToRaceDay;

  /// No description provided for @goalWorkoutsCompletedCount.
  ///
  /// In en, this message translates to:
  /// **'{completed} of {total} workouts completed'**
  String goalWorkoutsCompletedCount(int completed, int total);

  /// No description provided for @goalPercentComplete.
  ///
  /// In en, this message translates to:
  /// **'{percent}% complete'**
  String goalPercentComplete(String percent);

  /// No description provided for @goalFailedToUpdateWorkout.
  ///
  /// In en, this message translates to:
  /// **'Failed to update workout'**
  String get goalFailedToUpdateWorkout;

  /// No description provided for @goalActiveGoals.
  ///
  /// In en, this message translates to:
  /// **'Active Goals'**
  String get goalActiveGoals;

  /// No description provided for @goalCompletedGoals.
  ///
  /// In en, this message translates to:
  /// **'Completed Goals'**
  String get goalCompletedGoals;

  /// No description provided for @goalDaysToGoShort.
  ///
  /// In en, this message translates to:
  /// **'{days} days to go'**
  String goalDaysToGoShort(int days);

  /// No description provided for @goalWorkoutsCount.
  ///
  /// In en, this message translates to:
  /// **'{completed}/{total} workouts'**
  String goalWorkoutsCount(int completed, int total);

  /// No description provided for @goalSubGoalsTitle.
  ///
  /// In en, this message translates to:
  /// **'Sub Goals'**
  String get goalSubGoalsTitle;

  /// No description provided for @goalSubGoalsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No sub goals yet. Add milestones or secondary targets.'**
  String get goalSubGoalsEmpty;

  /// No description provided for @goalSubGoalAdd.
  ///
  /// In en, this message translates to:
  /// **'Add Sub Goal'**
  String get goalSubGoalAdd;

  /// No description provided for @goalSubGoalName.
  ///
  /// In en, this message translates to:
  /// **'Sub Goal Name'**
  String get goalSubGoalName;

  /// No description provided for @goalSubGoalNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Run a 10K tune-up race'**
  String get goalSubGoalNameHint;

  /// No description provided for @goalSubGoalPriority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get goalSubGoalPriority;

  /// No description provided for @goalSubGoalPrioritySecondary.
  ///
  /// In en, this message translates to:
  /// **'Secondary'**
  String get goalSubGoalPrioritySecondary;

  /// No description provided for @goalSubGoalPriorityTuneUp.
  ///
  /// In en, this message translates to:
  /// **'Tune-Up'**
  String get goalSubGoalPriorityTuneUp;

  /// No description provided for @goalSubGoalPriorityMilestone.
  ///
  /// In en, this message translates to:
  /// **'Milestone'**
  String get goalSubGoalPriorityMilestone;

  /// No description provided for @goalSubGoalCreated.
  ///
  /// In en, this message translates to:
  /// **'Sub goal created'**
  String get goalSubGoalCreated;

  /// No description provided for @goalSubGoalCreateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to create sub goal: {error}'**
  String goalSubGoalCreateFailed(String error);

  /// No description provided for @goalSubGoalDelete.
  ///
  /// In en, this message translates to:
  /// **'Remove Sub Goal'**
  String get goalSubGoalDelete;

  /// No description provided for @goalSubGoalDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove this sub goal?'**
  String get goalSubGoalDeleteConfirm;

  /// No description provided for @goalCreateSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Create a training goal to start your journey to race day.'**
  String get goalCreateSubtitle;

  /// No description provided for @goalWizardNewGoal.
  ///
  /// In en, this message translates to:
  /// **'New Goal'**
  String get goalWizardNewGoal;

  /// No description provided for @goalWizardFutureRaceDate.
  ///
  /// In en, this message translates to:
  /// **'Please select a future race date'**
  String get goalWizardFutureRaceDate;

  /// No description provided for @goalWizardCreateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to create goal: {error}'**
  String goalWizardCreateFailed(String error);

  /// No description provided for @goalWizardNameRaceType.
  ///
  /// In en, this message translates to:
  /// **'Name & Race Type'**
  String get goalWizardNameRaceType;

  /// No description provided for @goalWizardNameRaceTypeDesc.
  ///
  /// In en, this message translates to:
  /// **'Give your goal a name and select the type of race you\'re training for.'**
  String get goalWizardNameRaceTypeDesc;

  /// No description provided for @goalWizardGoalName.
  ///
  /// In en, this message translates to:
  /// **'Goal Name'**
  String get goalWizardGoalName;

  /// No description provided for @goalWizardGoalNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Berlin Marathon 2025'**
  String get goalWizardGoalNameHint;

  /// No description provided for @goalWizardGoalNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Goal name is required'**
  String get goalWizardGoalNameRequired;

  /// No description provided for @goalWizardGoalNameMinChars.
  ///
  /// In en, this message translates to:
  /// **'At least 2 characters'**
  String get goalWizardGoalNameMinChars;

  /// No description provided for @goalWizardRaceTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Race Type'**
  String get goalWizardRaceTypeLabel;

  /// No description provided for @goalWizardRaceDistance.
  ///
  /// In en, this message translates to:
  /// **'Distance: {distance}'**
  String goalWizardRaceDistance(String distance);

  /// No description provided for @goalWizardRaceDateTitle.
  ///
  /// In en, this message translates to:
  /// **'Race Date'**
  String get goalWizardRaceDateTitle;

  /// No description provided for @goalWizardRaceDateDesc.
  ///
  /// In en, this message translates to:
  /// **'When is your target race day?'**
  String get goalWizardRaceDateDesc;

  /// No description provided for @goalWizardSelectDate.
  ///
  /// In en, this message translates to:
  /// **'Select Date'**
  String get goalWizardSelectDate;

  /// No description provided for @goalWizardDaysFromNow.
  ///
  /// In en, this message translates to:
  /// **'{days} days from now'**
  String goalWizardDaysFromNow(int days);

  /// No description provided for @goalWizardTargetTimeTitle.
  ///
  /// In en, this message translates to:
  /// **'Target Time'**
  String get goalWizardTargetTimeTitle;

  /// No description provided for @goalWizardTargetTimeDesc.
  ///
  /// In en, this message translates to:
  /// **'Set a target finish time for your race. This is optional.'**
  String get goalWizardTargetTimeDesc;

  /// No description provided for @goalWizardSetTargetTime.
  ///
  /// In en, this message translates to:
  /// **'Set a target time'**
  String get goalWizardSetTargetTime;

  /// No description provided for @goalWizardHours.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get goalWizardHours;

  /// No description provided for @goalWizardMinutes.
  ///
  /// In en, this message translates to:
  /// **'Minutes'**
  String get goalWizardMinutes;

  /// No description provided for @goalWizardSecondsLabel.
  ///
  /// In en, this message translates to:
  /// **'Seconds'**
  String get goalWizardSecondsLabel;

  /// No description provided for @goalWizardTrainingPlanTitle.
  ///
  /// In en, this message translates to:
  /// **'Training Plan'**
  String get goalWizardTrainingPlanTitle;

  /// No description provided for @goalWizardTrainingPlanDesc.
  ///
  /// In en, this message translates to:
  /// **'Configure your training plan preferences.'**
  String get goalWizardTrainingPlanDesc;

  /// No description provided for @goalWizardRunsPerWeek.
  ///
  /// In en, this message translates to:
  /// **'Runs per week'**
  String get goalWizardRunsPerWeek;

  /// No description provided for @goalWizardWeeklyMileageGoal.
  ///
  /// In en, this message translates to:
  /// **'Weekly mileage goal'**
  String get goalWizardWeeklyMileageGoal;

  /// No description provided for @goalWizardStartWeeklyMileage.
  ///
  /// In en, this message translates to:
  /// **'Current weekly mileage'**
  String get goalWizardStartWeeklyMileage;

  /// No description provided for @goalWizardStartWeeklyMileageHelp.
  ///
  /// In en, this message translates to:
  /// **'Your plan will ramp up from this level'**
  String get goalWizardStartWeeklyMileageHelp;

  /// No description provided for @goalWizardPlanDuration.
  ///
  /// In en, this message translates to:
  /// **'Plan duration'**
  String get goalWizardPlanDuration;

  /// No description provided for @goalWizardWeeksCount.
  ///
  /// In en, this message translates to:
  /// **'{weeks} weeks'**
  String goalWizardWeeksCount(int weeks);

  /// No description provided for @goalWizardReviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get goalWizardReviewTitle;

  /// No description provided for @goalWizardReviewDesc.
  ///
  /// In en, this message translates to:
  /// **'Review your goal details before creating.'**
  String get goalWizardReviewDesc;

  /// No description provided for @goalWizardGoalNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Goal Name'**
  String get goalWizardGoalNameLabel;

  /// No description provided for @goalWizardNotSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get goalWizardNotSet;

  /// No description provided for @goalWizardRaceDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Race Date'**
  String get goalWizardRaceDateLabel;

  /// No description provided for @goalWizardTargetTimeLabel.
  ///
  /// In en, this message translates to:
  /// **'Target Time'**
  String get goalWizardTargetTimeLabel;

  /// No description provided for @goalWizardRunsPerWeekLabel.
  ///
  /// In en, this message translates to:
  /// **'Runs per Week'**
  String get goalWizardRunsPerWeekLabel;

  /// No description provided for @goalWizardWeeklyMileageLabel.
  ///
  /// In en, this message translates to:
  /// **'Weekly Mileage'**
  String get goalWizardWeeklyMileageLabel;

  /// No description provided for @goalWizardPlanDurationLabel.
  ///
  /// In en, this message translates to:
  /// **'Plan Duration'**
  String get goalWizardPlanDurationLabel;

  /// No description provided for @goalWizardTrainingVolumeTitle.
  ///
  /// In en, this message translates to:
  /// **'Training Volume'**
  String get goalWizardTrainingVolumeTitle;

  /// No description provided for @goalWizardTrainingVolumeDesc.
  ///
  /// In en, this message translates to:
  /// **'Set your weekly training volume and cross-training frequency.'**
  String get goalWizardTrainingVolumeDesc;

  /// No description provided for @goalWizardRidesPerWeek.
  ///
  /// In en, this message translates to:
  /// **'Rides per week'**
  String get goalWizardRidesPerWeek;

  /// No description provided for @goalWizardSwimsPerWeek.
  ///
  /// In en, this message translates to:
  /// **'Swims per week'**
  String get goalWizardSwimsPerWeek;

  /// No description provided for @goalWizardStrengthPerWeek.
  ///
  /// In en, this message translates to:
  /// **'Strength sessions per week'**
  String get goalWizardStrengthPerWeek;

  /// No description provided for @goalWizardMaxLongRunKm.
  ///
  /// In en, this message translates to:
  /// **'Max long run'**
  String get goalWizardMaxLongRunKm;

  /// No description provided for @goalWizardMaxLongRunCapDesc.
  ///
  /// In en, this message translates to:
  /// **'Maximum distance for your longest weekly run'**
  String get goalWizardMaxLongRunCapDesc;

  /// No description provided for @goalWizardTrainingPhasesTitle.
  ///
  /// In en, this message translates to:
  /// **'Training Phases'**
  String get goalWizardTrainingPhasesTitle;

  /// No description provided for @goalWizardTrainingPhasesDesc.
  ///
  /// In en, this message translates to:
  /// **'Customize your build, peak, and taper weeks.'**
  String get goalWizardTrainingPhasesDesc;

  /// No description provided for @goalWizardTaperWeeks.
  ///
  /// In en, this message translates to:
  /// **'Taper Weeks'**
  String get goalWizardTaperWeeks;

  /// No description provided for @goalWizardPeakWeeks.
  ///
  /// In en, this message translates to:
  /// **'Peak Weeks'**
  String get goalWizardPeakWeeks;

  /// No description provided for @goalWizardBuildWeeks.
  ///
  /// In en, this message translates to:
  /// **'Build Weeks'**
  String get goalWizardBuildWeeks;

  /// No description provided for @goalWizardPhasesExceedPlan.
  ///
  /// In en, this message translates to:
  /// **'Phases total ({current}) exceeds plan ({total} weeks). Adjust phases or plan duration.'**
  String goalWizardPhasesExceedPlan(int current, int total);

  /// No description provided for @goalWizardPhasesTotalWithBase.
  ///
  /// In en, this message translates to:
  /// **'{total} of {planWeeks} weeks ({base} base phase)'**
  String goalWizardPhasesTotalWithBase(int total, int planWeeks, int base);

  /// No description provided for @goalWizardWorkoutSchedulingTitle.
  ///
  /// In en, this message translates to:
  /// **'Workout Scheduling'**
  String get goalWizardWorkoutSchedulingTitle;

  /// No description provided for @goalWizardWorkoutSchedulingDesc.
  ///
  /// In en, this message translates to:
  /// **'Choose which days to schedule key workouts and rest.'**
  String get goalWizardWorkoutSchedulingDesc;

  /// No description provided for @goalWizardLongRunDay.
  ///
  /// In en, this message translates to:
  /// **'Long Run Day'**
  String get goalWizardLongRunDay;

  /// No description provided for @goalWizardQualityDay.
  ///
  /// In en, this message translates to:
  /// **'Quality Workout Day'**
  String get goalWizardQualityDay;

  /// No description provided for @goalWizardSwimDayLabel.
  ///
  /// In en, this message translates to:
  /// **'Swim Day'**
  String get goalWizardSwimDayLabel;

  /// No description provided for @goalWizardRestDays.
  ///
  /// In en, this message translates to:
  /// **'Rest Days'**
  String get goalWizardRestDays;

  /// No description provided for @goalWizardMileageRecommendation.
  ///
  /// In en, this message translates to:
  /// **'Recommended weekly mileage based on your race distance'**
  String get goalWizardMileageRecommendation;

  /// No description provided for @goalWizardPlanStartDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Plan Start Date'**
  String get goalWizardPlanStartDateLabel;

  /// No description provided for @goalWizardPlanStartDateAfterRace.
  ///
  /// In en, this message translates to:
  /// **'Plan start date must be before race date'**
  String get goalWizardPlanStartDateAfterRace;

  /// No description provided for @goalWizardTargetTimeRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter a valid target time greater than zero'**
  String get goalWizardTargetTimeRequired;

  /// No description provided for @goalWizardVolumeTooLow.
  ///
  /// In en, this message translates to:
  /// **'Weekly mileage must be at least 5 km with at least 1 run per week'**
  String get goalWizardVolumeTooLow;

  /// No description provided for @goalWizardScheduleConflict.
  ///
  /// In en, this message translates to:
  /// **'Long run and quality workout cannot be on the same day'**
  String get goalWizardScheduleConflict;

  /// No description provided for @authStravaNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Strava sign-in is not configured for this build.'**
  String get authStravaNotConfigured;

  /// No description provided for @authEnterEmailPassword.
  ///
  /// In en, this message translates to:
  /// **'Please enter email and password.'**
  String get authEnterEmailPassword;

  /// No description provided for @authSignUpSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign up to get started with RunFlow'**
  String get authSignUpSubtitle;

  /// No description provided for @authName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get authName;

  /// No description provided for @authNameHint.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get authNameHint;

  /// No description provided for @authNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter your name.'**
  String get authNameRequired;

  /// No description provided for @authEmailRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter your email.'**
  String get authEmailRequired;

  /// No description provided for @authInvalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Please enter a valid email address.'**
  String get authInvalidEmail;

  /// No description provided for @authShowPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get authShowPassword;

  /// No description provided for @authHidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get authHidePassword;

  /// No description provided for @authPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter a password.'**
  String get authPasswordRequired;

  /// No description provided for @authPasswordMinChars.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters.'**
  String get authPasswordMinChars;

  /// No description provided for @authConfirmPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Please confirm your password.'**
  String get authConfirmPasswordRequired;

  /// No description provided for @authPasswordsNoMatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match.'**
  String get authPasswordsNoMatch;

  /// No description provided for @authAccountExists.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists.'**
  String get authAccountExists;

  /// No description provided for @authRegistrationFailedMsg.
  ///
  /// In en, this message translates to:
  /// **'Registration failed. Please try again.'**
  String get authRegistrationFailedMsg;

  /// No description provided for @authBackTooltip.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get authBackTooltip;

  /// No description provided for @authSignInSemantic.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignInSemantic;

  /// No description provided for @authCheckYourEmail.
  ///
  /// In en, this message translates to:
  /// **'Check Your Email'**
  String get authCheckYourEmail;

  /// No description provided for @authResetEmailSent.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for {email}, you will receive a password reset link.'**
  String authResetEmailSent(String email);

  /// No description provided for @authBackToSignIn.
  ///
  /// In en, this message translates to:
  /// **'Back to Sign In'**
  String get authBackToSignIn;

  /// No description provided for @authFailedToSendReset.
  ///
  /// In en, this message translates to:
  /// **'Failed to send reset email. Please try again.'**
  String get authFailedToSendReset;

  /// No description provided for @authEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmailLabel;

  /// No description provided for @authVerifyYourEmail.
  ///
  /// In en, this message translates to:
  /// **'Verify Your Email'**
  String get authVerifyYourEmail;

  /// No description provided for @authCodeSentTo.
  ///
  /// In en, this message translates to:
  /// **'We sent a 6-digit code to\n{email}'**
  String authCodeSentTo(String email);

  /// No description provided for @authVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get authVerify;

  /// No description provided for @authSending.
  ///
  /// In en, this message translates to:
  /// **'Sending...'**
  String get authSending;

  /// No description provided for @authResendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend verification code'**
  String get authResendCode;

  /// No description provided for @authCodeResent.
  ///
  /// In en, this message translates to:
  /// **'Verification code resent'**
  String get authCodeResent;

  /// No description provided for @analyticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get analyticsTitle;

  /// No description provided for @analyticsVdot.
  ///
  /// In en, this message translates to:
  /// **'VDOT'**
  String get analyticsVdot;

  /// No description provided for @analyticsFitness.
  ///
  /// In en, this message translates to:
  /// **'Fitness'**
  String get analyticsFitness;

  /// No description provided for @analyticsFatigue.
  ///
  /// In en, this message translates to:
  /// **'Fatigue'**
  String get analyticsFatigue;

  /// No description provided for @analyticsForm.
  ///
  /// In en, this message translates to:
  /// **'Form'**
  String get analyticsForm;

  /// No description provided for @analyticsTrainingForm.
  ///
  /// In en, this message translates to:
  /// **'Training Form: {status}'**
  String analyticsTrainingForm(String status);

  /// No description provided for @analyticsTsbValue.
  ///
  /// In en, this message translates to:
  /// **'TSB {value}'**
  String analyticsTsbValue(String value);

  /// No description provided for @analyticsNoHistory.
  ///
  /// In en, this message translates to:
  /// **'No history data available'**
  String get analyticsNoHistory;

  /// No description provided for @analyticsFitnessTrend.
  ///
  /// In en, this message translates to:
  /// **'Fitness Trend'**
  String get analyticsFitnessTrend;

  /// No description provided for @analyticsRacePredictions.
  ///
  /// In en, this message translates to:
  /// **'Race Predictions'**
  String get analyticsRacePredictions;

  /// No description provided for @analyticsMarathonShape.
  ///
  /// In en, this message translates to:
  /// **'Marathon Shape'**
  String get analyticsMarathonShape;

  /// No description provided for @analyticsCalibrate.
  ///
  /// In en, this message translates to:
  /// **'Calibrate'**
  String get analyticsCalibrate;

  /// No description provided for @analyticsShapeScore.
  ///
  /// In en, this message translates to:
  /// **'Shape Score'**
  String get analyticsShapeScore;

  /// No description provided for @analyticsWeeklyMileageLabel.
  ///
  /// In en, this message translates to:
  /// **'Weekly Mileage'**
  String get analyticsWeeklyMileageLabel;

  /// No description provided for @analyticsDateRange1Y.
  ///
  /// In en, this message translates to:
  /// **'1Y'**
  String get analyticsDateRange1Y;

  /// No description provided for @analyticsDateRangeDays.
  ///
  /// In en, this message translates to:
  /// **'{days}D'**
  String analyticsDateRangeDays(int days);

  /// No description provided for @tsbPeaked.
  ///
  /// In en, this message translates to:
  /// **'Peaked'**
  String get tsbPeaked;

  /// No description provided for @tsbFresh.
  ///
  /// In en, this message translates to:
  /// **'Fresh'**
  String get tsbFresh;

  /// No description provided for @tsbNeutral.
  ///
  /// In en, this message translates to:
  /// **'Neutral'**
  String get tsbNeutral;

  /// No description provided for @tsbFatigued.
  ///
  /// In en, this message translates to:
  /// **'Fatigued'**
  String get tsbFatigued;

  /// No description provided for @tsbVeryFatigued.
  ///
  /// In en, this message translates to:
  /// **'Very Fatigued'**
  String get tsbVeryFatigued;

  /// No description provided for @raceResultTitle.
  ///
  /// In en, this message translates to:
  /// **'Race Result'**
  String get raceResultTitle;

  /// No description provided for @raceResultLinkTitle.
  ///
  /// In en, this message translates to:
  /// **'Link Your Race Result'**
  String get raceResultLinkTitle;

  /// No description provided for @raceResultPickTitle.
  ///
  /// In en, this message translates to:
  /// **'Select Your Race Run'**
  String get raceResultPickTitle;

  /// No description provided for @raceResultFoundRun.
  ///
  /// In en, this message translates to:
  /// **'We found a run near your race date!'**
  String get raceResultFoundRun;

  /// No description provided for @raceResultYesMyRace.
  ///
  /// In en, this message translates to:
  /// **'Yes, that\'s my race!'**
  String get raceResultYesMyRace;

  /// No description provided for @raceResultPickDifferent.
  ///
  /// In en, this message translates to:
  /// **'Pick a different run'**
  String get raceResultPickDifferent;

  /// No description provided for @raceResultDidntRace.
  ///
  /// In en, this message translates to:
  /// **'I didn\'t race / Skip for now'**
  String get raceResultDidntRace;

  /// No description provided for @raceResultNoMatchingRun.
  ///
  /// In en, this message translates to:
  /// **'No matching run found near your race date.'**
  String get raceResultNoMatchingRun;

  /// No description provided for @raceResultSelectRaceRun.
  ///
  /// In en, this message translates to:
  /// **'Select your race run'**
  String get raceResultSelectRaceRun;

  /// No description provided for @raceResultSelectActivity.
  ///
  /// In en, this message translates to:
  /// **'Select the activity that corresponds to your race.'**
  String get raceResultSelectActivity;

  /// No description provided for @raceResultFailedToLoadActivities.
  ///
  /// In en, this message translates to:
  /// **'Failed to load activities'**
  String get raceResultFailedToLoadActivities;

  /// No description provided for @raceResultNoActivities.
  ///
  /// In en, this message translates to:
  /// **'No activities found'**
  String get raceResultNoActivities;

  /// No description provided for @raceResultActualTime.
  ///
  /// In en, this message translates to:
  /// **'Actual Time'**
  String get raceResultActualTime;

  /// No description provided for @raceResultChipTime.
  ///
  /// In en, this message translates to:
  /// **'Chip Time'**
  String get raceResultChipTime;

  /// No description provided for @raceResultGoalTime.
  ///
  /// In en, this message translates to:
  /// **'Goal Time'**
  String get raceResultGoalTime;

  /// No description provided for @raceResultDifference.
  ///
  /// In en, this message translates to:
  /// **'Difference'**
  String get raceResultDifference;

  /// No description provided for @raceResultDetails.
  ///
  /// In en, this message translates to:
  /// **'Race Details'**
  String get raceResultDetails;

  /// No description provided for @raceResultOverallPlace.
  ///
  /// In en, this message translates to:
  /// **'Overall Place'**
  String get raceResultOverallPlace;

  /// No description provided for @raceResultGenderPlace.
  ///
  /// In en, this message translates to:
  /// **'Gender Place'**
  String get raceResultGenderPlace;

  /// No description provided for @raceResultAgeGroupPlace.
  ///
  /// In en, this message translates to:
  /// **'Age Group Place'**
  String get raceResultAgeGroupPlace;

  /// No description provided for @raceResultAgeGroup.
  ///
  /// In en, this message translates to:
  /// **'Age Group'**
  String get raceResultAgeGroup;

  /// No description provided for @raceResultAgeGroupHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. M30-34'**
  String get raceResultAgeGroupHint;

  /// No description provided for @raceResultTotalFinishers.
  ///
  /// In en, this message translates to:
  /// **'Total Finishers'**
  String get raceResultTotalFinishers;

  /// No description provided for @raceResultWeather.
  ///
  /// In en, this message translates to:
  /// **'Weather'**
  String get raceResultWeather;

  /// No description provided for @raceResultWeatherHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. 15C, sunny'**
  String get raceResultWeatherHint;

  /// No description provided for @raceResultHowDidItFeel.
  ///
  /// In en, this message translates to:
  /// **'How did it feel? (RPE {value})'**
  String raceResultHowDidItFeel(int value);

  /// No description provided for @raceResultEasy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get raceResultEasy;

  /// No description provided for @raceResultHard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get raceResultHard;

  /// No description provided for @raceResultNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get raceResultNotes;

  /// No description provided for @raceResultNotesHint.
  ///
  /// In en, this message translates to:
  /// **'How did the race go?'**
  String get raceResultNotesHint;

  /// No description provided for @raceResultTrainingSummary.
  ///
  /// In en, this message translates to:
  /// **'Training Summary'**
  String get raceResultTrainingSummary;

  /// No description provided for @raceResultWorkoutsCompleted.
  ///
  /// In en, this message translates to:
  /// **'workouts completed'**
  String get raceResultWorkoutsCompleted;

  /// No description provided for @raceResultCompletionRate.
  ///
  /// In en, this message translates to:
  /// **'completion rate'**
  String get raceResultCompletionRate;

  /// No description provided for @raceResultFailedToSave.
  ///
  /// In en, this message translates to:
  /// **'Failed to save race result'**
  String get raceResultFailedToSave;

  /// No description provided for @raceResultCompleteArchive.
  ///
  /// In en, this message translates to:
  /// **'Complete & Archive'**
  String get raceResultCompleteArchive;

  /// No description provided for @raceResultSaving.
  ///
  /// In en, this message translates to:
  /// **'Saving...'**
  String get raceResultSaving;

  /// No description provided for @raceResultTimeLabel.
  ///
  /// In en, this message translates to:
  /// **'time'**
  String get raceResultTimeLabel;

  /// No description provided for @raceResultPaceLabel.
  ///
  /// In en, this message translates to:
  /// **'pace'**
  String get raceResultPaceLabel;

  /// No description provided for @startupSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your Running Performance Dashboard'**
  String get startupSubtitle;

  /// No description provided for @showcaseSkip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get showcaseSkip;

  /// No description provided for @showcaseGetStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get showcaseGetStarted;

  /// No description provided for @showcaseContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get showcaseContinue;

  /// No description provided for @showcaseRecordTitle.
  ///
  /// In en, this message translates to:
  /// **'Record Your Runs'**
  String get showcaseRecordTitle;

  /// No description provided for @showcaseRecordSubtitle.
  ///
  /// In en, this message translates to:
  /// **'GPS tracking with real-time metrics and voice coaching'**
  String get showcaseRecordSubtitle;

  /// No description provided for @showcaseRecordFeature1.
  ///
  /// In en, this message translates to:
  /// **'GPS distance, pace & elevation tracking'**
  String get showcaseRecordFeature1;

  /// No description provided for @showcaseRecordFeature2.
  ///
  /// In en, this message translates to:
  /// **'Real-time heart rate via BLE sensors'**
  String get showcaseRecordFeature2;

  /// No description provided for @showcaseRecordFeature3.
  ///
  /// In en, this message translates to:
  /// **'Voice coach with pace alerts'**
  String get showcaseRecordFeature3;

  /// No description provided for @showcaseRecordFeature4.
  ///
  /// In en, this message translates to:
  /// **'Automatic cadence & stride analysis'**
  String get showcaseRecordFeature4;

  /// No description provided for @showcaseRecordFeature5.
  ///
  /// In en, this message translates to:
  /// **'Post-run summary with save & share'**
  String get showcaseRecordFeature5;

  /// No description provided for @showcaseAnalyticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Analyse Performance'**
  String get showcaseAnalyticsTitle;

  /// No description provided for @showcaseAnalyticsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Deep insights into your fitness with advanced metrics'**
  String get showcaseAnalyticsSubtitle;

  /// No description provided for @showcaseAnalyticsFeature1.
  ///
  /// In en, this message translates to:
  /// **'VDOT score & race predictions'**
  String get showcaseAnalyticsFeature1;

  /// No description provided for @showcaseAnalyticsFeature2.
  ///
  /// In en, this message translates to:
  /// **'Fitness (CTL), Fatigue (ATL) & Form (TSB)'**
  String get showcaseAnalyticsFeature2;

  /// No description provided for @showcaseAnalyticsFeature3.
  ///
  /// In en, this message translates to:
  /// **'Heart rate zone analysis'**
  String get showcaseAnalyticsFeature3;

  /// No description provided for @showcaseAnalyticsFeature4.
  ///
  /// In en, this message translates to:
  /// **'Pace & elevation charts per activity'**
  String get showcaseAnalyticsFeature4;

  /// No description provided for @showcaseAnalyticsFeature5.
  ///
  /// In en, this message translates to:
  /// **'Marathon shape indicator'**
  String get showcaseAnalyticsFeature5;

  /// No description provided for @showcaseAiTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Food Tracking'**
  String get showcaseAiTitle;

  /// No description provided for @showcaseAiSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Snap a photo to instantly log your nutrition'**
  String get showcaseAiSubtitle;

  /// No description provided for @showcaseAiFeature1.
  ///
  /// In en, this message translates to:
  /// **'AI-powered food recognition from photos'**
  String get showcaseAiFeature1;

  /// No description provided for @showcaseAiFeature2.
  ///
  /// In en, this message translates to:
  /// **'Barcode scanning for packaged foods'**
  String get showcaseAiFeature2;

  /// No description provided for @showcaseAiFeature3.
  ///
  /// In en, this message translates to:
  /// **'Calorie & macro tracking (P/C/F)'**
  String get showcaseAiFeature3;

  /// No description provided for @showcaseAiFeature4.
  ///
  /// In en, this message translates to:
  /// **'Water intake monitoring'**
  String get showcaseAiFeature4;

  /// No description provided for @showcaseAiFeature5.
  ///
  /// In en, this message translates to:
  /// **'7-day nutrition trends & analytics'**
  String get showcaseAiFeature5;

  /// No description provided for @showcasePlansTitle.
  ///
  /// In en, this message translates to:
  /// **'Adaptive Training Plans'**
  String get showcasePlansTitle;

  /// No description provided for @showcasePlansSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Personalized plans that adapt to your fitness level'**
  String get showcasePlansSubtitle;

  /// No description provided for @showcasePlansFeature1.
  ///
  /// In en, this message translates to:
  /// **'Goal-based plans for any race distance'**
  String get showcasePlansFeature1;

  /// No description provided for @showcasePlansFeature2.
  ///
  /// In en, this message translates to:
  /// **'Auto-calibrated from your recent runs'**
  String get showcasePlansFeature2;

  /// No description provided for @showcasePlansFeature3.
  ///
  /// In en, this message translates to:
  /// **'Easy, tempo, interval & long run types'**
  String get showcasePlansFeature3;

  /// No description provided for @showcasePlansFeature4.
  ///
  /// In en, this message translates to:
  /// **'Flexible weekly scheduling'**
  String get showcasePlansFeature4;

  /// No description provided for @showcasePlansFeature5.
  ///
  /// In en, this message translates to:
  /// **'Progressive overload with build/peak/taper'**
  String get showcasePlansFeature5;

  /// No description provided for @monthJan.
  ///
  /// In en, this message translates to:
  /// **'Jan'**
  String get monthJan;

  /// No description provided for @monthFeb.
  ///
  /// In en, this message translates to:
  /// **'Feb'**
  String get monthFeb;

  /// No description provided for @monthMar.
  ///
  /// In en, this message translates to:
  /// **'Mar'**
  String get monthMar;

  /// No description provided for @monthApr.
  ///
  /// In en, this message translates to:
  /// **'Apr'**
  String get monthApr;

  /// No description provided for @monthMay.
  ///
  /// In en, this message translates to:
  /// **'May'**
  String get monthMay;

  /// No description provided for @monthJun.
  ///
  /// In en, this message translates to:
  /// **'Jun'**
  String get monthJun;

  /// No description provided for @monthJul.
  ///
  /// In en, this message translates to:
  /// **'Jul'**
  String get monthJul;

  /// No description provided for @monthAug.
  ///
  /// In en, this message translates to:
  /// **'Aug'**
  String get monthAug;

  /// No description provided for @monthSep.
  ///
  /// In en, this message translates to:
  /// **'Sep'**
  String get monthSep;

  /// No description provided for @monthOct.
  ///
  /// In en, this message translates to:
  /// **'Oct'**
  String get monthOct;

  /// No description provided for @monthNov.
  ///
  /// In en, this message translates to:
  /// **'Nov'**
  String get monthNov;

  /// No description provided for @monthDec.
  ///
  /// In en, this message translates to:
  /// **'Dec'**
  String get monthDec;

  /// No description provided for @monthJanuary.
  ///
  /// In en, this message translates to:
  /// **'January'**
  String get monthJanuary;

  /// No description provided for @monthFebruary.
  ///
  /// In en, this message translates to:
  /// **'February'**
  String get monthFebruary;

  /// No description provided for @monthMarch.
  ///
  /// In en, this message translates to:
  /// **'March'**
  String get monthMarch;

  /// No description provided for @monthApril.
  ///
  /// In en, this message translates to:
  /// **'April'**
  String get monthApril;

  /// No description provided for @monthMayFull.
  ///
  /// In en, this message translates to:
  /// **'May'**
  String get monthMayFull;

  /// No description provided for @monthJune.
  ///
  /// In en, this message translates to:
  /// **'June'**
  String get monthJune;

  /// No description provided for @monthJuly.
  ///
  /// In en, this message translates to:
  /// **'July'**
  String get monthJuly;

  /// No description provided for @monthAugust.
  ///
  /// In en, this message translates to:
  /// **'August'**
  String get monthAugust;

  /// No description provided for @monthSeptember.
  ///
  /// In en, this message translates to:
  /// **'September'**
  String get monthSeptember;

  /// No description provided for @monthOctober.
  ///
  /// In en, this message translates to:
  /// **'October'**
  String get monthOctober;

  /// No description provided for @monthNovember.
  ///
  /// In en, this message translates to:
  /// **'November'**
  String get monthNovember;

  /// No description provided for @monthDecember.
  ///
  /// In en, this message translates to:
  /// **'December'**
  String get monthDecember;

  /// No description provided for @dayMon.
  ///
  /// In en, this message translates to:
  /// **'Mon'**
  String get dayMon;

  /// No description provided for @dayTue.
  ///
  /// In en, this message translates to:
  /// **'Tue'**
  String get dayTue;

  /// No description provided for @dayWed.
  ///
  /// In en, this message translates to:
  /// **'Wed'**
  String get dayWed;

  /// No description provided for @dayThu.
  ///
  /// In en, this message translates to:
  /// **'Thu'**
  String get dayThu;

  /// No description provided for @dayFri.
  ///
  /// In en, this message translates to:
  /// **'Fri'**
  String get dayFri;

  /// No description provided for @daySat.
  ///
  /// In en, this message translates to:
  /// **'Sat'**
  String get daySat;

  /// No description provided for @daySun.
  ///
  /// In en, this message translates to:
  /// **'Sun'**
  String get daySun;

  /// No description provided for @raceCategoryRunning.
  ///
  /// In en, this message translates to:
  /// **'Running'**
  String get raceCategoryRunning;

  /// No description provided for @raceCategoryUltra.
  ///
  /// In en, this message translates to:
  /// **'Ultra'**
  String get raceCategoryUltra;

  /// No description provided for @raceCategoryTriathlon.
  ///
  /// In en, this message translates to:
  /// **'Triathlon'**
  String get raceCategoryTriathlon;

  /// No description provided for @raceType50k.
  ///
  /// In en, this message translates to:
  /// **'50K'**
  String get raceType50k;

  /// No description provided for @raceType50Mile.
  ///
  /// In en, this message translates to:
  /// **'50 Mile'**
  String get raceType50Mile;

  /// No description provided for @raceType100k.
  ///
  /// In en, this message translates to:
  /// **'100K'**
  String get raceType100k;

  /// No description provided for @raceType100Mile.
  ///
  /// In en, this message translates to:
  /// **'100 Mile'**
  String get raceType100Mile;

  /// No description provided for @raceType12Hour.
  ///
  /// In en, this message translates to:
  /// **'12 Hour'**
  String get raceType12Hour;

  /// No description provided for @raceType24Hour.
  ///
  /// In en, this message translates to:
  /// **'24 Hour'**
  String get raceType24Hour;

  /// No description provided for @raceTypeBackyardUltra.
  ///
  /// In en, this message translates to:
  /// **'Backyard Ultra'**
  String get raceTypeBackyardUltra;

  /// No description provided for @raceTypeCustomDistance.
  ///
  /// In en, this message translates to:
  /// **'Custom Distance'**
  String get raceTypeCustomDistance;

  /// No description provided for @raceTypeSprintTri.
  ///
  /// In en, this message translates to:
  /// **'Sprint Triathlon'**
  String get raceTypeSprintTri;

  /// No description provided for @raceTypeOlympicTri.
  ///
  /// In en, this message translates to:
  /// **'Olympic Triathlon'**
  String get raceTypeOlympicTri;

  /// No description provided for @raceTypeHalfIronman.
  ///
  /// In en, this message translates to:
  /// **'Half Ironman'**
  String get raceTypeHalfIronman;

  /// No description provided for @raceTypeFullIronman.
  ///
  /// In en, this message translates to:
  /// **'Full Ironman'**
  String get raceTypeFullIronman;

  /// No description provided for @raceTypeCustomTri.
  ///
  /// In en, this message translates to:
  /// **'Custom Triathlon'**
  String get raceTypeCustomTri;

  /// No description provided for @goalWeeklyMileageDisplay.
  ///
  /// In en, this message translates to:
  /// **'{value} km/wk'**
  String goalWeeklyMileageDisplay(String value);

  /// No description provided for @goalRunsPerWeekDisplay.
  ///
  /// In en, this message translates to:
  /// **'{count}x / wk'**
  String goalRunsPerWeekDisplay(int count);

  /// No description provided for @settingsRecipeIntegrations.
  ///
  /// In en, this message translates to:
  /// **'Recipe Integrations'**
  String get settingsRecipeIntegrations;

  /// No description provided for @settingsConnectSelfHosted.
  ///
  /// In en, this message translates to:
  /// **'Connect Self-Hosted Managers'**
  String get settingsConnectSelfHosted;

  /// No description provided for @settingsRecipeIntegrationSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Import planned recipes, ingredients, and custom food macros directly from your self-hosted Mealie or Tandoor instances.'**
  String get settingsRecipeIntegrationSubtitle;

  /// No description provided for @settingsEnableIntegration.
  ///
  /// In en, this message translates to:
  /// **'Enable Integration'**
  String get settingsEnableIntegration;

  /// No description provided for @settingsRecipeIntegrationDesc.
  ///
  /// In en, this message translates to:
  /// **'Allow searching and importing external recipes'**
  String get settingsRecipeIntegrationDesc;

  /// No description provided for @settingsServiceType.
  ///
  /// In en, this message translates to:
  /// **'Service Type'**
  String get settingsServiceType;

  /// No description provided for @settingsServerCredentials.
  ///
  /// In en, this message translates to:
  /// **'Server Credentials'**
  String get settingsServerCredentials;

  /// No description provided for @settingsServerBaseUrl.
  ///
  /// In en, this message translates to:
  /// **'Server Base URL'**
  String get settingsServerBaseUrl;

  /// No description provided for @settingsMealieExample.
  ///
  /// In en, this message translates to:
  /// **'https://mealie.example.com'**
  String get settingsMealieExample;

  /// No description provided for @settingsEnterServerUrl.
  ///
  /// In en, this message translates to:
  /// **'Please enter a server URL'**
  String get settingsEnterServerUrl;

  /// No description provided for @settingsApiAccessToken.
  ///
  /// In en, this message translates to:
  /// **'API Access Token'**
  String get settingsApiAccessToken;

  /// No description provided for @settingsEnterApiKey.
  ///
  /// In en, this message translates to:
  /// **'Enter API key or Bearer token'**
  String get settingsEnterApiKey;

  /// No description provided for @settingsEnterApiToken.
  ///
  /// In en, this message translates to:
  /// **'Please enter an API token'**
  String get settingsEnterApiToken;

  /// No description provided for @settingsConnecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting...'**
  String get settingsConnecting;

  /// No description provided for @settingsTestConnection.
  ///
  /// In en, this message translates to:
  /// **'Test Connection'**
  String get settingsTestConnection;

  /// No description provided for @settingsConnectionSuccessful.
  ///
  /// In en, this message translates to:
  /// **'Connection successful!'**
  String get settingsConnectionSuccessful;

  /// No description provided for @settingsConnectionFailed.
  ///
  /// In en, this message translates to:
  /// **'Connection failed. Please check details.'**
  String get settingsConnectionFailed;

  /// No description provided for @settingsSavedSuccessfully.
  ///
  /// In en, this message translates to:
  /// **'Recipe integration settings saved successfully.'**
  String get settingsSavedSuccessfully;

  /// No description provided for @nutritionTrackWater.
  ///
  /// In en, this message translates to:
  /// **'Track Water'**
  String get nutritionTrackWater;

  /// No description provided for @nutritionMacroPresets.
  ///
  /// In en, this message translates to:
  /// **'Macro Presets (based on calories):'**
  String get nutritionMacroPresets;

  /// No description provided for @nutritionBalancedPreset.
  ///
  /// In en, this message translates to:
  /// **'Balanced (30/40/30)'**
  String get nutritionBalancedPreset;

  /// No description provided for @nutritionLowCarbPreset.
  ///
  /// In en, this message translates to:
  /// **'Low-Carb (30/10/60)'**
  String get nutritionLowCarbPreset;

  /// No description provided for @nutritionHighProteinPreset.
  ///
  /// In en, this message translates to:
  /// **'High-Protein (40/35/25)'**
  String get nutritionHighProteinPreset;

  /// No description provided for @nutritionCupSize.
  ///
  /// In en, this message translates to:
  /// **'Cup Size:'**
  String get nutritionCupSize;

  /// No description provided for @nutritionAddMl.
  ///
  /// In en, this message translates to:
  /// **'Add {amount}ml'**
  String nutritionAddMl(int amount);

  /// No description provided for @nutritionReset.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get nutritionReset;

  /// No description provided for @chatWaterIntakeLogged.
  ///
  /// In en, this message translates to:
  /// **'Water Intake Logged'**
  String get chatWaterIntakeLogged;

  /// No description provided for @chatAddedToToday.
  ///
  /// In en, this message translates to:
  /// **'Added to today\'s totals'**
  String get chatAddedToToday;

  /// No description provided for @recipeMatchesTitle.
  ///
  /// In en, this message translates to:
  /// **'Recipe Matches'**
  String get recipeMatchesTitle;

  /// No description provided for @nutritionKcalEaten.
  ///
  /// In en, this message translates to:
  /// **'kcal eaten'**
  String get nutritionKcalEaten;

  /// No description provided for @settingsRecipeManagers.
  ///
  /// In en, this message translates to:
  /// **'Recipe Managers'**
  String get settingsRecipeManagers;
}

class _SDelegate extends LocalizationsDelegate<S> {
  const _SDelegate();

  @override
  Future<S> load(Locale locale) {
    return SynchronousFuture<S>(lookupS(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['de', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_SDelegate old) => false;
}

S lookupS(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return SDe();
    case 'en':
      return SEn();
  }

  throw FlutterError(
    'S.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
