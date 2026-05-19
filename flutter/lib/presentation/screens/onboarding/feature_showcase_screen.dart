import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FeatureShowcaseScreen extends StatefulWidget {
  const FeatureShowcaseScreen({super.key});

  @override
  State<FeatureShowcaseScreen> createState() => _FeatureShowcaseScreenState();
}

class _FeatureShowcaseScreenState extends State<FeatureShowcaseScreen> {
  final _controller = PageController();
  int _currentPage = 0;

  List<_FeaturePageData> get _pages => _featurePages(context);

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
                  S.of(context).showcaseSkip,
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
                        ? S.of(context).showcaseGetStarted
                        : S.of(context).showcaseContinue,
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

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('showcase_completed', true);
    if (mounted) {
      context.go('/onboarding/wizard');
    }
  }
}

class _FeaturePageData {
  _FeaturePageData({
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

List<_FeaturePageData> _featurePages(BuildContext context) {
  final l = S.of(context);
  return [
    _FeaturePageData(
      icon: Icons.fiber_manual_record,
      title: l.showcaseRecordTitle,
      subtitle: l.showcaseRecordSubtitle,
      features: [
        l.showcaseRecordFeature1,
        l.showcaseRecordFeature2,
        l.showcaseRecordFeature3,
        l.showcaseRecordFeature4,
        l.showcaseRecordFeature5,
      ],
      accentColor: AppColors.primary,
    ),
    _FeaturePageData(
      icon: Icons.analytics,
      title: l.showcaseAnalyticsTitle,
      subtitle: l.showcaseAnalyticsSubtitle,
      features: [
        l.showcaseAnalyticsFeature1,
        l.showcaseAnalyticsFeature2,
        l.showcaseAnalyticsFeature3,
        l.showcaseAnalyticsFeature4,
        l.showcaseAnalyticsFeature5,
      ],
      accentColor: AppColors.peaked,
    ),
    _FeaturePageData(
      icon: Icons.auto_awesome,
      title: l.showcaseAiTitle,
      subtitle: l.showcaseAiSubtitle,
      features: [
        l.showcaseAiFeature1,
        l.showcaseAiFeature2,
        l.showcaseAiFeature3,
        l.showcaseAiFeature4,
        l.showcaseAiFeature5,
      ],
      accentColor: AppColors.success,
    ),
    _FeaturePageData(
      icon: Icons.calendar_today,
      title: l.showcasePlansTitle,
      subtitle: l.showcasePlansSubtitle,
      features: [
        l.showcasePlansFeature1,
        l.showcasePlansFeature2,
        l.showcasePlansFeature3,
        l.showcasePlansFeature4,
        l.showcasePlansFeature5,
      ],
      accentColor: AppColors.warning,
    ),
  ];
}

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
