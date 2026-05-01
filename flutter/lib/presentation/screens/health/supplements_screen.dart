import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/l10n/app_localizations.dart';
import 'package:runflow_flutter/domain/entities/health_entities.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

const _timeOfDayOrder = ['MORNING', 'Morning', 'NOON', 'Afternoon', 'EVENING', 'Evening', 'NIGHT', 'Night'];

int _sortTimeOfDay(String time) {
  final idx = _timeOfDayOrder.indexOf(time);
  return idx >= 0 ? idx : 99;
}

String _timeOfDayLabel(String time) {
  return switch (time.toUpperCase()) {
    'MORNING' => 'Morning',
    'NOON' => 'Afternoon',
    'AFTERNOON' => 'Afternoon',
    'EVENING' => 'Evening',
    'NIGHT' => 'Night',
    _ => time,
  };
}

IconData _timeOfDayIcon(String time) {
  return switch (time.toUpperCase()) {
    'MORNING' => Icons.wb_sunny_outlined,
    'NOON' || 'AFTERNOON' => Icons.wb_cloudy_outlined,
    'EVENING' => Icons.wb_twilight,
    'NIGHT' => Icons.nightlight_outlined,
    _ => Icons.medication_outlined,
  };
}

String _currentTimeOfDaySlot() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'MORNING';
  if (hour < 17) return 'NOON';
  if (hour < 21) return 'EVENING';
  return 'NIGHT';
}

class SupplementsScreen extends ConsumerWidget {
  const SupplementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supplementsAsync = ref.watch(supplementListProvider);
    final takenAsync = ref.watch(takenSupplementIdsProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(S.of(context).healthSupplements),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            onPressed: () => _showAddSupplementDialog(context, ref),
            icon: const Icon(Icons.add, color: AppColors.primary),
          ),
        ],
      ),
      body: supplementsAsync.when(
        data: (supplements) {
          final active = supplements.where((s) => s.isActive).toList();
          final inactive = supplements.where((s) => !s.isActive).toList();
          return takenAsync.when(
            data: (takenIds) {
              final takenCount = active.where((s) => takenIds.contains(s.serverId ?? s.id.toString())).length;
              final nextSupplement = _findNextSupplement(active, takenIds);
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _TodayProgressCard(taken: takenCount, total: active.length),
                    const SizedBox(height: 16),
                    if (nextSupplement != null) ...[
                      _NextSupplementCard(
                        supplement: nextSupplement,
                        onTake: () => ref.read(supplementListProvider.notifier).toggle(nextSupplement.id),
                      ),
                      const SizedBox(height: 16),
                    ],
                    _SupplementCalendar(supplements: supplements, takenIds: takenIds),
                    const SizedBox(height: 16),
                    if (active.isNotEmpty)
                      _GroupedSupplementList(
                        supplements: active,
                        takenIds: takenIds,
                        onToggle: (id) => ref.read(supplementListProvider.notifier).toggle(id),
                      ),
                    if (inactive.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _SectionHeader('Inactive · ${inactive.length}'),
                      const SizedBox(height: 8),
                      ...inactive.map((s) => _SupplementTile(
                        supplement: s,
                        isTaken: false,
                        onToggle: () => ref.read(supplementListProvider.notifier).toggle(s.id),
                      )),
                    ],
                    if (supplements.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(40),
                          child: Column(
                            children: [
                              const Icon(Icons.medication_outlined, size: 52, color: AppColors.onSurfaceVariant),
                              const SizedBox(height: 12),
                              Text(S.of(context).supplementsNoSupplements, style: theme.textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant)),
                              const SizedBox(height: 8),
                              FilledButton.icon(
                                onPressed: () => _showAddSupplementDialog(context, ref),
                                icon: const Icon(Icons.add),
                                label: Text(S.of(context).supplementsAddFirst),
                              ),
                            ],
                          ),
                        ),
                      ),
                    _SupplementAdherenceSection(),
                  ],
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('${S.of(context).actionError}: $e')),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('${S.of(context).actionError}: $e')),
      ),
    );
  }

  Supplement? _findNextSupplement(List<Supplement> active, Set<String> takenIds) {
    final currentSlot = _currentTimeOfDaySlot();
    final currentOrder = _sortTimeOfDay(currentSlot);

    final untaken = active.where((s) => !takenIds.contains(s.serverId ?? s.id.toString())).toList();
    if (untaken.isEmpty) return null;

    untaken.sort((a, b) {
      final aOrder = _sortTimeOfDay(a.timeOfDay);
      final bOrder = _sortTimeOfDay(b.timeOfDay);
      final aDist = aOrder < currentOrder ? aOrder + _timeOfDayOrder.length : aOrder;
      final bDist = bOrder < currentOrder ? bOrder + _timeOfDayOrder.length : bOrder;
      final cmp = aDist.compareTo(bDist);
      if (cmp != 0) return cmp;
      return a.order.compareTo(b.order);
    });

    return untaken.first;
  }

  void _showAddSupplementDialog(BuildContext context, WidgetRef ref) {
    final nameCtl = TextEditingController();
    final dosageCtl = TextEditingController();
    final freqCtl = TextEditingController();
    String selectedTime = 'MORNING';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: AppColors.onSurfaceVariant, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 20),
              Text(S.of(ctx).supplementsAddTitle, style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextField(controller: nameCtl, decoration: InputDecoration(labelText: S.of(ctx).supplementsName, prefixIcon: const Icon(Icons.medication))),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: TextField(controller: dosageCtl, decoration: InputDecoration(labelText: S.of(ctx).supplementsDosage))),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: freqCtl, decoration: InputDecoration(labelText: S.of(ctx).supplementsFrequency))),
                ],
              ),
              const SizedBox(height: 12),
              Text(S.of(ctx).supplementsTimeOfDay, style: Theme.of(ctx).textTheme.labelMedium?.copyWith(color: AppColors.onSurfaceVariant)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  ('MORNING', S.of(ctx).supplementsMorning),
                  ('NOON', S.of(ctx).supplementsAfternoon),
                  ('EVENING', S.of(ctx).supplementsEvening),
                  ('NIGHT', S.of(ctx).supplementsNight),
                ].map((e) => ChoiceChip(
                  label: Text(e.$2, style: const TextStyle(fontSize: 11)),
                  selected: selectedTime == e.$1,
                  onSelected: (_) => setModalState(() => selectedTime = e.$1),
                  selectedColor: AppColors.primary,
                )).toList(),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    final supplement = Supplement(
                      id: 0,
                      name: nameCtl.text,
                      dosage: dosageCtl.text,
                      frequency: freqCtl.text.isEmpty ? selectedTime : freqCtl.text,
                      timeOfDay: selectedTime,
                      isActive: true,
                    );
                    ref.read(supplementListProvider.notifier).add(supplement);
                    Navigator.pop(ctx);
                  },
                  child: Text(S.of(ctx).supplementsAddTitle),
                ),
              ),
            ],
          ),
        ),
      ),
    ).whenComplete(() {
      nameCtl.dispose();
      dosageCtl.dispose();
      freqCtl.dispose();
    });
  }
}

class _NextSupplementCard extends StatelessWidget {
  const _NextSupplementCard({required this.supplement, required this.onTake});
  final Supplement supplement;
  final VoidCallback onTake;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary.withValues(alpha: 0.12), AppColors.primary.withValues(alpha: 0.04)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary.withValues(alpha: 0.12),
            ),
            child: Icon(
              _timeOfDayIcon(supplement.timeOfDay),
              color: AppColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Next up',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  supplement.name,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                if (supplement.dosage.isNotEmpty)
                  Text(
                    '${supplement.dosage} · ${_timeOfDayLabel(supplement.timeOfDay)}',
                    style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: onTake,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Take', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _GroupedSupplementList extends StatelessWidget {
  const _GroupedSupplementList({
    required this.supplements,
    required this.takenIds,
    required this.onToggle,
  });

  final List<Supplement> supplements;
  final Set<String> takenIds;
  final void Function(int id) onToggle;

  @override
  Widget build(BuildContext context) {
    final groups = <String, List<Supplement>>{};
    for (final s in supplements) {
      final label = _timeOfDayLabel(s.timeOfDay);
      groups.putIfAbsent(label, () => []).add(s);
    }

    final sortedKeys = groups.keys.toList()
      ..sort((a, b) {
        final aKey = groups[a]!.first.timeOfDay;
        final bKey = groups[b]!.first.timeOfDay;
        return _sortTimeOfDay(aKey).compareTo(_sortTimeOfDay(bKey));
      });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final key in sortedKeys) ...[
          _TimeGroupHeader(
            label: key,
            icon: _timeOfDayIcon(groups[key]!.first.timeOfDay),
            count: groups[key]!.length,
            takenCount: groups[key]!.where((s) => takenIds.contains(s.serverId ?? s.id.toString())).length,
          ),
          const SizedBox(height: 8),
          for (final s in groups[key]!..sort((a, b) => a.order.compareTo(b.order)))
            _SupplementTile(
              supplement: s,
              isTaken: takenIds.contains(s.serverId ?? s.id.toString()),
              onToggle: () => onToggle(s.id),
            ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _TimeGroupHeader extends StatelessWidget {
  const _TimeGroupHeader({
    required this.label,
    required this.icon,
    required this.count,
    required this.takenCount,
  });

  final String label;
  final IconData icon;
  final int count;
  final int takenCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: takenCount == count && count > 0
                  ? AppColors.success.withValues(alpha: 0.15)
                  : AppColors.onSurfaceVariant.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '$takenCount/$count',
              style: theme.textTheme.labelSmall?.copyWith(
                color: takenCount == count && count > 0 ? AppColors.success : AppColors.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TodayProgressCard extends StatelessWidget {
  const _TodayProgressCard({required this.taken, required this.total});
  final int taken;
  final int total;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pct = total > 0 ? taken / total : 0.0;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.success.withValues(alpha: 0.15), Theme.of(context).colorScheme.surfaceContainerHighest],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            height: 72,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: pct,
                  strokeWidth: 7,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                  valueColor: const AlwaysStoppedAnimation(AppColors.success),
                ),
                Text(
                  '${(pct * 100).toInt()}%',
                  style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                S.of(context).supplementsTakenToday(taken, total),
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text(
                total > 0 && taken == total ? S.of(context).supplementsAllDone : S.of(context).supplementsRemainingCount(total - taken),
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SupplementCalendar extends StatelessWidget {
  const _SupplementCalendar({required this.supplements, this.takenIds = const {}});
  final List<Supplement> supplements;
  final Set<String> takenIds;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final days = List.generate(7, (i) => now.subtract(Duration(days: 6 - i)));
    final dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(S.of(context).supplementsWeeklyCalendar, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: days.map((day) {
              final isToday = day.day == now.day && day.month == now.month;
              final activeToday = supplements.where((s) => s.isActive).length;
              final pct = isToday && activeToday > 0
                  ? takenIds.where((id) => supplements.any((s) => (s.serverId ?? s.id.toString()) == id && s.isActive)).length / activeToday
                  : isToday ? 0.0 : -1.0;
              final label = dayLabels[day.weekday - 1];
              return Expanded(
                child: Column(
                  children: [
                    Text(
                      label,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: isToday ? AppColors.primary : AppColors.onSurfaceVariant,
                        fontWeight: isToday ? FontWeight.w700 : FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: pct >= 0
                            ? AppColors.success.withValues(alpha: pct.clamp(0.0, 1.0))
                            : Theme.of(context).colorScheme.surfaceContainerHighest,
                        border: Border.all(
                          color: isToday ? AppColors.primary : AppColors.onSurfaceVariant.withValues(alpha: 0.2),
                          width: isToday ? 2 : 1,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${day.day}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: pct >= 0.5 ? Colors.white : AppColors.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class _SupplementTile extends StatelessWidget {
  const _SupplementTile({required this.supplement, required this.isTaken, required this.onToggle});
  final Supplement supplement;
  final bool isTaken;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: isTaken
            ? Border.all(color: AppColors.success.withValues(alpha: 0.3))
            : null,
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isTaken
                  ? AppColors.success.withValues(alpha: 0.15)
                  : Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
            child: Icon(
              Icons.medication,
              size: 22,
              color: isTaken ? AppColors.success : AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(supplement.name, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  '${supplement.dosage} · ${supplement.frequency}',
                  style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          Switch(
            value: isTaken,
            onChanged: (_) => onToggle(),
            activeTrackColor: AppColors.success,
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: Theme.of(context).textTheme.labelMedium?.copyWith(
      color: AppColors.onSurfaceVariant,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.5,
    ),
  );
}

class _SupplementAdherenceSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsAsync = ref.watch(supplementAnalyticsProvider);
    final theme = Theme.of(context);

    return analyticsAsync.when(
      data: (analytics) {
        if (analytics.supplements.isEmpty) return const SizedBox.shrink();
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(S.of(context).supplementsWeeklyAdherence, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              ...analytics.supplements.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Text(s.name, style: theme.textTheme.bodySmall, overflow: TextOverflow.ellipsis),
                    ),
                    Expanded(
                      flex: 3,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: s.adherencePercent / 100,
                          backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            s.adherencePercent >= 80 ? AppColors.success
                                : s.adherencePercent >= 60 ? AppColors.warning
                                : AppColors.error,
                          ),
                          minHeight: 8,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${s.adherencePercent.toStringAsFixed(0)}%',
                      style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              )),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}
