import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';
import 'package:runflow_flutter/presentation/providers/health_sync_providers.dart';
import 'package:runflow_flutter/presentation/providers/vitals_sleep_providers.dart';

class HealthScreen extends ConsumerStatefulWidget {
  const HealthScreen({super.key});

  @override
  ConsumerState<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends ConsumerState<HealthScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = DateTime(
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
    );
    final nutritionAsync = ref.watch(nutritionProvider(today));
    final supplementsAsync = ref.watch(supplementListProvider);
    final bodyAsync = ref.watch(bodyMeasurementsProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            final today = DateTime(
              DateTime.now().year,
              DateTime.now().month,
              DateTime.now().day,
            );
            ref.invalidate(dailyHealthProvider(today));
            ref.invalidate(nutritionProvider(today));
            ref.invalidate(supplementListProvider);
            ref.invalidate(bodyMeasurementsProvider);
            ref.invalidate(fastingProvider);
            await Future.wait([
              ref.read(dailyHealthProvider(today).future),
              ref.read(nutritionProvider(today).future),
              ref.read(supplementListProvider.future),
              ref.read(bodyMeasurementsProvider.future),
              ref.read(fastingProvider.future),
            ]);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              _buildSliverAppBar(context, theme),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    const SizedBox(height: 8),
                    _SyncBanner(),
                    const SizedBox(height: 20),
                    _buildDashboardGrid(
                      context,
                      nutritionAsync: nutritionAsync,
                      supplementsAsync: supplementsAsync,
                      bodyAsync: bodyAsync,
                    ),
                    const SizedBox(height: 20),
                    _QuickTakeCard(),
                    const SizedBox(height: 20),
                    _buildQuickActions(context),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSliverAppBar(BuildContext context, ThemeData theme) {
    return SliverAppBar(
      floating: true,
      snap: true,
      elevation: 0,
      title: Text(
        S.of(context).healthTitle,
        style: theme.textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.onSurface,
        ),
      ),
      actions: [
        IconButton(
          onPressed: () => context.push('/health/scan'),
          icon: const Icon(Icons.qr_code_scanner, color: AppColors.primary),
          tooltip: S.of(context).healthScanBarcode,
        ),
        IconButton(
          onPressed: () => context.push('/health/ai-scan'),
          icon: const Icon(Icons.auto_awesome, color: AppColors.primary),
          tooltip: S.of(context).healthAiFoodScan,
        ),
      ],
    );
  }

  Widget _buildDashboardGrid(
    BuildContext context, {
    required AsyncValue<NutritionLog> nutritionAsync,
    required AsyncValue<List<Supplement>> supplementsAsync,
    required AsyncValue<List<BodyMeasurement>> bodyAsync,
  }) {
    return Column(
      children: [
        // Row 1: Nutrition + Body
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _NutritionCard(nutritionAsync: nutritionAsync)),
              const SizedBox(width: 12),
              Expanded(child: _BodyCard(bodyAsync: bodyAsync)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Row 2: Supplements + Sleep
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _SupplementsCard(supplementsAsync: supplementsAsync),
              ),
              const SizedBox(width: 12),
              const Expanded(child: _SleepCard()),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Row 3: Vitals + Fasting
        const IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: _VitalsCard()),
              SizedBox(width: 12),
              Expanded(child: _FastingCard()),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          S.of(context).healthQuickActions,
          style: theme.textTheme.titleSmall?.copyWith(
            color: AppColors.onSurfaceVariant,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _QuickActionChip(
              icon: Icons.qr_code_scanner,
              label: S.of(context).healthScanFood,
              onTap: () async {
                final result = await context.push<FoodItem?>('/health/scan');
                if (result != null && context.mounted) {
                  final today = DateTime(
                    DateTime.now().year,
                    DateTime.now().month,
                    DateTime.now().day,
                  );
                  final asyncLog = ref.read(nutritionProvider(today));
                  NutritionLog? currentLog;
                  asyncLog.whenData((log) => currentLog = log);
                  if (currentLog != null) {
                    final updated = currentLog!.copyWith(
                      calories: currentLog!.calories + result.calories,
                      protein: currentLog!.protein + result.protein,
                      carbs: currentLog!.carbs + result.carbs,
                      fat: currentLog!.fat + result.fat,
                    );
                    unawaited(
                      ref.read(nutritionProvider(today).notifier).save(updated),
                    );
                  }
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(S.of(context).healthAddedFood(result.name)),
                    ),
                  );
                }
              },
            ),
            const SizedBox(width: 8),
            _QuickActionChip(
              icon: Icons.auto_awesome,
              label: S.of(context).healthAiScan,
              onTap: () async {
                final result = await context.push<FoodItem?>('/health/ai-scan');
                if (result != null && context.mounted) {
                  final today = DateTime(
                    DateTime.now().year,
                    DateTime.now().month,
                    DateTime.now().day,
                  );
                  final asyncLog = ref.read(nutritionProvider(today));
                  NutritionLog? currentLog;
                  asyncLog.whenData((log) => currentLog = log);
                  if (currentLog != null) {
                    final updated = currentLog!.copyWith(
                      calories: currentLog!.calories + result.calories,
                      protein: currentLog!.protein + result.protein,
                      carbs: currentLog!.carbs + result.carbs,
                      fat: currentLog!.fat + result.fat,
                    );
                    unawaited(
                      ref.read(nutritionProvider(today).notifier).save(updated),
                    );
                  }
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(S.of(context).healthAddedFood(result.name)),
                    ),
                  );
                }
              },
            ),
            const SizedBox(width: 8),
            _QuickActionChip(
              icon: Icons.add,
              label: S.of(context).healthLogFood,
              onTap: () => context.push('/health/nutrition'),
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Sync Banner ─────────────────────────────────────────────────────────────

class _SyncBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final syncState = ref.watch(healthSyncStateProvider);

    String statusText;
    Widget trailing;
    if (syncState.isSyncing) {
      statusText = S.of(context).healthSyncedWithHealthConnect;
      trailing = const SizedBox(
        width: 16,
        height: 16,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: AppColors.primary,
        ),
      );
    } else if (syncState.error != null) {
      statusText = S.of(context).healthSyncedWithHealthConnect;
      trailing = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 14, color: AppColors.error),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => ref.read(healthSyncStateProvider.notifier).syncNow(),
            child: Text(
              S.of(context).actionSyncNow,
              style: theme.textTheme.labelSmall?.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      );
    } else if (syncState.lastSyncTime != null) {
      final diff = DateTime.now().difference(syncState.lastSyncTime!);
      final mins = diff.inMinutes;
      statusText = mins < 1
          ? S.of(context).healthSyncedWithHealthConnect
          : S.of(context).healthSyncedWithHealthConnect;
      trailing = GestureDetector(
        onTap: () => ref.read(healthSyncStateProvider.notifier).syncNow(),
        child: Text(
          S.of(context).actionSyncNow,
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    } else {
      statusText = S.of(context).healthSyncedWithHealthConnect;
      trailing = GestureDetector(
        onTap: () => ref.read(healthSyncStateProvider.notifier).syncNow(),
        child: Text(
          S.of(context).actionSyncNow,
          style: theme.textTheme.labelSmall?.copyWith(
            color: AppColors.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          syncState.isSyncing
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                )
              : const Icon(Icons.sync, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              statusText,
              style: theme.textTheme.bodySmall?.copyWith(
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
          trailing,
        ],
      ),
    );
  }
}

// ─── Dashboard Card Base ──────────────────────────────────────────────────────

class _DashboardCard extends StatelessWidget {
  const _DashboardCard({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
    required this.onTap,
  });

  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label: '$title section',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Icon(icon, size: 18, color: iconColor),
                ],
              ),
              const SizedBox(height: 12),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

// ─── No-Data Widget ───────────────────────────────────────────────────────────

class _NoDataWidget extends StatefulWidget {
  const _NoDataWidget({required this.label, required this.onSync});

  final String label;
  final VoidCallback onSync;

  @override
  State<_NoDataWidget> createState() => _NoDataWidgetState();
}

class _NoDataWidgetState extends State<_NoDataWidget> {
  bool _dismissed = false;

  @override
  Widget build(BuildContext context) {
    if (_dismissed) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          S.of(context).healthNoData(widget.label),
          style: theme.textTheme.bodySmall?.copyWith(
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Semantics(
                button: true,
                label: S.of(context).healthConnectLabel(widget.label),
                child: GestureDetector(
                  onTap: widget.onSync,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      S.of(context).healthConnect,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Semantics(
              button: true,
              label: S.of(context).healthDismiss,
              child: GestureDetector(
                onTap: () => setState(() => _dismissed = true),
                child: Text(
                  S.of(context).healthDismiss,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ─── Nutrition Card ───────────────────────────────────────────────────────────

class _NutritionCard extends ConsumerWidget {
  const _NutritionCard({required this.nutritionAsync});
  final AsyncValue<NutritionLog> nutritionAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _DashboardCard(
      title: S.of(context).healthNutrition,
      icon: Icons.restaurant_outlined,
      iconColor: AppColors.warning,
      onTap: () => context.push('/health/nutrition'),
      child: nutritionAsync.when(
        data: (nutrition) {
          final cal = nutrition.calories.toInt();
          const goal = 2000;
          final pct = (cal / goal).clamp(0.0, 1.0);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$cal / $goal',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              Text(
                S.of(context).healthKcalEaten,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: pct,
                  minHeight: 6,
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.surfaceContainerHighest,
                  valueColor: const AlwaysStoppedAnimation(AppColors.warning),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _MacroMini(
                    'P',
                    '${nutrition.protein.toInt()}g',
                    AppColors.success,
                  ),
                  _MacroMini(
                    'C',
                    '${nutrition.carbs.toInt()}g',
                    AppColors.warning,
                  ),
                  _MacroMini(
                    'F',
                    '${nutrition.fat.toInt()}g',
                    AppColors.fatigued,
                  ),
                ],
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _NoDataWidget(
          label: S.of(context).healthNutrition.toLowerCase(),
          onSync: () => ref.invalidate(
            nutritionProvider(
              DateTime(
                DateTime.now().year,
                DateTime.now().month,
                DateTime.now().day,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MacroMini extends StatelessWidget {
  const _MacroMini(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.labelSmall?.copyWith(color: AppColors.onSurfaceVariant),
        ),
      ],
    );
  }
}

// ─── Body Card ────────────────────────────────────────────────────────────────

class _BodyCard extends ConsumerWidget {
  const _BodyCard({required this.bodyAsync});
  final AsyncValue<List<BodyMeasurement>> bodyAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _DashboardCard(
      title: S.of(context).healthBody,
      icon: Icons.trending_up,
      iconColor: AppColors.primary,
      onTap: () => context.push('/health/body'),
      child: bodyAsync.when(
        data: (measurements) {
          if (measurements.isEmpty) {
            return _NoDataWidget(
              label: S.of(context).healthBody.toLowerCase(),
              onSync: () => ref.invalidate(bodyMeasurementsProvider),
            );
          }
          final sorted = List<BodyMeasurement>.from(measurements)
            ..sort((a, b) => a.date.compareTo(b.date));
          final latest = sorted.last;
          final prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
          final diff = prev != null ? latest.weight - prev.weight : 0.0;
          final isUp = diff > 0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    latest.weight.toStringAsFixed(1),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: AppColors.onSurface,
                    ),
                  ),
                  Text(
                    ' kg',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isUp ? Icons.arrow_upward : Icons.arrow_downward,
                    size: 14,
                    color: isUp ? AppColors.error : AppColors.success,
                  ),
                ],
              ),
              if (prev != null)
                Text(
                  'Last: ${prev.weight.toStringAsFixed(1)} kg',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              if (latest.bodyFat >= 0) ...[
                const SizedBox(height: 8),
                Text(
                  '${latest.bodyFat.toStringAsFixed(1)}% body fat',
                  style: Theme.of(
                    context,
                  ).textTheme.labelSmall?.copyWith(color: AppColors.peaked),
                ),
              ],
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _NoDataWidget(
          label: S.of(context).healthBody.toLowerCase(),
          onSync: () => ref.invalidate(bodyMeasurementsProvider),
        ),
      ),
    );
  }
}

// ─── Supplements Card ─────────────────────────────────────────────────────────

class _SupplementsCard extends ConsumerWidget {
  const _SupplementsCard({required this.supplementsAsync});
  final AsyncValue<List<Supplement>> supplementsAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _DashboardCard(
      title: S.of(context).healthSupplements,
      icon: Icons.medication_outlined,
      iconColor: AppColors.success,
      onTap: () => context.push('/health/supplements'),
      child: supplementsAsync.when(
        data: (supplements) {
          final active = supplements.where((s) => s.isActive).toList();
          final takenIds = ref.watch(takenSupplementIdsProvider).value ?? {};
          final taken = active
              .where((s) => takenIds.contains(s.serverId ?? s.id.toString()))
              .length;
          final total = active.length;
          if (total == 0) {
            return _NoDataWidget(
              label: S.of(context).healthSupplements.toLowerCase(),
              onSync: () => ref.invalidate(supplementListProvider),
            );
          }
          final pct = total > 0 ? taken / total : 0.0;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$taken/$total',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              Text(
                S.of(context).healthItemsTaken,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: pct,
                  minHeight: 6,
                  backgroundColor: Theme.of(
                    context,
                  ).colorScheme.surfaceContainerHighest,
                  valueColor: const AlwaysStoppedAnimation(AppColors.success),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _NoDataWidget(
          label: S.of(context).healthSupplements.toLowerCase(),
          onSync: () => ref.invalidate(supplementListProvider),
        ),
      ),
    );
  }
}

// ─── Sleep Card ───────────────────────────────────────────────────────────────

class _SleepCard extends ConsumerWidget {
  const _SleepCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sleepAsync = ref.watch(sleepProvider);
    return _DashboardCard(
      title: S.of(context).healthSleep,
      icon: Icons.nightlight_round,
      iconColor: AppColors.peaked,
      onTap: () => context.push('/health/sleep'),
      child: sleepAsync.when(
        data: (sleep) {
          if (!sleep.hasData) {
            return _NoDataWidget(
              label: S.of(context).healthSleep.toLowerCase(),
              onSync: () => ref.invalidate(sleepProvider),
            );
          }
          final theme = Theme.of(context);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${sleep.lastNightHours.toStringAsFixed(1)}h',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              Text(
                S.of(context).healthLastNight,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${sleep.deepMinutes.round()}m deep / ${sleep.remMinutes.round()}m REM',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.peaked,
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _NoDataWidget(
          label: S.of(context).healthSleep.toLowerCase(),
          onSync: () => ref.invalidate(sleepProvider),
        ),
      ),
    );
  }
}

// ─── Vitals Card ──────────────────────────────────────────────────────────────

class _VitalsCard extends ConsumerWidget {
  const _VitalsCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vitalsAsync = ref.watch(vitalsProvider);
    return _DashboardCard(
      title: S.of(context).healthVitals,
      icon: Icons.monitor_heart_outlined,
      iconColor: AppColors.error,
      onTap: () => context.push('/health/vitals'),
      child: vitalsAsync.when(
        data: (vitals) {
          if (!vitals.hasData) {
            return _NoDataWidget(
              label: S.of(context).healthVitalsLabel,
              onSync: () => ref.invalidate(vitalsProvider),
            );
          }
          final theme = Theme.of(context);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (vitals.restingHeartRate != null)
                Text(
                  '${vitals.restingHeartRate!.round()} bpm',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                )
              else if (vitals.hrv != null)
                Text(
                  '${vitals.hrv!.round()} ms',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
              Text(
                vitals.restingHeartRate != null
                    ? S.of(context).healthRestingHr
                    : vitals.hrv != null
                    ? S.of(context).healthHrv
                    : S.of(context).healthVitalsLabel,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.onSurfaceVariant,
                ),
              ),
              if (vitals.spo2 != null) ...[
                const SizedBox(height: 4),
                Text(
                  'SpO2 ${vitals.spo2!.round()}%',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.error,
                  ),
                ),
              ],
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _NoDataWidget(
          label: S.of(context).healthVitalsLabel,
          onSync: () => ref.invalidate(vitalsProvider),
        ),
      ),
    );
  }
}

// ─── Fasting Card ─────────────────────────────────────────────────────────────

class _FastingCard extends ConsumerStatefulWidget {
  const _FastingCard();

  @override
  ConsumerState<_FastingCard> createState() => _FastingCardState();
}

class _FastingCardState extends ConsumerState<_FastingCard> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _refreshTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) {
        _checkAutoStartStop();
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _checkAutoStartStop() {
    final schedule = ref.read(fastingScheduleProvider);
    if (!schedule.isEnabled) return;

    final activeAsync = ref.read(fastingProvider);
    final activeSession = activeAsync.value;
    final prefs = SharedPreferences.getInstance();

    if (schedule.isCurrentlyInFastingWindow && activeSession == null) {
      ref.read(fastingProvider.notifier).start();
      prefs.then((p) => p.setBool('fasting_auto_started', true));
    } else if (!schedule.isCurrentlyInFastingWindow && activeSession != null) {
      prefs.then((p) {
        final autoStarted = p.getBool('fasting_auto_started') ?? false;
        if (autoStarted) {
          ref.read(fastingProvider.notifier).stop();
          p.remove('fasting_auto_started');
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fastingAsync = ref.watch(fastingProvider);
    final schedule = ref.watch(fastingScheduleProvider);
    final theme = Theme.of(context);

    return _DashboardCard(
      title: S.of(context).healthFasting,
      icon: Icons.timer_outlined,
      iconColor: AppColors.fatigued,
      onTap: () => context.push('/health/fasting'),
      child: fastingAsync.when(
        data: (session) {
          if (session != null) {
            final elapsed = DateTime.now().difference(session.startTime);
            final h = elapsed.inHours;
            final m = (elapsed.inMinutes % 60).toString().padLeft(2, '0');
            final targetDuration = Duration(
              hours: schedule.targetHours.toInt(),
            );
            final remaining = targetDuration - elapsed;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${h}h ${m}m',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.fatigued,
                  ),
                ),
                const SizedBox(height: 2),
                if (remaining.isNegative)
                  Text(
                    S.of(context).fastingGoalReached,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.success,
                      fontWeight: FontWeight.w600,
                    ),
                  )
                else
                  Text(
                    '${remaining.inHours}h ${(remaining.inMinutes % 60).toString().padLeft(2, '0')}m to eat',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
              ],
            );
          }

          if (schedule.isEnabled) {
            final inFasting = schedule.isCurrentlyInFastingWindow;
            final timeToNext = schedule.timeToNextPhase;
            final h = timeToNext.inHours;
            final m = (timeToNext.inMinutes % 60).toString().padLeft(2, '0');

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${schedule.fastingHoursInt}:${schedule.eatingHours}',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.fatigued,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  inFasting
                      ? S.of(context).fastingNextEatIn('$h:$m')
                      : S.of(context).fastingNextFastIn('$h:$m'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
              ],
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                button: true,
                label: S.of(context).healthStartFast,
                child: GestureDetector(
                  onTap: () => context.push('/health/fasting'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.fatigued.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      S.of(context).healthStartFast,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: AppColors.fatigued,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => _NoDataWidget(
          label: 'fasting',
          onSync: () => ref.invalidate(fastingProvider),
        ),
      ),
    );
  }
}

// ─── Quick Action Chip ────────────────────────────────────────────────────────

class _QuickActionChip extends StatelessWidget {
  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 14, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: AppColors.onSurface,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _currentTimeOfDaySlot() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'MORNING';
  if (hour < 17) return 'NOON';
  if (hour < 21) return 'EVENING';
  return 'NIGHT';
}

class _QuickTakeCard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supplementsAsync = ref.watch(supplementListProvider);
    final takenAsync = ref.watch(takenSupplementIdsProvider);
    final theme = Theme.of(context);

    return supplementsAsync.when(
      data: (supplements) {
        final active = supplements.where((s) => s.isActive).toList();
        return takenAsync.when(
          data: (takenIds) {
            final untaken = active
                .where((s) => !takenIds.contains(s.serverId ?? s.id.toString()))
                .toList();
            if (untaken.isEmpty) return const SizedBox.shrink();

            final currentSlot = _currentTimeOfDaySlot();
            final slotUntaken = untaken
                .where((s) => s.timeOfDay.toUpperCase() == currentSlot)
                .toList();
            if (slotUntaken.isEmpty) return const SizedBox.shrink();

            final next = slotUntaken.first;

            if (next.stackId != null) {
              final stackUntaken = active
                  .where(
                    (s) =>
                        s.stackId == next.stackId &&
                        s.timeOfDay == next.timeOfDay &&
                        !takenIds.contains(s.serverId ?? s.id.toString()),
                  )
                  .toList();
              if (stackUntaken.length > 1) {
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary.withValues(alpha: 0.1),
                        AppColors.primary.withValues(alpha: 0.04),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.layers,
                        color: AppColors.primary,
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ref.watch(
                                    stackRenameMapProvider,
                                  )[next.stackId!] ??
                                  next.stackId!,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              '${stackUntaken.length} supplements',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: AppColors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      FilledButton(
                        onPressed: () {
                          ref
                              .read(supplementListProvider.notifier)
                              .takeAll(
                                stackUntaken.map((s) => s.uniqueId).toList(),
                              );
                        },
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          'Take All',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }
            }

            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.1),
                    AppColors.primary.withValues(alpha: 0.04),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.medication,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      next.name,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  FilledButton(
                    onPressed: () => ref
                        .read(supplementListProvider.notifier)
                        .toggle(next.uniqueId),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text(
                      'Take',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
          loading: () => const SizedBox.shrink(),
          error: (_, _) => const SizedBox.shrink(),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}
