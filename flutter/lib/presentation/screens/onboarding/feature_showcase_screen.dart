import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/constants/api_constants.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FeatureShowcaseScreen extends StatefulWidget {
  const FeatureShowcaseScreen({super.key});

  static Future<bool> isCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(AppConstants.onboardingCompletedKey) ?? false;
  }

  static Future<void> markCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.onboardingCompletedKey, true);
  }

  @override
  State<FeatureShowcaseScreen> createState() => _FeatureShowcaseScreenState();
}

class _FeatureShowcaseScreenState extends State<FeatureShowcaseScreen> {
  final _controller = PageController();
  int _currentPage = 0;

  static const _pages = _featurePages;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.oledBlack,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: () => _finish(),
                child: Text(
                  'Skip',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemBuilder: (context, index) => SingleChildScrollView(
                  child: _FeaturePage(page: _pages[index]),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _pages.length,
                  (i) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: i == _currentPage ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == _currentPage
                          ? AppColors.primary
                          : AppColors.onSurfaceVariant.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: _nextPage,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    _currentPage == _pages.length - 1
                        ? 'Get Started'
                        : 'Continue',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.onPrimary,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  void _finish() {
    FeatureShowcaseScreen.markCompleted();
    context.go('/login');
  }
}

class _FeaturePageData {
  const _FeaturePageData({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.features,
    required this.accentColor,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<String> features;
  final Color accentColor;
}

const _featurePages = <_FeaturePageData>[
  _FeaturePageData(
    icon: Icons.fiber_manual_record,
    title: 'Record Your Runs',
    subtitle: 'GPS tracking with real-time metrics and voice coaching',
    features: [
      'GPS distance, pace & elevation tracking',
      'Real-time heart rate via BLE sensors',
      'Voice coach with pace alerts',
      'Automatic cadence & stride analysis',
      'Post-run summary with save & share',
    ],
    accentColor: AppColors.primary,
  ),
  _FeaturePageData(
    icon: Icons.analytics,
    title: 'Analyse Performance',
    subtitle: 'Deep insights into your fitness with advanced metrics',
    features: [
      'VDOT score & race predictions',
      'Fitness (CTL), Fatigue (ATL) & Form (TSB)',
      'Heart rate zone analysis',
      'Pace & elevation charts per activity',
      'Marathon shape indicator',
    ],
    accentColor: AppColors.peaked,
  ),
  _FeaturePageData(
    icon: Icons.auto_awesome,
    title: 'AI Food Tracking',
    subtitle: 'Snap a photo to instantly log your nutrition',
    features: [
      'AI-powered food recognition from photos',
      'Barcode scanning for packaged foods',
      'Calorie & macro tracking (P/C/F)',
      'Water intake monitoring',
      '7-day nutrition trends & analytics',
    ],
    accentColor: AppColors.success,
  ),
  _FeaturePageData(
    icon: Icons.calendar_today,
    title: 'Adaptive Training Plans',
    subtitle: 'Personalized plans that adapt to your fitness level',
    features: [
      'Goal-based plans for any race distance',
      'Auto-calibrated from your recent runs',
      'Easy, tempo, interval & long run types',
      'Flexible weekly scheduling',
      'Progressive overload with build/peak/taper',
    ],
    accentColor: AppColors.warning,
  ),
];

class _FeaturePage extends StatelessWidget {
  const _FeaturePage({required this.page});

  final _FeaturePageData page;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: page.accentColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              page.icon,
              size: 56,
              color: page.accentColor,
            ),
          ),
          const SizedBox(height: 32),
          Text(
            page.title,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.onPrimary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            page.subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.onSurfaceVariant,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          ...page.features.map(
            (feature) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: page.accentColor.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.check,
                      size: 14,
                      color: page.accentColor,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      feature,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.onSurface,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
