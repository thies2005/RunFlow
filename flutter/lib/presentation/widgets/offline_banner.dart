import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:runflow_flutter/core/utils/connectivity_helper.dart';
import 'package:runflow_flutter/presentation/providers/activity_providers.dart';

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);

    if (isOnline) return const SizedBox.shrink();

    final pendingAsync = ref.watch(pendingSyncCountProvider);
    final pendingCount = pendingAsync.valueOrNull ?? 0;

    final message = pendingCount > 0
        ? 'You are offline. $pendingCount activit${pendingCount == 1 ? 'y' : 'ies'} will sync when you\'re back online.'
        : 'You are offline. Showing cached data.';

    return Material(
      color: Theme.of(context).colorScheme.error,
      child: SafeArea(
        bottom: false,
        child: Semantics(
          label: message,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
