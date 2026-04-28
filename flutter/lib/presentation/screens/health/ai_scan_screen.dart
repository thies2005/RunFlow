import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:runflow_flutter/core/theme/app_theme.dart';
import 'package:runflow_flutter/data/models/health_models.dart';
import 'package:runflow_flutter/presentation/providers/health_providers.dart';

class AiScanScreen extends ConsumerStatefulWidget {
  const AiScanScreen({super.key});

  @override
  ConsumerState<AiScanScreen> createState() => _AiScanScreenState();
}

class _AiScanScreenState extends ConsumerState<AiScanScreen> {
  final _imagePicker = ImagePicker();
  String? _imagePath;
  bool _scanning = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showSourcePicker();
    });
  }

  Future<void> _showSourcePicker() async {
    final theme = Theme.of(context);
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.auto_awesome, size: 48, color: AppColors.primary),
            const SizedBox(height: 16),
            Text('AI Food Scanner', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Choose an image to scan with AI.',
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Gallery'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(ctx, ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Camera'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    if (source != null) {
      unawaited(_pickImage(source));
    } else {
      if (mounted && _imagePath == null) {
        context.pop();
      }
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    final file = await _imagePicker.pickImage(source: source);
    if (file != null) {
      setState(() {
        _imagePath = file.path;
        _scanning = true;
      });
      unawaited(_scanImage(file.path));
    } else {
      if (mounted && _imagePath == null) {
        context.pop();
      }
    }
  }

  Future<void> _scanImage(String path) async {
    try {
      await ref.read(aiScanProvider.notifier).scanImage(path);
      if (mounted) {
        setState(() {
          _scanning = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _scanning = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to analyze image.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final asyncState = ref.watch(aiScanProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Food Scanner'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.photo_camera),
            onPressed: _showSourcePicker,
          ),
        ],
      ),
      body: _scanning
          ? _buildLoadingState()
          : asyncState.when(
              data: (item) {
                if (item != null) return _buildResultArea(theme, item);
                if (_imagePath != null) return _buildNotFound(theme);
                return const SizedBox.shrink();
              },
              loading: () => _buildLoadingState(),
              error: (err, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Error: $err', style: const TextStyle(color: AppColors.error)),
                ),
              ),
            ),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('AI is analyzing your meal...', style: TextStyle(color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }

  Widget _buildNotFound(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off, size: 48, color: AppColors.warning),
            const SizedBox(height: 12),
            Text('Could not identify food', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text('The AI could not confidently identify nutritional info. Please try another photo or add manually.',
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton(onPressed: _showSourcePicker, child: const Text('Try Again')),
                const SizedBox(width: 12),
                FilledButton(onPressed: () => context.pop(), child: const Text('Cancel')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultArea(ThemeData theme, FoodItem food) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(food.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Serving: ${food.servingSize}g', style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.onSurfaceVariant)),
          const SizedBox(height: 24),
          Text('Nutrition Facts', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _MacroBox(label: 'Calories', value: food.calories, color: AppColors.primary)),
              const SizedBox(width: 8),
              Expanded(child: _MacroBox(label: 'Protein', value: food.protein, color: AppColors.peaked)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _MacroBox(label: 'Carbs', value: food.carbs, color: AppColors.warning)),
              const SizedBox(width: 8),
              Expanded(child: _MacroBox(label: 'Fat', value: food.fat, color: AppColors.error)),
            ],
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(food),
              child: const Text('Add Food'),
            ),
          ),
        ],
      ),
    );
  }
}

class _MacroBox extends StatelessWidget {
  const _MacroBox({required this.label, required this.value, required this.color});
  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value.toStringAsFixed(value == value.roundToDouble() ? 0 : 1),
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 4),
          Text(label, style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant)),
        ],
      ),
    );
  }
}
